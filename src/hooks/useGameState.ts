import { useState, useCallback, useEffect, useRef } from 'react';
import demoScript from '@/data/demoScript.json';

export type PieceType = string | null;

export interface PieceData {
  piece: string;
  isOpponent: boolean;
}

export interface CellData {
  piece: PieceType;
  isOpponent: boolean;
}

export interface DragSource {
  type: 'board' | 'hand';
  row?: number;
  col?: number;
  handIndex?: number;
  piece: string;
  isOpponent: boolean;
}

interface ScriptEntry {
  move: number;
  text: string | null;
  senteWin: number;
}

// Promotion map: original -> promoted
const PROMOTION_MAP: Record<string, string> = {
  '歩': 'と',
  '香': '杏',
  '桂': '圭',
  '銀': '全',
  '飛': '龍',
  '角': '馬',
};

// Reverse promotion map for display (promoted pieces)
const PROMOTED_PIECES = new Set(['と', '杏', '圭', '全', '龍', '馬']);

// Initial Shogi board setup
const createInitialBoard = (): CellData[][] => [
  [
    { piece: '香', isOpponent: true }, { piece: '桂', isOpponent: true }, 
    { piece: '銀', isOpponent: true }, { piece: '金', isOpponent: true }, 
    { piece: '王', isOpponent: true }, { piece: '金', isOpponent: true }, 
    { piece: '銀', isOpponent: true }, { piece: '桂', isOpponent: true }, 
    { piece: '香', isOpponent: true }
  ],
  [
    { piece: null, isOpponent: true }, { piece: '飛', isOpponent: true }, 
    { piece: null, isOpponent: true }, { piece: null, isOpponent: true }, 
    { piece: null, isOpponent: true }, { piece: null, isOpponent: true }, 
    { piece: null, isOpponent: true }, { piece: '角', isOpponent: true }, 
    { piece: null, isOpponent: true }
  ],
  [
    { piece: '歩', isOpponent: true }, { piece: '歩', isOpponent: true }, 
    { piece: '歩', isOpponent: true }, { piece: '歩', isOpponent: true }, 
    { piece: '歩', isOpponent: true }, { piece: '歩', isOpponent: true }, 
    { piece: '歩', isOpponent: true }, { piece: '歩', isOpponent: true }, 
    { piece: '歩', isOpponent: true }
  ],
  Array(9).fill({ piece: null, isOpponent: false }),
  Array(9).fill({ piece: null, isOpponent: false }),
  Array(9).fill({ piece: null, isOpponent: false }),
  [
    { piece: '歩', isOpponent: false }, { piece: '歩', isOpponent: false }, 
    { piece: '歩', isOpponent: false }, { piece: '歩', isOpponent: false }, 
    { piece: '歩', isOpponent: false }, { piece: '歩', isOpponent: false }, 
    { piece: '歩', isOpponent: false }, { piece: '歩', isOpponent: false }, 
    { piece: '歩', isOpponent: false }
  ],
  [
    { piece: null, isOpponent: false }, { piece: '角', isOpponent: false }, 
    { piece: null, isOpponent: false }, { piece: null, isOpponent: false }, 
    { piece: null, isOpponent: false }, { piece: null, isOpponent: false }, 
    { piece: null, isOpponent: false }, { piece: '飛', isOpponent: false }, 
    { piece: null, isOpponent: false }
  ],
  [
    { piece: '香', isOpponent: false }, { piece: '桂', isOpponent: false }, 
    { piece: '銀', isOpponent: false }, { piece: '金', isOpponent: false }, 
    { piece: '王', isOpponent: false }, { piece: '金', isOpponent: false }, 
    { piece: '銀', isOpponent: false }, { piece: '桂', isOpponent: false }, 
    { piece: '香', isOpponent: false }
  ],
];

// Click sound using Web Audio API
const playClickSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    console.log('Audio not available');
  }
};

export const useGameState = () => {
  const [board, setBoard] = useState<CellData[][]>(createInitialBoard);
  const [senteHand, setSenteHand] = useState<string[]>([]); // Player's captured pieces
  const [goteHand, setGoteHand] = useState<string[]>([]); // Opponent's captured pieces
  const [moveCount, setMoveCount] = useState(0);
  const [aiMessage, setAiMessage] = useState<string | null>("いい手ですね！その調子です！");
  const [sentePercent, setSentePercent] = useState(50);
  const [gotePercent, setGotePercent] = useState(50);
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  
  // Timer state (in seconds) - 10 minutes each
  const [senteTime, setSenteTime] = useState(600);
  const [goteTime, setGoteTime] = useState(600);
  const [currentTurn, setCurrentTurn] = useState<'sente' | 'gote'>('sente');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer countdown effect
  useEffect(() => {
    if (isTimerRunning && moveCount > 0) {
      timerRef.current = setInterval(() => {
        if (currentTurn === 'sente') {
          setSenteTime(prev => {
            if (prev <= 0) return 0;
            return prev - 1;
          });
        } else {
          setGoteTime(prev => {
            if (prev <= 0) return 0;
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTimerRunning, currentTurn, moveCount]);

  // Start timer on first move
  const startTimer = useCallback(() => {
    setIsTimerRunning(true);
  }, []);

  // Switch turn (and timer)
  const switchTurn = useCallback(() => {
    setCurrentTurn(prev => prev === 'sente' ? 'gote' : 'sente');
  }, []);

  // Get base piece for promotion (unpromoted version)
  const getBasePiece = (piece: string): string => {
    // If it's already a promoted piece, return it as-is for the hand
    // We'll demote it when adding to hand
    const demotionMap: Record<string, string> = {
      'と': '歩',
      '杏': '香',
      '圭': '桂',
      '全': '銀',
      '龍': '飛',
      '馬': '角',
    };
    return demotionMap[piece] || piece;
  };

  // Check if piece can promote and apply promotion
  const maybePromote = (piece: string, targetRow: number, isOpponent: boolean): string => {
    // Promotion zones: rows 0-2 for sente (player), rows 6-8 for gote (opponent)
    const inPromotionZone = isOpponent ? targetRow >= 6 : targetRow <= 2;
    
    if (inPromotionZone && PROMOTION_MAP[piece]) {
      return PROMOTION_MAP[piece];
    }
    return piece;
  };

  // Speak text using Web Speech API
  const speakText = (text: string) => {
    try {
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.log('Speech synthesis not available');
    }
  };

  // Update AI message and situation based on move count using demo script
  const updateGameState = (newMoveCount: number) => {
    playClickSound();
    
    // Find the script entry for this move
    const scriptEntry = (demoScript as ScriptEntry[]).find(entry => entry.move === newMoveCount);
    
    if (scriptEntry) {
      // Always update the situation bar if senteWin is provided
      if (scriptEntry.senteWin !== undefined) {
        setSentePercent(scriptEntry.senteWin);
        setGotePercent(100 - scriptEntry.senteWin);
      }
      
      // Handle text: update speech bubble and trigger speech synthesis
      if (scriptEntry.text !== null) {
        setAiMessage(scriptEntry.text);
        speakText(scriptEntry.text);
      } else {
        // Clear the speech bubble, no audio
        setAiMessage(null);
      }
    } else {
      // No script entry for this move - keep previous state or show default
      // For moves beyond the script, we can show cycling messages
      if (newMoveCount > 5) {
        const defaultMessages = [
          "その調子です！",
          "面白い手ですね！",
          "なるほど、そう来ましたか。",
          "良い判断です！",
          "緊張感が高まってきました！"
        ];
        const message = defaultMessages[(newMoveCount - 6) % defaultMessages.length];
        setAiMessage(message);
        speakText(message);
      }
    }
  };

  const handleDragStart = useCallback((source: DragSource) => {
    setDragSource(source);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragSource(null);
  }, []);

  const handleDrop = useCallback((targetRow: number, targetCol: number): GameState | null => {
    if (!dragSource) return null;

    const { type, row: sourceRow, col: sourceCol, handIndex, piece, isOpponent: sourceIsOpponent } = dragSource;

    // Prevent dropping on the same square
    if (type === 'board' && sourceRow === targetRow && sourceCol === targetCol) {
      setDragSource(null);
      return null;
    }

    // ============================================================
    // Calculate the new state SYNCHRONOUSLY before any setState calls
    // ============================================================
    
    // Calculate new board
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    const targetCell = newBoard[targetRow][targetCol];
    
    // Calculate new hands
    let newSenteHand = [...senteHand];
    let newGoteHand = [...goteHand];

    // Handle capture
    if (targetCell.piece) {
      const capturedPiece = getBasePiece(targetCell.piece); // Demote when captured
      
      // Flip ownership - captured piece goes to the capturing player's hand
      if (sourceIsOpponent) {
        // Opponent captured player's piece
        newGoteHand = [...newGoteHand, capturedPiece];
      } else {
        // Player captured opponent's piece
        newSenteHand = [...newSenteHand, capturedPiece];
      }
    }

    // Clear source location
    if (type === 'board' && sourceRow !== undefined && sourceCol !== undefined) {
      newBoard[sourceRow][sourceCol] = { piece: null, isOpponent: false };
    } else if (type === 'hand' && handIndex !== undefined) {
      // Remove from hand
      if (sourceIsOpponent) {
        newGoteHand = newGoteHand.filter((_, i) => i !== handIndex);
      } else {
        newSenteHand = newSenteHand.filter((_, i) => i !== handIndex);
      }
    }

    // Place piece at target (with possible promotion)
    const finalPiece = maybePromote(piece, targetRow, sourceIsOpponent);
    newBoard[targetRow][targetCol] = { 
      piece: finalPiece, 
      isOpponent: sourceIsOpponent 
    };

    // Calculate new turn and move count
    const newMoveCount = moveCount + 1;
    const newTurn: 'sente' | 'gote' = currentTurn === 'sente' ? 'gote' : 'sente';

    // Construct the complete new state object
    const nextState: GameState = {
      board: newBoard,
      senteHand: newSenteHand,
      goteHand: newGoteHand,
      moveCount: newMoveCount,
      currentTurn: newTurn,
      senteTime: senteTime,
      goteTime: goteTime,
    };

    console.log('[GameState] Calculated next state:', {
      moveCount: nextState.moveCount,
      currentTurn: nextState.currentTurn,
    });

    // ============================================================
    // Now apply the state changes to React
    // ============================================================
    setBoard(newBoard);
    setSenteHand(newSenteHand);
    setGoteHand(newGoteHand);
    setMoveCount(newMoveCount);
    setCurrentTurn(newTurn);
    
    // Start timer on first move
    if (newMoveCount === 1) {
      startTimer();
    }
    
    // Trigger AI updates
    updateGameState(newMoveCount);
    
    setDragSource(null);
    
    // Return the calculated new state for immediate use
    return nextState;
  }, [dragSource, board, senteHand, goteHand, moveCount, currentTurn, senteTime, goteTime, startTimer]);

  // Define GameState interface for return type
  interface GameState {
    board: CellData[][];
    senteHand: string[];
    goteHand: string[];
    moveCount: number;
    currentTurn: 'sente' | 'gote';
    senteTime: number;
    goteTime: number;
  }

  // Set state directly (for receiving multiplayer updates)
  const setGameState = useCallback((state: {
    board: CellData[][];
    senteHand: string[];
    goteHand: string[];
    moveCount: number;
    senteTime?: number;
    goteTime?: number;
    currentTurn?: 'sente' | 'gote';
  }) => {
    setBoard(state.board);
    setSenteHand(state.senteHand);
    setGoteHand(state.goteHand);
    setMoveCount(state.moveCount);
    
    // Sync timer if provided
    if (state.senteTime !== undefined) {
      setSenteTime(state.senteTime);
    }
    if (state.goteTime !== undefined) {
      setGoteTime(state.goteTime);
    }
    if (state.currentTurn !== undefined) {
      setCurrentTurn(state.currentTurn);
    }
    
    // Start timer if game has started
    if (state.moveCount > 0) {
      setIsTimerRunning(true);
    }
    
    updateGameState(state.moveCount);
  }, []);

  // Get current state for syncing
  const getGameState = useCallback(() => ({
    board,
    senteHand,
    goteHand,
    moveCount,
    senteTime,
    goteTime,
    currentTurn,
  }), [board, senteHand, goteHand, moveCount, senteTime, goteTime, currentTurn]);

  const handleDropOnHand = useCallback((isOpponentHand: boolean) => {
    // Optional: Allow dropping pieces back to hand (not standard Shogi but free-style)
    // For now, we don't allow this
  }, []);

  return {
    board,
    senteHand,
    goteHand,
    moveCount,
    aiMessage,
    sentePercent,
    gotePercent,
    dragSource,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    setGameState,
    getGameState,
    // Timer exports
    senteTime,
    goteTime,
    senteTimeFormatted: formatTime(senteTime),
    goteTimeFormatted: formatTime(goteTime),
    currentTurn,
  };
};

export default useGameState;
