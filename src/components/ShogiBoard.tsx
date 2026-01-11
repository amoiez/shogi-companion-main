import { DragSource, CellData } from '@/hooks/useGameState';

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
        w-full h-full flex items-center justify-center
        shogi-piece text-board-foreground
        ${isOpponent ? 'rotate-180' : ''}
        ${isDragging ? 'opacity-50' : ''}
        transition-opacity
      `}
    >
      <div className="relative w-[85%] h-[90%]">
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
        <span className="absolute inset-0 flex items-center justify-center z-10 text-lg md:text-xl font-bold shogi-piece-text drop-shadow-sm">
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
}

const BoardCell = ({ cell, row, col, dragSource, onDragStart, onDragEnd, onDrop, canDrag, isGotePlayer }: BoardCellProps) => {
  const isDraggingThis = dragSource?.type === 'board' && 
    dragSource?.row === row && 
    dragSource?.col === col;

  const isValidDropTarget = dragSource !== null && !isDraggingThis;
  
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

  return (
    <div 
      className={`
        w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14
        border border-amber-950/60
        flex items-center justify-center
        transition-all duration-150
        ${canDragThis ? 'cursor-grab' : 'cursor-default'}
        relative
        ${isValidDropTarget ? 'bg-amber-400/30 hover:bg-amber-400/50' : 'hover:bg-amber-400/20'}
        ${isDraggingThis ? 'bg-amber-300/50' : ''}
        ${isPromotionZone && !cell.piece ? 'bg-amber-600/5' : ''}
      `}
      draggable={!!canDragThis}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
}

const ShogiBoard = ({ board, dragSource, onDragStart, onDragEnd, onDrop, isMyTurn = true, isGotePlayer = false }: ShogiBoardProps) => {
  return (
    <div className="flex flex-col items-center max-w-full">
      {/* Turn indicator */}
      {!isMyTurn && (
        <div className="mb-2 px-3 py-1 bg-amber-100/80 rounded-full text-sm text-amber-800 font-medium">
          相手の番です
        </div>
      )}
      
      {/* Board container with realistic wood texture and strong shadow */}
      <div 
        className={`
          rounded-lg p-2 md:p-3 board-wood-texture
          shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]
          border-4 md:border-[6px] border-amber-900/40
          ring-1 ring-amber-950/20
          max-w-full max-h-[80vh]
          ${!isMyTurn ? 'opacity-90' : ''}
        `}
      >
        {/* Inner board with wood grain */}
        <div className="board-inner-wood rounded p-1">
          {/* 9x9 Grid */}
          <div 
            className="grid gap-0 board-grid"
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
                />
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Column markers */}
      <div className="flex justify-center mt-2 gap-0">
        {['9', '8', '7', '6', '5', '4', '3', '2', '1'].map((num) => (
          <div 
            key={num} 
            className="w-10 md:w-12 lg:w-14 text-center text-sm text-muted-foreground font-medium"
          >
            {num}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShogiBoard;
