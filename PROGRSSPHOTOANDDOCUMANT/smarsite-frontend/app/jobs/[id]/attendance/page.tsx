"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import { CalendarClock, ClipboardList, FileInput, Loader2, Save, Sparkles, User } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import { fetcher, getJobKey } from "@/lib/api";
import {
  createAttendance,
  fetchAttendanceAiAnalysis,
  fetchAttendanceByJob,
  queuePrimeTop3ForInvoice,
  type AttendanceAiAnalysisResponse,
  type AttendanceRecord,
  type PrimeInvoiceQueueTop3Response,
} from "@/lib/attendanceApi";
import { PRIME_PAYOUTS_SWR_KEY } from "@/lib/financePrimesApi";
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

function currentYearMonthLocal() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
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
    if (o._id) return `Worker …${String(o._id).slice(-6)}`;
  }
  const id = String(resourceId);
  if (id.length === 24 && /^[0-9a-f]{24}$/i.test(id)) {
    return `Worker …${id.slice(-6)}`;
  }
  return id;
}

export default function JobAttendancePage() {
  const params = useParams();
  const { mutate: globalMutate } = useSWRConfig();
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
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AttendanceAiAnalysisResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [primeYear, setPrimeYear] = useState(() => currentYearMonthLocal().year);
  const [primeMonth, setPrimeMonth] = useState(() => currentYearMonthLocal().month);
  const [invoiceQueueLoading, setInvoiceQueueLoading] = useState(false);
  const [invoiceQueueResult, setInvoiceQueueResult] = useState<PrimeInvoiceQueueTop3Response | null>(null);
  const [invoiceQueueError, setInvoiceQueueError] = useState<string | null>(null);

  async function runAiAnalysis() {
    if (!jobId) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const data = await fetchAttendanceAiAnalysis(jobId, { year: primeYear, month: primeMonth });
      setAiResult(data);
      toast.success("Analysis ready");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setAiError(msg);
      toast.error(msg);
    } finally {
      setAiLoading(false);
    }
  }

  async function runSendToInvoice() {
    if (!jobId) return;
    setInvoiceQueueLoading(true);
    setInvoiceQueueError(null);
    setInvoiceQueueResult(null);
    try {
      const data = await queuePrimeTop3ForInvoice(jobId, { year: primeYear, month: primeMonth });
      setInvoiceQueueResult(data);
      const ok = data.results.filter((r) => r.status === "queued").length;
      if (ok > 0) {
        const fin = data.financeEntriesRecorded ?? 0;
        toast.success(
          fin > 0
            ? `${fin} ligne(s) envoyée(s) vers la facturation · les SMS partiront au traitement`
            : "Envoyé vers la facturation"
        );
        await globalMutate(PRIME_PAYOUTS_SWR_KEY);
      } else {
        const firstDetail = data.results.find((r) => r.status === "skipped")?.detail;
        toast.error(firstDetail ?? "Aucune ligne créée.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setInvoiceQueueError(msg);
      toast.error(msg);
    } finally {
      setInvoiceQueueLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobId || !form.resourceId) {
      toast.error("Select a worker");
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
      toast.success("Attendance saved");
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
        title="Attendance"
        description={
          job
            ? `Attendance for job: ${job.title}`
            : "Team attendance tracking"
        }
      />

      {jobError && (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Could not load job. Check the API ({String(jobError)}).
        </div>
      )}

      <div className="mx-auto max-w-5xl space-y-8 text-foreground">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/20">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <CalendarClock className="h-5 w-5 text-accent" />
            Log attendance
          </h2>
          {loading && !job ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : humanAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No human resources assigned to this job. Assign workers from the job editor.
            </p>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-foreground">Worker</span>
                <select
                  required
                  value={form.resourceId}
                  onChange={(e) => setForm((f) => ({ ...f, resourceId: e.target.value }))}
                  className="rounded-xl border border-border bg-input px-3 py-2 text-foreground"
                >
                  <option value="">— Select —</option>
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
                <span className="font-medium text-foreground">Date</span>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="rounded-xl border border-border bg-input px-3 py-2 text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-foreground">Status</span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as "present" | "absent",
                    }))
                  }
                  className="rounded-xl border border-border bg-input px-3 py-2 text-foreground"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                </select>
              </label>
              {form.status === "present" && (
                <>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-foreground">Check-in</span>
                    <input
                      type="time"
                      value={form.checkIn}
                      onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
                      className="rounded-xl border border-border bg-input px-3 py-2 text-foreground"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-foreground">Check-out</span>
                    <input
                      type="time"
                      value={form.checkOut}
                      onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                      className="rounded-xl border border-border bg-input px-3 py-2 text-foreground"
                    />
                  </label>
                </>
              )}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-lg shadow-black/20 hover:brightness-110 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/20">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Sparkles className="h-5 w-5 text-accent" />
                Monthly bonuses (points & DT)
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Monthly scale: working days, points out of 30, bonus per SmartSite rules.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-foreground">Year</span>
                <input
                  type="number"
                  min={2020}
                  max={2100}
                  value={primeYear}
                  onChange={(e) => setPrimeYear(Number(e.target.value) || primeYear)}
                  className="w-28 rounded-xl border border-border bg-input px-3 py-2 text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-foreground">Month</span>
                <select
                  value={primeMonth}
                  onChange={(e) => setPrimeMonth(Number(e.target.value))}
                  className="min-w-[140px] rounded-xl border border-border bg-input px-3 py-2 text-foreground"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "long" })}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={aiLoading || attLoading || !jobId || attendance.length === 0}
                onClick={() => void runAiAnalysis()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent/20 disabled:pointer-events-none disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Analyze
              </button>
              {aiResult ? (
                <button
                  type="button"
                  disabled={
                    invoiceQueueLoading ||
                    attLoading ||
                    !jobId ||
                    attendance.length === 0
                  }
                  onClick={() => void runSendToInvoice()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-sky-500/20 disabled:pointer-events-none disabled:opacity-50"
                >
                  {invoiceQueueLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileInput className="h-4 w-4" />
                  )}
                  Send to invoice
                </button>
              ) : null}
            </div>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Après <strong className="font-medium text-foreground">Analyze</strong>, le bouton{" "}
            <strong className="font-medium text-foreground">Send to invoice</strong> envoie les 3 meilleures primes vers l’écran
            Facturation. Le financier clique sur <strong className="font-medium text-foreground">Traiter</strong> : l’SMS est
            envoyé à ce moment-là.
          </p>
          {attendance.length === 0 && !attLoading && (
            <p className="text-sm text-muted-foreground">Save at least one attendance record to run analysis.</p>
          )}
          {invoiceQueueError && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {invoiceQueueError}
            </div>
          )}
          {invoiceQueueResult && (
            <div className="mb-4 space-y-2 rounded-xl border border-sky-500/25 bg-sky-500/5 p-4 text-sm">
              <p className="font-medium text-foreground">
                Facturation — {invoiceQueueResult.mois}/{invoiceQueueResult.annee} · {invoiceQueueResult.jobTitle}
              </p>
              {(invoiceQueueResult.financeEntriesRecorded ?? 0) > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {invoiceQueueResult.financeEntriesRecorded} ligne(s) en attente de traitement (SMS au clic Traiter).
                </p>
              ) : null}
              <ul className="space-y-1">
                {invoiceQueueResult.results.map((r) => (
                  <li key={r.resourceId} className="flex flex-wrap items-center gap-2 text-foreground">
                    <span className="font-medium">{r.displayName}</span>
                    <span className="text-muted-foreground">
                      {r.primeDt} DT · {r.pointsMensuel} pts
                    </span>
                    <span
                      className={
                        r.status === "queued"
                          ? "rounded-full bg-sky-500/20 px-2 py-0.5 text-xs text-sky-100"
                          : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      }
                    >
                      {r.status === "queued"
                        ? "Queued for finance"
                        : `Skipped${r.detail ? ` — ${r.detail}` : ""}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {aiError && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {aiError}
            </div>
          )}
          {aiResult && (
            <div className="space-y-4 text-sm">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Summary — {aiResult.jobTitle} · {aiResult.mois}/{aiResult.annee}
                </p>
                <p className="mt-2 text-foreground">{aiResult.analysis.summary}</p>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-foreground">
                      <th className="px-3 py-2 font-semibold">Worker</th>
                      <th className="px-3 py-2 font-semibold">Points</th>
                      <th className="px-3 py-2 font-semibold">Bonus</th>
                      <th className="px-3 py-2 font-semibold">Comment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {aiResult.analysis.travailleurs.map((t) => (
                      <tr key={t.resourceId} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium text-foreground">{t.nomAffiche}</td>
                        <td className="px-3 py-2 tabular-nums">{t.scorePerformance}/30</td>
                        <td className="px-3 py-2 tabular-nums">
                          {t.montantPrimeSuggere != null ? `${t.montantPrimeSuggere} DT` : "—"}
                        </td>
                        <td className="max-w-md px-3 py-2 text-muted-foreground">
                          {t.justification}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card shadow-lg shadow-black/20">
          <h2 className="flex items-center gap-2 border-b border-border px-6 py-4 text-lg font-semibold text-foreground">
            <ClipboardList className="h-5 w-5 text-accent" />
            History
          </h2>
          {attLoading ? (
            <div className="flex items-center gap-2 p-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : attendance.length === 0 ? (
            <p className="p-8 text-sm text-muted-foreground">No attendance for this job.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-foreground">
                    <th className="px-4 py-3 font-semibold">Worker</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Check-in</th>
                    <th className="px-4 py-3 font-semibold">Check-out</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {attendance.map((row) => (
                    <tr key={row._id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4 text-accent" />
                          {resourceLabel(row.resourceId)}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {new Date(row.date).toLocaleDateString("en-US")}
                      </td>
                      <td className="px-4 py-3">{row.checkIn ?? "—"}</td>
                      <td className="px-4 py-3">{row.checkOut ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            row.status === "present"
                              ? "border border-emerald-500/35 bg-emerald-500/15 text-emerald-200"
                              : "border border-border bg-muted text-muted-foreground"
                          }`}
                        >
                          {row.status === "present" ? "Present" : "Absent"}
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