"use client";

import { useState } from "react";
import { CreditCard, Banknote, X, DollarSign, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiBaseUrl } from "@/lib/api";

const METHODS = [
  { id: "Cash", label: "Cash", icon: Banknote },
  { id: "Credit Card", label: "Credit Card", icon: CreditCard },
];

type PaymentModalProps = {
  invoiceId: string;
  amount: number;
  onClose: () => void;
};

export default function PaymentModal({
  invoiceId,
  amount: invoiceAmount,
  onClose,
}: PaymentModalProps) {
  const [method, setMethod] = useState("Cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const amount = invoiceAmount;

  const handlePay = async () => {
    if (!amount || Number(amount) <= 0) {
      setError("Invalid invoice amount.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (method === "Credit Card") {
        const res = await fetch(`${getApiBaseUrl()}/payments/stripe-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            invoiceId,
            method: "CARD",
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.url) {
          throw new Error(data.message || "Stripe session failed");
        }

        window.location.href = data.url;
        return;
      }

      await fetch(`${getApiBaseUrl()}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceId,
          amount: Number(amount),
          paymentDate: new Date().toISOString(),
          method: "CASH",
        }),
      });

      window.dispatchEvent(new Event("payment-success"));
      onClose();
    } catch (err) {
      console.error(err);
      setError("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard size={20} className="text-primary" />
              </div>
              <CardTitle className="text-xl">Make Payment</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-muted"
            >
              <X size={18} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Amount Display */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-5 border border-primary/10">
            <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
            <div className="flex items-center gap-2">
              <DollarSign size={24} className="text-primary" />
              <span className="text-3xl font-bold text-foreground">
                {invoiceAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Payment Method
            </p>
            <div className="grid grid-cols-2 gap-3">
              {METHODS.map((m) => {
                const Icon = m.icon;
                const isSelected = method === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 size={16} className="text-primary" />
                      </div>
                    )}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <Icon size={24} />
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        isSelected ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 flex items-center gap-2">
              <X size={16} className="text-destructive" />
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 h-11">
              Cancel
            </Button>
            <Button
              onClick={handlePay}
              disabled={loading}
              className="flex-1 h-11 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
