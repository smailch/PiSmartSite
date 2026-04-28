'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseJwtRoleName } from '@/lib/appRoles';
import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import { FileText, Upload, Download, Trash2, Search, MoreVertical, Clock, History, Users } from 'lucide-react';
import { DocumentTypeIcon } from '@/components/DocumentTypeIcon';
import { buildUploadsFileHref, getApiBaseUrl, getAuthHeaderInit } from '@/lib/api';
import { postFormDataWithUploadProgress } from '@/lib/uploadWithProgress';

interface Document {
  _id: string;
  title: string;
  description?: string;
  projectId: string;
  uploadedBy: string;
  fileUrl: string;
  fileType: string;
  currentVersion: number;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  aiSummary?: string;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'url' | 'local'>('local');
  const [uploading, setUploading] = useState(false);
  const [uploadSendPercent, setUploadSendPercent] = useState(0);
  const [clientBlocked, setClientBlocked] = useState(false);

  useEffect(() => {
    if (parseJwtRoleName(typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null) === 'Client') {
      setClientBlocked(true);
      router.replace('/client-dashboard');
      return;
    }
    fetchDocuments();
  }, [router]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/documents`, {
        headers: { ...getAuthHeaderInit() },
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim() === '') {
      fetchDocuments();
      return;
    }
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/documents/search?q=${encodeURIComponent(searchTerm)}`,
        { headers: { ...getAuthHeaderInit() } },
      );
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await fetch(`${getApiBaseUrl()}/documents/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaderInit() },
      });
      fetchDocuments();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    setUploadSendPercent(0);
    const formData = new FormData(e.currentTarget);

    try {
      if (uploadMode === 'local') {
        await postFormDataWithUploadProgress('/documents/upload', formData, {
          onUploadProgress: (pct) => setUploadSendPercent(pct),
        });
      } else {
        const payload = {
          title: formData.get('title'),
          description: formData.get('description'),
          projectId: formData.get('projectId'),
          uploadedBy: formData.get('uploadedBy'),
          fileUrl: formData.get('fileUrl'),
          fileType: formData.get('fileType'),
          category: formData.get('category') || 'other',
        };

        const response = await fetch(`${getApiBaseUrl()}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaderInit() },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || 'Upload failed');
        }
      }

      alert('Document uploaded successfully!');
      setShowUploadModal(false);
      setUploadMode('local');
      fetchDocuments();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setUploading(false);
      setUploadSendPercent(0);
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    categoryFilter === 'all' || doc.category === categoryFilter
  );

  if (clientBlocked) {
    return (
      <MainLayout>
        <p className="text-slate-400" role="status">Redirecting…</p>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Documents Management"
        description="Upload, organize, and manage project documents with version control"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/documents/hr-cvs"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 font-medium text-slate-200 shadow-sm transition-colors hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Users size={18} />
            HR CVs
          </Link>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground shadow-md transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Upload size={18} />
            Upload Document
          </button>
        </div>
      </PageHeader>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full rounded-lg border border-white/10 bg-slate-900/50 py-2 pl-10 pr-4 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-sm text-slate-100 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
        >
          <option value="all">All Categories</option>
          <option value="plan">Plans</option>
          <option value="report">Reports</option>
          <option value="contract">Contracts</option>
          <option value="invoice">Invoices</option>
          <option value="other">Other</option>
        </select>

        <button
          onClick={handleSearch}
          className="rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground shadow-md transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Search
        </button>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div
          role="status"
          className="flex flex-col items-center justify-center gap-4 rounded-xl border border-white/10 bg-card/60 py-12 shadow-lg shadow-black/20 backdrop-blur-sm"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-slate-400">Loading documents…</p>
        </div>
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <div
              key={doc._id}
              onClick={() => router.push(`/documents/${doc._id}`)}
              className="group cursor-pointer rounded-xl border border-white/10 bg-card/80 p-6 shadow-lg shadow-black/25 backdrop-blur-sm transition-all hover:border-white/15 hover:shadow-xl"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex flex-1 items-start gap-3">
                  <DocumentTypeIcon fileType={doc.fileType} className="shadow-sm" size={24} boxClassName="size-12" />
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-100 transition-colors group-hover:text-primary">
                      {doc.title}
                    </h3>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {doc.fileType}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-slate-200"
                >
                  <MoreVertical size={18} />
                </button>
              </div>

              {doc.aiSummary && (
                <p className="mb-3 line-clamp-2 border-l-2 border-primary/30 pl-2 text-xs italic text-slate-400">
                  🤖 {doc.aiSummary}
                </p>
              )}

              <div className="mb-4 flex justify-between border-b border-white/10 pb-4">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                    doc.category === 'plan'
                      ? 'bg-blue-500/15 text-blue-200 ring-blue-500/30'
                      : doc.category === 'report'
                        ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30'
                        : 'bg-slate-500/15 text-slate-200 ring-slate-500/30'
                  }`}
                >
                  {doc.category}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <History size={12} /> v{doc.currentVersion}
                </span>
              </div>

              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <a
                  href={buildUploadsFileHref(doc.fileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-[filter] hover:brightness-110"
                >
                  <Download size={14} /> Download
                </a>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    alert(`Versions for ${doc._id}`);
                  }}
                  className="rounded-lg border border-white/15 px-3 py-2 text-primary transition-colors hover:bg-white/[0.06]"
                >
                  <Clock size={16} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc._id);
                  }}
                  className="rounded-lg border border-destructive/40 px-3 py-2 text-red-300 transition-colors hover:bg-destructive/15"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredDocuments.length === 0 && !loading && (
        <div className="rounded-xl border border-white/10 bg-card/60 py-12 text-center shadow-lg shadow-black/20 backdrop-blur-sm">
          <FileText size={48} className="mx-auto mb-4 text-slate-500 opacity-70" />
          <p className="text-slate-400">No documents found</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-card/95 p-8 text-card-foreground shadow-2xl shadow-black/50 backdrop-blur-xl">
            <h2 className="mb-6 text-2xl font-bold text-card-foreground">Upload New Document</h2>
            
            <div className="flex gap-2 mb-6">
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
            </div>

            <form onSubmit={handleUpload} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input name="title" required className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25" placeholder="Document title" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea name="description" className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25" rows={3} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Project ID *</label>
                <input name="projectId" required className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25" placeholder="proj-2025-001" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Uploaded By *</label>
                <input name="uploadedBy" required className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25" placeholder="user-wassim" />
              </div>

              {uploadMode === 'url' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">File URL *</label>
                    <input
                      name="fileUrl"
                      required
                      className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
                      placeholder="https://example.com/document.pdf"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">File Type *</label>
                    <select name="fileType" required className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25">
                      <option value="">Select type</option>
                      <option value="pdf">PDF</option>
                      <option value="docx">Word</option>
                      <option value="xlsx">Excel</option>
                      <option value="png">PNG Image</option>
                      <option value="jpg">JPG Image</option>
                      <option value="zip">ZIP Archive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select name="category" className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25">
                      <option value="other">Other</option>
                      <option value="plan">Plan</option>
                      <option value="report">Report</option>
                      <option value="contract">Contract</option>
                      <option value="invoice">Invoice</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">File *</label>
                    <input
                      type="file"
                      name="file"
                      required
                      className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select name="category" className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25">
                      <option value="other">Other</option>
                      <option value="plan">Plan</option>
                      <option value="report">Report</option>
                      <option value="contract">Contract</option>
                      <option value="invoice">Invoice</option>
                    </select>
                  </div>
                </>
              )}

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
                </div>
              )}

              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 rounded-xl border border-white/15 py-3 text-slate-200 hover:bg-white/[0.06]"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50"
                  disabled={uploading}
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {uploadMode === 'local' ? `Envoi… ${uploadSendPercent}%` : 'Envoi…'}
                    </span>
                  ) : (
                    'Upload Document'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}