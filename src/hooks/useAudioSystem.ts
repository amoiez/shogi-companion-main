import { useRef, useCallback, useEffect, useState } from 'react';

interface AudioSystemOptions {
  bgmEnabled?: boolean;
  sfxEnabled?: boolean;
  voiceEnabled?: boolean;
}

// ============================================================
// TRUE MODULE-LEVEL SINGLETON - ONE INSTANCE FOR ENTIRE APP
// ============================================================
let bgmInstance: HTMLAudioElement | null = null;
let bgmInstanceId: string | null = null; // Unique ID for debugging
let eventListenersAttached = false;

// State tracking to prevent duplicate operations
let isCurrentlyPlaying = false;

type AudioContextConstructor = typeof AudioContext;

const getAudioContextConstructor = (): AudioContextConstructor | undefined => {
  return window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
};

const createBgmInstance = (): HTMLAudioElement => {
  // Generate unique ID for this instance
  bgmInstanceId = `bgm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const audio = new Audio();
  audio.loop = true;
  audio.volume = 0.3;
  audio.preload = 'auto';
  audio.src = origin + '/sounds/bgm.mp3';
  
  console.log('🎵 BGM: TRUE SINGLETON CREATED - ID:', bgmInstanceId);
  
  return audio;
};

const getBgmInstance = (): HTMLAudioElement => {
  if (!bgmInstance) {
    bgmInstance = createBgmInstance();
  }
  console.log('🎵 BGM: getInstance called - ID:', bgmInstanceId, 'paused:', bgmInstance.paused);
  return bgmInstance;
};

// HARD STOP - pause and reset to beginning
const hardStopBgm = (): void => {
  if (!bgmInstance) {
    console.log('🎵 BGM: hardStop - no instance exists');
    return;
  }
  
  console.log('🎵 BGM: HARD STOP - ID:', bgmInstanceId);
  
  // 1. Pause playback
  bgmInstance.pause();
  
  // 2. Reset position
  bgmInstance.currentTime = 0;
  
  // 3. Update tracking state
  isCurrentlyPlaying = false;
  
  console.log('🎵 BGM: HARD STOP COMPLETE');
};

export const useAudioSystem = (options: AudioSystemOptions = {}) => {
  const { bgmEnabled = true, sfxEnabled = true, voiceEnabled = true } = options;
  
  const pieceMoveRef = useRef<HTMLAudioElement | null>(null);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAudioPrimed, setIsAudioPrimed] = useState(false);
  
  // Speech synthesis for voice announcements
  const speakJapanese = useCallback((text: string, rate: number = 1.0) => {
    if (!voiceEnabled) return;
    
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = rate;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.log('Speech synthesis not available');
    }
  }, [voiceEnabled]);

  // Initialize audio system - attach event listeners to singleton ONCE
  useEffect(() => {
    if (isInitialized) return;
    
    const origin = window.location.origin;
    console.log('🎵 AUDIO SYSTEM: Initializing - origin:', origin);
    
    // Get BGM singleton and attach event listeners (only once ever)
    const bgm = getBgmInstance();
    
    if (!eventListenersAttached) {
      eventListenersAttached = true;
      
      // Sync React state with actual audio events
      bgm.addEventListener('play', () => {
        console.log('🎵 BGM EVENT: play - ID:', bgmInstanceId);
        isCurrentlyPlaying = true;
        setIsBgmPlaying(true);
      });
      bgm.addEventListener('pause', () => {
        console.log('🎵 BGM EVENT: pause - ID:', bgmInstanceId);
        isCurrentlyPlaying = false;
        setIsBgmPlaying(false);
      });
      bgm.addEventListener('ended', () => {
        console.log('🎵 BGM EVENT: ended - ID:', bgmInstanceId);
        isCurrentlyPlaying = false;
        setIsBgmPlaying(false);
      });
      bgm.addEventListener('error', (e) => {
        console.error('🎵 BGM EVENT: error - ID:', bgmInstanceId, e);
        isCurrentlyPlaying = false;
        setIsBgmPlaying(false);
      });
      
      console.log('🎵 BGM: Event listeners attached to singleton');
    }
    
    // Sync initial state from actual audio element
    setIsBgmPlaying(!bgm.paused && bgm.currentTime > 0);
    
    // Piece move sound - component-level
    if (!pieceMoveRef.current) {
      const pieceSound = new Audio(origin + '/sounds/piece-move.mp3');
      pieceSound.volume = 0.6;
      pieceSound.preload = 'auto';
      pieceMoveRef.current = pieceSound;
      console.log('🎵 PIECE SOUND: Loaded');
    }
    
    setIsInitialized(true);
    
    // Cleanup on unmount - HARD STOP the BGM
    return () => {
      console.log('🎵 AUDIO SYSTEM: Component unmounting - stopping BGM');
      hardStopBgm();
    };
  }, [isInitialized]);

  // AGGRESSIVE AUDIO PRIMING - play/pause all audio to unlock browser engine
  const primeAudioEngine = useCallback(async () => {
    if (isAudioPrimed) return;
    
    console.log('🎵 AUDIO ENGINE: Priming...');
    
    try {
      // Resume AudioContext
      const AudioContext = getAudioContextConstructor();
      if (AudioContext) {
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        await ctx.close();
      }
      
      // Prime BGM - play/pause to unlock
      const bgm = getBgmInstance();
      try {
        await bgm.play();
        bgm.pause();
        bgm.currentTime = 0;
      } catch (e) {
        console.log('🎵 BGM prime failed:', e);
      }
      
      // Prime piece sound
      if (pieceMoveRef.current) {
        try {
          await pieceMoveRef.current.play();
          pieceMoveRef.current.pause();
          pieceMoveRef.current.currentTime = 0;
        } catch (e) {
          console.log('🎵 Piece sound prime failed:', e);
        }
      }
      
      setIsAudioPrimed(true);
      console.log('🎵 AUDIO ENGINE: UNLOCKED AND PRIMED');
    } catch (e) {
      console.log('🎵 AUDIO ENGINE: Prime failed', e);
    }
  }, [isAudioPrimed]);

  // Start BGM - PREVENT DUPLICATE PLAYS
  const startBgm = useCallback(() => {
    console.log('🎵 BGM: startBgm called - ID:', bgmInstanceId, 'isCurrentlyPlaying:', isCurrentlyPlaying);
    
    // Get singleton instance
    const bgm = getBgmInstance();
    
    // PREVENT DUPLICATE: Check actual audio state AND tracking flag
    if (!bgm.paused || isCurrentlyPlaying) {
      console.log('🎵 BGM: Already playing, skipping duplicate play - paused:', bgm.paused, 'tracking:', isCurrentlyPlaying);
      return;
    }
    
    // Mark as playing BEFORE calling play() to prevent race conditions
    isCurrentlyPlaying = true;
    
    bgm.play()
      .then(() => {
        console.log('🎵 BGM: Playing successfully - ID:', bgmInstanceId);
      })
      .catch(e => {
        console.error('🎵 BGM Play Error:', e);
        isCurrentlyPlaying = false;
      });
  }, []);

  // Stop BGM - HARD STOP to fully kill audio
  const stopBgm = useCallback(() => {
    console.log('🎵 BGM: stopBgm called - ID:', bgmInstanceId);
    
    // Use hard stop to completely kill audio
    hardStopBgm();
    
    console.log('🎵 BGM: Stopped completely');
  }, []);

  // Toggle BGM - check ACTUAL audio state, not React state
  const toggleBgm = useCallback(() => {
    const bgm = getBgmInstance();
    
    // Check actual DOM audio state AND tracking flag
    const isActuallyPlaying = !bgm.paused || isCurrentlyPlaying;
    console.log('🎵 BGM TOGGLE: ID:', bgmInstanceId, 'paused:', bgm.paused, 'tracking:', isCurrentlyPlaying, 'decision:', isActuallyPlaying ? 'STOP' : 'START');
    
    if (isActuallyPlaying) {
      stopBgm();
    } else {
      startBgm();
    }
  }, [startBgm, stopBgm]);

  // Play piece move sound - FORCE PLAY WITH NEW INSTANCE EVERY TIME
  const playPieceMove = useCallback(() => {
    try {
      const origin = window.location.origin;
      const sound = new Audio(origin + '/sounds/piece-move.mp3');
      sound.volume = 0.6;
      sound.play()
        .then(() => console.log('PIECE SOUND: Played'))
        .catch(e => {
          console.error('PIECE SOUND: Play failed', e);
          // Fallback beep
          try {
            const AudioContext = getAudioContextConstructor();
            if (!AudioContext) {
              throw new Error('AudioContext not available');
            }
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.value = 0.3;
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
            console.log('PIECE SOUND: Fallback beep played');
          } catch (beepError) {
            console.error('PIECE SOUND: Fallback beep failed', beepError);
          }
        });
    } catch (e) {
      console.error('PIECE SOUND: Exception', e);
    }
  }, []);

  // Single beep using Web Audio API
  const playSingleBeep = useCallback((frequency: number = 880, duration: number = 0.15) => {
    if (!sfxEnabled) return;
    
    try {
      const AudioContext = getAudioContextConstructor();
      if (!AudioContext) {
        throw new Error('AudioContext not available');
      }
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
      console.log('Audio not available');
    }
  }, [sfxEnabled]);

  // Double beep using Web Audio API
  const playDoubleBeep = useCallback(() => {
    if (!sfxEnabled) return;
    
    try {
      const AudioContext = getAudioContextConstructor();
      if (!AudioContext) {
        throw new Error('AudioContext not available');
      }
      const audioContext = new AudioContext();
      
      const playBeep = (startTime: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.4, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.15);
      };
      
      const now = audioContext.currentTime;
      playBeep(now);
      playBeep(now + 0.2);
    } catch (e) {
      console.log('Audio not available');
    }
  }, [sfxEnabled]);

  // Long beep for time up
  const playLongBeep = useCallback(() => {
    if (!sfxEnabled) return;
    
    try {
      const AudioContext = getAudioContextConstructor();
      if (!AudioContext) {
        throw new Error('AudioContext not available');
      }
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440;
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.8);
    } catch (e) {
      console.log('Audio not available');
    }
  }, [sfxEnabled]);

  // Main time expired announcement
  const speakMainTimeExpired = useCallback(() => {
    playSingleBeep(660, 0.2);
    setTimeout(() => {
      speakJapanese('持ち時間が切れましたのでこれよりの対局持ち時間1分になります', 1.0);
    }, 300);
  }, [playSingleBeep, speakJapanese]);

  // Time up alert (game over)
  const playTimeUp = useCallback(() => {
    playLongBeep();
    setTimeout(() => {
      speakJapanese('持ち時間が切れました', 1.0);
    }, 500);
  }, [playLongBeep, speakJapanese]);

  // Byoyomi voice countdown with FALLBACK BEEPS
  const speakByoyomiWarning = useCallback((seconds: number) => {
    console.log('TIMER AUDIO: Triggered at ' + seconds);
    
    // Beep at 10-second intervals: 50s, 40s, 30s, 20s
    if (seconds === 50 || seconds === 40 || seconds === 30 || seconds === 20) {
      playDoubleBeep();
      if (voiceEnabled && seconds === 30) {
        setTimeout(() => {
          speakJapanese('30秒', 1.2);
        }, 300);
      }
    } else if (seconds <= 10 && seconds >= 1) {
      // FALLBACK BEEP - always play regardless of voice (every second in final countdown)
      try {
        const AudioContext = getAudioContextConstructor();
        if (!AudioContext) {
          throw new Error('AudioContext not available');
        }
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440 + (seconds * 50);
        gain.gain.value = 0.3;
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } catch (e) {
        console.log('Beep failed');
      }
      
      // Voice countdown in Japanese
      if (voiceEnabled) {
        const numbers: Record<number, string> = {
          10: 'じゅう',
          9: 'きゅう', 
          8: 'はち',
          7: 'なな',
          6: 'ろく',
          5: 'ご',
          4: 'よん',
          3: 'さん',
          2: 'に',
          1: 'いち',
        };
        speakJapanese(numbers[seconds], 1.8);
      }
    }
  }, [voiceEnabled, playDoubleBeep, speakJapanese]);

  return {
    startBgm,
    stopBgm,
    toggleBgm,
    isBgmPlaying,
    playPieceMove,
    playSingleBeep,
    playDoubleBeep,
    playLongBeep,
    playTimeUp,
    speakByoyomiWarning,
    speakMainTimeExpired,
    speakJapanese,
    primeAudioEngine,
    isAudioPrimed,
  };
};

export default useAudioSystem;
