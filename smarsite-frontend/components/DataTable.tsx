import React, { useState } from "react";
import { Inbox } from "lucide-react";

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
  /** Élément `<colgroup>…</colgroup>` (pas seulement des `<col>` : utiliser un vrai groupe pour éviter erreurs HTML / hydratation). */
  colgroup?: React.ReactNode;
  /** Rangée sous la ligne de données : une cellule fusionnée (ex. actions hors grille). */
  renderRowFooter?: (row: T, index: number) => React.ReactNode;
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
  colgroup,
  renderRowFooter,
}: DataTableProps<T>) {
  const [hoveredRowKey, setHoveredRowKey] = useState<string | number | null>(null);

  const table = (
      <table
        className={`border-separate border-spacing-0 text-sm ${
          pageLevelScroll
            ? "w-full min-w-0 table-fixed"
            : "w-full min-w-[720px]"
        }`}
      >
      {tableCaption ? (
        <caption className="sr-only">{tableCaption}</caption>
      ) : null}
      {colgroup}
      <thead>
        <tr className="border-b border-white/10 bg-slate-950/40 backdrop-blur-md">
          {columns.map((col) => (
            <th
              key={String(col.key)}
              scope="col"
              title={typeof col.label === "string" ? col.label : undefined}
              className={`px-2.5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 first:pl-4 last:pr-4 sm:px-3 sm:first:pl-6 sm:last:pr-6 ${pageLevelScroll ? "max-w-0 overflow-hidden text-ellipsis whitespace-nowrap" : "whitespace-nowrap"} ${cellAlignClass(col.align ?? "left")} ${col.headerClassName ?? ""}`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-6 py-16 text-center">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-4 text-slate-400">
                <div className="rounded-3xl border border-white/10 bg-card/60 p-6 shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-300 ease-out">
                  <Inbox
                    className="mx-auto size-12 text-blue-400"
                    strokeWidth={1.25}
                    aria-hidden
                  />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-100">
                    No data yet
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Rows will appear here when available.
                  </p>
                </div>
              </div>
            </td>
          </tr>
        ) : (
          data.map((row, idx) => {
            const rowKey =
              row && typeof row === "object" && "_id" in row && row._id != null
                ? String((row as unknown as { _id: unknown })._id)
                : idx;
            const footer = renderRowFooter?.(row, idx);
            const rowActive = footer ? hoveredRowKey === rowKey : false;
            const hoverBg = rowActive ? " bg-white/[0.06]" : "";
            const mainRowBorder = footer
              ? "border-b-0"
              : "border-b border-white/[0.06] last:border-b-0";

            return (
              <React.Fragment key={rowKey}>
                <tr
                  className={`${mainRowBorder} transition-all duration-300 ease-out hover:bg-white/[0.04] hover:shadow-sm${hoverBg}`}
                  onMouseEnter={() => {
                    if (footer) setHoveredRowKey(rowKey);
                  }}
                  onMouseLeave={(e) => {
                    if (!footer) return;
                    const r = e.relatedTarget;
                    if (
                      r instanceof Node &&
                      e.currentTarget.nextElementSibling?.contains(r)
                    ) {
                      return;
                    }
                    setHoveredRowKey(null);
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={`px-2.5 py-4 text-slate-200 first:pl-4 last:pr-4 sm:px-3 sm:first:pl-6 sm:last:pr-6 ${pageLevelScroll ? "min-w-0 overflow-hidden align-top [&>*]:min-w-0" : "max-w-[min(28rem,50vw)] align-middle break-words"} ${cellAlignClass(col.align)} ${col.cellClassName ?? ""}`}
                    >
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
                {footer ? (
                  <tr
                    className={`border-b border-white/[0.06] transition-colors duration-300 ease-out last:border-b-0 hover:bg-white/[0.04]${hoverBg}`}
                    onMouseEnter={() => setHoveredRowKey(rowKey)}
                    onMouseLeave={(e) => {
                      const r = e.relatedTarget;
                      if (
                        r instanceof Node &&
                        e.currentTarget.previousElementSibling?.contains(r)
                      ) {
                        return;
                      }
                      setHoveredRowKey(null);
                    }}
                  >
                    <td
                      colSpan={columns.length}
                      className="border-t border-white/[0.06] bg-white/[0.02] px-2.5 py-2.5 first:pl-4 last:pr-4 sm:px-3 sm:first:pl-6 sm:last:pr-6"
                    >
                      {footer}
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            );
          })
        )}
      </tbody>
    </table>
  );

  return (
    <div
      className="w-full rounded-2xl border border-white/10 bg-card/80 shadow-lg shadow-black/25 backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/[0.14] hover:shadow-xl hover:shadow-black/40"
      role={title ? "region" : undefined}
      aria-label={title ?? undefined}
    >
      {title ? (
        <div className="border-b border-white/10 bg-slate-950/35 px-5 py-5 backdrop-blur-md sm:px-6">
          <h3 className="text-base font-semibold tracking-tight text-slate-100">
            {title}
          </h3>
        </div>
      ) : null}
      <div
        className={
          pageLevelScroll
            ? "w-full min-w-0 overflow-x-auto overscroll-x-contain [scrollbar-gutter:stable]"
            : "overflow-x-auto"
        }
      >
        {table}
      </div>
    </div>
  );
}
