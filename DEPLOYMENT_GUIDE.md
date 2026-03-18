# Deployment Guide - Nakano Video Shogi Companion

## Overview
This guide provides comprehensive step-by-step instructions for deploying and administering the Nakano Video Shogi Companion application on AWS infrastructure.

## Architecture Overview

### Current Production Architecture
- **Frontend Hosting**: AWS Amplify (us-east-2, Ohio)
- **Backend Service**: AWS Lambda `Kitsunagi-shogi-turn-gen` (us-east-2, Ohio)
- **Secrets Storage**: AWS Secrets Manager (ap-northeast-1, Tokyo)
- **TURN/STUN Service**: Twilio (for WebRTC multiplayer)

### Cross-Region Design
The application uses a cross-region architecture where:
1. The Lambda function runs in **us-east-2 (Ohio)** for low latency to Amplify
2. Twilio credentials are stored in **ap-northeast-1 (Tokyo)** in Secrets Manager
3. The Lambda's IAM execution role has an **inline policy** granting cross-region `secretsmanager:GetSecretValue` access

This design allows centralized secret management in Tokyo while maintaining low-latency compute in Ohio.

## Prerequisites

Before deployment, ensure you have:
- ✅ AWS Account with appropriate permissions
- ✅ AWS CLI configured with administrator credentials
- ✅ Node.js 18.x+ and npm installed locally
- ✅ Twilio account with TURN credentials (for production multiplayer)
- ✅ Completed BUILD_AND_SETUP.md instructions
- ✅ Repository access and Git configured

---

## Part 1: AWS Secrets Manager Configuration (Tokyo Region)

### Overview
Twilio credentials are stored in AWS Secrets Manager in the **ap-northeast-1 (Tokyo)** region. These credentials enable the Lambda function to generate temporary TURN server credentials for WebRTC connectivity.

### Step 1: Access AWS Secrets Manager

1. Log in to the AWS Console
2. Switch to region **ap-northeast-1 (Tokyo)** using the region selector
3. Navigate to **Secrets Manager**
4. Locate the secret (e.g., `twilio/credentials` or similar name)

### Step 2: Update Twilio Credentials

#### Required Twilio Credentials Format

The secret must contain a JSON object with these exact keys:

```json
{
  "TWILIO_ACCOUNT_SID": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "TWILIO_AUTH_TOKEN": "your_auth_token_here",
  "TWILIO_API_KEY_SID": "SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

#### How to Obtain Twilio Credentials

1. **Log in to Twilio Console**: https://console.twilio.com/
2. **Get Account SID and Auth Token**:
   - From the Dashboard, copy your **Account SID** (starts with `AC`)
   - Copy your **Auth Token** (click "Show" if hidden)
3. **Create API Key**:
   - Navigate to **Account** → **API Keys & Tokens**
   - Click **Create API Key**
   - Choose "Standard" type
   - Name it (e.g., "Shogi-Companion-Production")
   - **IMPORTANT**: Save both the **SID** (starts with `SK`) and **Secret** immediately
   - The API Key SID goes into `TWILIO_API_KEY_SID`
   - The API Key Secret goes into `TWILIO_AUTH_TOKEN`

#### Update the Secret

**Option A: Using AWS Console**

1. In Secrets Manager, click on your secret
2. Click **Retrieve secret value**
3. Click **Edit**
4. Replace the JSON with your new credentials
5. Click **Save**

**Option B: Using AWS CLI**

```bash
# Set region to Tokyo
export AWS_REGION=ap-northeast-1

# Update the secret (replace SECRET_NAME with your actual secret name)
aws secretsmanager put-secret-value \
    --region ap-northeast-1 \
    --secret-id twilio/credentials \
    --secret-string '{
      "TWILIO_ACCOUNT_SID": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "TWILIO_AUTH_TOKEN": "your_auth_token_here",
      "TWILIO_API_KEY_SID": "SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    }'
```

### Step 3: Verify Secret Update

```bash
# Retrieve and verify the secret
aws secretsmanager get-secret-value \
    --region ap-northeast-1 \
    --secret-id twilio/credentials \
    --query SecretString \
    --output text | jq .
```

**Expected output**: Your JSON credentials formatted and readable.

### Security Best Practices

- ✅ **Never commit** Twilio credentials to Git
- ✅ **Rotate credentials** every 90 days
- ✅ Use **API Keys** instead of the main Auth Token when possible
- ✅ Enable **CloudWatch Logs** for secret access auditing
- ✅ Restrict IAM permissions to **only the Lambda execution role**

---

## Part 2: AWS Lambda Configuration (Ohio Region)

### Overview
The Lambda function `Kitsunagi-shogi-turn-gen` runs in **us-east-2 (Ohio)** and provides TURN server credentials via a public Function URL.

### Step 1: Access Lambda Function

1. Switch to region **us-east-2 (Ohio)** in AWS Console
2. Navigate to **Lambda**
3. Find and open function: `Kitsunagi-shogi-turn-gen`

### Step 2: Configure CORS (Critical for Security)

CORS must be configured to allow **only** your Amplify application origin.

#### Navigate to Function URL Configuration

1. In the Lambda function page, click the **Configuration** tab
2. Click **Function URL** in the left sidebar
3. Click **Edit**

#### Set CORS Configuration

Configure the following CORS settings:

```
Allowed Origins: https://your-amplify-app.amplifyapp.com
Allowed Methods: GET, POST, OPTIONS
Allowed Headers: Content-Type, X-Amz-Date, Authorization, X-Api-Key
Expose Headers: (leave empty or default)
Max Age: 86400
Allow Credentials: No
```

**IMPORTANT**: Replace `your-amplify-app.amplifyapp.com` with your actual Amplify domain.

#### Using AWS CLI

```bash
# Update CORS configuration
aws lambda update-function-url-config \
    --region us-east-2 \
    --function-name Kitsunagi-shogi-turn-gen \
    --cors '{
      "AllowOrigins": ["https://your-amplify-app.amplifyapp.com"],
      "AllowMethods": ["GET", "POST", "OPTIONS"],
      "AllowHeaders": ["Content-Type", "X-Amz-Date", "Authorization", "X-Api-Key"],
      "MaxAge": 86400,
      "AllowCredentials": false
    }'
```

### Step 3: Verify Function URL

1. In the Lambda function **Configuration** → **Function URL**
2. Copy the **Function URL** (format: `https://xxxxx.lambda-url.us-east-2.on.aws/`)
3. Verify:
   - Auth type: **NONE** (public access)
   - Invoke mode: **BUFFERED**
   - CORS: **Configured** with your Amplify origin

### Step 4: Test the Lambda Function

From your terminal:

```bash
# Test the Lambda function
curl -X POST https://your-lambda-url.lambda-url.us-east-2.on.aws/ \
  -H "Content-Type: application/json" \
  -H "Origin: https://your-amplify-app.amplifyapp.com"
```

**Expected response**: JSON with TURN server credentials:
```json
{
  "iceServers": [
    {
      "urls": ["turn:global.turn.twilio.com:3478?transport=udp"],
      "username": "...",
      "credential": "..."
    }
  ]
}
```

---

## Part 3: Cross-Region IAM Permissions

### Architecture Explanation

**Why cross-region?**
- **Lambda (Ohio)**: Close to Amplify for low latency
- **Secrets Manager (Tokyo)**: Centralized credential storage
- **IAM Bridge**: Inline policy allows Ohio Lambda to read Tokyo secrets

### Lambda Execution Role Configuration

#### Step 1: Find the Execution Role

1. In the Lambda function **Configuration** → **Permissions**
2. Note the **Execution role** name (e.g., `Kitsunagi-shogi-turn-gen-role`)
3. Click on the role name to open IAM

#### Step 2: Verify Inline Policy

The execution role should have an **inline policy** with cross-region permissions:

**Policy Name**: `CrossRegionSecretsAccess` (or similar)

**Policy Document**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:ap-northeast-1:YOUR_ACCOUNT_ID:secret:twilio/credentials-XXXXXX"
    }
  ]
}
```

**Key Points**:
- `ap-northeast-1`: Tokyo region (where secret is stored)
- `YOUR_ACCOUNT_ID`: Your AWS account ID
- The ARN must exactly match your secret's ARN

#### Step 3: Verify the Secret ARN

Get the exact ARN from Secrets Manager:

```bash
# In Tokyo region
aws secretsmanager describe-secret \
    --region ap-northeast-1 \
    --secret-id twilio/credentials \
    --query ARN \
    --output text
```

Copy this ARN and ensure it matches the IAM policy Resource field.

#### Step 4: Test Cross-Region Access

Test that the Lambda can retrieve the secret:

1. Go to Lambda **Test** tab
2. Create a test event (any JSON, e.g., `{}`)
3. Click **Test**
4. Check **CloudWatch Logs** for:
   - ✅ Successful secret retrieval from Tokyo
   - ✅ Twilio credentials loaded
   - ✅ TURN credentials generated

### Troubleshooting Cross-Region Access

**Error**: `AccessDeniedException`
- ✅ Verify the IAM policy Resource ARN exactly matches the secret ARN
- ✅ Check the Lambda execution role has the inline policy attached
- ✅ Ensure the region in the ARN is `ap-northeast-1`

**Error**: `ResourceNotFoundException`
- ✅ Verify the secret exists in Tokyo (`ap-northeast-1`)
- ✅ Check the secret name matches exactly

---

## Part 4: Frontend Deployment (AWS Amplify)

### Overview
The React frontend is deployed on **AWS Amplify** in **us-east-2 (Ohio)** with automatic CI/CD from your Git repository.

### Step 1: Initial Amplify Setup (One-Time)

1. Navigate to **AWS Amplify** in us-east-2
2. Click **New app** → **Host web app**
3. Connect your Git provider (GitHub, GitLab, etc.)
4. Select your repository and branch (e.g., `main`)
5. Configure build settings (Amplify will auto-detect Vite)

### Step 2: Configure Build Settings

Amplify should auto-detect, but verify `amplify.yml`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Step 3: Set Environment Variables

In Amplify Console → **App settings** → **Environment variables**:

```
VITE_TURN_LAMBDA_URL = https://your-lambda-url.lambda-url.us-east-2.on.aws/
```

**IMPORTANT**: After adding, redeploy the app for changes to take effect.

### Step 4: Deploy Application

#### Automatic Deployment
- Push to your configured branch (e.g., `main`)
- Amplify will automatically build and deploy

#### Manual Deployment
1. In Amplify Console, click your app
2. Click **Run build** or **Redeploy this version**
3. Monitor the build logs

### Step 5: Update Lambda CORS

After deployment, **update the Lambda CORS** to include your Amplify domain:

1. Get your Amplify URL (e.g., `https://main.d1234abcd.amplifyapp.com`)
2. Update Lambda CORS (see Part 2, Step 2)
3. Test multiplayer functionality

### Step 6: Verify Deployment

1. Visit your Amplify URL
2. Open browser DevTools → Console
3. Test multiplayer connection:
   - Click "Start Multiplayer"
   - Check Network tab for successful TURN credential fetch
   - Verify no CORS errors

---

## Part 5: Monitoring and Maintenance
5. Check browser console for errors

---

## Part 5: Monitoring and Maintenance

### CloudWatch Logs

#### Lambda Logs
Monitor Lambda execution in **us-east-2**:

```bash
# View recent Lambda logs
aws logs tail /aws/lambda/Kitsunagi-shogi-turn-gen \
    --region us-east-2 \
    --follow
```

Watch for:
- TURN credential generation requests
- Secret retrieval success/failures
- CORS errors
- Twilio API errors

#### Amplify Build Logs
1. Amplify Console → Your App → **Build logs**
2. Check for build failures, dependency issues, or environment variable problems

### Secret Rotation Schedule

**Recommended**: Rotate Twilio credentials every **90 days**

1. Create new Twilio API Key
2. Update secret in Tokyo Secrets Manager (Part 1, Step 2)
3. Lambda will automatically use new credentials (no restart needed)
4. Delete old Twilio API Key after verification

### Cost Monitoring

Key cost factors:
- **Amplify**: Build minutes + hosting (usually < $5/month for small apps)
- **Lambda**: Invocations (100,000 free/month, then $0.20 per 1M)
- **Secrets Manager**: $0.40/secret/month + $0.05 per 10,000 API calls
- **Twilio**: TURN usage (pay-as-you-go TURN relay traffic)

### Health Checks

**Weekly checks**:
```bash
# 1. Test Lambda endpoint
curl -X POST https://your-lambda-url.lambda-url.us-east-2.on.aws/

# 2. Verify app loads
curl -I https://your-amplify-app.amplifyapp.com

# 3. Check secret expiration
aws secretsmanager describe-secret \
    --region ap-northeast-1 \
    --secret-id twilio/credentials
```

---

## Part 6: Troubleshooting

### Issue: CORS Errors in Browser

**Symptom**: Console shows `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution**:
1. Verify Lambda CORS configuration includes exact Amplify origin
2. Ensure no trailing slash in Allowed Origins
3. Check browser DevTools → Network → Response headers for `access-control-allow-origin`

### Issue: "Access Denied" When Fetching Secret

**Symptom**: Lambda logs show `AccessDeniedException` for Secrets Manager

**Solution**:
1. Verify IAM inline policy ARN exactly matches secret ARN (Part 3)
2. Check the policy is attached to the Lambda execution role
3. Ensure region in ARN is `ap-northeast-1`

### Issue: Invalid TURN Credentials

**Symptom**: Multiplayer fails, TURN credentials rejected by Twilio

**Solution**:
1. Verify Twilio credentials in Tokyo secret are correct and current
2. Check `TWILIO_ACCOUNT_SID` starts with `AC`
3. Check `TWILIO_API_KEY_SID` starts with `SK`
4. Ensure API Key is not expired or deleted in Twilio Console

### Issue: Amplify Build Failures

**Symptom**: Amplify deployment fails during build

**Solution**:
1. Check Build logs for specific error
2. Verify `package.json` and `package-lock.json` are committed
3. Ensure environment variables are set correctly
4. Try clearing cache: Amplify Console → App → Actions → Clear cache and redeploy

### Issue: Lambda Function Not Found

**Symptom**: 404 error when calling Function URL

**Solution**:
1. Verify Function URL is enabled and copied correctly
2. Check region is us-east-2
3. Ensure Function URL auth type is NONE

---

## Part 7: Rollback Procedures

### Rollback Frontend (Amplify)

1. Amplify Console → Your App → **Build history**
2. Find the last working deployment
3. Click the **...** menu → **Redeploy this version**

### Rollback Lambda Code

Deploy the previous Lambda version:

```bash
# List versions
aws lambda list-versions-by-function \
    --region us-east-2 \
    --function-name Kitsunagi-shogi-turn-gen

# Update function to use specific version
aws lambda update-alias \
    --region us-east-2 \
    --function-name Kitsunagi-shogi-turn-gen \
    --name LIVE \
    --function-version <previous-version-number>
```

### Rollback Secrets

1. AWS Secrets Manager → Your secret → **Retrieve secret value**
2. Click **Previous versions** tab
3. Find the previous version ID
4. Click **Set as current**

---

## Part 8: Security Hardening

### Lambda Function URL

✅ **Current**: Auth type NONE (public access)
✅ **Secured by**: CORS restricting to Amplify origin only
❌ **Not recommended**: Adding IAM auth (would require SigV4 signing in browser)

### Secrets Manager

- Enable **automatic rotation** for Twilio credentials (optional, advanced)
- Enable **CloudTrail logging** for secret access audit
- Set up **CloudWatch alarms** for unauthorized access attempts

### IAM Least Privilege

Ensure Lambda execution role has **only** these permissions:
1. Basic Lambda execution (CloudWatch Logs)
2. Secrets Manager GetSecretValue for **one specific secret ARN**

### Network Security

- Lambda runs in **default VPC** (no VPC required for this use case)
- Secrets Manager access over AWS private network
- No public IPs or security groups needed

---

## Part 9: Quick Reference Commands

### Update Twilio Secret (Tokyo)
```bash
aws secretsmanager put-secret-value \
    --region ap-northeast-1 \
    --secret-id twilio/credentials \
    --secret-string '{...}'
```

### View Lambda Logs (Ohio)
```bash
aws logs tail /aws/lambda/Kitsunagi-shogi-turn-gen \
    --region us-east-2 \
    --follow
```

### Test Lambda Function
```bash
curl -X POST https://your-lambda-url.lambda-url.us-east-2.on.aws/ \
  -H "Origin: https://your-amplify-app.amplifyapp.com"
```

### Trigger Amplify Deployment
```bash
git commit -am "Update app"
git push origin main
```

### Get Secret ARN
```bash
aws secretsmanager describe-secret \
    --region ap-northeast-1 \
    --secret-id twilio/credentials \
    --query ARN
```

---

## Summary

### Architecture at a Glance
```
Frontend (Amplify, Ohio)
    ↓ HTTPS Request
Lambda (Ohio)
    ↓ Cross-Region IAM Policy
Secrets Manager (Tokyo)
    ↓ Returns Twilio Credentials
Lambda generates TURN credentials
    ↓ JSON Response
Frontend establishes WebRTC connection via Twilio TURN servers
```

### Administrator Checklist

**Initial Setup**:
- [ ] Twilio account created
- [ ] Credentials stored in Tokyo Secrets Manager
- [ ] Lambda deployed in Ohio with Function URL
- [ ] Cross-region IAM policy configured
- [ ] CORS configured for Amplify origin
- [ ] Amplify app deployed and connected to Git

**Ongoing Maintenance**:
- [ ] Rotate Twilio credentials every 90 days
- [ ] Monitor CloudWatch Logs weekly
- [ ] Check Twilio usage and costs monthly
- [ ] Test multiplayer functionality after each deployment
- [ ] Review and update CORS origins as needed

**Emergency Contacts**:
- AWS Support: https://console.aws.amazon.com/support
- Twilio Support: https://support.twilio.com
- Application logs: CloudWatch in us-east-2

---

## iPad Setup and Configuration

### Device Requirements
- **Device**: iPad (any model supporting iOS 13+)
- **iOS Version**: iOS 13.0 or later (iOS 15+ recommended)
- **Browser**: Safari (default)
- **Network**: WiFi connection required for initial setup

### iPad Configuration Steps

#### Step 1: Initial Access

1. Open Safari on the iPad
2. Navigate to your Amplify application URL: `https://your-amplify-app.amplifyapp.com`
3. Wait for the application to fully load
4. Test touch interactions to ensure everything works

#### Step 2: Add to Home Screen (Critical for Kiosk Mode)

This makes the app behave like a native application:

1. Tap the **Share** button (square with arrow pointing up) in Safari
2. Scroll down and tap **"Add to Home Screen"**
3. Edit the name if desired (default: "Nakano Video")
4. Tap **"Add"** in the top right

**Result**: The application will now:
- Appear as an icon on the home screen
- Launch in fullscreen without Safari UI
- Behave like a standalone app
- Stay active without Safari interruptions

#### Step 3: Configure Display Settings

**Enable Guided Access** (Optional - for kiosk/dedicated iPad):

1. Go to **Settings** → **Accessibility** → **Guided Access**
2. Enable **Guided Access**
3. Set a passcode
4. Launch the app from home screen
5. Triple-click the side/home button
6. Tap **Start** to lock the iPad to this app

This prevents users from:
- Exiting the application
- Accessing other apps
- Using iPad controls

To exit Guided Access: Triple-click and enter passcode.

**Disable Auto-Lock**:

1. Go to **Settings** → **Display & Brightness** → **Auto-Lock**
2. Set to **"Never"**
3. Keeps the screen always on during use

**Adjust Screen Brightness**:

1. Go to **Settings** → **Display & Brightness**
2. Disable **"True Tone"** (optional - for consistent colors)
3. Set brightness to 75-85% for optimal viewing

#### Step 4: Network Configuration

**For production environment**:

1. Connect iPad to stable WiFi network
2. Go to **Settings** → **Wi-Fi** → Tap (i) next to network
3. Configure:
   - **Auto-Join**: ON
   - **Low Data Mode**: OFF
4. Test connection stability

**For offline/intermittent connectivity**:

The application uses service workers (if configured) for offline functionality. Ensure initial load is complete before going offline.

#### Step 5: Sound Configuration

1. Enable sound in iPad settings:
   - **Settings** → **Sounds & Haptics**
   - Adjust **Ringer and Alerts** volume
2. Test in-app sound effects:
   - Piece moves should produce sound
   - Capture sounds should play
   - Check audio works in silent mode (use side switch)

**Troubleshooting Sound**:
- Check mute switch on side of iPad
- Verify volume is not at 0
- Test with other apps to confirm iPad audio works
- In Safari settings, ensure site can autoplay audio

#### Step 6: Clear Cache and Reload

To ensure latest version is loaded:

1. Open Settings → Safari
2. Tap **"Clear History and Website Data"**
3. Confirm
4. Relaunch app from home screen

**Or** (if already on home screen):
1. Long press the app icon
2. Remove from home screen
3. Re-add using Steps 1-2 above

### Web App Manifest Configuration

The application should include a `manifest.json` for better PWA support:

```json
{
  "name": "Nakano Video Shogi Companion",
  "short_name": "Shogi",
  "description": "Professional shogi game companion and analysis tool",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "orientation": "landscape",
  "icons": [
    {
      "src": "/images/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/images/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Add to `index.html`:
```html
<link rel="manifest" href="/manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Shogi">
<link rel="apple-touch-icon" href="/images/apple-touch-icon.png">
```

## Testing Checklist

### Pre-Deployment Testing
- [ ] Build completes without errors
- [ ] All assets are present in dist/
- [ ] Application runs correctly with `npm run preview`
- [ ] No console errors in browser
- [ ] All pages/routes work
- [ ] Forms submit correctly
- [ ] Multiplayer connection works (if applicable)

### Post-Deployment Testing
- [ ] Application loads at production URL
- [ ] HTTPS is enforced (http:// redirects to https://)
- [ ] All images and assets load
- [ ] Board interactions work correctly
- [ ] Sound effects play
- [ ] Responsive design works on different screen sizes
- [ ] No mixed content warnings
- [ ] Service worker registers (if applicable)

### iPad-Specific Testing
- [ ] Application loads in Safari on iPad
- [ ] Touch interactions work smoothly
- [ ] Drag and drop for pieces works
- [ ] Home screen icon appears correctly
- [ ] Fullscreen mode activates when launched from home screen
- [ ] Orientation locks to landscape (if configured)
- [ ] Sound works on iPad
- [ ] Application persists state correctly
- [ ] No scrolling/zooming issues
- [ ] Performance is smooth (60fps target)

## Deployment Automation

### Create Deployment Script

Create `deploy.sh` in project root:

```bash
#!/bin/bash

# Deployment script for Nakano Video Shogi Companion

set -e  # Exit on error

# Configuration
BUCKET_NAME="your-bucket-name"
DISTRIBUTION_ID="your-cloudfront-distribution-id"
BUILD_DIR="dist"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 Starting deployment process..."

# Step 1: Clean and build
echo "📦 Building application..."
rm -rf ${BUILD_DIR}
npm run build

if [ ! -d "${BUILD_DIR}" ]; then
    echo -e "${RED}❌ Build failed - dist directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed${NC}"

# Step 2: Upload to S3
echo "☁️  Uploading to S3..."

# Upload assets with long cache
aws s3 sync ${BUILD_DIR}/ s3://${BUCKET_NAME}/ \
    --delete \
    --cache-control "max-age=31536000,public,immutable" \
    --exclude "index.html" \
    --exclude "robots.txt"

# Upload index.html with no-cache
aws s3 cp ${BUILD_DIR}/index.html s3://${BUCKET_NAME}/index.html \
    --cache-control "no-cache,no-store,must-revalidate" \
    --content-type "text/html"

echo -e "${GREEN}✅ Files uploaded to S3${NC}"

# Step 3: Invalidate CloudFront
echo "🔄 Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id ${DISTRIBUTION_ID} \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo "⏳ Waiting for invalidation ${INVALIDATION_ID}..."
aws cloudfront wait invalidation-completed \
    --distribution-id ${DISTRIBUTION_ID} \
    --id ${INVALIDATION_ID}

echo -e "${GREEN}✅ CloudFront cache invalidated${NC}"

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo "🌐 Application URL: https://your-domain.com"
```

Make it executable:
```bash
chmod +x deploy.sh
```

Run deployment:
```bash
./deploy.sh
```

### GitHub Actions CI/CD (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
        
    - name: Deploy to S3
      run: |
        aws s3 sync dist/ s3://${{ secrets.S3_BUCKET }}/ --delete
        
    - name: Invalidate CloudFront
      run: |
        aws cloudfront create-invalidation \
          --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
          --paths "/*"
```

## Rollback Procedure

If deployment causes issues:

### Quick Rollback (S3 Versioning)

```bash
# List previous versions
aws s3api list-object-versions \
    --bucket ${BUCKET_NAME} \
    --prefix "index.html"

# Restore specific version
aws s3api copy-object \
    --bucket ${BUCKET_NAME} \
    --copy-source ${BUCKET_NAME}/index.html?versionId=VERSION_ID \
    --key index.html

# Invalidate CloudFront
aws cloudfront create-invalidation \
    --distribution-id ${DISTRIBUTION_ID} \
    --paths "/*"
```

### Full Rollback (Git)

```bash
# Find last working commit
git log --oneline

# Checkout previous version
git checkout <commit-hash>

# Rebuild and redeploy
npm run build
./deploy.sh
```

## Monitoring and Maintenance

### Check Deployment Status

```bash
# Check S3 sync status
aws s3 ls s3://${BUCKET_NAME}/ --recursive

# Check CloudFront distribution status
aws cloudfront get-distribution --id ${DISTRIBUTION_ID}

# Check recent CloudFront logs
aws s3 ls s3://your-cloudfront-logs-bucket/ | tail -20
```

### Update Frequency

Recommended deployment schedule:
- **Critical bugs**: Immediate deployment
- **New features**: Weekly deployment
- **Dependency updates**: Monthly
- **Security patches**: Within 24 hours

## Troubleshooting Deployment Issues

See TROUBLESHOOTING.md for detailed solutions to common deployment problems.

### Quick Checks

1. **App not loading**: Check CloudFront distribution status
2. **Old version showing**: Create CloudFront invalidation
3. **CORS errors**: Check S3 bucket CORS configuration
4. **Assets not loading**: Verify all files uploaded to S3
5. **iPad not updating**: Clear Safari cache on iPad

## Documentation Handover

Ensure the following are documented for the maintenance team:

- [ ] AWS account credentials (secure vault)
- [ ] S3 bucket name and region
- [ ] CloudFront distribution ID
- [ ] Domain name and DNS configuration
- [ ] Deployment automation scripts location
- [ ] Rollback procedure tested and documented
- [ ] iPad device IDs and configuration
- [ ] Contact information for troubleshooting

## Support Contacts

- **AWS Support**: [AWS Support Portal]
- **DNS Provider**: [DNS Provider Support]
- **Development Team**: [Contact Information]
- **Operations Team**: [Contact Information]

---

**Last Updated**: February 2, 2026  
**Deployment Version**: 0.0.0  
**Next Review**: March 2, 2026  
**Maintained By**: [To be assigned during handover]
