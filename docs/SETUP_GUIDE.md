# SpendSense — Setup & Installation Guide

This guide walks through setting up SpendSense locally on Windows, macOS, or Linux.

---

## 1. Prerequisites

- **Python**: 3.11+ (tested with Python 3.12 / 3.13 / 3.15)
- **Node.js**: 20+ (tested with Node 22 / 24)
- **npm**: 10+
- **Git** (optional)

---

## 2. Quick Start (Demo Mode)

SpendSense operates out-of-the-box in **Demo Mode** with zero external database configuration required.

### Step 1: Set Up Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy default environment configuration
cp .env.example .env

# Run FastAPI backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Backend is now running at `http://localhost:8000`.
Interactive API docs are at `http://localhost:8000/docs`.

### Step 2: Set Up Frontend

In a separate terminal:

```bash
cd frontend

# Install packages
npm install

# Run Next.js development server
npm run dev
```
Frontend is now accessible at `http://localhost:3000`.

---

## 3. One-Click Launch (Windows PowerShell)

Use the built-in startup script:
```powershell
.\scripts\run_dev.ps1
```
This launches both backend and frontend servers in separate windows automatically.

---

## 4. Production Mode with Supabase (Optional)

To enable persistent PostgreSQL cloud storage:

1. Create a new Supabase project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in your Supabase dashboard and run the migration script:
   `database/migrations/001_initial_schema.sql`
3. Copy your project URL and keys from **Settings > API**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Update `backend/.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
5. Restart the backend server. The health endpoint `http://localhost:8000/api/health` will confirm:
   `"supabase_connected": true, "demo_mode": false`.

---

## 5. Running Tests

### Automated Suite
Run the full verification script:
```powershell
.\scripts\test_all.ps1
```

### Backend Tests (pytest)
```bash
cd backend
.\venv\Scripts\python -m pytest -v
```

### Frontend Build & Type Check
```bash
cd frontend
npx next build
```
