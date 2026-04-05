"use client";

import { use, type ReactNode } from "react";
import useSWR from "swr";
import Link from "next/link";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import type { Equipment } from "@/lib/types";
import { fetcher, getEquipmentKey } from "@/lib/api";
import {
  Package,
  Tag,
  Hash,
  Building,
  MapPin,
  Calendar,
  Pencil,
  CheckCircle2,
  XCircle,
} from "lucide-react";

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR");
}

export default function EquipmentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: equipment, isLoading, error } = useSWR<Equipment>(
    getEquipmentKey(id),
    fetcher
  );

  return (
    <MainLayout>
      <PageHeader
        title="Fiche équipement"
        description="Consultation des informations (lecture seule)"
      />

      {isLoading ? (
        <div className="mx-auto max-w-4xl rounded-xl border border-border bg-card p-12 shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Chargement…</p>
          </div>
        </div>
      ) : error || !equipment ? (
        <div className="mx-auto max-w-4xl rounded-xl border border-destructive/30 bg-card p-12 text-center shadow-sm">
          <p className="font-medium text-destructive">
            Équipement introuvable ou supprimé.
          </p>
          <Link
            href="/equipment"
            className="mt-4 inline-block text-sm text-primary underline"
          >
            Retour à la liste
          </Link>
        </div>
      ) : (
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-foreground">{equipment.name}</h2>
            <Link
              href={`/equipment/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0b4f6c] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#0b4f6c]/90"
            >
              <Pencil className="h-4 w-4" />
              Modifier
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900/80">
            <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0b4f6c]/10">
                <Package className="h-6 w-6 text-[#0b4f6c]" />
              </div>
              <h3 className="text-lg font-semibold text-[#0b4f6c] dark:text-gray-100">
                Identification
              </h3>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailRow icon={<Tag className="h-4 w-4" />} label="Catégorie" value={equipment.category} />
              <DetailRow icon={<Hash className="h-4 w-4" />} label="N° de série" value={equipment.serialNumber} />
              <DetailRow icon={<Package className="h-4 w-4" />} label="Modèle" value={equipment.model} />
              <DetailRow icon={<Building className="h-4 w-4" />} label="Marque" value={equipment.brand} />
            </dl>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900/80">
            <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f28c28]/10">
                <Calendar className="h-6 w-6 text-[#f28c28]" />
              </div>
              <h3 className="text-lg font-semibold text-[#0b4f6c] dark:text-gray-100">
                Dates & emplacement
              </h3>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailRow
                icon={<Calendar className="h-4 w-4" />}
                label="Date d’achat"
                value={formatDate(equipment.purchaseDate)}
              />
              <DetailRow
                icon={<Calendar className="h-4 w-4" />}
                label="Dernière maintenance"
                value={formatDate(equipment.lastMaintenanceDate)}
              />
              <div className="sm:col-span-2">
                <DetailRow
                  icon={<MapPin className="h-4 w-4" />}
                  label="Localisation"
                  value={equipment.location}
                />
              </div>
            </dl>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50/80 p-6 dark:border-gray-800 dark:bg-gray-900/50">
            {equipment.availability ? (
              <>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Disponible</p>
                  <p className="text-sm text-muted-foreground">Prêt à l’emploi</p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Indisponible</p>
                  <p className="text-sm text-muted-foreground">Non affectable pour le moment</p>
                </div>
              </>
            )}
          </div>

          <div className="text-center">
            <Link href="/equipment" className="text-sm text-primary underline">
              ← Retour à la liste des équipements
            </Link>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-1 break-words text-base font-medium text-foreground">{value || "—"}</dd>
      </div>
    </div>
  );
}
