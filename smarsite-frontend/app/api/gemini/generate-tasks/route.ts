import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
/** Slug OpenRouter (https://openrouter.ai/models). Ancien `mistral/mistral-7b-instruct` est invalide → utiliser `mistralai/...` */
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL?.trim() || "meta-llama/llama-3-8b-instruct";

const MS_DAY = 86_400_000;

function projectDurationDays(project: {
  startDate?: string;
  endDate?: string;
}): number {
  if (!project.startDate || !project.endDate) {
    return 30;
  }
  const startDate = new Date(project.startDate);
  const endDate = new Date(project.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 30;
  }
  const days = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / MS_DAY,
  );
  return Math.max(1, days);
}

function parseYmd(s: unknown): Date | null {
  if (typeof s !== "string" || !s.trim()) return null;
  const d = new Date(`${s.trim().slice(0, 10)}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_DAY);
}

type TaskDraft = {
  title: string;
  description: string;
  duration: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "À faire";
  progress: number;
  dependsOnIndices: number[];
  startDate?: string;
  endDate?: string;
};

function topologicalOrder(n: number, deps: number[][]): number[] {
  const out: number[] = [];
  const done = new Set<number>();
  while (out.length < n) {
    let found = -1;
    for (let i = 0; i < n; i++) {
      if (done.has(i)) continue;
      const ready = (deps[i] ?? []).every((j) => j >= 0 && j < n && done.has(j));
      if (ready) {
        found = i;
        break;
      }
    }
    if (found === -1) {
      for (let i = 0; i < n; i++) {
        if (!done.has(i)) {
          out.push(i);
          done.add(i);
        }
      }
      break;
    }
    out.push(found);
    done.add(found);
  }
  return out;
}

/** Ajuste startDate/endDate : garde les dates du modèle si cohérentes, sinon enchaîne après les prérequis. */
function finalizeTaskDates(tasks: TaskDraft[], project: { startDate?: string; endDate?: string }) {
  const n = tasks.length;
  const projectStart = parseYmd(project.startDate) ?? new Date();
  const projectEnd = parseYmd(project.endDate);
  const order = topologicalOrder(
    n,
    tasks.map((t) => t.dependsOnIndices),
  );
  const endByIdx = new Map<number, Date>();

  for (const i of order) {
    const t = tasks[i];
    let start = new Date(projectStart.getTime());
    for (const j of t.dependsOnIndices) {
      const depEnd = endByIdx.get(j);
      if (depEnd) {
        const minStart = addDays(depEnd, 1);
        if (minStart.getTime() > start.getTime()) start = minStart;
      }
    }

    const aiStart = parseYmd(t.startDate);
    const aiEnd = parseYmd(t.endDate);
    let chosenStart = start;
    let chosenEnd = addDays(start, t.duration);

    if (aiStart && aiEnd && aiEnd.getTime() >= aiStart.getTime()) {
      let ok = aiStart.getTime() >= projectStart.getTime();
      for (const j of t.dependsOnIndices) {
        const depEnd = endByIdx.get(j);
        if (depEnd && aiStart.getTime() <= depEnd.getTime()) {
          ok = false;
          break;
        }
      }
      if (ok) {
        chosenStart = aiStart;
        chosenEnd = aiEnd.getTime() >= aiStart.getTime() ? aiEnd : addDays(aiStart, t.duration);
      }
    }

    if (chosenEnd.getTime() < chosenStart.getTime()) {
      chosenEnd = addDays(chosenStart, t.duration);
    }

    if (projectEnd && chosenEnd.getTime() > projectEnd.getTime()) {
      chosenEnd = new Date(projectEnd.getTime());
      chosenStart = addDays(chosenEnd, -t.duration);
      if (chosenStart.getTime() < projectStart.getTime()) {
        chosenStart = new Date(projectStart.getTime());
        chosenEnd = addDays(chosenStart, t.duration);
        if (chosenEnd.getTime() > projectEnd.getTime()) {
          chosenEnd = new Date(projectEnd.getTime());
        }
      }
    }

    t.startDate = ymd(chosenStart);
    t.endDate = ymd(chosenEnd);
    endByIdx.set(i, chosenEnd);
  }
}

function openRouterErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "OpenRouter a renvoyé une erreur sans détail.";
  }
  const d = data as Record<string, unknown>;
  if (typeof d.error === "string" && d.error.length) return d.error;
  if (d.error && typeof d.error === "object") {
    const e = d.error as Record<string, unknown>;
    if (typeof e.message === "string" && e.message.length) return e.message;
  }
  if (typeof d.message === "string" && d.message.length) return d.message;
  return JSON.stringify(data).slice(0, 400);
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY?.trim()) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const { project } = await request.json();

    if (!project) {
      return NextResponse.json(
        { error: "Project data is required" },
        { status: 400 },
      );
    }

    const projectDurationDaysVal = projectDurationDays(project);
    const maxSingleTaskDays = Math.max(10, Math.floor(projectDurationDaysVal / 5));
    const periodStart =
      project.startDate && parseYmd(project.startDate)
        ? String(project.startDate).slice(0, 10)
        : "(non définie — utilise une séquence à partir d'aujourd'hui logiquement)";
    const periodEnd =
      project.endDate && parseYmd(project.endDate)
        ? String(project.endDate).slice(0, 10)
        : "(non définie)";

    const prompt = `Tu es un gestionnaire de projet expert en construction, rénovation et maintenance.

Génère une liste de tâches détaillées en JSON pour ce projet :

Type: ${project.type}
Nom: ${project.name}
Description: ${project.description}
Budget: ${project.budget} MAD
Durée totale indicative: ${projectDurationDaysVal} jours
Début projet (YYYY-MM-DD): ${periodStart}
Fin projet (YYYY-MM-DD): ${periodEnd}
Localisation: ${project.location || "Non spécifié"}

Les tâches DOIVENT être :
1. Réalistes pour le type "${project.type}"
2. Ordonnées logiquement (dépendances) dans le tableau
3. Avec durées entre 1 et ${maxSingleTaskDays} jours (entier, jours calendaires)
4. Total des durées ≈ ${Math.round(projectDurationDaysVal * 0.8)} jours
5. Priorités : HIGH, MEDIUM, LOW uniquement
6. Chaque tâche a **startDate** et **endDate** au format **"YYYY-MM-DD"** :
   - Plage [startDate, endDate] cohérente avec **duration** (écart d’environ **duration** jours : endDate = startDate + duration jours calendaires).
   - Si le projet a des dates début/fin, toutes les tâches doivent tomber **dans** cette fenêtre (sauf impossibilité logique).
   - Pour chaque indice j dans **dependsOnIndices** : la tâche j doit avoir **endDate** **strictement avant** le **startDate** de cette tâche (au moins le lendemain).

Réponds UNIQUEMENT en JSON structuré comme :
{
  "tasks": [
    {
      "name": "Tâche 1",
      "description": "Description courte",
      "duration": 5,
      "priority": "HIGH",
      "status": "TODO",
      "startDate": "2026-02-10",
      "endDate": "2026-02-15",
      "dependsOnIndices": []
    },
    {
      "name": "Tâche 2",
      "description": "...",
      "duration": 3,
      "priority": "MEDIUM",
      "status": "TODO",
      "startDate": "2026-02-16",
      "endDate": "2026-02-19",
      "dependsOnIndices": [0]
    }
  ]
}

Règles pour "dependsOnIndices" (obligatoire pour chaque tâche, tableau d'entiers, peut être vide []) :
- Indices **0-based** vers d'autres entrées du même tableau "tasks" qui doivent être **finies avant** cette tâche.
- Ordre du tableau : mettre les prérequis **avant** les tâches qui en dépendent (ordre topologique).
- Ne jamais inclure l'index de la tâche elle-même. Pas de cycle (A dépend de B et B de A).
- Si aucune dépendance : "dependsOnIndices": []`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-OpenRouter-Title": "SmartSite Tasks Generator",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 3600,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const readable = openRouterErrorMessage(errorData);
      console.error("OpenRouter API Error:", response.status, errorData);
      return NextResponse.json(
        {
          error: readable || `OpenRouter HTTP ${response.status}`,
          details: errorData,
        },
        { status: response.status >= 400 && response.status < 600 ? response.status : 502 },
      );
    }

    const data = await response.json();
    const msg = data.choices?.[0]?.message;
    let content = "";
    if (typeof msg?.content === "string") {
      content = msg.content;
    } else if (Array.isArray(msg?.content)) {
      content = (msg.content as Array<{ text?: string }>)
        .map((p) => p.text ?? "")
        .join("");
    }

    if (!content?.trim()) {
      console.error("OpenRouter empty content:", JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        {
          error:
            "Réponse modèle vide. Vérifiez le modèle, le quota OpenRouter ou réessayez.",
        },
        { status: 502 },
      );
    }

    let parsedData: { tasks?: unknown[] } = { tasks: [] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]) as { tasks?: unknown[] };
      }
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, content.slice(0, 200));
      return NextResponse.json(
        { error: "Invalid JSON in model response" },
        { status: 502 },
      );
    }

    const rawTasks = Array.isArray(parsedData.tasks) ? parsedData.tasks : [];
    const prios = new Set(["HIGH", "MEDIUM", "LOW"]);
    const n = rawTasks.length;

    function coerceDependsOnIndices(
      raw: unknown,
      taskIndex: number,
    ): number[] {
      if (!Array.isArray(raw)) return [];
      const out: number[] = [];
      for (const x of raw) {
        const j =
          typeof x === "number" && Number.isInteger(x)
            ? x
            : parseInt(String(x), 10);
        if (
          !Number.isInteger(j) ||
          j < 0 ||
          j >= n ||
          j === taskIndex
        ) {
          continue;
        }
        out.push(j);
      }
      return [...new Set(out)];
    }

    const tasks: TaskDraft[] = rawTasks.map((raw, taskIndex) => {
      const task = raw as Record<string, unknown>;
      const name =
        (typeof task.name === "string" && task.name) ||
        (typeof task.title === "string" && task.title) ||
        "Tâche sans nom";
      const description =
        typeof task.description === "string" ? task.description : "";
      let duration = Number(task.duration);
      if (!Number.isFinite(duration) || duration < 1) duration = 1;
      duration = Math.floor(duration);
      let priority = String(task.priority || "MEDIUM").toUpperCase();
      if (!prios.has(priority)) priority = "MEDIUM";

      const dependsRaw =
        task.dependsOnIndices ?? task.depends_on ?? task.dependsOn;
      const dependsOnIndices = coerceDependsOnIndices(dependsRaw, taskIndex);

      let startDate: string | undefined;
      let endDate: string | undefined;
      if (typeof task.startDate === "string" && task.startDate.trim()) {
        const p = parseYmd(task.startDate);
        if (p) startDate = ymd(p);
      }
      if (typeof task.endDate === "string" && task.endDate.trim()) {
        const p = parseYmd(task.endDate);
        if (p) endDate = ymd(p);
      }

      return {
        title: name,
        description,
        duration,
        priority: priority as "HIGH" | "MEDIUM" | "LOW",
        status: "À faire" as const,
        progress: 0,
        dependsOnIndices,
        startDate,
        endDate,
      };
    });

    finalizeTaskDates(tasks, project);

    if (tasks.length === 0) {
      return NextResponse.json(
        { error: "No tasks returned from model" },
        { status: 502 },
      );
    }

    const projectId =
      typeof project._id === "string"
        ? project._id
        : typeof project.id === "string"
          ? project.id
          : undefined;

    return NextResponse.json({
      tasks,
      meta: {
        projectId,
        projectType: project.type,
        generatedAt: new Date().toISOString(),
        taskCount: tasks.length,
        totalDuration: tasks.reduce((sum, t) => sum + t.duration, 0),
        model: OPENROUTER_MODEL,
        projectDurationDays: projectDurationDaysVal,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
