import type {
  Job,
  CreateJobPayload,
  UpdateJobPayload,
  Resource,
  CreateResourcePayload,
  UpdateResourcePayload,
  Project,
  BackendTask,
  BackendUser,
} from "./types";
import { ApiError } from "./types";

/** Messages NestJS / class-validator : string | string[] */
function formatBackendMessage(info: unknown, status: number): string {
  if (info && typeof info === "object" && "message" in info) {
    const m = (info as { message: unknown }).message;
    if (Array.isArray(m)) return m.filter(Boolean).join(" · ");
    if (typeof m === "string" && m.length) return m;
  }
  return `Request failed with status ${status}`;
}

// ✅ API dynamique
const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined");
}

// Generic fetch helper
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

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
  return text ? JSON.parse(text) : (undefined as T);
}


/* ======================
        SWR Keys
====================== */

export function getJobsKey() {
  return `/jobs`;
}

export function getJobKey(id: string) {
  return `/jobs/${id}`;
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

export function deleteJob(id: string): Promise<void> {
  return apiFetch<void>(`/jobs/${id}`, {
    method: "DELETE",
  });
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

// Fetch projects from the backend API
export async function getProjects(): Promise<Project[]> {
  return apiFetch<Project[]>("/projects");
}

/** Payload JSON (dates en chaînes ISO) — aligné sur CreateProjectDto */
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
