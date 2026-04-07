"use client";

import Link from "next/link";
import type { Job } from "@/lib/types";
import {
  Pencil,
  Trash2,
  Briefcase,
  CalendarClock,
  Users,
  Clock,
  FileText,
  TrendingUp,
  ClipboardList,
} from "lucide-react";

interface JobsTableProps {
  jobs: Job[];
  onDelete: (job: Job) => void;
}

function getStatusStyles(status: string) {
  switch (status) {
    case "Terminé":
      return "border-emerald-500/25 bg-emerald-500/15 text-emerald-300";
    case "En cours":
      return "border-blue-500/25 bg-blue-500/15 text-blue-300";
    case "Planifié":
      return "border-orange-500/25 bg-orange-500/15 text-orange-300";
    default:
      return "border-white/10 bg-slate-500/15 text-slate-300";
  }
}

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatResources(resources: Job["assignedResources"] = []) {
  const humans = resources.filter(r => r.type === "Human").length;
  const equipments = resources.filter(r => r.type === "Equipment").length;

  if (humans === 0 && equipments === 0) return "Aucun";
  return (
    <div className="flex flex-col text-sm text-slate-300">
      {humans > 0 && <span>{humans} humain{humans > 1 ? "s" : ""}</span>}
      {equipments > 0 && <span>{equipments} équipement{equipments > 1 ? "s" : ""}</span>}
    </div>
  );
}

export default function JobsTable({ jobs, onDelete }: JobsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/80 shadow-lg shadow-black/25 backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-xl hover:shadow-black/40">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-white/10 bg-slate-950/40 backdrop-blur-md">
              <th className="px-6 py-5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tâche / job</th>
              <th className="px-6 py-5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Début</th>
              <th className="px-6 py-5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Fin</th>
              <th className="px-6 py-5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Statut</th>
              <th className="px-6 py-5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Avancement</th>

              <th className="px-6 py-5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Ressources</th>
              <th className="px-6 py-5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.06]">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-5 text-slate-400">
                    <div className="rounded-3xl border border-white/10 bg-card/60 p-7 shadow-lg shadow-black/20 backdrop-blur-xl">
                      <Briefcase
                        size={44}
                        className="mx-auto text-blue-400"
                        strokeWidth={1.15}
                        aria-hidden
                      />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-100">
                      Aucun job trouvé
                    </h3>
                    <p className="max-w-md text-sm leading-relaxed">
                      Créez votre premier job ou ajustez vos filtres / recherches.
                    </p>
                    <Link
                      href="/jobs/new"
                      className="mt-1 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-300 ease-out hover:shadow-lg active:scale-95 motion-reduce:active:scale-100"
                    >
                      + Nouveau job
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr
                  key={job._id}
                  className="group transition-all duration-300 ease-out hover:bg-white/[0.04] hover:shadow-sm"
                >
                  {/* Titre + description + tâche associée */}
                  <td className="px-6 py-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-blue-500/25 to-blue-600/5 shadow-inner shadow-black/20 backdrop-blur-sm">
                        <FileText size={20} className="text-blue-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-100 transition-colors group-hover:text-blue-300">
                          {job.title}
                        </div>
                        {job.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                            {job.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Début */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <CalendarClock size={16} className="text-orange-400" />
                      {formatDateTime(job.startTime)}
                    </div>
                  </td>

                  {/* Fin */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Clock size={16} className="text-orange-400" />
                      {formatDateTime(job.endTime)}
                    </div>
                  </td>

                  {/* Statut */}
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm ${getStatusStyles(job.status)}`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <div
                        className="flex min-w-[7rem] flex-col gap-1.5"
                        title="Avancement du suivi"
                      >
                        <div className="h-2 w-full max-w-[7rem] overflow-hidden rounded-full border border-white/10 bg-slate-950/60 shadow-inner">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-[width] duration-500 ease-out"
                            style={{
                              width: `${
                                typeof job.progressPercentage === "number"
                                  ? Math.min(100, Math.max(0, job.progressPercentage))
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold tabular-nums text-slate-200">
                          {typeof job.progressPercentage === "number"
                            ? `${job.progressPercentage}%`
                            : "—"}
                        </span>
                      </div>
                      <Link
                        href={`/jobs/${job._id}/progress`}
                        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-blue-500/15 p-3 text-blue-300 shadow-sm backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-blue-500/25 hover:shadow-md"
                        aria-label={`Progression — ${job.title}`}
                        title="Voir le suivi"
                      >
                        <TrendingUp size={18} />
                      </Link>
                      <Link
                        href={`/jobs/${job._id}/attendance`}
                        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-orange-500/15 p-3 text-orange-300 shadow-sm backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-orange-500/25 hover:shadow-md"
                        aria-label={`Pointage — ${job.title}`}
                        title="Pointage"
                      >
                        <ClipboardList size={18} />
                      </Link>
                    </div>
                  </td>
                  {/* Ressources */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Users size={16} className="shrink-0 text-blue-400" />
                      {formatResources(job.assignedResources)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/jobs/${job._id}/edit`}
                        className="rounded-xl border border-white/10 bg-white/5 p-3 text-blue-400 transition-all duration-200 hover:bg-white/10 hover:shadow-sm"
                        aria-label={`Modifier ${job.title}`}
                      >
                        <Pencil size={18} />
                      </Link>
                  <button
                        onClick={() => onDelete(job)}
                        className="rounded-xl border border-white/10 bg-red-500/10 p-3 text-red-400 transition-all duration-200 hover:bg-red-500/20 hover:shadow-sm"
                        aria-label={`Supprimer ${job.title}`}
                      >
                        <Trash2 size={18} />
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
