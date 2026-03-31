"use client";

import { use } from "react";
import useSWR from "swr";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import ResourceForm from "@/components/resourcesForm";
import EquipmentForm from "@/components/EquipmentresourcesForm";
import type { Resource,Equipment } from "@/lib/types";
import { fetcher, getEquipmentKey} from "@/lib/api";

export default function EditequipmentResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: equipment, isLoading, error } = useSWR<Equipment>(
    getEquipmentKey(id),
    fetcher
  );

  return (
    <MainLayout>
      <PageHeader
        title="Edit Resource"
        description="Update resource information"
      />

      {isLoading ? (
        <div className="bg-card rounded-xl border border-border shadow-sm p-12 flex items-center justify-center max-w-3xl">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading resource data...</p>
          </div>
        </div>
      ) : error || !equipment ? (
        <div className="bg-card rounded-xl border border-destructive/30 shadow-sm p-12 flex items-center justify-center max-w-3xl">
          <p className="text-destructive font-medium">
            Resource not found. It may have been deleted.
          </p>
        </div>
      ) : (
        <EquipmentForm mode="edit" initialData={equipment} />
      )}
    </MainLayout>
  );
}
