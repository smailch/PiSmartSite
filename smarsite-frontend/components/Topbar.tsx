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
        <div className="flex items-center gap-4 ml-auto">
          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
            <Bell size={20} className="text-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
          </button>

          {/* Settings */}
          <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <Settings size={20} className="text-foreground" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
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
                <button className="w-full text-left px-4 py-2 hover:bg-secondary flex items-center gap-2 text-sm">
                  <User size={16} /> My Profile
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-secondary flex items-center gap-2 text-sm border-t border-border text-destructive">
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
