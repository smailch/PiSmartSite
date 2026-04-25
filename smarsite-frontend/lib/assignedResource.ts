import type { AssignedResource } from "./types";

/** Extrait l’ObjectId string d’une entrée `assignedResources` (id seul, document peuplé ou legacy). */
export function extractAssignmentResourceId(ar: {
  resourceId?: AssignedResource["resourceId"];
}): string | null {
  const raw = ar?.resourceId;
  if (raw == null || raw === "") return null;
  if (typeof raw === "object" && raw !== null) {
    const o = raw as { _id?: unknown; $oid?: string };
    if (o._id != null && o._id !== "") return String(o._id);
    if (o.$oid != null) return String(o.$oid);
  }
  const s = String(raw);
  if (s === "null" || s === "undefined") return null;
  return s;
}

/** Forme stable pour le formulaire job (payload API). */
export function normalizeAssignedResourceForForm(
  ar: AssignedResource
): { resourceId: string; type: "Human" | "Equipment" } | null {
  const resourceId = extractAssignmentResourceId(ar);
  if (!resourceId) return null;
  const type = ar.type === "Equipment" ? "Equipment" : "Human";
  return { resourceId, type };
}

/** Libellé pour un humain assigné (pointage, listes). */
export function getAssignedHumanDisplayName(ar: AssignedResource): string {
  if (ar.name?.trim()) return ar.name.trim();
  const raw = ar.resourceId;
  if (raw && typeof raw === "object") {
    const o = raw as { name?: string; firstName?: string; lastName?: string };
    const fromHuman = `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim();
    if (fromHuman) return fromHuman;
    if (o.name?.trim()) return o.name.trim();
  }
  const id = extractAssignmentResourceId(ar);
  if (!id) return "Travailleur (id manquant)";
  if (id.length === 24 && /^[0-9a-f]{24}$/i.test(id)) {
    return `Travailleur …${id.slice(-6)}`;
  }
  return `Travailleur ${id}`;
}
