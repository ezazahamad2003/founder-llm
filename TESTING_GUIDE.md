# Scopic Legal - Complete Testing Guide

End-to-end testing guide for the Scopic Legal AI assistant.

## 🎯 Overview

This guide will help you test the complete system:
- **Backend**: FastAPI with OpenAI File Extraction
- **Frontend**: Next.js with real-time chat
- **Integration**: Full workflow from file upload to AI responses

---

## 📋 Prerequisites

Before testing, ensure:

- [x] Backend dependencies installed (`pip install -r requirements.txt`)
- [x] Frontend dependencies installed (`npm install`)
- [x] Supabase project created
- [x] Database schema executed
- [x] Storage bucket created
- [x] Environment variables configured

---

## 🚀 Step-by-Step Testing

### Step 1: Start the Backend (5 min)

```bash
cd backend

# Make sure .env is configured
cat .env

# Should see:
# OPENAI_API_KEY=sk-...
# MODEL_ID=o5
# SUPABASE_URL=https://...
# SUPABASE_SERVICE_ROLE_KEY=...

# Start the server
uvicorn app.main:app --reload --port 8080
```

**Verify Backend**:
```bash
# In another terminal
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": {
    "supabase": "connected",
    "openai": "configured"
  }
}
```

✅ **Backend is ready!**

---

### Step 2: Start the Frontend (5 min)

```bash
cd frontend

# Make sure .env.local exists
cat .env.local

# Should see:
# NEXT_PUBLIC_SUPABASE_URL=https://...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# NEXT_PUBLIC_API_URL=http://localhost:8080

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Verify Frontend**:
- Open http://localhost:3000
- Should see Calix interface with sidebar

✅ **Frontend is ready!**

---

### Step 3: Test Chat Creation (2 min)

1. **Click "Start New Chat"** button (or the + icon)
2. **Verify**:
   - New chat appears in sidebar
   - Chat is selected (highlighted)
   - Main area shows empty chat interface

**Expected**: Chat created successfully

**Troubleshooting**:
- If fails, check browser console (F12)
- Verify backend `/v1/chats` endpoint works:
  ```bash
  curl -X POST http://localhost:8080/v1/chats \
    -H "Content-Type: application/json" \
    -d '{"user_id": "demo-user-123", "title": "Test Chat"}'
  ```

---

### Step 4: Test Basic Chat (3 min)

1. **Type a message**: "Hello, can you help me?"
2. **Press Enter** or click Send
3. **Verify**:
   - Message appears on right (blue bubble)
   - Response streams in on left (gray bubble)
   - Streaming shows word-by-word
   - Response is professional and helpful

**Expected Response**:
```
Hello! I'm Calix, your legal AI assistant for startup founders. 
I can help you with legal documents and questions. However, I don't 
have any documents uploaded yet. Please upload a legal document 
to get started.
```

**Troubleshooting**:
- If no response, check backend terminal for errors
- Verify OpenAI API key is valid
- Check browser Network tab for SSE connection

---

### Step 5: Test File Upload (5 min)

1. **Prepare a test PDF**:
   - Use any PDF document (contract, terms, etc.)
   - Or create a simple test PDF with text

2. **Upload the file**:
   - Click the upload area in sidebar
   - Select your PDF
   - **Watch the status**:
     - "Uploading..." (with spinner)
     - "Extracting text with OpenAI..." (with spinner)
     - "File processed successfully" (with checkmark)

3. **Verify**:
   - File appears in "Documents" list
   - Green checkmark icon
   - Filename displayed
   - Date shown

**Expected**: File uploaded and processed in 10-30 seconds

**Troubleshooting**:
- If upload fails:
  ```bash
  # Check backend logs for errors
  # Verify Supabase storage bucket exists
  # Check OPENAI_API_KEY is valid
  ```
- If stuck on "Processing":
  ```bash
  # Check backend terminal for OpenAI API errors
  # Verify file is valid PDF
  ```

---

### Step 6: Test Chat with Document (5 min)

1. **Select the uploaded file**:
   - Click on the file in the Documents list
   - Should highlight with blue border
   - Small blue dot appears on right

2. **Ask a question about the document**:
   ```
   "What are the key terms in this document?"
   ```

3. **Verify the response**:
   - ✅ Cites the filename
   - ✅ References actual document content
   - ✅ Professional and accurate
   - ✅ No hallucination

**Expected Response Example**:
```
According to contract.pdf, the key terms include:

1. **Parties**: The agreement is between [Company A] and [Company B]
2. **Term**: The contract is valid for 12 months starting January 1, 2024
3. **Payment**: Net 30 days payment terms
4. **Termination**: Either party may terminate with 30 days notice

[Document: contract.pdf]
```

**Troubleshooting**:
- If response doesn't cite document:
  - Verify file was processed (green checkmark)
  - Check file is selected (blue highlight)
  - Try asking more specific question
- If response is generic:
  - Check backend logs for file context retrieval
  - Verify chunks were created in database

---

### Step 7: Test Anti-Hallucination (3 min)

1. **Ask a question NOT in the document**:
   ```
   "What is the company's annual revenue?"
   ```

2. **Verify response**:
   - ✅ States information is not provided
   - ✅ Doesn't make up numbers
   - ✅ Professional tone

**Expected Response**:
```
The revenue information is not provided in the uploaded documents. 
The contract.pdf only contains the service agreement terms, not 
financial data.
```

**This confirms the anti-hallucination system prompt is working!**

---

### Step 8: Test Multiple Files (5 min)

1. **Upload another PDF**
2. **Select BOTH files** (click each one)
3. **Ask a comparative question**:
   ```
   "Compare the payment terms in both documents"
   ```

4. **Verify**:
   - Response references both files
   - Cites each filename
   - Accurate comparison

**Expected Response Example**:
```
Comparing the payment terms:

**contract_a.pdf**: Payment due within 15 days of invoice

**contract_b.pdf**: Payment terms are net 30 days, with a 2% 
early payment discount if paid within 10 days

The second contract offers more flexible terms with an incentive 
for early payment.
```

---

### Step 9: Test Streaming Performance (2 min)

1. **Ask a complex question**:
   ```
   "Summarize all the important clauses in this contract"
   ```

2. **Observe**:
   - Response starts immediately (< 1 second)
   - Words appear smoothly
   - No long pauses
   - Complete response in 5-10 seconds

**Performance Benchmarks**:
- Time to first token: < 1s
- Streaming speed: Smooth, word-by-word
- Total response time: 5-15s depending on length

---

### Step 10: Test Error Handling (3 min)

**Test 1: Invalid file**
1. Try uploading a .txt file or image
2. Should show error or process gracefully

**Test 2: Network interruption**
1. Stop backend while sending message
2. Should show error message
3. Restart backend, try again - should work

**Test 3: Large file**
1. Upload a large PDF (5-10 MB)
2. Should process successfully (may take longer)

---

## ✅ Complete Test Checklist

### Backend Tests

- [ ] Health endpoint returns 200
- [ ] Can create chat
- [ ] Can send message
- [ ] Streaming works
- [ ] File upload gets signed URL
- [ ] File ingestion extracts text
- [ ] File chunks created in database
- [ ] Admin endpoint requires token

### Frontend Tests

- [ ] Page loads without errors
- [ ] Can create new chat
- [ ] Chat appears in sidebar
- [ ] Can send message
- [ ] Response streams in real-time
- [ ] Can upload file
- [ ] Upload status shows progress
- [ ] File appears in list
- [ ] Can select/deselect files
- [ ] Selected files highlighted
- [ ] Chat uses file context

### Integration Tests

- [ ] End-to-end file upload → extraction → chat
- [ ] Multiple files work together
- [ ] Anti-hallucination works
- [ ] Filename citations appear
- [ ] Markdown renders correctly
- [ ] Error handling works
- [ ] Performance is acceptable

---

## 🎯 Success Criteria

Your system is working correctly if:

1. ✅ **Chat Creation**: Can create and switch between chats
2. ✅ **Basic Chat**: AI responds professionally without documents
3. ✅ **File Upload**: PDFs upload and process successfully
4. ✅ **Document Chat**: AI uses document content and cites filenames
5. ✅ **Anti-Hallucination**: AI admits when data is not available
6. ✅ **Multiple Files**: Can use multiple documents in one chat
7. ✅ **Streaming**: Responses stream smoothly in real-time
8. ✅ **Error Handling**: Graceful error messages, no crashes

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot connect to backend"

**Symptoms**: Frontend shows errors, no API calls work

**Solutions**:
1. Check backend is running: `curl http://localhost:8080/health`
2. Verify `NEXT_PUBLIC_API_URL=http://localhost:8080` in `.env.local`
3. Check CORS in backend allows `http://localhost:3000`

### Issue: "File upload fails"

**Symptoms**: Upload shows error, file doesn't appear

**Solutions**:
1. Check Supabase storage bucket `legal-docs` exists
2. Verify backend `BUCKET_LEGAL=legal-docs` in `.env`
3. Check OpenAI API key is valid
4. Try smaller file (< 5MB)

### Issue: "No streaming, response appears all at once"

**Symptoms**: Response doesn't stream word-by-word

**Solutions**:
1. Check browser supports SSE (all modern browsers do)
2. Verify backend SSE endpoint works
3. Check network tab in DevTools for event-stream

### Issue: "AI doesn't use document content"

**Symptoms**: Response is generic, doesn't cite document

**Solutions**:
1. Verify file has green checkmark (processed)
2. Check file is selected (blue highlight)
3. Verify chunks in database:
   ```bash
   # In Supabase SQL Editor
   SELECT * FROM file_chunks WHERE file_id = 'your-file-id';
   ```
4. Check backend logs for context retrieval

### Issue: "AI hallucinates"

**Symptoms**: Makes up information not in documents

**Solutions**:
1. Verify system prompt is correct in `backend/app/main.py`
2. Check file context is being passed to AI
3. Try more specific questions
4. May need to adjust temperature (currently 0.7)

---

## 📊 Performance Benchmarks

### Expected Performance

| Metric | Target | Acceptable |
|--------|--------|------------|
| Backend health check | < 100ms | < 500ms |
| Chat creation | < 200ms | < 1s |
| Message send | < 100ms | < 500ms |
| First streaming token | < 1s | < 3s |
| File upload (5MB) | < 10s | < 30s |
| File extraction | < 15s | < 60s |
| Page load | < 2s | < 5s |

### Monitoring

**Backend**:
```bash
# Watch logs in real-time
tail -f backend/logs/app.log  # if logging to file
```

**Frontend**:
- Browser DevTools → Network tab
- Check response times
- Monitor SSE connection

---

## 🎉 Final Verification

Run through this quick workflow:

1. **Start both servers** ✅
2. **Create a chat** ✅
3. **Upload a PDF** ✅
4. **Ask about the document** ✅
5. **Verify filename citation** ✅
6. **Ask unrelated question** ✅
7. **Verify "data not provided" response** ✅

**If all steps pass, your Calix system is fully functional!** 🚀

---

## 📞 Next Steps

### For Development
1. Add user authentication
2. Implement chat history persistence
3. Add file preview
4. Improve mobile UI
5. Add keyboard shortcuts

### For Production
1. Deploy backend to Cloud Run
2. Deploy frontend to Vercel
3. Set up monitoring
4. Configure custom domain
5. Add analytics

---

**Testing Version**: 1.0.0  
**Last Updated**: 2024  
**Status**: ✅ Ready for Testing
