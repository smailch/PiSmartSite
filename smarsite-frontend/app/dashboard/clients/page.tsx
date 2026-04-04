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
import heroImg from "./813_pro_actu-drupal_eac_3c0_ca9d616042820ddfaf70627e63_eac3c0ca9d616042820ddfaf70627e63.jpg";
import partnershipImg from "./images (1).jpg";
import telegramQrImg from "./frame.png";
import { cn } from "@/lib/utils";

const BRAND_ORANGE = "#f28c28";
const BRAND_CYAN = "#7cc3e0";

const STATS = [
  { n: "15+", l: "Années d’expérience terrain" },
  { n: "100%", l: "Focus sur la sûreté & la conformité" },
  { n: "24/7", l: "Réactivité et proximité équipe" },
] as const;

const ENGAGEMENT_CARDS = [
  {
    icon: HardHat,
    title: "Votre chantier, notre priorité",
    body: "Coordination terrain, sécurité et rigueur d’exécution — le socle d’un suivi serein de bout en bout.",
    variant: "glass" as const,
  },
  {
    icon: Shield,
    title: "Transparence & confiance",
    body: "Des échanges réguliers et une méthode éprouvée pour garder le cap sur la qualité et les délais convenus.",
    variant: "teal" as const,
  },
  {
    icon: Hammer,
    title: "Excellence opérationnelle",
    body: "Outils modernes et équipes engagées pour une livraison qui tient ses promesses.",
    variant: "glass" as const,
  },
] as const;

const PARTNERSHIP_POINTS = [
  "Interlocuteurs dédiés et suivi personnalisé",
  "Méthodes alignées sur les standards du secteur",
  "Vision long terme pour vos ouvrages",
] as const;

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
        "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f28c28] px-7 py-3.5 text-[15px] font-semibold text-white",
        "shadow-[0_8px_24px_-4px_rgba(242,140,40,0.45)] transition duration-200",
        "hover:translate-y-[-1px] hover:brightness-105 hover:shadow-[0_12px_28px_-4px_rgba(242,140,40,0.5)]",
        "active:translate-y-0 active:brightness-95",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f28c28]",
        "motion-reduce:transform-none motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      {children}
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
        "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/[0.06] px-7 py-3.5 text-[15px] font-semibold text-white backdrop-blur-sm",
        "transition duration-200 hover:border-[#f28c28]/55 hover:bg-white/[0.10] hover:text-[#f28c28]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40",
        className,
      )}
    >
      {children}
    </a>
  );
}

export default function ClientsMarketingPage() {
  return (
    <main id="contenu-principal">
      {/* Hero */}
      <section
        className="relative isolate min-h-[min(92vh,56rem)] overflow-hidden"
        aria-labelledby="hero-title"
      >
        <Image
          src={heroImg}
          alt="Professionnelle du BTP sur chantier, tablette en main"
          fill
          priority
          quality={92}
          className="scale-[1.01] object-cover object-[center_30%] sm:object-[62%_center]"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#0b4f6c]/94 via-[#0b4f6c]/62 to-[#041a24]/50 sm:via-[#0b4f6c]/45 sm:to-[#041a24]/35"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#041a24]/75 via-transparent to-[#0b4f6c]/25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[min(40%,28rem)] -skew-x-[8deg] translate-x-1/4 bg-gradient-to-l from-[#f28c28]/88 to-[#f28c28]/20 opacity-90 sm:opacity-100"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.06]" aria-hidden />

        <div className="relative mx-auto flex min-h-[min(92vh,56rem)] max-w-6xl flex-col justify-center px-4 pb-20 pt-10 sm:px-6 lg:pb-28">
          <p
            className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/95 backdrop-blur-md sm:text-xs"
            style={{ borderColor: `${BRAND_ORANGE}33` }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: BRAND_ORANGE }}
              aria-hidden
            />
            Qualité &amp; précision sur vos chantiers
          </p>
          <h1
            id="hero-title"
            className="max-w-3xl text-balance text-4xl font-bold leading-[1.12] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[3.35rem]"
          >
            Conçu pour la force,{" "}
            <span className="text-[#f28c28] drop-shadow-sm">livré avec rigueur</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-white/[0.92] sm:text-lg sm:leading-relaxed">
            SmartSite vous accompagne avec une approche claire, des équipes alignées
            et un suivi professionnel — tout ce qu&apos;il faut pour avancer sereinement,
            sans friction.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <PrimaryCta href="#contact">
              Demander une proposition
              <ArrowUpRight className="size-[1.125rem]" strokeWidth={2.25} aria-hidden />
            </PrimaryCta>
            <GhostCta href="#offre">Découvrir l&apos;offre</GhostCta>
          </div>
          <ul className="mt-16 flex flex-col gap-4 border-t border-white/15 pt-9 text-sm text-white/[0.88] sm:flex-row sm:flex-wrap sm:gap-x-12 sm:gap-y-3">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 font-mono text-xs font-bold tabular-nums text-[#f28c28]">
                01
              </span>
              <span className="leading-snug">Construction &amp; exécution maîtrisées</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 font-mono text-xs font-bold tabular-nums text-[#f28c28]">
                02
              </span>
              <span className="leading-snug">Partenariat transparent avec nos clients</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Chiffres clés */}
      <section
        id="offre"
        className="relative border-y border-white/[0.07] bg-[#0b4f6c] py-16 sm:py-20"
        aria-labelledby="stats-heading"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(242,140,40,0.12),transparent)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-3 sm:gap-8 sm:px-6">
          <h2 id="stats-heading" className="sr-only">
            Indicateurs clés
          </h2>
          {STATS.map((item, i) => (
            <div
              key={item.l}
              className={cn(
                "rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-7 text-center backdrop-blur-sm sm:text-left",
                "shadow-[0_16px_40px_-24px_rgba(0,0,0,0.5)] transition hover:border-[#f28c28]/25",
                i === 1 && "sm:translate-y-1",
              )}
            >
              <p className="font-mono text-4xl font-bold tabular-nums tracking-tight text-[#f28c28] sm:text-5xl">
                {item.n}
              </p>
              <p className="mt-2.5 text-sm font-medium leading-snug text-white/80">
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f28c28]">
            Valeurs
          </p>
          <h2
            id="engagements-heading"
            className="mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Une expérience client{" "}
            <span className="text-[#f28c28]">simple et premium</span>
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-white/65">
            Pas de tableaux techniques ici : nous mettons l&apos;accent sur la clarté,
            la confiance et la visibilité sur l&apos;essentiel, comme dans les meilleures
            vitrines du secteur BTP.
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
                  "group relative overflow-hidden rounded-3xl border p-8 transition duration-300",
                  "shadow-[0_20px_50px_-28px_rgba(0,0,0,0.65)]",
                  isTeal
                    ? "border-[#0b4f6c]/50 bg-gradient-to-b from-[#0b4f6c]/35 to-[#062636]/80 md:mt-10"
                    : "border-white/[0.09] bg-white/[0.04] backdrop-blur-md hover:border-[#f28c28]/30",
                )}
              >
                <div
                  className={cn(
                    "mb-5 inline-flex rounded-2xl p-3.5 ring-1",
                    isTeal
                      ? "bg-white/[0.08] ring-white/10"
                      : "bg-[#f28c28]/[0.12] ring-[#f28c28]/20",
                  )}
                >
                  <Icon
                    className={cn("size-7", isTeal ? "text-[#7cc3e0]" : "text-[#f28c28]")}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-white">
                  {card.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-white/60 group-hover:text-white/70">
                  {card.body}
                </p>
                {index === 1 && (
                  <div
                    className="pointer-events-none absolute -right-12 -bottom-12 h-40 w-40 rounded-full bg-[#f28c28]/10 blur-3xl"
                    aria-hidden
                  />
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Partenariat */}
      <section
        className="border-t border-white/[0.07] bg-[#050f16] py-16 sm:py-24"
        aria-labelledby="partnership-heading"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-[0_28px_60px_-20px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.08]">
              <div
                className="pointer-events-none absolute -left-3 top-10 z-10 h-36 w-9 -skew-y-6 rounded-sm bg-gradient-to-b from-[#f28c28] to-[#f28c28]/50 shadow-lg"
                aria-hidden
              />
              <Image
                src={partnershipImg}
                alt="Partenariat professionnel sur chantier"
                fill
                className="object-cover transition duration-700 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f28c28]">
              Partenariat
            </p>
            <h2
              id="partnership-heading"
              className="mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              La réussite se construit{" "}
              <span style={{ color: BRAND_CYAN }}>mains dans la main</span>
            </h2>
            <p className="mt-5 text-pretty text-base leading-relaxed text-white/65">
              Comme sur vos chantiers, nous croyons à la proximité : écoute,
              engagement mutuel et objectifs partagés. Cette page est votre espace
              d&apos;accueil — clair, professionnel, tourné vers l&apos;action.
            </p>
            <ul className="mt-9 space-y-4">
              {PARTNERSHIP_POINTS.map((t) => (
                <li key={t} className="flex gap-3 text-sm leading-snug text-white/[0.88]">
                  <CheckCircle2
                    className="mt-0.5 size-5 shrink-0 text-[#f28c28]"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <PrimaryCta href="#contact" className="px-6 py-3 text-sm">
                Échanger avec nous
                <ArrowUpRight className="size-4" strokeWidth={2.25} aria-hidden />
              </PrimaryCta>
            </div>
          </div>
        </div>
      </section>

      {/* Bot Telegram — QR */}
      <section
        id="telegram"
        className="relative border-t border-white/[0.07] bg-[#041a24] py-16 sm:py-24"
        aria-labelledby="telegram-heading"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(242,140,40,0.08),transparent)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f28c28]">
              Assistant
            </p>
            <h2
              id="telegram-heading"
              className="mt-3 text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl"
            >
              Suivez votre chantier sur{" "}
              <span className="text-[#7cc3e0]">Telegram</span>
            </h2>
            <p className="mt-4 text-pretty text-sm leading-relaxed text-white/65 sm:text-base">
              Scannez le code ci-dessous avec l&apos;appareil photo de votre téléphone pour ouvrir
              notre bot et échanger avec nous en direct.
            </p>
            <div className="mt-10 flex justify-center">
              <div className="rounded-3xl bg-black p-6 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.12] sm:p-8">
                <Image
                  src={telegramQrImg}
                  alt="Code QR pour ouvrir le bot Telegram SmartSite — texte SCAN ME sous le code"
                  className="h-auto w-full max-w-[280px] object-contain"
                  sizes="(max-width: 640px) 85vw, 280px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="relative overflow-hidden border-t border-[#f28c28]/15 py-20 sm:py-28"
        aria-labelledby="contact-heading"
      >
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#0b4f6c] via-[#062636] to-[#02080c]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-32 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-[#f28c28]/15 blur-[100px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-[#0b4f6c]/40 blur-[80px]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2
            id="contact-heading"
            className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Prêt à avancer sur votre prochain ouvrage ?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-pretty text-base leading-relaxed text-white/70">
            Une question, un besoin ou une visite de site : nos équipes vous répondent
            dans les meilleurs délais.
          </p>
          <div className="mt-11 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <a
              href="mailto:contact@smartsite.example"
              className={cn(
                "inline-flex min-h-[3.25rem] min-w-[12.5rem] items-center justify-center gap-2 rounded-2xl bg-[#f28c28] px-8 py-3.5 text-base font-semibold text-white",
                "shadow-[0_10px_28px_-6px_rgba(242,140,40,0.5)] transition duration-200 hover:brightness-110",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f28c28]",
              )}
            >
              Nous contacter
              <ArrowUpRight className="size-5" strokeWidth={2.25} aria-hidden />
            </a>
            <Link
              href="/home"
              className={cn(
                "inline-flex min-h-[3.25rem] min-w-[12.5rem] items-center justify-center rounded-2xl border border-white/25 bg-white/[0.05] px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm",
                "transition duration-200 hover:border-[#f28c28]/50 hover:text-[#f28c28]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/35",
              )}
            >
              Accès espace équipe
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] bg-[#02080c] py-10 text-center">
        <p className="text-xs font-medium text-white/40">
          © {new Date().getFullYear()} SmartSite — Espace client
        </p>
      </footer>
    </main>
  );
}
