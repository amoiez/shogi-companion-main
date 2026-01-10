import { User } from "lucide-react";
import { DragSource } from '@/hooks/useGameState';

interface PlayerPanelProps {
  label: string;
  time: string;
  isOpponent?: boolean;
  hand: string[];
  dragSource: DragSource | null;
  onDragStart: (source: DragSource) => void;
  onDragEnd: () => void;
  onDrop: (row: number, col: number) => void;
}

interface HandPieceProps {
  piece: string;
  index: number;
  isOpponent: boolean;
  dragSource: DragSource | null;
  onDragStart: (source: DragSource) => void;
  onDragEnd: () => void;
}

const HandPiece = ({ piece, index, isOpponent, dragSource, onDragStart, onDragEnd }: HandPieceProps) => {
  const isDragging = dragSource?.type === 'hand' && 
    dragSource?.handIndex === index && 
    dragSource?.isOpponent === isOpponent;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    onDragStart({
      type: 'hand',
      handIndex: index,
      piece,
      isOpponent,
    });
  };

  return (
    <div
      className={`
        w-9 h-10 md:w-10 md:h-11 flex items-center justify-center
        cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-50' : ''}
        ${isOpponent ? 'rotate-180' : ''}
      `}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
    >
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
        <span className="absolute inset-0 flex items-center justify-center z-10 text-base md:text-lg font-bold shogi-piece-text drop-shadow-sm">
          {piece}
        </span>
      </div>
    </div>
  );
};

const PlayerPanel = ({ 
  label, 
  time, 
  isOpponent = false, 
  hand, 
  dragSource, 
  onDragStart, 
  onDragEnd 
}: PlayerPanelProps) => {
  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Time label */}
      <div className="text-lg font-medium text-muted-foreground drop-shadow-sm">
        {label}
      </div>
      
      {/* Digital clock display with beveled effect */}
      <div className="timer-display rounded-xl px-6 py-3 shadow-2xl">
        <span className="shogi-timer text-timer-foreground">
          {time}
        </span>
      </div>
      
      {/* Video feed placeholder with tablet/picture frame effect */}
      <div 
        className={`
          w-full aspect-[4/3] max-w-[200px] rounded-2xl 
          video-frame-metallic
          bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center
          shadow-2xl
        `}
      >
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <User className="w-16 h-16" strokeWidth={1.5} />
          <span className="text-sm font-medium">ビデオ通話</span>
        </div>
      </div>

      {/* Komadai (Piece Stand) */}
      <div className="w-full max-w-[200px]">
        <div className="text-xs text-muted-foreground text-center mb-1 font-medium">
          {isOpponent ? '後手の持ち駒' : '先手の持ち駒'}
        </div>
        <div 
          className="
            min-h-[60px] p-2 rounded-lg
            komadai-wood
            border-2 border-amber-800/40
            shadow-lg
          "
        >
          {hand.length === 0 ? (
            <div className="text-xs text-amber-700/50 text-center py-2">
              なし
            </div>
          ) : (
            <div className="flex flex-wrap gap-1 justify-center">
              {hand.map((piece, index) => (
                <HandPiece
                  key={`${piece}-${index}`}
                  piece={piece}
                  index={index}
                  isOpponent={isOpponent}
                  dragSource={dragSource}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerPanel;
