interface AIAssistantProps {
  message: string | null;
}

const AIAssistant = ({ message }: AIAssistantProps) => {
  return (
    <div className="absolute bottom-6 left-[8%] md:left-[10%] lg:left-[12%] flex items-center gap-2 z-20 mr-10">
      {/* Avatar with frame effect - prominent size */}
      <div className="relative flex-shrink-0">
        <div className="w-28 h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-amber-700/60 shadow-2xl bg-bubble ring-2 ring-amber-900/30">
          <img 
            src="/ai-assistant.png" 
            alt="AIアシスタント" 
            className="w-full h-full object-cover"
          />
        </div>
        {/* Enhanced glow effect */}
        <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-xl -z-10" />
      </div>
      
      {/* Speech bubble with glassmorphism - vertically centered with face */}
      {message && (
        <div className="speech-bubble-glass max-w-[150px] md:max-w-[180px] lg:max-w-[200px] animate-fade-in">
          <p className="text-xs md:text-sm lg:text-base font-medium leading-snug drop-shadow-sm">
            {message}
          </p>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
