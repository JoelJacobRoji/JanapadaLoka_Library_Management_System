import React, { useState, useRef, useEffect } from 'react';
import {
  Barcode,
  Search,
  CheckCircle,
  AlertCircle,
  CreditCard,
  User,
  GraduationCap,
  Users,
  BookOpen,
  ArrowRight,
  ArrowDownLeft,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Clock,
  Sparkles,
  Info,
  AlertTriangle
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { circulationService } from '../services/circulationService';

export default function CirculationPortal() {
  // -------------------------------------------------------------
  // PRIMARY OPERATION MODE: 'borrow' | 'return'
  // -------------------------------------------------------------
  const [operationMode, setOperationMode] = useState('borrow');

  // -------------------------------------------------------------
  // BORROW WORKFLOW STATE
  // -------------------------------------------------------------
  const [borrowBookInput, setBorrowBookInput] = useState('');
  const [borrowBookLoading, setBorrowBookLoading] = useState(false);
  const [borrowBookDetails, setBorrowBookDetails] = useState(null);
  const [borrowBookError, setBorrowBookError] = useState('');

  const [borrowerType, setBorrowerType] = useState(null); // 'student' | 'external'
  const [borrowRfidInput, setBorrowRfidInput] = useState('');
  const [borrowExternalIdInput, setBorrowExternalIdInput] = useState('');
  const [borrowerLoading, setBorrowerLoading] = useState(false);
  const [borrowerDetails, setBorrowerDetails] = useState(null);
  const [borrowerError, setBorrowerError] = useState('');

  const [borrowConfirmLoading, setBorrowConfirmLoading] = useState(false);
  const [borrowSuccess, setBorrowSuccess] = useState(null);

  // -------------------------------------------------------------
  // RETURN WORKFLOW STATE
  // -------------------------------------------------------------
  const [returnBookInput, setReturnBookInput] = useState('');
  const [returnBookLoading, setReturnBookLoading] = useState(false);
  const [returnBookDetails, setReturnBookDetails] = useState(null);
  const [returnBookError, setReturnBookError] = useState('');
  const [activeBorrowingRecord, setActiveBorrowingRecord] = useState(null);

  const [returnBorrowerType, setReturnBorrowerType] = useState(null); // 'student' | 'external'
  const [returnRfidInput, setReturnRfidInput] = useState('');
  const [returnExternalIdInput, setReturnExternalIdInput] = useState('');
  const [returnVerifyLoading, setReturnVerifyLoading] = useState(false);
  const [returnVerifiedBorrower, setReturnVerifiedBorrower] = useState(null);
  const [returnVerifyError, setReturnVerifyError] = useState('');

  const [returnConfirmLoading, setReturnConfirmLoading] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState(null);

  // Input references
  const borrowBookInputRef = useRef(null);
  const borrowRfidInputRef = useRef(null);
  const borrowExternalIdInputRef = useRef(null);

  const returnBookInputRef = useRef(null);
  const returnRfidInputRef = useRef(null);
  const returnExternalIdInputRef = useRef(null);

  // Auto focus input when mode changes
  useEffect(() => {
    if (operationMode === 'borrow') {
      setTimeout(() => borrowBookInputRef.current?.focus(), 100);
    } else {
      setTimeout(() => returnBookInputRef.current?.focus(), 100);
    }
  }, [operationMode]);

  // Mode Switcher handler
  const handleSwitchMode = (mode) => {
    if (operationMode === mode) return;
    setOperationMode(mode);
    setBorrowSuccess(null);
    setReturnSuccess(null);
    setBorrowBookError('');
    setReturnBookError('');
    setBorrowerError('');
    setReturnVerifyError('');
  };

  // =============================================================
  // BORROW WORKFLOW HANDLERS
  // =============================================================

  const handleBorrowScanBook = async (e) => {
    if (e) e.preventDefault();
    const idToSearch = borrowBookInput.trim().toUpperCase();
    if (!idToSearch) {
      setBorrowBookError('Please enter or scan a valid Book ID.');
      return;
    }

    setBorrowBookLoading(true);
    setBorrowBookError('');
    setBorrowBookDetails(null);
    setBorrowerType(null);
    setBorrowerDetails(null);
    setBorrowerError('');
    setBorrowSuccess(null);

    try {
      const book = await circulationService.getBookByBarcode(idToSearch);
      setBorrowBookDetails(book);

      if (book.availability_status !== 'Available') {
        setBorrowBookError(
          `Book "${book.title}" (${book.book_id}) is currently ${book.availability_status}. It cannot be borrowed until returned.`
        );
      }
    } catch (err) {
      console.error('Error querying book:', err);
      setBorrowBookError(err.message || 'Book ID not found in library database.');
    } finally {
      setBorrowBookLoading(false);
    }
  };

  const handleSelectBorrowerType = (type) => {
    setBorrowerType(type);
    setBorrowerDetails(null);
    setBorrowerError('');
    setBorrowRfidInput('');
    setBorrowExternalIdInput('');

    setTimeout(() => {
      if (type === 'student') {
        borrowRfidInputRef.current?.focus();
      } else if (type === 'external') {
        borrowExternalIdInputRef.current?.focus();
      }
    }, 100);
  };

  const handleBorrowScanStudentRfid = async (e) => {
    if (e) e.preventDefault();
    const rfidToSearch = borrowRfidInput.trim();
    if (!rfidToSearch) {
      setBorrowerError('Please enter or scan the Student RFID UID.');
      return;
    }

    setBorrowerLoading(true);
    setBorrowerError('');
    setBorrowerDetails(null);

    try {
      const student = await circulationService.getStudentByRfid(rfidToSearch);
      setBorrowerDetails({ ...student, normalizedType: 'Student' });
    } catch (err) {
      console.error('Error querying student RFID:', err);
      setBorrowerError(err.message || 'Student RFID verification failed.');
    } finally {
      setBorrowerLoading(false);
    }
  };

  const handleBorrowScanExternalUser = async (e) => {
    if (e) e.preventDefault();
    const idToSearch = borrowExternalIdInput.trim().toUpperCase();
    if (!idToSearch) {
      setBorrowerError('Please enter an External User ID.');
      return;
    }

    setBorrowerLoading(true);
    setBorrowerError('');
    setBorrowerDetails(null);

    try {
      const user = await circulationService.getExternalUserById(idToSearch);
      setBorrowerDetails({ ...user, normalizedType: 'External User' });
    } catch (err) {
      console.error('Error querying external user:', err);
      setBorrowerError(err.message || 'External user verification failed.');
    } finally {
      setBorrowerLoading(false);
    }
  };

  const handleConfirmBorrowing = async () => {
    if (!borrowBookDetails || borrowBookDetails.availability_status !== 'Available') {
      alert('A valid available book must be scanned first.');
      return;
    }
    if (!borrowerDetails || borrowerDetails.account_status !== 'Active') {
      alert('A verified active borrower must be identified.');
      return;
    }

    setBorrowConfirmLoading(true);
    try {
      const result = await circulationService.confirmBorrowing({
        bookId: borrowBookDetails.book_id,
        memberId: borrowerDetails.member_id,
        adminId: 1,
        lendingDays: 14
      });

      setBorrowSuccess({
        transaction_id: result.transaction_id,
        book_id: borrowBookDetails.book_id,
        book_title: borrowBookDetails.title,
        author: borrowBookDetails.author,
        borrower_id: borrowerDetails.member_id,
        borrower_name: borrowerDetails.full_name,
        borrower_type: borrowerDetails.normalizedType || borrowerDetails.member_type,
        due_date: result.due_date
      });

      setBorrowBookInput('');
      setBorrowRfidInput('');
      setBorrowExternalIdInput('');
      setBorrowBookDetails(null);
      setBorrowerType(null);
      setBorrowerDetails(null);
    } catch (err) {
      console.error('Borrowing transaction failed:', err);
      alert(`Borrowing transaction failed: ${err.message}`);
    } finally {
      setBorrowConfirmLoading(false);
    }
  };

  const handleResetBorrow = () => {
    setBorrowBookInput('');
    setBorrowRfidInput('');
    setBorrowExternalIdInput('');
    setBorrowBookDetails(null);
    setBorrowerType(null);
    setBorrowerDetails(null);
    setBorrowBookError('');
    setBorrowerError('');
    setBorrowSuccess(null);
    setTimeout(() => borrowBookInputRef.current?.focus(), 50);
  };

  // =============================================================
  // RETURN WORKFLOW HANDLERS
  // =============================================================

  const handleReturnScanBook = async (e) => {
    if (e) e.preventDefault();
    const idToSearch = returnBookInput.trim().toUpperCase();
    if (!idToSearch) {
      setReturnBookError('Please enter or scan a valid Book ID.');
      return;
    }

    setReturnBookLoading(true);
    setReturnBookError('');
    setReturnBookDetails(null);
    setActiveBorrowingRecord(null);
    setReturnBorrowerType(null);
    setReturnVerifiedBorrower(null);
    setReturnVerifyError('');
    setReturnSuccess(null);

    try {
      // 1. Search BOOK_COPIES and BOOKS
      const book = await circulationService.getBookByBarcode(idToSearch);
      setReturnBookDetails(book);

      // STEP 2 VALIDATION: Check availability_status
      if (book.availability_status === 'Available') {
        setReturnBookError('This book has not been issued and cannot be returned.');
        return;
      }

      // STEP 3: Retrieve Currently Active Borrower from BORROWING_RECORDS
      const activeTx = await circulationService.getActiveBorrowingForBook(idToSearch);
      setActiveBorrowingRecord(activeTx);
    } catch (err) {
      console.error('Error fetching book for return:', err);
      setReturnBookError(err.message || 'Book verification failed.');
    } finally {
      setReturnBookLoading(false);
    }
  };

  const handleSelectReturnBorrowerType = (type) => {
    setReturnBorrowerType(type);
    setReturnVerifiedBorrower(null);
    setReturnVerifyError('');
    setReturnRfidInput('');
    setReturnExternalIdInput('');

    setTimeout(() => {
      if (type === 'student') {
        returnRfidInputRef.current?.focus();
      } else if (type === 'external') {
        returnExternalIdInputRef.current?.focus();
      }
    }, 100);
  };

  // STEP 5A: Verify Returning Student RFID with Active Borrower
  const handleVerifyReturnStudent = async (e) => {
    if (e) e.preventDefault();
    const rfidToSearch = returnRfidInput.trim();
    if (!rfidToSearch) {
      setReturnVerifyError('Please enter or scan the Student RFID UID.');
      return;
    }

    setReturnVerifyLoading(true);
    setReturnVerifyError('');
    setReturnVerifiedBorrower(null);

    try {
      const verifiedStudent = await circulationService.verifyReturnStudent({
        rawRfidUid: rfidToSearch,
        expectedMemberId: activeBorrowingRecord.member_id,
        expectedBorrowerName: activeBorrowingRecord.full_name
      });

      setReturnVerifiedBorrower({
        ...verifiedStudent,
        normalizedType: 'Student'
      });
    } catch (err) {
      console.error('Student return verification error:', err);
      setReturnVerifyError(err.message || 'Student verification failed.');
    } finally {
      setReturnVerifyLoading(false);
    }
  };

  // STEP 5B: Verify Returning External User with Active Borrower
  const handleVerifyReturnExternalUser = async (e) => {
    if (e) e.preventDefault();
    const idToSearch = returnExternalIdInput.trim().toUpperCase();
    if (!idToSearch) {
      setReturnVerifyError('Please enter the External User ID.');
      return;
    }

    setReturnVerifyLoading(true);
    setReturnVerifyError('');
    setReturnVerifiedBorrower(null);

    try {
      const verifiedUser = await circulationService.verifyReturnExternalUser({
        rawMemberId: idToSearch,
        expectedMemberId: activeBorrowingRecord.member_id,
        expectedBorrowerName: activeBorrowingRecord.full_name
      });

      setReturnVerifiedBorrower({
        ...verifiedUser,
        normalizedType: 'External User'
      });
    } catch (err) {
      console.error('External user return verification error:', err);
      setReturnVerifyError(err.message || 'External user verification failed.');
    } finally {
      setReturnVerifyLoading(false);
    }
  };

  // STEP 6: Confirm Return Transaction
  const handleConfirmReturn = async () => {
    if (!returnBookDetails || !activeBorrowingRecord || !returnVerifiedBorrower) {
      alert('Book and matching borrower verification required before completing return.');
      return;
    }

    setReturnConfirmLoading(true);
    try {
      const result = await circulationService.confirmReturn({
        bookId: returnBookDetails.book_id,
        transactionId: activeBorrowingRecord.transaction_id
      });

      setReturnSuccess({
        transaction_id: result.transaction_id,
        book_id: returnBookDetails.book_id,
        book_name: returnBookDetails.title,
        borrower_name: returnVerifiedBorrower.full_name,
        borrower_id: returnVerifiedBorrower.member_id,
        return_date: result.return_date,
        transaction_status: 'Returned'
      });

      // Clear return inputs
      setReturnBookInput('');
      setReturnRfidInput('');
      setReturnExternalIdInput('');
      setReturnBookDetails(null);
      setActiveBorrowingRecord(null);
      setReturnBorrowerType(null);
      setReturnVerifiedBorrower(null);
    } catch (err) {
      console.error('Return confirmation failed:', err);
      alert(`Return failed: ${err.message}`);
    } finally {
      setReturnConfirmLoading(false);
    }
  };

  const handleResetReturn = () => {
    setReturnBookInput('');
    setReturnRfidInput('');
    setReturnExternalIdInput('');
    setReturnBookDetails(null);
    setActiveBorrowingRecord(null);
    setReturnBorrowerType(null);
    setReturnVerifiedBorrower(null);
    setReturnBookError('');
    setReturnVerifyError('');
    setReturnSuccess(null);
    setTimeout(() => returnBookInputRef.current?.focus(), 50);
  };

  const isBorrowBookAvailable = borrowBookDetails && borrowBookDetails.availability_status === 'Available';
  const isBorrowerVerified = borrowerDetails && borrowerDetails.account_status === 'Active';

  const isReturnBookIssued = returnBookDetails && returnBookDetails.availability_status === 'Issued';
  const isReturnVerified = activeBorrowingRecord && returnVerifiedBorrower;

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ========================================================= */}
      {/* OPERATION MODE SWITCHER: BORROW BOOK vs RETURN BOOK       */}
      {/* ========================================================= */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => handleSwitchMode('borrow')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            operationMode === 'borrow'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>BORROW BOOK</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchMode('return')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            operationMode === 'return'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>RETURN BOOK</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* MODE 1: BOOK BORROWING WORKFLOW                                     */}
      {/* ==================================================================== */}
      {operationMode === 'borrow' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Borrow Success Banner */}
          {borrowSuccess && (
            <div className="bg-emerald-50 border-2 border-emerald-400/80 rounded-2xl p-6 space-y-4 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-emerald-950">
                      Book Successfully Issued!
                    </h2>
                    <p className="text-xs text-emerald-800">
                      Transaction ID: <span className="font-mono font-bold">#{borrowSuccess.transaction_id}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleResetBorrow}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Next Transaction</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-white rounded-xl border border-emerald-100 space-y-1">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                    Issued Book Copy
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{borrowSuccess.book_title}</p>
                  <p className="text-slate-600">By {borrowSuccess.author}</p>
                  <p className="font-mono font-bold text-blue-700 pt-1">
                    Book ID: {borrowSuccess.book_id}
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-emerald-100 space-y-1">
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                    Issued Borrower
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{borrowSuccess.borrower_name}</p>
                  <p className="text-slate-600">
                    {borrowSuccess.borrower_type} • ID: <span className="font-mono font-bold">{borrowSuccess.borrower_id}</span>
                  </p>
                  <p className="font-semibold text-rose-700 pt-1">
                    Due Date: {new Date(borrowSuccess.due_date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-emerald-800 text-center pt-1 font-medium">
                Database record inserted and copy status updated to <strong>Issued</strong> in Supabase. Ready for next book.
              </p>
            </div>
          )}

          {/* Step 1: Scan Book Barcode */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Scan Book Barcode
                </h2>
              </div>
              {borrowBookDetails && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Book Retrieved
                </span>
              )}
            </div>

            <form onSubmit={handleBorrowScanBook} className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Enter or Scan Book ID
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={borrowBookInputRef}
                    type="text"
                    value={borrowBookInput}
                    onChange={(e) => setBorrowBookInput(e.target.value)}
                    placeholder="e.g. LIB-BK-0001 (or scan barcode)"
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={borrowBookLoading || !borrowBookInput.trim()}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{borrowBookLoading ? 'Checking...' : 'OK'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                For demonstration: Type <button type="button" onClick={() => { setBorrowBookInput('LIB-BK-0001'); }} className="text-blue-600 font-mono font-bold underline hover:text-blue-800">LIB-BK-0001</button> and click <strong>OK</strong>.
              </p>
            </form>

            {borrowBookError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{borrowBookError}</span>
              </div>
            )}

            {borrowBookDetails && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs animate-fadeIn">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                      Book Information
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      {borrowBookDetails.title}
                    </h3>
                    <p className="text-slate-600 font-medium">By {borrowBookDetails.author}</p>
                  </div>
                  <StatusBadge status={borrowBookDetails.availability_status} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-medium">Book ID:</span>
                    <span className="font-mono font-bold text-slate-800">{borrowBookDetails.book_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Genre / Category:</span>
                    <span className="font-semibold text-slate-800">{borrowBookDetails.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">ISBN Number:</span>
                    <span className="font-mono text-slate-800">{borrowBookDetails.isbn}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Year of Publication:</span>
                    <span className="text-slate-500 italic text-[10px]">
                      {borrowBookDetails.publication_year}
                    </span>
                  </div>
                </div>

                {isBorrowBookAvailable && !borrowerType && (
                  <div className="pt-3 border-t border-slate-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSelectBorrowerType(null)}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>BORROW BOOK</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Select Borrower Type */}
          {isBorrowBookAvailable && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Select Borrower Type
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectBorrowerType('student')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3.5 ${
                    borrowerType === 'student'
                      ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${borrowerType === 'student' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">1. Student</h4>
                    <p className="text-[11px] text-slate-500">Scan Student RFID Card</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectBorrowerType('external')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3.5 ${
                    borrowerType === 'external'
                      ? 'border-purple-600 bg-purple-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${borrowerType === 'external' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">2. External User</h4>
                    <p className="text-[11px] text-slate-500">Enter External Member ID (e.g. USR001)</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 3A: Student Identification */}
          {isBorrowBookAvailable && borrowerType === 'student' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Scan Student RFID Card
                  </h2>
                </div>
                {borrowerDetails && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Student Verified
                  </span>
                )}
              </div>

              <form onSubmit={handleBorrowScanStudentRfid} className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Enter or Scan RFID UID
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <CreditCard className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={borrowRfidInputRef}
                      type="text"
                      value={borrowRfidInput}
                      onChange={(e) => setBorrowRfidInput(e.target.value)}
                      placeholder="e.g. RFID10001 (or scan student card)"
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={borrowerLoading || !borrowRfidInput.trim()}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{borrowerLoading ? 'Checking...' : 'OK'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Demo shortcut: Type <button type="button" onClick={() => { setBorrowRfidInput('RFID10001'); }} className="text-blue-600 font-mono font-bold underline hover:text-blue-800">RFID10001</button> for Rahul Kumar (STU001) or <button type="button" onClick={() => { setBorrowRfidInput('RFID10002'); }} className="text-blue-600 font-mono font-bold underline hover:text-blue-800">RFID10002</button> for Ananya Thomas (STU002) and click <strong>OK</strong>.
                </p>
              </form>

              {borrowerError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{borrowerError}</span>
                </div>
              )}

              {borrowerDetails && borrowerDetails.normalizedType === 'Student' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs animate-fadeIn">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                        Student Information
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                        {borrowerDetails.full_name}
                      </h3>
                      <p className="text-slate-500">{borrowerDetails.email}</p>
                    </div>
                    <StatusBadge status={borrowerDetails.account_status} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-400 block font-medium">Student / Member ID:</span>
                      <span className="font-mono font-bold text-slate-800">{borrowerDetails.member_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">RFID UID:</span>
                      <span className="font-mono font-bold text-blue-700">{borrowerDetails.rfid_uid}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Department:</span>
                      <span className="font-semibold text-slate-800">{borrowerDetails.department || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Account Status:</span>
                      <span className="font-semibold text-emerald-700">{borrowerDetails.account_status}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3B: External User Identification */}
          {isBorrowBookAvailable && borrowerType === 'external' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Enter External User ID
                  </h2>
                </div>
                {borrowerDetails && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> User Verified
                  </span>
                )}
              </div>

              <form onSubmit={handleBorrowScanExternalUser} className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Enter Member ID
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={borrowExternalIdInputRef}
                      type="text"
                      value={borrowExternalIdInput}
                      onChange={(e) => setBorrowExternalIdInput(e.target.value)}
                      placeholder="e.g. USR001"
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={borrowerLoading || !borrowExternalIdInput.trim()}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{borrowerLoading ? 'Checking...' : 'OK'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Demo shortcut: Type <button type="button" onClick={() => { setBorrowExternalIdInput('USR001'); }} className="text-purple-600 font-mono font-bold underline hover:text-purple-800">USR001</button> and click <strong>OK</strong>.
                </p>
              </form>

              {borrowerError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{borrowerError}</span>
                </div>
              )}

              {borrowerDetails && borrowerDetails.normalizedType === 'External User' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs animate-fadeIn">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">
                        External User Information
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                        {borrowerDetails.full_name}
                      </h3>
                      <p className="text-slate-500">{borrowerDetails.email}</p>
                    </div>
                    <StatusBadge status={borrowerDetails.account_status} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-400 block font-medium">User / Member ID:</span>
                      <span className="font-mono font-bold text-slate-800">{borrowerDetails.member_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Member Type:</span>
                      <span className="font-semibold text-slate-800">{borrowerDetails.member_type}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Phone Number:</span>
                      <span className="font-mono text-slate-800">{borrowerDetails.phone_number || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Account Status:</span>
                      <span className="font-semibold text-emerald-700">{borrowerDetails.account_status}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirm Borrowing */}
          {isBorrowBookAvailable && isBorrowerVerified && (
            <div className="bg-white rounded-2xl border-2 border-blue-500/30 shadow-md p-6 space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                    4
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Borrowing Confirmation
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Ready to Issue</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                    Book Information
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{borrowBookDetails.title}</p>
                  <p className="text-slate-600">Author: <strong>{borrowBookDetails.author}</strong></p>
                  <p className="font-mono font-bold text-blue-700 pt-1">
                    Book ID: {borrowBookDetails.book_id}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                    Borrower Information
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{borrowerDetails.full_name}</p>
                  <p className="text-slate-600">
                    Type: <strong>{borrowerDetails.normalizedType || borrowerDetails.member_type}</strong>
                  </p>
                  <p className="font-mono font-bold text-purple-700 pt-1">
                    Member ID: {borrowerDetails.member_id}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                <div className="text-[11px] text-slate-500 text-center sm:text-left">
                  Atomic transaction will update <code className="font-mono font-bold">BOOK_COPIES</code> to <em>Issued</em> and insert a <code className="font-mono font-bold">BORROWING_RECORDS</code> row.
                </div>

                <button
                  type="button"
                  onClick={handleConfirmBorrowing}
                  disabled={borrowConfirmLoading}
                  className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{borrowConfirmLoading ? 'Confirming Transaction...' : 'CONFIRM BORROWING'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODE 2: BOOK RETURNING WORKFLOW                                      */}
      {/* ==================================================================== */}
      {operationMode === 'return' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Return Success Banner */}
          {returnSuccess && (
            <div className="bg-emerald-50 border-2 border-emerald-400/80 rounded-2xl p-6 space-y-4 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-emerald-950 uppercase tracking-wide">
                      BOOK SUCCESSFULLY RETURNED!
                    </h2>
                    <p className="text-xs text-emerald-800">
                      Transaction Record: <span className="font-mono font-bold">#{returnSuccess.transaction_id}</span> • Status: <strong className="text-emerald-700">Returned</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleResetReturn}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Next Return</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-white rounded-xl border border-emerald-100 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Returned Book
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{returnSuccess.book_name}</p>
                  <p className="font-mono font-bold text-blue-700 pt-1">
                    Book ID: {returnSuccess.book_id}
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-emerald-100 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Returned By Borrower
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{returnSuccess.borrower_name}</p>
                  <p className="text-slate-600">
                    Member ID: <span className="font-mono font-bold">{returnSuccess.borrower_id}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Return Date: <strong>{new Date(returnSuccess.return_date).toLocaleDateString()} {new Date(returnSuccess.return_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-emerald-800 text-center pt-1 font-medium">
                Book status restored to <strong>Available</strong> on library shelves. Historical borrowing transaction updated.
              </p>
            </div>
          )}

          {/* STEP 1 & 2: Identify the Book */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Identify Book to Return
                </h2>
              </div>
              {returnBookDetails && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Book Located
                </span>
              )}
            </div>

            <form onSubmit={handleReturnScanBook} className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Enter or Scan Book ID
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={returnBookInputRef}
                    type="text"
                    value={returnBookInput}
                    onChange={(e) => setReturnBookInput(e.target.value)}
                    placeholder="e.g. LIB-BK-0001 (or scan barcode)"
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={returnBookLoading || !returnBookInput.trim()}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{returnBookLoading ? 'Checking...' : 'OK'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                For demonstration: Type <button type="button" onClick={() => { setReturnBookInput('LIB-BK-0001'); }} className="text-emerald-600 font-mono font-bold underline hover:text-emerald-800">LIB-BK-0001</button> and click <strong>OK</strong>.
              </p>
            </form>

            {returnBookError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{returnBookError}</span>
              </div>
            )}

            {/* STEP 2: Display Book Details */}
            {returnBookDetails && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs animate-fadeIn">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                      Book Details
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      {returnBookDetails.title}
                    </h3>
                    <p className="text-slate-600 font-medium">By {returnBookDetails.author}</p>
                  </div>
                  <StatusBadge status={returnBookDetails.availability_status} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-medium">Book ID:</span>
                    <span className="font-mono font-bold text-slate-800">{returnBookDetails.book_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Genre / Category:</span>
                    <span className="font-semibold text-slate-800">{returnBookDetails.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">ISBN Number:</span>
                    <span className="font-mono text-slate-800">{returnBookDetails.isbn}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Publication Year:</span>
                    <span className="text-slate-500 italic text-[10px]">
                      {returnBookDetails.publication_year}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: Display Current Borrower Details (Active Borrowing Transaction) */}
          {isReturnBookIssued && activeBorrowingRecord && (
            <div className="bg-white rounded-2xl border-2 border-amber-500/30 shadow-xs p-6 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Active Borrowing Record Found
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Transaction ID: <span className="font-mono font-bold text-slate-800">#{activeBorrowingRecord.transaction_id}</span>
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
                  Currently Issued
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Book Information Summary */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                    Book Information
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{returnBookDetails.title}</p>
                  <p className="text-slate-600">Author: <strong>{returnBookDetails.author}</strong></p>
                  <p className="font-mono font-bold text-blue-700">Book ID: {returnBookDetails.book_id}</p>
                </div>

                {/* Current Borrower Information */}
                <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200/80 space-y-1.5">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                    Current Borrower Information
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{activeBorrowingRecord.full_name}</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-400 block font-medium">Member ID:</span>
                      <span className="font-mono font-bold text-purple-800">{activeBorrowingRecord.member_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Member Type:</span>
                      <span className="font-semibold text-slate-800">{activeBorrowingRecord.member_type}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Issue Date:</span>
                      <span className="text-slate-700">{activeBorrowingRecord.issue_date ? new Date(activeBorrowingRecord.issue_date).toLocaleDateString() : '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Due Date:</span>
                      <span className="font-bold text-rose-700">{activeBorrowingRecord.due_date ? new Date(activeBorrowingRecord.due_date).toLocaleDateString() : '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Select Borrower Type for Return */}
          {isReturnBookIssued && activeBorrowingRecord && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Select Borrower Type to Verify Return
                </h2>
              </div>

              <p className="text-xs text-slate-600">
                To confirm the return, verify the identity of the person returning the book:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectReturnBorrowerType('student')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3.5 ${
                    returnBorrowerType === 'student'
                      ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${returnBorrowerType === 'student' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">1. Student</h4>
                    <p className="text-[11px] text-slate-500">Scan Student RFID Card</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectReturnBorrowerType('external')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3.5 ${
                    returnBorrowerType === 'external'
                      ? 'border-purple-600 bg-purple-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${returnBorrowerType === 'external' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">2. External User</h4>
                    <p className="text-[11px] text-slate-500">Enter External Member ID (e.g. USR001)</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 5A: Verify Student RFID */}
          {isReturnBookIssued && activeBorrowingRecord && returnBorrowerType === 'student' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    4
                  </span>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Scan Student RFID Card
                  </h2>
                </div>
                {returnVerifiedBorrower && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Identity Verified & Matched
                  </span>
                )}
              </div>

              <form onSubmit={handleVerifyReturnStudent} className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Enter or Scan Student RFID UID
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <CreditCard className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={returnRfidInputRef}
                      type="text"
                      value={returnRfidInput}
                      onChange={(e) => setReturnRfidInput(e.target.value)}
                      placeholder="e.g. RFID10001 (or scan RFID card)"
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={returnVerifyLoading || !returnRfidInput.trim()}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{returnVerifyLoading ? 'Verifying...' : 'OK'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Expected borrower: <strong className="text-slate-700">{activeBorrowingRecord.full_name} ({activeBorrowingRecord.member_id})</strong>. RFID must match this student.
                </p>
              </form>

              {returnVerifyError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold">{returnVerifyError}</span>
                </div>
              )}

              {returnVerifiedBorrower && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        Borrower Verified (Match Confirmed)
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">{returnVerifiedBorrower.full_name}</h4>
                    </div>
                    <StatusBadge status={returnVerifiedBorrower.account_status} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/80 text-[11px]">
                    <div>
                      <span className="text-slate-400 block font-medium">Student ID:</span>
                      <span className="font-mono font-bold text-slate-800">{returnVerifiedBorrower.member_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">RFID UID:</span>
                      <span className="font-mono font-bold text-blue-700">{returnVerifiedBorrower.rfid_uid}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Department:</span>
                      <span className="text-slate-800 font-semibold">{returnVerifiedBorrower.department || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Borrower Match:</span>
                      <span className="text-emerald-700 font-bold">MATCH CONFIRMED</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5B: Verify External User */}
          {isReturnBookIssued && activeBorrowingRecord && returnBorrowerType === 'external' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                    4
                  </span>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Enter External User ID
                  </h2>
                </div>
                {returnVerifiedBorrower && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Identity Verified & Matched
                  </span>
                )}
              </div>

              <form onSubmit={handleVerifyReturnExternalUser} className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Enter Member ID
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={returnExternalIdInputRef}
                      type="text"
                      value={returnExternalIdInput}
                      onChange={(e) => setReturnExternalIdInput(e.target.value)}
                      placeholder="e.g. USR001"
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={returnVerifyLoading || !returnExternalIdInput.trim()}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{returnVerifyLoading ? 'Verifying...' : 'OK'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Expected borrower: <strong className="text-slate-700">{activeBorrowingRecord.full_name} ({activeBorrowingRecord.member_id})</strong>.
                </p>
              </form>

              {returnVerifyError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold">{returnVerifyError}</span>
                </div>
              )}

              {returnVerifiedBorrower && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        Borrower Verified (Match Confirmed)
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">{returnVerifiedBorrower.full_name}</h4>
                    </div>
                    <StatusBadge status={returnVerifiedBorrower.account_status} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/80 text-[11px]">
                    <div>
                      <span className="text-slate-400 block font-medium">User ID:</span>
                      <span className="font-mono font-bold text-slate-800">{returnVerifiedBorrower.member_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Member Type:</span>
                      <span className="font-semibold text-slate-800">{returnVerifiedBorrower.member_type}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Phone:</span>
                      <span className="font-mono text-slate-800">{returnVerifiedBorrower.phone_number || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Borrower Match:</span>
                      <span className="text-emerald-700 font-bold">MATCH CONFIRMED</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: Return Confirmation Section */}
          {isReturnVerified && (
            <div className="bg-white rounded-2xl border-2 border-emerald-500/40 shadow-md p-6 space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                    5
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Return Confirmation
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Borrower & Book Verified</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* BOOK DETAILS */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                    Book Details
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{returnBookDetails.title}</p>
                  <p className="text-slate-600">Author: {returnBookDetails.author}</p>
                  <p className="font-mono font-bold text-blue-700 pt-1">
                    Book ID: {returnBookDetails.book_id}
                  </p>
                </div>

                {/* CURRENT BORROWER */}
                <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                    Verified Borrower
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{returnVerifiedBorrower.full_name}</p>
                  <p className="text-slate-600">Type: {returnVerifiedBorrower.normalizedType || returnVerifiedBorrower.member_type}</p>
                  <p className="font-mono font-bold text-purple-700 pt-1">
                    ID: {returnVerifiedBorrower.member_id}
                  </p>
                </div>

                {/* TRANSACTION DETAILS */}
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Transaction Details
                  </span>
                  <p className="text-[11px] text-slate-600">
                    Issue Date: <strong>{activeBorrowingRecord.issue_date ? new Date(activeBorrowingRecord.issue_date).toLocaleDateString() : '-'}</strong>
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Due Date: <strong>{activeBorrowingRecord.due_date ? new Date(activeBorrowingRecord.due_date).toLocaleDateString() : '-'}</strong>
                  </p>
                  <p className="text-[11px] text-emerald-700 font-bold pt-1">
                    Return Date: {new Date().toLocaleDateString()} (Today)
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                <div className="text-[11px] text-slate-500 text-center sm:text-left">
                  Confirming will update active record <code className="font-mono font-bold">#{activeBorrowingRecord.transaction_id}</code> to <em>Returned</em> and set copy to <em>Available</em>.
                </div>

                <button
                  type="button"
                  onClick={handleConfirmReturn}
                  disabled={returnConfirmLoading}
                  className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{returnConfirmLoading ? 'Processing Return...' : 'CONFIRM RETURN'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
