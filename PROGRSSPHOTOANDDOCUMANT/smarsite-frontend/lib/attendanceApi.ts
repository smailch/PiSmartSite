import axios, { type AxiosError } from "axios";
import { getApiBaseUrl } from "./api";

function createClient() {
  return axios.create({
    baseURL: getApiBaseUrl(),
    headers: { "Content-Type": "application/json" },
  });
}

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
    const { data } = await createClient().post<AttendanceRecord>("/attendance", payload);
    return data;
  } catch (e) {
    throw new Error(formatAxiosError(e));
  }
}

export async function fetchAttendanceByJob(jobId: string): Promise<AttendanceRecord[]> {
  try {
    const { data } = await createClient().get<AttendanceRecord[]>(
      `/attendance/job/${jobId}`
    );
    return Array.isArray(data) ? data : [];
  } catch (e) {
    throw new Error(formatAxiosError(e));
  }
}

export type AttendanceBackendMetric = {
  resourceId: string;
  displayName: string;
  annee: number;
  mois: number;
  joursOuvrables: number;
  joursPresentsOuvrables: number;
  joursAbsentsPointesOuvrables: number;
  joursOuvrablesSansPointage: number;
  pointsMensuel: number;
  primeDt: number;
  devise: "DT";
  joursPresent: number;
  joursAbsent: number;
  totalJours: number;
  tauxPresence: number;
  heuresTotales: number;
  heuresMoyennesJourPresent: number | null;
  /** Même valeur que pointsMensuel (0–30). */
  scoreRendement: number;
};

export type TravailleurBonusAnalyse = {
  resourceId: string;
  nomAffiche: string;
  /** Points de présence sur 30 (jours ouvrables). */
  scorePerformance: number;
  /** Prime en dinars tunisiens (DT). */
  montantPrimeSuggere: number | null;
  montantBonusSuggere: number | null;
  justification: string;
  pointsForts: string[];
};

export type AttendanceAiAnalysisResponse = {
  jobId: string;
  jobTitle: string;
  annee: number;
  mois: number;
  generatedAt: string;
  source: "groq" | "fallback";
  reglePrime: string;
  backendMetrics: AttendanceBackendMetric[];
  analysis: {
    summary: string;
    recommendationsEquipe: string[];
    travailleurs: TravailleurBonusAnalyse[];
    confiance: number;
  };
};

export async function fetchAttendanceAiAnalysis(
  jobId: string,
  opts?: { year?: number; month?: number }
): Promise<AttendanceAiAnalysisResponse> {
  try {
    const params = new URLSearchParams();
    if (opts?.year != null) params.set("year", String(opts.year));
    if (opts?.month != null) params.set("month", String(opts.month));
    const q = params.toString();
    const url = `/attendance/job/${jobId}/ai-analysis${q ? `?${q}` : ""}`;
    const { data } = await createClient().post<AttendanceAiAnalysisResponse>(url, {});
    return data;
  } catch (e) {
    throw new Error(formatAxiosError(e));
  }
}

export type PrimeSmsRecipientResult = {
  resourceId: string;
  displayName: string;
  primeDt: number;
  pointsMensuel: number;
  status: "sent" | "skipped";
  detail?: string;
};

export type PrimeSmsTop3Response = {
  jobId: string;
  jobTitle: string;
  annee: number;
  mois: number;
  messageExemple: string;
  /** Finance rows created or updated for processing. */
  financeEntriesRecorded: number;
  results: PrimeSmsRecipientResult[];
};

export type PrimeInvoiceQueueTop3Response = {
  jobId: string;
  jobTitle: string;
  annee: number;
  mois: number;
  messageExemple: string;
  financeEntriesRecorded: number;
  results: Array<{
    resourceId: string;
    displayName: string;
    primeDt: number;
    pointsMensuel: number;
    status: "queued" | "skipped";
    detail?: string;
  }>;
};

export async function sendPrimeMotivationSmsTop3(
  jobId: string,
  opts?: { year?: number; month?: number }
): Promise<PrimeSmsTop3Response> {
  try {
    const params = new URLSearchParams();
    if (opts?.year != null) params.set("year", String(opts.year));
    if (opts?.month != null) params.set("month", String(opts.month));
    const q = params.toString();
    const url = `/attendance/job/${jobId}/prime-sms/top3${q ? `?${q}` : ""}`;
    const { data } = await createClient().post<PrimeSmsTop3Response>(url, {});
    return data;
  } catch (e) {
    throw new Error(formatAxiosError(e));
  }
}

/** Top 3 primes → file facturation ; SMS envoyés quand la finance marque la ligne comme traitée. */
export async function queuePrimeTop3ForInvoice(
  jobId: string,
  opts?: { year?: number; month?: number }
): Promise<PrimeInvoiceQueueTop3Response> {
  try {
    const params = new URLSearchParams();
    if (opts?.year != null) params.set("year", String(opts.year));
    if (opts?.month != null) params.set("month", String(opts.month));
    const q = params.toString();
    const url = `/attendance/job/${jobId}/prime-invoice/top3${q ? `?${q}` : ""}`;
    const { data } = await createClient().post<PrimeInvoiceQueueTop3Response>(url, {});
    return data;
  } catch (e) {
    throw new Error(formatAxiosError(e));
  }
}
