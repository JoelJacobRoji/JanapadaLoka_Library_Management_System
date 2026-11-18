import React, { useState } from 'react';
import {
  Library,
  Database,
  Calendar,
  RotateCcw,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import ConnectionModal from '../components/ConnectionModal';
import { getSupabaseConfig } from '../services/supabaseClient';

export default function CirculationLayout({ children }) {
  const [dbModalOpen, setDbModalOpen] = useState(false);
  const { isConfigured } = getSupabaseConfig();

  // Current formatted date
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      {/* Top Header Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand & Titles */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight leading-tight flex items-center gap-2">
                <span>Library Book Circulation System</span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Transaction Portal
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Librarian Barcode & RFID Circulation Counter
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Current Date */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 border-r border-slate-800 pr-3">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{todayFormatted}</span>
            </div>

            {/* Supabase Connection Status Pill */}
            <button
              onClick={() => setDbModalOpen(true)}
              title="Supabase Database Connection & Table Diagnostics"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isConfigured
                  ? 'bg-slate-800 text-emerald-400 border-emerald-500/30 hover:bg-slate-700'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isConfigured ? 'Supabase Live' : 'Setup Database'}
              </span>
              <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Circulation Workflow Content */}
      <main className="flex-1 py-8 px-4 sm:px-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200/80 bg-white text-center text-xs text-slate-500">
        <p>
          Library Book Circulation System • Application 2: Barcode & RFID Transaction Portal
        </p>
      </footer>

      {/* Database Connection / Diagnostics Modal */}
      <ConnectionModal
        isOpen={dbModalOpen}
        onClose={() => setDbModalOpen(false)}
      />
    </div>
  );
}

