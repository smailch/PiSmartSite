import type { BackendTask, Project } from "@/lib/types";
import { getCriticalPath, mapBackendTasksToCritical } from "@/lib/ganttUtils";
import { isTaskLate } from "@/lib/taskLate";

/** Progression moyenne des tâches (0–100), arrondie. */
export function computeAverageProgress(tasks: BackendTask[]): number {
  if (!tasks.length) return 0;
  const sum = tasks.reduce(
    (s, t) => s + Math.min(100, Math.max(0, Number(t.progress) || 0)),
    0,
  );
  return Math.round(sum / tasks.length);
}

export function computeTasksDoneCount(tasks: BackendTask[]): {
  done: number;
  total: number;
} {
  return {
    done: tasks.filter((t) => t.status === "Terminé").length,
    total: tasks.length,
  };
}

/** Tâches non terminées dont la date de fin est passée. */
export function getOverdueTasks(tasks: BackendTask[], now: Date): BackendTask[] {
  return tasks.filter((t) => isTaskLate(t, now));
}

/** Nombre de tâches non terminées encore bloquées par au moins un prédécesseur non terminé. */
export function getBlockedTasksCount(tasks: BackendTask[]): number {
  const byId = new Map(tasks.map((t) => [String(t._id), t]));
  return tasks.filter((t) => {
    if (t.status === "Terminé") return false;
    const deps = t.dependsOn ?? [];
    if (!deps.length) return false;
    return deps.some((depId) => {
      const d = byId.get(String(depId));
      return d != null && d.status !== "Terminé";
    });
  }).length;
}

/** Identifiants des tâches sur le chemin critique (plus long chemin de durées dans le DAG). */
export function getCriticalPathTaskIds(tasks: BackendTask[]): string[] {
  if (!tasks.length) return [];
  return getCriticalPath(mapBackendTasksToCritical(tasks));
}

/** Écart dépenses − budget (DH) ; null si budget non numérique. */
export function projectBudgetDelta(project: Project): number | null {
  if (typeof project.budget !== "number" || Number.isNaN(project.budget)) {
    return null;
  }
  return (project.spentBudget ?? 0) - project.budget;
}
