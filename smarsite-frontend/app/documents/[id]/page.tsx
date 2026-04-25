'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import { DocumentTypeIcon } from '@/components/DocumentTypeIcon';
import { FileText, Download, Upload, ArrowLeft, History, User, Calendar, AlertCircle } from 'lucide-react';
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
  const [versionBusy, setVersionBusy] = useState(false);
  const [versionUploadPercent, setVersionUploadPercent] = useState(0);

  useEffect(() => {
    if (!documentId) return;
    loadData();
  }, [documentId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const docRes = await fetch(`${getApiBaseUrl()}/documents/${documentId}`, {
        headers: { ...getAuthHeaderInit() },
      });
      if (!docRes.ok) throw new Error(`Document: ${docRes.status}`);
      const docData = await docRes.json();
      setDocument(docData);

      const verRes = await fetch(`${getApiBaseUrl()}/documents/${documentId}/versions`, {
        headers: { ...getAuthHeaderInit() },
      });
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

    setVersionBusy(true);
    setVersionUploadPercent(0);

    try {
      let response: Response | undefined;

      if (uploadMode === 'local') {
        // Upload with local file - using the upload endpoint first
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
        
        if (changeNote) {
          fileFormData.append('description', changeNote);
        }

        const newDocument = await postFormDataWithUploadProgress<{
          fileUrl: string;
          _id?: string;
        }>('/documents/upload', fileFormData, {
          onUploadProgress: (pct) => setVersionUploadPercent(pct),
        });
        
        // Then, add this new document as a version of the original document
        const addVersionPayload = {
          fileUrl: newDocument.fileUrl,
          uploadedBy: uploadedBy,
          changeNote: changeNote,
        };

        response = await fetch(`${getApiBaseUrl()}/documents/${documentId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaderInit() },
          body: JSON.stringify(addVersionPayload),
        });
      } else {
        // Upload with URL
        const fileUrl = formData.get('fileUrl') as string;
        if (!fileUrl) {
          alert('File URL is required');
          return;
        }

        const payload = {
          fileUrl: fileUrl,
          uploadedBy: uploadedBy,
          changeNote: changeNote,
        };

        response = await fetch(`${getApiBaseUrl()}/documents/${documentId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaderInit() },
          body: JSON.stringify(payload),
        });
      }

      if (!response || !response.ok) {
        const errData = await response?.json();
        throw new Error(errData?.message || 'Failed to add version');
      }

      alert('New version added successfully!');
      setShowNewVersionModal(false);
      setUploadMode('url'); // Reset to default
      loadData(); // refresh everything
    } catch (err: any) {
      console.error('Error adding version:', err);
      alert('Error: ' + err.message);
    } finally {
      setVersionBusy(false);
      setVersionUploadPercent(0);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !document) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle size={64} className="text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p className="text-muted-foreground mb-6">{error || 'Document not found'}</p>
          <button onClick={() => router.back()} className="px-6 py-2 bg-primary text-white rounded-lg">
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
        description={`${document.fileType.toUpperCase()} • Version ${document.currentVersion}`}
        startAdornment={
          <DocumentTypeIcon fileType={document.fileType} size={28} boxClassName="size-14" />
        }
      >
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-border hover:bg-secondary rounded-lg flex items-center gap-2"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <button
            onClick={() => setShowNewVersionModal(true)}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 flex items-center gap-2"
          >
            <Upload size={18} /> New Version
          </button>
        </div>
      </PageHeader>

      {/* Document Info */}
      <div className="bg-white rounded-xl border shadow-sm p-6 mb-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Description</h3>
            <p>{document.description || 'No description'}</p>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">Category</h3>
              <span className="inline-block px-3 py-1 mt-1 rounded-full bg-primary/10 text-primary text-sm">
                {document.category}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">Project</h3>
              <p className="mt-1">{document.projectId}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">Uploaded by</h3>
              <p className="mt-1">{document.uploadedBy}</p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <a
            href={buildUploadsFileHref(document.fileUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Download size={18} />
            Download Current (v{document.currentVersion})
          </a>
        </div>
      </div>

      {/* Version History */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <History size={20} className="text-primary" />
            <h3 className="text-lg font-semibold">Version History</h3>
          </div>
          <span className="text-sm text-muted-foreground">
            {versions.length} version{versions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {versions.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            No versions yet
          </div>
        ) : (
          <div className="divide-y">
            {versions.map((v) => (
              <div key={v._id} className="px-6 py-5 hover:bg-muted/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        v{v.versionNumber}
                      </div>
                      <h4 className="font-semibold">
                        Version {v.versionNumber}
                      </h4>
                    </div>

                    {v.changeNote && (
                      <p className="text-sm text-muted-foreground ml-11 mt-1">
                        {v.changeNote}
                      </p>
                    )}

                    <div className="ml-11 mt-2 flex flex-wrap gap-x-6 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <User size={13} /> {v.uploadedBy}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar size={13} />
                        {new Date(v.createdAt).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </div>

                  <a
                    href={buildUploadsFileHref(v.fileUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-primary/30 text-primary rounded-lg hover:bg-primary/5 flex items-center gap-2 text-sm"
                  >
                    <Download size={14} /> Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Version Modal with Dual Upload Mode */}
      {showNewVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-card/95 p-8 text-card-foreground shadow-2xl shadow-black/50 backdrop-blur-xl">
            <h2 className="mb-6 text-2xl font-bold text-card-foreground">Add New Version</h2>

            {/* Toggle between URL and Local Upload */}
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

            <form onSubmit={handleAddVersion} className="space-y-5">
              {/* Upload Mode Specific Fields */}
              {uploadMode === 'url' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">New File URL *</label>
                  <input
                    name="fileUrl"
                    required
                    className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
                    placeholder="https://example.com/new-version.pdf"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">File *</label>
                  <input
                    type="file"
                    name="file"
                    required
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
                    className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max size: 10MB. Supported: PDF, Word, Excel, Images, ZIP
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Uploaded By *</label>
                <input
                  name="uploadedBy"
                  required
                  className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
                  placeholder="Your name"
                  defaultValue="wassim"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Change Note</label>
                <textarea
                  name="changeNote"
                  className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
                  rows={3}
                  placeholder="What changed in this version? (optional)"
                />
              </div>

              {versionBusy && uploadMode === 'local' && (
                <div className="space-y-2 rounded-lg border border-white/10 bg-slate-950/40 p-3">
                  <div className="flex justify-between text-xs font-medium text-slate-300">
                    <span>Envoi du fichier</span>
                    <span className="tabular-nums text-primary">{versionUploadPercent}%</span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-valuenow={versionUploadPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                      style={{ width: `${versionUploadPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowNewVersionModal(false)}
                  className="flex-1 rounded-xl border border-white/15 py-3 text-slate-200 hover:bg-white/[0.06]"
                  disabled={versionBusy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50"
                  disabled={versionBusy}
                >
                  {versionBusy ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {uploadMode === 'local' ? `Envoi… ${versionUploadPercent}%` : 'Envoi…'}
                    </span>
                  ) : (
                    'Add Version'
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