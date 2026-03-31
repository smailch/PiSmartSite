"use client";

import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import EquipmentResourcesForm from "@/components/EquipmentresourcesForm";

export default function EquipmentResourcesPage() {
  return (
    <MainLayout>
      <PageHeader title="Add Equipment Resource" description="Create or edit equipment resources" />
      <EquipmentResourcesForm mode="create" />
    </MainLayout>
  );
}
