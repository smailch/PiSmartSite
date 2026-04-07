import type { BackendTask } from "@/lib/types";

/** Tâche en retard : fin planifiée dépassée et statut ≠ terminé (indicateur calculé, pas un statut en base). */
export function isTaskLate(
  task: Pick<BackendTask, "endDate" | "status">,
  now = new Date(),
): boolean {
  if (task.status === "Terminé" || !task.endDate) return false;
  const e = new Date(task.endDate);
  return !Number.isNaN(e.getTime()) && e.getTime() < now.getTime();
}
