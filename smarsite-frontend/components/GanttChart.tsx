"use client";

import * as React from "react";
import { scaleTime } from "@visx/scale";
import { Group } from "@visx/group";
import { AxisBottom } from "@visx/axis";
import { useTooltip, TooltipWithBounds } from "@visx/tooltip";
import { localPoint } from "@visx/event";

import type { BackendTask, Project, TaskPriority, TaskStatus } from "@/lib/types";
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
  progressToColor,
  statusToColor,
  getTaskIcon,
  toDate,
} from "@/lib/ganttUtils";
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

const MARGIN_LEFT = 120;
const MARGIN_RIGHT = 40;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 40;
const BAR_HEIGHT = 18;

function resolveAssignedToLabel(task: BackendTask): string {
  const a = task.assignedTo;
  if (a == null) return "Non assigné";
  if (typeof a === "string") return a;
  if (typeof a === "object" && "name" in a && a.name) {
    return String(a.name);
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

  const svgHeight =
    MARGIN_TOP +
    scheduledTasks.length * (GANTT_ROW_HEIGHT + GANTT_ROW_GAP) +
    MARGIN_BOTTOM;
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

  return (
    <div className="flex flex-col gap-3">
      {/* Project summary header */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">{project.name}</h2>
            {project.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-2">
              <span>{projectStats.totalSpanDays} j de planning</span>
              <span>• {projectStats.avgProgressPercent}% complété</span>
              {typeof project.budget === "number" && !Number.isNaN(project.budget) && (
                <span>
                  • Budget :
                  {" "}
                  {new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: "MAD",
                    maximumFractionDigits: 0,
                  }).format(project.budget)}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-[11px] text-muted-foreground">
            <span>
              Début :{" "}
              {project.startDate
                ? new Date(project.startDate).toLocaleDateString("fr-FR")
                : "Non défini"}
            </span>
            <span>
              Fin prévue :{" "}
              {project.endDate
                ? new Date(project.endDate).toLocaleDateString("fr-FR")
                : "Non définie"}
            </span>
            <span>Statut : {project.status}</span>
          </div>
        </div>
        <div className="mt-2 w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-150 ease-in-out"
            style={{ width: `${projectStats.avgProgressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-muted-foreground">Zoom</span>
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            {([
              ["day", "Jour"],
              ["week", "Semaine"],
              ["month", "Mois"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setZoomLevel(value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${zoomLevel === value ? "bg-primary text-white" : "bg-card text-foreground hover:bg-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
          {/* Priority legend + filter */}
          <div className="flex items-center gap-1">
            <span className="mr-1 font-semibold">Priorité :</span>
            {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() =>
                  setPriorityFilter((prev) => (prev === p ? "ALL" : p))
                }
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] transition-colors ${
                  priorityFilter === p
                    ? "bg-primary text-white border-primary"
                    : "bg-card text-foreground border-border hover:bg-muted"
                }`}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: priorityToColor(p) }}
                  aria-hidden
                />
                <span>{p}</span>
              </button>
            ))}
          </div>

          {/* Status legend + filter */}
          <div className="flex items-center gap-1">
            <span className="mr-1 font-semibold">Statut :</span>
            {(["À faire", "En cours", "Terminé"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() =>
                  setStatusFilter((prev) => (prev === s ? "ALL" : s))
                }
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-white border-primary"
                    : "bg-card text-foreground border-border hover:bg-muted"
                }`}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: statusToColor(s) }}
                  aria-hidden
                />
                <span>{s}</span>
              </button>
            ))}
          </div>

          {/* Critical path toggle */}
          <button
            type="button"
            onClick={() => setShowCriticalOnly((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] transition-colors ${
              showCriticalOnly
                ? "bg-red-700 text-white border-red-700"
                : "bg-card text-foreground border-border hover:bg-muted"
            }`}
          >
            <span aria-hidden>🔴</span>
            <span>Critique</span>
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto border border-border rounded-xl bg-card">
        <svg width={svgWidth} height={svgHeight} role="img">
          <Group left={MARGIN_LEFT} top={MARGIN_TOP}>
            {/* Time grid axis */}
            <AxisBottom
              top={0}
              scale={xScale}
              tickValues={layout.tickDates}
              tickFormat={(value) => formatDate(value as Date, zoomLevel)}
              stroke="#e5e7eb"
              tickStroke="#e5e7eb"
              tickLabelProps={() => ({
                fill: "#6b7280",
                fontSize: 10,
                textAnchor: "middle",
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
                      y={8}
                      width={w}
                      height={svgHeight - MARGIN_TOP - MARGIN_BOTTOM}
                      fill="#f9fafb"
                      opacity={0.7}
                    />,
                  );
                }
                cursor = new Date(cursor.getTime() + MS_PER_DAY);
              }
              return rects;
            })()}

            {/* Vertical grid lines */}
            {layout.tickDates.map((d, index) => {
              const x = xScale(d) ?? 0;
              return (
                <line
                  key={`grid-${index}`}
                  x1={x}
                  x2={x}
                  y1={8}
                  y2={svgHeight - MARGIN_TOP - MARGIN_BOTTOM}
                  stroke="#f3f4f6"
                  strokeWidth={index === 0 ? 2 : 1}
                />
              );
            })}

            {/* Today marker line */}
            {(() => {
              const today = toDate(new Date().toISOString().slice(0, 10));
              const x = xScale(today);
              if (x == null || x < 0 || x > layout.gridWidth) return null;
              return (
                <line
                  x1={x}
                  x2={x}
                  y1={8}
                  y2={svgHeight - MARGIN_TOP - MARGIN_BOTTOM}
                  stroke="#ef4444"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                />
              );
            })()}

            {/* Task labels on the left */}
            {rowIndexedTasks.map((task) => {
              const y = task.rowIndex * (GANTT_ROW_HEIGHT + GANTT_ROW_GAP) + GANTT_ROW_HEIGHT / 2;
              return (
                <text
                  key={`label-${task.id}`}
                  x={-12}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="#111827"
                  fontSize={11}
                >
                  <tspan>{getTaskIcon(task.title)} </tspan>
                  <tspan>
                    {task.title} • {task.durationDays}j
                    {typeof project.budget === "number" && !Number.isNaN(project.budget)
                      ? " • ≈ " +
                        new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "MAD",
                          maximumFractionDigits: 0,
                        }).format(project.budget / Math.max(1, scheduledTasks.length))
                      : ""}
                  </tspan>
                </text>
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

                const strokeColor = isCriticalEdge ? "#b91c1c" : "#9ca3af";
                const strokeWidth = isCriticalEdge || isHovered ? 2 : 1;

                return (
                  <path
                    key={`arrow-${depId}-${task.id}`}
                    d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    markerEnd={"url(#arrowhead)"}
                    strokeDasharray="4 4"
                    style={{ transition: "all 150ms ease-in-out" }}
                    onMouseEnter={() => setHoveredLink({ fromId: depId, toId: task.id })}
                    onMouseLeave={() => setHoveredLink(null)}
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="8"
                      to="0"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </path>
                );
              });
            })}

            {/* Arrowhead marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth={8}
                markerHeight={8}
                refX={8}
                refY={4}
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 z" fill="#9ca3af" />
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
          style={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "8px 12px",
            boxShadow: "0 10px 15px -3px rgba(15,23,42,0.1)",
            color: "#111827",
            maxWidth: 260,
          }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold">{tooltipData.task.title}</span>
            <span className="text-[11px] text-muted-foreground">
              {tooltipData.task.priority} · {tooltipData.task.status}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Début : {tooltipData.task.startDate.toLocaleDateString("fr-FR")}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Durée : {tooltipData.task.durationDays} jour(s)
            </span>
            <span className="text-[11px] text-muted-foreground">
              Progression : {tooltipData.task.progress}%
            </span>
            {tooltipData.task.assignedToLabel && (
              <span className="text-[11px] text-muted-foreground">
                Assigné à : {tooltipData.task.assignedToLabel}
              </span>
            )}
            {tooltipData.task.dependsOn.length > 0 && (
              <span className="text-[11px] text-muted-foreground">
                Dépendances : {tooltipData.task.dependsOn.length}
              </span>
            )}
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export default GanttChart;
