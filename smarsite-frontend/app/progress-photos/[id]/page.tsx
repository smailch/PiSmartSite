'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import { 
  ArrowLeft, 
  Camera, 
  Calendar, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Download,
  Edit,
  Save,
  X
} from 'lucide-react';
import { getApiBaseUrl, getApiRootAbsoluteUrl, getAuthHeaderInit } from '@/lib/api';

function photoDisplaySrc(photoUrl: string): string {
  if (!photoUrl) return '';
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
  const b = getApiRootAbsoluteUrl();
  if (!b) return photoUrl;
  return `${b}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
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
  updatedAt: string;
}

const statusConfig = {
  pending: {
    label: 'Pending',
    color:
      'border border-amber-500/35 bg-amber-500/15 text-amber-100 shadow-sm backdrop-blur-sm',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    color:
      'border border-emerald-500/35 bg-emerald-500/15 text-emerald-100 shadow-sm backdrop-blur-sm',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    color: 'border border-red-500/35 bg-red-500/15 text-red-100 shadow-sm backdrop-blur-sm',
    icon: XCircle,
  },
};

export default function ProgressPhotoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const photoId = params.id as string;

  const [photo, setPhoto] = useState<ProgressPhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'approved' | 'rejected'>('approved');
  const [validationNote, setValidationNote] = useState('');
  const [validating, setValidating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [editProgress, setEditProgress] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!photoId) return;
    fetchPhoto();
  }, [photoId]);

  const fetchPhoto = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/progress-photos/${photoId}`, {
        headers: { ...getAuthHeaderInit() },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setPhoto(data);
      setEditCaption(data.caption || '');
      setEditProgress(data.estimatedProgress);
    } catch (err: any) {
      console.error('Error fetching photo:', err);
      setError(err.message || 'Failed to load photo');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidating(true);
    
    try {
      const payload = {
        validationStatus,
        validationNote: validationNote || undefined,
        validatedBy: 'supervisor', // You can get this from auth context
      };

      const response = await fetch(`${getApiBaseUrl()}/progress-photos/${photoId}/validate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaderInit() },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Validation failed');
      }

      alert(`Photo ${validationStatus} successfully!`);
      setShowValidateModal(false);
      fetchPhoto(); // Refresh the photo data
    } catch (err: any) {
      console.error('Error validating photo:', err);
      alert('Error: ' + err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        caption: editCaption,
        estimatedProgress: editProgress,
      };

      const response = await fetch(`${getApiBaseUrl()}/progress-photos/${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaderInit() },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Update failed');
      }

      alert('Photo updated successfully!');
      setShowEditModal(false);
      fetchPhoto(); // Refresh the photo data
    } catch (err: any) {
      console.error('Error updating photo:', err);
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this photo? This action cannot be undone.')) return;
    
    try {
      const response = await fetch(`${getApiBaseUrl()}/progress-photos/${photoId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaderInit() },
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      alert('Photo deleted successfully!');
      router.push('/progress-photos');
    } catch (err: any) {
      console.error('Error deleting photo:', err);
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-border bg-card/80 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <p className="text-sm text-muted-foreground">Chargement de la photo…</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !photo) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 px-8 py-16 text-center">
          <AlertCircle size={56} className="mb-4 text-destructive" aria-hidden />
          <h2 className="mb-2 text-xl font-semibold text-foreground">Erreur</h2>
          <p className="mb-6 max-w-md text-muted-foreground">{error || 'Photo not found'}</p>
          <button
            type="button"
            onClick={() => router.push('/progress-photos')}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
          >
            Back to Photos
          </button>
        </div>
      </MainLayout>
    );
  }

  const StatusIcon = statusConfig[photo.validationStatus].icon;
  const StatusInfo = statusConfig[photo.validationStatus];

  return (
    <MainLayout>
      <PageHeader
        title="Progress Photo Details"
        description={`Project: ${photo.projectId}`}
      >
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
          >
            <ArrowLeft size={18} aria-hidden /> Back
          </button>
          {photo.validationStatus === 'pending' && (
            <button
              type="button"
              onClick={() => setShowValidateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
            >
              <CheckCircle size={18} aria-hidden /> Validate
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-accent/50 hover:bg-muted"
          >
            <Edit size={18} className="text-accent" aria-hidden /> Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-2 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/20"
          >
            <XCircle size={18} aria-hidden /> Delete
          </button>
        </div>
      </PageHeader>

      {/* Photo and Info Grid */}
      <div className="mb-8 grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/20">
          <div className="relative bg-muted/50">
            <img
              src={photoDisplaySrc(photo.photoUrl)}
              alt={photo.caption || 'Progress photo'}
              className="max-h-[500px] h-auto w-full object-contain"
              onError={(e) => {
                e.currentTarget.src =
                  'https://placehold.co/800x600/1e293b/94a3b8?text=Photo+Not+Available';
                e.currentTarget.className +=
                  ' opacity-80 grayscale-[0.15]';
              }}
            />
            <div className="absolute right-4 top-4">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${StatusInfo.color}`}
              >
                <StatusIcon size={16} aria-hidden />
                {StatusInfo.label}
              </span>
            </div>
          </div>

          <div className="border-t border-border p-6">
            <a
              href={photoDisplaySrc(photo.photoUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
            >
              <Download size={18} aria-hidden />
              Download Full Resolution
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/20 lg:p-8">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Camera className="h-5 w-5 text-accent" aria-hidden />
            Photo Information
          </h3>

          <div className="space-y-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Caption</label>
              <p className="text-foreground">{photo.caption || 'No caption provided'}</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Project ID</label>
              <p className="font-mono text-sm text-foreground">{photo.projectId}</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Uploaded By</label>
              <div className="flex items-center gap-2">
                <User size={16} className="text-accent" aria-hidden />
                <span className="text-foreground">{photo.uploadedBy}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Taken At</label>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-muted-foreground" aria-hidden />
                <span className="text-foreground">
                  {new Date(photo.takenAt).toLocaleString('en-US', {
                    dateStyle: 'full',
                    timeStyle: 'medium',
                  })}
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Uploaded At</label>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-muted-foreground" aria-hidden />
                <span className="text-foreground">
                  {new Date(photo.createdAt).toLocaleString('en-US', {
                    dateStyle: 'full',
                    timeStyle: 'medium',
                  })}
                </span>
              </div>
            </div>

            {photo.estimatedProgress !== undefined && (
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">
                  Estimated Progress
                </label>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: `${photo.estimatedProgress}%` }}
                    />
                  </div>
                  <span className="font-semibold tabular-nums text-accent">{photo.estimatedProgress}%</span>
                </div>
              </div>
            )}

            {photo.validationStatus !== 'pending' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Validated By</label>
                  <p className="text-foreground">{photo.validatedBy || 'N/A'}</p>
                </div>

                {photo.validationNote && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-muted-foreground">
                      Validation Note
                    </label>
                    <div className="rounded-xl border border-border bg-muted/40 p-4">
                      <p className="text-sm leading-relaxed text-foreground">{photo.validationNote}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Validate Modal */}
      {showValidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-2xl shadow-black/40">
            <h2 className="mb-6 text-2xl font-bold text-foreground">Validate Photo</h2>

            <form onSubmit={handleValidate} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Decision *</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setValidationStatus('approved')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      validationStatus === 'approved'
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100'
                        : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <CheckCircle size={18} aria-hidden />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setValidationStatus('rejected')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      validationStatus === 'rejected'
                        ? 'border-red-500/50 bg-red-500/15 text-red-100'
                        : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <XCircle size={18} aria-hidden />
                    Reject
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Validation Note (optional)
                </label>
                <textarea
                  value={validationNote}
                  onChange={(e) => setValidationNote(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
                  rows={3}
                  placeholder="Add a comment about this photo..."
                />
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowValidateModal(false)}
                  className="flex-1 rounded-xl border border-border bg-muted/40 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={validating}
                  className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
                >
                  {validating ? 'Validating...' : 'Submit Validation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-2xl shadow-black/40">
            <h2 className="mb-6 text-2xl font-bold text-foreground">Edit Photo Details</h2>

            <form onSubmit={handleUpdate} className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Caption</label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
                  rows={3}
                  placeholder="Add a caption..."
                />
              </div>
{/*
              <div>
                <label className="block text-sm font-medium mb-1">Estimated Progress (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editProgress || ''}
                  onChange={(e) => setEditProgress(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
                  placeholder="0-100"
                />
              </div> */}
              {photo.estimatedProgress !== undefined && (
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">AI Progress (read-only)</span>
                  <span className="font-semibold tabular-nums text-accent">{photo.estimatedProgress}%</span>
                </div>
              )}

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 rounded-xl border border-border bg-muted/40 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}