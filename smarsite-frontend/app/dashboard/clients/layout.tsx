import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Home, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "SmartSite — Espace client",
  description:
    "Découvrez notre accompagnement chantier : qualité, transparence et livraison maîtrisée.",
};

const navLink =
  "rounded-full px-3.5 py-2 text-sm font-medium text-slate-300/95 transition-all duration-200 hover:bg-white/[0.08] hover:text-white active:scale-[0.98]";

const navPillGroup =
  "hidden items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.04] p-1 shadow-inner shadow-black/20 sm:flex";

export default function ClientsMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-h-screen bg-slate-950 text-slate-100 antialiased",
        "selection:bg-orange-500/30 selection:text-white",
      )}
    >
      <header className="fixed top-0 z-50 w-full border-b border-white/[0.09] bg-slate-950/75 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.55)] backdrop-blur-2xl supports-[backdrop-filter]:bg-slate-950/65">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/25 to-transparent" />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-6 sm:py-4">
          <Link
            href="/dashboard/clients"
            className="group flex shrink-0 items-center gap-3 rounded-xl outline-offset-4 transition-[opacity,transform] hover:opacity-95 active:scale-[0.99]"
          >
            <Image
              src="/logo-smartsite-clients.svg"
              alt="SmartSite"
              width={420}
              height={96}
              className="h-[3.65rem] w-auto transition-transform duration-300 group-hover:scale-[1.01] sm:h-[5rem] md:h-[5.75rem] lg:h-24"
              sizes="(max-width: 640px) 240px, (max-width: 1024px) 360px, 420px"
              priority
            />
          </Link>
          <nav
            className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2"
            aria-label="Navigation espace client"
          >
            <div className={navPillGroup} role="presentation">
              <a href="#offre" className={navLink}>
                Notre offre
              </a>
              <a href="#engagements" className={navLink}>
                Engagements
              </a>
              <a href="#telegram" className={cn(navLink, "hidden lg:inline")}>
                Telegram
              </a>
            </div>
            <a href="#telegram" className={cn(navLink, "sm:hidden")}>
              Bot
            </a>
            <Link
              href="/dream-house"
              title="Dream House — visualisation 3D"
              className={cn(
                navLink,
                "inline-flex shrink-0 items-center gap-1.5 text-orange-200/95",
              )}
            >
              <Home
                className="size-[1.05rem] shrink-0 text-orange-300/90"
                aria-hidden
              />
              <span className="hidden sm:inline">Dream House</span>
            </Link>
            <Link
              href="/home"
              className={cn(
                "group/cta relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full px-4 py-2.5 text-sm font-semibold",
                "border border-orange-400/35 bg-gradient-to-b from-orange-500/25 to-orange-600/15 text-orange-50",
                "shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset,0_8px_24px_-4px_rgba(249,115,22,0.35)]",
                "transition-all duration-200 hover:border-orange-400/50 hover:from-orange-500/35 hover:to-orange-600/25 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_12px_28px_-4px_rgba(249,115,22,0.45)]",
                "active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400/60",
              )}
            >
              <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/cta:opacity-100">
                <span className="absolute -left-1/2 top-0 h-full w-1/2 -skew-x-12 bg-white/15 blur-xl" />
              </span>
              <LogIn
                className="relative size-4 shrink-0 opacity-90"
                strokeWidth={2.25}
                aria-hidden
              />
              <span className="relative">Se connecter</span>
            </Link>
          </nav>
        </div>
      </header>
      <div className="pt-[104px] sm:pt-[120px] md:pt-[138px] lg:pt-[144px]">
        {children}
      </div>
    </div>
  );
}
