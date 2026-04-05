"use client";

import { useState } from "react";
import Link from "next/link";
import { mutate } from "swr";
import type { Equipment } from "@/lib/types";
import { deleteEquipment, getEquipmentsKey } from "@/lib/api";
import { Pencil, Trash2, Eye } from "lucide-react";

interface EquipmentResourcesTableProps {
  equipments: Equipment[];
  onDelete: (equipment: Equipment) => void;
  onEdit?: (equipment: Equipment) => void;
  onView?: (equipment: Equipment) => void;
}

export default function EquipmentResourcesTable({
  equipments,
}: EquipmentResourcesTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this equipment?")) return;

    try {
      setDeletingId(id);
      await deleteEquipment(id);
      mutate(getEquipmentsKey());
    } catch (err) {
      alert("Failed to delete equipment. " + (err instanceof Error ? err.message : ""));
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
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Category</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Serial Number</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Model</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Brand</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Location</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Availability</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {equipments.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                  No equipments found
                </td>
              </tr>
            ) : (
              equipments.map((equipment) => (
                <tr
                  key={equipment._id}
                  className="border-b border-border hover:bg-secondary/30 transition-colors"
                >
                  <td className="px-6 py-4">{equipment.name}</td>
                  <td className="px-6 py-4">{equipment.category}</td>
                  <td className="px-6 py-4">{equipment.serialNumber}</td>
                  <td className="px-6 py-4">{equipment.model}</td>
                  <td className="px-6 py-4">{equipment.brand}</td>
                  <td className="px-6 py-4">{equipment.location}</td>
                  <td className="px-6 py-4">{equipment.availability ? "Available" : "Not Available"}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/equipment/${equipment._id}/details`}
                        className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                        aria-label={`View ${equipment.name}`}
                      >
                        <Eye size={16} />
                      </Link>
                      <Link
                        href={`/equipment/${equipment._id}/edit`}
                        className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                        aria-label={`Edit ${equipment.name}`}
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        onClick={() => handleDelete(equipment._id!)}
                        disabled={deletingId === equipment._id}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        aria-label={`Delete ${equipment.name}`}
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
