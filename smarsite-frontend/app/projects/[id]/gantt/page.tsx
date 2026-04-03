"use client";

import { use } from "react";
import useSWR from "swr";
import MainLayout from "@/components/MainLayout";
import PageHeader from "@/components/PageHeader";
import GanttChart from "@/components/GanttChart";
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
          <section className="bg-card rounded-xl border border-border shadow-sm p-5 flex flex-col gap-2">
            <h2 className="text-base font-semibold text-foreground">{project.name}</h2>
            <p className="text-sm text-muted-foreground">{project.description}</p>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
              <span>
                Début :{" "}
                {project.startDate
                  ? new Date(project.startDate).toLocaleDateString("fr-FR")
                  : "Non défini"}
              </span>
              <span>
                Fin prévue :{" "}
                {project.endDate
                  ? new Date(project.endDate).toLocaleDateString("fr-FR")
                  : "Non définie"}
              </span>
              <span>Statut : {project.status}</span>
            </div>

            {/* Budget section */}
            <div className="mt-3 flex flex-wrap gap-3">
              {project.budget !== undefined && (
                <div className="flex flex-col rounded-lg border border-border bg-secondary/40 px-4 py-2.5 min-w-[140px]">
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    Budget alloué
                  </span>
                  <span className="text-sm font-semibold text-foreground mt-0.5">
                    {new Intl.NumberFormat("fr-FR").format(project.budget)} DH
                  </span>
                </div>
              )}
              <div className="flex flex-col rounded-lg border border-border bg-secondary/40 px-4 py-2.5 min-w-[140px]">
                <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  Budget dépensé
                </span>
                <span className="text-sm font-semibold text-foreground mt-0.5">
                  {new Intl.NumberFormat("fr-FR").format(project.spentBudget ?? 0)} DH
                </span>
              </div>
              {project.budget !== undefined && (
                (() => {
                  const delta = (project.spentBudget ?? 0) - project.budget;
                  const isOver = delta > 0;
                  return (
                    <div
                      className={`flex flex-col rounded-lg border px-4 py-2.5 min-w-[140px] ${
                        isOver
                          ? "border-destructive/40 bg-destructive/5"
                          : "border-green-500/30 bg-green-500/5"
                      }`}
                    >
                      <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                        Écart
                      </span>
                      <span
                        className={`text-sm font-semibold mt-0.5 ${
                          isOver ? "text-destructive" : "text-green-600"
                        }`}
                      >
                        {isOver ? "+" : ""}
                        {new Intl.NumberFormat("fr-FR").format(delta)} DH
                      </span>
                    </div>
                  );
                })()
              )}
            </div>

            <div className="mt-2 flex gap-2 flex-wrap">
              <button
                type="button"
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90"
                onClick={() => {
                  // Placeholder – actual creation handled on Tasks / Projects pages.
                  // Left here so UX exposes a clear entry point.
                  // eslint-disable-next-line no-console
                  console.log("Ajouter une tâche pour le projet", project._id);
                }}
              >
                Ajouter une tâche
              </button>
            </div>
          </section>

          <section className="bg-transparent">
            <GanttChart project={project} tasks={tasks} />
          </section>
        </div>
      )}
    </MainLayout>
  );
}
