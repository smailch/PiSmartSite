import axios, { type AxiosError } from "axios";
import { getApiBaseUrl, getApiRootAbsoluteUrl } from "./api";

const client = axios.create({
  baseURL: getApiBaseUrl(),
});

if (typeof window !== "undefined") {
  client.interceptors.request.use((config) => {
    const t = localStorage.getItem("token");
    if (t) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>)["Authorization"] = `Bearer ${t}`;
    }
    return config;
  });
}

export type AiAnalysisPayload = {
  dangerLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  detectedObjects: string[];
  safetyStatus: { helmet: boolean; vest: boolean };
  message: string;
};

export type JobProgressStepPayload = {
  step: string;
  completed: boolean;
  date?: string;
  photoUrl?: string;
  aiAnalysis?: AiAnalysisPayload;
};

export type JobProgressResponse = {
  steps: JobProgressStepPayload[];
  percentage: number;
};

function normalizeAiAnalysis(raw: Partial<AiAnalysisPayload> | undefined): AiAnalysisPayload {
  const level = raw?.dangerLevel;
  const valid =
    level === "LOW" ||
    level === "MEDIUM" ||
    level === "HIGH" ||
    level === "CRITICAL";
  return {
    dangerLevel: valid ? level : "LOW",
    detectedObjects: Array.isArray(raw?.detectedObjects) ? raw.detectedObjects : [],
    safetyStatus: {
      helmet: Boolean(raw?.safetyStatus?.helmet),
      vest: Boolean(raw?.safetyStatus?.vest),
    },
    message: typeof raw?.message === "string" ? raw.message : "",
  };
}

function formatAxiosError(err: unknown): string {
  const ax = err as AxiosError<{ message?: string | string[] }>;
  const data = ax.response?.data;
  if (data && typeof data === "object" && "message" in data) {
    const m = data.message;
    if (Array.isArray(m)) return m.filter(Boolean).join(" · ");
    if (typeof m === "string" && m.length) return m;
  }
  if (ax.message) return ax.message;
  return "Request failed";
}

export async function fetchJobProgress(jobId: string): Promise<JobProgressResponse> {
  try {
    const { data } = await client.get<JobProgressResponse>(`/jobs/${jobId}/progress`);
    const steps = Array.isArray(data?.steps) ? data.steps : [];
    return {
      steps: steps.map((s) => ({
        ...s,
        ...(s.aiAnalysis ? { aiAnalysis: normalizeAiAnalysis(s.aiAnalysis) } : {}),
      })),
      percentage: typeof data?.percentage === "number" ? data.percentage : 0,
    };
  } catch (e) {
    throw new Error(formatAxiosError(e));
  }
}

export async function updateJobProgress(
  jobId: string,
  steps: JobProgressStepPayload[]
): Promise<JobProgressResponse> {
  try {
    const { data } = await client.put<JobProgressResponse>(`/jobs/${jobId}/progress`, {
      steps,
    });
    const out = Array.isArray(data?.steps) ? data.steps : [];
    return {
      steps: out.map((s) => ({
        ...s,
        ...(s.aiAnalysis ? { aiAnalysis: normalizeAiAnalysis(s.aiAnalysis) } : {}),
      })),
      percentage: typeof data?.percentage === "number" ? data.percentage : 0,
    };
  } catch (e) {
    throw new Error(formatAxiosError(e));
  }
}

export type UploadProgressPhotoResponse = {
  photoUrl: string;
  aiAnalysis: AiAnalysisPayload;
};

export async function uploadProgressPhoto(
  jobId: string,
  stepIndex: number,
  file: File,
  options?: { onUploadProgress?: (percent: number) => void }
): Promise<UploadProgressPhotoResponse> {
  try {
    const form = new FormData();
    form.append("file", file);
    const onProgress = options?.onUploadProgress;
    const { data } = await client.post<Partial<UploadProgressPhotoResponse> & { photoUrl?: string }>(
      `/jobs/${jobId}/progress/photo`,
      form,
      {
        params: { stepIndex },
        onUploadProgress: (ev) => {
          if (!onProgress) return;
          const total = ev.total;
          if (total && total > 0) {
            onProgress(Math.min(100, Math.round((ev.loaded / total) * 100)));
          }
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );
    onProgress?.(100);
    if (!data?.photoUrl) throw new Error("No photo URL returned");
    return {
      photoUrl: data.photoUrl,
      aiAnalysis: normalizeAiAnalysis(data.aiAnalysis),
    };
  } catch (e) {
    throw new Error(formatAxiosError(e));
  }
}

export async function deleteProgressPhoto(
  jobId: string,
  stepIndex: number
): Promise<JobProgressResponse> {
  try {
    const { data } = await client.delete<JobProgressResponse>(
      `/jobs/${jobId}/progress/photo`,
      { params: { stepIndex } }
    );
    const steps = Array.isArray(data?.steps) ? data.steps : [];
    return {
      steps: steps.map((s) => ({
        ...s,
        ...(s.aiAnalysis ? { aiAnalysis: normalizeAiAnalysis(s.aiAnalysis) } : {}),
      })),
      percentage: typeof data?.percentage === "number" ? data.percentage : 0,
    };
  } catch (e) {
    throw new Error(formatAxiosError(e));
  }
}

/** Build URL for <img> — normalise les URLs absolues du backend (port 3200) vers le proxy / même origine. */
export function resolveProgressPhotoUrl(photoUrl: string | undefined): string | undefined {
  if (!photoUrl) return undefined;
  if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
    const idx = photoUrl.indexOf("/uploads/");
    if (idx >= 0) {
      const path = photoUrl.slice(idx);
      const root = getApiRootAbsoluteUrl();
      if (root) return `${root.replace(/\/$/, "")}${path}`;
    }
    return photoUrl;
  }
  const base = getApiBaseUrl();
  if (base.startsWith("http")) {
    return `${base.replace(/\/$/, "")}${photoUrl.startsWith("/") ? "" : "/"}${photoUrl}`;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin.replace(/\/$/, "")}${base.replace(/\/$/, "")}${photoUrl.startsWith("/") ? "" : "/"}${photoUrl}`;
  }
  return `${base}${photoUrl.startsWith("/") ? "" : "/"}${photoUrl}`;
}
