import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Barcode,
  Search,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Calendar,
  ArrowRight,
  RotateCcw,
  BookOpen,
  User,
  ShieldCheck,
  Clock,
  Sparkles
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { bookService } from '../services/bookService';
import { memberService } from '../services/memberService';
import { borrowingService } from '../services/borrowingService';

export default function BookIssuing() {
  const [searchParams] = useSearchParams();

  // STEP 1 STATE: BOOK IDENTIFICATION
  const [bookInput, setBookInput] = useState('');
  const [bookLoading, setBookLoading] = useState(false);
  const [bookDetails, setBookDetails] = useState(null);
  const [bookError, setBookError] = useState('');

  // STEP 2 STATE: MEMBER IDENTIFICATION
  const [memberInput, setMemberInput] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberDetails, setMemberDetails] = useState(null);
  const [memberError, setMemberError] = useState('');

  // STEP 3 STATE: CONFIRMATION & ISSUE EXECUTION
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // 14 days lending period default
    return d.toISOString().split('T')[0];
  });
  const [issuingLoading, setIssuingLoading] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState(null);

  const bookInputRef = useRef(null);
  const memberInputRef = useRef(null);

  // Auto populate if query param exists
  useEffect(() => {
    const query = searchParams.get('query');
    if (query) {
      setBookInput(query);
      handleFetchBook(query);
    }
  }, [searchParams]);

  // STEP 1: FETCH BOOK DETAILS
  const handleFetchBook = async (overrideId) => {
    const idToSearch = (overrideId || bookInput).trim().toUpperCase();
    if (!idToSearch) {
      setBookError('Please enter or scan a valid Book ID.');
      return;
    }

    setBookLoading(true);
    setBookError('');
    setBookDetails(null);
    setIssueSuccess(null);

    try {
      const book = await bookService.getBookCopyById(idToSearch);
      if (!book) {
        setBookError(`Book ID "${idToSearch}" was not found in the library database.`);
        return;
      }

      setBookDetails(book);

      if (book.availability_status !== 'Available') {
        setBookError(
          `Cannot issue this book. Its current status is "${book.availability_status}". It must be returned or set to Available first.`
        );
      } else {
        // Focus member input on next tick
        setTimeout(() => {
          memberInputRef.current?.focus();
        }, 100);
      }
    } catch (err) {
      console.error('Error fetching book:', err);
      setBookError(err.message || 'Failed to query book from database.');
    } finally {
      setBookLoading(false);
    }
  };

  // STEP 2: FETCH MEMBER DETAILS
  const handleFetchMember = async () => {
    const query = memberInput.trim();
    if (!query) {
      setMemberError('Please enter a Member ID or scan a Student RFID UID.');
      return;
    }

    setMemberLoading(true);
    setMemberError('');
    setMemberDetails(null);

    try {
      const member = await memberService.getMemberByIdOrRfid(query);
      if (!member) {
        setMemberError(`No member found matching ID or RFID "${query}".`);
        return;
      }

      if (member.account_status !== 'Active') {
        setMemberError(
          `Member account status is "${member.account_status}". Only Active members can borrow books.`
        );
      }

      setMemberDetails(member);
    } catch (err) {
      console.error('Error fetching member:', err);
      setMemberError(err.message || 'Failed to query member details.');
    } finally {
      setMemberLoading(false);
    }
  };

  // STEP 3: CONFIRM & EXECUTE ISSUING
  const handleConfirmIssue = async () => {
    if (!bookDetails || bookDetails.availability_status !== 'Available') {
      alert('A valid, available book must be selected.');
      return;
    }
    if (!memberDetails || memberDetails.account_status !== 'Active') {
      alert('An active member must be verified.');
      return;
    }
    if (!dueDate) {
      alert('Please specify a return due date.');
      return;
    }

    setIssuingLoading(true);
    try {
      const result = await borrowingService.issueBook({
        bookId: bookDetails.book_id,
        memberId: memberDetails.member_id,
        adminId: 1, // Head Librarian admin_id
        dueDate: dueDate
      });

      setIssueSuccess({
        transaction_id: result.transaction_id,
        book_id: bookDetails.book_id,
        book_title: bookDetails.title,
        member_id: memberDetails.member_id,
        member_name: memberDetails.full_name,
        due_date: dueDate
      });

      // Clear steps for next operation
      setBookInput('');
      setMemberInput('');
      setBookDetails(null);
      setMemberDetails(null);
    } catch (err) {
      console.error('Issuing transaction failed:', err);
      alert(`Issuing failed: ${err.message}`);
    } finally {
      setIssuingLoading(false);
    }
  };

  // Reset entire form
  const handleReset = () => {
    setBookInput('');
    setMemberInput('');
    setBookDetails(null);
    setMemberDetails(null);
    setBookError('');
    setMemberError('');
    setIssueSuccess(null);
    setTimeout(() => bookInputRef.current?.focus(), 50);
  };

  const isBookAvailable = bookDetails && bookDetails.availability_status === 'Available';
  const isMemberActive = memberDetails && memberDetails.account_status === 'Active';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Module Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white">
              Primary Workflow
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Circulation Desk
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mt-1">Book Issuing Module</h1>
          <p className="text-xs text-slate-500">
            3-step atomic circulation verification: Book copy check, member account validation, and transaction recording.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Transaction</span>
        </button>
      </div>

      {/* Success Banner */}
      {issueSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-emerald-800">
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Book Issued Successfully!</h2>
              <p className="text-xs text-emerald-700">
                Transaction ID: <span className="font-mono font-bold">#{issueSuccess.transaction_id}</span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-emerald-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Issued Book</span>
              <p className="font-bold text-slate-800 mt-0.5">{issueSuccess.book_title}</p>
              <p className="font-mono text-blue-600 text-[11px]">{issueSuccess.book_id}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Issued To</span>
              <p className="font-bold text-slate-800 mt-0.5">{issueSuccess.member_name}</p>
              <p className="font-mono text-slate-600 text-[11px]">{issueSuccess.member_id}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Return Due Date</span>
              <p className="font-bold text-rose-600 mt-0.5">
                {new Date(issueSuccess.due_date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between">
            <span className="text-[11px] text-emerald-700">
              Database status for <code className="font-mono font-bold">{issueSuccess.book_id}</code> is now marked as <strong>Issued</strong>.
            </span>
            <button
              onClick={handleReset}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Issue Another Book
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 1: BOOK IDENTIFICATION                                          */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
              Book Identification
            </h2>
          </div>
          {bookDetails && (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Verified
            </span>
          )}
        </div>

        {/* Input Barcode / Book ID */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Enter or Scan Book ID
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
                    handleFetchBook();
                  }
                }}
                placeholder="e.g. LIB-BK-0001 (or scan barcode)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => handleFetchBook()}
              disabled={bookLoading || !bookInput.trim()}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Search className="w-4 h-4" />
              <span>{bookLoading ? 'Querying...' : 'Fetch Book Details'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Quick demo shortcut: Type <button type="button" onClick={() => { setBookInput('LIB-BK-0001'); handleFetchBook('LIB-BK-0001'); }} className="text-blue-600 font-mono font-bold underline hover:text-blue-800">LIB-BK-0001</button> to test "Python Programming".
          </p>
        </div>

        {/* Book Error Banner */}
        {bookError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{bookError}</span>
          </div>
        )}

        {/* Retrieved Book Details Card */}
        {bookDetails && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs animate-fadeIn">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                  Catalogue Metadata
                </span>
                <h3 className="text-sm font-bold text-slate-800 mt-0.5">
                  {bookDetails.title}
                </h3>
                <p className="text-slate-500">By {bookDetails.author}</p>
              </div>
              <StatusBadge status={bookDetails.availability_status} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
              <div>
                <span className="text-slate-400 block font-medium">Book ID:</span>
                <span className="font-mono font-bold text-slate-700">{bookDetails.book_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Category:</span>
                <span className="font-semibold text-slate-700">{bookDetails.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Publisher:</span>
                <span className="text-slate-700">{bookDetails.publisher || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">ISBN:</span>
                <span className="font-mono text-slate-700">{bookDetails.isbn || '-'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* STEP 2: MEMBER IDENTIFICATION                                        */}
      {/* ==================================================================== */}
      {isBookAvailable && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
                Member Identification
              </h2>
            </div>
            {memberDetails && (
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Verified
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Enter Student RFID UID or Member ID
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={memberInputRef}
                  type="text"
                  value={memberInput}
                  onChange={(e) => setMemberInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleFetchMember();
                    }
                  }}
                  placeholder="e.g. STU001 or USR001"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={handleFetchMember}
                disabled={memberLoading || !memberInput.trim()}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Search className="w-4 h-4" />
                <span>{memberLoading ? 'Checking...' : 'Fetch Member Details'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Quick demo shortcut: Type <button type="button" onClick={() => { setMemberInput('STU001'); }} className="text-blue-600 font-mono font-bold underline hover:text-blue-800">STU001</button> for Rahul Kumar (Student).
            </p>
          </div>

          {memberError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{memberError}</span>
            </div>
          )}

          {memberDetails && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs animate-fadeIn">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">
                    {memberDetails.member_type} Account
                  </span>
                  <h3 className="text-sm font-bold text-slate-800 mt-0.5">
                    {memberDetails.full_name}
                  </h3>
                  <p className="text-slate-500">{memberDetails.email}</p>
                </div>
                <StatusBadge status={memberDetails.account_status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-medium">Member ID:</span>
                  <span className="font-mono font-bold text-slate-700">{memberDetails.member_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">RFID UID:</span>
                  <span className="font-mono text-slate-700">{memberDetails.rfid_uid || 'None (Normal User)'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Department:</span>
                  <span className="text-slate-700 font-medium">{memberDetails.department || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Phone:</span>
                  <span className="text-slate-700">{memberDetails.phone_number || '-'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 3: ISSUE CONFIRMATION                                           */}
      {/* ==================================================================== */}
      {isBookAvailable && isMemberActive && (
        <div className="bg-white rounded-2xl border-2 border-blue-500/20 shadow-md p-6 space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
                Transaction Review & Confirmation
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Ready for Atomic Commit</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Book Summary Card */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-1.5">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                Target Book Copy
              </p>
              <p className="font-bold text-slate-800 text-sm">{bookDetails.title}</p>
              <p className="font-mono font-semibold text-blue-700">{bookDetails.book_id}</p>
              <p className="text-slate-500">By {bookDetails.author}</p>
            </div>

            {/* Member Summary Card */}
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-1.5">
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                Authorized Borrower
              </p>
              <p className="font-bold text-slate-800 text-sm">{memberDetails.full_name}</p>
              <p className="font-mono font-semibold text-purple-700">{memberDetails.member_id} ({memberDetails.member_type})</p>
              <p className="text-slate-500">{memberDetails.department || 'General'}</p>
            </div>
          </div>

          {/* Dates Selection */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issue Date (Current Timestamp)
              </label>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Return Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500 text-center sm:text-left">
              Executing will atomically create a <strong>BORROWING_RECORDS</strong> row and update <strong>BOOK_COPIES</strong> status to <em>Issued</em>.
            </p>

            <button
              type="button"
              onClick={handleConfirmIssue}
              disabled={issuingLoading}
              className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{issuingLoading ? 'Processing Issuance...' : 'Confirm Book Issuing'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

