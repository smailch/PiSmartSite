"use client";

import * as React from "react";
import type {
  BackendTask,
  BackendUser,
  Project,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";

export interface TaskFormValues {
  title: string;
  description: string;
  projectId: string;
  duration: number;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  assignedTo: string;
  startDate: string;
  endDate: string;
  dependsOn: string[];
}

interface TaskFormProps {
  mode: "create" | "edit";
  initialValues: TaskFormValues;
  projects: Project[];
  users: BackendUser[];
  tasks: BackendTask[];
  editingTaskId?: string | null;
  isSubmitting?: boolean;
  onSubmit: (values: TaskFormValues) => Promise<void> | void;
  onCancel?: () => void;
  /**
   * Optional form element id so external footer buttons can submit this form.
   */
  formId?: string;
  /**
   * Render internal footer actions (Cancel/Submit). Useful when TaskForm is used
   * standalone. Set to false when parent modal provides its own footer actions.
   */
  showActions?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
}

type FormErrors = Partial<Record<keyof TaskFormValues | "general", string>>;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function toDateInputValue(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function hasDependencyCycle(
  taskId: string,
  selectedDependsOn: string[],
  allTasks: BackendTask[],
): boolean {
  const graph = new Map<string, string[]>();

  for (const task of allTasks) {
    graph.set(task._id, Array.isArray(task.dependsOn) ? [...task.dependsOn] : []);
  }

  graph.set(taskId, [...selectedDependsOn]);

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const dfs = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;

    visiting.add(id);

    for (const depId of graph.get(id) ?? []) {
      if (depId === id) return true;
      if (!graph.has(depId)) continue;
      if (dfs(depId)) return true;
    }

    visiting.delete(id);
    visited.add(id);
    return false;
  };

  return dfs(taskId);
}

export default function TaskForm({
  mode,
  initialValues,
  projects,
  users,
  tasks,
  editingTaskId,
  isSubmitting,
  onSubmit,
  onCancel,
  formId,
  showActions = true,
  submitLabel,
  cancelLabel,
}: TaskFormProps) {
  const [values, setValues] = React.useState<TaskFormValues>(initialValues);
  const [errors, setErrors] = React.useState<FormErrors>({});

  React.useEffect(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  const dependencyCandidates = React.useMemo(() => {
    return tasks
      .filter((task) => task._id !== editingTaskId)
      .filter((task) => !values.projectId || task.projectId === values.projectId)
      .sort((a, b) => a.title.localeCompare(b.title, "fr"));
  }, [tasks, editingTaskId, values.projectId]);

  React.useEffect(() => {
    // Nettoie les dépendances choisies si elles ne sont plus valides
    // (ex: changement de projet).
    const candidateIds = new Set(dependencyCandidates.map((t) => t._id));
    setValues((prev) => ({
      ...prev,
      dependsOn: prev.dependsOn.filter((id) => candidateIds.has(id)),
    }));
  }, [dependencyCandidates]);

  const setField = <K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const autoCalculateEndDate = () => {
    if (!values.startDate) {
      setErrors((prev) => ({
        ...prev,
        endDate: "Saisissez d'abord une date de début pour auto-calculer la date de fin.",
      }));
      return;
    }

    const start = new Date(values.startDate);
    if (Number.isNaN(start.getTime())) {
      setErrors((prev) => ({ ...prev, endDate: "Date de début invalide." }));
      return;
    }

    const durationDays = Math.max(1, Math.round(values.duration || 1));
    const end = addDays(start, durationDays);
    setField("endDate", toDateInputValue(end.toISOString()));
    setErrors((prev) => ({ ...prev, endDate: undefined }));
  };

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};

    if (!values.title.trim()) {
      nextErrors.title = "Le titre est obligatoire.";
    }
    if (!values.projectId) {
      nextErrors.projectId = "Le projet est obligatoire.";
    }

    const duration = Number(values.duration);
    if (!Number.isFinite(duration) || duration < 1) {
      nextErrors.duration = "La durée doit être supérieure ou égale à 1 jour.";
    }

    if (values.startDate && values.endDate) {
      const start = new Date(values.startDate);
      const end = new Date(values.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        nextErrors.startDate = "Date invalide.";
      } else if (start.getTime() >= end.getTime()) {
        nextErrors.endDate = "La date de fin doit être strictement après la date de début.";
      }
    }

    if (editingTaskId && values.dependsOn.includes(editingTaskId)) {
      nextErrors.dependsOn = "Une tâche ne peut pas dépendre d'elle-même.";
    }

    if (
      editingTaskId &&
      values.dependsOn.length > 0 &&
      hasDependencyCycle(editingTaskId, values.dependsOn, tasks)
    ) {
      nextErrors.dependsOn = "Cycle détecté dans les dépendances (A→B→...→A).";
    }

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
      duration: Math.max(1, Math.round(values.duration || 1)),
      progress: Math.min(100, Math.max(0, Math.round(values.progress || 0))),
      dependsOn: Array.from(new Set(values.dependsOn)),
    });
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-1">
        <div className="md:col-span-2 flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground" htmlFor="task-title">
            Titre
          </label>
          <input
            id="task-title"
            type="text"
            value={values.title}
            onChange={(e) => setField("title", e.target.value)}
            className="h-10 rounded-md border border-border bg-input px-3 text-sm"
            placeholder="Ex: Peinture murs"
            required
          />
          {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
        </div>

        <div className="md:col-span-2 flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground" htmlFor="task-description">
            Description
          </label>
          <textarea
            id="task-description"
            value={values.description}
            onChange={(e) => setField("description", e.target.value)}
            className="min-h-[90px] rounded-md border border-border bg-input px-3 py-2 text-sm"
            placeholder="Description de la tâche"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground" htmlFor="task-projectId">
            Projet
          </label>
          <select
            id="task-projectId"
            value={values.projectId}
            onChange={(e) => setField("projectId", e.target.value)}
            className="h-10 rounded-md border border-border bg-input px-3 text-sm"
            required
          >
            {projects.length === 0 ? (
              <option value="">Aucun projet</option>
            ) : (
              projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))
            )}
          </select>
          {errors.projectId && <p className="text-xs text-red-600">{errors.projectId}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground" htmlFor="task-duration">
            Durée (jours)
          </label>
          <input
            id="task-duration"
            type="number"
            min={1}
            step={1}
            value={values.duration}
            onChange={(e) => setField("duration", Number(e.target.value) || 1)}
            className="h-10 rounded-md border border-border bg-input px-3 text-sm"
            required
          />
          {errors.duration && <p className="text-xs text-red-600">{errors.duration}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground" htmlFor="task-startDate">
            Date de début
          </label>
          <input
            id="task-startDate"
            type="date"
            value={values.startDate}
            onChange={(e) => setField("startDate", e.target.value)}
            className="h-10 rounded-md border border-border bg-input px-3 text-sm"
          />
          {errors.startDate && <p className="text-xs text-red-600">{errors.startDate}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground" htmlFor="task-endDate">
            Date de fin
          </label>
          <div className="flex gap-2">
            <input
              id="task-endDate"
              type="date"
              value={values.endDate}
              onChange={(e) => setField("endDate", e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm"
            />
            <button
              type="button"
              onClick={autoCalculateEndDate}
              className="h-10 px-3 rounded-md border border-border bg-secondary text-xs font-medium hover:bg-muted"
              title="Auto-calculer endDate = startDate + duration"
            >
              Auto
            </button>
          </div>
          {errors.endDate && <p className="text-xs text-red-600">{errors.endDate}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground" htmlFor="task-priority">
            Priorité
          </label>
          <select
            id="task-priority"
            value={values.priority}
            onChange={(e) => setField("priority", e.target.value as TaskPriority)}
            className="h-10 rounded-md border border-border bg-input px-3 text-sm"
            required
          >
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground" htmlFor="task-status">
            Statut
          </label>
          <select
            id="task-status"
            value={values.status}
            onChange={(e) => setField("status", e.target.value as TaskStatus)}
            className="h-10 rounded-md border border-border bg-input px-3 text-sm"
            required
          >
            <option value="À faire">À faire</option>
            <option value="En cours">En cours</option>
            <option value="Terminé">Terminé</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-foreground" htmlFor="task-progress">
              Progression
            </label>
            <span className="text-xs text-muted-foreground">{values.progress}%</span>
          </div>
          <input
            id="task-progress"
            type="range"
            min={0}
            max={100}
            value={values.progress}
            onChange={(e) => setField("progress", Number(e.target.value) || 0)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground" htmlFor="task-assignedTo">
            Assigné à
          </label>
          <select
            id="task-assignedTo"
            value={values.assignedTo}
            onChange={(e) => setField("assignedTo", e.target.value)}
            className="h-10 rounded-md border border-border bg-input px-3 text-sm"
          >
            <option value="">Non assigné</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground" htmlFor="task-dependsOn">
            Dépendances (multi-sélection)
          </label>
          <select
            id="task-dependsOn"
            multiple
            value={values.dependsOn}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
              setField("dependsOn", selected);
            }}
            className="min-h-[120px] rounded-md border border-border bg-input px-3 py-2 text-sm"
          >
            {dependencyCandidates.length === 0 ? (
              <option disabled value="">
                Aucune tâche disponible
              </option>
            ) : (
              dependencyCandidates.map((task) => (
                <option key={task._id} value={task._id}>
                  {task.title} ({task.duration}j)
                </option>
              ))
            )}
          </select>
          <p className="text-xs text-muted-foreground">
            Maintenez Ctrl (Windows) ou Cmd (Mac) pour sélectionner plusieurs tâches.
          </p>
          {errors.dependsOn && <p className="text-xs text-red-600">{errors.dependsOn}</p>}
        </div>
      </div>

      {errors.general && <p className="text-xs text-red-600">{errors.general}</p>}

      {showActions && (
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => onCancel?.()}
            className="px-4 py-2 rounded-md border border-border bg-secondary text-foreground hover:bg-muted"
            disabled={isSubmitting}
          >
            {cancelLabel ?? "Annuler"}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || projects.length === 0}
            className="px-4 py-2 rounded-md bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            {isSubmitting
              ? "Enregistrement…"
              : submitLabel ?? (mode === "create" ? "Créer la tâche" : "Mettre à jour")}
          </button>
        </div>
      )}
    </form>
  );
}
