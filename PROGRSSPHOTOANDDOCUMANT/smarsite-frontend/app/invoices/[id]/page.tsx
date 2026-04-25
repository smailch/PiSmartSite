// app/budget/invoices/edit/[id]/page.tsx
"use client";

import { use } from "react";
import useSWR from "swr";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import InvoiceForm from "@/components/InvoiceForm";
import { fetcher } from "@/lib/api";

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: invoice, isLoading, error } = useSWR(`/api/invoices/${id}`, fetcher);

  return (
    <MainLayout>
      <PageHeader title="Edit Invoice" description="Update invoice details" />

      {isLoading ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-12 flex items-center justify-center max-w-2xl">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading invoice...</p>
          </div>
        </div>
      ) : error || !invoice ? (
        <div className="bg-card rounded-xl border border-destructive/30 shadow-sm p-12 flex items-center justify-center max-w-2xl">
          <p className="text-destructive font-medium">Invoice not found. It may have been deleted.</p>
        </div>
      ) : (
        <InvoiceForm onSuccess={() => window.history.back()} />
      )}
    </MainLayout>
  );
}