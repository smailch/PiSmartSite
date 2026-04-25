"use client";

import Link from "next/link";
import type { Resource } from "@/lib/types";
import { Pencil, Trash2, User, Wrench, CheckCircle, XCircle } from "lucide-react";

interface ResourcesTableProps {
  resources: Resource[];
  onDelete: (resource: Resource) => void;
}

function getTypeBadge(type: string) {
  switch (type) {
    case "Human":
      return "bg-blue-100 text-blue-800";
    case "Equipment":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getAvailabilityBadge(availability: boolean) {
  return availability
    ? "bg-green-100 text-green-800"
    : "bg-red-100 text-red-800";
}

export default function ResourcesTable({
  resources,
  onDelete,
}: ResourcesTableProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-secondary border-b border-border">
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Name
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Type
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Role
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Availability
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {resources.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <User size={32} className="text-muted-foreground/40" />
                    <p className="text-lg font-medium">No resources found</p>
                    <p className="text-sm">
                      Add a new resource to get started
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              resources.map((resource) => (
                <tr
                  key={resource._id}
                  className="border-b border-border hover:bg-secondary/30 transition-colors"
                >
                  {/* NAME */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {resource.type === "Human" ? (
                        <User size={16} className="text-accent" />
                      ) : (
                        <Wrench size={16} className="text-accent" />
                      )}
                      <span className="font-semibold text-foreground">
                        {resource.name}
                      </span>
                    </div>
                  </td>

                  {/* TYPE */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getTypeBadge(
                        resource.type
                      )}`}
                    >
                      {resource.type}
                    </span>
                  </td>

                  {/* ROLE */}
                  <td className="px-6 py-4 text-sm text-foreground">
                    {resource.role}
                  </td>

                  {/* AVAILABILITY */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${getAvailabilityBadge(
                        resource.availability
                      )}`}
                    >
                      {resource.availability ? (
                        <CheckCircle size={12} />
                      ) : (
                        <XCircle size={12} />
                      )}
                      {resource.availability ? "Available" : "Unavailable"}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/resources/${resource._id}/edit`}
                        className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                        aria-label={`Edit ${resource.name}`}
                      >
                        <Pencil size={16} />
                      </Link>

                      <button
                        onClick={() => onDelete(resource)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        aria-label={`Delete ${resource.name}`}
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
