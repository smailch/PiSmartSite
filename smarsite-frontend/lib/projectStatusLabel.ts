import type { Project } from "@/lib/types";

/** Libellés anglais pour les statuts projet (valeurs API inchangées). */
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
