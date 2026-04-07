'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2, BarChart3, Users, Wallet, AlertCircle,
  FileText, Menu, X, Home, Clipboard, Briefcase, UserPlus, ShieldAlert,
} from 'lucide-react';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/' },
  { id: 'projects', label: 'Projects', icon: Building2, href: '/projects' },
  { id: 'jobs', label: 'Jobs', icon: Briefcase, href: '/jobs' },
  { id: 'tasks', label: 'Tasks', icon: Clipboard, href: '/tasks' },
  { id: 'reports', label: 'Reports', icon: BarChart3, href: '/reports' },
  { id: 'team', label: 'Team', icon: Users, href: '/team' },
  { id: 'budget', label: 'Budget', icon: Wallet, href: '/budget' },
  { id: 'alerts', label: 'Alerts', icon: AlertCircle, href: '/alerts' },
  { id: 'documents', label: 'Documents', icon: FileText, href: '/documents' },
];

// Item visible seulement pour Admin
const adminItems = [
  { id: 'users',         label: 'Users',           icon: UserPlus,    href: '/users' },
  { id: 'admin-alerts',  label: 'Security Alerts', icon: ShieldAlert, href: '/alerts-log' }, // ← id différent
];

export default function Sidebar() {
  const [open, setOpen] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  // ✅ Récupérer le rôle depuis le token JWT
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Vérifie si le rôle est Admin (adapte selon ton payload JWT)
      if (payload.role === 'Admin' || payload.roleName === 'Admin') {
        setIsAdmin(true);
      }
    } catch { }
  }, []);

  const allItems = isAdmin ? [...navigationItems, ...adminItems] : navigationItems;


  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-primary text-white"
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-primary text-sidebar-foreground shadow-lg transition-all duration-300 flex flex-col ${open ? 'w-64' : '-translate-x-full md:translate-x-0 md:w-64'
          } md:relative md:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-bold text-accent flex items-center gap-2">
            <Building2 size={28} />
            SmartSite
          </h1>
          <p className="text-xs text-sidebar-accent mt-1">Construction Management</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {allItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold'
                  : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
              >
                <Icon size={20} />
                <span className="text-sm">{item.label}</span>
                {/* Badge Admin */}
                {(item.id === 'users' || item.id === 'admin-alerts') && (
                  <span style={{
                    marginLeft: 'auto', fontSize: '9px', fontWeight: '800',
                    backgroundColor: '#FACC15', color: '#132849',
                    padding: '2px 6px', borderRadius: '20px',
                  }}>
                    ADMIN
                  </span>

                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-accent text-center">v0.1.0</p>
        </div>
      </aside>
    </>
  );
}