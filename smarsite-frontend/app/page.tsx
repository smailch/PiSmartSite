'use client';

import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import DataTable from '@/components/DataTable';
import { Building2, Users, Wallet, BarChart3, AlertCircle, Calendar } from 'lucide-react';
import { dashboardStats, projects, alerts } from '@/lib/mockData';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { reportData } from '@/lib/mockData';

export default function Dashboard() {
  const statIcons = [Building2, Users, Wallet, BarChart3];

  return (
    <MainLayout>
      <PageHeader title="Dashboard" description="Overview of all construction projects and activities" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {dashboardStats.map((stat, idx) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={statIcons[idx]}
            trend={stat.trend}
            bgColor={idx % 2 === 0 ? 'bg-blue-50' : 'bg-orange-50'}
            iconColor={idx % 2 === 0 ? 'text-primary' : 'text-accent'}
          />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Project Progress Chart */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Project Status Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }} />
              <Legend />
              <Bar dataKey="In Progress" fill="#0B4F6C" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Completed" fill="#16a34a" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Planning" fill="#F28C28" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget Trend Chart */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Budget Utilization Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e0e0e0' }} />
              <Legend />
              <Line type="monotone" dataKey="In Progress" stroke="#0B4F6C" strokeWidth={2} dot={{ fill: '#0B4F6C' }} />
              <Line type="monotone" dataKey="Completed" stroke="#16a34a" strokeWidth={2} dot={{ fill: '#16a34a' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Projects Table */}
      <div className="mb-8">
        <DataTable
          title="Recent Projects"
          columns={[
            { key: 'name', label: 'Project Name' },
            { key: 'location', label: 'Location' },
            {
              key: 'status',
              label: 'Status',
              render: (status) => (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    status === 'Completed'
                      ? 'bg-green-100 text-green-800'
                      : status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {status}
                </span>
              ),
            },
            {
              key: 'completion',
              label: 'Progress',
              render: (completion) => (
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${completion}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-foreground">{completion}%</span>
                </div>
              ),
            },
            { key: 'budget', label: 'Budget' },
            { key: 'spent', label: 'Spent' },
          ]}
          data={projects}
        />
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={20} className="text-accent" />
            <h3 className="text-lg font-semibold text-foreground">Recent Alerts</h3>
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${
                  alert.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : alert.type === 'danger'
                      ? 'bg-red-50 border-red-200'
                      : alert.type === 'success'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{alert.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                  </div>
                  {!alert.read && <div className="w-2 h-2 rounded-full bg-accent mt-1" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full px-4 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              <Building2 size={18} />
              New Project
            </button>
            <button className="w-full px-4 py-3 rounded-lg border border-border hover:bg-secondary transition-colors font-medium">
              <Calendar className="inline mr-2" size={18} />
              Schedule Meeting
            </button>
            <button className="w-full px-4 py-3 rounded-lg border border-border hover:bg-secondary transition-colors font-medium">
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
