'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import { FileText, Upload, Download, Trash2, Search, MoreVertical, Clock, History } from 'lucide-react';

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
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'url' | 'local'>('local');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/documents`);
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
      const response = await fetch(`${API_BASE}/documents/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
      fetchDocuments();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      let response;

      if (uploadMode === 'local') {
        response = await fetch(`${API_BASE}/documents/upload`, {
          method: 'POST',
          body: formData,
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

        response = await fetch(`${API_BASE}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Upload failed');
      }

      alert('Document uploaded successfully!');
      setShowUploadModal(false);
      setUploadMode('local');
      fetchDocuments();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    categoryFilter === 'all' || doc.category === categoryFilter
  );

  return (
    <MainLayout>
      <PageHeader
        title="Documents Management"
        description="Upload, organize, and manage project documents with version control"
      >
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 flex items-center gap-2"
        >
          <Upload size={18} />
          Upload Document
        </button>
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
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
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
          className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90"
        >
          Search
        </button>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <p className="text-center py-12">Loading documents...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredDocuments.map((doc) => (
            <div
              key={doc._id}
              onClick={() => router.push(`/documents/${doc._id}`)}
              className="bg-white rounded-xl border border-border shadow-sm hover:shadow-lg p-6 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="text-4xl">📄</div>
                  <div>
                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">{doc.fileType.toUpperCase()}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 hover:bg-secondary rounded-lg"
                >
                  <MoreVertical size={18} />
                </button>
              </div>

              <div className="mb-4 pb-4 border-b flex justify-between">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${doc.category === 'plan' ? 'bg-blue-100 text-blue-700' : doc.category === 'report' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {doc.category}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <History size={12} /> v{doc.currentVersion}
                </span>
              </div>

              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-sm flex items-center justify-center gap-1 hover:bg-primary/90"
                >
                  <Download size={14} /> Download
                </a>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    alert(`Versions for ${doc._id}`);
                  }}
                  className="px-3 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5"
                >
                  <Clock size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc._id);
                  }}
                  className="px-3 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/5"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredDocuments.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-xl border">
          <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
          <p>No documents found</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Upload New Document</h2>
            
            <div className="flex gap-2 mb-6">
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
            </div>

            <form onSubmit={handleUpload} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input name="title" required className="w-full px-4 py-2 border rounded-lg" placeholder="Document title" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea name="description" className="w-full px-4 py-2 border rounded-lg" rows={3} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Project ID *</label>
                <input name="projectId" required className="w-full px-4 py-2 border rounded-lg" placeholder="proj-2025-001" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Uploaded By *</label>
                <input name="uploadedBy" required className="w-full px-4 py-2 border rounded-lg" placeholder="user-wassim" />
              </div>

              {uploadMode === 'url' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">File URL *</label>
                    <input
                      name="fileUrl"
                      required
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="https://example.com/document.pdf"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">File Type *</label>
                    <select name="fileType" required className="w-full px-4 py-2 border rounded-lg">
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
                    <select name="category" className="w-full px-4 py-2 border rounded-lg">
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
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select name="category" className="w-full px-4 py-2 border rounded-lg">
                      <option value="other">Other</option>
                      <option value="plan">Plan</option>
                      <option value="report">Report</option>
                      <option value="contract">Contract</option>
                      <option value="invoice">Invoice</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-3 border border-border rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90"
                >
                  Upload Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}