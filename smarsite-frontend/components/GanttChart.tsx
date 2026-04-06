"use client";

import * as React from "react";
import { scaleTime } from "@visx/scale";
import { Group } from "@visx/group";
import { AxisBottom } from "@visx/axis";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import { localPoint } from "@visx/event";

import type { BackendTask, Project, TaskPriority, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  calculateGridLayout,
  formatDate,
  GANTT_ROW_GAP,
  GANTT_ROW_HEIGHT,
  GanttZoomLevel,
  getCriticalPath,
  getTaskPosition,
  mapBackendTasksToCritical,
  MS_PER_DAY,
  priorityToColor,
  getTaskIcon,
  toDate,
  truncateGanttTitle,
} from "@/lib/ganttUtils";
import { AlertTriangle } from "lucide-react";
import {
  calculateTaskDates,
  detectCycle,
  orderTasksByDependencies,
  type ScheduledTask,
} from "@/lib/taskOrdering";
import GanttTaskBar from "./GanttTaskBar";

export interface GanttTaskView {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate: Date;
  durationDays: number;
  dependsOn: string[];
   progress: number;
   assignedToLabel?: string;
}

export interface GanttChartProps {
  project: Project;
  tasks: BackendTask[];
  /** Optional callback to react to rescheduled tasks. */
  onTaskDatesChange?: (taskId: string, nextStart: Date, nextEnd: Date) => void;
}

interface TooltipData {
  task: GanttTaskView;
}

const MARGIN_LEFT = 300;
const MARGIN_RIGHT = 52;
const MARGIN_TOP = 64;
const MARGIN_BOTTOM = 58;
const BAR_HEIGHT = 28;
/** Espace réservé au-dessus des lignes pour l’axe temps (évite chevauchement titre ↔ dates). */
const TIMELINE_AXIS_TOP = 52;

function priorityLabelFr(p: TaskPriority): string {
  switch (p) {
    case "HIGH":
      return "Haute";
    case "MEDIUM":
      return "Moyenne";
    case "LOW":
      return "Basse";
    default:
      return p;
  }
}

function resolveAssignedToLabel(task: BackendTask): string {
  const a = task.assignedTo;
  if (a == null) return "Non assigné";
  if (typeof a === "string") return a;
  if (typeof a === "object" && a) {
    if ("firstName" in a && "lastName" in a) {
      return `${a.firstName} ${a.lastName}`.trim();
    }
    if ("name" in a && a.name) return String(a.name);
  }
  return "Non assigné";
}

/**
 * Map raw BackendTask objects into GanttTaskView, computing initial start dates
 * from project start and task dependencies.
 */
function computeScheduledTasks(project: Project, tasks: BackendTask[]): GanttTaskView[] {
  if (!tasks.length) return [];

  const projectStart = new Date(project.startDate ?? new Date());
  if (Number.isNaN(projectStart.getTime())) {
    throw new Error("Invalid project startDate for Gantt chart");
  }

  const hasCycle = detectCycle(tasks);

  let scheduled: ScheduledTask[];

  if (!hasCycle) {
    // 1) Ordonnancement topologique
    const ordered = orderTasksByDependencies(tasks);
    // 2) Calcul automatique des dates en suivant les dépendances
    scheduled = calculateTaskDates(ordered, projectStart);
  } else {
    // En présence de cycle, on garde une stratégie de secours linéaire pour éviter de casser le rendu.
    // Les dépendances sont ignorées uniquement dans ce scénario d'erreur.
    // eslint-disable-next-line no-console
    console.warn("Cycle detected in task dependencies. Falling back to sequential scheduling.");

    let cursor = new Date(projectStart);
    scheduled = tasks.map((task) => {
      const startDate = new Date(cursor);
      const durationDays = Math.max(1, Math.round(task.duration ?? 1));
      const endDate = new Date(startDate.getTime() + durationDays * MS_PER_DAY);
      cursor = endDate;
      return {
        ...task,
        startDate,
        endDate,
      };
    });
  }

  return scheduled.map((task) => {
    const durationDays = Math.max(
      1,
      Math.round((task.endDate.getTime() - task.startDate.getTime()) / MS_PER_DAY),
    );

    return {
      id: task._id,
      title: task.title,
      priority: task.priority,
      status: task.status,
      startDate: task.startDate,
      durationDays,
      dependsOn: task.dependsOn ?? [],
      progress: Math.min(100, Math.max(0, task.progress ?? 0)),
      assignedToLabel: resolveAssignedToLabel(task),
    };
  });
}

export function GanttChart({ project, tasks, onTaskDatesChange }: GanttChartProps) {
  const [zoomLevel, setZoomLevel] = React.useState<GanttZoomLevel>("week");
  const [priorityFilter, setPriorityFilter] = React.useState<"ALL" | TaskPriority>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | TaskStatus>("ALL");
  const [showCriticalOnly, setShowCriticalOnly] = React.useState(false);
  const [hoveredLink, setHoveredLink] = React.useState<{ fromId: string; toId: string } | null>(null);

  const [scheduledTasks, setScheduledTasks] = React.useState<GanttTaskView[]>(() =>
    computeScheduledTasks(project, tasks),
  );

  React.useEffect(() => {
    setScheduledTasks(computeScheduledTasks(project, tasks));
  }, [project, tasks]);

  const allStart = React.useMemo(() => {
    if (!scheduledTasks.length) return new Date(project.startDate ?? new Date());
    return scheduledTasks.reduce((min, t) => (t.startDate < min ? t.startDate : min), new Date(project.startDate ?? new Date()));
  }, [scheduledTasks, project.startDate]);

  const allEnd = React.useMemo(() => {
    if (!scheduledTasks.length) return new Date(project.endDate ?? project.startDate ?? new Date());
    let max = new Date(project.endDate ?? project.startDate ?? new Date());
    for (const t of scheduledTasks) {
      const end = new Date(t.startDate.getTime() + t.durationDays * MS_PER_DAY);
      if (end > max) max = end;
    }
    return max;
  }, [scheduledTasks, project.endDate, project.startDate]);

  const layout = React.useMemo(
    () => calculateGridLayout(allStart, allEnd, zoomLevel),
    [allStart, allEnd, zoomLevel],
  );

  const criticalPathIds = React.useMemo(() => {
    const criticalTasks = mapBackendTasksToCritical(tasks);
    return new Set(getCriticalPath(criticalTasks));
  }, [tasks]);

  const {
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
    showTooltip,
    hideTooltip,
  } = useTooltip<TooltipData>();

  const svgWidth = layout.gridWidth + MARGIN_LEFT + MARGIN_RIGHT;

  const xScale = React.useMemo(
    () =>
      scaleTime<number>({
        domain: [layout.startDate, layout.endDate],
        range: [0, layout.gridWidth],
      }),
    [layout.startDate, layout.endDate, layout.gridWidth],
  );

  const pixelsPerDay = React.useMemo(() => {
    const totalDays = layout.daysPerCell * layout.numColumns;
    return totalDays > 0 ? layout.gridWidth / totalDays : 0;
  }, [layout.daysPerCell, layout.numColumns, layout.gridWidth]);

  const projectStats = React.useMemo(() => {
    if (!tasks.length) {
      return { totalSpanDays: 0, avgProgressPercent: 0 };
    }
    const spanDays = Math.max(1, Math.round((allEnd.getTime() - allStart.getTime()) / MS_PER_DAY));
    let weighted = 0;
    let totalDur = 0;
    for (const t of tasks) {
      const d = Math.max(1, Math.round(t.duration ?? 1));
      const p = Math.min(100, Math.max(0, t.progress ?? 0));
      weighted += d * p;
      totalDur += d;
    }
    const avg = totalDur ? Math.round(weighted / totalDur) : 0;
    return { totalSpanDays: spanDays, avgProgressPercent: avg };
  }, [tasks, allStart, allEnd]);

  const handleTaskDatesChange = React.useCallback(
    (taskId: string, nextStart: Date, nextEnd: Date) => {
      setScheduledTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, startDate: nextStart, durationDays: Math.max(1, Math.round((nextEnd.getTime() - nextStart.getTime()) / MS_PER_DAY)) } : t)),
      );
      onTaskDatesChange?.(taskId, nextStart, nextEnd);
    },
    [onTaskDatesChange],
  );

  const handleHover = React.useCallback(
    (event: React.MouseEvent<SVGRectElement>, taskId: string) => {
      const task = scheduledTasks.find((t) => t.id === taskId);
      if (!task) return;
      const point = localPoint(event) ?? { x: 0, y: 0 };
      showTooltip({
        tooltipData: { task },
        tooltipLeft: point.x + MARGIN_LEFT,
        tooltipTop: point.y + MARGIN_TOP,
      });
    },
    [scheduledTasks, showTooltip],
  );

  const handleLeave = React.useCallback(() => {
    hideTooltip();
  }, [hideTooltip]);

  // Visible tasks after filters are applied, with row indices.
  const visibleTasks = React.useMemo(() => {
    return scheduledTasks.filter((t) => {
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (showCriticalOnly && !criticalPathIds.has(t.id)) return false;
      return true;
    });
  }, [scheduledTasks, priorityFilter, statusFilter, showCriticalOnly, criticalPathIds]);

  const rowIndexedTasks = React.useMemo(() => {
    return visibleTasks.map((t, index) => ({ ...t, rowIndex: index }));
  }, [visibleTasks]);

  const rowsPixelHeight = Math.max(1, rowIndexedTasks.length) * (GANTT_ROW_HEIGHT + GANTT_ROW_GAP);

  const svgHeight = MARGIN_TOP + rowsPixelHeight + MARGIN_BOTTOM;

  const minStartByTaskId = React.useMemo(() => {
    const map = new Map<string, Date>();

    const byId = new Map<string, GanttTaskView>();
    scheduledTasks.forEach((t) => byId.set(t.id, t));

    for (const task of scheduledTasks) {
      if (!task.dependsOn.length) {
        map.set(task.id, new Date(allStart));
        continue;
      }
      let minStart = new Date(allStart);
      for (const depId of task.dependsOn) {
        const dep = byId.get(depId);
        if (!dep) continue;
        const depEnd = new Date(dep.startDate.getTime() + dep.durationDays * MS_PER_DAY);
        if (depEnd > minStart) minStart = depEnd;
      }
      map.set(task.id, minStart);
    }

    return map;
  }, [scheduledTasks, allStart]);

  const mad = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  const budgetDelta =
    typeof project.budget === "number" && !Number.isNaN(project.budget)
      ? (project.spentBudget ?? 0) - project.budget
      : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Project summary header */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">
              {project.name}
            </h2>
            {project.description && (
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {project.description}
              </p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="rounded-md bg-secondary/80 px-2 py-0.5 font-medium text-secondary-foreground">
                {projectStats.totalSpanDays} j · planning
              </span>
              <span className="rounded-md bg-secondary/80 px-2 py-0.5 font-medium text-secondary-foreground">
                {projectStats.avgProgressPercent}% av. tâches
              </span>
              {typeof project.budget === "number" && !Number.isNaN(project.budget) && (
                <span className="rounded-md bg-secondary/80 px-2 py-0.5 font-medium text-secondary-foreground">
                  Budget {mad(project.budget)}
                </span>
              )}
              {typeof project.spentBudget === "number" && (
                <span className="rounded-md bg-secondary/80 px-2 py-0.5 font-medium text-secondary-foreground">
                  Dépensé {mad(project.spentBudget)}
                </span>
              )}
              {budgetDelta !== null && (
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 font-medium",
                    budgetDelta > 0
                      ? "bg-destructive/10 text-destructive"
                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                  )}
                >
                  Écart {budgetDelta > 0 ? "+" : ""}
                  {mad(budgetDelta)}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 text-xs text-muted-foreground">
            <span>
              Début :{" "}
              {project.startDate
                ? new Date(project.startDate).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Non défini"}
            </span>
            <span>
              Fin :{" "}
              {project.endDate
                ? new Date(project.endDate).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Non définie"}
            </span>
            <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-foreground">
              {project.status}
            </span>
          </div>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[var(--chart-4)] transition-all duration-300 ease-out"
            style={{ width: `${projectStats.avgProgressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Échelle
          </span>
          <div className="inline-flex overflow-hidden rounded-lg border border-border bg-muted/30 p-0.5">
            {([
              ["day", "Jour"],
              ["week", "Semaine"],
              ["month", "Mois"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setZoomLevel(value)}
                className={cn(
                  "rounded-md px-3 py-2 text-xs font-semibold transition-colors",
                  zoomLevel === value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-xs font-medium text-muted-foreground">Priorité</span>
            {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() =>
                  setPriorityFilter((prev) => (prev === p ? "ALL" : p))
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                  priorityFilter === p
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:bg-muted/80",
                )}
              >
                <span
                  className="size-2 rounded-sm ring-1 ring-black/10 dark:ring-white/20"
                  style={{ backgroundColor: priorityToColor(p) }}
                  aria-hidden
                />
                {p === "HIGH" ? "Haute" : p === "MEDIUM" ? "Moy." : "Basse"}
              </button>
            ))}
          </div>

          <div className="hidden h-6 w-px bg-border sm:block" aria-hidden />

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-xs font-medium text-muted-foreground">Statut</span>
            {(["À faire", "En cours", "Terminé"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() =>
                  setStatusFilter((prev) => (prev === s ? "ALL" : s))
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                  statusFilter === s
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:bg-muted/80",
                )}
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    s === "Terminé" && "bg-emerald-500",
                    s === "En cours" && "bg-blue-500",
                    s === "À faire" && "bg-zinc-400 dark:bg-zinc-500",
                  )}
                  aria-hidden
                />
                {s}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowCriticalOnly((prev) => !prev)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors",
              showCriticalOnly
                ? "border-destructive bg-destructive text-destructive-foreground shadow-sm"
                : "border-border bg-card text-foreground hover:bg-muted/80",
            )}
          >
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
            Chemin critique
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-2 font-medium text-foreground/85">
          <span className="h-3.5 w-8 rounded-sm bg-muted-foreground/20 ring-1 ring-border/80" />
          Week-end
        </span>
        <span className="inline-flex items-center gap-2 font-medium text-foreground/85">
          <span className="relative h-0 w-8 border-t-2 border-dashed border-primary" />
          Aujourd&apos;hui
        </span>
      </div>

      <div className="w-full overflow-x-auto rounded-2xl border border-border bg-card shadow-md ring-1 ring-black/[0.05] dark:bg-card dark:ring-white/[0.08]">
        <svg
          width={svgWidth}
          height={svgHeight}
          role="img"
          aria-label="Diagramme de Gantt du projet"
          className="block min-w-0 touch-pan-x bg-card"
        >
          <Group left={MARGIN_LEFT} top={MARGIN_TOP}>
            {/* Colonne libellés : fond léger pour séparer du calendrier */}
            <rect
              x={-(MARGIN_LEFT - 10)}
              y={-4}
              width={MARGIN_LEFT - 18}
              height={rowsPixelHeight + 8}
              rx={12}
              fill="color-mix(in oklab, var(--muted) 42%, transparent)"
              stroke="var(--border)"
              strokeWidth={1}
              opacity={0.95}
            />

            {/* Time grid axis */}
            <AxisBottom
              top={-TIMELINE_AXIS_TOP}
              scale={xScale}
              tickValues={layout.tickDates}
              tickFormat={(value) => formatDate(value as Date, zoomLevel)}
              stroke="color-mix(in oklab, var(--border) 70%, transparent)"
              tickStroke="color-mix(in oklab, var(--border) 55%, transparent)"
              tickLength={6}
              tickLabelProps={() => ({
                fill: "var(--foreground)",
                fontSize: 11.5,
                fontWeight: 500,
                fontFamily: "var(--font-sans), system-ui, sans-serif",
                textAnchor: "middle",
                opacity: 0.82,
              })}
            />

            {/* Weekend shading (background) */}
            {(() => {
              const rects: React.ReactElement[] = [];
              let cursor = new Date(layout.startDate.getTime());
              const end = new Date(layout.endDate.getTime());
              while (cursor <= end) {
                const day = cursor.getDay();
                if (day === 0 || day === 6) {
                  const startOfDay = new Date(cursor.getTime());
                  const endOfDay = new Date(cursor.getTime() + MS_PER_DAY);
                  const x1 = xScale(startOfDay) ?? 0;
                  const x2 = xScale(endOfDay) ?? x1;
                  const w = Math.max(0, x2 - x1);
                  rects.push(
                    <rect
                      key={`weekend-${cursor.toISOString()}`}
                      x={x1}
                      y={0}
                      width={w}
                      height={rowsPixelHeight}
                      fill="var(--muted-foreground)"
                      opacity={0.07}
                    />,
                  );
                }
                cursor = new Date(cursor.getTime() + MS_PER_DAY);
              }
              return rects;
            })()}

            {/* Alternance de lignes (zebra) */}
            {rowIndexedTasks.map((_, rowIdx) => {
              const y = rowIdx * (GANTT_ROW_HEIGHT + GANTT_ROW_GAP);
              return (
                <rect
                  key={`zebra-${rowIdx}`}
                  x={0}
                  y={y}
                  width={layout.gridWidth}
                  height={GANTT_ROW_HEIGHT + GANTT_ROW_GAP}
                  fill="var(--foreground)"
                  opacity={rowIdx % 2 === 0 ? 0.02 : 0.055}
                />
              );
            })}

            {/* Vertical grid lines */}
            {layout.tickDates.map((d, index) => {
              const x = xScale(d) ?? 0;
              return (
                <line
                  key={`grid-${index}`}
                  x1={x}
                  x2={x}
                  y1={0}
                  y2={rowsPixelHeight}
                  stroke="var(--border)"
                  strokeWidth={index === 0 ? 1.5 : 1}
                  opacity={index === 0 ? 0.65 : 0.38}
                />
              );
            })}

            {/* Today marker line + label */}
            {(() => {
              const today = toDate(new Date().toISOString().slice(0, 10));
              const x = xScale(today);
              if (x == null || x < 0 || x > layout.gridWidth) return null;
              return (
                <g>
                  <line
                    x1={x}
                    x2={x}
                    y1={0}
                    y2={rowsPixelHeight}
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    strokeDasharray="7 5"
                    opacity={0.88}
                  />
                  <text
                    x={x}
                    y={-(TIMELINE_AXIS_TOP - 22)}
                    textAnchor="middle"
                    fill="var(--primary)"
                    fontSize={11}
                    fontWeight={700}
                    style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
                  >
                    Aujourd&apos;hui
                  </text>
                </g>
              );
            })()}

            {/* Task labels on the left */}
            {rowIndexedTasks.map((task) => {
              const rowTop = task.rowIndex * (GANTT_ROW_HEIGHT + GANTT_ROW_GAP);
              const centerY = rowTop + GANTT_ROW_HEIGHT / 2;
              const assignee =
                task.assignedToLabel && task.assignedToLabel.length > 22
                  ? `${task.assignedToLabel.slice(0, 21)}…`
                  : task.assignedToLabel ?? "Non assigné";
              return (
                <g key={`label-${task.id}`}>
                  <text
                    x={-18}
                    y={centerY - 8}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill="var(--foreground)"
                    fontSize={13}
                    fontWeight={600}
                    style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
                  >
                    <tspan style={{ opacity: 0.92 }}>{getTaskIcon(task.title)}</tspan>
                    <tspan>{` ${truncateGanttTitle(task.title, 34)}`}</tspan>
                  </text>
                  <text
                    x={-18}
                    y={centerY + 11}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill="var(--muted-foreground)"
                    fontSize={11}
                    fontWeight={500}
                    style={{
                      fontFamily: "var(--font-sans), system-ui, sans-serif",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {`${task.durationDays} j · ${task.progress}% · ${assignee}`}
                  </text>
                </g>
              );
            })}

            {/* Dependency arrows */}
            {rowIndexedTasks.map((task) => {
              const taskRowIndex = task.rowIndex;
              const taskPos = getTaskPosition(
                {
                  startDate: task.startDate,
                  durationDays: task.durationDays,
                  rowIndex: taskRowIndex,
                },
                layout.startDate,
                zoomLevel,
              );

              return task.dependsOn.map((depId) => {
                const dep = rowIndexedTasks.find((t) => t.id === depId);
                if (!dep) return null;
                const depPos = getTaskPosition(
                  {
                    startDate: dep.startDate,
                    durationDays: dep.durationDays,
                    rowIndex: dep.rowIndex,
                  },
                  layout.startDate,
                  zoomLevel,
                );

                const x1 = depPos.x + depPos.width;
                const y1 = depPos.y + GANTT_ROW_HEIGHT / 2;
                const x2 = taskPos.x;
                const y2 = taskPos.y + GANTT_ROW_HEIGHT / 2;

                const midX = (x1 + x2) / 2;

                const isCriticalEdge =
                  criticalPathIds.has(depId) && criticalPathIds.has(task.id);

                const isHovered =
                  hoveredLink?.fromId === depId && hoveredLink?.toId === task.id;

                const strokeColor = isCriticalEdge
                  ? "var(--destructive)"
                  : "var(--muted-foreground)";
                const strokeWidth = isCriticalEdge || isHovered ? 2.6 : 1.6;
                const markerId = isCriticalEdge ? "arrowhead-critical" : "arrowhead";

                return (
                  <path
                    key={`arrow-${depId}-${task.id}`}
                    d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    markerEnd={`url(#${markerId})`}
                    opacity={isHovered ? 0.98 : 0.62}
                    strokeDasharray="5 4"
                    strokeLinecap="round"
                    style={{ transition: "opacity 120ms ease, stroke-width 120ms ease" }}
                    onMouseEnter={() => setHoveredLink({ fromId: depId, toId: task.id })}
                    onMouseLeave={() => setHoveredLink(null)}
                  />
                );
              });
            })}

            {/* Arrowhead markers */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth={8}
                markerHeight={8}
                refX={8}
                refY={4}
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 z" fill="var(--muted-foreground)" />
              </marker>
              <marker
                id="arrowhead-critical"
                markerWidth={8}
                markerHeight={8}
                refX={8}
                refY={4}
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 z" fill="var(--destructive)" />
              </marker>
            </defs>

            {/* Task bars */}
            {rowIndexedTasks.map((task) => {
              const pos = getTaskPosition(
                {
                  startDate: task.startDate,
                  durationDays: task.durationDays,
                  rowIndex: task.rowIndex,
                },
                layout.startDate,
                zoomLevel,
              );

              const isCritical = criticalPathIds.has(task.id);
              const minStart = minStartByTaskId.get(task.id);
              const isHighlighted = Boolean(
                hoveredLink &&
                  (hoveredLink.fromId === task.id || hoveredLink.toId === task.id),
              );

              return (
                <GanttTaskBar
                  key={task.id}
                  taskId={task.id}
                  x={pos.x}
                  y={pos.y}
                  width={pos.width}
                  rowHeight={GANTT_ROW_HEIGHT}
                  barHeight={BAR_HEIGHT}
                  color={priorityToColor(task.priority)}
                  isCritical={isCritical}
                   isHighlighted={isHighlighted}
                   hasDependencies={task.dependsOn.length > 0}
                  startDate={task.startDate}
                  endDate={new Date(task.startDate.getTime() + task.durationDays * MS_PER_DAY)}
                   progress={task.progress}
                   status={task.status}
                  pixelsPerDay={pixelsPerDay}
                  minStartDate={minStart}
                  onChangeDates={handleTaskDatesChange}
                  onHover={handleHover}
                  onLeave={handleLeave}
                />
              );
            })}
          </Group>
        </svg>
      </div>

      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          top={tooltipTop}
          left={tooltipLeft}
          offsetTop={8}
          className="z-50 max-w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-popover px-3.5 py-3 text-popover-foreground shadow-lg"
          style={{
            boxShadow:
              "0 10px 40px -10px color-mix(in oklab, var(--foreground) 25%, transparent)",
          }}
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold leading-snug text-foreground">
              {tooltipData.task.title}
            </span>
            <span className="text-xs text-muted-foreground">
              {priorityLabelFr(tooltipData.task.priority)} · {tooltipData.task.status}
            </span>
            <div className="mt-1 space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
              <p>
                Début :{" "}
                <span className="font-medium text-foreground">
                  {tooltipData.task.startDate.toLocaleDateString("fr-FR")}
                </span>
              </p>
              <p>
                Durée :{" "}
                <span className="font-medium text-foreground">
                  {tooltipData.task.durationDays} jour(s)
                </span>
              </p>
              <p>
                Progression :{" "}
                <span className="font-medium text-foreground">
                  {tooltipData.task.progress}%
                </span>
              </p>
              {tooltipData.task.assignedToLabel && (
                <p>
                  Assigné :{" "}
                  <span className="font-medium text-foreground">
                    {tooltipData.task.assignedToLabel}
                  </span>
                </p>
              )}
              {tooltipData.task.dependsOn.length > 0 && (
                <p>
                  Dépendances :{" "}
                  <span className="font-medium text-foreground">
                    {tooltipData.task.dependsOn.length}
                  </span>
                </p>
              )}
            </div>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export default GanttChart;
