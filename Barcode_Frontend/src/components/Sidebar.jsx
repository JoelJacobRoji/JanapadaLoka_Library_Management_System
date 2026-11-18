import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  History,
  UserCheck,
  LogOut,
  Library,
  BookMarked
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Book Management', path: '/books', icon: BookOpen },
    { name: 'Add New Book', path: '/add-book', icon: PlusCircle },
    { name: 'Book Issuing', path: '/issue-book', icon: ArrowUpRight, badge: 'Core' },
    { name: 'Book Returning', path: '/return-book', icon: ArrowDownLeft },
    { name: 'Member Management', path: '/members', icon: Users },
    { name: 'Borrowing History', path: '/history', icon: History },
    { name: 'Admin Profile', path: '/profile', icon: UserCheck },
  ];

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of the Library Admin Session?')) {
      alert('You have been logged out.');
      navigate('/');
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 flex flex-col
        transition-transform duration-300 ease-in-out border-r border-slate-800
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand / Logo Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Library className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
              LibAdmin
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                PRO
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Library Management System</p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Main Menu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => {
                  if (window.innerWidth < 1024 && onClose) onClose();
                }}
                className={({ isActive }) => `
                  group relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'}
                `}
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                        isActive ? 'bg-white/20 text-white' : 'bg-blue-900/60 text-blue-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Database & System Notice Box */}
        <div className="p-3 mx-3 mb-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-300">Supabase Connected</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Real-time PostgreSQL database with atomic RPC operations.
          </p>
        </div>

        {/* Logout Footer Button */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/30">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:text-rose-200 hover:bg-rose-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

