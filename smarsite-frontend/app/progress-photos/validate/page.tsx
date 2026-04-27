'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import { getApiBaseUrl, getApiRootAbsoluteUrl, getAuthHeaderInit } from '@/lib/api';
import { CheckCircle, XCircle, Clock, Image as ImageIcon, AlertCircle } from 'lucide-react';

function getPhotoUrl(photoUrl: string) {
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
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
  estimatedProgress?: number;
  createdAt: string;
}

export default function ValidatePhotosPage() {
  const [pendingPhotos, setPendingPhotos] = useState<ProgressPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [validationNote, setValidationNote] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingPhotos();
  }, []);

  const fetchPendingPhotos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/progress-photos/pending`, {
        headers: { ...getAuthHeaderInit() },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPendingPhotos(data);
    } catch (error: any) {
      console.error('Error fetching pending photos:', error);
      setError(error.message || 'Failed to fetch pending photos');
      setPendingPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (photoId: string, status: 'approved' | 'rejected') => {
    if (!validationNote.trim() && status === 'rejected') {
      alert('Please provide a reason for rejection');
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/progress-photos/${photoId}/validate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaderInit() },
        body: JSON.stringify({
          validationStatus: status,
          validatedBy: 'supervisor-id', // En production: récupérer l'ID du user connecté
          validationNote: validationNote.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Validation failed');
      }
      
      setSelectedPhoto(null);
      setValidationNote('');
      fetchPendingPhotos();
    } catch (error: any) {
      console.error('Error validating photo:', error);
      alert(`Failed to validate photo: ${error.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <MainLayout>
      <PageHeader 
        title="Photo Validation" 
        description="Review and validate progress photos submitted by project managers"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-50 border border-yellow-200">
          <Clock size={18} className="text-yellow-600" />
          <span className="text-sm font-semibold text-yellow-700">
            {pendingPhotos.length} pending
          </span>
        </div>
      </PageHeader>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex items-start gap-3">
        <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-900 font-semibold">Supervisor Role</p>
          <p className="text-sm text-blue-700 mt-1">
            Review each photo carefully before approving or rejecting. Approved photos will be visible to clients.
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-3" />
          <p className="text-red-700 font-semibold mb-2">Failed to load pending photos</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={fetchPendingPhotos}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Pending Photos Grid */}
      {!loading && !error && (
        <>
          {pendingPhotos.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {pendingPhotos.map((photo) => (
                <div
                  key={photo._id}
                  className="bg-white rounded-xl border border-border shadow-sm overflow-hidden hover:shadow-lg transition-all"
                >
                  {/* Photo */}
                  <div className="relative aspect-video bg-secondary cursor-pointer" onClick={() => setSelectedPhoto(photo)}>
                    <Image
                      src={getPhotoUrl(photo.photoUrl)}
                      alt={photo.caption || 'Progress photo'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                      <ImageIcon size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="mb-3">
                      <p className="font-semibold text-foreground text-sm mb-1 line-clamp-2">
                        {photo.caption || 'No caption provided'}
                      </p>
                      <p className="text-xs text-muted-foreground">Project: {photo.projectId}</p>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 mb-4 pb-4 border-b border-border">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Uploaded by</span>
                        <span className="font-semibold text-foreground">{photo.uploadedBy}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Taken on</span>
                        <span className="font-semibold text-foreground">
                          {new Date(photo.takenAt).toLocaleDateString()}
                        </span>
                      </div>
                      {photo.estimatedProgress !== undefined && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold text-primary">{photo.estimatedProgress}%</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setSelectedPhoto(photo);
                          setValidationNote('');
                        }}
                        className="px-3 py-2 rounded-lg bg-green-500 text-white font-medium text-sm hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle size={14} />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPhoto(photo);
                          setValidationNote('');
                        }}
                        className="px-3 py-2 rounded-lg bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-border">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-4 opacity-50" />
              <p className="text-lg text-muted-foreground">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-2">No photos pending validation</p>
            </div>
          )}
        </>
      )}

      {/* Validation Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-card/95 text-card-foreground shadow-2xl shadow-black/50 backdrop-blur-xl">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-white/10 bg-card/95 px-6 py-4 backdrop-blur-xl">
              <h3 className="text-lg font-semibold text-card-foreground">Validate Photo</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Project: {selectedPhoto.projectId} • Uploaded by: {selectedPhoto.uploadedBy}
              </p>
            </div>

            {/* Photo */}
            <div className="p-6">
              <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg bg-muted">
                <Image
                  src={getPhotoUrl(selectedPhoto.photoUrl)}
                  alt={selectedPhoto.caption || 'Progress photo'}
                  fill
                  className="object-contain"
                  sizes="(max-width: 672px) 100vw, 672px"
                />
              </div>

              {/* Photo Details */}
              <div className="mb-6">
                <h4 className="font-semibold text-foreground mb-2">
                  {selectedPhoto.caption || 'No caption'}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Taken on:</span>
                    <span className="ml-2 font-semibold">
                      {new Date(selectedPhoto.takenAt).toLocaleDateString()}
                    </span>
                  </div>
                  {selectedPhoto.estimatedProgress !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Progress:</span>
                      <span className="ml-2 font-semibold text-primary">
                        {selectedPhoto.estimatedProgress}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Validation Note */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Validation Note {!validationNote && ' (required for rejection)'}
                </label>
                <textarea
                  value={validationNote}
                  onChange={(e) => setValidationNote(e.target.value)}
                  placeholder="Add any comments or feedback..."
                  rows={4}
                  className="w-full resize-none rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedPhoto(null);
                    setValidationNote('');
                  }}
                  disabled={isValidating}
                  className="flex-1 rounded-lg border border-white/15 px-4 py-3 font-medium text-slate-200 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleValidation(selectedPhoto._id, 'rejected')}
                  disabled={isValidating}
                  className="flex-1 px-4 py-3 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <XCircle size={18} />
                  Reject
                </button>
                <button
                  onClick={() => handleValidation(selectedPhoto._id, 'approved')}
                  disabled={isValidating}
                  className="flex-1 px-4 py-3 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle size={18} />
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}