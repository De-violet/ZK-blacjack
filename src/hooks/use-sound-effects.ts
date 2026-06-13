'use client';

import { useState, useCallback, useEffect } from 'react';

const SOUND_ENABLED_KEY = 'blackjack-sound-enabled';

type SoundFunction = () => void;

interface UseSoundEffectsReturn {
  playCardDeal: SoundFunction;
  playChipClick: SoundFunction;
  playWin: SoundFunction;
  playBlackjack: SoundFunction;
  playLose: SoundFunction;
  playPush: SoundFunction;
  playBust: SoundFunction;
  isSoundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

/**
 * Gets or creates a shared AudioContext.
 * Returns null if the Web Audio API is not available (e.g., SSR).
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!('AudioContext' in window) && !('webkitAudioContext' in window)) return null;

  // Reuse existing context if available
  const existing = (window as unknown as { __blackjackAudioCtx?: AudioContext }).__blackjackAudioCtx;
  if (existing) {
    // Resume if suspended (browser autoplay policy)
    if (existing.state === 'suspended') {
      existing.resume();
    }
    return existing;
  }

  try {
    const ctx = new AudioContext();
    (window as unknown as { __blackjackAudioCtx?: AudioContext }).__blackjackAudioCtx = ctx;
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Plays a quick swoosh sound for card dealing.
 * Short noise burst with high-pass filter, ~100ms
 */
function createCardDealSound(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // Create a noise buffer for the swoosh
  const bufferSize = Math.floor(ctx.sampleRate * 0.1); // 100ms
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // High-pass filter to make it sound like a swoosh
  const highPass = ctx.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.frequency.value = 2000;
  highPass.Q.value = 1;

  // Envelope
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  source.connect(highPass);
  highPass.connect(gain);
  gain.connect(ctx.destination);

  source.start(now);
  source.stop(now + 0.1);

  source.onended = () => {
    source.disconnect();
    highPass.disconnect();
    gain.disconnect();
  };
}

/**
 * Plays a short click/clack sound for chip interactions.
 * Very short sine wave at ~800Hz, ~30ms
 */
function createChipClickSound(ctx: AudioContext): void {
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.03);

  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

/**
 * Plays a happy ascending tone for wins.
 * Two quick ascending notes: C5 → E5, ~300ms total
 */
function createWinSound(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // C5 = 523.25Hz, E5 = 659.25Hz
  const noteDuration = 0.12;
  const gap = 0.03;

  // Note 1: C5
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523.25, now);

  const gain1 = ctx.createGain();
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.35, now + 0.01);
  gain1.gain.setValueAtTime(0.35, now + noteDuration - 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + noteDuration);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + noteDuration);

  // Note 2: E5
  const note2Start = now + noteDuration + gap;
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(659.25, note2Start);

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0, note2Start);
  gain2.gain.linearRampToValueAtTime(0.4, note2Start + 0.01);
  gain2.gain.setValueAtTime(0.4, note2Start + noteDuration - 0.02);
  gain2.gain.exponentialRampToValueAtTime(0.001, note2Start + noteDuration);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(note2Start);
  osc2.stop(note2Start + noteDuration);

  // Cleanup after last note finishes
  osc2.onended = () => {
    try { osc1.disconnect(); } catch { /* already disconnected */ }
    try { gain1.disconnect(); } catch { /* already disconnected */ }
    try { osc2.disconnect(); } catch { /* already disconnected */ }
    try { gain2.disconnect(); } catch { /* already disconnected */ }
  };
}

/**
 * Plays an exciting fanfare for blackjack.
 * Three ascending notes: C5 → E5 → G5, ~500ms total
 */
function createBlackjackSound(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // C5 = 523.25Hz, E5 = 659.25Hz, G5 = 783.99Hz
  const noteDuration = 0.12;
  const gap = 0.03;

  const frequencies = [523.25, 659.25, 783.99];
  const oscillators: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  frequencies.forEach((freq, i) => {
    const startTime = now + i * (noteDuration + gap);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.4, startTime + 0.01);
    gain.gain.setValueAtTime(0.4, startTime + noteDuration - 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + noteDuration);

    oscillators.push(osc);
    gains.push(gain);
  });

  // Add a shimmer overtone on the last note for excitement
  const shimmerStart = now + 2 * (noteDuration + gap);
  const shimmer = ctx.createOscillator();
  shimmer.type = 'triangle';
  shimmer.frequency.setValueAtTime(783.99 * 2, shimmerStart); // Octave above G5

  const shimmerGain = ctx.createGain();
  shimmerGain.gain.setValueAtTime(0, shimmerStart);
  shimmerGain.gain.linearRampToValueAtTime(0.15, shimmerStart + 0.01);
  shimmerGain.gain.exponentialRampToValueAtTime(0.001, shimmerStart + noteDuration + 0.08);

  shimmer.connect(shimmerGain);
  shimmerGain.connect(ctx.destination);
  shimmer.start(shimmerStart);
  shimmer.stop(shimmerStart + noteDuration + 0.1);

  const cleanup = () => {
    oscillators.forEach((o) => { try { o.disconnect(); } catch { /* ok */ } });
    gains.forEach((g) => { try { g.disconnect(); } catch { /* ok */ } });
    try { shimmer.disconnect(); } catch { /* ok */ }
    try { shimmerGain.disconnect(); } catch { /* ok */ }
  };

  shimmer.onended = cleanup;
}

/**
 * Plays a sad descending tone for losses.
 * Two descending notes, ~300ms total
 */
function createLoseSound(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // E4 → C4 descending
  const noteDuration = 0.12;
  const gap = 0.03;

  // Note 1: E4
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(329.63, now);

  const gain1 = ctx.createGain();
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.3, now + 0.01);
  gain1.gain.setValueAtTime(0.3, now + noteDuration - 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + noteDuration);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + noteDuration);

  // Note 2: C4
  const note2Start = now + noteDuration + gap;
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(261.63, note2Start);

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0, note2Start);
  gain2.gain.linearRampToValueAtTime(0.25, note2Start + 0.01);
  gain2.gain.setValueAtTime(0.25, note2Start + noteDuration - 0.02);
  gain2.gain.exponentialRampToValueAtTime(0.001, note2Start + noteDuration);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(note2Start);
  osc2.stop(note2Start + noteDuration);

  osc2.onended = () => {
    try { osc1.disconnect(); } catch { /* already disconnected */ }
    try { gain1.disconnect(); } catch { /* already disconnected */ }
    try { osc2.disconnect(); } catch { /* already disconnected */ }
    try { gain2.disconnect(); } catch { /* already disconnected */ }
  };
}

/**
 * Plays a neutral tone for a push/tie.
 * Single middle note, ~200ms
 */
function createPushSound(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // A4 = 440Hz - neutral middle note
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
  gain.gain.setValueAtTime(0.3, now + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.2);

  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

/**
 * Plays a harsh buzzer-like sound for bust.
 * Square wave, ~200ms
 */
function createBustSound(ctx: AudioContext): void {
  const now = ctx.currentTime;

  // Low harsh buzzer
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.linearRampToValueAtTime(100, now + 0.2);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
  gain.gain.setValueAtTime(0.25, now + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  // Second detuned oscillator for extra harshness
  const osc2 = ctx.createOscillator();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(153, now);
  osc2.frequency.linearRampToValueAtTime(97, now + 0.2);

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.15, now + 0.01);
  gain2.gain.setValueAtTime(0.15, now + 0.12);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.2);
  osc2.start(now);
  osc2.stop(now + 0.2);

  const cleanup = () => {
    try { osc.disconnect(); } catch { /* ok */ }
    try { gain.disconnect(); } catch { /* ok */ }
    try { osc2.disconnect(); } catch { /* ok */ }
    try { gain2.disconnect(); } catch { /* ok */ }
  };

  osc2.onended = cleanup;
}

/**
 * Helper: safely attempt to play a sound. No-ops if sound is disabled
 * or AudioContext is unavailable.
 */
function tryPlaySound(
  isSoundEnabled: boolean,
  createSound: (ctx: AudioContext) => void
): void {
  if (!isSoundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  createSound(ctx);
}

/**
 * Hook that provides synthesized sound effects using the Web Audio API.
 * All sounds are generated programmatically — no audio files needed.
 *
 * Sound functions are safe to call during SSR (they will be no-ops).
 */
export function useSoundEffects(): UseSoundEffectsReturn {
  // Always initialize to true to match SSR; read localStorage in useEffect to avoid hydration mismatch
  const [isSoundEnabled, setIsSoundEnabledState] = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SOUND_ENABLED_KEY);
      if (stored !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- needed for hydration safety
        setIsSoundEnabledState(stored === 'true');
      }
    } catch {
      // localStorage may not be accessible
    }
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setIsSoundEnabledState(enabled);
    try {
      localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
    } catch {
      // localStorage may not be accessible
    }
  }, []);

  const playCardDeal = useCallback(() => {
    tryPlaySound(isSoundEnabled, createCardDealSound);
  }, [isSoundEnabled]);

  const playChipClick = useCallback(() => {
    tryPlaySound(isSoundEnabled, createChipClickSound);
  }, [isSoundEnabled]);

  const playWin = useCallback(() => {
    tryPlaySound(isSoundEnabled, createWinSound);
  }, [isSoundEnabled]);

  const playBlackjack = useCallback(() => {
    tryPlaySound(isSoundEnabled, createBlackjackSound);
  }, [isSoundEnabled]);

  const playLose = useCallback(() => {
    tryPlaySound(isSoundEnabled, createLoseSound);
  }, [isSoundEnabled]);

  const playPush = useCallback(() => {
    tryPlaySound(isSoundEnabled, createPushSound);
  }, [isSoundEnabled]);

  const playBust = useCallback(() => {
    tryPlaySound(isSoundEnabled, createBustSound);
  }, [isSoundEnabled]);

  return {
    playCardDeal,
    playChipClick,
    playWin,
    playBlackjack,
    playLose,
    playPush,
    playBust,
    isSoundEnabled,
    setSoundEnabled,
  };
}
