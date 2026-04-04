'use client';

import React from "react"

import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:ml-0 overflow-hidden">
        {/* Topbar */}
        <Topbar />

        {/* Page Content — scroll page (pas de zone de scroll interne imposée par le layout) */}
        <main className="min-h-0 min-w-0 flex-1 overflow-auto">
          <div className="min-w-0 p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
