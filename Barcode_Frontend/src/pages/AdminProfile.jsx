import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Shield,
  Database,
  Barcode,
  Radio,
  CheckCircle,
  Copy,
  Terminal,
  Server,
  Lock,
  ExternalLink
} from 'lucide-react';
import { getSupabaseConfig, getSupabaseClient } from '../services/supabaseClient';

export default function AdminProfile() {
  const { url, isConfigured } = getSupabaseConfig();
  const [adminData, setAdminData] = useState({
    full_name: 'Chief Librarian',
    email: 'librarian@christuniversity.in',
    role: 'Head of Circulation & Cataloguing',
    admin_id: 1,
    created_at: new Date().toISOString()
  });

  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    async function loadAdmin() {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data } = await supabase.from('admins').select('*').limit(1).maybeSingle();
          if (data) setAdminData(data);
        } catch (e) {
          console.warn('Could not query admin record:', e);
        }
      }
    }
    loadAdmin();
  }, [isConfigured]);

  const copySqlSetup = () => {
    navigator.clipboard.writeText(`-- Setup script is available at supabase_setup.sql`);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-md ring-4 ring-blue-500/10">
            AD
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">{adminData.full_name}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                {adminData.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{adminData.email}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Admin Identifier: #{adminData.admin_id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Full Access Granted</span>
        </div>
      </div>

      {/* System Architecture & Hardware Integration Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hardware Interface Readiness */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Barcode className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">Barcode & RFID Hardware Readiness</h2>
          </div>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">USB HID Barcode Scanner</span>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded text-[10px]">Ready</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Any standard USB barcode scanner functions as keyboard input with auto-Enter submission. Works out of the box.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">RFID Smart Card Reader</span>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded text-[10px]">Ready</span>
              </div>
              <p className="text-[11px] text-slate-500">
                RFID tags scan directly into Member Identification input fields to match student UIDs (e.g. RFID-9847291).
              </p>
            </div>
          </div>
        </div>

        {/* Database & Security Specs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Database className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-800">Supabase Security & RLS</h2>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <span className="text-slate-500">Connection Endpoint:</span>
              <span className="font-mono text-slate-800 truncate max-w-[200px]" title={url || 'Not set'}>
                {url || 'Not set in .env'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <span className="text-slate-500">Row Level Security (RLS):</span>
              <span className="font-semibold text-emerald-600">Active</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <span className="text-slate-500">Stored Procedures (RPC):</span>
              <span className="font-mono text-blue-600">issue_book(), return_book()</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <span className="text-slate-500">Frontend Key Type:</span>
              <span className="font-mono text-slate-700">anon public key (safe)</span>
            </div>
          </div>
        </div>
      </div>

      {/* SQL Setup Quick Reference */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-800">Supabase SQL Setup Reference</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">supabase_setup.sql</span>
        </div>

        <p className="text-xs text-slate-500">
          All 5 required tables (<code className="font-mono font-semibold">BOOKS</code>, <code className="font-mono font-semibold">BOOK_COPIES</code>, <code className="font-mono font-semibold">MEMBERS</code>, <code className="font-mono font-semibold">ADMINS</code>, <code className="font-mono font-semibold">BORROWING_RECORDS</code>), atomic RPC routines, RLS policies, and demonstration seed data are stored in <code className="font-mono font-semibold text-blue-600">supabase_setup.sql</code> in the project root directory.
        </p>

        <div className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs overflow-x-auto space-y-1">
          <p className="text-slate-400">-- Run in Supabase SQL Editor if setting up a fresh project:</p>
          <p className="text-emerald-400">SELECT * FROM public.books;</p>
          <p className="text-emerald-400">SELECT * FROM public.book_copies WHERE book_id = 'LIB-BK-0001';</p>
          <p className="text-emerald-400">SELECT * FROM public.members WHERE member_id = 'STU001';</p>
        </div>
      </div>
    </div>
  );
}

