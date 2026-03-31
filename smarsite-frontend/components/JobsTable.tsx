"use client";

import Link from "next/link";
import type { Job } from "@/lib/types";
import { Pencil, Trash2, Briefcase, Calendar, Users } from "lucide-react";

interface JobsTableProps {
  jobs: Job[];
  onDelete: (job: Job) => void;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "Terminé": return "bg-green-100 text-green-800";
    case "En cours": return "bg-blue-100 text-blue-800";
    case "Planifié": return "bg-yellow-100 text-yellow-800";
    default: return "bg-muted text-muted-foreground";
  }
}

function formatResourceList(resources: Job["assignedResources"], type: string) {
  const filtered = resources?.filter((r) => r.type === type) ?? [];
  if (filtered.length === 0) return "None";
  return `${filtered.length} assigned`;
}

export default function JobsTable({ jobs, onDelete }: JobsTableProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-secondary border-b border-border">
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Job Title</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Start Time</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">End Time</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Resources</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Briefcase size={32} className="text-muted-foreground/40" />
                    <p className="text-lg font-medium">No jobs found</p>
                    <p className="text-sm">Try adjusting your search or filter criteria</p>
                  </div>
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job._id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className="text-accent flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-foreground">{job.title}</span>
                        {job.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{job.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <Calendar size={14} className="text-primary flex-shrink-0" />
                      {new Date(job.startTime).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <Calendar size={14} className="text-primary flex-shrink-0" />
                      {new Date(job.endTime).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(job.status)}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <Users size={14} className="text-primary flex-shrink-0" />
                      <span>{formatResourceList(job.assignedResources, "Human")}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/jobs/${job._id}/edit`}
                        className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                        aria-label={`Edit ${job.title}`}>
                        <Pencil size={16} />
                      </Link>
                      <button onClick={() => onDelete(job)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        aria-label={`Delete ${job.title}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}