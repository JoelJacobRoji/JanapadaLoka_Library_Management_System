-- ====================================================================
-- LIBRARY MANAGEMENT SYSTEM - SUPABASE DATABASE SETUP & POLICIES
-- ====================================================================

-- 1. Create Tables (if not already existing)

CREATE TABLE IF NOT EXISTS public.books (
    catalogue_id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    publisher TEXT,
    edition TEXT,
    category TEXT,
    isbn TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.book_copies (
    book_id TEXT PRIMARY KEY,
    catalogue_id BIGINT NOT NULL REFERENCES public.books(catalogue_id) ON DELETE CASCADE,
    availability_status TEXT NOT NULL DEFAULT 'Available',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.members (
    member_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    member_type TEXT NOT NULL DEFAULT 'Student',
    rfid_uid TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    department TEXT,
    phone_number TEXT,
    account_status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admins (
    admin_id BIGSERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'Librarian',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.borrowing_records (
    transaction_id BIGSERIAL PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES public.book_copies(book_id),
    member_id TEXT NOT NULL REFERENCES public.members(member_id),
    admin_id BIGINT REFERENCES public.admins(admin_id),
    issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date DATE NOT NULL,
    return_date TIMESTAMPTZ,
    transaction_status TEXT NOT NULL DEFAULT 'Issued',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_book_copies_catalogue ON public.book_copies(catalogue_id);
CREATE INDEX IF NOT EXISTS idx_book_copies_status ON public.book_copies(availability_status);
CREATE INDEX IF NOT EXISTS idx_borrowing_book_status ON public.borrowing_records(book_id, transaction_status);
CREATE INDEX IF NOT EXISTS idx_borrowing_member ON public.borrowing_records(member_id);

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowing_records ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated & anon clients for dashboard viewing
DROP POLICY IF EXISTS "Public select books" ON public.books;
CREATE POLICY "Public select books" ON public.books FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public modify books" ON public.books;
CREATE POLICY "Public modify books" ON public.books FOR ALL USING (true);

DROP POLICY IF EXISTS "Public select book_copies" ON public.book_copies;
CREATE POLICY "Public select book_copies" ON public.book_copies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public modify book_copies" ON public.book_copies;
CREATE POLICY "Public modify book_copies" ON public.book_copies FOR ALL USING (true);

DROP POLICY IF EXISTS "Public select members" ON public.members;
CREATE POLICY "Public select members" ON public.members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public modify members" ON public.members;
CREATE POLICY "Public modify members" ON public.members FOR ALL USING (true);

DROP POLICY IF EXISTS "Public select admins" ON public.admins;
CREATE POLICY "Public select admins" ON public.admins FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public modify admins" ON public.admins;
CREATE POLICY "Public modify admins" ON public.admins FOR ALL USING (true);

DROP POLICY IF EXISTS "Public select borrowing_records" ON public.borrowing_records;
CREATE POLICY "Public select borrowing_records" ON public.borrowing_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public modify borrowing_records" ON public.borrowing_records;
CREATE POLICY "Public modify borrowing_records" ON public.borrowing_records FOR ALL USING (true);

-- 4. Atomic Issue Book Stored Procedure (RPC)
CREATE OR REPLACE FUNCTION public.issue_book(
    p_book_id TEXT,
    p_member_id TEXT,
    p_admin_id BIGINT,
    p_due_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_copy_status TEXT;
    v_member_status TEXT;
    v_existing_active_count INT;
    v_new_transaction_id BIGINT;
    v_result JSONB;
BEGIN
    -- 1. Check if copy exists and is available
    SELECT availability_status INTO v_copy_status
    FROM public.book_copies
    WHERE book_id = p_book_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Book copy ' || p_book_id || ' does not exist.');
    END IF;

    IF v_copy_status <> 'Available' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Book copy ' || p_book_id || ' is currently ' || v_copy_status || ' and cannot be issued.');
    END IF;

    -- 2. Check if member exists and is active
    SELECT account_status INTO v_member_status
    FROM public.members
    WHERE member_id = p_member_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Member ' || p_member_id || ' was not found.');
    END IF;

    IF v_member_status <> 'Active' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Member ' || p_member_id || ' account is ' || v_member_status || '.');
    END IF;

    -- 3. Prevent duplicate active borrowing record for this book copy
    SELECT COUNT(*) INTO v_existing_active_count
    FROM public.borrowing_records
    WHERE book_id = p_book_id AND transaction_status = 'Issued';

    IF v_existing_active_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'An active borrowing record already exists for book copy ' || p_book_id || '.');
    END IF;

    -- 4. Insert borrowing record
    INSERT INTO public.borrowing_records (
        book_id,
        member_id,
        admin_id,
        issue_date,
        due_date,
        transaction_status
    ) VALUES (
        p_book_id,
        p_member_id,
        p_admin_id,
        NOW(),
        p_due_date,
        'Issued'
    ) RETURNING transaction_id INTO v_new_transaction_id;

    -- 5. Atomically update copy availability status
    UPDATE public.book_copies
    SET availability_status = 'Issued'
    WHERE book_id = p_book_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Book issued successfully.',
        'transaction_id', v_new_transaction_id,
        'book_id', p_book_id,
        'member_id', p_member_id,
        'due_date', p_due_date
    );
END;
$$;

-- 5. Atomic Return Book Stored Procedure (RPC)
CREATE OR REPLACE FUNCTION public.return_book(
    p_book_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record_id BIGINT;
    v_copy_status TEXT;
BEGIN
    -- 1. Check if copy exists
    SELECT availability_status INTO v_copy_status
    FROM public.book_copies
    WHERE book_id = p_book_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Book copy ' || p_book_id || ' not found.');
    END IF;

    -- 2. Find active borrowing transaction
    SELECT transaction_id INTO v_record_id
    FROM public.borrowing_records
    WHERE book_id = p_book_id AND transaction_status = 'Issued'
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active issue record found for book ' || p_book_id || '. It is already returned or was never issued.');
    END IF;

    -- 3. Update borrowing record
    UPDATE public.borrowing_records
    SET return_date = NOW(),
        transaction_status = 'Returned'
    WHERE transaction_id = v_record_id;

    -- 4. Update book copy availability
    UPDATE public.book_copies
    SET availability_status = 'Available'
    WHERE book_id = p_book_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Book returned successfully.',
        'transaction_id', v_record_id,
        'book_id', p_book_id
    );
END;
$$;

-- ====================================================================
-- SEED DATA (Explicitly matching demonstration objectives)
-- ====================================================================

-- Default Admin
INSERT INTO public.admins (admin_id, full_name, email, role)
VALUES (1, 'Chief Librarian', 'librarian@christuniversity.in', 'Head Librarian')
ON CONFLICT (email) DO NOTHING;

-- Demonstration Book: Python Programming
INSERT INTO public.books (catalogue_id, title, author, publisher, edition, category, isbn)
VALUES 
(1, 'Python Programming', 'John Zelle', 'Franklin, Beedle & Associates', '3rd Edition', 'Computer Science', '978-1590282755'),
(2, 'Clean Code', 'Robert C. Martin', 'Prentice Hall', '1st Edition', 'Software Engineering', '978-0132350884'),
(3, 'Introduction to Algorithms', 'Thomas H. Cormen', 'MIT Press', '4th Edition', 'Algorithms', '978-0262046305')
ON CONFLICT (catalogue_id) DO NOTHING;

-- Reset sequence for books
SELECT setval(pg_get_serial_sequence('public.books', 'catalogue_id'), COALESCE(MAX(catalogue_id), 1)) FROM public.books;

-- Demonstration Physical Copies: LIB-BK-0001, LIB-BK-0002, LIB-BK-0003
INSERT INTO public.book_copies (book_id, catalogue_id, availability_status)
VALUES 
('LIB-BK-0001', 1, 'Available'),
('LIB-BK-0002', 1, 'Available'),
('LIB-BK-0003', 2, 'Available'),
('LIB-BK-0004', 3, 'Available')
ON CONFLICT (book_id) DO NOTHING;

-- Demonstration Member: STU001 (Rahul Kumar)
INSERT INTO public.members (member_id, full_name, member_type, rfid_uid, email, department, phone_number, account_status)
VALUES 
('STU001', 'Rahul Kumar', 'Student', 'RFID-9847291', 'rahul.kumar@christuniversity.in', 'Computer Science', '+91 98765 43210', 'Active'),
('STU002', 'Priya Sharma', 'Student', 'RFID-8273641', 'priya.sharma@christuniversity.in', 'Data Science', '+91 98765 12345', 'Active'),
('USR001', 'Dr. Anand Verma', 'Faculty', NULL, 'anand.verma@christuniversity.in', 'Information Technology', '+91 98450 99887', 'Active')
ON CONFLICT (member_id) DO NOTHING;

