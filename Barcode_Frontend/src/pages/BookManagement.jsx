import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Copy,
  Edit,
  Eye,
  BookOpen,
  RefreshCw,
  X,
  CheckCircle,
  Barcode,
  Layers
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { bookService } from '../services/bookService';
import { getSupabaseConfig } from '../services/supabaseClient';

export default function BookManagement() {
  const [copies, setCopies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [selectedBook, setSelectedBook] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'view' | 'edit' | 'addCopies' | 'viewAllCopies'
  const [allCopiesOfTitle, setAllCopiesOfTitle] = useState([]);
  const [copiesCountToAdd, setCopiesCountToAdd] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    author: '',
    publisher: '',
    edition: '',
    category: '',
    isbn: ''
  });

  const { isConfigured } = getSupabaseConfig();

  const loadBooks = async () => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await bookService.getAllCopies();
      setCopies(data);
    } catch (err) {
      console.error('Error loading book inventory:', err);
      setErrorMessage(err.message || 'Failed to load books from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, [isConfigured]);

  // Unique categories for filter dropdown
  const categories = Array.from(
    new Set(copies.map(c => c.books?.category).filter(Boolean))
  );

  // Filtered copies
  const filteredCopies = copies.filter(c => {
    const book = c.books || {};
    const matchesSearch =
      c.book_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.author || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.isbn || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === 'ALL' || book.category === categoryFilter;

    const matchesStatus =
      statusFilter === 'ALL' || c.availability_status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Open Edit Modal
  const handleOpenEdit = (copy) => {
    setSelectedBook(copy);
    const book = copy.books || {};
    setEditForm({
      title: book.title || '',
      author: book.author || '',
      publisher: book.publisher || '',
      edition: book.edition || '',
      category: book.category || '',
      isbn: book.isbn || ''
    });
    setModalMode('edit');
  };

  // Open View Details Modal
  const handleOpenView = (copy) => {
    setSelectedBook(copy);
    setModalMode('view');
  };

  // Open Add Copies Modal
  const handleOpenAddCopies = (copy) => {
    setSelectedBook(copy);
    setCopiesCountToAdd(1);
    setModalMode('addCopies');
  };

  // Open View All Copies Modal
  const handleOpenAllCopies = async (copy) => {
    setSelectedBook(copy);
    setModalMode('viewAllCopies');
    try {
      const allCopies = await bookService.getCopiesForCatalogue(copy.catalogue_id);
      setAllCopiesOfTitle(allCopies);
    } catch (err) {
      console.error('Error fetching copies:', err);
    }
  };

  // Save Edit Book Catalogue
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage('');
    try {
      await bookService.updateCatalogue(selectedBook.catalogue_id, editForm);
      setSuccessMessage('Book information updated successfully in Supabase.');
      setTimeout(() => setSuccessMessage(''), 3000);
      setModalMode(null);
      await loadBooks();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update book.');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Additional Copies
  const handleConfirmAddCopies = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage('');
    try {
      const added = await bookService.addCopies(selectedBook.catalogue_id, parseInt(copiesCountToAdd, 10));
      setSuccessMessage(`Successfully generated ${added.length} new physical copies for "${selectedBook.books?.title}".`);
      setTimeout(() => setSuccessMessage(''), 4000);
      setModalMode(null);
      await loadBooks();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to add copies.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Book Inventory & Catalogue</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse and manage book titles (`BOOKS`) linked with distinct barcode IDs (`BOOK_COPIES`).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadBooks}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
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
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
          {errorMessage}
        </div>
      )}

      {/* Filters & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Book ID, Title, Author, or ISBN..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Category & Status Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <span className="text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Issued">Issued</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Book Copies Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Book ID</th>
                <th className="py-3.5 px-4">Book Title</th>
                <th className="py-3.5 px-4">Author</th>
                <th className="py-3.5 px-4">Publisher</th>
                <th className="py-3.5 px-4">Edition</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">ISBN</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCopies.length > 0 ? (
                filteredCopies.map((copy) => {
                  const book = copy.books || {};
                  return (
                    <tr key={copy.book_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        <div className="flex items-center gap-1.5">
                          <Barcode className="w-3.5 h-3.5 text-slate-400" />
                          <span>{copy.book_id}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs">
                        {book.title || 'Untitled'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{book.author || '-'}</td>
                      <td className="py-3 px-4 text-slate-500">{book.publisher || '-'}</td>
                      <td className="py-3 px-4 text-slate-500">{book.edition || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {book.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {book.isbn || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={copy.availability_status} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenView(copy)}
                            title="View Full Details"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(copy)}
                            title="Edit Catalogue Info"
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenAddCopies(copy)}
                            title="Add Physical Copies"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenAllCopies(copy)}
                            title="View All Physical Copies for this Title"
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    {loading ? 'Querying Supabase database...' : 'No book copies found matching filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW MODAL */}
      {modalMode === 'view' && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-800">Book Details</h3>
              </div>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-slate-400 font-medium uppercase text-[10px]">Physical Book ID</p>
                <p className="font-mono font-bold text-blue-600 text-sm mt-0.5">{selectedBook.book_id}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-slate-400 font-medium uppercase text-[10px]">Availability</p>
                <div className="mt-1"><StatusBadge status={selectedBook.availability_status} /></div>
              </div>
              <div className="col-span-2 p-3 bg-slate-50 rounded-xl">
                <p className="text-slate-400 font-medium uppercase text-[10px]">Title</p>
                <p className="font-semibold text-slate-800 text-sm mt-0.5">{selectedBook.books?.title}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-slate-400 font-medium uppercase text-[10px]">Author</p>
                <p className="font-medium text-slate-800 mt-0.5">{selectedBook.books?.author}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-slate-400 font-medium uppercase text-[10px]">Publisher</p>
                <p className="font-medium text-slate-800 mt-0.5">{selectedBook.books?.publisher || '-'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-slate-400 font-medium uppercase text-[10px]">Edition</p>
                <p className="font-medium text-slate-800 mt-0.5">{selectedBook.books?.edition || '-'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-slate-400 font-medium uppercase text-[10px]">Category</p>
                <p className="font-medium text-slate-800 mt-0.5">{selectedBook.books?.category}</p>
              </div>
              <div className="col-span-2 p-3 bg-slate-50 rounded-xl">
                <p className="text-slate-400 font-medium uppercase text-[10px]">ISBN</p>
                <p className="font-mono text-slate-800 mt-0.5">{selectedBook.books?.isbn || '-'}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setModalMode(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {modalMode === 'edit' && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">Edit Catalogue Information</h3>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Author *</label>
                  <input
                    type="text"
                    required
                    value={editForm.author}
                    onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Publisher</label>
                  <input
                    type="text"
                    value={editForm.publisher}
                    onChange={(e) => setEditForm({ ...editForm, publisher: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Edition</label>
                  <input
                    type="text"
                    value={editForm.edition}
                    onChange={(e) => setEditForm({ ...editForm, edition: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ISBN</label>
                <input
                  type="text"
                  value={editForm.isbn}
                  onChange={(e) => setEditForm({ ...editForm, isbn: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
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
                  {actionLoading ? 'Saving...' : 'Update Title'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PHYSICAL COPIES MODAL */}
      {modalMode === 'addCopies' && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">Add Physical Book Copies</h3>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Generating new physical barcode copies for: <br />
              <strong className="text-slate-800">{selectedBook.books?.title}</strong>
            </p>

            <form onSubmit={handleConfirmAddCopies} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Number of Copies to Add
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={copiesCountToAdd}
                  onChange={(e) => setCopiesCountToAdd(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Sequential IDs (e.g. LIB-BK-XXXX) will be automatically generated without duplicates.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  {actionLoading ? 'Generating...' : `Generate ${copiesCountToAdd} Copies`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ALL COPIES OF THIS TITLE MODAL */}
      {modalMode === 'viewAllCopies' && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Physical Copies in Stock</h3>
                <p className="text-xs text-slate-500">{selectedBook.books?.title}</p>
              </div>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
              {allCopiesOfTitle.length > 0 ? (
                allCopiesOfTitle.map(cp => (
                  <div key={cp.book_id} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-blue-600">{cp.book_id}</span>
                    <StatusBadge status={cp.availability_status} />
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">Loading copy details...</div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setModalMode(null)}
                className="px-4 py-2 text-xs font-medium bg-slate-100 rounded-xl text-slate-700"
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

