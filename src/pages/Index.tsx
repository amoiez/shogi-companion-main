import { useEffect, useCallback } from "react";
import SituationBar from "@/components/SituationBar";
import PlayerPanel from "@/components/PlayerPanel";
import ShogiBoard from "@/components/ShogiBoard";
import AIAssistant from "@/components/AIAssistant";
import ConnectionPanel from "@/components/ConnectionPanel";
import { useGameState } from "@/hooks/useGameState";
import { useMultiplayer } from "@/hooks/useMultiplayer";

const Index = () => {
  const {
    board,
    senteHand,
    goteHand,
    moveCount,
    aiMessage,
    sentePercent,
    gotePercent,
    dragSource,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    setGameState,
    getGameState,
    senteTime,
    goteTime,
    senteTimeFormatted,
    goteTimeFormatted,
    currentTurn: gameCurrentTurn,
  } = useGameState();

  const {
    gameId,
    role,
    connectionStatus,
    errorMessage,
    hostGame,
    joinGame,
    disconnect,
    sendMove,
    onReceiveState,
    localStream,
    remoteStream,
    isMyTurn,
    currentTurn,
  } = useMultiplayer();

  // Register callback for receiving game state updates
  useEffect(() => {
    onReceiveState((state) => {
      setGameState({
        board: state.board,
        senteHand: state.senteHand,
        goteHand: state.goteHand,
        moveCount: state.moveCount,
        senteTime: state.senteTime,
        goteTime: state.goteTime,
        currentTurn: state.currentTurn,
      });
    });
  }, [onReceiveState, setGameState]);

  // Wrap handleDrop to also send move to peer
  const handleDropWithSync = useCallback((row: number, col: number) => {
    handleDrop(row, col);
    
    // After the drop, send the new state to peer
    // We need to get the state after the update, so use a timeout
    setTimeout(() => {
      if (connectionStatus === 'connected') {
        const state = getGameState();
        sendMove({
          board: state.board,
          senteHand: state.senteHand,
          goteHand: state.goteHand,
          moveCount: state.moveCount,
          senteTime: state.senteTime,
          goteTime: state.goteTime,
          currentTurn: state.currentTurn === 'sente' ? 'gote' : 'sente', // Toggle turn
        });
      }
    }, 50);
  }, [handleDrop, connectionStatus, getGameState, sendMove]);

  // Determine which stream goes where based on role
  const opponentStream = role === 'host' ? remoteStream : (role === 'guest' ? remoteStream : null);
  const selfStream = role ? localStream : null;

  return (
    <div className="min-h-screen flex flex-col overflow-hidden tatami-background">
      {/* Top Header - Situation Assessment Bar */}
      <SituationBar gotePercent={gotePercent} sentePercent={sentePercent} />
      
      {/* Connection Panel - Fixed top-right */}
      <div className="fixed top-32 right-8 z-50">
        <ConnectionPanel
          gameId={gameId}
          role={role}
          connectionStatus={connectionStatus}
          errorMessage={errorMessage}
          onHost={hostGame}
          onJoin={joinGame}
          onDisconnect={disconnect}
        />
      </div>
      
      {/* Main Game Area - 3 Column Layout */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 relative">
        <div className="flex items-stretch justify-center gap-6 md:gap-10 lg:gap-16 w-full max-w-7xl">
          
          {/* Left Column - Opponent (Gote/後手) */}
          <div className="flex-shrink-0">
            <PlayerPanel 
              label="残り" 
              time={goteTimeFormatted}
              isOpponent={true}
              hand={goteHand}
              dragSource={dragSource}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={handleDropWithSync}
              videoStream={opponentStream}
              isMyTurn={gameCurrentTurn === 'gote'}
              canDrag={false}
            />
          </div>
          
          {/* Center Column - Shogi Board */}
          <div className="flex-shrink-0">
            <ShogiBoard 
              board={board}
              dragSource={dragSource}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={handleDropWithSync}
              isMyTurn={isMyTurn}
            />
          </div>
          
          {/* Right Column - Player (Sente/先手) */}
          <div className="flex-shrink-0">
            <PlayerPanel 
              label="残り" 
              time={senteTimeFormatted}
              isOpponent={false}
              hand={senteHand}
              dragSource={dragSource}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={handleDropWithSync}
              videoStream={selfStream}
              isMyTurn={gameCurrentTurn === 'sente'}
              canDrag={isMyTurn}
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
