
"use client";
// À remplacer par la vraie source d'authentification !
const USER_ID = "65cfa1a7cf3f4e38dc1db123";

import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import type { Project } from '@/lib/types';
import { ApiError } from '@/lib/types';
import { Folder, Cake as Crane, Filter, Trash2, Pencil, Plus, Sparkles, BarChart3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProjects, createProject, createTask, updateProject, deleteProject, type ProjectCreatePayload } from '@/lib/api';
import { generateTasksFromProject, type GeminiTaskProposal } from '@/lib/geminiTasks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import ProjectForm from '@/components/ProjectForm';
import { toast } from '@/hooks/use-toast';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  /** Chargement initial uniquement — ne pas démonter la page lors des mutations */
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('All');
  const [open, setOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiProject, setAiProject] = useState<Project | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiTasks, setAiTasks] = useState<GeminiTaskProposal[]>([]);
  const [aiSelected, setAiSelected] = useState<Set<number>>(new Set());
  const [aiCreating, setAiCreating] = useState(false);

  function isValidObjectId(id: string | undefined): boolean {
    return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
  }

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(Array.isArray(data) ? data.filter(p => p && isValidObjectId(p._id)) : []);
    } catch (err) {
      console.error('[fetchProjects]', err);
      setError('Erreur de chargement');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  if (initialLoading) {
    return <div>Chargement...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  const filteredProjects = (filter === 'All'
    ? projects
    : projects.filter(p => p.status === filter)
  ).filter(p => isValidObjectId(p._id));

  const statusOptions = ['All', 'In Progress', 'Planning', 'Completed'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Terminé':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800';
      case 'In Progress':
      case 'En cours':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800';
      case 'Planning':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800';
      default:
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800';
    }
  };

  const getProjectIcon = (index: number) => {
    const icons = [Folder, Crane, Folder, Crane, Folder];
    const Icon = icons[index % icons.length];
    return <Icon size={18} className="text-primary" />;
  };

  const handleEditClick = (project: Project) => {
    if (!isValidObjectId(project._id)) {
      toast({ title: 'Erreur', description: 'Projet non modifiable : identifiant MongoDB absent ou invalide.' });
      return;
    }
    setEditProject(project);
    setOpen(true);
  };

  const openAiForProject = async (row: Project) => {
    if (!isValidObjectId(row._id)) {
      toast({ title: 'Erreur', description: 'Projet invalide pour la génération IA.' });
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
      const msg = err instanceof Error ? err.message : 'Échec de la génération';
      setAiError(msg);
      toast({ title: 'Gemini', description: msg });
    } finally {
      setAiLoading(false);
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
      let n = 0;
      for (let i = 0; i < aiTasks.length; i++) {
        if (!aiSelected.has(i)) continue;
        const t = aiTasks[i];
        await createTask({
          title: t.title,
          description: t.description || undefined,
          projectId: aiProject._id,
          duration: t.duration,
          priority: t.priority,
          status: t.status,
          progress: t.progress,
        });
        n += 1;
      }
      if (n === 0) {
        toast({ title: 'Aucune tâche', description: 'Cochez au moins une proposition.' });
        return;
      }
      toast({ title: 'Tâches créées', description: `${n} tâche(s) ajoutée(s) au projet.` });
      setAiOpen(false);
      setAiProject(null);
      setAiTasks([]);
      setAiSelected(new Set());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création';
      toast({ title: 'Erreur', description: msg });
    } finally {
      setAiCreating(false);
    }
  };

  const handleDeleteProject = async (_id: string) => {
    if (!isValidObjectId(_id)) {
      toast({ title: 'Erreur', description: 'Suppression impossible : identifiant MongoDB absent ou invalide.' });
      return;
    }
    try {
      await deleteProject(_id);
      toast({ title: 'Projet supprimé', description: 'Le projet a été supprimé avec succès.' });
      setProjects((prev) => prev.filter((p) => p._id !== _id));
    } catch (err: unknown) {
      console.error('[DELETE project]', err);
      const msg = err instanceof ApiError ? err.message : (err as Error)?.message ?? 'Erreur lors de la suppression';
      toast({ title: 'Erreur', description: msg });
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
            <p className="font-semibold text-foreground">{value != null ? String(value) : ''}</p>
            <p className="text-sm text-muted-foreground">{row.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'description' as const,
      label: 'Description',
    },
    {
      key: 'type' as const,
      label: 'Type',
      render: (value: string | number | undefined) =>
        value != null && value !== '' ? String(value) : '—',
    },
    {
      key: 'budget' as const,
      label: 'Budget',
      render: (value: number | string | undefined) =>
        value != null && value !== '' && !Number.isNaN(Number(value))
          ? new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            }).format(Number(value))
          : '—',
    },
    {
      key: 'location' as const,
      label: 'Lieu',
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
        <span className={getStatusColor(value)}>{value}</span>
      ),
    },
    {
      key: 'actions' as const,
      label: 'Actions',
      render: (_: any, row: Project) => (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            title="Générer des tâches (IA Gemini)"
            aria-label="Générer des tâches avec l’IA"
            onClick={() => openAiForProject(row)}
            style={{ background: '#4f46e5', border: 'none', borderRadius: 4, padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            disabled={!isValidObjectId(row._id)}
          >
            <Sparkles size={20} color="#fff" style={{ verticalAlign: 'middle' }} />
          </button>
          <button
            title="Modifier"
            aria-label="Modifier"
            onClick={() => handleEditClick(row)}
            style={{ background: '#0b4f6c', border: 'none', borderRadius: 4, padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            disabled={!isValidObjectId(row._id)}
          >
            <Pencil size={20} color="#fff" style={{ verticalAlign: 'middle' }} />
          </button>
          <button
            title="Supprimer"
            aria-label="Supprimer"
            onClick={() => handleDeleteProject(row._id)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            disabled={!isValidObjectId(row._id)}
          >
            <Trash2 size={22} color="#f28c28" style={{ verticalAlign: 'middle' }} />
          </button>
          <button
            type="button"
            title="Voir le diagramme Gantt"
            aria-label="Voir le diagramme Gantt"
            onClick={() => {
              if (!isValidObjectId(row._id)) return;
              router.push(`/projects/${row._id}/gantt`);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border bg-secondary text-xs font-medium text-foreground hover:bg-muted transition-colors"
            disabled={!isValidObjectId(row._id)}
          >
            <span aria-hidden>📊</span>
            <span className="hidden sm:inline">Gantt</span>
          </button>
        </div>
      ),
    },
  ];

  const handleUpdateProject = async (payload: Omit<Project, 'id' | '_id'>) => {
    if (!editProject || !isValidObjectId(editProject._id)) {
      toast({ title: 'Erreur', description: 'Projet non modifiable : identifiant MongoDB absent ou invalide.' });
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
      toast({ title: 'Projet modifié', description: 'Le projet a été mis à jour.' });
      setOpen(false);
      setEditProject(null);
      await fetchProjects();
    } catch (err: unknown) {
      console.error('[UPDATE project]', err);
      const msg = err instanceof ApiError ? err.message : (err as Error)?.message ?? 'Erreur lors de la modification';
      toast({ title: 'Erreur', description: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProject = async (payload: Omit<Project, 'id' | '_id'>) => {
    if (!USER_ID) {
      toast({ title: 'Erreur', description: 'Impossible de créer le projet : identifiant utilisateur manquant.' });
      return;
    }
    const finalPayload: ProjectCreatePayload = {
      ...payload,
      createdBy: USER_ID,
    };
    console.log('[CREATE] POST /projects', finalPayload);
    setSaving(true);
    try {
      await createProject(finalPayload);
      toast({ title: 'Projet créé', description: 'Le projet a été ajouté avec succès.' });
      setOpen(false);
      await fetchProjects();
    } catch (err: unknown) {
      console.error('[CREATE project]', err);
      const msg = err instanceof ApiError ? err.message : (err as Error)?.message ?? 'Erreur lors de la création';
      toast({ title: 'Erreur', description: msg });
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
            <button className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-sm"
              style={{ background: '#f28c28', color: '#fff', border: 'none' }}>
              <Plus size={18} />
              New Project
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editProject ? 'Modifier le projet' : 'Créer un projet'}</DialogTitle>
              <DialogDescription>
                {editProject
                  ? 'Modifiez les champs du projet puis validez pour enregistrer.'
                  : 'Remplissez le formulaire pour ajouter un nouveau projet au tableau de bord. Tous les champs sont obligatoires sauf "Created By".'}
              </DialogDescription>
            </DialogHeader>
            <ProjectForm
              mode={editProject ? 'edit' : 'create'}
              initialData={editProject || undefined}
              isSubmitting={saving}
              onSubmit={editProject ? handleUpdateProject : handleCreateProject}
            />
            <DialogFooter>
              <DialogClose asChild>
                <button type="button" className="mt-2 px-4 py-2 rounded" style={{ background: '#0b4f6c', color: '#fff', border: 'none' }} disabled={saving}>
                  Annuler
                </button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter size={18} className="text-muted-foreground" />
        {statusOptions.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-primary text-white shadow-sm'
                : 'bg-secondary text-foreground hover:bg-muted'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <DataTable columns={tableColumns} data={filteredProjects} title="All Projects" />

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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Tâches proposées par l’IA
            </DialogTitle>
            <DialogDescription>
              {aiProject ? (
                <>
                  Projet : <strong>{aiProject.name}</strong>
                  {aiLoading ? ' — génération en cours…' : null}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          {aiLoading && (
            <p className="text-sm text-muted-foreground py-6 text-center">Appel à Google Gemini…</p>
          )}

          {aiError && !aiLoading && (
            <p className="text-sm text-red-600 py-2">{aiError}</p>
          )}

          {!aiLoading && aiTasks.length > 0 && (
            <ul className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {aiTasks.map((t, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-lg border border-border p-3 text-left bg-muted/30"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0"
                    checked={aiSelected.has(i)}
                    onChange={() => toggleAiTask(i)}
                    aria-label={`Sélectionner : ${t.title}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{t.title}</p>
                    {t.description ? (
                      <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground mt-2">
                      {t.duration} j · {t.priority} · {t.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <button
                type="button"
                className="w-full sm:w-auto px-4 py-2 rounded-md border border-border bg-secondary text-foreground"
                disabled={aiCreating}
              >
                Fermer
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={handleCreateAiTasks}
              disabled={aiCreating || aiTasks.length === 0 || aiLoading}
              className="w-full sm:w-auto px-4 py-2 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {aiCreating ? 'Création…' : 'Créer les tâches sélectionnées'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
