import React from "react";

export interface Column<T> {
  key: keyof T;
  label: string;
  align?: "left" | "center" | "right";
  /** Classes supplémentaires sur l’en-tête (ex. largeur min, pas de retour à la ligne). */
  headerClassName?: string;
  /** Classes supplémentaires sur les cellules du corps (ex. max-w, truncate). */
  cellClassName?: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  title?: string;
  /** Texte lu par les lecteurs d’écran (caption masquée visuellement) — renforce le WCAG 1.3.1. */
  tableCaption?: string;
  /** Si true : pas de conteneur overflow-x interne — le tableau s’étend et la page défile (ex. liste projets). */
  pageLevelScroll?: boolean;
}

function cellAlignClass(align: "left" | "center" | "right" | undefined): string {
  switch (align) {
    case "right":
      return "text-right tabular-nums";
    case "center":
      return "text-center";
    default:
      return "text-left";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- colonnes « virtuelles » (ex. actions) hors type métier
export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  title,
  tableCaption,
  pageLevelScroll = false,
}: DataTableProps<T>) {
  const table = (
      <table
        className={`border-collapse text-sm ${
          pageLevelScroll
            ? "w-full min-w-[1200px] table-fixed"
            : "w-full min-w-[720px]"
        }`}
      >
      {tableCaption ? (
        <caption className="sr-only">{tableCaption}</caption>
      ) : null}
      <thead>
        <tr className="border-b border-border bg-muted/40">
          {columns.map((col) => (
            <th
              key={String(col.key)}
              scope="col"
              className={`px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:pl-5 last:pr-5 sm:px-5 ${pageLevelScroll ? "whitespace-normal break-words" : "whitespace-nowrap"} ${cellAlignClass(col.align ?? "left")} ${col.headerClassName ?? ""}`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td
              colSpan={columns.length}
              className="px-5 py-10 text-center text-muted-foreground"
            >
              Aucune donnée
            </td>
          </tr>
        ) : (
          data.map((row, idx) => {
            const rowKey =
              row && typeof row === "object" && "_id" in row && row._id != null
                ? String((row as unknown as { _id: unknown })._id)
                : idx;
            return (
            <tr
              key={rowKey}
              className="border-b border-border/60 transition-colors odd:bg-background even:bg-muted/[0.35] hover:bg-primary/[0.04] last:border-b-0"
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={`px-4 py-3.5 text-foreground first:pl-5 last:pr-5 sm:px-5 ${pageLevelScroll ? "align-top break-words" : "max-w-[min(28rem,50vw)] align-middle"} ${cellAlignClass(col.align)} ${col.cellClassName ?? ""}`}
                >
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "—")}
                </td>
              ))}
            </tr>
            );
          })
        )}
      </tbody>
    </table>
  );

  return (
    <div
      className="rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
      role={title ? "region" : undefined}
      aria-label={title ?? undefined}
    >
      {title ? (
        <div className="border-b border-border/80 bg-muted/30 px-5 py-3.5 sm:px-6">
          <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
        </div>
      ) : null}
      <div
        className={
          pageLevelScroll
            ? "w-full overflow-x-auto overscroll-x-contain [scrollbar-gutter:stable]"
            : "overflow-x-auto"
        }
      >
        {table}
      </div>
    </div>
  );
}
