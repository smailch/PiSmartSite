'use client';

import { Fragment, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import TaskForm, { type TaskFormValues } from '@/components/TaskForm';
import TaskKanbanBoard from '@/components/TaskKanbanBoard';
import DeleteTaskDialog from '@/components/DeleteTaskDialog';
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
  ClipboardList,
  CalendarClock,
  ExternalLink,
  Sparkles,
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
  getJobsKey,
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
  Job,
  Project,
  TaskPriority,
  TaskStatus,
} from '@/lib/types';
import { isTaskLate } from '@/lib/taskLate';
import { useRadioGroupKeyboard } from '@/hooks/useRadioGroupKeyboard';

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
  /** Jobs liés (GET /jobs, champ taskId). */
  jobCount: number;
  progress: number;
  spentBudget: number;
  status: TaskStatus;
  priority: TaskPriority;
  /** Indicateur calculé (date de fin dépassée, statut ≠ Done). */
  isLate: boolean;
}

function jobTaskIdKey(job: Job): string {
  const t = job.taskId;
  if (typeof t === 'string') return t;
  return String(t ?? '');
}

function jobStatusPanelClass(status: Job['status']): string {
  switch (status) {
    case 'Terminé':
      return 'bg-emerald-500/15 text-emerald-800 ring-emerald-500/20 dark:text-emerald-100 dark:ring-emerald-400/25';
    case 'En cours':
      return 'bg-sky-500/15 text-sky-900 ring-sky-500/20 dark:text-sky-100 dark:ring-sky-400/25';
    case 'Planifié':
      return 'bg-amber-500/15 text-amber-900 ring-amber-500/20 dark:text-amber-100 dark:ring-amber-400/25';
    default:
      return 'bg-muted text-muted-foreground ring-border';
  }
}

function formatJobDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
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

const TASK_STATUS_FILTER_VALUES: StatusFilter[] = TASK_STATUS_FILTERS.map((row) => row.value);

const TASK_VIEW_MODES = ['board', 'table'] as const;

const PRIORITY_FILTER_VALUES: PriorityFilter[] = ['All', 'HIGH', 'MEDIUM', 'LOW'];

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

const RADIO_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

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
  const [taskPendingDelete, setTaskPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [formInitialValues, setFormInitialValues] = useState<TaskFormValues>(defaultFormValues(''));
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
  const [savingBoardTaskId, setSavingBoardTaskId] = useState<string | null>(null);
  /** Filtre board par projet (ignoré si URL ?project= définit un périmètre). */
  const [boardProjectFilterId, setBoardProjectFilterId] = useState<'all' | string>('all');
  const [taskJobsPanelId, setTaskJobsPanelId] = useState<string | null>(null);

  const {
    getTabIndex: getTaskStatusFilterTabIndex,
    handleKeyDown: onTaskStatusFilterKeyDown,
    setItemRef: setTaskStatusFilterRef,
  } = useRadioGroupKeyboard(TASK_STATUS_FILTER_VALUES, statusFilter, setStatusFilter);

  const {
    getTabIndex: getPriorityFilterTabIndex,
    handleKeyDown: onPriorityFilterKeyDown,
    setItemRef: setPriorityFilterRef,
  } = useRadioGroupKeyboard(PRIORITY_FILTER_VALUES, priorityFilter, setPriorityFilter);

  const {
    getTabIndex: getViewModeTabIndex,
    handleKeyDown: onViewModeKeyDown,
    setItemRef: setViewModeRef,
  } = useRadioGroupKeyboard(TASK_VIEW_MODES, viewMode, setViewMode);

  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    error: tasksError,
  } = useSWR<BackendTask[]>(getTasksKey(), fetcher);
  const { data: jobs = [], isLoading: isJobsLoading, error: jobsError } = useSWR<Job[]>(
    getJobsKey(),
    fetcher,
  );
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

  const jobsByTaskId = useMemo(() => {
    const m = new Map<string, Job[]>();
    for (const job of jobs) {
      const tid = jobTaskIdKey(job);
      if (!tid) continue;
      const list = m.get(tid) ?? [];
      list.push(job);
      m.set(tid, list);
    }
    return m;
  }, [jobs]);

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
        jobCount: jobsByTaskId.get(task._id)?.length ?? 0,
        progress: Math.min(100, Math.max(0, task.progress ?? 0)),
        spentBudget: task.spentBudget ?? 0,
        status: task.status,
        priority: task.priority,
        isLate: isTaskLate(task, lateCheckNow),
      })),
    [tasks, projectsById, usersById, humansById, lateCheckNow, jobsByTaskId],
  );

  const panelTask = taskJobsPanelId
    ? uiTasks.find((t) => t.id === taskJobsPanelId) ?? null
    : null;
  const panelJobs = useMemo(() => {
    if (!taskJobsPanelId) return [];
    const list = [...(jobsByTaskId.get(taskJobsPanelId) ?? [])];
    list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    return list;
  }, [taskJobsPanelId, jobsByTaskId]);

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

  const handleConfirmDeleteTask = async () => {
    const pending = taskPendingDelete;
    if (!pending) return;
    setIsDeleteSubmitting(true);
    try {
      await deleteTask(pending.id);
      await mutate(getTasksKey());
      await mutate('/projects');
      setTaskPendingDelete(null);
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast({ title: 'Error', description: 'Could not delete the task.' });
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Tasks"
        description="Manage and track all project tasks and assignments"
      >
        <button
          type="button"
          onClick={openCreateModal}
          className={`px-4 py-2 rounded-lg bg-accent text-accent-foreground font-semibold hover:bg-accent/90 transition-colors flex items-center gap-2 shadow-sm ${RADIO_FOCUS}`}
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
            role="radiogroup"
            aria-label="Choose task layout"
            aria-orientation="horizontal"
          >
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'board'}
              tabIndex={getViewModeTabIndex('board')}
              ref={setViewModeRef(0)}
              onKeyDown={(e) => onViewModeKeyDown(e, 0)}
              onClick={() => setViewMode('board')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${RADIO_FOCUS} ${
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
              role="radio"
              aria-checked={viewMode === 'table'}
              tabIndex={getViewModeTabIndex('table')}
              ref={setViewModeRef(1)}
              onKeyDown={(e) => onViewModeKeyDown(e, 1)}
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${RADIO_FOCUS} ${
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
            <div
              role="radiogroup"
              aria-labelledby="tasks-status-heading"
              aria-orientation="horizontal"
              className="flex flex-wrap gap-2"
            >
              {TASK_STATUS_FILTERS.map((row, index) => (
                <button
                  key={row.value}
                  type="button"
                  role="radio"
                  aria-checked={statusFilter === row.value}
                  tabIndex={getTaskStatusFilterTabIndex(row.value)}
                  ref={setTaskStatusFilterRef(index)}
                  onKeyDown={(e) => onTaskStatusFilterKeyDown(e, index)}
                  onClick={() => setStatusFilter(row.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${RADIO_FOCUS} ${
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
          <div
            role="radiogroup"
            aria-labelledby="tasks-priority-heading"
            aria-orientation="horizontal"
            className="flex flex-wrap gap-2"
          >
            {PRIORITY_FILTER_VALUES.map((p, index) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={priorityFilter === p}
                tabIndex={getPriorityFilterTabIndex(p)}
                ref={setPriorityFilterRef(index)}
                onKeyDown={(e) => onPriorityFilterKeyDown(e, index)}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${RADIO_FOCUS} ${
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
            className={`rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-foreground ${RADIO_FOCUS}`}
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
              className={`rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-foreground min-w-[12rem] ${RADIO_FOCUS}`}
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
            onShowJobs={(id) => setTaskJobsPanelId(id)}
            savingTaskId={savingBoardTaskId}
            getPriorityStyle={getPriorityStyle}
            priorityCellLabel={priorityCellLabel}
            showLateBadge
          />
        </div>
      )}

      <div
        className={`w-full rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] ${
          viewMode === 'board' ? 'hidden' : ''
        }`}
      >
        <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain [scrollbar-gutter:stable]">
          <table className="w-full min-w-0 table-fixed border-separate border-spacing-0 text-sm leading-relaxed">
            <colgroup>
              <col style={{ width: '17%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <caption className="sr-only">
              Task list. Each task has a data row then an actions row with Edit and Delete. Columns are
              task title, project, dependencies (Deps), jobs count, assignee (Assigned), progress, spent
              budget (Spent), status, and priority. Use Tab to move between filters, controls, links, and
              action buttons.
            </caption>
            <thead>
              <tr className="bg-muted/55 dark:bg-muted/40">
                <th
                  scope="col"
                  title="Task"
                  className="max-w-0 overflow-hidden text-ellipsis whitespace-nowrap border-b border-border px-2.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:pl-4 last:pr-4 sm:px-3 sm:first:pl-6 sm:last:pr-6"
                >
                  Task
                </th>
                <th
                  scope="col"
                  title="Project"
                  className="max-w-0 overflow-hidden text-ellipsis whitespace-nowrap border-b border-border px-2.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-3"
                >
                  Project
                </th>
                <th
                  scope="col"
                  title="Dependencies"
                  className="max-w-0 overflow-hidden text-ellipsis whitespace-nowrap border-b border-border px-2.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-3"
                >
                  Deps
                </th>
                <th
                  scope="col"
                  title="Jobs"
                  className="max-w-0 overflow-hidden text-ellipsis whitespace-nowrap border-b border-border px-2.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-3"
                >
                  Jobs
                </th>
                <th
                  scope="col"
                  title="Assigned to"
                  className="max-w-0 overflow-hidden text-ellipsis whitespace-nowrap border-b border-border px-2.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-3"
                >
                  Assigned
                </th>
                <th
                  scope="col"
                  title="Progress"
                  className="max-w-0 overflow-hidden text-ellipsis whitespace-nowrap border-b border-border px-2.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-3"
                >
                  Progress
                </th>
                <th
                  scope="col"
                  title="Spent budget"
                  className="max-w-0 overflow-hidden text-ellipsis whitespace-nowrap border-b border-border px-2.5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground tabular-nums sm:px-3"
                >
                  Spent
                </th>
                <th
                  scope="col"
                  title="Status"
                  className="max-w-0 overflow-hidden text-ellipsis whitespace-nowrap border-b border-border px-2.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-3"
                >
                  Status
                </th>
                <th
                  scope="col"
                  title="Priority"
                  className="max-w-0 overflow-hidden text-ellipsis whitespace-nowrap border-b border-border px-2.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground last:pr-4 sm:px-3 sm:last:pr-6"
                >
                  Priority
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task, rowIndex) => (
                <Fragment key={task.id}>
                    <tr
                      className={`border-b-0 transition-colors hover:bg-primary/[0.06] dark:hover:bg-primary/[0.08] ${
                        rowIndex % 2 === 0 ? 'bg-card' : 'bg-muted/25'
                      }`}
                    >
                      <td className="min-w-0 overflow-hidden border-b border-border/35 px-2.5 py-4 align-top first:pl-4 sm:px-3 sm:first:pl-6 [&>*]:min-w-0">
                        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
                          <Clipboard size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                          <button
                            type="button"
                            onClick={() => setTaskJobsPanelId(task.id)}
                            className="min-w-0 overflow-hidden text-left break-words text-[15px] font-semibold leading-snug text-foreground rounded-md ring-offset-background transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {task.title}
                          </button>
                        </div>
                      </td>
                      <td className="min-w-0 overflow-hidden border-b border-border/35 px-2.5 py-4 align-top sm:px-3 [&>*]:min-w-0">
                        <div className="flex min-w-0 items-start gap-2 sm:gap-2.5">
                          <Briefcase size={16} className="mt-0.5 shrink-0 text-primary/70" aria-hidden />
                          <span className="break-words text-[15px] font-medium leading-snug text-foreground">{task.project}</span>
                        </div>
                      </td>
                      <td className="min-w-0 overflow-hidden border-b border-border/35 px-2.5 py-4 align-top sm:px-3 [&>*]:min-w-0">
                        {task.dependencyCount > 0 ? (
                          <span
                            className="inline-flex max-w-full items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-medium leading-tight text-blue-900 dark:bg-blue-950/55 dark:text-blue-100"
                            title={`Depends on ${task.dependencyCount} task(s)`}
                          >
                            {task.dependencyCount} deps
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center rounded-md bg-muted/80 px-2 py-1 text-xs font-medium text-muted-foreground"
                            title="No dependencies"
                          >
                            None
                          </span>
                        )}
                      </td>
                      <td className="min-w-0 overflow-hidden border-b border-border/35 px-2.5 py-4 align-top whitespace-nowrap sm:px-3">
                        <button
                          type="button"
                          onClick={() => setTaskJobsPanelId(task.id)}
                          disabled={isJobsLoading}
                          className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-xs font-bold tabular-nums text-primary shadow-sm ring-1 ring-primary/10 transition-colors hover:bg-primary/15 hover:border-primary/35 disabled:pointer-events-none disabled:opacity-50 dark:bg-primary/10 dark:ring-primary/15"
                          title="View jobs for this task"
                        >
                          <ClipboardList className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                          {isJobsLoading ? '…' : task.jobCount}
                        </button>
                      </td>
                      <td className="min-w-0 overflow-hidden border-b border-border/35 px-2.5 py-4 align-top sm:px-3 [&>*]:min-w-0">
                        <div className="flex min-w-0 items-start gap-2 sm:gap-2.5">
                          <Users size={16} className="mt-0.5 shrink-0 text-primary/80" aria-hidden />
                          <span className="break-words text-[15px] font-medium leading-snug text-foreground">{task.assignedToLabel}</span>
                        </div>
                      </td>
                      <td className="min-w-0 overflow-hidden border-b border-border/35 px-2.5 py-4 align-top sm:px-3 [&>*]:min-w-0">
                        <div className="w-full min-w-0">
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold tabular-nums text-foreground">{task.progress}%</span>
                          </div>
                          <div
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={task.progress}
                            aria-label={`Progress for ${task.title}: ${task.progress} percent`}
                            className="h-2.5 w-full min-w-0 overflow-hidden rounded-full bg-muted"
                          >
                            <div
                              className="h-full rounded-full bg-accent transition-[width] duration-300"
                              style={{ width: `${task.progress}%` }}
                              aria-hidden
                            />
                          </div>
                        </div>
                      </td>
                      <td className="min-w-0 overflow-hidden border-b border-border/35 px-2.5 py-4 text-right align-top tabular-nums sm:px-3">
                        <span className="text-[15px] font-semibold text-foreground">{formatDh(task.spentBudget)}</span>
                      </td>
                      <td className="min-w-0 overflow-hidden border-b border-border/35 px-2.5 py-4 align-top sm:px-3 [&>*]:min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
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
                      <td className="min-w-0 overflow-hidden border-b border-border/35 px-2.5 py-4 align-top last:pr-4 sm:px-3 sm:last:pr-6">
                        <span className={`max-w-full ${getPriorityStyle(task.priority)}`}>{priorityCellLabel(task.priority)}</span>
                      </td>
                    </tr>
                    <tr
                      className={`border-b border-border/50 transition-colors hover:bg-primary/[0.06] dark:hover:bg-primary/[0.08] ${
                        rowIndex % 2 === 0 ? 'bg-card' : 'bg-muted/25'
                      }`}
                    >
                      <td
                        colSpan={9}
                        className="border-b border-border/35 border-t border-border/40 px-2.5 py-2.5 first:pl-4 last:pr-4 sm:px-3 sm:first:pl-6 sm:last:pr-6"
                      >
                        <div
                          role="group"
                          aria-label={`Actions for ${task.title}`}
                          className="flex flex-wrap items-center justify-end gap-2"
                        >
                          <button
                            type="button"
                            onClick={() => openEditModal(task.id)}
                            className={`inline-flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-[filter] hover:brightness-110 ${RADIO_FOCUS}`}
                            aria-label={`Edit task: ${task.title}`}
                            title="Edit"
                          >
                            <Pencil size={15} aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaskPendingDelete({ id: task.id, title: task.title })}
                            disabled={isDeleteSubmitting && taskPendingDelete?.id === task.id}
                            className={`inline-flex size-9 items-center justify-center rounded-lg border border-destructive/35 bg-background text-destructive shadow-sm transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50 ${RADIO_FOCUS}`}
                            aria-label={`Delete task: ${task.title}`}
                            title="Delete"
                          >
                            <Trash2 size={15} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                </Fragment>
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

      <DeleteTaskDialog
        open={taskPendingDelete !== null}
        taskTitle={taskPendingDelete?.title ?? ''}
        onConfirm={() => {
          void handleConfirmDeleteTask();
        }}
        onCancel={() => setTaskPendingDelete(null)}
        isDeleting={isDeleteSubmitting}
      />

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

      <Dialog
        open={taskJobsPanelId !== null}
        onOpenChange={(open) => {
          if (!open) setTaskJobsPanelId(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-0 shadow-xl ring-1 ring-black/[0.04] dark:ring-white/[0.06] sm:max-w-xl"
        >
          <header className="relative overflow-hidden border-b border-border/80 bg-gradient-to-br from-primary/[0.07] via-card to-accent/[0.05] px-5 py-5 dark:from-primary/[0.12] dark:via-card dark:to-accent/[0.06]">
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl dark:bg-primary/20"
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20 dark:bg-primary/20 dark:ring-primary/30">
                  <ClipboardList className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <DialogTitle className="text-left text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    {panelTask ? panelTask.title : 'Task jobs'}
                  </DialogTitle>
                  <DialogDescription className="mt-1.5 text-left text-sm text-muted-foreground">
                    {panelTask
                      ? `${panelTask.project} · ${panelJobs.length} job${panelJobs.length === 1 ? '' : 's'}`
                      : taskJobsPanelId
                        ? 'Loading task…'
                        : ''}
                  </DialogDescription>
                </div>
              </div>
              <DialogClose asChild>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground focus-visible:outline-none"
                  aria-label="Close"
                >
                  <X size={18} aria-hidden />
                </button>
              </DialogClose>
            </div>
          </header>

          <div className="max-h-[min(60vh,520px)] overflow-y-auto px-4 py-4 sm:px-5 [scrollbar-width:thin]">
            {jobsError ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Could not load jobs. Check that the API is reachable.
              </p>
            ) : isJobsLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground" role="status">
                Loading jobs…
              </p>
            ) : panelJobs.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/80 bg-muted/25 px-6 py-12 text-center dark:bg-muted/10">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-background shadow-md ring-1 ring-border/60 dark:bg-card">
                  <Sparkles className="h-6 w-6 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm font-semibold text-foreground">No jobs yet</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                  Create a job and link it to this task from the Jobs section.
                </p>
                <Link
                  href="/jobs/create"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  Create job
                  <ExternalLink className="h-3.5 w-3.5 opacity-90" aria-hidden />
                </Link>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {panelJobs.map((job) => {
                  const pct =
                    typeof job.progressPercentage === 'number'
                      ? Math.min(100, Math.max(0, job.progressPercentage))
                      : null;
                  const resourceLabels = (job.assignedResources ?? [])
                    .map((r) => r.name?.trim())
                    .filter(Boolean) as string[];
                  return (
                    <li
                      key={job._id}
                      className="group relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm transition-shadow hover:shadow-md dark:border-border/50 dark:from-card dark:to-muted/10"
                    >
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary via-accent/80 to-primary/60 opacity-90" />
                      <div className="relative space-y-3 pl-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground">
                            {job.title}
                          </h3>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${jobStatusPanelClass(job.status)}`}
                          >
                            {job.status}
                          </span>
                        </div>
                        {job.description ? (
                          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {job.description}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1 font-medium text-foreground/90">
                            <CalendarClock className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
                            {formatJobDateTime(job.startTime)}
                          </span>
                          <span className="text-muted-foreground/70" aria-hidden>
                            →
                          </span>
                          <span className="font-medium text-foreground/90 tabular-nums">
                            {formatJobDateTime(job.endTime)}
                          </span>
                        </div>
                        {pct !== null ? (
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              <span>Job progress</span>
                              <span className="tabular-nums">{pct}%</span>
                            </div>
                            <div
                              className="h-1.5 overflow-hidden rounded-full bg-muted"
                              role="progressbar"
                              aria-valuenow={pct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            >
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        ) : null}
                        {resourceLabels.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {resourceLabels.slice(0, 6).map((name, i) => (
                              <span
                                key={`${job._id}-r-${i}`}
                                className="rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground ring-1 ring-border/70 dark:bg-muted/50"
                              >
                                {name}
                              </span>
                            ))}
                            {resourceLabels.length > 6 ? (
                              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                +{resourceLabels.length - 6}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="pt-1">
                          <Link
                            href={`/jobs/${job._id}/edit`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
                          >
                            Open job
                            <ExternalLink className="h-3 w-3 opacity-80" aria-hidden />
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
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
