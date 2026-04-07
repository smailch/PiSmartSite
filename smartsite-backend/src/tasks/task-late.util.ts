/**
 * Tâche « en retard » : date de fin dépassée et pas terminée (pas de 4ᵉ statut en base).
 * Même règle que le front (`getOverdueTasks` / `isTaskLate`).
 */
export function isTaskLateAt(
  endDate: unknown,
  status: string | undefined,
  now: Date,
): boolean {
  if (status === 'Terminé') return false;
  if (endDate == null) return false;
  const e = endDate instanceof Date ? endDate : new Date(String(endDate));
  if (Number.isNaN(e.getTime())) return false;
  return e.getTime() < now.getTime();
}
