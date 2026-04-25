import axios, { type AxiosError } from "axios";
import { getApiBaseUrl } from "./api";

export const PRIME_PAYOUTS_SWR_KEY = "finance-primes";

function createClient() {
  return axios.create({
    baseURL: getApiBaseUrl(),
    headers: { "Content-Type": "application/json" },
  });
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

export type PrimePayoutRow = {
  _id: string;
  jobId: string;
  jobTitle: string;
  humanResourceId: string;
  employeeName: string;
  year: number;
  month: number;
  amountDt: number;
  pointsMensuel: number;
  status: "PENDING" | "PROCESSED";
  source: string;
  smsNotifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchPrimePayoutPendingCount(): Promise<number> {
  try {
    const { data } = await createClient().get<{ count: number }>(
      "/finance/primes/pending-count"
    );
    return typeof data?.count === "number" ? data.count : 0;
  } catch {
    return 0;
  }
}

export async function fetchPrimePayouts(status?: "PENDING" | "PROCESSED"): Promise<PrimePayoutRow[]> {
  try {
    const params = status ? { status } : {};
    const { data } = await createClient().get<PrimePayoutRow[]>("/finance/primes", { params });
    return Array.isArray(data) ? data : [];
  } catch (e) {
    throw new Error(formatAxiosError(e));
  }
}

export async function setPrimePayoutStatus(
  id: string,
  status: "PENDING" | "PROCESSED"
): Promise<PrimePayoutRow> {
  try {
    const { data } = await createClient().patch<PrimePayoutRow>(
      `/finance/primes/${id}/status`,
      { status }
    );
    return data;
  } catch (e) {
    throw new Error(formatAxiosError(e));
  }
}
