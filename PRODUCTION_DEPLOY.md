# Production Deployment Guide

## Overview

This application requires both frontend (static files) and backend (TURN token server) to be deployed for cross-network WebRTC functionality.

## Backend Deployment (Already Done ✅)

Your Lambda function is deployed and accessible at:
```
https://jsrpfoj7xv4nhr4sva4tujslki0hgugg.lambda-url.eu-north-1.on.aws/api/turn-credentials
```

Test it:
```bash
curl https://jsrpfoj7xv4nhr4sva4tujslki0hgugg.lambda-url.eu-north-1.on.aws/api/turn-credentials
```

## Frontend Deployment

### Option 1: Direct Lambda Function URL (Current Setup)

The `.env` file is already configured with `VITE_TURN_API_URL` pointing to your Lambda Function URL.

**Build for production:**
```bash
npm run build
```

This creates a `dist/` folder with:
- Static files (HTML, JS, CSS, assets)
- WebRTC client that fetches TURN credentials from Lambda directly

**Deploy `dist/` to:**
- AWS S3 + CloudFront
- Netlify
- Vercel
- Any static hosting service

**CORS is handled** by the Lambda function (already configured in `index.mjs`).

### Option 2: CloudFront with API Gateway (Advanced)

If you prefer a unified domain (no direct Lambda calls):

1. Deploy Lambda behind API Gateway (see `server/lambda/README.md`)
2. Add API Gateway as CloudFront origin for `/api/*`
3. Comment out `VITE_TURN_API_URL` in `.env` (use relative path)
4. Frontend calls `/api/turn-credentials` → CloudFront → API Gateway → Lambda

## Build Commands

### Development (Local)
```bash
# Start both backend + frontend
npm run dev:full

# Or separately:
npm run turn-server  # Terminal 1: Backend on port 3001
npm run dev          # Terminal 2: Frontend on port 8080
```

### Production Build
```bash
# Build with Lambda Function URL
npm run build

# Preview locally
npm run preview
```

### Test Production Build Locally
```bash
# Build
npm run build

# Serve dist/ folder
npx serve dist
```

Then open http://localhost:3000 and test cross-network connectivity.

## Environment Variables

### For Development (`.env`)
```env
# Backend (server-side only)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
PORT=3001

# Frontend (leave commented for dev)
# VITE_TURN_API_URL=https://...
```

### For Production (`.env.production`)
```env
# Frontend only
VITE_TURN_API_URL=https://jsrpfoj7xv4nhr4sva4tujslki0hgugg.lambda-url.eu-north-1.on.aws/api/turn-credentials
```

## AWS S3 + CloudFront Deployment

### 1. Upload to S3
```bash
aws s3 sync dist/ s3://your-bucket-name/ --delete
```

### 2. Invalidate CloudFront Cache
```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

### 3. Test
```
https://your-domain.com
```

## Verification Checklist

After deployment, verify in browser console:

1. **TURN credentials fetch:**
   ```
   [ICE] Fetching ephemeral TURN credentials from backend...
   [ICE]   Endpoint: https://jsrpfoj7xv4nhr4sva4tujslki0hgugg.lambda-url.eu-north-1.on.aws/api/turn-credentials
   [ICE] ✅ Ephemeral TURN credentials received
   [ICE]   Servers: 4
   ```

2. **ICE candidates include relay:**
   ```
   [ICE][HOST-MEDIA] Candidate: type=relay protocol=udp ...
   [ICE][HOST-MEDIA] ✅ RELAY candidate generated — TURN server is working
   ```

3. **Cross-network connection:**
   - Host game on PC (WiFi)
   - Join from iPad (mobile data)
   - Both video feeds visible
   - Game moves sync correctly

## Troubleshooting

### "Failed to fetch TURN credentials"
- Check Lambda Function URL is accessible: `curl https://your-lambda-url/api/turn-credentials`
- Verify `VITE_TURN_API_URL` is set correctly in `.env`
- Check browser console for CORS errors

### "No relay candidates"
- Verify Twilio credentials are correct in Lambda environment
- Check Lambda CloudWatch logs for errors
- Ensure Lambda has internet access (no VPC restrictions)

### Build includes local URLs
- Ensure `VITE_TURN_API_URL` is set before running `npm run build`
- Delete `dist/` and rebuild
- Check `.env.production` file exists

## Cost Estimate

**Backend (Lambda + Twilio):**
- Lambda: $0-3/month (free tier covers most usage)
- Twilio TURN: Free tier includes sufficient minutes

**Frontend (S3 + CloudFront):**
- S3: ~$1/month for storage + requests
- CloudFront: ~$5-10/month for moderate traffic

**Total: ~$5-15/month** for production deployment

## Updating the Backend

If you modify `server/lambda/index.mjs`:

```bash
cd server/lambda
./deploy.ps1  # Windows
# or
./deploy.sh   # Linux/Mac
```

No frontend rebuild needed if only backend changes.

## Security Notes

- ✅ Twilio credentials never exposed to browser
- ✅ TURN tokens expire after 1 hour (configurable)
- ✅ Lambda Function URL has CORS configured
- ✅ HTTPS enforced on all endpoints
- ⚠️ Consider enabling Lambda Function URL authentication for production
- ⚠️ Add CloudFront in front of Lambda for DDoS protection

## Support

For issues:
1. Check browser console logs (`[ICE]` and `[LAMBDA]` prefixes)
2. Check Lambda CloudWatch logs
3. Verify Twilio account status
4. Test Lambda endpoint directly with curl
