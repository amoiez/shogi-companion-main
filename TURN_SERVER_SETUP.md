# TURN Server Setup Guide

## Overview
For reliable WebRTC connections between PC and iPad across different networks, a TURN server is **REQUIRED**. STUN alone is insufficient for NAT traversal in many network configurations.

## Quick Setup with Twilio (Recommended)

### 1. Create a Twilio Account
- Sign up at https://www.twilio.com/
- Navigate to your Twilio Console
- Go to **Network Traversal** section

### 2. Get TURN Credentials
- Copy your TURN credentials:
  - Account SID (this becomes your `username`)
  - Auth Token (this becomes your `credential`)

### 3. Update Configuration
Edit `src/hooks/useMultiplayer.ts` and replace placeholder values:

```typescript
const PEER_CONFIG = {
  debug: 2,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: 'turn:global.turn.twilio.com:3478?transport=udp',
        username: 'YOUR_TWILIO_ACCOUNT_SID',      // Replace this
        credential: 'YOUR_TWILIO_AUTH_TOKEN'      // Replace this
      },
      {
        urls: 'turn:global.turn.twilio.com:3478?transport=tcp',
        username: 'YOUR_TWILIO_ACCOUNT_SID',      // Replace this
        credential: 'YOUR_TWILIO_AUTH_TOKEN'      // Replace this
      },
      {
        urls: 'turn:global.turn.twilio.com:443?transport=tcp',
        username: 'YOUR_TWILIO_ACCOUNT_SID',      // Replace this
        credential: 'YOUR_TWILIO_AUTH_TOKEN'      // Replace this
      },
    ],
  },
};
```

### 4. Test the Connection
- Host a game on PC
- Join from iPad on a different network
- Verify both data and video streams connect

## Alternative: Self-Hosted Coturn on AWS

### 1. Launch EC2 Instance
```bash
# Ubuntu 22.04 LTS, t3.medium or larger
# Open ports: 3478 (UDP/TCP), 49152-65535 (UDP)
```

### 2. Install Coturn
```bash
sudo apt update
sudo apt install coturn
```

### 3. Configure Coturn
Edit `/etc/turnserver.conf`:
```
listening-port=3478
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=YOUR_SECRET_KEY
realm=yourdomain.com
total-quota=100
bps-capacity=0
stale-nonce
no-multicast-peers
```

### 4. Start Coturn
```bash
sudo systemctl enable coturn
sudo systemctl start coturn
```

### 5. Update App Configuration
```typescript
{
  urls: 'turn:your-ec2-ip:3478',
  username: 'username',
  credential: 'YOUR_SECRET_KEY'
}
```

## Testing TURN Server

### Browser Console Test
```javascript
const pc = new RTCPeerConnection({
  iceServers: [
    {
      urls: 'turn:global.turn.twilio.com:3478',
      username: 'YOUR_USERNAME',
      credential: 'YOUR_CREDENTIAL'
    }
  ]
});

pc.createDataChannel('test');
pc.createOffer().then(offer => pc.setLocalDescription(offer));

pc.onicecandidate = (event) => {
  if (event.candidate) {
    console.log('ICE Candidate:', event.candidate.candidate);
    // Look for "typ relay" in the output - this confirms TURN is working
  }
};
```

### Expected Output
You should see candidates with `typ relay` in addition to `typ srflx` and `typ host`:
```
candidate:... typ relay raddr ... rport ...
```

## Troubleshooting

### Connection Fails on iPad
- Ensure TURN credentials are correct
- Check iOS Safari allows camera/microphone access
- Verify network allows outbound connections on ports 3478 and 443

### High Latency
- Use regional TURN servers close to users
- Consider upgrading EC2 instance type
- Check network bandwidth

### Cost Optimization
- Twilio free tier: 750 minutes/month
- Self-hosted: ~$20-40/month for t3.medium EC2
- Consider usage-based scaling

## Security Notes

- **NEVER commit TURN credentials** to version control
- Use environment variables for production:
  ```typescript
  credential: import.meta.env.VITE_TURN_CREDENTIAL
  ```
- Rotate credentials regularly
- Monitor usage for unexpected spikes

## References

- [Twilio TURN Documentation](https://www.twilio.com/docs/stun-turn)
- [Coturn GitHub](https://github.com/coturn/coturn)
- [WebRTC ICE Overview](https://webrtcglossary.com/ice/)
