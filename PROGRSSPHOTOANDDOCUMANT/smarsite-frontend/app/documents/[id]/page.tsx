'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import { FileText, Download, Upload, ArrowLeft, History, User, Calendar, AlertCircle } from 'lucide-react';

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
  createdAt: string;
  updatedAt: string;
}

interface Version {
  _id: string;
  documentId: string;
  versionNumber: number;
  fileUrl: string;
  uploadedBy: string;
  changeNote?: string;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'url' | 'local'>('url');

  useEffect(() => {
    if (!documentId) return;
    loadData();
  }, [documentId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const docRes = await fetch(`${API_BASE}/documents/${documentId}`);
      if (!docRes.ok) throw new Error(`Document: ${docRes.status}`);
      const docData = await docRes.json();
      setDocument(docData);

      const verRes = await fetch(`${API_BASE}/documents/${documentId}/versions`);
      if (!verRes.ok) throw new Error(`Versions: ${verRes.status}`);
      const verData = await verRes.json();
      setVersions(verData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVersion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const uploadedBy = formData.get('uploadedBy') as string;
    const changeNote = formData.get('changeNote') as string;

    if (!uploadedBy) {
      alert('Uploaded By is required');
      return;
    }

    try {
      let response;

      if (uploadMode === 'local') {
        const file = formData.get('file') as File;
        if (!file) {
          alert('Please select a file');
          return;
        }

        const fileFormData = new FormData();
        fileFormData.append('file', file);
        fileFormData.append('title', `${document?.title} - Version ${(document?.currentVersion || 0) + 1}`);
        fileFormData.append('projectId', document?.projectId || '');
        fileFormData.append('uploadedBy', uploadedBy);
        fileFormData.append('category', document?.category || 'other');
        if (changeNote) fileFormData.append('description', changeNote);

        const uploadResponse = await fetch(`${API_BASE}/documents/upload`, {
          method: 'POST',
          body: fileFormData,
        });

        if (!uploadResponse.ok) {
          const errData = await uploadResponse.json();
          throw new Error(errData.message || 'File upload failed');
        }

        const newDocument = await uploadResponse.json();

        response = await fetch(`${API_BASE}/documents/${documentId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileUrl: newDocument.fileUrl,
            uploadedBy,
            changeNote,
          }),
        });
      } else {
        const fileUrl = formData.get('fileUrl') as string;
        if (!fileUrl) {
          alert('File URL is required');
          return;
        }

        response = await fetch(`${API_BASE}/documents/${documentId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl, uploadedBy, changeNote }),
        });
      }

      if (!response || !response.ok) {
        const errData = await response?.json();
        throw new Error(errData?.message || 'Failed to add version');
      }

      alert('New version added successfully!');
      setShowNewVersionModal(false);
      setUploadMode('url');
      loadData();
    } catch (err: any) {
      console.error('Error adding version:', err);
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div
          role="status"
          className="flex flex-col items-center justify-center gap-4 rounded-xl border border-white/10 bg-card/60 py-16 shadow-lg shadow-black/20 backdrop-blur-sm"
        >
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-slate-400">Loading document…</p>
        </div>
      </MainLayout>
    );
  }

  if (error || !document) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 px-8 py-16 text-center">
          <AlertCircle size={56} className="mb-4 text-destructive" />
          <h2 className="mb-2 text-xl font-semibold text-slate-100">Error</h2>
          <p className="mb-6 max-w-md text-slate-400">{error || 'Document not found'}</p>
          <button
            onClick={() => router.back()}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
          >
            Go Back
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title={document.title}
        description={`${document.fileType.toUpperCase()} · Version ${document.currentVersion}`}
      >
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-card/80 px-4 py-2 text-sm font-medium text-slate-200 shadow-sm transition hover:bg-white/[0.08]"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <button
            onClick={() => setShowNewVersionModal(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md transition hover:brightness-110"
          >
            <Upload size={18} /> New Version
          </button>
        </div>
      </PageHeader>

      {/* Document Info */}
      <div className="mb-8 rounded-xl border border-white/10 bg-card/80 p-6 shadow-lg shadow-black/25 backdrop-blur-sm lg:p-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-400">Description</h3>
            <p className="text-slate-100">{document.description || 'No description provided'}</p>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-slate-400">Category</h3>
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                  document.category === 'plan'
                    ? 'bg-blue-500/15 text-blue-200 ring-blue-500/30'
                    : document.category === 'report'
                      ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30'
                      : document.category === 'contract'
                        ? 'bg-violet-500/15 text-violet-200 ring-violet-500/30'
                        : document.category === 'invoice'
                          ? 'bg-amber-500/15 text-amber-200 ring-amber-500/30'
                          : 'bg-slate-500/15 text-slate-200 ring-slate-500/30'
                }`}
              >
                {document.category}
              </span>
            </div>

            <div>
              <h3 className="mb-1 text-sm font-semibold text-slate-400">Project ID</h3>
              <p className="font-mono text-sm text-slate-100">{document.projectId}</p>
            </div>

            <div>
              <h3 className="mb-1 text-sm font-semibold text-slate-400">Uploaded by</h3>
              <div className="flex items-center gap-2 text-slate-100">
                <User size={15} className="text-slate-400" />
                {document.uploadedBy}
              </div>
            </div>

            <div>
              <h3 className="mb-1 text-sm font-semibold text-slate-400">Created at</h3>
              <div className="flex items-center gap-2 text-slate-100">
                <Calendar size={15} className="text-slate-400" />
                {new Date(document.createdAt).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <a
            href={`${API_BASE}${document.fileUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition hover:brightness-110"
          >
            <Download size={18} />
            Download Current (v{document.currentVersion})
          </a>
        </div>
      </div>

      {/* Version History */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-card/80 shadow-lg shadow-black/25 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <History size={20} className="text-primary" />
            <h3 className="text-lg font-semibold text-slate-100">Version History</h3>
          </div>
          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-slate-400">
            {versions.length} version{versions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {versions.length === 0 ? (
          <div className="py-16 text-center">
            <History size={40} className="mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400">No versions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {versions.map((v) => (
              <div
                key={v._id}
                className="flex items-start justify-between gap-4 px-6 py-5 transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/30">
                      v{v.versionNumber}
                    </div>
                    <h4 className="font-semibold text-slate-100">Version {v.versionNumber}</h4>
                  </div>

                  {v.changeNote && (
                    <p className="mb-2 ml-11 text-sm text-slate-400">{v.changeNote}</p>
                  )}

                  <div className="ml-11 flex flex-wrap gap-x-5 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <User size={12} /> {v.uploadedBy}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      {new Date(v.createdAt).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>

                <a
                  href={`${API_BASE}${v.fileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
                >
                  <Download size={14} /> Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Version Modal */}
      {showNewVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-card/95 p-8 text-card-foreground shadow-2xl shadow-black/50 backdrop-blur-xl">
            <h2 className="mb-6 text-2xl font-bold text-slate-100">Add New Version</h2>

            {/* Toggle */}
            <div className="mb-6 flex gap-2">
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
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
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                  uploadMode === 'local'
                    ? 'border-primary bg-primary text-white'
                    : 'border-white/15 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]'
                }`}
              >
                📁 Upload File
              </button>
            </div>

            <form onSubmit={handleAddVersion} className="space-y-4">
              {uploadMode === 'url' ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-200">New File URL *</label>
                  <input
                    name="fileUrl"
                    required
                    className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
                    placeholder="https://example.com/new-version.pdf"
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-200">File *</label>
                  <input
                    type="file"
                    name="file"
                    required
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
                    className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
                  />
                  <p className="mt-1 text-xs text-slate-500">Max 10MB · PDF, Word, Excel, Images, ZIP</p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">Uploaded By *</label>
                <input
                  name="uploadedBy"
                  required
                  defaultValue="wassim"
                  className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">Change Note</label>
                <textarea
                  name="changeNote"
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
                  placeholder="What changed in this version? (optional)"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowNewVersionModal(false); setUploadMode('url'); }}
                  className="flex-1 rounded-xl border border-white/15 py-3 text-sm text-slate-200 transition hover:bg-white/[0.06]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Add Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}