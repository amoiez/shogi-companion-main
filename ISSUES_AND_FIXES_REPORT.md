# Client Issues and Fixes Report

Date: 2026-03-22
Project: Shogi Companion

## Summary

This document summarizes the issues reported by the client and the fixes applied in the current codebase.

The following work has been completed:

1. Bug 1 fixed
2. Bug 2 fixed
3. Bug 3 fixed
4. React Hook dependency warnings fixed
5. Remaining lint issues cleaned up
6. Full lint check now passes

## Bug 1

### Issue

The multiplayer implementation previously depended on mirroring logic to compensate for coordinate handling differences between host and guest views.

This created risk that logical board state and displayed board state could diverge, especially in rotated guest-side play.

### Fix

- Removed incorrect state mirroring from multiplayer synchronization
- Unified move transfer around one logical board coordinate system
- Left board rotation as a visual-only concern in the UI

### Result

- Host and guest now share the same logical board state
- Visual rotation no longer modifies actual game data
- Multiplayer synchronization is more stable and consistent

## Bug 2

### Issue

Opponent moves were not always being recorded correctly into local USI history / kifu data on the receiving side.

This could result in incomplete move history or mismatched exports between devices.

### Fix

- Remote move state now updates local USI history correctly
- `lastMove` is used to reconstruct the received move when available
- `usiMove` is used as a fallback path
- SFEN is regenerated after synchronized moves

### Result

- Both devices maintain consistent move history
- Export reliability for USI and SFEN is improved
- Opponent moves are no longer omitted from the game record

## Bug 3

### Issue

When Gote dropped a piece from hand, it could be placed on the board as a Sente-owned piece and removed from the wrong side.

This caused piece duplication and impossible states such as three Bishops appearing in play.

### Fix

- Added explicit ownership tracking for hand-drop sources
- Preserved Gote ownership during drop validation
- Preserved Gote ownership during board placement
- Removed the dropped piece from the correct hand array

### Result

- Gote drops now remain Gote-owned on the board
- `goteHand` is decremented correctly
- Piece duplication from ownership mismatch is prevented

## React Hook Dependency Concerns

### Reported Concern

The client raised a valid concern that missing or incorrect React Hook dependencies could lead to:

- stale board state
- stale closures
- unnecessary reconnection behavior
- incomplete cleanup

### Fix

The reported Hook dependency warnings were addressed in the affected files.

- corrected dependency arrays
- stabilized referenced callbacks where needed
- removed unnecessary dependencies
- made cleanup handling explicit and lint-compliant

### Result

The specific Hook dependency concerns raised by the client have been resolved.

## Remaining Lint Issues

### Previous State

After the Hook fixes, additional lint issues still remained in the project, including:

- `no-explicit-any`
- `no-empty-object-type`
- `no-require-imports`
- `react-refresh/only-export-components`

### Fix

These issues were cleaned up by:

- replacing loose `any` usage with concrete or `unknown`-based typing
- replacing empty interfaces with type aliases
- converting Tailwind configuration to ESM import usage
- updating lint configuration for the project’s UI helper export pattern

### Result

The full lint check now passes successfully.

Verification command:

```bash
npm run lint
```

Verification result:

- Passed
- No remaining lint errors
- No remaining lint warnings

## Files Updated

- `src/hooks/useMultiplayer.ts`
- `src/hooks/useGameState.ts`
- `src/components/PlayerPanel.tsx`
- `src/components/ShogiBoard.tsx`
- `src/pages/Index.tsx`
- `src/hooks/useAudioSystem.ts`
- `src/hooks/useTextDownload.ts`
- `src/lib/exportExamples.ts`
- `src/components/ui/command.tsx`
- `src/components/ui/textarea.tsx`
- `tailwind.config.ts`
- `eslint.config.js`

## Final Status

Current status of the requested items:

- Bugs 1, 2, and 3: fixed
- React Hook dependency concerns: fixed
- Full lint check: passing

This means the previously reported functional issues and code-quality concerns have now been addressed in the current codebase.
