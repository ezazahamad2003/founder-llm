# Simple script to create GCP secrets
$PROJECT_ID = "agentops-477011"

Write-Host "Creating GCP secrets for project: $PROJECT_ID" -ForegroundColor Cyan

# Read .env file
$envContent = Get-Content ".env" -Raw
$SUPABASE_KEY = ($envContent | Select-String -Pattern 'SUPABASE_SERVICE_ROLE_KEY=(.+)').Matches.Groups[1].Value.Trim()
$OPENAI_KEY = ($envContent | Select-String -Pattern 'OPENAI_API_KEY=(.+)').Matches.Groups[1].Value.Trim()
$ADMIN_TOKEN = ($envContent | Select-String -Pattern 'ADMIN_TOKEN=(.+)').Matches.Groups[1].Value.Trim()

Write-Host "Creating supabase-service-role-key..." -ForegroundColor Yellow
echo $SUPABASE_KEY | gcloud secrets create supabase-service-role-key --data-file=- --replication-policy="automatic" --project=$PROJECT_ID

Write-Host "Creating openai-api-key..." -ForegroundColor Yellow
echo $OPENAI_KEY | gcloud secrets create openai-api-key --data-file=- --replication-policy="automatic" --project=$PROJECT_ID

Write-Host "Creating admin-token..." -ForegroundColor Yellow
echo $ADMIN_TOKEN | gcloud secrets create admin-token --data-file=- --replication-policy="automatic" --project=$PROJECT_ID

Write-Host ""
Write-Host "Done! Secrets created successfully." -ForegroundColor Green
