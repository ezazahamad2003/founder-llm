# Production Deployment Checklist

## ✅ Pre-Deployment

### Code Quality
- [x] All unused files removed
- [x] Comprehensive .gitignore created
- [x] Environment variables templated (.env.example)
- [x] Documentation updated (README.md, DEPLOYMENT.md)
- [x] Code formatted and linted

### Database
- [ ] Run `backend/supabase.sql` in Supabase SQL Editor
- [ ] Create `legal-docs` storage bucket
- [ ] Configure RLS policies (run FIX_INFINITE_RECURSION.sql if needed)
- [ ] Verify all tables exist: profiles, chats, messages, files, file_chunks

### Environment Variables
- [ ] Copy `.env.example` to `.env` in both frontend and backend
- [ ] Fill in all Supabase credentials
- [ ] Add OpenAI API key
- [ ] Set admin password
- [ ] Configure CORS origins

## 🚀 Deployment Steps

### 1. Frontend (Vercel)
```bash
cd frontend
vercel
```

**Environment Variables to Set in Vercel:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (your backend URL after deploying)

### 2. Backend (GCP Cloud Run)
```bash
cd backend
gcloud run deploy scopic-legal-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

**Environment Variables to Set:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ADMIN_TOKEN`
- `BUCKET_LEGAL=legal-docs`
- `ALLOWED_ORIGINS` (add your Vercel domain)

### 3. Update Frontend with Backend URL
After backend is deployed, update `NEXT_PUBLIC_API_URL` in Vercel to point to your Cloud Run URL.

## 🧪 Post-Deployment Testing

### Authentication Flow
- [ ] Visit landing page
- [ ] Sign up with new account
- [ ] Accept terms of use
- [ ] Redirected to chat

### Core Features
- [ ] Upload a PDF document
- [ ] Document processes successfully
- [ ] Ask a question in chat
- [ ] Receive AI response
- [ ] File appears in profile page

### Admin Features
- [ ] Access /admin with password
- [ ] View all users
- [ ] View all files
- [ ] Download a file
- [ ] Delete a test user

## 🔒 Security Verification

- [ ] All .env files are gitignored
- [ ] Service role key never exposed to frontend
- [ ] RLS policies working (users can only see own data)
- [ ] CORS configured correctly
- [ ] Admin password is strong
- [ ] Terms acceptance required before chat access

## 📊 Monitoring Setup

### Vercel
- [ ] Enable Analytics
- [ ] Set up error tracking
- [ ] Configure deployment notifications

### GCP
- [ ] Enable Cloud Run logging
- [ ] Set up alerts for errors
- [ ] Monitor resource usage

### Supabase
- [ ] Check database usage
- [ ] Monitor storage usage
- [ ] Review auth logs

## 🐛 Known Issues

### Build Warnings
- Next.js shows warnings about dynamic rendering for /auth page
- This is expected for authenticated pages
- Does not affect production functionality

### Solutions Applied
- API routes use dynamic rendering (required for headers)
- Auth pages use client-side rendering
- All working as expected in production

## 📝 Post-Launch Tasks

- [ ] Monitor error logs for first 24 hours
- [ ] Test with real users
- [ ] Collect feedback
- [ ] Plan feature iterations
- [ ] Set up automated backups
- [ ] Configure custom domain (if needed)

## 🆘 Troubleshooting

### Frontend Issues
1. Check Vercel deployment logs
2. Verify environment variables are set
3. Check browser console (F12)
4. Ensure backend URL is correct

### Backend Issues
1. Check Cloud Run logs: `gcloud run logs read`
2. Verify Supabase connection
3. Check environment variables
4. Test endpoints directly

### Database Issues
1. Verify RLS policies in Supabase dashboard
2. Check table structure matches schema
3. Ensure service role key is correct
4. Review Supabase logs

## 📞 Support Contacts

- **Supabase**: support@supabase.com
- **Vercel**: support@vercel.com
- **GCP**: cloud.google.com/support
- **OpenAI**: help.openai.com

---

## ✨ Ready for Production!

Once all checkboxes are complete, your application is ready for production use.

Remember:
- Monitor logs closely after launch
- Have rollback plan ready
- Keep backups of database
- Document any issues encountered
