"use client";

import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import JobForm from "@/components/JobForm";

export default function CreateJobPage() {
  return (
    <MainLayout>
      <PageHeader
        title="Create Job"
        description="Add a new job and assign resources"
      />
      <JobForm mode="create" />
    </MainLayout>
  );
}
