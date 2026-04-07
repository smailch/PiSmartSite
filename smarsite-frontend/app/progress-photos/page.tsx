'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import { Camera, CheckCircle, XCircle, Clock } from 'lucide-react';
import { fetcher, getProjectsKey } from '@/lib/api';
import type { Project } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

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
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const { data: projectsList = [], isLoading: projectsLoading } = useSWR<Project[]>(
    getProjectsKey(),
    fetcher,
  );

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

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`${API_BASE}/progress-photos`);
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
      await fetch(`${API_BASE}/progress-photos/${id}`, { method: 'DELETE' });
      fetchPhotos();
    } catch (err) {
      console.error('Error deleting photo:', err);
      alert('Failed to delete photo');
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    const formData = new FormData(e.currentTarget);

    try {
      let response;

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

        response = await fetch(`${API_BASE}/progress-photos/upload`, {
          method: 'POST',
          body: uploadFormData,
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

        response = await fetch(`${API_BASE}/progress-photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            uploadedBy,
            photoUrl,
            caption: formData.get('caption') as string,
            takenAt,
          }),
        });
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Upload failed');
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
    }
  };

  const filteredPhotos = photos.filter((p) =>
    selectedProject === 'all' || p.projectId === selectedProject
  );

  const filterProjectIds = ['all', ...new Set(photos.map((p) => p.projectId))];

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

      {/* Filter */}
      <div className="mb-8">
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-sm text-slate-100 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
        >
          {filterProjectIds.map((id) => (
            <option key={id} value={id}>
              {id === 'all' ? 'Tous les projets' : resolveProjectLabel(id)}
            </option>
          ))}
        </select>
      </div>

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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPhotos.map((photo) => {
            const StatusIcon = statusConfig[photo.validationStatus].icon;
            return (
              <div
                key={photo._id}
                onClick={() => router.push(`/progress-photos/${photo._id}`)}
                className="group cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-card/80 shadow-lg shadow-black/25 backdrop-blur-sm transition-all hover:border-white/15 hover:shadow-xl"
              >
                <div className="relative aspect-video bg-slate-900/60">
                  <img
                    src={`${API_BASE}${photo.photoUrl.startsWith('/') ? '' : '/'}${photo.photoUrl}`}
                    alt={photo.caption || 'Progress photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/600x400/eee/ccc?text=No+Photo+Available';
                      e.currentTarget.className += ' opacity-60';
                    }}
                  />
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[photo.validationStatus].color}`}>
                      <StatusIcon size={12} />
                      {statusConfig[photo.validationStatus].label}
                    </span>
                  </div>
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
          <p className="text-xl text-slate-400">No progress photos yet</p>
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
                  name="projectId"
                  required
                  disabled={projectsLoading || projectsList.length === 0}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
                  defaultValue=""
                >
                  <option value="" disabled>
                    {projectsLoading
                      ? 'Chargement des projets…'
                      : projectsList.length === 0
                        ? 'Aucun projet disponible'
                        : '— Choisir un projet —'}
                  </option>
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

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowUploadModal(false); setUploadMode('local'); }}
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
    </MainLayout>
  );
}