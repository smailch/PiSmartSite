"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { CalendarClock, ClipboardList, Loader2, Save, User } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import { fetcher, getJobKey } from "@/lib/api";
import {
  createAttendance,
  fetchAttendanceByJob,
  type AttendanceRecord,
} from "@/lib/attendanceApi";
import type { AssignedResource, Job } from "@/lib/types";
import {
  extractAssignmentResourceId,
  getAssignedHumanDisplayName,
} from "@/lib/assignedResource";
function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function resourceLabel(resourceId: AttendanceRecord["resourceId"]): string {
  if (resourceId && typeof resourceId === "object") {
    const o = resourceId as {
      name?: string;
      firstName?: string;
      lastName?: string;
      _id?: string;
    };
    const fromHuman = `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim();
    if (fromHuman) return fromHuman;
    if (o.name?.trim()) return o.name.trim();
    if (o._id) return `Travailleur …${String(o._id).slice(-6)}`;
  }
  const id = String(resourceId);
  if (id.length === 24 && /^[0-9a-f]{24}$/i.test(id)) {
    return `Travailleur …${id.slice(-6)}`;
  }
  return id;
}

export default function JobAttendancePage() {
  const params = useParams();
  const jobId = typeof params?.id === "string" ? params.id : undefined;

  const { data: job, isLoading: jobLoading, error: jobError } = useSWR<Job>(
    jobId ? getJobKey(jobId) : null,
    fetcher
  );

  const {
    data: attendance = [],
    isLoading: attLoading,
    mutate,
  } = useSWR<AttendanceRecord[]>(
    jobId ? [`attendance`, jobId] : null,
    () => fetchAttendanceByJob(jobId!)
  );

  const humanAssignments = useMemo(() => {
    const list = job?.assignedResources ?? [];
    return list.filter(
      (r): r is AssignedResource =>
        r.type === "Human" && Boolean(extractAssignmentResourceId(r))
    );
  }, [job]);

  const [form, setForm] = useState({
    resourceId: "",
    date: todayISODate(),
    checkIn: "08:00",
    checkOut: "17:00",
    status: "present" as "present" | "absent",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobId || !form.resourceId) {
      toast.error("Choisissez un travailleur");
      return;
    }
    setSaving(true);
    try {
      await createAttendance({
        jobId,
        resourceId: form.resourceId,
        date: new Date(form.date).toISOString(),
        checkIn: form.status === "present" ? form.checkIn : undefined,
        checkOut: form.status === "present" ? form.checkOut : undefined,
        status: form.status,
      });
      toast.success("Pointage enregistré");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }
  const loading = jobLoading || attLoading;

  return (
    <MainLayout>
      <PageHeader
        title="Pointage"
        description={
          job
            ? `Présence sur le job : ${job.title}`
            : "Suivi de présence des équipes"
        }
      />

      {jobError && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          Impossible de charger le job. Vérifiez l’API ({String(jobError)}).
        </div>
      )}

      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-2xl border border-orange-100 bg-white p-6 shadow-xl shadow-orange-500/10 dark:border-orange-900/50 dark:bg-gray-900/90">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-orange-700 dark:text-orange-300">
            <CalendarClock className="h-5 w-5" />
            Enregistrer un pointage
          </h2>
          {loading && !job ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Chargement…
            </div>
          ) : humanAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune ressource humaine assignée à ce job. Assignez des travailleurs depuis l’édition du job.
            </p>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-foreground">Travailleur</span>
                <select
                  required
                  value={form.resourceId}
                  onChange={(e) => setForm((f) => ({ ...f, resourceId: e.target.value }))}
                  className="rounded-xl border border-orange-200 bg-white px-3 py-2 dark:border-orange-900 dark:bg-gray-950"
                >
                  <option value="">— Sélectionner —</option>
                  {humanAssignments.map((ar) => {
                    const rid = extractAssignmentResourceId(ar)!;
                    return (
                      <option key={rid} value={rid}>
                        {getAssignedHumanDisplayName(ar)}
                      </option>
                    );
                  })}

                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Date</span>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="rounded-xl border border-orange-200 px-3 py-2 dark:border-orange-900 dark:bg-gray-950"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Statut</span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as "present" | "absent",
                    }))
                  }
                  className="rounded-xl border border-orange-200 px-3 py-2 dark:border-orange-900 dark:bg-gray-950"
                >
                  <option value="present">Présent</option>
                  <option value="absent">Absent</option>
                </select>
              </label>
              {form.status === "present" && (
                <>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">Entrée</span>
                    <input
                      type="time"
                      value={form.checkIn}
                      onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
                      className="rounded-xl border border-orange-200 px-3 py-2 dark:border-orange-900 dark:bg-gray-950"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">Sortie</span>
                    <input
                      type="time"
                      value={form.checkOut}
                      onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                      className="rounded-xl border border-orange-200 px-3 py-2 dark:border-orange-900 dark:bg-gray-950"
                    />
                  </label>
                </>
              )}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="rounded-2xl border border-orange-100 bg-white shadow-xl dark:border-orange-900/50 dark:bg-gray-900/90">
          <h2 className="flex items-center gap-2 border-b border-orange-100 px-6 py-4 text-lg font-semibold text-orange-800 dark:border-orange-900 dark:text-orange-200">
            <ClipboardList className="h-5 w-5" />
            Historique
          </h2>
          {attLoading ? (
            <div className="flex items-center gap-2 p-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Chargement…
            </div>
          ) : attendance.length === 0 ? (
            <p className="p-8 text-sm text-muted-foreground">Aucun pointage pour ce job.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-orange-100 bg-orange-50/50 text-left dark:border-orange-900 dark:bg-orange-950/20">
                    <th className="px-4 py-3 font-semibold">Travailleur</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Entrée</th>
                    <th className="px-4 py-3 font-semibold">Sortie</th>
                    <th className="px-4 py-3 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-100 dark:divide-orange-900/50">
                  {attendance.map((row) => (
                    <tr key={row._id} className="hover:bg-orange-50/30 dark:hover:bg-orange-950/20">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4 text-orange-500" />
                          {resourceLabel(row.resourceId)}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {new Date(row.date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">{row.checkIn ?? "—"}</td>
                      <td className="px-4 py-3">{row.checkOut ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            row.status === "present"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                              : "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {row.status === "present" ? "Présent" : "Absent"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}