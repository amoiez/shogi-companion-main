import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CellData, LastMove } from "@/hooks/useGameState";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

export interface APIGameState {
  lastMove: {
    from: { row: number; col: number } | null;
    to: { row: number; col: number };
    piece: string;
    promoted: boolean;
    captured: string | null;
    isDrop: boolean;
  } | null;
  board: {
    piece: string | null;
    isOpponent: boolean;
  }[][];
  clock: {
    senteTime: number;
    goteTime: number;
    senteByoyomi: boolean;
    goteByoyomi: boolean;
  };
  metadata: {
    moveCount: number;
    currentTurn: "sente" | "gote";
    timestamp: string;
  };
}

/**
 * Extract API-ready game state for external AI integration
 * @param board - 9x9 Shogi board array
 * @param lastMove - Last move information
 * @param senteTime - Sente remaining time in seconds
 * @param goteTime - Gote remaining time in seconds
 * @param senteByoyomi - Whether Sente is in byoyomi
 * @param goteByoyomi - Whether Gote is in byoyomi
 * @param moveCount - Current move number
 * @param currentTurn - Current player turn
 * @returns Clean JSON object ready for API transmission
 */
export function getAPIGameState(
  board: CellData[][],
  lastMove: LastMove | null,
  senteTime: number,
  goteTime: number,
  senteByoyomi: boolean,
  goteByoyomi: boolean,
  moveCount: number,
  currentTurn: "sente" | "gote"
): APIGameState {
  try {
    // Deep clone board to ensure clean JSON (remove any non-serializable refs)
    const cleanBoard = board.map(row =>
      row.map(cell => ({
        piece: cell.piece,
        isOpponent: cell.isOpponent
      }))
    );

    const apiState: APIGameState = {
      lastMove: lastMove ? {
        from: lastMove.from,
        to: lastMove.to,
        piece: lastMove.piece,
        promoted: lastMove.promoted,
        captured: lastMove.captured,
        isDrop: lastMove.isDrop
      } : null,
      board: cleanBoard,
      clock: {
        senteTime,
        goteTime,
        senteByoyomi,
        goteByoyomi
      },
      metadata: {
        moveCount,
        currentTurn,
        timestamp: new Date().toISOString()
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
