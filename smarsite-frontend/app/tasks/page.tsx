'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import TaskForm, { type TaskFormValues } from '@/components/TaskForm';
import TaskKanbanBoard from '@/components/TaskKanbanBoard';
import {
  Clipboard,
  Users,
  Plus,
  Filter,
  Briefcase,
  Pencil,
  Trash2,
  ArrowUpDown,
  ListTodo,
  X,
  LayoutGrid,
  Table2,
} from 'lucide-react';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createTask,
  deleteTask,
  fetcher,
  getProjects,
  getTasksKey,
  getUsersKey,
  getHumans,
  updateTask,
} from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { formatDh } from '@/lib/formatMoney';
import type {
  BackendTask,
  BackendUser,
  Human,
  Project,
  TaskPriority,
  TaskStatus,
} from '@/lib/types';
import { isTaskLate } from '@/lib/taskLate';

type StatusFilter = 'All' | TaskStatus;
type PriorityFilter = 'All' | TaskPriority;
type ProgressSort = 'none' | 'asc' | 'desc';

interface UiTask {
  id: string;
  projectId: string;
  title: string;
  project: string;
  assignedToLabel: string;
  dependencyCount: number;
  progress: number;
  spentBudget: number;
  status: TaskStatus;
  priority: TaskPriority;
  /** Indicateur calculé (date de fin dépassée, statut ≠ Done). */
  isLate: boolean;
}

const defaultFormValues = (projectId: string): TaskFormValues => ({
  title: '',
  description: '',
  projectId,
  duration: 1,
  priority: 'MEDIUM',
  status: 'À faire',
  progress: 0,
  spentBudget: 0,
  assignedTo: '',
  startDate: '',
  endDate: '',
  dependsOn: [],
});

function toDateInputValue(dateValue?: string): string {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function assignedToId(task: BackendTask): string {
  const a = task.assignedTo;
  if (a == null) return '';
  if (typeof a === 'string') return a;
  if (typeof a === 'object' && a && '_id' in a) return a._id;
  return '';
}

function assignedToLabel(
  task: BackendTask,
  usersById: Map<string, BackendUser>,
  humansById: Map<string, Human>,
): string {
  const a = task.assignedTo;
  if (a == null) return 'Unassigned';
  if (typeof a === 'object' && a) {
    if ('firstName' in a && 'lastName' in a) {
      return `${a.firstName} ${a.lastName}`.trim();
    }
    if ('name' in a && a.name) return a.name;
  }
  if (typeof a === 'string') {
    const human = humansById.get(a);
    if (human) return `${human.firstName} ${human.lastName}`;
    return usersById.get(a)?.name ?? 'Unassigned';
  }
  return 'Unassigned';
}

function taskStatusLabel(status: TaskStatus): string {
  switch (status) {
    case 'À faire':
      return 'To do';
    case 'En cours':
      return 'In progress';
    case 'Terminé':
      return 'Done';
    default:
      return status;
  }
}

const TASK_STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'All' },
  { label: 'To do', value: 'À faire' },
  { label: 'In progress', value: 'En cours' },
  { label: 'Done', value: 'Terminé' },
];

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

function scopedProjectIdFromSearchKey(searchKey: string): string | null {
  const p = new URLSearchParams(searchKey).get('project');
  return p && OBJECT_ID_RE.test(p) ? p : null;
}

function priorityFilterLabel(p: PriorityFilter): string {
  if (p === 'All') return 'All';
  if (p === 'HIGH') return 'High';
  if (p === 'MEDIUM') return 'Medium';
  return 'Low';
}

function priorityCellLabel(p: TaskPriority): string {
  switch (p) {
    case 'HIGH':
      return 'High';
    case 'MEDIUM':
      return 'Medium';
    case 'LOW':
      return 'Low';
    default:
      return p;
  }
}

function TasksPageContent() {
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('All');
  const [progressSort, setProgressSort] = useState<ProgressSort>('none');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<TaskFormValues>(defaultFormValues(''));
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
  const [savingBoardTaskId, setSavingBoardTaskId] = useState<string | null>(null);
  /** Filtre board par projet (ignoré si URL ?project= définit un périmètre). */
  const [boardProjectFilterId, setBoardProjectFilterId] = useState<'all' | string>('all');

  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    error: tasksError,
  } = useSWR<BackendTask[]>(getTasksKey(), fetcher);
  const { data: projects = [], isLoading: isProjectsLoading } = useSWR<Project[]>('/projects', getProjects);
  const { data: users = [], isLoading: isUsersLoading } = useSWR<BackendUser[]>(getUsersKey(), fetcher);

  const [siteEngineers, setSiteEngineers] = useState<Human[]>([]);
  useEffect(() => {
    getHumans('Site Engineer')
      .then((data) => setSiteEngineers(Array.isArray(data) ? data : []))
      .catch((err) => console.error('[fetchSiteEngineers]', err));
  }, []);

  const humansById = useMemo(() => new Map(siteEngineers.map((h) => [h._id, h])), [siteEngineers]);

  const projectsById = useMemo(() => new Map(projects.map((p) => [p._id, p])), [projects]);
  const projectsSortedByName = useMemo(
    () =>
      [...projects].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' }),
      ),
    [projects],
  );
  const usersById = useMemo(() => new Map(users.map((u) => [u._id, u])), [users]);
  const lateCheckNow = useMemo(() => new Date(), []);

  const scopedProjectId = useMemo(
    () => scopedProjectIdFromSearchKey(searchKey),
    [searchKey],
  );

  const focusTaskId = useMemo(() => {
    const p = new URLSearchParams(searchKey).get('focusTask');
    return p && OBJECT_ID_RE.test(p) ? p : null;
  }, [searchKey]);

  const lastFocusedTaskRef = useRef<string | null>(null);

  useEffect(() => {
    const v = new URLSearchParams(searchKey).get('view');
    if (v === 'board') setViewMode('board');
  }, [searchKey]);

  useEffect(() => {
    if (scopedProjectId) setBoardProjectFilterId('all');
  }, [scopedProjectId]);

  const uiTasks: UiTask[] = useMemo(
    () =>
      tasks.map((task) => ({
        id: task._id,
        projectId: task.projectId,
        title: task.title,
        project: projectsById.get(task.projectId)?.name ?? '—',
        assignedToLabel: assignedToLabel(task, usersById, humansById),
        dependencyCount: Array.isArray(task.dependsOn) ? task.dependsOn.length : 0,
        progress: Math.min(100, Math.max(0, task.progress ?? 0)),
        spentBudget: task.spentBudget ?? 0,
        status: task.status,
        priority: task.priority,
        isLate: isTaskLate(task, lateCheckNow),
      })),
    [tasks, projectsById, usersById, humansById, lateCheckNow],
  );

  const uiTasksForScope = useMemo(() => {
    if (!scopedProjectId) return uiTasks;
    return uiTasks.filter((t) => t.projectId === scopedProjectId);
  }, [uiTasks, scopedProjectId]);

  const filteredTasks = useMemo(() => {
    let list = uiTasksForScope;
    if (statusFilter !== 'All') {
      list = list.filter((t) => t.status === statusFilter);
    }
    if (priorityFilter !== 'All') {
      list = list.filter((t) => t.priority === priorityFilter);
    }
    if (progressSort === 'asc') {
      list = [...list].sort((a, b) => a.progress - b.progress);
    } else if (progressSort === 'desc') {
      list = [...list].sort((a, b) => b.progress - a.progress);
    }
    return list;
  }, [uiTasksForScope, statusFilter, priorityFilter, progressSort]);

  /** Tasks for Kanban: filtre projet (hors scope URL), priorité, tri progression puis projet / titre. */
  const boardTasks = useMemo(() => {
    let list = uiTasksForScope;
    if (!scopedProjectId && boardProjectFilterId !== 'all') {
      list = list.filter((t) => t.projectId === boardProjectFilterId);
    }
    if (priorityFilter !== 'All') {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    const cmpProjectThenTitle = (a: UiTask, b: UiTask) => {
      const byProj = a.project.localeCompare(b.project, 'fr', { sensitivity: 'base' });
      if (byProj !== 0) return byProj;
      return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
    };

    if (progressSort === 'asc') {
      list = [...list].sort((a, b) => {
        const d = a.progress - b.progress;
        if (d !== 0) return d;
        return cmpProjectThenTitle(a, b);
      });
    } else if (progressSort === 'desc') {
      list = [...list].sort((a, b) => {
        const d = b.progress - a.progress;
        if (d !== 0) return d;
        return cmpProjectThenTitle(a, b);
      });
    } else {
      list = [...list].sort(cmpProjectThenTitle);
    }
    return list;
  }, [
    uiTasksForScope,
    scopedProjectId,
    boardProjectFilterId,
    priorityFilter,
    progressSort,
  ]);

  useEffect(() => {
    lastFocusedTaskRef.current = null;
  }, [focusTaskId]);

  useEffect(() => {
    if (viewMode !== 'board' || !focusTaskId || isTasksLoading) return;
    const inBoard = boardTasks.some((t) => t.id === focusTaskId);
    if (!inBoard) return;
    if (lastFocusedTaskRef.current === focusTaskId) return;
    lastFocusedTaskRef.current = focusTaskId;
    const tick = window.requestAnimationFrame(() => {
      const el = document.getElementById(`kanban-task-${focusTaskId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-2xl');
        window.setTimeout(() => {
          el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-2xl');
        }, 2200);
      }
    });
    return () => cancelAnimationFrame(tick);
  }, [viewMode, focusTaskId, isTasksLoading, boardTasks]);

  const handleKanbanStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t._id === taskId);
    if (!task || task.status === newStatus) return;
    setSavingBoardTaskId(taskId);
    try {
      await updateTask(taskId, {
        status: newStatus,
        ...(newStatus === 'Terminé' ? { progress: 100 } : {}),
      });
      await mutate(getTasksKey());
      await mutate('/projects');
      toast({
        title: 'Status updated',
        description: `Task moved to "${taskStatusLabel(newStatus)}".`,
      });
    } catch (error: unknown) {
      console.error('Failed to move task:', error);
      const message =
        error instanceof Error ? error.message : 'Could not update task status.';
      toast({ title: 'Error', description: message });
    } finally {
      setSavingBoardTaskId(null);
    }
  };

  const getTaskStatusStyle = (status: TaskStatus) => {
    switch (status) {
      case 'À faire':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800';
      case 'En cours':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800';
      case 'Terminé':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800';
      default:
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800';
    }
  };

  const getPriorityStyle = (priority: TaskPriority) => {
    switch (priority) {
      case 'HIGH':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800';
      case 'LOW':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800';
      default:
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800';
    }
  };

  const isLoading =
    isTasksLoading || isProjectsLoading || isUsersLoading;
  const hasError = tasksError;

  const resetForm = () => {
    setFormInitialValues(defaultFormValues(projects[0]?._id ?? ''));
  };

  const openCreateModal = () => {
    setMode('create');
    setEditingTaskId(null);
    setFormInitialValues(defaultFormValues(projects[0]?._id ?? ''));
    setIsModalOpen(true);
  };

  const openEditModal = (taskId: string) => {
    const taskToEdit = tasks.find((t) => t._id === taskId);
    if (!taskToEdit) return;
    setMode('edit');
    setEditingTaskId(taskId);
    setFormInitialValues({
      title: taskToEdit.title,
      description: taskToEdit.description ?? '',
      projectId: taskToEdit.projectId,
      duration: taskToEdit.duration,
      priority: taskToEdit.priority,
      status: taskToEdit.status,
      progress: taskToEdit.progress ?? 0,
      spentBudget: taskToEdit.spentBudget ?? 0,
      assignedTo: assignedToId(taskToEdit),
      startDate: toDateInputValue(taskToEdit.startDate),
      endDate: toDateInputValue(taskToEdit.endDate),
      dependsOn: Array.isArray(taskToEdit.dependsOn) ? [...taskToEdit.dependsOn] : [],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTaskId(null);
    setMode('create');
    resetForm();
  };

  const handleSubmitTask = async (values: TaskFormValues) => {
    if (!values.title.trim() || !values.projectId) return;
    if (values.duration < 1) return;
    if (values.progress < 0 || values.progress > 100) return;

    setIsSubmitting(true);
    try {
      const base = {
        title: values.title.trim(),
        description: values.description.trim(),
        projectId: values.projectId,
        duration: values.duration,
        priority: values.priority,
        status: values.status,
        progress: values.progress,
        spentBudget: values.spentBudget,
        dependsOn: values.dependsOn,
        ...(values.startDate ? { startDate: values.startDate } : {}),
        ...(values.endDate ? { endDate: values.endDate } : {}),
      };

      if (mode === 'create') {
        await createTask({
          ...base,
          ...(values.assignedTo.trim() ? { assignedTo: values.assignedTo.trim() } : {}),
        });
      } else if (editingTaskId) {
        await updateTask(editingTaskId, {
          ...base,
          assignedTo: values.assignedTo.trim() ? values.assignedTo.trim() : null,
        });
      }

      await mutate(getTasksKey());
      await mutate('/projects');
      toast({
        title: mode === 'create' ? 'Task created' : 'Task updated',
        description: 'Task details were saved.',
      });
      closeModal();
    } catch (error: unknown) {
      console.error('Failed to save task:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Unexpected error while saving';
      toast({ title: 'Error', description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeleteTargetId(taskId);
    try {
      await deleteTask(taskId);
      await mutate(getTasksKey());
      await mutate('/projects');
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast({ title: 'Error', description: 'Could not delete the task.' });
    } finally {
      setDeleteTargetId(null);
    }
  };

  const priorityFilterOptions: PriorityFilter[] = ['All', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <MainLayout>
      <PageHeader
        title="Tasks"
        description="Manage and track all project tasks and assignments"
      >
        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-semibold hover:bg-accent/90 transition-colors flex items-center gap-2 shadow-sm focus-visible:outline-none"
        >
          <Plus size={18} aria-hidden />
          New Task
        </button>
      </PageHeader>

      {scopedProjectId ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm">
          <p className="text-foreground">
            <span className="text-muted-foreground">Board scope: </span>
            <span className="font-semibold">
              {projectsById.get(scopedProjectId)?.name ?? 'This project'}
            </span>
          </p>
          <Link
            href={viewMode === 'board' ? '/tasks?view=board' : '/tasks'}
            className="font-medium text-primary hover:underline"
          >
            Show all tasks
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
            role="group"
            aria-label="Choose task layout"
          >
            <button
              type="button"
              onClick={() => setViewMode('board')}
              aria-pressed={viewMode === 'board'}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none ${
                viewMode === 'board'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid size={16} aria-hidden />
              Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none ${
                viewMode === 'table'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Table2 size={16} aria-hidden />
              Table
            </button>
          </div>
          {viewMode === 'board' && (
            <p id="kanban-drag-hint" className="text-xs text-muted-foreground max-w-md">
              Drag a card to another column to update its status (saved automatically). You can also
              use Move task on each card if you rely on the keyboard.
            </p>
          )}
        </div>
        <div
          className={`flex items-center gap-2 flex-wrap ${viewMode === 'board' ? 'opacity-60' : ''}`}
          title={viewMode === 'board' ? 'Switch to Table view to filter by status' : undefined}
          {...(viewMode === 'board' ? { 'aria-describedby': 'kanban-drag-hint' } : {})}
        >
          <Filter size={18} className="text-muted-foreground shrink-0" aria-hidden />
          <span id="tasks-status-heading" className="text-sm font-medium text-muted-foreground">
            Status
          </span>
          <fieldset
            disabled={viewMode === 'board'}
            className="m-0 min-w-0 flex flex-1 flex-wrap items-center gap-2 border-0 p-0"
          >
            <legend className="sr-only">Filter tasks by status</legend>
            <div role="radiogroup" aria-labelledby="tasks-status-heading" className="flex flex-wrap gap-2">
              {TASK_STATUS_FILTERS.map((row) => (
                <button
                  key={row.value}
                  type="button"
                  role="radio"
                  aria-checked={statusFilter === row.value}
                  onClick={() => setStatusFilter(row.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                    statusFilter === row.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary text-secondary-foreground hover:bg-muted'
                  }`}
                >
                  {row.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span id="tasks-priority-heading" className="text-sm font-medium text-muted-foreground ml-0 sm:ml-6">
            Priority
          </span>
          <div role="radiogroup" aria-labelledby="tasks-priority-heading" className="flex flex-wrap gap-2">
            {priorityFilterOptions.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={priorityFilter === p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none ${
                  priorityFilter === p
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-secondary-foreground hover:bg-muted'
                }`}
              >
                {priorityFilterLabel(p)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ArrowUpDown size={18} className="text-muted-foreground shrink-0" aria-hidden />
          <label htmlFor="tasks-progress-sort" className="text-sm font-medium text-muted-foreground">
            Sort by progress
          </label>
          <select
            id="tasks-progress-sort"
            value={progressSort}
            onChange={(e) => setProgressSort(e.target.value as ProgressSort)}
            className="rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-foreground"
          >
            <option value="none">None</option>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
        {viewMode === 'board' && !scopedProjectId ? (
          <div className="flex items-center gap-2 flex-wrap">
            <Briefcase size={18} className="text-muted-foreground shrink-0" aria-hidden />
            <label htmlFor="board-project-filter" className="text-sm font-medium text-muted-foreground">
              Board: filter by project
            </label>
            <select
              id="board-project-filter"
              value={boardProjectFilterId}
              onChange={(e) =>
                setBoardProjectFilterId(e.target.value === 'all' ? 'all' : e.target.value)
              }
              className="rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-foreground min-w-[12rem]"
            >
              <option value="all">All projects</option>
              {projectsSortedByName.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">
              Cards are sorted by project name, then task title (then by progress if selected above).
            </span>
          </div>
        ) : null}
      </div>

      {viewMode === 'board' && isLoading && (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="rounded-xl border border-border/80 bg-card py-12 text-center text-muted-foreground"
        >
          Loading tasks…
        </div>
      )}
      {viewMode === 'board' && hasError && (
        <div
          role="alert"
          className="rounded-xl border border-border/80 bg-card py-12 text-center text-destructive"
        >
          Failed to load tasks from backend
        </div>
      )}
      {viewMode === 'board' && !isLoading && !hasError && (
        <div className="rounded-3xl border border-border/50 bg-gradient-to-b from-muted/30 to-card p-4 shadow-lg shadow-black/[0.03] ring-1 ring-black/[0.04] dark:border-border/40 dark:from-muted/15 dark:shadow-black/30 dark:ring-white/[0.06] sm:p-6">
          <TaskKanbanBoard
            tasks={boardTasks}
            onStatusChange={handleKanbanStatusChange}
            onEdit={openEditModal}
            savingTaskId={savingBoardTaskId}
            getPriorityStyle={getPriorityStyle}
            priorityCellLabel={priorityCellLabel}
            showLateBadge
          />
        </div>
      )}

      <div
        className={`rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] ${
          viewMode === 'board' ? 'hidden' : ''
        }`}
      >
        <div className="w-full">
          <table className="w-full min-w-0 table-auto border-collapse text-sm">
            <caption className="sr-only">
              Task list. Rows correspond to tasks; columns include title, project, assignment, progress,
              and actions.
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th
                  scope="col"
                  className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:pl-3 sm:px-3 whitespace-normal break-words"
                >
                  Task
                </th>
                <th
                  scope="col"
                  className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-3 whitespace-normal break-words"
                >
                  Project
                </th>
                <th
                  scope="col"
                  className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-3 whitespace-normal break-words"
                >
                  Dependencies
                </th>
                <th
                  scope="col"
                  className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-3 whitespace-normal break-words"
                >
                  Assigned to
                </th>
                <th
                  scope="col"
                  className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-3 whitespace-normal break-words"
                >
                  Progress
                </th>
                <th
                  scope="col"
                  className="px-2 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-3 tabular-nums whitespace-normal break-words"
                >
                  Spent budget
                </th>
                <th
                  scope="col"
                  className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-3 whitespace-normal break-words"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-3 whitespace-normal break-words"
                >
                  Priority
                </th>
                <th
                  scope="col"
                  className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground last:pr-3 sm:px-3 whitespace-normal break-words"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                    <tr key={task.id} className="border-b border-border/60 transition-colors odd:bg-background even:bg-muted/[0.35] hover:bg-primary/[0.04]">
                      <td className="px-2 py-3 align-top break-words first:pl-3 sm:px-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <Clipboard size={17} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                          <span className="font-semibold text-foreground">{task.title}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top break-words sm:px-3">
                        <div className="flex items-start gap-2 min-w-0">
                          <Briefcase size={15} className="mt-0.5 shrink-0 text-primary/70" aria-hidden />
                          <span className="text-sm font-medium text-foreground">{task.project}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top break-words sm:px-3">
                        {task.dependencyCount > 0 ? (
                          <span className="inline-flex max-w-full items-center justify-center whitespace-normal rounded-full bg-blue-100 px-2 py-0.5 text-center text-xs font-medium leading-snug text-blue-900 dark:bg-blue-950/55 dark:text-blue-100">
                            Depends on {task.dependencyCount} task(s)
                          </span>
                        ) : (
                          <span className="inline-flex max-w-full items-center justify-center whitespace-normal rounded-full bg-muted px-2 py-0.5 text-center text-xs font-medium leading-snug text-foreground">
                            No dependencies
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 align-top break-words sm:px-3">
                        <div className="flex items-start gap-2 min-w-0">
                          <Users size={15} className="mt-0.5 shrink-0 text-primary/80" aria-hidden />
                          <span className="text-sm font-medium text-foreground">{task.assignedToLabel}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top sm:px-3">
                        <div className="w-full max-w-[5.5rem]">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold tabular-nums text-foreground">{task.progress}%</span>
                          </div>
                          <div
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={task.progress}
                            aria-label={`Progress for ${task.title}: ${task.progress} percent`}
                            className="h-2 w-full overflow-hidden rounded-full bg-muted"
                          >
                            <div
                              className="h-full rounded-full bg-accent transition-[width] duration-300"
                              style={{ width: `${task.progress}%` }}
                              aria-hidden
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right align-top sm:px-3">
                        <span className="tabular-nums text-sm font-semibold text-foreground">{formatDh(task.spentBudget)}</span>
                      </td>
                      <td className="px-2 py-3 align-top sm:px-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={getTaskStatusStyle(task.status)}>
                            {taskStatusLabel(task.status)}
                          </span>
                          {task.isLate ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
                              Late
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top sm:px-3">
                        <span className={getPriorityStyle(task.priority)}>{priorityCellLabel(task.priority)}</span>
                      </td>
                      <td className="px-2 py-3 align-top break-words last:pr-3 sm:px-3">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(task.id)}
                            className="inline-flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-[filter] hover:brightness-110 focus-visible:outline-none"
                            aria-label={`Edit task: ${task.title}`}
                            title="Edit"
                          >
                            <Pencil size={15} aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            disabled={deleteTargetId === task.id}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-destructive/35 bg-background text-destructive shadow-sm transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none"
                            aria-label={`Delete task: ${task.title}`}
                            title="Delete"
                          >
                            <Trash2 size={15} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLoading && (
          <div className="text-center py-12" role="status" aria-live="polite" aria-busy="true">
            <p className="text-muted-foreground text-lg">Loading tasks...</p>
          </div>
        )}

        {hasError && (
          <div className="text-center py-12" role="alert">
            <p className="text-destructive text-lg">Failed to load tasks from backend</p>
          </div>
        )}

        {!isLoading && !hasError && filteredTasks.length === 0 && viewMode === 'table' && (
          <div className="text-center py-12" role="status">
            <p className="text-muted-foreground text-lg">No tasks found</p>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[92vh] w-[calc(100vw-2rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-lg border border-border bg-card p-0 sm:w-full sm:max-w-5xl"
        >
          <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <ListTodo
                className="mt-0.5 shrink-0 text-primary"
                size={22}
                strokeWidth={2}
                aria-hidden
              />
              <div className="min-w-0">
                <DialogTitle className="text-left text-lg font-semibold text-foreground">
                  {mode === 'create' ? 'Add task' : 'Edit task'}
                </DialogTitle>
                <DialogDescription className="mt-1 text-left text-sm text-muted-foreground">
                  {mode === 'create'
                    ? 'Create a task and link it to a project.'
                    : 'Update the task details.'}
                </DialogDescription>
              </div>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none"
                aria-label="Close dialog"
              >
                <X size={18} aria-hidden />
              </button>
            </DialogClose>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <TaskForm
              mode={mode}
              initialValues={formInitialValues}
              projects={projects}
              users={users}
              siteEngineers={siteEngineers}
              tasks={tasks}
              editingTaskId={editingTaskId}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmitTask}
              onCancel={closeModal}
              formId="task-modal-form"
              showActions={false}
            />
          </div>

          <footer className="flex justify-end gap-2 border-t border-border bg-card px-4 py-3 sm:px-6">
            <DialogClose asChild>
              <button
                type="button"
                disabled={isSubmitting}
                className="rounded-md border border-border bg-secondary px-4 py-2 text-secondary-foreground transition-colors hover:bg-muted disabled:opacity-60 focus-visible:outline-none"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              form="task-modal-form"
              disabled={isSubmitting || projects.length === 0}
              className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 focus-visible:outline-none"
            >
              {isSubmitting
                ? 'Saving…'
                : mode === 'create'
                  ? 'Create'
                  : 'Save'}
            </button>
          </footer>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <PageHeader
            title="Tasks"
            description="Manage and track all project tasks and assignments"
          />
          <p className="text-muted-foreground py-8 text-center text-sm" role="status">
            Loading…
          </p>
        </MainLayout>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}
