"use client";

import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import HumanResourcesForm from "@/components/HumanresourcesForm";

export default function HumanResourcesPage() {
  return (
    <MainLayout>
      <HumanResourcesForm mode="create" />
    </MainLayout>
  );
}
