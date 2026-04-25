import type { Attendance } from '../attendance/schemas/attendance.schema';
import { hoursBetween } from './attendance-bonus.metrics';

function extractResourceId(resourceId: unknown): string {
  if (resourceId && typeof resourceId === 'object' && '_id' in resourceId) {
    return String((resourceId as { _id: unknown })._id);
  }
  return String(resourceId);
}

function displayNameFromResource(resourceId: unknown): string {
  if (resourceId && typeof resourceId === 'object') {
    const o = resourceId as { firstName?: string; lastName?: string; name?: string };
    const full = `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim();
    if (full) return full;
    if (o.name?.trim()) return o.name.trim();
  }
  const id = extractResourceId(resourceId);
  if (id.length === 24 && /^[0-9a-f]{24}$/i.test(id)) {
    return `Travailleur …${id.slice(-6)}`;
  }
  return id;
}

/** Nombre de lundis–vendredis dans le mois (UTC, aligné sur les dates stockées en pointage). */
export function countWeekdaysInMonth(year: number, month: number): number {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let n = 0;
  for (let day = 1; day <= lastDay; day++) {
    const wd = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
    if (wd >= 1 && wd <= 5) n++;
  }
  return n;
}

function dateKeyUtcFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dateKeyUtc(d: Date): string {
  return dateKeyUtcFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Points 0–30 : proportion de jours ouvrables présents sur le total de jours ouvrables du mois. */
export function computeMonthlyPoints(
  presentWeekdays: number,
  joursOuvrables: number,
): number {
  if (joursOuvrables <= 0) return 0;
  return Math.min(30, Math.round((30 * presentWeekdays) / joursOuvrables));
}

/**
 * Barème demandé : 30 pts → 50 DT ; 29 pts → 30 DT ; 28 pts → 10 DT ; sinon 0.
 */
export function primeDtFromPoints(points: number): number {
  if (points >= 30) return 50;
  if (points === 29) return 30;
  if (points === 28) return 10;
  return 0;
}

export type WorkerMonthlyAttendanceMetrics = {
  resourceId: string;
  displayName: string;
  annee: number;
  mois: number;
  joursOuvrables: number;
  joursPresentsOuvrables: number;
  joursAbsentsPointesOuvrables: number;
  joursOuvrablesSansPointage: number;
  pointsMensuel: number;
  primeDt: number;
  /** Rétrocompat API : même valeur que pointsMensuel (0–30). */
  scoreRendement: number;
  heuresTotales: number;
  heuresMoyennesJourPresent: number | null;
  joursPresent: number;
  joursAbsent: number;
  totalJours: number;
  tauxPresence: number;
};

/**
 * Agrège le pointage pour un mois civil. Les **week-ends ne comptent pas** dans le dénominateur
 * ni comme jours attendus ; un jour ouvrable sans fiche est traité comme **non présent** pour le calcul des points.
 */
export function aggregateMonthlyAttendanceByWorker(
  records: ReadonlyArray<Attendance & { resourceId?: unknown }>,
  year: number,
  month: number,
): WorkerMonthlyAttendanceMetrics[] {
  const monthRecords = records.filter((r) => {
    const d = new Date(r.date);
    return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month;
  });

  const byWorkerDay = new Map<string, Map<string, 'present' | 'absent'>>();
  const hoursByWorker = new Map<string, { total: number; presentDays: number }>();

  for (const row of monthRecords) {
    const rid = extractResourceId(row.resourceId);
    const wd = new Date(row.date).getUTCDay();
    if (wd === 0 || wd === 6) continue;

    const dk = dateKeyUtc(new Date(row.date));
    if (!byWorkerDay.has(rid)) byWorkerDay.set(rid, new Map());
    byWorkerDay.get(rid)!.set(dk, row.status === 'present' ? 'present' : 'absent');

    if (row.status === 'present') {
      const hb = hoursBetween(row.checkIn, row.checkOut);
      if (!hoursByWorker.has(rid)) hoursByWorker.set(rid, { total: 0, presentDays: 0 });
      const agg = hoursByWorker.get(rid)!;
      agg.presentDays += 1;
      if (hb != null) agg.total += hb;
    }
  }

  const resourceIds = [...new Set(monthRecords.map((r) => extractResourceId(r.resourceId)))];
  if (resourceIds.length === 0) return [];

  const joursOuvrables = countWeekdaysInMonth(year, month);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const out: WorkerMonthlyAttendanceMetrics[] = [];

  for (const resourceId of resourceIds) {
    const firstRow = monthRecords.find((r) => extractResourceId(r.resourceId) === resourceId);
    const displayName = displayNameFromResource(firstRow?.resourceId);

    let presentWeekdays = 0;
    let absentPointes = 0;
    let sansPointage = 0;

    for (let day = 1; day <= lastDay; day++) {
      const wd = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
      if (wd === 0 || wd === 6) continue;

      const dk = dateKeyUtcFromParts(year, month, day);
      const st = byWorkerDay.get(resourceId)?.get(dk);
      if (st === 'present') presentWeekdays++;
      else if (st === 'absent') absentPointes++;
      else sansPointage++;
    }

    const points = computeMonthlyPoints(presentWeekdays, joursOuvrables);
    const prime = primeDtFromPoints(points);
    const hAgg = hoursByWorker.get(resourceId);
    const heuresTotales = hAgg ? Math.round(hAgg.total * 100) / 100 : 0;
    const heuresMoyennesJourPresent =
      hAgg && hAgg.presentDays > 0
        ? Math.round((heuresTotales / hAgg.presentDays) * 100) / 100
        : null;

    const totalJoursOuvrablesComptes = presentWeekdays + absentPointes + sansPointage;
    const tauxPresence = joursOuvrables > 0 ? presentWeekdays / joursOuvrables : 0;

    out.push({
      resourceId,
      displayName,
      annee: year,
      mois: month,
      joursOuvrables,
      joursPresentsOuvrables: presentWeekdays,
      joursAbsentsPointesOuvrables: absentPointes,
      joursOuvrablesSansPointage: sansPointage,
      pointsMensuel: points,
      primeDt: prime,
      scoreRendement: points,
      heuresTotales,
      heuresMoyennesJourPresent,
      joursPresent: presentWeekdays,
      joursAbsent: absentPointes + sansPointage,
      totalJours: totalJoursOuvrablesComptes,
      tauxPresence: Math.round(tauxPresence * 1000) / 1000,
    });
  }

  out.sort((a, b) => b.pointsMensuel - a.pointsMensuel);
  return out;
}
