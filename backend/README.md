# Scopic Legal Backend API

FastAPI backend for Scopic Legal - A legal AI assistant for startup founders powered by OpenAI with document processing capabilities.

## Features

- 🤖 **OpenAI Integration** - Streaming chat completions via OpenAI API
- 📄 **Document Processing** - PDF parsing and intelligent chunking
- 💾 **Supabase Integration** - Secure data storage with RLS policies
- 🔐 **Authentication Ready** - Works with Supabase Auth from frontend
- 🚀 **Cloud Run Deployment** - Production-ready Docker configuration
- 📊 **Admin Dashboard** - User statistics and monitoring

## Tech Stack

- **FastAPI** - Modern Python web framework
- **Uvicorn** - ASGI server
- **httpx** - Async HTTP client
- **sse-starlette** - Server-Sent Events for streaming
- **Supabase** - Database and file storage
- **OpenAI SDK** - LLM and document processing
- **PyPDF2** - PDF text extraction

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app and routes
│   ├── models.py            # Pydantic models
│   ├── supabase_client.py   # Supabase operations
│   ├── llm_providers.py     # OFI/OpenAI integrations
│   ├── ingest.py            # Document processing
│   └── utils.py             # Utility functions
├── requirements.txt         # Python dependencies
├── Dockerfile              # Container configuration
├── supabase.sql            # Database schema
├── .env.sample             # Environment variables template
└── README.md               # This file
```

## Setup

### 1. Prerequisites

- Python 3.11+
- Supabase account and project
- OpenAI API key

### 2. Environment Variables

Copy `.env.sample` to `.env` and fill in your credentials:

```bash
cp .env.sample .env
```

Required variables:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
MODEL_ID=gpt-5  # Optional override; defaults to gpt-5
ALLOWED_ORIGINS=http://localhost:3000,https://your-app.vercel.app
ADMIN_API_KEY=your-secure-admin-key
```

### 3. Database Setup

Run the SQL schema in your Supabase SQL Editor:

```bash
# Copy contents of supabase.sql and run in Supabase dashboard
```

This creates:
- `chats` table - Chat sessions
- `messages` table - Chat messages
- `files` table - Uploaded documents
- `file_chunks` table - Processed document chunks
- RLS policies for security
- Indexes for performance

### 4. Storage Bucket

Create a storage bucket in Supabase:

1. Go to Storage in Supabase dashboard
2. Create a new bucket named `documents`
3. Set it to private (RLS enabled)
4. Configure policies as needed

### 5. Install Dependencies

```bash
pip install -r requirements.txt
```

## Local Development

### Run the server

```bash
uvicorn app.main:app --reload --port 8080
```

The API will be available at `http://localhost:8080`

### API Documentation

FastAPI automatically generates interactive docs:
- Swagger UI: `http://localhost:8080/docs`
- ReDoc: `http://localhost:8080/redoc`

## API Endpoints

### Health Check
- `GET /` - Basic health check
- `GET /health` - Detailed health status

### Chat Operations
- `POST /v1/chats` - Create new chat
- `GET /v1/chats/{chat_id}` - Get chat details
- `GET /v1/chats/{chat_id}/messages` - Get chat messages
- `POST /v1/chats/{chat_id}/message` - Send message (streaming SSE)

### File Operations
- `POST /v1/files/sign` - Get signed upload URL
- `POST /v1/files/ingest` - Process uploaded file
- `GET /v1/files/{file_id}` - Get file metadata
- `GET /v1/files/{file_id}/chunks` - Get file chunks

### User Operations
- `GET /v1/users/{user_id}/chats` - Get user's chats
- `GET /v1/users/{user_id}/files` - Get user's files

### Admin Operations
- `GET /v1/admin/overview` - Get admin statistics (requires X-Admin-Key header)

## Usage Examples

### Create a Chat

```bash
curl -X POST http://localhost:8080/v1/chats \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "title": "Legal Contract Review"
  }'
```

### Send a Message (Streaming)

```bash
curl -X POST http://localhost:8080/v1/chats/{chat_id}/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the key terms in this contract?",
    "user_id": "user-123",
    "file_ids": ["file-id-1"],
    "stream": true
  }'
```

### Upload a File

```bash
# 1. Get signed upload URL
curl -X POST http://localhost:8080/v1/files/sign \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "contract.pdf",
    "content_type": "application/pdf",
    "user_id": "user-123"
  }'

# 2. Upload file to signed URL (returned from step 1)
curl -X PUT "{signed_url}" \
  --upload-file contract.pdf

# 3. Process the file
curl -X POST http://localhost:8080/v1/files/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "file-id-from-step-1",
    "user_id": "user-123",
    "chat_id": "optional-chat-id"
  }'
```

## Docker Deployment

### Build the image

```bash
docker build -t calix-backend .
```

### Run locally with Docker

```bash
docker run -p 8080:8080 \
  --env-file .env \
  calix-backend
```

## GCP Cloud Run Deployment

### Prerequisites

- Google Cloud account
- gcloud CLI installed
- Project with Cloud Run API enabled

### Deploy Steps

1. **Authenticate with GCP**

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

2. **Build and push to Container Registry**

```bash
# Build for Cloud Run
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/calix-backend

# Or use Artifact Registry (recommended)
gcloud builds submit --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/calix/backend
```

3. **Deploy to Cloud Run**

```bash
gcloud run deploy calix-backend \
  --image gcr.io/YOUR_PROJECT_ID/calix-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars SUPABASE_URL=your-url,OFI_API_KEY=your-key \
  --set-secrets SUPABASE_SERVICE_ROLE_KEY=supabase-key:latest \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10
```

4. **Set environment variables via Secret Manager (recommended)**

```bash
# Create secrets
echo -n "your-supabase-key" | gcloud secrets create supabase-key --data-file=-
echo -n "your-ofi-key" | gcloud secrets create ofi-key --data-file=-

# Deploy with secrets
gcloud run deploy calix-backend \
  --image gcr.io/YOUR_PROJECT_ID/calix-backend \
  --platform managed \
  --region us-central1 \
  --set-secrets SUPABASE_SERVICE_ROLE_KEY=supabase-key:latest,OFI_API_KEY=ofi-key:latest \
  --set-env-vars SUPABASE_URL=https://your-project.supabase.co,MODEL_ID=gpt-5
```

5. **Update CORS origins**

After deployment, add your Cloud Run URL to `ALLOWED_ORIGINS`:

```bash
gcloud run services update calix-backend \
  --update-env-vars ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-backend-xyz.run.app
```

### Continuous Deployment

Set up GitHub Actions or Cloud Build triggers for automatic deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - uses: google-github-actions/setup-gcloud@v0
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}
      
      - name: Build and Deploy
        run: |
          gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/calix-backend
          gcloud run deploy calix-backend \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/calix-backend \
            --platform managed \
            --region us-central1
```

## Frontend Integration

### Next.js Example

```typescript
// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function sendMessage(chatId: string, message: string, fileIds: string[]) {
  const response = await fetch(`${API_URL}/v1/chats/${chatId}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      user_id: userId,
      file_ids: fileIds,
      stream: true
    })
  });

  // Handle SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.content) {
          // Update UI with streamed content
          console.log(data.content);
        }
      }
    }
  }
}
```

## Monitoring & Logging

### Cloud Run Logs

```bash
# View logs
gcloud run services logs read calix-backend --limit 50

# Stream logs
gcloud run services logs tail calix-backend
```

### Health Monitoring

Set up uptime checks in Google Cloud Monitoring:
- Endpoint: `https://your-service.run.app/health`
- Frequency: 1 minute
- Alert on failures

## Security Best Practices

1. **Environment Variables** - Never commit `.env` files
2. **Secret Manager** - Use GCP Secret Manager for production secrets
3. **RLS Policies** - Supabase Row Level Security is enabled
4. **CORS** - Configure `ALLOWED_ORIGINS` properly
5. **Admin Routes** - Protect with `X-Admin-Key` header
6. **Rate Limiting** - Consider adding rate limiting middleware
7. **Input Validation** - Pydantic models validate all inputs

## Troubleshooting

### Common Issues

**Issue: "Supabase connection failed"**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check network connectivity
- Ensure service role key (not anon key) is used

**Issue: "OFI API error 401"**
- Verify `OFI_API_KEY` is correct
- Check API key has proper permissions

**Issue: "File upload fails"**
- Ensure `documents` bucket exists in Supabase
- Check bucket permissions and RLS policies
- Verify file size limits

**Issue: "Streaming not working"**
- Check CORS configuration
- Ensure client supports SSE
- Verify network allows streaming responses

## Performance Optimization

1. **Caching** - Add Redis for session caching
2. **Database Indexes** - Already included in schema
3. **Connection Pooling** - Supabase client handles this
4. **Async Operations** - All I/O is async
5. **Background Tasks** - Use for large file processing

## Development Roadmap

- [ ] Add vector embeddings for semantic search
- [ ] Implement rate limiting
- [ ] Add Redis caching layer
- [ ] WebSocket support for real-time updates
- [ ] Enhanced error tracking (Sentry)
- [ ] Metrics and analytics
- [ ] Multi-model support (GPT-4, Claude)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [your-repo/issues]
- Email: support@calix.ai
- Documentation: [docs.calix.ai]

## Acknowledgments

- OFI for O5 model access
- Supabase for backend infrastructure
- FastAPI community for excellent framework
