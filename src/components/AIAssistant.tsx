interface AIAssistantProps {
  message: string | null;
}

const AIAssistant = ({ message }: AIAssistantProps) => {
  return (
    <div className="absolute bottom-8 left-4 lg:left-6 xl:left-8 flex items-end gap-4 z-20 pointer-events-none">
      {/* Avatar with frame effect - SIGNIFICANTLY LARGER for iPad Pro */}
      <div className="relative flex-shrink-0">
        <div className="w-40 h-40 md:w-52 md:h-52 lg:w-64 lg:h-64 xl:w-72 xl:h-72 rounded-full overflow-hidden border-6 border-amber-700/60 shadow-2xl bg-bubble ring-4 ring-amber-900/30">
          <img 
            src="/images/ai-assistant.gif" 
            alt="AIアシスタント" 
            className="w-full h-full object-cover"
          />
        </div>
        {/* Enhanced glow effect - larger */}
        <div className="absolute inset-0 rounded-full bg-amber-400/40 blur-2xl -z-10" />
      </div>
      
      {/* Speech bubble with glassmorphism - LARGER and positioned to not overlap board */}
      {message && (
        <div className="speech-bubble-glass max-w-[200px] md:max-w-[260px] lg:max-w-[320px] xl:max-w-[380px] animate-fade-in mb-8 lg:mb-12">
          <p className="text-sm md:text-base lg:text-lg xl:text-xl font-medium leading-snug drop-shadow-md p-1">
            {message}
          </p>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
