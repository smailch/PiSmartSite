'use client';

import { Bell, Settings, User, LogOut } from 'lucide-react';
import { useState } from 'react';

export default function Topbar() {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 md:px-8">
        {/* Left: Title (empty for responsiveness) */}
        <div className="hidden md:block" />

        {/* Right: Actions */}
        <div className="ml-auto flex items-center gap-4">
          <button
            type="button"
            aria-label="Notifications"
            className="relative rounded-lg p-2 transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Bell size={20} className="text-foreground" aria-hidden />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent" aria-hidden />
          </button>

          <button
            type="button"
            aria-label="Settings"
            className="rounded-lg p-2 transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Settings size={20} className="text-foreground" aria-hidden />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-label="User menu"
              aria-expanded={showUserMenu}
              aria-haspopup="true"
              className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                JD
              </div>
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-border py-2 z-50">
                <div className="px-4 py-2 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">John Doe</p>
                  <p className="text-xs text-muted-foreground">Project Manager</p>
                </div>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-secondary focus:outline-none focus-visible:bg-secondary"
                >
                  <User size={16} aria-hidden /> My Profile
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 border-t border-border px-4 py-2 text-left text-sm text-destructive hover:bg-secondary focus:outline-none focus-visible:bg-destructive/10"
                >
                  <LogOut size={16} aria-hidden /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
