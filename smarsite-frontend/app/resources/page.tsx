"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import ResourcesTable from "@/components/resourcesTable";
import type { Resource } from "@/lib/types";
import {
  fetcher,
  getResourcesKey,
  deleteResource,
} from "@/lib/api";
import { Plus, Search, Filter } from "lucide-react";

const typeOptions = ["All", "Human", "Equipment"];

export default function ResourcesPage() {
  const {
    data: resources = [],
    isLoading,
    error,
  } = useSWR<Resource[]>(getResourcesKey(), fetcher);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* =============================
        FILTER + SEARCH
  ============================= */

  const filteredResources = useMemo(() => {
    let filtered = resources;

    if (typeFilter !== "All") {
      filtered = filtered.filter(
        (resource) => resource.type === typeFilter
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (resource) =>
          resource.name.toLowerCase().includes(q) ||
          resource.role.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [resources, typeFilter, searchQuery]);

  /* =============================
        DELETE
  ============================= */

  async function handleDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      await deleteResource(deleteTarget._id);
      mutate(getResourcesKey());
    } catch (err) {
      console.error("Failed to delete resource:", err);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <MainLayout>
      <PageHeader
        title="Resources"
        description="Manage human resources and equipment"
      >
        <div className="flex gap-2 mb-4">
  <Link
    href="/resources/humans"
          className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-semibold hover:bg-accent/90 transition-colors flex items-center gap-2 shadow-sm">
  
    <Plus size={18} />
    Add Human
  </Link>

  <Link
    href="/resources/equipment"
          className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-semibold hover:bg-accent/90 transition-colors flex items-center gap-2 shadow-sm">
  
    <Plus size={18} />
    Add Equipment
  </Link>
</div>

      </PageHeader>

      {/* SEARCH + FILTER */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
        <div className="relative flex-1 w-full md:max-w-sm">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={18} className="text-muted-foreground" />

          {typeOptions.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                typeFilter === type
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-foreground hover:bg-muted"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* COUNT */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {filteredResources.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">
            {resources.length}
          </span>{" "}
          resources
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 mb-6">
          <p className="text-destructive font-medium">
            Failed to load resources.
          </p>
          <p className="text-sm text-destructive/80 mt-1">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      )}

      {/* LOADING */}
      {isLoading ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">
              Loading resources...
            </p>
          </div>
        </div>
      ) : (
        <ResourcesTable
          resources={filteredResources}
          onDelete={(resource) => setDeleteTarget(resource)}
        />
      )}

      {/* SIMPLE DELETE CONFIRM */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold mb-2">
              Delete Resource
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {deleteTarget.name}
              </span>
              ?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg bg-secondary"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-destructive text-white"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
