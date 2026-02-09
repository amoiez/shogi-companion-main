import { useRef, useEffect, useState } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SafeZone {
  id: string;
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
  priority: number;
}

interface AIAssistantProps {
  message: string | null;
  safeZones?: SafeZone[];
}

// ============================================================================
// CONSTANTS - Optimized for iPad Pro (2732 × 2048 px)
// REFACTORED: Single-line horizontal speech bubble with dynamic width expansion
// REPOSITIONED: Shifted left to prevent collision with widened right komadai
// ============================================================================

const ASSISTANT_SIZE = { min: 96, max: 176, vw: 9.6 }; // Reduced ~15% to prevent overlap with captured pieces
const BUBBLE_MAX_WIDTH = 495; // Maximum single-line width (kept unchanged)
const BUBBLE_MIN_WIDTH = 200; // Minimum width for very short messages
const BUBBLE_TAIL_SIZE = 16; // Proportionally scaled with avatar
const BUBBLE_GAP = 16; // Gap between bubble and avatar

// ============================================================================
// HORIZONTAL SPEECH BUBBLE COMPONENT
// Bubble originates from AI assistant's mouth and extends horizontally toward the board
// ============================================================================

const AIAssistant = ({ message, safeZones = [] }: AIAssistantProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Fade in animation trigger
  useEffect(() => {
    if (message) {
      setIsVisible(false);
      const timeoutId = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timeoutId);
    } else {
      setIsVisible(false);
    }
  }, [message]);
  
  // Debug: Log when component mounts to verify it renders
  useEffect(() => {
    console.log('[AI Assistant] Component mounted and visible');
  }, []);
  
  return (
    <div 
      ref={containerRef}
      className="pointer-events-none"
      style={{ 
        position: 'relative',
        width: 'fit-content',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        transform: 'translate(-260px, 0)',
        marginTop: 'clamp(-70px, -5vh, -30px)', // Move UP more (more negative margin for 9.7" iPad)
        minWidth: '120px',
        minHeight: '120px',
      }}
    >
      {/* AI Assistant Avatar - Anchored to bottom with cropped lower portion */}
      {/* Avatar container is position:relative to anchor the speech bubble */}
      <div 
        className="flex-shrink-0"
        style={{
          position: 'relative', // CRITICAL: Anchor point for the speech bubble
          // Larger responsive sizing for iPad Pro
          width: `clamp(${ASSISTANT_SIZE.min}px, ${ASSISTANT_SIZE.vw}vw, ${ASSISTANT_SIZE.max}px)`,
          height: `clamp(${ASSISTANT_SIZE.min}px, ${ASSISTANT_SIZE.vw}vw, ${ASSISTANT_SIZE.max}px)`,
        }}
      >
        <div className="w-full h-full rounded-full overflow-hidden border-4 border-amber-700/60 shadow-2xl bg-bubble ring-4 ring-amber-900/30">
          <img 
            src="/images/ai-assistant.gif" 
            alt="AIアシスタント" 
            className="w-full h-full object-cover"
            style={{ 
              objectPosition: 'center bottom', // Crop from bottom
              objectFit: 'cover',
            }}
          />
        </div>
        {/* Ambient glow effect */}
        <div className="absolute inset-0 rounded-full bg-amber-400/40 blur-2xl -z-10" />
        
        {/* Speech Bubble - ANCHORED TO AVATAR CONTAINER */}
        {/* Position absolute relative to the avatar, not the outer container */}
        {message && (
          <div 
            style={{
              position: 'absolute',
              left: '100%', // Starts from right edge of avatar
              top: '45%', // Positioned near the AI's mouth area
              transform: 'translateY(-50%)',
              marginLeft: `${BUBBLE_GAP}px`,
              width: 'auto', // Dynamic: expands horizontally with single-line text
              minWidth: `${BUBBLE_MIN_WIDTH}px`,
              maxWidth: `${BUBBLE_MAX_WIDTH}px`,
              // Fade in transition
              opacity: isVisible ? 1 : 0,
              transition: 'opacity 0.3s ease-out',
              zIndex: 10, // Ensure bubble is above other elements
            }}
          >
          {/* Bubble Container with Glassmorphism Effect - SINGLE-LINE */}
          <div 
            className="relative rounded-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.7)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
              padding: '16px 24px', // Reduced vertical padding for single-line
            }}
          >
            {/* Side-Pointing Tail - Points Left Toward AI's Mouth - LARGER */}
            <div 
              style={{
                position: 'absolute',
                left: `-${BUBBLE_TAIL_SIZE}px`,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                // CSS triangle pointing left toward the AI
                borderTop: `${BUBBLE_TAIL_SIZE}px solid transparent`,
                borderBottom: `${BUBBLE_TAIL_SIZE}px solid transparent`,
                borderRight: `${BUBBLE_TAIL_SIZE}px solid rgba(255, 255, 255, 0.92)`,
              }}
            />
            {/* Shadow layer for tail depth effect */}
            <div 
              style={{
                position: 'absolute',
                left: `-${BUBBLE_TAIL_SIZE + 3}px`,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: `${BUBBLE_TAIL_SIZE + 3}px solid transparent`,
                borderBottom: `${BUBBLE_TAIL_SIZE + 3}px solid transparent`,
                borderRight: `${BUBBLE_TAIL_SIZE + 3}px solid rgba(0, 0, 0, 0.06)`,
                zIndex: -1,
              }}
            />
            
            {/* Text Content - SINGLE-LINE with no wrapping */}
            <p 
              className="font-medium leading-relaxed text-gray-800"
              style={{
                // Responsive font size for iPad Pro single-line bubble
                fontSize: 'clamp(16px, 1.4vw, 20px)',
                textAlign: 'left',
                margin: 0,
                // Force single line - bubble expands horizontally instead of wrapping
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis', // Truncate with ... if exceeding max-width
              }}
            >
              {message}
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AIAssistant;
