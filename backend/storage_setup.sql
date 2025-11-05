-- Storage Bucket Setup for PDF Files
-- Run this in your Supabase SQL Editor AFTER creating the bucket in the dashboard

-- Step 1: Create the bucket in Supabase Dashboard (Storage section)
-- - Go to Storage in Supabase dashboard
-- - Click "New bucket"
-- - Name: "legal-docs"
-- - Set to "Private" (RLS enabled)
-- - Click "Create bucket"

-- Step 2: Run these SQL policies (after bucket is created)

-- Enable RLS on storage.objects (if not already enabled)
-- This is usually enabled by default, but we'll ensure it

-- Policy: Users can upload files to their own folder
CREATE POLICY IF NOT EXISTS "Users can upload to their own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'legal-docs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can read their own files
CREATE POLICY IF NOT EXISTS "Users can read their own files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'legal-docs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own files
CREATE POLICY IF NOT EXISTS "Users can update their own files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'legal-docs' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'legal-docs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own files
CREATE POLICY IF NOT EXISTS "Users can delete their own files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'legal-docs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Alternative simpler policy if folder structure doesn't match user_id:
-- This allows any authenticated user to upload/read, but you should
-- restrict at the application level using service role key
-- Uncomment if the above policies don't work:

-- DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- CREATE POLICY "Authenticated users can upload to legal-docs"
-- ON storage.objects
-- FOR INSERT
-- WITH CHECK (
--   bucket_id = 'legal-docs' AND
--   auth.role() = 'authenticated'
-- );

-- CREATE POLICY "Authenticated users can read from legal-docs"
-- ON storage.objects
-- FOR SELECT
-- USING (
--   bucket_id = 'legal-docs' AND
--   auth.role() = 'authenticated'
-- );

-- Note: Since your backend uses service_role_key for uploads,
-- you may want to allow service role to bypass RLS for uploads.
-- However, for security, it's better to validate ownership at the
-- application level (which your backend does via user_id checks).

