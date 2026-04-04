"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  LayoutDashboard,
  LayoutList,
  Link2,
  Wallet,
} from "lucide-react";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import type { BackendTask, Project } from "@/lib/types";
import { fetcher, getTasksByProjectKey } from "@/lib/api";
import { formatDh } from "@/lib/formatMoney";
import { cn } from "@/lib/utils";
import {
  computeAverageProgress,
  computeTasksDoneCount,
  getBlockedTasksCount,
  getCriticalPathTaskIds,
  getOverdueTasks,
  projectBudgetDelta,
} from "@/lib/projectOverviewKpi";

interface PageParams {
  id: string;
}

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof LayoutDashboard;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
          {subtitle ? (
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{subtitle}</p>
          ) : null}
        </div>
        <div className="shrink-0 rounded-xl bg-primary/10 p-3 text-primary">
          <Icon className="size-6" aria-hidden />
        </div>
      </div>
    </div>
  );
}

export default function ProjectOverviewPage({ params }: { params: Promise<PageParams> }) {
  const { id } = use(params);
  const idOk = OBJECT_ID_RE.test(id);

  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useSWR<Project>(idOk ? `/projects/${id}` : null, fetcher);

  const {
    data: tasks = [],
    isLoading: tasksLoading,
    error: tasksError,
  } = useSWR<BackendTask[]>(idOk ? getTasksByProjectKey(id) : null, fetcher);

  const isLoading = projectLoading || tasksLoading;
  const hasError = projectError || tasksError || !idOk;

  const now = useMemo(() => new Date(), []);

  const kpis = useMemo(() => {
    const avg = computeAverageProgress(tasks);
    const { done, total } = computeTasksDoneCount(tasks);
    const overdue = getOverdueTasks(tasks, now);
    const blocked = getBlockedTasksCount(tasks);
    const pathIds = getCriticalPathTaskIds(tasks);
    const byId = new Map(tasks.map((t) => [t._id, t]));
    const criticalTasks = pathIds.map((tid) => byId.get(tid)).filter(Boolean) as BackendTask[];
    return { avg, done, total, overdue, blocked, pathIds, criticalTasks };
  }, [tasks, now]);

  const delta = project ? projectBudgetDelta(project) : null;

  return (
    <MainLayout>
      <PageHeader
        title="Synthèse projet"
        description={
          project
            ? `${project.name} — indicateurs, budget, retards et chemin critique.`
            : idOk
              ? "Chargement…"
              : "Identifiant invalide."
        }
      >
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href="/projects">
            <ArrowLeft className="size-4" aria-hidden />
            Projets
          </Link>
        </Button>
      </PageHeader>

      {!idOk && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Identifiant de projet invalide.
        </p>
      )}

      {isLoading && idOk && (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card p-10">
          <p className="text-sm text-muted-foreground">Chargement du projet et des tâches…</p>
        </div>
      )}

      {hasError && !isLoading && idOk && (
        <div className="rounded-xl border border-destructive/30 bg-card p-6">
          <p className="text-sm font-medium text-destructive">
            Impossible de charger la synthèse pour ce projet.
          </p>
        </div>
      )}

      {!isLoading && !hasError && idOk && project && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2 shadow-sm">
              <Link href={`/projects/${id}/gantt`}>
                <BarChart3 className="size-4" aria-hidden />
                Diagramme de Gantt
              </Link>
            </Button>
            <Button variant="secondary" asChild className="gap-2 shadow-sm">
              <Link href={`/tasks?project=${id}&view=board`}>
                <LayoutList className="size-4" aria-hidden />
                Kanban des tâches
              </Link>
            </Button>
          </div>

          {project.description?.trim() ? (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{project.description}</p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Avancement moyen"
              value={`${kpis.avg}%`}
              subtitle={
                kpis.total > 0
                  ? `${kpis.done} terminée(s) sur ${kpis.total} tâche(s)`
                  : "Aucune tâche pour ce projet"
              }
              icon={CheckCircle2}
            />
            <KpiCard
              title="Tâches en retard"
              value={kpis.overdue.length}
              subtitle={
                kpis.overdue.length > 0
                  ? "Échéance de fin dépassée (hors « Terminé »)"
                  : "Aucune tâche en retard sur échéance"
              }
              icon={AlertTriangle}
              className={
                kpis.overdue.length > 0 ? "border-amber-500/30 bg-amber-500/[0.06]" : undefined
              }
            />
            <KpiCard
              title="Tâches bloquées"
              value={kpis.blocked}
              subtitle="En attente de prédécesseurs non terminés"
              icon={Link2}
            />
            <KpiCard
              title="Chemin critique"
              value={kpis.pathIds.length > 0 ? `${kpis.criticalTasks.length} tâche(s)` : "—"}
              subtitle={
                kpis.pathIds.length > 0
                  ? "Séquence la plus longue (durées + dépendances)"
                  : "Pas de graphe exploitable (cycle ou aucune tâche)"
              }
              icon={LayoutDashboard}
            />
          </div>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Wallet className="size-5 text-primary" aria-hidden />
              Budget
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Alloué</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {typeof project.budget === "number" && !Number.isNaN(project.budget)
                    ? formatDh(project.budget)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Dépensé</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {formatDh(project.spentBudget ?? 0)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Écart</dt>
                <dd
                  className={cn(
                    "mt-1 text-lg font-semibold tabular-nums",
                    delta != null && delta > 0 && "text-destructive",
                    delta != null && delta <= 0 && "text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {delta != null ? (
                    <>
                      {delta > 0 ? "+" : ""}
                      {formatDh(delta)}
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Statut projet : <span className="font-medium text-foreground">{project.status}</span>
              {project.startDate ? (
                <>
                  {" "}
                  · Début : {new Date(project.startDate).toLocaleDateString("fr-FR")}
                </>
              ) : null}
              {project.endDate ? (
                <>
                  {" "}
                  · Fin prévue : {new Date(project.endDate).toLocaleDateString("fr-FR")}
                </>
              ) : null}
            </p>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">Tâches en retard</h2>
              {kpis.overdue.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Aucune.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {kpis.overdue.slice(0, 8).map((t) => (
                    <li key={t._id}>
                      <Link
                        href={`/tasks?project=${id}&view=board&focusTask=${t._id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {t.title}
                      </Link>
                      <span className="ml-2 text-xs text-muted-foreground">
                        fin {t.endDate ? new Date(t.endDate).toLocaleDateString("fr-FR") : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">Chemin critique</h2>
              {kpis.criticalTasks.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Aucune séquence critique calculée (projet sans tâche, ou dépendances circulaires).
                </p>
              ) : (
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
                  {kpis.criticalTasks.map((t) => (
                    <li key={t._id}>
                      <Link
                        href={`/tasks?project=${id}&view=board&focusTask=${t._id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {t.title}
                      </Link>
                      <span className="text-muted-foreground">
                        {" "}
                        · {t.status} · {Math.min(100, Math.max(0, t.progress ?? 0))}%
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
