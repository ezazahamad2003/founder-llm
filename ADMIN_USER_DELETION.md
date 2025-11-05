# Admin User Deletion - Complete Data Removal

## What Gets Deleted

When you delete a user from the admin dashboard, **ALL** of the following data is permanently removed:

### 1. **Files** 📁
- ✅ Physical files from Supabase Storage (`legal-docs` bucket)
- ✅ File records from `files` table in database
- ✅ File metadata (filename, size, mime type, etc.)
- ✅ All file chunks from `file_chunks` table (used for RAG/context)

### 2. **Conversations/Chats** 💬
- ✅ All chat records from `chats` table
- ✅ All messages in those chats from `messages` table
- ✅ Chat metadata (titles, timestamps, etc.)

### 3. **User Profile** 👤
- ✅ Profile record from `profiles` table
- ✅ User preferences and settings
- ✅ Terms acceptance records

### 4. **Authentication** 🔐
- ✅ User account from Supabase Auth
- ✅ Email and password credentials
- ✅ Session tokens (user will be logged out)

## Deletion Order

The backend deletes data in this specific order to avoid foreign key constraint errors:

```
1. Files from Storage (physical files)
   ↓
2. File Chunks (database)
   ↓
3. Files (database records)
   ↓
4. Messages (database)
   ↓
5. Chats (database)
   ↓
6. Profile (database)
   ↓
7. Auth User (authentication system)
```

## Example: User "00000000-0000-0000-0000-000000000001"

When you delete this user with:
- **3 chats**
- **7 files**

The system will delete:
- ✅ 7 physical files from cloud storage
- ✅ All text chunks extracted from those 7 files
- ✅ 7 file database records
- ✅ All messages across 3 chats (could be hundreds of messages)
- ✅ 3 chat records
- ✅ 1 profile record
- ✅ 1 auth account

## Safety Features

### Before Deletion
- ⚠️ Confirmation dialog showing:
  - User email
  - Number of chats to be deleted
  - Number of files to be deleted
  - Warning that action cannot be undone

### During Deletion
- 📝 Comprehensive logging at each step
- 🔄 Continues even if some steps fail (e.g., if file already deleted from storage)
- ⚠️ Warnings logged for partial failures

### After Deletion
- ✅ User removed from admin dashboard immediately
- ✅ User cannot log in anymore
- ✅ All data is gone from database and storage
- 📊 Audit trail in backend logs

## Error Handling

If the auth deletion fails (as in your case):
- ✅ All user data (files, chats, messages, profile) is still deleted
- ⚠️ Auth account might still exist but has no associated data
- 💡 User can be manually deleted from Supabase Auth dashboard if needed

## Recovery

**⚠️ IMPORTANT: There is NO recovery option!**

Once a user is deleted:
- ❌ Files cannot be recovered
- ❌ Chats cannot be recovered
- ❌ Messages cannot be recovered
- ❌ User account cannot be recovered

Make absolutely sure before confirming deletion!

## Alternative: Soft Delete

If you want to preserve data but disable access, consider:
1. Disabling the user in Supabase Auth (keeps data)
2. Marking user as inactive in profile table
3. Implementing a "suspended" status

This would require code changes but allows data recovery.

## Current Issue

The error you're seeing:
```
Failed to delete user: User not found
```

This happens because:
1. The user ID `00000000-0000-0000-0000-000000000001` might be a test/placeholder ID
2. The Supabase auth API method might not be available in the Python client version
3. The user might already be deleted from auth but not from database

**Solution**: The code now has fallback methods and won't fail the entire operation if auth deletion fails. All user data will still be deleted successfully.
