"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import HumanResourcesTable from "@/components/HumanresourcesTable";
import type { Human } from "@/lib/types";
import { fetcher, getHumansKey, deleteHuman } from "@/lib/api";
import { Plus, Search, Filter } from "lucide-react";

export default function HumansPage() {
  
  const {
    data: humans = [],
    isLoading,
    error,
  } = useSWR<Human[]>(getHumansKey(), fetcher);

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Human | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ============================= FILTER + SEARCH ============================= */
  const filteredHumans = useMemo(() => {
    if (!searchQuery.trim()) return humans;
    const q = searchQuery.toLowerCase();
    return humans.filter(
      (h) =>
        h.firstName.toLowerCase().includes(q) ||
        h.lastName.toLowerCase().includes(q) ||
        h.cin.toLowerCase().includes(q) ||
        h.role.toLowerCase().includes(q)
    );
  }, [humans, searchQuery]);

  /* ============================= DELETE ============================= */
  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteHuman(deleteTarget._id);
      mutate(getHumansKey());
    } catch (err) {
      console.error("Failed to delete human:", err);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <MainLayout>
      <PageHeader
        title="Human Resources"
        description="Manage human resources"
      >
        <div className="flex gap-2 mb-4">
          <Link
            href="/humans/create"
            className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-semibold hover:bg-accent/90 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} />
            Add Human
          </Link>
        </div>
      </PageHeader>

      {/* SEARCH */}
      <div className="relative mb-6 w-full md:max-w-sm">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Search humans..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
        />
      </div>

      {/* COUNT */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground">{filteredHumans.length}</span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">{humans.length}</span>{" "}
          humans
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 mb-6">
          <p className="text-destructive font-medium">Failed to load humans.</p>
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
            <p className="text-muted-foreground">Loading humans...</p>
          </div>
        </div>
      ) : (
        <HumanResourcesTable
          humans={filteredHumans}
          onDelete={(human) => setDeleteTarget(human)}
        />
        
      )}

      {/* SIMPLE DELETE CONFIRM */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-card/95 p-6 text-card-foreground shadow-2xl shadow-black/50 backdrop-blur-xl">
            <h3 className="text-lg font-semibold mb-2">Delete Human</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deleteTarget.firstName} {deleteTarget.lastName}</span>?
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
