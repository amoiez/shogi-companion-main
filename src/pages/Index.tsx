import { useEffect, useCallback, useState } from "react";
import SituationBar from "@/components/SituationBar";
import PlayerPanel from "@/components/PlayerPanel";
import ShogiBoard from "@/components/ShogiBoard";
import AIAssistant from "@/components/AIAssistant";
import ConnectionPanel from "@/components/ConnectionPanel";
import { useGameState } from "@/hooks/useGameState";
import { useMultiplayer } from "@/hooks/useMultiplayer";

// Selected source interface for tap-to-move
interface SelectedSource {
  type: 'board' | 'hand';
  row?: number;
  col?: number;
  handIndex?: number;
  piece: string;
  isOpponent: boolean;
}

const Index = () => {
  // Tap-to-move selected state (shared between board and komadai)
  const [selectedSource, setSelectedSource] = useState<SelectedSource | null>(null);
  
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
    // Don't allow moves when not connected but in multiplayer mode, or when not your turn
    if (role && !isMyTurn) {
      console.log('[Sync] Not your turn!');
      return;
    }
    
    // handleDrop now returns the calculated new state synchronously
    const nextState = handleDrop(row, col);
    
    // If no state returned, the drop was invalid
    if (!nextState) {
      console.log('[Sync] Drop cancelled or invalid');
      return;
    }
    
    console.log('[Sync] ========================================');
    console.log('[Sync] Move executed locally');
    console.log('[Sync] Next state - moveCount:', nextState.moveCount);
    console.log('[Sync] Next state - currentTurn:', nextState.currentTurn);
    console.log('[Sync] ========================================');
    
    // Send the calculated next state IMMEDIATELY (no waiting for React)
    if (connectionStatus === 'connected') {
      console.log('[Sync] Sending nextState to peer...');
      sendMove(nextState);
    }
  }, [handleDrop, connectionStatus, sendMove, role, isMyTurn]);

  // Determine which stream goes where based on role
  const opponentStream = role === 'host' ? remoteStream : (role === 'guest' ? remoteStream : null);
  const selfStream = role ? localStream : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden tatami-background">
      {/* Top Header - Situation Assessment Bar */}
      <SituationBar gotePercent={gotePercent} sentePercent={sentePercent} />
      
      {/* Connection Panel - Lobby Modal or Status Badge (handles its own positioning) */}
      <ConnectionPanel
        gameId={gameId}
        role={role}
        connectionStatus={connectionStatus}
        errorMessage={errorMessage}
        onHost={hostGame}
        onJoin={joinGame}
        onDisconnect={disconnect}
      />
      
      {/* Main Game Area - TV Broadcast 3-Column Layout */}
      <div className="flex-1 flex flex-row items-center justify-center h-full w-full gap-4 lg:gap-6 xl:gap-8 px-4 pb-16 pt-2 relative overflow-hidden">
        
        {/* Left Column - Gote/Opponent: Timer → Video → Hand (centered) */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center h-full gap-2">
          <PlayerPanel 
            label="後手" 
            time={goteTimeFormatted}
            isOpponent={true}
            hand={goteHand}
            dragSource={dragSource}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDropWithSync}
            videoStream={opponentStream}
            isMyTurn={gameCurrentTurn === 'gote'}
            canDrag={isMyTurn && role === 'guest'}
            selectedSource={selectedSource}
            onSelectSource={setSelectedSource}
            fullColumn={true}
            rotateHand={true}
          />
        </div>
        
        {/* Center Column - The Board (BIGGEST element) */}
        <div className="flex-shrink-0 flex items-center justify-center h-full">
          <ShogiBoard 
            board={board}
            dragSource={dragSource}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDropWithSync}
            isMyTurn={isMyTurn}
            isGotePlayer={role === 'guest'}
            selectedSource={selectedSource}
            onSelectSource={setSelectedSource}
          />
        </div>
        
        {/* Right Column - Sente/Me: Timer → Video → Hand (centered) */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center h-full gap-2">
          <PlayerPanel 
            label="先手" 
            time={senteTimeFormatted}
            isOpponent={false}
            hand={senteHand}
            dragSource={dragSource}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDropWithSync}
            videoStream={selfStream}
            isMyTurn={gameCurrentTurn === 'sente'}
            canDrag={isMyTurn && role !== 'guest'}
            selectedSource={selectedSource}
            onSelectSource={setSelectedSource}
            fullColumn={true}
          />
        </div>
        
        {/* AI Assistant Overlay */}
        <AIAssistant message={aiMessage} />
      </div>
    </div>
  );
};

export default Index;
