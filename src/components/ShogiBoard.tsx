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
  
  // Piece rotation logic:
  // - Opponent pieces (isOpponent=true) are normally rotated 180° so they face down
  // - When board is rotated for Gote view, we flip the logic:
  //   - My pieces (now isOpponent=true from Gote view) should face up (rotate-180 to counter board rotation)
  //   - Opponent pieces (isOpponent=false from Gote view) should face down (no rotation, board already flipped them)
  const shouldRotate = rotateBoard ? !isOpponent : isOpponent;
  
  // Get the piece image path
  const imagePath = getPieceImagePath(piece, isOpponent);
  
  return (
    <div 
      className={`
        w-full h-full flex items-center justify-center
        shogi-piece text-board-foreground
        ${shouldRotate ? 'rotate-180' : ''}
        ${isDragging ? 'opacity-50' : ''}
        transition-opacity
      `}
      style={{
        padding: '12% 6% 4% 6%',
      }}
    >
      {imagePath ? (
        <img 
          src={imagePath} 
          alt={piece}
          className="w-full h-full object-contain drop-shadow-lg"
          draggable={false}
        />
      ) : (
        /* Fallback to text rendering if no image found */
        <div className="relative w-full h-full">
          <div 
            className="absolute inset-0 shogi-wedge-piece"
            style={{
              clipPath: 'polygon(50% 0%, 95% 15%, 100% 100%, 0% 100%, 5% 15%)',
            }}
          >
            <div 
              className="absolute top-0 left-0 right-0 h-[30%] bg-gradient-to-b from-amber-50/80 to-transparent"
              style={{
                clipPath: 'polygon(50% 0%, 95% 15%, 90% 30%, 10% 30%, 5% 15%)',
              }}
            />
          </div>
          <span className="absolute inset-0 flex items-center justify-center z-10 text-[clamp(0.875rem,2vmin,1.5rem)] font-bold shogi-piece-text drop-shadow-sm">
            {piece}
          </span>
        </div>
      )}
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
      className={`
        w-full h-full
        flex items-center justify-center
        transition-all duration-150
        ${canDragThis ? 'cursor-grab' : 'cursor-pointer'}
        relative
        ${isSelected ? 'bg-yellow-300/70 ring-2 ring-yellow-500 shadow-lg' : ''}
        ${isValidDropTarget && !isSelected ? 'bg-amber-400/30 hover:bg-amber-400/50' : 'hover:bg-amber-400/20'}
        ${isDraggingThis ? 'bg-amber-300/50' : ''}
        ${isPromotionZone && !cell.piece && !isSelected ? 'bg-amber-600/5' : ''}
      `}
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
    <div className="flex flex-col items-center w-full h-full">
      {/* Turn indicator */}
      {!isMyTurn && (
        <div className="mb-2 px-4 py-2 bg-amber-100/80 rounded-full text-base text-amber-800 font-medium">
          相手の番です
        </div>
      )}
      
      {/* Board container with SVG background - FILLS SCREEN HEIGHT */}
      <div 
        className={`
          relative rounded-xl overflow-hidden
          shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]
          border-[6px] lg:border-[8px] xl:border-[10px] border-amber-900/40
          ring-1 ring-amber-950/20
          h-full max-h-[88vh] aspect-square
          ${!isMyTurn ? 'opacity-90' : ''}
        `}
        style={{
          backgroundImage: 'url(/board.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#d4bc8a',
        }}
      >
        {/* 9x9 Grid Layer - sits on top of SVG background */}
        <div 
          className={`relative w-full h-full grid gap-0 ${rotateBoard ? 'rotate-180' : ''}`}
          style={{ 
            gridTemplateColumns: 'repeat(9, 1fr)',
            gridTemplateRows: 'repeat(9, 1fr)',
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
    </div>
  );
};

export default ShogiBoard;
