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
        className="fixed left-4 top-4 z-50 rounded-lg bg-primary p-2 text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 md:hidden"
      >
        {open ? <X size={24} aria-hidden /> : <Menu size={24} aria-hidden />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-primary text-sidebar-foreground shadow-lg transition-all duration-300 flex flex-col ${
          open ? 'w-64' : '-translate-x-full md:translate-x-0 md:w-64'
        } md:relative md:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-accent">
            <Building2 size={28} className="shrink-0 text-accent" aria-hidden />
            SmartSite
          </h1>
          <p className="mt-1 text-xs text-sidebar-foreground/90">Construction Management</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto p-4" aria-label="Main">
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
                className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary ${
                  isActive
                    ? 'bg-sidebar-primary font-semibold text-sidebar-primary-foreground'
                    : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon size={20} className="shrink-0" aria-hidden />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-center text-xs text-sidebar-foreground/90">v0.1.0</p>
        </div>
      </aside>
    </>
  );
}
