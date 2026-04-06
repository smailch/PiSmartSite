'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import { Camera, Upload, Image as ImageIcon, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';

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
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function ProgressPhotosPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'url' | 'local'>('local'); // default to local
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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

  const projects = ['all', ...new Set(photos.map((p) => p.projectId))];

  return (
    <MainLayout>
      <PageHeader title="Progress Photos" description="Upload and manage construction progress photos">
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 flex items-center gap-2"
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
          className="px-4 py-2 rounded-lg border border-border"
        >
          {projects.map((p) => (
            <option key={p} value={p}>
              {p === 'all' ? 'All Projects' : `Project ${p}`}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">Total Photos</p>
          <p className="text-3xl font-bold">{filteredPhotos.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-3xl font-bold text-yellow-600">
            {filteredPhotos.filter((p) => p.validationStatus === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">Approved</p>
          <p className="text-3xl font-bold text-green-600">
            {filteredPhotos.filter((p) => p.validationStatus === 'approved').length}
          </p>
        </div>
      </div>

      {/* Photos Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPhotos.map((photo) => {
            const StatusIcon = statusConfig[photo.validationStatus].icon;
            return (
              <div
                key={photo._id}
                onClick={() => router.push(`/progress-photos/${photo._id}`)}
                className="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="relative aspect-video bg-secondary">
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

                <div className="p-4">
                  <p className="font-semibold text-sm mb-1 line-clamp-2">
                    {photo.caption || 'No caption'}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">Project {photo.projectId}</p>

                  {/* Progress Bar */}
                  {photo.estimatedProgress != null && (
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          🤖 AI Progress
                        </span>
                        <span className="text-xs font-semibold text-primary">{photo.estimatedProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${photo.estimatedProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{new Date(photo.takenAt).toLocaleDateString()}</span>
                    <span>{photo.uploadedBy}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(photo._id);
                    }}
                    className="mt-4 w-full py-2 text-sm text-destructive hover:bg-destructive/5 rounded-lg border border-destructive"
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
        <div className="text-center py-16 bg-white rounded-xl border">
          <Camera size={64} className="mx-auto text-muted-foreground mb-4 opacity-40" />
          <p className="text-xl text-muted-foreground">No progress photos yet</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-semibold mb-2">Upload Progress Photo</h3>
            <p className="text-sm text-muted-foreground mb-6">
              AI will automatically estimate construction progress from your photo.
            </p>

            {/* Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setUploadMode('local')}
                className={`flex-1 py-2 rounded-lg border ${
                  uploadMode === 'local'
                    ? 'bg-primary text-white border-primary'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                📁 Upload File
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`flex-1 py-2 rounded-lg border ${
                  uploadMode === 'url'
                    ? 'bg-primary text-white border-primary'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                📎 URL
              </button>
            </div>

            {uploadMode === 'local' && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 flex items-center gap-2">
                🤖 <span>AI estimation will run automatically on uploaded files</span>
              </div>
            )}

            {uploadMode === 'url' && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700 flex items-center gap-2">
                ⚠️ <span>AI estimation only works with file uploads, not URLs</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project ID *</label>
                <input name="projectId" required className="w-full px-4 py-2 border rounded-lg" placeholder="proj-2025-001" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Uploaded By *</label>
                <input name="uploadedBy" required className="w-full px-4 py-2 border rounded-lg" placeholder="Your name" defaultValue="wassim" />
              </div>

              {uploadMode === 'local' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Photo File *</label>
                  <input
                    type="file"
                    name="file"
                    required
                    accept="image/*"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Max 10MB · JPG, PNG, GIF, WEBP</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Photo URL *</label>
                  <input name="photoUrl" required className="w-full px-4 py-2 border rounded-lg" placeholder="https://example.com/photo.jpg" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Caption (optional)</label>
                <textarea name="caption" className="w-full px-4 py-2 border rounded-lg" rows={2} placeholder="Describe this progress photo..." />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Taken At *</label>
                <input name="takenAt" type="datetime-local" required className="w-full px-4 py-2 border rounded-lg" />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowUploadModal(false); setUploadMode('local'); }}
                  className="flex-1 py-3 border rounded-xl hover:bg-gray-50"
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