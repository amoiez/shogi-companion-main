interface SituationBarProps {
  gotePercent: number;
  sentePercent: number;
}

const SituationBar = ({ gotePercent, sentePercent }: SituationBarProps) => {
  return (
    <div className="w-full px-6 py-3 glassmorphism border-b border-white/20">
      <h2 className="text-center shogi-title mb-3 text-foreground drop-shadow-sm">形勢判断</h2>
      
      <div className="relative w-full h-10 rounded-lg overflow-hidden flex shadow-inner ring-1 ring-black/10">
        {/* Gote (後手) - Left side - Red */}
        <div 
          className="h-full bg-progress-gote flex items-center justify-start pl-4 transition-all duration-500"
          style={{ width: `${gotePercent}%` }}
        >
          <span className="text-lg font-bold text-secondary-foreground drop-shadow-sm">
            後手 {gotePercent}%
          </span>
        </div>
        
        {/* Center divider */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-foreground/20 z-10" />
        
        {/* Sente (先手) - Right side - Blue */}
        <div 
          className="h-full bg-progress-sente flex items-center justify-end pr-4 transition-all duration-500"
          style={{ width: `${sentePercent}%` }}
        >
          <span className="text-lg font-bold text-primary-foreground drop-shadow-sm">
            先手 {sentePercent}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default SituationBar;
