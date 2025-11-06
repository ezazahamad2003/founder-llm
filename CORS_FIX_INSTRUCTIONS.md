# CORS Fix Instructions

## Problem

Your frontend at `http://localhost:3000` is blocked from accessing the backend due to CORS errors:
```
Access to fetch at 'https://scopic-legal-backend-zcxpw6ah7a-uc.a.run.app' from origin 'http://localhost:3000' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

## Root Cause

The backend CORS middleware uses `allow_credentials=True` with `ALLOWED_ORIGINS="*"`. This combination is invalid per CORS specification - when credentials are enabled, you must explicitly list allowed origins.

## Solution

### Option 1: Update Production Backend (Recommended)

1. **Find Your Frontend URL**
   - Check your Vercel deployment
   - Note the exact URL (e.g., `https://your-app.vercel.app`)

2. **Update `service.yaml`**
   ```yaml
   - name: ALLOWED_ORIGINS
     value: "http://localhost:3000,https://your-app.vercel.app"
   ```
   Replace `your-app.vercel.app` with your actual Vercel domain.

3. **Deploy to GCP**
   ```powershell
   cd backend
   gcloud run services replace service.yaml --region us-central1
   ```

### Option 2: Run Backend Locally

If you want to develop locally without deploying:

1. **Update backend/.env**
   ```env
   ALLOWED_ORIGINS=http://localhost:3000
   ```

2. **Start Local Backend**
   ```powershell
   cd backend
   .\start.bat
   ```

3. **Update frontend/.env.local**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```

4. **Restart Frontend**
   ```powershell
   cd frontend
   npm run dev
   ```

## Verification

After applying either fix:

1. Clear browser cache (Ctrl+Shift+Delete)
2. Refresh your app at `http://localhost:3000`
3. Open browser DevTools (F12) → Console
4. Try creating a new chat
5. Verify no CORS errors appear

## Technical Details

**File Modified**: `backend/service.yaml` (line 35-36)

**Change Made**:
```yaml
# Before
- name: ALLOWED_ORIGINS
  value: "*"

# After  
- name: ALLOWED_ORIGINS
  value: "http://localhost:3000,https://your-vercel-domain.vercel.app"
```

**Why This Works**:
- CORS with `credentials: true` requires explicit origin whitelisting
- The wildcard `*` is rejected by browsers for security
- Multiple origins are comma-separated in a single string

## Next Steps

1. Apply one of the fixes above
2. Add your production Vercel URL to `ALLOWED_ORIGINS`
3. Redeploy backend to GCP
4. Update `DEPLOYMENT.md` with your specific URLs

## Additional Notes

- The frontend `.env.local` points to: `https://scopic-legal-backend-1081133763032.us-central1.run.app`
- The error shows: `https://scopic-legal-backend-zcxpw6ah7a-uc.a.run.app`
- These may be different deployments - verify which one is correct
- Consider consolidating to a single backend deployment
