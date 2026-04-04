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
  spentBudget: number;
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

function formatBudget(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

const MAX_TITLE_LEN = 200;
const MAX_DESCRIPTION_LEN = 8000;
const MAX_DURATION_DAYS = 3650;

function controlClass(hasError: boolean, extra?: string): string {
  const base =
    "w-full min-w-0 rounded-xl border bg-input px-3.5 text-sm shadow-sm transition-[border-color,box-shadow,background-color] outline-none focus-visible:ring-2 focus-visible:ring-primary/25";
  return [
    base,
    hasError
      ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25"
      : "border-border/90 focus-visible:border-primary/35",
    extra ?? "",
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

const fieldLabelClass =
  "text-sm font-semibold tracking-tight text-foreground/90";

const sectionEyebrowClass =
  "col-span-full text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground border-b border-border/60 pb-2 pt-1 first:pt-0";

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
      .sort((a, b) => a.title.localeCompare(b.title, "en"));
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
        endDate: "Enter a start date first to auto-calculate the end date.",
      }));
      return;
    }

    const start = new Date(values.startDate);
    if (Number.isNaN(start.getTime())) {
      setErrors((prev) => ({ ...prev, endDate: "Invalid start date." }));
      return;
    }

    const durationDays = Math.max(1, Math.round(values.duration || 1));
    const end = addDays(start, durationDays);
    setField("endDate", toDateInputValue(end.toISOString()));
    setErrors((prev) => ({ ...prev, endDate: undefined }));
  };

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    const titleT = values.title.trim();

    if (!titleT) {
      nextErrors.title = "Title is required.";
    } else if (titleT.length < 2) {
      nextErrors.title = "Title must be at least 2 characters.";
    } else if (titleT.length > MAX_TITLE_LEN) {
      nextErrors.title = `Maximum ${MAX_TITLE_LEN} characters.`;
    }

    if (values.description.length > MAX_DESCRIPTION_LEN) {
      nextErrors.description = `Maximum ${MAX_DESCRIPTION_LEN} characters.`;
    }

    if (!values.projectId) {
      nextErrors.projectId = "Project is required.";
    }

    const duration = Number(values.duration);
    if (!Number.isFinite(duration) || duration < 1) {
      nextErrors.duration = "Duration must be an integer ≥ 1 day.";
    } else if (!Number.isInteger(duration)) {
      nextErrors.duration = "Duration must be a whole number of days.";
    } else if (duration > MAX_DURATION_DAYS) {
      nextErrors.duration = `Duration cannot exceed ${MAX_DURATION_DAYS} days.`;
    }

    const progress = Number(values.progress);
    if (!Number.isFinite(progress)) {
      nextErrors.progress = "Invalid progress.";
    } else if (progress < 0 || progress > 100) {
      nextErrors.progress = "Progress must be between 0 and 100.";
    }

    if (values.endDate.trim() && !values.startDate.trim()) {
      nextErrors.startDate = "Enter a start date when an end date is set.";
    }

    if (values.startDate && values.endDate) {
      const start = new Date(values.startDate);
      const end = new Date(values.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        nextErrors.startDate = "Invalid date.";
      } else if (start.getTime() >= end.getTime()) {
        nextErrors.endDate = "End date must be strictly after start date.";
      }
    }

    const spentBudget = Number(values.spentBudget);
    if (!Number.isFinite(spentBudget)) {
      nextErrors.spentBudget = "Invalid spent budget.";
    } else if (spentBudget < 0) {
      nextErrors.spentBudget = "Spent budget cannot be negative.";
    }

    if (editingTaskId && values.dependsOn.includes(editingTaskId)) {
      nextErrors.dependsOn = "A task cannot depend on itself.";
    }

    if (
      editingTaskId &&
      values.dependsOn.length > 0 &&
      hasDependencyCycle(editingTaskId, values.dependsOn, tasks)
    ) {
      nextErrors.dependsOn = "Dependency cycle detected (A→B→...→A).";
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
      duration: Math.max(1, Math.round(Number(values.duration) || 1)),
      progress: Math.min(100, Math.max(0, Math.round(Number(values.progress) || 0))),
      spentBudget: Math.max(0, Number(values.spentBudget) || 0),
      dependsOn: Array.from(new Set(values.dependsOn)),
    });
  };

  return (
    <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 pr-0.5 md:grid-cols-2">
        <p className={sectionEyebrowClass}>Task content</p>
        <div className="md:col-span-2 flex flex-col gap-1.5">
          <label className={fieldLabelClass} htmlFor="task-title">
            Title
          </label>
          <input
            id="task-title"
            type="text"
            value={values.title}
            onChange={(e) => {
              setField("title", e.target.value);
              setErrors((p) => ({ ...p, title: undefined }));
            }}
            className={controlClass(!!errors.title, "h-11")}
            placeholder="e.g. Wall painting"
            autoComplete="off"
            aria-invalid={!!errors.title}
          />
          {errors.title && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {errors.title}
            </p>
          )}
        </div>

        <div className="md:col-span-2 flex flex-col gap-1.5">
          <label className={fieldLabelClass} htmlFor="task-description">
            Description
          </label>
          <textarea
            id="task-description"
            value={values.description}
            onChange={(e) => {
              setField("description", e.target.value);
              setErrors((p) => ({ ...p, description: undefined }));
            }}
            className={controlClass(!!errors.description, "min-h-[104px] resize-y py-2.5")}
            placeholder="Task description"
            aria-invalid={!!errors.description}
          />
          {errors.description && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {errors.description}
            </p>
          )}
        </div>

        <p className={sectionEyebrowClass}>Project &amp; schedule</p>
        <div className="flex flex-col gap-1.5">
          <label className={fieldLabelClass} htmlFor="task-projectId">
            Project
          </label>
          <select
            id="task-projectId"
            value={values.projectId}
            onChange={(e) => {
              setField("projectId", e.target.value);
              setErrors((p) => ({ ...p, projectId: undefined }));
            }}
            className={controlClass(!!errors.projectId, "h-11")}
            aria-invalid={!!errors.projectId}
          >
            {projects.length === 0 ? (
              <option value="">No projects</option>
            ) : (
              projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))
            )}
          </select>
          {errors.projectId && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {errors.projectId}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={fieldLabelClass} htmlFor="task-duration">
            Duration (days)
          </label>
          <input
            id="task-duration"
            type="text"
            inputMode="numeric"
            value={values.duration === 0 ? "" : String(values.duration)}
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (raw === "") {
                setField("duration", 0);
              } else {
                const n = Number(raw);
                setField("duration", Number.isFinite(n) ? n : values.duration);
              }
              setErrors((p) => ({ ...p, duration: undefined }));
            }}
            className={controlClass(!!errors.duration, "h-11")}
            aria-invalid={!!errors.duration}
          />
          {errors.duration && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {errors.duration}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={fieldLabelClass} htmlFor="task-startDate">
            Start date
          </label>
          <input
            id="task-startDate"
            type="date"
            value={values.startDate}
            onChange={(e) => {
              setField("startDate", e.target.value);
              setErrors((p) => ({ ...p, startDate: undefined, endDate: undefined }));
            }}
            className={controlClass(!!errors.startDate, "h-11")}
            aria-invalid={!!errors.startDate}
          />
          {errors.startDate && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {errors.startDate}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={fieldLabelClass} htmlFor="task-endDate">
            End date
          </label>
          <div className="flex gap-2 min-w-0">
            <input
              id="task-endDate"
              type="date"
              value={values.endDate}
              onChange={(e) => {
                setField("endDate", e.target.value);
                setErrors((p) => ({ ...p, endDate: undefined, startDate: undefined }));
              }}
              className={controlClass(!!errors.endDate, "h-11 min-w-0 flex-1")}
              aria-invalid={!!errors.endDate}
            />
            <button
              type="button"
              onClick={autoCalculateEndDate}
              className="h-11 shrink-0 rounded-xl border border-border/90 bg-secondary px-3.5 text-xs font-semibold text-secondary-foreground shadow-sm transition-[background,box-shadow] hover:bg-muted"
              title="Set end date = start date + duration"
            >
              Auto
            </button>
          </div>
          {errors.endDate && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {errors.endDate}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={fieldLabelClass} htmlFor="task-priority">
            Priority
          </label>
          <select
            id="task-priority"
            value={values.priority}
            onChange={(e) => setField("priority", e.target.value as TaskPriority)}
            className={controlClass(false, "h-11")}
          >
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={fieldLabelClass} htmlFor="task-status">
            Status
          </label>
          <select
            id="task-status"
            value={values.status}
            onChange={(e) => {
              const v = e.target.value as TaskStatus;
              setValues((prev) => ({
                ...prev,
                status: v,
                ...(v === "Terminé" ? { progress: 100 } : {}),
              }));
            }}
            className={controlClass(false, "h-11")}
          >
            <option value="À faire">To do</option>
            <option value="En cours">In progress</option>
            <option value="Terminé">Done</option>
          </select>
        </div>

        <p className={sectionEyebrowClass}>Tracking &amp; dependencies</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className={fieldLabelClass} htmlFor="task-progress">
              Progress
            </label>
            <span className="text-xs text-muted-foreground">{values.progress}%</span>
          </div>
          <input
            id="task-progress"
            type="range"
            min={0}
            max={100}
            value={values.progress}
            onChange={(e) => {
              setField("progress", Number(e.target.value) || 0);
              setErrors((p) => ({ ...p, progress: undefined }));
            }}
            className={`w-full ${errors.progress ? "accent-destructive" : "accent-primary"}`}
            aria-invalid={!!errors.progress}
          />
          {errors.progress && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {errors.progress}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className={fieldLabelClass} htmlFor="task-spentBudget">
              Spent budget (DH)
            </label>
            {values.spentBudget > 0 && (
              <span className="text-xs text-muted-foreground">
                {formatBudget(values.spentBudget)} DH
              </span>
            )}
          </div>
          <input
            id="task-spentBudget"
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            value={values.spentBudget === 0 ? "" : String(values.spentBudget)}
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (raw === "") {
                setField("spentBudget", 0);
              } else {
                const n = Number(raw);
                setField("spentBudget", Number.isFinite(n) && n >= 0 ? n : values.spentBudget);
              }
              setErrors((p) => ({ ...p, spentBudget: undefined }));
            }}
            placeholder="0"
            className={controlClass(!!errors.spentBudget, "h-11")}
            aria-invalid={!!errors.spentBudget}
          />
          {errors.spentBudget && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {errors.spentBudget}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={fieldLabelClass} htmlFor="task-assignedTo">
            Assigned to
          </label>
          <select
            id="task-assignedTo"
            value={values.assignedTo}
            onChange={(e) => setField("assignedTo", e.target.value)}
            className={controlClass(false, "h-11")}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 flex flex-col gap-1.5">
          <label className={fieldLabelClass} htmlFor="task-dependsOn">
            Dependencies (multi-select)
          </label>
          <select
            id="task-dependsOn"
            multiple
            value={values.dependsOn}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
              setField("dependsOn", selected);
              setErrors((p) => ({ ...p, dependsOn: undefined }));
            }}
            className={controlClass(!!errors.dependsOn, "min-h-[132px] py-2")}
            aria-invalid={!!errors.dependsOn}
          >
            {dependencyCandidates.length === 0 ? (
              <option disabled value="">
                No tasks available
              </option>
            ) : (
              dependencyCandidates.map((task) => (
                <option key={task._id} value={task._id}>
                  {task.title} ({task.duration}d)
                </option>
              ))
            )}
          </select>
          <p className="text-xs text-muted-foreground">
            Hold Ctrl (Windows) or Cmd (Mac) to select multiple tasks.
          </p>
          {errors.dependsOn && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {errors.dependsOn}
            </p>
          )}
        </div>
        </div>
      </div>

      {errors.general && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {errors.general}
        </p>
      )}

      {showActions && (
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={() => onCancel?.()}
            className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground shadow-sm transition-[background] hover:bg-muted"
            disabled={isSubmitting}
          >
            {cancelLabel ?? "Cancel"}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || projects.length === 0}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-[filter] hover:brightness-110 disabled:opacity-60"
          >
            {isSubmitting
              ? "Saving…"
              : submitLabel ?? (mode === "create" ? "Create task" : "Update")}
          </button>
        </div>
      )}
    </form>
  );
}
