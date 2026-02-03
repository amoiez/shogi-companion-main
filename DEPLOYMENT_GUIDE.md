# Deployment Guide - Nakano Video Shogi Companion

## Overview
This guide provides step-by-step instructions for deploying the Nakano Video Shogi Companion application to production and configuring it for iPad use.

## Prerequisites

Before deployment, ensure you have:
- ✅ Completed BUILD_AND_SETUP.md instructions
- ✅ Built the application successfully (`npm run build`)
- ✅ AWS infrastructure set up (see AWS_INFRASTRUCTURE.md)
- ✅ AWS CLI configured with appropriate credentials
- ✅ Domain name configured (if using custom domain)

## Deployment Options

### Option 1: AWS S3 + CloudFront (Recommended)

This is the recommended deployment method for production use. See AWS_INFRASTRUCTURE.md for infrastructure setup.

#### Step 1: Build for Production

```bash
# Clean previous builds
rm -rf dist

# Build optimized production bundle
npm run build

# Verify build output
ls -la dist/
```

**Expected Output**:
- `index.html` - Main entry file
- `assets/` - JavaScript, CSS, images
- `public/` files - Static assets (pieces, sounds, images)

#### Step 2: Set Cache Headers

Different cache strategies for different file types:

**For versioned assets** (JavaScript, CSS with hashes):
- Cache-Control: `max-age=31536000, public, immutable`
- These files have unique hashes and can be cached forever

**For HTML**:
- Cache-Control: `no-cache, no-store, must-revalidate`
- Always fetch fresh HTML to get latest asset references

#### Step 3: Deploy to S3

```bash
# Set variables
export BUCKET_NAME="your-bucket-name"
export DISTRIBUTION_ID="your-cloudfront-distribution-id"

# Upload all files except index.html with long cache
aws s3 sync dist/ s3://${BUCKET_NAME}/ \
    --delete \
    --cache-control "max-age=31536000,public,immutable" \
    --exclude "index.html" \
    --exclude "robots.txt"

# Upload index.html with no-cache
aws s3 cp dist/index.html s3://${BUCKET_NAME}/index.html \
    --cache-control "no-cache,no-store,must-revalidate" \
    --content-type "text/html"

# Upload robots.txt with standard cache
aws s3 cp dist/robots.txt s3://${BUCKET_NAME}/robots.txt \
    --cache-control "max-age=86400" \
    --content-type "text/plain"

# Verify upload
aws s3 ls s3://${BUCKET_NAME}/ --recursive --human-readable
```

#### Step 4: Invalidate CloudFront Cache

```bash
# Create invalidation for all files
aws cloudfront create-invalidation \
    --distribution-id ${DISTRIBUTION_ID} \
    --paths "/*"

# Or invalidate specific files
aws cloudfront create-invalidation \
    --distribution-id ${DISTRIBUTION_ID} \
    --paths "/index.html" "/assets/*"
```

**Note**: CloudFront invalidations are free for the first 1,000 paths per month.

#### Step 5: Verify Deployment

1. Wait for invalidation to complete (usually 30-60 seconds)
2. Visit your domain: `https://your-domain.com`
3. Verify the application loads correctly
4. Test all major features
5. Check browser console for errors

### Option 2: Alternative Deployment Methods

#### Netlify Deploy
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

#### Vercel Deploy
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

## Security Headers Configuration

### CloudFront Response Headers Policy

Create a response headers policy in CloudFront with these security headers:

```json
{
  "SecurityHeadersPolicy": {
    "StrictTransportSecurity": {
      "AccessControlMaxAge": 31536000,
      "IncludeSubdomains": true,
      "Override": true
    },
    "ContentTypeOptions": {
      "Override": true
    },
    "FrameOptions": {
      "FrameOption": "DENY",
      "Override": true
    },
    "XSSProtection": {
      "ModeBlock": true,
      "Protection": true,
      "Override": true
    },
    "ReferrerPolicy": {
      "ReferrerPolicy": "strict-origin-when-cross-origin",
      "Override": true
    },
    "ContentSecurityPolicy": {
      "ContentSecurityPolicy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:; media-src 'self'; object-src 'none'; frame-ancestors 'none';",
      "Override": true
    }
  }
}
```

**Note**: The CSP policy above allows `unsafe-inline` and `unsafe-eval` for compatibility with React and Vite. Adjust as needed for your security requirements.

## iPad Setup and Configuration

### Device Requirements
- **Device**: iPad (any model supporting iOS 13+)
- **iOS Version**: iOS 13.0 or later (iOS 15+ recommended)
- **Browser**: Safari (default)
- **Network**: WiFi connection required for initial setup

### iPad Configuration Steps

#### Step 1: Initial Access

1. Open Safari on the iPad
2. Navigate to your deployed application URL: `https://your-domain.com`
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
