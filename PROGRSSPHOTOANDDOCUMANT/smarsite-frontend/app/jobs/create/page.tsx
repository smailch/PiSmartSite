"use client";

import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import JobForm from "@/components/JobForm";

export default function CreateJobPage() {
  return (
    <MainLayout>
     
      <JobForm mode="create" />
    </MainLayout>
  );
}
