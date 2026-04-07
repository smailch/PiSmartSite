'use client';

import React from "react"

import AccessibilityFocusFollow from '@/components/AccessibilityFocusFollow';

import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-transparent">
      <AccessibilityFocusFollow />
      <a
        href="#main-content"
        className="fixed left-4 top-1 z-[9999] -translate-y-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Skip to main content
      </a>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:ml-0 overflow-hidden">
        {/* Topbar */}
        <Topbar />

        {/* Page Content — scroll page (pas de zone de scroll interne imposée par le layout) */}
        <main
          id="main-content"
          className="min-h-0 min-w-0 flex-1 overflow-auto scroll-pt-4"
          tabIndex={-1}
          aria-label="Page content"
        >
          <div className="min-w-0 p-6 md:p-10 lg:p-12">{children}</div>
        </main>
      </div>
    </div>
  );
}
