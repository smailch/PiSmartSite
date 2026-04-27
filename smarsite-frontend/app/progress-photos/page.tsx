'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import {
  Camera,
  CheckCircle,
  CheckCircle2,
  Circle,
  XCircle,
  X,
  Clock,
  Briefcase,
  ListTodo,
  ExternalLink,
  ZoomIn,
} from 'lucide-react';
import {
  fetcher,
  getApiBaseUrl,
  getApiRootAbsoluteUrl,
  getAuthHeaderInit,
  getProjectsKey,
  getTasksByProjectKey,
  getJobsKey,
} from '@/lib/api';
import Image from 'next/image';
import { postFormDataWithUploadProgress } from '@/lib/uploadWithProgress';
import type { BackendTask, Job, Project } from '@/lib/types';
import { useJobProgress } from '@/hooks/useJobProgress';
import { resolveProgressPhotoUrl } from '@/lib/jobProgressApi';

function galleryPhotoSrc(photoUrl: string): string {
  if (!photoUrl) return '';
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
  const base = getApiRootAbsoluteUrl();
  if (!base) return photoUrl;
  return `${base}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
}

interface ProgressPhoto {
  _id: string;
  projectId: string;
  uploadedBy: string;
  photoUrl: string;
  caption?: string;
  takenAt: string;
  validationStatus: 'pending' | 'approved' | 'rejected';
  validatedBy?: string;
  validationNote?: string;
  estimatedProgress?: number;
  createdAt: string;
}

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/35',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    color: 'bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/35',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-500/20 text-red-100 ring-1 ring-red-400/35',
    icon: XCircle,
  },
};

export default function ProgressPhotosPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'url' | 'local'>('local'); // default to local
  const [activeProjectId, setActiveProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [jobId, setJobId] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  /** Bytes sent to API during local file upload (0–100). */
  const [uploadSendPercent, setUploadSendPercent] = useState(0);
  const [lightbox, setLightbox] = useState<{ src: string; label?: string } | null>(null);

  const { data: projectsList = [], isLoading: projectsLoading } = useSWR<Project[]>(
    getProjectsKey(),
    fetcher,
  );

  useEffect(() => {
    if (projectsList.length === 0) return;
    setActiveProjectId((prev) => {
      if (prev && projectsList.some((p) => p._id === prev)) return prev;
      return projectsList[0]._id;
    });
  }, [projectsList]);

  useEffect(() => {
    setTaskId('');
    setJobId('');
  }, [activeProjectId]);

  useEffect(() => {
    setJobId('');
  }, [taskId]);

  const { data: tasks = [], isLoading: tasksLoading } = useSWR<BackendTask[]>(
    activeProjectId ? getTasksByProjectKey(activeProjectId) : null,
    fetcher,
  );

  const { data: jobs = [], isLoading: jobsLoading } = useSWR<Job[]>(getJobsKey(), fetcher);

  const jobsForTask = useMemo(
    () =>
      jobs.filter(
        (j) => String(j.taskId) === String(taskId),
      ),
    [jobs, taskId],
  );

  const selectedJob = useMemo(
    () => jobs.find((j) => j._id === jobId),
    [jobs, jobId],
  );

  const {
    steps,
    percentage,
    loading: progressLoading,
    error: progressError,
  } = useJobProgress(jobId || undefined);

  const projectLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projectsList) {
      m.set(p._id, p.name?.trim() ? p.name : p._id);
    }
    return m;
  }, [projectsList]);

  function resolveProjectLabel(projectId: string) {
    return projectLabelById.get(projectId) ?? `Projet ${projectId.slice(0, 8)}…`;
  }

  useEffect(() => {
    fetchPhotos();
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/progress-photos`, {
        headers: { ...getAuthHeaderInit() },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setPhotos(data);
    } catch (err) {
      console.error('Error fetching photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this photo?')) return;
    try {
      await fetch(`${getApiBaseUrl()}/progress-photos/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaderInit() },
      });
      fetchPhotos();
    } catch (err) {
      console.error('Error deleting photo:', err);
      alert('Failed to delete photo');
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    setUploadSendPercent(0);
    const formData = new FormData(e.currentTarget);

    try {
      if (uploadMode === 'local') {
        const file = formData.get('file') as File;
        if (!file) { alert('Please select a file'); setUploading(false); return; }
        if (!file.type.startsWith('image/')) { alert('Please select an image file'); setUploading(false); return; }
        if (file.size > 10 * 1024 * 1024) { alert('File size must be less than 10MB'); setUploading(false); return; }

        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('projectId', formData.get('projectId') as string);
        uploadFormData.append('uploadedBy', formData.get('uploadedBy') as string);
        uploadFormData.append('caption', formData.get('caption') as string || '');
        uploadFormData.append('takenAt', formData.get('takenAt') as string);
        if (taskId) uploadFormData.append('taskId', taskId);
        if (jobId) uploadFormData.append('jobId', jobId);

        await postFormDataWithUploadProgress('/progress-photos/upload', uploadFormData, {
          onUploadProgress: (pct) => setUploadSendPercent(pct),
        });
      } else {
        const projectId = formData.get('projectId') as string;
        const uploadedBy = formData.get('uploadedBy') as string;
        const photoUrl = formData.get('photoUrl') as string;
        const takenAt = formData.get('takenAt') as string;

        if (!projectId || !uploadedBy || !photoUrl || !takenAt) {
          alert('Project ID, Uploaded By, Photo URL, and Taken At are required');
          setUploading(false);
          return;
        }

        const response = await fetch(`${getApiBaseUrl()}/progress-photos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaderInit(),
          },
          body: JSON.stringify({
            projectId,
            uploadedBy,
            photoUrl,
            caption: formData.get('caption') as string,
            takenAt,
            ...(taskId ? { taskId } : {}),
            ...(jobId ? { jobId } : {}),
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Upload failed');
        }
      }

      alert('Photo uploaded successfully!' + (uploadMode === 'local' ? ' AI is estimating progress...' : ''));
      setShowUploadModal(false);
      setUploadMode('local');
      fetchPhotos();
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      alert('Error: ' + err.message);
    } finally {
      setUploading(false);
      setUploadSendPercent(0);
    }
  };

  const filteredPhotos = useMemo(
    () =>
      activeProjectId ? photos.filter((p) => p.projectId === activeProjectId) : [],
    [photos, activeProjectId],
  );

  return (
    <MainLayout>
      <PageHeader title="Progress Photos" description="Upload and manage construction progress photos">
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground shadow-md transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Camera size={18} />
          Upload Progress Photo
        </button>
      </PageHeader>

      {/* Un seul projet : galerie + choix tâche → job */}
      <div className="mb-8 rounded-xl border border-white/10 bg-slate-900/35 p-5 shadow-lg shadow-black/20">
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-slate-500">
          Projet — filtre galerie & suivi job (tâche → job)
        </p>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <label className="mb-1.5 block text-sm font-medium text-slate-200">Projet</label>
            <select
              value={activeProjectId}
              onChange={(e) => setActiveProjectId(e.target.value)}
              disabled={projectsLoading || projectsList.length === 0}
              className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-2.5 text-sm text-slate-100 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {projectsList.length === 0 ? (
                <option value="">Aucun projet</option>
              ) : (
                projectsList.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name?.trim() ? p.name : p._id}
                  </option>
                ))
              )}
            </select>
            <p className="mt-1.5 text-[11px] text-slate-500">
              La galerie ci-dessous n’affiche que les photos de ce projet.
            </p>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-200">
              <ListTodo size={16} className="text-primary" />
              Tâche
            </label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              disabled={!activeProjectId || tasksLoading || tasks.length === 0}
              className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-2.5 text-sm text-slate-100 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
            >
              <option value="">
                {!activeProjectId
                  ? '— Choisir un projet —'
                  : tasksLoading
                    ? 'Chargement…'
                    : tasks.length === 0
                      ? 'Aucune tâche'
                      : '— Tâche —'}
              </option>
              {tasks.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-200">
              <Briefcase size={16} className="text-primary" />
              Job
            </label>
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              disabled={!taskId || jobsLoading || jobsForTask.length === 0}
              className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-4 py-2.5 text-sm text-slate-100 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
            >
              <option value="">
                {!taskId
                  ? '— Choisir une tâche —'
                  : jobsForTask.length === 0
                    ? 'Aucun job'
                    : '— Job —'}
              </option>
              {jobsForTask.map((j) => (
                <option key={j._id} value={j._id}>
                  {j.title} · {j.status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
          {jobId ? (
            <Link
              href={`/jobs/${jobId}/progress`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md transition-[filter] hover:brightness-110"
            >
              Modifier les étapes / ajouter des photos
              <ExternalLink size={16} />
            </Link>
          ) : (
            <p className="text-xs text-slate-500">
              Choisissez une tâche puis un job pour afficher le suivi photo des étapes ci-dessous.
            </p>
          )}
        </div>
      </div>

      {/* Suivi job : étapes + photos (dès que projet + tâche + job sont remplis) */}
      {jobId ? (
        progressLoading ? (
          <div
            role="status"
            className="mb-8 flex flex-col items-center justify-center gap-4 rounded-xl border border-white/10 bg-card/60 py-14"
          >
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-slate-400">Chargement du suivi du job…</p>
          </div>
        ) : progressError ? (
          <div className="mb-8 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-destructive">
            {progressError}
          </div>
        ) : (
          <div className="mb-10 space-y-6">
            <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-card/80 p-6 shadow-lg md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Progression du job — photos d’étapes
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-100">
                  {selectedJob?.title ?? 'Job'}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Statut :{' '}
                  <span className="text-slate-200">{selectedJob?.status ?? '—'}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 md:justify-end">
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Avancement</p>
                  <p className="text-3xl font-bold tabular-nums text-primary">{percentage}%</p>
                </div>
                <div className="h-3 w-full min-w-[160px] max-w-[240px] overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-semibold text-slate-200">Étapes</h3>
              <ul className="space-y-5">
                {steps.length === 0 ? (
                  <li className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-10 text-center text-slate-500">
                    Aucune étape pour ce job. Utilisez « Modifier les étapes » pour en ajouter.
                  </li>
                ) : (
                  steps.map((s, idx) => {
                    const img = resolveProgressPhotoUrl(s.photoUrl);
                    const stepTitle = s.step || `Étape ${idx + 1}`;
                    return (
                      <li
                        key={`${s.step}-${idx}`}
                        className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/90 via-slate-900/50 to-slate-950/80 p-5 shadow-lg shadow-black/20 ring-1 ring-white/[0.06] md:flex-row md:items-stretch md:gap-6 md:p-6"
                      >
                        <div className="flex min-w-0 flex-1 gap-4">
                          <div className="mt-0.5 shrink-0">
                            {s.completed ? (
                              <CheckCircle2 size={24} className="text-emerald-400" strokeWidth={2} />
                            ) : (
                              <Circle size={24} className="text-slate-500" strokeWidth={2} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-base font-semibold leading-snug text-slate-100">
                              {stepTitle}
                            </p>
                            {s.date ? (
                              <p className="text-xs text-slate-500">
                                {new Date(s.date).toLocaleString('fr-FR', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </p>
                            ) : null}
                            {!img ? (
                              <p className="pt-2 text-xs italic text-slate-600">Aucune photo pour cette étape</p>
                            ) : null}
                          </div>
                        </div>
                        {img ? (
                          <button
                            type="button"
                            onClick={() => setLightbox({ src: img, label: stepTitle })}
                            className="group/step relative mx-auto w-full max-w-lg shrink-0 overflow-hidden rounded-2xl bg-slate-950 outline-none ring-1 ring-white/15 transition hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary md:mx-0 md:w-[min(100%,440px)]"
                          >
                            <div className="relative aspect-[4/3] w-full">
                              <Image
                                src={img}
                                alt=""
                                fill
                                className="object-contain transition duration-300 group-hover/step:scale-[1.02]"
                                sizes="(max-width: 768px) 100vw, 440px"
                              />
                            </div>
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 opacity-60 transition group-hover/step:opacity-90" />
                            <span className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2 rounded-lg bg-black/55 px-3 py-2 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition group-hover/step:opacity-100 group-focus-visible/step:opacity-100">
                              <ZoomIn size={14} aria-hidden />
                              Agrandir
                            </span>
                          </button>
                        ) : null}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>
        )
      ) : null}

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-card/80 p-6 shadow-lg shadow-black/25 backdrop-blur-sm">
          <p className="text-sm text-slate-400">Total Photos</p>
          <p className="text-3xl font-bold tabular-nums text-slate-50">{filteredPhotos.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/80 p-6 shadow-lg shadow-black/25 backdrop-blur-sm">
          <p className="text-sm text-slate-400">Pending</p>
          <p className="text-3xl font-bold tabular-nums text-amber-300">
            {filteredPhotos.filter((p) => p.validationStatus === 'pending').length}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/80 p-6 shadow-lg shadow-black/25 backdrop-blur-sm">
          <p className="text-sm text-slate-400">Approved</p>
          <p className="text-3xl font-bold tabular-nums text-emerald-300">
            {filteredPhotos.filter((p) => p.validationStatus === 'approved').length}
          </p>
        </div>
      </div>

      {/* Photos Grid */}
      {loading ? (
        <div
          role="status"
          className="flex flex-col items-center justify-center gap-4 rounded-xl border border-white/10 bg-card/60 py-16 shadow-lg shadow-black/20 backdrop-blur-sm"
        >
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-slate-400">Loading photos…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPhotos.map((photo) => {
            const StatusIcon = statusConfig[photo.validationStatus].icon;
            const fullSrc = galleryPhotoSrc(photo.photoUrl);
            return (
              <div
                key={photo._id}
                onClick={() => router.push(`/progress-photos/${photo._id}`)}
                className="group/card cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-card/80 shadow-lg shadow-black/30 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-2xl hover:shadow-black/40"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
                  <Image
                    src={fullSrc}
                    alt={photo.caption || 'Progress photo'}
                    fill
                    className="object-cover transition duration-500 ease-out group-hover/card:scale-[1.04]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                  <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  <div className="absolute top-3 right-3 z-10">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur-md ${statusConfig[photo.validationStatus].color}`}
                    >
                      <StatusIcon size={12} />
                      {statusConfig[photo.validationStatus].label}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/50 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-black/70 md:opacity-0 md:group-hover/card:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightbox({
                        src: fullSrc,
                        label: photo.caption || resolveProjectLabel(photo.projectId),
                      });
                    }}
                  >
                    <ZoomIn size={14} aria-hidden />
                    Agrandir
                  </button>
                </div>

                <div className="border-t border-white/10 p-4">
                  <p className="mb-1 line-clamp-2 text-sm font-semibold text-slate-100">
                    {photo.caption || 'No caption'}
                  </p>
                  <p className="mb-3 text-xs text-slate-500">{resolveProjectLabel(photo.projectId)}</p>

                  {/* Progress Bar */}
                  {photo.estimatedProgress != null && (
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          🤖 AI Progress
                        </span>
                        <span className="text-xs font-semibold text-primary">{photo.estimatedProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${photo.estimatedProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{new Date(photo.takenAt).toLocaleDateString()}</span>
                    <span>{photo.uploadedBy}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(photo._id);
                    }}
                    className="mt-4 w-full rounded-lg border border-destructive/40 py-2 text-sm text-red-300 transition-colors hover:bg-destructive/15"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredPhotos.length === 0 && !loading && (
        <div className="rounded-xl border border-white/10 bg-card/60 py-16 text-center shadow-lg shadow-black/20 backdrop-blur-sm">
          <Camera size={64} className="mx-auto mb-4 text-slate-500 opacity-70" />
          <p className="text-xl text-slate-400">
            {activeProjectId
              ? `Aucune photo de progression pour « ${resolveProjectLabel(activeProjectId)} »`
              : 'Aucune photo de progression'}
          </p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-card/95 p-8 text-card-foreground shadow-2xl shadow-black/50 backdrop-blur-xl">
            <h3 className="mb-2 text-2xl font-semibold text-card-foreground">Upload Progress Photo</h3>
            <p className="text-sm text-muted-foreground mb-6">
              AI will automatically estimate construction progress from your photo.
            </p>

            {/* Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setUploadMode('local')}
                className={`flex-1 rounded-lg border py-2 ${
                  uploadMode === 'local'
                    ? 'border-primary bg-primary text-white'
                    : 'border-white/15 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]'
                }`}
              >
                📁 Upload File
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`flex-1 rounded-lg border py-2 ${
                  uploadMode === 'url'
                    ? 'border-primary bg-primary text-white'
                    : 'border-white/15 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]'
                }`}
              >
                📎 URL
              </button>
            </div>

            {uploadMode === 'local' && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                🤖 <span>AI estimation will run automatically on uploaded files</span>
              </div>
            )}

            {uploadMode === 'url' && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                ⚠️ <span>AI estimation only works with file uploads, not URLs</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-card-foreground" htmlFor="upload-project-id">
                  Projet *
                </label>
                <select
                  id="upload-project-id"
                  key={`upload-project-${activeProjectId}-${showUploadModal}`}
                  name="projectId"
                  required
                  disabled={projectsLoading || projectsList.length === 0}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
                  defaultValue={activeProjectId || ''}
                >
                  {!activeProjectId ? (
                    <option value="" disabled>
                      {projectsLoading
                        ? 'Chargement des projets…'
                        : projectsList.length === 0
                          ? 'Aucun projet disponible'
                          : '— Choisir un projet —'}
                    </option>
                  ) : null}
                  {projectsList.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name?.trim() ? p.name : p._id}
                    </option>
                  ))}
                </select>
                {projectsList.length === 0 && !projectsLoading ? (
                  <p className="mt-1 text-xs text-amber-200/90">Créez d’abord un projet dans Projects.</p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Uploaded By *</label>
                <input name="uploadedBy" required className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25" placeholder="Your name" defaultValue="wassim" />
              </div>

              {uploadMode === 'local' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Photo File *</label>
                  <input
                    type="file"
                    name="file"
                    required
                    accept="image/*"
                    className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Max 10MB · JPG, PNG, GIF, WEBP</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Photo URL *</label>
                  <input name="photoUrl" required className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25" placeholder="https://example.com/photo.jpg" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Caption (optional)</label>
                <textarea name="caption" className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25" rows={2} placeholder="Describe this progress photo..." />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Taken At *</label>
                <input name="takenAt" type="datetime-local" required className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25" />
              </div>

              {uploading && uploadMode === 'local' && (
                <div className="space-y-2 rounded-lg border border-white/10 bg-slate-950/40 p-3">
                  <div className="flex justify-between text-xs font-medium text-slate-300">
                    <span>Envoi du fichier</span>
                    <span className="tabular-nums text-primary">{uploadSendPercent}%</span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-valuenow={uploadSendPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                      style={{ width: `${uploadSendPercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Puis analyse IA sur le serveur (peut prendre quelques secondes).
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowUploadModal(false); setUploadMode('local'); setUploadSendPercent(0); }}
                  className="flex-1 rounded-xl border border-white/15 py-3 text-slate-200 hover:bg-white/[0.06]"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50"
                  disabled={uploading || projectsLoading || projectsList.length === 0}
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      {uploadMode === 'local' ? 'Uploading & Analyzing...' : 'Uploading...'}
                    </span>
                  ) : 'Upload Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lightbox ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/88 p-4 pt-16 backdrop-blur-md sm:pt-4"
          role="dialog"
          aria-modal="true"
          aria-label="Agrandir la photo"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Fermer"
          >
            <X size={22} />
          </button>
          <div
            className="flex max-h-[min(92vh,960px)] w-full max-w-6xl flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mx-auto h-[min(78vh,860px)] w-full max-w-full">
              <Image
                src={lightbox.src}
                alt=""
                fill
                className="rounded-xl object-contain shadow-2xl ring-1 ring-white/10"
                sizes="100vw"
              />
            </div>
            {lightbox.label ? (
              <p className="max-w-2xl text-center text-sm font-medium leading-relaxed text-white/90">
                {lightbox.label}
              </p>
            ) : null}
            <p className="text-center text-xs text-white/50">Clic en dehors de l’image ou Échap pour fermer</p>
          </div>
        </div>
      ) : null}
    </MainLayout>
  );
}