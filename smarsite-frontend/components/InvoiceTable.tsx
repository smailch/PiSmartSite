"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  MoreHorizontal,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import PaymentModal from "./PaymentModal";
import EditInvoiceModal from "./EditInvoiceModal";
import { cn } from "@/lib/utils";

type Invoice = {
  _id: string;
  vendorName: string;
  amount: number;
  status: string;
  issueDate?: string;
  dueDate?: string;
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  PAID: {
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  PENDING: {
    bg: "bg-amber-50 dark:bg-amber-950/50",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  PARTIALLY_PAID: {
    bg: "bg-sky-50 dark:bg-sky-950/50",
    text: "text-sky-700 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  OVERDUE: {
    bg: "bg-rose-50 dark:bg-rose-950/50",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(date?: string) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function InvoiceTable({ invoices = [], onRefresh }: any) {
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const handler = () => onRefresh();
    window.addEventListener("payment-success", handler);
    return () => window.removeEventListener("payment-success", handler);
  }, [onRefresh]);

  const filtered = invoices.filter((inv: Invoice) => {
    return (
      inv.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (statusFilter === "ALL" || inv.status === statusFilter)
    );
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginated = filtered.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  async function handleDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      const res = await fetch(
        `http://localhost:3200/invoices/${deleteTarget._id}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Delete failed");

      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteTarget(null);
      setIsDeleting(false);
    }
  }

  const statusFilters = ["ALL", "PAID", "PENDING", "OVERDUE"];

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Header Section */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Invoices</h1>
              <p className="text-sm text-muted-foreground">Manage and track all your invoices</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Total Invoices", value: invoices.length, color: "text-foreground" },
            { label: "Paid", value: invoices.filter((i: Invoice) => i.status === "PAID").length, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Pending", value: invoices.filter((i: Invoice) => i.status === "PENDING").length, color: "text-amber-600 dark:text-amber-400" },
            { label: "Overdue", value: invoices.filter((i: Invoice) => i.status === "OVERDUE").length, color: "text-rose-600 dark:text-rose-400" },
          ].map((stat) => (
            <Card key={stat.label} className="border-0 bg-card shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <p className={cn("mt-1 text-2xl font-semibold", stat.color)}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Card */}
        <Card className="border-0 shadow-lg shadow-black/5">
          <CardHeader className="border-b border-border/50 bg-card px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              {/* Search Input */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => {
                    setPage(1);
                    setSearchTerm(e.target.value);
                  }}
                  className="h-10 border-border/50 bg-secondary/50 pl-10 transition-all focus:bg-background"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {statusFilters.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setPage(1);
                      setStatusFilter(s);
                    }}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                      statusFilter === s
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="h-12 pl-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendor</TableHead>
                  <TableHead className="h-12 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                  <TableHead className="h-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Issue Date</TableHead>
                  <TableHead className="h-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Due Date</TableHead>
                  <TableHead className="h-12 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="h-12 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="h-8 w-8 opacity-50" />
                        <p>No invoices found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((inv: Invoice) => {
                    const status = inv.status?.toUpperCase();
                    const isPaid = status === "PAID";
                    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

                    const isOverdue =
                      inv.dueDate &&
                      new Date(inv.dueDate) < new Date() &&
                      status !== "PAID";

                    return (
                      <TableRow
                        key={inv._id}
                        className="group border-border/50 transition-colors hover:bg-muted/50"
                      >
                        <TableCell className="py-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground">
                              {inv.vendorName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-foreground">{inv.vendorName}</span>
                          </div>
                        </TableCell>

                        <TableCell className="py-4 text-right">
                          <span className="text-base font-semibold tabular-nums text-foreground">
                            {formatAmount(inv.amount)}
                          </span>
                        </TableCell>

                        <TableCell className="py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(inv.issueDate)}
                          </div>
                        </TableCell>

                        <TableCell className="py-4 text-center">
                          <div className={cn(
                            "flex items-center justify-center gap-1.5 text-sm",
                            isOverdue ? "font-medium text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                          )}>
                            {isOverdue && <AlertCircle className="h-3.5 w-3.5" />}
                            <Calendar className={cn("h-3.5 w-3.5", isOverdue && "hidden")} />
                            {formatDate(inv.dueDate)}
                          </div>
                        </TableCell>

                        <TableCell className="py-4 text-center">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border-0 px-3 py-1 text-xs font-medium",
                              config.bg,
                              config.text
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
                            {status.replace("_", " ")}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-4 pr-6">
                          <div className="flex items-center justify-end gap-1">
                            {/* Desktop Actions */}
                            <div className="hidden items-center gap-1 sm:flex">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isPaid}
                                className={cn(
                                  "h-8 gap-1.5 text-muted-foreground hover:text-foreground",
                                  isPaid && "cursor-not-allowed opacity-40"
                                )}
                                onClick={() => setSelectedInvoice(inv._id)}
                              >
                                <CreditCard className="h-4 w-4" />
                                <span className="hidden lg:inline">Pay</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isPaid}
                                className={cn(
                                  "h-8 gap-1.5 text-muted-foreground hover:text-foreground",
                                  isPaid && "cursor-not-allowed opacity-40"
                                )}
                                onClick={() => setEditTarget(inv)}
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="hidden lg:inline">Edit</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDeleteTarget(inv)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="hidden lg:inline">Delete</span>
                              </Button>
                            </div>

                            {/* Mobile Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild className="sm:hidden">
                                <Button size="icon" variant="ghost" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  disabled={isPaid}
                                  onClick={() => setSelectedInvoice(inv._id)}
                                >
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Pay
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={isPaid}
                                  onClick={() => setEditTarget(inv)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteTarget(inv)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* Pagination Footer */}
          {totalPages > 0 && (
            <div className="flex items-center justify-between border-t border-border/50 px-6 py-4">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{((page - 1) * itemsPerPage) + 1}</span> to{" "}
                <span className="font-medium text-foreground">{Math.min(page * itemsPerPage, filtered.length)}</span> of{" "}
                <span className="font-medium text-foreground">{filtered.length}</span> results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                    Math.max(0, page - 2),
                    Math.min(totalPages, page + 1)
                  ).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors",
                        page === p
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Payment Modal */}
      {selectedInvoice && (
        <PaymentModal
          invoiceId={selectedInvoice}
          amount={invoices.find((i: Invoice) => i._id === selectedInvoice)?.amount}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <EditInvoiceModal
          invoice={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={onRefresh}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the invoice for{" "}
              <span className="font-medium text-foreground">{deleteTarget?.vendorName}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
