import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'node:crypto';
import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import type { DreamHouseRequestDto } from './dto/dream-house-request.dto';

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';
const TRIPO_OPENAPI_BASE = 'https://api.tripo3d.ai/v2/openapi';
const TRIPO_TASK_URL = `${TRIPO_OPENAPI_BASE}/task`;
const TRIPO_UPLOAD_URL = `${TRIPO_OPENAPI_BASE}/upload`;

/** UA type navigateur : certains CDN Pollinations sont plus stables qu’avec un UA minimal. */
const POLLINATIONS_HTTP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const POLLINATIONS_DOWNLOAD_MAX_ATTEMPTS = 4;

/** Variantes de cadrage pour plusieurs images (même projet, angles différents). */
const IMAGE_VIEW_HINTS: readonly string[] = [
  'Front elevation, centered symmetrical composition.',
  'Three-quarter street view, two visible facades, depth and perspective.',
  'Wide establishing shot with front garden, path, landscaping, and sky.',
];

/**
 * Identifiant Tripo `model_version` pour `text_to_model` si `TRIPO_MODEL_VERSION` est vide.
 * v3.1 : meilleure qualité cible (plus lent / plus de crédits). Surcharge env ou ex. `v3.0-20250812`, `v2.5-20250123`, Turbo…
 * @see https://platform.tripo3d.ai/docs/generation
 */
const TRIPO_MODEL_VERSION_DEFAULT = 'v3.1-20260211';
const IMAGE_PROMPT_MAX = 900;
const TRIPO_PROMPT_MAX = 1024;
/**
 * Faces cible (hors mode quad : plafond réduit automatiquement si `TRIPO_QUAD=true`).
 * Surcharge : `TRIPO_FACE_LIMIT` (plafond code 200000).
 */
const TRIPO_FACE_LIMIT_DEFAULT = 72_000;
/** Avec `quad: true`, Tripo impose une borne basse sur `face_limit` (ordre de grandeur 10k côté doc). */
const TRIPO_FACE_LIMIT_QUAD_CAP = 10_000;

/** API Google AI (Gemini) — clé : https://aistudio.google.com/apikey */
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com';
/** Modèle rapide / gratuit raisonnable pour une courte reformulation de prompt. */
const GEMINI_MODEL_DEFAULT = 'gemini-2.0-flash';
const GEMINI_REFINE_TIMEOUT_MS = 25_000;
const GEMINI_REFINED_PROMPT_MIN = 40;

/** Groq — même endpoint que `analysis-ai` (OpenAI-compatible). */
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_TRIPO_PROMPT_MIN = 40;

type GroqChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number; status?: string };
  promptFeedback?: { blockReason?: string };
};

type TripoCreateBody = {
  code: number;
  data?: { task_id?: string };
  message?: string;
};

type TripoStatusBody = {
  code: number;
  data?: {
    task_id?: string;
    status?: string;
    /** 0–100 si renvoyé par Tripo */
    progress?: number;
    output?: {
      model?: string;
      pbr_model?: string;
      base_model?: string;
      /** Variantes camelCase possibles selon sérialisation. */
      pbrModel?: string;
      baseModel?: string;
    };
    error?: string;
    message?: string;
  };
  message?: string;
};

export type DreamHouseTripoStatusDto = {
  status: string;
  modelGlbUrl?: string;
  message?: string;
  /** Avancement estimé 0–100 (si l’API Tripo le fournit). */
  progress?: number;
};

@Injectable()
export class DreamHouseService {
  private readonly logger = new Logger(DreamHouseService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Prompt image court — description + couleur d’accent + indice de cadrage optionnel.
   * `viewIndex` force des textes (et donc des URLs Pollinations) nettement différents par vue.
   */
  buildImagePrompt(
    dto: DreamHouseRequestDto,
    viewHint?: string,
    viewIndex?: number,
  ): string {
    const brief = dto.description.trim();
    const hex = dto.accentColor.trim();
    const colorBit = `Accent color ${hex} on facade, trim, shutters, front door, or focal exterior elements.`;
    const view = viewHint?.trim() ? `${viewHint.trim()} ` : '';
    const shot =
      typeof viewIndex === 'number' && viewIndex >= 0
        ? `[Exterior shot ${viewIndex + 1}/3 — not the same angle as the other two images.] `
        : '';
    const plotBudget = this.buildVisualPlotBudgetClause(dto);
    /** Mise en avant du cadrage / numéro de vue en tête pour rester discriminant même si le texte est tronqué. */
    const composed = `Photorealistic exterior, single-family house. ${shot}${view}${colorBit} ${brief}${plotBudget} Daylight, architectural visualization, sharp detail.`;
    if (composed.length <= IMAGE_PROMPT_MAX) {
      return composed;
    }
    return `${composed.slice(0, IMAGE_PROMPT_MAX - 3)}...`;
  }

  /** Contexte visuel budget / terrain pour Pollinations (troncature globale inchangée). */
  private buildVisualPlotBudgetClause(dto: DreamHouseRequestDto): string {
    const parts: string[] = [];
    if (
      dto.budgetEur != null &&
      Number.isFinite(dto.budgetEur) &&
      dto.budgetEur >= 0
    ) {
      parts.push(`Budget context ~${Math.round(dto.budgetEur)} EUR total.`);
    }
    if (
      dto.terrainM2 != null &&
      Number.isFinite(dto.terrainM2) &&
      dto.terrainM2 >= 1
    ) {
      parts.push(`Plot ~${dto.terrainM2} m² — yard and driveway visible as appropriate.`);
    }
    return parts.length ? ` ${parts.join(' ')}` : '';
  }

  /** Prompt 3D pour Tripo — forme, couleur d’accent, description (+ budget / terrain si fournis). */
  buildTripoPrompt(dto: DreamHouseRequestDto): string {
    const brief = dto.description.trim();
    const hex = dto.accentColor.trim();
    const hints: string[] = [];
    if (
      dto.budgetEur != null &&
      Number.isFinite(dto.budgetEur) &&
      dto.budgetEur >= 0
    ) {
      hints.push(
        `Rough total budget guideline ~${Math.round(dto.budgetEur)} EUR (modest/mid/high exterior detail only).`,
      );
    }
    if (
      dto.terrainM2 != null &&
      Number.isFinite(dto.terrainM2) &&
      dto.terrainM2 >= 1
    ) {
      hints.push(
        `Land plot about ${dto.terrainM2} m² — balance building footprint with garden.`,
      );
    }
    const hintStr = hints.length ? ` ${hints.join(' ')}` : '';
    let p = `Residential house 3D model, clean geometry, coherent architecture, high detail; exterior accent color ${hex} on walls trim shutters or door where appropriate:${hintStr} ${brief}`;
    if (p.length > TRIPO_PROMPT_MAX) {
      return `${p.slice(0, TRIPO_PROMPT_MAX - 3)}...`;
    }
    return p;
  }

  /** `DREAM_HOUSE_GROQ_TRIPO=false` désactive l’écriture du prompt Tripo via Groq (repli Gemini + brouillon). */
  private isGroqDreamHouseTripoEnabled(): boolean {
    const v = process.env.DREAM_HOUSE_GROQ_TRIPO?.trim().toLowerCase();
    if (v === '0' || v === 'false' || v === 'off' || v === 'no') {
      return false;
    }
    return true;
  }

  private extractJsonObject(raw: string): string {
    let text = raw.trim();
    const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/im.exec(text);
    if (fence?.[1]) {
      text = fence[1].trim();
    }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new SyntaxError('no json object');
    }
    return text.slice(start, end + 1);
  }

  private async fetchGroqTripoCompletionJson(
    system: string,
    userPayload: Record<string, unknown>,
  ): Promise<string | null> {
    const primary = (this.config.get<string>('GROQ_API_KEY') ?? '').trim();
    if (!primary) {
      return null;
    }
    const fallbackRaw =
      this.config.get<string>('GROQ_API_KEY_FALLBACK')?.trim() ?? '';
    const fallbackKey =
      fallbackRaw.length > 0 && fallbackRaw !== primary ? fallbackRaw : null;
    const model = this.config.get<string>('GROQ_MODEL', 'llama-3.1-8b-instant');
    const timeoutMs = this.config.get<number>('GROQ_TIMEOUT_MS', 25_000);

    const body = {
      model,
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `Dream house project (JSON):\n${JSON.stringify(userPayload)}`,
        },
      ],
    };

    const post = async (apiKey: string) =>
      axios.post<GroqChatCompletionResponse>(GROQ_CHAT_URL, body, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: timeoutMs,
        validateStatus: () => true,
      });

    try {
      let res = await post(primary);
      if (res.status === 429 && fallbackKey) {
        this.logger.warn(
          'Dream House Groq: 429 — nouvel essai avec GROQ_API_KEY_FALLBACK.',
        );
        res = await post(fallbackKey);
      }
      if (res.status < 200 || res.status >= 300) {
        this.logger.warn(
          `Dream House Groq HTTP ${res.status}: ${JSON.stringify(res.data).slice(0, 400)}`,
        );
        return null;
      }
      const content = res.data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        return null;
      }
      return content.trim();
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.logger.warn(`Dream House Groq: ${e.message}`);
      } else {
        this.logger.warn(`Dream House Groq: ${(e as Error).message}`);
      }
      return null;
    }
  }

  private parseGroqTripoPromptContent(content: string): string | null {
    try {
      const extracted = this.extractJsonObject(content);
      const parsed = JSON.parse(extracted) as { tripoPrompt?: unknown };
      const p = parsed.tripoPrompt;
      if (typeof p !== 'string' || !p.trim()) {
        return null;
      }
      const normalized = this.normalizeRefinedTripoPrompt(p);
      if (normalized.length < GROQ_TRIPO_PROMPT_MIN) {
        this.logger.warn('Dream House Groq: tripoPrompt trop court.');
        return null;
      }
      return normalized;
    } catch {
      return null;
    }
  }

  /**
   * Prompt Tripo via Groq à partir du brief structuré (prioritaire si `GROQ_API_KEY` et option actives).
   */
  private async groqDreamHouseTripoPrompt(
    dto: DreamHouseRequestDto,
  ): Promise<string | null> {
    if (!this.isGroqDreamHouseTripoEnabled()) {
      return null;
    }

    const userPayload: Record<string, unknown> = {
      description: dto.description.trim(),
      accentColor: dto.accentColor.trim(),
      budgetEur:
        dto.budgetEur != null && Number.isFinite(dto.budgetEur)
          ? dto.budgetEur
          : undefined,
      terrainM2:
        dto.terrainM2 != null && Number.isFinite(dto.terrainM2)
          ? dto.terrainM2
          : undefined,
      architectureStyle: dto.architectureStyle?.trim() || undefined,
      detailTags:
        Array.isArray(dto.detailTags) && dto.detailTags.length > 0
          ? dto.detailTags
          : undefined,
    };

    const system = [
      'You write ONE English prompt for Tripo AI text-to-model of a residential house exterior (building shell only): volumes, roof, facade, openings.',
      `Reply with ONLY valid JSON: {"tripoPrompt":"<single paragraph>"}.`,
      `The tripoPrompt string must be plain text (no markdown), max ${TRIPO_PROMPT_MAX} characters.`,
      'Always weave in accentColor on facade, trim, shutters, or door.',
      'If budgetEur is set, hint construction finish level / massing — do not cite currency in the model.',
      'If terrainM2 is set, hint footprint vs yard for that plot size.',
      'Use architectureStyle and detailTags as soft hints (values may be ids).',
      'No people, no interior rooms, no compliance or legal claims.',
    ].join('\n');

    const raw = await this.fetchGroqTripoCompletionJson(system, userPayload);
    if (!raw) {
      return null;
    }
    const parsed = this.parseGroqTripoPromptContent(raw);
    if (parsed) {
      this.logger.log(
        `Dream House: prompt Tripo produit par Groq (${parsed.length} car.)`,
      );
    } else {
      this.logger.warn(
        'Dream House Groq: parsing JSON tripoPrompt impossible — repli brouillon.',
      );
    }
    return parsed;
  }

  private getOptionalGeminiApiKey(): string | null {
    const raw = process.env.GEMINI_API_KEY;
    if (raw == null) {
      return null;
    }
    let k = String(raw).trim();
    if (
      (k.startsWith('"') && k.endsWith('"')) ||
      (k.startsWith("'") && k.endsWith("'"))
    ) {
      k = k.slice(1, -1).trim();
    }
    return k ? k : null;
  }

  private getGeminiModelForTripoRefine(): string {
    const m = process.env.GEMINI_MODEL?.trim();
    return m && m.length > 1 ? m : GEMINI_MODEL_DEFAULT;
  }

  /**
   * Désactiver la reformulation Gemini tout en gardant la clé (ex. debug Tripo brut).
   * `DREAM_HOUSE_GEMINI_REFINE=false`
   */
  private isGeminiTripoRefineEnabled(): boolean {
    const v = process.env.DREAM_HOUSE_GEMINI_REFINE?.trim().toLowerCase();
    if (v === '0' || v === 'false' || v === 'off' || v === 'no') {
      return false;
    }
    return true;
  }

  private normalizeRefinedTripoPrompt(raw: string): string {
    let t = String(raw ?? '')
      .trim()
      .replace(/\r\n/g, '\n');
    const firstPara = (t.split(/\n{2,}/)[0] ?? t).trim();
    t = firstPara.replace(/\s+/g, ' ').trim();
    if (t.length > TRIPO_PROMPT_MAX) {
      return `${t.slice(0, TRIPO_PROMPT_MAX - 3)}...`;
    }
    return t;
  }

  /**
   * Reformule le prompt `text_to_model` via Gemini pour un texte plus structuré pour Tripo.
   * Retourne `null` si clé absente, option désactivée, ou erreur — l’appelant garde le brouillon.
   */
  private async refineTripoPromptWithGemini(
    dto: DreamHouseRequestDto,
    draftTripoPrompt: string,
  ): Promise<string | null> {
    const apiKey = this.getOptionalGeminiApiKey();
    if (!apiKey) {
      this.logger.log(
        'Dream House: prompt Tripo sans Gemini (définissez GEMINI_API_KEY dans le .env du backend).',
      );
      return null;
    }
    if (!this.isGeminiTripoRefineEnabled()) {
      this.logger.log(
        'Dream House: prompt Tripo sans Gemini (DREAM_HOUSE_GEMINI_REFINE désactivé).',
      );
      return null;
    }
    const model = this.getGeminiModelForTripoRefine();
    const url = `${GEMINI_API_BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const userBlock = [
      'Tu es un assistant pour la génération 3D « text-to-model » (maison résidentielle, extérieur / volume bâtiment).',
      'Reformule le brouillon ci-dessous en UN SEUL paragraphe en anglais, compact, sans markdown, sans guillemets.',
      'Garde les faits imposés (formes, matériaux, étages, toit, ouvertures). N’invente pas d’intérieur ni de personnages.',
      `Longueur max ${TRIPO_PROMPT_MAX} caractères. Intègre naturellement la couleur d’accent ${dto.accentColor.trim()} (façade / menuiseries / porte).`,
      '',
      'Brouillon (à améliorer) :',
      draftTripoPrompt,
    ].join('\n');

    try {
      const { data } = await axios.post<GeminiGenerateResponse>(
        url,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: userBlock }],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 768,
            topP: 0.9,
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: GEMINI_REFINE_TIMEOUT_MS,
        },
      );

      if (data.error?.message) {
        this.logger.warn(`Gemini refine: ${data.error.message}`);
        return null;
      }
      if (!data.candidates?.length) {
        this.logger.warn(
          `Gemini refine: aucun candidat (blockReason=${data.promptFeedback?.blockReason ?? 'n/a'})`,
        );
        return null;
      }
      const text =
        data.candidates[0]?.content?.parts?.find((p) => typeof p.text === 'string')
          ?.text ?? '';
      const normalized = this.normalizeRefinedTripoPrompt(text);
      if (normalized.length < GEMINI_REFINED_PROMPT_MIN) {
        this.logger.warn('Gemini refine: réponse trop courte, prompt Tripo par défaut.');
        return null;
      }
      this.logger.log(
        `Gemini: prompt Tripo reformulé (${draftTripoPrompt.length} → ${normalized.length} car.)`,
      );
      return normalized;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        this.logger.warn(
          `Gemini refine HTTP ${e.response?.status ?? '?'}: ${e.message}`,
        );
      } else {
        this.logger.warn(`Gemini refine: ${(e as Error).message}`);
      }
      return null;
    }
  }

  private async resolveTripoPrompt(dto: DreamHouseRequestDto): Promise<string> {
    const groqPrompt = await this.groqDreamHouseTripoPrompt(dto);
    if (groqPrompt) {
      return groqPrompt;
    }
    const draft = this.buildTripoPrompt(dto);
    const refined = await this.refineTripoPromptWithGemini(dto, draft);
    return refined ?? draft;
  }

  /**
   * `seed` différent par vue : évite le cache / résultats quasi identiques côté Pollinations pour des prompts proches.
   * @see https://image.pollinations.ai (paramètres de requête)
   */
  buildPollinationsImageUrl(imagePrompt: string, imageSeed: number): string {
    const encoded = encodeURIComponent(imagePrompt);
    const seed =
      Number.isFinite(imageSeed) && imageSeed >= 0
        ? Math.floor(imageSeed) % 2_147_483_647
        : randomInt(0, 2_147_483_646);
    return `${POLLINATIONS_BASE}/${encoded}?width=1280&height=720&nologo=true&seed=${seed}`;
  }

  private getTripoKey(): string {
    let raw = process.env.TRIPO_API_KEY;
    if (raw == null) {
      throw new ServiceUnavailableException(
        'TRIPO_API_KEY is not configured on the server.',
      );
    }
    let key = String(raw).trim();
    if (
      (key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'"))
    ) {
      key = key.slice(1, -1).trim();
    }
    if (key.toLowerCase().startsWith('bearer ')) {
      key = key.slice(7).trim();
    }
    if (!key) {
      throw new ServiceUnavailableException(
        'TRIPO_API_KEY is not configured on the server.',
      );
    }
    return key;
  }

  private getTripoFaceLimit(): number {
    const raw = process.env.TRIPO_FACE_LIMIT?.trim();
    if (raw != null && raw !== '') {
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 4_000) {
        return Math.min(200_000, n);
      }
    }
    return TRIPO_FACE_LIMIT_DEFAULT;
  }

  /** `false` peut réduire le temps de génération (moins de travail texture). */
  private getTripoTextureEnabled(): boolean {
    const v = process.env.TRIPO_TEXTURE?.trim().toLowerCase();
    if (v === '0' || v === 'false' || v === 'off') {
      return false;
    }
    return true;
  }

  /** PBR (matériaux) — ignoré si `texture=false`. Défaut : activé. */
  private getTripoPbr(): boolean {
    const v = process.env.TRIPO_PBR?.trim().toLowerCase();
    if (v === '0' || v === 'false' || v === 'off') {
      return false;
    }
    return true;
  }

  /**
   * Maillage quad (topologie plus propre ; souvent une limite de faces plus basse côté Tripo).
   * Défaut : désactivé pour garder un `face_limit` élevé ; activer avec `TRIPO_QUAD=true`.
   */
  private getTripoQuad(): boolean {
    const v = process.env.TRIPO_QUAD?.trim().toLowerCase();
    if (v === '1' || v === 'true' || v === 'on') {
      return true;
    }
    return false;
  }

  /** API Tripo : uniquement `standard` | `detailed` (pas d’« ultra »). */
  private getTripoTextureQuality(): 'standard' | 'detailed' {
    const v = process.env.TRIPO_TEXTURE_QUALITY?.trim().toLowerCase();
    if (v === 'standard') {
      return 'standard';
    }
    return 'detailed';
  }

  /** Qualité géométrique générée (schéma Tripo text_to_model). */
  private getTripoGeometryQuality(): 'standard' | 'detailed' {
    const v = process.env.TRIPO_GEOMETRY_QUALITY?.trim().toLowerCase();
    if (v === 'standard') {
      return 'standard';
    }
    return 'detailed';
  }

  private getEffectiveTripoFaceLimit(quad: boolean): number {
    const n = this.getTripoFaceLimit();
    if (quad) {
      return Math.min(n, TRIPO_FACE_LIMIT_QUAD_CAP);
    }
    return n;
  }

  private normalizeTripoProgress(raw: unknown): number | undefined {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      return undefined;
    }
    return Math.min(100, Math.max(0, Math.round(raw)));
  }

  /**
   * Tripo documente `output.model` ; en pratique le GLB peut n’être que sous
   * `pbr_model` ou `base_model` (ex. text-to-model avec textures).
   */
  private pickTripoModelGlbUrl(output: unknown): string | undefined {
    if (output == null || typeof output !== 'object') {
      return undefined;
    }
    const o = output as Record<string, unknown>;
    const candidates: unknown[] = [
      o.model,
      o.pbr_model,
      o.base_model,
      o.pbrModel,
      o.baseModel,
    ];
    for (const c of candidates) {
      if (typeof c !== 'string') {
        continue;
      }
      const s = c.trim();
      if (s.startsWith('http://') || s.startsWith('https://')) {
        return s;
      }
    }
    return undefined;
  }

  /** Limite SSRF : seuls les hôtes de livraison de fichiers Tripo sont autorisés. */
  private assertTripoGlbDownloadUrl(raw: string): string {
    const s = String(raw ?? '').trim();
    let u: URL;
    try {
      u = new URL(s);
    } catch {
      throw new BadRequestException('URL du modèle invalide.');
    }
    if (u.protocol !== 'https:') {
      throw new BadRequestException('Seules les URLs HTTPS sont acceptées.');
    }
    const host = u.hostname.toLowerCase();
    const allowed =
      host === 'api.tripo3d.ai' ||
      host.endsWith('.data.tripo3d.com') ||
      host.endsWith('.tripo3d.ai');
    if (!allowed) {
      throw new BadRequestException(
        'Le téléchargement du GLB n’est autorisé que pour les domaines Tripo.',
      );
    }
    return u.toString();
  }

  /** Anti-SSRF : uniquement génération image Pollinations (`/prompt/…`). */
  private assertPollinationsImageUrl(raw: string): string {
    const s = String(raw ?? '').trim();
    let u: URL;
    try {
      u = new URL(s);
    } catch {
      throw new BadRequestException('URL image invalide.');
    }
    if (u.protocol !== 'https:') {
      throw new BadRequestException('Seules les URLs HTTPS sont acceptées.');
    }
    if (u.hostname.toLowerCase() !== 'image.pollinations.ai') {
      throw new BadRequestException(
        'Seules les URLs du service image Pollinations sont autorisées.',
      );
    }
    if (!u.pathname.startsWith('/prompt/')) {
      throw new BadRequestException('Chemin Pollinations non reconnu.');
    }
    return u.toString();
  }

  private looksLikeHtmlBuffer(buf: Buffer): boolean {
    const head = buf.subarray(0, Math.min(80, buf.length)).toString('utf8').trimStart();
    const lower = head.toLowerCase();
    return lower.startsWith('<!') || lower.startsWith('<html');
  }

  private shouldRetryPollinationsDownload(e: unknown): boolean {
    if (e instanceof BadRequestException) {
      return /429|502|503|504|408|html|indisponible|vide/i.test(e.message);
    }
    if (axios.isAxiosError(e)) {
      const s = e.response?.status;
      if (s === 429 || s === 502 || s === 503 || s === 504 || s === 408) {
        return true;
      }
      if (e.code === 'ECONNABORTED' || e.code === 'ECONNRESET' || e.code === 'ETIMEDOUT') {
        return true;
      }
    }
    return false;
  }

  /** Un seul GET Pollinations (sans retry). */
  private async fetchPollinationsImageOnce(url: string): Promise<{
    buffer: Buffer;
    contentType: string;
  }> {
    const res = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 180_000,
      maxContentLength: 25 * 1024 * 1024,
      maxBodyLength: 25 * 1024 * 1024,
      headers: {
        'User-Agent': POLLINATIONS_HTTP_UA,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      validateStatus: () => true,
    });
    if (res.status < 200 || res.status >= 300) {
      this.logger.warn(
        `Pollinations image HTTP ${res.status} (URL length ${url.length})`,
      );
      throw new BadRequestException(
        `Pollinations a renvoyé ${res.status} (image indisponible ou limite atteinte).`,
      );
    }
    const data = res.data;
    if (data == null || (data as ArrayBuffer).byteLength === 0) {
      throw new BadRequestException('Image Pollinations vide ou introuvable.');
    }
    const buffer = Buffer.from(data);
    const rawCt = res.headers['content-type'];
    const contentType =
      typeof rawCt === 'string'
        ? rawCt.split(';')[0]?.trim() || 'image/png'
        : 'image/png';
    if (contentType.includes('text/html') || this.looksLikeHtmlBuffer(buffer)) {
      throw new BadRequestException(
        'Pollinations a renvoyé du HTML au lieu d’une image (souvent rate limit).',
      );
    }
    return { buffer, contentType };
  }

  /**
   * Télécharge une image Pollinations côté serveur, avec retries (429 / erreurs transitoires).
   */
  async fetchPollinationsImageBuffer(rawUrl: string): Promise<{
    buffer: Buffer;
    contentType: string;
  }> {
    const url = this.assertPollinationsImageUrl(rawUrl);
    let lastErr: unknown;
    for (let attempt = 1; attempt <= POLLINATIONS_DOWNLOAD_MAX_ATTEMPTS; attempt++) {
      try {
        return await this.fetchPollinationsImageOnce(url);
      } catch (e) {
        lastErr = e;
        const canRetry =
          this.shouldRetryPollinationsDownload(e) &&
          attempt < POLLINATIONS_DOWNLOAD_MAX_ATTEMPTS;
        if (!canRetry) {
          if (e instanceof BadRequestException) {
            throw e;
          }
          this.rethrowAxios('Pollinations image download failed', e);
        }
        const waitMs = 9000 * attempt + randomInt(0, 4000);
        this.logger.warn(
          `Pollinations image tentative ${attempt}/${POLLINATIONS_DOWNLOAD_MAX_ATTEMPTS} échouée, nouvel essai dans ${waitMs}ms`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
    if (lastErr instanceof BadRequestException) {
      throw lastErr;
    }
    this.rethrowAxios('Pollinations image download failed', lastErr);
  }

  async fetchTripoGlbBuffer(rawUrl: string): Promise<Buffer> {
    const url = this.assertTripoGlbDownloadUrl(rawUrl);
    try {
      const res = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: 120_000,
        maxContentLength: 80 * 1024 * 1024,
        maxBodyLength: 80 * 1024 * 1024,
        headers: {
          'User-Agent': 'PiSmartSite-DreamHouse/1.0',
          Accept: '*/*',
        },
      });
      const data = res.data;
      if (data == null || (data as ArrayBuffer).byteLength === 0) {
        throw new BadRequestException('Fichier GLB vide ou introuvable.');
      }
      return Buffer.from(data);
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      this.rethrowAxios('Tripo GLB download failed', e);
    }
  }

  private assertValidTaskId(taskId: string): void {
    const t = String(taskId ?? '').trim();
    /** Tripo peut renvoyer des identifiants avec `.`, `:`, etc. — on refuse surtout les chemins d’URL. */
    if (!t || t.length > 200 || /[/\\]/.test(t) || t.includes('..')) {
      throw new BadRequestException('Identifiant de tâche Tripo invalide.');
    }
  }

  /**
   * Par défaut : génération 3D alignée sur la **1re image** Pollinations (`image_to_model`).
   * Désactiver : `DREAM_HOUSE_TRIPO_IMAGE_TO_MODEL=false` (repli `text_to_model` uniquement).
   */
  private isTripoImageToModelEnabled(): boolean {
    const v = process.env.DREAM_HOUSE_TRIPO_IMAGE_TO_MODEL?.trim().toLowerCase();
    if (v === '0' || v === 'false' || v === 'off' || v === 'no') {
      return false;
    }
    return true;
  }

  /** Valeurs `file.type` attendues par Tripo pour `image_to_model`. */
  private tripoImageKindFromContentType(raw: string): 'jpg' | 'png' | 'webp' {
    const ct = (raw ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
    if (ct === 'image/png') {
      return 'png';
    }
    if (ct === 'image/webp') {
      return 'webp';
    }
    return 'jpg';
  }

  /**
   * Upload binaire image → jeton Tripo (`POST /v2/openapi/upload`, champ `file`).
   * @see https://github.com/VAST-AI-Research/tripo-python-sdk (réponse `data.image_token`)
   */
  private async uploadTripoImageFromBuffer(
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const key = this.getTripoKey();
    const kind = this.tripoImageKindFromContentType(contentType);
    const filename =
      kind === 'jpg' ? 'dream-house-ref.jpg' : `dream-house-ref.${kind}`;
    const formMime =
      kind === 'jpg'
        ? 'image/jpeg'
        : kind === 'png'
          ? 'image/png'
          : 'image/webp';
    const form = new FormData();
    form.append('file', buffer, { filename, contentType: formMime });

    type TripoUploadBody = {
      code?: number;
      message?: string;
      data?: { image_token?: string; file_token?: string };
    };

    const res = await axios.post<TripoUploadBody>(TRIPO_UPLOAD_URL, form, {
      headers: {
        ...(form.getHeaders() as Record<string, string>),
        Authorization: `Bearer ${key}`,
      },
      timeout: 120_000,
      maxBodyLength: 30 * 1024 * 1024,
      maxContentLength: 30 * 1024 * 1024,
      validateStatus: () => true,
    });
    const payload = res.data;
    if (res.status < 200 || res.status >= 300 || payload?.code !== 0) {
      const msg =
        payload?.message ??
        `Tripo upload image HTTP ${res.status} (${JSON.stringify(payload).slice(0, 300)})`;
      throw new BadRequestException(msg);
    }
    const tok = payload.data?.image_token ?? payload.data?.file_token;
    if (!tok || String(tok).trim() === '') {
      throw new BadRequestException(
        'Tripo upload : réponse sans jeton d’image (image_token / file_token).',
      );
    }
    return String(tok).trim();
  }

  /** Tâche Tripo `text_to_model` (texte seul — repli si `image_to_model` échoue). */
  private async createTripoTextToModelTask(prompt: string): Promise<string> {
    const key = this.getTripoKey();
    const modelVersion =
      process.env.TRIPO_MODEL_VERSION?.trim() || TRIPO_MODEL_VERSION_DEFAULT;
    try {
      const textureOn = this.getTripoTextureEnabled();
      const quad = this.getTripoQuad();
      const faceLimit = this.getEffectiveTripoFaceLimit(quad);
      const body: Record<string, unknown> = {
        type: 'text_to_model',
        prompt,
        negative_prompt:
          'low poly garbage, broken walls, floating debris, watermark, text, logo',
        model_version: modelVersion,
        face_limit: faceLimit,
      };
      if (!textureOn) {
        body.texture = false;
      } else {
        body.texture = true;
        body.pbr = this.getTripoPbr();
        body.texture_quality = this.getTripoTextureQuality();
        body.geometry_quality = this.getTripoGeometryQuality();
      }
      if (quad) {
        body.quad = true;
      }
      const { data } = await axios.post<TripoCreateBody>(
        TRIPO_TASK_URL,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          timeout: 180_000,
        },
      );

      if (data.code !== 0 || !data.data?.task_id) {
        this.logger.warn(`Tripo create unexpected: ${JSON.stringify(data)}`);
        throw new BadRequestException(
          data.message ?? 'Tripo refused the generation task.',
        );
      }
      return data.data.task_id;
    } catch (e) {
      this.rethrowAxios('Tripo task creation failed', e);
    }
  }

  /**
   * Tâche Tripo `image_to_model` : le maillage suit la **même** image que la 1re vue Pollinations.
   */
  private async createTripoImageToModelTask(
    fileToken: string,
    fileKind: 'jpg' | 'png' | 'webp',
  ): Promise<string> {
    const key = this.getTripoKey();
    const modelVersion =
      process.env.TRIPO_MODEL_VERSION?.trim() || TRIPO_MODEL_VERSION_DEFAULT;
    try {
      const textureOn = this.getTripoTextureEnabled();
      const quad = this.getTripoQuad();
      const faceLimit = this.getEffectiveTripoFaceLimit(quad);
      const body: Record<string, unknown> = {
        type: 'image_to_model',
        file: {
          type: fileKind,
          file_token: fileToken,
        },
        model_version: modelVersion,
        face_limit: faceLimit,
        /** Coller à la photo de façade plutôt qu’à une interprétation libre des textures. */
        texture_alignment: 'original_image',
        orientation: 'align_image',
      };
      if (!textureOn) {
        body.texture = false;
      } else {
        body.texture = true;
        body.pbr = this.getTripoPbr();
        body.texture_quality = this.getTripoTextureQuality();
        body.geometry_quality = this.getTripoGeometryQuality();
      }
      if (quad) {
        body.quad = true;
      }
      const { data } = await axios.post<TripoCreateBody>(
        TRIPO_TASK_URL,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          timeout: 180_000,
        },
      );

      if (data.code !== 0 || !data.data?.task_id) {
        this.logger.warn(`Tripo image_to_model unexpected: ${JSON.stringify(data)}`);
        throw new BadRequestException(
          data.message ?? 'Tripo refused the image-to-model task.',
        );
      }
      return data.data.task_id;
    } catch (e) {
      this.rethrowAxios('Tripo image_to_model task creation failed', e);
    }
  }

  private rethrowAxios(context: string, e: unknown): never {
    if (axios.isAxiosError(e)) {
      const ax = e as AxiosError<{ message?: string; code?: number }>;
      const body = ax.response?.data;
      const bodyMsg =
        typeof body === 'object' && body !== null && 'message' in body
          ? String((body as { message: unknown }).message)
          : '';
      const msg = bodyMsg || ax.message || context;
      this.logger.error(`${context}: HTTP ${ax.response?.status ?? '?'} ${msg}`);
      const status = ax.response?.status;
      if (status === 401) {
        throw new ServiceUnavailableException(
          'Tripo a renvoyé 401 (non autorisé). Vérifiez TRIPO_API_KEY dans le fichier .env du backend ' +
            '(clé secrète Plateforme type `tsk_…`, sans guillemets ni second préfixe `Bearer`). ' +
            (bodyMsg ? `Détail : ${bodyMsg}` : ''),
        );
      }
      if (status === 403) {
        if (/credit|not enough|insufficient/i.test(bodyMsg)) {
          throw new HttpException(
            'Crédits Tripo insuffisants pour lancer une génération 3D (image-to-model ou text-to-model). ' +
              'Ajoutez des crédits ou souscrivez à une offre sur https://platform.tripo3d.ai, puis réessayez.',
            HttpStatus.PAYMENT_REQUIRED,
          );
        }
        throw new ServiceUnavailableException(
          'Tripo a renvoyé 403 (accès refusé). Vérifiez les droits du compte sur le tableau de bord Tripo ' +
            '(API activée, offre, quotas). ' +
            (bodyMsg ? `Détail : ${bodyMsg}` : ''),
        );
      }
      throw new BadRequestException(msg);
    }
    this.logger.error(context, e as Error);
    throw new ServiceUnavailableException(context);
  }

  async start(dto: DreamHouseRequestDto): Promise<{
    /** Première image (rétrocompat). */
    imageUrl: string;
    /** Plusieurs angles générés en parallèle (URLs Pollinations). */
    imageUrls: string[];
    taskId: string;
  }> {
    const batchSalt = randomInt(1, 2_147_483_646);
    const imageUrls = IMAGE_VIEW_HINTS.map((hint, idx) =>
      this.buildPollinationsImageUrl(
        this.buildImagePrompt(dto, hint, idx),
        (batchSalt + idx * 97_681) % 2_147_483_647,
      ),
    );

    let taskId: string;
    if (this.isTripoImageToModelEnabled()) {
      try {
        const { buffer, contentType } = await this.fetchPollinationsImageBuffer(
          imageUrls[0],
        );
        const fileKind = this.tripoImageKindFromContentType(contentType);
        const fileToken = await this.uploadTripoImageFromBuffer(buffer, contentType);
        taskId = await this.createTripoImageToModelTask(fileToken, fileKind);
        this.logger.log(
          'Dream House: Tripo image_to_model (référence = première vue Pollinations).',
        );
      } catch (e) {
        const detail =
          e instanceof BadRequestException
            ? e.message
            : e instanceof Error
              ? e.message
              : String(e);
        this.logger.warn(
          `Dream House: image_to_model ou upload Pollinations/Tripo impossible (${detail}) — repli text_to_model.`,
        );
        const tripoPrompt = await this.resolveTripoPrompt(dto);
        taskId = await this.createTripoTextToModelTask(tripoPrompt);
      }
    } else {
      const tripoPrompt = await this.resolveTripoPrompt(dto);
      taskId = await this.createTripoTextToModelTask(tripoPrompt);
    }

    return { imageUrl: imageUrls[0], imageUrls, taskId };
  }

  async getTripoTaskStatus(taskId: string): Promise<DreamHouseTripoStatusDto> {
    this.assertValidTaskId(taskId);
    const key = this.getTripoKey();
    let data: TripoStatusBody;
    try {
      const res = await axios.get<TripoStatusBody>(
        `${TRIPO_TASK_URL}/${encodeURIComponent(taskId)}`,
        {
          headers: { Authorization: `Bearer ${key}` },
          timeout: 30_000,
        },
      );
      data = res.data;
    } catch (e) {
      this.rethrowAxios('Tripo status request failed', e);
    }

    if (data.code !== 0) {
      throw new BadRequestException(
        data.message ?? 'Tripo returned an error while reading task status.',
      );
    }

    const raw = (data.data?.status ?? '').toLowerCase();
    const modelUrl = this.pickTripoModelGlbUrl(data.data?.output);
    const errDetail =
      data.data?.error ?? data.data?.message ?? data.message ?? '';
    const progress = this.normalizeTripoProgress(data.data?.progress);

    if (raw === 'success' && modelUrl) {
      return { status: 'success', modelGlbUrl: modelUrl, progress: 100 };
    }

    /** Tripo peut renvoyer `success` avant que les URLs `output.*` soient disponibles — on garde le polling. */
    if (raw === 'success' && !modelUrl) {
      return {
        status: 'running',
        message:
          'Finalisation côté Tripo : le fichier GLB est en cours de préparation ou d’upload.',
        progress:
          progress !== undefined && progress >= 100 ? 99 : progress,
      };
    }

    if (
      raw === 'failed' ||
      raw === 'cancelled' ||
      raw === 'canceled' ||
      raw === 'error'
    ) {
      return {
        status: raw === 'canceled' ? 'cancelled' : raw,
        message: errDetail || 'Tripo generation failed.',
        progress,
      };
    }

    const inFlight = new Set([
      'queued',
      'running',
      'processing',
      'waiting',
      'submitted',
      'pending',
    ]);
    if (inFlight.has(raw)) {
      const status =
        raw === 'waiting' || raw === 'submitted' || raw === 'pending'
          ? 'queued'
          : raw;
      return { status, message: errDetail || undefined, progress };
    }

    return {
      status: raw || 'unknown',
      message: errDetail || undefined,
      progress,
    };
  }
}
