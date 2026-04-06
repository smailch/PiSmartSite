"use client";
import { use } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
        </div>
      ) : error || !human ? (
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-100 bg-red-50/50 p-20 text-center shadow-sm">
          <p className="text-2xl text-red-600 font-semibold">Employee not found</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-12 lg:py-16 space-y-12 lg:space-y-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-3 text-lg font-medium text-gray-700 transition-colors hover:text-blue-600"
            >
              <ArrowLeft size={24} />
              Back to list
            </button>

            <Link
              href={`/humans/${human._id}/edit`}
              className="inline-flex items-center gap-3 rounded-2xl bg-orange-500 px-8 py-4 text-lg font-medium text-white shadow-sm transition-all duration-300 hover:bg-orange-600"
            >
              <Pencil size={20} />
              Edit Profile
            </Link>
          </div>

          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="h-40 bg-gradient-to-r from-blue-100 via-blue-50 to-orange-50" />

            <div className="px-8 sm:px-12 lg:px-16 pb-12 lg:pb-16 -mt-20 relative">
              <div className="flex flex-col lg:flex-row lg:items-end gap-8 lg:gap-12">
                <div className="relative group flex-shrink-0">
                  <div className="flex h-40 w-40 items-center justify-center rounded-3xl border-8 border-white bg-blue-600 text-6xl font-bold text-white shadow-sm ring-2 ring-gray-100 transition-all duration-300 group-hover:scale-[1.02] group-hover:ring-orange-200 lg:h-48 lg:w-48 lg:text-7xl">
                    {human.imageUrl ? (
                      <img
                        src={`http://localhost:3200${human.imageUrl}`}
                        alt={`${human.firstName} ${human.lastName}`}
                        className="h-full w-full object-cover rounded-3xl"
                      />
                    ) : (
                      getInitials(human.firstName, human.lastName)
                    )}
                  </div>
                  <div className="absolute -bottom-3 -right-3 h-8 w-8 rounded-full border-4 border-white bg-orange-400 shadow-sm" />
                </div>

                <div className="flex-1">
                  <h1 className="text-4xl font-semibold leading-tight tracking-tight text-gray-800 lg:text-6xl">
                    {human.firstName} {human.lastName}
                  </h1>
                  <p className="text-2xl lg:text-3xl text-gray-700 mt-3 font-semibold">
                    {human.role || "Role not specified"}
                  </p>
                </div>

                <div className="lg:self-end">
                  {human.availability ? (
                    <div className="inline-flex items-center gap-3 rounded-2xl border border-green-100 bg-green-50 px-8 py-4 text-xl font-semibold text-green-800 shadow-sm">
                      <CheckCircle2 size={28} className="text-green-600" />
                      Available
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-8 py-4 text-xl font-semibold text-red-800 shadow-sm">
                      <XCircle size={28} className="text-red-600" />
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
                valueClass={human.availability ? "text-green-700" : "text-red-700"}
                large
              />
              {human.cvUrl && (
                <div className="mt-6 rounded-2xl border border-gray-100 bg-slate-50 p-6 transition-all duration-200 hover:border-orange-200">
                  <div className="flex items-start gap-5">
                    <FileText size={28} className="mt-1 flex-shrink-0 text-orange-500" />
                    <div>
                      <p className="text-base text-gray-600 mb-2 font-medium">Curriculum Vitae</p>
                      <a
                        href={`http://localhost:3200${human.cvUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 text-lg font-semibold text-blue-600 transition-colors hover:text-orange-500"
                      >
                        View CV
                        <ExternalLink size={20} />
                      </a>
                    </div>
                  </div>
                </div>
              )}
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

/* InfoSection inchangé */
function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm lg:p-10">
      <h2 className="mb-6 border-b border-gray-100 pb-4 text-xl font-semibold tracking-tight text-gray-800 lg:mb-8 lg:text-2xl">
        {title}
      </h2>
      <div className="space-y-5 lg:space-y-6">{children}</div>
    </div>
  );
}

/* InfoRow corrigé */
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
    <div className="flex items-center gap-5 py-3 px-5 rounded-2xl hover:bg-gray-50/80 transition">
      <div className={`text-orange-500 ${small ? "mt-0.5" : ""}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-gray-500 ${small ? "text-sm" : large ? "text-lg" : "text-base"}`}>
          {label}
        </p>
        <p
          className={`font-semibold truncate leading-tight ${
            highlight
              ? "text-2xl text-blue-600 lg:text-3xl"
              : large
              ? "text-xl lg:text-2xl"
              : small
              ? "text-base"
              : "text-lg"
          } ${mono ? "font-mono text-base" : ""} ${valueClass}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}