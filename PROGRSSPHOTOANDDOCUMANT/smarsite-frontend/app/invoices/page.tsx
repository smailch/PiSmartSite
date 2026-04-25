"use client";

import { useState, useEffect, Suspense } from "react";
import useSWR, { mutate } from "swr";
import { useSearchParams, useRouter } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import InvoiceForm from "@/components/InvoiceForm";
import InvoiceTable from "@/components/InvoiceTable";
import PrimePayoutsPanel from "@/components/PrimePayoutsPanel";
import PayrollMonthlyPanel from "@/components/PayrollMonthlyPanel";
import { Plus, X, FileText, BadgePercent, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type Invoice = any;

const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }

  const text = await res.text();
  if (!text) return [];

  return JSON.parse(text);
};

function InvoicesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam === "primes" ? "primes" : tabParam === "salaries" ? "salaries" : "invoices";

  const setTab = (tab: "invoices" | "primes" | "salaries") => {
    const q = new URLSearchParams(searchParams.toString());
    if (tab === "invoices") {
      q.delete("tab");
    } else {
      q.set("tab", tab);
    }
    const s = q.toString();
    router.replace(s ? `/invoices?${s}` : "/invoices", { scroll: false });
  };

  const {
    data: invoices = [],
    isLoading,
    error,
  } = useSWR<Invoice[]>("/api/invoices", fetcher);

  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState("");

  const handleRefresh = () => mutate("/api/invoices");

  const handleSuccess = () => {
    handleRefresh();
    setShowForm(false);
  };

  useEffect(() => {
    const success = localStorage.getItem("paymentSuccess");

    if (success) {
      setToast("Payment successful ✅");
      localStorage.removeItem("paymentSuccess");
      handleRefresh();
      setTimeout(() => setToast(""), 3000);
    }
  }, []);

  return (
    <MainLayout>
      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-lg bg-green-600 px-4 py-2 text-white shadow">
          {toast}
        </div>
      )}

      <PageHeader
        title="Invoices"
        description={
          activeTab === "primes"
            ? "Primes de pointage — suivi et traitement."
            : activeTab === "salaries"
              ? "Salaires : taux journalier, déductions (absences / sans pointage), primes pointage et facturation."
              : "Manage project invoices and track payment status"
        }
      >
        {activeTab === "invoices" ? (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-sm transition-colors hover:bg-accent/90"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? "Cancel" : "Create Invoice"}
          </button>
        ) : null}
      </PageHeader>

      <div className="mb-8 flex flex-wrap gap-2 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setTab("invoices")}
          className={cn(
            "inline-flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
            activeTab === "invoices"
              ? "border-accent text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText className="h-4 w-4" aria-hidden />
          Invoices
        </button>
        <button
          type="button"
          onClick={() => setTab("primes")}
          className={cn(
            "inline-flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
            activeTab === "primes"
              ? "border-accent text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <BadgePercent className="h-4 w-4" aria-hidden />
          Bonuses (attendance)
        </button>
        <button
          type="button"
          onClick={() => setTab("salaries")}
          className={cn(
            "inline-flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
            activeTab === "salaries"
              ? "border-accent text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Wallet className="h-4 w-4" aria-hidden />
          Salaires
        </button>
      </div>

      {activeTab === "primes" ? (
        <PrimePayoutsPanel />
      ) : activeTab === "salaries" ? (
        <PayrollMonthlyPanel />
      ) : (
        <>
          {error && (
            <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-6">
              <p className="font-medium text-destructive">
                Failed to load invoices. Make sure the backend is running.
              </p>
              <p className="mt-1 text-sm text-destructive/80">
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
            </div>
          )}

          {showForm && (
            <div className="mb-8">
              <InvoiceForm
                onSuccess={handleSuccess}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 shadow-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground">Loading invoices...</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <InvoiceTable
                invoices={Array.isArray(invoices) ? invoices : []}
                onRefresh={handleRefresh}
              />
            </div>
          )}
        </>
      )}
    </MainLayout>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            Loading…
          </div>
        </MainLayout>
      }
    >
      <InvoicesPageContent />
    </Suspense>
  );
}
