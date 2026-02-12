# AWS Lambda Deployment - TURN Token Server

## Quick Deploy

### 1. Package the Lambda Function

```bash
cd server/lambda
npm install --omit=dev
zip -r turn-lambda.zip .
```

Or on Windows PowerShell:
```powershell
cd server\lambda
npm install --omit=dev
Compress-Archive -Path * -DestinationPath turn-lambda.zip -Force
```

### 2. Create IAM Role

```bash
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

aws iam attach-role-policy \
  --role-name shogi-turn-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

### 3. Create Lambda Function

```bash
aws lambda create-function \
  --function-name shogi-turn-token-server \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/shogi-turn-lambda-role \
  --handler index.handler \
  --zip-file fileb://turn-lambda.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables="{TWILIO_ACCOUNT_SID=AC27206d17c54a6bd95854b210ece03563,TWILIO_AUTH_TOKEN=4ce53e00bda7f5ff7b368da51599f317,TURN_TOKEN_TTL=3600}"
```

**⚠️ SECURITY**: In production, use AWS Secrets Manager instead of environment variables:

```bash
# Store credentials in Secrets Manager
aws secretsmanager create-secret \
  --name shogi/twilio-credentials \
  --secret-string '{"sid":"AC27206d17c54a6bd95854b210ece03563","token":"4ce53e00bda7f5ff7b368da51599f317"}'
```

### 4. Create API Gateway (HTTP API)

```bash
aws apigatewayv2 create-api \
  --name shogi-turn-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:shogi-turn-token-server

# Save the ApiEndpoint from output
# Example: https://abc123xyz.execute-api.us-east-1.amazonaws.com
```

### 5. Grant API Gateway Permissions

```bash
aws lambda add-permission \
  --function-name shogi-turn-token-server \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigatewayv2.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:YOUR_ACCOUNT_ID:YOUR_API_ID/*"
```

### 6. Test the Endpoint

```bash
# Health check
curl https://YOUR_API_ENDPOINT/api/health

# TURN credentials
curl https://YOUR_API_ENDPOINT/api/turn-credentials
```

Expected response:
```json
{
  "iceServers": [
    { "urls": "stun:global.stun.twilio.com:3478" },
    { "urls": "turn:global.turn.twilio.com:3478?transport=udp", "username": "...", "credential": "..." },
    { "urls": "turn:global.turn.twilio.com:3478?transport=tcp", "username": "...", "credential": "..." },
    { "urls": "turn:global.turn.twilio.com:443?transport=tcp", "username": "...", "credential": "..." }
  ],
  "ttl": 3600,
  "generatedAt": "2026-02-12T14:30:00.000Z"
}
```

## Update Lambda Code

After making changes:

```bash
cd server/lambda
zip -r turn-lambda.zip .
aws lambda update-function-code \
  --function-name shogi-turn-token-server \
  --zip-file fileb://turn-lambda.zip
```

## Integrate with CloudFront

Add API Gateway as a second origin in your CloudFront distribution:

1. **Origins**: Add new origin
   - Domain: `YOUR_API_ID.execute-api.us-east-1.amazonaws.com`
   - Protocol: HTTPS only

2. **Behaviors**: Create behavior
   - Path: `/api/*`
   - Origin: API Gateway origin
   - Cache Policy: `Managed-CachingDisabled`
   - Origin Request Policy: `Managed-AllViewer`
   - Viewer Protocol: Redirect HTTP to HTTPS

After CloudFront propagates (~15 minutes):

```bash
curl https://your-domain.com/api/health
curl https://your-domain.com/api/turn-credentials
```

## Monitoring

View Lambda logs:
```bash
aws logs tail /aws/lambda/shogi-turn-token-server --follow
```

## Cost

- **Lambda**: Free tier = 1M requests/month + 400,000 GB-seconds
- **API Gateway (HTTP API)**: $1.00 per 1M requests
- Typical usage: **$0-3/month**

## Environment Variables

Set in Lambda Console or via CLI:

| Variable | Required | Description |
|----------|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Yes | Twilio Account SID (starts with AC) |
| `TWILIO_AUTH_TOKEN` | Yes | Twilio Auth Token |
| `TURN_TOKEN_TTL` | No | Token lifetime in seconds (default: 3600) |

## Troubleshooting

**Error: "Missing required environment variables"**
- Set `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in Lambda environment

**Error: "Function timed out"**
- Increase Lambda timeout (default: 30 seconds is sufficient)

**CORS errors in browser**
- Verify API Gateway has CORS enabled
- Check CloudFront behavior allows OPTIONS requests

**"Failed to generate TURN token"**
- Verify Twilio credentials are correct
- Check Lambda has internet access (VPC config if applicable)
- View CloudWatch Logs for detailed error messages
