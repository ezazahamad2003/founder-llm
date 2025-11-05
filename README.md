# Scopic Legal - AI-Powered Legal Assistant for Startup Founders

> Get instant legal guidance powered by GPT-5. Upload documents, ask questions, and receive clear answers tailored to your startup's needs.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-blue)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-yellow)](https://www.python.org/)

---

## 🚀 Features

### For Founders
- **💬 AI Legal Chat** - Ask legal questions and get instant GPT-5 powered answers
- **📄 Document Analysis** - Upload contracts, NDAs, and agreements for AI analysis
- **🔒 Secure & Private** - End-to-end encryption, your data never leaves your control
- **📚 Context-Aware** - AI remembers your documents and previous conversations
- **⚡ Instant Answers** - No waiting, no scheduling, available 24/7

### For Lawyers/Admins
- **👥 User Management** - View all users and their activity
- **📊 Analytics Dashboard** - Monitor usage, files, and conversations
- **🗑️ Data Management** - Delete users and their data (GDPR compliant)
- **📁 File Access** - View and download all uploaded documents

---

## 🏗️ Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Next.js       │─────▶│   FastAPI       │─────▶│   Supabase      │
│   Frontend      │      │   Backend       │      │   Database      │
│   (Vercel)      │      │   (GCP)         │      │   + Storage     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                         │                         │
        │                         │                         │
        └─────────────────────────┴─────────────────────────┘
                         OpenAI GPT-5 API
```

### Tech Stack

**Frontend**
- Next.js 14 (App Router)
- React 18
- TypeScript
- TailwindCSS
- Supabase Client

**Backend**
- FastAPI (Python 3.11)
- OpenAI GPT-5
- Supabase (PostgreSQL + Auth + Storage)
- PyPDF2 (Document processing)

**Infrastructure**
- Vercel (Frontend hosting)
- GCP Cloud Run (Backend hosting)
- Supabase (Database + Auth + Storage)

---

## 📦 Project Structure

```
founder-llm/
├── frontend/              # Next.js application
│   ├── app/              # App router pages
│   ├── components/       # React components
│   ├── contexts/         # React contexts
│   └── lib/              # Utilities
├── backend/              # FastAPI application
│   ├── app/              # Application code
│   │   ├── main.py      # FastAPI app
│   │   ├── models.py    # Pydantic models
│   │   ├── supabase_client.py
│   │   ├── llm_providers.py
│   │   └── ingest.py    # Document processing
│   ├── migrations/       # Database migrations
│   └── requirements.txt
├── terms/                # Legal documents
├── .env.example         # Environment template
├── .gitignore           # Git ignore rules
├── README.md            # This file
└── DEPLOYMENT.md        # Deployment guide
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Supabase account
- OpenAI API key

### 1. Clone and Install

```bash
# Clone repository
git clone <your-repo-url>
cd founder-llm

# Install frontend dependencies
cd frontend
npm install
cp .env.local.example .env.local  # Add your config
npm run dev
```

See `frontend/README.md` for detailed setup.

## Features

- 🤖 **OpenAI Integration** - Streaming chat with document context
- 📄 **Document Processing** - PDF extraction and analysis
- 💾 **Supabase Backend** - Secure data storage and authentication
- 🔐 **User Authentication** - Email/password auth with Supabase
- 📊 **Admin Dashboard** - Usage statistics and monitoring
- 🚀 **Production Ready** - Docker + Cloud Run deployment

## Tech Stack

**Backend:**
- FastAPI
- OpenAI SDK
- Supabase
- Docker

**Frontend:**
- Next.js 14
- TypeScript
- Tailwind CSS
- Server-Sent Events (SSE)

## Documentation

- **Backend**: See `backend/README.md`
- **Frontend**: See `frontend/README.md`
- **Authentication**: See `AUTH_SETUP.md`
- **Testing**: See `TESTING_GUIDE.md`

## License

MIT
