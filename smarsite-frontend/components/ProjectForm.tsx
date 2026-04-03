"use client";

import { useState, useEffect, useCallback } from "react";
import type { Project, ProjectType } from "@/lib/types";

const PROJECT_TYPES: ProjectType[] = [
  "Construction",
  "Rénovation",
  "Maintenance",
  "Autre",
];

const PROJECT_STATUSES: Project["status"][] = [
  "En cours",
  "Terminé",
  "En retard",
];

const MAX_NAME = 200;
const MAX_DESCRIPTION = 8000;
const MAX_LOCATION = 300;
const MAX_CREATED_BY = 120;

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

function toDateInputValue(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Radix Select + dialog pouvait laisser type/statut vides si la chaîne API ne matchait pas exactement. */
function normalizeStatus(raw: unknown): Project["status"] {
  const s =
    typeof raw === "string"
      ? raw.normalize("NFC").replace(/\s+/g, " ").trim()
      : "";
  const aliases: Record<string, Project["status"]> = {
    "En cours": "En cours",
    Terminé: "Terminé",
    "En retard": "En retard",
    "In Progress": "En cours",
    Completed: "Terminé",
    Planning: "En cours",
    Termine: "Terminé",
  };
  if (aliases[s]) return aliases[s];
  if (PROJECT_STATUSES.includes(s as Project["status"]))
    return s as Project["status"];
  return "En cours";
}

function normalizeType(raw: unknown): ProjectType {
  const t =
    typeof raw === "string"
      ? raw.normalize("NFC").replace(/\s+/g, " ").trim()
      : "";
  if (PROJECT_TYPES.includes(t as ProjectType)) return t as ProjectType;
  return "Autre";
}

function createdByToString(createdBy: unknown): string {
  if (createdBy == null) return "";
  if (typeof createdBy === "string") return createdBy.trim();
  if (
    typeof createdBy === "object" &&
    createdBy !== null &&
    "_id" in createdBy
  ) {
    const id = (createdBy as { _id?: unknown })._id;
    return id != null ? String(id) : "";
  }
  return String(createdBy);
}

type ProjectFieldErrors = Partial<
  Record<
    | "name"
    | "description"
    | "startDate"
    | "endDate"
    | "budget"
    | "location"
    | "createdBy",
    string
  >
>;

interface ProjectFormProps {
  mode: "create" | "edit";
  initialData?: Project;
  isSubmitting?: boolean;
  onSubmit: (payload: Omit<Project, "id" | "_id">) => void | Promise<void>;
}

const TYPE_LABELS: Record<ProjectType, string> = {
  Construction: "Construction",
  Rénovation: "Renovation",
  Maintenance: "Maintenance",
  Autre: "Other",
};

const STATUS_LABELS: Record<Project["status"], string> = {
  "En cours": "In progress",
  Terminé: "Completed",
  "En retard": "Behind schedule",
};

function parseBudget(trimmed: string): { value?: number; error?: string } {
  if (trimmed === "") return { value: undefined };
  const n = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) {
    return {
      error: "Enter a strictly positive number or leave empty.",
    };
  }
  return { value: n };
}

export default function ProjectForm({
  mode: _mode,
  initialData,
  isSubmitting = false,
  onSubmit,
}: ProjectFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<Project["status"]>("En cours");
  const [type, setType] = useState<ProjectType>("Construction");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [errors, setErrors] = useState<ProjectFieldErrors>({});

  const validate = useCallback((): ProjectFieldErrors => {
    const next: ProjectFieldErrors = {};
    const nameT = name.trim();
    if (!nameT) {
      next.name = "Project name is required.";
    } else if (nameT.length < 2) {
      next.name = "Name must be at least 2 characters.";
    } else if (nameT.length > MAX_NAME) {
      next.name = `Maximum ${MAX_NAME} characters.`;
    }

    if (description.length > MAX_DESCRIPTION) {
      next.description = `Maximum ${MAX_DESCRIPTION} characters.`;
    }

    if (!startDate.trim()) {
      next.startDate = "Start date is required.";
    }

    if (startDate && endDate.trim()) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        next.endDate = "Invalid date.";
      } else if (end.getTime() <= start.getTime()) {
        next.endDate = "End date must be after start date.";
      }
    }

    const budgetResult = parseBudget(budget.trim());
    if (budgetResult.error) next.budget = budgetResult.error;

    const locT = location.trim();
    if (locT.length > MAX_LOCATION) {
      next.location = `Maximum ${MAX_LOCATION} characters.`;
    }

    const byT = createdBy.trim();
    if (byT.length > MAX_CREATED_BY) {
      next.createdBy = `Maximum ${MAX_CREATED_BY} characters.`;
    }

    return next;
  }, [name, description, startDate, endDate, budget, location, createdBy]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name ?? "");
      setDescription(initialData.description ?? "");
      setStartDate(toDateInputValue(initialData.startDate));
      setEndDate(toDateInputValue(initialData.endDate));
      setStatus(normalizeStatus(initialData.status));
      setType(normalizeType(initialData.type));
      setBudget(
        initialData.budget != null && !Number.isNaN(initialData.budget)
          ? String(initialData.budget)
          : "",
      );
      setLocation(initialData.location ?? "");
      setCreatedBy(createdByToString(initialData.createdBy));
      setErrors({});
    } else {
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setStatus("En cours");
      setType("Construction");
      setBudget("");
      setLocation("");
      setCreatedBy("");
      setErrors({});
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const budgetResult = parseBudget(budget.trim());
    const budgetNum = budgetResult.value;

    const payload: Omit<Project, "id" | "_id"> = {
      name: name.trim(),
      description: description.trim(),
      startDate: startDate.trim(),
      status,
      type,
      createdBy: createdBy.trim(),
    };
    if (endDate.trim() !== "") payload.endDate = endDate.trim();
    if (budgetNum !== undefined) payload.budget = budgetNum;
    const locT = location.trim();
    if (locT !== "") payload.location = locT;

    try {
      await Promise.resolve(onSubmit(payload));
    } catch (err) {
      console.error("[ProjectForm] onSubmit error:", err);
    }
  };

  const groupClass = (key: keyof ProjectFieldErrors) =>
    `flex flex-col gap-1.5 min-w-0 ${errors[key] ? "rounded-lg ring-2 ring-destructive/25" : ""}`;

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
          <p className={sectionEyebrowClass}>General information</p>

          <div className={groupClass("name")}>
            <label htmlFor="project-name" className={fieldLabelClass}>
              Project name
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((p) => ({ ...p, name: undefined }));
              }}
              autoComplete="off"
              className={controlClass(!!errors.name, "h-11")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs font-medium text-destructive" role="alert">
                {errors.name}
              </p>
            )}
          </div>

          <div className={groupClass("startDate")}>
            <label htmlFor="project-startDate" className={fieldLabelClass}>
              Start date
            </label>
            <input
              id="project-startDate"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setErrors((p) => ({
                  ...p,
                  startDate: undefined,
                  endDate: undefined,
                }));
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

          <div className={`md:col-span-2 ${groupClass("description")}`}>
            <label htmlFor="project-description" className={fieldLabelClass}>
              Description
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors((p) => ({ ...p, description: undefined }));
              }}
              className={controlClass(!!errors.description, "min-h-[104px] resize-y py-2.5")}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-xs font-medium text-destructive" role="alert">
                {errors.description}
              </p>
            )}
          </div>

          <p className={sectionEyebrowClass}>Schedule &amp; budget</p>

          <div className={groupClass("endDate")}>
            <label htmlFor="project-endDate" className={fieldLabelClass}>
              End date
            </label>
            <input
              id="project-endDate"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setErrors((p) => ({ ...p, endDate: undefined }));
              }}
              className={controlClass(!!errors.endDate, "h-11")}
              aria-invalid={!!errors.endDate}
            />
            {errors.endDate && (
              <p className="text-xs font-medium text-destructive" role="alert">
                {errors.endDate}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="project-type" className={fieldLabelClass}>
              Type
            </label>
            <select
              id="project-type"
              value={type}
              onChange={(e) => setType(e.target.value as ProjectType)}
              className={controlClass(false, "h-11")}
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className={groupClass("budget")}>
            <label htmlFor="project-budget" className={fieldLabelClass}>
              Budget (optional)
            </label>
            <input
              id="project-budget"
              type="text"
              inputMode="decimal"
              value={budget}
              onChange={(e) => {
                setBudget(e.target.value);
                setErrors((p) => ({ ...p, budget: undefined }));
              }}
              placeholder="Positive amount"
              className={controlClass(!!errors.budget, "h-11")}
              aria-invalid={!!errors.budget}
            />
            {errors.budget && (
              <p className="text-xs font-medium text-destructive" role="alert">
                {errors.budget}
              </p>
            )}
          </div>

          <div className={groupClass("location")}>
            <label htmlFor="project-location" className={fieldLabelClass}>
              Location (optional)
            </label>
            <input
              id="project-location"
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setErrors((p) => ({ ...p, location: undefined }));
              }}
              placeholder="Address or city"
              className={controlClass(!!errors.location, "h-11")}
              aria-invalid={!!errors.location}
            />
            {errors.location && (
              <p className="text-xs font-medium text-destructive" role="alert">
                {errors.location}
              </p>
            )}
          </div>

          <p className={sectionEyebrowClass}>Status &amp; tracking</p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="project-status" className={fieldLabelClass}>
              Status
            </label>
            <select
              id="project-status"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as Project["status"])
              }
              className={controlClass(false, "h-11")}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className={groupClass("createdBy")}>
            <label htmlFor="project-createdBy" className={fieldLabelClass}>
              Created by
            </label>
            <input
              id="project-createdBy"
              type="text"
              value={createdBy}
              onChange={(e) => {
                setCreatedBy(e.target.value);
                setErrors((p) => ({ ...p, createdBy: undefined }));
              }}
              className={controlClass(!!errors.createdBy, "h-11")}
              aria-invalid={!!errors.createdBy}
            />
            {errors.createdBy && (
              <p className="text-xs font-medium text-destructive" role="alert">
                {errors.createdBy}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-[filter] hover:brightness-110 disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
