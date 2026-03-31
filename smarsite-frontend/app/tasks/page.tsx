'use client';

import React from 'react';
import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import TaskForm, { type TaskFormValues } from '@/components/TaskForm';
import {
  Clipboard,
  Users,
  Plus,
  Filter,
  ChevronDown,
  CheckCircle2,
  Briefcase,
  Pencil,
  Trash2,
  ArrowUpDown,
  ListTodo,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import useSWR, { mutate } from 'swr';
import {
  createTask,
  deleteTask,
  fetcher,
  getJobsKey,
  getProjects,
  getResourcesKey,
  getTasksKey,
  getUsersKey,
  updateTask,
} from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type {
  BackendTask,
  BackendUser,
  Job,
  Project,
  Resource,
  TaskPriority,
  TaskStatus,
} from '@/lib/types';

type StatusFilter = 'All' | TaskStatus;
type PriorityFilter = 'All' | TaskPriority;
type ProgressSort = 'none' | 'asc' | 'desc';

interface UiTask {
  id: string;
  title: string;
  project: string;
  assignedToLabel: string;
  dependencyCount: number;
  progress: number;
  status: TaskStatus;
  priority: TaskPriority;
  jobCount: number;
}

interface UiJob {
  id: string;
  taskId: string;
  name: string;
  status: 'Completed' | 'In Progress' | 'Planning';
  assignedTo: string;
}

const defaultFormValues = (projectId: string): TaskFormValues => ({
  title: '',
  description: '',
  projectId,
  duration: 1,
  priority: 'MEDIUM',
  status: 'À faire',
  progress: 0,
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

function assignedToLabel(task: BackendTask, usersById: Map<string, BackendUser>): string {
  const a = task.assignedTo;
  if (a == null) return 'Non assigné';
  if (typeof a === 'object' && a && 'name' in a) return a.name;
  if (typeof a === 'string') return usersById.get(a)?.name ?? 'Non assigné';
  return 'Non assigné';
}

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('All');
  const [progressSort, setProgressSort] = useState<ProgressSort>('none');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<TaskFormValues>(defaultFormValues(''));

  const {
    data: tasks = [],
    isLoading: isTasksLoading,
    error: tasksError,
  } = useSWR<BackendTask[]>(getTasksKey(), fetcher);
  const { data: jobs = [], isLoading: isJobsLoading, error: jobsError } = useSWR<Job[]>(getJobsKey(), fetcher);
  const { data: resources = [], isLoading: isResourcesLoading } = useSWR<Resource[]>(getResourcesKey(), fetcher);
  const { data: projects = [], isLoading: isProjectsLoading } = useSWR<Project[]>('/projects', getProjects);
  const { data: users = [], isLoading: isUsersLoading } = useSWR<BackendUser[]>(getUsersKey(), fetcher);

  const projectsById = useMemo(() => new Map(projects.map((p) => [p._id, p])), [projects]);
  const usersById = useMemo(() => new Map(users.map((u) => [u._id, u])), [users]);
  const resourcesById = useMemo(() => new Map(resources.map((r) => [r._id, r])), [resources]);

  const uiTasks: UiTask[] = useMemo(
    () =>
      tasks.map((task) => {
        const taskJobs = jobs.filter((job) => job.taskId === task._id);
        return {
          id: task._id,
          title: task.title,
          project: projectsById.get(task.projectId)?.name ?? '—',
          assignedToLabel: assignedToLabel(task, usersById),
          dependencyCount: Array.isArray(task.dependsOn) ? task.dependsOn.length : 0,
          progress: Math.min(100, Math.max(0, task.progress ?? 0)),
          status: task.status,
          priority: task.priority,
          jobCount: taskJobs.length,
        };
      }),
    [tasks, jobs, projectsById, usersById],
  );

  const filteredTasks = useMemo(() => {
    let list = uiTasks;
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
  }, [uiTasks, statusFilter, priorityFilter, progressSort]);

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

  const getJobStatusColor = (status: UiJob['status']) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-50 border-green-200';
      case 'In Progress':
        return 'bg-blue-50 border-blue-200';
      case 'Planning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const mapJobStatus = (status: Job['status']): UiJob['status'] => {
    switch (status) {
      case 'Terminé':
        return 'Completed';
      case 'En cours':
        return 'In Progress';
      default:
        return 'Planning';
    }
  };

  const getTaskJobs = (taskId: string): UiJob[] => {
    return jobs
      .filter((job) => job.taskId === taskId)
      .map((job) => ({
        id: job._id,
        taskId: job.taskId,
        name: job.title,
        status: mapJobStatus(job.status),
        assignedTo:
          job.assignedResources
            .map((ar) => resourcesById.get(ar.resourceId)?.name)
            .find(Boolean) ?? 'Unassigned',
      }));
  };

  const isLoading =
    isTasksLoading || isJobsLoading || isProjectsLoading || isResourcesLoading || isUsersLoading;
  const hasError = tasksError || jobsError;

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
      toast({
        title: mode === 'create' ? 'Tâche créée' : 'Tâche mise à jour',
        description: 'Les informations de la tâche ont été enregistrées.',
      });
      closeModal();
    } catch (error: unknown) {
      console.error('Failed to save task:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Erreur inattendue pendant l’enregistrement';
      toast({ title: 'Erreur', description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeleteTargetId(taskId);
    try {
      await deleteTask(taskId);
      await mutate(getTasksKey());
      if (expandedTaskId === taskId) {
        setExpandedTaskId(null);
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast({ title: 'Erreur', description: 'Suppression de la tâche impossible.' });
    } finally {
      setDeleteTargetId(null);
    }
  };

  const statusFilterOptions: StatusFilter[] = ['All', 'À faire', 'En cours', 'Terminé'];
  const priorityFilterOptions: PriorityFilter[] = ['All', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <MainLayout>
      <PageHeader
        title="Tasks"
        description="Manage and track all project tasks and assignments"
      >
        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded-lg bg-accent text-white font-semibold hover:bg-accent/90 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          New Task
        </button>
      </PageHeader>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={18} className="text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">Statut</span>
          {statusFilterOptions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-secondary text-foreground hover:bg-muted'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground ml-0 sm:ml-6">Priorité</span>
          {priorityFilterOptions.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                priorityFilter === p
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-secondary text-foreground hover:bg-muted'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ArrowUpDown size={18} className="text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">Tri par progression</span>
          <select
            value={progressSort}
            onChange={(e) => setProgressSort(e.target.value as ProgressSort)}
            className="rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-foreground"
          >
            <option value="none">Aucun</option>
            <option value="asc">Progression croissante</option>
            <option value="desc">Progression décroissante</option>
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary">
                <th className="w-8"></th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Task</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Project</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Dependencies</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Assigned To</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Progress</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Priority</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Jobs</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => {
                const taskJobs = getTaskJobs(task.id);
                const isExpanded = expandedTaskId === task.id;

                return (
                  <React.Fragment key={task.id}>
                    <tr className="border-b border-border hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleTaskExpansion(task.id)}
                          className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-primary/10 transition-colors"
                          aria-label="Expand task jobs"
                        >
                          <ChevronDown
                            size={16}
                            className={`text-primary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Clipboard size={18} className="text-primary flex-shrink-0" />
                          <span className="font-semibold text-foreground">{task.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Briefcase size={16} className="text-primary/60 flex-shrink-0" />
                          <span className="text-sm font-medium text-foreground">{task.project}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {task.dependencyCount > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Dépend de {task.dependencyCount} tasks
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Aucune dépendance
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-primary flex-shrink-0" />
                          <span className="text-foreground font-medium text-sm">{task.assignedToLabel}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-36">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="text-xs font-semibold text-foreground">{task.progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent transition-all duration-300"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={getTaskStatusStyle(task.status)}>{task.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={getPriorityStyle(task.priority)}>{task.priority}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-white bg-accent px-3 py-1 rounded-full inline-block">
                          {task.jobCount} jobs
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(task.id)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors"
                            aria-label="Edit task"
                            title="Edit task"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            disabled={deleteTargetId === task.id}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-destructive text-white hover:bg-destructive/90 transition-colors disabled:opacity-60"
                            aria-label="Delete task"
                            title="Delete task"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-secondary/40 border-b border-border">
                        <td colSpan={10} className="px-6 py-6">
                          <div className="max-w-4xl">
                            <div className="flex items-center gap-2 mb-4">
                              <Clipboard size={18} className="text-primary" />
                              <h4 className="text-base font-semibold text-foreground">
                                Jobs for {task.title}
                              </h4>
                              <span className="ml-auto text-sm text-muted-foreground">
                                {taskJobs.length} {taskJobs.length === 1 ? 'job' : 'jobs'}
                              </span>
                            </div>

                            {taskJobs.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {taskJobs.map((job) => (
                                  <div
                                    key={job.id}
                                    className={`flex items-start gap-3 p-4 rounded-lg border ${getJobStatusColor(job.status)}`}
                                  >
                                    <CheckCircle2
                                      size={18}
                                      className={`flex-shrink-0 mt-0.5 ${
                                        job.status === 'Completed'
                                          ? 'text-green-600'
                                          : job.status === 'In Progress'
                                            ? 'text-blue-600'
                                            : 'text-yellow-600'
                                      }`}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground">{job.name}</p>
                                      <p className="text-xs font-mono text-muted-foreground mt-1">ID: {job.id}</p>
                                      <div className="flex flex-col gap-2 mt-2 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                          <Users size={12} className="flex-shrink-0" />
                                          <span>{job.assignedTo}</span>
                                        </div>
                                        <div>
                                          <span
                                            className={`px-2 py-0.5 rounded-full font-medium inline-block ${
                                              job.status === 'Completed'
                                                ? 'bg-green-100 text-green-800'
                                                : job.status === 'In Progress'
                                                  ? 'bg-blue-100 text-blue-800'
                                                  : 'bg-yellow-100 text-yellow-800'
                                            }`}
                                          >
                                            {job.status}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 text-muted-foreground">
                                <p className="text-sm">No jobs assigned to this task yet</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">Loading tasks...</p>
          </div>
        )}

        {hasError && (
          <div className="text-center py-12">
            <p className="text-red-600 text-lg">Failed to load tasks from backend</p>
          </div>
        )}

        {!isLoading && !hasError && filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No tasks found</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-5xl max-h-[92vh] bg-card border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
              <div className="flex items-start gap-3 min-w-0">
                <ListTodo className="text-primary mt-0.5" size={22} strokeWidth={2} aria-hidden />
                <div>
                  <h2 id="task-modal-title" className="text-lg font-semibold text-foreground">
                    {mode === 'create' ? 'Ajouter une tâche' : 'Modifier la tâche'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mode === 'create'
                      ? 'Créez une tâche et rattachez-la à un projet.'
                      : 'Mettez à jour les informations de la tâche.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Fermer"
                title="Fermer"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <TaskForm
                mode={mode}
                initialValues={formInitialValues}
                projects={projects}
                users={users}
                tasks={tasks}
                editingTaskId={editingTaskId}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmitTask}
                onCancel={closeModal}
                formId="task-modal-form"
                showActions={false}
              />
            </div>

            <footer className="flex justify-end gap-2 border-t border-border px-4 py-3 sm:px-6 bg-card">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-md border border-border bg-secondary text-foreground hover:bg-muted transition-colors disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="submit"
                form="task-modal-form"
                disabled={isSubmitting || projects.length === 0}
                className="px-4 py-2 rounded-md bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {isSubmitting
                  ? 'Enregistrement…'
                  : mode === 'create'
                    ? 'Créer'
                    : 'Sauvegarder'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
