import { useState, useMemo } from 'react';
import { DragSource, CellData, getLegalMoves, getLegalDrops, GameMode } from '@/hooks/useGameState';

// Selected cell state for tap-to-move
interface SelectedSource {
  type: 'board' | 'hand';
  row?: number;
  col?: number;
  handIndex?: number;
  piece: string;
  isOpponent: boolean;
}

// Mapping from Japanese piece characters to image filenames
const PIECE_IMAGE_MAP: Record<string, { sente: string; gote: string }> = {
  '歩': { sente: 'sente_pawn.png', gote: 'gote_pawn.png' },
  'と': { sente: 'sente_pawn_promoted.png', gote: 'gote_pawn_promoted.png' },
  '香': { sente: 'sente_lance.png', gote: 'gote_lance.png' },
  '杏': { sente: 'sente_lance_promoted.png', gote: 'gote_lance_promoted.png' },
  '桂': { sente: 'sente_knight.png', gote: 'gote_knight.png' },
  '圭': { sente: 'sente_knight_promoted.png', gote: 'gote_knight_promoted.png' },
  '銀': { sente: 'sente_silver.png', gote: 'gote_silver.png' },
  '全': { sente: 'sente_silver_promoted.png', gote: 'gote_silver_promoted.png' },
  '金': { sente: 'sente_gold.png', gote: 'gote_gold.png' },
  '角': { sente: 'sente_bishop.png', gote: 'gote_bishop.png' },
  '馬': { sente: 'sente_bishop_promoted.png', gote: 'gote_bishop_promoted.png' },
  '飛': { sente: 'sente_rook.png', gote: 'gote_rook.png' },
  '龍': { sente: 'sente_rook_promoted.png', gote: 'gote_rook_promoted.png' },
  '竜': { sente: 'sente_rook_promoted.png', gote: 'gote_rook_promoted.png' },
  '王': { sente: 'sente_king.png', gote: 'gote_king.png' },
  '玉': { sente: 'sente_king_jewel.png', gote: 'gote_king_jewel.png' },
};

// Get piece image path
const getPieceImagePath = (piece: string, isOpponent: boolean): string | null => {
  const mapping = PIECE_IMAGE_MAP[piece];
  if (!mapping) return null;
  // isOpponent=true means Gote piece, isOpponent=false means Sente piece
  const filename = isOpponent ? mapping.gote : mapping.sente;
  return `/pieces/${filename}`;
};

interface ShogiPieceProps {
  piece: string | null;
  isOpponent: boolean;
  isDragging?: boolean;
  rotateBoard?: boolean; // Counter-rotate when board is flipped
}

const ShogiPiece = ({ piece, isOpponent, isDragging, rotateBoard = false }: ShogiPieceProps) => {
  if (!piece) return null;

  // ============================================================
  // PIECE ORIENTATION - PNG-BASED RENDERING (NO CSS ROTATION)
  // ============================================================
  // CRITICAL: Piece images are pre-oriented PNG files:
  // - gote_*.png = upper-side pieces, ALREADY facing upward in the image
  // - sente_*.png = bottom-side pieces, ALREADY facing downward in the image
  // 
  // ABSOLUTE RULE: DO NOT apply CSS rotation to PNG images!
  // The orientation is BAKED INTO the image files themselves.
  // 
  // WHY NO ROTATION:
  // - Rotating PNGs via CSS causes inherited transforms
  // - Re-renders can trigger double-rotation bugs  
  // - Turn changes must NOT affect visual orientation
  // - Board rotation must NOT flip piece PNGs
  // 
  // VISUAL INVARIANT (LOCKED):
  // - Upper-side PNGs (gote_*.png) → always display facing UP
  // - Bottom-side PNGs (sente_*.png) → always display facing DOWN
  // - Turn changes → NO VISUAL CHANGE to pieces
  // - Board rotation → NO PNG FLIP
  // ============================================================

  // Get the piece image path from /public/pieces/
  // This automatically selects the correctly-oriented PNG based on isOpponent
  const imagePath = getPieceImagePath(piece, isOpponent);

  // Render PNG with NO CSS rotation - images are pre-oriented
  if (imagePath) {
    return (
      <img
        className="shogi-piece"
        src={imagePath}
        alt={piece}
        draggable={false}
        style={{
          width: '88%',
          height: '88%',
          objectFit: 'contain',
          // NO transform rotation - PNG is already oriented correctly
          // Piece stays visible when selected (tap-to-select, not drag-and-drop)
          opacity: 1,
          pointerEvents: 'auto',
        }}
      />
    );
  }

  // Fallback to text rendering if no image found
  // Text pieces DO need rotation since they're not pre-oriented assets
  const textRotation = isOpponent ? 0 : 180;
  return (
    <div
      className="shogi-piece"
      style={{
        width: '88%',
        height: '88%',
        aspectRatio: '140/148',
        position: 'relative',
        transform: `rotate(${textRotation}deg)`,
        transformOrigin: 'center center',
        // Piece stays visible when selected (tap-to-select, not drag-and-drop)
        opacity: 1,
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, #f5e6c8 0%, #e8d4a8 20%, #dcc090 50%, #c9a870 80%, #b89860 100%)',
          clipPath: 'polygon(50% 0%, 95% 15%, 100% 100%, 0% 100%, 5% 15%)',
          boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.3)',
        }}
      />
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          fontSize: 'clamp(0.875rem, 2vmin, 1.5rem)',
          fontWeight: 'bold',
          fontFamily: "'Noto Serif JP', serif",
          color: '#2d1810',
        }}
      >
        {piece}
      </span>
    </div>
  );
};

interface BoardCellProps {
  cell: CellData;
  row: number;
  col: number;
  dragSource: DragSource | null;
  onDragStart: (source: DragSource) => void;
  onDragEnd: () => void;
  onDrop: (row: number, col: number) => void;
  canDrag: boolean;
  isGotePlayer: boolean;
  selectedSource: SelectedSource | null;
  onCellClick: (row: number, col: number, cell: CellData) => void;
  isLegalMove: boolean; // New: highlight legal moves
  rotateBoard?: boolean; // Board rotation for Gote perspective
  gameMode?: GameMode; // Game mode for piece ownership check
}

const BoardCell = ({ cell, row, col, dragSource, onDragStart, onDragEnd, onDrop, canDrag, isGotePlayer, selectedSource, onCellClick, isLegalMove, rotateBoard = false, gameMode = 'online' }: BoardCellProps) => {
  // ✅ FIX: row/col are already LOGICAL coordinates (array indices from board.map)
  // The board array is in logical order: board[0] = row 0, board[8] = row 8
  // CSS rotation is visual-only and doesn't affect array indices
  // Therefore, NO coordinate translation needed here!
  
  const isDraggingThis = dragSource?.type === 'board' &&
    dragSource?.row === row &&
    dragSource?.col === col;

  // Check if this cell is the selected source (for tap-to-move)
  // selectedSource stores LOGICAL coordinates, row/col are LOGICAL, so direct comparison
  const isSelected = selectedSource?.type === 'board' &&
    selectedSource?.row === row &&
    selectedSource?.col === col;

  // Only show as valid drop target if it's a legal move
  const isValidDropTarget = isLegalMove && !isDraggingThis && !isSelected;

  // ============================================================
  // PIECE OWNERSHIP ENFORCEMENT
  // ============================================================
  // RULE: Players can ONLY drag their own pieces (in online mode)
  // - Host (Sente): can only drag pieces where isOpponent === false
  // - Guest (Gote): can only drag pieces where isOpponent === true
  // 
  // SOLO MODE: Can drag ANY piece regardless of isOpponent
  // 
  // WHY: isOpponent is an ABSOLUTE property (not relative to viewer)
  // - isOpponent=false → Sente piece (belongs to host)
  // - isOpponent=true → Gote piece (belongs to guest)
  // 
  // NOTE: Coordinate mirroring does NOT affect isOpponent flag
  // ============================================================
  const isMyPiece = gameMode === 'solo' ? true : (isGotePlayer ? cell.isOpponent : !cell.isOpponent);
  const canDragThis = canDrag && cell.piece && isMyPiece;

  // Handle pointer down for piece selection (replaces drag start)
  const handlePointerDown = (e: React.PointerEvent) => {
    // DEFENSIVE GUARDS: Prevent illegal operations
    if (!cell.piece || !canDragThis) {
      console.log('[PointerDown] BLOCKED - Not draggable:', { 
        hasPiece: !!cell.piece, 
        canDrag, 
        isMyPiece,
        isGotePlayer,
        pieceIsOpponent: cell.isOpponent 
      });
      return;
    }
    
    // TURN VALIDATION: Additional safety check
    if (!canDrag) {
      console.warn('[PointerDown] BLOCKED - Not your turn or game over');
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    console.log('[PointerDown] Piece selected:', {
      piece: cell.piece,
      isGotePlayer,
      pieceIsOpponent: cell.isOpponent,
      isMyPiece,
      position: { row, col }
    });
    
    // Call existing game function - NO CHANGES to game logic
    onDragStart({
      type: 'board',
      row: row,
      col: col,
      piece: cell.piece,
      isOpponent: cell.isOpponent,
    });
  };

  // Handle click/tap for destination selection
  const handleClick = () => {
    // If a piece is already selected and this is a valid drop target, attempt move
    if (isValidDropTarget && dragSource) {
      console.log('[Click] Attempting move to:', { row, col }, 'isGote:', isGotePlayer);
      onDrop(row, col);
      return;
    }
    
    // Otherwise, handle cell click (for selecting pieces)
    onCellClick(row, col, cell);
  };

  return (
    <div
      className="shogi-board"
      style={{
        // CELL POSITIONING: Aligned to SVG grid via CSS Grid
        // Each cell is exactly 1/9 of gridWidth × 1/9 of gridHeight
        // Position formula: cellX = gridLeft + col * (gridWidth/9)
        //                   cellY = gridTop + row * (gridHeight/9)
        position: 'relative',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        // NO borders - grid lines come from the SVG
        border: 'none',
        // FLEXBOX CENTERING: pieceX = cellX + cellWidth/2, pieceY = cellY + cellHeight/2
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        margin: 0,
        cursor: canDragThis ? 'grab' : 'pointer',
        touchAction: 'none',
        backgroundColor: isSelected 
          ? 'rgba(253, 224, 71, 0.6)' 
          : isDraggingThis 
            ? 'rgba(252, 211, 77, 0.4)'
            : isValidDropTarget 
              ? 'rgba(74, 222, 128, 0.4)' 
              : 'transparent',
        boxShadow: isSelected ? 'inset 0 0 0 3px #ca8a04' : 'none',
        transition: 'background-color 100ms',
      }}
      onPointerDown={cell.piece && canDragThis ? handlePointerDown : undefined}
      onClick={handleClick}
    >
      <ShogiPiece
        piece={cell.piece}
        isOpponent={cell.isOpponent}
        isDragging={isDraggingThis}
        rotateBoard={rotateBoard}
      />
    </div>
  );
};

interface ShogiBoardProps {
  board: CellData[][];
  dragSource: DragSource | null;
  onDragStart: (source: DragSource) => void;
  onDragEnd: () => void;
  onDrop: (row: number, col: number) => void;
  isMyTurn?: boolean;
  isGotePlayer?: boolean; // True if current player is Gote (guest)
  // Tap-to-move support: expose selected state for Komadai integration
  selectedSource?: SelectedSource | null;
  onSelectSource?: (source: SelectedSource | null) => void;
  // Board rotation for Gote perspective
  rotateBoard?: boolean;
  // Game mode for piece ownership
  gameMode?: GameMode;
}

const ShogiBoard = ({
  board,
  dragSource,
  onDragStart,
  onDragEnd,
  onDrop,
  isMyTurn = true,
  isGotePlayer = false,
  selectedSource: externalSelectedSource,
  onSelectSource: externalOnSelectSource,
  rotateBoard = false,
  gameMode = 'online',
}: ShogiBoardProps) => {
  // ============================================================
  // COORDINATE SYSTEM & RENDERING STRATEGY (FIXED ARCHITECTURE)
  // ============================================================
  // 
  // CRITICAL FIX: Removed all coordinate translation bugs
  // 
  // LOGICAL COORDINATES (Game State):
  //   - Fixed 9×9 grid: board[0][0] to board[8][8]
  //   - Row 0 = Gote's starting zone (top in Host view)
  //   - Row 8 = Sente's starting zone (bottom in Host view)
  //   - NEVER rotates, NEVER changes
  //   - Single source of truth for all game logic
  //
  // RENDERING (This Component):
  //   - board.map((row, rowIndex) => ...) iterates in LOGICAL order
  //   - rowIndex/colIndex ARE logical coordinates (array indices)
  //   - These are passed directly to BoardCell as row/col props
  //   - CSS rotate(180deg) applied to grid container for Guest
  //   - Rotation is VISUAL ONLY - does not affect array indices
  //
  // COORDINATE FLOW:
  //   1. User clicks/drags a cell on screen
  //   2. React gives us the array index of clicked element
  //   3. Array index = logical coordinate (because array is in logical order)
  //   4. Pass logical coords directly to game state
  //   5. NO TRANSLATION NEEDED ANYWHERE in this component!
  //
  // WHY THIS WORKS:
  //   - DOM order: board[0] first, board[8] last
  //   - Host view (no rotation): board[0] at top, board[8] at bottom ✅
  //   - Guest view (180° rotation): board[0] rotated to bottom, board[8] to top ✅
  //   - Click events target DOM elements, React returns array index ✅
  //   - Array index = logical coordinate, no translation needed ✅
  //
  // MULTIPLAYER SYNC:
  //   - Handled in useMultiplayer.ts, NOT here
  //   - Guest mirrors ENTIRE board state when sending/receiving
  //   - This component always works with local (already-correct) state
  // ============================================================
  // ============================================================
  
  // ============================================================
  // TAP-TO-MOVE STATE MANAGEMENT
  // ============================================================
  // Note: mirrorCoord and mirrorIfNeeded functions removed - they caused double translation bugs
  // All coordinates from board.map() are already logical, so no translation is needed
  
  // Internal selected state (used if no external state provided)
  const [internalSelectedSource, setInternalSelectedSource] = useState<SelectedSource | null>(null);

  // Use external state if provided, otherwise use internal
  const selectedSource = externalSelectedSource !== undefined ? externalSelectedSource : internalSelectedSource;
  const setSelectedSource = externalOnSelectSource || setInternalSelectedSource;

  // Compute legal moves for the currently selected/dragged piece
  const legalMoves = useMemo(() => {
    const source = dragSource || selectedSource;
    if (!source) return new Set<string>();

    let moves: { row: number; col: number }[] = [];

    if (source.type === 'board' && source.row !== undefined && source.col !== undefined) {
      moves = getLegalMoves(board, source.row, source.col, source.piece, source.isOpponent);
    } else if (source.type === 'hand') {
      moves = getLegalDrops(board, source.piece, source.isOpponent);
    }

    return new Set(moves.map(m => `${m.row}-${m.col}`));
  }, [board, dragSource, selectedSource]);

  // Handle cell click for tap-to-move
  const handleCellClick = (row: number, col: number, cell: CellData) => {
    // Determine if this cell has my piece
    const isMyPiece = isGotePlayer ? cell.isOpponent : !cell.isOpponent;
    const hasPiece = cell.piece !== null;

    // ✅ FIX: row/col are already LOGICAL coordinates (no translation needed)
    const logicalRow = row;
    const logicalCol = col;

    console.log('[Tap] Cell clicked at logical:', { row, col, piece: cell.piece, isMyPiece, isMyTurn, selectedSource });

    // If it's not my turn, do nothing
    if (!isMyTurn) {
      console.log('[Tap] Not my turn, ignoring click');
      return;
    }

    // CASE 1: No piece selected yet
    if (!selectedSource) {
      // If clicking on my own piece, select it (store LOGICAL coords)
      if (hasPiece && isMyPiece) {
        console.log('[Tap] Selecting piece:', cell.piece, 'at logical:', logicalRow, logicalCol);
        setSelectedSource({
          type: 'board',
          row: logicalRow,
          col: logicalCol,
          piece: cell.piece!,
          isOpponent: cell.isOpponent,
        });
      }
      return;
    }

    // CASE 2: A piece is already selected
    // Compare using LOGICAL coordinates (selectedSource already stores logical coords)
    const isSameCell = selectedSource.type === 'board' &&
      selectedSource.row === logicalRow &&
      selectedSource.col === logicalCol;

    // If clicking the same cell, deselect (cancel)
    if (isSameCell) {
      console.log('[Tap] Deselecting (same cell)');
      setSelectedSource(null);
      return;
    }

    // If clicking on another of my pieces, switch selection
    if (hasPiece && isMyPiece) {
      console.log('[Tap] Switching selection to:', cell.piece, 'at logical:', logicalRow, logicalCol);
      setSelectedSource({
        type: 'board',
        row: logicalRow,
        col: logicalCol,
        piece: cell.piece!,
        isOpponent: cell.isOpponent,
      });
      return;
    }

    // Otherwise, try to move to this cell (empty or opponent piece)
    console.log('[Tap] Moving to destination (logical):', { row: logicalRow, col: logicalCol });

    // First, set the drag source so handleDrop knows what piece to move
    // selectedSource already contains LOGICAL coordinates
    onDragStart(selectedSource as DragSource);

    // Execute the move using LOGICAL coordinates
    onDrop(logicalRow, logicalCol);

    // Clear selection
    setSelectedSource(null);
    onDragEnd();
  };

  return (
    <>
      {/* Turn indicator - positioned absolutely */}
      {!isMyTurn && (
        <div 
          style={{
            position: 'absolute',
            top: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
          }}
          className="px-4 py-2 bg-amber-100/80 rounded-full text-base text-amber-800 font-medium whitespace-nowrap"
        >
          相手の番です
        </div>
      )}

      {/* Board container - uses ORIGINAL board.svg UNCHANGED */}
      {/* Grid bounds detected from SVG analysis:
          viewBox: 0 0 439.21539 479.79199
          gridLeft: 6.4 (1.46% of width)
          gridTop: 6.1 (1.27% of height)
          gridWidth: 426.4 (97.08% of width)
          gridHeight: 467.6 (97.46% of height)
          squareWidth: gridWidth/9 = 47.38
          squareHeight: gridHeight/9 = 51.96
      */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          // ORIGINAL board.svg - UNTOUCHED
          backgroundImage: 'url(/board.svg)',
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          border: '12px solid #5d3a1a',
          borderRadius: '4px',
          boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(139, 90, 43, 0.3)',
          overflow: 'hidden',
          opacity: !isMyTurn ? 0.9 : 1,
        }}
      >
        {/* 9x9 Grid overlay - ALIGNED TO SVG GRID BOUNDS */}
        {/* 
          MATHEMATICAL ALIGNMENT:
          - SVG viewBox: 439.21539 × 479.79199
          - Grid starts at: (6.4, 6.1) in viewBox units
          - Grid size: 426.4 × 467.6 in viewBox units
          - As percentages:
            left: 6.4 / 439.21539 = 1.457%
            top: 6.1 / 479.79199 = 1.271%
            width: 426.4 / 439.21539 = 97.08%
            height: 467.6 / 479.79199 = 97.46%
        */}
        <div
          style={{
            position: 'absolute',
            // EXACT grid bounds from SVG analysis
            left: '1.457%',
            top: '1.271%',
            width: '97.08%',
            height: '97.46%',
            display: 'grid',
            gridTemplateColumns: 'repeat(9, 1fr)',
            gridTemplateRows: 'repeat(9, 1fr)',
            gap: 0,
            transform: rotateBoard ? 'rotate(180deg)' : 'none',
          }}
        >
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              // ✅ FIX: rowIndex/colIndex are already LOGICAL coordinates (array indices)
              // Legal moves are stored in logical coords, so direct comparison works
              const logicalRow = rowIndex;
              const logicalCol = colIndex;
              
              return (
                <BoardCell
                  key={`${rowIndex}-${colIndex}`}
                  cell={cell}
                  row={rowIndex}
                  col={colIndex}
                  dragSource={dragSource}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDrop={onDrop}
                  canDrag={isMyTurn}
                  isGotePlayer={isGotePlayer}
                  selectedSource={selectedSource}
                  onCellClick={handleCellClick}
                  isLegalMove={legalMoves.has(`${logicalRow}-${logicalCol}`)}
                  rotateBoard={rotateBoard}
                  gameMode={gameMode}
                />
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default ShogiBoard;
