import { useState, useMemo } from 'react';
import { DragSource, CellData, getLegalMoves, getLegalDrops } from '@/hooks/useGameState';

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

  // Piece rotation logic - FIXED:
  // - Gote pieces (isOpponent=true) are ALWAYS rotated 180° to face downward
  // - Sente pieces (isOpponent=false) are NEVER rotated
  // - This remains constant regardless of board rotation (rotateBoard has no effect on piece rotation)
  // - The board container handles the turn-flip rotation separately

  // Get the piece image path from /public/pieces/
  const imagePath = getPieceImagePath(piece, isOpponent);

  // FLEXBOX APPROACH: Piece is 90% of cell, naturally centered by parent flex container
  // Parent cell uses display:flex with center alignment
  // Sente: translateY(12px) - pushes piece down to center
  // Gote: rotate(180deg) translateY(12px) - rotates then translates in rotated space to center
  if (imagePath) {
    return (
      <img
        src={imagePath}
        alt={piece}
        draggable={false}
        style={{
          width: '90%',
          height: '90%',
          objectFit: 'contain',
          transform: isOpponent ? 'rotate(180deg) translateY(12px)' : 'translateY(12px)',
          transformOrigin: 'center center',
          opacity: isDragging ? 0.5 : 1,
          pointerEvents: 'auto',
          zIndex: 5,
        }}
      />
    );
  }

  // Fallback to text rendering if no image found
  // Apply translateY(12px) offset so pieces sit perfectly centered in squares
  return (
    <div
      style={{
        width: '90%',
        height: '90%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: isOpponent ? 'rotate(180deg) translateY(12px)' : 'translateY(12px)',
        transformOrigin: 'center center',
        opacity: isDragging ? 0.5 : 1,
        pointerEvents: 'auto',
        zIndex: 5,
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
}

const BoardCell = ({ cell, row, col, dragSource, onDragStart, onDragEnd, onDrop, canDrag, isGotePlayer, selectedSource, onCellClick, isLegalMove, rotateBoard = false }: BoardCellProps) => {
  const isDraggingThis = dragSource?.type === 'board' &&
    dragSource?.row === row &&
    dragSource?.col === col;

  // Check if this cell is the selected source (for tap-to-move)
  const isSelected = selectedSource?.type === 'board' &&
    selectedSource?.row === row &&
    selectedSource?.col === col;

  // Only show as valid drop target if it's a legal move
  const isValidDropTarget = isLegalMove && !isDraggingThis && !isSelected;

  // Can only drag my own pieces when it's my turn
  // For Sente (host): drag pieces where isOpponent === false
  // For Gote (guest): drag pieces where isOpponent === true
  const isMyPiece = isGotePlayer ? cell.isOpponent : !cell.isOpponent;
  const canDragThis = canDrag && cell.piece && isMyPiece;

  const handleDragStart = (e: React.DragEvent) => {
    if (!cell.piece || !canDragThis) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.effectAllowed = 'move';
    onDragStart({
      type: 'board',
      row,
      col,
      piece: cell.piece,
      isOpponent: cell.isOpponent,
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isValidDropTarget) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isValidDropTarget) {
      onDrop(row, col);
    }
  };

  // Determine if this is in a promotion zone (for visual hint)
  const isPromotionZone = row <= 2 || row >= 6;

  // Handle click/tap for mobile support
  const handleClick = () => {
    onCellClick(row, col, cell);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        cursor: canDragThis ? 'grab' : 'pointer',
        backgroundColor: isSelected 
          ? 'rgba(253, 224, 71, 0.7)' 
          : isDraggingThis 
            ? 'rgba(252, 211, 77, 0.5)'
            : isValidDropTarget 
              ? 'rgba(251, 191, 36, 0.3)' 
              : 'transparent',
        boxShadow: isSelected ? 'inset 0 0 0 2px #eab308' : 'none',
        transition: 'background-color 150ms, box-shadow 150ms',
      }}
      draggable={!!canDragThis}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
}: ShogiBoardProps) => {
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

    console.log('[Tap] Cell clicked:', { row, col, piece: cell.piece, isMyPiece, isMyTurn, selectedSource });

    // If it's not my turn, do nothing
    if (!isMyTurn) {
      console.log('[Tap] Not my turn, ignoring click');
      return;
    }

    // CASE 1: No piece selected yet
    if (!selectedSource) {
      // If clicking on my own piece, select it
      if (hasPiece && isMyPiece) {
        console.log('[Tap] Selecting piece:', cell.piece);
        setSelectedSource({
          type: 'board',
          row,
          col,
          piece: cell.piece!,
          isOpponent: cell.isOpponent,
        });
      }
      return;
    }

    // CASE 2: A piece is already selected
    const isSameCell = selectedSource.type === 'board' &&
      selectedSource.row === row &&
      selectedSource.col === col;

    // If clicking the same cell, deselect (cancel)
    if (isSameCell) {
      console.log('[Tap] Deselecting (same cell)');
      setSelectedSource(null);
      return;
    }

    // If clicking on another of my pieces, switch selection
    if (hasPiece && isMyPiece) {
      console.log('[Tap] Switching selection to:', cell.piece);
      setSelectedSource({
        type: 'board',
        row,
        col,
        piece: cell.piece!,
        isOpponent: cell.isOpponent,
      });
      return;
    }

    // Otherwise, try to move to this cell (empty or opponent piece)
    console.log('[Tap] Moving to destination:', { row, col });

    // First, set the drag source so handleDrop knows what piece to move
    onDragStart(selectedSource as DragSource);

    // Execute the move
    onDrop(row, col);

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

      {/* Board - Direct child, fills entire parent with 20px internal padding safety zone */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundImage: 'url(/board.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          border: '15px solid #5d3a1a',
          borderRadius: '4px',
          boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(0,0,0,0.2)',
          overflow: 'visible',
          opacity: !isMyTurn ? 0.9 : 1,
          padding: '20px',
        }}
      >
        {/* 9x9 Grid Layer - fills area inside 20px padding, grid stays within wooden frame */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(9, 1fr)',
            gridTemplateRows: 'repeat(9, 1fr)',
            gap: 0,
            transform: rotateBoard ? 'rotate(180deg)' : 'none',
            zIndex: 2,
            overflow: 'visible',
          }}
        >
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
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
                isLegalMove={legalMoves.has(`${rowIndex}-${colIndex}`)}
                rotateBoard={rotateBoard}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default ShogiBoard;
