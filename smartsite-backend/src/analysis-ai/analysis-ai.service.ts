import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
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

const ASSISTANT_SYSTEM_PROMPT = `You are a senior construction project manager (building / renovation / maintenance). Reply in **English**, clearly and concisely (short paragraphs or brief bullet points).
Strict rules:
- Rely ONLY on the "Project data" JSON provided in this system message. Do not invent amounts, dates, or tasks that are not in the JSON.
- Numeric steering fields (backendMetrics, budget, spentBudget, etc.) are authoritative; do not recalculate them.
- If information is missing in the JSON, say so and suggest a generic next step without assuming facts.
- No JSON in your reply: natural language or light markdown (lists) only.
Topics to cover depending on the user's question:
- Risks: cross-check facts (tasks, planningSignals, backendMetrics) without inventing risks absent from the data.
- Planning: milestones, sequence, dependencies (dependsOn / planningSignals.blockedTasks), filling missing dates (planningSignals.tasksMissingDates).
- Delays: estimatedDelayDays, overdueTasks, blocked tasks; stay factual.
- Automation / repetitive work: use planningSignals.repetitiveClusters and suggest checklists, task templates, cadence — do not promise integrations that do not exist.` as const;

/** First report shown in the assistant; do not ask the user a question. */
const INITIAL_REPORT_SYSTEM_PROMPT = `You are a senior construction project manager (building / renovation / maintenance). You write ONE summary report in **English**, meant to be read as-is by a user.

Required structure (markdown ## or ### headings):
1. **Project** — name, type, location, status, start/end dates if present, budget / recorded spend if present, and one sentence on \`backendMetrics\` (estimatedBudgetDeltaPercent, estimatedDelayDays) as in the analysis (signed budget gap, delay in days).
2. **Project tasks** — list or bullets: for each row in \`tasks\`, at least title, status, progress %, priority; dates if present; mention dependencies if \`dependsOn\` is non-empty. If there are no tasks, state it clearly and briefly refer to the project description.
3. **Watch points** — 2–4 short bullets, facts from the JSON only.
4. **Delays and blockages** — overdue tasks (planningSignals.overdueTasks), tasks blocked by predecessors (planningSignals.blockedTasks), tasks missing full dates (planningSignals.tasksMissingDates); if nothing to report, say so in one sentence.
5. **Planning and automation** — 3–5 bullets: milestone or sequencing ideas, and ideas to reduce repetitive load (similar batches in planningSignals.repetitiveClusters, checklists, batch updates) without inventing tools.

Rules:
- Only facts from the provided JSON; invent nothing.
- Do NOT ask the user any question (no "would you like", etc.).
- No JSON block in the reply; light markdown allowed.` as const;

const SYSTEM_PROMPT = `You are a senior construction project manager (building / renovation / maintenance). You analyze a project and its tasks.
You must reply with ONLY a valid JSON object (no markdown, no surrounding text), with exactly these keys:
{
  "summary": string (2–5 sentences),
  "topRisks": [ { "title": string, "impact": "low"|"medium"|"high", "action": string, "relatedTaskIds": string[] optional (0–8 ids, each id = an "_id" field present in "tasks" in the user JSON) } ],
  "nextActions": string[] (3–6 concrete, prioritized actions),
  "budgetDelayTradeoff": {
    "recommendedMode": "economique"|"equilibre"|"accelere",
    "estimatedDelayDays": number,
    "estimatedBudgetDeltaPercent": number | null,
    "rationale": string
  },
  "confidence": number between 0 and 1,
  "delayAnalysis": {
    "summary": string (2–4 factual sentences on project/task delays, using backendMetrics.estimatedDelayDays and planningSignals),
    "contributingFactors": string[] (2–6 short factual factors; e.g. overdue tasks, blockages, project deadline)
  },
  "planningSuggestions": string[] (4–8 concrete suggestions: milestones, sequence, buffers, missing dates, unblocking dependencies),
  "repetitiveWorkAndAutomation": string[] (2–6 ideas: task templates, checklists, grouping repetitive batches from repetitiveClusters, review cadence)
}

LANGUAGE: Every human-readable string you write in this JSON (summary, topRisks title/action, nextActions, rationale, delayAnalysis, planningSuggestions, repetitiveWorkAndAutomation) MUST be in **English**. Input task titles may be in any language—keep them when referencing tasks; your own analysis text must be English.

IMPORTANT — numeric metrics: the user message includes a "backendMetrics" block with estimatedBudgetDeltaPercent and estimatedDelayDays computed by the server.
You MUST copy those two values EXACTLY (same number, same null) into budgetDelayTradeoff. Do not recalculate, re-round, or invent them.
Required convention for your text (summary, rationale): estimatedBudgetDeltaPercent compares recorded spend (spentBudget) to allocated budget.
  • Negative or zero = spend at or under budget (no overrun at this stage); never write "budget overrun" or "cost overrun" in that case.
  • Strictly positive = spend above budget (overrun); you may then mention variance or overrun.
  • null = budget not usable for the ratio (e.g. zero budget); do not invent a percentage in the text.
estimatedDelayDays = calendar delay days (end date passed and project not done); 0 = no delay computed at the server date.
Your numeric work stops at copying those two fields: you write summary, topRisks, nextActions, recommendedMode, rationale, and confidence following this sign convention.

Quality and grounding (required):
- Ground yourself in "description", "location", "type", and each "tasks" entry (titles, status, %, dates). Avoid generic claims that fit any site.
- topRisks: 2–6 items; when relevant, include "relatedTaskIds" with Mongo _id of actually affected tasks (copy from each task's _id in the JSON). No invented ids.
- topRisks: each "title" and "action" must be distinct. Do not duplicate near-identical risks with copy-pasted actions—merge (e.g. "MEP / second fix") or clearly differentiate actions.
- nextActions: 3–6 unique, verifiable lines, descending priority; no duplicate or identical paraphrases.
- If "tasks" is empty or almost empty, split the description into work packages and propose concrete actions per package (e.g. paint, tile, flooring) instead of repeating the same generic compliance line.
- budgetDelayTradeoff.rationale: 1–3 sentences in **English** interpreting (copied estimatedBudgetDeltaPercent, copied estimatedDelayDays) and justifying recommendedMode—no new numbers or percentages.
- recommendedMode: consistent with metrics (e.g. delay > 0 → "accelere" often fits; spend > budget → prefer "economique" to contain; under-spend and no delay → "equilibre" or "economique" by margin).
- confidence: lower (e.g. 0.45–0.65) if few tasks or very short description, else 0.65–0.85 is realistic.
- delayAnalysis: grounded in backendMetrics and planningSignals (overdueTasks, blockedTasks); must not contradict estimatedDelayDays.
- planningSuggestions: at least one suggestion if tasksMissingDates or blockedTasks is non-empty.
- repetitiveWorkAndAutomation: if repetitiveClusters is empty, still propose generic steering automation (reviews, templates) without inventing batches.

If startDate or endDate are null, reason without treating missing dates as proven delay.
` as const;

type PlanningSignals = {
  overdueTasks: ReadonlyArray<{ id: string; title: string; endDate: string }>;
  blockedTasks: ReadonlyArray<{ id: string; title: string; blockedByIds: string[] }>;
  repetitiveClusters: ReadonlyArray<{ normalizedLabel: string; taskIds: string[] }>;
  tasksMissingDates: ReadonlyArray<{ id: string; title: string }>;
};

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
      const detail =
        err instanceof Error ? `${err.name}: ${err.message}` : this.redactError(err);
      this.logger.error(`Groq unexpected error project=${projectId}: ${detail}`);
      throw new BadGatewayException(
        err instanceof Error && err.message
          ? `Groq request failed — ${err.message}`
          : 'Groq request failed',
      );
    }

    const generatedAt = now.toISOString();

    try {
      const jsonText = this.extractJsonObject(rawModelText);
      const parsed: unknown = JSON.parse(jsonText);
      const analysis = parseAiAnalysisPayload(parsed);
      this.enforceBackendBudgetDelay(analysis, backendMetrics);
      const enriched = this.enrichAnalysisRisks(analysis, tasks);
      const finalized = this.finalizeExtendedAnalysis(enriched, project, tasks, backendMetrics, now);
      return projectAiInsightsResponseSchema.parse({
        projectId,
        generatedAt,
        source: 'groq',
        analysis: finalized,
      });
    } catch {
      this.logger.warn(`Invalid or incomplete Groq JSON for project=${projectId}, using deterministic fallback`);
      const analysis = this.buildFallbackAnalysis(project, tasks, backendMetrics);
      const enriched = this.enrichAnalysisRisks(analysis, tasks);
      const finalized = this.finalizeExtendedAnalysis(enriched, project, tasks, backendMetrics, now);
      return projectAiInsightsResponseSchema.parse({
        projectId,
        generatedAt,
        source: 'fallback',
        analysis: finalized,
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

    const systemContent = `${ASSISTANT_SYSTEM_PROMPT}\n\nProject data (JSON):\n${contextJson}`;

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
    const data = await this.parseGroqChatCompletionBody(res);
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

    const systemContent = `${INITIAL_REPORT_SYSTEM_PROMPT}\n\nProject data (JSON):\n${contextJson}`;

    const model = this.configService.get<string>('GROQ_MODEL', 'llama-3.1-8b-instant');
    const res = await this.executeGroqRequest({
      model,
      temperature: 0.25,
      messages: [
        { role: 'system', content: systemContent },
        {
          role: 'user',
          content:
            'Write the structured report as specified. End without asking any question.',
        },
      ],
    });
    this.mapGroqErrors(res);
    const data = await this.parseGroqChatCompletionBody(res);
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
      summary: analysis.summary,
      topRisks,
      nextActions: analysis.nextActions,
      budgetDelayTradeoff: analysis.budgetDelayTradeoff,
      confidence: analysis.confidence,
      delayAnalysis: analysis.delayAnalysis ?? {
        summary: '',
        contributingFactors: [],
      },
      planningSuggestions: analysis.planningSuggestions ?? [],
      repetitiveWorkAndAutomation: analysis.repetitiveWorkAndAutomation ?? [],
    };
  }

  /**
   * Complète les champs étendus (retards, planning, automatisation) si le LLM les a omis ou partiellement remplis.
   */
  private finalizeExtendedAnalysis(
    enriched: AiAnalysisResponsePayload,
    project: Project,
    tasks: TaskDocument[],
    backendMetrics: { estimatedBudgetDeltaPercent: number | null; estimatedDelayDays: number },
    now: Date,
  ): AiAnalysisResponsePayload {
    const signals = this.buildPlanningSignals(tasks, now);

    const groqDelayOk =
      enriched.delayAnalysis.summary.trim().length > 0 &&
      enriched.delayAnalysis.contributingFactors.length > 0;
    const delayAnalysis = groqDelayOk
      ? {
          summary: enriched.delayAnalysis.summary.trim(),
          contributingFactors: enriched.delayAnalysis.contributingFactors.slice(0, 8),
        }
      : this.buildHeuristicDelayAnalysis(signals, backendMetrics, tasks);

    const planningSuggestions =
      enriched.planningSuggestions.length > 0
        ? enriched.planningSuggestions.slice(0, 10)
        : this.buildHeuristicPlanningSuggestions(signals, project, tasks);

    const repetitiveWorkAndAutomation =
      enriched.repetitiveWorkAndAutomation.length > 0
        ? enriched.repetitiveWorkAndAutomation.slice(0, 8)
        : this.buildHeuristicAutomation(signals, tasks);

    return {
      ...enriched,
      delayAnalysis,
      planningSuggestions,
      repetitiveWorkAndAutomation,
    };
  }

  private buildPlanningSignals(tasks: TaskDocument[], now: Date): PlanningSignals {
    const byId = new Map(tasks.map((t) => [String(t._id), t]));

    const overdueTasks = tasks
      .filter((t) => {
        if (t.status === 'Terminé' || !t.endDate) return false;
        const e = new Date(t.endDate);
        return !Number.isNaN(e.getTime()) && e.getTime() < now.getTime();
      })
      .slice(0, 12)
      .map((t) => ({
        id: String(t._id),
        title: t.title,
        endDate: new Date(t.endDate!).toISOString(),
      }));

    const blockedTasks = tasks
      .filter((t) => {
        if (t.status === 'Terminé') return false;
        const deps = t.dependsOn ?? [];
        if (deps.length === 0) return false;
        return deps.some((depId) => {
          const d = byId.get(String(depId));
          return d != null && d.status !== 'Terminé';
        });
      })
      .slice(0, 12)
      .map((t) => {
        const blockedByIds = (t.dependsOn ?? []).filter((id) => {
          const d = byId.get(String(id));
          return d != null && d.status !== 'Terminé';
        });
        return {
          id: String(t._id),
          title: t.title,
          blockedByIds: blockedByIds.map(String),
        };
      });

    const normTitle = (s: string) =>
      s
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 48);

    const buckets = new Map<string, string[]>();
    for (const t of tasks) {
      const k = normTitle(t.title);
      if (!k) continue;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k)!.push(String(t._id));
    }
    const repetitiveClusters = [...buckets.entries()]
      .filter(([, ids]) => ids.length >= 2)
      .map(([label, ids]) => ({ normalizedLabel: label, taskIds: ids.slice(0, 8) }))
      .slice(0, 6);

    const tasksMissingDates = tasks
      .filter((t) => !t.startDate || !t.endDate)
      .slice(0, 15)
      .map((t) => ({ id: String(t._id), title: t.title }));

    return {
      overdueTasks,
      blockedTasks,
      repetitiveClusters,
      tasksMissingDates,
    };
  }

  private buildHeuristicDelayAnalysis(
    signals: PlanningSignals,
    backendMetrics: { estimatedBudgetDeltaPercent: number | null; estimatedDelayDays: number },
    tasks: TaskDocument[],
  ): { summary: string; contributingFactors: string[] } {
    const factors: string[] = [];
    if (backendMetrics.estimatedDelayDays > 0) {
      factors.push(
        `Project delay (end date passed, project not finished): about ${backendMetrics.estimatedDelayDays} day(s).`,
      );
    }
    for (const t of signals.overdueTasks.slice(0, 4)) {
      factors.push(`Task past end date: "${t.title}".`);
    }
    if (signals.blockedTasks.length > 0) {
      factors.push(
        `${signals.blockedTasks.length} task(s) still waiting on unfinished predecessors (chain risk).`,
      );
    }
    if (
      factors.length === 0 &&
      typeof backendMetrics.estimatedBudgetDeltaPercent === 'number' &&
      backendMetrics.estimatedBudgetDeltaPercent > 0
    ) {
      factors.push('Recorded budget overrun: schedule pressure if not addressed.');
    }
    if (factors.length === 0) {
      factors.push(
        tasks.length === 0
          ? 'No instrumented tasks: cannot analyze task-level delays.'
          : 'No significant task or project end-date delay at the reference date.',
      );
    }

    let summary: string;
    if (backendMetrics.estimatedDelayDays > 0) {
      summary = `The project shows about ${backendMetrics.estimatedDelayDays} calendar day(s) delay versus the planned end date.`;
      if (signals.overdueTasks.length > 0) {
        summary += ` In parallel, at least ${signals.overdueTasks.length} task(s) have a missed deadline.`;
      }
    } else if (signals.overdueTasks.length > 0) {
      summary = `${signals.overdueTasks.length} task(s) have a past end date; the project end may not be flagged late under current business rules.`;
    } else {
      summary =
        'No significant delay signal on project completion or task due dates at the reference date.';
    }

    return { summary: summary.trim(), contributingFactors: factors.slice(0, 8) };
  }

  private buildHeuristicPlanningSuggestions(
    signals: PlanningSignals,
    project: Project,
    tasks: TaskDocument[],
  ): string[] {
    const out: string[] = [];
    if (signals.tasksMissingDates.length > 0) {
      out.push(
        `Fill missing dates for ${signals.tasksMissingDates.length} task(s) to secure the Gantt and alerts.`,
      );
    }
    if (signals.blockedTasks.length > 0) {
      out.push(
        'Finish or accelerate predecessors of blocked tasks (see planningSignals) to unblock downstream work.',
      );
    }
    if (tasks.length >= 5) {
      out.push(
        'Set 2–3 intermediate milestones (delivered packages or handoffs) with formal schedule reviews.',
      );
    }
    if (project.description && project.description.trim().length > 80 && tasks.length < 4) {
      out.push(
        'Break the project description into ordered work packages (lots) for realistic sequential tracking.',
      );
    }
    out.push('Hold a weekly steering slot (priorities, risks, documented decisions).');
    if (out.length < 3) {
      out.push('Re-align execution order with real dependencies after each status update.');
    }
    return out.slice(0, 10);
  }

  private buildHeuristicAutomation(signals: PlanningSignals, tasks: TaskDocument[]): string[] {
    const out: string[] = [];
    for (const c of signals.repetitiveClusters.slice(0, 3)) {
      out.push(
        `Similar task titles (${c.taskIds.length} occurrence(s)): create a template or checklist for "${c.normalizedLabel}".`,
      );
    }
    if (tasks.length >= 4) {
      out.push(
        'Standardize updates (e.g. same weekday) for recurring inspection or housekeeping tasks.',
      );
    }
    if (out.length === 0) {
      out.push(
        'Document a short procedure for updating progress % and dates to reduce ad-hoc entry work.',
      );
    }
    return out.slice(0, 8);
  }

  private buildProjectContext(
    project: Project,
    tasks: TaskDocument[],
    backendMetrics: { estimatedBudgetDeltaPercent: number | null; estimatedDelayDays: number },
  ): string {
    const now = new Date();
    const planningSignals = this.buildPlanningSignals(tasks, now);
    const maxDeps = 12;

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
      planningSignals,
      tasks: tasks.map((t) => ({
        _id: String(t._id),
        title: t.title,
        status: t.status,
        priority: t.priority,
        progress: t.progress,
        duration: t.duration,
        startDate: t.startDate ? new Date(t.startDate).toISOString() : null,
        endDate: t.endDate ? new Date(t.endDate).toISOString() : null,
        dependsOn: (t.dependsOn ?? []).map(String).slice(0, maxDeps),
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
        title: 'End date passed while the project is not finished',
        impact: 'high',
        action: 'Revisit the schedule, trim scope, or obtain a documented extension.',
        relatedTaskIds:
          ids.length > 0 ? ids : this.taskIdsNotDone(tasks).slice(0, 5),
      });
    }

    if (typeof project.budget === 'number' && project.budget > 0 && status === 'En retard') {
      risks.push({
        title: 'Behind schedule with a defined budget: cost drift risk',
        impact: 'high',
        action: 'Freeze non-essential spend and track budget variance weekly.',
        relatedTaskIds: this.taskIdsNotDone(tasks).slice(0, 5),
      });
    }

    const avgProgress =
      tasks.length > 0 ? tasks.reduce((s, t) => s + (t.progress ?? 0), 0) / tasks.length : 0;
    if (tasks.length >= 3 && avgProgress < 35 && status === 'En cours') {
      const ids = this.taskIdsLowProgress(tasks);
      risks.push({
        title: 'Low average progress with a significant number of tasks',
        impact: 'medium',
        action: 'Find the critical path and clear blockers on priority tasks.',
        relatedTaskIds: ids.length > 0 ? ids : this.taskIdsNotDone(tasks).slice(0, 5),
      });
    }

    const depHeavy = tasks.filter((t) => (t.dependsOn?.length ?? 0) > 1).length;
    if (depHeavy >= 2) {
      const ids = this.taskIdsHeavyDeps(tasks);
      risks.push({
        title: 'Several tasks with multiple dependencies',
        impact: 'medium',
        action: 'Map dependencies and sequence deliveries to avoid deadlocks.',
        relatedTaskIds: ids.length > 0 ? ids : undefined,
      });
    }

    if (tasks.length === 0 && (project.description?.trim().length ?? 0) > 40) {
      risks.push({
        title: 'Scope described but few or no structured tasks in the tool',
        impact: 'medium',
        action:
          'Split the description into tasks (packages, milestones, owners) to track progress and cost by lot.',
      });
    }

    while (risks.length < 2) {
      risks.push({
        title: 'Governance needs structure',
        impact: 'low',
        action: 'Run a short weekly ritual (schedule, budget, risks, decisions).',
      });
    }

    const { recommendedMode, rationale } = this.buildFallbackBudgetModeRationale(
      backendMetrics,
    );
    const summary = this.buildFallbackSummary(project, tasks);
    const signals = this.buildPlanningSignals(tasks, now);

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
      delayAnalysis: this.buildHeuristicDelayAnalysis(signals, backendMetrics, tasks),
      planningSuggestions: this.buildHeuristicPlanningSuggestions(signals, project, tasks),
      repetitiveWorkAndAutomation: this.buildHeuristicAutomation(signals, tasks),
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
        rationale: `${delay} day(s) delay at the reference date: favor recoverable catch-up (re-sequencing, trade-offs) without ignoring budget headroom${d === null ? '' : ` (recorded budget gap: ${d} %)`}.`,
      };
    }
    if (d !== null && d > 0) {
      return {
        recommendedMode: 'economique',
        rationale: `Recorded spend exceeds allocated budget (gap ${d} %): cost-saving mode to contain scope and spend.`,
      };
    }
    if (d !== null && d < 0) {
      return {
        recommendedMode: 'equilibre',
        rationale: `Spend is below allocated budget (gap ${d} %) and no calendar delay computed: keep balanced steering (quality / schedule / cost) until the next milestone.`,
      };
    }
    return {
      recommendedMode: 'equilibre',
      rationale:
        'No usable budget ratio or no computable gap: stay balanced; refine when budget and spend are captured reliably.',
    };
  }

  private buildFallbackSummary(project: Project, tasks: TaskDocument[]): string {
    const base = `Fallback analysis (no LLM) for "${project.name}"`;
    const tail =
      tasks.length > 0
        ? ` — ${tasks.length} task(s), project status ${project.status}.`
        : ` — status ${project.status}, few or no tasks; use the description to structure tracking.`;
    return base + tail;
  }

  private buildFallbackNextActions(
    project: Project,
    tasks: TaskDocument[],
    risks: Array<{ title: string; action: string }>,
  ): string[] {
    const actions: string[] = [
      'Prioritize two framing decisions (scope, budget, or schedule) within 7 days.',
      'Update dates and statuses of critical tasks in the tracking tool.',
    ];
    if (tasks.length === 0) {
      actions.push(
        'Create main tasks from the project description (packages, milestones, order).',
      );
    } else {
      actions.push('Identify critical-path tasks or those behind milestone dates.');
    }
    const firstRisk = risks[0];
    if (firstRisk) {
      actions.push(`Address first: ${firstRisk.title} — ${firstRisk.action}`);
    } else {
      actions.push('Assign a single owner per major risk.');
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
          content: `Project data (JSON, includes backendMetrics):\n${contextJson}`,
        },
      ],
    });
    this.mapGroqErrors(res);
    const data = await this.parseGroqChatCompletionBody(res);
    const ms = Date.now() - started;
    this.logger.log(`groq completion ok latency_ms=${ms}`);
    return this.readGroqContent(data);
  }

  private async parseGroqChatCompletionBody(
    res: Response,
  ): Promise<GroqChatCompletionResponse> {
    const rawText = await res.text();
    try {
      return JSON.parse(rawText) as GroqChatCompletionResponse;
    } catch {
      this.logger.error(
        `Groq response is not JSON (length=${rawText.length}): ${rawText.slice(0, 500)}`,
      );
      throw new BadGatewayException('Groq returned invalid JSON');
    }
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
    const primary = (this.configService.get<string>('GROQ_API_KEY') ?? '').trim();
    if (!primary) {
      throw new ServiceUnavailableException(
        'Groq is not configured: set GROQ_API_KEY in smartsite-backend/.env',
      );
    }
    const fallbackRaw = this.configService.get<string>('GROQ_API_KEY_FALLBACK')?.trim() ?? '';
    const fallbackKey =
      fallbackRaw.length > 0 && fallbackRaw !== primary ? fallbackRaw : null;
    const timeoutMs = this.configService.get<number>('GROQ_TIMEOUT_MS', 10_000);

    const doFetch = async (apiKey: string): Promise<Response> => {
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

    const withRetryOnServerError = async (apiKey: string): Promise<Response> => {
      try {
        const first = await doFetch(apiKey);
        if (RETRIABLE_STATUSES.has(first.status)) {
          return doFetch(apiKey);
        }
        return first;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new BadGatewayException('Groq request timed out');
        }
        try {
          return await doFetch(apiKey);
        } catch (err2) {
          if (err2 instanceof Error && err2.name === 'AbortError') {
            throw new BadGatewayException('Groq request timed out');
          }
          throw new BadGatewayException('Groq network error');
        }
      }
    };

    const first = await withRetryOnServerError(primary);
    if (first.status === 429 && fallbackKey) {
      this.logger.warn('Groq rate limited on primary API key; retrying with GROQ_API_KEY_FALLBACK');
      return withRetryOnServerError(fallbackKey);
    }
    return first;
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
