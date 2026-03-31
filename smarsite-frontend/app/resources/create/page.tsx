"use client";

import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import ResourceForm from "@/components/resourcesForm";

export default function CreateResourcePage() {
  return (
    <MainLayout>
      <PageHeader
        title="Create Resource"
        description="Add a new human or equipment resource"
      />
      <ResourceForm mode="create" />
    </MainLayout>
  );
}
