import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Copy,
  CheckCircle2,
  BookmarkCheck,
  Users,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { borrowingService } from '../services/borrowingService';
import { getSupabaseConfig } from '../services/supabaseClient';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalTitles: 0,
      totalCopies: 0,
      availableBooks: 0,
      currentlyIssuedBooks: 0,
      totalMembers: 0,
      activeBorrowings: 0
    },
    charts: {
      availabilityPieData: [],
      monthlyChartData: []
    },
    recentTransactions: []
  });

  const { isConfigured } = getSupabaseConfig();

  const loadData = async () => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await borrowingService.getDashboardStatistics();
      setDashboardData(data);
    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
      setError(err.message || 'Failed to retrieve real-time data from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isConfigured]);

  const { stats, charts, recentTransactions } = dashboardData;

  // Max value calculation for bar chart height
  const maxBarValue = Math.max(
    1,
    ...charts.monthlyChartData.map(d => Math.max(d.issued || 0, d.returned || 0))
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Librarian Operations Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of catalogue titles, physical book copies, member status and borrowing circulation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh Data</span>
          </button>

          <Link
            to="/issue-book"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-500/20"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Issue Book</span>
          </Link>

          <Link
            to="/return-book"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-colors"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Return Book</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to fetch database records</p>
            <p className="mt-0.5 text-rose-600">{error}</p>
            <p className="mt-1 text-[11px] text-slate-600">
              Ensure tables and stored procedures in <code className="bg-rose-100 px-1 py-0.5 rounded font-mono">supabase_setup.sql</code> have been executed in your Supabase SQL Editor.
            </p>
          </div>
        </div>
      )}

      {/* 6 Statistic Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Book Titles"
          value={stats.totalTitles}
          icon={BookOpen}
          color="navy"
          subtitle="Unique catalogue entries"
        />
        <StatCard
          title="Physical Copies"
          value={stats.totalCopies}
          icon={Copy}
          color="indigo"
          subtitle="Total barcode inventory"
        />
        <StatCard
          title="Available Books"
          value={stats.availableBooks}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Ready on shelves"
        />
        <StatCard
          title="Issued Books"
          value={stats.currentlyIssuedBooks}
          icon={BookmarkCheck}
          color="blue"
          subtitle="In circulation"
        />
        <StatCard
          title="Total Members"
          value={stats.totalMembers}
          icon={Users}
          color="purple"
          subtitle="Students & faculty"
        />
        <StatCard
          title="Active Loans"
          value={stats.activeBorrowings}
          icon={Activity}
          color="amber"
          subtitle="Current active issues"
        />
      </div>

      {/* Visualisations Section (Pure SVG Donut & Bar Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Availability Breakdown (Pure SVG Donut Chart) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Book Availability Ratio</h2>
              <p className="text-xs text-slate-500">Inventory status of physical copies</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {stats.totalCopies} Copies
            </span>
          </div>

          <div className="h-64 w-full pt-4 flex flex-col items-center justify-center">
            {stats.totalCopies > 0 ? (
              <div className="flex flex-col items-center space-y-4">
                {/* SVG Donut */}
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    {/* Background Circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      className="text-slate-100 stroke-current"
                      strokeWidth="12"
                      fill="transparent"
                    />
                    {/* Available Segment */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#10B981"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={`${(stats.availableBooks / stats.totalCopies) * 238.76} 238.76`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                    {/* Issued Segment */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#3B82F6"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={`${(stats.currentlyIssuedBooks / stats.totalCopies) * 238.76} 238.76`}
                      strokeDashoffset={`${-((stats.availableBooks / stats.totalCopies) * 238.76)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xl font-bold text-slate-800">
                      {Math.round((stats.availableBooks / stats.totalCopies) * 100)}%
                    </span>
                    <span className="block text-[10px] text-slate-400 font-semibold uppercase">
                      Available
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-600 font-medium">Available ({stats.availableBooks})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className="text-slate-600 font-medium">Issued ({stats.currentlyIssuedBooks})</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-slate-400">
                {loading ? 'Calculating metrics...' : 'No physical copies registered yet.'}
              </div>
            )}
          </div>
        </div>

        {/* Monthly Issuing Circulation (Pure SVG Bar Chart) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Circulation Activity</h2>
              <p className="text-xs text-slate-500">Books issued vs. returned per month</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600"></span> Issued
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Returned
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-6 flex items-end justify-between gap-3 px-2">
            {charts.monthlyChartData.length > 0 ? (
              charts.monthlyChartData.map((d, i) => {
                const issuedPct = Math.round(((d.issued || 0) / maxBarValue) * 100);
                const returnedPct = Math.round(((d.returned || 0) / maxBarValue) * 100);

                return (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
                    {/* Hover tooltip / count */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded mb-1">
                      {d.issued} / {d.returned}
                    </div>

                    {/* Bars pair */}
                    <div className="w-full flex items-end justify-center gap-1 h-36">
                      <div
                        style={{ height: `${Math.max(issuedPct, 6)}%` }}
                        className="w-3.5 bg-blue-600 rounded-t transition-all hover:bg-blue-700"
                        title={`Issued: ${d.issued}`}
                      />
                      <div
                        style={{ height: `${Math.max(returnedPct, 6)}%` }}
                        className="w-3.5 bg-emerald-500 rounded-t transition-all hover:bg-emerald-600"
                        title={`Returned: ${d.returned}`}
                      />
                    </div>

                    {/* X-axis label */}
                    <span className="text-[11px] font-semibold text-slate-400 mt-2">
                      {d.month.split(' ')[0]}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full text-center text-xs text-slate-400 py-20">
                {loading ? 'Compiling circulation history...' : 'No monthly transactions logged.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Borrowing Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Recent Circulation Transactions</h2>
            <p className="text-xs text-slate-500">Latest book borrowing and return activities recorded in Supabase</p>
          </div>
          <Link
            to="/history"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All Transactions</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Tx ID</th>
                <th className="py-3 px-4">Book ID</th>
                <th className="py-3 px-4">Book Title</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => (
                  <tr key={tx.transaction_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-500">
                      #{tx.transaction_id}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600">
                      {tx.book_id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate">
                      {tx.book_title}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-slate-800">{tx.member_name}</p>
                        <p className="text-[10px] font-mono text-slate-400">{tx.member_id}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {tx.issue_date ? new Date(tx.issue_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {tx.due_date ? new Date(tx.due_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={tx.transaction_status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    {loading ? 'Retrieving transactions...' : 'No transactions recorded yet.'}
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
