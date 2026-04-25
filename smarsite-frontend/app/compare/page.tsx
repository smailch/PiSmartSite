'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import { SplitSquareHorizontal, MoveHorizontal } from 'lucide-react';
import { fetcher, getApiBaseUrl, getApiRootAbsoluteUrl, getAuthHeaderInit, getProjectsKey } from '@/lib/api';
import type { Project } from '@/lib/types';

function resolveProgressPhotoSrc(photoUrl: string): string {
  if (!photoUrl) return '';
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
  const base = getApiRootAbsoluteUrl();
  if (!base) return photoUrl;
  return `${base}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
}

interface ProgressPhoto {
  _id: string;
  projectId: string;
  photoUrl: string;
  caption?: string;
  takenAt: string;
  validationStatus: 'pending' | 'approved' | 'rejected';
  estimatedProgress?: number;
  uploadedBy: string;
}

const statusColors = {
  approved: 'bg-emerald-500/20 text-emerald-200 ring-emerald-500/30',
  pending: 'bg-amber-500/20  text-amber-200  ring-amber-500/30',
  rejected: 'bg-red-500/20    text-red-200    ring-red-500/30',
};

function CompareSlider({
  beforeUrl,
  afterUrl,
}: {
  beforeUrl: string;
  afterUrl: string;
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const onMouseDown = () => {
    dragging.current = true;
  };
  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragging.current) updatePosition(e.clientX);
    },
    [updatePosition],
  );
  const onMouseUp = () => {
    dragging.current = false;
  };

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      updatePosition(e.touches[0].clientX);
    },
    [updatePosition],
  );

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [onMouseMove, onTouchMove]);

  const safeClipPct = Math.max(position, 0.5);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900 select-none"
      style={{ aspectRatio: '16/9', cursor: 'col-resize' }}
      onMouseDown={onMouseDown}
      onTouchStart={(e) => updatePosition(e.touches[0].clientX)}
    >
      <img
        src={afterUrl}
        alt="After"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        onError={(e) => {
          e.currentTarget.src =
            'https://placehold.co/800x450/1e293b/475569?text=Photo+Not+Available';
        }}
      />

      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img
          src={beforeUrl}
          alt="Before"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ width: `${10000 / safeClipPct}%`, maxWidth: 'none' }}
          draggable={false}
          onError={(e) => {
            e.currentTarget.src =
              'https://placehold.co/800x450/1e293b/475569?text=Photo+Not+Available';
          }}
        />
      </div>

      <div
        className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      />

      <div
        className="absolute top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-slate-900/80 shadow-xl backdrop-blur-sm"
        style={{ left: `${position}%` }}
      >
        <MoveHorizontal size={18} className="text-white" />
      </div>

      <span className="absolute left-3 top-3 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
        BEFORE
      </span>
      <span className="absolute right-3 top-3 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
        AFTER
      </span>
    </div>
  );
}

function PhotoPickerCard({
  photo,
  selected,
  label,
  onClick,
}: {
  photo: ProgressPhoto;
  selected: boolean;
  label: 'BEFORE' | 'AFTER';
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onClick={onClick}
      className={`group cursor-pointer overflow-hidden rounded-xl border transition-all ${
        selected
          ? label === 'BEFORE'
            ? 'border-blue-400/60 ring-2 ring-blue-400/30'
            : 'border-emerald-400/60 ring-2 ring-emerald-400/30'
          : 'border-white/10 hover:border-white/20'
      } bg-card/80 backdrop-blur-sm`}
    >
      <div className="relative aspect-video bg-slate-900/60">
        <img
          src={resolveProgressPhotoSrc(photo.photoUrl)}
          alt={photo.caption || 'photo'}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = 'https://placehold.co/400x225/1e293b/475569?text=No+Photo';
          }}
        />
        {selected && (
          <div
            className={`absolute inset-0 flex items-center justify-center text-lg font-bold text-white ${
              label === 'BEFORE' ? 'bg-blue-500/40' : 'bg-emerald-500/40'
            }`}
          >
            {label}
          </div>
        )}
        <span
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${statusColors[photo.validationStatus]}`}
        >
          {photo.validationStatus}
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-xs font-medium text-slate-200">{photo.caption || 'No caption'}</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-[10px] text-slate-500">
            {new Date(photo.takenAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
          </p>
          {photo.estimatedProgress != null && (
            <span className="text-[10px] font-semibold text-primary">{photo.estimatedProgress}%</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [picking, setPicking] = useState<'before' | 'after' | null>(null);

  const { data: projectsList = [] } = useSWR<Project[]>(getProjectsKey(), fetcher);

  const projectLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projectsList) m.set(p._id, p.name?.trim() ? p.name : p._id);
    return m;
  }, [projectsList]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(`${getApiBaseUrl()}/progress-photos`, {
          headers: { ...getAuthHeaderInit() },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as ProgressPhoto[];
        const sorted = [...data].sort(
          (a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime(),
        );
        if (!cancelled) setPhotos(sorted);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const eligibleProjects = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of photos) counts.set(p.projectId, (counts.get(p.projectId) ?? 0) + 1);
    return [...counts.entries()].filter(([, c]) => c >= 2).map(([id]) => id);
  }, [photos]);

  useEffect(() => {
    if (!selectedProject && eligibleProjects.length > 0) {
      setSelectedProject(eligibleProjects[0]);
    }
  }, [eligibleProjects, selectedProject]);

  const projectPhotos = useMemo(
    () => photos.filter((p) => p.projectId === selectedProject),
    [photos, selectedProject],
  );

  useEffect(() => {
    if (projectPhotos.length >= 2) {
      setBeforeId(projectPhotos[0]._id);
      setAfterId(projectPhotos[projectPhotos.length - 1]._id);
    } else {
      setBeforeId(null);
      setAfterId(null);
    }
    setPicking(null);
  }, [selectedProject, projectPhotos.length]);

  const beforePhoto = projectPhotos.find((p) => p._id === beforeId) ?? null;
  const afterPhoto = projectPhotos.find((p) => p._id === afterId) ?? null;

  const handlePickPhoto = (photo: ProgressPhoto) => {
    if (!picking) return;
    if (picking === 'before') {
      setBeforeId(photo._id);
      if (photo._id === afterId) setAfterId(null);
    } else {
      setAfterId(photo._id);
      if (photo._id === beforeId) setBeforeId(null);
    }
    setPicking(null);
  };

  const beforeUrl = beforePhoto ? resolveProgressPhotoSrc(beforePhoto.photoUrl) : null;
  const afterUrl = afterPhoto ? resolveProgressPhotoSrc(afterPhoto.photoUrl) : null;

  const progressDelta =
    beforePhoto?.estimatedProgress != null && afterPhoto?.estimatedProgress != null
      ? afterPhoto.estimatedProgress - beforePhoto.estimatedProgress
      : null;

  return (
    <MainLayout>
      <PageHeader
        title="Photo Comparison"
        description="Drag the slider to compare construction progress between two photos"
      >
        {eligibleProjects.length > 0 && (
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-sm text-slate-100 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
          >
            {eligibleProjects.map((id) => (
              <option key={id} value={id}>
                {projectLabelById.get(id) ?? id}
              </option>
            ))}
          </select>
        )}
      </PageHeader>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-white/10 bg-card/60 py-16 backdrop-blur-sm">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-slate-400">Loading photos…</p>
        </div>
      ) : eligibleProjects.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-card/60 py-16 text-center backdrop-blur-sm">
          <SplitSquareHorizontal size={56} className="mx-auto mb-4 text-slate-600" />
          <p className="text-slate-300">No project has 2+ photos yet.</p>
          <p className="mt-1 text-xs text-slate-500">
            Upload at least 2 photos to the same project to compare them.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {beforeUrl && afterUrl ? (
            <div>
              <CompareSlider beforeUrl={beforeUrl} afterUrl={afterUrl} />

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-blue-400/20 bg-blue-500/5 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-300">Before</p>
                  <p className="text-sm text-slate-200">{beforePhoto?.caption || 'No caption'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {beforePhoto &&
                      new Date(beforePhoto.takenAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                  </p>
                  {beforePhoto?.estimatedProgress != null && (
                    <p className="mt-2 text-lg font-bold text-primary">{beforePhoto.estimatedProgress}%</p>
                  )}
                </div>
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">After</p>
                  <p className="text-sm text-slate-200">{afterPhoto?.caption || 'No caption'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {afterPhoto &&
                      new Date(afterPhoto.takenAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                  </p>
                  {afterPhoto?.estimatedProgress != null && (
                    <p className="mt-2 text-lg font-bold text-primary">{afterPhoto.estimatedProgress}%</p>
                  )}
                </div>
              </div>

              {progressDelta !== null && (
                <div className="mt-4 flex justify-center">
                  <span
                    className={`rounded-full px-5 py-2 text-sm font-semibold ring-1 ${
                      progressDelta >= 0
                        ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                        : 'bg-red-500/15 text-red-300 ring-red-500/30'
                    }`}
                  >
                    {progressDelta >= 0 ? '▲' : '▼'} {Math.abs(progressDelta)}% progress change
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 py-12 text-slate-500">
              <SplitSquareHorizontal size={24} />
              <p>Select a Before and After photo below to compare</p>
            </div>
          )}

          <div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-semibold text-slate-300">
                Pick photos — {projectPhotos.length} photo{projectPhotos.length !== 1 ? 's' : ''} in this
                project
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPicking(picking === 'before' ? null : 'before')}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    picking === 'before'
                      ? 'border-blue-400/60 bg-blue-500/20 text-blue-200'
                      : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  {picking === 'before' ? '👆 Click a photo for BEFORE' : 'Set BEFORE'}
                </button>
                <button
                  type="button"
                  onClick={() => setPicking(picking === 'after' ? null : 'after')}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    picking === 'after'
                      ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                      : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  {picking === 'after' ? '👆 Click a photo for AFTER' : 'Set AFTER'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {projectPhotos.map((photo) => (
                <PhotoPickerCard
                  key={photo._id}
                  photo={photo}
                  selected={photo._id === beforeId || photo._id === afterId}
                  label={photo._id === beforeId ? 'BEFORE' : 'AFTER'}
                  onClick={() => {
                    if (picking) handlePickPhoto(photo);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
