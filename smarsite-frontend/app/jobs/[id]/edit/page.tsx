"use client";

import { use } from "react";
import useSWR from "swr";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import JobForm from "@/components/JobForm";
import type { Job } from "@/lib/types";
import { fetcher, getJobKey } from "@/lib/api";

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: job, isLoading, error } = useSWR<Job>(getJobKey(id), fetcher);

  return (
    <MainLayout>
      <PageHeader title="Edit Job" description="Update job details and resource assignments" />
      {isLoading ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-12 flex items-center justify-center max-w-3xl">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading job data...</p>
          </div>
        </div>
      ) : error || !job ? (
        <div className="bg-card rounded-xl border border-destructive/30 shadow-sm p-12 flex items-center justify-center max-w-3xl">
          <p className="text-destructive font-medium">Job not found. It may have been deleted.</p>
        </div>
      ) : (
        <JobForm mode="edit" initialData={job} />
      )}
    </MainLayout>
  );
}