'use client';

import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import { reportData, budgetData } from '@/lib/mockData';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

const COLORS = ['#0B4F6C', '#F28C28', '#36a2d6', '#16a34a'];

export default function ReportsPage() {
  const totalBudget = budgetData.reduce((sum, item) => sum + item.budget, 0);
  const totalSpent = budgetData.reduce((sum, item) => sum + item.spent, 0);
  const percentageSpent = (totalSpent / totalBudget) * 100;

  const pieData = [
    { name: 'Spent', value: totalSpent },
    { name: 'Remaining', value: totalBudget - totalSpent },
  ];

  return (
    <MainLayout>
      <PageHeader 
        title="Reports" 
        description="Analytics and performance metrics across all projects"
      >
        <button className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Download size={18} />
          Export Report
        </button>
      </PageHeader>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <p className="text-sm text-muted-foreground font-medium">Total Budget</p>
          <p className="text-3xl font-bold text-foreground mt-2">${(totalBudget / 1000000).toFixed(1)}M</p>
        </div>
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <p className="text-sm text-muted-foreground font-medium">Total Spent</p>
          <p className="text-3xl font-bold text-accent mt-2">${(totalSpent / 1000000).toFixed(1)}M</p>
          <p className="text-xs text-muted-foreground mt-2">{percentageSpent.toFixed(1)}% of budget</p>
        </div>
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <p className="text-sm text-muted-foreground font-medium">Remaining</p>
          <p className="text-3xl font-bold text-primary mt-2">${((totalBudget - totalSpent) / 1000000).toFixed(1)}M</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Project Status Chart */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Project Status Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }} />
              <Legend />
              <Line type="monotone" dataKey="In Progress" stroke="#0B4F6C" strokeWidth={2} dot={{ fill: '#0B4F6C', r: 4 }} />
              <Line type="monotone" dataKey="Completed" stroke="#16a34a" strokeWidth={2} dot={{ fill: '#16a34a', r: 4 }} />
              <Line type="monotone" dataKey="Planning" stroke="#F28C28" strokeWidth={2} dot={{ fill: '#F28C28', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Budget Distribution */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Budget Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#0B4F6C" dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Budget by Project */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Budget by Project</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={budgetData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="project" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} />
            <YAxis stroke="#666" />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }} formatter={(value) => `$${(value / 1000000).toFixed(2)}M`} />
            <Legend />
            <Bar dataKey="spent" fill="#0B4F6C" name="Spent" radius={[8, 8, 0, 0]} />
            <Bar dataKey="remaining" fill="#F28C28" name="Remaining" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Project Budget Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary border-b border-border">
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Project</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Total Budget</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Spent</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Remaining</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">% Used</th>
              </tr>
            </thead>
            <tbody>
              {budgetData.map((item, idx) => (
                <tr key={idx} className="border-b border-border hover:bg-secondary/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-foreground font-medium">{item.project}</td>
                  <td className="px-6 py-4 text-sm text-foreground">${(item.budget / 1000000).toFixed(2)}M</td>
                  <td className="px-6 py-4 text-sm text-accent font-semibold">${(item.spent / 1000000).toFixed(2)}M</td>
                  <td className="px-6 py-4 text-sm text-foreground">${(item.remaining / 1000000).toFixed(2)}M</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${item.percentage}%` }} />
                      </div>
                      <span className="font-semibold text-foreground">{item.percentage}%</span>
                    </div>
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
