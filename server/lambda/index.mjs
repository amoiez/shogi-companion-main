// ============================================================
// AWS Lambda Handler - TURN Token Server
// ============================================================
// Generates ephemeral Twilio TURN credentials for WebRTC.
// Deploy this to AWS Lambda with API Gateway HTTP API.
//
// Environment Variables (set in Lambda Configuration):
//   TWILIO_ACCOUNT_SID  - Twilio Account SID
//   TWILIO_AUTH_TOKEN    - Twilio Auth Token  
//   TURN_TOKEN_TTL       - Token lifetime in seconds (default: 3600)
//
// API Gateway routes:
//   GET /api/health            - Health check
//   GET /api/turn-credentials  - Generate ephemeral TURN tokens
// ============================================================

import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TURN_TOKEN_TTL = parseInt(process.env.TURN_TOKEN_TTL || '3600', 10);

// Validate environment variables at cold start
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error('[LAMBDA] FATAL: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set');
  throw new Error('Missing required environment variables');
}

// Initialize Twilio client (reused across warm Lambda invocations)
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

console.log('[LAMBDA] Initialized with Twilio SID:', TWILIO_ACCOUNT_SID.substring(0, 6) + '...');

/**
 * Lambda handler for API Gateway HTTP API (Payload 2.0)
 */
export const handler = async (event) => {
  const method = event.requestContext.http.method;
  const path = event.rawPath;

  console.log(`[LAMBDA] ${method} ${path}`);

  // CORS headers
  // NOTE: Do NOT set Access-Control-Allow-Origin here — it is already
  // handled by the Lambda Function URL CORS configuration. Adding it
  // again produces duplicate header values which browsers reject.
  const origin = event.headers?.origin || '*';
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight OPTIONS requests
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Health check endpoint
  if (path === '/api/health' && method === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'turn-token-server',
        version: '1.0.0',
      }),
    };
  }

  // TURN credentials endpoint
  if (path === '/api/turn-credentials' && method === 'GET') {
    try {
      console.log('[LAMBDA] Generating ephemeral TURN token...');
      console.log('[LAMBDA]   TTL:', TURN_TOKEN_TTL, 'seconds');

      const startTime = Date.now();
      const token = await twilioClient.tokens.create({ ttl: TURN_TOKEN_TTL });
      const duration = Date.now() - startTime;

      // Normalize ICE server format
      const iceServers = token.iceServers.map((server) => {
        const entry = {};
        // Twilio returns both `url` (legacy) and `urls` (standard)
        entry.urls = server.urls || server.url;
        if (server.username) entry.username = server.username;
        if (server.credential) entry.credential = server.credential;
        return entry;
      });

      console.log('[LAMBDA] ========================================');
      console.log('[LAMBDA] ✅ Token generated successfully');
      console.log('[LAMBDA]   ICE servers:', iceServers.length);
      console.log('[LAMBDA]   Generation time:', duration, 'ms');
      iceServers.forEach((s, i) => {
        const urls = Array.isArray(s.urls) ? s.urls.join(', ') : s.urls;
        const hasAuth = 'username' in s ? ' [AUTH]' : '';
        console.log(`[LAMBDA]   [${i}] ${urls}${hasAuth}`);
      });
      console.log('[LAMBDA]   Expires in:', TURN_TOKEN_TTL, 'seconds');
      console.log('[LAMBDA] ========================================');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          iceServers,
          ttl: TURN_TOKEN_TTL,
          generatedAt: new Date().toISOString(),
        }),
      };
    } catch (error) {
      console.error('[LAMBDA] ❌ Failed to generate TURN token:', error.message);
      console.error('[LAMBDA]    Error type:', error.code);
      console.error('[LAMBDA]    Stack:', error.stack);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to generate TURN credentials',
          message: error.message,
          timestamp: new Date().toISOString(),
        }),
      };
    }
  }

  // 404 for unknown endpoints
  console.log('[LAMBDA] ⚠️  Unknown endpoint:', path);
  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({
      error: 'Not Found',
      path,
      availableEndpoints: [
        'GET /api/health',
        'GET /api/turn-credentials',
      ],
    }),
  };
};
