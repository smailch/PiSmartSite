/**
 * Rôles métier (inscription publique + JWT `roleName`).
 * Doit rester aligné avec `DEFAULT_ROLES` côté Nest (`roles.service.ts`), hors Admin.
 */
/** Rôles proposés à l’inscription publique (alignés sur l’API, hors Admin / Director, etc.). */
export const REGISTER_ROLE_ORDER = [
  'Client',
  'Project Manager',
  'Site Engineer',
  'Financier',
] as const;

export type AppRegisterRoleName = (typeof REGISTER_ROLE_ORDER)[number];

export const ADMIN_ROLE_NAME = 'Admin';

/** Libellés affichés à l’inscription (clé = nom en base). */
export const ROLE_LABEL_EN: Record<string, string> = {
  Client: 'Client',
  'Project Manager': 'Project Manager',
  'Site Engineer': 'Site Engineer',
  Financier: 'Financier',
  Director: 'Director',
};

export function normalizeRoleName(name: unknown): string {
  return String(name ?? '').trim();
}

export function sortRegisterRoles<T extends { name?: string }>(list: T[]): T[] {
  const orderIndex = (name: string) => {
    const i = REGISTER_ROLE_ORDER.indexOf(name as AppRegisterRoleName);
    return i === -1 ? 1000 : i;
  };
  return [...list].sort(
    (a, b) =>
      orderIndex(normalizeRoleName(a.name)) -
        orderIndex(normalizeRoleName(b.name)) ||
      normalizeRoleName(a.name).localeCompare(normalizeRoleName(b.name), 'en'),
  );
}

export function labelForRole(role: { name?: string }): string {
  const name = normalizeRoleName(role.name);
  return ROLE_LABEL_EN[name] ?? name;
}

/** Identifiants des entrées `navigationItems` dans Sidebar. */
export type SidebarNavId =
  | 'clients'
  | 'dashboard'
  | 'client-dashboard'
  | 'projects'
  | 'my-projects'
  | 'tasks'
  | 'invoices'
  | 'jobs'
  | 'humans'
  | 'equipment'
  | 'progress-photos'
  | 'trend'
  | 'compare'
  | 'documents';

/**
 * Menu principal par rôle. Admin : traité à part (tout + section admin).
 * Rôle inconnu : tout le menu principal (comportement historique).
 */
export const ROLE_SIDEBAR_NAV: Record<string, SidebarNavId[] | 'all'> = {
  [ADMIN_ROLE_NAME]: 'all',
  /** Documents et création de projets interdits — pages dédiées client. */
  Client: ['client-dashboard', 'my-projects', 'progress-photos', 'trend', 'compare'],
  'Project Manager': 'all',
  'Site Engineer': [
    'dashboard',
    'projects',
    'tasks',
    'jobs',
    'humans',
    'equipment',
    'progress-photos',
    'trend',
    'compare',
    'documents',
  ],
  Financier: ['dashboard', 'projects', 'invoices', 'humans', 'documents'],
  Director: 'all',
};

export function sidebarNavFilter(
  roleName: string,
): 'all' | ((id: SidebarNavId) => boolean) {
  const key = normalizeRoleName(roleName);
  const rule = ROLE_SIDEBAR_NAV[key];
  if (rule === 'all' || !rule) {
    return 'all';
  }
  const set = new Set(rule);
  return (id) => set.has(id);
}

export function parseJwtRoleName(token: string | null): string {
  if (!token) return '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as {
      roleName?: string;
      role?: string;
    };
    return normalizeRoleName(payload.roleName || payload.role);
  } catch {
    return '';
  }
}

/** Sujet JWT (`sub`) = identifiant utilisateur Mongo. */
export function parseJwtSub(token: string | null): string {
  if (!token) return '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { sub?: string };
    return String(payload.sub ?? '').trim();
  } catch {
    return '';
  }
}
