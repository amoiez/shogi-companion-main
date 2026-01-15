# 🎯 QUICK REFERENCE - Shogi Coordinate System Fix

## 📌 TL;DR (Too Long; Didn't Read)

**The Bug:** Coordinates were being translated twice, causing pieces to land in wrong squares.

**The Fix:** Removed ALL coordinate translations. Array indices ARE logical coordinates. CSS rotation is visual-only.

**The Result:** System now works correctly with simple, maintainable code.

---

## 🔑 KEY CONCEPTS

### 1. Logical Coordinates = Array Indices

```javascript
board[0][0] = Gote's top-left piece
board[8][8] = Sente's bottom-right piece

// When you do:
board.map((row, rowIndex) => ...)

// rowIndex IS the logical coordinate
// NO TRANSLATION EVER NEEDED
```

### 2. CSS Rotation is Visual-Only

```jsx
// Host view:
<div style={{ transform: 'rotate(0deg)' }}>
  {board.map(...)}  // board[0] at top
</div>

// Guest view:
<div style={{ transform: 'rotate(180deg)' }}>
  {board.map(...)}  // board[0] at bottom (visually)
</div>

// But DOM order is SAME
// So rowIndex is SAME
// So coordinates are SAME
```

### 3. No Network Mirroring

```javascript
// Both players:
sendMove(gameState) {
  send(gameState);  // No transformation!
}

receiveMove(gameState) {
  updateState(gameState);  // No transformation!
}

// Same logical state for both players
// CSS handles visual differences
```

---

## 📐 COORDINATE FORMULAS

### What Was Wrong

```javascript
// ❌ WRONG:
const logicalRow = isGotePlayer ? (8 - row) : row;
// This assumes row is visual, but it's already logical!
```

### What Is Correct

```javascript
// ✅ CORRECT:
const logicalRow = row;
// row is already logical (array index)
```

### Piece Rotation

```javascript
// ✅ CORRECT:
const pieceRotation = isOpponent ? 180 : 0;
// Gote pieces face Sente, Sente pieces face Gote
```

### Drag Preview Rotation (Guest)

```javascript
// ✅ CORRECT:
const totalRotation = 
  (isOpponent ? 180 : 0) +  // Piece orientation
  (isGotePlayer ? 180 : 0);  // Board rotation compensation

// Examples:
// Guest dragging own piece: 180 + 180 = 360 = 0° (upright)
// Guest dragging opponent's: 0 + 180 = 180° (rotated)
```

---

## 🛠️ CODE PATTERNS

### BoardCell Component

```jsx
// ✅ CORRECT PATTERN:
const BoardCell = ({ row, col, ... }) => {
  // row/col are ALREADY logical (array indices)
  
  const isDragging = dragSource?.row === row;  // Direct comparison
  const isSelected = selectedSource?.row === row;  // Direct comparison
  
  const handleDragStart = () => {
    onDragStart({
      row: row,  // Pass directly, no transformation
      col: col,
    });
  };
  
  const handleDrop = () => {
    onDrop(row, col);  // Pass directly, no transformation
  };
};
```

### Board Rendering

```jsx
// ✅ CORRECT PATTERN:
<div style={{ transform: isGotePlayer ? 'rotate(180deg)' : 'none' }}>
  {board.map((row, rowIndex) =>
    row.map((cell, colIndex) => (
      <BoardCell
        row={rowIndex}  // Already logical
        col={colIndex}  // Already logical
        // ... other props
      />
    ))
  )}
</div>
```

### Multiplayer Sync

```javascript
// ✅ CORRECT PATTERN:
const sendMove = (gameState) => {
  // No transformation!
  connection.send({ gameState });
};

const receiveMove = (message) => {
  // No transformation!
  updateGameState(message.gameState);
};
```

---

## 🚫 ANTI-PATTERNS (Don't Do This)

### ❌ Don't Translate Array Indices

```javascript
// ❌ WRONG:
board.map((row, rowIndex) => {
  const logicalRow = isGotePlayer ? (8 - rowIndex) : rowIndex;
  // rowIndex is ALREADY logical!
});
```

### ❌ Don't Mirror Network Data

```javascript
// ❌ WRONG:
if (role === 'guest') {
  gameStateToSend = {
    ...gameState,
    board: mirrorBoard(gameState.board),
  };
}
// Both players use same logical state!
```

### ❌ Don't Check Visual Positions

```javascript
// ❌ WRONG:
const handleClick = (screenX, screenY) => {
  const visualRow = calculateRowFromPixels(screenY);
  // Don't calculate positions from screen coords!
};

// ✅ CORRECT:
const handleClick = (row, col) => {
  // row/col are already logical from array indices
};
```

---

## 🧪 TESTING CHECKLIST

Quick tests to verify system works:

### Test 1: Guest Moves Own Piece
1. Guest clicks bottom-left piece (their Gote piece)
2. Should be selectable (isMyPiece = true)
3. Move it one square forward
4. Should update board[0][x] → board[1][x]
5. Host should see move at top of their screen

**Pass:** ✅  
**Fail:** ❌ Check coordinate transformation

### Test 2: Legal Moves Highlight
1. Select any piece
2. Legal move cells should highlight
3. Highlights should match actual legal destinations
4. No "ghost" highlights in wrong cells

**Pass:** ✅  
**Fail:** ❌ Check legal move coordinate calculation

### Test 3: Multiplayer Sync
1. Host makes move
2. Guest receives move
3. Both players' boards should look correct (mirrored)
4. No pieces in wrong positions

**Pass:** ✅  
**Fail:** ❌ Check network mirroring (should be none)

---

## 🐛 DEBUGGING TIPS

### If Pieces Land in Wrong Squares

1. Check console for coordinate logs:
   ```
   ✅ GOOD: [DragStart] Logical coords: {row: 0, col: 0}
   ❌ BAD: [DragStart] Visual: ... → Logical: ... (indicates translation)
   ```

2. Search code for: `8 - row` or `8 - col`
   - Should NOT appear in ShogiBoard.tsx (except comments)
   - Should NOT appear in useMultiplayer.ts

3. Verify array indices not being transformed:
   ```jsx
   // ❌ BAD:
   const logical = isGotePlayer ? (8 - rowIndex) : rowIndex;
   
   // ✅ GOOD:
   const logical = rowIndex;
   ```

### If Legal Moves Don't Highlight

1. Check legalMoves calculation uses logical coords
2. Check cell highlighting uses logical coords
3. Verify both use SAME coordinate space

```jsx
// ✅ CORRECT:
const legalMoves = getLegalMoves(row, col, ...);  // row = logical
// Later:
const isLegal = legalMoves.has(`${row}-${col}`);  // row = logical
```

### If Multiplayer Desyncs

1. Check network logs - should send raw state:
   ```
   ✅ GOOD: [SEND] NO MIRRORING (fixed architecture)
   ❌ BAD: [SEND] Mirrored: true
   ```

2. Verify mirrorBoard() function is NOT called
3. Check both players receive identical data

---

## 📚 DOCUMENTATION FILES

- **FIX_SUMMARY_FINAL.md** - Complete explanation of bugs and fixes
- **ACCEPTANCE_TESTS.md** - Test suite with expected results
- **ARCHITECTURE_DIAGRAM.md** - Visual diagrams of system
- **COORDINATE_SYSTEM_FIX.md** - Detailed technical analysis

---

## 💡 ONE-SENTENCE SUMMARY

**Array indices ARE logical coordinates; CSS rotation is visual-only; no transformations needed anywhere.**

---

## 🎓 LEARNING POINTS

1. **CSS transforms don't affect DOM order** - rotated elements keep same array indices
2. **Don't compensate for bugs with more bugs** - fix the root cause
3. **Single coordinate space is simplest** - no transformations = no bugs
4. **Visual and logical are separate concerns** - CSS handles visual, game logic handles logical
5. **Test with math, not trial-and-error** - prove correctness by construction

---

## ✅ FINAL CHECKLIST

Before deploying, verify:

- [ ] No `8 - row` or `8 - col` in ShogiBoard.tsx (except piece rotation)
- [ ] No mirrorBoard() calls in useMultiplayer.ts
- [ ] Console logs show "NO MIRRORING"
- [ ] All acceptance tests pass
- [ ] Multiplayer sync works correctly
- [ ] Both players see correct piece positions

---

**Quick Reference Version:** 1.0  
**Last Updated:** 2026-01-15  
**For:** Shogi Game Developers
