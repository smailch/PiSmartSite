"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import type { Job,Resource, CreateJobPayload } from "@/lib/types";
import { createJob, updateJob, getJobsKey } from "@/lib/api";
import Link from "next/link";
import useSWR from "swr";
import { getResourcesKey, fetcher } from "@/lib/api";
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
  status?: string;
  dateRange?: string;
  general?: string;
}

export default function JobForm({ mode, initialData }: JobFormProps) {
  const router = useRouter();
const { data: resources = [], isLoading: resourcesLoading } = useSWR<Resource[]>(
    getResourcesKey(),
    fetcher
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskId, setTaskId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState<Job["status"]>("Planifié");

   const [assignedResources, setAssignedResources] = useState<
    { resourceId: string; type: "Human" | "Equipment" }[]
  >([]);
    const [newHumanId, setNewHumanId] = useState("");
  const [newEquipmentId, setNewEquipmentId] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newResourceId, setNewResourceId] = useState("");
  const humanResources = resources?.filter((r) => r.type === "Human") ?? [];
  const equipmentResources = resources?.filter((r) => r.type === "Equipment") ?? [];

  /* ========================
     Prefill en mode EDIT
  ======================== */
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description ?? "");
      setTaskId(initialData.taskId);
      setStartTime(initialData.startTime?.slice(0, 16) ?? "");
      setEndTime(initialData.endTime?.slice(0, 16) ?? "");
      setStatus(initialData.status);
      setAssignedResources(initialData.assignedResources ?? []);
      
    }
  }, [initialData]);

  /* ========================
        Validation
  ======================== */
  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!title.trim()) newErrors.title = "Job title is required";
    if (!taskId.trim()) newErrors.taskId = "Task ID is required";
    if (!startTime) newErrors.startTime = "Start time is required";
    if (!endTime) newErrors.endTime = "End time is required";

    if (startTime && endTime && new Date(endTime) <= new Date(startTime))
      newErrors.dateRange = "End time must be after start time";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  /* ========================
        Submit
  ======================== */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const payload: CreateJobPayload = {
      title,
      description,
      taskId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      status,
      assignedResources,
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
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ========================
     Resource Management
  ======================== */
function addResource(type: "Human" | "Equipment", id: string) {
    if (!id) return;
    setAssignedResources((prev) => [
      ...prev,
      { resourceId: id, type },
    ]);

    // Reset selection
    if (type === "Human") setNewHumanId("");
    else setNewEquipmentId("");
  }

  function removeResource(index: number) {
    setAssignedResources((prev) => prev.filter((_, i) => i !== index));
  }

  /* ========================
          UI
  ======================== */
  return (
    <div className="max-w-2xl mx-auto p-6 bg-card rounded-xl shadow border">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {mode === "create" ? "Create Job" : "Edit Job"}
        </h1>

        <Link href="/jobs" className="text-sm text-muted-foreground">
          ← Back
        </Link>
      </div>

      {errors.general && (
        <div className="mb-4 text-red-500 text-sm">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block font-medium mb-1">Title *</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block font-medium mb-1">Description</label>
          <textarea
            className="w-full border rounded px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Task ID */}
        <div>
          <label className="block font-medium mb-1">Task ID *</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
          />
          {errors.taskId && (
            <p className="text-red-500 text-sm">{errors.taskId}</p>
          )}
        </div>

        {/* Start / End */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1">Start *</label>
            <input
              type="datetime-local"
              className="w-full border rounded px-3 py-2"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">End *</label>
            <input
              type="datetime-local"
              className="w-full border rounded px-3 py-2"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        {errors.dateRange && (
          <p className="text-red-500 text-sm">{errors.dateRange}</p>
        )}

        {/* Status */}
        <div>
          <label className="block font-medium mb-1">Status</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as Job["status"])
            }
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

       

  {/* Assign Human */}
<div>
  <label className="block font-medium mb-2">Assign Human</label>
  <div className="flex gap-2 mb-2">
    <select
      className="border rounded px-3 py-2 flex-1"
      value={newHumanId}
      onChange={(e) => setNewHumanId(e.target.value)}
    >
      <option value="">Select Human</option>
      {humanResources
        .filter((r) => r.availability) // 🔹 uniquement disponibles
        .filter((r) => !assignedResources.some(ar => ar.resourceId === r._id)) // 🔹 éviter doublon
        .map((res) => (
          <option key={res._id} value={res._id}>
            {res.name} ({res.role})
          </option>
        ))}
    </select>
    <button
      type="button"
      onClick={() => addResource("Human", newHumanId)}
      className="bg-primary text-white px-3 rounded"
    >
      Add
    </button>
  </div>
</div>

{/* Assign Equipment */}
<div>
  <label className="block font-medium mb-2">Assign Equipment</label>
  <div className="flex gap-2 mb-2">
    <select
      className="border rounded px-3 py-2 flex-1"
      value={newEquipmentId}
      onChange={(e) => setNewEquipmentId(e.target.value)}
    >
      <option value="">Select Equipment</option>
      {equipmentResources
        .filter((r) => r.availability)
        .filter((r) => !assignedResources.some(ar => ar.resourceId === r._id))
        .map((res) => (
          <option key={res._id} value={res._id}>
            {res.name} ({res.role})
          </option>
        ))}
    </select>
    <button
      type="button"
      onClick={() => addResource("Equipment", newEquipmentId)}
      className="bg-primary text-white px-3 rounded"
    >
      Add
    </button>
  </div>



        <ul className="space-y-2">
          {assignedResources.map((res, index) => {
            const r = resources?.find((r) => r._id === res.resourceId);
            return (
              <li key={index} className="flex justify-between items-center border px-3 py-2 rounded">
                <span>
                  {r?.name ?? res.resourceId} ({res.type})
                </span>
                <button
                  type="button"
                  onClick={() => removeResource(index)}
                  className="text-red-500 text-sm"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      </div>

        {/* Submit */}
        <button
          disabled={isSubmitting}
          className="w-full bg-accent text-white py-3 rounded font-semibold"
        >
          {isSubmitting
            ? "Saving..."
            : mode === "create"
            ? "Create Job"
            : "Update Job"}
        </button>
      </form>
    </div>
  );
}
