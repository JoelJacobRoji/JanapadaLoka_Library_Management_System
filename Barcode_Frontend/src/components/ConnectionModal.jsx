import React, { useState } from 'react';
import { Database, Key, CheckCircle, AlertCircle, X, ExternalLink, RefreshCw, Table } from 'lucide-react';
import { getSupabaseConfig, updateSupabaseCredentials, clearSupabaseCredentials, getSupabaseClient } from '../services/supabaseClient';

export default function ConnectionModal({ isOpen, onClose }) {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url || '');
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [tableCounts, setTableCounts] = useState(null);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!url || !anonKey) {
      alert('Please provide both the Supabase URL and the Anon Public Key.');
      return;
    }
    updateSupabaseCredentials(url, anonKey);
    onClose();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setTableCounts(null);
    try {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error('Supabase client could not be initialized with current credentials.');
      }

      // Query each table to diagnose where rows are or if RLS is blocking
      const [bRes, cRes, mRes, aRes, txRes] = await Promise.all([
        client.from('books').select('*', { count: 'exact' }),
        client.from('book_copies').select('*', { count: 'exact' }),
        client.from('members').select('*', { count: 'exact' }),
        client.from('admins').select('*', { count: 'exact' }),
        client.from('borrowing_records').select('*', { count: 'exact' })
      ]);

      const errors = [];
      if (bRes.error) errors.push(`books: ${bRes.error.message}`);
      if (cRes.error) errors.push(`book_copies: ${cRes.error.message}`);
      if (mRes.error) errors.push(`members: ${mRes.error.message}`);
      if (aRes.error) errors.push(`admins: ${aRes.error.message}`);
      if (txRes.error) errors.push(`borrowing_records: ${txRes.error.message}`);

      if (errors.length > 0) {
        throw new Error(errors.join(' | '));
      }

      const counts = {
        books: bRes.count ?? (bRes.data?.length || 0),
        book_copies: cRes.count ?? (cRes.data?.length || 0),
        members: mRes.count ?? (mRes.data?.length || 0),
        admins: aRes.count ?? (aRes.data?.length || 0),
        borrowing_records: txRes.count ?? (txRes.data?.length || 0)
      };

      setTableCounts(counts);

      setTestResult({
        success: true,
        message: `Connected successfully! Found ${counts.books} books, ${counts.book_copies} copies, ${counts.members} members.`
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to query Supabase database.'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Supabase PostgreSQL Connection</h3>
              <p className="text-xs text-slate-400">Environment & Live Diagnostics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Project URL (VITE_SUPABASE_URL)
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Anon Public API Key (VITE_SUPABASE_ANON_KEY)
            </label>
            <input
              type="text"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="sb_publishable_... or eyJhbGci..."
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              required
            />
          </div>

          {testResult && (
            <div className={`p-3.5 rounded-xl text-xs space-y-2 border ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{testResult.success ? 'Connection & Tables Verified' : 'Connection/Query Error'}</p>
                  <p className="mt-0.5 text-[11px]">{testResult.message}</p>
                </div>
              </div>

              {tableCounts && (
                <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="p-1.5 bg-white rounded border border-emerald-100">
                    <span className="text-slate-400 block text-[9px] uppercase">books:</span>
                    <strong className="text-slate-800">{tableCounts.books} rows</strong>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-emerald-100">
                    <span className="text-slate-400 block text-[9px] uppercase">book_copies:</span>
                    <strong className="text-slate-800">{tableCounts.book_copies} rows</strong>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-emerald-100">
                    <span className="text-slate-400 block text-[9px] uppercase">members:</span>
                    <strong className="text-slate-800">{tableCounts.members} rows</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !url || !anonKey}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing Tables...' : 'Test Database Tables'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-500/20"
              >
                Save & Reload
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
