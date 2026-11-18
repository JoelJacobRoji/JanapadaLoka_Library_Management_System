import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  History,
  Calendar,
  RefreshCw,
  BookOpen,
  User,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { borrowingService } from '../services/borrowingService';
import { getSupabaseConfig } from '../services/supabaseClient';

export default function BorrowingHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Issued' | 'Returned' | 'Overdue'

  const { isConfigured } = getSupabaseConfig();

  const loadRecords = async () => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await borrowingService.getAllBorrowingRecords();
      setRecords(data);
    } catch (err) {
      console.error('Error fetching borrowing history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [isConfigured]);

  const now = new Date();

  // Filter records
  const filteredRecords = records.filter(row => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (row.book_id || '').toLowerCase().includes(term) ||
      (row.member_id || '').toLowerCase().includes(term) ||
      (row.book_title || '').toLowerCase().includes(term) ||
      (row.member_name || '').toLowerCase().includes(term);

    let matchesStatus = true;
    if (statusFilter === 'Issued') {
      matchesStatus = row.transaction_status === 'Issued';
    } else if (statusFilter === 'Returned') {
      matchesStatus = row.transaction_status === 'Returned';
    } else if (statusFilter === 'Overdue') {
      matchesStatus =
        row.transaction_status === 'Issued' &&
        row.due_date &&
        new Date(row.due_date) < now;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Borrowing & Circulation Archive</h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete transaction history audit trail joined across books, physical copies, and member patrons.
          </p>
        </div>

        <button
          onClick={loadRecords}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Book ID, Title, Member ID, or Name..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'Issued', label: 'Currently Issued' },
            { id: 'Returned', label: 'Returned' },
            { id: 'Overdue', label: 'Overdue Loans' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Tx ID</th>
                <th className="py-3.5 px-4">Book ID</th>
                <th className="py-3.5 px-4">Book Title</th>
                <th className="py-3.5 px-4">Borrower Name</th>
                <th className="py-3.5 px-4">Member ID</th>
                <th className="py-3.5 px-4">Issue Date</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4">Return Date</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((row) => {
                  const isRowOverdue =
                    row.transaction_status === 'Issued' &&
                    row.due_date &&
                    new Date(row.due_date) < now;

                  return (
                    <tr
                      key={row.transaction_id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isRowOverdue ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-500">
                        #{row.transaction_id}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {row.book_id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs">
                        {row.book_title}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {row.member_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-purple-700 font-medium">
                        {row.member_id}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {row.issue_date ? new Date(row.issue_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={isRowOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                          {row.due_date ? new Date(row.due_date).toLocaleDateString() : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {row.return_date ? new Date(row.return_date).toLocaleDateString() : (
                          <span className="italic text-slate-400">Not returned</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isRowOverdue ? (
                          <StatusBadge status="Overdue" />
                        ) : (
                          <StatusBadge status={row.transaction_status} />
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    {loading ? 'Fetching transaction audit trail...' : 'No circulation records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

