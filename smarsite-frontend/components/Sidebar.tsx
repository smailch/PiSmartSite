'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2, BarChart3, Users, Wallet, AlertCircle,
  FileText, Menu, X, Home, Clipboard, Briefcase, UserPlus, ShieldAlert, MessageCircle,
  Camera,
  UserCircle,
  Wrench,
  Handshake,
  LayoutGrid,
  FolderKanban,
  TrendingUp,
  GitCompare,
} from 'lucide-react';
import { fetchPrimePayoutPendingCount } from '@/lib/financePrimesApi';
import { cn } from '@/lib/utils';
import {
  ADMIN_ROLE_NAME,
  parseJwtRoleName,
  sidebarNavFilter,
  type SidebarNavId,
} from '@/lib/appRoles';

const navigationItems: {
  id: SidebarNavId;
  label: string;
  icon: typeof Home;
  href: string;
}[] = [
  { id: 'clients', label: 'Espace client', icon: Handshake, href: '/dashboard/clients' },
  { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/home' },
  {
    id: 'client-dashboard',
    label: 'Mon espace',
    icon: LayoutGrid,
    href: '/client-dashboard',
  },
  { id: 'projects', label: 'Projects', icon: Building2, href: '/projects' },
  {
    id: 'my-projects',
    label: 'Mes projets',
    icon: FolderKanban,
    href: '/mes-projets',
  },
  { id: 'tasks', label: 'Tasks', icon: Clipboard, href: '/tasks' },
  { id: 'invoices', label: 'Invoices', icon: BarChart3, href: '/invoices' },
  { id: 'jobs', label: 'Jobs', icon: Briefcase, href: '/jobs' },
  { id: 'humans', label: 'Humans', icon: UserCircle, href: '/humans' },
  { id: 'equipment', label: 'Equipment', icon: Wrench, href: '/equipment' },
  {
    id: 'progress-photos',
    label: 'Progress Photos',
    icon: Camera,
    href: '/progress-photos',
  },
  {
    id: 'trend',
    label: 'Progress Trend',
    icon: TrendingUp,
    href: '/trend',
  },
  {
    id: 'compare',
    label: 'Compare Progress',
    icon: GitCompare,
    href: '/compare',
  },
  { id: 'documents', label: 'Documents', icon: FileText, href: '/documents' },
];

// Item visible seulement pour Admin
const adminItems = [
  { id: 'users', label: 'Users', icon: UserPlus, href: '/users' },
  { id: 'admin-alerts', label: 'Security Alerts', icon: ShieldAlert, href: '/alerts-log' },
  { id: 'client-questions', label: 'Client Questions', icon: MessageCircle, href: '/client-questions' },
];

export default function Sidebar() {
  const [open, setOpen] = useState(true);
  const [roleName, setRoleName] = useState('');
  const [primePendingCount, setPrimePendingCount] = useState(0);
  const pathname = usePathname();

  const isAdmin = roleName === ADMIN_ROLE_NAME;

  const navFilter = sidebarNavFilter(roleName);
  const visibleNavItems =
    navFilter === 'all'
      ? navigationItems
      : navigationItems.filter((item) => navFilter(item.id));

  useEffect(() => {
    let cancelled = false;
    void fetchPrimePayoutPendingCount().then((n) => {
      if (!cancelled) setPrimePendingCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    setRoleName(parseJwtRoleName(localStorage.getItem('token')));
  }, [pathname]);

  return (
    <div className="contents" data-a11y-focus-follow="">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        className="fixed left-4 top-4 z-50 rounded-xl bg-gradient-to-r from-accent to-accent/85 p-2.5 text-accent-foreground shadow-lg shadow-black/25 transition-all duration-300 ease-out hover:brightness-110 hover:shadow-xl active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background md:hidden"
      >
        {open ? <X size={22} aria-hidden strokeWidth={2.25} /> : <Menu size={22} aria-hidden strokeWidth={2.25} />}
      </button>

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen min-h-0 flex-col overflow-hidden border-r border-sidebar-border/60 bg-sidebar shadow-[4px_0_24px_-4px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-300 ease-out md:relative md:translate-x-0',
          open ? 'w-[17rem] translate-x-0' : '-translate-x-full md:translate-x-0 md:w-[17rem]',
        )}
      >
        <div className="relative shrink-0 overflow-hidden border-b border-sidebar-border/50 px-4 pb-4 pt-5">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              background:
                'radial-gradient(ellipse 80% 120% at 20% -20%, var(--sidebar-accent), transparent 55%), radial-gradient(ellipse 70% 100% at 100% 100%, var(--sidebar-primary), transparent 50%)',
            }}
          />
          <div className="relative flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sidebar-accent/20 text-sidebar-accent shadow-inner shadow-black/10 ring-1 ring-sidebar-accent/25">
              <Building2 size={22} strokeWidth={2} aria-hidden className="drop-shadow-sm" />
            </div>
            <div className="min-w-0 pt-0.5">
              <h1 className="text-lg font-semibold leading-tight tracking-tight text-sidebar-foreground sm:text-xl">
                Smart<span className="text-sidebar-primary">Site</span>
              </h1>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/55">
                Construction Management
              </p>
            </div>
          </div>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3 pt-4" aria-label="Main">
          {visibleNavItems.map((item) => {
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
                className={cn(
                  'group relative flex shrink-0 items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-medium leading-snug transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar sm:px-3 sm:text-sm',
                  isActive
                    ? 'bg-sidebar-accent/12 text-sidebar-foreground shadow-[inset_3px_0_0_0_var(--sidebar-primary)] ring-1 ring-sidebar-border/40'
                    : 'text-sidebar-foreground/72 hover:bg-sidebar-accent/[0.08] hover:text-sidebar-foreground hover:ring-1 hover:ring-sidebar-border/30',
                )}
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-primary/25 text-sidebar-primary'
                      : 'bg-sidebar-accent/8 text-sidebar-accent/90 group-hover:bg-sidebar-accent/18 group-hover:text-sidebar-accent',
                  )}
                >
                  <Icon size={18} strokeWidth={2} aria-hidden className="shrink-0" />
                </span>
                <span className="min-w-0 flex-1 truncate tracking-tight">{item.label}</span>
                {item.id === 'invoices' && primePendingCount > 0 ? (
                  <span
                    className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold leading-none text-slate-900"
                    title="Pending bonuses"
                  >
                    {primePendingCount > 99 ? '99+' : primePendingCount}
                  </span>
                ) : null}
                {isActive ? (
                  <span
                    className="absolute right-2 size-1.5 rounded-full bg-sidebar-primary shadow-[0_0_10px_var(--sidebar-primary)]"
                    aria-hidden
                  />
                ) : null}
              </Link>

            );
          })}
          {/* ✅ Section Admin */}
          {isAdmin && (
            <>
              <div style={{ margin: '12px 0 6px', padding: '0 10px' }}>
                <span style={{
                  fontSize: '10px', fontWeight: '800', letterSpacing: '1px',
                  textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)'
                }}>
                  Admin
                </span>
              </div>

              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(`${item.href}/`));
                return (
                  <Link key={item.id} href={item.href} onClick={() => setOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'group relative flex shrink-0 items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-medium leading-snug transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar sm:px-3 sm:text-sm',
                      isActive
                        ? 'bg-sidebar-accent/12 text-sidebar-foreground shadow-[inset_3px_0_0_0_var(--sidebar-primary)] ring-1 ring-sidebar-border/40'
                        : 'text-sidebar-foreground/72 hover:bg-sidebar-accent/[0.08] hover:text-sidebar-foreground hover:ring-1 hover:ring-sidebar-border/30',
                    )}>
                    <span className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-sidebar-primary/25 text-sidebar-primary'
                        : 'bg-sidebar-accent/8 text-sidebar-accent/90 group-hover:bg-sidebar-accent/18 group-hover:text-sidebar-accent',
                    )}>
                      <Icon size={18} strokeWidth={2} aria-hidden className="shrink-0" />
                    </span>
                    <span className="min-w-0 flex-1 truncate tracking-tight">{item.label}</span>
                    <span style={{
                      fontSize: '9px', fontWeight: '800',
                      backgroundColor: '#FACC15', color: '#132849',
                      padding: '2px 6px', borderRadius: '20px', flexShrink: 0
                    }}>
                      ADMIN
                    </span>
                    {isActive && (
                      <span className="absolute right-2 size-1.5 rounded-full bg-sidebar-primary shadow-[0_0_10px_var(--sidebar-primary)]" aria-hidden />
                    )}
                  </Link>
                );
              })}
               </>
          )}


            </nav>
      </aside>
    </div>
  );
}