'use client';

import React from "react"

import MainLayout from '@/components/MainLayout';
import PageHeader from '@/components/PageHeader';
import { documents } from '@/lib/mockData';
import { FileText, Upload, Download, Trash2, FolderOpen, Search, MoreVertical } from 'lucide-react';
import { useState } from 'react';

const documentTypeIcons: { [key: string]: React.ReactNode } = {
  PDF: '📄',
  Document: '📝',
  Spreadsheet: '📊',
  Archive: '📦',
};

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const projects = ['General', ...new Set(documents.map((d) => d.project).filter((p) => p !== 'General'))];

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || doc.project === filter;
    return matchesSearch && matchesFilter;
  });

  const formatFileSize = (sizeStr: string) => {
    const value = parseFloat(sizeStr);
    const unit = sizeStr.match(/[A-Z]+/)?.[0];
    if (unit === 'MB' && value > 100) return 'Large file';
    return sizeStr;
  };

  return (
    <MainLayout>
      <PageHeader 
        title="Documents" 
        description="Manage project files, blueprints, and important documents"
      >
        <button className="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors flex items-center gap-2">
          <Upload size={18} />
          Upload Document
        </button>
      </PageHeader>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Search */}
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Project Filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Projects</option>
          {projects.map((project) => (
            <option key={project} value={project}>
              {project}
            </option>
          ))}
        </select>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredDocuments.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-xl border border-border shadow-sm hover:shadow-lg transition-all p-6"
          >
            {/* Icon and Name */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="text-4xl">{documentTypeIcons[doc.type] || '📄'}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm truncate">{doc.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{doc.type}</p>
                </div>
              </div>
              <button className="p-1 hover:bg-secondary rounded-lg transition-colors">
                <MoreVertical size={18} className="text-muted-foreground" />
              </button>
            </div>

            {/* Project Badge */}
            <div className="mb-4 pb-4 border-b border-border">
              <span className="inline-block px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {doc.project}
              </span>
            </div>

            {/* File Details */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">File Size</span>
                <span className="text-xs font-semibold text-foreground">{formatFileSize(doc.size)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Date</span>
                <span className="text-xs font-semibold text-foreground">{new Date(doc.date).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-1">
                <Download size={14} />
                Download
              </button>
              <button className="px-3 py-2 rounded-lg border border-destructive text-destructive hover:bg-destructive/5 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-border">
          <FileText size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
          <p className="text-lg text-muted-foreground">No documents found</p>
        </div>
      )}

      {/* Recent Documents List View */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">All Documents</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary border-b border-border">
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Project</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Size</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{documentTypeIcons[doc.type] || '📄'}</span>
                      {doc.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{doc.type}</td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {doc.project}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{doc.size}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(doc.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-secondary rounded-lg transition-colors text-primary">
                        <Download size={16} />
                      </button>
                      <button className="p-2 hover:bg-secondary rounded-lg transition-colors text-destructive">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
