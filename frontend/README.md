# Scopic Legal Frontend

Modern Next.js frontend for Scopic Legal - AI-powered legal assistant for startup founders.

## Features

- ✅ Real-time chat with SSE streaming
- ✅ File upload and management
- ✅ OpenAI file extraction integration
- ✅ Document context in conversations
- ✅ Supabase authentication ready
- ✅ Responsive design with Tailwind CSS
- ✅ TypeScript for type safety

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main chat page
│   └── globals.css         # Global styles
├── components/
│   ├── chat/
│   │   └── ChatInterface.tsx    # Chat UI with streaming
│   └── files/
│       ├── FileUpload.tsx       # File upload component
│       └── FileList.tsx         # File management
├── lib/
│   ├── api.ts              # Backend API client
│   └── supabase.ts         # Supabase client
└── package.json
```

## Components

### ChatInterface

Real-time chat with SSE streaming from backend:

```tsx
<ChatInterface
  chatId="chat-id"
  userId="user-id"
  selectedFiles={['file-id-1', 'file-id-2']}
/>
```

### FileUpload

Upload files with OpenAI extraction:

```tsx
<FileUpload
  userId="user-id"
  onFileUploaded={(fileId) => console.log('Uploaded:', fileId)}
/>
```

### FileList

Display and select uploaded documents:

```tsx
<FileList
  userId="user-id"
  selectedFiles={selectedFiles}
  onFileSelect={(fileId) => toggleFile(fileId)}
/>
```

## API Integration

The frontend connects to your FastAPI backend:

### Chat Streaming

```typescript
import { streamChatMessage } from '@/lib/api'

for await (const chunk of streamChatMessage(chatId, message, userId, fileIds)) {
  // Handle streaming chunks
  console.log(chunk)
}
```

### File Upload

```typescript
import { getSignedUploadUrl, uploadFileToSignedUrl, ingestFile } from '@/lib/api'

// 1. Get signed URL
const { upload_url, file_id } = await getSignedUploadUrl(filename, contentType, userId)

// 2. Upload file
await uploadFileToSignedUrl(upload_url, file)

// 3. Extract text with OpenAI
await ingestFile(file_id, userId)
```

## Styling

Uses Tailwind CSS with custom design system:

- **Primary**: Blue (#3B82F6)
- **Background**: White / Dark mode support
- **Components**: shadcn/ui inspired

## Authentication

Ready for Supabase Auth integration:

```typescript
import { supabase } from '@/lib/supabase'

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Get user
const { data: { user } } = await supabase.auth.getUser()
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables on Vercel

Add in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (your backend URL)

## Development Tips

### Hot Reload

Changes to components auto-reload in browser.

### TypeScript

All components are fully typed. Check `lib/api.ts` for API types.

### Debugging

```bash
# Check for TypeScript errors
npm run lint

# Build for production
npm run build
```

## Features Roadmap

- [ ] Supabase authentication
- [ ] User profiles
- [ ] Chat history persistence
- [ ] File preview
- [ ] Dark mode toggle
- [ ] Mobile responsive improvements
- [ ] Keyboard shortcuts

## Testing

```bash
# Run tests (when added)
npm test

# E2E tests (when added)
npm run test:e2e
```

## Troubleshooting

### "Cannot connect to backend"

- Verify backend is running on port 8080
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Ensure CORS is configured in backend

### "File upload fails"

- Check Supabase storage bucket exists
- Verify `BUCKET_LEGAL` is configured in backend
- Check file size limits

### "Streaming doesn't work"

- Ensure backend SSE endpoint is working
- Check browser console for errors
- Verify network allows streaming

## Support

For issues:
1. Check backend logs
2. Check browser console
3. Verify environment variables
4. Test backend endpoints directly

---

**Version**: 1.0.0  
**Framework**: Next.js 14  
**Status**: ✅ Ready for Testing
