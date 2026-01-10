import aiAvatar from "@/assets/ai-assistant-avatar.png";

interface AIAssistantProps {
  message: string | null;
}

const AIAssistant = ({ message }: AIAssistantProps) => {
  return (
    <div className="absolute bottom-4 left-4 flex items-end gap-2 z-20">
      {/* Avatar with frame effect */}
      <div className="relative">
        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-amber-700/60 shadow-2xl bg-bubble ring-2 ring-amber-900/30">
          <img 
            src={aiAvatar} 
            alt="AIアシスタント" 
            className="w-full h-full object-cover"
          />
        </div>
        {/* Enhanced glow effect */}
        <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-2xl -z-10" />
      </div>
      
      {/* Speech bubble with glassmorphism - only show when message is present */}
      {message && (
        <div className="speech-bubble-glass max-w-xs md:max-w-sm lg:max-w-md animate-fade-in">
          <p className="text-xl md:text-2xl font-medium leading-relaxed drop-shadow-sm">
            {message}
          </p>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
