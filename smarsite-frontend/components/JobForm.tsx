"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import Link from "next/link";
import useSWR from "swr";
import {
  createJob,
  updateJob,
  getJobsKey,
  getTasksKey,
  fetcher,
  getEquipmentsKey,
  getHumansKey,
} from "@/lib/api";
import type { Job, Human, Equipment, CreateJobPayload, AssignedResource } from "@/lib/types";
import {
  extractAssignmentResourceId,
  normalizeAssignedResourceForForm,
} from "@/lib/assignedResource";
import {
  Loader2,
  ArrowLeft,
  Save,
  X,
  CalendarClock,
  FileText,
  Users,
  Wrench,
  Briefcase,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const statusOptions: Job["status"][] = ["Planifié", "En cours", "Terminé"];

interface JobFormProps {
  mode: "create" | "edit";
  initialData?: Job;
}

interface FormErrors {
  title?: string;
  taskId?: string;
  startTime?: string;
  endTime?: string;
  dateRange?: string;
  general?: string;
}

interface Task {
  _id: string;
  title: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateJobPayload extends CreateJobPayload {}

export default function JobForm({ mode, initialData }: JobFormProps) {
  const router = useRouter();

  // Chargement des Humains et Équipements directement depuis leurs endpoints
  const { data: humans = [], isLoading: humansLoading } = useSWR<Human[]>(
    getHumansKey(),
    fetcher
  );

  const { data: equipments = [], isLoading: equipmentsLoading } = useSWR<Equipment[]>(
    getEquipmentsKey(),
    fetcher
  );

  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useSWR<Task[]>(
    getTasksKey(),
    fetcher
  );

  const isLoading = humansLoading || equipmentsLoading;

  const [formData, setFormData] = useState<CreateJobPayload & { _id?: string }>({
    title: "",
    description: "",
    taskId: "",
    startTime: "",
    endTime: "",
    status: "Planifié",
    assignedResources: [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [selectedHuman, setSelectedHuman] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState("");
  const hydratedJobIdRef = useRef<string | null>(null);

  // Une seule synchro par job (évite boucle si SWR renvoie un nouvel objet à chaque render)
  useEffect(() => {
    if (!initialData) {
      hydratedJobIdRef.current = null;
      return;
    }
    if (hydratedJobIdRef.current === initialData._id) return;
    hydratedJobIdRef.current = initialData._id;

    setFormData({
      _id: initialData._id,
      title: initialData.title || "",
      description: initialData.description || "",
      taskId: initialData.taskId || "",
      startTime: initialData.startTime ? initialData.startTime.slice(0, 16) : "",
      endTime: initialData.endTime ? initialData.endTime.slice(0, 16) : "",
      status: initialData.status || "Planifié",
      assignedResources: (initialData.assignedResources || [])
        .map((ar) => normalizeAssignedResourceForForm(ar as AssignedResource))
        .filter((x): x is { resourceId: string; type: "Human" | "Equipment" } => Boolean(x)),
    });
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) validateField(name, value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  const validateField = (name: string, value: string) => {
    let error = "";
    switch (name) {
      case "title":
        if (!value.trim()) error = "Le titre est obligatoire";
        else if (value.trim().length < 2) error = "Au moins 2 caractères";
        else if (value.trim().length > 200) error = "Maximum 200 caractères";
        break;
      case "taskId":
        if (!value.trim()) error = "Veuillez choisir une tâche";
        break;
      case "startTime":
      case "endTime":
        if (!value) error = name === "startTime" ? "Date/heure de début obligatoire" : "Date/heure de fin obligatoire";
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!formData.title.trim()) {
      newErrors.title = "Le titre est obligatoire";
      isValid = false;
    } else if (formData.title.trim().length < 2) {
      newErrors.title = "Au moins 2 caractères";
      isValid = false;
    } else if (formData.title.trim().length > 200) {
      newErrors.title = "Maximum 200 caractères";
      isValid = false;
    }

    if (!formData.taskId) {
      newErrors.taskId = "Veuillez choisir une tâche";
      isValid = false;
    }
    if (!formData.startTime) {
      newErrors.startTime = "Date/heure de début obligatoire";
      isValid = false;
    }
    if (!formData.endTime) {
      newErrors.endTime = "Date/heure de fin obligatoire";
      isValid = false;
    }

    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      if (end <= start) {
        newErrors.dateRange = "La fin doit être après le début";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const markAllTouched = () => {
    setTouched((prev) => ({
      ...prev,
      title: true,
      taskId: true,
      startTime: true,
      endTime: true,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    markAllTouched();
    if (!validate()) {
      document.querySelector(".text-red-600")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);

    const payload: CreateJobPayload = {
      title: formData.title,
      description: formData.description,
      taskId: formData.taskId,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString(),
      status: formData.status,
      assignedResources: formData.assignedResources,
    };

    try {
      if (mode === "create") {
        await createJob(payload);
      } else {
        await updateJob(initialData!._id, payload);
      }
      mutate(getJobsKey());
      router.push("/jobs");
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : "Impossible d’enregistrer le job",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeResource = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      assignedResources: prev.assignedResources.filter((_, i) => i !== index),
    }));
  };

  // Fonction pour obtenir le type
  const getResourceType = (assigned: any): "Human" | "Equipment" | null => {
    if (!assigned) return null;
    return assigned.type || null;
  };

  const getResourceId = (assigned: { resourceId?: AssignedResource["resourceId"] }): string | null =>
    extractAssignmentResourceId(assigned);

  const getResourceInfo = (assignedResource: AssignedResource, type: "Human" | "Equipment") => {
    const resourceId = extractAssignmentResourceId(assignedResource);

    if (!resourceId) {
      return {
        name: "Invalid Resource",
        role: "No ID",
        exists: false,
        id: null as string | null,
      };
    }

    if (type === "Human") {
      const human = humans.find((h) => h._id === resourceId);
      if (human) {
        return {
          name: `${human.firstName} ${human.lastName}`.trim(),
          role: human.role || "No role specified",
          exists: true,
          id: resourceId,
        };
      }
      const stored = assignedResource.name?.trim();
      if (stored) {
        return { name: stored, role: "—", exists: true, id: resourceId };
      }
      return {
        name: "Unknown Human",
        role: "Not found",
        exists: false,
        id: resourceId,
      };
    }

    const equipment = equipments.find((e) => e._id === resourceId);
    if (equipment) {
      return {
        name: equipment.name || "Unnamed Equipment",
        role: equipment.brand || equipment.model || "Equipment",
        exists: true,
        id: resourceId,
      };
    }
    const stored = assignedResource.name?.trim();
    if (stored) {
      return { name: stored, role: "—", exists: true, id: resourceId };
    }
    return {
      name: "Unknown Equipment",
      role: "Not found",
      exists: false,
      id: resourceId,
    };
  };

  // Modifier addResource pour stocker correctement
  const addResource = (type: "Human" | "Equipment", resourceId: string) => {
    if (!resourceId) return;

    // Vérifier qu'il n'est pas déjà assigné en comparant avec resourceId
    const alreadyAssigned = formData.assignedResources.some(
      (ar) => ar.resourceId === resourceId
    );

    if (alreadyAssigned) return;

    setFormData((prev) => ({
      ...prev,
      assignedResources: [
        ...prev.assignedResources,
        { resourceId, type }, // Stocker resourceId pour le backend
      ],
    }));
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-2 sm:py-4 text-foreground">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight text-foreground">
              {mode === "create" ? "Plan New Job" : "Edit Job"}
            </h1>
            <p className="mt-4 text-xl text-muted-foreground max-w-2xl">
              {mode === "create"
                ? "Schedule a new job, assign resources and define timeline."
                : "Update job details, resources and schedule."}
            </p>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-3 px-7 py-4 bg-card border border-border text-foreground rounded-2xl font-medium hover:bg-muted transition shadow-sm"
          >
            <ArrowLeft size={20} />
            Cancel
          </Link>
        </div>

        {errors.general && (
          <div className="mb-10 p-6 bg-destructive/10 border border-destructive/30 rounded-2xl flex items-start gap-4 text-destructive">
            <AlertCircle size={28} className="mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold text-lg">Error</p>
              <p className="mt-1">{errors.general}</p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
        >
          <div className="p-8 lg:p-12 xl:p-16 space-y-14">
            {/* Job Details */}
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <Briefcase size={28} className="text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground">Job Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
                {/* Title */}
                <div className="space-y-2">
                  <label className="block text-lg font-semibold text-foreground">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-5 py-5 border-2 rounded-2xl text-lg bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all shadow-sm ${
                      errors.title && touched.title ? "border-red-500" : "border-border"
                    }`}
                    placeholder="Enter job title"
                  />
                  {errors.title && touched.title && (
                    <p className="text-red-600 dark:text-red-400 text-base mt-2 flex items-center gap-2">
                      <AlertCircle size={18} /> {errors.title}
                    </p>
                  )}
                </div>

                {/* Task Selection */}
                <div className="space-y-2">
                  <label className="block text-lg font-semibold text-foreground">
                    Associated Task <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <FileText size={20} />
                    </div>
                    <select
                      name="taskId"
                      value={formData.taskId}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={tasksLoading}
                      className={`w-full pl-12 pr-5 py-5 border-2 rounded-2xl text-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all shadow-sm ${
                        errors.taskId && touched.taskId ? "border-red-500" : "border-border"
                      }`}
                    >
                      <option value="">Select a task...</option>
                      {tasks.map((task) => (
                        <option key={task._id} value={task._id}>
                          {task.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {tasksLoading && (
                    <p className="text-muted-foreground text-sm mt-2 flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Loading tasks...
                    </p>
                  )}

                  {tasksError && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                      Error loading tasks. Please try again.
                    </p>
                  )}

                  {!tasksLoading && tasks.length === 0 && (
                    <p className="text-amber-600 dark:text-amber-400 text-sm mt-2">
                      No tasks available. Create one first.
                    </p>
                  )}

                  {errors.taskId && touched.taskId && (
                    <p className="text-red-600 dark:text-red-400 text-base mt-2 flex items-center gap-2">
                      <AlertCircle size={18} /> {errors.taskId}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-lg font-semibold text-foreground">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-5 py-5 border-2 rounded-2xl text-lg bg-input text-foreground placeholder:text-muted-foreground border-border focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all shadow-sm"
                    placeholder="Job details, objectives, notes..."
                  />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="pt-10 border-t border-border">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-accent/15 flex items-center justify-center">
                  <CalendarClock size={28} className="text-accent" />
                </div>
                <h2 className="text-3xl font-bold text-foreground">Timeline</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
                <div className="space-y-2">
                  <label className="block text-lg font-semibold text-foreground">
                    Start <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-5 py-5 border-2 rounded-2xl text-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all shadow-sm ${
                      (errors.startTime || errors.dateRange) && touched.startTime ? "border-red-500" : "border-border"
                    }`}
                  />
                  {errors.startTime && touched.startTime && (
                    <p className="text-red-600 dark:text-red-400 text-base mt-2 flex items-center gap-2">
                      <AlertCircle size={18} /> {errors.startTime}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-lg font-semibold text-foreground">
                    End <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-5 py-5 border-2 rounded-2xl text-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all shadow-sm ${
                      (errors.endTime || errors.dateRange) && touched.endTime ? "border-red-500" : "border-border"
                    }`}
                  />
                  {errors.endTime && touched.endTime && (
                    <p className="text-red-600 dark:text-red-400 text-base mt-2 flex items-center gap-2">
                      <AlertCircle size={18} /> {errors.endTime}
                    </p>
                  )}
                </div>

                {errors.dateRange && (
                  <p className="md:col-span-2 text-red-600 dark:text-red-400 text-base flex items-center gap-2">
                    <AlertCircle size={18} /> {errors.dateRange}
                  </p>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="pt-10 border-t border-border">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </div>
                <h2 className="text-3xl font-bold text-foreground">Status</h2>
              </div>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full max-w-md px-5 py-5 border-2 rounded-2xl text-lg bg-input text-foreground border-border focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all shadow-sm"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Resources */}
            <div className="pt-10 border-t border-border">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <Users size={28} className="text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground">Assigned Resources</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Humans */}
                <div className="space-y-4">
                  <label className="block text-lg font-semibold text-foreground">
                    Assign Human
                  </label>
                  <select
                    value={selectedHuman}
                    onChange={(e) => {
                      const id = e.target.value;
                      if (id) {
                        addResource("Human", id);
                        setSelectedHuman("");
                      }
                    }}
                    className="w-full px-5 py-5 border-2 rounded-2xl text-lg bg-input text-foreground border-border focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
                    disabled={humansLoading}
                  >
                    <option value="">Select available human...</option>
                    {humans
                      .filter((h) => h.availability)
                      .filter((h) => {
                        const humanId = h._id;
                        return !formData.assignedResources.some((ar) => ar.resourceId === humanId);
                      })
                      .map((h) => (
                        <option key={h._id} value={h._id}>
                          {h.firstName} {h.lastName} — {h.role}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Equipment */}
                <div className="space-y-4">
                  <label className="block text-lg font-semibold text-foreground">
                    Assign Equipment
                  </label>
                  <select
                    value={selectedEquipment}
                    onChange={(e) => {
                      const id = e.target.value;
                      if (id) {
                        addResource("Equipment", id);
                        setSelectedEquipment("");
                      }
                    }}
                    className="w-full px-5 py-5 border-2 rounded-2xl text-lg bg-input text-foreground border-border focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
                    disabled={equipmentsLoading}
                  >
                    <option value="">Select available equipment...</option>
                    {equipments
                      .filter((e) => e.availability)
                      .filter((e) => {
                        const equipmentId = e._id;
                        return !formData.assignedResources.some((ar) => ar.resourceId === equipmentId);
                      })
                      .map((e) => (
                        <option key={e._id} value={e._id}>
                          {e.name} — {e.brand || e.model || "Equipment"}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Liste des ressources assignées */}
              <div className="mt-10">
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  Assigned Resources ({formData.assignedResources.length})
                </h3>

                {formData.assignedResources.length === 0 ? (
                  <p className="text-muted-foreground italic">No resources assigned yet.</p>
                ) : (
                  <div className="space-y-3">
                    {formData.assignedResources.map((assigned, idx) => {
                      // Vérifier si la ressource assignée est valide
                      if (!assigned || typeof assigned !== 'object') {
                        return (
                          <div
                            key={`invalid-${idx}`}
                            className="flex items-center justify-between p-5 rounded-2xl border bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                          >
                            <div className="flex items-center gap-4">
                              <AlertCircle size={24} className="text-red-500" />
                              <div>
                                <p className="font-medium text-red-800 dark:text-red-300">
                                  Corrupted Resource Data
                                </p>
                                <p className="text-sm text-red-600 dark:text-red-400">
                                  This entry is invalid and will be removed when you save
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeResource(idx)}
                              className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        );
                      }

                      // Extraire l'ID et le type
                      const resourceId = getResourceId(assigned);
                      const resourceType = getResourceType(assigned);

                      // Si pas d'ID valide
                      if (!resourceId) {
                        return (
                          <div
                            key={`no-id-${idx}`}
                            className="flex items-center justify-between p-5 rounded-2xl border bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800"
                          >
                            <div className="flex items-center gap-4">
                              <AlertCircle size={24} className="text-yellow-500" />
                              <div>
                                <p className="font-medium text-yellow-800 dark:text-yellow-300">
                                  Missing Resource ID
                                </p>
                                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                                  Type: {resourceType || 'Unknown'} • No valid ID found
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeResource(idx)}
                              className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        );
                      }

                      // Si pas de type
                      if (!resourceType) {
                        return (
                          <div
                            key={`no-type-${idx}`}
                            className="flex items-center justify-between p-5 rounded-2xl border bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800"
                          >
                            <div className="flex items-center gap-4">
                              <AlertCircle size={24} className="text-yellow-500" />
                              <div>
                                <p className="font-medium text-yellow-800 dark:text-yellow-300">
                                  Missing Resource Type
                                </p>
                                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                                  ID: {String(resourceId).substring(0, 8)}... • Type not specified
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeResource(idx)}
                              className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        );
                      }

                      // Récupérer les infos de la ressource
                      const { name, role, exists } = getResourceInfo(assigned, resourceType);
                      
                      return (
                        <div
                          key={`resource-${idx}-${resourceId}`}
                          className={`flex items-center justify-between p-5 rounded-2xl border ${
                            exists 
                              ? 'bg-muted/40 border-border'
                              : 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {resourceType === "Human" ? (
                              <Users size={24} className={exists ? "text-blue-500" : "text-yellow-500"} />
                            ) : (
                              <Wrench size={24} className={exists ? "text-orange-500" : "text-yellow-500"} />
                            )}
                            <div>
                              <p className={`font-medium ${exists ? 'text-foreground' : 'text-yellow-800 dark:text-yellow-300'}`}>
                                {name}
                                {!exists && " (Missing/Deleted)"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {resourceType} • {role}
                                {!exists && ` • ID: ${String(resourceId).substring(0, 8)}...`}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeResource(idx)}
                            className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-12 flex flex-col sm:flex-row gap-6 justify-end border-t border-border">
              <Link
                href="/jobs"
                className="px-10 py-5 bg-card border-2 border-border text-foreground text-xl font-semibold rounded-2xl hover:bg-muted transition flex items-center justify-center gap-3 shadow-sm"
              >
                <X size={22} />
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className={`px-12 py-5 bg-accent text-accent-foreground text-xl font-bold rounded-2xl shadow-sm hover:brightness-110 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-ring/40 transition-all duration-300 flex items-center justify-center gap-4 min-w-[280px] ${
                  isSubmitting ? "opacity-80 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={26} className="animate-spin" />
                    Saving Job...
                  </>
                ) : (
                  <>
                    <Save size={26} />
                    {mode === "create" ? "Create Job" : "Update Job"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}