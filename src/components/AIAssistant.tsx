interface AIAssistantProps {
  message: string | null;
}

const AIAssistant = ({ message }: AIAssistantProps) => {
  return (
    <div className="flex items-center gap-4 pointer-events-none max-w-[calc(25vw+280px)] scale-[0.85] origin-bottom-left">
      {/* Avatar with frame effect - Significantly enlarged for communication */}
      <div className="relative flex-shrink-0">
        <div className="w-[16vw] h-[16vw] min-w-[140px] min-h-[140px] max-w-[240px] max-h-[240px] rounded-full overflow-hidden border-4 border-amber-700/60 shadow-2xl bg-bubble ring-4 ring-amber-900/30">
          <img 
            src="/images/ai-assistant.gif" 
            alt="AIアシスタント" 
            className="w-full h-full object-contain"
          />
        </div>
        {/* Enhanced glow effect - larger */}
        <div className="absolute inset-0 rounded-full bg-amber-400/40 blur-2xl -z-10" />
      </div>
      
      {/* Speech bubble - significantly expanded for long text */}
      {message && (
        <div className="speech-bubble-glass max-w-[280px] min-h-[80px] animate-fade-in">
          <p className="text-base lg:text-lg xl:text-xl font-medium leading-relaxed drop-shadow-md p-2">
            {message}
          </p>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
