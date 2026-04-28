import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Hammer,
  HardHat,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Remote hero/partnership images — swap for /public/... if you add local assets. */
const HERO_IMAGE_URL =
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1920&q=80";
const PARTNERSHIP_IMAGE_URL =
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80";
const telegramDeepLink = "https://t.me/SmartSite_Project_bot";
const TELEGRAM_QR_IMAGE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(
  telegramDeepLink,
)}`;

const BRAND_ORANGE = "#f97316";

const STATS = [
  { n: "15+", l: "Years of field experience" },
  { n: "100%", l: "Focus on safety & compliance" },
  { n: "24/7", l: "Responsive, close-knit team" },
] as const;

const HERO_HIGHLIGHTS = [
  "Controlled construction & delivery",
  "Transparent partnership with our clients",
  "Digital follow-up for faster decisions",
] as const;

const ENGAGEMENT_CARDS = [
  {
    icon: HardHat,
    title: "Your site, our priority",
    body: "Field coordination, safety, and disciplined execution — the foundation for end-to-end visibility.",
    variant: "glass" as const,
  },
  {
    icon: Shield,
    title: "Transparency & trust",
    body: "Regular communication and a proven approach to quality and agreed timelines.",
    variant: "teal" as const,
  },
  {
    icon: Hammer,
    title: "Operational excellence",
    body: "Modern tools and committed teams for delivery that keeps its promises.",
    variant: "glass" as const,
  },
] as const;

const PARTNERSHIP_POINTS = [
  "Dedicated contacts and tailored follow-up",
  "Methods aligned with industry standards",
  "Long-term vision for your projects",
] as const;

const primaryBtnBase =
  "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-7 py-3.5 text-[15px] font-semibold text-white";
const primaryBtnVisual =
  "border border-orange-400/30 bg-gradient-to-b from-orange-500 to-orange-600 shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_10px_28px_-6px_rgba(249,115,22,0.55)]";
const primaryBtnHover =
  "transition-all duration-200 hover:border-orange-300/50 hover:from-orange-500 hover:to-orange-600 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset,0_14px_36px_-6px_rgba(249,115,22,0.6)]";
const primaryBtnActive =
  "active:scale-[0.99] motion-reduce:transform-none motion-reduce:hover:scale-100";
const primaryBtnFocus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300";

function PrimaryCta({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        primaryBtnBase,
        primaryBtnVisual,
        primaryBtnHover,
        primaryBtnActive,
        primaryBtnFocus,
        className,
      )}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      >
        <span className="absolute -left-1/3 top-0 h-full w-1/2 -skew-x-12 bg-white/20 blur-2xl" />
      </span>
      <span className="relative flex items-center gap-2">{children}</span>
    </a>
  );
}

function GhostCta({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.22] bg-white/[0.07] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-md",
        "transition-all duration-200 hover:border-white/45 hover:bg-white/[0.13] hover:text-white hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14)]",
        "active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/45",
        "motion-reduce:transform-none",
        className,
      )}
    >
      {children}
    </a>
  );
}

export default function ClientsMarketingPage() {
  return (
    <main id="main-content">
      {/* Hero */}
      <section
        className="relative isolate min-h-[min(92vh,56rem)] overflow-hidden"
        aria-labelledby="hero-title"
      >
        <Image
          src={HERO_IMAGE_URL}
          alt="Construction professional on site with a tablet"
          fill
          priority
          quality={92}
          className="scale-[1.01] object-cover object-[center_30%] sm:object-[62%_center]"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-slate-900/78 via-slate-900/48 to-slate-900/25 sm:via-slate-900/35 sm:to-slate-800/15"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-blue-900/15"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[min(40%,28rem)] -skew-x-[8deg] translate-x-1/4 bg-gradient-to-l from-orange-400/35 to-orange-200/10 opacity-90 sm:opacity-100"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" aria-hidden />

        <div className="relative mx-auto flex min-h-[min(92vh,56rem)] max-w-6xl flex-col justify-center px-4 pb-20 pt-8 sm:px-6 lg:pb-28">
          <p
            className="mb-6 inline-flex w-fit items-center gap-2.5 rounded-full border bg-white/[0.08] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/95 shadow-lg shadow-black/20 backdrop-blur-xl sm:text-xs"
            style={{ borderColor: `${BRAND_ORANGE}44` }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: BRAND_ORANGE }}
              aria-hidden
            />
            Quality &amp; precision on your sites
          </p>
          <h1
            id="hero-title"
            className="max-w-3xl text-balance text-4xl font-bold leading-[1.12] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[3.35rem]"
          >
            Built for strength,{" "}
            <span className="text-orange-300 drop-shadow-sm">delivered with discipline</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-white/[0.92] sm:text-lg sm:leading-relaxed">
            SmartSite brings a clear approach, aligned teams, and professional tracking —
            everything you need to move forward smoothly.
          </p>
          <div className="mt-10 flex w-full max-w-xl flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-3">
            <PrimaryCta href="#contact">
              Request a proposal
              <ArrowUpRight className="size-[1.125rem]" strokeWidth={2.25} aria-hidden />
            </PrimaryCta>
            <GhostCta href="#offre">Explore the offer</GhostCta>
            <Link
              href="/dream-house"
              className={cn(
                "inline-flex min-h-[3.125rem] items-center justify-center gap-2 rounded-2xl border border-orange-400/40 bg-orange-500/[0.12] px-7 py-3.5 text-[15px] font-semibold text-orange-50 backdrop-blur-md",
                "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] transition-all duration-200 hover:border-orange-400/65 hover:bg-orange-500/25 hover:text-white hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_8px_24px_-6px_rgba(249,115,22,0.35)]",
                "active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300",
                "motion-reduce:transform-none",
              )}
            >
              Dream House — visualisation 3D
              <ArrowUpRight className="size-[1.125rem]" strokeWidth={2.25} aria-hidden />
            </Link>
          </div>
          <ul className="mt-16 flex flex-col gap-4 border-t border-white/15 pt-9 text-sm text-white/[0.88] sm:flex-row sm:flex-wrap sm:gap-x-12 sm:gap-y-3">
            {HERO_HIGHLIGHTS.map((item, index) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 font-mono text-xs font-bold tabular-nums text-orange-300">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <span className="leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Key figures */}
      <section
        id="offre"
        className="relative border-y border-white/10 bg-slate-900/40 py-16 sm:py-20"
        aria-labelledby="stats-heading"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(249,115,22,0.12),transparent)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-3 sm:gap-8 sm:px-6">
          <h2 id="stats-heading" className="sr-only">
            Key indicators
          </h2>
          {STATS.map((item, i) => (
            <div
              key={item.l}
              className={cn(
                "rounded-2xl border border-white/10 bg-card/70 px-6 py-7 text-center shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-200 hover:border-white/[0.14] sm:text-left",
                i === 1 && "sm:translate-y-1",
              )}
            >
              <p className="font-mono text-4xl font-bold tabular-nums tracking-tight text-orange-400 sm:text-5xl">
                {item.n}
              </p>
              <p className="mt-2.5 text-sm font-medium leading-snug text-slate-400">
                {item.l}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Engagements */}
      <section
        id="engagements"
        className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24"
        aria-labelledby="engagements-heading"
      >
        <div className="mb-14 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-400">
            Values
          </p>
          <h2
            id="engagements-heading"
            className="mt-3 text-balance text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl"
          >
            A client experience that is{" "}
            <span className="text-orange-400">simple and premium</span>
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-slate-400">
            No dense spreadsheets here — we focus on clarity, trust, and visibility into what
            matters, like the best firms in the industry.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3 md:gap-6">
          {ENGAGEMENT_CARDS.map((card, index) => {
            const Icon = card.icon;
            const isTeal = card.variant === "teal";
            return (
              <article
                key={card.title}
                className={cn(
                  "group relative overflow-hidden rounded-3xl border border-white/10 bg-card/75 p-8 shadow-lg shadow-black/25 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.14]",
                  isTeal
                    ? "md:mt-10 bg-gradient-to-b from-blue-500/10 to-card/75"
                    : "",
                )}
              >
                <div
                  className={cn(
                    "mb-5 inline-flex rounded-2xl p-3.5",
                    isTeal
                      ? "border border-blue-500/20 bg-blue-500/15 ring-0"
                      : "border border-orange-500/20 bg-orange-500/10 ring-0",
                  )}
                >
                  <Icon
                    className={cn("size-7", isTeal ? "text-blue-400" : "text-orange-400")}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-100">
                  {card.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-400 group-hover:text-slate-300">
                  {card.body}
                </p>
                {index === 1 && (
                  <div
                    className="pointer-events-none absolute -right-12 -bottom-12 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl"
                    aria-hidden
                  />
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Partnership */}
      <section
        className="border-t border-white/10 bg-slate-950 py-16 sm:py-24"
        aria-labelledby="partnership-heading"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 shadow-lg shadow-black/30 ring-1 ring-white/5">
              <div
                className="pointer-events-none absolute -left-3 top-10 z-10 h-36 w-9 -skew-y-6 rounded-sm bg-gradient-to-b from-orange-400 to-orange-300/70 shadow-sm"
                aria-hidden
              />
              <Image
                src={PARTNERSHIP_IMAGE_URL}
                alt="Professional partnership on a construction site"
                fill
                className="object-cover transition duration-700 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-400">
              Partnership
            </p>
            <h2
              id="partnership-heading"
              className="mt-3 text-balance text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl"
            >
              Success is built{" "}
              <span className="text-blue-400">hand in hand</span>
            </h2>
            <p className="mt-5 text-pretty text-base leading-relaxed text-slate-400">
              Like on your sites, we believe in proximity: listening, mutual commitment, and
              shared goals. This page is your welcome space — clear, professional, action-oriented.
            </p>
            <ul className="mt-9 space-y-4">
              {PARTNERSHIP_POINTS.map((t) => (
                <li key={t} className="flex gap-3 text-sm leading-snug text-slate-300">
                  <CheckCircle2
                    className="mt-0.5 size-5 shrink-0 text-orange-400"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <PrimaryCta href="#contact" className="px-6 py-3 text-sm leading-none">
                Talk to us
                <ArrowUpRight className="size-4" strokeWidth={2.25} aria-hidden />
              </PrimaryCta>
            </div>
          </div>
        </div>
      </section>

      {/* Telegram bot — QR */}
      <section
        id="telegram"
        className="relative border-t border-white/10 bg-slate-900/35 py-16 sm:py-24"
        aria-labelledby="telegram-heading"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(249,115,22,0.1),transparent)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-400">
              Assistant
            </p>
            <h2
              id="telegram-heading"
              className="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl"
            >
              Follow your site on{" "}
              <span className="text-blue-400">Telegram</span>
            </h2>
            <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-400 sm:text-base">
              Scan the code below with your phone camera to open our bot and chat with us live.
            </p>
            <div className="mt-10 flex justify-center">
              <div className="rounded-3xl border border-white/10 bg-card/80 p-6 shadow-lg shadow-black/25 backdrop-blur-xl sm:p-8">
                <Image
                  src={TELEGRAM_QR_IMAGE_URL}
                  alt="QR code to open the SmartSite Telegram bot — SCAN ME text under the code"
                  width={280}
                  height={280}
                  className="h-auto w-full max-w-[280px] object-contain"
                  sizes="(max-width: 640px) 85vw, 280px"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="relative overflow-hidden border-t border-white/10 py-20 sm:py-28"
        aria-labelledby="contact-heading"
      >
        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-32 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-orange-500/15 blur-[100px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-blue-500/15 blur-[80px]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2
            id="contact-heading"
            className="text-balance text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl"
          >
            Ready to move forward on your next project?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-pretty text-base leading-relaxed text-slate-400">
            A question, a need, or a site visit — our teams respond as soon as possible.
          </p>
          <div className="mt-11 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <a
              href="mailto:contact@smartsite.example"
              className={cn(
                primaryBtnBase,
                primaryBtnVisual,
                primaryBtnHover,
                primaryBtnActive,
                primaryBtnFocus,
                "min-h-[3.25rem] min-w-[min(100%,12.5rem)] px-8 py-3.5 text-base",
              )}
            >
              <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden>
                <span className="absolute -left-1/3 top-0 h-full w-1/2 -skew-x-12 bg-white/20 blur-2xl" />
              </span>
              <span className="relative flex items-center gap-2">
                Contact us
                <ArrowUpRight className="size-5" strokeWidth={2.25} aria-hidden />
              </span>
            </a>
            <Link
              href="/home"
              className={cn(
                "inline-flex min-h-[3.25rem] min-w-[min(100%,12.5rem)] items-center justify-center rounded-2xl border border-white/[0.14] bg-white/[0.06] px-8 py-3.5 text-base font-semibold text-slate-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md",
                "transition-all duration-200 hover:border-blue-400/35 hover:bg-blue-500/12 hover:text-blue-200 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_8px_28px_-8px_rgba(59,130,246,0.25)]",
                "active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400/45",
                "motion-reduce:transform-none",
              )}
            >
              Team portal
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.08] bg-slate-950 py-12 text-center">
        <p className="text-xs font-medium tracking-wide text-slate-500">
          © {new Date().getFullYear()} SmartSite — Espace client
        </p>
      </footer>
    </main>
  );
}
