import twilio from 'twilio';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const region = "ap-northeast-1"; // Region where the Kitsunagi-Twilio-Auth secret is stored
const secretName = "Kitsunagi-Twilio-Auth";
const client = new SecretsManagerClient({ region });

export const handler = async (event) => {
  const method = event.requestContext.http.method;
  const path = event.rawPath;
  const headers = { 'Content-Type': 'application/json' };

  try {
    // 1. Fetch credentials from Secrets Manager
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);
    const secrets = JSON.parse(response.SecretString);

    // 2. Extract Twilio keys from the secret
    const accountSid = secrets.TWILIO_ACCOUNT_SID;
    const authToken = secrets.TWILIO_AUTH_TOKEN;
    const apiKeySid = secrets.TWILIO_API_KEY_SID;

    // 3. Initialize Twilio client
    const twilioClient = twilio(accountSid, authToken);

    // 4. Handle TURN Credentials endpoint
    if (path === '/api/turn-credentials' && method === 'GET') {
      const ttl = 3600; // Default TTL in seconds
      const token = await twilioClient.tokens.create({ ttl });
      
      const iceServers = token.iceServers.map(server => ({
        urls: server.urls || server.url,
        username: server.username,
        credential: server.credential
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ iceServers }),
      };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not Found' }) };

  } catch (error) {
    console.error('[LAMBDA] Error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate TURN credentials', message: error.message }),
    };
  }
};