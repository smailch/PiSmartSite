'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  BarChart3,
  Users,
  Wallet,
  AlertCircle,
  FileText,
  Camera,
  Menu,
  X,
  Home,
  Clipboard,
  Briefcase,
  UserCircle,
  Wrench,
  Handshake,
} from 'lucide-react';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/home' },
  { id: 'clients', label: 'Espace client', icon: Handshake, href: '/dashboard/clients' },
  { id: 'projects', label: 'Projects', icon: Building2, href: '/projects' },
  { id: 'jobs', label: 'Jobs', icon: Briefcase, href: '/jobs' },
  { id: 'humans', label: 'Humans', icon: UserCircle, href: '/humans' },
  { id: 'equipment', label: 'Equipment', icon: Wrench, href: '/equipment' },
  { id: 'tasks', label: 'Tasks', icon: Clipboard, href: '/tasks' },
  { id: 'reports', label: 'Reports', icon: BarChart3, href: '/reports' },
  { id: 'team', label: 'Team', icon: Users, href: '/team' },
  { id: 'budget', label: 'Budget', icon: Wallet, href: '/budget' },
  { id: 'alerts', label: 'Alerts', icon: AlertCircle, href: '/alerts' },
  { id: 'documents', label: 'Documents', icon: FileText, href: '/documents' },
  {
    id: 'progress-photos',
    label: 'Progress Photos',
    icon: Camera,
    href: '/progress-photos',
  },
];

export default function Sidebar() {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Toggle */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        className="fixed left-4 top-4 z-50 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 p-2.5 text-white shadow-md shadow-orange-900/30 transition-all duration-300 ease-out hover:shadow-lg hover:scale-[1.02] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:hidden"
      >
        {open ? <X size={24} aria-hidden /> : <Menu size={24} aria-hidden />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/10 bg-slate-950/55 shadow-lg shadow-black/25 backdrop-blur-xl transition-all duration-300 ease-out ${
          open ? 'w-64' : '-translate-x-full md:translate-x-0 md:w-64'
        } md:relative md:translate-x-0`}
      >
        {/* Logo */}
        <div className="border-b border-white/10 p-6">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-100">
            <Building2 size={28} className="shrink-0 text-blue-400" aria-hidden />
            <span>
              Smart<span className="text-orange-400">Site</span>
            </span>
          </h1>
          <p className="mt-1.5 text-xs text-slate-500">Construction Management</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Main">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  isActive
                    ? 'border border-blue-500/20 bg-gradient-to-r from-blue-500/25 via-blue-500/10 to-transparent font-medium text-blue-300 shadow-sm shadow-blue-950/20'
                    : 'border border-transparent text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'
                }`}
              >
                <Icon size={20} className="shrink-0" aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-4">
          <p className="text-center text-xs text-slate-500">v0.1.0</p>
        </div>
      </aside>
    </>
  );
}
