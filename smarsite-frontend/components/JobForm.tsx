"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import Link from "next/link";
import useSWR from "swr";
import {
  createJob,
  updateJob,
  getJobsKey,
  getResourcesKey,
  getTasksKey,          // ← Ajouté
  fetcher,
} from "@/lib/api";
import type { Job, Resource, CreateJobPayload } from "@/lib/types";
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

// Type pour les tâches (basé sur ton exemple JSON)
interface Task {
  _id: string;
  title: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function JobForm({ mode, initialData }: JobFormProps) {
  const router = useRouter();

  const { data: resources = [], isLoading: resourcesLoading } = useSWR<Resource[]>(
    getResourcesKey(),
    fetcher
  );

  // Chargement dynamique des tâches
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useSWR<Task[]>(
    getTasksKey(),  // → /tasks
    fetcher
  );

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

  const humanResources = resources.filter((r) => r.type === "Human" && r.availability);
  const equipmentResources = resources.filter((r) => r.type === "Equipment" && r.availability);

  useEffect(() => {
    if (initialData) {
      setFormData({
        _id: initialData._id,
        title: initialData.title || "",
        description: initialData.description || "",
        taskId: initialData.taskId || "",
        startTime: initialData.startTime ? initialData.startTime.slice(0, 16) : "",
        endTime: initialData.endTime ? initialData.endTime.slice(0, 16) : "",
        status: initialData.status || "Planifié",
        assignedResources: initialData.assignedResources || [],
      });
    }
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
        if (!value.trim()) error = "Title is required";
        break;
      case "taskId":
        if (!value.trim()) error = "Please select a task";
        break;
      case "startTime":
      case "endTime":
        if (!value) error = `${name === "startTime" ? "Start" : "End"} time is required`;
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
      newErrors.title = "Title is required";
      isValid = false;
    }
    if (!formData.taskId) {
      newErrors.taskId = "Please select a task";
      isValid = false;
    }
    if (!formData.startTime) {
      newErrors.startTime = "Start time is required";
      isValid = false;
    }
    if (!formData.endTime) {
      newErrors.endTime = "End time is required";
      isValid = false;
    }

    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      if (end <= start) {
        newErrors.dateRange = "End time must be after start time";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setErrors({ general: err instanceof Error ? err.message : "Failed to save job" });
    } finally {
      setIsSubmitting(false);
    }
  };



 const addResource = (type: "Human" | "Equipment", id: string) => {
   
  };

  const removeResource = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      assignedResources: prev.assignedResources.filter((_, i) => i !== index),
    }));
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-[#0b4f6c] to-[#0b4f6c]/90 bg-clip-text text-transparent tracking-tight">
              {mode === "create" ? "Plan New Job" : "Edit Job"}
            </h1>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-2xl">
              {mode === "create"
                ? "Schedule a new job, assign resources and define timeline."
                : "Update job details, resources and schedule."}
            </p>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-3 px-7 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
          >
            <ArrowLeft size={20} />
            Cancel
          </Link>
        </div>

        {errors.general && (
          <div className="mb-10 p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-4 text-red-800 dark:text-red-300">
            <AlertCircle size={28} className="mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold text-lg">Error</p>
              <p className="mt-1">{errors.general}</p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-8 lg:p-12 xl:p-16 space-y-14">
            {/* Job Details */}
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-[#0b4f6c]/10 dark:bg-[#0b4f6c]/20 flex items-center justify-center">
                  <Briefcase size={28} className="text-[#0b4f6c] dark:text-[#0b4f6c]/90" />
                </div>
                <h2 className="text-3xl font-bold text-[#0b4f6c] dark:text-gray-100">Job Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
                {/* Title */}
                <div className="space-y-2">
                  <label className="block text-lg font-semibold text-gray-700 dark:text-gray-300">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-5 py-5 border-2 rounded-2xl text-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#f28c28]/40 focus:border-[#0b4f6c] transition-all shadow-sm ${
                      errors.title && touched.title ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                    }`}
                    placeholder="Enter job title"
                  />
                  {errors.title && touched.title && (
                    <p className="text-red-600 dark:text-red-400 text-base mt-2 flex items-center gap-2">
                      <AlertCircle size={18} /> {errors.title}
                    </p>
                  )}
                </div>

                {/* Sélection de la tâche (remplace l'ancien input taskId) */}
                <div className="space-y-2">
                  <label className="block text-lg font-semibold text-gray-700 dark:text-gray-300">
                    Associated Task <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                      <FileText size={20} />
                    </div>
                    <select
                      name="taskId"
                      value={formData.taskId}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={tasksLoading}
                      className={`w-full pl-12 pr-5 py-5 border-2 rounded-2xl text-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#f28c28]/40 focus:border-[#0b4f6c] transition-all shadow-sm ${
                        errors.taskId && touched.taskId ? "border-red-500" : "border-gray-300 dark:border-gray-700"
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

                  {/* Messages d'état */}
                  {tasksLoading && (
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 flex items-center gap-2">
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
                  <label className="block text-lg font-semibold text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-5 py-5 border-2 rounded-2xl text-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f28c28]/40 focus:border-[#0b4f6c] transition-all shadow-sm"
                    placeholder="Job details, objectives, notes..."
                  />
                </div>
              </div>
            </div>
{/* Timeline */}
            <div className="pt-10 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-[#f28c28]/10 dark:bg-[#f28c28]/20 flex items-center justify-center">
                  <CalendarClock size={28} className="text-[#f28c28]" />
                </div>
                <h2 className="text-3xl font-bold text-[#0b4f6c] dark:text-gray-100">Timeline</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
                <div className="space-y-2">
                  <label className="block text-lg font-semibold text-gray-700 dark:text-gray-300">
                    Start <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-5 py-5 border-2 rounded-2xl text-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#f28c28]/40 focus:border-[#0b4f6c] transition-all shadow-sm ${
                      (errors.startTime || errors.dateRange) && touched.startTime ? "border-red-500" : "border-gray-300 dark:border-gray-700"
                    }`}
                  />
                  {errors.startTime && touched.startTime && (
                    <p className="text-red-600 dark:text-red-400 text-base mt-2 flex items-center gap-2">
                      <AlertCircle size={18} /> {errors.startTime}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-lg font-semibold text-gray-700 dark:text-gray-300">
                    End <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-5 py-5 border-2 rounded-2xl text-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#f28c28]/40 focus:border-[#0b4f6c] transition-all shadow-sm ${
                      (errors.endTime || errors.dateRange) && touched.endTime ? "border-red-500" : "border-gray-300 dark:border-gray-700"
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
            <div className="pt-10 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-green-100/50 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-3xl font-bold text-[#0b4f6c] dark:text-gray-100">Status</h2>
              </div>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full max-w-md px-5 py-5 border-2 rounded-2xl text-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f28c28]/40 focus:border-[#0b4f6c] transition-all shadow-sm"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Resources */}
            <div className="pt-10 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-[#0b4f6c]/10 dark:bg-[#0b4f6c]/20 flex items-center justify-center">
                  <Users size={28} className="text-[#0b4f6c] dark:text-[#0b4f6c]/90" />
                </div>
                <h2 className="text-3xl font-bold text-[#0b4f6c] dark:text-gray-100">Assigned Resources</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Humans */}
                <div className="space-y-4">
                  <label className="block text-lg font-semibold text-gray-700 dark:text-gray-300">Assign Human</label>
                  <div className="flex gap-3">
                    <select
                      value=""
                      onChange={(e) => addResource("Human", e.target.value)}
                      className="flex-1 px-5 py-5 border-2 rounded-2xl text-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f28c28]/40 focus:border-[#0b4f6c]"
                      disabled={resourcesLoading}
                    >
                      <option value="">Select available human...</option>
                      {humanResources
                        .filter((h) => !formData.assignedResources.some((ar) => ar.resourceId === h._id))
                        .map((h) => (
                          <option key={h._id} value={h._id}>
                            {h.name} — {h.role}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Equipment */}
                <div className="space-y-4">
                  <label className="block text-lg font-semibold text-gray-700 dark:text-gray-300">Assign Equipment</label>
                  <div className="flex gap-3">
                    <select
                      value=""
                      onChange={(e) => addResource("Equipment", e.target.value)}
                      className="flex-1 px-5 py-5 border-2 rounded-2xl text-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f28c28]/40 focus:border-[#0b4f6c]"
                      disabled={resourcesLoading}
                    >
                      <option value="">Select available equipment...</option>
                      {equipmentResources
                        .filter((e) => !formData.assignedResources.some((ar) => ar.resourceId === e._id))
                        .map((e) => (
                          <option key={e._id} value={e._id}>
                            {e.name} — {e.role || "Equipment"}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Liste des assignés */}
              <div className="mt-10">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Assigned ({formData.assignedResources.length})</h3>
                {formData.assignedResources.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 italic">No resources assigned yet.</p>
                ) : (
                  <div className="space-y-3">
                    {formData.assignedResources.map((res, idx) => {
                      const resource = resources.find((r) => r._id === res.resourceId);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center gap-4">
                            {res.type === "Human" ? (
                              <Users size={24} className="text-blue-500" />
                            ) : (
                              <Wrench size={24} className="text-orange-500" />
                            )}
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {resource?.name || "Unknown"}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {res.type} • {resource?.role || ""}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeResource(idx)}
                            className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition p-2"
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
            <div className="pt-12 flex flex-col sm:flex-row gap-6 justify-end border-t border-gray-100 dark:border-gray-800">
              <Link
                href="/jobs"
                className="px-10 py-5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xl font-semibold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-center gap-3 shadow-sm"
              >
                <X size={22} />
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isSubmitting || resourcesLoading}
                className={`px-12 py-5 bg-[#0b4f6c] text-white text-xl font-bold rounded-2xl shadow-xl hover:bg-[#0b4f6c]/90 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-[#f28c28]/50 transition-all duration-300 flex items-center justify-center gap-4 min-w-[280px] ${
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