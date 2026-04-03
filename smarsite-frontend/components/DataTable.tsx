import React from "react";

export interface Column<T> {
  key: keyof T;
  label: string;
  align?: "left" | "center" | "right";
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  title?: string;
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
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
      {title ? (
        <div className="border-b border-border/80 bg-muted/30 px-5 py-3.5 sm:px-6">
          <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  scope="col"
                  className={`whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:pl-5 last:pr-5 sm:px-5 ${cellAlignClass(col.align ?? "left")}`}
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
              data.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border/60 transition-colors odd:bg-background even:bg-muted/[0.35] hover:bg-primary/[0.04] last:border-b-0"
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={`max-w-[min(28rem,50vw)] px-4 py-3.5 align-middle text-foreground first:pl-5 last:pr-5 sm:px-5 ${cellAlignClass(col.align)}`}
                    >
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
