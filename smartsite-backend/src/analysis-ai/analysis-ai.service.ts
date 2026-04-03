import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { Project } from '../projects/schemas/project.schema';
import { TaskDocument } from '../tasks/schemas/task.schema';
import { ProjectAssistantChatDto } from './dto/project-assistant-chat.dto';
import {
  AiAnalysisPayload,
  parseAiAnalysisPayload,
  projectAiInsightsResponseSchema,
  type AiAnalysisResponsePayload,
  type ProjectAiInsightsResponse,
} from './analysis-ai.zod';
import {
  computeEstimatedBudgetDeltaPercent,
  computeEstimatedDelayDays,
} from './analysis-ai.metrics';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const RETRIABLE_STATUSES = new Set([500, 502, 503, 504]);
const FALLBACK_CONFIDENCE = 0.45;

const ASSISTANT_SYSTEM_PROMPT = `Tu es un chef de projet senior (BTP / rénovation / maintenance). Tu réponds en français, de façon claire et concise (quelques phrases ou puces courtes).
Règles strictes :
- Tu t’appuies UNIQUEMENT sur le JSON « Données projet » fourni dans ce message système. Ne pas inventer de montants, dates ou tâches absents du JSON.
- Les champs chiffrés de pilotage (backendMetrics, budget, spentBudget, etc.) font foi ; ne les recalcule pas.
- Si une information manque dans le JSON, dis-le et propose une démarche générique sans supposer des faits.
- Pas de JSON dans ta réponse : texte naturel ou markdown léger (listes) uniquement.` as const;

/** Rapport affiché en premier dans l’assistant ; pas de question à l’utilisateur. */
const INITIAL_REPORT_SYSTEM_PROMPT = `Tu es un chef de projet senior (BTP / rénovation / maintenance). Tu rédiges UN rapport de synthèse en français, destiné à être lu tel quel par un utilisateur.

Structure obligatoire (titres en gras markdown ## ou ###) :
1. **Projet** — nom, type, lieu, statut, dates début/fin si présentes, budget alloué / dépenses enregistrées si présents, et en une phrase les métriques \`backendMetrics\` (estimatedBudgetDeltaPercent, estimatedDelayDays) en les interprétant comme dans l’analyse (écart budget signé, retard en jours).
2. **Tâches du projet** — liste ou puces : pour chaque tâche du tableau \`tasks\`, au minimum titre, statut, % avancement, priorité ; dates si présentes. Si aucune tâche, le signaler clairement et renvoyer brièvement à la description du projet.
3. **Points de vigilance** — 2 à 4 puces courtes, uniquement à partir des faits du JSON.

Règles :
- Uniquement des faits tirés du JSON fourni ; ne rien inventer.
- Ne pose AUCUNE question à l’utilisateur (pas de « souhaitez-vous », « voulez-vous », etc.).
- Pas de bloc JSON dans la réponse ; markdown léger autorisé.` as const;

const SYSTEM_PROMPT = `Tu es un chef de projet senior (BTP / rénovation / maintenance). Tu analyses un projet et ses tâches.
Tu dois répondre UNIQUEMENT par un objet JSON valide (sans markdown, sans texte autour), avec exactement ces clés :
{
  "summary": string (2-5 phrases),
  "topRisks": [ { "title": string, "impact": "low"|"medium"|"high", "action": string, "relatedTaskIds": string[] optionnel (0 à 8 ids, chaque id = un champ "_id" présent dans "tasks" du JSON utilisateur) } ],
  "nextActions": string[] (3 à 6 actions concrètes, priorisées),
  "budgetDelayTradeoff": {
    "recommendedMode": "economique"|"equilibre"|"accelere",
    "estimatedDelayDays": number,
    "estimatedBudgetDeltaPercent": number | null,
    "rationale": string
  },
  "confidence": number entre 0 et 1
}
IMPORTANT — métriques chiffrées : le message utilisateur contient un bloc "backendMetrics" avec estimatedBudgetDeltaPercent et estimatedDelayDays calculés par le serveur.
Tu DOIS recopier ces deux valeurs EXACTEMENT (même nombre, même null) dans budgetDelayTradeoff. Ne les recalcule pas, ne les arrondis pas différemment, ne les invente pas.
Convention obligatoire pour ton texte (summary, rationale) : estimatedBudgetDeltaPercent compare dépenses enregistrées (spentBudget) au budget alloué.
  • Valeur négative ou nulle = dépenses inférieures ou égales au budget (pas de dépassement à ce stade) ; ne jamais écrire « dépassement budgétaire » ni « surcoût » dans ce cas.
  • Valeur strictement positive = dépenses supérieures au budget (dépassement) ; tu peux alors parler de dérive ou dépassement.
  • null = budget non utilisable pour le ratio (ex. budget nul) ; n’invente pas de pourcentage dans le texte.
estimatedDelayDays = jours de retard calendaire (fin dépassée et projet non terminé) ; 0 = pas de retard calculé à la date du serveur.
Ton travail sur le chiffré s’arrête à recopier les deux champs ci-dessus : tu rédiges summary, topRisks, nextActions, recommendedMode, rationale et confidence en respectant cette convention de signe.

Qualité et ancrage (obligatoire) :
- Appuie-toi sur "description", "location", "type" et chaque entrée de "tasks" (titres, statut, %, dates). Ne reste pas dans des généralités applicables à tout chantier.
- topRisks : 2 à 6 entrées ; pour chaque risque, quand c’est pertinent, inclure "relatedTaskIds" avec les _id Mongo des tâches réellement concernées (copier depuis le champ _id de chaque tâche du JSON). Zéro id inventé.
- topRisks : chaque "title" et chaque "action" doit être distincte. Interdit : deux risques quasi identiques (ex. élec vs plomberie) avec la même phrase d’action copiée-collée — regroupe en un seul risque « Second œuvre / fluides » avec une action combinée, ou différencie nettement les actions.
- nextActions : 3 à 6 formulations uniques, vérifiables, ordre de priorité décroissante ; aucune ligne répétée ou paraphrasée à l’identique.
- Si "tasks" est vide ou quasi vide, découpe la description en lots (lignes / puces) et propose des actions concrètes par lot (ex. peinture, carrelage, parquet) plutôt que la même formule « conformité aux normes » répétée.
- budgetDelayTradeoff.rationale : 1 à 3 phrases en français, qui interprètent le couple (estimatedBudgetDeltaPercent recopié, estimatedDelayDays recopié) et justifient recommendedMode — sans nouveau chiffre ni nouveau pourcentage.
- recommendedMode : cohérent avec les métriques (ex. retard > 0 → "accelere" souvent pertinent ; dépenses > budget → privilégier "economique" pour contenir ; sous-dépense et pas de retard → "equilibre" ou "economique" selon marge).
- confidence : abaisse-la (ex. 0.45–0.65) si peu de tâches ou description très courte, sinon 0.65–0.85 réaliste.

Si startDate ou endDate sont null, raisonne sans supposer de dates manquantes comme retard avéré.
` as const;

type GroqChatCompletionResponse = {
  choices?: ReadonlyArray<{
    message?: { content?: string | null };
  }>;
};

@Injectable()
export class AnalysisAiService {
  private readonly logger = new Logger(AnalysisAiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
  ) {}

  async generateInsights(projectId: string): Promise<ProjectAiInsightsResponse> {
    const project = await this.projectsService.findOne(projectId);
    const tasks = await this.tasksService.findByProject(projectId);
    const now = new Date();
    const backendMetrics = this.computeBackendMetrics(project, now);
    const contextJson = this.buildProjectContext(project, tasks, backendMetrics);

    let rawModelText: string;
    try {
      rawModelText = await this.callGroqChat(contextJson);
    } catch (err) {
      if (err instanceof HttpException) {
        const code = err.getStatus();
        if (
          code === HttpStatus.UNAUTHORIZED ||
          code === HttpStatus.FORBIDDEN ||
          code === HttpStatus.TOO_MANY_REQUESTS ||
          code === HttpStatus.BAD_GATEWAY
        ) {
          throw err;
        }
      }
      this.logger.error(`Groq unexpected error project=${projectId}: ${this.redactError(err)}`);
      throw new BadGatewayException('Groq request failed');
    }

    const generatedAt = now.toISOString();

    try {
      const jsonText = this.extractJsonObject(rawModelText);
      const parsed: unknown = JSON.parse(jsonText);
      const analysis = parseAiAnalysisPayload(parsed);
      this.enforceBackendBudgetDelay(analysis, backendMetrics);
      const enriched = this.enrichAnalysisRisks(analysis, tasks);
      return projectAiInsightsResponseSchema.parse({
        projectId,
        generatedAt,
        source: 'groq',
        analysis: enriched,
      });
    } catch {
      this.logger.warn(`Invalid or incomplete Groq JSON for project=${projectId}, using deterministic fallback`);
      const analysis = this.buildFallbackAnalysis(project, tasks, backendMetrics);
      const enriched = this.enrichAnalysisRisks(analysis, tasks);
      return projectAiInsightsResponseSchema.parse({
        projectId,
        generatedAt,
        source: 'fallback',
        analysis: enriched,
      });
    }
  }

  async chatProject(projectId: string, dto: ProjectAssistantChatDto): Promise<{ reply: string }> {
    const trimmed = dto.messages.slice(-10);
    if (trimmed.length === 0) {
      throw new BadRequestException('messages must not be empty');
    }
    if (trimmed[trimmed.length - 1].role !== 'user') {
      throw new BadRequestException('Last message must be from user');
    }

    const project = await this.projectsService.findOne(projectId);
    const tasks = await this.tasksService.findByProject(projectId);
    const now = new Date();
    const backendMetrics = this.computeBackendMetrics(project, now);
    const contextJson = this.buildProjectContext(project, tasks, backendMetrics);

    const systemContent = `${ASSISTANT_SYSTEM_PROMPT}\n\nDonnées projet (JSON) :\n${contextJson}`;

    const model = this.configService.get<string>('GROQ_MODEL', 'llama-3.1-8b-instant');
    const res = await this.executeGroqRequest({
      model,
      temperature: 0.35,
      messages: [
        { role: 'system', content: systemContent },
        ...trimmed.map((m) => ({ role: m.role, content: m.content })),
      ],
    });
    this.mapGroqErrors(res);
    const data = (await res.json()) as GroqChatCompletionResponse;
    const reply = this.readGroqContent(data).trim();
    if (!reply) {
      throw new BadGatewayException('Groq returned empty assistant reply');
    }
    return { reply };
  }

  /** Rapport automatique (projet + tâches) avant toute question optionnelle. */
  async initialAssistantReport(projectId: string): Promise<{ report: string }> {
    const project = await this.projectsService.findOne(projectId);
    const tasks = await this.tasksService.findByProject(projectId);
    const now = new Date();
    const backendMetrics = this.computeBackendMetrics(project, now);
    const contextJson = this.buildProjectContext(project, tasks, backendMetrics);

    const systemContent = `${INITIAL_REPORT_SYSTEM_PROMPT}\n\nDonnées projet (JSON) :\n${contextJson}`;

    const model = this.configService.get<string>('GROQ_MODEL', 'llama-3.1-8b-instant');
    const res = await this.executeGroqRequest({
      model,
      temperature: 0.25,
      messages: [
        { role: 'system', content: systemContent },
        {
          role: 'user',
          content:
            'Rédige le rapport structuré demandé. Termine sans poser de question.',
        },
      ],
    });
    this.mapGroqErrors(res);
    const data = (await res.json()) as GroqChatCompletionResponse;
    const report = this.readGroqContent(data).trim();
    if (!report) {
      throw new BadGatewayException('Groq returned empty report');
    }
    this.logger.log(`assistant initial report ok project=${projectId} length=${report.length}`);
    return { report };
  }

  private computeBackendMetrics(
    project: Project,
    now: Date,
  ): { estimatedBudgetDeltaPercent: number | null; estimatedDelayDays: number } {
    const endDate = project.endDate ? new Date(project.endDate) : null;
    return {
      estimatedBudgetDeltaPercent: computeEstimatedBudgetDeltaPercent(
        project.budget,
        project.spentBudget,
      ),
      estimatedDelayDays: computeEstimatedDelayDays(endDate, project.status, now),
    };
  }

  private enforceBackendBudgetDelay(
    analysis: AiAnalysisPayload,
    metrics: { estimatedBudgetDeltaPercent: number | null; estimatedDelayDays: number },
  ): void {
    analysis.budgetDelayTradeoff.estimatedBudgetDeltaPercent = metrics.estimatedBudgetDeltaPercent;
    analysis.budgetDelayTradeoff.estimatedDelayDays = metrics.estimatedDelayDays;
  }

  private enrichAnalysisRisks(
    analysis: AiAnalysisPayload,
    tasks: TaskDocument[],
  ): AiAnalysisResponsePayload {
    const validIds = new Set(tasks.map((t) => String(t._id)));
    const titleById = new Map(tasks.map((t) => [String(t._id), t.title]));
    const topRisks = analysis.topRisks.map((r) => {
      const ids = [
        ...new Set((r.relatedTaskIds ?? []).filter((id) => validIds.has(id))),
      ].slice(0, 8);
      return {
        title: r.title,
        impact: r.impact,
        action: r.action,
        relatedTaskIds: ids,
        relatedTasks: ids.map((id) => ({
          id,
          title: titleById.get(id) ?? 'Task',
        })),
      };
    });
    return {
      ...analysis,
      topRisks,
    };
  }

  private buildProjectContext(
    project: Project,
    tasks: TaskDocument[],
    backendMetrics: { estimatedBudgetDeltaPercent: number | null; estimatedDelayDays: number },
  ): string {
    const payload = {
      name: project.name,
      description: project.description ?? '',
      startDate: project.startDate ? new Date(project.startDate).toISOString() : null,
      endDate: project.endDate ? new Date(project.endDate).toISOString() : null,
      status: project.status,
      type: project.type,
      budget: project.budget ?? null,
      spentBudget: typeof project.spentBudget === 'number' ? project.spentBudget : 0,
      location: project.location ?? '',
      createdBy: String(project.createdBy),
      backendMetrics,
      tasks: tasks.map((t) => ({
        _id: String(t._id),
        title: t.title,
        status: t.status,
        priority: t.priority,
        progress: t.progress,
        duration: t.duration,
        startDate: t.startDate ? new Date(t.startDate).toISOString() : null,
        endDate: t.endDate ? new Date(t.endDate).toISOString() : null,
        dependsOnCount: Array.isArray(t.dependsOn) ? t.dependsOn.length : 0,
      })),
    };
    return JSON.stringify(payload);
  }

  private taskIdsOverdueEnd(tasks: TaskDocument[], now: Date): string[] {
    return tasks
      .filter((t) => {
        if (t.status === 'Terminé' || !t.endDate) return false;
        const e = new Date(t.endDate);
        return !Number.isNaN(e.getTime()) && e.getTime() < now.getTime();
      })
      .map((t) => String(t._id))
      .slice(0, 8);
  }

  private taskIdsNotDone(tasks: TaskDocument[]): string[] {
    return tasks
      .filter((t) => t.status !== 'Terminé')
      .map((t) => String(t._id))
      .slice(0, 8);
  }

  private taskIdsLowProgress(tasks: TaskDocument[]): string[] {
    return tasks
      .filter((t) => t.status !== 'Terminé' && (t.progress ?? 0) < 35)
      .map((t) => String(t._id))
      .slice(0, 8);
  }

  private taskIdsHeavyDeps(tasks: TaskDocument[]): string[] {
    return tasks
      .filter((t) => (t.dependsOn?.length ?? 0) > 1)
      .map((t) => String(t._id))
      .slice(0, 8);
  }

  private buildFallbackAnalysis(
    project: Project,
    tasks: TaskDocument[],
    backendMetrics: { estimatedBudgetDeltaPercent: number | null; estimatedDelayDays: number },
  ): AiAnalysisPayload {
    const now = new Date();
    const end = project.endDate ? new Date(project.endDate) : null;
    const status = project.status;
    const risks: AiAnalysisPayload['topRisks'] = [];

    if (end !== null && !Number.isNaN(end.getTime()) && end.getTime() < now.getTime() && status !== 'Terminé') {
      const ids = this.taskIdsOverdueEnd(tasks, now);
      risks.push({
        title: "Échéance dépassée alors que le projet n'est pas terminé",
        impact: 'high',
        action: 'Réviser le planning, arbitrer le périmètre ou demander une extension documentée.',
        relatedTaskIds:
          ids.length > 0 ? ids : this.taskIdsNotDone(tasks).slice(0, 5),
      });
    }

    if (typeof project.budget === 'number' && project.budget > 0 && status === 'En retard') {
      risks.push({
        title: 'Retard déclaré avec budget défini : risque de dérive coûts',
        impact: 'high',
        action: 'Geler les postes non essentiels et suivre les écarts budget / semaine.',
        relatedTaskIds: this.taskIdsNotDone(tasks).slice(0, 5),
      });
    }

    const avgProgress =
      tasks.length > 0 ? tasks.reduce((s, t) => s + (t.progress ?? 0), 0) / tasks.length : 0;
    if (tasks.length >= 3 && avgProgress < 35 && status === 'En cours') {
      const ids = this.taskIdsLowProgress(tasks);
      risks.push({
        title: 'Avancement moyen faible avec volume de tâches significatif',
        impact: 'medium',
        action: 'Identifier le chemin critique et lever les blocages sur les tâches prioritaires.',
        relatedTaskIds: ids.length > 0 ? ids : this.taskIdsNotDone(tasks).slice(0, 5),
      });
    }

    const depHeavy = tasks.filter((t) => (t.dependsOn?.length ?? 0) > 1).length;
    if (depHeavy >= 2) {
      const ids = this.taskIdsHeavyDeps(tasks);
      risks.push({
        title: 'Plusieurs tâches à dépendances multiples',
        impact: 'medium',
        action: 'Cartographier les dépendances et séquencer les livraisons pour éviter les impasses.',
        relatedTaskIds: ids.length > 0 ? ids : undefined,
      });
    }

    if (tasks.length === 0 && (project.description?.trim().length ?? 0) > 40) {
      risks.push({
        title: 'Périmètre décrit mais peu ou pas de tâches structurées dans l’outil',
        impact: 'medium',
        action:
          'Découper la description en tâches (lots, jalons, responsables) pour suivre avancement et coûts lot par lot.',
      });
    }

    while (risks.length < 2) {
      risks.push({
        title: 'Pilotage à structurer',
        impact: 'low',
        action: 'Tenir un rituel court hebdomadaire (délai, budget, risques, décisions).',
      });
    }

    const { recommendedMode, rationale } = this.buildFallbackBudgetModeRationale(
      backendMetrics,
    );
    const summary = this.buildFallbackSummary(project, tasks);

    return {
      summary,
      topRisks: risks.slice(0, 6),
      nextActions: this.buildFallbackNextActions(project, tasks, risks),
      budgetDelayTradeoff: {
        recommendedMode,
        estimatedDelayDays: backendMetrics.estimatedDelayDays,
        estimatedBudgetDeltaPercent: backendMetrics.estimatedBudgetDeltaPercent,
        rationale,
      },
      confidence: this.fallbackConfidence(project, tasks),
    };
  }

  private buildFallbackBudgetModeRationale(metrics: {
    estimatedBudgetDeltaPercent: number | null;
    estimatedDelayDays: number;
  }): { recommendedMode: 'economique' | 'equilibre' | 'accelere'; rationale: string } {
    const delay = metrics.estimatedDelayDays;
    const d = metrics.estimatedBudgetDeltaPercent;

    if (delay > 0) {
      return {
        recommendedMode: 'accelere',
        rationale: `Retard de ${delay} jour(s) à la date de référence : privilégier le rattrapage planifiable (re séquencement, arbitrages) sans ignorer la marge budget${d === null ? '' : ` (écart enregistré côté budget : ${d} %)`}.`,
      };
    }
    if (d !== null && d > 0) {
      return {
        recommendedMode: 'economique',
        rationale: `Les dépenses enregistrées dépassent le budget alloué (écart ${d} %) : mode économique pour contenir périmètre et coûts.`,
      };
    }
    if (d !== null && d < 0) {
      return {
        recommendedMode: 'equilibre',
        rationale: `Les dépenses sont inférieures au budget alloué (écart ${d} %) et aucun retard calendaire calculé : conserver un pilotage équilibré (qualité / délai / coût) jusqu’au prochain jalon.`,
      };
    }
    return {
      recommendedMode: 'equilibre',
      rationale:
        'Sans détail de ratio budget ou sans écart calculable : posture équilibrée ; affiner quand le budget et les dépenses seront saisis de façon fiable.',
    };
  }

  private buildFallbackSummary(project: Project, tasks: TaskDocument[]): string {
    const base = `Analyse en mode secours (sans LLM) pour « ${project.name} »`;
    const tail =
      tasks.length > 0
        ? ` — ${tasks.length} tâche(s), statut projet ${project.status}.`
        : ` — statut ${project.status}, aucune ou peu de tâches ; s’appuyer sur la description pour structurer le suivi.`;
    return base + tail;
  }

  private buildFallbackNextActions(
    project: Project,
    tasks: TaskDocument[],
    risks: Array<{ title: string; action: string }>,
  ): string[] {
    const actions: string[] = [
      'Prioriser deux décisions de cadrage (périmètre, budget ou calendrier) sous 7 jours.',
      'Mettre à jour les dates et statuts des tâches critiques dans l’outil de suivi.',
    ];
    if (tasks.length === 0) {
      actions.push(
        'Créer les tâches principales à partir de la description du projet (lots, jalons, ordre).',
      );
    } else {
      actions.push('Identifier les tâches au chemin critique ou en retard de jalon.');
    }
    const firstRisk = risks[0];
    if (firstRisk) {
      actions.push(`Traiter en priorité : ${firstRisk.title} — ${firstRisk.action}`);
    } else {
      actions.push('Attribuer un responsable unique par risque majeur.');
    }
    return actions.slice(0, 6);
  }

  /** Confiance plus basse si peu de données exploitables. */
  private fallbackConfidence(project: Project, tasks: TaskDocument[]): number {
    const descLen = project.description?.trim().length ?? 0;
    if (tasks.length >= 3 && descLen > 30) return 0.52;
    if (tasks.length === 0 && descLen < 20) return 0.38;
    return FALLBACK_CONFIDENCE;
  }

  private async callGroqChat(contextJson: string): Promise<string> {
    const model = this.configService.get<string>('GROQ_MODEL', 'llama-3.1-8b-instant');
    const started = Date.now();
    const res = await this.executeGroqRequest({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Données projet (JSON, inclut backendMetrics) :\n${contextJson}`,
        },
      ],
    });
    this.mapGroqErrors(res);
    const data = (await res.json()) as GroqChatCompletionResponse;
    const ms = Date.now() - started;
    this.logger.log(`groq completion ok latency_ms=${ms}`);
    return this.readGroqContent(data);
  }

  private mapGroqErrors(res: Response): void {
    if (res.status === 401) {
      throw new UnauthorizedException('Groq authentication failed');
    }
    if (res.status === 403) {
      throw new ForbiddenException('Groq access denied');
    }
    if (res.status === 429) {
      throw new HttpException('Groq rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!res.ok) {
      throw new BadGatewayException(`Groq upstream error: HTTP ${res.status}`);
    }
  }

  private readGroqContent(data: GroqChatCompletionResponse): string {
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new BadGatewayException('Groq returned empty content');
    }
    return content;
  }

  private async executeGroqRequest(body: Record<string, unknown>): Promise<Response> {
    const apiKey = this.configService.getOrThrow<string>('GROQ_API_KEY');
    const timeoutMs = this.configService.get<number>('GROQ_TIMEOUT_MS', 10_000);

    const attempt = async (): Promise<Response> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(GROQ_CHAT_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    };

    try {
      const first = await attempt();
      if (RETRIABLE_STATUSES.has(first.status)) {
        return attempt();
      }
      return first;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new BadGatewayException('Groq request timed out');
      }
      try {
        return await attempt();
      } catch (err2) {
        if (err2 instanceof Error && err2.name === 'AbortError') {
          throw new BadGatewayException('Groq request timed out');
        }
        throw new BadGatewayException('Groq network error');
      }
    }
  }

  private extractJsonObject(raw: string): string {
    let text = raw.trim();
    const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(text);
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

  private redactError(err: unknown): string {
    if (err instanceof Error) {
      return err.name;
    }
    return 'unknown';
  }
}
