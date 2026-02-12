# TURN Server Setup Guide

## Overview

For reliable WebRTC connections between PC and iPad across different networks, a TURN server is **REQUIRED**. STUN alone is insufficient for NAT traversal in many network configurations.

### Architecture: Ephemeral Token Model

```
Browser (frontend)                    Backend (server/turn-server.js)
───────────────────                   ─────────────────────────────────
                                      Holds master Twilio credentials
  GET /api/turn-credentials ─────────►  ↓
                                      twilioClient.tokens.create()
  ◄─ { iceServers, ttl } ────────────  ↓
                                      Returns ephemeral ICE servers
  Uses iceServers in PeerJS config
  (credentials expire after TTL)
```

**Security**: Master Twilio Account SID and Auth Token are **never** sent to the browser. The frontend only receives short-lived (1-hour) tokens.

## Quick Start

### 1. Create a Twilio Account
- Sign up at https://www.twilio.com/
- Navigate to your Twilio Console
- Copy your **Account SID** and **Auth Token**

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your Twilio credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TURN_TOKEN_TTL=3600
PORT=3001
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Both Servers
```bash
# Option A: Run both simultaneously (recommended)
npm run dev:full

# Option B: Run separately in two terminals
npm run turn-server    # Terminal 1: Backend on port 3001
npm run dev            # Terminal 2: Vite on port 8080
```

### 5. Verify Token Generation
Open http://localhost:3001/api/turn-credentials in your browser.
You should see a JSON response with ephemeral ICE servers:
```json
{
  "iceServers": [
    { "urls": "stun:global.stun.twilio.com:3478" },
    { "urls": "turn:global.turn.twilio.com:3478?transport=udp", "username": "...", "credential": "..." },
    { "urls": "turn:global.turn.twilio.com:3478?transport=tcp", "username": "...", "credential": "..." },
    { "urls": "turn:global.turn.twilio.com:443?transport=tcp", "username": "...", "credential": "..." }
  ],
  "ttl": 3600
}
```

### 6. Test the Connection
- Host a game on PC
- Join from iPad on a **different** network (e.g., mobile tethering)
- Verify both data and video streams connect

## How It Works

1. When a player clicks "Host Game" or "Join Game", the frontend calls `GET /api/turn-credentials`
2. The backend uses `twilio.tokens.create()` to generate temporary ICE credentials
3. Twilio returns STUN + TURN server URLs with short-lived username/password
4. The frontend passes these ICE servers to PeerJS's `RTCPeerConnection` config
5. WebRTC uses TURN relay when direct peer-to-peer fails (different NATs, firewalls)
6. Credentials expire after TTL (default 1 hour); each new game fetches fresh ones

## Testing TURN Server

### Browser Console Verification
After starting a game, open the browser console and look for:

```
[ICE] Ephemeral TURN credentials received
[ICE]   Servers: 4
[ICE]   TTL: 3600 seconds
```

When connecting across different networks:
```
[ICE][HOST-MEDIA] Candidate: type=relay protocol=udp ...
[ICE][HOST-MEDIA] ✅ RELAY candidate generated — TURN server is working
```

At connection establishment:
```
[ICE][HOST-MEDIA] ✅ Connection is RELAYED through TURN server
```

If you see `⚠️ NO RELAY CANDIDATES`, the TURN server may be misconfigured.

## Troubleshooting

### "Failed to fetch TURN credentials"
- Ensure the backend is running: `npm run turn-server`
- Check http://localhost:3001/api/health returns `{ "status": "ok" }`
- Verify `.env` has correct `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`

### Connection Fails on iPad
- Ensure TURN credentials are correct (check backend logs)
- Check iOS Safari allows camera/microphone access
- Verify network allows outbound connections on ports 3478 and 443

### High Latency
- Twilio automatically uses the nearest global TURN server
- Check network bandwidth

### Cost Optimization
- Twilio free tier includes TURN minutes
- Ephemeral tokens ensure unused credentials expire automatically

## Production Deployment

In production (e.g., AWS), the backend should be deployed behind the same domain as the frontend:

```
CloudFront → /api/*    → ALB/Lambda (turn-server.js)
CloudFront → /*        → S3 (static SPA files)
```

This eliminates CORS issues and keeps the architecture simple. The `.env` with Twilio credentials lives only on the server, never in the deployed frontend bundle.

## Security Notes

- **NEVER commit `.env` files** with real credentials to version control
- `.env.example` is safe to commit (contains placeholder values only)
- Ephemeral tokens expire automatically (default: 1 hour)
- Each game session gets unique credentials
- Rotate Twilio Auth Token periodically
- Monitor Twilio console for unexpected usage spikes

## References

- [Twilio Network Traversal Service](https://www.twilio.com/docs/stun-turn)
- [Twilio Tokens API (Node.js)](https://www.twilio.com/docs/iam/api/token-resource)
- [WebRTC ICE Overview](https://webrtcglossary.com/ice/)
