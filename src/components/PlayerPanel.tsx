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
// CRITICAL: Kings ('王' and '玉') do NOT demote - they remain as-is if captured
const HAND_PIECE_IMAGE_MAP: Record<string, { sente: string; gote: string }> = {
  '歩': { sente: 'sente_pawn.png', gote: 'gote_pawn.png' },
  '香': { sente: 'sente_lance.png', gote: 'gote_lance.png' },
  '桂': { sente: 'sente_knight.png', gote: 'gote_knight.png' },
  '銀': { sente: 'sente_silver.png', gote: 'gote_silver.png' },
  '金': { sente: 'sente_gold.png', gote: 'gote_gold.png' },
  '角': { sente: 'sente_bishop.png', gote: 'gote_bishop.png' },
  '飛': { sente: 'sente_rook.png', gote: 'gote_rook.png' },
  // King pieces (rare to capture, but must be rendered correctly)
  '王': { sente: 'sente_king.png', gote: 'gote_king.png' },
  '玉': { sente: 'sente_king_jewel.png', gote: 'gote_king_jewel.png' },
};

// Normalize captured King character based on which player captured it
// Sente's hand (isOpponent=false) displays captured King as '玉' (captured Gote's King)
// Gote's hand (isOpponent=true) displays captured King as '王' (captured Sente's King)
const normalizeKingPiece = (piece: string, isOpponent: boolean): string => {
  // If piece is any King variant, normalize it
  if (piece === '王' || piece === '玉') {
    return isOpponent ? '王' : '玉'; // Gote's hand → '王', Sente's hand → '玉'
  }
  return piece; // All other pieces remain unchanged
};

// Get hand piece image path
const getHandPieceImagePath = (piece: string, isOpponent: boolean): string | null => {
  // Normalize King character based on capturing player
  const normalizedPiece = normalizeKingPiece(piece, isOpponent);
  const mapping = HAND_PIECE_IMAGE_MAP[normalizedPiece];
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
  localStream?: MediaStream | null;  // Used to detect local camera for mirroring
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

  // Normalize King character for display (Sente's hand → '王', Gote's hand → '玉')
  const displayPiece = normalizeKingPiece(piece, isOpponent);

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
        relative flex items-center justify-center
        ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default opacity-70'}
        ${isSelected ? 'ring-2 ring-yellow-500 rounded-md shadow-lg' : ''}
        transition-all duration-150
      `}
      style={{
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        maxHeight: '100%',
      }}
      onPointerDown={canDrag ? handlePointerDown : undefined}
      onClick={onPieceClick}
    >
      {imagePath ? (
        <img 
          src={imagePath} 
          alt={displayPiece}
          className="w-full h-full object-contain drop-shadow-md"
          style={{
            width: '88%',
            height: '88%',
            objectFit: 'contain',
            transform: isOpponent ? 'rotate(180deg)' : 'rotate(0deg)',
            transformOrigin: 'center center',
          }}
          draggable={false}
        />
      ) : (
        /* Fallback to text rendering with normalized King character */
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
            {displayPiece}
          </span>
        </div>
      )}
      {/* Count badge for grouped pieces - CONTAINED within cell boundaries */}
      {count && count > 1 && (
        <div className="absolute bottom-0.5 right-0.5 bg-red-600 text-white text-xs lg:text-sm font-bold rounded-full w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center shadow-lg z-20 border border-white">
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
  localStream,
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
      console.log('[PlayerPanel] This is:', isOpponent ? 'REMOTE stream' : 'LOCAL stream');
      
      // CRITICAL FIX: Always mute local stream (prevent echo)
      // Remote stream should never be muted (to hear opponent)
      const shouldMute = !isOpponent; // true for local, false for remote
      videoElement.muted = shouldMute;
      console.log('[PlayerPanel] Video muted:', shouldMute);
      
      // Set the stream
      videoElement.srcObject = videoStream;
      
      // CRITICAL iPad Safari FIX: Explicit load() call after setting srcObject
      videoElement.load();
      
      // Track video dimensions for debugging
      const checkDimensions = () => {
        console.log('[PlayerPanel] Video dimensions - width:', videoElement.videoWidth, 'height:', videoElement.videoHeight);
        if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
          console.error('[PlayerPanel] ❌ VIDEO HAS NO DIMENSIONS!');
        } else {
          console.log('[PlayerPanel] ✅ Video has valid dimensions');
        }
      };
      
      videoElement.addEventListener('loadedmetadata', checkDimensions);
      
      // Explicitly play to ensure audio works (autoPlay can be blocked)
      const playPromise = videoElement.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[PlayerPanel] ✅ Video/audio playback started successfully, isOpponent:', isOpponent);
            checkDimensions();
          })
          .catch((error) => {
            console.error('[PlayerPanel] ❌ Failed to start video/audio playback:', error);
            // On mobile/iPad, playback might require user interaction
            // Try again on next user interaction
            const handleInteraction = () => {
              videoElement.play()
                .then(() => {
                  console.log('[PlayerPanel] ✅ Video/audio started after user interaction');
                  checkDimensions();
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
      <div className="flex flex-col items-center w-[264px] lg:w-[316px] xl:w-[352px]" style={{ gap: 'clamp(8px, 1.5vh, 16px)' }}>
        {/* Timer with wooden clock frame - transparent white background blend */}
        <div className="flex flex-col items-center gap-2">
          <div 
            className="relative rounded-xl transition-all duration-300 w-40 h-20 lg:w-48 lg:h-24 xl:w-56 xl:h-28 flex items-center justify-center"
            style={{
              backgroundImage: 'url(/images/game-clock.png)',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              mixBlendMode: 'multiply', // Makes white background transparent
              isolation: 'isolate', // Prevents blend mode from affecting children
              WebkitBackfaceVisibility: 'hidden', // Fix for iPad Safari
              backfaceVisibility: 'hidden',
              transform: 'translate3d(0, 0, 0)', // Force GPU acceleration for iOS
              WebkitTransform: 'translate3d(0, 0, 0)',
            }}
          >
            {/* Centered digital timer with professional segmented display font */}
            <span 
              className="shogi-timer font-black tracking-wider"
              translate="no"
              lang="en"
              data-no-translate="true"
              style={{ 
                fontFamily: 'Orbitron, monospace',
                fontSize: 'clamp(1.35rem, 2vw, 2.25rem)',
                color: '#323232',
                letterSpacing: '0.05em',
                lineHeight: '1',
                padding: '0 8px',
                mixBlendMode: 'normal',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                // ANTI-JITTER: Fixed-width typography
                fontVariantNumeric: 'tabular-nums',
                fontFeatureSettings: '"tnum"',
                WebkitFontSmoothing: 'antialiased',
                // ANTI-JITTER: Fixed container width
                width: '5.5em', // Exact width for "88:88" in this font
                display: 'inline-block',
                textAlign: 'center',
              }}
            >
              {time}
            </span>
          </div>
        </div>
        
        {/* Video/Avatar - UNIFIED SIZE for balanced player illustrations */}
        <div 
          className={`
            rounded-2xl 
            border-4 lg:border-6 border-amber-700/40
            shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.25)]
            overflow-hidden
            flex items-center justify-center
          `}
          style={{
            width: 'clamp(200px, 22vw, 280px)',
            maxHeight: 'clamp(200px, 28vh, 280px)',
            aspectRatio: '1 / 1',
            transform: 'translateY(0px)',
            backgroundColor: '#e5e7eb',
          }}
        >
          {videoStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              webkit-playsinline="true"
              muted={!isOpponent}
              className="w-full h-full object-contain"
              style={{ 
                objectPosition: 'center',
                // CRITICAL FIX: Mirror ONLY local camera by comparing MediaStream identity
                // Never mirror remote camera - opponent sees me unmirrored
                transform: (videoStream === localStream) ? 'scaleX(-1)' : 'none',
              }}
            />
          ) : (
            <img 
              src={isOpponent ? '/images/elderly-man.png' : '/images/nakano-san.png'}
              alt={isOpponent ? '対戦相手' : '中野さん'}
              className="w-full h-full object-contain"
              style={{ 
                objectPosition: 'center center'
              }}
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
        
        {/* Captured Pieces (Hand/Komadai) - 4 columns, dynamic vertical expansion */}
        <div className="w-full flex flex-col items-center">
          <div 
            className="
              p-3 lg:p-4 rounded-xl
              komadai-wood
              border-3 border-amber-800/50
              shadow-xl
            "
            style={{
              width: 'fit-content',
              height: 'fit-content',
              padding: '4px',
              marginLeft: '10px',
              marginRight: '10px',
              overflow: 'visible',
            }}
          >
            {/* Fixed 2×4 grid: 2 rows × 4 columns layout */}
            {/* Grid dimensions controlled by CSS using --koma-size variable */}
            <div 
              className="grid w-full"
            >
              {/* Render grouped pieces sequentially from top-left */}
              {groupedHandArray.map((group) => {
                const isThisSelected = selectedSource?.type === 'hand' && 
                  selectedSource?.piece === group.piece && 
                  selectedSource?.isOpponent === isOpponent;
                
                return (
                  <div key={`${group.piece}-${group.index}`} className="relative w-full" style={{ aspectRatio: '1/1' }}>
                    <HandPiece
                      piece={group.piece}
                      index={group.index}
                      isOpponent={isOpponent}
                      dragSource={dragSource}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                      canDrag={canDrag}
                      isSelected={isThisSelected}
                      onPieceClick={() => handleHandPieceClick(group.piece, group.index)}
                      count={group.count}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Hand-only mode: 2×4 fixed grid komadai
  if (handOnly) {
    return (
      <div className="w-full max-w-[335px] lg:max-w-[400px]">
        <div 
          className="
            p-3 rounded-lg
            komadai-wood
            border-2 border-amber-800/40
            shadow-lg
          "
          style={{
            width: 'fit-content',
            height: 'fit-content',
            padding: '8px',
            marginLeft: '10px',
            marginRight: '10px',
            overflow: 'visible',
          }}
        >
          {/* Fixed 2×4 grid: 2 rows × 4 columns layout */}
          {/* Grid dimensions controlled by CSS using --koma-size variable */}
          <div 
            className="grid w-full"
          >
            {/* Render grouped pieces sequentially from top-left */}
            {groupedHandArray.map((group) => {
              const isThisSelected = selectedSource?.type === 'hand' && 
                selectedSource?.piece === group.piece && 
                selectedSource?.isOpponent === isOpponent;
              
              return (
                <div key={`${group.piece}-${group.index}`} className="relative w-full" style={{ aspectRatio: '1/1' }}>
                  <HandPiece
                    piece={group.piece}
                    index={group.index}
                    isOpponent={isOpponent}
                    dragSource={dragSource}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    canDrag={canDrag}
                    isSelected={isThisSelected}
                    onPieceClick={() => handleHandPieceClick(group.piece, group.index)}
                    count={group.count}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Video-only mode: just show timer and video
  if (videoOnly) {
    return (
      <div className="flex flex-col items-center gap-4">
        {/* Digital clock display with wooden frame - transparent white background blend */}
        <div 
          className="relative rounded-xl transition-all duration-300 w-40 h-20 flex items-center justify-center"
          style={{
            backgroundImage: 'url(/images/game-clock.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            mixBlendMode: 'multiply', // Makes white background transparent
            isolation: 'isolate', // Prevents blend mode from affecting children
            WebkitBackfaceVisibility: 'hidden', // Fix for iPad Safari
            backfaceVisibility: 'hidden',
            transform: 'translate3d(0, 0, 0)', // Force GPU acceleration for iOS
            WebkitTransform: 'translate3d(0, 0, 0)',
          }}
        >
          {/* Centered digital timer with professional segmented display font */}
          <span 
            className="shogi-timer font-black tracking-wider"
            translate="no"
            lang="en"
            data-no-translate="true"
            style={{ 
              fontFamily: 'Orbitron, monospace',
              fontSize: '1.35rem',
              color: '#323232',
              letterSpacing: '0.05em',
              lineHeight: '1',
              padding: '0 8px',
              mixBlendMode: 'normal',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              // ANTI-JITTER: Fixed-width typography (was missing!)
              fontVariantNumeric: 'tabular-nums',
              fontFeatureSettings: '"tnum"',
              WebkitFontSmoothing: 'antialiased',
              // ANTI-JITTER: Fixed container width (was missing!)
              width: '80px', // Fixed width for "88:88" at 1.35rem
              display: 'inline-block',
              textAlign: 'center',
            }}
          >
            {time}
          </span>
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
              webkit-playsinline="true"
              muted={!isOpponent}
              className="w-full h-full object-cover"
              style={{ 
                objectPosition: 'center',
                // CRITICAL FIX: Mirror ONLY local camera by comparing MediaStream identity
                // Never mirror remote camera - opponent sees me unmirrored
                transform: (videoStream === localStream) ? 'scaleX(-1)' : 'none',
              }}
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
      {/* Digital clock display with transparent white background blend */}
      <div 
        className="relative rounded-xl transition-all duration-300 w-40 h-20 flex items-center justify-center"
        style={{
          backgroundImage: 'url(/images/game-clock.png)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          mixBlendMode: 'multiply', // Makes white background transparent
          isolation: 'isolate', // Prevents blend mode from affecting children
          WebkitBackfaceVisibility: 'hidden', // Fix for iPad Safari
          backfaceVisibility: 'hidden',
          transform: 'translate3d(0, 0, 0)', // Force GPU acceleration for iOS
          WebkitTransform: 'translate3d(0, 0, 0)',
        }}
      >
        {/* Centered digital timer with professional segmented display font */}
        <span 
          className="shogi-timer font-black tracking-wider"
          translate="no"
          lang="en"
          data-no-translate="true"
          style={{ 
            fontFamily: 'Orbitron, monospace',
            fontSize: '1.35rem',
            color: '#323232',
            letterSpacing: '0.05em',
            lineHeight: '1',
            padding: '0 8px',
            mixBlendMode: 'normal',
            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            // ANTI-JITTER: Fixed-width typography and locked container
            fontVariantNumeric: 'tabular-nums',
            fontFeatureSettings: '"tnum"',
            WebkitFontSmoothing: 'antialiased',
            width: '80px', // Fixed width for "88:88" format (consistent with others)
            display: 'inline-block',
            textAlign: 'center',
          }}
        >
          {time}
        </span>
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
            webkit-playsinline="true"
            muted={!isOpponent}
            className="w-full h-full object-cover"
            style={{ 
              objectPosition: 'center',
              // CRITICAL FIX: Mirror ONLY local camera by comparing MediaStream identity
              // Never mirror remote camera - opponent sees me unmirrored
              transform: (videoStream === localStream) ? 'scaleX(-1)' : 'none',
            }}
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

      {/* Komadai (Piece Stand) - Fixed 2×4 grid */}
      <div className="w-full max-w-[335px] lg:max-w-[400px]">
        <div 
          className="
            p-3 rounded-lg
            komadai-wood
            border-2 border-amber-800/40
            shadow-lg
          "
          style={{
            width: 'fit-content',
            height: 'fit-content',
            padding: '4px',
            marginLeft: '10px',
            marginRight: '10px',
            overflow: 'visible',
          }}
        >
          {/* Fixed 2×4 grid: 2 rows × 4 columns layout */}
          {/* Grid dimensions controlled by CSS using --koma-size variable */}
          <div 
            className="grid w-full"
          >
            {/* Render grouped pieces sequentially from top-left */}
            {groupedHandArray.map((group) => {
              const isThisSelected = selectedSource?.type === 'hand' && 
                selectedSource?.piece === group.piece && 
                selectedSource?.isOpponent === isOpponent;
              
              return (
                <div key={`${group.piece}-${group.index}`} className="relative w-full" style={{ aspectRatio: '1/1' }}>
                  <HandPiece
                    piece={group.piece}
                    index={group.index}
                    isOpponent={isOpponent}
                    dragSource={dragSource}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    canDrag={canDrag}
                    isSelected={isThisSelected}
                    onPieceClick={() => handleHandPieceClick(group.piece, group.index)}
                    count={group.count}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerPanel;
