'use client';

import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import { teamMembers } from '@/lib/mockData';
import { Mail, Plus, Edit2, Trash2 } from 'lucide-react';

export default function TeamPage() {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      'Project Manager': 'bg-blue-100 text-blue-800',
      'Site Supervisor': 'bg-green-100 text-green-800',
      'Safety Officer': 'bg-red-100 text-red-800',
      'Budget Analyst': 'bg-purple-100 text-purple-800',
      'Architect': 'bg-indigo-100 text-indigo-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <MainLayout>
      <PageHeader 
        title="Team" 
        description="Manage your project team members and roles"
      >
        <button className="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors flex items-center gap-2">
          <Plus size={18} />
          Add Member
        </button>
      </PageHeader>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamMembers.map((member) => (
          <div
            key={member.id}
            className={`rounded-xl border shadow-sm p-6 transition-all hover:shadow-lg ${
              member.status === 'Active'
                ? 'bg-white border-border'
                : 'bg-secondary border-border opacity-75'
            }`}
          >
            {/* Avatar and Status */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-lg">
                  {getInitials(member.name)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{member.name}</h3>
                  <p className={`text-xs font-semibold px-2 py-1 rounded-full mt-1 w-fit ${getRoleColor(member.role)}`}>
                    {member.role}
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  member.status === 'Active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {member.status}
              </span>
            </div>

            {/* Contact */}
            <div className="mb-4 pb-4 border-b border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail size={14} />
                <a href={`mailto:${member.email}`} className="hover:text-primary transition-colors">
                  {member.email}
                </a>
              </div>
            </div>

            {/* Projects */}
            <div className="mb-4">
              <p className="text-xs text-muted-foreground font-semibold">Assigned Projects</p>
              <p className="text-lg font-bold text-primary mt-1">{member.projectsCount}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 rounded-lg border border-primary text-primary font-medium text-sm hover:bg-primary/5 transition-colors flex items-center justify-center gap-1">
                <Edit2 size={14} />
                Edit
              </button>
              <button className="flex-1 px-3 py-2 rounded-lg border border-destructive text-destructive font-medium text-sm hover:bg-destructive/5 transition-colors flex items-center justify-center gap-1">
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Team Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <p className="text-sm text-muted-foreground font-medium">Total Members</p>
          <p className="text-3xl font-bold text-foreground mt-2">{teamMembers.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <p className="text-sm text-muted-foreground font-medium">Active Members</p>
          <p className="text-3xl font-bold text-primary mt-2">{teamMembers.filter((m) => m.status === 'Active').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <p className="text-sm text-muted-foreground font-medium">Avg. Projects per Person</p>
          <p className="text-3xl font-bold text-accent mt-2">
            {(teamMembers.reduce((sum, m) => sum + m.projectsCount, 0) / teamMembers.length).toFixed(1)}
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
