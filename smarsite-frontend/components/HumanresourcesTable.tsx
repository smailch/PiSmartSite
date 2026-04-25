"use client";

import { useState } from "react";
import Link from "next/link";
import { mutate } from "swr";
import type { Human } from "@/lib/types"; // Assure-toi de créer un type Human
import { deleteHuman, getHumansKey } from "@/lib/api";
import { Pencil, Trash2, Eye, Users, FileText, ExternalLink } from "lucide-react";

const API_BASE =
  typeof process.env.NEXT_PUBLIC_API_URL === "string"
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "http://localhost:3200";

function cvHref(cvUrl: string) {
  if (!cvUrl) return "";
  if (cvUrl.startsWith("http")) return cvUrl;
  return `${API_BASE}${cvUrl.startsWith("/") ? "" : "/"}${cvUrl}`;
}

interface HumanResourcesTableProps {
  humans: Human[];
  onDelete: (human: Human) => void; // ✅ ici human a le type Human
  onEdit?: (human: Human) => void;   // optionnel si tu veux l'édition
  onView?: (human: Human) => void;   // optionnel si tu veux voir les détails
}
export default function HumanResourcesTable({ humans }: HumanResourcesTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this human?")) return;

    try {
      setDeletingId(id);
      await deleteHuman(id);
      mutate(getHumansKey());
    } catch (err) {
      alert("Failed to delete human. " + (err instanceof Error ? err.message : ""));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/80 shadow-lg shadow-black/25 backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-xl hover:shadow-black/40">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-slate-950/40 backdrop-blur-md">
              <th className="px-6 py-5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Name</th>
              <th className="px-6 py-5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">CIN</th>
              <th className="px-6 py-5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Role</th>
              <th className="px-6 py-5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Phone</th>
              <th className="px-6 py-5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">CV</th>
              <th className="px-6 py-5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Availability</th>
              <th className="px-6 py-5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {humans.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-slate-400">
                    <div className="rounded-3xl border border-white/10 bg-card/60 p-6 shadow-lg shadow-black/20 backdrop-blur-xl">
                      <Users
                        className="mx-auto size-11 text-blue-400"
                        strokeWidth={1.15}
                        aria-hidden
                      />
                    </div>
                    <p className="text-base font-semibold text-slate-100">
                      No humans found
                    </p>
                    <p className="text-sm leading-relaxed">
                      Add team members to see them listed here.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              humans.map((human) => (
                <tr
                  key={human._id}
                  className="border-b border-white/[0.06] transition-all duration-300 ease-out last:border-0 hover:bg-white/[0.04] hover:shadow-sm"
                >
                  <td className="px-6 py-5 text-slate-200">{human.firstName} {human.lastName}</td>
                  <td className="px-6 py-5 text-slate-200">{human.cin}</td>
                  <td className="px-6 py-5 text-slate-200">{human.role}</td>
                  <td className="px-6 py-5 text-slate-200">{human.phone}</td>
                  <td className="px-6 py-5 text-slate-300">
                    {human.cvUrl ? (
                      <a
                        href={cvHref(human.cvUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 transition hover:text-blue-300"
                      >
                        <FileText size={16} aria-hidden />
                        Open
                        <ExternalLink size={14} className="opacity-80" aria-hidden />
                      </a>
                    ) : (
                      <span className="text-sm text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-slate-400">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur-sm ${
                        human.availability
                          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                          : "border-white/10 bg-slate-500/15 text-slate-400"
                      }`}
                    >
                      {human.availability ? "Available" : "Not Available"}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/humans/${human._id}/details`}
                        className="rounded-xl border border-transparent p-2 text-blue-400 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/10 hover:bg-blue-500/15 hover:shadow-sm"
                        aria-label={`View ${human.firstName} ${human.lastName}`}
                      >
                        <Eye size={16} />
                      </Link>
                      <Link
                        href={`/humans/${human._id}/edit`}
                        className="rounded-xl border border-transparent p-2 text-blue-400 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/10 hover:bg-blue-500/15 hover:shadow-sm"
                        aria-label={`Edit ${human.firstName} ${human.lastName}`}
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        onClick={() => handleDelete(human._id)}
                        disabled={deletingId === human._id}
                        className="rounded-xl border border-transparent p-2 text-red-400 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-red-500/20 hover:bg-red-500/15 hover:shadow-sm disabled:opacity-50"
                        aria-label={`Delete ${human.firstName} ${human.lastName}`}
                      >
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
