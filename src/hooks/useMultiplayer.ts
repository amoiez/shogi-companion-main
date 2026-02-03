import { useState, useEffect, useCallback, useRef } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { CellData } from './useGameState';

// ============================================================
// COORDINATE SYSTEM - NO MIRRORING NEEDED! (FIXED)
// ============================================================
// CRITICAL FIX: Removed board mirroring that was compensating for coordinate translation bugs
//details below.
// WHY NO MIRRORING IS NEEDED:
// - Both Host and Guest use the SAME logical board state
// - board[0] = Gote pieces (row 0), board[8] = Sente pieces (row 8)
// - Host view: No CSS rotation
//   → board[0] renders at top (opponent pieces) ✅
//   → board[8] renders at bottom (own pieces) ✅
// - Guest view: CSS rotate(180deg) on board container
//   → board[0] renders at top, rotates to bottom (own pieces) ✅
//   → board[8] renders at bottom, rotates to top (opponent pieces) ✅
//
// MOVE SYNCHRONIZATION (Example):
//   Host moves piece from (8,4) → (7,4):
//     1. Host updates local: board[7][4] = piece
//     2. Host sends: board[7][4] = piece
//     3. Guest receives: board[7][4] = piece
//     4. Guest renders with CSS rotation → appears at visual top (opponent) ✅
//
//   Guest moves piece from (0,4) → (1,4):
//     1. Guest clicks visual bottom (row 0 after rotation)
//     2. Array index = 0 (logical coordinate)
//     3. Guest updates local: board[1][4] = piece
//     4. Guest sends: board[1][4] = piece
//     5. Host receives: board[1][4] = piece
//     6. Host renders without rotation → appears at top (opponent) ✅
//
// THE OLD MIRRORING WAS WRONG:
//   It was compensating for coordinate translation bugs in ShogiBoard.tsx
//   Those bugs have been fixed, so mirroring is no longer needed!
// ============================================================

// Generate a short random game ID
const generateGameId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0/O, 1/I
  let id = 'SHOGI-';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

// ============================================================
// CRITICAL: Generate TRUE UUID for peer identification
// This prevents ID collisions when multiple iPads try to connect
// ============================================================
const generateUniqueClientId = (): string => {
  // Use crypto.randomUUID() for guaranteed uniqueness
  // Falls back to timestamp + random for older browsers
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
};

// ============================================================
// Detect Mobile Safari for special handling
// ============================================================
const isMobileSafari = (): boolean => {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS|Chrome/.test(ua);
  return iOS && webkit && notChrome;
};

export type PlayerRole = 'host' | 'guest' | null;
export type GameRole = 'sente' | 'gote' | null;
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface GameState {
  board: CellData[][];
  senteHand: string[];
  goteHand: string[];
  moveCount: number;
  currentTurn: 'sente' | 'gote';
  senteTime: number;
  goteTime: number;
  lastMove?: {
    from: { row: number; col: number } | null;
    to: { row: number; col: number };
    piece: string;
    promoted: boolean;
    captured: string | null;
    isDrop: boolean;
  };
}

export interface GameMessage {
  type: 'MOVE' | 'SYNC' | 'READY' | 'ROLE_ASSIGN';
  gameState?: GameState;
  assignedRole?: 'sente' | 'gote';
}

export interface UseMultiplayerReturn {
  // Connection state
  gameId: string | null;
  role: PlayerRole;
  gameRole: GameRole;
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;
  
  // Actions
  hostGame: () => void;
  joinGame: (gameId: string) => void;
  disconnect: () => void;
  
  // Game state sync
  sendMove: (gameState: GameState) => void;
  onReceiveState: (callback: (state: GameState) => void) => void;
  
  // Media streams
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  
  // Turn management
  isMyTurn: boolean;
  currentTurn: 'sente' | 'gote';
}

// ============================================================
// PEERJS CONFIGURATION FOR CROSS-PLATFORM CONNECTIVITY
// ============================================================
// STUN servers enable NAT traversal for cross-network connections
// while still allowing same-network connections to work
const PEER_CONFIG = {
  // Debug level (0-3, 3 = verbose)
  debug: 2,
  
  // ICE servers for NAT traversal - works for both local and remote connections
  config: {
    iceServers: [
      // Google's public STUN servers (used for discovering public IPs)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  },
};

// Connection timeout (30 seconds)
const CONNECTION_TIMEOUT = 30000;

export const useMultiplayer = (): UseMultiplayerReturn => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [role, setRole] = useState<PlayerRole>(null);
  const [gameRole, setGameRole] = useState<GameRole>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [currentTurn, setCurrentTurn] = useState<'sente' | 'gote'>('sente');
  
  const peerRef = useRef<Peer | null>(null);
  const dataConnectionRef = useRef<DataConnection | null>(null);
  const mediaConnectionRef = useRef<MediaConnection | null>(null);
  const receiveCallbackRef = useRef<((state: GameState) => void) | null>(null);
  const roleRef = useRef<PlayerRole>(null); // Store role in ref for callbacks
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetriesRef = useRef<number>(isMobileSafari() ? 10 : 5); // More retries for Mobile Safari
  const handshakeReceivedRef = useRef<boolean>(false);
  
  // Keep roleRef in sync with role state
  useEffect(() => {
    roleRef.current = role;
  }, [role]);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('[Multiplayer] Cleaning up connections...');
    
    // Clear connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    // Clear retry interval
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
    
    // Reset retry state
    retryCountRef.current = 0;
    handshakeReceivedRef.current = false;
    
    if (mediaConnectionRef.current) {
      mediaConnectionRef.current.close();
      mediaConnectionRef.current = null;
    }
    if (dataConnectionRef.current) {
      dataConnectionRef.current.close();
      dataConnectionRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
  }, [localStream]);

  // Get user media (camera/mic)
  const setupMedia = useCallback(async (): Promise<MediaStream | null> => {
    try {
      console.log('[Multiplayer] Requesting camera/mic access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      console.log('[Multiplayer] Got local media stream');
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('[Multiplayer] Failed to get user media:', err);
      setErrorMessage('カメラ/マイクへのアクセスが拒否されました');
      return null;
    }
  }, []);

  // ============================================================
  // CRITICAL: Data Listener Setup
  // This function MUST be called after the connection is established
  // ============================================================
  const setupDataListener = useCallback((conn: DataConnection) => {
    console.log('[DATA] Setting up data listener on connection:', conn.peer);
    
    // Store the connection reference
    dataConnectionRef.current = conn;
    
    // Listen for incoming data
    conn.on('data', (data) => {
      console.log('[DATA] ========================================');
      console.log('[DATA] Received data from peer:', JSON.stringify(data, null, 2));
      console.log('[DATA] ========================================');
      
      const message = data as GameMessage;
      
      if (message.type === 'ROLE_ASSIGN' && message.assignedRole) {
        console.log('[DATA] ========================================');
        console.log('[DATA] Received ROLE_ASSIGN:', message.assignedRole);
        console.log('[DATA] ========================================');
        setGameRole(message.assignedRole);
      } else if (message.type === 'MOVE' && message.gameState) {
        console.log('[DATA] Processing MOVE - New turn:', message.gameState.currentTurn);
        console.log('[DATA] Board state received, moveCount:', message.gameState.moveCount);
        
        // ✅ FIX: Use received state directly without mirroring
        // Both players maintain the same logical board state
        // CSS rotation handles visual differences
        const receivedState = message.gameState;
        
        // Update local turn state
        setCurrentTurn(receivedState.currentTurn);
        
        // Call the registered callback to update game state
        if (receiveCallbackRef.current) {
          console.log('[DATA] Calling receiveCallback to update local game state');
          receiveCallbackRef.current(receivedState);
        } else {
          console.warn('[DATA] No receiveCallback registered!');
        }
      } else if (message.type === 'SYNC' && message.gameState) {
        console.log('[DATA] Processing SYNC - Turn:', message.gameState.currentTurn);
        
        // ✅ FIX: Use synced state directly without mirroring
        const syncedState = message.gameState;
        
        setCurrentTurn(syncedState.currentTurn);
        if (receiveCallbackRef.current) {
          receiveCallbackRef.current(syncedState);
        }
      } else if (message.type === 'READY') {
        console.log('[DATA] ========================================');
        console.log('[DATA] Received READY signal from peer');
        console.log('[DATA] Handshake complete!');
        console.log('[DATA] ========================================');
        handshakeReceivedRef.current = true;
        
        // Clear retry interval if it exists
        if (retryIntervalRef.current) {
          clearInterval(retryIntervalRef.current);
          retryIntervalRef.current = null;
        }
      }
    });
    
    conn.on('close', () => {
      console.log('[DATA] Data connection CLOSED');
      setConnectionStatus('disconnected');
      dataConnectionRef.current = null;
    });
    
    conn.on('error', (err) => {
      console.error('[DATA] Data connection ERROR:', err);
      setErrorMessage('データ接続エラーが発生しました');
    });
  }, []);

  // ============================================================
  // Handle incoming media call (Video/Audio)
  // ============================================================
  const setupMediaConnection = useCallback((call: MediaConnection, stream: MediaStream) => {
    console.log('[MEDIA] Setting up media connection');
    mediaConnectionRef.current = call;
    
    call.on('stream', (remoteMediaStream) => {
      console.log('[MEDIA] Received remote video/audio stream');
      setRemoteStream(remoteMediaStream);
    });
    
    call.on('close', () => {
      console.log('[MEDIA] Media connection closed');
      setRemoteStream(null);
    });
    
    call.on('error', (err) => {
      console.error('[MEDIA] Media connection error:', err);
    });
    
    call.answer(stream);
  }, []);

  // ============================================================
  // HOST: Create a new game and wait for guest
  // ============================================================
  const hostGame = useCallback(async () => {
    cleanup();
    setConnectionStatus('connecting');
    setErrorMessage(null);
    
    const newGameId = generateGameId();
    console.log('[HOST] Creating game with ID:', newGameId);
    setGameId(newGameId);
    setRole('host');
    setGameRole('sente'); // Host plays as Sente
    setCurrentTurn('sente');
    
    // Get media first
    const stream = await setupMedia();
    
    // Create peer with the game ID and full configuration
    console.log('[HOST] Creating peer with config:', PEER_CONFIG);
    const peer = new Peer(newGameId, PEER_CONFIG);
    peerRef.current = peer;
    
    peer.on('open', (id) => {
      console.log('[HOST] ========================================');
      console.log('[HOST] Peer opened with ID:', id);
      console.log('[HOST] Waiting for guest to connect...');
      console.log('[HOST] Connection should work across platforms');
      console.log('[HOST] ========================================');
      setConnectionStatus('disconnected'); // Waiting for guest
      
      // Set connection timeout (guest has 30 seconds to join)
      connectionTimeoutRef.current = setTimeout(() => {
        console.log('[HOST] Connection timeout - no guest joined');
        setErrorMessage('接続タイムアウト：ゲストが接続しませんでした');
        setConnectionStatus('error');
      }, CONNECTION_TIMEOUT);
    });
    
    // CRITICAL: Listen for incoming DATA connections from guest
    peer.on('connection', (conn) => {
      console.log('[HOST] ========================================');
      console.log('[HOST] Guest DATA connection received!');
      console.log('[HOST] Guest peer ID:', conn.peer);
      console.log('[HOST] ========================================');
      
      // Wait for the connection to open, then set up listener
      conn.on('open', () => {
        console.log('[HOST] ========================================');
        console.log('[HOST] Data connection is now OPEN');
        console.log('[HOST] Guest successfully connected!');
        console.log('[HOST] ========================================');
        
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        setupDataListener(conn);
        setConnectionStatus('connected');
        
        // Send ROLE_ASSIGN message to guest (guest plays as Gote)
        const roleMessage: GameMessage = { type: 'ROLE_ASSIGN', assignedRole: 'gote' };
        conn.send(roleMessage);
        console.log('[HOST] Sent ROLE_ASSIGN (gote) to guest');
        
        // Send a READY message to confirm connection
        conn.send({ type: 'READY' });
        console.log('[HOST] Sent READY message to guest');
        
        // ============================================================
        // CRITICAL: ONLY HOST INITIATES MEDIA CALL
        // Guest will only answer, never initiate
        // This prevents duplicate media streams and race conditions
        // ============================================================
        if (stream && peer) {
          console.log('[HOST] ========================================');
          console.log('[HOST] HOST IS SOLE MEDIA CALL INITIATOR');
          console.log('[HOST] Initiating VIDEO call to guest:', conn.peer);
          console.log('[HOST] ========================================');
          
          const hostCall = peer.call(conn.peer, stream);
          if (hostCall) {
            mediaConnectionRef.current = hostCall;
            
            hostCall.on('stream', (remoteMediaStream) => {
              console.log('[HOST] ✅ Received guest VIDEO stream');
              setRemoteStream(remoteMediaStream);
            });
            
            hostCall.on('error', (err) => {
              console.error('[HOST] ❌ Media call error:', err);
            });
          } else {
            console.warn('[HOST] ⚠️ Failed to create media call');
          }
        }
      });
    });
    
    // HOST: DO NOT listen for incoming calls (guest should never initiate)
    peer.on('call', (call) => {
      console.warn('[HOST] ⚠️ Received unexpected incoming call from guest - rejecting');
      console.warn('[HOST] ⚠️ Guest should NEVER initiate media calls');
      // Do not answer - this prevents duplicate media streams
    });
    
    peer.on('error', (err) => {
      console.error('[HOST] ========================================');
      console.error('[HOST] Peer error:', err);
      console.error('[HOST] Error type:', err.type);
      console.error('[HOST] ========================================');
      
      // Clear timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      // Provide error message
      if (err.type === 'unavailable-id') {
        setErrorMessage('このゲームIDは既に使用されています。もう一度お試しください');
      } else {
        setErrorMessage(`接続エラー: ${err.type}`);
      }
      setConnectionStatus('error');
    });
    
    peer.on('disconnected', () => {
      console.log('[HOST] Peer disconnected from server');
    });
  }, [cleanup, setupMedia, setupDataListener, setupMediaConnection]);

  // ============================================================
  // GUEST: Join an existing game
  // ============================================================
  const joinGame = useCallback(async (targetGameId: string) => {
    cleanup();
    setConnectionStatus('connecting');
    setErrorMessage(null);
    
    const formattedId = targetGameId.toUpperCase().trim();
    console.log('[GUEST] Joining game:', formattedId);
    setGameId(formattedId);
    setRole('guest');
    setGameRole(null); // Wait for host to assign role
    setCurrentTurn('sente'); // Game always starts with Sente's turn
    
    // Get media first
    const stream = await setupMedia();
    
    // Create peer with TRUE UUID for guaranteed uniqueness
    // CRITICAL FIX: This prevents ID collisions between multiple iPads
    const guestId = `GUEST-${generateUniqueClientId()}`;
    const isSafari = isMobileSafari();
    
    console.log('[GUEST] ========================================');
    console.log('[GUEST] Creating peer with UNIQUE ID:', guestId);
    console.log('[GUEST] Will connect to host:', formattedId);
    console.log('[GUEST] Mobile Safari detected:', isSafari);
    console.log('[GUEST] Using cross-platform config with retry logic');
    console.log('[GUEST] ========================================');
    
    const peer = new Peer(guestId, PEER_CONFIG);
    peerRef.current = peer;
    
    // Set connection timeout
    connectionTimeoutRef.current = setTimeout(() => {
      console.log('[GUEST] Connection timeout - could not reach host');
      setErrorMessage('接続タイムアウト：ホストに接続できませんでした');
      setConnectionStatus('error');
      cleanup();
    }, CONNECTION_TIMEOUT);
    
    // ============================================================
    // CRITICAL: Register call listener BEFORE peer opens
    // This ensures we don't miss the host's media call
    // ============================================================
    peer.on('call', (call) => {
      console.log('[GUEST] ========================================');
      console.log('[GUEST] Received incoming VIDEO call from host');
      console.log('[GUEST] GUEST WILL ONLY ANSWER (never initiate)');
      console.log('[GUEST] ========================================');
      
      if (stream) {
        console.log('[GUEST] Answering host call with local stream');
        setupMediaConnection(call, stream);
      } else {
        console.warn('[GUEST] ⚠️ No local stream to answer with');
      }
    });
    
    peer.on('open', () => {
      console.log('[GUEST] Peer opened, now connecting to host:', formattedId);
      
      // ============================================================
      // CRITICAL: Connect DATA channel to host
      // ============================================================
      console.log('[GUEST] Initiating DATA connection to host...');
      const conn = peer.connect(formattedId, { 
        reliable: true,
        serialization: 'json'
      });
      
      conn.on('open', () => {
        console.log('[GUEST] ========================================');
        console.log('[GUEST] DATA connection to host is now OPEN!');
        console.log('[GUEST] Successfully connected across platforms!');
        console.log('[GUEST] ========================================');
        
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        // Set up the data listener AFTER connection is open
        setupDataListener(conn);
        
        // Send READY signal to host
        const readyMessage: GameMessage = { type: 'READY' };
        conn.send(readyMessage);
        console.log('[GUEST] Sent initial READY signal to host');
        
        // ============================================================
        // CRITICAL: Retry-on-Fail Handshake for Mobile Safari
        // Re-broadcast READY signal every 500ms until acknowledged
        // ============================================================
        if (isSafari) {
          console.log('[GUEST] Mobile Safari: Starting retry handshake mechanism');
          retryCountRef.current = 0;
          
          retryIntervalRef.current = setInterval(() => {
            if (handshakeReceivedRef.current) {
              console.log('[GUEST] Handshake confirmed - stopping retries');
              if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
                retryIntervalRef.current = null;
              }
              return;
            }
            
            retryCountRef.current++;
            
            if (retryCountRef.current > maxRetriesRef.current) {
              console.warn('[GUEST] Max retries reached - assuming connection is stable');
              if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
                retryIntervalRef.current = null;
              }
              return;
            }
            
            console.log(`[GUEST] Retry ${retryCountRef.current}/${maxRetriesRef.current}: Re-sending READY signal`);
            if (conn.open) {
              conn.send(readyMessage);
            }
          }, 500);
        }
        
        setConnectionStatus('connected');
      });
      
      conn.on('error', (err) => {
        console.error('[GUEST] ========================================');
        console.error('[GUEST] Data connection error:', err);
        console.error('[GUEST] ========================================');
        
        // Clear timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        setErrorMessage('ホストへの接続に失敗しました');
        setConnectionStatus('error');
      });
    });
    
    peer.on('error', (err) => {
      console.error('[GUEST] ========================================');
      console.error('[GUEST] Peer error:', err);
      console.error('[GUEST] Error type:', err.type);
      console.error('[GUEST] ========================================');
      
      // Clear timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      // Provide error message based on type
      if (err.type === 'peer-unavailable') {
        setErrorMessage('ゲームが見つかりません。IDを確認してください');
      } else if (err.type === 'unavailable-id') {
        setErrorMessage('ゲームIDが無効です');
      } else {
        setErrorMessage(`接続エラー: ${err.type}`);
      }
      setConnectionStatus('error');
    });
    
    peer.on('disconnected', () => {
      console.log('[GUEST] Peer disconnected from server');
    });
  }, [cleanup, setupMedia, setupDataListener]);

  // ============================================================
  // Disconnect from game
  // ============================================================
  const disconnect = useCallback(() => {
    console.log('[Multiplayer] Disconnecting...');
    cleanup();
    setGameId(null);
    setRole(null);
    setGameRole(null);
    setConnectionStatus('disconnected');
    setErrorMessage(null);
    setCurrentTurn('sente');
  }, [cleanup]);

  // ============================================================
  // SEND MOVE: Send game state to peer (NO MIRRORING)
  // ============================================================
  const sendMove = useCallback((gameState: GameState) => {
    const conn = dataConnectionRef.current;
    
    if (conn && conn.open) {
      // ✅ FIX: Send game state directly without mirroring
      // Both players use the same logical board state
      // CSS rotation handles visual differences
      const message: GameMessage = {
        type: 'MOVE',
        gameState: gameState,
      };
      
      console.log('[SEND] ========================================');
      console.log('[SEND] Sending MOVE to peer');
      console.log('[SEND] Role:', role);
      console.log('[SEND] Turn:', gameState.currentTurn);
      console.log('[SEND] Move count:', gameState.moveCount);
      console.log('[SEND] NO MIRRORING (fixed architecture)');
      console.log('[SEND] Connection open:', conn.open);
      console.log('[SEND] ========================================');
      
      conn.send(message);
      setCurrentTurn(gameState.currentTurn);
    } else {
      console.error('[SEND] ========================================');
      console.error('[SEND] CANNOT SEND - Connection not open!');
      console.error('[SEND] Connection ref:', conn);
      console.error('[SEND] Is open:', conn?.open);
      console.error('[SEND] ========================================');
    }
  }, [role]);

  // Register callback for receiving state
  const onReceiveState = useCallback((callback: (state: GameState) => void) => {
    console.log('[Multiplayer] Registering receive state callback');
    receiveCallbackRef.current = callback;
  }, []);

  // Calculate if it's my turn based on GAME ROLE (sente/gote), NOT connection role (host/guest)
  // This ensures turn logic works regardless of device type
  const isMyTurn = 
    (gameRole === 'sente' && currentTurn === 'sente') || 
    (gameRole === 'gote' && currentTurn === 'gote') ||
    gameRole === null; // Single player mode or role not yet assigned - allow moves

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    gameId,
    role,
    gameRole,
    connectionStatus,
    errorMessage,
    hostGame,
    joinGame,
    disconnect,
    sendMove,
    onReceiveState,
    localStream,
    remoteStream,
    isMyTurn,
    currentTurn,
  };
};

export default useMultiplayer;
