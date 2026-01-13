import { useEffect, useRef } from "react";
import { User } from "lucide-react";
import { DragSource } from '@/hooks/useGameState';

// Selected source interface for tap-to-move
interface SelectedSource {
  type: 'board' | 'hand';
  row?: number;
  col?: number;
  handIndex?: number;
  piece: string;
  isOpponent: boolean;
}

interface PlayerPanelProps {
  label: string;
  time: string;
  isOpponent?: boolean;
  hand: string[];
  dragSource: DragSource | null;
  onDragStart: (source: DragSource) => void;
  onDragEnd: () => void;
  onDrop: (row: number, col: number) => void;
  videoStream?: MediaStream | null;
  isMyTurn?: boolean;
  canDrag?: boolean;
  // Tap-to-move support
  selectedSource?: SelectedSource | null;
  onSelectSource?: (source: SelectedSource | null) => void;
  // Layout modes
  handOnly?: boolean;
  videoOnly?: boolean;
  rotateHand?: boolean;
  fullColumn?: boolean;
}

interface HandPieceProps {
  piece: string;
  index: number;
  isOpponent: boolean;
  dragSource: DragSource | null;
  onDragStart: (source: DragSource) => void;
  onDragEnd: () => void;
  canDrag?: boolean;
  isSelected?: boolean;
  onPieceClick?: () => void;
}

const HandPiece = ({ piece, index, isOpponent, dragSource, onDragStart, onDragEnd, canDrag = true, isSelected = false, onPieceClick }: HandPieceProps) => {
  const isDragging = dragSource?.type === 'hand' && 
    dragSource?.handIndex === index && 
    dragSource?.isOpponent === isOpponent;

  const handleDragStart = (e: React.DragEvent) => {
    if (!canDrag) {
      e.preventDefault();
      return;
    }
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
        w-11 h-12 lg:w-12 lg:h-14 flex items-center justify-center
        ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default opacity-70'}
        ${isDragging ? 'opacity-50' : ''}
        ${isSelected ? 'ring-2 ring-yellow-500 rounded-md shadow-lg scale-110' : ''}
        transition-all duration-150
      `}
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={onPieceClick}
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
  onDragEnd,
  videoStream,
  isMyTurn = true,
  canDrag = true,
  selectedSource,
  onSelectSource,
  handOnly = false,
  videoOnly = false,
  rotateHand = false,
  fullColumn = false,
}: PlayerPanelProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Set up video stream
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // Handle hand piece click for tap-to-move
  const handleHandPieceClick = (piece: string, index: number) => {
    if (!canDrag || isOpponent) return;
    
    console.log('[Tap] Hand piece clicked:', { piece, index, isOpponent });
    
    // Check if this piece is already selected
    const isAlreadySelected = selectedSource?.type === 'hand' && 
      selectedSource?.handIndex === index && 
      selectedSource?.isOpponent === isOpponent;
    
    if (isAlreadySelected) {
      // Deselect
      console.log('[Tap] Deselecting hand piece');
      onSelectSource?.(null);
    } else {
      // Select this hand piece
      console.log('[Tap] Selecting hand piece:', piece);
      onSelectSource?.({
        type: 'hand',
        handIndex: index,
        piece,
        isOpponent,
      });
    }
  };

  // Full column mode: Timer → Video → Hand stacked vertically (TV Broadcast layout)
  if (fullColumn) {
    return (
      <div className="flex flex-col items-center gap-2 w-40 lg:w-48 xl:w-56">
        {/* Timer with label */}
        <div className="flex flex-col items-center gap-1">
          <div className={`text-sm lg:text-base font-bold drop-shadow-sm ${isMyTurn ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {label} {isMyTurn && <span className="text-xs">(考え中)</span>}
          </div>
          <div className={`
            timer-display rounded-lg px-3 py-1.5 shadow-lg transition-all duration-300
            ${isMyTurn ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-transparent timer-active' : 'opacity-75'}
          `}>
            <span className={`shogi-timer text-lg lg:text-xl ${isMyTurn ? 'text-amber-400' : 'text-timer-foreground'}`}>
              {time}
            </span>
          </div>
        </div>
        
        {/* Video/Avatar - LARGER (w-48 to w-64) */}
        <div 
          className={`
            w-full aspect-[4/3] rounded-xl 
            bg-gradient-to-br from-gray-100 to-gray-200
            border-4 border-gray-300
            shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.15)]
            overflow-hidden
          `}
        >
          {videoStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={!isOpponent}
              className="w-full h-full object-cover"
            />
          ) : (
            <img 
              src={isOpponent ? '/opponent-placeholder.png' : '/self-placeholder.png'}
              alt={isOpponent ? '対戦相手' : 'あなた'}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        
        {/* Captured Pieces (Hand/Komadai) */}
        <div className="w-full">
          <div className="text-xs lg:text-sm text-muted-foreground text-center mb-1 font-medium">
            {isOpponent ? '後手の持ち駒' : '先手の持ち駒'}
          </div>
          <div 
            className={`
              min-h-[60px] lg:min-h-[70px] p-2 lg:p-3 rounded-lg
              komadai-wood
              border-2 border-amber-800/40
              shadow-lg
              ${rotateHand ? 'rotate-180' : ''}
            `}
          >
            {hand.length === 0 ? (
              <div className={`text-xs lg:text-sm text-amber-700/50 text-center py-2 ${rotateHand ? 'rotate-180' : ''}`}>
                なし
              </div>
            ) : (
              <div className="flex flex-wrap gap-1 lg:gap-2 justify-center">
                {hand.map((piece, index) => {
                  const isThisSelected = selectedSource?.type === 'hand' && 
                    selectedSource?.handIndex === index && 
                    selectedSource?.isOpponent === isOpponent;
                  
                  return (
                    <HandPiece
                      key={`${piece}-${index}`}
                      piece={piece}
                      index={index}
                      isOpponent={isOpponent}
                      dragSource={dragSource}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      canDrag={canDrag && !isOpponent}
                      isSelected={isThisSelected}
                      onPieceClick={() => handleHandPieceClick(piece, index)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Hand-only mode: just show the komadai
  if (handOnly) {
    return (
      <div className="w-full max-w-[280px] lg:max-w-[320px]">
        <div className="text-sm text-muted-foreground text-center mb-2 font-medium">
          {isOpponent ? '後手の持ち駒' : '先手の持ち駒'}
        </div>
        <div 
          className={`
            min-h-[80px] p-3 rounded-lg
            komadai-wood
            border-2 border-amber-800/40
            shadow-lg
            ${rotateHand ? 'rotate-180' : ''}
          `}
        >
          {hand.length === 0 ? (
            <div className="text-sm text-amber-700/50 text-center py-3">
              なし
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center">
              {hand.map((piece, index) => {
                const isThisSelected = selectedSource?.type === 'hand' && 
                  selectedSource?.handIndex === index && 
                  selectedSource?.isOpponent === isOpponent;
                
                return (
                  <HandPiece
                    key={`${piece}-${index}`}
                    piece={piece}
                    index={index}
                    isOpponent={isOpponent}
                    dragSource={dragSource}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    canDrag={canDrag && !isOpponent}
                    isSelected={isThisSelected}
                    onPieceClick={() => handleHandPieceClick(piece, index)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Video-only mode: just show timer and video
  if (videoOnly) {
    return (
      <div className="flex flex-col items-center gap-4">
        {/* Time label with turn indicator */}
        <div className={`text-lg font-medium drop-shadow-sm ${isMyTurn ? 'text-amber-600' : 'text-muted-foreground'}`}>
          {label} {isMyTurn && <span className="text-xs">(考え中)</span>}
        </div>
        
        {/* Digital clock display */}
        <div className={`
          timer-display rounded-xl px-6 py-3 shadow-2xl transition-all duration-300
          ${isMyTurn ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-transparent timer-active' : 'opacity-75'}
        `}>
          <span className={`shogi-timer ${isMyTurn ? 'text-amber-400' : 'text-timer-foreground'}`}>
            {time}
          </span>
        </div>
        
        {/* Video feed - LARGER for iPad Pro */}
        <div 
          className={`
            w-full aspect-[4/3] max-w-[280px] lg:max-w-[320px] xl:max-w-[360px] rounded-xl 
            bg-gradient-to-br from-gray-100 to-gray-200
            border-4 border-gray-300
            shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.15)]
            overflow-hidden
          `}
        >
          {videoStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={!isOpponent}
              className="w-full h-full object-cover"
            />
          ) : (
            <img 
              src={isOpponent ? '/opponent-placeholder.png' : '/self-placeholder.png'}
              alt={isOpponent ? '対戦相手' : 'あなた'}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </div>
    );
  }

  // Full mode (legacy - not used in new layout)
  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Time label with turn indicator */}
      <div className={`text-lg font-medium drop-shadow-sm ${isMyTurn ? 'text-amber-600' : 'text-muted-foreground'}`}>
        {label} {isMyTurn && <span className="text-xs">(考え中)</span>}
      </div>
      
      {/* Digital clock display with beveled effect - highlight active turn */}
      <div className={`
        timer-display rounded-xl px-6 py-3 shadow-2xl transition-all duration-300
        ${isMyTurn ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-transparent timer-active' : 'opacity-75'}
      `}>
        <span className={`shogi-timer ${isMyTurn ? 'text-amber-400' : 'text-timer-foreground'}`}>
          {time}
        </span>
      </div>
      
      {/* Video feed with tablet/picture frame effect - LARGER */}
      <div 
        className={`
          w-full aspect-[4/3] max-w-[280px] lg:max-w-[320px] rounded-xl 
          bg-gradient-to-br from-gray-100 to-gray-200
          border-4 border-gray-300
          shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.15)]
          overflow-hidden
        `}
      >
        {videoStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={!isOpponent} // Mute local stream to avoid echo
            className="w-full h-full object-cover"
          />
        ) : (
          <img 
            src={isOpponent ? '/opponent-placeholder.png' : '/self-placeholder.png'}
            alt={isOpponent ? '対戦相手' : 'あなた'}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Komadai (Piece Stand) */}
      <div className="w-full max-w-[280px] lg:max-w-[320px]">
        <div className="text-sm text-muted-foreground text-center mb-2 font-medium">
          {isOpponent ? '後手の持ち駒' : '先手の持ち駒'}
        </div>
        <div 
          className="
            min-h-[80px] p-3 rounded-lg
            komadai-wood
            border-2 border-amber-800/40
            shadow-lg
          "
        >
          {hand.length === 0 ? (
            <div className="text-sm text-amber-700/50 text-center py-3">
              なし
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center">
              {hand.map((piece, index) => {
                const isThisSelected = selectedSource?.type === 'hand' && 
                  selectedSource?.handIndex === index && 
                  selectedSource?.isOpponent === isOpponent;
                
                return (
                  <HandPiece
                    key={`${piece}-${index}`}
                    piece={piece}
                    index={index}
                    isOpponent={isOpponent}
                    dragSource={dragSource}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    canDrag={canDrag && !isOpponent}
                    isSelected={isThisSelected}
                    onPieceClick={() => handleHandPieceClick(piece, index)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerPanel;
