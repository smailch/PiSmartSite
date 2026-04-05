import axios, { type AxiosError } from "axios";

function getApiBase(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_URL is not defined");
  return url.replace(/\/$/, "");
}

const client = axios.create({ baseURL: getApiBase() });

export type AttendanceRecord = {
  _id: string;
  jobId: string;
  resourceId: string | { _id: string; name?: string; type?: string; role?: string };
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: "present" | "absent";
  createdAt?: string;
  updatedAt?: string;
};

export type CreateAttendancePayload = {
  jobId: string;
  resourceId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status?: "present" | "absent";
};

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

export async function createAttendance(payload: CreateAttendancePayload): Promise<AttendanceRecord> {
  try {
    const { data } = await client.post<AttendanceRecord>("/attendance", payload);
    return data;
  } catch (e) {
    throw new Error(formatAxiosError(e));
  }
}

export async function fetchAttendanceByJob(jobId: string): Promise<AttendanceRecord[]> {
  try {
    const { data } = await client.get<AttendanceRecord[]>(`/attendance/job/${jobId}`);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    throw new Error(formatAxiosError(e));
  }
}
