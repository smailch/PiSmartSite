import type { BackendTask, TaskPriority, TaskStatus } from "./types";

/** Zoom granularity for the Gantt chart. */
export type GanttZoomLevel = "day" | "week" | "month";

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface ZoomConfig {
  daysPerCell: number;
  cellWidth: number;
}

function getZoomConfig(zoomLevel: GanttZoomLevel): ZoomConfig {
  switch (zoomLevel) {
    case "day":
      return { daysPerCell: 1, cellWidth: 56 };
    case "week":
      return { daysPerCell: 7, cellWidth: 108 };
    case "month":
      return { daysPerCell: 30, cellWidth: 160 };
    default:
      return { daysPerCell: 7, cellWidth: 108 };
  }
}

export interface GanttGridLayout {
  /** Total width in pixels of the time grid (without margins). */
  gridWidth: number;
  /** Width of a single time cell in pixels. */
  cellWidth: number;
  /** Number of visible time cells/columns. */
  numColumns: number;
  /** Duration in ms represented by one cell. */
  unitMs: number;
  /** Days represented by one cell (1, 7, 30). */
  daysPerCell: number;
  /** Tick positions (dates) for the X axis. */
  tickDates: Date[];
  /** Normalised chart start used for all calculations. */
  startDate: Date;
  /** Normalised chart end (inclusive). */
  endDate: Date;
}

/** Base vertical sizing for rows (bar + labels lisibles). */
export const GANTT_ROW_HEIGHT = 50;
export const GANTT_ROW_GAP = 14;

/**
 * Normalise a date-like value into a valid Date instance.
 * Throws if the value cannot be converted.
 */
export function toDate(input: Date | string): Date {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      throw new Error("Invalid Date instance provided");
    }
    return input;
  }
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date value: ${String(input)}`);
  }
  return d;
}

/**
 * Calculate horizontal grid layout for the Gantt chart.
 */
export function calculateGridLayout(
  startDateInput: Date | string,
  endDateInput: Date | string,
  zoomLevel: GanttZoomLevel,
): GanttGridLayout {
  const startDate = toDate(startDateInput);
  const endDate = toDate(endDateInput);

  const { daysPerCell, cellWidth } = getZoomConfig(zoomLevel);

  const startTime = startDate.getTime();
  const endTime = Math.max(startTime + MS_PER_DAY, endDate.getTime());
  const spanMs = endTime - startTime;
  const spanDays = Math.max(1, Math.ceil(spanMs / MS_PER_DAY));

  const numColumns = Math.max(1, Math.ceil(spanDays / daysPerCell));
  const gridWidth = numColumns * cellWidth;
  const unitMs = daysPerCell * MS_PER_DAY;

  const tickDates: Date[] = [];
  for (let i = 0; i <= numColumns; i += 1) {
    tickDates.push(new Date(startTime + i * unitMs));
  }

  return {
    gridWidth,
    cellWidth,
    numColumns,
    unitMs,
    daysPerCell,
    tickDates,
    startDate,
    endDate: new Date(startTime + numColumns * unitMs),
  };
}

export interface GanttTaskPosition {
  x: number;
  y: number;
  width: number;
}

export interface PositionedTaskLike {
  /** Calendar start date of the bar. */
  startDate: Date;
  /** Duration of the task in whole days. */
  durationDays: number;
  /** Precomputed row index (0-based). */
  rowIndex: number;
}

/**
 * Compute pixel position of a task bar for a given zoom level.
 */
export function getTaskPosition(
  task: PositionedTaskLike,
  chartStartDate: Date,
  zoomLevel: GanttZoomLevel,
): GanttTaskPosition {
  const { daysPerCell, cellWidth } = getZoomConfig(zoomLevel);
  const chartStartTime = chartStartDate.getTime();
  const taskStartTime = task.startDate.getTime();

  const deltaDays = Math.max(
    0,
    Math.round((taskStartTime - chartStartTime) / MS_PER_DAY),
  );

  const x = (deltaDays / daysPerCell) * cellWidth;
  const width = Math.max(4, (task.durationDays / daysPerCell) * cellWidth);

  const y = task.rowIndex * (GANTT_ROW_HEIGHT + GANTT_ROW_GAP);

  return { x, y, width };
}

/**
 * Shape expected by the critical-path algorithm.
 */
export interface CriticalPathTask {
  id: string;
  /** Duration in whole days; must be > 0. */
  durationDays: number;
  /** Identifiers of direct predecessors. */
  dependsOn?: string[];
}

export type TaskId = string;

/**
 * Compute the critical path (longest path in terms of duration) in a DAG.
 *
 * This assumes dependencies form a directed acyclic graph. If a cycle is
 * detected, an empty path is returned.
 */
export function getCriticalPath(tasks: CriticalPathTask[]): TaskId[] {
  if (!tasks.length) return [];

  const byId = new Map<string, CriticalPathTask>();
  for (const t of tasks) {
    if (t.durationDays <= 0) continue;
    byId.set(t.id, t);
  }

  const ids = Array.from(byId.keys());
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of ids) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  // Build graph: edge dep -> task
  for (const task of byId.values()) {
    const deps = (task.dependsOn ?? []).filter((d) => byId.has(d) && d !== task.id);
    for (const depId of deps) {
      const list = adjacency.get(depId)!;
      list.push(task.id);
      inDegree.set(task.id, (inDegree.get(task.id) ?? 0) + 1);
    }
  }

  // Kahn's algorithm for topological order + longest-path DP.
  const queue: string[] = [];
  const longest: Map<string, number> = new Map();
  const predecessor: Map<string, string | null> = new Map();

  for (const id of ids) {
    if ((inDegree.get(id) ?? 0) === 0) {
      queue.push(id);
    }
    longest.set(id, byId.get(id)?.durationDays ?? 0);
    predecessor.set(id, null);
  }

  let visitedCount = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    visitedCount += 1;

    const currentDuration = longest.get(current) ?? 0;

    for (const next of adjacency.get(current) ?? []) {
      const candidate = currentDuration + (byId.get(next)?.durationDays ?? 0);
      if (candidate > (longest.get(next) ?? 0)) {
        longest.set(next, candidate);
        predecessor.set(next, current);
      }

      const deg = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  // Cycle detected – return empty path to avoid infinite loops.
  if (visitedCount !== ids.length) {
    return [];
  }

  // Find task with maximal accumulated duration.
  let maxId: string | null = null;
  let maxDuration = -Infinity;

  for (const [id, total] of longest.entries()) {
    if (total > maxDuration) {
      maxDuration = total;
      maxId = id;
    }
  }

  if (!maxId) return [];

  const path: string[] = [];
  let cursor: string | null = maxId;
  while (cursor) {
    path.push(cursor);
    cursor = predecessor.get(cursor) ?? null;
  }

  return path.reverse();
}

/**
 * Convenience helper to adapt BackendTask objects into CriticalPathTask
 * respecting duration and dependency structure.
 */
export function mapBackendTasksToCritical(tasks: BackendTask[]): CriticalPathTask[] {
  return tasks.map((t) => ({
    id: t._id,
    durationDays: Math.max(1, Math.round(t.duration ?? 1)),
    dependsOn: t.dependsOn ?? [],
  }));
}

/**
 * Format a date label according to the current zoom level.
 */
export function formatDate(dateInput: Date | string, zoomLevel: GanttZoomLevel): string {
  const d = toDate(dateInput);

  if (zoomLevel === "day") {
    const dow = d.toLocaleDateString("fr-FR", { weekday: "short" });
    const dm = d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
    return `${dow.replace(/\.$/, "")} ${dm}`;
  }

  if (zoomLevel === "week") {
    // Represent week by the Monday of the week.
    const day = d.getDay();
    const diffToMonday = (day + 6) % 7; // 0 => Monday, 6 => Sunday
    const monday = new Date(d.getTime() - diffToMonday * MS_PER_DAY);
    const weekLabel = monday.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
    return `Sem. ${weekLabel}`;
  }

  // month
  return d.toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });
}

/**
 * Utility to map a task priority to a Gantt color.
 */
export function priorityToColor(priority: TaskPriority): string {
  switch (priority) {
    case "HIGH":
      return "#ef4444"; // red-500
    case "MEDIUM":
      return "#f97316"; // orange-500
    case "LOW":
    default:
      return "#3b82f6"; // blue-500
  }
}

/**
 * Map task status to a semantic color used for badges.
 */
export function statusToColor(status: TaskStatus): string {
  switch (status) {
    case "Terminé":
      return "#16a34a"; // green-600
    case "En cours":
      return "#2563eb"; // blue-600
    case "À faire":
    default:
      return "#6b7280"; // gray-500
  }
}

/**
 * Convert a progress percentage (0-100) into a smooth green gradient
 * from white (0%) to emerald (100%).
 */
export function progressToColor(progress: number): string {
  const clamped = Math.min(100, Math.max(0, progress));
  const t = clamped / 100;

  // From #ffffff to #16a34a (22,163,74)
  const r = Math.round(255 + (22 - 255) * t);
  const g = Math.round(255 + (163 - 255) * t);
  const b = Math.round(255 + (74 - 255) * t);

  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Tronque un titre long pour la colonne gauche du Gantt. */
export function truncateGanttTitle(title: string, maxChars: number): string {
  const t = title.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(1, maxChars - 1))}…`;
}

/**
 * Basic heuristic to pick an emoji icon for a task title.
 */
export function getTaskIcon(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("peinture") || lower.includes("paint")) return "🎨";
  if (lower.includes("fondation") || lower.includes("foundation") || lower.includes("béton") || lower.includes("beton") || lower.includes("concrete")) return "🧱";
  if (lower.includes("plomb") || lower.includes("plumbing") || lower.includes("water")) return "🚿";
  if (lower.includes("électricité") || lower.includes("electr")) return "⚡";
  if (lower.includes("inspection") || lower.includes("contrôle") || lower.includes("control")) return "✅";
  return "🔨";
}
