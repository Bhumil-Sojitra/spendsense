# SpendSense AI — Production Deployment Guide

This guide details how to deploy SpendSense AI to production environments.

---

## 1. Architecture Overview for Production

- **Frontend**: Next.js 16 app deployed to **Vercel** (recommended) or any Node.js host.
- **Backend**: FastAPI Python application deployed to **Render**, **Railway**, **Fly.io**, or any container platform.
- **Database**: Cloud PostgreSQL hosted on **Supabase** (already configured & migrated).

---

## 2. Deploying the Backend (FastAPI)

### Option A: Render (Recommended & Free Tier Available)
1. Push your repository to GitHub.
2. Sign in to [render.com](https://render.com) and click **New + > Web Service**.
3. Connect your GitHub repository.
4. Set the following fields:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add:
   - `ENVIRONMENT`: `production`
   - `CORS_ORIGINS`: `https://your-frontend.vercel.app` (your frontend domain)
   - `SUPABASE_URL`: `https://tivmlwfpnamqenesedpb.supabase.co`
   - `SUPABASE_ANON_KEY`: `eyJhbGci...`
   - `SUPABASE_SERVICE_ROLE_KEY`: `eyJhbGci...`
6. Click **Create Web Service**. Note your backend URL (e.g., `https://spendsense-api.onrender.com`).

### Option B: Railway
1. Sign in to [railway.app](https://railway.app) and click **New Project > Deploy from GitHub repo**.
2. Select the repository and set the root directory to `backend`.
3. Add the same environment variables as above.
4. Railway will automatically detect the `Procfile` and deploy.

---

## 3. Deploying the Frontend (Next.js)

### Vercel (Native & Recommended)
1. Sign in to [vercel.com](https://vercel.com) and click **Add New > Project**.
2. Import your GitHub repository.
3. In the project configuration:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Next.js`
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL`: `https://spendsense-api.onrender.com/api` (your deployed backend URL + `/api`)
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://tivmlwfpnamqenesedpb.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `eyJhbGci...`
5. Click **Deploy**. Vercel will build and assign a production URL (e.g., `https://spendsense.vercel.app`).

*Note: Once you have your Vercel URL, remember to add it to the backend `CORS_ORIGINS` variable on Render/Railway so requests are permitted.*

---

## 4. Containerized Deployment (Docker / VPS / Cloud Server)

You can run both frontend and backend on any VPS (DigitalOcean, AWS EC2, Linode) using Docker Compose:

1. Clone your repo on the server:
   ```bash
   git clone <repo-url>
   cd spendsense
   ```
2. Set your environment variables in `.env`:
   ```bash
   SUPABASE_URL=https://tivmlwfpnamqenesedpb.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
3. Run with Docker Compose:
   ```bash
   docker compose up -d --build
   ```
4. Access:
   - Frontend: `http://your-server-ip:3000`
   - Backend: `http://your-server-ip:8000`

---

## 5. Production Readiness Checklist

| Item | Status | Notes |
|------|--------|-------|
| Database Schema | ✅ Applied | 5 tables, foreign keys, triggers, and RLS policies on Supabase |
| ML Engine | ✅ Verified | Isolation Forest, IQR, and Combined ensemble passing all tests |
| Type Safety | ✅ Verified | Next.js production build compiles with zero TypeScript errors |
| Test Suite | ✅ Verified | 18/18 pytest unit and integration tests passing |
| Container Config | ✅ Ready | `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml` |
| Cloud Config | ✅ Ready | `backend/Procfile` for Render / Railway |
| Security | ✅ Ready | Secrets kept in `.env` (git-ignored) |
