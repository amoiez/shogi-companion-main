# Troubleshooting Guide - Nakano Video Shogi Companion

## Overview
This document contains solutions to common mistakes, bugs, and issues encountered during development, deployment, and maintenance of the Nakano Video Shogi Companion application.

**Purpose**: Prevent the maintenance team from encountering the same problems we've already solved.

---

## 📚 Table of Contents

1. [Critical Bugs Fixed](#critical-bugs-fixed)
2. [Build and Development Issues](#build-and-development-issues)
3. [Deployment Issues](#deployment-issues)
4. [iPad-Specific Issues](#ipad-specific-issues)
5. [Coordinate System Issues](#coordinate-system-issues)
6. [Multiplayer Issues](#multiplayer-issues)
7. [Performance Issues](#performance-issues)
8. [CSS and Styling Issues](#css-and-styling-issues)

---

## Critical Bugs Fixed

### ⚠️ NEVER RE-INTRODUCE: Double Coordinate Translation Bug

**History**: This was a critical bug that broke all Guest player moves.

**The Bug**:
```tsx
// ❌ WRONG - DO NOT USE THIS PATTERN
const logicalRowForCell = isGotePlayer ? 8 - row : row;  // First translation
// Later in code:
const logicalRow = isGotePlayer ? 8 - row : row;  // Second translation!
```

**Why It's Wrong**:
- The `row` and `col` parameters from `board.map((row, rowIndex))` are ALREADY logical coordinates
- They represent array indices (0-8) and never change regardless of visual rotation
- CSS `transform: rotate(180deg)` is purely visual and doesn't affect array indices
- Translating them creates mirrored coordinates where none are needed
- Translating twice causes: `mirror(mirror(x)) = x`, which cancels out

**Impact**:
- Guest pieces moved to completely wrong squares
- Multiplayer synchronization failed
- Legal moves showed in wrong positions

**The Fix** (Current Correct Implementation):
```tsx
// ✅ CORRECT - row and col are already logical, use them directly
function handleDragStart(row: number, col: number) {
  // row and col are logical coordinates - no translation needed!
  const piece = board[row][col];
  if (!piece) return;
  
  // Use row/col directly for all game logic
  const legal = getLegalMoves(row, col, board, piece.isOpponent);
  setSelectedPiece({ row, col, legalMoves: legal });
}
```

**Key Principle**:
> **Array indices are ALWAYS logical coordinates. Never translate them.**

### ⚠️ NEVER RE-INTRODUCE: Incorrect Multiplayer Board Mirroring

**The Bug**:
```tsx
// ❌ WRONG - DO NOT MIRROR BOARD STATE IN MULTIPLAYER
if (role === 'guest') {
  gameStateToSend = {
    ...gameState,
    board: mirrorBoard(gameState.board),  // WRONG!
  };
}
```

**Why It's Wrong**:
- Both Host and Guest must maintain the SAME logical board state
- Board state is the single source of truth
- Visual rotation (CSS) is separate from logical state
- Mirroring creates two different "realities" for each player

**Impact**:
- Host and Guest saw different board positions
- Moves didn't synchronize correctly
- Piece ownership got confused

**The Fix**:
```tsx
// ✅ CORRECT - Send board state unchanged
function sendGameState(gameState: GameState) {
  // Always send the actual board state, never mirror it
  peer.send({
    type: 'gameState',
    gameState: gameState  // No transformation!
  });
}
```

**Key Principle**:
> **There is ONE logical board state shared by all players. Never transform it for network transmission.**

### ⚠️ Important: Index.css Corruption Issue

**Symptom**: Development server fails to start with CSS parsing errors.

**Root Cause**: The `index.css` file had corrupted/truncated content.

**Solution**:
If you encounter this, check the file length:
```powershell
# Check line count
(Get-Content "src\index.css").Count

# Should be around 425 lines, not 900+
```

If corrupted, restore from git:
```bash
git checkout HEAD -- src/index.css
```

**Prevention**:
- Don't manually edit large CSS files
- Use version control before CSS modifications
- Test build after any CSS changes

---

## Build and Development Issues

### Issue: "Cannot find module" Errors

**Symptom**:
```
Error: Cannot find module '@/components/ShogiBoard'
```

**Causes & Solutions**:

1. **Missing dependencies**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Path alias not configured**:
   - Check `vite.config.ts` has: `alias: { "@": path.resolve(__dirname, "./src") }`
   - Check `tsconfig.json` has: `"paths": { "@/*": ["./src/*"] }`

3. **Case sensitivity issues** (especially on Linux):
   - File: `ShogiBoard.tsx`
   - Import: `import { ShogiBoard } from './shogiboard'` ❌
   - Import: `import { ShogiBoard } from './ShogiBoard'` ✅

### Issue: Port 8080 Already in Use

**Symptom**:
```
Port 8080 is in use, trying another one...
```

**Solution**:

**Windows**:
```powershell
# Find process using port 8080
netstat -ano | findstr :8080

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

**macOS/Linux**:
```bash
# Find and kill process
lsof -ti:8080 | xargs kill -9
```

**Alternative**: Change port in `vite.config.ts`:
```ts
server: {
  port: 8081,  // Use different port
}
```

### Issue: TypeScript Errors Not Showing in Editor

**Symptom**: Build fails but VS Code shows no errors.

**Solutions**:

1. Restart TypeScript server:
   - VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

2. Check TypeScript version:
   ```bash
   npx tsc --version  # Should be 5.8.3
   ```

3. Verify `tsconfig.json` is valid:
   ```bash
   npx tsc --noEmit
   ```

### Issue: Hot Module Replacement Not Working

**Symptom**: Changes don't reflect immediately, need manual refresh.

**Solutions**:

1. Check if using correct import syntax:
   ```tsx
   // ✅ Correct
   import { useState } from 'react'
   
   // ❌ May break HMR
   const React = require('react')
   ```

2. Ensure file is not outside `src/`:
   - HMR only works for files in `src/` directory

3. Clear Vite cache:
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

### Issue: Build Fails with "Out of Memory"

**Symptom**:
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Solution**:
```bash
# Increase Node.js memory
node --max-old-space-size=4096 node_modules/vite/bin/vite.js build

# Or add to package.json
"build": "node --max-old-space-size=4096 node_modules/vite/bin/vite.js build"
```

---

## Deployment Issues

### Issue: Old Version Still Showing After Deployment

**Symptom**: Deployed new version but users see old version.

**Causes & Solutions**:

1. **CloudFront cache not invalidated**:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id YOUR_DIST_ID \
     --paths "/*"
   ```

2. **Browser cache**:
   - Users need to hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

3. **Service Worker cache**:
   - Update service worker version
   - Or clear: Chrome DevTools → Application → Clear Storage

4. **Wrong cache headers on index.html**:
   ```bash
   # Verify index.html has no-cache
   aws s3api head-object \
     --bucket YOUR_BUCKET \
     --key index.html \
     --query 'CacheControl'
   
   # Should return: "no-cache,no-store,must-revalidate"
   ```

### Issue: 403/404 Errors on SPA Routes

**Symptom**: Direct URLs like `https://domain.com/game` return 404.

**Cause**: CloudFront doesn't know about client-side routing.

**Solution**: Configure custom error responses in CloudFront:
```
Error Code: 403, 404
Response Page Path: /index.html
Response Code: 200
TTL: 300
```

This makes CloudFront serve `index.html` for all routes, letting React Router handle them.

### Issue: Mixed Content Warnings

**Symptom**:
```
Mixed Content: The page at 'https://...' was loaded over HTTPS, 
but requested an insecure resource 'http://...'
```

**Solutions**:

1. **Check all URLs in code**:
   ```tsx
   // ❌ Wrong
   <img src="http://example.com/image.png" />
   
   // ✅ Correct
   <img src="https://example.com/image.png" />
   // or
   <img src="//example.com/image.png" />  // Protocol-relative
   ```

2. **Use relative URLs for same-origin resources**:
   ```tsx
   // ✅ Best practice
   <img src="/images/piece.png" />
   ```

3. **Check API endpoints**:
   - All external APIs must be HTTPS

### Issue: CORS Errors

**Symptom**:
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solutions**:

1. **S3 CORS configuration**:
   ```json
   {
     "CORSRules": [
       {
         "AllowedOrigins": ["https://your-domain.com"],
         "AllowedMethods": ["GET", "HEAD"],
         "AllowedHeaders": ["*"],
         "MaxAgeSeconds": 3600
       }
     ]
   }
   ```

2. **API Gateway CORS**:
   - Enable CORS in API Gateway settings
   - Add `Access-Control-Allow-Origin` header

### Issue: Large Bundle Size

**Symptom**: Slow initial load, large JavaScript files.

**Solutions**:

1. **Analyze bundle**:
   ```bash
   npm install -D rollup-plugin-visualizer
   npm run build
   # Check dist/stats.html
   ```

2. **Code splitting**:
   ```tsx
   // Lazy load heavy components
   const ShogiBoard = lazy(() => import('./components/ShogiBoard'));
   ```

3. **Check for duplicate dependencies**:
   ```bash
   npm dedupe
   ```

---

## iPad-Specific Issues

### Issue: Touch Events Not Working

**Symptom**: Drag and drop doesn't work on iPad.

**Causes & Solutions**:

1. **Missing touch event handlers**:
   ```tsx
   // ✅ Add both mouse and touch events
   <div
     onMouseDown={handleDragStart}
     onTouchStart={handleDragStart}
     onMouseMove={handleDrag}
     onTouchMove={handleDrag}
   />
   ```

2. **Passive event listeners**:
   ```tsx
   // Prevent default on touchmove
   const handleTouchMove = (e: TouchEvent) => {
     e.preventDefault();  // Prevents scrolling while dragging
     // ... drag logic
   };
   ```

3. **iOS Safari quirks**:
   - Add `touch-action: none;` to draggable elements
   - Use `-webkit-touch-callout: none;` to prevent context menu

### Issue: App Not Fullscreen on iPad

**Symptom**: Safari UI still visible when launching from home screen.

**Solution**: Add meta tags to `index.html`:
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

Then re-add to home screen.

### Issue: Sounds Not Playing on iPad

**Symptom**: Audio works on desktop but not iPad.

**Causes & Solutions**:

1. **Autoplay restrictions**:
   ```tsx
   // ✅ Play sound in response to user interaction
   const playSound = () => {
     const audio = new Audio('/sounds/move.mp3');
     audio.play().catch(err => console.log('Audio blocked:', err));
   };
   
   // Call playSound in onClick, not on mount
   ```

2. **Audio format**:
   - Use MP3 or AAC (best iOS support)
   - Avoid OGG or WAV

3. **Mute switch**:
   - Check if iPad mute switch is on
   - Use Web Audio API for sounds that bypass mute

### Issue: Scrolling/Zooming on iPad

**Symptom**: Board scrolls or zooms unexpectedly.

**Solution**: Add to CSS:
```css
body {
  touch-action: none;  /* Disable iOS gestures */
  -webkit-user-select: none;  /* Disable text selection */
  -webkit-tap-highlight-color: transparent;  /* Remove tap highlight */
}
```

And to `index.html`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

### Issue: Performance Lag on iPad

**Symptom**: Animations stutter, UI feels slow.

**Solutions**:

1. **Enable hardware acceleration**:
   ```css
   .shogi-board {
     transform: translateZ(0);  /* Force GPU rendering */
     will-change: transform;
   }
   ```

2. **Reduce re-renders**:
   ```tsx
   // Use React.memo for expensive components
   const ShogiBoard = React.memo(({ board }) => {
     // ...
   });
   ```

3. **Optimize images**:
   - Use WebP format
   - Compress large images
   - Use appropriate sizes

---

## Coordinate System Issues

### 🚨 CRITICAL: Understanding the Coordinate System

**Key Concept**: There is ONE coordinate system (logical), and ONE visual representation per player.

```
LOGICAL BOARD (The Truth):
┌───┬───┬───┬───┬───┬───┬───┬───┬───┐
│0,0│0,1│0,2│0,3│0,4│0,5│0,6│0,7│0,8│  ← Gote's starting zone
├───┼───┼───┼───┼───┼───┼───┼───┼───┤
│1,0│   │   │   │   │   │   │   │1,8│
├───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ . │ . │ . │ . │ . │ . │ . │ . │ . │
├───┼───┼───┼───┼───┼───┼───┼───┼───┤
│8,0│8,1│8,2│8,3│8,4│8,5│8,6│8,7│8,8│  ← Sente's starting zone
└───┴───┴───┴───┴───┴───┴───┴───┴───┘

Array representation:
board[0][0] to board[8][8]
```

### Issue: Legal Moves Showing in Wrong Squares

**Symptom**: Highlighting doesn't match where piece can actually move.

**Cause**: Coordinate mismatch between legal move calculation and rendering.

**Solution**: Always use logical coordinates:
```tsx
// ✅ Correct
const legal = getLegalMoves(row, col, board, isOpponent);
setSelectedPiece({ row, col, legalMoves: legal });

// In render:
const isLegal = legalMoves.has(`${row}-${col}`);  // row/col from map indices
```

### Issue: Pieces Moving to Wrong Squares

**Symptom**: Click square (2,3) but piece goes to (6,5).

**Diagnostic**:
```tsx
// Add debug logging
function handleSquareClick(row: number, col: number) {
  console.log('Clicked square:', { row, col });
  console.log('Board at position:', board[row][col]);
  console.log('Selected piece:', selectedPiece);
  // If these don't match expectations, coordinate bug exists
}
```

**Solution**: Ensure no coordinate translation is happening in click handlers.

---

## Multiplayer Issues

### Issue: PC and iPad Cannot Connect (Cross-Platform Matchmaking Failure)

**Symptom**: Players on PC and iPad enter matchmaking but cannot establish connection.

**Root Cause**: Missing NAT traversal configuration (ICE/STUN servers).

**Solution Applied** (February 3, 2026):
- Added ICE/STUN server configuration to PeerJS
- Configured Google and Cloudflare STUN servers for NAT traversal
- Added connection timeout handling (30 seconds)
- Improved error messages for network issues

**Verification**:
```tsx
// Check that PEER_CONFIG includes ICE servers in useMultiplayer.ts
const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      // ... more servers
    ],
  },
};
```

**If issue persists**:
1. Check both devices are on stable networks
2. Verify no corporate firewall is blocking WebRTC
3. Test with both devices on same Wi-Fi network first
4. Check browser console for specific error types

### Issue: Connection Timeout / Indefinite "Connecting" State

**Symptom**: Matchmaking shows "connecting" but never completes.

**Solution**: 
- Connection timeout now set to 30 seconds
- Clear error message displayed after timeout
- Automatic cleanup of stale connections

**Manual Fix**:
1. Click "Cancel" or disconnect
2. Close and reopen the application
3. Try creating/joining game again
4. Check network connectivity on both devices

### Issue: Pieces Not Syncing Between Players

**Symptom**: Host moves, Guest doesn't see the move.

**Debugging Steps**:

1. **Check connection status**:
   ```tsx
   console.log('Connection state:', peer?.connectionState);
   console.log('Data channel open:', dataChannel?.readyState);
   ```

2. **Verify messages are sent**:
   ```tsx
   peer.send({ type: 'move', move: moveData });
   console.log('Sent move:', moveData);
   ```

3. **Check receiver**:
   ```tsx
   peer.on('data', (data) => {
     console.log('Received data:', data);
   });
   ```

**Common Fixes**:

1. **Connection not established**:
   - Wait for `peer.on('open')` event before sending data
   - Check PeerJS server is reachable

2. **JSON serialization issue**:
   ```tsx
   // ✅ Ensure data is JSON-serializable
   const data = { type: 'move', ...moveData };
   peer.send(data);  // PeerJS auto-serializes
   ```

### Issue: Guest Sees Pieces Upside Down

**Symptom**: Guest player's pieces appear rotated.

**This is CORRECT behavior**:
- Guest's view is rotated 180°
- Both players see their own pieces at the bottom
- This is standard shogi presentation

**If pieces are oriented wrong**:
- Check CSS: `.board-container.gote { transform: rotate(180deg); }`
- Check piece images are oriented correctly

### Issue: PeerJS Connection Fails

**Symptom**: Cannot establish peer connection.

**Solutions**:

1. **Check PeerJS server**:
   ```tsx
   const peer = new Peer({
     host: 'your-peer-server.com',
     port: 443,
     path: '/peerjs',
     secure: true,  // Must be true for HTTPS sites
   });
   ```

2. **Firewall/network issues**:
   - PeerJS uses WebRTC, needs STUN/TURN servers
   - Corporate networks may block WebRTC

3. **Use public PeerJS server** (for testing):
   ```tsx
   const peer = new Peer();  // Uses peerjs.com cloud server
   ```

---

## Performance Issues

### Issue: Board Re-renders Too Often

**Symptom**: Lag when dragging pieces, high CPU usage.

**Diagnostic**:
```tsx
// Add to component
useEffect(() => {
  console.log('ShogiBoard rendered');
});
```

**Solutions**:

1. **Memoize expensive calculations**:
   ```tsx
   const legalMoves = useMemo(() => 
     getLegalMoves(selectedPiece.row, selectedPiece.col, board),
     [selectedPiece, board]
   );
   ```

2. **Use React.memo**:
   ```tsx
   const BoardCell = React.memo(({ piece, isLegal, onClick }) => {
     // Only re-renders if props change
   });
   ```

3. **Optimize state updates**:
   ```tsx
   // ❌ Creates new array every time
   setBoard([...board]);
   
   // ✅ Only update if actually changed
   if (hasChanged) setBoard(newBoard);
   ```

### Issue: Large Images Slow Loading

**Symptom**: Piece images load slowly, especially on iPad.

**Solutions**:

1. **Optimize image sizes**:
   - Shogi pieces should be ~64x64 px max
   - Use WebP format
   - Compress with tools like ImageOptim

2. **Preload critical images**:
   ```tsx
   useEffect(() => {
     const images = ['/pieces/king.png', '/pieces/gold.png', ...];
     images.forEach(src => {
       const img = new Image();
       img.src = src;
     });
   }, []);
   ```

3. **Use CSS sprites**:
   - Combine all piece images into one file
   - Use background-position to show individual pieces

---

## CSS and Styling Issues

### Issue: Tailwind Classes Not Working

**Symptom**: CSS classes have no effect.

**Solutions**:

1. **Check Tailwind config**:
   ```js
   // tailwind.config.ts
   export default {
     content: [
       "./index.html",
       "./src/**/*.{js,ts,jsx,tsx}",  // Must include all file types
     ],
   }
   ```

2. **Restart dev server**:
   ```bash
   # Tailwind needs restart after config changes
   npm run dev
   ```

3. **Check class name typos**:
   - `bg-blue500` ❌
   - `bg-blue-500` ✅

### Issue: Dark Mode Not Working

**Symptom**: Dark mode toggle doesn't change theme.

**Check**:

1. **Theme provider**:
   ```tsx
   // App.tsx must have ThemeProvider
   import { ThemeProvider } from 'next-themes'
   
   <ThemeProvider attribute="class" defaultTheme="system">
     <YourApp />
   </ThemeProvider>
   ```

2. **CSS has dark variants**:
   ```css
   .card {
     @apply bg-white dark:bg-gray-800;
   }
   ```

### Issue: Layout Breaks on Small Screens

**Symptom**: Board doesn't fit on small iPads or phones.

**Solution**: Use responsive design:
```tsx
<div className="w-full max-w-[90vmin] mx-auto">
  <ShogiBoard />
</div>
```

And CSS:
```css
.board-container {
  width: min(90vw, 90vh);  /* Fit to smallest dimension */
  aspect-ratio: 1;  /* Keep square */
}
```

---

## Emergency Debugging Commands

### Check Application Health

```bash
# Verify build
npm run build
npm run preview

# Check for errors
npm run lint

# TypeScript check
npx tsc --noEmit

# Check bundle size
ls -lh dist/assets/
```

### Reset Everything

```bash
# Nuclear option - reset to clean state
rm -rf node_modules package-lock.json dist .vite
npm install
npm run build
```

### Git Bisect (Find Breaking Commit)

```bash
git bisect start
git bisect bad HEAD  # Current version is broken
git bisect good <commit-hash>  # Last known good version

# Test each commit Git presents
npm install && npm run build && npm run preview
# If works: git bisect good
# If broken: git bisect bad

# Git will narrow down to exact breaking commit
```

---

## When All Else Fails

### Checklist:

1. ✅ Read error message completely
2. ✅ Check this troubleshooting guide
3. ✅ Check browser console for JavaScript errors
4. ✅ Check network tab for failed requests
5. ✅ Try in incognito/private window (eliminates extensions)
6. ✅ Try different browser
7. ✅ Check Git history for recent changes
8. ✅ Compare with last working version

### Get Help:

- Check project documentation: README.md, ARCHITECTURE_DIAGRAM.md
- Review related fix documents: FIX_SUMMARY_FINAL.md, COORDINATE_SYSTEM_FIX.md
- Contact: [Support contact to be assigned]

---

## Maintenance Best Practices

### Before Making Changes:

1. **Create feature branch**:
   ```bash
   git checkout -b fix/issue-description
   ```

2. **Test locally**:
   ```bash
   npm run build
   npm run preview
   ```

3. **Test on iPad** (if UI changes)

### After Making Changes:

1. **Run tests**:
   ```bash
   npm run lint
   npx tsc --noEmit
   ```

2. **Document changes**:
   - Update this troubleshooting guide if you found new issues
   - Update relevant documentation

3. **Deploy carefully**:
   - Test in staging first
   - Have rollback plan ready
   - Monitor for errors after deployment

---

**Last Updated**: February 2, 2026  
**Maintained By**: [To be assigned during handover]  
**Version**: 1.0

**Contributing**: If you encounter and solve a new issue, please add it to this document!
