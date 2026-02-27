#!/bin/bash
# ============================================================
# AWS Lambda Deployment Script (Bash)
# ============================================================
# Usage: ./deploy.sh
# Prerequisites: AWS CLI configured with credentials
# ============================================================

set -e
#colors
# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
FUNCTION_NAME="shogi-turn-token-server"
ROLE_NAME="shogi-turn-lambda-role"
API_NAME="shogi-turn-api"
RUNTIME="nodejs20.x"
HANDLER="index.handler"
MEMORY=256
TIMEOUT=30
REGION="${AWS_REGION:-us-east-1}"

# Load Twilio credentials from .env
ENV_FILE="../../.env"
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

if [ -z "$TWILIO_ACCOUNT_SID" ] || [ -z "$TWILIO_AUTH_TOKEN" ]; then
    echo -e "${RED}❌ Error: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN not found in .env${NC}"
    exit 1
fi

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}AWS Lambda Deployment - TURN Token Server${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

# Step 1: Package Lambda
echo -e "${YELLOW}📦 Step 1: Packaging Lambda function...${NC}"
rm -f turn-lambda.zip

npm install --omit=dev
zip -r turn-lambda.zip index.mjs package.json package-lock.json node_modules

echo -e "${GREEN}✅ Package created: turn-lambda.zip${NC}"
echo ""

# Step 2: Get AWS Account ID
echo -e "${YELLOW}🔍 Step 2: Getting AWS Account ID...${NC}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to get AWS Account ID. Is AWS CLI configured?${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Account ID: $ACCOUNT_ID${NC}"
echo ""

# Step 3: Create or verify IAM role
echo -e "${YELLOW}👤 Step 3: Setting up IAM role...${NC}"
if aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
    echo -e "${GREEN}✅ IAM role already exists: $ROLE_NAME${NC}"
else
    echo -e "${CYAN}Creating IAM role...${NC}"
    
    TRUST_POLICY='{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": { "Service": "lambda.amazonaws.com" },
        "Action": "sts:AssumeRole"
      }]
    }'
    
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document "$TRUST_POLICY" > /dev/null
    
    aws iam attach-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    
    echo -e "${GREEN}✅ IAM role created: $ROLE_NAME${NC}"
    echo -e "${CYAN}⏳ Waiting 10 seconds for IAM propagation...${NC}"
    sleep 10
fi
echo ""

# Step 4: Create or update Lambda function
echo -e "${YELLOW}🚀 Step 4: Deploying Lambda function...${NC}"
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" &>/dev/null; then
    echo -e "${CYAN}Updating existing Lambda function...${NC}"
    
    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file fileb://turn-lambda.zip \
        --region "$REGION" > /dev/null
    
    aws lambda update-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --environment "Variables={TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN,TURN_TOKEN_TTL=3600}" \
        --region "$REGION" > /dev/null
    
    echo -e "${GREEN}✅ Lambda function updated: $FUNCTION_NAME${NC}"
else
    echo -e "${CYAN}Creating new Lambda function...${NC}"
    
    aws lambda create-function \
        --function-name "$FUNCTION_NAME" \
        --runtime "$RUNTIME" \
        --role "arn:aws:iam::${ACCOUNT_ID}:role/$ROLE_NAME" \
        --handler "$HANDLER" \
        --zip-file fileb://turn-lambda.zip \
        --timeout "$TIMEOUT" \
        --memory-size "$MEMORY" \
        --environment "Variables={TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN,TURN_TOKEN_TTL=3600}" \
        --region "$REGION" > /dev/null
    
    echo -e "${GREEN}✅ Lambda function created: $FUNCTION_NAME${NC}"
fi
echo ""

# Step 5: Create or get API Gateway
echo -e "${YELLOW}🌐 Step 5: Setting up API Gateway...${NC}"
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='$API_NAME'].ApiId" --output text --region "$REGION")
if [ -n "$API_ID" ]; then
    echo -e "${GREEN}✅ API Gateway already exists: $API_ID${NC}"
else
    echo -e "${CYAN}Creating API Gateway...${NC}"
    
    OUTPUT=$(aws apigatewayv2 create-api \
        --name "$API_NAME" \
        --protocol-type HTTP \
        --target "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:$FUNCTION_NAME" \
        --region "$REGION")
    
    API_ID=$(echo "$OUTPUT" | jq -r '.ApiId')
    
    echo -e "${GREEN}✅ API Gateway created: $API_ID${NC}"
fi

# Get API endpoint
API_ENDPOINT=$(aws apigatewayv2 get-api --api-id "$API_ID" --query ApiEndpoint --output text --region "$REGION")
echo ""

# Step 6: Grant API Gateway permissions
echo -e "${YELLOW}🔐 Step 6: Granting API Gateway permissions...${NC}"
if aws lambda get-policy --function-name "$FUNCTION_NAME" --region "$REGION" 2>&1 | grep -q "apigateway-invoke"; then
    echo -e "${GREEN}✅ Permissions already exist${NC}"
else
    aws lambda add-permission \
        --function-name "$FUNCTION_NAME" \
        --statement-id apigateway-invoke \
        --action lambda:InvokeFunction \
        --principal apigatewayv2.amazonaws.com \
        --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*" \
        --region "$REGION" > /dev/null
    
    echo -e "${GREEN}✅ Permissions granted${NC}"
fi
echo ""

# Step 7: Test endpoints
echo -e "${YELLOW}🧪 Step 7: Testing endpoints...${NC}"
echo ""

echo -e "${CYAN}Testing health check...${NC}"
HEALTH=$(curl -s "$API_ENDPOINT/api/health")
echo -e "${GREEN}Health: $(echo "$HEALTH" | jq -r '.status')${NC}"
echo ""

echo -e "${CYAN}Testing TURN credentials...${NC}"
TURN=$(curl -s "$API_ENDPOINT/api/turn-credentials")
ICE_COUNT=$(echo "$TURN" | jq '.iceServers | length')
TTL=$(echo "$TURN" | jq -r '.ttl')
echo -e "${GREEN}ICE Servers: $ICE_COUNT${NC}"
echo -e "${GREEN}TTL: $TTL seconds${NC}"
echo ""

# Summary
echo -e "${CYAN}============================================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""
echo -e "API Endpoint: ${API_ENDPOINT}"
echo ""
echo -e "${YELLOW}Test URLs:${NC}"
echo -e "  Health:      ${API_ENDPOINT}/api/health"
echo -e "  TURN Tokens: ${API_ENDPOINT}/api/turn-credentials"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Add this endpoint as an origin in CloudFront"
echo -e "  2. Create a behavior for /api/* pointing to the API Gateway origin"
echo -e "  3. Test: curl https://your-domain.com/api/turn-credentials"
echo ""
