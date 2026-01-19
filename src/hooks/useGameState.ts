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

// Module-level ref to store dragSource synchronously (for tap-to-move support)
let dragSourceRef: DragSource | null = null;

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

// Demotion map: promoted -> original
const DEMOTION_MAP: Record<string, string> = {
  'と': '歩',
  '杏': '香',
  '圭': '桂',
  '全': '銀',
  '龍': '飛',
  '馬': '角',
};

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
  Array(9).fill(null).map(() => ({ piece: null, isOpponent: false })),
  Array(9).fill(null).map(() => ({ piece: null, isOpponent: false })),
  Array(9).fill(null).map(() => ({ piece: null, isOpponent: false })),
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

// ============================================================
// LEGAL MOVE VALIDATION
// ============================================================

const isInBounds = (row: number, col: number): boolean => {
  return row >= 0 && row < 9 && col >= 0 && col < 9;
};

// Get legal moves for a piece on the board
export const getLegalMoves = (
  board: CellData[][],
  row: number,
  col: number,
  piece: string,
  isOpponent: boolean
): { row: number; col: number }[] => {
  const moves: { row: number; col: number }[] = [];
  
  // Direction: Sente moves up (-1), Gote moves down (+1)
  const forward = isOpponent ? 1 : -1;
  
  const addMove = (r: number, c: number) => {
    if (!isInBounds(r, c)) return false;
    const target = board[r][c];
    if (target.piece && target.isOpponent === isOpponent) return false;
    moves.push({ row: r, col: c });
    return !target.piece;
  };
  
  const addSlidingMoves = (directions: [number, number][]) => {
    for (const [dr, dc] of directions) {
      for (let i = 1; i < 9; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (!isInBounds(r, c)) break;
        const target = board[r][c];
        if (target.piece) {
          if (target.isOpponent !== isOpponent) {
            moves.push({ row: r, col: c });
          }
          break;
        }
        moves.push({ row: r, col: c });
      }
    }
  };
  
  switch (piece) {
    case '歩': // Pawn
      addMove(row + forward, col);
      break;
      
    case '香': // Lance
      addSlidingMoves([[forward, 0]]);
      break;
      
    case '桂': // Knight
      addMove(row + forward * 2, col - 1);
      addMove(row + forward * 2, col + 1);
      break;
      
    case '銀': // Silver
      addMove(row + forward, col);
      addMove(row + forward, col - 1);
      addMove(row + forward, col + 1);
      addMove(row - forward, col - 1);
      addMove(row - forward, col + 1);
      break;
      
    case '金': // Gold
    case 'と': // Promoted Pawn
    case '杏': // Promoted Lance
    case '圭': // Promoted Knight
    case '全': // Promoted Silver
      addMove(row + forward, col);
      addMove(row + forward, col - 1);
      addMove(row + forward, col + 1);
      addMove(row, col - 1);
      addMove(row, col + 1);
      addMove(row - forward, col);
      break;
      
    case '飛': // Rook
      addSlidingMoves([[0, 1], [0, -1], [1, 0], [-1, 0]]);
      break;
      
    case '龍': // Promoted Rook
      addSlidingMoves([[0, 1], [0, -1], [1, 0], [-1, 0]]);
      addMove(row + 1, col + 1);
      addMove(row + 1, col - 1);
      addMove(row - 1, col + 1);
      addMove(row - 1, col - 1);
      break;
      
    case '角': // Bishop
      addSlidingMoves([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
      break;
      
    case '馬': // Promoted Bishop
      addSlidingMoves([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
      addMove(row + 1, col);
      addMove(row - 1, col);
      addMove(row, col + 1);
      addMove(row, col - 1);
      break;
      
    case '王':
    case '玉': // King
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          addMove(row + dr, col + dc);
        }
      }
      break;
  }
  
  return moves;
};

// Get legal drop positions for a piece from hand
export const getLegalDrops = (
  board: CellData[][],
  piece: string,
  isOpponent: boolean
): { row: number; col: number }[] => {
  const drops: { row: number; col: number }[] = [];
  
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col].piece) continue;
      
      if (piece === '歩') {
        // Two-pawn rule
        let hasPawnInColumn = false;
        for (let r = 0; r < 9; r++) {
          const cell = board[r][col];
          if (cell.piece === '歩' && cell.isOpponent === isOpponent) {
            hasPawnInColumn = true;
            break;
          }
        }
        if (hasPawnInColumn) continue;
        
        // Can't drop on last row
        if (isOpponent && row === 8) continue;
        if (!isOpponent && row === 0) continue;
      }
      
      if (piece === '香') {
        if (isOpponent && row === 8) continue;
        if (!isOpponent && row === 0) continue;
      }
      
      if (piece === '桂') {
        if (isOpponent && row >= 7) continue;
        if (!isOpponent && row <= 1) continue;
      }
      
      drops.push({ row, col });
    }
  }
  
  return drops;
};

// Check if in promotion zone
export const isInPromotionZone = (row: number, isOpponent: boolean): boolean => {
  return isOpponent ? row >= 6 : row <= 2;
};

// Check if promotion is forced
export const isPromotionForced = (piece: string, targetRow: number, isOpponent: boolean): boolean => {
  if (piece === '歩' || piece === '香') {
    return isOpponent ? targetRow === 8 : targetRow === 0;
  }
  if (piece === '桂') {
    return isOpponent ? targetRow >= 7 : targetRow <= 1;
  }
  return false;
};

// ============================================================
// GAME STATE TYPES
// ============================================================

export interface GameState {
  board: CellData[][];
  senteHand: string[];
  goteHand: string[];
  moveCount: number;
  currentTurn: 'sente' | 'gote';
  senteTime: number;
  goteTime: number;
  senteByoyomi: boolean;
  goteByoyomi: boolean;
}

export interface LastMove {
  from: { row: number; col: number } | null; // null for drops
  to: { row: number; col: number };
  piece: string;
  promoted: boolean;
  captured: string | null;
  isDrop: boolean;
}

export interface PendingPromotion {
  targetRow: number;
  targetCol: number;
  piece: string;
  promotedPiece: string;
  isOpponent: boolean;
  source: DragSource;
  capturedPiece: string | null;
}

// ============================================================
// SFEN & USI GENERATION
// ============================================================

// Piece to SFEN character mapping
const PIECE_TO_SFEN: Record<string, string> = {
  '歩': 'P', '香': 'L', '桂': 'N', '銀': 'S', '金': 'G', '飛': 'R', '角': 'B', '王': 'K', '玉': 'K',
  'と': '+P', '杏': '+L', '圭': '+N', '全': '+S', '龍': '+R', '馬': '+B',
};

// Generate SFEN string from current board state
export const generateSFEN = (
  board: CellData[][],
  currentTurn: 'sente' | 'gote',
  senteHand: string[],
  goteHand: string[],
  moveCount: number
): string => {
  // Board representation
  const rows: string[] = [];
  for (let row = 0; row < 9; row++) {
    let rowStr = '';
    let emptyCount = 0;
    
    for (let col = 0; col < 9; col++) {
      const cell = board[row][col];
      if (!cell.piece) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rowStr += emptyCount;
          emptyCount = 0;
        }
        const sfenPiece = PIECE_TO_SFEN[cell.piece] || 'P';
        // Lowercase for gote (opponent/white), uppercase for sente (black)
        rowStr += cell.isOpponent ? sfenPiece.toLowerCase() : sfenPiece;
      }
    }
    if (emptyCount > 0) {
      rowStr += emptyCount;
    }
    rows.push(rowStr);
  }
  
  const boardStr = rows.join('/');
  
  // Turn: 'b' for sente (black), 'w' for gote (white)
  const turnStr = currentTurn === 'sente' ? 'b' : 'w';
  
  // Hand pieces
  const formatHand = (hand: string[], isOpponent: boolean): string => {
    if (hand.length === 0) return '';
    
    const counts: Record<string, number> = {};
    hand.forEach(p => {
      const sfen = PIECE_TO_SFEN[p] || 'P';
      const key = isOpponent ? sfen.toLowerCase() : sfen;
      counts[key] = (counts[key] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([piece, count]) => count > 1 ? `${count}${piece}` : piece)
      .join('');
  };
  
  const senteHandStr = formatHand(senteHand, false);
  const goteHandStr = formatHand(goteHand, true);
  const handStr = senteHandStr + goteHandStr || '-';
  
  // Move count (ply)
  const plyCount = moveCount + 1;
  
  return `${boardStr} ${turnStr} ${handStr} ${plyCount}`;
};

// Convert board coordinates to USI notation
const coordToUSI = (row: number, col: number): string => {
  // USI uses 1-9 for columns (right to left) and a-i for rows (top to bottom)
  const colChar = String(9 - col);
  const rowChar = String.fromCharCode('a'.charCodeAt(0) + row);
  return colChar + rowChar;
};

// Piece to USI drop notation
const PIECE_TO_USI_DROP: Record<string, string> = {
  '歩': 'P', '香': 'L', '桂': 'N', '銀': 'S', '金': 'G', '飛': 'R', '角': 'B',
};

// Generate USI move string
export const generateUSIMove = (
  from: { row: number; col: number } | null,
  to: { row: number; col: number },
  piece: string,
  promoted: boolean,
  isDrop: boolean
): string => {
  if (isDrop) {
    const pieceChar = PIECE_TO_USI_DROP[piece] || 'P';
    return `${pieceChar}*${coordToUSI(to.row, to.col)}`;
  }
  
  const fromStr = from ? coordToUSI(from.row, from.col) : '';
  const toStr = coordToUSI(to.row, to.col);
  const promoStr = promoted ? '+' : '';
  
  return `${fromStr}${toStr}${promoStr}`;
};

// ============================================================
// GAME STATE HOOK
// ============================================================

export type GameMode = 'solo' | 'online';

export const useGameState = (gameMode: GameMode = 'solo') => {
  const [board, setBoard] = useState<CellData[][]>(createInitialBoard);
  const [senteHand, setSenteHand] = useState<string[]>([]);
  const [goteHand, setGoteHand] = useState<string[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [aiMessage, setAiMessage] = useState<string | null>("いい手ですね！その調子です！");
  const [sentePercent, setSentePercent] = useState(50);
  const [gotePercent, setGotePercent] = useState(50);
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  
  // Timer: 20 minutes + 60 second byoyomi (PRODUCTION MODE)
  // DISABLED IN SOLO MODE
  const INITIAL_TIME = 20 * 60;
  const BYOYOMI_TIME = 60;
  
  const [senteTime, setSenteTime] = useState(INITIAL_TIME);
  const [goteTime, setGoteTime] = useState(INITIAL_TIME);
  const [senteByoyomi, setSenteByoyomi] = useState(false);
  const [goteByoyomi, setGoteByoyomi] = useState(false);
  const [currentTurn, setCurrentTurn] = useState<'sente' | 'gote'>('sente');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Callbacks for audio triggers (set by parent component)
  const onMainTimeExpiredRef = useRef<((player: 'sente' | 'gote') => void) | null>(null);
  const onByoyomiTimeUpRef = useRef<((player: 'sente' | 'gote') => void) | null>(null);
  
  const setOnMainTimeExpired = useCallback((callback: (player: 'sente' | 'gote') => void) => {
    onMainTimeExpiredRef.current = callback;
  }, []);
  
  const setOnByoyomiTimeUp = useCallback((callback: (player: 'sente' | 'gote') => void) => {
    onByoyomiTimeUpRef.current = callback;
  }, []);
  
  // Pending promotion
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  
  // Technical data for AI engine
  const [usiHistory, setUsiHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [sfen, setSfen] = useState<string>('');
  
  // Callback for piece move sound (set by parent)
  const onPieceMoveRef = useRef<(() => void) | null>(null);
  
  const setOnPieceMove = useCallback((callback: () => void) => {
    onPieceMoveRef.current = callback;
  }, []);

  const formatTime = (seconds: number, inByoyomi: boolean): string => {
    if (inByoyomi) {
      return `秒読み ${seconds}`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Mounted ref to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Timer with byoyomi
  // SOLO MODE: Timer is DISABLED - clock does NOT run
  useEffect(() => {
    // CRITICAL: In solo mode, timer never runs
    if (gameMode === 'solo') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsTimerRunning(false);
      return;
    }
    
    // ONLINE MODE: Normal timer behavior
    if (isTimerRunning && moveCount > 0 && !isGameOver) {
      timerRef.current = setInterval(() => {
        // Safety check: don't update state if unmounted
        if (!isMountedRef.current) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return;
        }
        
        if (currentTurn === 'sente') {
          setSenteTime(prev => {
            if (prev <= 1) {
              if (!senteByoyomi) {
                // Transition to byoyomi - trigger callback
                if (isMountedRef.current) {
                  setSenteByoyomi(true);
                  onMainTimeExpiredRef.current?.('sente');
                }
                return BYOYOMI_TIME;
              }
              // Already in byoyomi and time is up - GAME OVER
              if (isMountedRef.current) {
                setIsGameOver(true);
                setIsTimerRunning(false);
                setGameOverReason('先手の持ち時間切れ');
                onByoyomiTimeUpRef.current?.('sente');
              }
              return 0;
            }
            return prev - 1;
          });
        } else {
          setGoteTime(prev => {
            if (prev <= 1) {
              if (!goteByoyomi) {
                // Transition to byoyomi - trigger callback
                if (isMountedRef.current) {
                  setGoteByoyomi(true);
                  onMainTimeExpiredRef.current?.('gote');
                }
                return BYOYOMI_TIME;
              }
              // Already in byoyomi and time is up - GAME OVER
              if (isMountedRef.current) {
                setIsGameOver(true);
                setIsTimerRunning(false);
                setGameOverReason('後手の持ち時間切れ');
                onByoyomiTimeUpRef.current?.('gote');
              }
              return 0;
            }
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
  }, [isTimerRunning, currentTurn, moveCount, senteByoyomi, goteByoyomi, isGameOver, gameMode]);

  const startTimer = useCallback(() => {
    // SOLO MODE: Never start timer
    if (gameMode === 'solo') {
      return;
    }
    setIsTimerRunning(true);
  }, [gameMode]);

  const getBasePiece = (piece: string): string => {
    return DEMOTION_MAP[piece] || piece;
  };

  const speakText = (text: string) => {
    try {
      if ('speechSynthesis' in window) {
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

  const updateGameState = (newMoveCount: number) => {
    playClickSound();
    
    const scriptEntry = (demoScript as ScriptEntry[]).find(entry => entry.move === newMoveCount);
    
    if (scriptEntry) {
      if (scriptEntry.senteWin !== undefined) {
        setSentePercent(scriptEntry.senteWin);
        setGotePercent(100 - scriptEntry.senteWin);
      }
      
      if (scriptEntry.text !== null) {
        setAiMessage(scriptEntry.text);
        speakText(scriptEntry.text);
      } else {
        setAiMessage(null);
      }
    } else {
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
    dragSourceRef = source;
    setDragSource(source);
  }, []);

  const handleDragEnd = useCallback(() => {
    dragSourceRef = null;
    setDragSource(null);
  }, []);

  // Execute move after promotion decision
  const executeMove = useCallback((
    targetRow: number,
    targetCol: number,
    source: DragSource,
    shouldPromote: boolean,
    capturedPiece: string | null
  ): GameState => {
    const { type, row: sourceRow, col: sourceCol, handIndex, piece, isOpponent: sourceIsOpponent } = source;
    
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    let newSenteHand = [...senteHand];
    let newGoteHand = [...goteHand];

    if (capturedPiece) {
      const basePiece = getBasePiece(capturedPiece);
      if (sourceIsOpponent) {
        newGoteHand = [...newGoteHand, basePiece];
      } else {
        newSenteHand = [...newSenteHand, basePiece];
      }
    }

    if (type === 'board' && sourceRow !== undefined && sourceCol !== undefined) {
      newBoard[sourceRow][sourceCol] = { piece: null, isOpponent: false };
    } else if (type === 'hand' && handIndex !== undefined) {
      if (sourceIsOpponent) {
        newGoteHand = newGoteHand.filter((_, i) => i !== handIndex);
      } else {
        newSenteHand = newSenteHand.filter((_, i) => i !== handIndex);
      }
    }

    const finalPiece = shouldPromote ? (PROMOTION_MAP[piece] || piece) : piece;
    
    newBoard[targetRow][targetCol] = { 
      piece: finalPiece, 
      isOpponent: sourceIsOpponent 
    };

    const newMoveCount = moveCount + 1;
    const newTurn: 'sente' | 'gote' = currentTurn === 'sente' ? 'gote' : 'sente';

    // Reset byoyomi on move
    let newSenteTime = senteTime;
    let newGoteTime = goteTime;
    if (currentTurn === 'sente' && senteByoyomi) {
      newSenteTime = BYOYOMI_TIME;
      setSenteTime(BYOYOMI_TIME);
    } else if (currentTurn === 'gote' && goteByoyomi) {
      newGoteTime = BYOYOMI_TIME;
      setGoteTime(BYOYOMI_TIME);
    }

    // Generate USI move
    const isDrop = type === 'hand';
    const from = type === 'board' && sourceRow !== undefined && sourceCol !== undefined
      ? { row: sourceRow, col: sourceCol }
      : null;
    const to = { row: targetRow, col: targetCol };
    const usiMove = generateUSIMove(from, to, piece, shouldPromote, isDrop);
    
    // Update last move metadata
    const newLastMove: LastMove = {
      from,
      to,
      piece: finalPiece,
      promoted: shouldPromote,
      captured: capturedPiece,
      isDrop,
    };
    
    // Update USI history
    const newUsiHistory = [...usiHistory, usiMove];
    
    // Generate new SFEN
    const newSfen = generateSFEN(newBoard, newTurn, newSenteHand, newGoteHand, newMoveCount);

    const nextState: GameState = {
      board: newBoard,
      senteHand: newSenteHand,
      goteHand: newGoteHand,
      moveCount: newMoveCount,
      currentTurn: newTurn,
      senteTime: newSenteTime,
      goteTime: newGoteTime,
      senteByoyomi,
      goteByoyomi,
    };

    setBoard(newBoard);
    setSenteHand(newSenteHand);
    setGoteHand(newGoteHand);
    setMoveCount(newMoveCount);
    setCurrentTurn(newTurn);
    // CRITICAL: Play piece sound FIRST before any state updates
    if (onPieceMoveRef.current) {
      onPieceMoveRef.current();
    }
    
    setLastMove(newLastMove);
    setUsiHistory(newUsiHistory);
    setSfen(newSfen);
    
    if (newMoveCount === 1) {
      startTimer();
    }
    
    updateGameState(newMoveCount);
    
    dragSourceRef = null;
    setDragSource(null);
    
    return nextState;
  }, [board, senteHand, goteHand, moveCount, currentTurn, senteTime, goteTime, senteByoyomi, goteByoyomi, startTimer, usiHistory]);

  const handleDrop = useCallback((targetRow: number, targetCol: number): GameState | null => {
    const source = dragSourceRef || dragSource;
    if (!source) return null;

    const { type, row: sourceRow, col: sourceCol, piece, isOpponent: sourceIsOpponent } = source;

    if (type === 'board' && sourceRow === targetRow && sourceCol === targetCol) {
      setDragSource(null);
      return null;
    }

    // Validate move
    if (type === 'board' && sourceRow !== undefined && sourceCol !== undefined) {
      const legalMoves = getLegalMoves(board, sourceRow, sourceCol, piece, sourceIsOpponent);
      const isLegal = legalMoves.some(m => m.row === targetRow && m.col === targetCol);
      if (!isLegal) {
        console.log('[Move] Illegal move rejected');
        dragSourceRef = null;
        setDragSource(null);
        return null;
      }
    } else if (type === 'hand') {
      const legalDrops = getLegalDrops(board, piece, sourceIsOpponent);
      const isLegal = legalDrops.some(d => d.row === targetRow && d.col === targetCol);
      if (!isLegal) {
        console.log('[Drop] Illegal drop rejected');
        dragSourceRef = null;
        setDragSource(null);
        return null;
      }
    }

    const targetCell = board[targetRow][targetCol];
    const capturedPiece = targetCell.piece;
    
    // Check promotion (only for board moves, NOT drops)
    const canPromote = type === 'board' && PROMOTION_MAP[piece] !== undefined;
    const inPromoZone = isInPromotionZone(targetRow, sourceIsOpponent) || 
      (type === 'board' && sourceRow !== undefined && isInPromotionZone(sourceRow, sourceIsOpponent));
    
    if (canPromote && inPromoZone) {
      if (isPromotionForced(piece, targetRow, sourceIsOpponent)) {
        return executeMove(targetRow, targetCol, source, true, capturedPiece);
      }
      
      // Show promotion dialog
      setPendingPromotion({
        targetRow,
        targetCol,
        piece,
        promotedPiece: PROMOTION_MAP[piece],
        isOpponent: sourceIsOpponent,
        source,
        capturedPiece,
      });
      
      return null;
    }

    return executeMove(targetRow, targetCol, source, false, capturedPiece);
  }, [dragSource, board, executeMove]);

  const handlePromotionChoice = useCallback((shouldPromote: boolean): GameState | null => {
    if (!pendingPromotion) return null;
    
    const { targetRow, targetCol, source, capturedPiece } = pendingPromotion;
    const result = executeMove(targetRow, targetCol, source, shouldPromote, capturedPiece);
    
    setPendingPromotion(null);
    return result;
  }, [pendingPromotion, executeMove]);

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null);
    dragSourceRef = null;
    setDragSource(null);
  }, []);

  const setGameState = useCallback((state: {
    board: CellData[][];
    senteHand: string[];
    goteHand: string[];
    moveCount: number;
    senteTime?: number;
    goteTime?: number;
    currentTurn?: 'sente' | 'gote';
    senteByoyomi?: boolean;
    goteByoyomi?: boolean;
  }) => {
    setBoard(state.board);
    setSenteHand(state.senteHand);
    setGoteHand(state.goteHand);
    setMoveCount(state.moveCount);
    
    if (state.senteTime !== undefined) setSenteTime(state.senteTime);
    if (state.goteTime !== undefined) setGoteTime(state.goteTime);
    if (state.currentTurn !== undefined) setCurrentTurn(state.currentTurn);
    if (state.senteByoyomi !== undefined) setSenteByoyomi(state.senteByoyomi);
    if (state.goteByoyomi !== undefined) setGoteByoyomi(state.goteByoyomi);
    
    if (state.moveCount > 0) {
      setIsTimerRunning(true);
    }
    
    updateGameState(state.moveCount);
  }, []);

  const getGameState = useCallback(() => ({
    board,
    senteHand,
    goteHand,
    moveCount,
    senteTime,
    goteTime,
    currentTurn,
    senteByoyomi,
    goteByoyomi,
  }), [board, senteHand, goteHand, moveCount, senteTime, goteTime, currentTurn, senteByoyomi, goteByoyomi]);

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
    senteTime,
    goteTime,
    senteTimeFormatted: formatTime(senteTime, senteByoyomi),
    goteTimeFormatted: formatTime(goteTime, goteByoyomi),
    senteByoyomi,
    goteByoyomi,
    currentTurn,
    pendingPromotion,
    handlePromotionChoice,
    cancelPromotion,
    getLegalMoves: (row: number, col: number, piece: string, isOpponent: boolean) => 
      getLegalMoves(board, row, col, piece, isOpponent),
    getLegalDrops: (piece: string, isOpponent: boolean) => 
      getLegalDrops(board, piece, isOpponent),
    // Technical data for AI engine
    sfen,
    usiHistory,
    lastMove,
    setOnPieceMove,
    // Game over state
    isGameOver,
    gameOverReason,
    // Timer callbacks
    setOnMainTimeExpired,
    setOnByoyomiTimeUp,
    // Game mode
    gameMode,
  };
};

export default useGameState;
