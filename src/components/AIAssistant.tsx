interface AIAssistantProps {
  message: string | null;
}

const AIAssistant = ({ message }: AIAssistantProps) => {
  return (
    <div className="flex items-center gap-3 pointer-events-none">
      {/* Avatar with frame effect - Sized to fit clearance gap */}
      <div className="relative flex-shrink-0">
        <div className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 xl:w-56 xl:h-56 rounded-full overflow-hidden border-4 border-amber-700/60 shadow-2xl bg-bubble ring-4 ring-amber-900/30">
          <img 
            src="/images/ai-assistant.gif" 
            alt="AIアシスタント" 
            className="w-full h-full object-cover"
          />
        </div>
        {/* Enhanced glow effect - larger */}
        <div className="absolute inset-0 rounded-full bg-amber-400/40 blur-2xl -z-10" />
      </div>
      
      {/* Speech bubble - centered vertically with avatar, constrained to safe zone */}
      {message && (
        <div className="speech-bubble-glass max-w-[140px] md:max-w-[160px] lg:max-w-[180px] xl:max-w-[200px] animate-fade-in">
          <p className="text-xs md:text-sm lg:text-base xl:text-lg font-medium leading-snug drop-shadow-md p-1">
            {message}
          </p>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
