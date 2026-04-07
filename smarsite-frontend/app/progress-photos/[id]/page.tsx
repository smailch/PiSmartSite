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
  updatedAt: string;
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock, borderColor: 'border-yellow-200' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle, borderColor: 'border-green-200' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle, borderColor: 'border-red-200' },
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
      const response = await fetch(`${API_BASE}/progress-photos/${photoId}`);
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

      const response = await fetch(`${API_BASE}/progress-photos/${photoId}/validate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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

      const response = await fetch(`${API_BASE}/progress-photos/${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`${API_BASE}/progress-photos/${photoId}`, {
        method: 'DELETE',
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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !photo) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle size={64} className="text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p className="text-muted-foreground mb-6">{error || 'Photo not found'}</p>
          <button 
            onClick={() => router.push('/progress-photos')} 
            className="px-6 py-2 bg-primary text-white rounded-lg"
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
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-border hover:bg-secondary rounded-lg flex items-center gap-2"
          >
            <ArrowLeft size={18} /> Back
          </button>
          {photo.validationStatus === 'pending' && (
            <button
              onClick={() => setShowValidateModal(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
            >
              <CheckCircle size={18} /> Validate
            </button>
          )}
          <button
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2 border border-accent text-accent rounded-lg hover:bg-accent/5 flex items-center gap-2"
          >
            <Edit size={18} /> Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/5 flex items-center gap-2"
          >
            <XCircle size={18} /> Delete
          </button>
        </div>
      </PageHeader>

      {/* Photo and Info Grid */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Photo Section */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="relative bg-secondary">
            <img
              src={`${API_BASE}${photo.photoUrl.startsWith('/') ? '' : '/'}${photo.photoUrl}`}
              alt={photo.caption || 'Progress photo'}
              className="w-full h-auto object-contain max-h-[500px]"
              onError={(e) => {
                e.currentTarget.src = 'https://placehold.co/800x600/eee/ccc?text=Photo+Not+Available';
                e.currentTarget.className += ' opacity-60';
              }}
            />
            <div className="absolute top-4 right-4">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${StatusInfo.color}`}>
                <StatusIcon size={16} />
                {StatusInfo.label}
              </span>
            </div>
          </div>
          
          <div className="p-6">
            <a
              href={`${API_BASE}${photo.photoUrl.startsWith('/') ? '' : '/'}${photo.photoUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              <Download size={18} />
              Download Full Resolution
            </a>
          </div>
        </div>

        {/* Details Section */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-6">Photo Information</h3>
          
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Caption</label>
              <p className="text-gray-900">{photo.caption || 'No caption provided'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Project ID</label>
              <p className="text-gray-900 font-mono">{photo.projectId}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Uploaded By</label>
              <div className="flex items-center gap-2">
                <User size={16} className="text-muted-foreground" />
                <span className="text-gray-900">{photo.uploadedBy}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Taken At</label>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-muted-foreground" />
                <span className="text-gray-900">
                  {new Date(photo.takenAt).toLocaleString('en-US', {
                    dateStyle: 'full',
                    timeStyle: 'medium',
                  })}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Uploaded At</label>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-muted-foreground" />
                <span className="text-gray-900">
                  {new Date(photo.createdAt).toLocaleString('en-US', {
                    dateStyle: 'full',
                    timeStyle: 'medium',
                  })}
                </span>
              </div>
            </div>

            {photo.estimatedProgress !== undefined && (
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Estimated Progress</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${photo.estimatedProgress}%` }}
                    />
                  </div>
                  <span className="font-semibold text-primary">{photo.estimatedProgress}%</span>
                </div>
              </div>
            )}

            {photo.validationStatus !== 'pending' && (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Validated By</label>
                  <p className="text-gray-900">{photo.validatedBy || 'N/A'}</p>
                </div>
                
                {photo.validationNote && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Validation Note</label>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-gray-900">{photo.validationNote}</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-card/95 p-8 text-card-foreground shadow-2xl shadow-black/50 backdrop-blur-xl">
            <h2 className="mb-6 text-2xl font-bold text-card-foreground">Validate Photo</h2>
            
            <form onSubmit={handleValidate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">Decision *</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setValidationStatus('approved')}
                    className={`flex-1 rounded-lg border px-4 py-2 ${
                      validationStatus === 'approved'
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                        : 'border-white/15 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]'
                    }`}
                  >
                    <CheckCircle size={18} className="inline mr-2" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setValidationStatus('rejected')}
                    className={`flex-1 rounded-lg border px-4 py-2 ${
                      validationStatus === 'rejected'
                        ? 'border-red-500 bg-red-500/15 text-red-200'
                        : 'border-white/15 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]'
                    }`}
                  >
                    <XCircle size={18} className="inline mr-2" />
                    Reject
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Validation Note (optional)</label>
                <textarea
                  value={validationNote}
                  onChange={(e) => setValidationNote(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
                  rows={3}
                  placeholder="Add a comment about this photo..."
                />
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowValidateModal(false)}
                  className="flex-1 rounded-xl border border-white/15 py-3 text-slate-200 hover:bg-white/[0.06]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={validating}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-card/95 p-8 text-card-foreground shadow-2xl shadow-black/50 backdrop-blur-xl">
            <h2 className="mb-6 text-2xl font-bold text-card-foreground">Edit Photo Details</h2>
            
            <form onSubmit={handleUpdate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">Caption</label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
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
  <div className="flex items-center justify-between text-xs">
    <span className="text-muted-foreground flex items-center gap-1">
      🤖 AI Progress
    </span>
    <span className="font-semibold text-primary">{photo.estimatedProgress}%</span>
  </div>
)}


              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 rounded-xl border border-white/15 py-3 text-slate-200 hover:bg-white/[0.06]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90"
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