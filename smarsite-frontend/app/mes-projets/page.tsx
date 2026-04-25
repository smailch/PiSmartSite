"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import { parseJwtRoleName } from "@/lib/appRoles";
import { getProjects } from "@/lib/api";
import type { Project } from "@/lib/types";
import { formatDh } from "@/lib/formatMoney";
import { Input } from "@/components/ui/input";
import { Filter, Loader2, Search, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRadioGroupKeyboard } from "@/hooks/useRadioGroupKeyboard";

const STATUS_FILTER = ["All", "En cours", "Terminé", "En retard"] as const;
type StatusFilter = (typeof STATUS_FILTER)[number];

export default function MesProjetsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const { getTabIndex, handleKeyDown, setItemRef } = useRadioGroupKeyboard(
    [...STATUS_FILTER],
    statusFilter,
    setStatusFilter,
  );

  useEffect(() => {
    const role = parseJwtRoleName(
      typeof window !== "undefined" ? localStorage.getItem("token") : null,
    );
    if (role && role !== "Client") {
      router.replace("/projects");
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
        if (!cancelled) setProjects(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Échec du chargement.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter !== "All" && p.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [p.name, p.description, p.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [projects, query, statusFilter]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center gap-2 text-muted-foreground" role="status">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Chargement de vos projets…
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
        title="Mes projets"
        description="Consultation uniquement — les modifications sont effectuées par l’équipe."
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Rechercher par nom, description, lieu…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 pl-9"
            aria-label="Recherche de projets"
          />
        </div>
        <div
          className="flex flex-wrap items-center gap-2"
          role="radiogroup"
          aria-label="Filtrer par statut"
        >
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
          {STATUS_FILTER.map((s, index) => {
            const active = statusFilter === s;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={active}
                ref={setItemRef(index)}
                tabIndex={getTabIndex(s)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/50",
                )}
              >
                {s === "All" ? "Tous" : s}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
          Aucun projet ne correspond à votre recherche.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => (
            <li
              key={p._id}
              className="rounded-2xl border border-white/10 bg-card/60 p-4 shadow-md shadow-black/15"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <Building2 className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-foreground">{p.name}</h2>
                    {p.description ? (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                        {p.description}
                      </p>
                    ) : null}
                    <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Statut</dt>
                        <dd className="font-medium text-foreground">{p.status}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Type</dt>
                        <dd className="font-medium text-foreground">{p.type}</dd>
                      </div>
                      {p.budget != null && (
                        <div>
                          <dt className="text-muted-foreground">Budget</dt>
                          <dd className="font-medium text-foreground tabular-nums">
                            {formatDh(p.budget)}
                          </dd>
                        </div>
                      )}
                      {p.spentBudget != null && p.spentBudget > 0 && (
                        <div>
                          <dt className="text-muted-foreground">Dépensé</dt>
                          <dd className="font-medium text-foreground tabular-nums">
                            {formatDh(p.spentBudget)}
                          </dd>
                        </div>
                      )}
                      {p.location ? (
                        <div className="sm:col-span-2">
                          <dt className="text-muted-foreground">Lieu</dt>
                          <dd className="font-medium text-foreground">{p.location}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt className="text-muted-foreground">Début</dt>
                        <dd className="font-medium text-foreground">
                          {p.startDate
                            ? new Date(p.startDate).toLocaleDateString("fr-FR")
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Fin</dt>
                        <dd className="font-medium text-foreground">
                          {p.endDate
                            ? new Date(p.endDate).toLocaleDateString("fr-FR")
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </MainLayout>
  );
}
