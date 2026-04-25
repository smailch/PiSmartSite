const fr = new Intl.NumberFormat("fr-FR");

/** Montant affiché en euros (séparateurs fr-FR, espace insécable avant le symbole). */
export function formatDh(amount: number | undefined | null): string {
  const n = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return `${fr.format(n)}\u00a0€`;
}
