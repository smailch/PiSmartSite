"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import InvoiceForm from "@/components/InvoiceForm";
import InvoiceTable from "@/components/InvoiceTable";
import { Plus, X } from "lucide-react";

type Invoice = any;

// ✅ fetcher (unchanged)
const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }

  const text = await res.text();
  if (!text) return [];

  return JSON.parse(text);
};

export default function InvoicesPage() {
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

  // 🔥 STRIPE SUCCESS HANDLER
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

      {/* 🔥 TOAST */}
      {toast && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-4 py-2 rounded-lg shadow z-50">
          {toast}
        </div>
      )}

      <PageHeader
        title="Invoices"
        description="Manage project invoices and track payment status"
      >
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-semibold hover:bg-accent/90 transition-colors flex items-center gap-2 shadow-sm"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? "Cancel" : "Create Invoice"}
        </button>
      </PageHeader>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 mb-6">
          <p className="text-destructive font-medium">
            Failed to load invoices. Make sure the backend is running.
          </p>
          <p className="text-sm text-destructive/80 mt-1">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-8">
          <InvoiceForm
            onSuccess={handleSuccess}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading invoices...</p>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <InvoiceTable
            invoices={Array.isArray(invoices) ? invoices : []}
            onRefresh={handleRefresh}
          />
        </div>
      )}
    </MainLayout>
  );
}