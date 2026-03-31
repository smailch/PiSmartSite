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
  AlertCircle,
} from "lucide-react";

interface JobsTableProps {
  jobs: Job[];
  onDelete: (job: Job) => void;
}

function getStatusStyles(status: string) {
  switch (status) {
    case "Terminé":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800";
    case "En cours":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    case "Planifié":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
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
    <div className="flex flex-col text-sm">
      {humans > 0 && <span>{humans} humain{humans > 1 ? "s" : ""}</span>}
      {equipments > 0 && <span>{equipments} équipement{equipments > 1 ? "s" : ""}</span>}
    </div>
  );
}

export default function JobsTable({ jobs, onDelete }: JobsTableProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-gradient-to-r from-[#0b4f6c]/5 to-[#0b4f6c]/10 dark:from-[#0b4f6c]/20 dark:to-[#0b4f6c]/10 border-b border-gray-200 dark:border-gray-800">
              <th className="px-6 py-5 text-left text-sm font-semibold text-[#0b4f6c] dark:text-gray-200 tracking-wide">TÂCHE / JOB</th>
              <th className="px-6 py-5 text-left text-sm font-semibold text-[#0b4f6c] dark:text-gray-200 tracking-wide">DÉBUT</th>
              <th className="px-6 py-5 text-left text-sm font-semibold text-[#0b4f6c] dark:text-gray-200 tracking-wide">FIN</th>
              <th className="px-6 py-5 text-left text-sm font-semibold text-[#0b4f6c] dark:text-gray-200 tracking-wide">STATUT</th>
              <th className="px-6 py-5 text-left text-sm font-semibold text-[#0b4f6c] dark:text-gray-200 tracking-wide">RESSOURCES</th>
              <th className="px-6 py-5 text-right text-sm font-semibold text-[#0b4f6c] dark:text-gray-200 tracking-wide">ACTIONS</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-4 text-gray-500 dark:text-gray-400">
                    <Briefcase size={48} className="text-gray-300 dark:text-gray-600 opacity-60" />
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Aucun job trouvé</h3>
                    <p className="text-sm max-w-md">
                      Créez votre premier job ou ajustez vos filtres/recherches
                    </p>
                    <Link
                      href="/jobs/new"
                      className="mt-4 px-6 py-3 bg-[#0b4f6c] text-white rounded-xl font-medium hover:bg-[#0b4f6c]/90 transition"
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
                  className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors group"
                >
                  {/* Titre + description + tâche associée */}
                  <td className="px-6 py-5">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-[#0b4f6c]/10 dark:bg-[#0b4f6c]/20 flex items-center justify-center flex-shrink-0">
                        <FileText size={20} className="text-[#0b4f6c] dark:text-[#0b4f6c]/90" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-[#0b4f6c] dark:group-hover:text-[#0b4f6c]/90 transition-colors">
                          {job.title}
                        </div>
                        {job.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {job.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Début */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CalendarClock size={16} className="text-[#f28c28]" />
                      {formatDateTime(job.startTime)}
                    </div>
                  </td>

                  {/* Fin */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Clock size={16} className="text-[#f28c28]" />
                      {formatDateTime(job.endTime)}
                    </div>
                  </td>

                  {/* Statut */}
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyles(job.status)}`}
                    >
                      {job.status}
                    </span>
                  </td>

                  {/* Ressources */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Users size={16} className="text-[#0b4f6c]" />
                      {formatResources(job.assignedResources)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/jobs/${job._id}/edit`}
                        className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-[#0b4f6c] dark:text-[#0b4f6c]/90 transition-all hover:shadow-sm"
                        aria-label={`Modifier ${job.title}`}
                      >
                        <Pencil size={18} />
                      </Link>
                      <button
                        onClick={() => onDelete(job)}
                        className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-all hover:shadow-sm"
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