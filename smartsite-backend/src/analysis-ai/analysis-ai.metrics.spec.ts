import {
  computeEstimatedBudgetDeltaPercent,
  computeEstimatedDelayDays,
  round2,
} from './analysis-ai.metrics';

describe('analysis-ai.metrics', () => {
  describe('round2', () => {
    it('rounds to two decimal places', () => {
      expect(round2(12.004)).toBe(12);
      expect(round2(12.345)).toBe(12.35);
    });
  });

  describe('computeEstimatedBudgetDeltaPercent', () => {
    it('cas 1: budget=50000, spent=56000 => 12', () => {
      expect(computeEstimatedBudgetDeltaPercent(50000, 56000)).toBe(12);
    });

    it('cas 2: budget=50000, spent=45000 => -10', () => {
      expect(computeEstimatedBudgetDeltaPercent(50000, 45000)).toBe(-10);
    });

    it('cas 3: budget=0 => null', () => {
      expect(computeEstimatedBudgetDeltaPercent(0, 56000)).toBeNull();
    });

    it('returns null for non-finite budget or spent', () => {
      expect(computeEstimatedBudgetDeltaPercent(Number.NaN, 1)).toBeNull();
      expect(computeEstimatedBudgetDeltaPercent(100, Number.NaN)).toBeNull();
      expect(computeEstimatedBudgetDeltaPercent(100, Number.POSITIVE_INFINITY)).toBeNull();
      expect(computeEstimatedBudgetDeltaPercent(Number.POSITIVE_INFINITY, 100)).toBeNull();
    });

    it('treats undefined/null spent as 0', () => {
      expect(computeEstimatedBudgetDeltaPercent(10000, undefined)).toBe(-100);
      expect(computeEstimatedBudgetDeltaPercent(10000, null)).toBe(-100);
    });
  });

  describe('computeEstimatedDelayDays', () => {
    it('cas 4: projet non terminé + endDate passée => retard > 0', () => {
      const now = new Date('2026-04-15T12:00:00.000Z');
      const end = new Date('2026-04-01T12:00:00.000Z');
      expect(computeEstimatedDelayDays(end, 'En cours', now)).toBe(14);
    });

    it('returns 0 when project is finished', () => {
      const now = new Date('2026-04-15T12:00:00.000Z');
      const end = new Date('2026-04-01T12:00:00.000Z');
      expect(computeEstimatedDelayDays(end, 'Terminé', now)).toBe(0);
    });

    it('returns 0 when end is in the future', () => {
      const now = new Date('2026-04-01T12:00:00.000Z');
      const end = new Date('2026-04-15T12:00:00.000Z');
      expect(computeEstimatedDelayDays(end, 'En cours', now)).toBe(0);
    });
  });
});
