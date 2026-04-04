
"use client";
// À remplacer par la vraie source d'authentification !
const USER_ID = "65cfa1a7cf3f4e38dc1db123";

import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import type { Project, ProjectAiInsightsResponse } from '@/lib/types';
import { ApiError } from '@/lib/types';
import { Folder, Cake as Crane, Filter, Trash2, Pencil, Plus, Sparkles, BarChart3, Brain, MessageCircle, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';
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
  type ProjectCreatePayload,
} from '@/lib/api';
import type { Human } from '@/lib/types';
import { generateTasksFromProject, type GeminiTaskProposal } from '@/lib/geminiTasks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import ProjectForm from '@/components/ProjectForm';
import { toast } from '@/hooks/use-toast';
import { formatDh } from '@/lib/formatMoney';
import { cn } from '@/lib/utils';

const DESCRIPTION_PREVIEW_LEN = 20;

/** Shell: floating glass modal for AI dialogs */
const aiModalShell =
  'gap-0 overflow-hidden rounded-3xl border-0 bg-card/95 p-0 shadow-[0_24px_64px_-12px_rgba(15,23,42,0.35)] backdrop-blur-2xl ring-1 ring-black/[0.06] dark:bg-zinc-950/92 dark:ring-white/[0.08] dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.62)]';

const aiModalHeaderIndigo =
  'shrink-0 border-b border-white/10 bg-gradient-to-br from-indigo-500/[0.14] via-card/80 to-card px-5 pb-4 pt-6 sm:px-6 dark:from-indigo-500/[0.18] dark:via-card/90';

const aiModalHeaderEmerald =
  'shrink-0 border-b border-white/10 bg-gradient-to-br from-emerald-500/[0.12] via-card/80 to-card px-5 pb-4 pt-6 sm:px-6 dark:from-emerald-500/[0.16] dark:via-card/90';

const aiModalHeaderTeal =
  'shrink-0 border-b border-white/10 bg-gradient-to-br from-teal-500/[0.12] via-card/80 to-card px-5 pb-4 pt-6 sm:px-6 dark:from-teal-500/[0.16] dark:via-card/90';

const aiModalBody = 'min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6';

const aiModalFooter =
  'shrink-0 gap-3 border-t border-border/50 bg-gradient-to-t from-muted/40 to-muted/15 px-5 py-4 backdrop-blur-md dark:from-muted/25 dark:to-muted/10 sm:flex-row sm:justify-end sm:px-6';

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
      return 'bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200';
    case 'medium':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';
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

type ProjectStatusFilter = 'All' | Project['status'];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [siteEngineers, setSiteEngineers] = useState<Human[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProjectStatusFilter>('All');
  const [open, setOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

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

  useEffect(() => {
    fetchProjects();
    fetchSiteEngineers();
  }, []);

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

  const statusFilterButtons: { label: string; value: ProjectStatusFilter }[] = [
    { label: 'All', value: 'All' },
    { label: 'In progress', value: 'En cours' },
    { label: 'Completed', value: 'Terminé' },
    { label: 'Behind schedule', value: 'En retard' },
  ];

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

  const handleDeleteProject = async (_id: string) => {
    if (!isValidObjectId(_id)) {
      toast({ title: 'Error', description: 'Cannot delete: invalid or missing MongoDB id.' });
      return;
    }
    try {
      await deleteProject(_id);
      toast({ title: 'Project deleted', description: 'The project was removed successfully.' });
      setProjects((prev) => prev.filter((p) => p._id !== _id));
    } catch (err: unknown) {
      console.error('[DELETE project]', err);
      const msg = err instanceof ApiError ? err.message : (err as Error)?.message ?? 'Delete failed';
      toast({ title: 'Error', description: msg });
    }
  };

  const tableColumns = [
    {
      key: 'name' as const,
      label: 'Project Name',
      render: (value: string | number | undefined, row: Project) => (
        <div className="flex items-center gap-3">
          {getProjectIcon(0)}
          <div>
            <p className="font-semibold text-foreground">
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
            <p className="max-w-md text-sm text-muted-foreground" title={row.description?.trim() ? row.description : undefined}>
              {truncateDescription(row.description)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'description' as const,
      label: 'Description',
      render: (value: string | number | undefined) => (
        <span className="text-muted-foreground" title={value != null && String(value).length > DESCRIPTION_PREVIEW_LEN ? String(value) : undefined}>
          {truncateDescription(value != null ? String(value) : undefined)}
        </span>
      ),
    },
    {
      key: 'type' as const,
      label: 'Type',
      render: (value: string | number | undefined) =>
        value != null && value !== '' ? projectTypeLabel(String(value)) : '—',
    },
    {
      key: 'budget' as const,
      label: 'Allocated budget',
      align: 'right',
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
      label: 'Spent budget',
      align: 'right',
      render: (_value: number | undefined, row: Project) => (
        <span className="tabular-nums font-semibold text-foreground">{formatDh(row.spentBudget)}</span>
      ),
    },
    {
      key: 'location' as const,
      label: 'Location',
      render: (value: string | number | undefined) => {
        const s = value != null ? String(value).trim() : '';
        return s ? s : '—';
      },
    },
    {
      key: 'startDate' as const,
      label: 'Start Date',
      render: (val: any) => (
        val ? new Date(val).toLocaleDateString() : "-"
      ),
    },
    {
      key: 'endDate' as const,
      label: 'End Date',
      render: (val: any) => (
        val ? new Date(val).toLocaleDateString() : "-"
      ),
    },
    {
      key: 'status' as const,
      label: 'Status',
      render: (value: string) => (
        <span className={getStatusColor(value)}>{projectStatusLabel(value)}</span>
      ),
    },
    {
      key: 'actions' as const,
      label: 'Actions',
      align: 'center',
      render: (_: unknown, row: Project) => (
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          <button
            type="button"
            title="Project analysis (backend AI — budget & delay computed server-side)"
            aria-label={`Backend AI analysis for ${row.name}`}
            onClick={() => openInsightsForProject(row)}
            className="inline-flex size-9 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-sm transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45"
            disabled={!isValidObjectId(row._id)}
          >
            <Brain size={18} className="shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            title="Project assistant (Groq — chat)"
            aria-label={`Open project assistant for ${row.name}`}
            onClick={() => openAssistantForProject(row)}
            className="inline-flex size-9 items-center justify-center rounded-lg bg-teal-800 text-white shadow-sm transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45"
            disabled={!isValidObjectId(row._id)}
          >
            <MessageCircle size={18} className="shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            title="Generate tasks (Gemini AI)"
            aria-label={`Generate tasks with AI for ${row.name}`}
            onClick={() => openAiForProject(row)}
            className="inline-flex size-9 items-center justify-center rounded-lg bg-indigo-800 text-white shadow-sm transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45"
            disabled={!isValidObjectId(row._id)}
          >
            <Sparkles size={18} className="shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            title="Edit"
            aria-label={`Edit project: ${row.name}`}
            onClick={() => handleEditClick(row)}
            className="inline-flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45"
            disabled={!isValidObjectId(row._id)}
          >
            <Pencil size={18} className="shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            title="Delete"
            aria-label={`Delete project: ${row.name}`}
            onClick={() => handleDeleteProject(row._id)}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-destructive/30 bg-background text-destructive shadow-sm transition-colors hover:bg-destructive/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45"
            disabled={!isValidObjectId(row._id)}
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-3"
            disabled={!isValidObjectId(row._id)}
          >
            <LayoutDashboard size={16} className="shrink-0 text-primary" aria-hidden />
            <span className="hidden sm:inline">Synthèse</span>
          </button>
          <button
            type="button"
            title="Open Gantt chart"
            aria-label={`Open Gantt chart for ${row.name}`}
            onClick={() => {
              if (!isValidObjectId(row._id)) return;
              router.push(`/projects/${row._id}/gantt`);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-3"
            disabled={!isValidObjectId(row._id)}
          >
            <BarChart3 size={16} className="shrink-0 text-primary" aria-hidden />
            <span className="hidden sm:inline">Gantt</span>
          </button>
        </div>
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
    const finalPayload: ProjectCreatePayload = {
      ...payload,
      createdBy: payload.createdBy,
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
            className="max-h-[min(92vh,920px)] w-full max-w-[calc(100%-1.25rem)] gap-0 overflow-hidden rounded-2xl border border-border/70 bg-card p-0 shadow-2xl shadow-black/12 ring-1 ring-black/5 sm:max-w-3xl dark:ring-white/10 dark:shadow-black/40"
          >
            <div
              className="h-1 w-full shrink-0 bg-gradient-to-r from-primary via-[#0d6285] to-accent"
              aria-hidden
            />
            <div className="flex max-h-[min(92vh,920px)] min-h-0 flex-col">
              <DialogHeader className="space-y-2 px-5 pb-2 pt-5 text-left sm:px-6 sm:pr-12">
                <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                  {editProject ? 'Edit project' : 'Create project'}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                  {editProject
                    ? 'Update the fields and save. Type and status match the server values.'
                    : 'Name and start date are required. Budget and location are optional.'}
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/25 px-5 py-4 sm:px-6">
                <ProjectForm
                  key={editProject?._id ?? 'new-project'}
                  mode={editProject ? 'edit' : 'create'}
                  initialData={editProject || undefined}
                  isSubmitting={saving}
                  siteEngineers={siteEngineers}
                  onSubmit={editProject ? handleUpdateProject : handleCreateProject}
                />
              </div>
              <DialogFooter className="gap-3 border-t border-border/80 bg-muted/40 px-5 py-4 backdrop-blur-sm sm:justify-end sm:px-6">
                <DialogClose asChild>
                  <button
                    type="button"
                    disabled={saving}
                    aria-label="Cancel and close project form"
                    className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground shadow-sm transition-[color,box-shadow,background] hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
                  >
                    Cancel
                  </button>
                </DialogClose>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div
        className="mb-6 flex flex-wrap items-center gap-2"
        role="radiogroup"
        aria-labelledby="projects-status-filter-label"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter size={18} className="shrink-0" aria-hidden />
          <span id="projects-status-filter-label" className="text-sm font-semibold text-foreground">
            Status
          </span>
        </div>
        {statusFilterButtons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            role="radio"
            aria-checked={filter === btn.value}
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

      <DataTable
        columns={tableColumns}
        data={filteredProjects}
        title="All projects"
        tableCaption="Construction projects: name, description, type, budgets, location, dates, status, and row actions."
        pageLevelScroll
      />

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
              <DialogTitle className="flex items-center gap-3 text-xl font-semibold tracking-tight text-foreground">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 shadow-inner ring-1 ring-indigo-500/25">
                  <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden />
                </span>
                AI-suggested tasks
              </DialogTitle>
              <DialogDescription className="text-left text-sm leading-relaxed">
                {aiProject ? (
                  <>
                    <span className="font-medium text-foreground">{aiProject.name}</span>
                    {aiLoading ? (
                      <span className="text-muted-foreground"> — generating with Gemini…</span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-muted-foreground">Select a project to generate tasks.</span>
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
                      className="flex gap-3 rounded-2xl border border-border/70 bg-muted/25 p-3.5 text-left shadow-sm transition-colors hover:bg-muted/35 dark:bg-muted/15 dark:hover:bg-muted/25"
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
                            <span className="font-semibold text-amber-900 dark:text-amber-100">
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
                  className="w-full rounded-xl border border-border/80 bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto"
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
                className="w-full rounded-xl bg-indigo-800 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-800/25 transition-[filter,transform] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
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
            'flex max-h-[min(92vh,860px)] w-full max-w-[calc(100%-1.5rem)] flex-col sm:max-w-2xl',
          )}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <DialogHeader className={cn(aiModalHeaderEmerald, 'text-left')}>
              <DialogTitle className="flex flex-wrap items-center gap-3 text-xl font-semibold tracking-tight text-foreground">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 shadow-inner ring-1 ring-emerald-500/25">
                  <Brain className="h-5 w-5 text-emerald-700 dark:text-emerald-400" aria-hidden />
                </span>
                AI project analysis
              </DialogTitle>
              <DialogDescription className="text-left text-sm leading-relaxed">
                {insightsProject ? (
                  <>
                    <span className="font-medium text-foreground">{insightsProject.name}</span>
                    {insightsLoading ? (
                      <span className="text-muted-foreground"> — analyzing…</span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-muted-foreground">Server-side budget and schedule analysis.</span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className={aiModalBody}>
              {insightsLoading && (
                <p
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Connecting to server and generating analysis…
                </p>
              )}

              {insightsError && !insightsLoading && (
                <p
                  role="alert"
                  className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                >
                  {insightsError}
                </p>
              )}

              {!insightsLoading && insightsData && (
                <div className="space-y-5 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-semibold ${
                        insightsData.source === 'groq'
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                          : 'bg-muted text-foreground dark:bg-muted dark:text-foreground'
                      }`}
                    >
                      {insightsData.source === 'groq' ? 'AI (Groq)' : 'Fallback (no LLM)'}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(insightsData.generatedAt).toLocaleString('en-US')}
                    </span>
                    <span className="text-muted-foreground">
                      Confidence:{' '}
                      {new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 }).format(
                        insightsData.analysis.confidence,
                      )}
                    </span>
                  </div>

                  <section className="rounded-2xl border border-border/70 bg-muted/20 p-4 shadow-sm dark:bg-muted/10">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Budget & schedule (server-calculated)
                    </h3>
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Budget variance vs allocated</dt>
                        <dd className="text-lg font-semibold tabular-nums text-foreground">
                          {formatBudgetDeltaPercent(
                            insightsData.analysis.budgetDelayTradeoff.estimatedBudgetDeltaPercent,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Delay (days)</dt>
                        <dd className="text-lg font-semibold tabular-nums text-foreground">
                          {insightsData.analysis.budgetDelayTradeoff.estimatedDelayDays}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">Recommended mode</dt>
                        <dd className="font-medium text-foreground">
                          {budgetDelayModeLabel(insightsData.analysis.budgetDelayTradeoff.recommendedMode)}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-3 border-t border-border/80 pt-3 text-muted-foreground">
                      {insightsData.analysis.budgetDelayTradeoff.rationale}
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 font-semibold text-foreground">Summary</h3>
                    <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                      {insightsData.analysis.summary}
                    </p>
                  </section>

                  <section>
                    <h3 className="mb-2 font-semibold text-foreground">Risks</h3>
                    <ul className="space-y-3">
                      {insightsData.analysis.topRisks.map((r, i) => (
                        <li
                          key={i}
                          className="rounded-xl border border-border/70 bg-background/80 p-3 shadow-sm dark:bg-card/50"
                        >
                          <div className="flex flex-wrap items-start gap-2">
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${riskImpactClass(r.impact)}`}
                            >
                              {riskImpactLabel(r.impact)}
                            </span>
                            <span className="font-medium text-foreground">{r.title}</span>
                          </div>
                          <p className="mt-2 text-muted-foreground">{r.action}</p>
                          {insightsProject && r.relatedTasks && r.relatedTasks.length > 0 ? (
                            <div className="mt-3 border-t border-border/60 pt-2">
                              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Related tasks
                              </p>
                              <ul className="flex flex-wrap gap-2">
                                {r.relatedTasks.map((t) => (
                                  <li key={t.id}>
                                    <Link
                                      href={`/tasks?project=${insightsProject._id}&view=board&focusTask=${t.id}`}
                                      className="inline-flex max-w-[240px] truncate rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/15 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                    <h3 className="mb-2 font-semibold text-foreground">Next actions</h3>
                    <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
                      {insightsData.analysis.nextActions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ol>
                  </section>

                  <section className="rounded-2xl border border-border/70 bg-muted/15 p-4 shadow-sm dark:bg-muted/10">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Analyse des retards
                    </h3>
                    <p className="mb-3 whitespace-pre-wrap leading-relaxed text-foreground">
                      {insightsData.analysis.delayAnalysis.summary}
                    </p>
                    <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                      {insightsData.analysis.delayAnalysis.contributingFactors.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h3 className="mb-2 font-semibold text-foreground">Suggestions de planning</h3>
                    <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                      {insightsData.analysis.planningSuggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h3 className="mb-2 font-semibold text-foreground">
                      Travail répétitif &amp; automatisation
                    </h3>
                    <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                      {insightsData.analysis.repetitiveWorkAndAutomation.map((s, i) => (
                        <li key={i}>{s}</li>
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
                  className="inline-flex w-full items-center justify-center rounded-xl border border-border/80 bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto"
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
            'flex max-h-[min(92vh,880px)] w-full max-w-[calc(100%-1.5rem)] flex-col sm:max-w-2xl',
          )}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <DialogHeader className={cn(aiModalHeaderTeal, 'text-left')}>
              <DialogTitle className="flex items-center gap-3 text-xl font-semibold tracking-tight text-foreground">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-500/20 shadow-inner ring-1 ring-teal-500/25">
                  <MessageCircle className="h-5 w-5 text-teal-700 dark:text-teal-400" aria-hidden />
                </span>
                Project assistant
              </DialogTitle>
              <DialogDescription className="text-left text-sm leading-relaxed">
                {assistantProject ? (
                  <>
                    Groq · <span className="font-medium text-foreground">{assistantProject.name}</span> — report
                    first; optional questions below or close when done.
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    Chat assistant with an initial report, then optional follow-up questions.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className={cn(aiModalBody, 'flex min-h-0 flex-1 flex-col gap-4 overflow-hidden')}>
              <div className="min-h-0 shrink-0">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Project & tasks report
                </h3>
                <div
                  role="region"
                  aria-label="Generated project and tasks report"
                  className="max-h-[min(34vh,320px)] overflow-y-auto rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-foreground shadow-inner [scrollbar-width:thin] dark:bg-muted/10"
                >
                  {assistantReportLoading ? (
                    <p role="status" aria-live="polite" aria-busy="true" className="text-muted-foreground">
                      Generating report…
                    </p>
                  ) : assistantReportError ? (
                    <p role="alert" className="text-destructive">
                      {assistantReportError}
                    </p>
                  ) : assistantReport ? (
                    <div className="whitespace-pre-wrap leading-relaxed">{assistantReport}</div>
                  ) : (
                    <p className="text-muted-foreground">No report yet.</p>
                  )}
                </div>
              </div>

              <div className="min-h-0 flex flex-1 flex-col border-t border-border/50 pt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Optional — follow-up questions
                </h3>
                <div
                  role="log"
                  aria-label="Assistant conversation"
                  aria-live="polite"
                  className="max-h-[min(26vh,240px)] min-h-[100px] flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border/60 bg-muted/15 p-3 text-sm [scrollbar-width:thin] dark:bg-muted/10"
                >
                  {assistantMessages.length === 0 && !assistantLoading ? (
                    <p className="text-xs text-muted-foreground">
                      You can skip this and close when the report is enough.
                    </p>
                  ) : null}
                  {assistantMessages.map((m, i) => (
                    <div
                      key={i}
                      className={`rounded-xl px-3 py-2 ${
                        m.role === 'user'
                          ? 'ml-3 bg-primary text-primary-foreground shadow-md'
                          : 'mr-3 border border-border/70 bg-background/90 text-foreground shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    </div>
                  ))}
                  {assistantLoading ? (
                    <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
                      Thinking…
                    </p>
                  ) : null}
                  {assistantError ? (
                    <p role="alert" className="text-sm text-destructive">
                      {assistantError}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end">
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
                      ? 'Wait for the report…'
                      : 'Ask a question (optional)…'
                  }
                  rows={2}
                  aria-label="Optional follow-up question for the project assistant"
                  className="min-h-[72px] w-full flex-1 resize-y rounded-xl border border-border/80 bg-input px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                  className="shrink-0 rounded-xl bg-teal-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/30 transition-[filter,transform] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>

            <DialogFooter className={aiModalFooter}>
              <DialogClose asChild>
                <button
                  type="button"
                  aria-label="Close project assistant dialog"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-border/80 bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto"
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
