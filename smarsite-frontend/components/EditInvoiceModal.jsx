"use client";

import { useState, useEffect } from "react";
import { getApiBaseUrl, getAuthHeaderInit } from "@/lib/api";

export default function EditInvoiceModal({ invoice, onClose, onSuccess }) {
  const [form, setForm] = useState({
    vendorName: "",
    amount: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ preload data
  useEffect(() => {
    if (invoice) {
      setForm({
        vendorName: invoice.vendorName || "",
        amount: invoice.amount || "",
        description: invoice.description || "",
      });
    }
  }, [invoice]);

  const handleChange = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
  };

  const handleSubmit = async () => {
    setError("");

    if (!form.vendorName || !form.amount) {
      setError("Vendor and amount are required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${getApiBaseUrl()}/invoices/${invoice._id}`,
        {
          method: "PUT", // or PATCH depending backend
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaderInit(),
          },
          body: JSON.stringify({
            vendorName: form.vendorName,
            amount: Number(form.amount),
            description: form.description,
          }),
        }
      );

      const data = await res.json();

      console.log("UPDATE RESPONSE:", data);

      if (!res.ok) {
        throw new Error(data.message || "Update failed");
      }

      // ✅ refresh + close
      onSuccess();
      onClose();

    } catch (err) {
      console.error(err);
      setError(err.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-[500px]">

        <h2 className="font-semibold mb-4">Edit Invoice</h2>

        <input
          className="border p-2 w-full mb-3"
          placeholder="Vendor"
          value={form.vendorName}
          onChange={handleChange("vendorName")}
        />

        <input
          className="border p-2 w-full mb-3"
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={handleChange("amount")}
        />

        <textarea
          className="border p-2 w-full mb-3"
          placeholder="Description"
          value={form.description}
          onChange={handleChange("description")}
        />

        {error && (
          <p className="text-red-500 text-sm mb-2">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>Cancel</button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>

      </div>
    </div>
  );
}