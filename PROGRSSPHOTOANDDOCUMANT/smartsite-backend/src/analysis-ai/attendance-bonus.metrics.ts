import type { Attendance } from '../attendance/schemas/attendance.schema';

export type WorkerAttendanceMetrics = {
  resourceId: string;
  displayName: string;
  joursPresent: number;
  joursAbsent: number;
  totalJours: number;
  tauxPresence: number;
  heuresTotales: number;
  heuresMoyennesJourPresent: number | null;
  /** Score 0–100 calculé côté serveur (indicatif pour l’IA). */
  scoreRendement: number;
};

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

function parseMinutes(hhmm: string | undefined): number | null {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Durée en heures entre deux horaires HH:mm le même jour. */
export function hoursBetween(checkIn?: string, checkOut?: string): number | null {
  const a = parseMinutes(checkIn);
  const b = parseMinutes(checkOut);
  if (a === null || b === null) return null;
  const diffMin = b - a;
  if (diffMin <= 0) return null;
  return diffMin / 60;
}

function computeScore(metrics: {
  joursPresent: number;
  joursAbsent: number;
  heuresMoyennesJourPresent: number | null;
}): number {
  const total = metrics.joursPresent + metrics.joursAbsent;
  if (total === 0) return 0;
  const tauxPresence = metrics.joursPresent / total;
  const partPresence = Math.min(100, tauxPresence * 100) * 0.55;
  let partHeures = 0;
  if (metrics.heuresMoyennesJourPresent != null && metrics.joursPresent > 0) {
    const ratio = Math.min(1, metrics.heuresMoyennesJourPresent / 8);
    partHeures = ratio * 100 * 0.45;
  } else {
    partHeures = tauxPresence * 45;
  }
  return Math.round(Math.min(100, partPresence + partHeures));
}

type Agg = {
  present: number;
  absent: number;
  heuresTotales: number;
};

/**
 * Agrège les enregistrements de pointage par travailleur et calcule des métriques déterministes.
 */
export function aggregateAttendanceByWorker(
  records: ReadonlyArray<Attendance & { resourceId?: unknown }>,
): WorkerAttendanceMetrics[] {
  const byId = new Map<string, Agg & { displayName: string }>();

  for (const row of records) {
    const rid = extractResourceId(row.resourceId);
    const name = displayNameFromResource(row.resourceId);
    if (!byId.has(rid)) {
      byId.set(rid, { present: 0, absent: 0, heuresTotales: 0, displayName: name });
    }
    const agg = byId.get(rid)!;
    if (name && !agg.displayName.startsWith('Travailleur')) {
      agg.displayName = name;
    }
    if (row.status === 'absent') {
      agg.absent += 1;
    } else {
      agg.present += 1;
      const h = hoursBetween(row.checkIn, row.checkOut);
      if (h != null) agg.heuresTotales += h;
    }
  }

  const out: WorkerAttendanceMetrics[] = [];
  for (const [resourceId, agg] of byId) {
    const totalJours = agg.present + agg.absent;
    const tauxPresence = totalJours > 0 ? agg.present / totalJours : 0;
    const heuresMoyennesJourPresent =
      agg.present > 0 ? Math.round((agg.heuresTotales / agg.present) * 100) / 100 : null;
    const scoreRendement = computeScore({
      joursPresent: agg.present,
      joursAbsent: agg.absent,
      heuresMoyennesJourPresent,
    });
    out.push({
      resourceId,
      displayName: agg.displayName,
      joursPresent: agg.present,
      joursAbsent: agg.absent,
      totalJours,
      tauxPresence: Math.round(tauxPresence * 1000) / 1000,
      heuresTotales: Math.round(agg.heuresTotales * 100) / 100,
      heuresMoyennesJourPresent,
      scoreRendement,
    });
  }

  out.sort((a, b) => b.scoreRendement - a.scoreRendement);
  return out;
}
