'use client';

import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import { alerts } from '@/lib/mockData';
import { AlertCircle, CheckCircle, AlertTriangle, Info, Trash2, Archive } from 'lucide-react';
import { useState } from 'react';

const typeIcons = {
  warning: AlertTriangle,
  danger: AlertCircle,
  success: CheckCircle,
  info: Info,
};

const typeColors = {
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-800',
  },
  danger: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800',
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-800',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
  },
};

export default function AlertsPage() {
  const [filter, setFilter] = useState<string>('all');
  const [selectedAlerts, setSelectedAlerts] = useState<number[]>([]);

  const filteredAlerts = filter === 'unread' ? alerts.filter((a) => !a.read) : alerts;

  const toggleSelect = (id: number) => {
    setSelectedAlerts((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <MainLayout>
      <PageHeader 
        title="Alerts & Notifications" 
        description="Stay informed about critical project updates and issues"
      />

      {/* Filter and Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-secondary hover:bg-border'
            }`}
          >
            All Alerts
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors relative ${
              filter === 'unread'
                ? 'bg-primary text-white'
                : 'bg-secondary hover:bg-border'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {selectedAlerts.length > 0 && (
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors flex items-center gap-2">
              <Archive size={18} />
              Archive Selected
            </button>
            <button className="px-4 py-2 rounded-lg border border-destructive text-destructive hover:bg-destructive/5 transition-colors flex items-center gap-2">
              <Trash2 size={18} />
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const Icon = typeIcons[alert.type as keyof typeof typeIcons];
          const colors = typeColors[alert.type as keyof typeof typeColors];

          return (
            <div
              key={alert.id}
              className={`${colors.bg} border ${colors.border} rounded-xl p-6 hover:shadow-md transition-all cursor-pointer`}
              onClick={() => toggleSelect(alert.id)}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={selectedAlerts.includes(alert.id)}
                    onChange={() => toggleSelect(alert.id)}
                    className="w-5 h-5 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Icon and Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Icon size={24} className={colors.badge} />
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-foreground">{alert.title}</h3>
                        <p className="text-muted-foreground mt-1">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">{new Date(alert.date).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Badge and Actions */}
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
                        {alert.type.toUpperCase()}
                      </span>
                      {!alert.read && <span className="w-3 h-3 rounded-full bg-accent" />}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                      Mark as read
                    </button>
                    <button className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-border">
          <AlertCircle size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
          <p className="text-lg text-muted-foreground">No alerts found</p>
        </div>
      )}

      {/* Alert Settings */}
      <div className="mt-12">
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-xl font-bold text-foreground mb-6">Alert Preferences</h3>
          <div className="space-y-4">
            {[
              { label: 'Budget Overrun Alerts', enabled: true },
              { label: 'Schedule Delay Notifications', enabled: true },
              { label: 'Safety Incident Alerts', enabled: true },
              { label: 'Team Status Updates', enabled: false },
              { label: 'Document Upload Notifications', enabled: false },
            ].map((pref) => (
              <div key={pref.label} className="flex items-center justify-between p-4 rounded-lg bg-secondary">
                <label className="font-medium text-foreground cursor-pointer">{pref.label}</label>
                <input
                  type="checkbox"
                  defaultChecked={pref.enabled}
                  className="w-5 h-5 cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
