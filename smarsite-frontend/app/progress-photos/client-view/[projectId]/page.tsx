'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import { getApiBaseUrl, getApiRootAbsoluteUrl, getAuthHeaderInit } from '@/lib/api';
import { CheckCircle, Image as ImageIcon, Calendar, TrendingUp, ArrowLeft } from 'lucide-react';

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
  validationStatus: string;
  estimatedProgress?: number;
  validationNote?: string;
  createdAt: string;
}

export default function ClientViewPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [latestProgress, setLatestProgress] = useState<number>(0);

  useEffect(() => {
    if (projectId) {
      fetchApprovedPhotos();
      fetchLatestProgress();
    }
  }, [projectId]);

  const fetchApprovedPhotos = async () => {
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/progress-photos/project/${projectId}/approved`,
        { headers: { ...getAuthHeaderInit() } },
      );
      if (!response.ok) return;
      const data = await response.json();
      setPhotos(data);
    } catch (error) {
      console.error('Error fetching approved photos:', error);
    }
  };

  const fetchLatestProgress = async () => {
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/progress-photos/project/${projectId}/latest-progress`,
        { headers: { ...getAuthHeaderInit() } },
      );
      if (!response.ok) return;
      const data = await response.json();
      setLatestProgress(data.latestProgress || 0);
    } catch (error) {
      console.error('Error fetching latest progress:', error);
    }
  };

  return (
    <MainLayout>
      <PageHeader 
        title={`Project Progress - ${projectId}`}
        description="View approved construction progress photos and completion status"
      >
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </PageHeader>

      {/* Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Overall Progress Card */}
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm opacity-90">Overall Progress</p>
              <p className="text-4xl font-bold mt-2">{latestProgress}%</p>
            </div>
            <TrendingUp size={48} className="opacity-50" />
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${latestProgress}%` }}
            />
          </div>
          <p className="text-xs opacity-75 mt-2">Based on latest validated photos</p>
        </div>

        {/* Photos Count Card */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Approved Photos</p>
              <p className="text-4xl font-bold text-foreground mt-2">{photos.length}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Documenting project progress
              </p>
            </div>
            <div className="p-4 rounded-full bg-green-100">
              <CheckCircle size={32} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex items-start gap-3">
        <ImageIcon size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-900 font-semibold">Client View</p>
          <p className="text-sm text-blue-700 mt-1">
            All photos displayed here have been reviewed and approved by our supervisors. Photos are shown in chronological order.
          </p>
        </div>
      </div>

      {/* Photos Timeline */}
      <div className="space-y-8">
        {photos.map((photo, index) => (
          <div key={photo._id} className="flex gap-6">
            {/* Timeline Indicator */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              {index < photos.length - 1 && (
                <div className="w-0.5 bg-border flex-1 min-h-[100px]" />
              )}
            </div>

            {/* Photo Card */}
            <div className="flex-1 bg-white rounded-xl border border-border shadow-sm overflow-hidden mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Photo */}
                <div
                  className="relative aspect-video lg:aspect-auto cursor-pointer bg-secondary"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photoDisplaySrc(photo.photoUrl)}
                    alt={photo.caption || 'Progress photo'}
                    className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  {photo.estimatedProgress !== undefined && (
                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-primary text-white font-bold text-sm shadow-lg">
                      {photo.estimatedProgress}%
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {photo.caption || 'Progress Update'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar size={14} />
                        {new Date(photo.takenAt).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  {photo.validationNote && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-sm font-semibold text-green-900 mb-1">
                        Supervisor Note
                      </p>
                      <p className="text-sm text-green-700">{photo.validationNote}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {photo.estimatedProgress !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Estimated Progress</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full transition-all"
                              style={{ width: `${photo.estimatedProgress}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-primary">
                            {photo.estimatedProgress}%
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedPhoto(photo)}
                      className="w-full px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <ImageIcon size={16} />
                      View Full Image
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {photos.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-border">
          <ImageIcon size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
          <p className="text-lg text-muted-foreground">No progress photos available yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Photos will appear here once they are uploaded and approved
          </p>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-6xl w-full">
            <img
              src={photoDisplaySrc(selectedPhoto.photoUrl)}
              alt={selectedPhoto.caption || 'Progress photo'}
              className="w-full h-auto rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-4 text-center">
              <p className="text-white text-lg font-semibold">
                {selectedPhoto.caption || 'Progress Update'}
              </p>
              <p className="text-white/70 text-sm mt-1">
                {new Date(selectedPhoto.takenAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}