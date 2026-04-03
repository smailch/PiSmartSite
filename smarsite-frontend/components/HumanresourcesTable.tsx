"use client";

import { useState } from "react";
import Link from "next/link";
import { mutate } from "swr";
import type { Human } from "@/lib/types"; // Assure-toi de créer un type Human
import { deleteHuman, getHumansKey } from "@/lib/api";
import { Pencil, Trash2, Eye } from "lucide-react";

interface HumanResourcesTableProps {
  humans: Human[];
  onDelete: (human: Human) => void; // ✅ ici human a le type Human
  onEdit?: (human: Human) => void;   // optionnel si tu veux l'édition
  onView?: (human: Human) => void;   // optionnel si tu veux voir les détails
}
export default function HumanResourcesTable({ humans }: HumanResourcesTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this human?")) return;

    try {
      setDeletingId(id);
      await deleteHuman(id);
      mutate(getHumansKey());
    } catch (err) {
      alert("Failed to delete human. " + (err instanceof Error ? err.message : ""));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-secondary border-b border-border">
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">CIN</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Role</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Phone</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Availability</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {humans.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  No humans found
                </td>
              </tr>
            ) : (
              humans.map((human) => (
                <tr
                  key={human._id}
                  className="border-b border-border hover:bg-secondary/30 transition-colors"
                >
                  <td className="px-6 py-4">{human.firstName} {human.lastName}</td>
                  <td className="px-6 py-4">{human.cin}</td>
                  <td className="px-6 py-4">{human.role}</td>
                  <td className="px-6 py-4">{human.phone}</td>
                  <td className="px-6 py-4">{human.availability ? "Available" : "Not Available"}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/humans/${human._id}/details`}
                        className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                        aria-label={`View ${human.firstName} ${human.lastName}`}
                      >
                        <Eye size={16} />
                      </Link>
                      <Link
                        href={`/humans/${human._id}/edit`}
                        className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                        aria-label={`Edit ${human.firstName} ${human.lastName}`}
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        onClick={() => handleDelete(human._id)}
                        disabled={deletingId === human._id}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        aria-label={`Delete ${human.firstName} ${human.lastName}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
