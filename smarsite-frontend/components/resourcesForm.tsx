import HumanResourcesForm from "@/components/HumanresourcesForm";
import EquipmentResourcesForm from "@/components/EquipmentresourcesForm";
import Link from "next/link";
import type { Resource } from "@/lib/types";

interface ResourceFormProps {
  mode: "create" | "edit";
  initialData?: Resource;
}

export default function ResourceForm({ mode, initialData }: ResourceFormProps) {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-card rounded-xl shadow border">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{mode === "create" ? "Create Resource" : "Edit Resource"}</h1>
        <Link href="/resources" className="text-sm text-muted-foreground">← Back</Link>
      </div>

      {/* Si c’est un humain ou création, on montre HumanResourcesForm */}
      {(initialData?.type === "Human" || !initialData) && (
        <HumanResourcesForm mode={mode} initialData={initialData} />
      )}

      {/* Si c’est un équipement ou création, on montre EquipmentResourcesForm */}
      {(initialData?.type === "Equipment" || !initialData) && (
        <EquipmentResourcesForm mode={mode} initialData={initialData} />
      )}
    </div>
  );
}
