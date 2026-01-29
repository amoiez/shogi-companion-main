import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CellData, LastMove } from "@/hooks/useGameState";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// SFEN piece mapping
const PIECE_TO_SFEN: Record<string, string> = {
  '歩': 'P', '香': 'L', '桂': 'N', '銀': 'S', '金': 'G', '飛': 'R', '角': 'B', '王': 'K', '玉': 'K',
  'と': '+P', '杏': '+L', '圭': '+N', '全': '+S', '龍': '+R', '馬': '+B',
};

// API Rev 0.3: Base piece mapping (promoted pieces demoted to original)
const BASE_PIECE_TO_LETTER: Record<string, string> = {
  '歩': 'P', '香': 'L', '桂': 'N', '銀': 'S', '金': 'G', '飛': 'R', '角': 'B', '王': 'K', '玉': 'K',
  // Promoted pieces should be demoted first, but this handles direct lookups
  'と': 'P', '杏': 'L', '圭': 'N', '全': 'S', '龍': 'R', '馬': 'B',
};

const PIECE_TO_USI_DROP: Record<string, string> = {
  '歩': 'P', '香': 'L', '桂': 'N', '銀': 'S', '金': 'G', '飛': 'R', '角': 'B',
};

// Helper: Convert board coordinates to USI notation
function coordToUSI(row: number, col: number): string {
  const colChar = String(9 - col);
  const rowChar = String.fromCharCode('a'.charCodeAt(0) + row);
  return colChar + rowChar;
}

// Helper: Generate USI move string
function generateUSIMove(
  from: { row: number; col: number } | null,
  to: { row: number; col: number },
  piece: string,
  promoted: boolean,
  isDrop: boolean
): string {
  if (isDrop) {
    const pieceChar = PIECE_TO_USI_DROP[piece] || 'P';
    return `${pieceChar}*${coordToUSI(to.row, to.col)}`;
  }
  
  const fromStr = from ? coordToUSI(from.row, from.col) : '';
  const toStr = coordToUSI(to.row, to.col);
  const promoStr = promoted ? '+' : '';
  
  return `${fromStr}${toStr}${promoStr}`;
}

// Helper: Generate SFEN string from board state
function generateSFEN(
  board: CellData[][],
  currentTurn: 'sente' | 'gote',
  senteHand: string[],
  goteHand: string[],
  moveCount: number
): string {
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
        // Lowercase for gote (opponent), uppercase for sente
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
}

// ============================================================
// API EXPORT HELPER FOR EXTERNAL AI INTEGRATION
// ============================================================
// Prepares game state data for Nakano Douga AI API integration
// Returns clean JSON-serializable format for external AI analysis
//
// INTEGRATION GUIDE FOR EXTERNAL PARTNERS:
// ----------------------------------------
// 1. Access the current game state via: window.__shogiAPIState
// 2. This object is automatically updated after each move
// 3. All data is in clean JSON format, ready for HTTP POST
// 4. No authentication needed at this infrastructure stage
//
// EXAMPLE USAGE:
// --------------
// const gameState = window.__shogiAPIState;
// if (gameState) {
//   fetch('https://api.nakano-douga.com/ai/analyze', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(gameState)
//   });
// }
//
// DATA FORMAT SPECIFICATION:
// --------------------------
// See APIGameState interface below for complete structure
// ============================================================

// API Rev 0.3: Updated interface matching Nakano Douga specification
export interface APIGameState {
  gameId?: string; // Optional: Game ID for logging
  sfen: string;
  currentTurn: "black" | "white"; // API uses "black" (先手) / "white" (後手)
  moveCount: number;
  lastMove: {
    from?: string; // USI coordinate (e.g., "7g") - omitted for drops
    to: string;    // USI coordinate (e.g., "7f")
    piece: string; // BASE piece letter (P, L, N, S, G, R, B, K)
    promoted: boolean; // Separate promotion flag
  } | string | null; // Can be string for drop notation (e.g., "P*5e")
  history: string[]; // USI move history
  timeInfo: {
    blackRemaining: number; // Sente time in seconds
    whiteRemaining: number; // Gote time in seconds
    byoyomiRule: number;    // Byoyomi time per move
    countdownTrigger: number; // When to start countdown
  };
}

/**
 * Extract API-ready game state for external AI integration (SFEN format)
 * @param board - 9x9 Shogi board array
 * @param lastMove - Last move information
 * @param senteTime - Sente remaining time in seconds
 * @param goteTime - Gote remaining time in seconds
 * @param senteByoyomi - Whether Sente is in byoyomi
 * @param goteByoyomi - Whether Gote is in byoyomi
 * @param moveCount - Current move number
 * @param currentTurn - Current player turn
 * @param senteHand - Sente captured pieces
 * @param goteHand - Gote captured pieces
 * @returns SFEN-compressed JSON object ready for API transmission
 */
export function getAPIGameState(
  board: CellData[][],
  lastMove: LastMove | null,
  senteTime: number,
  goteTime: number,
  senteByoyomi: boolean,
  goteByoyomi: boolean,
  moveCount: number,
  currentTurn: "sente" | "gote",
  senteHand: string[],
  goteHand: string[],
  usiHistory?: string[] // Optional USI history
): APIGameState {
  try {
    // Generate SFEN string (compressed board representation)
    const sfen = generateSFEN(board, currentTurn, senteHand, goteHand, moveCount);

    // API Rev 0.3: Convert lastMove to API format
    let apiLastMove: { from?: string; to: string; piece: string; promoted: boolean } | string | null = null;
    
    if (lastMove) {
      // Get base piece letter code (e.g., '歩' -> 'P')
      const basePieceLetter = BASE_PIECE_TO_LETTER[lastMove.piece] || 'P';
      
      if (lastMove.isDrop) {
        // API Rev 0.3: Drop notation as string (e.g., "P*5e")
        const toUSI = coordToUSI(lastMove.to.row, lastMove.to.col);
        apiLastMove = `${basePieceLetter}*${toUSI}`;
      } else {
        // API Rev 0.3: Regular move with base piece and promoted flag
        apiLastMove = {
          from: lastMove.from ? coordToUSI(lastMove.from.row, lastMove.from.col) : undefined,
          to: coordToUSI(lastMove.to.row, lastMove.to.col),
          piece: basePieceLetter, // BASE piece letter, not promoted
          promoted: lastMove.promoted
        };
      }
    }

    const apiState: APIGameState = {
      sfen,
      currentTurn: currentTurn === 'sente' ? 'black' : 'white', // API uses black/white
      moveCount,
      lastMove: apiLastMove,
      history: usiHistory || [], // USI move history
      timeInfo: {
        blackRemaining: senteTime,
        whiteRemaining: goteTime,
        byoyomiRule: 60, // 1 minute byoyomi
        countdownTrigger: 10 // Start countdown at 10 seconds
      }
    };

    // Validate JSON serializability
    JSON.stringify(apiState);
    
    return apiState;
  } catch (error) {
    console.error("[API Export] Failed to generate game state:", error);
    throw new Error("Failed to serialize game state for API");
  }
}

/**
 * Downloads a dynamically generated text string as a .txt file
 * @param content - The text content to download
 * @param filename - The name of the file (default: 'download.txt')
 * @example
 * downloadTextFile('Hello World!', 'greeting.txt');
 */
export function downloadTextFile(content: string, filename: string = 'download.txt'): void {
  // Ensure filename has .txt extension
  if (!filename.endsWith('.txt')) {
    filename += '.txt';
  }

  // Create a Blob with the text content
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  
  // Create a temporary URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary anchor element and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the temporary URL
  URL.revokeObjectURL(url);
}
