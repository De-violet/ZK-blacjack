// Sound System - Web Audio API based (no external files needed)
// Generates casino sounds programmatically for lightweight performance

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ─── Helper: Create oscillator with envelope ──────────────────
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.15,
  attack: number = 0.005,
  decay: number = 0.1,
  detune: number = 0
) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Silently fail if audio context not available
  }
}

// ─── Helper: White noise burst ───────────────────────────────
function playNoise(duration: number, volume: number = 0.1, filterFreq: number = 3000) {
  try {
    const ctx = getAudioContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = filterFreq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(ctx.currentTime);
    source.stop(ctx.currentTime + duration);
  } catch {
    // Silently fail
  }
}

// ─── Sound Effects ────────────────────────────────────────────

export function playCardDeal() {
  // Short snap/click - like a card being slapped on the table
  playNoise(0.06, 0.12, 2000);
  playTone(800, 0.04, 'square', 0.03, 0.001, 0.02);
}

export function playCardFlip() {
  // Quick whoosh + snap - card being turned over
  playNoise(0.08, 0.08, 1500);
  playTone(600, 0.05, 'triangle', 0.06, 0.002, 0.03);
  setTimeout(() => playTone(1200, 0.03, 'square', 0.02, 0.001, 0.01), 30);
}

export function playChipClick() {
  // Coin clink - short metallic ping
  playTone(2400, 0.08, 'sine', 0.1, 0.002, 0.04);
  playTone(3600, 0.05, 'sine', 0.05, 0.001, 0.02);
}

export function playChipStack() {
  // Multiple chip stacking sound
  playTone(1800, 0.06, 'sine', 0.08, 0.002, 0.03);
  setTimeout(() => playTone(2200, 0.05, 'sine', 0.06, 0.002, 0.025), 40);
  setTimeout(() => playTone(2600, 0.04, 'sine', 0.04, 0.001, 0.02), 70);
}

export function playWin() {
  // Ascending chime - two quick happy tones
  playTone(523, 0.15, 'sine', 0.12, 0.01, 0.08); // C5
  setTimeout(() => playTone(659, 0.15, 'sine', 0.12, 0.01, 0.08), 100); // E5
  setTimeout(() => playTone(784, 0.25, 'sine', 0.1, 0.01, 0.12), 200); // G5
}

export function playLose() {
  // Descending sad tone
  playTone(400, 0.2, 'sine', 0.1, 0.01, 0.1);
  setTimeout(() => playTone(300, 0.3, 'sine', 0.08, 0.01, 0.15), 150);
}

export function playBlackjack() {
  // Fanfare! Three ascending tones with sustain
  playTone(523, 0.2, 'sine', 0.15, 0.01, 0.1); // C5
  setTimeout(() => playTone(659, 0.2, 'sine', 0.15, 0.01, 0.1), 120); // E5
  setTimeout(() => playTone(784, 0.2, 'sine', 0.15, 0.01, 0.1), 240); // G5
  setTimeout(() => {
    playTone(1047, 0.4, 'sine', 0.12, 0.01, 0.2); // C6 - high note
    playTone(1047, 0.4, 'triangle', 0.05, 0.01, 0.2); // shimmer
  }, 360);
}

export function playBust() {
  // Low thud + descending buzz
  playTone(100, 0.2, 'sawtooth', 0.08, 0.005, 0.1);
  playNoise(0.15, 0.06, 500);
  setTimeout(() => playTone(80, 0.15, 'sine', 0.06, 0.005, 0.08), 80);
}

export function playPush() {
  // Neutral ding
  playTone(600, 0.12, 'sine', 0.08, 0.005, 0.06);
  setTimeout(() => playTone(600, 0.12, 'sine', 0.06, 0.005, 0.06), 120);
}

export function playButtonClick() {
  // Subtle tick
  playTone(1800, 0.03, 'sine', 0.04, 0.001, 0.01);
}

export function playSurrender() {
  // Soft descending whistle
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Silently fail
  }
}

export function playDoubleDown() {
  // Quick double tap
  playTone(800, 0.06, 'triangle', 0.08, 0.003, 0.03);
  setTimeout(() => playTone(1000, 0.06, 'triangle', 0.08, 0.003, 0.03), 60);
  setTimeout(() => playChipStack(), 100);
}

export function playSplit() {
  // Two quick separate sounds
  playTone(700, 0.06, 'sine', 0.1, 0.003, 0.03);
  setTimeout(() => playTone(900, 0.06, 'sine', 0.1, 0.003, 0.03), 80);
  setTimeout(() => playTone(1100, 0.08, 'sine', 0.08, 0.003, 0.04), 160);
}

// ─── Sound Manager Hook ───────────────────────────────────────
// Simple global state for sound on/off

let _soundEnabled = true;

export function isSoundEnabled(): boolean {
  return _soundEnabled;
}

export function setSoundEnabled(enabled: boolean) {
  _soundEnabled = enabled;
}

export function toggleSound(): boolean {
  _soundEnabled = !_soundEnabled;
  return _soundEnabled;
}

// Safe play - only plays if sound is enabled
export function safePlay(soundFn: () => void) {
  if (_soundEnabled) {
    try {
      soundFn();
    } catch {
      // Silently fail
    }
  }
}
