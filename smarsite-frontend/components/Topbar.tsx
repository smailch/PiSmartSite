'use client';

import { Bell, Settings, User, LogOut } from 'lucide-react';
import { useState } from 'react';

export default function Topbar() {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/50 shadow-lg shadow-black/20 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        {/* Left: Title (empty for responsiveness) */}
        <div className="hidden md:block" />

        {/* Right: Actions */}
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="relative rounded-xl p-2.5 text-slate-400 transition-all duration-300 ease-out hover:bg-white/[0.06] hover:text-slate-100 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <Bell size={20} className="text-current" aria-hidden />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-400" aria-hidden />
          </button>

          <button
            type="button"
            aria-label="Settings"
            className="rounded-xl p-2.5 text-slate-400 transition-all duration-300 ease-out hover:bg-white/[0.06] hover:text-slate-100 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <Settings size={20} className="text-current" aria-hidden />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-label="User menu"
              aria-expanded={showUserMenu}
              aria-haspopup="true"
              className="flex items-center gap-2 rounded-xl p-2 transition-all duration-300 ease-out hover:bg-white/[0.06] hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-blue-500/20 text-sm font-semibold text-blue-300">
                JD
              </div>
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-white/10 bg-card/95 py-2 shadow-xl shadow-black/40 backdrop-blur-xl">
                <div className="border-b border-white/10 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-100">John Doe</p>
                  <p className="text-xs text-slate-500">Project Manager</p>
                </div>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-300 transition-all duration-300 ease-out hover:bg-white/[0.06] focus:outline-none focus-visible:bg-white/[0.06]"
                >
                  <User size={16} aria-hidden /> My Profile
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 border-t border-white/10 px-4 py-2.5 text-left text-sm text-red-400 transition-all duration-300 ease-out hover:bg-red-500/10 focus:outline-none focus-visible:bg-red-500/10"
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
