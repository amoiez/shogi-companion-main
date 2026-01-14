interface AIAssistantProps {
  message: string | null;
}

const AIAssistant = ({ message }: AIAssistantProps) => {
  return (
    <div className="flex items-center gap-4 pointer-events-none max-w-[calc(20vw+200px)]">
      {/* Avatar with frame effect - Scales with viewport */}
      <div className="relative flex-shrink-0">
        <div className="w-[12vw] h-[12vw] min-w-[100px] min-h-[100px] max-w-[180px] max-h-[180px] rounded-full overflow-hidden border-4 border-amber-700/60 shadow-2xl bg-bubble ring-4 ring-amber-900/30">
          <img 
            src="/images/ai-assistant.gif" 
            alt="AIアシスタント" 
            className="w-full h-full object-contain"
          />
        </div>
        {/* Enhanced glow effect - larger */}
        <div className="absolute inset-0 rounded-full bg-amber-400/40 blur-2xl -z-10" />
      </div>
      
      {/* Speech bubble - centered vertically with avatar, 60px mandatory clearance from board */}
      {message && (
        <div className="speech-bubble-glass max-w-[180px] animate-fade-in mr-[60px]">
          <p className="text-sm lg:text-base xl:text-lg font-medium leading-snug drop-shadow-md p-1">
            {message}
          </p>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
