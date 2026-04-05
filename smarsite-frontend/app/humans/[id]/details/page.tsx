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
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#0b4f6c] border-t-transparent" />
        </div>
      ) : error || !human ? (
        <div className="bg-white rounded-3xl border border-red-200 shadow-lg p-20 text-center max-w-4xl mx-auto">
          <p className="text-2xl text-red-600 font-semibold">Employee not found</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-12 lg:py-16 space-y-12 lg:space-y-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-3 text-gray-700 hover:text-[#0b4f6c] text-lg font-medium transition"
            >
              <ArrowLeft size={24} />
              Back to list
            </button>

            <Link
              href={`/humans/${human._id}/edit`}
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#0b4f6c] text-white text-lg font-medium rounded-2xl shadow-lg hover:bg-[#0b4f6c]/90 hover:shadow-xl transition-all duration-300"
            >
              <Pencil size={20} />
              Edit Profile
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl overflow-hidden">
            <div className="h-40 bg-gradient-to-r from-[#0b4f6c] via-[#0b4f6c]/90 to-[#f28c28]/40" />

            <div className="px-8 sm:px-12 lg:px-16 pb-12 lg:pb-16 -mt-20 relative">
              <div className="flex flex-col lg:flex-row lg:items-end gap-8 lg:gap-12">
                <div className="relative group flex-shrink-0">
                  <div className="h-40 w-40 lg:h-48 lg:w-48 rounded-3xl bg-[#0b4f6c] text-white flex items-center justify-center text-6xl lg:text-7xl font-bold shadow-2xl border-8 border-white ring-2 ring-gray-200/60 transition-all duration-300 group-hover:scale-105 group-hover:ring-[#f28c28]/40">
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
                  <div className="absolute -bottom-3 -right-3 h-8 w-8 bg-[#f28c28] rounded-full border-4 border-white shadow-lg" />
                </div>

                <div className="flex-1">
                  <h1 className="text-4xl lg:text-6xl font-extrabold text-[#0b4f6c] tracking-tight leading-tight">
                    {human.firstName} {human.lastName}
                  </h1>
                  <p className="text-2xl lg:text-3xl text-gray-700 mt-3 font-semibold">
                    {human.role || "Role not specified"}
                  </p>
                </div>

                <div className="lg:self-end">
                  {human.availability ? (
                    <div className="inline-flex items-center gap-3 px-8 py-4 bg-green-50 text-green-800 rounded-2xl text-xl font-semibold shadow-md border border-green-200">
                      <CheckCircle2 size={28} className="text-green-600" />
                      Available
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-3 px-8 py-4 bg-red-50 text-red-800 rounded-2xl text-xl font-semibold shadow-md border border-red-200">
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
                <div className="mt-6 p-6 bg-gray-50 border border-gray-200 rounded-2xl hover:border-[#f28c28]/60 transition-all duration-200">
                  <div className="flex items-start gap-5">
                    <FileText size={28} className="text-[#f28c28] mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-base text-gray-600 mb-2 font-medium">Curriculum Vitae</p>
                      <a
                        href={`http://localhost:3200${human.cvUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 text-[#0b4f6c] text-lg font-semibold hover:text-[#f28c28] transition"
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
    <div className="bg-white border border-gray-200 rounded-3xl shadow-xl p-8 lg:p-10">
      <h2 className="text-xl lg:text-2xl font-bold text-[#0b4f6c] uppercase tracking-wide mb-6 lg:mb-8 border-b border-gray-100 pb-4">
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
      <div className={`text-[#f28c28] ${small ? "mt-0.5" : ""}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-gray-500 ${small ? "text-sm" : large ? "text-lg" : "text-base"}`}>
          {label}
        </p>
        <p
          className={`font-semibold truncate leading-tight ${
            highlight
              ? "text-[#0b4f6c] text-2xl lg:text-3xl"
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