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

// Mapping from Japanese piece characters to image filenames (captured pieces are always demoted)
const HAND_PIECE_IMAGE_MAP: Record<string, { sente: string; gote: string }> = {
  '歩': { sente: 'sente_pawn.png', gote: 'gote_pawn.png' },
  '香': { sente: 'sente_lance.png', gote: 'gote_lance.png' },
  '桂': { sente: 'sente_knight.png', gote: 'gote_knight.png' },
  '銀': { sente: 'sente_silver.png', gote: 'gote_silver.png' },
  '金': { sente: 'sente_gold.png', gote: 'gote_gold.png' },
  '角': { sente: 'sente_bishop.png', gote: 'gote_bishop.png' },
  '飛': { sente: 'sente_rook.png', gote: 'gote_rook.png' },
};

// Get hand piece image path
const getHandPieceImagePath = (piece: string, isOpponent: boolean): string | null => {
  const mapping = HAND_PIECE_IMAGE_MAP[piece];
  if (!mapping) return null;
  // isOpponent=true means Gote piece, isOpponent=false means Sente piece
  const filename = isOpponent ? mapping.gote : mapping.sente;
  return `/pieces/${filename}`;
};

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
  // Player identity (name + rank)
  playerName?: string;
  playerRank?: string;
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
  count?: number; // For grouped display
}

const HandPiece = ({ piece, index, isOpponent, dragSource, onDragStart, onDragEnd, canDrag = true, isSelected = false, onPieceClick, count }: HandPieceProps) => {
  const isDragging = dragSource?.type === 'hand' && 
    dragSource?.handIndex === index && 
    dragSource?.isOpponent === isOpponent;

  // Handle pointer down for piece selection (replaces drag start)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canDrag) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    
    // Call existing game function - NO CHANGES to game logic
    onDragStart({
      type: 'hand',
      handIndex: index,
      piece,
      isOpponent,
    });
  };

  // Get the piece image path
  const imagePath = getHandPieceImagePath(piece, isOpponent);

  return (
    <div
      className={`
        hand-piece
        relative w-12 h-14 lg:w-14 lg:h-16 xl:w-16 xl:h-18 flex items-center justify-center
        ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default opacity-70'}
        ${isSelected ? 'ring-3 ring-yellow-500 rounded-md shadow-xl scale-115' : ''}
        transition-all duration-150 p-1
      `}
      onPointerDown={canDrag ? handlePointerDown : undefined}
      onClick={onPieceClick}
    >
      {imagePath ? (
        <img 
          src={imagePath} 
          alt={piece}
          className="w-full h-full object-contain drop-shadow-md"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            aspectRatio: '140/148',
            transform: isOpponent ? 'rotate(180deg)' : 'rotate(0deg)',
            transformOrigin: 'center center',
          }}
          draggable={false}
        />
      ) : (
        /* Fallback to text rendering */
        <div 
          className="relative w-full h-full"
          style={{
            transform: isOpponent ? 'rotate(180deg)' : 'rotate(0deg)',
            transformOrigin: 'center center',
          }}
        >
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
      )}
      {/* Count badge for grouped pieces - ENLARGED for accessibility (elderly users) */}
      {count && count > 1 && (
        <div className="absolute -bottom-1 -right-1 bg-red-600 text-white text-base lg:text-lg font-bold rounded-full w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center shadow-lg z-20 border-2 border-white">
          {count}
        </div>
      )}
    </div>
  );
};

// ============================================================
// PLAYER IDENTITY DISPLAY COMPONENT
// Shows player name, rank (Dan/Kyu), and Sente/Gote piece icon
// ============================================================
interface PlayerIdentityProps {
  name: string;
  rank: string;
  isSente: boolean; // true = Sente (black/filled icon), false = Gote (white/outlined icon)
}

const PlayerIdentity = ({ name, rank, isSente }: PlayerIdentityProps) => {
  // Truncate name to 10 characters max
  const displayName = name.length > 10 ? name.slice(0, 10) : name;
  
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/80 rounded-lg shadow-md border border-amber-200">
      {/* Sente/Gote piece icon */}
      {isSente ? (
        // Sente: Solid black piece icon (filled pentagon)
        <svg 
          width="24" 
          height="28" 
          viewBox="0 0 24 28" 
          className="flex-shrink-0"
        >
          <path 
            d="M12 2 L22 7 L22 26 L2 26 L2 7 Z" 
            fill="#1a1a1a" 
            stroke="#1a1a1a" 
            strokeWidth="1"
          />
        </svg>
      ) : (
        // Gote: Outlined white piece icon (hollow pentagon)
        <svg 
          width="24" 
          height="28" 
          viewBox="0 0 24 28" 
          className="flex-shrink-0"
        >
          <path 
            d="M12 2 L22 7 L22 26 L2 26 L2 7 Z" 
            fill="white" 
            stroke="#1a1a1a" 
            strokeWidth="2"
          />
        </svg>
      )}
      
      {/* Player name and rank */}
      <div 
        className="flex items-baseline gap-1.5 min-w-0"
        style={{ maxWidth: '180px' }}
      >
        <span 
          className="text-base lg:text-lg font-bold text-amber-900 truncate"
          style={{ 
            maxWidth: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={name} // Show full name on hover
        >
          {displayName}
        </span>
        <span className="text-sm lg:text-base font-medium text-amber-700 flex-shrink-0">
          {rank}
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
  playerName = '',
  playerRank = '',
}: PlayerPanelProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Set up video stream with explicit play() call
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement && videoStream) {
      console.log('[PlayerPanel] Setting up video/audio stream, isOpponent:', isOpponent);
      
      // Set the stream
      videoElement.srcObject = videoStream;
      
      // Explicitly play to ensure audio works (autoPlay can be blocked)
      const playPromise = videoElement.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[PlayerPanel] Video/audio playback started successfully, isOpponent:', isOpponent);
          })
          .catch((error) => {
            console.error('[PlayerPanel] Failed to start video/audio playback:', error);
            // On mobile/iPad, playback might require user interaction
            // Try again on next user interaction
            const handleInteraction = () => {
              videoElement.play()
                .then(() => {
                  console.log('[PlayerPanel] Video/audio started after user interaction');
                  document.removeEventListener('click', handleInteraction);
                  document.removeEventListener('touchstart', handleInteraction);
                })
                .catch(err => console.error('[PlayerPanel] Still failed after interaction:', err));
            };
            
            document.addEventListener('click', handleInteraction, { once: true });
            document.addEventListener('touchstart', handleInteraction, { once: true });
          });
      }
    }
    
    // Cleanup
    return () => {
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [videoStream, isOpponent]);

  // Handle hand piece click for tap-to-move
  const handleHandPieceClick = (piece: string, index: number) => {
    // canDrag already accounts for whether it's this player's turn and role
    if (!canDrag) return;
    
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

  // Group pieces by type for display (e.g., "Pawn x6")
  const groupedHandArray = (() => {
    const groups: Record<string, { piece: string; count: number; index: number }> = {};
    
    hand.forEach((piece, index) => {
      if (groups[piece]) {
        groups[piece].count++;
      } else {
        groups[piece] = { piece, count: 1, index };
      }
    });
    
    return Object.values(groups);
  })();

  // Full column mode: Timer → Video → Hand stacked vertically (TV Broadcast layout for iPad Pro)
  if (fullColumn) {
    return (
      <div className="flex flex-col items-center gap-4 w-[264px] lg:w-[316px] xl:w-[352px]">
        {/* Timer with label - using game-clock.png background */}
        <div className="flex flex-col items-center gap-2">
          <div className={`text-base lg:text-lg xl:text-xl font-bold drop-shadow-md ${isMyTurn ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {label} {isMyTurn && <span className="text-sm lg:text-base">(考え中)</span>}
          </div>
          <div 
            className={`
              relative rounded-xl shadow-xl transition-all duration-300
              w-40 h-20 lg:w-48 lg:h-24 xl:w-56 xl:h-28
              flex items-center justify-center
              ${isMyTurn ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-transparent' : 'opacity-80'}
            `}
            style={{
              backgroundImage: 'url(/images/game-clock.png)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          >
            {/* Tan mask to cover static digits on clock image */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-[#dcc9a5] px-3 py-1 rounded-md">
                <span className="shogi-timer text-xl lg:text-2xl xl:text-3xl font-black text-black" style={{ textShadow: '0 0 2px rgba(255, 255, 255, 0.5)' }}>
                  {time}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Video/Avatar - SIGNIFICANTLY ENLARGED for clear opponent expressions */}
        <div 
          className={`
            rounded-2xl 
            bg-gradient-to-br from-gray-100 to-gray-200
            border-4 lg:border-6 border-amber-700/40
            shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.25)]
            overflow-hidden
            flex items-center justify-center
          `}
          style={{
            width: 'clamp(200px, 20vw, 260px)',
            height: 'clamp(170px, 24vh, 240px)',
          }}
        >
          {videoStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={!isOpponent}
              className="w-full h-full object-contain"
              style={{ objectPosition: 'center' }}
            />
          ) : (
            <img 
              src={isOpponent ? '/images/elderly-man.png' : '/images/nakano-san.png'}
              alt={isOpponent ? '対戦相手' : '中野さん'}
              className="w-full h-full object-contain"
              style={{ objectPosition: 'center' }}
            />
          )}
        </div>
        
        {/* Player Identity - Name and Rank with Sente/Gote icon */}
        {playerName && (
          <PlayerIdentity 
            name={playerName} 
            rank={playerRank} 
            isSente={!isOpponent} 
          />
        )}
        
        {/* Captured Pieces (Hand/Komadai) - LARGER for iPad Pro with grouped display */}
        <div className="w-full flex flex-col items-center">
          <div className="text-sm lg:text-base xl:text-lg text-muted-foreground text-center mb-2 font-medium">
            {isOpponent ? '後手の持ち駒' : '先手の持ち駒'}
          </div>
          <div 
            className={`
              p-3 lg:p-4 rounded-xl
              komadai-wood
              border-3 border-amber-800/50
              shadow-xl
              flex justify-center
              ${rotateHand ? 'rotate-180' : ''}
            `}
            style={{
              width: 'clamp(130px, 14vw, 180px)',
              minHeight: 'clamp(90px, 10vh, 140px)',
            }}
          >
            {hand.length === 0 ? (
              <div className={`text-sm lg:text-base xl:text-lg text-amber-700/50 text-center py-3 ${rotateHand ? 'rotate-180' : ''}`}>
                なし
              </div>
            ) : (
              <div 
                className="grid grid-cols-2 justify-center"
                style={{
                  gap: 'clamp(6px, 1vh, 10px)',
                }}
              >
                {groupedHandArray.map(({ piece, count, index }) => {
                  const isThisSelected = selectedSource?.type === 'hand' && 
                    selectedSource?.piece === piece && 
                    selectedSource?.isOpponent === isOpponent;
                  
                  return (
                    <HandPiece
                      key={`${piece}-grouped`}
                      piece={piece}
                      index={index}
                      isOpponent={isOpponent}
                      dragSource={dragSource}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      canDrag={canDrag}
                      isSelected={isThisSelected}
                      onPieceClick={() => handleHandPieceClick(piece, index)}
                      count={count}
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

  // Hand-only mode: just show the komadai with grouped pieces
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
              {groupedHandArray.map(({ piece, count, index }) => {
                const isThisSelected = selectedSource?.type === 'hand' && 
                  selectedSource?.piece === piece && 
                  selectedSource?.isOpponent === isOpponent;
                
                return (
                  <HandPiece
                    key={`${piece}-grouped`}
                    piece={piece}
                    index={index}
                    isOpponent={isOpponent}
                    dragSource={dragSource}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    canDrag={canDrag}
                    isSelected={isThisSelected}
                    onPieceClick={() => handleHandPieceClick(piece, index)}
                    count={count}
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
        <div 
          className={`
            relative rounded-xl shadow-xl transition-all duration-300
            w-40 h-20 flex items-center justify-center
            ${isMyTurn ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-transparent' : 'opacity-75'}
          `}
          style={{
            backgroundImage: 'url(/images/game-clock.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-[#dcc9a5] px-3 py-1 rounded-md">
              <span className="shogi-timer text-xl font-black text-black" style={{ textShadow: '0 0 2px rgba(255, 255, 255, 0.5)' }}>
                {time}
              </span>
            </div>
          </div>
        </div>
        
        {/* Video feed - LARGER for iPad Pro */}
        <div 
          className={`
            rounded-xl 
            bg-gradient-to-br from-gray-100 to-gray-200
            border-4 border-gray-300
            shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.15)]
            overflow-hidden
            flex items-center justify-center
          `}
          style={{
            width: 'clamp(200px, 20vw, 280px)',
            aspectRatio: '4/3',
          }}
        >
          {videoStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={!isOpponent}
              className="w-full h-full object-contain"
              style={{ objectPosition: 'center' }}
            />
          ) : (
            <img 
              src={isOpponent ? '/opponent-placeholder.png' : '/self-placeholder.png'}
              alt={isOpponent ? '対戦相手' : 'あなた'}
              className="w-full h-full object-contain"
              style={{ objectPosition: 'center' }}
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
      <div 
        className={`
          relative rounded-xl shadow-xl transition-all duration-300
          w-40 h-20 flex items-center justify-center
          ${isMyTurn ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-transparent' : 'opacity-75'}
        `}
        style={{
          backgroundImage: 'url(/images/game-clock.png)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-[#dcc9a5] px-3 py-1 rounded-md">
            <span className="shogi-timer text-xl font-black text-black" style={{ textShadow: '0 0 2px rgba(255, 255, 255, 0.5)' }}>
              {time}
            </span>
          </div>
        </div>
      </div>
      
      {/* Video feed with tablet/picture frame effect - LARGER */}
      <div 
        className={`
          rounded-xl 
          bg-gradient-to-br from-gray-100 to-gray-200
          border-4 border-gray-300
          shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.15)]
          overflow-hidden
          flex items-center justify-center
        `}
        style={{
          width: 'clamp(200px, 20vw, 280px)',
          aspectRatio: '4/3',
        }}
      >
        {videoStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={!isOpponent} // Mute local stream to avoid echo
            className="w-full h-full object-contain"
            style={{ objectPosition: 'center' }}
          />
        ) : (
          <img 
            src={isOpponent ? '/opponent-placeholder.png' : '/self-placeholder.png'}
            alt={isOpponent ? '対戦相手' : 'あなた'}
            className="w-full h-full object-contain"
            style={{ objectPosition: 'center' }}
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
                    canDrag={canDrag}
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
