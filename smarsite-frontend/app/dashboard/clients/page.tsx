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

/** Assets locaux absents du dépôt — URLs stables (remplacez par /public/... si vous ajoutez vos fichiers). */
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
        "inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-7 py-3.5 text-[15px] font-semibold text-white",
        "shadow-sm transition-all duration-200",
        "hover:bg-orange-600 hover:scale-[1.01]",
        "active:scale-100",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300",
        "motion-reduce:transform-none motion-reduce:hover:scale-100",
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
        "transition-all duration-200 hover:border-white/50 hover:bg-white/15 hover:text-orange-200",
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
          src={HERO_IMAGE_URL}
          alt="Professionnelle du BTP sur chantier, tablette en main"
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
            <span className="text-orange-300 drop-shadow-sm">livré avec rigueur</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-white/[0.92] sm:text-lg sm:leading-relaxed">
            SmartSite vous accompagne avec une approche claire, des équipes alignées
            et un suivi professionnel — tout ce qu&apos;il faut pour avancer sereinement,
            sans friction.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <PrimaryCta href="#contact">
              Demander une proposition
              <ArrowUpRight className="size-[1.125rem]" strokeWidth={2.25} aria-hidden />
            </PrimaryCta>
            <GhostCta href="#offre">Découvrir l&apos;offre</GhostCta>
            <Link
              href="/dream-house"
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-400/35 bg-orange-500/10 px-7 py-3.5 text-[15px] font-semibold text-orange-100 backdrop-blur-sm",
                "transition-all duration-200 hover:border-orange-400/55 hover:bg-orange-500/20 hover:text-white",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300",
              )}
            >
              Dream House — visualisation 3D
              <ArrowUpRight className="size-[1.125rem]" strokeWidth={2.25} aria-hidden />
            </Link>
          </div>
          <ul className="mt-16 flex flex-col gap-4 border-t border-white/15 pt-9 text-sm text-white/[0.88] sm:flex-row sm:flex-wrap sm:gap-x-12 sm:gap-y-3">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 font-mono text-xs font-bold tabular-nums text-orange-300">
                01
              </span>
              <span className="leading-snug">Construction &amp; exécution maîtrisées</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 font-mono text-xs font-bold tabular-nums text-orange-300">
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
        className="relative border-y border-white/10 bg-slate-900/40 py-16 sm:py-20"
        aria-labelledby="stats-heading"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(249,115,22,0.12),transparent)]"
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
            Valeurs
          </p>
          <h2
            id="engagements-heading"
            className="mt-3 text-balance text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl"
          >
            Une expérience client{" "}
            <span className="text-orange-400">simple et premium</span>
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-slate-400">
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

      {/* Partenariat */}
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
                alt="Partenariat professionnel sur chantier"
                fill
                className="object-cover transition duration-700 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-400">
              Partenariat
            </p>
            <h2
              id="partnership-heading"
              className="mt-3 text-balance text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl"
            >
              La réussite se construit{" "}
              <span className="text-blue-400">mains dans la main</span>
            </h2>
            <p className="mt-5 text-pretty text-base leading-relaxed text-slate-400">
              Comme sur vos chantiers, nous croyons à la proximité : écoute,
              engagement mutuel et objectifs partagés. Cette page est votre espace
              d&apos;accueil — clair, professionnel, tourné vers l&apos;action.
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
              Suivez votre chantier sur{" "}
              <span className="text-blue-400">Telegram</span>
            </h2>
            <p className="mt-4 text-pretty text-sm leading-relaxed text-slate-400 sm:text-base">
              Scannez le code ci-dessous avec l&apos;appareil photo de votre téléphone pour ouvrir
              notre bot et échanger avec nous en direct.
            </p>
            <div className="mt-10 flex justify-center">
              <div className="rounded-3xl border border-white/10 bg-card/80 p-6 shadow-lg shadow-black/25 backdrop-blur-xl sm:p-8">
                <Image
                  src={TELEGRAM_QR_IMAGE_URL}
                  alt="Code QR pour ouvrir le bot Telegram SmartSite — texte SCAN ME sous le code"
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
            Prêt à avancer sur votre prochain ouvrage ?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-pretty text-base leading-relaxed text-slate-400">
            Une question, un besoin ou une visite de site : nos équipes vous répondent
            dans les meilleurs délais.
          </p>
          <div className="mt-11 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <a
              href="mailto:contact@smartsite.example"
              className={cn(
                "inline-flex min-h-[3.25rem] min-w-[12.5rem] items-center justify-center gap-2 rounded-2xl bg-orange-500 px-8 py-3.5 text-base font-semibold text-white",
                "shadow-sm transition-all duration-200 hover:bg-orange-600 hover:scale-[1.02]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300",
                "motion-reduce:hover:scale-100",
              )}
            >
              Nous contacter
              <ArrowUpRight className="size-5" strokeWidth={2.25} aria-hidden />
            </a>
            <Link
              href="/home"
              className={cn(
                "inline-flex min-h-[3.25rem] min-w-[12.5rem] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-8 py-3.5 text-base font-semibold text-slate-200 shadow-lg shadow-black/20 backdrop-blur-md",
                "transition-all duration-200 hover:border-blue-500/30 hover:bg-blue-500/15 hover:text-blue-300",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400/50",
              )}
            >
              Accès espace équipe
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-slate-950 py-10 text-center">
        <p className="text-xs font-medium text-slate-500">
          © {new Date().getFullYear()} SmartSite — Espace client
        </p>
      </footer>
    </main>
  );
}
