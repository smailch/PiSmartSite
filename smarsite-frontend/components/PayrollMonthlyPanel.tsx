"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { CalendarRange, Loader2 } from "lucide-react";
import {
  fetchMonthlyPayroll,
  payrollMonthlySwrKey,
  type PayrollMonthlyResponse,
} from "@/lib/payrollApi";

const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function defaultYearMonth() {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export default function PayrollMonthlyPanel() {
  const init = useMemo(() => defaultYearMonth(), []);
  const [year, setYear] = useState(init.year);
  const [month, setMonth] = useState(init.month);

  const {
    data,
    error,
    isLoading,
  } = useSWR<PayrollMonthlyResponse>(
    payrollMonthlySwrKey(year, month),
    () => fetchMonthlyPayroll(year, month)
  );

  const rows = data?.rows ?? [];
  const totalVersement = useMemo(
    () => rows.reduce((s, r) => s + (r.totalVersementDt ?? 0), 0),
    [rows]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarRange className="h-5 w-5 text-accent" aria-hidden />
          <span className="font-medium text-foreground">Période</span>
        </div>
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Mois</span>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-foreground"
          >
            {MONTH_LABELS.map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Année</span>
          <input
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 tabular-nums text-foreground"
          />
        </label>
        {rows.length > 0 && (
          <span className="text-muted-foreground">
            Total versements :{" "}
            <strong className="text-foreground">
              {Math.round(totalVersement * 100) / 100} DT
            </strong>
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {String(error)}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Chargement de la paie mensuelle…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune ligne pour cette période. Renseignez les salaires mensuels sur les fiches
          ressources humaines et le pointage pour le mois sélectionné.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-foreground">
                <th className="px-3 py-3 font-semibold">Employé</th>
                <th className="px-3 py-3 font-semibold">Rôle</th>
                <th className="px-3 py-3 font-semibold">Salaire mois (DT)</th>
                <th className="px-3 py-3 font-semibold">J. ouvr.</th>
                <th className="px-3 py-3 font-semibold">Prés.</th>
                <th className="px-3 py-3 font-semibold">Abs. ptg.</th>
                <th className="px-3 py-3 font-semibold">Sans ptg.</th>
                <th className="px-3 py-3 font-semibold">Taux jr. (DT)</th>
                <th className="px-3 py-3 font-semibold">Déduct. (DT)</th>
                <th className="px-3 py-3 font-semibold">Net abs. (DT)</th>
                <th className="px-3 py-3 font-semibold">Prime ptg. (DT)</th>
                <th className="px-3 py-3 font-semibold">Prime fact. (DT)</th>
                <th className="px-3 py-3 font-semibold">Total (DT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.humanResourceId} className="hover:bg-muted/25">
                  <td className="px-3 py-2.5 font-medium text-foreground">
                    {r.employeeName || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.role}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.monthlySalaryDt}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.joursOuvrables}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.joursPresentsOuvrables}</td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {r.joursAbsentsPointesOuvrables}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{r.joursSansPointage}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.tauxJournalierDt}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.deductionAbsencesDt}</td>
                  <td className="px-3 py-2.5 tabular-nums font-medium">
                    {r.salaireNetApresAbsencesDt}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{r.primePointageDt}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.primeFacturationDt}</td>
                  <td className="px-3 py-2.5 tabular-nums font-semibold text-foreground">
                    {r.totalVersementDt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
