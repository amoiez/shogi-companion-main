import { useState, useEffect, useCallback, useRef } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { CellData } from './useGameState';

// Generate a short random game ID
const generateGameId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0/O, 1/I
  let id = 'SHOGI-';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

export type PlayerRole = 'host' | 'guest' | null;
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface GameState {
  board: CellData[][];
  senteHand: string[];
  goteHand: string[];
  moveCount: number;
  currentTurn: 'sente' | 'gote';
  senteTime: number;
  goteTime: number;
}

export interface GameMessage {
  type: 'MOVE' | 'SYNC' | 'READY';
  gameState?: GameState;
}

export interface UseMultiplayerReturn {
  // Connection state
  gameId: string | null;
  role: PlayerRole;
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

export const useMultiplayer = (): UseMultiplayerReturn => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [role, setRole] = useState<PlayerRole>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [currentTurn, setCurrentTurn] = useState<'sente' | 'gote'>('sente');
  
  const peerRef = useRef<Peer | null>(null);
  const dataConnectionRef = useRef<DataConnection | null>(null);
  const mediaConnectionRef = useRef<MediaConnection | null>(null);
  const receiveCallbackRef = useRef<((state: GameState) => void) | null>(null);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('[Multiplayer] Cleaning up connections...');
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
      
      if (message.type === 'MOVE' && message.gameState) {
        console.log('[DATA] Processing MOVE - New turn:', message.gameState.currentTurn);
        console.log('[DATA] Board state received, moveCount:', message.gameState.moveCount);
        
        // Update local turn state
        setCurrentTurn(message.gameState.currentTurn);
        
        // Call the registered callback to update game state
        if (receiveCallbackRef.current) {
          console.log('[DATA] Calling receiveCallback to update local game state');
          receiveCallbackRef.current(message.gameState);
        } else {
          console.warn('[DATA] No receiveCallback registered!');
        }
      } else if (message.type === 'SYNC' && message.gameState) {
        console.log('[DATA] Processing SYNC - Turn:', message.gameState.currentTurn);
        setCurrentTurn(message.gameState.currentTurn);
        if (receiveCallbackRef.current) {
          receiveCallbackRef.current(message.gameState);
        }
      } else if (message.type === 'READY') {
        console.log('[DATA] Peer is ready');
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
    setCurrentTurn('sente'); // Host is Sente (Black)
    
    // Get media first
    const stream = await setupMedia();
    
    // Create peer with the game ID
    const peer = new Peer(newGameId, {
      debug: 2,
    });
    peerRef.current = peer;
    
    peer.on('open', (id) => {
      console.log('[HOST] Peer opened with ID:', id);
      console.log('[HOST] Waiting for guest to connect...');
      setConnectionStatus('disconnected'); // Waiting for guest
    });
    
    // CRITICAL: Listen for incoming DATA connections from guest
    peer.on('connection', (conn) => {
      console.log('[HOST] ========================================');
      console.log('[HOST] Guest DATA connection received!');
      console.log('[HOST] Guest peer ID:', conn.peer);
      console.log('[HOST] ========================================');
      
      // Wait for the connection to open, then set up listener
      conn.on('open', () => {
        console.log('[HOST] Data connection is now OPEN');
        setupDataListener(conn);
        setConnectionStatus('connected');
        
        // Send a READY message to confirm connection
        conn.send({ type: 'READY' });
        console.log('[HOST] Sent READY message to guest');
      });
    });
    
    // Listen for incoming MEDIA calls from guest
    peer.on('call', (call) => {
      console.log('[HOST] Incoming VIDEO call from guest');
      if (stream) {
        setupMediaConnection(call, stream);
      } else {
        console.warn('[HOST] No local stream to answer with');
      }
    });
    
    peer.on('error', (err) => {
      console.error('[HOST] Peer error:', err);
      if (err.type === 'unavailable-id') {
        setErrorMessage('このゲームIDは既に使用されています');
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
    setCurrentTurn('sente'); // Game starts with Sente's turn (but guest is Gote)
    
    // Get media first
    const stream = await setupMedia();
    
    // Create peer with a random ID for the guest
    const guestId = `${formattedId}-GUEST-${Math.random().toString(36).substring(7)}`;
    console.log('[GUEST] Creating peer with ID:', guestId);
    
    const peer = new Peer(guestId, {
      debug: 2,
    });
    peerRef.current = peer;
    
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
        console.log('[GUEST] ========================================');
        
        // Set up the data listener AFTER connection is open
        setupDataListener(conn);
        setConnectionStatus('connected');
      });
      
      conn.on('error', (err) => {
        console.error('[GUEST] Data connection error:', err);
        setErrorMessage('ホストへの接続に失敗しました');
      });
      
      // ============================================================
      // Connect MEDIA channel to host (separate from data)
      // ============================================================
      if (stream) {
        console.log('[GUEST] Initiating VIDEO call to host...');
        const call = peer.call(formattedId, stream);
        if (call) {
          call.on('stream', (remoteMediaStream) => {
            console.log('[GUEST] Received host VIDEO stream');
            setRemoteStream(remoteMediaStream);
          });
          call.on('error', (err) => {
            console.error('[GUEST] Media call error:', err);
          });
          mediaConnectionRef.current = call;
        } else {
          console.warn('[GUEST] Failed to create media call');
        }
      }
    });
    
    peer.on('error', (err) => {
      console.error('[GUEST] Peer error:', err);
      if (err.type === 'peer-unavailable') {
        setErrorMessage('ゲームが見つかりません。IDを確認してください');
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
    setConnectionStatus('disconnected');
    setErrorMessage(null);
    setCurrentTurn('sente');
  }, [cleanup]);

  // ============================================================
  // SEND MOVE: Send game state to peer
  // ============================================================
  const sendMove = useCallback((gameState: GameState) => {
    const conn = dataConnectionRef.current;
    
    if (conn && conn.open) {
      const message: GameMessage = {
        type: 'MOVE',
        gameState,
      };
      
      console.log('[SEND] ========================================');
      console.log('[SEND] Sending MOVE to peer');
      console.log('[SEND] Turn:', gameState.currentTurn);
      console.log('[SEND] Move count:', gameState.moveCount);
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
  }, []);

  // Register callback for receiving state
  const onReceiveState = useCallback((callback: (state: GameState) => void) => {
    console.log('[Multiplayer] Registering receive state callback');
    receiveCallbackRef.current = callback;
  }, []);

  // Calculate if it's my turn
  const isMyTurn = 
    (role === 'host' && currentTurn === 'sente') || 
    (role === 'guest' && currentTurn === 'gote') ||
    role === null; // Single player mode - always my turn

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    gameId,
    role,
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
