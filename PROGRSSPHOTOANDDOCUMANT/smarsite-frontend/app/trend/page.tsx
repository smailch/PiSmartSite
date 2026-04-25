'use client';

import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import { TrendingUp, Camera, AlertCircle, ChevronDown } from 'lucide-react';
import { fetcher, getProjectsKey } from '@/lib/api';
import type { Project } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

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

// ── Tiny SVG line chart — no external lib needed ──────────────────
function SparklineChart({
  points,
  width = 600,
  height = 220,
}: {
  points: { date: string; progress: number; caption?: string; status: string }[];
  width?: number;
  height?: number;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; point: (typeof points)[0];
  } | null>(null);

  if (points.length === 0) return null;

  const padL = 48, padR = 24, padT = 16, padB = 36;
  const W = width - padL - padR;
  const H = height - padT - padB;

  const minP = 0;
  const maxP = 100;

  const toX = (i: number) => points.length === 1 ? W / 2 : (i / (points.length - 1)) * W;
  const toY = (v: number) => H - ((v - minP) / (maxP - minP)) * H;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.progress).toFixed(1)}`)
    .join(' ');

  const areaD =
    pathD +
    ` L ${toX(points.length - 1).toFixed(1)} ${H} L ${toX(0).toFixed(1)} ${H} Z`;

  const gridLines = [0, 25, 50, 75, 100];

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ minWidth: '320px' }}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g transform={`translate(${padL},${padT})`}>
          {/* Grid lines */}
          {gridLines.map((g) => (
            <g key={g}>
              <line
                x1={0} y1={toY(g)} x2={W} y2={toY(g)}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={g === 0 || g === 100 ? 1 : 0.5}
                strokeDasharray={g === 0 || g === 100 ? undefined : '4 4'}
              />
              <text
                x={-8} y={toY(g) + 4}
                textAnchor="end"
                fontSize={10}
                fill="rgba(148,163,184,0.7)"
              >
                {g}%
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path d={areaD} fill="url(#areaGrad)" />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#glow)"
          />

          {/* Dots + hover zones */}
          {points.map((p, i) => {
            const cx = toX(i);
            const cy = toY(p.progress);
            const statusColor =
              p.status === 'approved'
                ? '#34d399'
                : p.status === 'rejected'
                ? '#f87171'
                : '#fbbf24';
            return (
              <g key={i}>
                {/* Invisible hover target */}
                <rect
                  x={cx - 18}
                  y={0}
                  width={36}
                  height={H}
                  fill="transparent"
                  onMouseEnter={() =>
                    setTooltip({ x: cx + padL, y: cy + padT, point: p })
                  }
                />
                <circle cx={cx} cy={cy} r={5} fill="hsl(var(--primary))" />
                <circle
                  cx={cx} cy={cy} r={3}
                  fill={statusColor}
                  stroke="rgba(0,0,0,0.4)"
                  strokeWidth={1}
                />
              </g>
            );
          })}

          {/* X-axis date labels */}
          {points.map((p, i) => {
            const show = points.length <= 6 || i % Math.ceil(points.length / 6) === 0 || i === points.length - 1;
            if (!show) return null;
            return (
              <text
                key={i}
                x={toX(i)}
                y={H + 24}
                textAnchor="middle"
                fontSize={9}
                fill="rgba(148,163,184,0.6)"
              >
                {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-white/15 bg-slate-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm"
          style={{
            left: Math.min(tooltip.x, width - 160),
            top: Math.max(tooltip.y - 60, 4),
          }}
        >
          <p className="font-semibold text-slate-100">{tooltip.point.progress}% progress</p>
          <p className="text-slate-400">
            {new Date(tooltip.point.date).toLocaleDateString('en-US', {
              dateStyle: 'medium',
            })}
          </p>
          {tooltip.point.caption && (
            <p className="mt-1 max-w-[140px] truncate text-slate-500">{tooltip.point.caption}</p>
          )}
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
              tooltip.point.status === 'approved'
                ? 'bg-emerald-500/20 text-emerald-300'
                : tooltip.point.status === 'rejected'
                ? 'bg-red-500/20 text-red-300'
                : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {tooltip.point.status}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ProgressTrendPage() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved'>('approved');

  const { data: projectsList = [] } = useSWR<Project[]>(getProjectsKey(), fetcher);

  const projectLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projectsList) m.set(p._id, p.name?.trim() ? p.name : p._id);
    return m;
  }, [projectsList]);

  function resolveProjectLabel(id: string) {
    return projectLabelById.get(id) ?? `Projet ${id.slice(0, 8)}…`;
  }

  useEffect(() => {
    fetch(`${API_BASE}/progress-photos`)
      .then((r) => r.json())
      .then((data) => setPhotos(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Photos that have an estimatedProgress value
  const withProgress = photos.filter((p) => p.estimatedProgress != null);

  // Unique project IDs that actually have photos with progress
  const projectIdsWithData = useMemo(
    () => ['all', ...new Set(withProgress.map((p) => p.projectId))],
    [withProgress],
  );

  // Build chart data per project
  const chartDataByProject = useMemo(() => {
    const map = new Map<
      string,
      { date: string; progress: number; caption?: string; status: string }[]
    >();

    for (const photo of withProgress) {
      if (statusFilter === 'approved' && photo.validationStatus !== 'approved') continue;
      const arr = map.get(photo.projectId) ?? [];
      arr.push({
        date: photo.takenAt,
        progress: photo.estimatedProgress!,
        caption: photo.caption,
        status: photo.validationStatus,
      });
      map.set(photo.projectId, arr);
    }

    // Sort each project's points by date
    for (const [key, arr] of map) {
      map.set(
        key,
        arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      );
    }
    return map;
  }, [withProgress, statusFilter]);

  const projectsToShow =
    selectedProject === 'all'
      ? [...chartDataByProject.keys()]
      : chartDataByProject.has(selectedProject)
      ? [selectedProject]
      : [];

  // Summary stats
  const totalPhotosWithProgress = withProgress.length;
  const approvedCount = withProgress.filter((p) => p.validationStatus === 'approved').length;
  const avgProgress =
    approvedCount > 0
      ? Math.round(
          withProgress
            .filter((p) => p.validationStatus === 'approved')
            .reduce((s, p) => s + p.estimatedProgress!, 0) / approvedCount,
        )
      : 0;

  return (
    <MainLayout>
      <PageHeader
        title="Progress Trend"
        description="AI-estimated construction progress over time per project"
      >
        {/* Status filter toggle */}
        <div className="flex rounded-lg border border-white/10 bg-slate-900/50 p-1">
          {(['approved', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                statusFilter === s
                  ? 'bg-primary text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s === 'approved' ? '✅ Approved only' : '📋 All photos'}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-card/80 p-5 shadow-lg shadow-black/20 backdrop-blur-sm">
          <p className="text-sm text-slate-400">Photos with AI data</p>
          <p className="text-3xl font-bold tabular-nums text-slate-50">{totalPhotosWithProgress}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/80 p-5 shadow-lg shadow-black/20 backdrop-blur-sm">
          <p className="text-sm text-slate-400">Approved photos</p>
          <p className="text-3xl font-bold tabular-nums text-emerald-300">{approvedCount}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/80 p-5 shadow-lg shadow-black/20 backdrop-blur-sm">
          <p className="text-sm text-slate-400">Avg progress (approved)</p>
          <p className="text-3xl font-bold tabular-nums text-primary">{avgProgress}%</p>
        </div>
      </div>

      {/* Project filter */}
      <div className="mb-6">
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-sm text-slate-100 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
        >
          {projectIdsWithData.map((id) => (
            <option key={id} value={id}>
              {id === 'all' ? 'All Projects' : resolveProjectLabel(id)}
            </option>
          ))}
        </select>
      </div>

      {/* Charts */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-white/10 bg-card/60 py-16 backdrop-blur-sm">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-slate-400">Loading photos…</p>
        </div>
      ) : projectsToShow.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-card/60 py-16 text-center backdrop-blur-sm">
          <TrendingUp size={56} className="mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400">No AI progress data available yet.</p>
          <p className="mt-1 text-xs text-slate-600">
            Upload photos via file upload — AI estimates progress automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {projectsToShow.map((projectId) => {
            const points = chartDataByProject.get(projectId) ?? [];
            if (points.length === 0) return null;
            const latest = points[points.length - 1].progress;
            const first = points[0].progress;
            const delta = latest - first;

            return (
              <div
                key={projectId}
                className="overflow-hidden rounded-xl border border-white/10 bg-card/80 shadow-lg shadow-black/25 backdrop-blur-sm"
              >
                {/* Card header */}
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                  <div>
                    <h3 className="font-semibold text-slate-100">{resolveProjectLabel(projectId)}</h3>
                    <p className="text-xs text-slate-500">{points.length} data point{points.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Delta badge */}
                    {points.length > 1 && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          delta >= 0
                            ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                            : 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30'
                        }`}
                      >
                        {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% since start
                      </span>
                    )}
                    {/* Latest % */}
                    <div className="text-right">
                      <p className="text-2xl font-bold tabular-nums text-primary">{latest}%</p>
                      <p className="text-xs text-slate-500">latest</p>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="px-6 pt-4">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700"
                      style={{ width: `${latest}%` }}
                    />
                  </div>
                </div>

                {/* Chart */}
                <div className="px-4 pb-4 pt-2">
                  <SparklineChart points={points} />
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 border-t border-white/[0.06] px-6 py-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Approved</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Pending</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-red-400" /> Rejected</span>
                  <span className="ml-auto">Hover dots for details</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MainLayout>
  );
}
