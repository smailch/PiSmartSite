// app/budget/invoices/create/page.tsx
"use client";

import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import InvoiceForm from "@/components/InvoiceForm";


export default function CreateInvoicePage() {
  return (
    <MainLayout>
      <PageHeader title="Create Invoice" description="Generate a new invoice for a project" />
      <InvoiceForm onSuccess={() => window.history.back()} />
    </MainLayout>
  );
}