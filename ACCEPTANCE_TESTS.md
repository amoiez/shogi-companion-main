# ✅ SHOGI COORDINATE SYSTEM - ACCEPTANCE TESTS

## 🎯 MANDATORY ACCEPTANCE TESTS (From Client Requirements)

### Test 1: Coordinate Mirroring Verification
**Requirement:** Moving (9,7) as Host appears as (1,3) for Guest

**Test Steps:**
1. Host starts game and waits for Guest to connect
2. Host moves a piece to position **(column 9, row 7)** - bottom-right area
3. Guest observes where the piece appears on their screen

**Expected Result:**
- ❌ **OLD SYSTEM (BROKEN):** Piece appeared at wrong location due to double-translation bug
- ✅ **NEW SYSTEM (FIXED):** 
  - Logical coordinates: row=6, col=8 (arrays are 0-indexed)
  - Host sees piece at bottom-right (row 6, col 8)
  - Guest sees piece at **top-left** (visually, due to 180° rotation)
  - Both maintain same logical state: board[6][8] = piece
  - Coordinate (9,7) in Shogi notation maps to array[6][8]

**Pass Criteria:** Guest sees opponent's piece in correct visual position (mirrored 180° from Host)

---

### Test 2: No Auto-Rotation After Turns
**Requirement:** No turn causes board rotation

**Test Steps:**
1. Host makes first move
2. Turn switches to Guest
3. Guest makes a move
4. Turn switches back to Host
5. Observe both screens throughout

**Expected Result:**
- Host screen NEVER rotates (always sees Sente pieces at bottom)
- Guest screen NEVER rotates (always sees Gote pieces at bottom)
- Board orientation is FIXED for each player
- Only turn indicator changes, NOT visual orientation

**Pass Criteria:** Each player's screen maintains constant orientation regardless of whose turn it is

---

### Test 3: Move Data Synchronization
**Requirement:** Same move data is sent to both players

**Test Steps:**
1. Open browser console on both Host and Guest
2. Host makes a move from (8,4) to (7,4)
3. Check console logs on both sides

**Expected Result:**
```javascript
// Host Console:
[SEND] Sending MOVE to peer
[SEND] board[7][4] = piece
[SEND] NO MIRRORING (fixed architecture)

// Guest Console:
[DATA] Received data from peer
[DATA] board[7][4] = piece
[DATA] NO MIRRORING (fixed architecture)
```

**Pass Criteria:** 
- Same board state transmitted
- No coordinate transformation in network layer
- Both players update to identical logical state

---

### Test 4: UI Rotation Independence
**Requirement:** UI rotation never affects game logic

**Test Steps:**
1. Guest selects a piece at their visual bottom-left corner
2. Move piece one square forward
3. Check game state in console
4. Host observes move on their screen

**Expected Result:**
- Guest clicks visual position: bottom-left corner
- React event gives array index: [0][0] (for example)
- Array index = logical coordinate (no translation)
- Game state updated: board[0][0] → board[1][0]
- Host sees move at their top-left (opponent's side) ✅
- CSS rotation is visual-only, doesn't affect logic

**Pass Criteria:** Game logic uses logical coordinates; CSS rotation is purely cosmetic

---

### Test 5: CSS Removal Test
**Requirement:** Removing all CSS rotation still keeps logic correct

**Test Steps:**
1. Open Developer Tools
2. Find the board grid container element
3. Remove `transform: rotate(180deg)` style from Guest's view
4. Make a test move
5. Check game state integrity

**Expected Result:**
- Without CSS rotation, Guest sees board "upside down" visually
- But game logic still works correctly
- Move is recorded at correct logical coordinates
- Host receives correct state
- This proves logic is independent of visual rotation

**Pass Criteria:** Game continues to function with correct coordinates even when CSS rotation is removed

---

## 🔬 ADDITIONAL TECHNICAL TESTS

### Test 6: Piece Ownership Verification
**Objective:** Verify isOpponent flag is correctly interpreted

**Test Steps:**
1. Both players start game
2. Check initial board state in console
3. Verify each player can only drag their own pieces

**Expected Result:**
```javascript
// Initial board state (SAME for both players):
board[0][4] = { piece: '王', isOpponent: true }   // Gote King
board[8][4] = { piece: '玉', isOpponent: false }  // Sente King

// Host (Sente player):
- Can drag pieces with isOpponent=false ✅
- Cannot drag pieces with isOpponent=true ✅
- Sees isOpponent=false pieces at bottom (own pieces) ✅

// Guest (Gote player):
- Can drag pieces with isOpponent=true ✅
- Cannot drag pieces with isOpponent=false ✅
- Sees isOpponent=true pieces at bottom (own pieces) ✅
```

**Pass Criteria:** 
- Both players maintain same logical board state
- Each player can only drag their own pieces
- Ownership check: `isMyPiece = isGotePlayer ? cell.isOpponent : !cell.isOpponent`

---

### Test 7: Legal Move Highlighting
**Objective:** Verify legal move indicators appear at correct cells

**Test Steps:**
1. Guest selects a piece
2. Check which cells are highlighted as valid moves
3. Compare with expected legal moves

**Expected Result:**
- Legal moves calculated using logical coordinates
- Highlights appear at correct visual positions for Guest
- No coordinate mismatch between calculation and display

**Example:**
```javascript
// Guest selects piece at visual bottom-center (logical row 0, col 4)
Selected piece: board[0][4]
Legal moves calculated: [(1,3), (1,4), (1,5)]
Highlights appear at: Visual positions corresponding to logical (1,3), (1,4), (1,5)
Result: Highlights show ONE ROW FORWARD visually (bottom → up) ✅
```

**Pass Criteria:** 
- Legal move highlighting matches actual legal moves
- No "ghost" highlights in wrong cells
- Player can only drop pieces in highlighted cells

---

### Test 8: Drag & Drop Visual Feedback
**Objective:** Verify drag preview follows cursor correctly

**Test Steps:**
1. Guest drags one of their pieces (Gote piece, isOpponent=true)
2. Observe drag preview orientation
3. Guest drags opponent's captured piece from hand
4. Observe drag preview orientation

**Expected Result:**
```javascript
// Guest drags own piece (isOpponent=true):
Piece rotation: 180° (opponent pieces face opposite direction)
Board rotation: 180° (Guest's view is rotated)
Combined: 180° + 180° = 360° = 0° (upright) ✅
Drag preview appears UPRIGHT, follows cursor naturally

// Guest drags opponent's captured piece (isOpponent=false):
Piece rotation: 0° (Sente pieces face forward)
Board rotation: 180° (Guest's view is rotated)
Combined: 0° + 180° = 180° (rotated) ✅
Drag preview appears ROTATED (correct for captured pieces)
```

**Pass Criteria:** 
- Drag preview always follows cursor (not upside-down)
- Own pieces appear upright when dragging
- Visual feedback is natural and intuitive

---

### Test 9: Promotion Zone Detection
**Objective:** Verify promotion dialog appears at correct positions

**Test Steps:**
1. Host moves a pawn to row 2 (promotion zone)
2. Check if promotion dialog appears
3. Guest moves a pawn to row 6 (promotion zone from their side)
4. Check if promotion dialog appears

**Expected Result:**
```javascript
// Promotion zones (logical coordinates):
Sente (Host): Rows 0, 1, 2 (opponent's territory)
Gote (Guest): Rows 6, 7, 8 (opponent's territory)

// Host moves pawn to row 2:
- Enters Sente promotion zone ✅
- Dialog appears offering promotion

// Guest moves pawn to row 6:
- Enters Gote promotion zone ✅
- Dialog appears offering promotion
```

**Pass Criteria:** 
- Promotion zones based on logical coordinates
- Correct rows trigger promotion for each player
- Visual position doesn't affect logic

---

### Test 10: Captured Pieces (Hand Management)
**Objective:** Verify captured pieces go to correct player's hand

**Test Steps:**
1. Host captures a Guest piece
2. Check which hand the piece goes to
3. Guest captures a Host piece
4. Check which hand the piece goes to

**Expected Result:**
```javascript
// Host captures Gote piece (isOpponent=true):
Captured piece demoted: 'と' → '歩'
Added to: senteHand (Host's hand) ✅
Host can drop it back on board as Sente piece (isOpponent=false)

// Guest captures Sente piece (isOpponent=false):
Captured piece demoted: '龍' → '飛'
Added to: goteHand (Guest's hand) ✅
Guest can drop it back on board as Gote piece (isOpponent=true)
```

**Pass Criteria:** 
- Captured pieces go to correct hand
- Pieces change ownership (isOpponent flag flips)
- Promoted pieces revert to original form

---

## 🎨 VISUAL VERIFICATION CHECKLIST

### Piece Alignment (Both Players)
- [ ] All pieces are centered in their grid squares
- [ ] No pieces overlapping grid lines
- [ ] Pieces maintain 88% size of cell (leaving uniform gap)
- [ ] No visual "drift" or shifting during game

### Grid Alignment (Both Players)
- [ ] Piece positions match grid lines exactly
- [ ] Grid overlay aligns with SVG board background
- [ ] No misalignment between pieces and board squares

### Piece Orientation (Guest Player)
- [ ] Own pieces (Gote) face forward/upward naturally
- [ ] Opponent pieces (Sente) face downward (toward Guest)
- [ ] Captured pieces maintain correct orientation when dropped

### Turn Indicators
- [ ] Turn indicator shows correct player name
- [ ] Indicator position doesn't block gameplay
- [ ] Visual distinction between "your turn" and "opponent's turn"

---

## 🐛 REGRESSION TESTS (Previously Broken Behaviors)

### Regression 1: Double Translation Bug
**What was broken:** Coordinates translated twice, causing pieces to land in wrong squares

**Test:**
1. Guest moves piece from visual position (0,0) to (1,0)
2. Check logical coordinates in console
3. Verify Host sees move at correct position

**Expected:**
```javascript
Guest clicks: visual (0,0) → (1,0)
Array indices: [0][0] → [1][0] (already logical)
Game state: board[0][0] → board[1][0] ✅ (NOT double-translated)
Host sees: Top-left piece moves forward ✅
```

**Pass Criteria:** NO double translation; coordinates used directly

---

### Regression 2: Mirroring Compensation Bug
**What was broken:** Multiplayer mirroring was compensating for UI bugs

**Test:**
1. Host makes move
2. Check network data sent
3. Verify Guest receives identical data
4. Check Guest's rendered board

**Expected:**
```javascript
Host sends: { board: [...], moveCount: 1 }
Guest receives: { board: [...], moveCount: 1 } (IDENTICAL)
NO mirroring in network layer ✅
Guest renders with CSS rotation ✅
```

**Pass Criteria:** Network data is identical; CSS handles visual differences

---

### Regression 3: Legal Move Mismatch
**What was broken:** Legal moves calculated in wrong coordinate space

**Test:**
1. Guest selects piece at logical (0,4)
2. Check legal moves in console
3. Verify highlights appear at correct visual positions

**Expected:**
```javascript
Selected: board[0][4] (logical)
Legal moves: [(1,3), (1,4), (1,5)] (logical)
Highlights at: rowIndex 1, colIndex 3/4/5 (array indices = logical)
Visual: Cells one row "up" from Guest's perspective ✅
```

**Pass Criteria:** Legal moves calculated and displayed at matching coordinates

---

## 📊 PERFORMANCE & STABILITY TESTS

### Performance Test: Rendering Speed
- [ ] Board renders in < 100ms on initial load
- [ ] Move animations complete smoothly (60fps)
- [ ] No lag when switching between players
- [ ] Console logs don't cause performance issues

### Stability Test: Long Game Session
- [ ] Play 50+ moves without errors
- [ ] No memory leaks (check DevTools Memory tab)
- [ ] Connection remains stable throughout
- [ ] State synchronization stays accurate

### Edge Case Test: Simultaneous Moves
- [ ] Host and Guest click at exactly the same time
- [ ] System rejects out-of-turn moves gracefully
- [ ] No state corruption or desync
- [ ] Turn order remains correct

---

## 🔧 DEBUGGING GUIDE

### If Pieces Appear in Wrong Squares:
1. **Check coordinate translation**: Open console, look for translation logs
2. **Verify**: Row/col values should NOT be translated in ShogiBoard.tsx
3. **Expected**: `[DragStart] Logical coords: {row: X, col: Y}`
4. **NOT**: `[DragStart] Visual: ... -> Logical: ...` (indicates double translation bug)

### If Legal Moves Don't Highlight:
1. **Check legal move calculation**: Log `legalMoves` set
2. **Verify**: Legal moves stored as `${logicalRow}-${logicalCol}`
3. **Check**: Cell highlighting uses same logical coordinates
4. **NOT**: Converting visual to logical before checking (causes mismatch)

### If Pieces Are Upside-Down:
1. **Check piece rotation logic**: `isOpponent ? 'rotate(180deg)' : 'none'`
2. **Check drag preview rotation**: Should combine piece + board rotation
3. **Expected**: Own pieces upright, opponent pieces rotated
4. **NOT**: All pieces same orientation (indicates rotation bug)

### If Multiplayer Desyncs:
1. **Check network logs**: Both players should send/receive identical data
2. **Verify**: NO mirroring in useMultiplayer.ts
3. **Expected**: `[SEND] NO MIRRORING (fixed architecture)`
4. **NOT**: `[SEND] Mirrored: true` (indicates old buggy code still present)

---

## ✅ FINAL CHECKLIST (Must Pass All)

### Functional Requirements:
- [ ] All 5 mandatory acceptance tests pass
- [ ] All 10 additional technical tests pass
- [ ] All 3 regression tests pass
- [ ] Visual verification checklist complete

### Code Quality:
- [ ] No coordinate translation in ShogiBoard.tsx (except comments explaining why)
- [ ] No board mirroring in useMultiplayer.ts
- [ ] Console logs confirm "NO MIRRORING" architecture
- [ ] Comments explain logical coordinate system clearly

### User Experience:
- [ ] Pieces stay centered in squares
- [ ] Drag & drop feels natural (preview follows cursor)
- [ ] Legal moves highlight correctly
- [ ] Turn indicators work properly
- [ ] No visual glitches or shifting

### Performance & Stability:
- [ ] No errors in console during normal gameplay
- [ ] Network sync works reliably
- [ ] Game state stays consistent between players
- [ ] Long sessions don't cause memory leaks

---

## 📝 TEST EXECUTION LOG

**Date:** _____________  
**Tester:** _____________  
**Environment:** _____________

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Coordinate Mirroring | ⬜ Pass ⬜ Fail | |
| 2 | No Auto-Rotation | ⬜ Pass ⬜ Fail | |
| 3 | Move Data Sync | ⬜ Pass ⬜ Fail | |
| 4 | UI Rotation Independence | ⬜ Pass ⬜ Fail | |
| 5 | CSS Removal Test | ⬜ Pass ⬜ Fail | |
| 6 | Piece Ownership | ⬜ Pass ⬜ Fail | |
| 7 | Legal Move Highlighting | ⬜ Pass ⬜ Fail | |
| 8 | Drag & Drop Feedback | ⬜ Pass ⬜ Fail | |
| 9 | Promotion Zone | ⬜ Pass ⬜ Fail | |
| 10 | Captured Pieces | ⬜ Pass ⬜ Fail | |
| R1 | Double Translation Regression | ⬜ Pass ⬜ Fail | |
| R2 | Mirroring Compensation Regression | ⬜ Pass ⬜ Fail | |
| R3 | Legal Move Mismatch Regression | ⬜ Pass ⬜ Fail | |

**Overall Result:** ⬜ ALL TESTS PASS ⬜ FAILURES DETECTED

**Issues Found:**
_____________________________________________
_____________________________________________
_____________________________________________

**Recommendations:**
_____________________________________________
_____________________________________________
_____________________________________________
