import { useCallback, useEffect, useState } from "react";
import {
  fetchJobProgress,
  updateJobProgress,
  type JobProgressStepPayload,
  type JobProgressResponse,
} from "@/lib/jobProgressApi";

function stepsToPayload(steps: JobProgressStepPayload[]): JobProgressStepPayload[] {
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

export function useJobProgress(jobId: string | undefined) {
  const [data, setData] = useState<JobProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchJobProgress(jobId);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load progress");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStepsLocal = useCallback((steps: JobProgressStepPayload[]) => {
    const total = steps.length;
    const completed = steps.filter((s) => s.completed).length;
    const percentage = total ? Math.round((completed / total) * 100) : 0;
    setData({ steps: stepsToPayload(steps), percentage });
  }, []);

  const persistSteps = useCallback(
    async (steps: JobProgressStepPayload[]) => {
      if (!jobId) return;
      setSaving(true);
      setError(null);
      try {
        const res = await updateJobProgress(jobId, stepsToPayload(steps));
        setData(res);
        return res;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to save";
        setError(msg);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [jobId]
  );

  return {
    steps: data?.steps ?? [],
    percentage: data?.percentage ?? 0,
    loading,
    error,
    saving,
    reload: load,
    setStepsLocal,
    persistSteps,
  };
}
