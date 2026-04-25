"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import { useJobProgress } from "@/hooks/useJobProgress";
import { resolveProgressPhotoUrl } from "@/lib/jobProgressApi";
import type { BackendTask, Job, Project } from "@/lib/types";
import { fetcher, getJobsKey, getProjectsKey, getTasksByProjectKey } from "@/lib/api";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Circle,
  ExternalLink,
  Layers,
  ListTodo,
} from "lucide-react";

export default function ProjectJobProgressPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [taskId, setTaskId] = useState("");
  const [jobId, setJobId] = useState("");

  const { data: projects = [] } = useSWR<Project[]>(getProjectsKey(), fetcher);
  const projectName =
    projects.find((p) => p._id === projectId)?.name?.trim() || projectId;

  const { data: tasks = [], isLoading: tasksLoading } = useSWR<BackendTask[]>(
    projectId ? getTasksByProjectKey(projectId) : null,
    fetcher,
  );

  const { data: jobs = [], isLoading: jobsLoading } = useSWR<Job[]>(getJobsKey(), fetcher);

  const jobsForTask = useMemo(
    () => jobs.filter((j) => j.taskId === taskId),
    [jobs, taskId],
  );

  useEffect(() => {
    setJobId("");
  }, [taskId]);

  const selectedJob = useMemo(
    () => jobs.find((j) => j._id === jobId),
    [jobs, jobId],
  );

  const { steps, percentage, loading: progressLoading, error: progressError } =
    useJobProgress(jobId || undefined);

  return (
    <MainLayout>
      <PageHeader
        title="Job progress — project view"
        description={`Choose a task and a job for project « ${projectName} ». Step-by-step progress and photos come from the job tracker (same data as Jobs → Progress).`}
      >
        <Link
          href="/progress-photos"
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 shadow-sm transition-colors hover:bg-white/[0.08]"
        >
          <ArrowLeft size={18} />
          Progress photos
        </Link>
      </PageHeader>

      <div className="mb-8 rounded-xl border border-white/10 bg-slate-900/40 p-6">
        <p className="mb-4 text-sm text-slate-400">
          Project-level photos (AI validation) and job-level step photos are linked by the same{" "}
          <strong className="text-slate-200">project</strong>; here you drill down to a{" "}
          <strong className="text-slate-200">task</strong> then a <strong className="text-slate-200">job</strong>{" "}
          to see on-site step progress.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
              <ListTodo size={16} className="text-primary" />
              Task
            </label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              disabled={tasksLoading || tasks.length === 0}
              className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-slate-100 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
            >
              <option value="">
                {tasksLoading
                  ? "Loading tasks…"
                  : tasks.length === 0
                    ? "No tasks for this project"
                    : "— Select a task —"}
              </option>
              {tasks.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
              <Briefcase size={16} className="text-primary" />
              Job
            </label>
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              disabled={!taskId || jobsLoading || jobsForTask.length === 0}
              className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-slate-100 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
            >
              <option value="">
                {!taskId
                  ? "Select a task first"
                  : jobsForTask.length === 0
                    ? "No jobs for this task"
                    : "— Select a job —"}
              </option>
              {jobsForTask.map((j) => (
                <option key={j._id} value={j._id}>
                  {j.title} · {j.status}
                  {typeof j.progressPercentage === "number" ? ` · ${j.progressPercentage}%` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!jobId ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-card/40 py-16 text-center text-slate-500">
          <Layers className="mx-auto mb-3 size-10 opacity-50" />
          Select a task and a job to load step progress.
        </div>
      ) : progressLoading ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-white/10 bg-card/60 py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-slate-400">Loading job progress…</p>
        </div>
      ) : progressError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-destructive">
          {progressError}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-card/80 p-6 shadow-lg md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">{selectedJob?.title}</h2>
              <p className="mt-1 text-sm text-slate-400">
                Status: <span className="text-slate-200">{selectedJob?.status}</span>
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-slate-500">Progress</p>
                <p className="text-3xl font-bold tabular-nums text-primary">{percentage}%</p>
              </div>
              <div className="h-3 min-w-[140px] flex-1 overflow-hidden rounded-full bg-white/10 md:min-w-[200px]">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <Link
                href={`/jobs/${jobId}/progress`}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-[filter] hover:brightness-110"
              >
                Edit / upload steps
                <ExternalLink size={16} />
              </Link>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-slate-200">Steps</h3>
            <ul className="space-y-3">
              {steps.length === 0 ? (
                <li className="rounded-lg border border-white/10 bg-slate-950/30 px-4 py-6 text-center text-slate-500">
                  No steps defined for this job yet. Open the job progress page to add steps.
                </li>
              ) : (
                steps.map((s, idx) => {
                  const img = resolveProgressPhotoUrl(s.photoUrl);
                  return (
                    <li
                      key={`${s.step}-${idx}`}
                      className="flex gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4"
                    >
                      <div className="mt-0.5 shrink-0 text-primary">
                        {s.completed ? (
                          <CheckCircle2 size={22} className="text-emerald-400" />
                        ) : (
                          <Circle size={22} className="text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-100">{s.step || `Step ${idx + 1}`}</p>
                        {s.date ? (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {new Date(s.date).toLocaleString()}
                          </p>
                        ) : null}
                        {img ? (
                          <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img}
                              alt=""
                              className="max-h-48 w-full object-cover"
                            />
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
