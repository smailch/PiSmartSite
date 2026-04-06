import { redirect } from "next/navigation";

/** Page d’accueil publique : vitrine espace client. Tableau de bord opérationnel : `/home`. */
export default function RootPage() {
  redirect("/dashboard/clients");
}
