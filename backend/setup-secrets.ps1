# PowerShell script to create GCP secrets
# Run this BEFORE deploying to Cloud Run

$ErrorActionPreference = "Stop"
$PROJECT_ID = "agentops-477011"

Write-Host "Setting up GCP Secret Manager secrets" -ForegroundColor Cyan
Write-Host "Project: $PROJECT_ID" -ForegroundColor Yellow
Write-Host ""

# Set project
gcloud config set project $PROJECT_ID

# Load .env file
if (-not (Test-Path ".env")) {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Reading .env file..." -ForegroundColor Cyan
$envContent = Get-Content ".env" -Raw

# Extract values
$SUPABASE_KEY = ($envContent | Select-String -Pattern 'SUPABASE_SERVICE_ROLE_KEY=(.+)' -AllMatches).Matches.Groups[1].Value.Trim()
$OPENAI_KEY = ($envContent | Select-String -Pattern 'OPENAI_API_KEY=(.+)' -AllMatches).Matches.Groups[1].Value.Trim()
$ADMIN_TOKEN = ($envContent | Select-String -Pattern 'ADMIN_TOKEN=(.+)' -AllMatches).Matches.Groups[1].Value.Trim()

if (-not $SUPABASE_KEY -or -not $OPENAI_KEY -or -not $ADMIN_TOKEN) {
    Write-Host "Error: Could not extract all required values from .env file" -ForegroundColor Red
    exit 1
}

Write-Host "Extracted environment variables successfully" -ForegroundColor Green
Write-Host ""

# Function to create or update secret
function Set-GCPSecret {
    param (
        [string]$SecretName,
        [string]$SecretValue
    )
    
    Write-Host "Creating secret: $SecretName..." -ForegroundColor Cyan
    
    # Check if secret exists
    $secretExists = gcloud secrets describe $SecretName 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Secret exists, adding new version..." -ForegroundColor Yellow
        echo $SecretValue | gcloud secrets versions add $SecretName --data-file=-
    } else {
        Write-Host "  Creating new secret..." -ForegroundColor Yellow
        echo $SecretValue | gcloud secrets create $SecretName --data-file=- --replication-policy="automatic"
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Success!" -ForegroundColor Green
    } else {
        Write-Host "  Failed!" -ForegroundColor Red
    }
}

# Create secrets
Write-Host "Creating/updating secrets..." -ForegroundColor Cyan
Write-Host ""

Set-GCPSecret -SecretName "supabase-service-role-key" -SecretValue $SUPABASE_KEY
Set-GCPSecret -SecretName "openai-api-key" -SecretValue $OPENAI_KEY
Set-GCPSecret -SecretName "admin-token" -SecretValue $ADMIN_TOKEN

Write-Host ""
Write-Host "All secrets created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run the deploy-gcp.ps1 script" -ForegroundColor Cyan
Write-Host ""
