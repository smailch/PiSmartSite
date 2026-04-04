"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BudgetUtilRow, StatusChartRow } from "@/lib/dashboardHome";

type Props = {
  statusData: StatusChartRow[];
  budgetData: BudgetUtilRow[];
};

export default function DashboardChartsBlock({ statusData, budgetData }: Props) {
  const gridStroke = "var(--border)";
  const axisStroke = "var(--muted-foreground)";
  const maxBudgetPct = Math.max(100, ...budgetData.map((d) => d.pct), 0);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <h3 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
          Projets par statut
        </h3>
        <div className="h-[300px] w-full">
          {statusData.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Aucun projet à afficher
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: axisStroke, fontSize: 12 }} axisLine={{ stroke: gridStroke }} />
                <YAxis allowDecimals={false} tick={{ fill: axisStroke, fontSize: 12 }} axisLine={{ stroke: gridStroke }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--card-foreground)",
                  }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                />
                <Legend />
                <Bar dataKey="value" name="Projets" radius={[8, 8, 0, 0]}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <h3 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
          Utilisation du budget (top projets)
        </h3>
        <p className="mb-2 text-xs text-muted-foreground">
          Pourcentage dépensé / budget alloué (projets avec budget renseigné).
        </p>
        <div className="h-[300px] w-full">
          {budgetData.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Définissez un budget sur les projets pour voir ce graphique
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={budgetData}
                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, maxBudgetPct + 5]}
                  tick={{ fill: axisStroke, fontSize: 12 }}
                  axisLine={{ stroke: gridStroke }}
                  unit=" %"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fill: axisStroke, fontSize: 11 }}
                  axisLine={{ stroke: gridStroke }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value} %`, "Utilisation"]}
                />
                <Bar dataKey="pct" name="Utilisation %" radius={[0, 6, 6, 0]}>
                  {budgetData.map((row, i) => (
                  <Cell
                    key={`${row.name}-${i}`}
                    fill={
                      row.pct > 100
                        ? "var(--destructive)"
                        : row.pct > 85
                          ? "var(--chart-2)"
                          : "var(--chart-1)"
                    }
                  />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
