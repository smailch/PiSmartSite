"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import JobsTable from "@/components/JobsTable";
import DeleteJobDialog from "@/components/DeleteJobDialog";
import type { Job } from "@/lib/types";
import { fetcher, getJobsKey, deleteJob } from "@/lib/api";
import { Plus, Search, Filter } from "lucide-react";

const statusOptions = ["All", "Planifié", "En cours", "Terminé"];

export default function JobsPage() {
  const { data: jobs = [], isLoading: jobsLoading, error } =
    useSWR<Job[]>(getJobsKey(), fetcher);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredJobs = useMemo(() => {
    let filtered = jobs;
    if (statusFilter !== "All")
      filtered = filtered.filter((job) => job.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(q) ||
          job.description?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [jobs, statusFilter, searchQuery]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteJob(deleteTarget._id);
      mutate(getJobsKey());
    } catch (err) {
      console.error("Failed to delete job:", err);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <MainLayout>
    <PageHeader title="Jobs" description="Manage all jobs linked to project tasks">
  <div className="mb-4 flex flex-wrap gap-3">
    {/* Bouton Create Job */}
    <Link
      href="/jobs/create"
      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-300 ease-out hover:shadow-lg active:scale-95 motion-reduce:active:scale-100"
    >
      <Plus size={18} />
      Create Job
    </Link>

    {/* Bouton View Resources */}
    <Link
      href="/humans"
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-slate-200 shadow-sm backdrop-blur-md transition-all duration-300 ease-out hover:bg-white/10 hover:shadow-md active:scale-95 motion-reduce:active:scale-100"
    >
      <Plus size={18} />
      View humans Resources
    </Link>
    <Link
      href="/equipment"
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-slate-200 shadow-sm backdrop-blur-md transition-all duration-300 ease-out hover:bg-white/10 hover:shadow-md active:scale-95 motion-reduce:active:scale-100"
    >
      <Plus size={18} />
      View equipment Resources
    </Link>
  </div>
      </PageHeader>


      {/* Search & Filter */}
      <div className="mb-8 flex flex-col items-start gap-5 md:flex-row md:items-center">
        <div className="relative w-full flex-1 md:max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search jobs..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-card/60 py-2.5 pl-10 pr-4 text-slate-100 shadow-sm backdrop-blur-md placeholder:text-slate-500 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={18} className="text-slate-500" />
          {statusOptions.map((status) => (
            <button key={status} onClick={() => setStatusFilter(status)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 ease-out ${
                statusFilter === status
                  ? "bg-gradient-to-r from-blue-50 to-transparent text-blue-600 shadow-sm ring-1 ring-blue-200/50"
                  : "border border-white/40 bg-white/50 text-gray-700 shadow-sm backdrop-blur-sm hover:bg-white/80 hover:shadow-md"
              }`}>
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-slate-400">
          Showing <span className="font-semibold text-slate-100">{filteredJobs.length}</span> of{" "}
          <span className="font-semibold text-slate-100">{jobs.length}</span> jobs
        </p>
      </div>

      {error && (
        <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 shadow-lg shadow-black/20 backdrop-blur-md">
          <p className="text-red-300 font-medium">
            Failed to load jobs. Make sure the backend is running on port 3200.
          </p>
          <p className="text-sm text-red-300/80 mt-1">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      )}

      {jobsLoading ? (
        <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-white/10 bg-card/70 p-12 shadow-lg shadow-black/25 backdrop-blur-xl">
          <div className="h-10 w-full max-w-md rounded-xl skeleton-premium" />
          <div className="h-10 w-full max-w-md rounded-xl skeleton-premium" />
          <div className="h-10 w-full max-w-md rounded-xl skeleton-premium" />
          <div className="flex items-center gap-3 pt-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500 motion-reduce:hidden" />
            <p className="text-sm font-medium text-slate-400">Loading jobs...</p>
          </div>
        </div>
      ) : (
          <JobsTable jobs={filteredJobs} onDelete={(job) => setDeleteTarget(job)} />
      )}

      <DeleteJobDialog open={!!deleteTarget} jobTitle={deleteTarget?.title ?? ""}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} isDeleting={isDeleting} />
    </MainLayout>
  );
}