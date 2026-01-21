interface SituationBarProps {
  gotePercent: number;
  sentePercent: number;
  isFlipped?: boolean; // When Gote's turn, flip the labels
}

const SituationBar = ({ gotePercent, sentePercent, isFlipped = false }: SituationBarProps) => {
  // When flipped, swap the visual positions
  const leftPercent = isFlipped ? sentePercent : gotePercent;
  const rightPercent = isFlipped ? gotePercent : sentePercent;
  const leftLabel = isFlipped ? '先手' : '後手';
  const rightLabel = isFlipped ? '後手' : '先手';
  const leftBg = isFlipped ? 'bg-progress-sente' : 'bg-progress-gote';
  const rightBg = isFlipped ? 'bg-progress-gote' : 'bg-progress-sente';
  const leftTextClass = isFlipped ? 'text-primary-foreground' : 'text-secondary-foreground';
  const rightTextClass = isFlipped ? 'text-secondary-foreground' : 'text-primary-foreground';

  return (
    <div className="w-full px-4 py-2 glassmorphism border-b border-white/20" style={{ padding: 'clamp(6px, 1vh, 12px) 16px' }}>
      <div className="max-w-[600px] mx-auto mb-2">
        
        <div className="w-full h-10 rounded-lg overflow-hidden flex" style={{ height: 'clamp(32px, 4vh, 40px)' }}>
        {/* Left side - seamless join with right */}
        <div 
          className={`h-full ${leftBg} flex items-center justify-start pl-4 transition-all duration-500`}
          style={{ width: `${leftPercent}%` }}
        >
          <span className={`text-lg font-bold ${leftTextClass} drop-shadow-sm whitespace-nowrap`} style={{ fontSize: 'clamp(14px, 1.5vmin, 18px)' }}>
            {leftPercent}%
          </span>
        </div>
        
        {/* Right side - seamless join with left */}
        <div 
          className={`h-full ${rightBg} flex items-center justify-end pr-4 transition-all duration-500`}
          style={{ width: `${rightPercent}%` }}
        >
          <span className={`text-lg font-bold ${rightTextClass} drop-shadow-sm whitespace-nowrap`} style={{ fontSize: 'clamp(14px, 1.5vmin, 18px)' }}>
            {rightPercent}%
          </span>
        </div>
      </div>
      </div>
    </div>
  );
};

export default SituationBar;
