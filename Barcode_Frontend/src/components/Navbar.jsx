import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Calendar,
  Menu,
  ShieldCheck,
  Database,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { getSupabaseConfig } from '../services/supabaseClient';

export default function Navbar({ onToggleSidebar, onOpenDbModal }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [quickSearch, setQuickSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const { isConfigured, url } = getSupabaseConfig();

  // Route title mapping
  const titleMap = {
    '/': 'Dashboard Overview',
    '/books': 'Book Management',
    '/add-book': 'Add New Book & Physical Copies',
    '/issue-book': 'Book Issuing Module',
    '/return-book': 'Book Returning Module',
    '/members': 'Member Directory & Management',
    '/history': 'Borrowing & Return History',
    '/profile': 'Admin Profile & Settings'
  };

  const currentTitle = titleMap[location.pathname] || 'Library Admin System';

  // Current formatted date
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  const handleQuickSearchSubmit = (e) => {
    e.preventDefault();
    if (!quickSearch.trim()) return;

    const term = quickSearch.trim();
    // If it looks like a book ID, navigate to Book Issuing or Book Returning
    if (term.toUpperCase().startsWith('LIB-BK')) {
      navigate(`/issue-book?query=${encodeURIComponent(term)}`);
    } else {
      navigate(`/books?search=${encodeURIComponent(term)}`);
    }
    setQuickSearch('');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
      {/* Left Section: Toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">
            {currentTitle}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {todayFormatted}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-blue-600 font-medium">Christ University Library</span>
          </div>
        </div>
      </div>

      {/* Middle/Right Section: Search, DB Pill, Notifications, Admin Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Search */}
        <form onSubmit={handleQuickSearchSubmit} className="hidden md:flex relative items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder="Search Book ID (e.g. LIB-BK-0001)..."
            className="w-64 pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </form>

        {/* Database Status Button */}
        <button
          onClick={onOpenDbModal}
          title="Supabase PostgreSQL Connection Details"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isConfigured
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {isConfigured ? 'Supabase Live' : 'Setup Supabase'}
          </span>
          <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-800">System Notifications</span>
                <span className="text-[10px] text-blue-600 font-medium">All caught up</span>
              </div>
              <div className="py-2 text-xs text-slate-600 space-y-2">
                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                  <p className="font-medium text-slate-800">System Ready for Demonstration</p>
                  <p className="text-[11px] text-slate-500">Atomic issuing & return workflows active with barcode/manual input support.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Mini */}
        <div 
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2.5 pl-2 border-l border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-500/30">
            AD
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight">Chief Librarian</p>
            <p className="text-[10px] text-slate-500">Super Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}

