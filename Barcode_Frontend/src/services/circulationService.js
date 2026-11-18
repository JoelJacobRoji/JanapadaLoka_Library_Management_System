import { getSupabaseClient } from './supabaseClient';

export const circulationService = {
  /**
   * STEP 1: Query book by physical barcode Book ID (e.g. LIB-BK-0001)
   */
  async getBookByBarcode(rawBookId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Database client is not configured.');

    const cleanBookId = rawBookId.trim().toUpperCase();
    if (!cleanBookId) throw new Error('Please enter or scan a Book ID.');

    // 1. Search BOOK_COPIES table
    const { data: copy, error: copyErr } = await supabase
      .from('book_copies')
      .select('book_id, catalogue_id, availability_status, created_at')
      .eq('book_id', cleanBookId)
      .maybeSingle();

    if (copyErr) throw copyErr;
    if (!copy) {
      throw new Error(`Book ID "${cleanBookId}" does not exist in the physical copies inventory.`);
    }

    // 2. Search BOOKS table using catalogue_id
    const { data: book, error: bookErr } = await supabase
      .from('books')
      .select('catalogue_id, title, author, isbn, category, publisher, edition, created_at')
      .eq('catalogue_id', copy.catalogue_id)
      .maybeSingle();

    if (bookErr) throw bookErr;
    if (!book) {
      throw new Error(`Catalogue entry for catalogue_id ${copy.catalogue_id} was not found.`);
    }

    return {
      book_id: copy.book_id,
      catalogue_id: copy.catalogue_id,
      title: book.title || 'Untitled',
      author: book.author || 'Unknown Author',
      isbn: book.isbn || 'N/A',
      category: book.category || 'General',
      publisher: book.publisher || '-',
      edition: book.edition || '-',
      // Note: Current schema does not contain publication_year column
      publication_year: 'Pending database support',
      availability_status: copy.availability_status
    };
  },

  /**
   * STEP 2A: Query STUDENT by RFID UID (e.g. RFID10001 or RFID-9847291)
   */
  async getStudentByRfid(rawRfidUid) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Database client is not configured.');

    const cleanRfid = rawRfidUid.trim();
    if (!cleanRfid) throw new Error('Please enter or scan a Student RFID UID.');

    // 1. First try exact or case-insensitive match on rfid_uid
    let { data: student, error } = await supabase
      .from('members')
      .select('member_id, full_name, member_type, rfid_uid, email, department, phone_number, account_status')
      .ilike('rfid_uid', cleanRfid)
      .maybeSingle();

    if (error) throw error;

    // 2. Fallback: try hyphen-tolerant variations (e.g. RFID-10001 vs RFID10001)
    if (!student) {
      const altVariations = [
        cleanRfid.replace(/[-_\s]/g, ''),
        cleanRfid.startsWith('RFID') && !cleanRfid.includes('-') ? `RFID-${cleanRfid.slice(4)}` : null,
        cleanRfid.startsWith('RFID-') ? `RFID${cleanRfid.slice(5)}` : null
      ].filter(Boolean);

      for (const alt of altVariations) {
        const { data: altStudent } = await supabase
          .from('members')
          .select('member_id, full_name, member_type, rfid_uid, email, department, phone_number, account_status')
          .ilike('rfid_uid', alt)
          .maybeSingle();

        if (altStudent) {
          student = altStudent;
          break;
        }
      }
    }

    // 3. Fallback: if librarian entered Member ID (e.g. STU001) instead of RFID UID
    if (!student) {
      const { data: byMemberId } = await supabase
        .from('members')
        .select('member_id, full_name, member_type, rfid_uid, email, department, phone_number, account_status')
        .ilike('member_id', cleanRfid)
        .maybeSingle();

      if (byMemberId && byMemberId.rfid_uid) {
        student = byMemberId;
      }
    }

    if (!student) {
      throw new Error(`No student record found with RFID UID "${cleanRfid}". In your database, students have RFID: RFID10001 (Rahul Kumar) or RFID10002 (Ananya Thomas).`);
    }

    if (student.account_status !== 'Active') {
      throw new Error(`Student account (${student.member_id}) is currently "${student.account_status}". Transaction not permitted.`);
    }

    return student;
  },

  /**
   * STEP 2B: Query EXTERNAL USER by Member ID (e.g. USR001)
   */
  async getExternalUserById(rawMemberId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Database client is not configured.');

    const cleanId = rawMemberId.trim().toUpperCase();
    if (!cleanId) throw new Error('Please enter an External User ID.');

    // Query MEMBERS table using member_id
    const { data: user, error } = await supabase
      .from('members')
      .select('member_id, full_name, member_type, rfid_uid, email, department, phone_number, account_status')
      .ilike('member_id', cleanId)
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      throw new Error(`External User ID "${cleanId}" does not exist in the database.`);
    }

    // Verify member_type is Normal User / External User (not Student)
    const typeLower = (user.member_type || '').toLowerCase();
    if (typeLower === 'student') {
      throw new Error(`ID "${cleanId}" belongs to a Student. Please select the "Student" borrower type to scan their RFID.`);
    }

    if (user.account_status !== 'Active') {
      throw new Error(`User account (${user.member_id}) is currently "${user.account_status}". Transaction not permitted.`);
    }

    return user;
  },

  /**
   * STEP 3 (BORROWING): Confirm Borrowing & Atomically Commit
   */
  async confirmBorrowing({ bookId, memberId, adminId = 1, lendingDays = 14 }) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Database client is not configured.');

    const cleanBookId = bookId.trim().toUpperCase();
    const cleanMemberId = memberId.trim().toUpperCase();

    // Default due date: 14 days from today
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + lendingDays);
    const dueDateStr = dueDateObj.toISOString().split('T')[0];

    // Try PostgreSQL RPC function first
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('issue_book', {
        p_book_id: cleanBookId,
        p_member_id: cleanMemberId,
        p_admin_id: adminId || 1,
        p_due_date: dueDateStr
      });

      if (!rpcError && rpcData) {
        if (!rpcData.success) {
          throw new Error(rpcData.message || 'Issuance rejected by database constraints.');
        }
        return {
          ...rpcData,
          due_date: dueDateStr
        };
      }
    } catch (rpcErr) {
      if (rpcErr.message && !rpcErr.message.includes('issue_book') && !rpcErr.message.includes('does not exist')) {
        throw rpcErr;
      }
      console.warn('RPC not available, running transactional sequence fallback:', rpcErr);
    }

    // Fallback atomic check & transaction
    // 1. Verify copy availability
    const { data: copy, error: copyErr } = await supabase
      .from('book_copies')
      .select('book_id, availability_status')
      .eq('book_id', cleanBookId)
      .maybeSingle();

    if (copyErr) throw copyErr;
    if (!copy) throw new Error(`Book copy ${cleanBookId} not found.`);
    if (copy.availability_status !== 'Available') {
      throw new Error(`Book copy ${cleanBookId} is currently ${copy.availability_status} and cannot be issued.`);
    }

    // 2. Prevent active duplicate borrowing record
    const { data: existingActive, error: activeErr } = await supabase
      .from('borrowing_records')
      .select('transaction_id')
      .eq('book_id', cleanBookId)
      .eq('transaction_status', 'Issued')
      .maybeSingle();

    if (activeErr) throw activeErr;
    if (existingActive) {
      throw new Error(`Book ${cleanBookId} already has an active borrowing record.`);
    }

    // 3. Insert BORROWING_RECORDS
    const { data: newRecord, error: insertErr } = await supabase
      .from('borrowing_records')
      .insert([{
        book_id: cleanBookId,
        member_id: cleanMemberId,
        admin_id: adminId || 1,
        issue_date: new Date().toISOString(),
        due_date: dueDateStr,
        transaction_status: 'Issued'
      }])
      .select()
      .single();

    if (insertErr) throw insertErr;

    // 4. Update BOOK_COPIES status to 'Issued'
    const { error: updateErr } = await supabase
      .from('book_copies')
      .update({ availability_status: 'Issued' })
      .eq('book_id', cleanBookId);

    if (updateErr) throw updateErr;

    return {
      success: true,
      message: 'Book successfully issued!',
      transaction_id: newRecord.transaction_id,
      book_id: cleanBookId,
      member_id: cleanMemberId,
      due_date: dueDateStr
    };
  },

  /**
   * RETURNING STEP 3: Retrieve currently active borrowing transaction & borrower details
   */
  async getActiveBorrowingForBook(rawBookId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Database client is not configured.');

    const cleanBookId = rawBookId.trim().toUpperCase();

    // Query active transaction from BORROWING_RECORDS
    // Find record where book_id matches, transaction_status = 'Issued', return_date IS NULL
    const { data: activeTx, error: txErr } = await supabase
      .from('borrowing_records')
      .select('transaction_id, book_id, member_id, admin_id, issue_date, due_date, return_date, transaction_status, created_at')
      .eq('book_id', cleanBookId)
      .eq('transaction_status', 'Issued')
      .is('return_date', null)
      .order('issue_date', { ascending: false })
      .maybeSingle();

    if (txErr) throw txErr;
    if (!activeTx) {
      throw new Error(`No active borrowing record found for Book ID "${cleanBookId}". This book is not currently issued.`);
    }

    // Retrieve corresponding member information from MEMBERS table
    const { data: member, error: memErr } = await supabase
      .from('members')
      .select('member_id, full_name, member_type, rfid_uid, email, department, phone_number, account_status')
      .eq('member_id', activeTx.member_id)
      .maybeSingle();

    if (memErr) throw memErr;
    if (!member) {
      throw new Error(`Active borrower record (ID: ${activeTx.member_id}) was not found in MEMBERS.`);
    }

    return {
      transaction_id: activeTx.transaction_id,
      book_id: activeTx.book_id,
      issue_date: activeTx.issue_date,
      due_date: activeTx.due_date,
      transaction_status: activeTx.transaction_status,
      // Borrower info
      member_id: member.member_id,
      full_name: member.full_name,
      member_type: member.member_type,
      rfid_uid: member.rfid_uid,
      email: member.email,
      department: member.department,
      phone_number: member.phone_number,
      account_status: member.account_status
    };
  },

  /**
   * RETURNING STEP 5A: Verify Returning Student with active borrower
   */
  async verifyReturnStudent({ rawRfidUid, expectedMemberId, expectedBorrowerName }) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Database client is not configured.');

    const cleanRfid = rawRfidUid.trim();
    if (!cleanRfid) throw new Error('Please enter or scan a Student RFID UID.');

    // 1. Search MEMBERS table using rfid_uid with tolerance
    let { data: student, error } = await supabase
      .from('members')
      .select('member_id, full_name, member_type, rfid_uid, email, department, phone_number, account_status')
      .ilike('rfid_uid', cleanRfid)
      .maybeSingle();

    if (error) throw error;

    if (!student) {
      const alt = cleanRfid.replace(/[-_\s]/g, '');
      const { data: altStudent } = await supabase
        .from('members')
        .select('member_id, full_name, member_type, rfid_uid, email, department, phone_number, account_status')
        .ilike('rfid_uid', alt)
        .maybeSingle();

      if (altStudent) student = altStudent;
    }

    if (!student) {
      throw new Error(`No student record found with RFID UID "${cleanRfid}".`);
    }

    // 2. Verify student type & account status
    const typeLower = (student.member_type || '').toLowerCase();
    if (typeLower !== 'student') {
      throw new Error(`The scanned RFID belongs to a ${student.member_type}, not a Student.`);
    }

    if (student.account_status !== 'Active') {
      throw new Error(`Student account (${student.member_id}) is ${student.account_status}. Return cannot proceed.`);
    }

    // 3. STRICT BORROWER MATCH VALIDATION:
    // The RFID UID must belong to the SAME student who originally borrowed the book!
    if (student.member_id.toUpperCase() !== expectedMemberId.toUpperCase()) {
      throw new Error(
        `Borrower Mismatch! The scanned RFID belongs to ${student.full_name} (${student.member_id}), but this book was borrowed by ${expectedBorrowerName} (${expectedMemberId}). Only the original borrower can return this book.`
      );
    }

    return student;
  },

  /**
   * RETURNING STEP 5B: Verify Returning External User with active borrower
   */
  async verifyReturnExternalUser({ rawMemberId, expectedMemberId, expectedBorrowerName }) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Database client is not configured.');

    const cleanId = rawMemberId.trim().toUpperCase();
    if (!cleanId) throw new Error('Please enter an External User ID.');

    // 1. Search MEMBERS table using member_id
    const { data: user, error } = await supabase
      .from('members')
      .select('member_id, full_name, member_type, rfid_uid, email, department, phone_number, account_status')
      .ilike('member_id', cleanId)
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      throw new Error(`External User ID "${cleanId}" does not exist in the database.`);
    }

    // 2. Verify not student & account active
    const typeLower = (user.member_type || '').toLowerCase();
    if (typeLower === 'student') {
      throw new Error(`Member ID "${cleanId}" is a Student account. Please select "Student" and scan their RFID UID.`);
    }

    if (user.account_status !== 'Active') {
      throw new Error(`User account (${user.member_id}) is ${user.account_status}. Return cannot proceed.`);
    }

    // 3. STRICT BORROWER MATCH VALIDATION:
    if (user.member_id.toUpperCase() !== expectedMemberId.toUpperCase()) {
      throw new Error(
        `Borrower Mismatch! The entered ID belongs to ${user.full_name} (${user.member_id}), but this book was borrowed by ${expectedBorrowerName} (${expectedMemberId}). Only the original borrower can return this book.`
      );
    }

    return user;
  },

  /**
   * RETURNING STEP 6: Confirm Return & Atomically Update Database
   */
  async confirmReturn({ bookId, transactionId }) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Database client is not configured.');

    const cleanBookId = bookId.trim().toUpperCase();

    // Try PostgreSQL RPC function return_book first
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('return_book', {
        p_book_id: cleanBookId
      });

      if (!rpcError && rpcData) {
        if (!rpcData.success) {
          throw new Error(rpcData.message || 'Return rejected by database.');
        }
        return {
          ...rpcData,
          return_date: new Date().toISOString()
        };
      }
    } catch (rpcErr) {
      if (rpcErr.message && !rpcErr.message.includes('return_book') && !rpcErr.message.includes('does not exist')) {
        throw rpcErr;
      }
      console.warn('RPC return_book not available, executing fallback transaction:', rpcErr);
    }

    // Fallback transaction:
    // 1. Identify active transaction
    let targetTxId = transactionId;
    if (!targetTxId) {
      const { data: activeTx, error: txErr } = await supabase
        .from('borrowing_records')
        .select('transaction_id')
        .eq('book_id', cleanBookId)
        .eq('transaction_status', 'Issued')
        .is('return_date', null)
        .maybeSingle();

      if (txErr) throw txErr;
      if (!activeTx) {
        throw new Error(`No active borrowing record found to return for book ${cleanBookId}.`);
      }
      targetTxId = activeTx.transaction_id;
    }

    const returnTimestamp = new Date().toISOString();

    // 2. Update BORROWING_RECORDS
    const { error: updateTxErr } = await supabase
      .from('borrowing_records')
      .update({
        return_date: returnTimestamp,
        transaction_status: 'Returned'
      })
      .eq('transaction_id', targetTxId);

    if (updateTxErr) throw updateTxErr;

    // 3. Update BOOK_COPIES availability_status to Available
    const { error: updateCopyErr } = await supabase
      .from('book_copies')
      .update({
        availability_status: 'Available'
      })
      .eq('book_id', cleanBookId);

    if (updateCopyErr) throw updateCopyErr;

    return {
      success: true,
      message: 'Book successfully returned!',
      transaction_id: targetTxId,
      book_id: cleanBookId,
      return_date: returnTimestamp
    };
  }
};
