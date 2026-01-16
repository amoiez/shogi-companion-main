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
// ============================================================================

const ASSISTANT_SIZE = { min: 120, max: 200, vw: 14 };
const BUBBLE_MAX_WIDTH = 300;
const BUBBLE_MIN_WIDTH = 180;
const BUBBLE_TAIL_SIZE = 14;
const BUBBLE_GAP = 14; // Gap between bubble and avatar

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
  
  return (
    <div 
      ref={containerRef}
      className="pointer-events-none"
      style={{ 
        position: 'relative',
        width: 'fit-content',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {/* AI Assistant Avatar with Frame Effect */}
      <div 
        className="relative flex-shrink-0"
        style={{
          // Responsive sizing that works in both landscape and portrait
          width: `clamp(${ASSISTANT_SIZE.min}px, ${ASSISTANT_SIZE.vw}vw, ${ASSISTANT_SIZE.max}px)`,
          height: `clamp(${ASSISTANT_SIZE.min}px, ${ASSISTANT_SIZE.vw}vw, ${ASSISTANT_SIZE.max}px)`,
        }}
      >
        <div className="w-full h-full rounded-full overflow-hidden border-4 border-amber-700/60 shadow-2xl bg-bubble ring-4 ring-amber-900/30">
          <img 
            src="/images/ai-assistant.gif" 
            alt="AIアシスタント" 
            className="w-full h-full object-contain"
          />
        </div>
        {/* Ambient glow effect */}
        <div className="absolute inset-0 rounded-full bg-amber-400/40 blur-2xl -z-10" />
      </div>

      {/* Speech Bubble - Horizontally Positioned to the Right of Avatar */}
      {message && (
        <div 
          style={{
            position: 'absolute',
            left: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            marginLeft: `${BUBBLE_GAP}px`,
            width: 'max-content',
            minWidth: `${BUBBLE_MIN_WIDTH}px`,
            // Fade in transition
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.3s ease-out',
          }}
        >
          {/* Bubble Container with Glassmorphism Effect */}
          <div 
            className="relative rounded-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.7)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
              padding: '14px 22px',
            }}
          >
            {/* Side-Pointing Tail - Points Left Toward AI's Mouth */}
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
                left: `-${BUBBLE_TAIL_SIZE + 2}px`,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: `${BUBBLE_TAIL_SIZE + 2}px solid transparent`,
                borderBottom: `${BUBBLE_TAIL_SIZE + 2}px solid transparent`,
                borderRight: `${BUBBLE_TAIL_SIZE + 2}px solid rgba(0, 0, 0, 0.06)`,
                zIndex: -1,
              }}
            />
            
            {/* Text Content - Horizontal Single Line */}
            <p 
              className="font-medium leading-relaxed text-gray-800"
              style={{
                // Responsive font size for iPad Pro
                fontSize: 'clamp(15px, 1.2vw, 18px)',
                textAlign: 'left',
                margin: 0,
                // Force single-line horizontal text - NO WRAPPING
                whiteSpace: 'nowrap',
                lineHeight: 1.6,
              }}
            >
              {message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
