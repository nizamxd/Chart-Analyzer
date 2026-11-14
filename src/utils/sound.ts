// Web Audio API synthesizer + optional mobile haptic feedback (zero external audio files)

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('chart-analyzer-sound');
  if (saved === 'off') {
    soundEnabled = false;
  }
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined' || !soundEnabled) return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function triggerHaptic(ms = 10): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(ms);
    } catch {
      // Ignore on unsupported devices
    }
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('chart-analyzer-sound', enabled ? 'on' : 'off');
  }
}

/** Very soft short 40ms UI tick + 10ms haptic tap */
export function playClickSound(): void {
  triggerHaptic(10);
  const ctx = getContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.035);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.042);
  } catch {
    // Ignore audio errors
  }
}

/** Gentle 3-note ascending chime (~0.15 volume, soft sine/triangle) for splash/open */
export function playWelcomeChime(): void {
  const ctx = getContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5 - E5 - G5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.11;

      osc.type = idx === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.68);
    });
  } catch {
    // Ignore autoplay restrictions
  }
}

/** Two soft ascending notes when analysis succeeds */
export function playSuccessChime(): void {
  triggerHaptic(15);
  const ctx = getContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [587.33, 880]; // D5 - A5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.1;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.13, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.42);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.45);
    });
  } catch {
    // Ignore
  }
}

/** Soft low error tone on failure */
export function playErrorTone(): void {
  triggerHaptic(25);
  const ctx = getContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.22);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    // Ignore
  }
}
