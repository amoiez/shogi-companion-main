# Bug Fix Handover Document

Date: 2026-03-22
Project: Shogi Companion

## Purpose

This document summarizes the fixes applied for Bugs 1, 2, and 3 requested by the client.

## Overview

The following issues were addressed:

1. Multiplayer board synchronization / coordinate handling issue
2. Opponent move history and USI/kifu synchronization issue
3. Gote hand-drop ownership issue causing piece duplication

## Bug 1

### Issue

The multiplayer flow had an inconsistency in how board state was handled between host and guest views. The implementation previously relied on board mirroring logic to compensate for coordinate translation issues.

This created risk that the same move could be represented differently between players, especially for the guest-side rotated view.

### Fix Applied

The board state handling was unified around one logical coordinate system for both players.

- Removed incorrect board mirroring from multiplayer state transfer
- Ensured that host and guest exchange the same logical board state
- Left visual rotation to the UI layer only

### Result

- Both players now operate on the same board data
- Guest-side rotation is visual only and no longer changes the underlying game state
- Move synchronization is more stable and predictable across devices

## Bug 2

### Issue

Opponent moves were not being reliably recorded into USI history / kifu tracking on the receiving side.

This could cause exported records or move history to become incomplete or inconsistent between devices.

### Fix Applied

The received move state now updates local history correctly.

- Opponent moves are recorded when remote state is received
- `lastMove` is used to reconstruct the USI move where available
- Direct `usiMove` input is used as a fallback when needed
- SFEN is regenerated after synchronized moves

### Result

- Both devices maintain consistent move history
- Exported USI/SFEN data is more reliable
- Remote moves are no longer omitted from the recorded game log

## Bug 3

### Issue

When Gote dropped a piece from hand, the dropped piece could be placed on the board as a Sente-owned piece instead of a Gote-owned piece.

This also caused the wrong hand array to be updated, which could lead to impossible board states such as three Bishops appearing in play.

### Fix Applied

The hand-drop flow now preserves the actual owner of the dropped piece explicitly.

- Added explicit Gote ownership tracking for hand-drop sources
- Used that ownership value when validating the drop
- Used that ownership value when placing the piece on the board
- Used that ownership value when removing the piece from the correct hand array

### Result

- Gote drops now remain Gote-owned on the board
- The dropped piece is removed from `goteHand` correctly
- Piece duplication from ownership mismatch is prevented

## Files Updated

- `src/hooks/useMultiplayer.ts`
- `src/hooks/useGameState.ts`
- `src/components/PlayerPanel.tsx`
- `src/pages/Index.tsx`
- `src/components/ShogiBoard.tsx`

## Conclusion

Bugs 1, 2, and 3 have been addressed in the current codebase.

The fixes focus on:

- correct logical board synchronization
- reliable move-history recording
- correct ownership and hand-state handling for dropped pieces

These changes are intended to improve multiplayer consistency, export accuracy, and rule-correct piece behavior.
