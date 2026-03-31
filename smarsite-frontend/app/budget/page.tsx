'use client';

import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import { budgetData } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

export default function BudgetPage() {
  const totalBudget = budgetData.reduce((sum, item) => sum + item.budget, 0);
  const totalSpent = budgetData.reduce((sum, item) => sum + item.spent, 0);
  const totalRemaining = totalBudget - totalSpent;

  // Projects at risk (over 80% spent)
  const riskProjects = budgetData.filter((item) => item.percentage >= 80);
  const healthyProjects = budgetData.filter((item) => item.percentage < 80);

  const radarData = budgetData.map((item) => ({
    project: item.project.split(' ')[0],
    percentage: item.percentage,
  }));

  return (
    <MainLayout>
      <PageHeader 
        title="Budget Management" 
        description="Track budget allocation and spending across all projects"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <p className="text-sm text-muted-foreground font-medium">Total Budget</p>
          <p className="text-3xl font-bold text-foreground mt-2">${(totalBudget / 1000000).toFixed(1)}M</p>
        </div>
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <p className="text-sm text-muted-foreground font-medium">Total Spent</p>
          <p className="text-3xl font-bold text-accent mt-2">${(totalSpent / 1000000).toFixed(1)}M</p>
          <p className="text-xs text-muted-foreground mt-2">{((totalSpent / totalBudget) * 100).toFixed(1)}% utilization</p>
        </div>
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <p className="text-sm text-muted-foreground font-medium">Remaining</p>
          <p className="text-3xl font-bold text-primary mt-2">${(totalRemaining / 1000000).toFixed(1)}M</p>
        </div>
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <p className="text-sm text-muted-foreground font-medium">Projects at Risk</p>
          <p className="text-3xl font-bold text-destructive mt-2">{riskProjects.length}</p>
          <p className="text-xs text-muted-foreground mt-2">Over 80% spent</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Spending by Project */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Budget Spending by Project</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="project" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
              <YAxis stroke="#666" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }}
                formatter={(value) => `$${(value / 1000000).toFixed(2)}M`}
              />
              <Legend />
              <Bar dataKey="spent" fill="#0B4F6C" name="Spent" radius={[8, 8, 0, 0]} />
              <Bar dataKey="remaining" fill="#16a34a" name="Remaining" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget Utilization Radar */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Budget Utilization %</h3>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e0e0e0" />
              <PolarAngleAxis dataKey="project" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Utilization %" dataKey="percentage" stroke="#0B4F6C" fill="#0B4F6C" fillOpacity={0.6} />
              <Tooltip formatter={(value) => `${value}%`} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* At-Risk Projects */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={20} className="text-destructive" />
            <h3 className="text-lg font-semibold text-foreground">Projects at Risk</h3>
          </div>
          {riskProjects.length === 0 ? (
            <p className="text-muted-foreground">All projects are within budget!</p>
          ) : (
            <div className="space-y-3">
              {riskProjects.map((item) => (
                <div key={item.project} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-semibold text-foreground">{item.project}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-red-800 font-medium">{item.percentage}% spent</span>
                    <span className="text-sm text-red-800 font-medium">${(item.spent / 1000000).toFixed(1)}M of ${(item.budget / 1000000).toFixed(1)}M</span>
                  </div>
                  <div className="w-full h-2 bg-red-200 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-destructive" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Healthy Projects */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={20} className="text-green-600" />
            <h3 className="text-lg font-semibold text-foreground">Healthy Projects</h3>
          </div>
          <div className="space-y-3">
            {healthyProjects.map((item) => (
              <div key={item.project} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="font-semibold text-foreground">{item.project}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-green-800 font-medium">{item.percentage}% spent</span>
                  <span className="text-sm text-green-800 font-medium">${(item.remaining / 1000000).toFixed(1)}M remaining</span>
                </div>
                <div className="w-full h-2 bg-green-200 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-green-600" style={{ width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Budget Table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Detailed Budget Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary border-b border-border">
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Project</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Total Budget</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Spent</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Remaining</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {budgetData.map((item) => (
                <tr key={item.project} className="border-b border-border hover:bg-secondary/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{item.project}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-foreground">${(item.budget / 1000000).toFixed(2)}M</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-accent">${(item.spent / 1000000).toFixed(2)}M</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-primary">${(item.remaining / 1000000).toFixed(2)}M</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.percentage >= 90
                          ? 'bg-red-100 text-red-800'
                          : item.percentage >= 80
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {item.percentage >= 80 ? '⚠️ At Risk' : '✓ Healthy'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
