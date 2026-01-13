interface AIAssistantProps {
  message: string | null;
}

const AIAssistant = ({ message }: AIAssistantProps) => {
  return (
    <div className="absolute bottom-4 left-[12%] lg:left-[15%] flex items-center gap-3 z-20">
      {/* Avatar with frame effect - LARGE size */}
      <div className="relative flex-shrink-0">
        <div className="w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 rounded-full overflow-hidden border-4 border-amber-700/60 shadow-2xl bg-bubble ring-2 ring-amber-900/30">
          <img 
            src="/ai-assistant.png" 
            alt="AIアシスタント" 
            className="w-full h-full object-cover"
          />
        </div>
        {/* Enhanced glow effect */}
        <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-xl -z-10" />
      </div>
      
      {/* Speech bubble with glassmorphism - centered next to face */}
      {message && (
        <div className="speech-bubble-glass max-w-[160px] md:max-w-[200px] lg:max-w-[220px] animate-fade-in">
          <p className="text-sm md:text-base font-medium leading-snug drop-shadow-sm">
            {message}
          </p>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
