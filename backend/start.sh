#!/bin/bash
# Quick start script for local development

echo "🚀 Starting Calix Backend..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.sample..."
    cp .env.sample .env
    echo "📝 Please edit .env with your credentials before running again."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Run the server
echo "✅ Starting server on http://localhost:8080"
echo "📖 API docs available at http://localhost:8080/docs"
uvicorn app.main:app --reload --port 8080
