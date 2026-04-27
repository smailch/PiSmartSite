"use client";

import { useCallback, useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Calendar,
  Trash2,
  Upload,
  Shield,
  Filter,
} from "lucide-react";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import { useJobProgress } from "@/hooks/useJobProgress";
import {
  uploadProgressPhoto,
  deleteProgressPhoto,
  resolveProgressPhotoUrl,
  type JobProgressStepPayload,
} from "@/lib/jobProgressApi";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler
);

/** PiSmartSite brand (aligné sur globals.css) */
const PRIMARY = "#0b4f6c";
const ACCENT = "#f28c28";
const CHART_TICK = "#94a3b8";

type StepFilter = "all" | "dangerous" | "safe";

function isDangerousLevel(level: string | undefined): boolean {
  return level === "MEDIUM" || level === "HIGH" || level === "CRITICAL";
}

function dangerBadgeClass(level: string | undefined): string {
  switch (level) {
    case "CRITICAL":
      return "border border-red-500/40 bg-red-500/15 text-red-200";
    case "HIGH":
      return "border border-orange-500/40 bg-orange-500/15 text-orange-200";
    case "MEDIUM":
      return "border border-amber-500/40 bg-amber-500/20 text-amber-100";
    case "LOW":
      return "border border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
    default:
      return "border border-border bg-muted text-muted-foreground";
  }
}

function toStepsPayload(steps: JobProgressStepPayload[]): JobProgressStepPayload[] {
  return steps.map((s) => ({
    step: s.step,
    completed: s.completed,
    ...(s.date ? { date: s.date } : {}),
    ...(s.photoUrl ? { photoUrl: s.photoUrl } : {}),
    ...(s.aiAnalysis
      ? {
          aiAnalysis: {
            dangerLevel: s.aiAnalysis.dangerLevel,
            detectedObjects: [...s.aiAnalysis.detectedObjects],
            safetyStatus: {
              helmet: s.aiAnalysis.safetyStatus.helmet,
              vest: s.aiAnalysis.safetyStatus.vest,
            },
            message: s.aiAnalysis.message,
          },
        }
      : {}),
  }));
}

function CircularProgress({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg className="-rotate-90 h-36 w-36" viewBox="0 0 120 120" aria-hidden>
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-primary/25"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={PRIMARY}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ color: PRIMARY }}
        >
          {value}%
        </span>
        <span className="text-xs font-medium text-muted-foreground">done</span>
      </div>
    </div>
  );
}

export default function JobProgressPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : undefined;

  const {
    steps,
    percentage,
    loading,
    error,
    saving,
    reload,
    setStepsLocal,
    persistSteps,
  } = useJobProgress(id);

  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  /** 0–100 during multipart upload to the API (XHR progress). */
  const [uploadSendPercent, setUploadSendPercent] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [stepFilter, setStepFilter] = useState<StepFilter>("all");

  const safeSteps = Array.isArray(steps) ? steps : [];
  const totalSteps = safeSteps.length;
  const completedCount = safeSteps.filter((s) => s.completed).length;
  const remaining = Math.max(0, totalSteps - completedCount);

  const entriesToRender = useMemo(() => {
    const mapped = safeSteps.map((step, idx) => ({ step, idx }));
    if (stepFilter === "all") return mapped;
    return mapped.filter(({ step }) => {
      const ai = step.aiAnalysis;
      const hasPhoto = Boolean(step.photoUrl);
      if (!hasPhoto || !ai) return false;
      if (stepFilter === "dangerous") return isDangerousLevel(ai.dangerLevel);
      if (stepFilter === "safe") return ai.dangerLevel === "LOW";
      return true;
    });
  }, [safeSteps, stepFilter]);

  const chartData = useMemo(() => {
    const n = safeSteps.length || 1;
    const cumulative = safeSteps.map((_, i) => {
      const slice = safeSteps.slice(0, i + 1);
      const done = slice.filter((s) => s.completed).length;
      return Math.round((done / n) * 100);
    });
    const labels = safeSteps.map((s, i) => {
      if (s.date) {
        try {
          return new Date(s.date).toLocaleDateString("en-US", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
        } catch {
          return s.step || `Step ${i + 1}`;
        }
      }
      return s.step || `Step ${i + 1}`;
    });

    return {
      labels,
      datasets: [
        {
          label: "Cumulative progress (%)",
          data: cumulative,
          fill: true,
          borderColor: ACCENT,
          backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D } }) => {
            const ctx = context.chart.ctx;
            const g = ctx.createLinearGradient(0, 0, 0, 280);
            g.addColorStop(0, "rgba(242, 140, 40, 0.4)");
            g.addColorStop(1, "rgba(242, 140, 40, 0)");
            return g;
          },
          tension: 0.45,
          pointRadius: 4,
          pointBackgroundColor: ACCENT,
          pointBorderColor: "#1e293b",
        },
      ],
    };
  }, [safeSteps]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title(items: { label: string }[]) {
              return items[0]?.label ?? "";
            },
            label(ctx: { parsed: { y: number } }) {
              return ` ${ctx.parsed.y}% complete`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 45, minRotation: 0, color: CHART_TICK },
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            color: CHART_TICK,
            callback: (value: number | string) => `${value}%`,
          },
        },
      },
    }),
    []
  );

  const toggleStep = useCallback(
    async (index: number) => {
      if (!id) return;
      const next = [...safeSteps];
      if (!next[index]) return;
      const completed = !next[index].completed;
      next[index] = {
        ...next[index],
        completed,
        date: completed
          ? new Date().toISOString()
          : next[index].date ?? new Date().toISOString(),
      };
      setStepsLocal(toStepsPayload(next));
      try {
        await persistSteps(toStepsPayload(next));
        toast.success("Step updated");
      } catch {
        toast.error("Could not save");
        await reload();
      }
    },
    [id, safeSteps, setStepsLocal, persistSteps, reload]
  );

  const processFile = useCallback(
    async (index: number, file: File | undefined) => {
      if (!file || !id || !file.type.startsWith("image/")) {
        if (file) toast.error("Please choose an image file");
        return;
      }
      setUploadingIndex(index);
      setUploadSendPercent(0);
      try {
        const res = await uploadProgressPhoto(id, index, file, {
          onUploadProgress: (pct) => setUploadSendPercent(pct),
        });
        const next = [...safeSteps];
        next[index] = {
          ...next[index],
          photoUrl: res.photoUrl,
          aiAnalysis: res.aiAnalysis,
        };
        setStepsLocal(toStepsPayload(next));
        await persistSteps(toStepsPayload(next));
        toast.success("Photo saved", {
          description: res.aiAnalysis?.message,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploadingIndex(null);
        setUploadSendPercent(null);
      }
    },
    [id, safeSteps, setStepsLocal, persistSteps]
  );

  const handlePhotoInput = useCallback(
    (index: number, e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      void processFile(index, file);
    },
    [processFile]
  );

  const onDrop = useCallback(
    (index: number, e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragIndex(null);
      const file = e.dataTransfer.files?.[0];
      void processFile(index, file);
    },
    [processFile]
  );

  const removePhoto = useCallback(
    async (index: number) => {
      if (!id) return;
      try {
        const res = await deleteProgressPhoto(id, index);
        setStepsLocal(toStepsPayload(res.steps));
        toast.success("Photo removed");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete");
      }
    },
    [id, setStepsLocal]
  );

  const handleSaveAll = useCallback(async () => {
    try {
      await persistSteps(toStepsPayload(safeSteps));
      toast.success("Changes saved");
    } catch {
      toast.error("Save failed");
    }
  }, [safeSteps, persistSteps]);

  const showFilteredEmpty =
    stepFilter !== "all" && entriesToRender.length === 0 && safeSteps.length > 0;

  return (
    <MainLayout>
      <PageHeader
        title="Job Progress"
        description={
          id
            ? `Safety-aware tracking · job ${id.slice(0, 8)}…`
            : "Track steps, photos, and AI safety checks"
        }
      />

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-16 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <p className="text-sm text-muted-foreground">Loading progress…</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8">
          <p className="font-medium text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:brightness-110"
          >
            Retry
          </button>
        </div>
      ) : !safeSteps.length ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/50 p-16 text-center">
          <p className="text-muted-foreground">No steps available.</p>
        </div>
      ) : (
        <div className="mx-auto max-w-6xl space-y-8 pb-12 text-foreground">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-primary">
                Overview
              </h2>
              <p className="text-sm text-muted-foreground">
                Global stats, AI safety analysis (helmet & vest), and milestones.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleSaveAll()}
              disabled={saving}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition-all duration-200 hover:brightness-110 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Completion", value: `${percentage}%`, sub: "overall" },
              { label: "Total steps", value: String(totalSteps), sub: "milestones" },
              { label: "Completed", value: String(completedCount), sub: "done" },
              { label: "Remaining", value: String(remaining), sub: "left" },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:border-primary/30"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-primary">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
                  {card.value}
                </p>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_minmax(200px,280px)] lg:items-start">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-primary">
                Progress bar
              </h3>
              <div
                className="h-4 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: `${PRIMARY}18` }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${percentage}%`,
                    background: `linear-gradient(90deg, ${PRIMARY}, ${ACCENT})`,
                  }}
                />
              </div>
              <p className="mt-2 text-right text-xs font-medium text-muted-foreground">
                {percentage}% complete
              </p>
            </div>
            <div className="flex justify-center rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 p-6 shadow-sm">
              <CircularProgress value={percentage} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
              <Shield className="h-4 w-4 text-accent" />
              Cumulative progress (%)
            </h3>
            <div className="h-72 md:h-80">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-primary">
              Steps
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                Filter:
              </span>
              {(
                [
                  ["all", "All steps"],
                  ["dangerous", "Dangerous only"],
                  ["safe", "Safe only"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStepFilter(value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    stepFilter === value
                      ? "border-primary/50 bg-primary/20 text-foreground"
                      : "border-border bg-transparent text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {showFilteredEmpty && (
            <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              No steps match this filter. Try &quot;All steps&quot; or upload photos for AI analysis.
            </p>
          )}

          <ul className="space-y-5">
            {entriesToRender.map(({ step, idx: i }) => {
              return (
                <li
                  key={`${step.step}-${i}-${step.date ?? ""}`}
                  className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:border-primary/25"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                    <button
                      type="button"
                      onClick={() => void toggleStep(i)}
                      disabled={saving}
                      className="flex flex-1 items-start gap-4 text-left"
                    >
                      <span className="mt-0.5 shrink-0 transition group-hover:scale-110">
                        {step.completed ? (
                          <CheckCircle2 className="h-8 w-8 text-accent" />
                        ) : (
                          <Circle className="h-8 w-8 text-primary opacity-50" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block text-lg font-semibold ${
                            step.completed
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                          }`}
                        >
                          {step.step}
                        </span>
                        {step.date && (
                          <span className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(step.date).toLocaleString("en-US", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        )}
                      </span>
                    </button>

                    <div className="flex w-full flex-col gap-4 lg:max-w-md">
                      {step.photoUrl && step.aiAnalysis && (
                        <div
                          className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${dangerBadgeClass(step.aiAnalysis.dangerLevel)}`}
                        >
                          <div className="flex items-center gap-2 font-bold">
                            <Shield className="h-4 w-4 shrink-0" />
                            Danger: {step.aiAnalysis.dangerLevel}
                          </div>
                          <div className="mt-3 grid gap-1 text-sm font-medium">
                            <p>
                              Helmet:{" "}
                              {step.aiAnalysis.safetyStatus.helmet ? "✅" : "❌"}
                            </p>
                            <p>
                              Vest:{" "}
                              {step.aiAnalysis.safetyStatus.vest ? "✅" : "❌"}
                            </p>
                            <p className="mt-1 text-xs font-normal opacity-95">
                              {step.aiAnalysis.message}
                            </p>
                          </div>
                        </div>
                      )}

                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragIndex(i);
                        }}
                        onDragLeave={() => setDragIndex(null)}
                        onDrop={(e) => onDrop(i, e)}
                        className={`relative flex min-h-[140px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary/[0.04] px-4 py-6 transition dark:bg-primary/[0.08] ${
                          dragIndex === i ? "border-accent bg-accent/10" : ""
                        }`}
                      >
                        {step.photoUrl ? (
                          <div className="relative mx-auto h-48 w-full max-w-xs">
                            <Image
                              src={resolveProgressPhotoUrl(step.photoUrl)}
                              alt="Step evidence"
                              fill
                              className="rounded-lg border border-border object-contain shadow-md"
                              sizes="320px"
                            />
                            <button
                              type="button"
                              onClick={() => void removePhoto(i)}
                              className="absolute right-2 top-2 rounded-lg bg-destructive p-2 text-destructive-foreground shadow-md transition hover:brightness-110"
                              aria-label="Delete photo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-center">
                            <Upload className="h-8 w-8 text-accent" />
                            <p className="text-sm text-muted-foreground">
                              Drag & drop an image or browse
                            </p>
                          </div>
                        )}
                        {uploadingIndex === i && uploadSendPercent !== null && (
                          <div className="mt-3 w-full max-w-xs space-y-1.5">
                            <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                              <span>Envoi du fichier</span>
                              <span className="tabular-nums text-foreground">{uploadSendPercent}%</span>
                            </div>
                            <div
                              className="h-2 w-full overflow-hidden rounded-full bg-muted"
                              role="progressbar"
                              aria-valuenow={uploadSendPercent}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            >
                              <div
                                className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                                style={{ width: `${uploadSendPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <label className="mt-3 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingIndex === i || saving}
                            onChange={(e) => handlePhotoInput(i, e)}
                          />
                          <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow transition hover:brightness-110">
                            {uploadingIndex === i
                              ? uploadSendPercent !== null && uploadSendPercent < 100
                                ? `Envoi… ${uploadSendPercent}%`
                                : "Traitement…"
                              : "Choose file"}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </MainLayout>
  );
}
