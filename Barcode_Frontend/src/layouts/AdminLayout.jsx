import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import ConnectionModal from '../components/ConnectionModal';
import { getSupabaseConfig } from '../services/supabaseClient';
import { AlertCircle, Database } from 'lucide-react';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dbModalOpen, setDbModalOpen] = useState(false);
  const { isConfigured } = getSupabaseConfig();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Workspace Area (Shifted right for fixed sidebar on lg screens) */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        {/* Top Navbar */}
        <Navbar 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenDbModal={() => setDbModalOpen(true)}
        />

        {/* Database Unconfigured Helper Banner */}
        {!isConfigured && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Supabase credentials required:</strong> Add your project URL and anon key to <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env</code> or click to configure live.
              </span>
            </div>
            <button
              onClick={() => setDbModalOpen(true)}
              className="px-2.5 py-1 bg-amber-600 text-white font-medium rounded-md hover:bg-amber-700 transition-colors shadow-xs"
            >
              Configure Supabase
            </button>
          </div>
        )}

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Database Connection Config Modal */}
      <ConnectionModal
        isOpen={dbModalOpen}
        onClose={() => setDbModalOpen(false)}
      />
    </div>
  );
}

