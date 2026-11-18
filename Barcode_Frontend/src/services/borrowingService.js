import { getSupabaseClient } from './supabaseClient';

export const borrowingService = {
  // ATOMIC ISSUE BOOK OPERATION
  async issueBook({ bookId, memberId, adminId = 1, dueDate }) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not configured.');

    const cleanBookId = bookId.trim().toUpperCase();
    const cleanMemberId = memberId.trim().toUpperCase();

    // Try calling the atomic PostgreSQL stored procedure first
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('issue_book', {
        p_book_id: cleanBookId,
        p_member_id: cleanMemberId,
        p_admin_id: adminId || 1,
        p_due_date: dueDate
      });

      if (!rpcError && rpcData) {
        if (!rpcData.success) {
          throw new Error(rpcData.message || 'Issuing rejected by database validation.');
        }
        return rpcData;
      }
    } catch (rpcErr) {
      // If error is a functional rejection from RPC, rethrow it
      if (rpcErr.message && !rpcErr.message.includes('function public.issue_book') && !rpcErr.message.includes('does not exist')) {
        throw rpcErr;
      }
      // If RPC doesn't exist yet in database, fallback to direct client transaction logic
      console.warn('PostgreSQL issue_book RPC not found. Executing standard transaction sequence...', rpcErr);
    }

    // FALLBACK TRANSACTION EXECUTION:
    // 1. Verify Book Copy availability
    const { data: copy, error: copyErr } = await supabase
      .from('book_copies')
      .select('book_id, availability_status')
      .eq('book_id', cleanBookId)
      .maybeSingle();

    if (copyErr) throw copyErr;
    if (!copy) throw new Error(`Book copy ${cleanBookId} was not found in the database.`);
    if (copy.availability_status !== 'Available') {
      throw new Error(`Book copy ${cleanBookId} is currently "${copy.availability_status}" and cannot be issued.`);
    }

    // 2. Verify Member is Active
    const { data: member, error: memberErr } = await supabase
      .from('members')
      .select('member_id, account_status')
      .eq('member_id', cleanMemberId)
      .maybeSingle();

    if (memberErr) throw memberErr;
    if (!member) throw new Error(`Member ID ${cleanMemberId} was not found in the database.`);
    if (member.account_status !== 'Active') {
      throw new Error(`Member ${cleanMemberId} account status is "${member.account_status}". Issuing disallowed.`);
    }

    // 3. Prevent duplicate active borrowing record
    const { data: existingActive, error: activeErr } = await supabase
      .from('borrowing_records')
      .select('transaction_id')
      .eq('book_id', cleanBookId)
      .eq('transaction_status', 'Issued')
      .maybeSingle();

    if (activeErr) throw activeErr;
    if (existingActive) {
      throw new Error(`Book ${cleanBookId} already has an active issue record.`);
    }

    // 4. Insert into BORROWING_RECORDS
    const { data: transaction, error: insertErr } = await supabase
      .from('borrowing_records')
      .insert([{
        book_id: cleanBookId,
        member_id: cleanMemberId,
        admin_id: adminId || 1,
        issue_date: new Date().toISOString(),
        due_date: dueDate,
        transaction_status: 'Issued'
      }])
      .select()
      .single();

    if (insertErr) throw insertErr;

    // 5. Update BOOK_COPIES availability_status to 'Issued'
    const { error: updateErr } = await supabase
      .from('book_copies')
      .update({ availability_status: 'Issued' })
      .eq('book_id', cleanBookId);

    if (updateErr) {
      console.error('Warning: Failed to update copy status after record insertion', updateErr);
      throw new Error('Transaction recorded but failed to update book copy status.');
    }

    return {
      success: true,
      message: 'Book issued successfully.',
      transaction_id: transaction.transaction_id,
      book_id: cleanBookId,
      member_id: cleanMemberId
    };
  },

  // GET ACTIVE ISSUE FOR A SPECIFIC BOOK COPY (FOR RETURNING MODULE)
  async getActiveIssueByBookId(bookId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not configured.');

    const cleanBookId = bookId.trim().toUpperCase();

    // Query active borrowing record joined with member and book copy details
    const { data: record, error } = await supabase
      .from('borrowing_records')
      .select(`
        transaction_id,
        book_id,
        member_id,
        admin_id,
        issue_date,
        due_date,
        return_date,
        transaction_status,
        members:member_id (
          member_id,
          full_name,
          member_type,
          email,
          department
        ),
        book_copies:book_id (
          book_id,
          availability_status,
          books:catalogue_id (
            catalogue_id,
            title,
            author,
            category,
            isbn
          )
        )
      `)
      .eq('book_id', cleanBookId)
      .eq('transaction_status', 'Issued')
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error) throw error;
    if (!record) return null;

    return {
      transaction_id: record.transaction_id,
      book_id: record.book_id,
      book_title: record.book_copies?.books?.title || 'Unknown Title',
      author: record.book_copies?.books?.author || '-',
      category: record.book_copies?.books?.category || '-',
      member_id: record.member_id,
      borrower_name: record.members?.full_name || 'Unknown Member',
      member_type: record.members?.member_type || 'Student',
      email: record.members?.email || '-',
      issue_date: record.issue_date,
      due_date: record.due_date,
      transaction_status: record.transaction_status,
      availability_status: record.book_copies?.availability_status
    };
  },

  // ATOMIC RETURN BOOK OPERATION
  async returnBook(bookId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not configured.');

    const cleanBookId = bookId.trim().toUpperCase();

    // Try RPC first
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('return_book', {
        p_book_id: cleanBookId
      });

      if (!rpcError && rpcData) {
        if (!rpcData.success) {
          throw new Error(rpcData.message || 'Return rejected by database.');
        }
        return rpcData;
      }
    } catch (rpcErr) {
      if (rpcErr.message && !rpcErr.message.includes('function public.return_book') && !rpcErr.message.includes('does not exist')) {
        throw rpcErr;
      }
      console.warn('PostgreSQL return_book RPC not found. Executing standard return sequence...', rpcErr);
    }

    // FALLBACK RETURN LOGIC:
    // 1. Find active borrowing transaction
    const { data: activeRecord, error: findErr } = await supabase
      .from('borrowing_records')
      .select('transaction_id')
      .eq('book_id', cleanBookId)
      .eq('transaction_status', 'Issued')
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (findErr) throw findErr;
    if (!activeRecord) {
      throw new Error(`No active issue record found for book ${cleanBookId}. It is already marked as returned or was never issued.`);
    }

    // 2. Update BORROWING_RECORDS
    const { error: recordUpdateErr } = await supabase
      .from('borrowing_records')
      .update({
        return_date: new Date().toISOString(),
        transaction_status: 'Returned'
      })
      .eq('transaction_id', activeRecord.transaction_id);

    if (recordUpdateErr) throw recordUpdateErr;

    // 3. Update BOOK_COPIES status back to 'Available'
    const { error: copyUpdateErr } = await supabase
      .from('book_copies')
      .update({ availability_status: 'Available' })
      .eq('book_id', cleanBookId);

    if (copyUpdateErr) throw copyUpdateErr;

    return {
      success: true,
      message: 'Book returned successfully.',
      transaction_id: activeRecord.transaction_id,
      book_id: cleanBookId
    };
  },

  // FETCH ALL BORROWING RECORDS WITH JOINS
  async getAllBorrowingRecords() {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not configured.');

    let records = [];

    // Try joined PostgREST query first
    try {
      const { data, error } = await supabase
        .from('borrowing_records')
        .select(`
          transaction_id,
          book_id,
          member_id,
          admin_id,
          issue_date,
          due_date,
          return_date,
          transaction_status,
          created_at,
          members:member_id (
            full_name,
            member_type,
            email,
            department
          ),
          book_copies:book_id (
            books:catalogue_id (
              title,
              author,
              category
            )
          )
        `)
        .order('issue_date', { ascending: false });

      if (!error && data) {
        records = data.map(row => ({
          transaction_id: row.transaction_id,
          book_id: row.book_id,
          book_title: row.book_copies?.books?.title || 'Unknown Title',
          author: row.book_copies?.books?.author || '-',
          category: row.book_copies?.books?.category || 'General',
          member_id: row.member_id,
          member_name: row.members?.full_name || 'Unknown Member',
          member_type: row.members?.member_type || 'Student',
          department: row.members?.department || '-',
          issue_date: row.issue_date,
          due_date: row.due_date,
          return_date: row.return_date,
          transaction_status: row.transaction_status,
          created_at: row.created_at
        }));
      }
    } catch (joinErr) {
      console.warn('PostgREST join failed in borrowing records, falling back to flat query:', joinErr);
    }

    // Fallback if join failed or was blocked
    if (records.length === 0) {
      try {
        const { data: rawTxs } = await supabase
          .from('borrowing_records')
          .select('*')
          .order('issue_date', { ascending: false });

        if (rawTxs && rawTxs.length > 0) {
          const { data: rawMembers } = await supabase.from('members').select('*');
          const { data: rawBooks } = await supabase.from('books').select('*');
          const { data: rawCopies } = await supabase.from('book_copies').select('*');

          const memMap = new Map((rawMembers || []).map(m => [m.member_id, m]));
          const copyMap = new Map((rawCopies || []).map(c => [c.book_id, c]));
          const bookMap = new Map((rawBooks || []).map(b => [String(b.catalogue_id), b]));

          records = rawTxs.map(tx => {
            const mem = memMap.get(tx.member_id);
            const copy = copyMap.get(tx.book_id);
            const bk = copy ? bookMap.get(String(copy.catalogue_id)) : null;

            return {
              transaction_id: tx.transaction_id,
              book_id: tx.book_id,
              book_title: bk?.title || 'Unknown Title',
              author: bk?.author || '-',
              category: bk?.category || 'General',
              member_id: tx.member_id,
              member_name: mem?.full_name || 'Unknown Member',
              member_type: mem?.member_type || 'Student',
              department: mem?.department || '-',
              issue_date: tx.issue_date,
              due_date: tx.due_date,
              return_date: tx.return_date,
              transaction_status: tx.transaction_status,
              created_at: tx.created_at
            };
          });
        }
      } catch (fbErr) {
        console.error('Fallback query error:', fbErr);
      }
    }

    return records;
  },

  // AGGREGATE DASHBOARD STATISTICS FROM REAL DATABASE RECORDS
  async getDashboardStatistics() {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not configured.');

    // 1. Total Book Titles (BOOKS)
    const { count: totalTitles, error: titleErr } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true });
    if (titleErr) throw titleErr;

    // 2. Physical Book Copies counts (BOOK_COPIES)
    const { data: copies, error: copiesErr } = await supabase
      .from('book_copies')
      .select('availability_status');
    if (copiesErr) throw copiesErr;

    const totalCopies = copies ? copies.length : 0;
    const availableBooks = (copies || []).filter(c => c.availability_status === 'Available').length;
    const currentlyIssuedBooks = (copies || []).filter(c => c.availability_status === 'Issued').length;
    const otherStatusCount = totalCopies - availableBooks - currentlyIssuedBooks;

    // 3. Total Members (MEMBERS)
    const { count: totalMembers, error: membersErr } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });
    if (membersErr) throw membersErr;

    // 4. Active Borrowing Transactions (BORROWING_RECORDS)
    const { count: activeBorrowings, error: activeErr } = await supabase
      .from('borrowing_records')
      .select('*', { count: 'exact', head: true })
      .eq('transaction_status', 'Issued');
    if (activeErr) throw activeErr;

    // 5. Recent 6 Transactions for Table
    const recentRecords = await this.getAllBorrowingRecords();
    const recentTransactions = recentRecords.slice(0, 6);

    // 6. Monthly book issuing bar chart data (past 6 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap = {};

    // Initialize past 6 months
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      monthlyMap[key] = { month: key, issued: 0, returned: 0 };
    }

    recentRecords.forEach(rec => {
      if (rec.issue_date) {
        const d = new Date(rec.issue_date);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
        if (monthlyMap[key]) {
          monthlyMap[key].issued += 1;
        }
      }
      if (rec.return_date) {
        const d = new Date(rec.return_date);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
        if (monthlyMap[key]) {
          monthlyMap[key].returned += 1;
        }
      }
    });

    const monthlyChartData = Object.values(monthlyMap);

    // 7. Book availability pie chart data
    const availabilityPieData = [
      { name: 'Available', value: availableBooks, color: '#10B981' }, // emerald-500
      { name: 'Currently Issued', value: currentlyIssuedBooks, color: '#3B82F6' }, // blue-500
    ];
    if (otherStatusCount > 0) {
      availabilityPieData.push({ name: 'Reserved/Maintenance', value: otherStatusCount, color: '#F59E0B' });
    }

    return {
      stats: {
        totalTitles: totalTitles || 0,
        totalCopies: totalCopies || 0,
        availableBooks: availableBooks || 0,
        currentlyIssuedBooks: currentlyIssuedBooks || 0,
        totalMembers: totalMembers || 0,
        activeBorrowings: activeBorrowings || 0
      },
      charts: {
        availabilityPieData,
        monthlyChartData
      },
      recentTransactions
    };
  }
};

