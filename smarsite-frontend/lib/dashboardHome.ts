import type { BackendTask, Project } from "@/lib/types";
import { formatDh } from "@/lib/formatMoney";
import { projectStatusLabelEn } from "@/lib/projectStatusLabel";
import {
  computeAverageProgress,
  getOverdueTasks,
  projectBudgetDelta,
} from "@/lib/projectOverviewKpi";

const CHART_PRIMARY = "var(--chart-1)";
const CHART_SUCCESS = "var(--chart-4)";
const CHART_WARN = "var(--chart-2)";
const CHART_DANGER = "var(--chart-5)";

export type StatusChartRow = {
  name: string;
  value: number;
  fill: string;
};

export type BudgetUtilRow = {
  name: string;
  pct: number;
  spent: number;
  budget: number;
};

export type DashboardAlertItem = {
  id: string;
  type: "warning" | "danger" | "info" | "success";
  title: string;
  message: string;
  href?: string;
};

function tasksForProject(
  tasks: BackendTask[],
  projectId: string,
): BackendTask[] {
  return tasks.filter((t) => String(t.projectId) === projectId);
}

/** Répartition des projets par statut (pour graphique). */
export function buildStatusChartData(projects: Project[]): StatusChartRow[] {
  let enCours = 0;
  let termine = 0;
  let enRetard = 0;
  for (const p of projects) {
    if (p.status === "Terminé") termine += 1;
    else if (p.status === "En retard") enRetard += 1;
    else enCours += 1;
  }
  return [
    { name: projectStatusLabelEn("En cours"), value: enCours, fill: CHART_PRIMARY },
    { name: projectStatusLabelEn("Terminé"), value: termine, fill: CHART_SUCCESS },
    { name: projectStatusLabelEn("En retard"), value: enRetard, fill: CHART_WARN },
  ].filter((r) => r.value > 0);
}

/**
 * Projets avec budget défini, triés par taux d'utilisation (dépensé / budget), plafonnés.
 */
export function buildBudgetUtilizationRows(
  projects: Project[],
  limit = 6,
): BudgetUtilRow[] {
  const rows: BudgetUtilRow[] = [];
  for (const p of projects) {
    const b = p.budget;
    if (typeof b !== "number" || b <= 0) continue;
    const spent = p.spentBudget ?? 0;
    const pct = Math.min(200, Math.round((spent / b) * 100));
    rows.push({
      name: p.name.length > 22 ? `${p.name.slice(0, 20)}…` : p.name,
      pct,
      spent,
      budget: b,
    });
  }
  rows.sort((a, b) => b.pct - a.pct);
  return rows.slice(0, limit);
}

export function buildDashboardAlerts(
  projects: Project[],
  tasks: BackendTask[],
  now: Date,
): DashboardAlertItem[] {
  const items: DashboardAlertItem[] = [];
  const overdue = getOverdueTasks(tasks, now);

  for (const p of projects) {
    if (p.status === "En retard") {
      items.push({
        id: `proj-late-${p._id}`,
        type: "warning",
        title: `Project behind schedule — ${p.name}`,
        message:
          "Status indicates a slip. Open the overview for details and next steps.",
        href: `/projects/${p._id}/overview`,
      });
    }
    const delta = projectBudgetDelta(p);
    if (delta != null && delta > 0) {
      items.push({
        id: `proj-budget-${p._id}`,
        type: "danger",
        title: `Budget overrun — ${p.name}`,
        message: `Spending exceeds the allocated budget (gap ${formatDh(delta)}).`,
        href: `/projects/${p._id}/overview`,
      });
    }
  }

  if (overdue.length > 0) {
    const sample = overdue.slice(0, 3);
    items.push({
      id: "tasks-overdue",
      type: overdue.length > 5 ? "danger" : "warning",
      title: `${overdue.length} task(s) late`,
      message: sample.map((t) => t.title).join(" · "),
      href: "/tasks",
    });
  }

  if (!items.length && projects.length) {
    items.push({
      id: "all-clear",
      type: "success",
      title: "All clear",
      message:
        "No budget overruns or overdue tasks detected right now.",
    });
  }

  return items.slice(0, 8);
}

export type TodoItem = {
  id: string;
  label: string;
  meta: string;
  href: string;
};

/** Liens rapides « à traiter » : synthèse, Gantt, Kanban. */
export function buildTodoItems(
  projects: Project[],
  tasks: BackendTask[],
  now: Date,
  limit = 6,
): TodoItem[] {
  const todos: TodoItem[] = [];
  const overdue = getOverdueTasks(tasks, now);

  for (const t of overdue.slice(0, limit)) {
    const proj = projects.find((p) => String(p._id) === String(t.projectId));
    todos.push({
      id: `todo-${t._id}`,
      label: t.title,
      meta: proj?.name ?? "Project",
      href: `/projects/${String(t.projectId)}/gantt`,
    });
  }

  for (const p of projects) {
    if (p.status === "En retard" && todos.length < limit) {
      const id = `todo-late-${p._id}`;
      if (todos.some((x) => x.id === id)) continue;
      todos.push({
        id,
        label: `Planning review — ${p.name}`,
        meta: "Project behind schedule",
        href: `/projects/${p._id}/overview`,
      });
    }
  }

  if (todos.length < 2) {
    todos.push({
      id: "todo-kanban",
      label: "Task Kanban board",
      meta: "View and filter all tasks",
      href: "/tasks",
    });
  }

  return todos.slice(0, limit);
}

/** Progression % par projet (moyenne des tâches). */
export function projectProgressFromTasks(
  projectId: string,
  tasks: BackendTask[],
): number {
  return computeAverageProgress(tasksForProject(tasks, projectId));
}
