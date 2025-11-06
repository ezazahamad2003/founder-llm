# PowerShell deployment script for GCP Cloud Run
# Run this script to deploy the backend to Google Cloud Platform

$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ID = "agentops-477011"
$SERVICE_NAME = "scopic-legal-backend"
$REGION = "us-central1"
$IMAGE_NAME = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

Write-Host "Deploying Scopic Legal Backend to Cloud Run" -ForegroundColor Cyan
Write-Host "Project: $PROJECT_ID" -ForegroundColor Yellow
Write-Host "Service: $SERVICE_NAME" -ForegroundColor Yellow
Write-Host "Region: $REGION" -ForegroundColor Yellow
Write-Host ""

# Check if gcloud is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: gcloud CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "Download from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Set project
Write-Host "Setting project..." -ForegroundColor Cyan
gcloud config set project $PROJECT_ID

# Check authentication
Write-Host "Checking authentication..." -ForegroundColor Cyan
gcloud auth list

Write-Host ""
Write-Host "IMPORTANT: Make sure you have created the following secrets in GCP Secret Manager:" -ForegroundColor Yellow
Write-Host "  1. supabase-service-role-key" -ForegroundColor White
Write-Host "  2. openai-api-key" -ForegroundColor White
Write-Host "  3. admin-token" -ForegroundColor White
Write-Host ""
$continue = Read-Host "Have you created these secrets? (y/n)"
if ($continue -ne "y") {
    Write-Host "Please create the secrets first. See instructions below." -ForegroundColor Yellow
    exit 0
}

# Build and push image
Write-Host ""
Write-Host "Building container image..." -ForegroundColor Cyan
gcloud builds submit --tag $IMAGE_NAME

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Deploy to Cloud Run
Write-Host ""
Write-Host "Deploying to Cloud Run..." -ForegroundColor Cyan
gcloud run deploy $SERVICE_NAME `
  --image $IMAGE_NAME `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --memory 1Gi `
  --cpu 1 `
  --timeout 300 `
  --max-instances 10 `
  --set-env-vars "ENVIRONMENT=production" `
  --set-env-vars "MODEL_ID=gpt-5" `
  --set-env-vars "SUPABASE_URL=https://yxjboezofmbuebiuzqej.supabase.co" `
  --set-env-vars "BUCKET_LEGAL=legal-docs" `
  --set-env-vars "BUCKET_IMAGES=images" `
  --set-env-vars "ALLOWED_ORIGINS=*" `
  --set-secrets "SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest,OPENAI_API_KEY=openai-api-key:latest,ADMIN_TOKEN=admin-token:latest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

# Get service URL
Write-Host ""
Write-Host "Getting service URL..." -ForegroundColor Cyan
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Service URL: $SERVICE_URL" -ForegroundColor Cyan
Write-Host "API Docs: $SERVICE_URL/docs" -ForegroundColor Cyan
Write-Host "Health Check: $SERVICE_URL/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Update ALLOWED_ORIGINS with your Vercel frontend URL" -ForegroundColor White
Write-Host "  2. Update frontend NEXT_PUBLIC_API_URL to: $SERVICE_URL" -ForegroundColor White
Write-Host "  3. Test the API endpoints" -ForegroundColor White
Write-Host "  4. Set up monitoring and alerts" -ForegroundColor White
Write-Host ""
