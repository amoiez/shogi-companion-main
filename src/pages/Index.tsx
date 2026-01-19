import { useEffect, useCallback, useState, useRef } from "react";
import SituationBar from "@/components/SituationBar";
import PlayerPanel from "@/components/PlayerPanel";
import ShogiBoard from "@/components/ShogiBoard";
import AIAssistant from "@/components/AIAssistant";
import ConnectionPanel from "@/components/ConnectionPanel";
import PromotionDialog from "@/components/PromotionDialog";
import { useGameState, GameMode } from "@/hooks/useGameState";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useAudioSystem } from "@/hooks/useAudioSystem";
import { getAPIGameState } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

// Selected source interface for tap-to-move
interface SelectedSource {
  type: 'board' | 'hand';
  row?: number;
  col?: number;
  handIndex?: number;
  piece: string;
  isOpponent: boolean;
}

// Safe zone type for collision detection
interface SafeZone {
  id: string;
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
  priority: number;
}

const Index = () => {
  // Game mode state: 'solo' or 'online'
  const [gameMode, setGameMode] = useState<GameMode>('online');
  // Track if user has made initial mode selection
  const [modeSelected, setModeSelected] = useState(false);
  
  // Tap-to-move selected state (shared between board and komadai)
  const [selectedSource, setSelectedSource] = useState<SelectedSource | null>(null);
  // Track if user has interacted (for BGM autoplay)
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Safe zone refs for collision detection
  const boardRef = useRef<HTMLDivElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  
  // Toast for API errors
  const { toast } = useToast();
  
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
  } = useGameState(gameMode);
  
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
        // Beep at 10-second intervals: 50s, 40s, 30s, 20s, plus final countdown 10-1
        if (senteTime === 50 || senteTime === 40 || senteTime === 30 || senteTime === 20 || (senteTime <= 10 && senteTime >= 1)) {
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
        // Beep at 10-second intervals: 50s, 40s, 30s, 20s, plus final countdown 10-1
        if (goteTime === 50 || goteTime === 40 || goteTime === 30 || goteTime === 20 || (goteTime <= 10 && goteTime >= 1)) {
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

  // Solo mode handler
  const handleSoloMode = useCallback(() => {
    setGameMode('solo');
    setModeSelected(true);
  }, []);

  // Online mode handlers
  const handleHostGame = useCallback(() => {
    setGameMode('online');
    setModeSelected(true);
    hostGame();
  }, [hostGame]);

  const handleJoinGame = useCallback((gameId: string) => {
    setGameMode('online');
    setModeSelected(true);
    joinGame(gameId);
  }, [joinGame]);

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
    // SOLO MODE: No turn restrictions, allow any move
    if (gameMode === 'solo') {
      handleDrop(row, col);
      return;
    }
    
    // ONLINE MODE: Check turn restrictions
    // Don't allow moves when not connected but in multiplayer mode, or when not your turn
    if (role && !isMyTurn) {
      console.log('[Sync] Not your turn!');
      return;
    }
    
    console.log('[Sync] handleDropWithSync called with LOGICAL coords:', { row, col, role, isGotePlayer: role === 'guest' });
    
    // handleDrop now returns the calculated new state synchronously
    // NOTE: row, col are already in LOGICAL coordinates (mirrored by ShogiBoard if needed)
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
  }, [handleDrop, connectionStatus, sendMove, role, isMyTurn, gameMode]);

  // Handle promotion choice with sync
  const handlePromotionWithSync = useCallback((shouldPromote: boolean) => {
    const nextState = handlePromotionChoice(shouldPromote);
    
    if (nextState && connectionStatus === 'connected') {
      sendMove(nextState);
    }
  }, [handlePromotionChoice, connectionStatus, sendMove]);

  // ============================================================
  // API EXPORT HELPER FOR EXTERNAL AI INTEGRATION
  // ============================================================
  // Extracts current game state in clean JSON format for Nakano Douga AI API
  // Can be called anytime to get API-ready data snapshot
  // ============================================================
  const exportAPIGameState = useCallback(() => {
    try {
      const apiState = getAPIGameState(
        board,
        lastMove,
        senteTime,
        goteTime,
        senteByoyomi,
        goteByoyomi,
        moveCount,
        gameCurrentTurn
      );
      
      console.log('[API Export] Game state prepared:', apiState);
      return apiState;
    } catch (error) {
      console.error('[API Export] Failed to export game state:', error);
      
      // Show error toast to user
      toast({
        title: "Sync Error",
        description: "Failed to prepare game state for AI analysis",
        variant: "destructive",
      });
      
      return null;
    }
  }, [board, lastMove, senteTime, goteTime, senteByoyomi, goteByoyomi, moveCount, gameCurrentTurn, toast]);

  // Example: Export API state after each move (optional - can be triggered on demand)
  useEffect(() => {
    if (moveCount > 0) {
      // Automatically prepare API state after moves
      // This ensures data is ready for external AI to fetch
      const apiState = exportAPIGameState();
      
      // Store in window for external access (if needed by integration partner)
      if (apiState) {
        (window as any).__shogiAPIState = apiState;
      }
    }
  }, [moveCount, exportAPIGameState]);

  // Determine which stream goes where based on role
  const opponentStream = role === 'host' ? remoteStream : (role === 'guest' ? remoteStream : null);
  const selfStream = role ? localStream : null;
  
  // PERSPECTIVE RULES for layout:
  // - Host (Sente): Static view, Gote on left, Sente on right (their pieces at board bottom)
  // - Guest (Gote): Static view, Sente on left, Gote on right (board rotated, their pieces at bottom)
  // - Spectator: Auto-flip based on current turn
  const shouldFlipLayout = 
    role === 'host' ? false :              // Host always sees Gote left, Sente right
    role === 'guest' ? true :              // Guest always sees Sente left, Gote right (with rotated board)
    gameCurrentTurn === 'gote';            // Spectators follow active player
  
  // Calculate safe zones for AI assistant collision detection
  const updateSafeZones = useCallback(() => {
    const zones: SafeZone[] = [];
    
    // Board safe zone (highest priority)
    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      zones.push({
        id: 'board',
        bounds: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        },
        priority: 1,
      });
    }
    
    // Left player frame safe zone
    if (leftColumnRef.current) {
      const rect = leftColumnRef.current.getBoundingClientRect();
      zones.push({
        id: 'left-player',
        bounds: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        },
        priority: 2,
      });
    }
    
    // Right player frame safe zone
    if (rightColumnRef.current) {
      const rect = rightColumnRef.current.getBoundingClientRect();
      zones.push({
        id: 'right-player',
        bounds: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        },
        priority: 2,
      });
    }
    
    setSafeZones(zones);
  }, []);
  
  // Update safe zones on mount and resize
  useEffect(() => {
    updateSafeZones();
    
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateSafeZones, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [updateSafeZones]);
  
  // Recalculate safe zones when layout changes
  useEffect(() => {
    // Small delay to allow DOM to update after layout change
    const timeoutId = setTimeout(updateSafeZones, 50);
    return () => clearTimeout(timeoutId);
  }, [shouldFlipLayout, updateSafeZones]);

  return (
    <div className="h-screen flex flex-col overflow-hidden tatami-background" onClick={handleFirstInteraction}>
      {/* Top Header - Situation Assessment Bar - flipped based on perspective */}
      <SituationBar gotePercent={gotePercent} sentePercent={sentePercent} isFlipped={shouldFlipLayout} />
      
      {/* BGM Toggle Button */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleBgm(); }}
        className="absolute top-16 right-4 z-30 p-2 rounded-full bg-amber-800/80 text-white hover:bg-amber-700 transition-colors"
        title={isBgmPlaying ? 'BGMを停止' : 'BGMを再生'}
      >
        {isBgmPlaying ? '🔊' : '🔇'}
      </button>
      
      {/* Connection Panel - Lobby Modal or Status Badge (handles its own positioning) */}
      {/* Show modal until user selects a mode, then only show in online mode */}
      {(!modeSelected || gameMode === 'online') && (
        <ConnectionPanel
          gameId={gameId}
          role={role}
          connectionStatus={connectionStatus}
          errorMessage={errorMessage}
          onHost={handleHostGame}
          onJoin={handleJoinGame}
          onDisconnect={disconnect}
          onSoloMode={handleSoloMode}
        />
      )}
      
      {/* Main Game Area - TV Broadcast 3-Column Layout (Tight Proximity) */}
      {/* Layout based on player perspective (not turn-based for players) */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="min-w-[1280px] h-full flex flex-row items-start justify-center gap-x-[40px] xl:gap-x-[80px] px-4 pb-4 pt-2 relative">
        
        {/* Left Column - Opponent for current player, or follows turn for spectators */}
        <div ref={leftColumnRef} className="flex-shrink-0 flex flex-col items-center justify-start pt-[2vh]">
          {!shouldFlipLayout ? (
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
              canDrag={gameMode === 'solo' ? !isGameOver : (isMyTurn && role === 'guest' && !isGameOver)}
              selectedSource={selectedSource}
              onSelectSource={setSelectedSource}
              fullColumn={true}
              rotateHand={true}
              playerName="鈴木一郎"
              playerRank="初段"
            />
          ) : (
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
              canDrag={gameMode === 'solo' ? !isGameOver : (isMyTurn && role !== 'guest' && !isGameOver)}
              selectedSource={selectedSource}
              onSelectSource={setSelectedSource}
              fullColumn={true}
              playerName="ナカノさん"
              playerRank="3級"
            />
          )}
        </div>
        
        {/* Center Column - The Board (75vh Height, Perfect Square) */}
        {/* PERSPECTIVE RULES:
            - Host (Sente/Creator): Board stays static, their pieces at bottom (rotateBoard=false)
            - Guest (Gote/Subscriber): Board rotated 180° permanently, their pieces at bottom (rotateBoard=true)
            - Spectator (no role): Auto-flip based on current turn (follows active player)
        */}
        <div id="board-container" className="flex-shrink-0 flex items-start justify-center pt-[2vh] relative">
          <div ref={boardRef} className="h-[75vh] aspect-square">
            <ShogiBoard 
              board={board}
              dragSource={dragSource}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={handleDropWithSync}
              isMyTurn={gameMode === 'solo' ? true : (isMyTurn && !isGameOver)}
              isGotePlayer={gameMode === 'solo' ? false : (role === 'guest')}
              selectedSource={selectedSource}
              onSelectSource={setSelectedSource}
              rotateBoard={
                gameMode === 'solo' ? false :       // SOLO MODE: Board NEVER rotates
                role === 'host' ? false :           // Sente always sees their pieces at bottom
                role === 'guest' ? true :           // Gote always sees their pieces at bottom (rotated)
                gameCurrentTurn === 'gote'          // Spectators follow active player
              }
              gameMode={gameMode}
            />
          </div>
        </div>
        
        {/* Right Column - Current player's side, or follows turn for spectators */}
        <div ref={rightColumnRef} className="flex-shrink-0 flex flex-col items-center justify-start pt-[2vh]">
          {!shouldFlipLayout ? (
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
              canDrag={gameMode === 'solo' ? !isGameOver : (isMyTurn && role !== 'guest' && !isGameOver)}
              selectedSource={selectedSource}
              onSelectSource={setSelectedSource}
              fullColumn={true}
              playerName="ナカノさん"
              playerRank="3級"
            />
          ) : (
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
              canDrag={gameMode === 'solo' ? !isGameOver : (isMyTurn && role === 'guest' && !isGameOver)}
              selectedSource={selectedSource}
              onSelectSource={setSelectedSource}
              fullColumn={true}
              rotateHand={true}
              playerName="鈴木一郎"
              playerRank="初段"
            />
          )}
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
      
      {/* AI Assistant - Fixed position at bottom-left, collision-aware */}
      <div 
        className="fixed z-20"
        style={{
          left: '24px',
          bottom: '24px',
        }}
      >
        <AIAssistant 
          message={aiWarningMessage || aiMessage} 
          safeZones={safeZones}
        />
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
      
      {/* Toast notifications for API errors */}
      <Toaster />
    </div>
  );
};

export default Index;
