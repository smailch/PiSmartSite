'use client';

import { useCallback, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  CircleDashed,
  GripVertical,
  Loader2,
  Pencil,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import type { TaskPriority, TaskStatus } from '@/lib/types';
import { formatDh } from '@/lib/formatMoney';

const KANBAN_COLUMNS: {
  status: TaskStatus;
  title: string;
  subtitle: string;
  /** Top accent + column tint (light / dark) */
  accent: string;
  icon: typeof CircleDashed;
  /** Icon + soft tile beside column title */
  titleIconClass: string;
  titleIconTileClass: string;
}[] = [
  {
    status: 'À faire',
    title: 'To do',
    subtitle: 'Ideas & queued work',
    accent:
      'border-t-slate-400 dark:border-t-slate-500 bg-gradient-to-b from-slate-500/[0.07] to-transparent dark:from-slate-400/[0.08]',
    icon: CircleDashed,
    titleIconClass: 'text-slate-600 dark:text-slate-300',
    titleIconTileClass: 'bg-slate-500/12 ring-slate-500/20 dark:bg-slate-400/12 dark:ring-slate-400/25',
  },
  {
    status: 'En cours',
    title: 'In progress',
    subtitle: 'Currently active',
    accent:
      'border-t-primary bg-gradient-to-b from-primary/[0.10] to-transparent dark:from-primary/[0.14]',
    icon: PlayCircle,
    titleIconClass: 'text-primary',
    titleIconTileClass: 'bg-primary/12 ring-primary/25',
  },
  {
    status: 'Terminé',
    title: 'Done',
    subtitle: 'Shipped & verified',
    accent:
      'border-t-emerald-500 dark:border-t-emerald-400 bg-gradient-to-b from-emerald-500/[0.08] to-transparent dark:from-emerald-400/[0.10]',
    icon: CheckCircle2,
    titleIconClass: 'text-emerald-600 dark:text-emerald-400',
    titleIconTileClass: 'bg-emerald-500/12 ring-emerald-500/25 dark:bg-emerald-400/12 dark:ring-emerald-400/30',
  },
];

export interface KanbanUiTask {
  id: string;
  title: string;
  project: string;
  progress: number;
  spentBudget: number;
  status: TaskStatus;
  priority: TaskPriority;
  /** Indicateur calculé (optionnel si non fourni). */
  isLate?: boolean;
}

interface TaskKanbanBoardProps {
  tasks: KanbanUiTask[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onEdit: (taskId: string) => void;
  savingTaskId: string | null;
  getPriorityStyle: (priority: TaskPriority) => string;
  priorityCellLabel: (p: TaskPriority) => string;
  /** Affiche le badge « Late » quand `task.isLate` est true. */
  showLateBadge?: boolean;
}

export default function TaskKanbanBoard({
  tasks,
  onStatusChange,
  onEdit,
  savingTaskId,
  getPriorityStyle,
  priorityCellLabel,
  showLateBadge = false,
}: TaskKanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<TaskStatus | null>(null);

  const tasksByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks],
  );

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingId(taskId);
    e.dataTransfer.setData('text/task-id', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTargetStatus(null);
  };

  const handleDragOverColumn = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetStatus(status);
  };

  const handleDragLeaveColumn = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) {
      setDropTargetStatus(null);
    }
  };

  const handleDropOnColumn = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    setDropTargetStatus(null);
    const taskId = e.dataTransfer.getData('text/task-id');
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    await onStatusChange(taskId, newStatus);
  };

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-px -z-10 rounded-3xl bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.05] dark:from-primary/[0.10] dark:via-transparent dark:to-accent/[0.06]"
        aria-hidden
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6 min-h-[440px]">
        {KANBAN_COLUMNS.map((col) => {
          const columnTasks = tasksByStatus(col.status);
          const isDropTarget = dropTargetStatus === col.status;
          const Icon = col.icon;

          return (
            <div
              key={col.status}
              className={`group/column flex flex-col overflow-hidden rounded-2xl border bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 dark:bg-card/95 dark:shadow-black/20 ${
                isDropTarget
                  ? 'scale-[1.02] border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/30 dark:shadow-primary/20'
                  : 'border-border/60 hover:border-border hover:shadow-md dark:border-border/50'
              }`}
              onDragOver={(e) => handleDragOverColumn(e, col.status)}
              onDragLeave={handleDragLeaveColumn}
              onDrop={(e) => handleDropOnColumn(e, col.status)}
            >
              <div
                className={`border-t-[3px] px-4 py-4 sm:px-5 ${col.accent} border-x-0 border-b border-b-border/40 dark:border-b-border/30`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ${col.titleIconTileClass}`}
                      aria-hidden
                    >
                      <Icon className={`h-5 w-5 ${col.titleIconClass}`} />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <h3 className="text-[0.9375rem] font-bold tracking-tight text-foreground">
                        {col.title}
                      </h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {col.subtitle}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-background/90 px-2.5 py-1 text-xs font-bold tabular-nums text-foreground shadow-sm ring-1 ring-border/60 dark:bg-muted/80">
                    {columnTasks.length}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 pb-4 pt-2 sm:px-4 max-h-[min(68vh,600px)] [scrollbar-width:thin]">
                {columnTasks.map((task) => {
                  const isDragging = draggingId === task.id;
                  const isSaving = savingTaskId === task.id;

                  return (
                    <article
                      key={task.id}
                      id={`kanban-task-${task.id}`}
                      draggable={!isSaving}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-card/80 p-4 shadow-sm transition-all duration-200 dark:from-card dark:to-card/90 dark:shadow-black/25 ${
                        isDragging
                          ? 'scale-95 opacity-40 shadow-none'
                          : 'hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/40'
                      } ${isSaving ? 'pointer-events-none opacity-75' : 'cursor-grab active:cursor-grabbing'} border-border/70 dark:border-border/60`}
                    >
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary/50 via-accent/40 to-primary/30 opacity-80" />
                      <div className="relative flex gap-3 pl-1">
                        <div className="flex shrink-0 flex-col items-center pt-0.5 text-muted-foreground/70">
                          <GripVertical className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold leading-snug tracking-tight text-foreground line-clamp-4">
                              {task.title}
                            </p>
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                onEdit(task.id);
                              }}
                              className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                              aria-label="Edit task"
                              title="Edit"
                            >
                              {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
                              ) : (
                                <Pencil className="h-4 w-4" aria-hidden />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/80 dark:bg-muted/50">
                              <Briefcase className="h-3.5 w-3.5" aria-hidden />
                            </span>
                            <span className="truncate font-medium text-foreground/85">{task.project}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-xs font-medium ${getPriorityStyle(task.priority)}`}>
                              {priorityCellLabel(task.priority)}
                            </span>
                            {showLateBadge && task.isLate ? (
                              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-500/25 dark:text-amber-100 dark:ring-amber-400/30">
                                Late
                              </span>
                            ) : null}
                            <span className="rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground dark:bg-muted/40">
                              {task.progress}%
                            </span>
                            <span className="rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground dark:bg-muted/40">
                              {formatDh(task.spentBudget)}
                            </span>
                          </div>

                          <div className="pt-0.5">
                            <div className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              <span>Progress</span>
                              <span className="tabular-nums">{task.progress}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted/80 dark:bg-muted/50">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-accent transition-[width] duration-500 ease-out"
                                style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {columnTasks.length === 0 && (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-12 text-center dark:bg-muted/10">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-background/80 shadow-sm ring-1 ring-border/50 dark:bg-card">
                      <Sparkles className="h-5 w-5 text-muted-foreground" aria-hidden />
                    </div>
                    <p className="text-sm font-medium text-foreground/90">No tasks yet</p>
                    <p className="mt-1 max-w-[200px] text-xs leading-relaxed text-muted-foreground">
                      Drop a card here or add a new task from the header.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
