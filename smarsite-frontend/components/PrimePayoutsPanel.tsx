"use client";

import useSWR from "swr";
import { toast } from "sonner";
import { CheckCircle2, Coins, Loader2 } from "lucide-react";
import {
  fetchPrimePayouts,
  PRIME_PAYOUTS_SWR_KEY,
  setPrimePayoutStatus,
  type PrimePayoutRow,
} from "@/lib/financePrimesApi";

export default function PrimePayoutsPanel() {
  const {
    data: rows = [],
    error,
    isLoading,
    mutate,
  } = useSWR<PrimePayoutRow[]>(PRIME_PAYOUTS_SWR_KEY, () => fetchPrimePayouts());

  async function markProcessed(row: PrimePayoutRow) {
    try {
      await setPrimePayoutStatus(row._id, "PROCESSED");
      const pendingSms = !row.smsNotifiedAt;
      toast.success(
        pendingSms
          ? "SMS sent · row processed"
          : "Row marked as processed"
      );
      await mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  const pending = rows.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <Coins className="h-5 w-5 text-accent" aria-hidden />
        <span>
          Pending:{" "}
          <strong className="text-foreground">{pending}</strong> of {rows.length} row(s).
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {String(error)}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No bonuses pending. From the job Attendance page: run AI analysis, then use Send to invoice (top 3).
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[840px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-foreground">
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold">Job</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Points</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">SMS</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r._id} className="hover:bg-muted/25">
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {String(r.month).padStart(2, "0")}/{r.year}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{r.employeeName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.jobTitle}</td>
                  <td className="px-4 py-3 tabular-nums font-medium text-foreground">
                    {r.amountDt} DT
                  </td>
                  <td className="px-4 py-3 tabular-nums">{r.pointsMensuel}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.status === "PENDING"
                          ? "inline-flex rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-200"
                          : "inline-flex rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-200"
                      }
                    >
                      {r.status === "PENDING" ? "Pending" : "Processed"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.smsNotifiedAt
                      ? "Sent"
                      : r.status === "PENDING"
                        ? "When finance processes"
                        : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "PENDING" ? (
                      <button
                        type="button"
                        onClick={() => void markProcessed(r)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Process
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
