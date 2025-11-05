# Deployment Guide

## Overview

This fullstack application consists of:
- **Frontend**: Next.js 14 (App Router) → Deploy to **Vercel**
- **Backend**: FastAPI (Python) → Deploy to **GCP Cloud Run**
- **Database**: Supabase (PostgreSQL + Auth + Storage)

---

## Prerequisites

1. **Supabase Project** - Create at [supabase.com](https://supabase.com)
2. **Vercel Account** - For frontend deployment
3. **GCP Account** - For backend deployment
4. **Environment Variables** - Copy `.env.example` to `.env` and fill in values

---

## Database Setup (Supabase)

### 1. Run SQL Schema

In Supabase SQL Editor, run:
```sql
-- See backend/supabase.sql for complete schema
```

### 2. Create Storage Bucket

1. Go to Storage in Supabase Dashboard
2. Create bucket named `legal-docs`
3. Set to **Public** or configure RLS policies

### 3. Configure RLS Policies

Run the RLS policies from `backend/supabase.sql` to secure your tables.

---

## Frontend Deployment (Vercel)

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Deploy
```bash
cd frontend
vercel
```

### 3. Set Environment Variables in Vercel Dashboard
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (your backend URL)

---

## Backend Deployment (GCP Cloud Run)

### 1. Install Google Cloud SDK
```bash
# Follow instructions at cloud.google.com/sdk
```

### 2. Build and Deploy
```bash
cd backend
gcloud run deploy scopic-legal-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### 3. Set Environment Variables
```bash
gcloud run services update scopic-legal-backend \
  --set-env-vars="SUPABASE_URL=xxx,SUPABASE_SERVICE_ROLE_KEY=xxx,..."
```

---

## Post-Deployment

1. **Update CORS** - Add your Vercel domain to `ALLOWED_ORIGINS` in backend
2. **Test Authentication** - Sign up and log in
3. **Test File Upload** - Upload a document
4. **Test Chat** - Ask a question
5. **Admin Access** - Visit `/admin` with admin password

---

## Monitoring

- **Frontend**: Vercel Analytics
- **Backend**: GCP Cloud Run Logs
- **Database**: Supabase Dashboard

---

## Troubleshooting

### Frontend Issues
- Check Vercel deployment logs
- Verify environment variables
- Check browser console for errors

### Backend Issues
- Check GCP Cloud Run logs: `gcloud run logs read`
- Verify Supabase connection
- Check CORS configuration

### Database Issues
- Verify RLS policies are correct
- Check Supabase logs
- Ensure service role key is set correctly

---

## Security Checklist

- [ ] All `.env` files are in `.gitignore`
- [ ] Service role keys are never exposed to frontend
- [ ] RLS policies are enabled on all tables
- [ ] CORS is configured correctly
- [ ] Admin password is strong and secure
- [ ] API keys are rotated regularly

---

## Support

For issues, check:
1. Supabase Dashboard logs
2. Vercel deployment logs
3. GCP Cloud Run logs
4. Browser console (F12)
