# Shogi Companion - API Specification Document

**Version:** 0.3  
**Last Updated:** January 23, 2026  
**Target API:** Nakano Douga AI Integration  

---

## Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Data Structures](#data-structures)
4. [Request Parameters](#request-parameters)
5. [Response Payloads](#response-payloads)
6. [Frontend Integration](#frontend-integration)
7. [Error Handling](#error-handling)
8. [Usage Examples](#usage-examples)
9. [Deviations & Assumptions](#deviations--assumptions)

---

## Overview

### Purpose
This API provides game state data in a standardized format for external AI analysis. The system automatically exports game state after each move to enable real-time AI commentary and analysis.

### Architecture
- **Type:** Data Export (Client-Side Only)
- **Protocol:** JSON over HTTPS (when integrated)
- **Authentication:** None (infrastructure stage)
- **Data Format:** SFEN (Shogi Forsyth-Edwards Notation) + USI (Universal Shogi Interface)

### Integration Method
The current implementation exposes game state via:
```javascript
window.__shogiAPIState
```

This object is automatically updated after every move and can be consumed by external AI systems.

---

## API Endpoints

### Current Implementation

**Note:** There are **NO actual HTTP endpoints** in the current implementation. This is a **client-side data export system** only.

The game state is exposed through a global JavaScript object for external consumption:

| Access Point | Type | Purpose |
|-------------|------|---------|
| `window.__shogiAPIState` | JavaScript Global Object | Read-only game state snapshot |

### Planned Integration (Future)

When integrated with external AI services, the expected endpoint would be:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `https://api.nakano-douga.com/ai/analyze` | POST | Submit game state for AI analysis |

**Request Example (Future):**
```javascript
fetch('https://api.nakano-douga.com/ai/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(window.__shogiAPIState)
});
```

---

## Data Structures

### Primary Interface: `APIGameState`

**Location:** `src/lib/utils.ts` (lines 149-170)

```typescript
interface APIGameState {
  gameId?: string;
  sfen: string;
  currentTurn: "black" | "white";
  moveCount: number;
  lastMove: LastMoveData | string | null;
  history: string[];
  timeInfo: TimeInfo;
}
```

### Sub-Structures

#### `LastMoveData` (Object Format)

```typescript
interface LastMoveData {
  from?: string;      // USI coordinate (e.g., "7g") - omitted for drops
  to: string;         // USI coordinate (e.g., "7f")
  piece: string;      // BASE piece letter (P, L, N, S, G, R, B, K)
  promoted: boolean;  // Whether the move included promotion
}
```

#### `LastMoveData` (String Format - For Drops)

Format: `{PIECE}*{COORDINATE}`

Example: `"P*5e"` (Pawn dropped at 5e)

#### `TimeInfo`

```typescript
interface TimeInfo {
  blackRemaining: number;    // Sente remaining time in seconds
  whiteRemaining: number;    // Gote remaining time in seconds
  byoyomiRule: number;       // Byoyomi time per move (seconds)
  countdownTrigger: number;  // When to start countdown (seconds)
}
```

---

## Request Parameters

### Function: `getAPIGameState()`

**Location:** `src/lib/utils.ts` (lines 195-245)

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `board` | `CellData[][]` | ✅ Yes | 9×9 Shogi board array | - |
| `lastMove` | `LastMove \| null` | ✅ Yes | Last move information | - |
| `senteTime` | `number` | ✅ Yes | Sente remaining time (seconds) | - |
| `goteTime` | `number` | ✅ Yes | Gote remaining time (seconds) | - |
| `senteByoyomi` | `boolean` | ✅ Yes | Whether Sente is in byoyomi | - |
| `goteByoyomi` | `boolean` | ✅ Yes | Whether Gote is in byoyomi | - |
| `moveCount` | `number` | ✅ Yes | Current move number | - |
| `currentTurn` | `"sente" \| "gote"` | ✅ Yes | Current player turn | - |
| `senteHand` | `string[]` | ✅ Yes | Sente captured pieces | - |
| `goteHand` | `string[]` | ✅ Yes | Gote captured pieces | - |
| `usiHistory` | `string[]` | ⚠️ Optional | USI move history | `[]` |

### Internal Type: `CellData`

```typescript
interface CellData {
  piece: string | null;  // Japanese piece character or null
  isOpponent: boolean;   // true = Gote, false = Sente
}
```

### Internal Type: `LastMove`

```typescript
interface LastMove {
  from: { row: number; col: number } | null;
  to: { row: number; col: number };
  piece: string;        // Original piece (not promoted)
  promoted: boolean;
  captured: string | null;
  isDrop: boolean;
}
```

---

## Response Payloads

### Success Response

**Type:** `APIGameState` object

#### Example 1: Regular Move

```json
{
  "sfen": "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1",
  "currentTurn": "black",
  "moveCount": 1,
  "lastMove": {
    "from": "7g",
    "to": "7f",
    "piece": "P",
    "promoted": false
  },
  "history": ["7g7f"],
  "timeInfo": {
    "blackRemaining": 600,
    "whiteRemaining": 600,
    "byoyomiRule": 60,
    "countdownTrigger": 10
  }
}
```

#### Example 2: Drop Move

```json
{
  "sfen": "lnsgkgsnl/1r5b1/ppppppppp/9/9/2P6/PP1PPPPPP/1B5R1/LNSGKGSNL w - 2",
  "currentTurn": "white",
  "moveCount": 2,
  "lastMove": "P*5e",
  "history": ["7g7f", "P*5e"],
  "timeInfo": {
    "blackRemaining": 595,
    "whiteRemaining": 600,
    "byoyomiRule": 60,
    "countdownTrigger": 10
  }
}
```

#### Example 3: Promotion Move

```json
{
  "sfen": "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 5",
  "currentTurn": "black",
  "moveCount": 5,
  "lastMove": {
    "from": "7c",
    "to": "7d",
    "piece": "P",
    "promoted": true
  },
  "history": ["7g7f", "3c3d", "7f7e", "3d3e", "7e7d+"],
  "timeInfo": {
    "blackRemaining": 580,
    "whiteRemaining": 585,
    "byoyomiRule": 60,
    "countdownTrigger": 10
  }
}
```

### Field Specifications

| Field | Type | Always Present | Description |
|-------|------|----------------|-------------|
| `sfen` | `string` | ✅ Yes | SFEN board representation |
| `currentTurn` | `"black" \| "white"` | ✅ Yes | Current player (`black`=Sente, `white`=Gote) |
| `moveCount` | `number` | ✅ Yes | Number of moves made (0 = game start) |
| `lastMove` | `object \| string \| null` | ✅ Yes | Last move data (null at game start) |
| `history` | `string[]` | ✅ Yes | USI move history (empty at game start) |
| `timeInfo` | `object` | ✅ Yes | Time tracking information |
| `gameId` | `string` | ❌ No | Optional game identifier |

### TimeInfo Fields

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `blackRemaining` | `number` | seconds | Sente remaining time |
| `whiteRemaining` | `number` | seconds | Gote remaining time |
| `byoyomiRule` | `number` | seconds | Byoyomi time per move (fixed: 60) |
| `countdownTrigger` | `number` | seconds | When countdown starts (fixed: 10) |

### Piece Letter Codes

| Japanese | Code | English | Notes |
|----------|------|---------|-------|
| 歩 | P | Pawn | |
| 香 | L | Lance | |
| 桂 | N | Knight | |
| 銀 | S | Silver | |
| 金 | G | Gold | |
| 角 | B | Bishop | |
| 飛 | R | Rook | |
| 王 / 玉 | K | King | Both map to K |
| と | P | Promoted Pawn | Base piece = P |
| 杏 | L | Promoted Lance | Base piece = L |
| 圭 | N | Promoted Knight | Base piece = N |
| 全 | S | Promoted Silver | Base piece = S |
| 馬 | B | Promoted Bishop | Base piece = B |
| 龍 / 竜 | R | Promoted Rook | Base piece = R |

**Important:** `lastMove.piece` always contains the **BASE** piece letter, not the promoted version. Use `lastMove.promoted` flag to determine if promotion occurred.

---

## Frontend Integration

### Output Variables & UI Consumption

#### Variable: `window.__shogiAPIState`

**Location Set:** `src/pages/Index.tsx` (line 367)

```typescript
if (apiState) {
  (window as any).__shogiAPIState = apiState;
}
```

**Update Trigger:** Automatically after each move when `moveCount > 0`

**Update Location:** `src/pages/Index.tsx` (lines 358-370)

### Generator Function

**Function:** `exportAPIGameState()`

**Location:** `src/pages/Index.tsx` (lines 326-356)

**Called By:**
- `useEffect` hook monitoring `moveCount` changes
- Can be manually invoked for on-demand export

**Dependencies:**
```typescript
[board, lastMove, senteTime, goteTime, senteByoyomi, goteByoyomi, 
 moveCount, gameCurrentTurn, senteHand, goteHand, usiHistory, toast]
```

### UI Components Consuming Data

| Component | File | Lines | Usage |
|-----------|------|-------|-------|
| Game State Manager | `src/pages/Index.tsx` | 326-370 | Generates and exposes API state |
| Toast Notifications | `src/pages/Index.tsx` | 347-352 | Error reporting for API failures |

### Data Flow

```
Game Move
    ↓
handleDrop() / handlePromotionChoice()
    ↓
State Update (board, hands, turn, etc.)
    ↓
useEffect [moveCount] trigger
    ↓
exportAPIGameState()
    ↓
getAPIGameState() in utils.ts
    ↓
window.__shogiAPIState = result
    ↓
External AI System (can read global variable)
```

---

## Error Handling

### Error Scenarios

#### 1. SFEN Generation Failure

**Cause:** Invalid board state

**Thrown By:** `generateSFEN()` in `src/lib/utils.ts`

**Error Message:** `"Failed to serialize game state for API"`

**User Impact:** Toast notification displayed

**Recovery:** Error logged, game continues

#### 2. JSON Serialization Failure

**Cause:** Non-serializable data in game state

**Location:** `src/lib/utils.ts` (line 237)

```typescript
JSON.stringify(apiState); // Validation check
```

**Error Message:** `"Failed to serialize game state for API"`

**User Impact:** Toast notification with title "Sync Error"

### Error Response Format

Since this is client-side only, errors are handled internally:

**Console Error:**
```
[API Export] Failed to export game state: <error details>
```

**User Toast:**
```json
{
  "title": "Sync Error",
  "description": "Failed to prepare game state for AI analysis",
  "variant": "destructive"
}
```

**Return Value:** `null` (instead of `APIGameState`)

### Error Handling Code

**Location:** `src/pages/Index.tsx` (lines 344-353)

```typescript
catch (error) {
  console.error('[API Export] Failed to export game state:', error);
  
  toast({
    title: "Sync Error",
    description: "Failed to prepare game state for AI analysis",
    variant: "destructive",
  });
  
  return null;
}
```

---

## Usage Examples

### Accessing Game State (External System)

```javascript
// Check if game state is available
if (window.__shogiAPIState) {
  const gameState = window.__shogiAPIState;
  
  console.log('Current SFEN:', gameState.sfen);
  console.log('Move Count:', gameState.moveCount);
  console.log('Current Turn:', gameState.currentTurn);
  console.log('Last Move:', gameState.lastMove);
}
```

### Polling for Updates

```javascript
let lastMoveCount = 0;

setInterval(() => {
  const gameState = window.__shogiAPIState;
  
  if (gameState && gameState.moveCount > lastMoveCount) {
    console.log('New move detected!');
    console.log('Move:', gameState.history[gameState.history.length - 1]);
    
    // Send to AI for analysis
    analyzePosition(gameState);
    
    lastMoveCount = gameState.moveCount;
  }
}, 1000); // Check every second
```

### Sending to External AI (Future)

```javascript
async function sendToAI() {
  const gameState = window.__shogiAPIState;
  
  if (!gameState) {
    console.error('No game state available');
    return;
  }
  
  try {
    const response = await fetch('https://api.nakano-douga.com/ai/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gameState)
    });
    
    const result = await response.json();
    console.log('AI Analysis:', result);
  } catch (error) {
    console.error('AI request failed:', error);
  }
}
```

---

## Deviations & Assumptions

### Deviations from Standard USI/SFEN

#### 1. King Piece Notation

**Standard:** Both Kings use 'K'

**Implementation:** ✅ Compliant - Both `王` and `玉` map to 'K'

**Location:** `src/lib/utils.ts` (line 11)

```typescript
'王': 'K', '玉': 'K'
```

#### 2. Turn Notation

**Standard:** USI uses 'b' (black) and 'w' (white)

**API Output:** Uses `"black"` and `"white"` (full words)

**Reason:** Improved clarity for external API consumers

**Mapping:**
- `sente` (先手) → `"black"`
- `gote` (後手) → `"white"`

#### 3. Drop Notation

**Standard USI:** `P*5e`

**Implementation:** ✅ Compliant

**Example:** Pawn drop at 5e is represented as `"P*5e"` (string format)

### Assumptions

#### 1. Time Format

**Assumption:** Times are in seconds (integer)

**Implementation:** ✅ Confirmed

**Source:** `senteTime` and `goteTime` are managed as seconds

#### 2. Byoyomi Rules

**Fixed Values:**
- `byoyomiRule`: 60 seconds
- `countdownTrigger`: 10 seconds

**Location:** `src/lib/utils.ts` (lines 229-230)

```typescript
byoyomiRule: 60,
countdownTrigger: 10
```

**Rationale:** Standardized for consistency across games

#### 3. Move History

**Format:** USI notation

**Type:** Array of strings

**Example:** `["7g7f", "3c3d", "7f7e+"]`

**Promotion Notation:** `+` suffix indicates promotion

#### 4. Game Start State

At game start (`moveCount = 0`):
- `lastMove`: `null`
- `history`: `[]` (empty array)
- `currentTurn`: `"black"` (Sente always starts)

### Known Limitations

#### 1. No HTTP Endpoints

**Current:** Client-side data export only

**Future:** Will require backend integration for external AI communication

#### 2. No Authentication

**Current:** No authentication mechanism

**Future:** Will require API keys or OAuth when deployed

#### 3. No Validation Feedback

**Current:** External systems cannot send validation errors back

**Future:** Will require bidirectional communication

#### 4. Synchronous Export

**Current:** Game state is exported synchronously after each move

**Impact:** No batching or optimization

**Future:** Could implement debouncing for rapid moves

---

## Technical Notes

### Coordinate Systems

#### Board Coordinates

**Internal (Logical):**
- 9×9 grid
- `board[0][0]` = Top-left (Gote's back rank)
- `board[8][8]` = Bottom-right (Sente's back rank)

#### USI Coordinates

**Format:** `{column}{row}` (e.g., "7g")

**Columns:** 9-1 (right to left)

**Rows:** a-i (top to bottom)

**Conversion Function:** `coordToUSI()` in `src/lib/utils.ts` (lines 26-30)

```typescript
function coordToUSI(row: number, col: number): string {
  const colChar = String(9 - col);
  const rowChar = String.fromCharCode('a'.charCodeAt(0) + row);
  return colChar + rowChar;
}
```

### SFEN Format

**Structure:** `{board} {turn} {hands} {moveCount}`

**Example:**
```
lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1
```

**Components:**
1. **Board:** Row-by-row, `/` separates rows
2. **Turn:** `b` (black/sente) or `w` (white/gote)
3. **Hands:** Captured pieces (e.g., `P2p` = 1 Pawn for Sente, 2 for Gote)
4. **Move Count:** Number of moves + 1

### Piece Demotion Logic

**Rule:** Captured pieces are always demoted

**Implementation:** `BASE_PIECE_TO_LETTER` mapping

**Example:**
- Capture `と` (Promoted Pawn) → Store as `P` (Pawn)
- Capture `龍` (Promoted Rook) → Store as `R` (Rook)

**Location:** `src/lib/utils.ts` (lines 15-20)

---

## Version History

### Version 0.3 (Current)

**Changes:**
- Separated `lastMove.piece` (base) and `lastMove.promoted` (flag)
- Added `history` field for full USI move history
- Implemented drop notation as string format (`"P*5e"`)
- Added `timeInfo.byoyomiRule` and `timeInfo.countdownTrigger`

**Date:** January 2026

### Version 0.2 (Deprecated)

**Changes:**
- Combined piece and promotion in single string
- No move history
- Limited time information

### Version 0.1 (Deprecated)

**Changes:**
- Initial implementation
- Basic SFEN export only

---

## Contact & Support

**Project:** Shogi Companion  
**Repository:** (Internal)  
**API Maintainer:** Development Team  
**Last Review:** January 23, 2026

For questions about API integration, please refer to the inline documentation in:
- `src/lib/utils.ts` (lines 127-147)
- `src/pages/Index.tsx` (lines 320-325)

---

**End of API Specification Document**
