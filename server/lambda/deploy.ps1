# ============================================================
# AWS Lambda Deployment Script (PowerShell)
# ============================================================
# Usage: .\deploy.ps1
# Prerequisites: AWS CLI configured with credentials
# ============================================================

$ErrorActionPreference = "Stop"

# Configuration
$FUNCTION_NAME = "shogi-turn-token-server"
$ROLE_NAME = "shogi-turn-lambda-role"
$API_NAME = "shogi-turn-api"
$RUNTIME = "nodejs20.x"
$HANDLER = "index.handler"
$MEMORY = 256
$TIMEOUT = 30

# Twilio credentials (read from .env in project root)
$ENV_FILE = "..\..\..\.env"
if (Test-Path $ENV_FILE) {
    Get-Content $ENV_FILE | ForEach-Object {
        if ($_ -match '^([^=]+)=(.+)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Variable -Name $key -Value $value
        }
    }
}

if (-not $TWILIO_ACCOUNT_SID -or -not $TWILIO_AUTH_TOKEN) {
    Write-Host "❌ Error: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN not found in .env" -ForegroundColor Red
    exit 1
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "AWS Lambda Deployment - TURN Token Server" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Package Lambda
Write-Host "📦 Step 1: Packaging Lambda function..." -ForegroundColor Yellow
if (Test-Path "turn-lambda.zip") {
    Remove-Item "turn-lambda.zip" -Force
}

npm install --omit=dev
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Compress-Archive -Path index.mjs,package.json,package-lock.json,node_modules -DestinationPath turn-lambda.zip -Force
Write-Host "✅ Package created: turn-lambda.zip" -ForegroundColor Green
Write-Host ""

# Step 2: Get AWS Account ID
Write-Host "🔍 Step 2: Getting AWS Account ID..." -ForegroundColor Yellow
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Failed to get AWS Account ID. Is AWS CLI configured?" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Account ID: $ACCOUNT_ID" -ForegroundColor Green
Write-Host ""

# Step 3: Create or verify IAM role
Write-Host "👤 Step 3: Setting up IAM role..." -ForegroundColor Yellow
$roleExists = aws iam get-role --role-name $ROLE_NAME 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ IAM role already exists: $ROLE_NAME" -ForegroundColor Green
} else {
    Write-Host "Creating IAM role..." -ForegroundColor Cyan
    
    $trustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
"@
    
    aws iam create-role --role-name $ROLE_NAME --assume-role-policy-document $trustPolicy | Out-Null
    
    aws iam attach-role-policy `
        --role-name $ROLE_NAME `
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole | Out-Null
    
    Write-Host "✅ IAM role created: $ROLE_NAME" -ForegroundColor Green
    Write-Host "⏳ Waiting 10 seconds for IAM propagation..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
}
Write-Host ""

# Step 4: Create or update Lambda function
Write-Host "🚀 Step 4: Deploying Lambda function..." -ForegroundColor Yellow
$lambdaExists = aws lambda get-function --function-name $FUNCTION_NAME 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Updating existing Lambda function..." -ForegroundColor Cyan
    
    aws lambda update-function-code `
        --function-name $FUNCTION_NAME `
        --zip-file fileb://turn-lambda.zip | Out-Null
    
    aws lambda update-function-configuration `
        --function-name $FUNCTION_NAME `
        --environment "Variables={TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN,TURN_TOKEN_TTL=3600}" | Out-Null
    
    Write-Host "✅ Lambda function updated: $FUNCTION_NAME" -ForegroundColor Green
} else {
    Write-Host "Creating new Lambda function..." -ForegroundColor Cyan
    
    aws lambda create-function `
        --function-name $FUNCTION_NAME `
        --runtime $RUNTIME `
        --role "arn:aws:iam::${ACCOUNT_ID}:role/$ROLE_NAME" `
        --handler $HANDLER `
        --zip-file fileb://turn-lambda.zip `
        --timeout $TIMEOUT `
        --memory-size $MEMORY `
        --environment "Variables={TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN,TURN_TOKEN_TTL=3600}" | Out-Null
    
    Write-Host "✅ Lambda function created: $FUNCTION_NAME" -ForegroundColor Green
}
Write-Host ""

# Step 5: Create or get API Gateway
Write-Host "🌐 Step 5: Setting up API Gateway..." -ForegroundColor Yellow
$apiList = aws apigatewayv2 get-apis --query "Items[?Name=='$API_NAME'].ApiId" --output text
if ($apiList) {
    $API_ID = $apiList
    Write-Host "✅ API Gateway already exists: $API_ID" -ForegroundColor Green
} else {
    Write-Host "Creating API Gateway..." -ForegroundColor Cyan
    
    $apiOutput = aws apigatewayv2 create-api `
        --name $API_NAME `
        --protocol-type HTTP `
        --target "arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:$FUNCTION_NAME" | ConvertFrom-Json
    
    $API_ID = $apiOutput.ApiId
    $API_ENDPOINT = $apiOutput.ApiEndpoint
    
    Write-Host "✅ API Gateway created: $API_ID" -ForegroundColor Green
}

# Get API endpoint
$API_ENDPOINT = (aws apigatewayv2 get-api --api-id $API_ID --query ApiEndpoint --output text)
Write-Host ""

# Step 6: Grant API Gateway permissions
Write-Host "🔐 Step 6: Granting API Gateway permissions..." -ForegroundColor Yellow
$permExists = aws lambda get-policy --function-name $FUNCTION_NAME 2>&1 | Select-String "apigateway-invoke"
if (-not $permExists) {
    aws lambda add-permission `
        --function-name $FUNCTION_NAME `
        --statement-id apigateway-invoke `
        --action lambda:InvokeFunction `
        --principal apigatewayv2.amazonaws.com `
        --source-arn "arn:aws:execute-api:us-east-1:${ACCOUNT_ID}:${API_ID}/*" | Out-Null
    
    Write-Host "✅ Permissions granted" -ForegroundColor Green
} else {
    Write-Host "✅ Permissions already exist" -ForegroundColor Green
}
Write-Host ""

# Step 7: Test endpoints
Write-Host "🧪 Step 7: Testing endpoints..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Testing health check..." -ForegroundColor Cyan
$healthResponse = Invoke-RestMethod -Uri "$API_ENDPOINT/api/health" -Method Get
Write-Host "Health: $($healthResponse.status)" -ForegroundColor Green
Write-Host ""

Write-Host "Testing TURN credentials..." -ForegroundColor Cyan
$turnResponse = Invoke-RestMethod -Uri "$API_ENDPOINT/api/turn-credentials" -Method Get
Write-Host "ICE Servers: $($turnResponse.iceServers.Count)" -ForegroundColor Green
Write-Host "TTL: $($turnResponse.ttl) seconds" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Endpoint: $API_ENDPOINT" -ForegroundColor White
Write-Host ""
Write-Host "Test URLs:" -ForegroundColor Yellow
Write-Host "  Health:      $API_ENDPOINT/api/health" -ForegroundColor White
Write-Host "  TURN Tokens: $API_ENDPOINT/api/turn-credentials" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Add this endpoint as an origin in CloudFront" -ForegroundColor White
Write-Host "  2. Create a behavior for /api/* pointing to the API Gateway origin" -ForegroundColor White
Write-Host "  3. Test: curl https://your-domain.com/api/turn-credentials" -ForegroundColor White
Write-Host ""
