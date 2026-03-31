"use client";

import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import HumanResourcesForm from "@/components/HumanresourcesForm";

export default function HumanResourcesPage() {
  return (
    <MainLayout>
      <PageHeader title="Add Human Resource" description="Create or edit human resources" />
      <HumanResourcesForm mode="create" />
    </MainLayout>
  );
}
