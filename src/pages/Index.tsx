import { useEffect, useCallback, useState, useRef } from "react";
import SituationBar from "@/components/SituationBar";
import PlayerPanel from "@/components/PlayerPanel";
import ShogiBoard from "@/components/ShogiBoard";
import AIAssistant from "@/components/AIAssistant";
import ConnectionPanel from "@/components/ConnectionPanel";
import PromotionDialog from "@/components/PromotionDialog";
import { useGameState } from "@/hooks/useGameState";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useAudioSystem } from "@/hooks/useAudioSystem";

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
  // Track if user has interacted (for BGM autoplay)
  const [hasInteracted, setHasInteracted] = useState(false);
  
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
    pendingPromotion,
    handlePromotionChoice,
    cancelPromotion,
    getLegalMoves,
    getLegalDrops,
    senteByoyomi,
    goteByoyomi,
    sfen,
    usiHistory,
    lastMove,
    setOnPieceMove,
    isGameOver,
    gameOverReason,
    setOnMainTimeExpired,
    setOnByoyomiTimeUp,
  } = useGameState();
  
  // Audio system
  const {
    startBgm,
    toggleBgm,
    isBgmPlaying,
    playPieceMove,
    speakByoyomiWarning,
    speakMainTimeExpired,
    playTimeUp,
    speakJapanese,
    primeAudioEngine,
    isAudioPrimed,
  } = useAudioSystem();
  
  // AI message override for time warnings
  const [aiWarningMessage, setAiWarningMessage] = useState<string | null>(null);
  
  // Track previous byoyomi times for voice countdown
  const prevSenteTimeRef = useRef(senteTime);
  const prevGoteTimeRef = useRef(goteTime);
  
  // Register piece move sound callback
  useEffect(() => {
    setOnPieceMove(playPieceMove);
  }, [setOnPieceMove, playPieceMove]);
  
  // Register main time expired callback
  useEffect(() => {
    setOnMainTimeExpired((player) => {
      speakMainTimeExpired();
      // AI warning message
      setAiWarningMessage('あと1分です！落ち着いて考えましょう。');
      // Clear warning after 5 seconds
      setTimeout(() => setAiWarningMessage(null), 5000);
    });
  }, [setOnMainTimeExpired, speakMainTimeExpired]);
  
  // Register byoyomi time up (game over) callback  
  useEffect(() => {
    setOnByoyomiTimeUp((player) => {
      playTimeUp();
      setAiWarningMessage(player === 'sente' 
        ? '先手の時間切れです。後手の勝ちです。' 
        : '後手の時間切れです。先手の勝ちです。');
    });
  }, [setOnByoyomiTimeUp, playTimeUp]);
  
  // Byoyomi voice warnings - only for the current player
  useEffect(() => {
    if (senteByoyomi && gameCurrentTurn === 'sente' && !isGameOver) {
      // Check if time changed
      if (prevSenteTimeRef.current !== senteTime) {
        if (senteTime === 30 || (senteTime <= 10 && senteTime >= 1)) {
          speakByoyomiWarning(senteTime);
        }
        // Low time AI warning
        if (senteTime === 15) {
          setAiWarningMessage('時間がありません！素早く指しましょう！');
          setTimeout(() => setAiWarningMessage(null), 3000);
        }
      }
    }
    prevSenteTimeRef.current = senteTime;
  }, [senteTime, senteByoyomi, gameCurrentTurn, speakByoyomiWarning, isGameOver]);
  
  useEffect(() => {
    if (goteByoyomi && gameCurrentTurn === 'gote' && !isGameOver) {
      if (prevGoteTimeRef.current !== goteTime) {
        if (goteTime === 30 || (goteTime <= 10 && goteTime >= 1)) {
          speakByoyomiWarning(goteTime);
        }
        // Low time AI warning
        if (goteTime === 15) {
          setAiWarningMessage('時間がありません！素早く指しましょう！');
          setTimeout(() => setAiWarningMessage(null), 3000);
        }
      }
    }
    prevGoteTimeRef.current = goteTime;
  }, [goteTime, goteByoyomi, gameCurrentTurn, speakByoyomiWarning, isGameOver]);
  
  // GLOBAL AUDIO PRIME - FORCE PLAY ON FIRST CLICK ANYWHERE
  const handleFirstInteraction = useCallback(async () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      console.log('AUDIO: First click detected, force-starting audio...');
      
      // FORCE PRIME
      await primeAudioEngine();
      
      // FORCE PLAY BGM WITH FRESH INSTANCE
      try {
        const origin = window.location.origin;
        const bgm = new Audio(origin + '/sounds/bgm.mp3');
        bgm.loop = true;
        bgm.volume = 0.3;
        await bgm.play();
        console.log('AUDIO: BGM force-started successfully');
      } catch (e) {
        console.error('AUDIO: BGM force-start failed', e);
      }
      
      // Also call the hook's startBgm
      startBgm();
    }
  }, [hasInteracted, primeAudioEngine, startBgm]);

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
    
    // If no state returned, the drop was invalid or waiting for promotion
    if (!nextState) {
      console.log('[Sync] Drop cancelled, invalid, or waiting for promotion');
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

  // Handle promotion choice with sync
  const handlePromotionWithSync = useCallback((shouldPromote: boolean) => {
    const nextState = handlePromotionChoice(shouldPromote);
    
    if (nextState && connectionStatus === 'connected') {
      sendMove(nextState);
    }
  }, [handlePromotionChoice, connectionStatus, sendMove]);

  // Determine which stream goes where based on role
  const opponentStream = role === 'host' ? remoteStream : (role === 'guest' ? remoteStream : null);
  const selfStream = role ? localStream : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden tatami-background" onClick={handleFirstInteraction}>
      {/* Top Header - Situation Assessment Bar */}
      <SituationBar gotePercent={gotePercent} sentePercent={sentePercent} />
      
      {/* BGM Toggle Button */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleBgm(); }}
        className="absolute top-16 right-4 z-30 p-2 rounded-full bg-amber-800/80 text-white hover:bg-amber-700 transition-colors"
        title={isBgmPlaying ? 'BGMを停止' : 'BGMを再生'}
      >
        {isBgmPlaying ? '🔊' : '🔇'}
      </button>
      
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
      
      {/* Main Game Area - TV Broadcast 3-Column Layout for iPad Pro */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="min-w-[1280px] h-full flex flex-row items-stretch justify-between px-6 pb-8 pt-2 relative">
        
        {/* Left Column - Gote Panel + AI Assistant */}
        <div className="flex-1 flex flex-col items-center justify-between h-full relative">
          {/* Gote Player Panel - Pushed to top */}
          <div className="flex flex-col items-center justify-start pt-4">
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
              canDrag={isMyTurn && role === 'guest' && !isGameOver}
              selectedSource={selectedSource}
              onSelectSource={setSelectedSource}
              fullColumn={true}
              rotateHand={true}
            />
          </div>
          
          {/* AI Assistant - Anchored to bottom with clearance */}
          <div className="mb-8 mr-10">
            <AIAssistant message={aiWarningMessage || aiMessage} />
          </div>
        </div>
        
        {/* Center Column - The Board (Fixed Width) */}
        <div className="flex-shrink-0 w-[700px] flex items-center justify-center h-full">
          <ShogiBoard 
            board={board}
            dragSource={dragSource}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={handleDropWithSync}
            isMyTurn={isMyTurn && !isGameOver}
            isGotePlayer={role === 'guest'}
            selectedSource={selectedSource}
            onSelectSource={setSelectedSource}
            rotateBoard={role === 'guest'}
          />
        </div>
        
        {/* Right Column - Sente Panel */}
        <div className="flex-1 flex flex-col items-center justify-start h-full pt-4">
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
            canDrag={isMyTurn && role !== 'guest' && !isGameOver}
            selectedSource={selectedSource}
            onSelectSource={setSelectedSource}
            fullColumn={true}
          />
        </div>
        
        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-amber-100 rounded-2xl p-8 shadow-2xl text-center">
              <h2 className="text-3xl font-bold text-amber-900 mb-4">対局終了</h2>
              <p className="text-xl text-amber-800 mb-6">{gameOverReason}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                新しい対局を始める
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
      
      {/* Promotion Dialog */}
      {pendingPromotion && (
        <PromotionDialog
          isOpen={true}
          piece={pendingPromotion.piece}
          promotedPiece={pendingPromotion.promotedPiece}
          onPromote={() => handlePromotionWithSync(true)}
          onDecline={() => handlePromotionWithSync(false)}
        />
      )}
    </div>
  );
};

export default Index;
