#!/bin/bash
# Deployment script for GCP Cloud Run

set -e

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-"your-project-id"}
SERVICE_NAME="calix-backend"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying Calix Backend to Cloud Run"
echo "Project: ${PROJECT_ID}"
echo "Service: ${SERVICE_NAME}"
echo "Region: ${REGION}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it first."
    exit 1
fi

# Authenticate (if needed)
echo "🔐 Checking authentication..."
gcloud auth list

# Set project
echo "📋 Setting project..."
gcloud config set project ${PROJECT_ID}

# Build and push image
echo "🏗️  Building container image..."
gcloud builds submit --tag ${IMAGE_NAME}

# Deploy to Cloud Run
echo "🚢 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars "ENVIRONMENT=production,O5_MODEL_ID=o5-preview"

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')

echo ""
echo "✅ Deployment complete!"
echo "🌐 Service URL: ${SERVICE_URL}"
echo "📖 API Docs: ${SERVICE_URL}/docs"
echo ""
echo "⚠️  Don't forget to:"
echo "  1. Set up secrets in Secret Manager"
echo "  2. Update ALLOWED_ORIGINS environment variable"
echo "  3. Configure custom domain (optional)"
echo "  4. Set up monitoring and alerts"
