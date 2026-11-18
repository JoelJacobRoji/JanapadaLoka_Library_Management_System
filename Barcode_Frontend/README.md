# Library Management System – Admin Dashboard

A modern, responsive, and fully functional Admin Dashboard for a Library Management System built with **React.js**, **Tailwind CSS**, and **Supabase PostgreSQL**.

---

## 🚀 Quick Start Instructions

Because your environment requires running package installations from your local terminal, follow these simple steps to run the application:

### Step 1: Install Dependencies
Open your PowerShell or Command Prompt terminal in this folder (`Barcode_frontend`) and run:

```bash
npm install --legacy-peer-deps
```

### Step 2: Configure Supabase
1. Open the [Supabase Dashboard](https://supabase.com/dashboard) and go to your project.
2. In the **SQL Editor**, open and execute the contents of [`supabase_setup.sql`](./supabase_setup.sql). This will:
   - Create all 5 required tables (`books`, `book_copies`, `members`, `admins`, `borrowing_records`).
   - Enable Row Level Security (RLS) policies safely.
   - Create the atomic PostgreSQL stored procedures `issue_book()` and `return_book()`.
   - Seed sample records including demonstration data:
     - Book: `LIB-BK-0001` (*Python Programming* by John Zelle)
     - Member: `STU001` (*Rahul Kumar*, Student)
3. Update [`.env`](./.env) with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
   *(Note: You can also click **"Setup Supabase"** in the top navigation bar of the running application to enter or test your credentials directly in the UI!)*

### Step 3: Run the Development Server
```bash
npm run dev
```
Open your browser at the local URL shown (typically `http://localhost:5173`).

---

## 📋 Initial Demonstration Walkthrough

1. **Open Dashboard**:
   - View real-time statistics retrieved directly from Supabase (Titles, Copies, Available, Issued, Members, Active Loans).
   - Review the book availability pie chart and circulation bar chart.

2. **Book Issuing Module**:
   - Click **Book Issuing** in the sidebar.
   - **Step 1**: In "Enter or Scan Book ID", type `LIB-BK-0001` and click **Fetch Book Details**.
     - Automatically displays *Python Programming* details and verifies status is *Available*.
   - **Step 2**: In "Enter Student RFID UID or Member ID", type `STU001` and click **Fetch Member Details**.
     - Automatically displays *Rahul Kumar*, Student account, and active status.
   - **Step 3**: Review the lending details, select or keep the default due date, and click **Confirm Book Issuing**.
     - Atomically creates a transaction in `BORROWING_RECORDS` and updates the copy status in `BOOK_COPIES` to `Issued`.

3. **Book Returning Module**:
   - Click **Book Returning** in the sidebar.
   - Enter `LIB-BK-0001` and click **Find Active Loan**.
     - Retrieves the active loan details for Rahul Kumar.
   - Click **Confirm Book Return**.
     - Records the return timestamp and restores the copy availability status to `Available`.

4. **Book & Member Management**:
   - Add new book titles and automatically generate sequential physical copy IDs (`LIB-BK-0002`, `LIB-BK-0003`, etc.).
   - Manage student RFID UIDs and view borrowing histories.
