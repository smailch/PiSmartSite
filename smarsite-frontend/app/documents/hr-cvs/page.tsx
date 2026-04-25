'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import type { Human } from '@/lib/types';
import { fetcher, getApiBaseUrl, getHumansKey } from '@/lib/api';
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Pencil,
  Search,
  UserCircle,
  Users,
} from 'lucide-react';

function cvAbsoluteUrl(cvUrl: string): string {
  if (!cvUrl) return '';
  if (cvUrl.startsWith('http')) return cvUrl;
  const base = getApiBaseUrl();
  return `${base}${cvUrl.startsWith('/') ? '' : '/'}${cvUrl}`;
}

export default function DocumentsHrCvsPage() {
  const { data: humans = [], isLoading, error } = useSWR<Human[]>(getHumansKey(), fetcher);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'with' | 'missing'>('all');

  const stats = useMemo(() => {
    const withCv = humans.filter((h) => Boolean(h.cvUrl?.trim())).length;
    return { total: humans.length, withCv, missing: humans.length - withCv };
  }, [humans]);

  const filtered = useMemo(() => {
    let list = humans;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (h) =>
          h.firstName.toLowerCase().includes(q) ||
          h.lastName.toLowerCase().includes(q) ||
          h.role.toLowerCase().includes(q) ||
          h.cin.toLowerCase().includes(q) ||
          h.phone.toLowerCase().includes(q),
      );
    }
    if (filter === 'with') list = list.filter((h) => Boolean(h.cvUrl?.trim()));
    if (filter === 'missing') list = list.filter((h) => !h.cvUrl?.trim());
    return list;
  }, [humans, search, filter]);

  return (
    <MainLayout>
      <PageHeader
        title="Human resources — CVs"
        description="All employee CV files attached from Human Resources. Upload or replace a CV from each person’s edit page."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 shadow-sm transition-colors hover:bg-white/[0.08]"
          >
            <ArrowLeft size={18} />
            Project documents
          </Link>
          <Link
            href="/humans/create"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition-[filter] hover:brightness-110"
          >
            <Users size={18} />
            Add human
          </Link>
        </div>
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
        <span>
          <span className="font-semibold text-slate-100">{stats.total}</span> people
        </span>
        <span className="text-slate-600">·</span>
        <span>
          <span className="font-semibold text-emerald-300">{stats.withCv}</span> with CV
        </span>
        <span className="text-slate-600">·</span>
        <span>
          <span className="font-semibold text-amber-300">{stats.missing}</span> missing CV
        </span>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search by name, role, CIN, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-900/50 py-2.5 pl-10 pr-4 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'with' | 'missing')}
          className="rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
        >
          <option value="all">All</option>
          <option value="with">With CV only</option>
          <option value="missing">Missing CV only</option>
        </select>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          Failed to load humans. {error instanceof Error ? error.message : ''}
        </div>
      )}

      {isLoading ? (
        <div
          role="status"
          className="flex flex-col items-center justify-center gap-4 rounded-xl border border-white/10 bg-card/60 py-16"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-slate-400">Loading CV list…</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/80 shadow-lg shadow-black/25 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/40">
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Name
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Role
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Phone
                  </th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    CV
                  </th>
                  <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center text-slate-400">
                      No people match this filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((h) => (
                    <tr
                      key={h._id}
                      className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-4 text-slate-100">
                        {h.firstName} {h.lastName}
                      </td>
                      <td className="px-5 py-4 text-slate-300">{h.role}</td>
                      <td className="px-5 py-4 text-slate-300">{h.phone}</td>
                      <td className="px-5 py-4">
                        {h.cvUrl ? (
                          <a
                            href={cvAbsoluteUrl(h.cvUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:brightness-110"
                          >
                            <FileText size={16} aria-hidden />
                            Open CV
                            <ExternalLink size={14} className="opacity-80" aria-hidden />
                          </a>
                        ) : (
                          <span className="text-sm text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/humans/${h._id}/details`}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.06]"
                          >
                            <UserCircle size={14} />
                            Profile
                          </Link>
                          <Link
                            href={`/humans/${h._id}/edit`}
                            className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                          >
                            <Pencil size={14} />
                            Edit / upload
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
