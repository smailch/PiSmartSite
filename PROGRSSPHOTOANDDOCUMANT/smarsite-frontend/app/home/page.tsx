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
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
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
            className="h-[380px] rounded-2xl border border-white/10 bg-card/50 shadow-lg shadow-black/20 backdrop-blur-xl skeleton-premium motion-reduce:animate-none"
          />
        ))}
      </div>
    ),
  },
);

function statusPillClass(status: Project["status"]): string {
  switch (status) {
    case "Terminé":
      return "border-emerald-500/25 bg-emerald-500/15 text-emerald-300";
    case "En retard":
      return "border-orange-500/25 bg-orange-500/15 text-orange-300";
    default:
      return "border-blue-500/25 bg-blue-500/15 text-blue-300";
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
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl motion-safe:animate-pulse motion-reduce:animate-none"
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
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-300 ease-out hover:shadow-lg hover:brightness-[1.02] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <Users size={18} aria-hidden />
            Dashboard clients
            <ArrowRight size={16} className="opacity-90" aria-hidden />
          </Link>
        </PageHeader>

        {error ? (
          <div
            className="mb-10 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300 shadow-lg shadow-black/20 backdrop-blur-md"
            role="alert"
          >
            Impossible de charger les données. Démarrez le backend Nest (port 3200), puis rechargez.
            Si vous utilisez <code className="rounded bg-muted px-1">NEXT_PUBLIC_API_URL</code>, vérifiez
            qu’elle pointe vers le bon hôte (ex.{" "}
            <code className="rounded bg-muted px-1">http://127.0.0.1:3200</code>
            ). En dev, supprimez-la pour utiliser le proxy <code className="rounded bg-muted px-1">/api-backend</code>.
          </div>
        ) : null}

        {/* KPI — Bento */}
        <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            <>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[120px] rounded-2xl border border-white/10 bg-card/60 shadow-lg shadow-black/20 backdrop-blur-xl skeleton-premium motion-reduce:animate-none"
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
        <div className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-card/80 p-6 shadow-lg shadow-black/25 backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/[0.14] hover:shadow-xl">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Dépenses cumulées
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-50">
              {loading ? "…" : formatDh(stats.spentTotal)}
            </p>
            {stats.budgetTotal > 0 ? (
              <p className="mt-1 text-xs text-slate-400">
                {Math.round((stats.spentTotal / stats.budgetTotal) * 100)} % du
                budget total
              </p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-white/10 bg-card/80 p-6 shadow-lg shadow-black/25 backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/[0.14] hover:shadow-xl">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Total projets
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-50">
              {loading ? "…" : stats.total}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 via-card/80 to-orange-500/10 p-6 shadow-lg shadow-black/25 backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/[0.14] hover:shadow-xl">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Raccourcis
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/projects"
                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-all duration-300 ease-out hover:shadow-lg active:scale-95"
              >
                <LayoutDashboard size={14} />
                Projets
              </Link>
              <Link
                href="/tasks"
                className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-sm backdrop-blur-md transition-all duration-300 ease-out hover:bg-white/10 hover:shadow-md active:scale-95"
              >
                <ListTodo size={14} />
                Tâches
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-10">
          <DashboardChartsBlock
            statusData={statusChartData}
            budgetData={budgetChartData}
          />
        </div>

        <div className="mb-10">
          <DataTable
            title="Projets récents"
            columns={[
              {
                key: "name",
                label: "Projet",
                render: (_, row) => (
                  <Link
                    href={`/projects/${row._id}/overview`}
                    className="font-medium text-blue-400 transition-all duration-300 ease-out hover:text-blue-300 hover:underline decoration-blue-400/40 underline-offset-4"
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
                  const Icon =
                    s === "Terminé"
                      ? CheckCircle2
                      : s === "En retard"
                        ? AlertTriangle
                        : CircleDashed;
                  return (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm",
                        statusPillClass(s),
                      )}
                    >
                      <Icon className="size-3.5 shrink-0 opacity-90" aria-hidden />
                      {projectStatusLabelEn(s)}
                    </span>
                  );
                },
              },
              {
                key: "completion",
                label: "Avancement",
                render: (completion) => (
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 w-28 overflow-hidden rounded-full border border-white/10 bg-slate-950/60 shadow-inner backdrop-blur-sm">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 shadow-sm transition-[width] duration-500 ease-out motion-reduce:transition-none"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-slate-200">
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

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-card/80 p-7 shadow-lg shadow-black/25 backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/[0.14] hover:shadow-xl">
              <div className="mb-5 flex items-center gap-2">
                <AlertCircle size={20} className="text-orange-400" />
                <h3 className="text-lg font-semibold tracking-tight text-slate-100">
                  Alertes
                </h3>
              </div>
              <div className="space-y-4">
                {loading ? (
                  <div className="space-y-3">
                    <div className="h-14 rounded-xl skeleton-premium" />
                    <div className="h-14 rounded-xl skeleton-premium" />
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-10 text-center backdrop-blur-sm">
                    <div className="rounded-2xl border border-white/10 bg-card/60 p-4 shadow-lg shadow-black/20">
                      <CheckCircle2
                        className="size-10 text-emerald-400"
                        strokeWidth={1.25}
                        aria-hidden
                      />
                    </div>
                    <p className="text-sm font-medium text-slate-100">
                      Aucune alerte
                    </p>
                    <p className="max-w-xs text-xs text-slate-400">
                      Tout semble sous contrôle. Les anomalies
                      apparaîtront ici.
                    </p>
                  </div>
                ) : (
                  alerts.map((alert) => {
                    const body = (
                      <div
                        className={cn(
                          "rounded-xl border p-4 transition-all duration-200",
                          alert.type === "danger" &&
                            "border-red-500/25 bg-red-500/10",
                          alert.type === "warning" &&
                            "border-orange-500/25 bg-orange-500/10",
                          alert.type === "info" &&
                            "border-blue-500/25 bg-blue-500/10",
                          alert.type === "success" &&
                            "border-emerald-500/25 bg-emerald-500/10",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-100">
                              {alert.title}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                              {alert.message}
                            </p>
                            {alert.href ? (
                              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-400">
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

            <div className="rounded-2xl border border-white/10 bg-card/80 p-7 shadow-lg shadow-black/25 backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/[0.14] hover:shadow-xl">
              <div className="mb-5 flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold tracking-tight text-slate-100">
                  À traiter
                </h3>
                <Link
                  href="/tasks"
                  className="text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300 hover:underline"
                >
                  Voir tout
                </Link>
              </div>
              <ul className="space-y-3">
                {loading ? (
                  <li className="space-y-2">
                    <div className="h-12 rounded-xl skeleton-premium" />
                    <div className="h-12 rounded-xl skeleton-premium" />
                  </li>
                ) : todoItems.length === 0 ? (
                  <li className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-10 text-center backdrop-blur-sm">
                    <div className="rounded-2xl border border-white/10 bg-card/60 p-4 shadow-lg shadow-black/20">
                      <ListTodo
                        className="size-10 text-blue-400"
                        strokeWidth={1.25}
                        aria-hidden
                      />
                    </div>
                    <p className="text-sm font-medium text-slate-100">
                      Rien à traiter
                    </p>
                    <Link
                      href="/tasks"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300 hover:underline"
                    >
                      Ouvrir les tâches
                      <ChevronRight size={14} aria-hidden />
                    </Link>
                  </li>
                ) : (
                  todoItems.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm shadow-sm backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.07] hover:shadow-md"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-slate-100">
                            {item.label}
                          </span>
                          <span className="text-xs text-slate-400">
                            {item.meta}
                          </span>
                        </span>
                        <ChevronRight
                          size={18}
                          className="shrink-0 text-slate-500"
                        />
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-card/80 p-7 shadow-lg shadow-black/25 backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/[0.14] hover:shadow-xl">
            <h3 className="mb-5 text-lg font-semibold tracking-tight text-slate-100">
              Actions rapides
            </h3>
            <div className="flex flex-col gap-4">
              <Link
                href="/projects"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all duration-300 ease-out hover:shadow-lg hover:brightness-[1.02] active:scale-95 motion-reduce:active:scale-100"
              >
                <Plus size={18} />
                Nouveau projet
              </Link>
              <Link
                href="/tasks"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-200 shadow-sm backdrop-blur-md transition-all duration-300 ease-out hover:bg-white/10 hover:shadow-md active:scale-95 motion-reduce:active:scale-100"
              >
                <BarChart3 size={18} />
                Kanban des tâches
              </Link>
              <p className="text-center text-[11px] leading-relaxed text-slate-400">
                Gantt et synthèse depuis chaque fiche projet ou la liste ci‑dessus.
              </p>
              <Link
                href="/projects"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-medium text-slate-200 shadow-sm backdrop-blur-md transition-all duration-300 ease-out hover:bg-white/10 hover:shadow-md active:scale-95 motion-reduce:active:scale-100"
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
