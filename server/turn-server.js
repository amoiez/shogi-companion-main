// ============================================================
// TURN Token Server — Ephemeral Twilio ICE Credentials
// ============================================================
// This server generates short-lived (TTL) TURN credentials using
// the Twilio Tokens API. The master Account SID and Auth Token
// are kept server-side and NEVER sent to the browser.
//
// The frontend calls GET /api/turn-credentials before each
// WebRTC session and receives temporary ICE server entries
// ready to pass into RTCPeerConnection configuration.
//
// Usage:
//   node server/turn-server.js
//
// Environment variables (in .env at project root):
//   TWILIO_ACCOUNT_SID  — Twilio Account SID
//   TWILIO_AUTH_TOKEN    — Twilio Auth Token
//   TURN_TOKEN_TTL       — Token lifetime in seconds (default: 3600)
//   PORT                 — Server port (default: 3001)
// ============================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import twilio from 'twilio';

const app = express();
const PORT = process.env.PORT || 3001;

// ------------------------------------
// Validate required environment vars
// ------------------------------------
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TURN_TOKEN_TTL = parseInt(process.env.TURN_TOKEN_TTL || '3600', 10);

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error('============================================================');
  console.error('FATAL: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set');
  console.error('Create a .env file in the project root with:');
  console.error('  TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  console.error('  TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  console.error('============================================================');
  process.exit(1);
}

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// ------------------------------------
// CORS — allow Vite dev server origin
// ------------------------------------
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://[::]:8080',
    'http://127.0.0.1:8080',
    /^https?:\/\/.*/ // Allow all origins in production (behind CloudFront)
  ],
  methods: ['GET'],
}));

// ------------------------------------
// Health check
// ------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ------------------------------------
// GET /api/turn-credentials
// Returns ephemeral ICE server list from Twilio
// ------------------------------------
app.get('/api/turn-credentials', async (_req, res) => {
  try {
    console.log('[TURN-SERVER] Generating ephemeral TURN token...');
    console.log('[TURN-SERVER]   TTL:', TURN_TOKEN_TTL, 'seconds');

    const token = await twilioClient.tokens.create({ ttl: TURN_TOKEN_TTL });

    // token.iceServers is an array of { url, urls, username, credential }
    // We normalise to the standard RTCIceServer format
    const iceServers = token.iceServers.map((server) => {
      const entry = {};
      // Twilio returns both `url` (singular, legacy) and `urls` (standard)
      entry.urls = server.urls || server.url;
      if (server.username) entry.username = server.username;
      if (server.credential) entry.credential = server.credential;
      return entry;
    });

    console.log('[TURN-SERVER] ========================================');
    console.log('[TURN-SERVER] Ephemeral token generated successfully');
    console.log('[TURN-SERVER]   ICE servers returned:', iceServers.length);
    iceServers.forEach((s, i) => {
      const urls = Array.isArray(s.urls) ? s.urls.join(', ') : s.urls;
      console.log(`[TURN-SERVER]   [${i}] ${urls}`);
    });
    console.log('[TURN-SERVER]   Token expires in:', TURN_TOKEN_TTL, 'seconds');
    console.log('[TURN-SERVER] ========================================');

    res.json({
      iceServers,
      ttl: TURN_TOKEN_TTL,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[TURN-SERVER] ❌ Failed to generate TURN token:', error.message);
    console.error('[TURN-SERVER]    Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');

    res.status(500).json({
      error: 'Failed to generate TURN credentials',
      message: error.message,
    });
  }
});

// ------------------------------------
// Start server
// ------------------------------------
app.listen(PORT, () => {
  console.log('============================================================');
  console.log(`TURN Token Server running on http://localhost:${PORT}`);
  console.log(`  Health check:     GET http://localhost:${PORT}/api/health`);
  console.log(`  TURN credentials: GET http://localhost:${PORT}/api/turn-credentials`);
  console.log(`  Token TTL:        ${TURN_TOKEN_TTL} seconds`);
  console.log(`  Twilio SID:       ${TWILIO_ACCOUNT_SID.substring(0, 6)}...`);
  console.log('============================================================');
});
