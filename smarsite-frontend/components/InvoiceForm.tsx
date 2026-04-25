"use client";

import { useState } from "react";
import { FileText, DollarSign, Calendar, Hash, User, AlignLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

type InvoiceFormData = {
  projectId: string;
  vendorName: string;
  description: string;
  amount: string;
  issueDate: string;
  dueDate: string;
};

type InvoicePayload = {
  projectId: string;
  vendorName: string;
  description: string;
  amount: number;
  issueDate: string;
  dueDate: string;
};

const EMPTY_FORM: InvoiceFormData = {
  projectId: "",
  vendorName: "",
  description: "",
  amount: "",
  issueDate: "",
  dueDate: "",
};

async function createInvoice(data: InvoicePayload): Promise<any> {
  const response = await fetch("/api/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const text = await response.text();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { message: text };
  }

  if (!response.ok) {
    throw new Error(parsed.message || "Failed to create invoice");
  }

  return parsed;
}

function FormField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
        {Icon && (
          <span className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon size={12} className="text-primary" />
          </span>
        )}
        {label}
      </label>
      {children}
    </div>
  );
}

export default function InvoiceForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<InvoiceFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set =
    (key: keyof InvoiceFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const payload: InvoicePayload = {
        ...form,
        amount: Number(form.amount),
        issueDate: new Date(form.issueDate).toISOString(),
        dueDate: new Date(form.dueDate).toISOString(),
      };

      await createInvoice(payload);
      setForm(EMPTY_FORM);
      onSuccess();
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText size={24} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Create Invoice</h2>
          <p className="text-sm text-muted-foreground">
            Fill in the details below to generate a new invoice.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="space-y-5">
            {/* Project ID & Vendor Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Project ID" icon={Hash}>
                <Input
                  placeholder="Enter project ID"
                  value={form.projectId}
                  onChange={set("projectId")}
                  className="h-11 bg-muted/50 border-border focus:border-primary focus:ring-primary"
                />
              </FormField>

              <FormField label="Vendor Name" icon={User}>
                <Input
                  placeholder="Enter vendor name"
                  value={form.vendorName}
                  onChange={set("vendorName")}
                  className="h-11 bg-muted/50 border-border focus:border-primary focus:ring-primary"
                />
              </FormField>
            </div>

            {/* Description */}
            <FormField label="Description" icon={AlignLeft}>
              <Textarea
                placeholder="Enter invoice description..."
                value={form.description}
                onChange={set("description")}
                className="min-h-[100px] bg-muted/50 border-border focus:border-primary focus:ring-primary resize-none"
              />
            </FormField>

            {/* Amount */}
            <FormField label="Amount (USD)" icon={DollarSign}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={set("amount")}
                  className="h-11 pl-7 bg-muted/50 border-border focus:border-primary focus:ring-primary"
                />
              </div>
            </FormField>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Issue Date" icon={Calendar}>
                <Input
                  type="date"
                  value={form.issueDate}
                  onChange={set("issueDate")}
                  className="h-11 bg-muted/50 border-border focus:border-primary focus:ring-primary"
                />
              </FormField>

              <FormField label="Due Date" icon={Calendar}>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={set("dueDate")}
                  className="h-11 bg-muted/50 border-border focus:border-primary focus:ring-primary"
                />
              </FormField>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-5 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 flex items-center gap-2">
              <X size={16} className="text-destructive" />
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setForm(EMPTY_FORM);
                onCancel?.();
              }}
              className="px-6"
            >
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {loading ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
