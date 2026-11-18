import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookPlus,
  Barcode,
  Copy,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Layers
} from 'lucide-react';
import { bookService } from '../services/bookService';
import { getSupabaseConfig } from '../services/supabaseClient';

export default function AddBook() {
  const navigate = useNavigate();
  const { isConfigured } = getSupabaseConfig();

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    publisher: '',
    edition: '',
    category: 'Computer Science',
    isbn: ''
  });

  const [copiesCount, setCopiesCount] = useState(1);
  const [nextExpectedId, setNextExpectedId] = useState('LIB-BK-0001');

  // Submission State
  const [loading, setLoading] = useState(false);
  const [createdSummary, setCreatedSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch the preview of next Book ID on load
  useEffect(() => {
    async function loadNextId() {
      if (isConfigured) {
        try {
          const nextId = await bookService.getNextBookId();
          setNextExpectedId(nextId);
        } catch (err) {
          console.warn('Could not preview next book ID:', err);
        }
      }
    }
    loadNextId();
  }, [isConfigured]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.author.trim()) {
      setErrorMessage('Please provide both the Book Title and Author.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setCreatedSummary(null);

    try {
      // 1. Create entry in BOOKS table (Catalogue)
      const catalogue = await bookService.createCatalogue(formData);

      // 2. Add requested physical copies to BOOK_COPIES table
      const copiesNum = parseInt(copiesCount, 10) || 1;
      const createdCopies = await bookService.addCopies(catalogue.catalogue_id, copiesNum);

      setCreatedSummary({
        catalogue,
        copies: createdCopies
      });

      // Update next expected ID
      const next = await bookService.getNextBookId();
      setNextExpectedId(next);

      // Reset form
      setFormData({
        title: '',
        author: '',
        publisher: '',
        edition: '',
        category: 'Computer Science',
        isbn: ''
      });
      setCopiesCount(1);
    } catch (err) {
      console.error('Error adding book:', err);
      setErrorMessage(err.message || 'Failed to save book to Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <BookPlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Add New Book to Catalogue</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Insert title metadata into <code className="font-mono font-semibold">BOOKS</code> and generate sequential barcodes into <code className="font-mono font-semibold">BOOK_COPIES</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {createdSummary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-4 animate-fadeIn">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>Book Title & Physical Barcodes Registered Successfully!</span>
          </div>

          <div className="bg-white rounded-xl p-4 border border-emerald-100 space-y-2 text-xs">
            <p className="font-semibold text-slate-800 text-sm">
              {createdSummary.catalogue.title}
            </p>
            <p className="text-slate-500">
              By {createdSummary.catalogue.author} • Category: {createdSummary.catalogue.category}
            </p>
            <div className="pt-2">
              <span className="font-semibold text-slate-700 block mb-1">
                Generated Physical Copies ({createdSummary.copies.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {createdSummary.copies.map(cp => (
                  <span
                    key={cp.book_id}
                    className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold rounded-lg text-xs"
                  >
                    {cp.book_id}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/books')}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition-colors"
            >
              View in Inventory
            </button>
            <button
              onClick={() => navigate(`/issue-book?query=${createdSummary.copies[0]?.book_id}`)}
              className="px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
            >
              <span>Issue This Book Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            1. Book Catalogue Metadata
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Book Title */}
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1.5">
                Book Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Python Programming: An Introduction to Computer Science"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Author */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Author(s) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="author"
                required
                value={formData.author}
                onChange={handleChange}
                placeholder="e.g. John Zelle"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Category / Subject
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Algorithms">Algorithms & Data Structures</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Electronics">Electronics & Hardware</option>
                <option value="Literature">Literature</option>
                <option value="Business & Management">Business & Management</option>
                <option value="General Science">General Science</option>
              </select>
            </div>

            {/* Publisher */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Publisher
              </label>
              <input
                type="text"
                name="publisher"
                value={formData.publisher}
                onChange={handleChange}
                placeholder="e.g. Franklin, Beedle & Associates"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Edition */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Edition
              </label>
              <input
                type="text"
                name="edition"
                value={formData.edition}
                onChange={handleChange}
                placeholder="e.g. 3rd Edition"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* ISBN */}
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1.5">
                ISBN Number
              </label>
              <input
                type="text"
                name="isbn"
                value={formData.isbn}
                onChange={handleChange}
                placeholder="e.g. 978-1590282755"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Physical Copies Section */}
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            2. Physical Inventory & Unique Book IDs
          </h2>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Number of Physical Copies to Add
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={copiesCount}
                  onChange={(e) => setCopiesCount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="text-slate-400 uppercase text-[10px] font-semibold">
                  Starting Sequential Barcode
                </span>
                <div className="flex items-center gap-2 font-mono font-bold text-sm text-slate-800">
                  <Barcode className="w-4 h-4 text-blue-600" />
                  <span>{nextExpectedId}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {copiesCount > 1
                    ? `Will generate ${copiesCount} copies sequentially up to LIB-BK-XXXX`
                    : 'A single physical copy will be generated.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/books')}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            <BookPlus className="w-4 h-4" />
            <span>{loading ? 'Creating Records...' : 'Save Book & Generate Copies'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

