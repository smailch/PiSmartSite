const DAY_MS = 24 * 60 * 60 * 1000;

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * delta % = ((spentBudget - budget) / budget) * 100, arrondi à 2 décimales.
 * null si budget ≤ 0 ou si les entrées ne sont pas des nombres finis.
 */
export function computeEstimatedBudgetDeltaPercent(
  budget: unknown,
  spentBudget: unknown,
): number | null {
  if (typeof budget !== 'number' || !Number.isFinite(budget) || budget <= 0) {
    return null;
  }
  const spent =
    spentBudget === undefined || spentBudget === null
      ? 0
      : typeof spentBudget === 'number' && Number.isFinite(spentBudget)
        ? spentBudget
        : Number.NaN;
  if (!Number.isFinite(spent)) {
    return null;
  }
  const raw = ((spent - budget) / budget) * 100;
  if (!Number.isFinite(raw)) {
    return null;
  }
  return round2(raw);
}

/**
 * Jours de retard si le projet n'est pas terminé et que la date de fin est dépassée ; sinon 0.
 */
export function computeEstimatedDelayDays(
  endDate: Date | null | undefined,
  status: unknown,
  now: Date = new Date(),
): number {
  if (status === 'Terminé') {
    return 0;
  }
  if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) {
    return 0;
  }
  const endMs = endDate.getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(endMs) || !Number.isFinite(nowMs) || endMs >= nowMs) {
    return 0;
  }
  const days = Math.ceil((nowMs - endMs) / DAY_MS);
  return Number.isFinite(days) && days > 0 ? days : 0;
}
