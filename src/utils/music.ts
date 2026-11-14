// Generative ambient background soundtrack using Web Audio API (zero external audio files)
// Warm slow detuned pad (Am9 -> Fmaj7 -> Cmaj7 -> G6) + sparse A minor pentatonic bell melody + ConvolverNode reverb

const STORAGE_MUSIC_ON = 'chart-analyzer-music';
const STORAGE_MUSIC_VOL = 'chart-analyzer-music-vol';
const STORAGE_STARTED = 'chart-analyzer-started';

// A minor 9, Fmaj7, Cmaj7, G6 frequencies (Hz)
const CHORD_PROGRESSION: number[][] = [
  [220.0, 261.63, 329.63, 392.0, 493.88], // Am9
  [174.61, 220.0, 261.63, 329.63],        // Fmaj7
  [130.81, 196.0, 246.94, 329.63],        // Cmaj7
  [196.0, 246.94, 293.66, 329.63],        // G6
];

// A minor pentatonic bell melody notes (Hz)
const PENTATONIC_BELLS = [440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let reverbNode: ConvolverNode | null = null;
let dryGain: GainNode | null = null;
let wetGain: GainNode | null = null;

let isPlaying = false;
let isDucked = false;
let chordIndex = 0;
let chordTimer: ReturnType<typeof setTimeout> | null = null;
let bellTimer: ReturnType<typeof setTimeout> | null = null;
let stopCleanupTimer: ReturnType<typeof setTimeout> | null = null;

const activeNodes = new Set<AudioNode>();

let musicEnabled =
  typeof window !== 'undefined' ? localStorage.getItem(STORAGE_MUSIC_ON) !== 'off' : true;

let userVolume = (() => {
  if (typeof window === 'undefined') return 0.75;
  const raw = Number(localStorage.getItem(STORAGE_MUSIC_VOL));
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 0.75;
})();

function effectiveTargetGain(): number {
  if (!musicEnabled) return 0.0001;
  // Base master ceiling ~0.12 for calm, never-loud background listening
  const base = 0.12 * userVolume;
  return Math.max(0.0001, isDucked ? base * 0.3 : base);
}

function createImpulseResponse(context: AudioContext, duration = 2.8, decay = 2.6): AudioBuffer {
  const rate = context.sampleRate;
  const length = Math.floor(rate * duration);
  const impulse = context.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function ensureAudioGraph(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;

  if (!ctx) {
    ctx = new Ctx();
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);

    dryGain = ctx.createGain();
    dryGain.gain.setValueAtTime(0.62, ctx.currentTime);

    wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(0.48, ctx.currentTime);

    reverbNode = ctx.createConvolver();
    reverbNode.buffer = createImpulseResponse(ctx, 2.8, 2.6);

    dryGain.connect(masterGain);
    reverbNode.connect(wetGain);
    wetGain.connect(masterGain);
    masterGain.connect(ctx.destination);
  }

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function scheduleNextChord(): void {
  if (!isPlaying || !ctx || !dryGain || !reverbNode) return;

  const chord = CHORD_PROGRESSION[chordIndex % CHORD_PROGRESSION.length];
  chordIndex = (chordIndex + 1) % CHORD_PROGRESSION.length;

  const now = ctx.currentTime;
  const attack = 4.2 + Math.random() * 1.4; // 4-5.6s smooth attack
  const sustain = 2.4;
  const release = 4.4 + Math.random() * 1.4; // 4.4-5.8s smooth release
  const totalDur = attack + sustain + release;

  const chordBus = ctx.createGain();
  chordBus.gain.setValueAtTime(0.0001, now);
  chordBus.gain.linearRampToValueAtTime(0.28 / chord.length, now + attack);
  chordBus.gain.setValueAtTime(0.28 / chord.length, now + attack + sustain);
  chordBus.gain.exponentialRampToValueAtTime(0.0001, now + totalDur);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(520 + Math.random() * 140, now);
  filter.Q.setValueAtTime(0.7, now);

  chordBus.connect(filter);
  filter.connect(dryGain);
  filter.connect(reverbNode);

  const oscs: OscillatorNode[] = [];
  chord.forEach((freq, idx) => {
    if (!ctx) return;
    // Two slightly detuned warm oscillators (sine + triangle)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);
    osc1.detune.setValueAtTime(-5 + (idx % 2) * 2, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq, now);
    osc2.detune.setValueAtTime(5 - (idx % 2) * 2, now);

    const mix2 = ctx.createGain();
    mix2.gain.setValueAtTime(0.25, now);

    osc1.connect(chordBus);
    osc2.connect(mix2);
    mix2.connect(chordBus);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + totalDur + 0.1);
    osc2.stop(now + totalDur + 0.1);

    activeNodes.add(osc1);
    activeNodes.add(osc2);
    oscs.push(osc1, osc2);
  });

  setTimeout(() => {
    oscs.forEach((o) => {
      try {
        o.disconnect();
      } catch {
        // Ignore
      }
      activeNodes.delete(o);
    });
    try {
      filter.disconnect();
      chordBus.disconnect();
    } catch {
      // Ignore
    }
  }, (totalDur + 0.3) * 1000);

  // Overlap next chord smoothly during release tail
  const nextStepMs = (attack + sustain + 1.2) * 1000;
  chordTimer = setTimeout(scheduleNextChord, nextStepMs);
}

function scheduleNextBell(): void {
  if (!isPlaying || !ctx || !dryGain || !reverbNode) return;

  const now = ctx.currentTime;
  const freq = PENTATONIC_BELLS[Math.floor(Math.random() * PENTATONIC_BELLS.length)];

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = Math.random() > 0.4 ? 'sine' : 'triangle';
  osc.frequency.setValueAtTime(freq, now);

  const peak = 0.14 + Math.random() * 0.08;
  const decaySec = 2.2 + Math.random() * 1.1;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.035);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + decaySec);

  osc.connect(gain);
  gain.connect(dryGain);
  gain.connect(reverbNode);

  osc.start(now);
  osc.stop(now + decaySec + 0.05);
  activeNodes.add(osc);

  setTimeout(() => {
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {
      // Ignore
    }
    activeNodes.delete(osc);
  }, (decaySec + 0.2) * 1000);

  // Randomized 1.5s - 3.0s interval so it never loops repetitively
  const delayMs = 1500 + Math.random() * 1500;
  bellTimer = setTimeout(scheduleNextBell, delayMs);
}

function clearTimers(): void {
  if (chordTimer) {
    clearTimeout(chordTimer);
    chordTimer = null;
  }
  if (bellTimer) {
    clearTimeout(bellTimer);
    bellTimer = null;
  }
  if (stopCleanupTimer) {
    clearTimeout(stopCleanupTimer);
    stopCleanupTimer = null;
  }
}

function stopAndCleanupNodesImmediate(): void {
  activeNodes.forEach((node) => {
    try {
      if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
        (node as OscillatorNode).stop();
      }
      node.disconnect();
    } catch {
      // Ignore already stopped
    }
  });
  activeNodes.clear();
}

export function startBackgroundMusic(fadeSeconds = 3.0): void {
  markUserStarted();
  if (!musicEnabled || (typeof document !== 'undefined' && document.hidden)) return;

  const context = ensureAudioGraph();
  if (!context || !masterGain) return;

  clearTimers();

  const now = context.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value), now);
  masterGain.gain.linearRampToValueAtTime(effectiveTargetGain(), now + fadeSeconds);

  if (!isPlaying) {
    isPlaying = true;
    scheduleNextChord();
    bellTimer = setTimeout(scheduleNextBell, 900 + Math.random() * 900);
  }
}

export function stopBackgroundMusic(fadeSeconds = 1.0): void {
  clearTimers();
  if (!isPlaying) return;
  isPlaying = false;

  if (ctx && masterGain) {
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value), now);
    masterGain.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);

    stopCleanupTimer = setTimeout(() => {
      stopAndCleanupNodesImmediate();
      if (ctx && ctx.state === 'running' && !isPlaying) {
        ctx.suspend().catch(() => {});
      }
    }, Math.ceil(fadeSeconds * 1000) + 120);
  } else {
    stopAndCleanupNodesImmediate();
  }
}

export function isMusicEnabled(): boolean {
  return musicEnabled;
}

export function setMusicEnabled(enabled: boolean): void {
  musicEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_MUSIC_ON, enabled ? 'on' : 'off');
  }
  if (enabled) {
    startBackgroundMusic(2.0);
  } else {
    stopBackgroundMusic(1.0);
  }
}

export function getMusicVolume(): number {
  return userVolume;
}

export function setMusicVolume(vol: number): void {
  userVolume = Math.max(0, Math.min(1, vol));
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_MUSIC_VOL, String(userVolume));
  }
  if (ctx && masterGain && isPlaying) {
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value), now);
    masterGain.gain.linearRampToValueAtTime(effectiveTargetGain(), now + 0.25);
  }
}

export function setMusicDucking(ducked: boolean): void {
  isDucked = ducked;
  if (ctx && masterGain && isPlaying) {
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(Math.max(0.0001, masterGain.gain.value), now);
    masterGain.gain.linearRampToValueAtTime(effectiveTargetGain(), now + 0.5);
  }
}

export function hasUserStartedBefore(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_STARTED) === '1';
}

export function markUserStarted(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_STARTED, '1');
  }
}

// Auto-pause on background & resume with fade on foreground return
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (isPlaying) {
        stopBackgroundMusic(0.8);
      }
    } else if (musicEnabled && hasUserStartedBefore()) {
      startBackgroundMusic(2.2);
    }
  });
}
