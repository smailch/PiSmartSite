"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import { parseJwtRoleName } from "@/lib/appRoles";
import { getProjects } from "@/lib/api";
import type { Project } from "@/lib/types";
import { formatDh } from "@/lib/formatMoney";
import { Building2, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function statusClass(status: Project["status"]): string {
  switch (status) {
    case "Terminé":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "En retard":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    default:
      return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  }
}

export default function ClientDashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const role = parseJwtRoleName(
      typeof window !== "undefined" ? localStorage.getItem("token") : null,
    );
    if (role && role !== "Client") {
      router.replace("/home");
      return;
    }
    if (!localStorage.getItem("token")) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await getProjects();
        if (!cancelled) {
          setProjects(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Impossible de charger les projets.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const stats = useMemo(() => {
    const list = projects;
    return {
      total: list.length,
      active: list.filter((p) => p.status === "En cours").length,
      done: list.filter((p) => p.status === "Terminé").length,
    };
  }, [projects]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center gap-2 text-muted-foreground" role="status">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Chargement de votre espace…
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <p className="text-destructive" role="alert">
          {error}
        </p>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Mon espace"
        description="Aperçu de vos projets de construction"
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Projets", value: stats.total },
          { label: "En cours", value: stats.active },
          { label: "Terminés", value: stats.done },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/10 bg-card/80 px-5 py-4 shadow-lg shadow-black/20"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Vos projets</h2>
        <Link
          href="/mes-projets"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Tout afficher
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          Aucun projet ne vous a encore été assigné.
        </p>
      ) : (
        <ul className="grid gap-3">
          {projects.slice(0, 6).map((p) => (
            <li key={p._id}>
              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-card/60 p-4 shadow-md shadow-black/15 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Building2 className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-foreground">{p.name}</h3>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {p.description ? p.description : "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {p.budget != null && (
                        <span className="rounded-md bg-muted/50 px-2 py-0.5">
                          Budget {formatDh(p.budget)}
                        </span>
                      )}
                      {p.location ? (
                        <span className="rounded-md bg-muted/50 px-2 py-0.5">{p.location}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      statusClass(p.status),
                    )}
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </MainLayout>
  );
}
