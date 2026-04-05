"use client";

import { useCallback, useMemo, useState, type ChangeEvent, type DragEvent } from "react";
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

/** SmartSite palette */
const PRIMARY = "#0b4f6c";
const ACCENT = "#f28c28";

type StepFilter = "all" | "dangerous" | "safe";

function isDangerousLevel(level: string | undefined): boolean {
  return level === "MEDIUM" || level === "HIGH" || level === "CRITICAL";
}

function dangerBadgeClass(level: string | undefined): string {
  switch (level) {
    case "CRITICAL":
      return "bg-[#7f1d1d] text-white border-[#991b1b]";
    case "HIGH":
      return "bg-red-600 text-white border-red-700";
    case "MEDIUM":
      return "text-white border-[#f28c28]";
    case "LOW":
      return "bg-emerald-600 text-white border-emerald-700";
    default:
      return "bg-gray-500 text-white border-gray-600";
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
          className="text-[#0b4f6c]/15"
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
          pointBorderColor: "#fff",
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
          ticks: { maxRotation: 45, minRotation: 0, color: PRIMARY },
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
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
      try {
        const res = await uploadProgressPhoto(id, index, file);
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
        <div
          className="rounded-2xl border p-16 shadow-lg bg-white dark:bg-gray-900/80"
          style={{ borderColor: `${PRIMARY}33` }}
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
              style={{ borderColor: `${PRIMARY}66`, borderTopColor: "transparent" }}
            />
            <p className="text-sm text-muted-foreground">Loading progress…</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-8 dark:border-red-900 dark:bg-red-950/40">
          <p className="font-medium text-red-800 dark:text-red-200">{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow"
            style={{ backgroundColor: PRIMARY }}
          >
            Retry
          </button>
        </div>
      ) : !safeSteps.length ? (
        <div
          className="rounded-2xl border border-dashed p-16 text-center"
          style={{ borderColor: `${PRIMARY}44` }}
        >
          <p className="text-muted-foreground">No steps available.</p>
        </div>
      ) : (
        <div className="mx-auto max-w-6xl space-y-8 pb-12">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2
                className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-50"
                style={{ color: PRIMARY }}
              >
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
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 100%)`,
              }}
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
                className="rounded-2xl border bg-white p-5 shadow-md transition hover:shadow-lg dark:bg-gray-900/90"
                style={{ borderColor: `${PRIMARY}22` }}
              >
                <p
                  className="text-xs font-medium uppercase tracking-wider opacity-90"
                  style={{ color: PRIMARY }}
                >
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
                  {card.value}
                </p>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_minmax(200px,280px)] lg:items-start">
            <div
              className="rounded-2xl border bg-white p-6 shadow-xl dark:bg-gray-900/90"
              style={{ borderColor: `${PRIMARY}22` }}
            >
              <h3 className="mb-4 text-sm font-semibold" style={{ color: PRIMARY }}>
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
            <div
              className="flex justify-center rounded-2xl border bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg dark:from-gray-900 dark:to-slate-900/80"
              style={{ borderColor: `${PRIMARY}22` }}
            >
              <CircularProgress value={percentage} />
            </div>
          </div>

          <div
            className="rounded-2xl border bg-white p-6 shadow-xl dark:bg-gray-900/90"
            style={{ borderColor: `${PRIMARY}22` }}
          >
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: PRIMARY }}>
              <Shield className="h-4 w-4" style={{ color: ACCENT }} />
              Cumulative progress (%)
            </h3>
            <div className="h-72 md:h-80">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100" style={{ color: PRIMARY }}>
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
                  className="rounded-full border px-3 py-1 text-xs font-semibold transition"
                  style={{
                    borderColor: stepFilter === value ? ACCENT : `${PRIMARY}33`,
                    backgroundColor: stepFilter === value ? `${ACCENT}22` : "transparent",
                    color: stepFilter === value ? PRIMARY : "inherit",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {showFilteredEmpty && (
            <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground" style={{ borderColor: `${PRIMARY}44` }}>
              No steps match this filter. Try &quot;All steps&quot; or upload photos for AI analysis.
            </p>
          )}

          <ul className="space-y-5">
            {entriesToRender.map(({ step, idx: i }) => {
              return (
                <li
                  key={`${step.step}-${i}-${step.date ?? ""}`}
                  className="group rounded-2xl border bg-white p-5 shadow-md transition hover:shadow-xl dark:bg-gray-900/95"
                  style={{ borderColor: `${PRIMARY}18` }}
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
                          <CheckCircle2 className="h-8 w-8" style={{ color: ACCENT }} />
                        ) : (
                          <Circle className="h-8 w-8 opacity-40" style={{ color: PRIMARY }} />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block text-lg font-semibold ${
                            step.completed
                              ? "text-muted-foreground line-through"
                              : "text-gray-900 dark:text-gray-50"
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
                          style={
                            step.aiAnalysis.dangerLevel === "MEDIUM"
                              ? { backgroundColor: ACCENT, borderColor: ACCENT }
                              : undefined
                          }
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
                        className={`relative flex min-h-[140px] flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 transition ${
                          dragIndex === i ? "bg-orange-50 dark:bg-orange-950/30" : ""
                        }`}
                        style={{
                          borderColor:
                            dragIndex === i ? ACCENT : `${PRIMARY}33`,
                          backgroundColor: dragIndex === i ? undefined : `${PRIMARY}06`,
                        }}
                      >
                        {step.photoUrl ? (
                          <div className="relative w-full max-w-xs">
                            <img
                              src={resolveProgressPhotoUrl(step.photoUrl)}
                              alt="Step evidence"
                              className="mx-auto max-h-48 w-auto rounded-lg border object-contain shadow-md"
                              style={{ borderColor: `${PRIMARY}22` }}
                            />
                            <button
                              type="button"
                              onClick={() => void removePhoto(i)}
                              className="absolute right-2 top-2 rounded-lg bg-red-600 p-2 text-white shadow-md transition hover:bg-red-700"
                              aria-label="Delete photo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-center">
                            <Upload className="h-8 w-8" style={{ color: ACCENT }} />
                            <p className="text-sm text-muted-foreground">
                              Drag & drop an image or browse
                            </p>
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
                          <span
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow"
                            style={{ backgroundColor: PRIMARY }}
                          >
                            {uploadingIndex === i ? "Uploading…" : "Choose file"}
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
