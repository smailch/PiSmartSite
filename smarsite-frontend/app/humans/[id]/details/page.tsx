"use client";
import { use } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Pencil,
  Phone,
  User,
  Briefcase,
  CreditCard,
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import type { Human } from "@/lib/types";
import { fetcher, getHumanKey } from "@/lib/api";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";

const API_BASE =
  typeof process.env.NEXT_PUBLIC_API_URL === "string"
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "http://localhost:3200";

function resolveAssetUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

export default function HumanDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const {
    data: human,
    isLoading,
    error,
  } = useSWR<Human>(getHumanKey(id), fetcher);
  const router = useRouter();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (first?: string, last?: string) =>
    `${first?.charAt(0) ?? ""}${last?.charAt(0) ?? ""}`.toUpperCase();

  return (
    <MainLayout>
      <PageHeader
        title="Employee Details"
        description="Complete profile and current status"
      />

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[70vh]">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : error || !human ? (
        <div className="mx-auto max-w-4xl rounded-3xl border border-destructive/30 bg-destructive/10 p-20 text-center shadow-sm">
          <p className="text-2xl text-destructive font-semibold">Employee not found</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-12 lg:space-y-16 text-foreground">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-3 text-lg font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft size={24} />
              Back to list
            </button>

            <Link
              href={`/humans/${human._id}/edit`}
              className="inline-flex items-center gap-3 rounded-2xl bg-accent px-8 py-4 text-lg font-medium text-accent-foreground shadow-sm transition-all duration-300 hover:brightness-110"
            >
              <Pencil size={20} />
              Edit Profile
            </Link>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="h-40 bg-gradient-to-r from-primary/35 via-primary/10 to-accent/25" />

            <div className="px-8 sm:px-12 lg:px-16 pb-12 lg:pb-16 -mt-20 relative">
              <div className="flex flex-col lg:flex-row lg:items-end gap-8 lg:gap-12">
                <div className="relative group flex-shrink-0">
                  <div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-3xl border-8 border-card bg-primary text-6xl font-bold text-primary-foreground shadow-sm ring-2 ring-border transition-all duration-300 group-hover:scale-[1.02] group-hover:ring-ring/50 lg:h-48 lg:w-48 lg:text-7xl">
                    {human.imageUrl ? (
                      <Image
                        src={resolveAssetUrl(human.imageUrl)}
                        alt={`${human.firstName} ${human.lastName}`}
                        fill
                        className="object-cover rounded-3xl"
                        sizes="(max-width: 1024px) 160px, 192px"
                      />
                    ) : (
                      getInitials(human.firstName, human.lastName)
                    )}
                  </div>
                  <div className="absolute -bottom-3 -right-3 h-8 w-8 rounded-full border-4 border-card bg-accent shadow-sm" />
                </div>

                <div className="flex-1">
                  <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground lg:text-6xl">
                    {human.firstName} {human.lastName}
                  </h1>
                  <p className="text-2xl lg:text-3xl text-muted-foreground mt-3 font-semibold">
                    {human.role || "Role not specified"}
                  </p>
                </div>

                <div className="lg:self-end">
                  {human.availability ? (
                    <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-500/35 bg-emerald-500/15 px-8 py-4 text-xl font-semibold text-emerald-200 shadow-sm">
                      <CheckCircle2 size={28} className="text-emerald-400" />
                      Available
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-3 rounded-2xl border border-destructive/35 bg-destructive/15 px-8 py-4 text-xl font-semibold text-destructive shadow-sm">
                      <XCircle size={28} className="text-destructive" />
                      Not Available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            <InfoSection title="Personal Information">
              <InfoRow icon={<User size={22} />} label="Full Name" value={`${human.firstName} ${human.lastName}`} large />
              <InfoRow icon={<CreditCard size={22} />} label="CIN / ID Number" value={human.cin || "—"} large />
              <InfoRow icon={<Calendar size={22} />} label="Date of Birth" value={formatDate(human.birthDate)} large />
              <InfoRow icon={<Phone size={22} />} label="Phone Number" value={human.phone || "—"} highlight large />
            </InfoSection>

            <InfoSection title="Professional Information">
              <InfoRow icon={<Briefcase size={22} />} label="Position / Role" value={human.role || "—"} large />
              <InfoRow
                icon={<CheckCircle2 size={22} />}
                label="Availability Status"
                value={human.availability ? "Available" : "Not Available"}
                valueClass={human.availability ? "text-emerald-400" : "text-destructive"}
                large
              />
              <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-6 transition-all duration-200 hover:border-ring/40">
                <div className="flex items-start gap-5">
                  <FileText size={28} className="mt-1 flex-shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="text-base text-muted-foreground mb-2 font-medium">Curriculum Vitae (HR)</p>
                    {human.cvUrl ? (
                      <a
                        href={resolveAssetUrl(human.cvUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 text-lg font-semibold text-primary transition-colors hover:text-accent"
                      >
                        View CV
                        <ExternalLink size={20} />
                      </a>
                    ) : (
                      <p className="text-muted-foreground">
                        No CV on file.{" "}
                        <Link
                          href={`/humans/${human._id}/edit`}
                          className="font-semibold text-primary underline-offset-4 hover:text-accent hover:underline"
                        >
                          Upload one in Edit profile
                        </Link>
                        .
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </InfoSection>

            <InfoSection title="Record Metadata">
              <InfoRow icon={<CreditCard size={22} />} label="Internal ID" value={human._id} mono small />
              <InfoRow icon={<Clock size={22} />} label="Created At" value={formatDateTime(human.createdAt)} small />
              <InfoRow icon={<Clock size={22} />} label="Last Updated" value={formatDateTime(human.updatedAt)} small />
            </InfoSection>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm lg:p-10">
      <h2 className="mb-6 border-b border-border pb-4 text-xl font-semibold tracking-tight text-foreground lg:mb-8 lg:text-2xl">
        {title}
      </h2>
      <div className="space-y-5 lg:space-y-6">{children}</div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value = "—",
  valueClass = "",
  highlight = false,
  mono = false,
  small = false,
  large = false,
}: any) {
  return (
    <div className="flex items-center gap-5 py-3 px-5 rounded-2xl hover:bg-muted/50 transition">
      <div className={`text-accent ${small ? "mt-0.5" : ""}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-muted-foreground ${small ? "text-sm" : large ? "text-lg" : "text-base"}`}>
          {label}
        </p>
        <p
          className={`font-semibold truncate leading-tight ${
            highlight
              ? "text-2xl text-primary lg:text-3xl"
              : large
              ? "text-xl lg:text-2xl text-foreground"
              : small
              ? "text-base text-foreground"
              : "text-lg text-foreground"
          } ${mono ? "font-mono text-base" : ""} ${valueClass}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}