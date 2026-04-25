"use client";
// À remplacer par la vraie source d'authentification !
const USER_ID = "65cfa1a7cf3f4e38dc1db123";

import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import DataTable, { type Column } from '@/components/DataTable';
import type { Project, ProjectAiInsightsResponse, ClientAccount } from '@/lib/types';
import { ApiError } from '@/lib/types';
import { parseJwtRoleName } from '@/lib/appRoles';
import {
  Folder,
  Cake as Crane,
  Filter,
  Trash2,
  Pencil,
  Plus,
  Sparkles,
  BarChart3,
  Brain,
  MessageCircle,
  LayoutDashboard,
  Bot,
  User,
  SendHorizontal,
  FileText,
  Loader2,
  CalendarClock,
  TrendingUp,
  ListChecks,
  Lightbulb,
  RefreshCw,
  AlertTriangle,
  Clock,
  Gauge,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getProjects,
  createProject,
  createTask,
  updateTask,
  updateProject,
  deleteProject,
  analyzeProjectInsights,
  projectAssistantChat,
  projectAssistantInitialReport,
  getHumans,
  getClientAccounts,
  type ProjectCreatePayload,
} from '@/lib/api';
import type { Human } from '@/lib/types';
import { generateTasksFromProject, type GeminiTaskProposal } from '@/lib/geminiTasks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import ProjectForm from '@/components/ProjectForm';
import DeleteProjectDialog from '@/components/DeleteProjectDialog';
import { toast } from '@/hooks/use-toast';
import { formatDh } from '@/lib/formatMoney';
import { cn } from '@/lib/utils';
import { useRadioGroupKeyboard } from '@/hooks/useRadioGroupKeyboard';

const DESCRIPTION_PREVIEW_LEN = 20;

/** Shell: même langage que Dialog (glass sombre — sans dépendre de la classe .dark sur html) */
const aiModalShell =
  'gap-0 overflow-hidden rounded-3xl border border-white/10 bg-card/95 p-0 text-card-foreground shadow-2xl shadow-black/50 backdrop-blur-xl';

const aiModalHeaderIndigo =
  'shrink-0 border-b border-white/10 bg-gradient-to-br from-indigo-950/55 via-card/95 to-slate-950/90 px-5 pb-4 pt-6 sm:px-6';

const aiModalHeaderEmerald =
  'shrink-0 border-b border-white/10 bg-gradient-to-br from-emerald-950/45 via-card/95 to-slate-950/90 px-5 pb-4 pt-6 sm:px-6';

const aiModalHeaderTeal =
  'shrink-0 border-b border-white/10 bg-gradient-to-br from-slate-900 via-teal-950/35 to-card/95 px-5 pb-4 pt-6 sm:px-6';

const aiModalHeaderAssistant =
  'shrink-0 border-b border-white/10 bg-gradient-to-br from-slate-900 via-violet-950/40 to-slate-950/95 px-5 pb-5 pt-6 sm:px-7';

const aiModalBody =
  'min-h-0 flex-1 overflow-y-auto bg-slate-950/25 px-5 py-5 sm:px-6 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.35)_transparent]';

const aiModalFooter =
  'shrink-0 gap-3 border-t border-white/10 bg-slate-950/55 px-5 py-4 backdrop-blur-md sm:flex-row sm:justify-end sm:px-6';

/** Truncates text to `maxLen` characters, then appends "…" if longer. */
function truncateDescription(text: string | undefined | null, maxLen: number = DESCRIPTION_PREVIEW_LEN): string {
  const s = text != null ? String(text).trim() : '';
  if (!s) return '—';
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}...`;
}

/** Server-computed budget delta % (may be null). */
function formatBudgetDeltaPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(value)} %`;
}

function projectStatusLabel(status: string): string {
  const m: Record<string, string> = {
    'En cours': 'In progress',
    Terminé: 'Completed',
    'En retard': 'Behind schedule',
  };
  return m[status] ?? status;
}

function projectTypeLabel(type: string): string {
  const m: Record<string, string> = {
    Construction: 'Construction',
    Rénovation: 'Renovation',
    Maintenance: 'Maintenance',
    Autre: 'Other',
  };
  return m[type] ?? type;
}

function budgetDelayModeLabel(mode: ProjectAiInsightsResponse['analysis']['budgetDelayTradeoff']['recommendedMode']): string {
  switch (mode) {
    case 'economique':
      return 'Cost-saving';
    case 'accelere':
      return 'Accelerated';
    default:
      return 'Balanced';
  }
}

function riskImpactClass(impact: 'low' | 'medium' | 'high'): string {
  switch (impact) {
    case 'high':
      return 'bg-red-500/15 text-red-200 ring-1 ring-red-500/25';
    case 'medium':
      return 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-500/25';
    default:
      return 'bg-slate-500/15 text-slate-200 ring-1 ring-slate-500/25';
  }
}

function riskImpactLabel(impact: 'low' | 'medium' | 'high'): string {
  switch (impact) {
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    default:
      return 'Low';
  }
}

function riskImpactBorderClass(impact: 'low' | 'medium' | 'high'): string {
  switch (impact) {
    case 'high':
      return 'border-l-red-500';
    case 'medium':
      return 'border-l-amber-500';
    default:
      return 'border-l-slate-400 dark:border-l-slate-500';
  }
}

function InsightsConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[200px]">
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 font-medium">
          <Gauge className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          Confidence
        </span>
        <span className="tabular-nums font-semibold text-foreground">{pct}%</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/50 dark:bg-muted/40"
        role="presentation"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-500 dark:to-teal-400"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

type ProjectStatusFilter = 'All' | Project['status'];

const PROJECT_STATUS_FILTER_BUTTONS: { label: string; value: ProjectStatusFilter }[] = [
  { label: 'All', value: 'All' },
  { label: 'In progress', value: 'En cours' },
  { label: 'Completed', value: 'Terminé' },
  { label: 'Behind schedule', value: 'En retard' },
];

const PROJECT_STATUS_FILTER_VALUES: ProjectStatusFilter[] = PROJECT_STATUS_FILTER_BUTTONS.map(
  (b) => b.value,
);

type ProjectTableRow = Project;

export default function ProjectsPage() {
  const router = useRouter();
  const [clientRedirect, setClientRedirect] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [siteEngineers, setSiteEngineers] = useState<Human[]>([]);
  const [clientAccounts, setClientAccounts] = useState<ClientAccount[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProjectStatusFilter>('All');
  const [open, setOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [projectPendingDelete, setProjectPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleteProjectSubmitting, setIsDeleteProjectSubmitting] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiProject, setAiProject] = useState<Project | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiTasks, setAiTasks] = useState<GeminiTaskProposal[]>([]);
  const [aiSelected, setAiSelected] = useState<Set<number>>(new Set());
  const [aiCreating, setAiCreating] = useState(false);

  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsProject, setInsightsProject] = useState<Project | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsData, setInsightsData] = useState<ProjectAiInsightsResponse | null>(null);

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantProject, setAssistantProject] = useState<Project | null>(null);
  const [assistantMessages, setAssistantMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [assistantReport, setAssistantReport] = useState<string | null>(null);
  const [assistantReportLoading, setAssistantReportLoading] = useState(false);
  const [assistantReportError, setAssistantReportError] = useState<string | null>(null);

  const assistantChatScrollRef = useRef<HTMLDivElement>(null);

  const {
    getTabIndex: getProjectStatusFilterTabIndex,
    handleKeyDown: onProjectStatusFilterKeyDown,
    setItemRef: setProjectStatusFilterRef,
  } = useRadioGroupKeyboard(PROJECT_STATUS_FILTER_VALUES, filter, setFilter);

  function isValidObjectId(id: string | undefined): boolean {
    return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
  }

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(Array.isArray(data) ? data.filter(p => p && isValidObjectId(p._id)) : []);
    } catch (err) {
      console.error('[fetchProjects]', err);
      setError('Failed to load data');
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchSiteEngineers = async () => {
    try {
      const data = await getHumans('Site Engineer');
      setSiteEngineers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[fetchSiteEngineers]', err);
    }
  };

  const fetchClientAccounts = async () => {
    try {
      const data = await getClientAccounts();
      setClientAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[fetchClientAccounts]', err);
    }
  };

  useEffect(() => {
    if (parseJwtRoleName(typeof window !== 'undefined' ? localStorage.getItem('token') : null) === 'Client') {
      setClientRedirect(true);
      router.replace('/mes-projets');
      return;
    }
    void fetchProjects();
    void fetchSiteEngineers();
    void fetchClientAccounts();
  }, [router]);

  useEffect(() => {
    if (!assistantOpen) return;
    const el = assistantChatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [assistantOpen, assistantMessages, assistantLoading, assistantReport, assistantReportLoading]);

  if (clientRedirect) {
    return (
      <MainLayout>
        <div role="status" className="text-muted-foreground">
          Redirecting to your projects…
        </div>
      </MainLayout>
    );
  }

  if (initialLoading) {
    return (
      <MainLayout>
        <div role="status" aria-live="polite" className="text-muted-foreground">
          Loading projects…
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div role="alert" className="text-destructive">
          {error}
        </div>
      </MainLayout>
    );
  }

  const filteredProjects = (filter === 'All'
    ? projects
    : projects.filter((p) => p.status === filter)
  ).filter((p) => isValidObjectId(p._id));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Terminé':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-900 dark:bg-green-950/55 dark:text-green-100';
      case 'In Progress':
      case 'En cours':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100';
      case 'Behind schedule':
      case 'En retard':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-950 dark:bg-amber-950/45 dark:text-amber-100';
      case 'Planning':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-950 dark:bg-yellow-950/40 dark:text-yellow-100';
      default:
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100';
    }
  };

  const getProjectIcon = (index: number) => {
    const icons = [Folder, Crane, Folder, Crane, Folder];
    const Icon = icons[index % icons.length];
    return <Icon size={18} className="shrink-0 text-primary" aria-hidden />;
  };

  const handleEditClick = (project: Project) => {
    if (!isValidObjectId(project._id)) {
      toast({ title: 'Error', description: 'Cannot edit project: invalid or missing MongoDB id.' });
      return;
    }
    setEditProject(project);
    setOpen(true);
  };

  const openAiForProject = async (row: Project) => {
    if (!isValidObjectId(row._id)) {
      toast({ title: 'Error', description: 'Invalid project for AI task generation.' });
      return;
    }
    setAiProject(row);
    setAiOpen(true);
    setAiError(null);
    setAiTasks([]);
    setAiSelected(new Set());
    setAiLoading(true);
    try {
      const { tasks } = await generateTasksFromProject(row);
      setAiTasks(tasks);
      setAiSelected(new Set(tasks.map((_, i) => i)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      setAiError(msg);
      toast({ title: 'Gemini', description: msg });
    } finally {
      setAiLoading(false);
    }
  };

  const openInsightsForProject = async (row: Project) => {
    if (!isValidObjectId(row._id)) {
      toast({ title: 'Error', description: 'Invalid project for AI analysis.' });
      return;
    }
    setInsightsProject(row);
    setInsightsOpen(true);
    setInsightsError(null);
    setInsightsData(null);
    setInsightsLoading(true);
    try {
      const data = await analyzeProjectInsights(row._id);
      setInsightsData(data);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Analysis failed';
      setInsightsError(msg);
      toast({ title: 'AI analysis', description: msg });
    } finally {
      setInsightsLoading(false);
    }
  };

  const openAssistantForProject = (row: Project) => {
    if (!isValidObjectId(row._id)) {
      toast({ title: 'Error', description: 'Invalid project for assistant.' });
      return;
    }
    setAssistantProject(row);
    setAssistantMessages([]);
    setAssistantInput('');
    setAssistantError(null);
    setAssistantReport(null);
    setAssistantReportError(null);
    setAssistantOpen(true);
    setAssistantReportLoading(true);
    void (async () => {
      try {
        const { report } = await projectAssistantInitialReport(row._id);
        setAssistantReport(report);
      } catch (err: unknown) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not generate report';
        setAssistantReportError(msg);
        toast({ title: 'Assistant report', description: msg });
      } finally {
        setAssistantReportLoading(false);
      }
    })();
  };

  const sendAssistantMessage = async () => {
    const text = assistantInput.trim();
    if (!assistantProject || !isValidObjectId(assistantProject._id) || !text || assistantLoading) return;
    if (assistantReportLoading) return;

    const userMsg = { role: 'user' as const, content: text };
    const prefix = assistantReport
      ? [{ role: 'assistant' as const, content: assistantReport }]
      : [];
    const nextForApi = [...prefix, ...assistantMessages, userMsg];

    setAssistantMessages([...assistantMessages, userMsg]);
    setAssistantInput('');
    setAssistantError(null);
    setAssistantLoading(true);
    try {
      const { reply } = await projectAssistantChat(assistantProject._id, nextForApi);
      setAssistantMessages([...assistantMessages, userMsg, { role: 'assistant', content: reply }]);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Assistant request failed';
      setAssistantError(msg);
      toast({ title: 'Assistant', description: msg });
    } finally {
      setAssistantLoading(false);
    }
  };

  const toggleAiTask = (index: number) => {
    setAiSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleCreateAiTasks = async () => {
    if (!aiProject || !isValidObjectId(aiProject._id)) return;
    setAiCreating(true);
    try {
      const idByProposalIndex = new Map<number, string>();
      let n = 0;
      for (let i = 0; i < aiTasks.length; i++) {
        if (!aiSelected.has(i)) continue;
        const t = aiTasks[i];
        const created = await createTask({
          title: t.title,
          description: t.description || undefined,
          projectId: aiProject._id,
          duration: t.duration,
          priority: t.priority,
          status: t.status,
          progress: t.progress,
          dependsOn: [],
          ...(t.startDate ? { startDate: t.startDate } : {}),
          ...(t.endDate ? { endDate: t.endDate } : {}),
        });
        idByProposalIndex.set(i, created._id);
        n += 1;
      }
      if (n === 0) {
        toast({ title: 'No tasks', description: 'Select at least one suggestion.' });
        return;
      }

      for (let i = 0; i < aiTasks.length; i++) {
        if (!aiSelected.has(i)) continue;
        const t = aiTasks[i];
        const indices = Array.isArray(t.dependsOnIndices) ? t.dependsOnIndices : [];
        const depIds = [
          ...new Set(
            indices
              .filter(
                (j) =>
                  Number.isInteger(j) &&
                  j >= 0 &&
                  j < aiTasks.length &&
                  j !== i &&
                  idByProposalIndex.has(j),
              )
              .map((j) => idByProposalIndex.get(j)!),
          ),
        ];
        if (depIds.length === 0) continue;
        const taskId = idByProposalIndex.get(i)!;
        try {
          await updateTask(taskId, { dependsOn: depIds });
        } catch (depErr) {
          console.error('[handleCreateAiTasks] dependsOn update', depErr);
        }
      }

      toast({ title: 'Tasks created', description: `${n} task(s) added to the project.` });
      setAiOpen(false);
      setAiProject(null);
      setAiTasks([]);
      setAiSelected(new Set());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error while creating tasks';
      toast({ title: 'Error', description: msg });
    } finally {
      setAiCreating(false);
    }
  };

  const handleConfirmDeleteProject = async () => {
    const pending = projectPendingDelete;
    if (!pending || !isValidObjectId(pending.id)) {
      toast({ title: 'Error', description: 'Cannot delete: invalid or missing MongoDB id.' });
      setProjectPendingDelete(null);
      return;
    }
    setIsDeleteProjectSubmitting(true);
    try {
      await deleteProject(pending.id);
      toast({ title: 'Project deleted', description: 'The project was removed successfully.' });
      setProjects((prev) => prev.filter((p) => p._id !== pending.id));
      setProjectPendingDelete(null);
    } catch (err: unknown) {
      console.error('[DELETE project]', err);
      const msg = err instanceof ApiError ? err.message : (err as Error)?.message ?? 'Delete failed';
      toast({ title: 'Error', description: msg });
    } finally {
      setIsDeleteProjectSubmitting(false);
    }
  };

  const tableColumns: Column<ProjectTableRow>[] = [
    {
      key: 'name' as const,
      label: 'Project',
      cellClassName: 'align-top',
      render: (value: string | number | undefined, row: ProjectTableRow) => (
        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
          {getProjectIcon(0)}
          <div className="min-w-0 overflow-hidden">
            <p className="break-words font-semibold text-foreground">
              {isValidObjectId(row._id) ? (
                <Link
                  href={`/projects/${row._id}/overview`}
                  className="rounded-sm hover:text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {value != null ? String(value) : ''}
                </Link>
              ) : (
                <>{value != null ? String(value) : ''}</>
              )}
            </p>
            <p className="mt-0.5 line-clamp-2 break-words text-sm text-muted-foreground" title={row.description?.trim() ? row.description : undefined}>
              {truncateDescription(row.description)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'description' as const,
      label: 'Description',
      cellClassName: 'align-top',
      render: (value: string | number | undefined) => (
        <span className="line-clamp-3 break-words text-muted-foreground" title={value != null && String(value).length > DESCRIPTION_PREVIEW_LEN ? String(value) : undefined}>
          {truncateDescription(value != null ? String(value) : undefined)}
        </span>
      ),
    },
    {
      key: 'type' as const,
      label: 'Type',
      cellClassName: 'align-top whitespace-nowrap',
      render: (value: string | number | undefined) =>
        value != null && value !== '' ? projectTypeLabel(String(value)) : '—',
    },
    {
      key: 'budget' as const,
      label: 'Allocated',
      align: 'right' as const,
      cellClassName: 'align-top whitespace-nowrap',
      render: (value: number | string | undefined) =>
        value != null && value !== '' && !Number.isNaN(Number(value)) ? (
          <span className="tabular-nums font-medium text-foreground">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            }).format(Number(value))}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'spentBudget' as const,
      label: 'Spent',
      align: 'right' as const,
      cellClassName: 'align-top whitespace-nowrap',
      render: (_value: string | number | undefined, row: ProjectTableRow) => (
        <span className="tabular-nums font-semibold text-foreground">{formatDh(row.spentBudget)}</span>
      ),
    },
    {
      key: 'location' as const,
      label: 'Location',
      cellClassName: 'align-top',
      render: (value: string | number | undefined) => {
        const s = value != null ? String(value).trim() : '';
        return s ? <span className="break-words">{s}</span> : '—';
      },
    },
    {
      key: 'startDate' as const,
      label: 'Start',
      cellClassName: 'align-top whitespace-nowrap',
      render: (val: any) => (
        val ? new Date(val).toLocaleDateString() : "-"
      ),
    },
    {
      key: 'endDate' as const,
      label: 'End',
      cellClassName: 'align-top whitespace-nowrap',
      render: (val: any) => (
        val ? new Date(val).toLocaleDateString() : "-"
      ),
    },
    {
      key: 'status' as const,
      label: 'Status',
      cellClassName: 'align-top whitespace-nowrap',
      render: (value: string | number | undefined) => (
        <span className={getStatusColor(String(value ?? ''))}>
          {projectStatusLabel(String(value ?? ''))}
        </span>
      ),
    },
  ];

  const handleUpdateProject = async (payload: Omit<Project, 'id' | '_id'>) => {
    if (!editProject || !isValidObjectId(editProject._id)) {
      toast({ title: 'Error', description: 'Cannot update project: invalid or missing MongoDB id.' });
      return;
    }
    const _id = editProject._id;
    const body: Record<string, unknown> = { ...payload };
    if (!body.createdBy || String(body.createdBy).trim() === '') {
      delete body.createdBy;
    }
    console.log('[UPDATE] PATCH /projects/' + _id, body);
    setSaving(true);
    try {
      await updateProject(_id, body as Partial<Omit<Project, '_id'>>);
      toast({ title: 'Project updated', description: 'The project was saved successfully.' });
      setOpen(false);
      setEditProject(null);
      await fetchProjects();
    } catch (err: unknown) {
      console.error('[UPDATE project]', err);
      const msg = err instanceof ApiError ? err.message : (err as Error)?.message ?? 'Update failed';
      toast({ title: 'Error', description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProject = async (payload: Omit<Project, 'id' | '_id'>) => {
    if (!payload.createdBy || payload.createdBy.trim() === '') {
      toast({ title: 'Error', description: 'Please select a Site Engineer.' });
      return;
    }
    if (!payload.clientId || !String(payload.clientId).trim()) {
      toast({ title: 'Error', description: 'Please select a client account.' });
      return;
    }
    const finalPayload: ProjectCreatePayload = {
      ...payload,
      createdBy: payload.createdBy,
      clientId: String(payload.clientId).trim(),
    };
    console.log('[CREATE] POST /projects', finalPayload);
    setSaving(true);
    try {
      await createProject(finalPayload);
      toast({ title: 'Project created', description: 'The project was added successfully.' });
      setOpen(false);
      await fetchProjects();
    } catch (err: unknown) {
      console.error('[CREATE project]', err);
      const msg = err instanceof ApiError ? err.message : (err as Error)?.message ?? 'Create failed';
      toast({ title: 'Error', description: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <DeleteProjectDialog
        open={projectPendingDelete !== null}
        projectTitle={projectPendingDelete?.name ?? ''}
        onConfirm={() => {
          void handleConfirmDeleteProject();
        }}
        onCancel={() => setProjectPendingDelete(null)}
        isDeleting={isDeleteProjectSubmitting}
      />
      <PageHeader
        title="Projects"
        description="Manage and monitor all construction projects"
      >
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditProject(null); }}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-orange-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plus size={18} aria-hidden className="shrink-0" />
              New Project
            </button>
          </DialogTrigger>
          <DialogContent
            showCloseButton
            className="max-h-[min(92vh,920px)] w-full max-w-[calc(100%-1.25rem)] gap-0 overflow-hidden rounded-2xl border border-white/10 bg-card/95 p-0 text-card-foreground shadow-2xl shadow-black/50 backdrop-blur-xl sm:max-w-3xl"
          >
            <div
              className="h-1 w-full shrink-0 bg-gradient-to-r from-primary via-[#0d6285] to-accent"
              aria-hidden
            />
            <div className="flex max-h-[min(92vh,920px)] min-h-0 flex-col">
              <DialogHeader className="space-y-2 border-b border-white/10 bg-gradient-to-br from-slate-800/80 via-card/95 to-slate-950/80 px-5 pb-4 pt-5 text-left sm:px-6 sm:pr-12">
                <DialogTitle className="text-xl font-semibold tracking-tight text-slate-50">
                  {editProject ? 'Edit project' : 'Create project'}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-slate-400">
                  {editProject
                    ? 'Update the fields and save. Type and status match the server values.'
                    : 'Name and start date are required. Budget and location are optional.'}
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-950/35 px-5 py-4 sm:px-6 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.35)_transparent]">
                <ProjectForm
                  key={editProject?._id ?? 'new-project'}
                  mode={editProject ? 'edit' : 'create'}
                  initialData={editProject || undefined}
                  isSubmitting={saving}
                  siteEngineers={siteEngineers}
                  clientAccounts={clientAccounts}
                  onSubmit={editProject ? handleUpdateProject : handleCreateProject}
                />
              </div>
              <DialogFooter className="gap-3 border-t border-white/10 bg-slate-950/55 px-5 py-4 backdrop-blur-md sm:justify-end sm:px-6">
                <DialogClose asChild>
                  <button
                    type="button"
                    disabled={saving}
                    aria-label="Cancel and close project form"
                    className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-slate-100 shadow-sm transition-[color,box-shadow,background] hover:bg-white/[0.1] focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
                  >
                    Cancel
                  </button>
                </DialogClose>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter size={18} className="shrink-0" aria-hidden />
          <span id="projects-status-filter-label" className="text-sm font-semibold text-foreground">
            Status
          </span>
        </div>
        <div
          role="radiogroup"
          aria-labelledby="projects-status-filter-label"
          aria-orientation="horizontal"
          className="flex flex-wrap gap-2"
        >
          {PROJECT_STATUS_FILTER_BUTTONS.map((btn, index) => (
            <button
              key={btn.label}
              type="button"
              role="radio"
              aria-checked={filter === btn.value}
              tabIndex={getProjectStatusFilterTabIndex(btn.value)}
              ref={setProjectStatusFilterRef(index)}
              onKeyDown={(e) => onProjectStatusFilterKeyDown(e, index)}
              onClick={() => setFilter(btn.value)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                filter === btn.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-foreground hover:bg-muted',
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full min-w-0">
        <DataTable<ProjectTableRow>
          columns={tableColumns}
          data={filteredProjects}
          title="All projects"
          pageLevelScroll
          colgroup={
            <colgroup>
              <col style={{ width: '18%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
          }
          renderRowFooter={(row: ProjectTableRow) => (
            <div
              role="group"
              aria-label={`Actions for ${row.name}`}
              className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:justify-end"
            >
              <button
                type="button"
                title="Project analysis (backend AI — budget & delay computed server-side)"
                aria-label={`Backend AI analysis for ${row.name}`}
                onClick={() => openInsightsForProject(row)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-sm transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45"
                disabled={!isValidObjectId(row._id)}
              >
                <Brain size={18} className="shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                title="Project assistant (Groq — chat)"
                aria-label={`Open project assistant for ${row.name}`}
                onClick={() => openAssistantForProject(row)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-800 text-white shadow-sm transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45"
                disabled={!isValidObjectId(row._id)}
              >
                <MessageCircle size={18} className="shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                title="Generate tasks (Gemini AI)"
                aria-label={`Generate tasks with AI for ${row.name}`}
                onClick={() => openAiForProject(row)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm transition-all duration-200 hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45"
                disabled={!isValidObjectId(row._id)}
              >
                <Sparkles size={18} className="shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                title="Edit"
                aria-label={`Edit project: ${row.name}`}
                onClick={() => handleEditClick(row)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45"
                disabled={!isValidObjectId(row._id)}
              >
                <Pencil size={18} className="shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                title="Delete"
                aria-label={`Delete project: ${row.name}`}
                onClick={() => {
                  if (!isValidObjectId(row._id)) return;
                  setProjectPendingDelete({ id: row._id, name: row.name });
                }}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-destructive/30 bg-background text-destructive shadow-sm transition-colors hover:bg-destructive/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45"
                disabled={
                  !isValidObjectId(row._id) ||
                  (isDeleteProjectSubmitting && projectPendingDelete?.id === row._id)
                }
              >
                <Trash2 size={18} className="shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                title="Project overview (KPI, budget, critical path)"
                aria-label={`Open project overview for ${row.name}`}
                onClick={() => {
                  if (!isValidObjectId(row._id)) return;
                  router.push(`/projects/${row._id}/overview`);
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-3"
                disabled={!isValidObjectId(row._id)}
              >
                <LayoutDashboard size={16} className="shrink-0 text-primary" aria-hidden />
                <span className="hidden sm:inline">Overview</span>
              </button>
              <button
                type="button"
                title="Open Gantt chart"
                aria-label={`Open Gantt chart for ${row.name}`}
                onClick={() => {
                  if (!isValidObjectId(row._id)) return;
                  router.push(`/projects/${row._id}/gantt`);
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-3"
                disabled={!isValidObjectId(row._id)}
              >
                <BarChart3 size={16} className="shrink-0 text-primary" aria-hidden />
                <span className="hidden md:inline">Gantt</span>
              </button>
              <button
                type="button"
                title="Generate financial report"
                aria-label={`Open financial report for ${row.name}`}
                onClick={() => {
                  if (!isValidObjectId(row._id)) return;
                  router.push(`/projects/${row._id}/reports`);
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-3"
                disabled={!isValidObjectId(row._id)}
              >
                <FileText size={16} className="shrink-0 text-primary" aria-hidden />
                <span className="hidden md:inline">Report</span>
              </button>
            </div>
          )}
          tableCaption="Construction projects: name, description, type, budgets, location, dates, status; actions appear on a second line under each row. Above the table, the status filter uses a radio group: when focused, use Left and Right arrows to change the option."
        />
      </div>

      <Dialog
        open={aiOpen}
        onOpenChange={(v) => {
          setAiOpen(v);
          if (!v) {
            setAiProject(null);
            setAiTasks([]);
            setAiError(null);
            setAiSelected(new Set());
          }
        }}
      >
        <DialogContent
          showCloseButton
          className={cn(
            aiModalShell,
            'flex max-h-[min(90vh,680px)] w-full max-w-[calc(100%-1.5rem)] flex-col sm:max-w-lg',
          )}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <DialogHeader className={cn(aiModalHeaderIndigo, 'text-left')}>
              <DialogTitle className="flex items-center gap-3 text-xl font-semibold tracking-tight text-slate-50">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/25 shadow-inner ring-1 ring-indigo-400/30">
                  <Sparkles className="h-5 w-5 text-indigo-300" aria-hidden />
                </span>
                AI-suggested tasks
              </DialogTitle>
              <DialogDescription className="text-left text-sm leading-relaxed text-slate-400">
                {aiProject ? (
                  <>
                    <span className="font-medium text-slate-200">{aiProject.name}</span>
                    {aiLoading ? (
                      <span className="text-slate-500"> — generating with Gemini…</span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-slate-500">Select a project to generate tasks.</span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className={aiModalBody}>
              {aiLoading && (
                <p
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Calling Google Gemini…
                </p>
              )}

              {aiError && !aiLoading && (
                <p
                  role="alert"
                  className="rounded-xl border border-destructive/35 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                >
                  {aiError}
                </p>
              )}

              {!aiLoading && aiTasks.length > 0 && (
                <ul
                  className="max-h-[min(48vh,420px)] space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]"
                  aria-label="AI-suggested tasks. Select tasks to create."
                >
                  {aiTasks.map((t, i) => (
                    <li
                      key={i}
                      className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-left shadow-sm transition-colors hover:bg-white/[0.07]"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-indigo-700"
                        checked={aiSelected.has(i)}
                        onChange={() => toggleAiTask(i)}
                        aria-label={`Select suggested task: ${t.title}`}
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-semibold leading-snug text-foreground">{t.title}</h4>
                        {t.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                        ) : null}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t.duration} d · {t.priority} · {t.status}
                          {t.startDate && t.endDate ? (
                            <span className="ml-1 block sm:inline">
                              · {t.startDate} → {t.endDate}
                            </span>
                          ) : null}
                        </p>
                        {Array.isArray(t.dependsOnIndices) && t.dependsOnIndices.length > 0 ? (
                          <p className="mt-2 text-xs leading-snug">
                            <span className="font-semibold text-amber-200">
                              Depends on {t.dependsOnIndices.length} task
                              {t.dependsOnIndices.length === 1 ? '' : 's'}
                            </span>
                            <span className="text-muted-foreground">
                              {(() => {
                                const labels = t.dependsOnIndices
                                  .filter(
                                    (j) =>
                                      typeof j === 'number' &&
                                      j >= 0 &&
                                      j < aiTasks.length &&
                                      j !== i,
                                  )
                                  .slice(0, 4)
                                  .map((j) => aiTasks[j]?.title)
                                  .filter(Boolean);
                                return labels.length
                                  ? ` — ${labels.join(' · ')}${
                                      t.dependsOnIndices.length > labels.length ? '…' : ''
                                    }`
                                  : '';
                              })()}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <DialogFooter className={cn(aiModalFooter, 'flex-col')}>
              <DialogClose asChild>
                <button
                  type="button"
                  aria-label="Close suggested tasks dialog"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-slate-100 shadow-sm transition-colors hover:bg-white/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto"
                  disabled={aiCreating}
                >
                  Close
                </button>
              </DialogClose>
              <button
                type="button"
                onClick={handleCreateAiTasks}
                disabled={aiCreating || aiTasks.length === 0 || aiLoading}
                aria-busy={aiCreating}
                className="w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
              >
                {aiCreating ? 'Creating…' : 'Create selected tasks'}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={insightsOpen}
        onOpenChange={(v) => {
          setInsightsOpen(v);
          if (!v) {
            setInsightsProject(null);
            setInsightsData(null);
            setInsightsError(null);
          }
        }}
      >
        <DialogContent
          showCloseButton
          className={cn(
            aiModalShell,
            'flex max-h-[min(92vh,900px)] w-full max-w-[calc(100%-1.25rem)] flex-col sm:max-w-3xl lg:max-w-[44rem]',
          )}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <DialogHeader className={cn(aiModalHeaderEmerald, 'text-left')}>
              <DialogTitle className="flex flex-wrap items-center gap-3 text-xl font-semibold tracking-tight text-slate-50">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/25 shadow-inner ring-1 ring-emerald-400/30">
                  <Brain className="h-5 w-5 text-emerald-300" aria-hidden />
                </span>
                <span className="min-w-0">AI project analysis</span>
              </DialogTitle>
              <DialogDescription className="text-left text-sm leading-relaxed text-slate-400">
                {insightsProject ? (
                  <>
                    <span className="font-semibold text-slate-200">{insightsProject.name}</span>
                    {insightsLoading ? (
                      <span className="text-slate-500"> — generating insights…</span>
                    ) : (
                      <span className="mt-0.5 block text-slate-500">
                        Budget, delays, risks and actions — computed on the server.
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500">Server-side budget and schedule analysis.</span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className={aiModalBody}>
              {insightsLoading && (
                <div
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  className="flex flex-col items-center justify-center gap-4 py-14"
                >
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20"
                    aria-hidden
                  >
                    <Loader2 className="h-7 w-7 animate-spin text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Analyzing your project</p>
                    <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                      Connecting to the backend and running the AI pipeline. This may take a few seconds.
                    </p>
                  </div>
                </div>
              )}

              {insightsError && !insightsLoading && (
                <div
                  role="alert"
                  className="flex gap-3 rounded-2xl border border-destructive/35 bg-destructive/[0.07] p-4 dark:bg-destructive/10"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                    <AlertTriangle className="h-4 w-4" aria-hidden />
                  </span>
                  <p className="min-w-0 flex-1 text-sm leading-relaxed text-destructive">{insightsError}</p>
                </div>
              )}

              {!insightsLoading && insightsData && (
                <div className="space-y-6 text-sm">
                  <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                          insightsData.source === 'groq'
                            ? 'bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/35'
                            : 'bg-white/[0.06] px-3 py-1 text-slate-200 ring-1 ring-white/15'
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5 opacity-90" aria-hidden />
                        {insightsData.source === 'groq' ? 'AI (Groq)' : 'Fallback (deterministic)'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                        {new Date(insightsData.generatedAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <InsightsConfidenceBar value={insightsData.analysis.confidence} />
                  </div>

                  <section className="overflow-hidden rounded-2xl border border-white/10 bg-card/80 shadow-lg backdrop-blur-sm">
                    <div className="border-b border-white/10 bg-gradient-to-r from-teal-500/15 via-transparent to-emerald-500/10 px-4 py-3">
                      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
                        <TrendingUp className="h-4 w-4 text-teal-600 dark:text-teal-400" aria-hidden />
                        Budget &amp; schedule
                        <span className="font-normal normal-case text-slate-500">· server KPIs</span>
                      </h3>
                    </div>
                    <div className="p-4 sm:p-5">
                      <dl className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
                          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            Budget variance
                          </dt>
                          <dd className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-slate-50">
                            {formatBudgetDeltaPercent(
                              insightsData.analysis.budgetDelayTradeoff.estimatedBudgetDeltaPercent,
                            )}
                          </dd>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
                          <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            <Clock className="h-3 w-3" aria-hidden />
                            Delay
                          </dt>
                          <dd className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-slate-50">
                            {insightsData.analysis.budgetDelayTradeoff.estimatedDelayDays}
                            <span className="text-sm font-semibold text-slate-500"> d</span>
                          </dd>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 sm:col-span-1">
                          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            Recommended mode
                          </dt>
                          <dd className="mt-1.5 text-base font-semibold leading-snug text-slate-50">
                            {budgetDelayModeLabel(insightsData.analysis.budgetDelayTradeoff.recommendedMode)}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-slate-950/40 px-3 py-3 text-sm leading-relaxed text-slate-300">
                        {insightsData.analysis.budgetDelayTradeoff.rationale}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.12] via-card/90 to-transparent p-5">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
                      <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      Summary
                    </h3>
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-200">
                      {insightsData.analysis.summary}
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
                      Top risks
                      <span className="text-xs font-normal text-muted-foreground">
                        ({insightsData.analysis.topRisks.length})
                      </span>
                    </h3>
                    <ul className="space-y-3">
                      {insightsData.analysis.topRisks.map((r, i) => (
                        <li
                          key={i}
                          className={cn(
                            'rounded-xl border border-white/10 border-l-4 bg-white/[0.04] py-3 pl-4 pr-3 shadow-sm',
                            riskImpactBorderClass(r.impact),
                          )}
                        >
                          <div className="flex flex-wrap items-start gap-2">
                            <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-md bg-muted px-1.5 text-[11px] font-bold tabular-nums text-muted-foreground">
                              {i + 1}
                            </span>
                            <span
                              className={cn(
                                'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                riskImpactClass(r.impact),
                              )}
                            >
                              {riskImpactLabel(r.impact)}
                            </span>
                            <span className="min-w-0 flex-1 font-semibold leading-snug text-foreground">
                              {r.title}
                            </span>
                          </div>
                          <p className="mt-2 pl-9 text-sm leading-relaxed text-muted-foreground">{r.action}</p>
                          {insightsProject && r.relatedTasks && r.relatedTasks.length > 0 ? (
                            <div className="mt-3 border-t border-border/50 pt-3 pl-9">
                              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                                Related tasks
                              </p>
                              <ul className="flex flex-wrap gap-2">
                                {r.relatedTasks.map((t) => (
                                  <li key={t.id}>
                                    <Link
                                      href={`/tasks?project=${insightsProject._id}&view=board&focusTask=${t.id}`}
                                      className="inline-flex max-w-[260px] truncate rounded-lg bg-primary/12 px-2.5 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/15 transition-colors hover:bg-primary/18 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                      title={t.title}
                                    >
                                      {t.title}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <ListChecks className="h-4 w-4 text-primary" aria-hidden />
                      Next actions
                    </h3>
                    <ol className="space-y-2">
                      {insightsData.analysis.nextActions.map((a, i) => (
                        <li
                          key={i}
                          className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
                            {i + 1}
                          </span>
                          <span className="min-w-0 flex-1 leading-relaxed text-foreground/90">{a}</span>
                        </li>
                      ))}
                    </ol>
                  </section>

                  <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-sm sm:p-5">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
                      <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" aria-hidden />
                      Delay analysis
                    </h3>
                    <p className="mb-4 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-200">
                      {insightsData.analysis.delayAnalysis.summary}
                    </p>
                    <ul className="space-y-2">
                      {insightsData.analysis.delayAnalysis.contributingFactors.map((f, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-sm text-muted-foreground before:mt-2 before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-orange-500/70 before:content-['']"
                        >
                          <span className="min-w-0 leading-relaxed">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden />
                      Planning suggestions
                    </h3>
                    <ul className="space-y-2">
                      {insightsData.analysis.planningSuggestions.map((s, i) => (
                        <li
                          key={i}
                          className="flex gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-400"
                        >
                          <span
                            className="mt-0.5 h-5 w-5 shrink-0 rounded-md bg-amber-500/20 text-center text-[10px] font-bold leading-5 text-amber-200"
                            aria-hidden
                          >
                            {i + 1}
                          </span>
                          <span className="min-w-0 leading-relaxed">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <RefreshCw className="h-4 w-4 text-violet-600 dark:text-violet-400" aria-hidden />
                      Repetitive work &amp; automation
                    </h3>
                    <ul className="space-y-2">
                      {insightsData.analysis.repetitiveWorkAndAutomation.map((s, i) => (
                        <li
                          key={i}
                          className="relative rounded-xl border border-violet-500/20 bg-violet-500/[0.08] py-2.5 pl-9 pr-3 text-slate-400"
                        >
                          <span className="absolute left-3 top-3 h-1.5 w-1.5 rounded-full bg-violet-500" aria-hidden />
                          <span className="leading-relaxed">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              )}
            </div>

            <DialogFooter className={aiModalFooter}>
              <DialogClose asChild>
                <button
                  type="button"
                  aria-label="Close project analysis dialog"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-slate-100 shadow-sm transition-colors hover:bg-white/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto"
                >
                  Close
                </button>
              </DialogClose>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={assistantOpen}
        onOpenChange={(v) => {
          setAssistantOpen(v);
          if (!v) {
            setAssistantProject(null);
            setAssistantMessages([]);
            setAssistantInput('');
            setAssistantError(null);
            setAssistantReport(null);
            setAssistantReportLoading(false);
            setAssistantReportError(null);
          }
        }}
      >
        <DialogContent
          showCloseButton
          className={cn(
            aiModalShell,
            '!flex min-h-0 max-h-[min(94vh,920px)] w-full max-w-[calc(100%-1rem)] flex-col gap-0 p-0 sm:max-w-[min(40rem,calc(100%-2rem))] lg:max-w-3xl',
          )}
        >
          <div className="flex min-h-0 min-w-0 max-h-[inherit] flex-1 flex-col overflow-hidden">
            <DialogHeader className={cn(aiModalHeaderAssistant, 'shrink-0 space-y-0 text-left')}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/35 to-teal-500/25 shadow-md ring-1 ring-white/15"
                    aria-hidden
                  >
                    <MessageCircle className="h-6 w-6 text-violet-200" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <DialogTitle className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
                      Project assistant
                    </DialogTitle>
                    {assistantProject ? (
                      <p className="truncate text-sm font-medium text-slate-300">
                        {assistantProject.name}
                      </p>
                    ) : null}
                    <DialogDescription className="!mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                      A generated report on the project and tasks, then optional chat with the AI (Groq).
                    </DialogDescription>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300 shadow-sm backdrop-blur-sm">
                  <Sparkles className="size-3.5 shrink-0 text-amber-400" aria-hidden />
                  Groq
                </span>
              </div>
            </DialogHeader>

            <div
              className={cn(
                'min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-950/25 px-5 py-4 sm:px-7 sm:py-5',
                '[scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.35)_transparent]',
              )}
            >
              <section className="space-y-2.5 pb-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <FileText className="size-3.5 opacity-80" aria-hidden />
                  Project &amp; task summary
                </div>
                <div
                  role="region"
                  aria-label="Generated project and task report"
                  className="relative max-h-[min(36vh,360px)] overflow-y-auto rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/60 via-slate-950/40 to-transparent p-4 text-sm shadow-inner ring-1 ring-inset ring-white/[0.06] [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.35)_transparent]"
                >
                  {assistantReportLoading ? (
                    <div className="space-y-4" role="status" aria-live="polite" aria-busy="true">
                      <div className="flex items-center gap-2.5 text-muted-foreground">
                        <Loader2 className="size-4 shrink-0 animate-spin text-violet-600 dark:text-violet-400" aria-hidden />
                        <span className="text-sm font-medium">Generating report…</span>
                      </div>
                      <div className="space-y-2.5 pl-1">
                        <div className="h-2.5 w-full max-w-[95%] animate-pulse rounded-full bg-muted" />
                        <div className="h-2.5 w-full max-w-[88%] animate-pulse rounded-full bg-muted" />
                        <div className="h-2.5 w-full max-w-[72%] animate-pulse rounded-full bg-muted" />
                      </div>
                    </div>
                  ) : assistantReportError ? (
                    <div
                      role="alert"
                      className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                    >
                      {assistantReportError}
                    </div>
                  ) : assistantReport ? (
                    <div className="whitespace-pre-wrap leading-[1.65] text-foreground [text-wrap:pretty]">
                      {assistantReport}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No report yet.</p>
                  )}
                </div>
              </section>

              <section className="flex flex-col gap-2.5 border-t border-border/40 pt-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Bot className="size-3.5 opacity-80" aria-hidden />
                  Follow-up questions
                </div>
                <div
                  ref={assistantChatScrollRef}
                  role="log"
                  aria-label="Assistant conversation"
                  aria-live="polite"
                  className="max-h-[min(36vh,320px)] min-h-[100px] space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.35)_transparent] sm:p-4"
                >
                  {assistantMessages.length === 0 && !assistantLoading ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                      <div className="rounded-full bg-muted/60 p-3 dark:bg-muted/30">
                        <MessageCircle className="size-6 text-muted-foreground" aria-hidden />
                      </div>
                      <p className="max-w-[240px] text-xs leading-relaxed text-muted-foreground">
                        Optional: ask a question after the summary, or close the window if the report is enough.
                      </p>
                    </div>
                  ) : null}
                  {assistantMessages.map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex gap-3',
                        m.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm ring-2 ring-background',
                          m.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-gradient-to-br from-violet-500/25 to-teal-500/15 text-violet-200',
                        )}
                        aria-hidden
                      >
                        {m.role === 'user' ? (
                          <User className="size-4" strokeWidth={2.25} />
                        ) : (
                          <Bot className="size-4" strokeWidth={2.25} />
                        )}
                      </div>
                      <div
                        className={cn(
                          'max-w-[min(100%,28rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm sm:px-4 sm:py-3',
                          m.role === 'user'
                            ? 'rounded-br-md bg-primary text-primary-foreground'
                            : 'rounded-bl-md border border-white/10 bg-card/90 text-slate-100 backdrop-blur-sm',
                        )}
                      >
                        <p className="whitespace-pre-wrap [text-wrap:pretty]">{m.content}</p>
                      </div>
                    </div>
                  ))}
                  {assistantLoading ? (
                    <div className="flex gap-3" role="status" aria-live="polite">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/25 to-teal-500/15 text-violet-200"
                        aria-hidden
                      >
                        <Bot className="size-4" strokeWidth={2.25} />
                      </div>
                      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/10 bg-card/85 px-4 py-3">
                        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-duration:520ms]" />
                        <span
                          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-duration:520ms]"
                          style={{ animationDelay: '120ms' }}
                        />
                        <span
                          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-duration:520ms]"
                          style={{ animationDelay: '240ms' }}
                        />
                      </div>
                    </div>
                  ) : null}
                  {assistantError ? (
                    <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {assistantError}
                    </p>
                  ) : null}
                </div>
              </section>
            </div>

            <div className="shrink-0 border-t border-white/10 bg-slate-950/45 px-5 py-3 backdrop-blur-md sm:px-7 sm:py-4">
              <div className="rounded-2xl border border-white/10 bg-card/80 p-2 shadow-lg backdrop-blur-sm">
                <div className="flex items-end gap-2">
                  <textarea
                    id="project-assistant-followup"
                    value={assistantInput}
                    onChange={(e) => setAssistantInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void sendAssistantMessage();
                      }
                    }}
                    placeholder={
                      assistantReportLoading
                        ? 'Please wait, generating report…'
                        : 'Ask your question (optional)…'
                    }
                    rows={3}
                    aria-label="Follow-up question for the project assistant"
                    className="min-h-[80px] w-full flex-1 resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]"
                    disabled={assistantLoading || assistantReportLoading}
                  />
                  <button
                    type="button"
                    onClick={() => void sendAssistantMessage()}
                    disabled={
                      assistantLoading ||
                      assistantReportLoading ||
                      !assistantInput.trim()
                    }
                    aria-busy={assistantLoading}
                    title="Send"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-teal-600 text-white shadow-md shadow-violet-900/20 transition-[filter,transform,box-shadow] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-45 dark:from-violet-500 dark:to-teal-600 dark:shadow-black/30"
                  >
                    <SendHorizontal className="size-5" strokeWidth={2} aria-hidden />
                    <span className="sr-only">Send</span>
                  </button>
                </div>
                <p className="px-1 pt-1.5 text-[10px] leading-snug text-muted-foreground">
                  Enter to send · Shift+Enter for a new line
                </p>
              </div>
            </div>

            <DialogFooter
              className={cn(
                aiModalFooter,
                'flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
              )}
            >
              <p className="order-2 text-center text-[11px] leading-relaxed text-muted-foreground sm:order-1 sm:text-left">
                AI can make mistakes — double-check figures and important decisions.
              </p>
              <DialogClose asChild>
                <button
                  type="button"
                  aria-label="Close project assistant"
                  className="order-1 inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-slate-100 shadow-sm transition-colors hover:bg-white/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:order-2 sm:w-auto"
                >
                  Close
                </button>
              </DialogClose>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}