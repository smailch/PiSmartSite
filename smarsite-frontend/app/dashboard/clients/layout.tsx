import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import logoImg from "./logosmartsite.png";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "SmartSite — Espace client",
  description:
    "Découvrez notre accompagnement chantier : qualité, transparence et livraison maîtrisée.",
};

const navLink =
  "rounded-full px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white";
const navCta =
  "rounded-full border border-white/20 bg-white/[0.07] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-[#f28c28]/60 hover:bg-[#f28c28]/12 hover:text-[#f28c28]";

export default function ClientsMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-h-screen bg-[#041a24] text-white antialiased",
        "selection:bg-[#f28c28]/35 selection:text-white",
      )}
    >
      <header className="fixed top-0 z-50 w-full border-b border-white/[0.08] bg-[#0b4f6c]/88 shadow-[0_1px_0_rgba(242,140,40,0.12)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
          <Link
            href="/dashboard/clients"
            className="group flex items-center gap-3 transition-opacity hover:opacity-95"
          >
            <Image
              src={logoImg}
              alt="SmartSite"
              className="h-16 w-auto sm:h-[5.5rem] md:h-28 lg:h-32"
              sizes="(max-width: 640px) 240px, (max-width: 1024px) 360px, 420px"
              priority
            />
          </Link>
          <nav
            className="flex items-center gap-1 sm:gap-2"
            aria-label="Navigation espace client"
          >
            <a href="#offre" className={cn(navLink, "hidden sm:inline")}>
              Notre offre
            </a>
            <a href="#engagements" className={cn(navLink, "hidden sm:inline")}>
              Engagements
            </a>
            <a href="#telegram" className={cn(navLink, "hidden md:inline")}>
              Telegram
            </a>
            <Link href="/home" className={navCta}>
              Espace équipe
            </Link>
          </nav>
        </div>
      </header>
      <div className="pt-[108px] sm:pt-[128px] md:pt-[152px] lg:pt-[168px]">
        {children}
      </div>
    </div>
  );
}
