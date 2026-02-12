# AWS Infrastructure Guide - Nakano Video Shogi Companion

## Current AWS Configuration Overview

This document describes the AWS infrastructure setup for hosting the Nakano Video Shogi Companion application.

## Architecture Overview

### Deployment Model
The application is a **static single-page application (SPA)** built with React and Vite. It can be deployed as static files to various AWS services.

### Recommended AWS Services

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet Users                        │
│                        (iPad Clients)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Amazon CloudFront                         │
│                   (CDN & SSL/TLS)                           │
│  - Caches static assets globally                           │
│  - Provides HTTPS with ACM certificate                     │
│  - DDoS protection with AWS Shield                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Amazon S3 Bucket                         │
│              (Static Website Hosting)                       │
│  - Stores all built files (HTML, JS, CSS, assets)         │
│  - Configured for static website hosting                   │
│  - Private bucket (accessed only via CloudFront)           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Amazon Route 53                          │
│                  (DNS Management)                           │
│  - Manages domain name                                     │
│  - Points to CloudFront distribution                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              AWS Certificate Manager (ACM)                  │
│  - Provides SSL/TLS certificate                            │
│  - Auto-renewal enabled                                    │
└─────────────────────────────────────────────────────────────┘
```

### Backend API Architecture (TURN Token Server)

The application requires a backend to generate ephemeral TURN credentials. The recommended architecture uses serverless AWS Lambda + API Gateway:

```
┌──────────────────────────────────────────────────────────────┐
│                      CloudFront                              │
│                                                              │
│  ┌────────────────────┐       ┌──────────────────────┐     │
│  │  /* → S3 Origin    │       │  /api/* → API Gateway│     │
│  │  (Static SPA)      │       │  (Lambda Backend)    │     │
│  └────────────────────┘       └──────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
           │                                │
           ▼                                ▼
    ┌────────────┐                  ┌──────────────┐
    │ S3 Bucket  │                  │ API Gateway  │
    │ (Frontend) │                  │ REST API     │
    └────────────┘                  └──────┬───────┘
                                           │
                                           ▼
                                   ┌───────────────┐
                                   │ AWS Lambda    │
                                   │ (Node.js)     │
                                   │               │
                                   │ Env Vars:     │
                                   │ - TWILIO_SID  │
                                   │ - TWILIO_AUTH │
                                   └───────────────┘
```

**Key Points**:
- CloudFront routes `/api/*` to API Gateway (cache disabled for this path)
- Lambda function contains `server/turn-server.js` logic
- Twilio credentials stored in Lambda environment variables (encrypted at rest)
- Same domain for frontend + backend eliminates CORS issues

## Deployment Guide

### 1. Frontend Deployment (S3 + CloudFront)

#### Build the Application
```bash
npm run build
```

This creates a `dist/` folder with static files.

#### Upload to S3

**Bucket Name**: `nakano-video-shogi-companion` (example - use your actual bucket name)

**Bucket Settings**:
```json
{
  "Versioning": "Enabled",
  "BlockPublicAccess": {
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  },
  "ServerSideEncryption": "AES256",
  "StaticWebsiteHosting": {
    "Enabled": false,
    "Note": "Accessed via CloudFront OAI, not direct website hosting"
  }
}
```

**Bucket Policy** (allows CloudFront access):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAI",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity <YOUR_OAI_ID>"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::nakano-video-shogi-companion/*"
    }
  ]
}
```

### 2. CloudFront Distribution

**Distribution ID**: `<YOUR_DISTRIBUTION_ID>` (to be filled)

**Origin Settings**:
- **Origin Domain**: `nakano-video-shogi-companion.s3.amazonaws.com`
- **Origin Access**: Origin Access Identity (OAI)
- **Origin Protocol Policy**: HTTPS Only

**Cache Behavior**:
- **Viewer Protocol Policy**: Redirect HTTP to HTTPS
- **Allowed HTTP Methods**: GET, HEAD, OPTIONS
- **Cached HTTP Methods**: GET, HEAD, OPTIONS
- **Cache Policy**: CachingOptimized (recommended for static sites)
- **Compress Objects**: Yes (gzip/brotli)

**Custom Error Responses** (for SPA routing):
```
Error Code: 403, 404
Response Page Path: /index.html
Response Code: 200
TTL: 300 seconds
```

This ensures that React Router works properly by serving index.html for all routes.

**SSL/TLS Certificate**:
- **Certificate Manager**: ACM Certificate
- **Domain**: `your-domain.com`
- **SSL/TLS Minimum Version**: TLSv1.2

**Geographic Restrictions**: None (unless required)

**Price Class**: Use All Edge Locations (or Use Only North America and Europe for cost savings)

### 3. Route 53 (DNS)

**Hosted Zone**: `your-domain.com`

**Record Sets**:
```
Type: A (IPv4)
Name: your-domain.com
Alias: Yes
Alias Target: [CloudFront Distribution]
Routing Policy: Simple

Type: AAAA (IPv6)
Name: your-domain.com
Alias: Yes
Alias Target: [CloudFront Distribution]
Routing Policy: Simple
```

### 4. AWS Certificate Manager

**Certificate ARN**: `arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID`

**Domain Names**:
- `your-domain.com`
- `www.your-domain.com` (optional)

**Validation**: DNS validation (recommended)
**Auto-Renewal**: Enabled

**Important**: ACM certificates for CloudFront must be created in `us-east-1` region.

## Infrastructure Rebuild Procedure (From Scratch)

### Prerequisites
- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Domain name (if using custom domain)
- Built application files in `dist/` directory

### Step 1: Create S3 Bucket

```bash
# Set variables
export BUCKET_NAME="nakano-video-shogi-companion"
export REGION="us-east-1"

# Create bucket
aws s3 mb s3://${BUCKET_NAME} --region ${REGION}

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket ${BUCKET_NAME} \
    --versioning-configuration Status=Enabled

# Block all public access
aws s3api put-public-access-block \
    --bucket ${BUCKET_NAME} \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Enable server-side encryption
aws s3api put-bucket-encryption \
    --bucket ${BUCKET_NAME} \
    --server-side-encryption-configuration '{
      "Rules": [{
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }]
    }'
```

### Step 2: Create CloudFront Origin Access Identity

```bash
# Create OAI
aws cloudfront create-cloud-front-origin-access-identity \
    --cloud-front-origin-access-identity-config \
    CallerReference=$(date +%s),Comment="OAI for Nakano Video Shogi"

# Note the returned ID and use it in next steps
export OAI_ID="<returned-id>"
```

### Step 3: Update S3 Bucket Policy

Create a file `bucket-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAI",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity YOUR_OAI_ID"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::nakano-video-shogi-companion/*"
    }
  ]
}
```

Apply the policy:
```bash
aws s3api put-bucket-policy \
    --bucket ${BUCKET_NAME} \
    --policy file://bucket-policy.json
```

### Step 4: Request ACM Certificate (if using custom domain)

**Important**: Must be done in `us-east-1` region for CloudFront.

```bash
# Request certificate
aws acm request-certificate \
    --domain-name your-domain.com \
    --subject-alternative-names www.your-domain.com \
    --validation-method DNS \
    --region us-east-1

# Note the CertificateArn from output
export CERT_ARN="<returned-arn>"
```

Follow the email or DNS validation process to validate domain ownership.

### Step 5: Create CloudFront Distribution

Create a file `cloudfront-config.json` (simplified version):
```json
{
  "CallerReference": "nakano-video-shogi-2026",
  "Comment": "Nakano Video Shogi Companion",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-nakano-video-shogi-companion",
        "DomainName": "nakano-video-shogi-companion.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": "origin-access-identity/cloudfront/YOUR_OAI_ID"
        }
      }
    ]
  },
  "DefaultRootObject": "index.html",
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-nakano-video-shogi-companion",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 3,
      "Items": ["GET", "HEAD", "OPTIONS"]
    },
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": { "Forward": "none" }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      {
        "ErrorCode": 403,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      },
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "YOUR_CERT_ARN",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "Aliases": {
    "Quantity": 1,
    "Items": ["your-domain.com"]
  }
}
```

Create distribution:
```bash
aws cloudfront create-distribution \
    --distribution-config file://cloudfront-config.json
```

**Note**: For complete configuration, it's recommended to use AWS Console or Infrastructure as Code tools (Terraform, CloudFormation).

### Step 6: Configure Route 53

```bash
# Create hosted zone (if not exists)
aws route53 create-hosted-zone \
    --name your-domain.com \
    --caller-reference $(date +%s)

# Get hosted zone ID
export HOSTED_ZONE_ID="<your-zone-id>"

# Create record set pointing to CloudFront
# (Use AWS Console for easier alias record creation)
```

### Step 7: Deploy Application

```bash
# Build the application
npm run build

# Upload to S3
aws s3 sync dist/ s3://${BUCKET_NAME}/ \
    --delete \
    --cache-control "max-age=31536000,public" \
    --exclude "index.html"

# Upload index.html separately with no-cache
aws s3 cp dist/index.html s3://${BUCKET_NAME}/index.html \
    --cache-control "no-cache,no-store,must-revalidate"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
    --distribution-id ${DISTRIBUTION_ID} \
    --paths "/*"
```

## Infrastructure as Code (Alternative)

For reproducible infrastructure, consider using:

### Option 1: AWS CloudFormation

Create a `cloudformation-template.yaml` with all resources defined.

### Option 2: Terraform

Example structure:
```hcl
# main.tf
resource "aws_s3_bucket" "app" {
  bucket = "nakano-video-shogi-companion"
}

resource "aws_cloudfront_distribution" "app" {
  # ... configuration
}

resource "aws_route53_record" "app" {
  # ... configuration
}
```

### Option 3: AWS CDK

Use TypeScript to define infrastructure programmatically.

## Cost Estimation

### Monthly Costs (Approximate)

- **S3 Storage**: ~$0.023/GB/month
  - Estimate: 100MB = ~$0.002/month
  
- **S3 Requests**: $0.0004 per 1,000 GET requests
  - Estimate: 100,000 requests = ~$0.04/month
  
- **CloudFront**: 
  - Data Transfer: $0.085/GB (first 10TB)
  - Requests: $0.0075 per 10,000 HTTPS requests
  - Estimate: 100GB transfer + 1M requests = ~$9/month
  
- **Route 53**: $0.50/month per hosted zone + $0.40 per million queries
  - Estimate: ~$0.90/month

**Total Estimated Monthly Cost**: ~$10-15 for moderate traffic

**Cost Optimization Tips**:
- Use CloudFront Price Class to reduce costs
- Set appropriate cache TTLs to reduce origin requests
- Enable compression in CloudFront
- Monitor and delete old S3 versions if not needed

## Backend Deployment (TURN Token Server)

The TURN token server (`server/turn-server.js`) must be deployed to AWS to enable cross-network WebRTC connectivity. **Recommended approach: AWS Lambda + API Gateway (serverless)**.

### Option A: AWS Lambda + API Gateway (Recommended)

This is the most cost-effective and scalable approach for production.

#### Step 1: Prepare Lambda Deployment Package

```bash
# Create deployment directory
mkdir -p lambda-deploy
cd lambda-deploy

# Copy server code
cp ../server/turn-server.js handler.js

# Modify for Lambda (update the last few lines)
# Replace app.listen(...) with: module.exports.handler = async (event) => { ... }
```

Create `lambda-deploy/handler.js` (Lambda-compatible version):
```javascript
import 'dotenv/config';
import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TURN_TOKEN_TTL = parseInt(process.env.TURN_TOKEN_TTL || '3600', 10);

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set');
}

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export const handler = async (event) => {
  // Health check
  if (event.rawPath === '/api/health') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString() 
      }),
    };
  }

  // TURN credentials
  if (event.rawPath === '/api/turn-credentials' && event.requestContext.http.method === 'GET') {
    try {
      console.log('[LAMBDA] Generating ephemeral TURN token, TTL:', TURN_TOKEN_TTL);

      const token = await twilioClient.tokens.create({ ttl: TURN_TOKEN_TTL });

      const iceServers = token.iceServers.map((server) => {
        const entry = {};
        entry.urls = server.urls || server.url;
        if (server.username) entry.username = server.username;
        if (server.credential) entry.credential = server.credential;
        return entry;
      });

      console.log('[LAMBDA] Token generated, iceServers:', iceServers.length);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          iceServers,
          ttl: TURN_TOKEN_TTL,
          generatedAt: new Date().toISOString(),
        }),
      };
    } catch (error) {
      console.error('[LAMBDA] Failed to generate TURN token:', error.message);

      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Failed to generate TURN credentials',
          message: error.message,
        }),
      };
    }
  }

  // 404 for unknown paths
  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Not Found' }),
  };
};
```

```bash
# Install dependencies for Lambda
npm install --omit=dev

# Create deployment zip
zip -r ../turn-lambda.zip .
cd ..
```

#### Step 2: Create Lambda Function

```bash
# Create IAM role for Lambda
aws iam create-role \
  --role-name shogi-turn-lambda-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach basic execution policy
aws iam attach-role-policy \
  --role-name shogi-turn-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create Lambda function
aws lambda create-function \
  --function-name shogi-turn-token-server \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/shogi-turn-lambda-role \
  --handler handler.handler \
  --zip-file fileb://turn-lambda.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables="{
    TWILIO_ACCOUNT_SID=YOUR_TWILIO_SID,
    TWILIO_AUTH_TOKEN=YOUR_TWILIO_TOKEN,
    TURN_TOKEN_TTL=3600
  }"
```

#### Step 3: Create API Gateway

```bash
# Create HTTP API (v2)
aws apigatewayv2 create-api \
  --name shogi-turn-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:REGION:ACCOUNT_ID:function:shogi-turn-token-server

# Note the ApiEndpoint from output (e.g., https://abc123.execute-api.us-east-1.amazonaws.com)
export API_ID="<returned-api-id>"
export API_ENDPOINT="<returned-endpoint>"

# Grant API Gateway permission to invoke Lambda
aws lambda add-permission \
  --function-name shogi-turn-token-server \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigatewayv2.amazonaws.com \
  --source-arn "arn:aws:execute-api:REGION:ACCOUNT_ID:${API_ID}/*"
```

#### Step 4: Update CloudFront Distribution

Add a second origin (API Gateway) and behavior:

**Via AWS Console**:
1. Go to CloudFront → Distributions → Your Distribution → Edit
2. **Origins** tab → Create Origin:
   - **Origin Domain**: `abc123.execute-api.us-east-1.amazonaws.com`
   - **Protocol**: HTTPS only
   - **Origin Path**: (leave empty)
3. **Behaviors** tab → Create Behavior:
   - **Path Pattern**: `/api/*`
   - **Origin**: Select the API Gateway origin
   - **Viewer Protocol Policy**: Redirect HTTP to HTTPS
   - **Cache Policy**: Create custom policy or use `Managed-CachingDisabled`
   - **Origin Request Policy**: Create custom or use `Managed-AllViewer`
   - **Response Headers Policy**: (optional) `Managed-CORS-with-preflight`

**Via AWS CLI**:
```bash
# Get current distribution config
aws cloudfront get-distribution-config \
  --id YOUR_DISTRIBUTION_ID > cf-config.json

# Edit cf-config.json to add the API Gateway origin and /api/* behavior
# Then update:
aws cloudfront update-distribution \
  --id YOUR_DISTRIBUTION_ID \
  --if-match <ETag-from-get-command> \
  --distribution-config file://cf-config-updated.json
```

#### Final Step: Test

```bash
# Test via CloudFront (after propagation, ~15 minutes)
curl https://your-domain.com/api/health
curl https://your-domain.com/api/turn-credentials
```

### Option B: AWS Elastic Beanstalk (Alternative)

If you prefer a traditional Node.js server approach:

1. Install EB CLI: `pip install awsebcli`
2. Initialize: `eb init -p node.js shogi-turn-server`
3. Create environment: `eb create shogi-turn-prod`
4. Configure environment variables in EB Console
5. Deploy: `eb deploy`
6. Update CloudFront to use EB URL as `/api/*` origin

### Option C: AWS ECS Fargate (Container-based)

Deploy the Express server as a Docker container via Fargate. See AWS ECS documentation for details.

### Environment Variables in Lambda

**Critical**: Set these in Lambda environment variables (encrypted at rest by AWS):
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
- `TURN_TOKEN_TTL` - Token lifetime (default: 3600)

**Security Note**: Lambda encrypts environment variables at rest. For additional security, use AWS Secrets Manager:

```bash
# Store in Secrets Manager
aws secretsmanager create-secret \
  --name shogi/twilio-credentials \
  --secret-string '{"sid":"YOUR_SID","token":"YOUR_TOKEN"}'

# Grant Lambda permission to read secret (update IAM role)
# Then fetch in Lambda code using AWS SDK
```

### Cost Estimate (Lambda + API Gateway)

- **Lambda**: Free tier includes 1M requests/month + 400,000 GB-seconds
  - Beyond free tier: $0.20 per 1M requests
- **API Gateway (HTTP API)**: $1.00 per 1M requests (first 300M)
- **CloudFront**: Data transfer charges apply

For a low-to-moderate traffic app: **$0-5/month** for backend (within free tier)

## Monitoring and Alerts

### CloudWatch Alarms (Recommended)

1. **CloudFront 4xx/5xx Error Rate**
   - Alert if error rate > 5% for 5 minutes

2. **S3 Bucket Size**
   - Alert if size exceeds expected threshold

3. **CloudFront Data Transfer**
   - Alert on unusual traffic spikes

### Access Logs

Enable logging for troubleshooting:

**S3 Access Logs**:
```bash
aws s3api put-bucket-logging \
    --bucket ${BUCKET_NAME} \
    --bucket-logging-status file://logging-config.json
```

**CloudFront Access Logs**:
- Enable in CloudFront distribution settings
- Store in separate S3 bucket

## Security Best Practices

1. **S3 Bucket**:
   - ✅ Block all public access
   - ✅ Enable versioning
   - ✅ Enable server-side encryption
   - ✅ Use CloudFront OAI (not public bucket policy)

2. **CloudFront**:
   - ✅ Enforce HTTPS
   - ✅ Use latest TLS version (TLSv1.2+)
   - ✅ Enable AWS WAF (if needed for DDoS protection)
   - ✅ Set security headers (see DEPLOYMENT_GUIDE.md)

3. **Route 53**:
   - ✅ Enable DNSSEC (optional but recommended)
   - ✅ Use IAM roles to limit DNS modification permissions

4. **IAM**:
   - Create specific IAM user/role for deployments
   - Follow principle of least privilege

## Backup and Disaster Recovery

### S3 Versioning
Already enabled - allows rollback to previous versions.

### Cross-Region Replication (Optional)
For critical applications, replicate to another region:
```bash
aws s3api put-bucket-replication \
    --bucket ${BUCKET_NAME} \
    --replication-configuration file://replication-config.json
```

### CloudFormation Stack Exports
Export all infrastructure as CloudFormation template for disaster recovery.

## Troubleshooting Infrastructure Issues

See TROUBLESHOOTING.md for common infrastructure-related issues.

## Handover Checklist

- [ ] Document actual AWS account ID
- [ ] Document all resource IDs (bucket name, distribution ID, etc.)
- [ ] Provide IAM credentials or access method for deployment
- [ ] Document domain name and DNS configuration
- [ ] Export CloudFormation template or Terraform state
- [ ] Document any custom configurations not covered here
- [ ] Provide access to AWS Console
- [ ] Document monthly cost baseline
- [ ] Set up billing alerts

## Additional Resources

- [AWS S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [CloudFront with S3 Origin](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/GettingStarted.SimpleDistribution.html)
- [Route 53 Documentation](https://docs.aws.amazon.com/route53/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

---

**Last Updated**: February 2, 2026  
**Maintained By**: [To be assigned]  
**AWS Account**: [To be documented]
