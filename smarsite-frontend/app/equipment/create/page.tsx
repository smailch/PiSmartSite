"use client";

import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import EquipmentResourcesForm from "@/components/EquipmentresourcesForm";

export default function EquipmentResourcesPage() {
  return (
    <MainLayout>
      <EquipmentResourcesForm mode="create" />
    </MainLayout>
  );
}
