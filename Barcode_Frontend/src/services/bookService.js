import { getSupabaseClient } from './supabaseClient';

export const bookService = {
  // Fetch all book copies along with their parent book catalogue metadata
  async getAllCopies() {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not configured.');

    let copies = [];

    // Try joined query first
    try {
      const { data, error } = await supabase
        .from('book_copies')
        .select(`
          book_id,
          catalogue_id,
          availability_status,
          created_at,
          books:catalogue_id (
            catalogue_id,
            title,
            author,
            publisher,
            edition,
            category,
            isbn,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        copies = data;
      }
    } catch (joinErr) {
      console.warn('PostgREST join failed, falling back to separate queries:', joinErr);
    }

    // If copies is empty, query book_copies and books directly
    if (copies.length === 0) {
      try {
        const { data: rawCopies } = await supabase.from('book_copies').select('*');
        const { data: rawBooks } = await supabase.from('books').select('*');

        const booksMap = new Map((rawBooks || []).map(b => [String(b.catalogue_id), b]));

        if (rawCopies && rawCopies.length > 0) {
          copies = rawCopies.map(cp => ({
            ...cp,
            books: booksMap.get(String(cp.catalogue_id)) || null
          }));
        } else if (rawBooks && rawBooks.length > 0) {
          // User inserted into BOOKS, but has not generated physical copies yet
          copies = rawBooks.map(b => ({
            book_id: `LIB-BK-${String(b.catalogue_id).padStart(4, '0')}`,
            catalogue_id: b.catalogue_id,
            availability_status: 'Available',
            created_at: b.created_at,
            books: b
          }));
        }
      } catch (e) {
        console.error('Fallback query error:', e);
      }
    }

    return copies;
  },

  // Fetch all catalogue entries
  async getAllCatalogues() {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not configured.');

    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('title', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Fetch single book copy by its Book ID (e.g. LIB-BK-0001)
  async getBookCopyById(bookId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not configured.');

    const cleanId = bookId.trim().toUpperCase();

    const { data, error } = await supabase
      .from('book_copies')
      .select(`
        book_id,
        catalogue_id,
        availability_status,
        created_at,
        books:catalogue_id (
          catalogue_id,
          title,
          author,
          publisher,
          edition,
          category,
          isbn
        )
      `)
      .eq('book_id', cleanId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      book_id: data.book_id,
      catalogue_id: data.catalogue_id,
      availability_status: data.availability_status,
      created_at: data.created_at,
      title: data.books?.title || 'Unknown Title',
      author: data.books?.author || 'Unknown Author',
      publisher: data.books?.publisher || '-',
      edition: data.books?.edition || '-',
      category: data.books?.category || 'General',
      isbn: data.books?.isbn || '-'
    };
  },

  // Get physical copies for a specific book title (catalogue)
  async getCopiesForCatalogue(catalogueId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not configured.');

    const { data, error } = await supabase
      .from('book_copies')
      .select('*')
      .eq('catalogue_id', catalogueId)
      .order('book_id', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Calculate the next sequential Book ID
  async getNextBookId() {
    const supabase = getSupabaseClient();
    if (!supabase) return 'LIB-BK-0001';

    const { data, error } = await supabase
      .from('book_copies')
      .select('book_id');

    if (error || !data || data.length === 0) {
      return 'LIB-BK-0001';
    }

    let maxNumber = 0;
    const regex = /LIB-BK-(\d+)/i;
    data.forEach(item => {
      const match = item.book_id?.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });

    const nextNum = maxNumber + 1;
    return `LIB-BK-${String(nextNum).padStart(4, '0')}`;
  },

  // Add a new book title to catalogue
  async createCatalogue(bookData) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not configured.');

    const { data, error } = await supabase
      .from('books')
      .insert([{
        title: bookData.title.trim(),
        author: bookData.author.trim(),
        publisher: bookData.publisher?.trim() || null,
        edition: bookData.edition?.trim() || null,
        category: bookData.category?.trim() || 'General',
        isbn: bookData.isbn?.trim() || null
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update book catalogue information
  async updateCatalogue(catalogueId, updates) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not configured.');

    const { data, error } = await supabase
      .from('books')
      .update({
        title: updates.title?.trim(),
        author: updates.author?.trim(),
        publisher: updates.publisher?.trim(),
        edition: updates.edition?.trim(),
        category: updates.category?.trim(),
        isbn: updates.isbn?.trim()
      })
      .eq('catalogue_id', catalogueId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Add multiple physical copies for a catalogue item sequentially
  async addCopies(catalogueId, count = 1) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client is not configured.');

    // Fetch all existing IDs to compute safe non-colliding sequential IDs
    const { data: allCopies, error: idError } = await supabase
      .from('book_copies')
      .select('book_id');

    if (idError) throw idError;

    let maxNumber = 0;
    const regex = /LIB-BK-(\d+)/i;
    (allCopies || []).forEach(item => {
      const match = item.book_id?.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });

    const newCopies = [];
    for (let i = 1; i <= count; i++) {
      const newId = `LIB-BK-${String(maxNumber + i).padStart(4, '0')}`;
      newCopies.push({
        book_id: newId,
        catalogue_id: catalogueId,
        availability_status: 'Available'
      });
    }

    const { data, error } = await supabase
      .from('book_copies')
      .insert(newCopies)
      .select();

    if (error) throw error;
    return data;
  }
};

