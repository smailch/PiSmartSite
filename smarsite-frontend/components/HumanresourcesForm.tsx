"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import type {
  Resource,
  CreateResourcePayload,
} from "@/lib/types";
import {
  createResource,
  updateResource,
  getResourcesKey,
} from "@/lib/api";
import Link from "next/link";

interface ResourceFormProps {
  mode: "create" | "edit";
  initialData?: Resource;
}

interface FormErrors {
  name?: string;
  role?: string;
  type?: string;
  general?: string;
}

export default function ResourceForm({
  mode,
  initialData,
}: ResourceFormProps) {
  const router = useRouter();

  const [type, setType] =
    useState<"Human" | "Equipment">("Human");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [availability, setAvailability] = useState(true);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ========================
     Prefill en mode EDIT
  ======================== */
  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setName(initialData.name);
      setRole(initialData.role);
      setAvailability(initialData.availability);
    }
  }, [initialData]);

  /* ========================
        Validation
  ======================== */
  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!name.trim())
      newErrors.name = "Resource name is required";

    if (!role.trim())
      newErrors.role = "Role is required";

    if (!type)
      newErrors.type = "Type is required";

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

    const payload: CreateResourcePayload = {
      type,
      name,
      role,
      availability,
    };

    try {
      if (mode === "create") {
        await createResource(payload);
      } else {
        await updateResource(initialData!._id, payload);
      }

      mutate(getResourcesKey());
      router.push("/resources");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong";

      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ========================
          UI
  ======================== */
  return (
    <div className="max-w-2xl mx-auto p-6 bg-card rounded-xl shadow border">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {mode === "create"
            ? "Create Resource"
            : "Edit Resource"}
        </h1>

        <Link
          href="/resources"
          className="text-sm text-muted-foreground"
        >
          ← Back
        </Link>
      </div>

      {errors.general && (
        <div className="mb-4 text-red-500 text-sm">
          {errors.general}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* Type */}
        <div>
          <label className="block font-medium mb-1">
            Type *
          </label>
          <select
            className="w-full border rounded px-3 py-2"
            value={type}
            onChange={(e) =>
              setType(
                e.target.value as "Human" | "Equipment"
              )
            }
          >
            <option value="Human">Human</option>
            <option value="Equipment">
              Equipment
            </option>
          </select>

          {errors.type && (
            <p className="text-red-500 text-sm mt-1">
              {errors.type}
            </p>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block font-medium mb-1">
            Name *
          </label>
          <input
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">
              {errors.name}
            </p>
          )}
        </div>

        {/* Role */}
        <div>
          <label className="block font-medium mb-1">
            Role *
          </label>
          <input
            className="w-full border rounded px-3 py-2"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          {errors.role && (
            <p className="text-red-500 text-sm mt-1">
              {errors.role}
            </p>
          )}
        </div>

        {/* Availability */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={availability}
            onChange={(e) =>
              setAvailability(e.target.checked)
            }
          />
          <label>Available</label>
        </div>

        {/* Submit */}
        <button
          disabled={isSubmitting}
          className="w-full bg-accent text-white py-3 rounded font-semibold"
        >
          {isSubmitting
            ? "Saving..."
            : mode === "create"
            ? "Create Resource"
            : "Update Resource"}
        </button>
      </form>
    </div>
  );
}
