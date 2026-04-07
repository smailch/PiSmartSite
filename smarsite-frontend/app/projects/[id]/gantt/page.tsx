"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { LayoutDashboard, LayoutList } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import GanttChart from "@/components/GanttChart";
import { Button } from "@/components/ui/button";
import type { BackendTask, Project } from "@/lib/types";
import { fetcher, getTasksByProjectKey } from "@/lib/api";

interface PageParams {
  id: string;
}

export default function ProjectGanttPage({ params }: { params: Promise<PageParams> }) {
  const { id } = use(params);

  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useSWR<Project>(`/projects/${id}`, fetcher);

  const {
    data: tasks,
    isLoading: tasksLoading,
    error: tasksError,
  } = useSWR<BackendTask[]>(getTasksByProjectKey(id), fetcher);

  const isLoading = projectLoading || tasksLoading;
  const hasError = projectError || tasksError;

  return (
    <MainLayout>
      <PageHeader
        title="Diagramme de Gantt"
        description="Visualisez la planification des tâches et leurs dépendances pour ce projet."
      />

      {isLoading && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Chargement du projet et des tâches…</p>
        </div>
      )}

      {hasError && !isLoading && (
        <div className="bg-card rounded-xl border border-destructive/30 shadow-sm p-8">
          <p className="text-destructive text-sm font-medium">
            Impossible de charger les données du Gantt pour ce projet.
          </p>
        </div>
      )}

      {!isLoading && !hasError && project && tasks && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground shadow-sm">
            <p className="max-w-xl leading-relaxed">
              Jalons, week-ends et ligne « aujourd&apos;hui » s&apos;adaptent au thème. Les filtres
              et le chemin critique sont au-dessus du graphique.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                asChild
                className="shrink-0 gap-2 border border-primary/35 bg-primary/20 text-foreground shadow-sm hover:bg-primary/30 dark:border-primary/45 dark:bg-primary/25 dark:hover:bg-primary/35"
              >
                <Link href={`/projects/${project._id}/overview`}>
                  <LayoutDashboard className="size-4 text-primary" aria-hidden />
                  Synthèse
                </Link>
              </Button>
              <Button variant="default" size="sm" asChild className="shrink-0 gap-2 shadow-md">
                <Link href={`/tasks?project=${project._id}&view=board`}>
                  <LayoutList className="size-4" aria-hidden />
                  Tâches du projet
                </Link>
              </Button>
            </div>
          </div>

          <GanttChart project={project} tasks={tasks} />
        </div>
      )}
    </MainLayout>
  );
}
