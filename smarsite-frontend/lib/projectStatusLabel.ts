import type { Job, Project } from "@/lib/types";

/** English labels for project statuses (API values unchanged). */
export function projectStatusLabelEn(status: Project["status"]): string {
  switch (status) {
    case "En cours":
      return "In progress";
    case "Terminé":
      return "Completed";
    case "En retard":
      return "Behind schedule";
    default:
      return status;
  }
}

/** English labels for job statuses (API values unchanged). */
export function jobStatusLabelEn(status: Job["status"]): string {
  switch (status) {
    case "Planifié":
      return "Planned";
    case "En cours":
      return "In progress";
    case "Terminé":
      return "Completed";
    default:
      return status;
  }
}
