import type { BackendTask } from "./types";
import { MS_PER_DAY, toDate } from "./ganttUtils";

/**
 * BackendTask enrichi avec les dates planifiées (dates résolues en `Date`, pas ISO string).
 */
export type ScheduledTask = Omit<BackendTask, "startDate" | "endDate"> & {
  startDate: Date;
  endDate: Date;
};

/**
 * Dépendance normalisée en identifiant string.
 */
function normalizeDependencyIds(task: BackendTask): string[] {
  if (!Array.isArray(task.dependsOn)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of task.dependsOn) {
    if (typeof raw !== "string") continue;
    const depId = raw.trim();
    if (!depId) continue;
    if (seen.has(depId)) continue;
    seen.add(depId);
    result.push(depId);
  }

  return result;
}

interface GraphData {
  byId: Map<string, BackendTask>;
  outEdges: Map<string, string[]>;
  inDegree: Map<string, number>;
  inputOrder: Map<string, number>;
}

/**
 * Construit le graphe orienté des dépendances : dep -> task.
 */
function buildGraph(tasks: BackendTask[]): GraphData {
  const byId = new Map<string, BackendTask>();
  const outEdges = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const inputOrder = new Map<string, number>();

  tasks.forEach((task, index) => {
    if (typeof task._id !== "string" || !task._id.trim()) {
      throw new Error("Task with invalid _id encountered while ordering dependencies.");
    }
    const taskId = task._id.trim();
    if (byId.has(taskId)) {
      throw new Error(`Duplicate task id detected: ${taskId}`);
    }

    byId.set(taskId, task);
    outEdges.set(taskId, []);
    inDegree.set(taskId, 0);
    inputOrder.set(taskId, index);
  });

  for (const task of tasks) {
    const taskId = task._id.trim();
    const deps = normalizeDependencyIds(task);

    for (const depId of deps) {
      // Dépendance externe au lot de tâches: ignorée.
      if (!byId.has(depId)) continue;

      // Self-loop explicite.
      if (depId === taskId) {
        throw new Error(`Task ${taskId} cannot depend on itself.`);
      }

      outEdges.get(depId)!.push(taskId);
      inDegree.set(taskId, (inDegree.get(taskId) ?? 0) + 1);
    }
  }

  return { byId, outEdges, inDegree, inputOrder };
}

/**
 * Détecte la présence d'un cycle dans le graphe de dépendances.
 */
export function detectCycle(tasks: BackendTask[]): boolean {
  if (!tasks.length) return false;

  const byId = new Map<string, BackendTask>();
  tasks.forEach((task) => {
    if (typeof task._id === "string" && task._id.trim()) {
      byId.set(task._id.trim(), task);
    }
  });

  const state = new Map<string, 0 | 1 | 2>();

  const dfs = (taskId: string): boolean => {
    state.set(taskId, 1);
    const task = byId.get(taskId);
    if (!task) {
      state.set(taskId, 2);
      return false;
    }

    const deps = normalizeDependencyIds(task);
    for (const depId of deps) {
      if (!byId.has(depId)) continue;

      const depState = state.get(depId) ?? 0;
      if (depState === 1) return true;
      if (depState === 0 && dfs(depId)) return true;
    }

    state.set(taskId, 2);
    return false;
  };

  for (const taskId of byId.keys()) {
    if ((state.get(taskId) ?? 0) === 0) {
      if (dfs(taskId)) return true;
    }
  }

  return false;
}

/**
 * Trie les tâches via Topological Sort (Kahn), en gardant un ordre stable
 * selon l'ordre d'entrée quand plusieurs noeuds sont disponibles.
 */
export function orderTasksByDependencies(tasks: BackendTask[]): BackendTask[] {
  if (!tasks.length) return [];

  const { byId, outEdges, inDegree, inputOrder } = buildGraph(tasks);

  const ready = Array.from(inDegree.entries())
    .filter(([, deg]) => deg === 0)
    .map(([id]) => id)
    .sort((a, b) => (inputOrder.get(a) ?? 0) - (inputOrder.get(b) ?? 0));

  const orderedIds: string[] = [];

  while (ready.length > 0) {
    const current = ready.shift()!;
    orderedIds.push(current);

    for (const next of outEdges.get(current) ?? []) {
      const nextDeg = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, nextDeg);
      if (nextDeg === 0) {
        ready.push(next);
        ready.sort((a, b) => (inputOrder.get(a) ?? 0) - (inputOrder.get(b) ?? 0));
      }
    }
  }

  if (orderedIds.length !== byId.size) {
    throw new Error("Cycle detected in task dependencies. Topological ordering failed.");
  }

  return orderedIds.map((id) => byId.get(id)!);
}

/**
 * Calcule automatiquement startDate/endDate selon les dépendances.
 * - Sans dépendance: startDate = projectStartDate
 * - Avec dépendances: startDate = max(endDate des dépendances connues)
 * - endDate = startDate + durée (en jours)
 */
export function calculateTaskDates(
  tasks: BackendTask[],
  projectStartDate: Date | string,
): ScheduledTask[] {
  if (!tasks.length) return [];

  const projectStart = toDate(projectStartDate);
  const ordered = orderTasksByDependencies(tasks);

  const endById = new Map<string, Date>();

  return ordered.map((task) => {
    const deps = normalizeDependencyIds(task);

    let startDate = new Date(projectStart);

    // Choisit la fin la plus tardive parmi les dépendances déjà planifiées.
    for (const depId of deps) {
      const depEnd = endById.get(depId);
      if (!depEnd) continue;
      if (depEnd.getTime() > startDate.getTime()) {
        startDate = new Date(depEnd);
      }
    }

    const durationDays = Math.max(1, Math.round(task.duration ?? 1));
    const endDate = new Date(startDate.getTime() + durationDays * MS_PER_DAY);

    endById.set(task._id, endDate);

    return {
      ...task,
      startDate,
      endDate,
    };
  });
}

/**
 * Regroupe les tâches par niveau de dépendance:
 * niveau 0 = aucune dépendance, niveau N = dépend de tâches des niveaux < N.
 */
export function getTasksByDependencyLevel(tasks: BackendTask[]): BackendTask[][] {
  if (!tasks.length) return [];

  const ordered = orderTasksByDependencies(tasks);
  const byId = new Map<string, BackendTask>();
  tasks.forEach((t) => byId.set(t._id, t));

  const levelById = new Map<string, number>();

  for (const task of ordered) {
    const deps = normalizeDependencyIds(task).filter((id) => byId.has(id));
    if (deps.length === 0) {
      levelById.set(task._id, 0);
      continue;
    }

    let maxParentLevel = 0;
    for (const depId of deps) {
      maxParentLevel = Math.max(maxParentLevel, levelById.get(depId) ?? 0);
    }
    levelById.set(task._id, maxParentLevel + 1);
  }

  const grouped: BackendTask[][] = [];
  for (const task of ordered) {
    const level = levelById.get(task._id) ?? 0;
    if (!grouped[level]) grouped[level] = [];
    grouped[level].push(task);
  }

  return grouped;
}
