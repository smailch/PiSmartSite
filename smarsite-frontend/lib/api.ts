import type {
  Resource,
  CreateResourcePayload,
  UpdateResourcePayload,
  Job,
  CreateJobPayload,
  UpdateJobPayload,
  Project,
  ProjectAiInsightsResponse,
  ProjectAssistantChatResponse,
  ProjectAssistantInitialReportResponse,
  BackendTask,
  BackendUser,
  ClientAccount,
  Human,
  Equipment,
} from "./types";

import { ApiError } from "./types";

/** NestJS / class-validator messages: string | string[] */
function formatBackendMessage(info: unknown, status: number): string {
  if (info && typeof info === "object" && "message" in info) {
    const m = (info as { message: unknown }).message;
    if (Array.isArray(m)) return m.filter(Boolean).join(" · ");
    if (typeof m === "string" && m.length) return m;
  }
  return `Request failed with status ${status}`;
}

/**
 * Resolves the backend URL without breaking module import (SSR / build).
 * - Si `NEXT_PUBLIC_API_URL` est défini : utilisé tel quel (ex. http://127.0.0.1:3200 ou URL de prod).
 * - Sinon en **développement** : préfixe `/api-backend` (proxy défini dans `next.config.mjs` vers le port 3200),
 *   pour éviter les appels cross-origin et les « Failed to fetch » (CORS / localhost vs 127.0.0.1 / pare-feu).
 * - En **production** : `NEXT_PUBLIC_API_URL` est obligatoire (build déployé hors proxy).
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  if (raw) return raw;
  if (process.env.NODE_ENV !== "production") {
    return "/api-backend";
  }
  throw new Error(
    "NEXT_PUBLIC_API_URL is required in production. Copy .env.example to .env.local.",
  );
}

/**
 * Base URL absolue du backend pour `<img src>` (ex. `/uploads/...` derrière le proxy en dev).
 */
export function getApiRootAbsoluteUrl(): string {
  const b = getApiBaseUrl();
  if (b.startsWith("http")) {
    return b.replace(/\/$/, "");
  }
  if (typeof window === "undefined") {
    return "";
  }
  return `${window.location.origin.replace(/\/$/, "")}${b}`.replace(/\/$/, "");
}

/** Lien de téléchargement / ouverture pour un `fileUrl` relatif (`/uploads/...`) derrière le proxy. */
export function buildUploadsFileHref(fileUrl: string): string {
  if (!fileUrl) return "#";
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }
  const root = getApiRootAbsoluteUrl();
  if (root) {
    return `${root.replace(/\/$/, "")}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
  }
  return fileUrl;
}

/**
 * Authorization JWT (navigateur uniquement). À utiliser pour `fetch` manuel
 * (ex. `FormData` / upload) : ne pas y mettre `Content-Type: application/json`.
 */
export function getAuthHeaderInit(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = localStorage.getItem("token");
  if (!t) return {};
  return { Authorization: `Bearer ${t}` };
}

// Generic fetch helper
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaderInit(),
        ...(options?.headers || {}),
      },
      ...options,
    });
  } catch (e) {
    const hint =
      e instanceof Error ? e.message : "erreur réseau inconnue";
    throw new ApiError(
      `Impossible de joindre l’API (${hint}). En local, lancez le backend Nest (port 3200) et le frontend avec le proxy /api-backend.`,
      0,
      e,
    );
  }

  if (!res.ok) {
    const info = await res.json().catch(() => null);
    const msg = formatBackendMessage(info, res.status);
    throw new ApiError(msg, res.status, info);
  }

  // ✅ FIX DELETE / 204
  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text.trim()) {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(
      `Réponse invalide (pas du JSON) pour ${endpoint}. Souvent : le backend Nest n’est pas démarré ou une page HTML d’erreur est renvoyée.`,
      res.status,
      { rawPreview: text.slice(0, 200) },
    );
  }
}


/* ======================
        SWR Keys
====================== */

export function getProjectsKey() {
  return `/projects`;
}

export function getTasksKey() {
  return `/tasks`;
}

export function getTaskKey(id: string) {
  return `/tasks/${id}`;
}

export function getTasksByProjectKey(projectId: string) {
  return `/tasks/projects/${projectId}`;
}

/* ======================
        CRUD
====================== */

export function fetcher<T = unknown>(endpoint: string) {
  return apiFetch<T>(endpoint);
}

export function getClientAccountsKey() {
  return "/users/client-accounts";
}

/** Comptes application avec le rôle Client (affectation projet) — JWT requis, interdit si rôle Client. */
export function getClientAccounts(): Promise<ClientAccount[]> {
  return apiFetch<ClientAccount[]>(getClientAccountsKey());
}

export type TaskCreatePayload = Omit<BackendTask, "_id" | "createdAt">;

export function createTask(payload: TaskCreatePayload): Promise<BackendTask> {
  return apiFetch<BackendTask>(`/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTask(
  id: string,
  payload: Partial<Omit<BackendTask, "_id" | "createdAt">>
): Promise<BackendTask> {
  return apiFetch<BackendTask>(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getUsersKey() {
  return `/users`;
}

export function getUsers(): Promise<BackendUser[]> {
  return apiFetch<BackendUser[]>(`/users`);
}

export function deleteTask(id: string): Promise<void> {
  return apiFetch<void>(`/tasks/${id}`, {
    method: "DELETE",
  });
}
/* ======================
        Resource CRUD
====================== */
export function getResourcesKey() {
  return `/resources`;
}
export function getResourceKey(id: string) {
  return `/resources/${id}`;
}


export function createResource(
  payload: CreateResourcePayload
): Promise<Resource> {
  return apiFetch<Resource>(`/resources`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateResource(
  id: string,
  payload: UpdateResourcePayload
): Promise<Resource> {
  return apiFetch<Resource>(`/resources/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteResource(id: string): Promise<void> {
  return apiFetch<void>(`/resources/${id}`, {
    method: "DELETE",
  });
}

/* ======================
        Jobs CRUD
====================== */
export function getJobsKey() {
  return `/jobs`;
}

export function getJobKey(id: string) {
  return `/jobs/${id}`;
}

export function getJobProgressKey(id: string) {
  return `/jobs/${id}/progress`;
}

export function createJob(payload: CreateJobPayload): Promise<Job> {
  return apiFetch<Job>(`/jobs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateJob(
  id: string,
  payload: UpdateJobPayload
): Promise<Job> {
  return apiFetch<Job>(`/jobs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
// ======================
// Reports
// ======================

export function getProjectAIReport(projectId: string) {
  return apiFetch<{
    totalInvoiced: number;
    totalPaid: number;
    totalPending: number;
    overdueAmount: number;
    invoiceCount: number;
    oldestUnpaidInvoiceDays: number;
    score: number;
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
    ai: {
      summary: string;
      issues: string[];
      recommendations: string[];
      confidence: string;
    };
  }>(`/reports/project/${projectId}/ai`);
}

export function deleteJob(id: string): Promise<void> {
  return apiFetch<void>(`/jobs/${id}`, {
    method: "DELETE",
  });
}

/* ======================
        Humans CRUD
====================== */
export function getHumansKey(role?: string) {
  return role ? `/humans?role=${encodeURIComponent(role)}` : `/humans`;
}

export function getHumans(role?: string): Promise<Human[]> {
  const endpoint = role
    ? `/humans?role=${encodeURIComponent(role)}`
    : `/humans`;
  return apiFetch<Human[]>(endpoint);
}

export function getHumanKey(id: string) {
  return `/humans/${id}`;
}

/** Envoi multipart : champs texte + fichiers optionnels `cv`, `image`. */
export async function createHuman(formData: FormData): Promise<Human> {
  const res = await fetch(`${getApiBaseUrl()}/humans`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const info = await res.json().catch(() => null);
    throw new ApiError(formatBackendMessage(info, res.status), res.status, info);
  }
  return res.json() as Promise<Human>;
}

export async function updateHuman(
  id: string,
  formData: FormData
): Promise<Human> {
  const res = await fetch(`${getApiBaseUrl()}/humans/${id}`, {
    method: "PATCH",
    body: formData,
  });
  if (!res.ok) {
    const info = await res.json().catch(() => null);
    throw new ApiError(formatBackendMessage(info, res.status), res.status, info);
  }
  return res.json() as Promise<Human>;
}

export function deleteHuman(id: string): Promise<void> {
  return apiFetch<void>(`/humans/${id}`, {
    method: "DELETE",
  });
}

/* ======================
        Equipment CRUD
====================== */

export function getEquipmentsKey() {
  return `/equipment`;
}

export function getEquipmentKey(id: string) {
  return `/equipment/${id}`;
}

export function createEquipment(
  payload: Partial<Equipment> & { name: string }
): Promise<Equipment> {
  return apiFetch<Equipment>(`/equipment`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateEquipment(
  id: string,
  payload: Partial<Equipment>
): Promise<Equipment> {
  return apiFetch<Equipment>(`/equipment/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteEquipment(id: string): Promise<void> {
  return apiFetch<void>(`/equipment/${id}`, {
    method: "DELETE",
  });
}

// Fetch projects from the backend API
export async function getProjects(): Promise<Project[]> {
  return apiFetch<Project[]>("/projects");
}

/** JSON payload (dates as ISO strings) — aligned with CreateProjectDto */
export type ProjectCreatePayload = Omit<Project, "_id"> & { createdBy: string };

export async function createProject(
  payload: ProjectCreatePayload
): Promise<Project> {
  return apiFetch<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProject(
  id: string,
  payload: Partial<Omit<Project, "_id">>
): Promise<Project> {
  return apiFetch<Project>(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteProject(id: string): Promise<void> {
  return apiFetch<void>(`/projects/${id}`, {
    method: "DELETE",
  });
}

/** Project AI analysis (backend Groq or deterministic fallback). */
export function analyzeProjectInsights(
  projectId: string
): Promise<ProjectAiInsightsResponse> {
  return apiFetch<ProjectAiInsightsResponse>(
    `/projects/${projectId}/analysis/ai-insights`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}

export function projectAssistantInitialReport(
  projectId: string
): Promise<ProjectAssistantInitialReportResponse> {
  return apiFetch<ProjectAssistantInitialReportResponse>(
    `/projects/${projectId}/analysis/assistant/initial-report`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}

export function projectAssistantChat(
  projectId: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<ProjectAssistantChatResponse> {
  return apiFetch<ProjectAssistantChatResponse>(
    `/projects/${projectId}/analysis/assistant/chat`,
    {
      method: "POST",
      body: JSON.stringify({ messages }),
    }
  );
}

/* ======================
        Dream House (Pollinations + Tripo proxy)
====================== */

export type DreamHouseStartResponse = {
  /** Première image (rétrocompat). */
  imageUrl: string;
  imageUrls: string[];
  taskId: string;
};

export function startDreamHouse(payload: {
  description: string;
  accentColor: string;
  budgetEur?: number;
  terrainM2?: number;
  architectureStyle?: string;
  detailTags?: string[];
}): Promise<DreamHouseStartResponse> {
  return apiFetch<DreamHouseStartResponse>(`/dream-house/start`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type DreamHouseTripoStatus = {
  status: string;
  modelGlbUrl?: string;
  message?: string;
  progress?: number;
};

export function getDreamHouseTripoTaskStatus(
  taskId: string
): Promise<DreamHouseTripoStatus> {
  return apiFetch<DreamHouseTripoStatus>(
    `/dream-house/tripo-task/${encodeURIComponent(taskId)}`
  );
}

async function dreamHouseBlob(
  endpoint: string,
  body: Record<string, string>
): Promise<Blob> {
  const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const info = await res.json().catch(() => null);
    throw new ApiError(formatBackendMessage(info, res.status), res.status, info);
  }
  return res.blob();
}

/** Image Pollinations via le backend (corps JSON `{ url }`). */
export function fetchDreamHousePollinationsBlob(url: string): Promise<Blob> {
  return dreamHouseBlob(`/dream-house/pollinations-image`, { url });
}

/** Fichier GLB Tripo via le backend (corps JSON `{ url }`). */
export function fetchDreamHouseGlbBlob(url: string): Promise<Blob> {
  return dreamHouseBlob(`/dream-house/model-glb`, { url });
}
























