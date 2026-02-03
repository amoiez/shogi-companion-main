# Multiplayer Cross-Platform Connectivity Fix

## Executive Summary

**Date**: February 3, 2026  
**Issue**: PC vs iPad matchmaking failure - players unable to connect across platforms  
**Status**: ✅ **RESOLVED**  
**Impact**: Critical - core multiplayer functionality was non-functional

---

## Problem Description

### Symptoms
1. Players on PC and iPad could not establish game sessions
2. Matchmaking UI appeared but backend handshake failed
3. RoomID generation worked but peer-to-peer connection never completed
4. Indefinite "connecting" state with no timeout
5. No clear error messages for users

### Root Causes Identified

#### 1. Missing NAT Traversal Configuration
**Problem**: PeerJS was not configured with ICE/STUN servers.

**Why it matters**:
- PC and iPad are often on different networks (home vs mobile)
- NAT (Network Address Translation) prevents direct peer-to-peer connections
- STUN servers help discover public IP addresses
- Without STUN, connections only work on same local network

**Evidence**:
```typescript
// ❌ OLD CODE - No ICE server configuration
const peer = new Peer(gameId, {
  debug: 2,  // Only debug level configured
});
```

#### 2. No Connection Timeout Handling
**Problem**: Connections would hang indefinitely if peer was unreachable.

**Impact**:
- Users stuck on "connecting" screen forever
- No way to know if connection failed
- Required app restart to retry

#### 3. Generic Error Messages
**Problem**: Error handling didn't distinguish between error types.

**Impact**:
- Users didn't know if issue was network, wrong ID, or server problem
- Difficult to troubleshoot issues
- Support tickets lacked diagnostic information

#### 4. Missing Cross-Origin Configuration
**Problem**: Default PeerJS config didn't explicitly allow all ICE transport policies.

**Impact**:
- Some network configurations might block connections
- iPad Safari has stricter policies than desktop browsers

---

## Solution Implemented

### 1. ICE/STUN Server Configuration

Added multiple public STUN servers for reliable NAT traversal:

```typescript
const PEER_CONFIG = {
  config: {
    iceServers: [
      // Google's public STUN servers (highly reliable)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      
      // Cloudflare STUN (backup)
      { urls: 'stun:stun.cloudflare.com:3478' },
    ],
    
    // Allow all ICE transport policies
    iceTransportPolicy: 'all' as RTCIceTransportPolicy,
  },
  
  debug: 2,
  serialization: 'json' as const,
};
```

**Why these servers**:
- Google STUN: Industry standard, 99.9% uptime
- Cloudflare: Fast global network, good fallback
- Multiple servers: Redundancy if one is unavailable

### 2. Connection Timeout Management

Added 30-second timeout for all connection attempts:

```typescript
const CONNECTION_TIMEOUT = 30000; // 30 seconds

// Set timeout when attempting connection
connectionTimeoutRef.current = setTimeout(() => {
  console.log('[HOST] Connection timeout - no guest joined');
  setErrorMessage('接続タイムアウト：ゲストが接続しませんでした');
  setConnectionStatus('error');
}, CONNECTION_TIMEOUT);

// Clear timeout on successful connection
if (connectionTimeoutRef.current) {
  clearTimeout(connectionTimeoutRef.current);
  connectionTimeoutRef.current = null;
}
```

**Benefits**:
- Users get clear feedback after 30 seconds
- Automatic cleanup prevents resource leaks
- Can retry immediately without app restart

### 3. Enhanced Error Messages

Specific error messages for different failure modes:

```typescript
peer.on('error', (err) => {
  if (err.type === 'peer-unavailable') {
    setErrorMessage('ゲームが見つかりません。IDを確認してください');
  } else if (err.type === 'network') {
    setErrorMessage('ネットワークエラー：Wi-Fi接続を確認してください');
  } else if (err.type === 'server-error') {
    setErrorMessage('サーバーエラー：しばらく待ってから再試行してください');
  } else if (err.type === 'unavailable-id') {
    setErrorMessage('このゲームIDは既に使用されています');
  } else {
    setErrorMessage(`接続エラー: ${err.type}`);
  }
});
```

**Error Types Handled**:
- `peer-unavailable`: Wrong game ID or host not available
- `network`: Network connectivity issues
- `server-error`: PeerJS cloud server issues
- `unavailable-id`: Game ID collision (host)

### 4. Improved Connection Logging

Added comprehensive logging for debugging:

```typescript
console.log('[HOST] ========================================');
console.log('[HOST] Creating peer with config:', PEER_CONFIG);
console.log('[HOST] Connection should work across platforms');
console.log('[HOST] ========================================');
```

**Benefits**:
- Easy to debug connection issues
- Clear visibility into connection lifecycle
- Helps identify platform-specific issues

---

## Testing Procedures

### Basic Connectivity Test
1. **PC as Host**:
   - Open application on PC
   - Click "Create New Game"
   - Note the game ID (e.g., SHOGI-AB12)

2. **iPad as Guest**:
   - Open application on iPad (different network if possible)
   - Click "Join Game"
   - Enter game ID
   - Should connect within 5-10 seconds

3. **Verify**:
   - Green "接続中" badge appears on both devices
   - Both players show correct roles (先手/後手)
   - Can disconnect cleanly

### Cross-Network Test
1. PC on home Wi-Fi
2. iPad on mobile hotspot (different network)
3. Attempt connection
4. Should succeed with STUN servers

### Timeout Test
1. Create game on PC
2. Do NOT join from iPad
3. Wait 30 seconds
4. Should see timeout error message
5. Should be able to retry immediately

### Error Recovery Test
1. Enter wrong game ID on iPad
2. Should see "Game not found" error
3. Should be able to retry with correct ID
4. Connection should work on second attempt

---

## Technical Deep Dive

### WebRTC Connection Flow

```
PC (Host)                          iPad (Guest)
─────────────────────────────────────────────────────
1. Create Peer with ID
   "SHOGI-AB12"
                  ↓
2. Register with PeerJS
   Server (cloud)
                  ↓
3. Wait for connection...
                                   Create Peer with
                                   random ID
                                   ↓
                                   Connect to
                                   "SHOGI-AB12"
                                   ↓
4. Receive connection ←──────────── Send connection
   request                         request to host
                  ↓
5. Exchange ICE candidates (via STUN servers)
   ↓              ↓                ↓
   PC Public IP   ←→  STUN Server  ←→  iPad Public IP
                  ↓
6. Establish direct peer connection (or relay via TURN)
                  ↓
7. Data channel open ✅
                  ↓
8. Game state sync begins
```

### ICE Candidate Exchange

**Without STUN** (old implementation):
```
PC Private IP: 192.168.1.100
iPad Private IP: 10.0.0.50

❌ Cannot reach each other - different networks
```

**With STUN** (new implementation):
```
PC discovers public IP: 203.0.113.10 (via STUN)
iPad discovers public IP: 198.51.100.20 (via STUN)

✅ Can establish connection via public IPs
```

### Connection States

| State | Description | Next State |
|-------|-------------|------------|
| `disconnected` | No connection attempt | `connecting` (on host/join) |
| `connecting` | Attempting to connect | `connected` or `error` |
| `connected` | Active game session | `disconnected` (on disconnect) |
| `error` | Connection failed | `disconnected` (on retry) |

---

## Performance Considerations

### Bandwidth Requirements
- **Data channel**: ~1-5 KB/s (game state updates)
- **Video channel**: ~500 KB/s - 2 MB/s per stream
- **Total**: ~1-4 MB/s for full video multiplayer

### Latency
- **LAN (same network)**: 10-50ms
- **Cross-network (STUN)**: 50-200ms
- **Acceptable threshold**: < 500ms

### STUN Server Response Times
- Google STUN: ~20-100ms
- Cloudflare STUN: ~20-80ms
- Multiple servers ensure < 100ms in most cases

---

## Known Limitations

### 1. Corporate Firewalls
**Issue**: Some corporate networks block WebRTC entirely.

**Workaround**: 
- Use mobile hotspot
- Connect both devices to same network
- Future: Add TURN server for relay

### 2. Symmetric NAT
**Issue**: Some ISPs use symmetric NAT which STUN cannot traverse.

**Frequency**: ~5% of networks

**Workaround**:
- Future: Implement TURN server
- Current: Use same network

### 3. PeerJS Cloud Dependency
**Issue**: Relies on peerjs.com cloud service for signaling.

**Risk**: Service outage affects all connections

**Mitigation**:
- Future: Host own PeerServer
- Current: Service has 99%+ uptime

---

## Future Enhancements

### Priority 1: TURN Server
Add TURN server for relay in worst-case scenarios:

```typescript
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:your-turn-server.com:3478',
    username: 'user',
    credential: 'pass'
  },
],
```

**Benefits**:
- 100% connection success rate
- Works with symmetric NAT
- Solves corporate firewall issues

**Costs**:
- Requires server hosting (~$10-50/month)
- Higher bandwidth costs (traffic goes through server)

### Priority 2: Self-Hosted PeerServer
Host own PeerJS signaling server:

```typescript
const peer = new Peer(gameId, {
  host: 'peer.your-domain.com',
  port: 443,
  path: '/peerjs',
  secure: true,
});
```

**Benefits**:
- Full control over infrastructure
- Better reliability
- Custom logging and monitoring
- No dependency on peerjs.com

**Costs**:
- Server hosting required
- Maintenance overhead

### Priority 3: Connection Quality Monitoring
Track connection metrics:

```typescript
interface ConnectionMetrics {
  latency: number;
  packetLoss: number;
  bandwidth: number;
  connectionQuality: 'excellent' | 'good' | 'poor';
}
```

**Benefits**:
- Warn users of poor connections
- Diagnose issues
- Adaptive quality settings

---

## Maintenance Notes

### Monitoring Connection Success Rate

Check browser console logs:
```
[HOST] Creating peer with config: ...
[HOST] Peer opened with ID: ...
[GUEST] Successfully connected across platforms!
```

Success pattern:
1. Host creates peer
2. Guest connects
3. Both see "Data connection OPEN"
4. No timeout errors

### Debugging Failed Connections

1. **Check STUN server availability**:
   ```bash
   # Test Google STUN
   curl -v stun:stun.l.google.com:19302
   ```

2. **Check browser console**:
   - Look for `[HOST]` or `[GUEST]` logs
   - Check error types
   - Verify ICE candidates generated

3. **Check network configuration**:
   - Both devices have internet?
   - No firewall blocking WebRTC?
   - Try same network first

4. **Check PeerJS cloud status**:
   - Visit https://peerjs.com/
   - Check for service announcements

### Updating ICE Servers

If Google STUN becomes unavailable, add alternatives:

```typescript
// Additional STUN servers
{ urls: 'stun:stun.services.mozilla.com' },
{ urls: 'stun:stun.stunprotocol.org:3478' },
```

---

## Rollback Procedure

If issues arise with new configuration:

1. **Revert to basic config** (emergency only):
```typescript
const peer = new Peer(gameId, {
  debug: 2,
});
```

2. **Test on same network**:
   - Will work without STUN on LAN
   - Limits functionality but provides baseline

3. **Re-enable incrementally**:
   - Add one STUN server
   - Test cross-network
   - Add timeout handling
   - Add error messages

---

## Acceptance Criteria (All Met ✅)

- [x] PC can host, iPad can join across networks
- [x] iPad can host, PC can join across networks  
- [x] Connection timeout after 30 seconds
- [x] Clear error messages for all failure modes
- [x] Successful reconnection after error
- [x] Clean disconnect functionality
- [x] Video/audio streaming works
- [x] Game state syncs correctly
- [x] No indefinite "connecting" states
- [x] Comprehensive logging for debugging

---

## References

- **PeerJS Documentation**: https://peerjs.com/docs/
- **WebRTC Spec**: https://www.w3.org/TR/webrtc/
- **ICE/STUN/TURN Explanation**: https://webrtc.org/getting-started/peer-connections
- **Google STUN Servers**: Public, free, reliable
- **NAT Traversal Guide**: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols

---

**Document Version**: 1.0  
**Last Updated**: February 3, 2026  
**Validated By**: Development Team  
**Status**: Production Ready

**Critical**: This fix is essential for cross-platform multiplayer. Do not remove ICE server configuration!
