import { useEffect, useState } from 'react';

/**
 * Monitors frame rate and automatically activates "Smooth mode"
 * if frame rate drops below 40 fps for ~2 seconds on mid-range devices.
 */
export function useSmoothMode(): boolean {
  const [smoothMode, setSmoothMode] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSmoothMode(true);
      document.documentElement.classList.add('smooth-mode');
      return;
    }

    let rafId = 0;
    let frames = 0;
    let windowStart = performance.now();
    let lowFpsSeconds = 0;

    const tick = (now: number) => {
      frames++;
      const elapsed = now - windowStart;
      if (elapsed >= 1000) {
        const fps = (frames * 1000) / elapsed;
        frames = 0;
        windowStart = now;

        if (fps < 40) {
          lowFpsSeconds += elapsed / 1000;
          if (lowFpsSeconds >= 2) {
            setSmoothMode(true);
            document.documentElement.classList.add('smooth-mode');
            return; // Keep smooth mode locked once activated
          }
        } else {
          lowFpsSeconds = Math.max(0, lowFpsSeconds - 0.5);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return smoothMode;
}
