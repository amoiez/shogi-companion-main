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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Failed to get user media:', err);
      setErrorMessage('カメラ/マイクへのアクセスが拒否されました');
      return null;
    }
  }, []);

  // Handle incoming data
  const setupDataConnection = useCallback((conn: DataConnection) => {
    dataConnectionRef.current = conn;
    
    conn.on('open', () => {
      console.log('Data connection established');
      setConnectionStatus('connected');
    });
    
    conn.on('data', (data) => {
      const message = data as GameMessage;
      console.log('Received message:', message.type);
      
      if (message.type === 'MOVE' && message.gameState) {
        setCurrentTurn(message.gameState.currentTurn);
        if (receiveCallbackRef.current) {
          receiveCallbackRef.current(message.gameState);
        }
      } else if (message.type === 'SYNC' && message.gameState) {
        setCurrentTurn(message.gameState.currentTurn);
        if (receiveCallbackRef.current) {
          receiveCallbackRef.current(message.gameState);
        }
      }
    });
    
    conn.on('close', () => {
      console.log('Data connection closed');
      setConnectionStatus('disconnected');
    });
    
    conn.on('error', (err) => {
      console.error('Data connection error:', err);
      setErrorMessage('接続エラーが発生しました');
    });
  }, []);

  // Handle incoming media call
  const setupMediaConnection = useCallback((call: MediaConnection, stream: MediaStream) => {
    mediaConnectionRef.current = call;
    
    call.on('stream', (remoteMediaStream) => {
      console.log('Received remote stream');
      setRemoteStream(remoteMediaStream);
    });
    
    call.on('close', () => {
      console.log('Media connection closed');
      setRemoteStream(null);
    });
    
    call.answer(stream);
  }, []);

  // Host a new game
  const hostGame = useCallback(async () => {
    cleanup();
    setConnectionStatus('connecting');
    setErrorMessage(null);
    
    const newGameId = generateGameId();
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
      console.log('Host peer opened with ID:', id);
      setConnectionStatus('disconnected'); // Waiting for guest
    });
    
    peer.on('connection', (conn) => {
      console.log('Guest connected');
      setupDataConnection(conn);
    });
    
    peer.on('call', (call) => {
      console.log('Incoming call from guest');
      if (stream) {
        setupMediaConnection(call, stream);
      }
    });
    
    peer.on('error', (err) => {
      console.error('Peer error:', err);
      if (err.type === 'unavailable-id') {
        setErrorMessage('このゲームIDは既に使用されています');
      } else {
        setErrorMessage(`接続エラー: ${err.type}`);
      }
      setConnectionStatus('error');
    });
  }, [cleanup, setupMedia, setupDataConnection, setupMediaConnection]);

  // Join an existing game
  const joinGame = useCallback(async (targetGameId: string) => {
    cleanup();
    setConnectionStatus('connecting');
    setErrorMessage(null);
    
    const formattedId = targetGameId.toUpperCase().trim();
    setGameId(formattedId);
    setRole('guest');
    setCurrentTurn('sente'); // Game starts with Sente's turn (but guest is Gote)
    
    // Get media first
    const stream = await setupMedia();
    
    // Create peer with a random ID for the guest
    const guestId = `${formattedId}-GUEST-${Math.random().toString(36).substring(7)}`;
    const peer = new Peer(guestId, {
      debug: 2,
    });
    peerRef.current = peer;
    
    peer.on('open', () => {
      console.log('Guest peer opened, connecting to host:', formattedId);
      
      // Connect data channel
      const conn = peer.connect(formattedId, { reliable: true });
      setupDataConnection(conn);
      
      // Connect media channel
      if (stream) {
        const call = peer.call(formattedId, stream);
        if (call) {
          call.on('stream', (remoteMediaStream) => {
            console.log('Received host stream');
            setRemoteStream(remoteMediaStream);
          });
          mediaConnectionRef.current = call;
        }
      }
    });
    
    peer.on('error', (err) => {
      console.error('Peer error:', err);
      if (err.type === 'peer-unavailable') {
        setErrorMessage('ゲームが見つかりません。IDを確認してください');
      } else {
        setErrorMessage(`接続エラー: ${err.type}`);
      }
      setConnectionStatus('error');
    });
  }, [cleanup, setupMedia, setupDataConnection]);

  // Disconnect from game
  const disconnect = useCallback(() => {
    cleanup();
    setGameId(null);
    setRole(null);
    setConnectionStatus('disconnected');
    setErrorMessage(null);
    setCurrentTurn('sente');
  }, [cleanup]);

  // Send move to peer
  const sendMove = useCallback((gameState: GameState) => {
    if (dataConnectionRef.current && dataConnectionRef.current.open) {
      const message: GameMessage = {
        type: 'MOVE',
        gameState,
      };
      dataConnectionRef.current.send(message);
      setCurrentTurn(gameState.currentTurn);
    }
  }, []);

  // Register callback for receiving state
  const onReceiveState = useCallback((callback: (state: GameState) => void) => {
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
