import type { Project, TaskPriority, TaskStatus } from "./types";

export type GeminiTaskProposal = {
  title: string;
  description: string;
  duration: number;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  /**
   * Indices 0-based of prerequisite tasks in the same `tasks` array (filled by the model).
   * Resolved to Mongo IDs after tasks are created.
   */
  dependsOnIndices: number[];
};

export type GeminiGenerateResponse = {
  tasks: GeminiTaskProposal[];
  meta?: {
    projectId?: string;
    projectType?: string;
    generatedAt?: string;
    taskCount?: number;
    totalDuration?: number;
    model?: string;
    projectDurationDays?: number | null;
  };
};

export async function generateTasksFromProject(
  project: Project,
): Promise<GeminiGenerateResponse> {
  const res = await fetch("/api/gemini/generate-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project: {
        _id: project._id,
        name: project.name,
        description: project.description,
        type: project.type,
        budget: project.budget,
        startDate: project.startDate,
        endDate: project.endDate,
        location: project.location,
        status: project.status,
      },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    details?: unknown;
    tasks?: GeminiTaskProposal[];
    meta?: GeminiGenerateResponse["meta"];
  };

  if (!res.ok) {
    const base = data.error ?? `Erreur HTTP ${res.status}`;
    const extra =
      data.details && typeof data.details === "object" && data.details !== null
        ? JSON.stringify(data.details).slice(0, 280)
        : "";
    throw new Error(extra ? `${base} — ${extra}` : base);
  }

  if (!data.tasks?.length) {
    throw new Error(data.error ?? "Aucune tâche proposée");
  }

  const tasks: GeminiTaskProposal[] = data.tasks.map((t) => ({
    title: t.title,
    description: t.description ?? "",
    duration: t.duration,
    priority: t.priority,
    status: t.status,
    progress: t.progress ?? 0,
    dependsOnIndices: Array.isArray(t.dependsOnIndices) ? t.dependsOnIndices : [],
  }));

  return { tasks, meta: data.meta };
}
