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
        <Link href="/jobs/create"
          className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-semibold hover:bg-accent/90 transition-colors flex items-center gap-2 shadow-sm">
          <Plus size={18} /> Create Job
        </Link>
        <Link
      href="/resources"
      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
    >
      <Plus size={18} />
      View Resources
    </Link>
      </PageHeader>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
        <div className="relative flex-1 w-full md:max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search jobs..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={18} className="text-muted-foreground" />
          {statusOptions.map((status) => (
            <button key={status} onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-foreground hover:bg-muted"
              }`}>
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filteredJobs.length}</span> of{" "}
          <span className="font-semibold text-foreground">{jobs.length}</span> jobs
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 mb-6">
          <p className="text-destructive font-medium">
            Failed to load jobs. Make sure the backend is running on port 3200.
          </p>
          <p className="text-sm text-destructive/80 mt-1">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      )}

      {jobsLoading ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading jobs...</p>
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