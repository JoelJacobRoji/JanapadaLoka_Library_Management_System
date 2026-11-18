import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  UserPlus,
  Edit,
  History,
  CheckCircle,
  AlertCircle,
  X,
  CreditCard,
  User,
  RefreshCw,
  Phone,
  Mail,
  Building2
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { memberService } from '../services/memberService';
import { getSupabaseConfig } from '../services/supabaseClient';

export default function MemberManagement() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | 'history'
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberHistory, setMemberHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [form, setForm] = useState({
    member_id: '',
    full_name: '',
    member_type: 'Student',
    rfid_uid: '',
    email: '',
    department: 'Computer Science',
    phone_number: '',
    account_status: 'Active'
  });

  const { isConfigured } = getSupabaseConfig();

  const loadMembers = async () => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await memberService.getAllMembers();
      setMembers(data);
    } catch (err) {
      console.error('Error loading members:', err);
      setErrorMessage(err.message || 'Failed to load members from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [isConfigured]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setSelectedMember(null);
    setForm({
      member_id: '',
      full_name: '',
      member_type: 'Student',
      rfid_uid: '',
      email: '',
      department: 'Computer Science',
      phone_number: '',
      account_status: 'Active'
    });
    setModalMode('add');
  };

  // Open Edit Modal
  const handleOpenEdit = (member) => {
    setSelectedMember(member);
    setForm({
      member_id: member.member_id,
      full_name: member.full_name || '',
      member_type: member.member_type || 'Student',
      rfid_uid: member.rfid_uid || '',
      email: member.email || '',
      department: member.department || '',
      phone_number: member.phone_number || '',
      account_status: member.account_status || 'Active'
    });
    setModalMode('edit');
  };

  // Open Borrowing History Modal
  const handleOpenHistory = async (member) => {
    setSelectedMember(member);
    setModalMode('history');
    setHistoryLoading(true);
    try {
      const hist = await memberService.getMemberBorrowingHistory(member.member_id);
      setMemberHistory(hist);
    } catch (err) {
      console.error('Error fetching member history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Submit Add or Edit Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage('');
    try {
      if (modalMode === 'add') {
        await memberService.createMember(form);
        setSuccessMessage(`Member ${form.member_id} registered successfully.`);
      } else if (modalMode === 'edit') {
        await memberService.updateMember(selectedMember.member_id, form);
        setSuccessMessage(`Member ${selectedMember.member_id} updated successfully.`);
      }
      setTimeout(() => setSuccessMessage(''), 3000);
      setModalMode(null);
      await loadMembers();
    } catch (err) {
      setErrorMessage(err.message || 'Operation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered members list
  const filteredMembers = members.filter(m => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (m.member_id || '').toLowerCase().includes(term) ||
      (m.full_name || '').toLowerCase().includes(term) ||
      (m.email || '').toLowerCase().includes(term) ||
      (m.rfid_uid || '').toLowerCase().includes(term) ||
      (m.department || '').toLowerCase().includes(term);

    const matchesType =
      typeFilter === 'ALL' || m.member_type === typeFilter;

    const matchesStatus =
      statusFilter === 'ALL' || m.account_status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Member Directory & RFID Access</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage student & general patron records, RFID card associations, and borrowing privileges.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadMembers}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Member ID, Name, Email, or RFID..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Member Types</option>
              <option value="Student">Students</option>
              <option value="Normal User">Normal Users</option>
              <option value="Faculty">Faculty</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <span className="text-slate-400">Account:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Member ID</th>
                <th className="py-3.5 px-4">Full Name</th>
                <th className="py-3.5 px-4">Member Type</th>
                <th className="py-3.5 px-4">RFID UID</th>
                <th className="py-3.5 px-4">Email Address</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <tr key={member.member_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">
                      {member.member_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {member.full_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                        {member.member_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {member.rfid_uid ? (
                        <span className="text-slate-700 font-medium">{member.rfid_uid}</span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{member.email}</td>
                    <td className="py-3 px-4 text-slate-600">{member.department || '-'}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{member.phone_number || '-'}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={member.account_status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenHistory(member)}
                          title="View Borrowing History"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(member)}
                          title="Edit Member"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    {loading ? 'Retrieving members...' : 'No members found matching criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MEMBER MODAL */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">
                {modalMode === 'add' ? 'Register New Member' : `Edit Member: ${selectedMember?.member_id}`}
              </h3>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Member ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    value={form.member_id}
                    onChange={(e) => setForm({ ...form, member_id: e.target.value })}
                    placeholder="e.g. STU003 or USR003"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Member Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.member_type}
                    onChange={(e) => setForm({ ...form, member_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="Student">Student</option>
                    <option value="Normal User">Normal User</option>
                    <option value="Faculty">Faculty</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="e.g. Ananya Sen"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    RFID UID {form.member_type === 'Student' ? '(Recommended)' : '(Optional)'}
                  </label>
                  <input
                    type="text"
                    value={form.rfid_uid}
                    onChange={(e) => setForm({ ...form, rfid_uid: e.target.value })}
                    placeholder="e.g. RFID-9847291"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Account Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.account_status}
                    onChange={(e) => setForm({ ...form, account_status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. ananya.sen@christuniversity.in"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    placeholder="e.g. Computer Science"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : (modalMode === 'add' ? 'Register Member' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEMBER BORROWING HISTORY MODAL */}
      {modalMode === 'history' && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  Borrowing History: {selectedMember.full_name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedMember.member_id} ({selectedMember.member_type})
                </p>
              </div>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <th className="py-2.5 px-3">Book ID</th>
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3">Issue Date</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberHistory.length > 0 ? (
                    memberHistory.map(row => (
                      <tr key={row.transaction_id}>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{row.book_id}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{row.book_copies?.books?.title || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-500">{row.issue_date ? new Date(row.issue_date).toLocaleDateString() : '-'}</td>
                        <td className="py-2.5 px-3 text-slate-500">{row.due_date ? new Date(row.due_date).toLocaleDateString() : '-'}</td>
                        <td className="py-2.5 px-3"><StatusBadge status={row.transaction_status} /></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-slate-400">
                        {historyLoading ? 'Loading records...' : 'No borrowing history found for this member.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-100">
              <button
                onClick={() => setModalMode(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

