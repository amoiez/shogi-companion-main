interface SituationBarProps {
  gotePercent: number;
  sentePercent: number;
  isFlipped?: boolean; // When Gote's turn, flip the labels
  onDownloadClick?: () => void;
  onBgmToggle?: () => void;
  isBgmPlaying?: boolean;
}

const SituationBar = ({ gotePercent, sentePercent, isFlipped = false, onDownloadClick, onBgmToggle, isBgmPlaying }: SituationBarProps) => {
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
    <div className="w-full px-4 py-2 glassmorphism border-b border-white/20 relative" style={{ padding: 'clamp(6px, 1vh, 12px) 16px' }}>
      {/* Control Buttons - Right aligned inside header */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-2 z-30">
        {onDownloadClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onDownloadClick(); }}
            className="p-2 rounded-full bg-amber-800/80 text-white hover:bg-amber-700 transition-colors"
            title="棋譜をダウンロード"
          >
            📥
          </button>
        )}
        {onBgmToggle && (
          <button
            onClick={(e) => { e.stopPropagation(); onBgmToggle(); }}
            className="p-2 rounded-full bg-amber-800/80 text-white hover:bg-amber-700 transition-colors"
            title={isBgmPlaying ? 'BGMを停止' : 'BGMを再生'}
          >
            {isBgmPlaying ? '🔊' : '🔇'}
          </button>
        )}
      </div>
      
      <div className="max-w-[600px] mx-auto mb-2">
        
        <div className="w-full h-10 rounded-lg overflow-hidden flex" style={{ height: 'clamp(32px, 4vh, 40px)' }}>
        {/* Left side - seamless join with right */}
        <div 
          className={`h-full ${leftBg} flex items-center justify-start pl-4 transition-all duration-500`}
          style={{ width: `${leftPercent}%` }}
        >
          <span className={`percentage-text text-xl font-black ${leftTextClass} drop-shadow-sm whitespace-nowrap`} style={{ fontSize: 'clamp(18px, 2.5vmin, 26px)', fontWeight: 900 }}>
            {leftPercent}%
          </span>
        </div>
        
        {/* Right side - seamless join with left */}
        <div 
          className={`h-full ${rightBg} flex items-center justify-end pr-4 transition-all duration-500`}
          style={{ width: `${rightPercent}%` }}
        >
          <span className={`percentage-text text-xl font-black ${rightTextClass} drop-shadow-sm whitespace-nowrap`} style={{ fontSize: 'clamp(18px, 2.5vmin, 26px)', fontWeight: 900 }}>
            {rightPercent}%
          </span>
        </div>
      </div>
      </div>
    </div>
  );
};

export default SituationBar;
