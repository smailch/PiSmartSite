"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mutate } from "swr";
import type { CreateResourcePayload, Resource } from "@/lib/types";
import {
  createResource,
  getResourcesKey,
  updateResource,
} from "@/lib/api";

interface ResourceFormProps {
  mode: "create" | "edit";
  initialData?: Resource;
}

export default function ResourceForm({ mode, initialData }: ResourceFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateResourcePayload>({
    type: initialData?.type ?? "Human",
    name: initialData?.name ?? "",
    role: initialData?.role ?? "",
    availability: initialData?.availability ?? true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!formData.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "create") {
        await createResource({
          ...formData,
          name: formData.name.trim(),
          role: formData.role.trim(),
        });
      } else if (initialData?._id) {
        await updateResource(initialData._id, {
          ...formData,
          name: formData.name.trim(),
          role: formData.role.trim(),
        });
      }
      await mutate(getResourcesKey());
      router.push("/resources");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-card rounded-xl shadow border">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {mode === "create" ? "Create Resource" : "Edit Resource"}
        </h1>
        <Link href="/resources" className="text-sm text-muted-foreground">
          ← Back
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <p className="text-sm text-destructive font-medium">{error}</p>
        ) : null}

        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData((d) => ({
                ...d,
                type: e.target.value as CreateResourcePayload["type"],
              }))
            }
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
          >
            <option value="Human">Human</option>
            <option value="Equipment">Equipment</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((d) => ({ ...d, name: e.target.value }))
            }
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <input
            type="text"
            value={formData.role}
            onChange={(e) =>
              setFormData((d) => ({ ...d, role: e.target.value }))
            }
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
            placeholder="e.g. Engineer, Crane, …"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.availability}
            onChange={(e) =>
              setFormData((d) => ({ ...d, availability: e.target.checked }))
            }
            className="rounded border-border"
          />
          <span className="text-sm">Available</span>
        </label>

        <div className="flex justify-end gap-2 pt-4">
          <Link
            href="/resources"
            className="px-4 py-2 rounded-lg border border-border text-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
          >
            {submitting ? "Saving…" : mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
