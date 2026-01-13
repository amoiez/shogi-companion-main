import { useState } from 'react';
import { DragSource, CellData } from '@/hooks/useGameState';

// Selected cell state for tap-to-move
interface SelectedSource {
  type: 'board' | 'hand';
  row?: number;
  col?: number;
  handIndex?: number;
  piece: string;
  isOpponent: boolean;
}

interface ShogiPieceProps {
  piece: string | null;
  isOpponent: boolean;
  isDragging?: boolean;
}

const ShogiPiece = ({ piece, isOpponent, isDragging }: ShogiPieceProps) => {
  if (!piece) return null;
  
  return (
    <div 
      className={`
        w-[90%] h-[90%] flex items-center justify-center
        shogi-piece text-board-foreground
        ${isOpponent ? 'rotate-180' : ''}
        ${isDragging ? 'opacity-50' : ''}
        transition-opacity
      `}
    >
      <div className="relative w-full h-full">
        {/* Piece background - Shogi wedge/pentagon shape with 3D bevel */}
        <div 
          className="absolute inset-0 shogi-wedge-piece"
          style={{
            clipPath: 'polygon(50% 0%, 95% 15%, 100% 100%, 0% 100%, 5% 15%)',
          }}
        >
          {/* Top highlight for 3D effect */}
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
  isGotePlayer: boolean; // True if current player is Gote (guest)
  selectedSource: SelectedSource | null;
  onCellClick: (row: number, col: number, cell: CellData) => void;
}

const BoardCell = ({ cell, row, col, dragSource, onDragStart, onDragEnd, onDrop, canDrag, isGotePlayer, selectedSource, onCellClick }: BoardCellProps) => {
  const isDraggingThis = dragSource?.type === 'board' && 
    dragSource?.row === row && 
    dragSource?.col === col;

  // Check if this cell is the selected source (for tap-to-move)
  const isSelected = selectedSource?.type === 'board' && 
    selectedSource?.row === row && 
    selectedSource?.col === col;

  const isValidDropTarget = (dragSource !== null || selectedSource !== null) && !isDraggingThis && !isSelected;
  
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
        border border-amber-950/60
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
}: ShogiBoardProps) => {
  // Internal selected state (used if no external state provided)
  const [internalSelectedSource, setInternalSelectedSource] = useState<SelectedSource | null>(null);
  
  // Use external state if provided, otherwise use internal
  const selectedSource = externalSelectedSource !== undefined ? externalSelectedSource : internalSelectedSource;
  const setSelectedSource = externalOnSelectSource || setInternalSelectedSource;

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
        <div className="mb-3 px-4 py-2 bg-amber-100/80 rounded-full text-base text-amber-800 font-medium">
          相手の番です
        </div>
      )}
      
      {/* Board container with realistic wood texture and strong shadow - LARGER */}
      <div 
        className={`
          rounded-xl p-2 board-wood-texture
          shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]
          border-[6px] lg:border-[8px] border-amber-900/40
          ring-1 ring-amber-950/20
          h-full max-h-[80vh] aspect-square
          flex flex-col
          ${!isMyTurn ? 'opacity-90' : ''}
        `}
      >
        {/* Inner board with wood grain - no extra padding */}
        <div className="board-inner-wood rounded-sm flex-1 w-full overflow-hidden">
          {/* 9x9 Grid - stretch to fill entire board */}
          <div 
            className="grid gap-0 board-grid w-full h-full"
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
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShogiBoard;
