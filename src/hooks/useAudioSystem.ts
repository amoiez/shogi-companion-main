import { useRef, useCallback, useEffect, useState } from 'react';

interface AudioSystemOptions {
  bgmEnabled?: boolean;
  sfxEnabled?: boolean;
  voiceEnabled?: boolean;
}

export const useAudioSystem = (options: AudioSystemOptions = {}) => {
  const { bgmEnabled = true, sfxEnabled = true, voiceEnabled = true } = options;
  
  const bgmRef = useRef<HTMLAudioElement | null>(null);
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

  // Initialize and preload audio elements with AGGRESSIVE PRIMING
  useEffect(() => {
    if (isInitialized) return;
    
    // BGM - ABSOLUTE PATH, EXPLICIT LOOP
    const bgm = new Audio('/sounds/bgm.mp3');
    bgm.loop = true;
    bgm.volume = 0.3;
    bgm.preload = 'auto';
    bgm.load();
    bgmRef.current = bgm;
    
    // Piece move sound - ABSOLUTE PATH, PRELOAD FOR ZERO LAG
    const pieceSound = new Audio('/sounds/piece-move.mp3');
    pieceSound.volume = 0.6;
    pieceSound.preload = 'auto';
    pieceSound.load();
    pieceMoveRef.current = pieceSound;
    
    setIsInitialized(true);
    console.log('AUDIO SYSTEM: Initialized with absolute paths');
    
    return () => {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
      if (pieceMoveRef.current) {
        pieceMoveRef.current = null;
      }
    };
  }, [isInitialized]);

  // AGGRESSIVE AUDIO PRIMING - play/pause all audio to unlock browser engine
  const primeAudioEngine = useCallback(async () => {
    if (isAudioPrimed) return;
    
    try {
      // Resume AudioContext
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        await ctx.close();
      }
      
      // Prime BGM
      if (bgmRef.current) {
        await bgmRef.current.play();
        bgmRef.current.pause();
        bgmRef.current.currentTime = 0;
      }
      
      // Prime piece sound
      if (pieceMoveRef.current) {
        await pieceMoveRef.current.play();
        pieceMoveRef.current.pause();
        pieceMoveRef.current.currentTime = 0;
      }
      
      setIsAudioPrimed(true);
      console.log('AUDIO ENGINE: UNLOCKED AND PRIMED');
    } catch (e) {
      console.log('AUDIO ENGINE: Prime failed', e);
    }
  }, [isAudioPrimed]);

  // Start BGM (must be called from user interaction)
  const startBgm = useCallback(async () => {
    if (!bgmEnabled || !bgmRef.current) return;
    
    // Prime audio engine first
    await primeAudioEngine();
    
    bgmRef.current.play()
      .then(() => {
        setIsBgmPlaying(true);
        console.log('BGM: Playing');
      })
      .catch(e => console.log('BGM: Play blocked', e));
  }, [bgmEnabled, primeAudioEngine]);

  // Stop BGM
  const stopBgm = useCallback(() => {
    if (!bgmRef.current) return;
    bgmRef.current.pause();
    bgmRef.current.currentTime = 0;
    setIsBgmPlaying(false);
  }, []);

  // Toggle BGM
  const toggleBgm = useCallback(() => {
    if (isBgmPlaying) {
      stopBgm();
    } else {
      startBgm();
    }
  }, [isBgmPlaying, startBgm, stopBgm]);

  // Play piece move sound - MUST WORK EVERY TIME
  const playPieceMove = useCallback(() => {
    if (!sfxEnabled || !pieceMoveRef.current) {
      console.log('PIECE SOUND: Disabled or not loaded');
      return;
    }
    
    try {
      pieceMoveRef.current.currentTime = 0;
      pieceMoveRef.current.play()
        .then(() => console.log('PIECE SOUND: Played'))
        .catch(e => {
          console.log('PIECE SOUND: Play failed', e);
          // Fallback beep
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 800;
          gain.gain.value = 0.2;
          osc.start();
          osc.stop(ctx.currentTime + 0.05);
        });
    } catch (e) {
      console.log('PIECE SOUND: Exception', e);
    }
  }, [sfxEnabled]);

  // Single beep using Web Audio API
  const playSingleBeep = useCallback((frequency: number = 880, duration: number = 0.15) => {
    if (!sfxEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
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
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    
    if (seconds === 30) {
      playDoubleBeep();
      setTimeout(() => {
        if (voiceEnabled) {
          speakJapanese('30秒', 1.2);
        }
      }, 300);
    } else if (seconds <= 10 && seconds >= 1) {
      // FALLBACK BEEP - always play regardless of voice
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
