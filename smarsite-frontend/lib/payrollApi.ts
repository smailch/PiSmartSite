import axios, { type AxiosError } from "axios";
import { getApiBaseUrl } from "./api";

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

export type PayrollMonthlyRow = {
  humanResourceId: string;
  employeeName: string;
  role: string;
  year: number;
  month: number;
  monthlySalaryDt: number;
  joursOuvrables: number;
  joursPresentsOuvrables: number;
  joursAbsentsPointesOuvrables: number;
  joursSansPointage: number;
  tauxJournalierDt: number;
  deductionAbsencesDt: number;
  salaireNetApresAbsencesDt: number;
  primePointageDt: number;
  primeFacturationDt: number;
  totalVersementDt: number;
};

export type PayrollMonthlyResponse = {
  year: number;
  month: number;
  rows: PayrollMonthlyRow[];
};

export function payrollMonthlySwrKey(year: number, month: number) {
  return ["finance-payroll-monthly", year, month] as const;
}

export async function fetchMonthlyPayroll(
  year: number,
  month: number
): Promise<PayrollMonthlyResponse> {
  try {
    const { data } = await createClient().get<PayrollMonthlyResponse>(
      "/finance/payroll/monthly",
      { params: { year, month } }
    );
    return data;
  } catch (e) {
    throw new Error(formatAxiosError(e));
  }
}
