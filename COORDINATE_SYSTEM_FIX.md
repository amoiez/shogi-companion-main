# 🎯 SHOGI COORDINATE SYSTEM: ROOT CAUSE ANALYSIS & FIX

## 📋 EXECUTIVE SUMMARY

**Status:** 🔴 CRITICAL BUGS FOUND - Architecture is fundamentally broken  
**Root Cause:** Double coordinate translation + inconsistent ownership flags  
**Impact:** Guest players see shifted pieces and cannot make valid moves  
**Solution:** Single-layer coordinate translation with proper state synchronization

---

## 🔍 ROOT CAUSE ANALYSIS

### The Architecture Intent (What Should Happen)

```
┌─────────────────────────────────────────────────────────────┐
│ COORDINATE SYSTEM DESIGN (Correct Architecture)             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. LOGICAL COORDINATES (Game State)                         │
│    - Fixed 9×9 grid: (0,0) to (8,8)                        │
│    - Row 0 = Gote's starting zone                          │
│    - Row 8 = Sente's starting zone                         │
│    - NEVER rotates, NEVER changes                          │
│    - Single source of truth                                │
│                                                              │
│ 2. VISUAL COORDINATES (UI Rendering)                        │
│    Host (Sente):   Visual = Logical (no translation)       │
│    Guest (Gote):   Visual = 8 - Logical (mirror formula)   │
│                                                              │
│ 3. PIECE OWNERSHIP (isOpponent flag)                        │
│    isOpponent=false → Sente piece (Host owns)              │
│    isOpponent=true  → Gote piece (Guest owns)              │
│    Flag is ABSOLUTE, never relative to viewer              │
│                                                              │
│ 4. NETWORK SYNC (Multiplayer)                               │
│    Host: Sends/receives logical coords unchanged           │
│    Guest: Mirrors ENTIRE board state before send/receive   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### The Actual Implementation (What's Broken)

```
🔴 BUG #1: DOUBLE COORDINATE TRANSLATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Location: src/components/ShogiBoard.tsx

BoardCell (lines 139-140):
  const logicalRowForCell = isGotePlayer ? 8 - row : row;
  const logicalColForCell = isGotePlayer ? 8 - col : col;
  ❌ Translates (row, col) once

handleDragStart (line 264):
  const [logicalRow, logicalCol] = isGotePlayer ? [8 - row, 8 - col] : [row, col];
  ❌ Translates (row, col) AGAIN

RESULT: Guest coordinates are mirrored TWICE
  Guest clicks cell (0,0) visual
  → First mirror: (0,0) → (8,8) logical
  → Second mirror in dragStart: (0,0) → (8,8) logical
  → Piece moves to (8,8) instead of (0,0)
  → 🔴 WRONG SQUARE!

Mathematical Proof:
  mirror(mirror(x)) = mirror(8-x) = 8-(8-x) = x
  So double mirroring cancels out, placing pieces back where they started!


🔴 BUG #2: INCONSISTENT LEGAL MOVE COORDINATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Location: src/components/ShogiBoard.tsx (lines 591-594)

Legal moves calculated in LOGICAL coordinates:
  legalMoves = getLegalMoves(logicalRow, logicalCol, ...)
  Stored as: `${logicalRow}-${logicalCol}`

But checked against VISUAL coordinates for Guest:
  board.map((row, rowIndex) => {
    isLegalMove={legalMoves.has(`${logicalRow}-${logicalCol}`)}
    // logicalRow/logicalCol calculated from rowIndex/colIndex
    // But rowIndex/colIndex are VISUAL coords!
  })

RESULT: Legal move highlights appear in wrong cells
  Guest selects piece at logical(2,3)
  Legal moves calculated for (2,3)
  But visual cell (6,5) checks if (6,5) is in legal set
  → 🔴 NO HIGHLIGHTING or WRONG CELLS highlighted!


🔴 BUG #3: OWNERSHIP FLAG CONFUSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Location: src/components/ShogiBoard.tsx (line 160)

const isMyPiece = isGotePlayer ? cell.isOpponent : !cell.isOpponent;

PROBLEM: This logic assumes isOpponent is relative to viewer, but it's ABSOLUTE
  - After board mirroring in useMultiplayer, isOpponent flags are NOT updated
  - Mirroring only changes POSITIONS, not OWNERSHIP flags
  - So Guest sees pieces in correct positions but with WRONG ownership

RESULT: Guest cannot drag their own pieces
  Guest's piece has isOpponent=true (correct, they are Gote)
  Guest's board is mirrored in multiplayer
  Piece moves to correct visual position
  But isOpponent flag stays true
  isMyPiece check: isGotePlayer ? true : !true = true (CORRECT)
  
  WAIT... this one might actually be correct! Let me re-verify...
  
  Actually, looking at useMultiplayer.ts mirrorBoard():
    It only mirrors POSITIONS, not isOpponent flags
    So a Gote piece at logical(0,0) with isOpponent=true
    After mirror: now at logical(8,8) with isOpponent=true (still)
    Visual rendering at (8,8) shows Gote piece (correct)
    Guest tries to drag it
    isMyPiece = isGotePlayer(true) ? isOpponent(true) : !isOpponent
    isMyPiece = true ? true : false = true ✅ CORRECT
  
  So Bug #3 is actually NOT a bug - the logic is correct!
  The real issue is Bugs #1 and #2.
```

---

## 💡 THE CORRECT SOLUTION

### Design Principles

1. **ONE COORDINATE SPACE** - Everything in logical coords internally
2. **ONE TRANSLATION LAYER** - Only at UI render boundary (CSS transform)
3. **ONE STATE SYNC** - Multiplayer mirrors entire board state
4. **ZERO AMBIGUITY** - Clear separation: Logic vs Visual vs Network

### The Fix Strategy

```
┌────────────────────────────────────────────────────────────┐
│ FIXED ARCHITECTURE                                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ LAYER 1: Game State (useGameState.ts)                      │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ • board[row][col] - logical coordinates only       │   │
│ │ • isOpponent flag - absolute ownership             │   │
│ │ • Move logic uses logical coords                   │   │
│ │ • NO awareness of player perspective               │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ LAYER 2: UI Rendering (ShogiBoard.tsx)                     │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ • Render board from logical state                  │   │
│ │ • Apply CSS rotate(180deg) for Guest               │   │
│ │ • User clicks visual position (row, col)           │   │
│ │ • Translate ONCE: logical = isGote ? (8-row, 8-col) : (row, col) │
│ │ • Pass logical coords to game state                │   │
│ │ • Receive logical coords from game state           │   │
│ │ • NO further translation anywhere                  │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ LAYER 3: Network Sync (useMultiplayer.ts)                  │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ • Host: Send/receive logical state unchanged       │   │
│ │ • Guest: Mirror board before send, after receive   │   │
│ │ • Mirroring updates BOTH position AND isOpponent   │   │
│ │   (Actually NO - isOpponent stays absolute)        │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 🔧 IMPLEMENTATION FIXES

### Fix #1: Remove Double Translation in BoardCell

**File:** `src/components/ShogiBoard.tsx`  
**Lines:** 139-160

**REMOVE** these lines (they do translation too early):
```tsx
// ❌ DELETE THIS - causes double translation
const logicalRowForCell = isGotePlayer ? 8 - row : row;
const logicalColForCell = isGotePlayer ? 8 - col : col;

const isDraggingThis = dragSource?.type === 'board' &&
  dragSource?.row === logicalRowForCell &&
  dragSource?.col === logicalColForCell;

const isSelected = selectedSource?.type === 'board' &&
  selectedSource?.row === logicalRowForCell &&
  selectedSource?.col === logicalColForCell;
```

**REPLACE** with:
```tsx
// ✅ CORRECT: No translation here - dragSource already contains logical coords
const isDraggingThis = dragSource?.type === 'board' &&
  dragSource?.row === row &&
  dragSource?.col === col;

const isSelected = selectedSource?.type === 'board' &&
  selectedSource?.row === row &&
  selectedSource?.col === col;
```

**WHY:** `dragSource` and `selectedSource` already contain LOGICAL coordinates from `handleDragStart`. Comparing them against visual (row, col) without translation is correct because:
- Host: visual = logical, so row === dragSource.row works
- Guest: visual ≠ logical, but dragSource.row was already translated from visual to logical in handleDragStart

Wait, that's wrong. Let me reconsider...

Actually, looking at the flow:
1. User clicks visual cell (0, 0) on Guest's screen
2. `handleDragStart` receives visual (row=0, col=0)
3. `handleDragStart` translates to logical: (8, 8)
4. `onDragStart` stores logical coords in dragSource: {row: 8, col: 8}
5. Next render, `BoardCell` for visual (0, 0) checks `isDraggingThis`
6. It should compare: visual (0, 0) === stored logical (8, 8)? NO!

So we need to translate visual to logical for comparison. But the CURRENT code does that BEFORE handleDragStart, which means handleDragStart gets ALREADY TRANSLATED coords and translates AGAIN.

The fix is to NOT translate in the comparison variables, but translate in handleDragStart only.

Let me re-read the code more carefully...

Looking at lines 139-160 again:
```tsx
const logicalRowForCell = isGotePlayer ? 8 - row : row;
const logicalColForCell = isGotePlayer ? 8 - col : col;

const isDraggingThis = dragSource?.type === 'board' &&
  dragSource?.row === logicalRowForCell &&
  dragSource?.col === logicalColForCell;
```

So `logicalRowForCell` is the logical coordinate FOR THIS CELL.
Then we compare dragSource (which should contain logical coords) to this cell's logical coords.
That's correct!

Then in `handleDragStart` (line 264):
```tsx
const [logicalRow, logicalCol] = isGotePlayer ? [8 - row, 8 - col] : [row, col];
onDragStart({
  type: 'board',
  row: logicalRow,
  col: logicalCol,
  ...
});
```

So handleDragStart receives `row` and `col` - are these visual or logical?

Looking at the function signature:
```tsx
const BoardCell = ({ ..., row, col, ... }: BoardCellProps)
```

And how it's called (lines 591-610):
```tsx
{board.map((row, rowIndex) =>
  row.map((cell, colIndex) => {
    return (
      <BoardCell
        row={rowIndex}  // ← VISUAL coordinates from map index
        col={colIndex}  // ← VISUAL coordinates from map index
        ...
```

So `row` and `col` are VISUAL coordinates.

Therefore:
- `logicalRowForCell` = visual → logical translation ✅
- `handleDragStart` does visual → logical translation ✅
- Both are translating from the SAME visual input (row, col)
- NO double translation!

So maybe Bug #1 doesn't exist? Let me look for the real issue...

Actually, I need to check: does the board rendering itself apply any coordinate transformation?

Lines 543-578 (the grid overlay):
```tsx
<div style={{ transform: rotateBoard ? 'rotate(180deg)' : 'none' }}>
  {board.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
```

So the board is rendered in LOGICAL order (board[0][0] first), then CSS rotated.
After rotation:
- Logical (0,0) appears at visual bottom-right
- Logical (8,8) appears at visual top-left

When Guest clicks visual bottom-left:
- Click happens on the rotated grid
- But React event gives us the ARRAY INDEX, not the screen position
- Array index is LOGICAL coordinate!

Wait no, that's also wrong. Let me think more carefully about CSS rotation...

When you apply `rotate(180deg)` to a container:
1. The DOM order stays the same (board[0][0] is first in DOM)
2. But visually it's rotated
3. Click events still map to DOM elements in their ROTATED positions
4. React gives us the array index of the clicked element
5. Array index = logical coordinate (because array is in logical order)

So if Guest clicks visual bottom-left:
- That's the rotated position of DOM element board[8][8]
- React onClick receives rowIndex=8, colIndex=8
- So `row` in BoardCell is already logical (8, 8)!

BUT WAIT - looking at the rendering again:
```tsx
{board.map((row, rowIndex) =>
  row.map((cell, colIndex) => {
    <BoardCell row={rowIndex} col={colIndex} ...
```

This maps over the LOGICAL board array. So rowIndex/colIndex are LOGICAL coords.
Then we translate them AGAIN in BoardCell:
```tsx
const logicalRowForCell = isGotePlayer ? 8 - row : row;
```

If `row` is already logical, translating it makes it WRONG!

AH! So the bug is that rowIndex/colIndex ARE ALREADY LOGICAL, but the code treats them as VISUAL and translates them!

Let me verify this understanding is correct by checking what coordinate space the board array uses...

Looking at createInitialBoard() in useGameState.ts:
```tsx
const createInitialBoard = (): CellData[][] => [
  [{ piece: '香', isOpponent: true }, ...],  // Row 0 = Gote's back rank
  ...
  [{ piece: '香', isOpponent: false }, ...], // Row 8 = Sente's back rank
];
```

So board[0] = Gote's starting position, board[8] = Sente's starting position.
This is LOGICAL coordinates - row 0 is top (Gote side), row 8 is bottom (Sente side).

When we render:
```tsx
{board.map((row, rowIndex) => ...)}
```
rowIndex=0 renders board[0], which is row 0 logically.

For Host (no rotation):
- board[0] renders at top of screen ✅ Correct (Gote/opponent pieces at top)
- board[8] renders at bottom of screen ✅ Correct (Sente/own pieces at bottom)

For Guest (with rotation):
- board[0] renders at top of grid, then CSS rotates to bottom ✅ Correct! (own pieces at bottom)
- board[8] renders at bottom of grid, then CSS rotates to top ✅ Correct! (opponent pieces at top)

So the rendering is correct - logical coords map directly to array indices.

Now when Guest clicks:
- They click the rotated visual element
- React gives us the array index: rowIndex, colIndex
- These are LOGICAL coords (array indices)!
- We should NOT translate them again!

But the code does:
```tsx
const logicalRowForCell = isGotePlayer ? 8 - row : row; // ❌ WRONG
```

This treats `row` (which is already logical) as visual and translates it, causing a double-mirror!

So Bug #1 IS REAL! The fix is:
```tsx
// ❌ WRONG - row/col are already logical
const logicalRowForCell = isGotePlayer ? 8 - row : row;

// ✅ CORRECT - row/col are already logical, use directly
const logicalRowForCell = row;
const logicalColForCell = col;
```

Perfect! Now I understand the bug completely.

### Fix #2: Correct Legal Move Coordinate Checking

Looking at lines 591-594:
```tsx
{board.map((row, rowIndex) =>
  row.map((cell, colIndex) => {
    const [logicalRow, logicalCol] = isGotePlayer
      ? [8 - rowIndex, 8 - colIndex] 
      : [rowIndex, colIndex];
```

This has the SAME bug - it treats rowIndex/colIndex as visual and translates them, but they're already logical!

Fix:
```tsx
// ✅ CORRECT - rowIndex/colIndex are already logical
const logicalRow = rowIndex;
const logicalCol = colIndex;
```

---

## ✅ COMPLETE FIX LIST

1. **Remove double translation in BoardCell comparison** (lines 139-140)
2. **Remove double translation in handleDragStart** (line 264)
3. **Remove double translation in handleDrop** (line 287)
4. **Remove double translation in handleCellClick** (lines 437-438)
5. **Remove double translation in legal move checking** (lines 591-594)

All these should simply use row/col AS-IS because they're already logical coordinates from the array index.

The ONLY place visual→logical translation is needed is when comparing screen coordinates, which never happens because all coordinates come from array indices!

Actually wait - I need to double-check if there are any mouse event handlers that give screen coordinates... Let me search for drag/drop handlers.

Looking at handleDragStart/handleDrop/handleClick - they all receive React events, but the row/col parameters are passed as props from the parent, not extracted from the event. So they're array indices = logical coords.

Perfect! The fix is clear now.
