"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Project, ProjectType, Human } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CheckIcon, ChevronsUpDown, UserCircle2 } from "lucide-react";

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
  siteEngineers?: Human[];
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

function getInitials(firstName: string, lastName: string): string {
  return `${(firstName?.[0] ?? "").toUpperCase()}${(lastName?.[0] ?? "").toUpperCase()}`;
}

const initialsColors = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-blue-500/25",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300 ring-violet-500/25",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/25",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/25",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 ring-cyan-500/25",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 ring-fuchsia-500/25",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-500/25",
];

function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return initialsColors[Math.abs(hash) % initialsColors.length];
}

function EngineerCombobox({
  engineers,
  value,
  hasError,
  onChange,
}: {
  engineers: Human[];
  value: string;
  hasError: boolean;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => engineers.find((e) => e._id === value) ?? null,
    [engineers, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          id="project-createdBy-combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          className={[
            "flex h-11 w-full min-w-0 items-center gap-2.5 rounded-xl border bg-input px-3 text-sm shadow-sm transition-all outline-none",
            "hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-primary/25",
            hasError
              ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25"
              : "border-border/90 focus-visible:border-primary/35",
          ].join(" ")}
        >
          {selected ? (
            <>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ${colorForId(selected._id)}`}
                aria-hidden
              >
                {getInitials(selected.firstName, selected.lastName)}
              </span>
              <span className="flex-1 truncate text-left font-medium text-foreground">
                {selected.firstName} {selected.lastName}
              </span>
            </>
          ) : (
            <>
              <UserCircle2 className="h-5 w-5 shrink-0 text-muted-foreground/60" aria-hidden />
              <span className="flex-1 truncate text-left text-muted-foreground">
                Select a Site Engineer...
              </span>
            </>
          )}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 rounded-xl border border-border/80 shadow-xl"
        align="start"
        sideOffset={6}
      >
        <Command className="rounded-xl">
          <CommandInput placeholder="Search by name..." className="h-10" />
          <CommandList className="max-h-56">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              No engineer found.
            </CommandEmpty>
            <CommandGroup>
              {engineers.map((eng) => {
                const isSelected = eng._id === value;
                return (
                  <CommandItem
                    key={eng._id}
                    value={`${eng.firstName} ${eng.lastName}`}
                    onSelect={() => {
                      onChange(isSelected ? "" : eng._id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 cursor-pointer"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ${colorForId(eng._id)}`}
                    >
                      {getInitials(eng.firstName, eng.lastName)}
                    </span>
                    <div className="flex flex-1 flex-col min-w-0">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {eng.firstName} {eng.lastName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {eng.role}
                      </span>
                    </div>
                    {eng.availability && (
                      <span className="ml-auto shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-300">
                        Available
                      </span>
                    )}
                    {isSelected && (
                      <CheckIcon className="ml-1 h-4 w-4 shrink-0 text-primary" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function ProjectForm({
  mode: _mode,
  initialData,
  isSubmitting = false,
  siteEngineers = [],
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
    if (!byT) {
      next.createdBy = "Please select a Site Engineer.";
    } else if (byT.length > MAX_CREATED_BY) {
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
            <label htmlFor="project-createdBy-combobox" className={fieldLabelClass}>
              Created by (Site Engineer)
            </label>
            <EngineerCombobox
              engineers={siteEngineers}
              value={createdBy}
              hasError={!!errors.createdBy}
              onChange={(id) => {
                setCreatedBy(id);
                setErrors((p) => ({ ...p, createdBy: undefined }));
              }}
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
          aria-busy={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
