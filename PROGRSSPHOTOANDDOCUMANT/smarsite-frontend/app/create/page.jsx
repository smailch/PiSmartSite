import { redirect } from "next/navigation";

/** Route générique vide dans le dépôt — redirection vers l’accueil applicatif. */
export default function CreateFallbackPage() {
  redirect("/home");
}
