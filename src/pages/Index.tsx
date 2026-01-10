import SituationBar from "@/components/SituationBar";
import PlayerPanel from "@/components/PlayerPanel";
import ShogiBoard from "@/components/ShogiBoard";
import AIAssistant from "@/components/AIAssistant";
import { useGameState } from "@/hooks/useGameState";

const Index = () => {
  const {
    board,
    senteHand,
    goteHand,
    aiMessage,
    sentePercent,
    gotePercent,
    dragSource,
    handleDragStart,
    handleDragEnd,
    handleDrop,
  } = useGameState();

  return (
    <div className="min-h-screen flex flex-col overflow-hidden tatami-background">
      {/* Top Header - Situation Assessment Bar */}
      <SituationBar gotePercent={gotePercent} sentePercent={sentePercent} />
      
      {/* Main Game Area - 3 Column Layout */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 relative">
        <div className="flex items-stretch justify-center gap-6 md:gap-10 lg:gap-16 w-full max-w-7xl">
          
          {/* Left Column - Opponent (Gote/後手) */}
          <div className="flex-shrink-0">
            <PlayerPanel 
              label="残り" 
              time="09:37" 
              isOpponent={true}
              hand={goteHand}
              dragSource={dragSource}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
            />
          </div>
          
          {/* Center Column - Shogi Board */}
          <div className="flex-shrink-0">
            <ShogiBoard 
              board={board}
              dragSource={dragSource}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
            />
          </div>
          
          {/* Right Column - Player (Sente/先手) */}
          <div className="flex-shrink-0">
            <PlayerPanel 
              label="残り" 
              time="09:35" 
              isOpponent={false}
              hand={senteHand}
              dragSource={dragSource}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
            />
          </div>
        </div>
        
        {/* AI Assistant Overlay */}
        <AIAssistant message={aiMessage} />
      </div>
      
      {/* Bottom description text */}
      <div className="text-center pb-4 px-6">
        <p className="text-muted-foreground text-lg">
          相手と会話を楽しみながら将棋を指せます。AIコンパニオンが応援してくれる言葉を投げかけてくれます。
        </p>
      </div>
    </div>
  );
};

export default Index;
