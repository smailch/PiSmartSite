"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import useSWR from "swr";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  LayoutDashboard,
  ListTodo,
  Plus,
  Users,
  Wallet,
} from "lucide-react";
import {
  buildBudgetUtilizationRows,
  buildDashboardAlerts,
  buildStatusChartData,
  buildTodoItems,
  projectProgressFromTasks,
} from "@/lib/dashboardHome";
import { projectStatusLabelEn } from "@/lib/projectStatusLabel";
import { fetcher, getProjectsKey, getTasksKey } from "@/lib/api";
import { formatDh } from "@/lib/formatMoney";
import type { BackendTask, Project } from "@/lib/types";
import { computeTasksDoneCount } from "@/lib/projectOverviewKpi";
import { cn } from "@/lib/utils";

const DashboardChartsBlock = dynamic(
  () => import("@/components/DashboardChartsBlock"),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-[380px] animate-pulse rounded-2xl border border-border/60 bg-muted/40 motion-reduce:animate-none"
          />
        ))}
      </div>
    ),
  },
);

function statusPillClass(status: Project["status"]): string {
  switch (status) {
    case "Terminé":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "En retard":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
    default:
      return "bg-sky-500/15 text-sky-800 dark:text-sky-200";
  }
}

export default function Dashboard() {
  const {
    data: projects = [],
    error: projectsError,
    isLoading: projectsLoading,
  } = useSWR<Project[]>(getProjectsKey(), fetcher, { revalidateOnFocus: true });

  const {
    data: tasks = [],
    error: tasksError,
    isLoading: tasksLoading,
  } = useSWR<BackendTask[]>(getTasksKey(), fetcher, { revalidateOnFocus: true });

  const loading = projectsLoading || tasksLoading;
  const error = projectsError || tasksError;

  const now = useMemo(() => new Date(), []);

  const stats = useMemo(() => {
    const total = projects.length;
    const actifs = projects.filter((p) => p.status !== "Terminé").length;
    const termines = projects.filter((p) => p.status === "Terminé").length;
    const budgetTotal = projects.reduce(
      (s, p) => s + (typeof p.budget === "number" ? p.budget : 0),
      0,
    );
    const spentTotal = projects.reduce((s, p) => s + (p.spentBudget ?? 0), 0);
    const { done, total: tTotal } = computeTasksDoneCount(tasks);
    return {
      total,
      actifs,
      termines,
      budgetTotal,
      spentTotal,
      tasksDone: done,
      tasksTotal: tTotal,
    };
  }, [projects, tasks]);

  const statusChartData = useMemo(
    () => buildStatusChartData(projects),
    [projects],
  );
  const budgetChartData = useMemo(
    () => buildBudgetUtilizationRows(projects, 6),
    [projects],
  );
  const alerts = useMemo(
    () => buildDashboardAlerts(projects, tasks, now),
    [projects, tasks, now],
  );
  const todoItems = useMemo(
    () => buildTodoItems(projects, tasks, now, 6),
    [projects, tasks, now],
  );

  const tableRows = useMemo(() => {
    const sorted = [...projects].sort((a, b) => {
      const ta = new Date(a.startDate).getTime();
      const tb = new Date(b.startDate).getTime();
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });
    return sorted.slice(0, 12).map((p) => ({
      ...p,
      completion: projectProgressFromTasks(p._id, tasks),
      budgetLabel: formatDh(p.budget),
      spentLabel: formatDh(p.spentBudget ?? 0),
      locationLabel: p.location?.trim() ? p.location : "—",
    }));
  }, [projects, tasks]);

  return (
    <MainLayout>
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl motion-safe:animate-pulse motion-reduce:animate-none"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-20 h-56 w-56 rounded-full bg-accent/15 blur-3xl motion-safe:animate-[pulse_3s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ animationDelay: "0.5s" }}
          aria-hidden
        />

        <PageHeader
          title="Tableau de bord"
          description="Vue d’ensemble de vos chantiers, budgets et tâches — données en direct."
        >
          <Link
            href="/dashboard/clients"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#f28c28] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#f28c28]/30 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f28c28] motion-reduce:transition-none"
          >
            <Users size={18} aria-hidden />
            Dashboard clients
            <ArrowRight size={16} className="opacity-90" aria-hidden />
          </Link>
        </PageHeader>

        {error ? (
          <div
            className="mb-8 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            Impossible de charger les données. Vérifiez l’API et{" "}
            <code className="rounded bg-muted px-1">NEXT_PUBLIC_API_URL</code>.
          </div>
        ) : null}

        {/* KPI — Bento */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            <>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[120px] animate-pulse rounded-xl border border-border/60 bg-muted/40 motion-reduce:animate-none"
                />
              ))}
            </>
          ) : (
            <>
              <StatCard
                title="Projets actifs"
                value={stats.actifs}
                icon={Building2}
                bgColor="bg-card"
                iconColor="text-primary"
              />
              <StatCard
                title="Projets terminés"
                value={stats.termines}
                icon={CheckCircle2}
                bgColor="bg-muted/40"
                iconColor="text-primary"
              />
              <StatCard
                title="Budget total"
                value={formatDh(stats.budgetTotal)}
                icon={Wallet}
                bgColor="bg-card"
                iconColor="text-accent"
              />
              <StatCard
                title="Tâches terminées"
                value={
                  stats.tasksTotal
                    ? `${stats.tasksDone} / ${stats.tasksTotal}`
                    : "—"
                }
                icon={ListTodo}
                bgColor="bg-muted/40"
                iconColor="text-accent"
              />
            </>
          )}
        </div>

        {/* Secondary KPI strip */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Dépenses cumulées
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {loading ? "…" : formatDh(stats.spentTotal)}
            </p>
            {stats.budgetTotal > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {Math.round((stats.spentTotal / stats.budgetTotal) * 100)} % du
                budget total
              </p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total projets
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {loading ? "…" : stats.total}
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm ring-1 ring-black/[0.04] dark:from-primary/20 dark:ring-white/[0.06]">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Raccourcis
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/projects"
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <LayoutDashboard size={14} />
                Projets
              </Link>
              <Link
                href="/tasks"
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
              >
                <ListTodo size={14} />
                Tâches
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <DashboardChartsBlock
            statusData={statusChartData}
            budgetData={budgetChartData}
          />
        </div>

        <div className="mb-8">
          <DataTable
            title="Projets récents"
            columns={[
              {
                key: "name",
                label: "Projet",
                render: (_, row) => (
                  <Link
                    href={`/projects/${row._id}/overview`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.name}
                  </Link>
                ),
              },
              { key: "locationLabel", label: "Lieu" },
              {
                key: "status",
                label: "Statut",
                render: (status) => {
                  const s = status as Project["status"];
                  return (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        statusPillClass(s),
                      )}
                    >
                      {projectStatusLabelEn(s)}
                    </span>
                  );
                },
              },
              {
                key: "completion",
                label: "Avancement",
                render: (completion) => (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-foreground">
                      {completion}%
                    </span>
                  </div>
                ),
              },
              {
                key: "budgetLabel",
                label: "Budget",
                align: "right",
              },
              {
                key: "spentLabel",
                label: "Dépensé",
                align: "right",
              },
            ]}
            data={tableRows}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
              <div className="mb-4 flex items-center gap-2">
                <AlertCircle size={20} className="text-accent" />
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  Alertes
                </h3>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Chargement…</p>
                ) : alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune alerte.</p>
                ) : (
                  alerts.map((alert) => {
                    const body = (
                      <div
                        className={cn(
                          "rounded-xl border p-4 transition-colors",
                          alert.type === "danger" &&
                            "border-destructive/30 bg-destructive/5",
                          alert.type === "warning" &&
                            "border-amber-500/35 bg-amber-500/10",
                          alert.type === "info" &&
                            "border-sky-500/30 bg-sky-500/10",
                          alert.type === "success" &&
                            "border-emerald-500/35 bg-emerald-500/10",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">
                              {alert.title}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {alert.message}
                            </p>
                            {alert.href ? (
                              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                                Ouvrir <ChevronRight size={14} />
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                    return alert.href ? (
                      <Link key={alert.id} href={alert.href} className="block">
                        {body}
                      </Link>
                    ) : (
                      <div key={alert.id}>{body}</div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  À traiter
                </h3>
                <Link
                  href="/tasks"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Voir tout
                </Link>
              </div>
              <ul className="space-y-2">
                {loading ? (
                  <li className="text-sm text-muted-foreground">Chargement…</li>
                ) : (
                  todoItems.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-sm transition-colors hover:bg-muted/40"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {item.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.meta}
                          </span>
                        </span>
                        <ChevronRight
                          size={18}
                          className="shrink-0 text-muted-foreground"
                        />
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <h3 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
              Actions rapides
            </h3>
            <div className="flex flex-col gap-3">
              <Link
                href="/projects"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus size={18} />
                Nouveau projet
              </Link>
              <Link
                href="/tasks"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted"
              >
                <BarChart3 size={18} />
                Kanban des tâches
              </Link>
              <p className="text-center text-[11px] text-muted-foreground">
                Gantt et synthèse depuis chaque fiche projet ou la liste ci‑dessus.
              </p>
              <Link
                href="/projects"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                <CalendarDays size={18} />
                Liste des projets
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
