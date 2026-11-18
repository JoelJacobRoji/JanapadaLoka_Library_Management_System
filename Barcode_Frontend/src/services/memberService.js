import { getSupabaseClient } from './supabaseClient';

export const memberService = {
  // Fetch all registered members
  async getAllMembers() {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not configured.');

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Find member by Member ID or RFID UID
  async getMemberByIdOrRfid(identifier) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not configured.');

    const cleanId = identifier.trim();

    // First try exact or case-insensitive member_id
    let { data, error } = await supabase
      .from('members')
      .select('*')
      .ilike('member_id', cleanId)
      .maybeSingle();

    if (error) throw error;

    // If not found, try matching rfid_uid
    if (!data) {
      const { data: rfidData, error: rfidErr } = await supabase
        .from('members')
        .select('*')
        .eq('rfid_uid', cleanId)
        .maybeSingle();

      if (rfidErr) throw rfidErr;
      data = rfidData;
    }

    return data || null;
  },

  // Create new member (Student or Normal User/Faculty)
  async createMember(member) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not configured.');

    const payload = {
      member_id: member.member_id.trim().toUpperCase(),
      full_name: member.full_name.trim(),
      member_type: member.member_type || 'Student',
      rfid_uid: member.rfid_uid?.trim() || null,
      email: member.email.trim(),
      department: member.department?.trim() || null,
      phone_number: member.phone_number?.trim() || null,
      account_status: member.account_status || 'Active'
    };

    const { data, error } = await supabase
      .from('members')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update existing member details
  async updateMember(memberId, updates) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not configured.');

    const payload = {
      full_name: updates.full_name?.trim(),
      member_type: updates.member_type,
      rfid_uid: updates.rfid_uid ? updates.rfid_uid.trim() : null,
      email: updates.email?.trim(),
      department: updates.department ? updates.department.trim() : null,
      phone_number: updates.phone_number ? updates.phone_number.trim() : null,
      account_status: updates.account_status
    };

    const { data, error } = await supabase
      .from('members')
      .update(payload)
      .eq('member_id', memberId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get member borrowing history
  async getMemberBorrowingHistory(memberId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not configured.');

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
        book_copies:book_id (
          book_id,
          books:catalogue_id (
            title,
            author,
            category
          )
        )
      `)
      .eq('member_id', memberId)
      .order('issue_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

