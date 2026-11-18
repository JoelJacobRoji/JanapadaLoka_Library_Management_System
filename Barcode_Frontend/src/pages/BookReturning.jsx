import React, { useState, useRef } from 'react';
import {
  Barcode,
  Search,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Clock,
  ArrowDownLeft,
  Calendar,
  User,
  BookOpen,
  AlertTriangle
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { borrowingService } from '../services/borrowingService';

export default function BookReturning() {
  const [bookInput, setBookInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [returnSuccess, setReturnSuccess] = useState(null);
  const [returningLoading, setReturningLoading] = useState(false);

  const bookInputRef = useRef(null);

  // Search Active Borrowing Record by Book ID
  const handleFetchActiveBorrowing = async (overrideId) => {
    const idToSearch = (overrideId || bookInput).trim().toUpperCase();
    if (!idToSearch) {
      setSearchError('Please enter or scan a Book ID.');
      return;
    }

    setLoading(true);
    setSearchError('');
    setActiveRecord(null);
    setReturnSuccess(null);

    try {
      const record = await borrowingService.getActiveIssueByBookId(idToSearch);
      if (!record) {
        setSearchError(
          `No active borrowing record found for Book ID "${idToSearch}". The book is either already returned, not yet issued, or does not exist.`
        );
        return;
      }
      setActiveRecord(record);
    } catch (err) {
      console.error('Error fetching borrowing record:', err);
      setSearchError(err.message || 'Failed to query database.');
    } finally {
      setLoading(false);
    }
  };

  // Confirm Return Operation
  const handleConfirmReturn = async () => {
    if (!activeRecord) return;

    setReturningLoading(true);
    try {
      const result = await borrowingService.returnBook(activeRecord.book_id);

      setReturnSuccess({
        transaction_id: activeRecord.transaction_id,
        book_id: activeRecord.book_id,
        book_title: activeRecord.book_title,
        borrower_name: activeRecord.borrower_name,
        member_id: activeRecord.member_id,
        returned_at: new Date().toISOString()
      });

      // Clear search state
      setActiveRecord(null);
      setBookInput('');
    } catch (err) {
      console.error('Failed to complete return:', err);
      alert(`Return failed: ${err.message}`);
    } finally {
      setReturningLoading(false);
    }
  };

  const handleReset = () => {
    setBookInput('');
    setActiveRecord(null);
    setSearchError('');
    setReturnSuccess(null);
    setTimeout(() => bookInputRef.current?.focus(), 50);
  };

  // Check if overdue
  const isOverdue = activeRecord && activeRecord.due_date && new Date(activeRecord.due_date) < new Date();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
              Check-in Desk
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Circulation
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mt-1">Book Returning Module</h1>
          <p className="text-xs text-slate-500">
            Process physical returns, update circulation records, and automatically release book copies back to Available stock.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Form</span>
        </button>
      </div>

      {/* Return Success Notification */}
      {returnSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-emerald-800">
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Book Successfully Returned to Library!</h2>
              <p className="text-xs text-emerald-700">
                Transaction <span className="font-mono font-bold">#{returnSuccess.transaction_id}</span> marked as Returned.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-emerald-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Returned Book</span>
              <p className="font-bold text-slate-800 mt-0.5">{returnSuccess.book_title}</p>
              <p className="font-mono text-blue-600 text-[11px]">{returnSuccess.book_id}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Returned By</span>
              <p className="font-bold text-slate-800 mt-0.5">{returnSuccess.borrower_name}</p>
              <p className="font-mono text-slate-600 text-[11px]">{returnSuccess.member_id}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Status Updated</span>
              <p className="font-bold text-emerald-600 mt-0.5">Available for Borrowing</p>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between">
            <span className="text-[11px] text-emerald-700">
              The copy inventory record for <strong>{returnSuccess.book_id}</strong> is restored to shelves.
            </span>
            <button
              onClick={handleReset}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Process Another Return
            </button>
          </div>
        </div>
      )}

      {/* Book Search Barcode Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Scan or Enter Book ID to Return
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Barcode className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={bookInputRef}
                type="text"
                value={bookInput}
                onChange={(e) => setBookInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleFetchActiveBorrowing();
                  }
                }}
                placeholder="e.g. LIB-BK-0001 (or scan barcode)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => handleFetchActiveBorrowing()}
              disabled={loading || !bookInput.trim()}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Searching...' : 'Find Active Loan'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Tip: Scan the book's barcode or type <span className="font-mono font-semibold text-slate-600">LIB-BK-0001</span> to retrieve active borrowing transactions.
          </p>
        </div>

        {searchError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Retrieved Active Borrowing Record Card */}
      {activeRecord && (
        <div className="bg-white rounded-2xl border-2 border-emerald-500/30 shadow-md p-6 space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                Active Loan Record Found
              </span>
              <h2 className="text-base font-bold text-slate-800">
                Transaction #{activeRecord.transaction_id}
              </h2>
            </div>
            <StatusBadge status={activeRecord.transaction_status} />
          </div>

          {/* Overdue Alert if applicable */}
          {isOverdue && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-800 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Overdue Notice:</strong> This book was due on {new Date(activeRecord.due_date).toLocaleDateString()}. Please check for any library fines before completing return.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Book Copy Details */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-blue-600 font-bold uppercase text-[10px] tracking-wider">
                <BookOpen className="w-4 h-4" />
                <span>Book Information</span>
              </div>
              <p className="font-bold text-sm text-slate-800">{activeRecord.book_title}</p>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400 block font-medium">Book ID:</span>
                  <span className="font-mono font-bold text-blue-600">{activeRecord.book_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Author:</span>
                  <span className="text-slate-700">{activeRecord.author}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Category:</span>
                  <span className="text-slate-700">{activeRecord.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Current Status:</span>
                  <span className="text-amber-600 font-semibold">{activeRecord.availability_status}</span>
                </div>
              </div>
            </div>

            {/* Borrower Details */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-purple-600 font-bold uppercase text-[10px] tracking-wider">
                <User className="w-4 h-4" />
                <span>Borrower Details</span>
              </div>
              <p className="font-bold text-sm text-slate-800">{activeRecord.borrower_name}</p>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400 block font-medium">Member ID:</span>
                  <span className="font-mono font-bold text-purple-700">{activeRecord.member_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Member Type:</span>
                  <span className="text-slate-700 font-medium">{activeRecord.member_type}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block font-medium">Email:</span>
                  <span className="text-slate-700">{activeRecord.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Loan Dates */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Issue Date</span>
                <span className="font-semibold text-slate-700">
                  {activeRecord.issue_date ? new Date(activeRecord.issue_date).toLocaleDateString() : '-'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Due Date</span>
                <span className={`font-semibold ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                  {activeRecord.due_date ? new Date(activeRecord.due_date).toLocaleDateString() : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Confirm Return Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
            <p className="text-[11px] text-slate-500 text-center sm:text-left">
              Confirming will set return timestamp to now and restore book availability to <strong>Available</strong>.
            </p>

            <button
              type="button"
              onClick={handleConfirmReturn}
              disabled={returningLoading}
              className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>{returningLoading ? 'Processing Return...' : 'Confirm Book Return'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

