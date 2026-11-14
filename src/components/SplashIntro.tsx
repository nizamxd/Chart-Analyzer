import React, { useEffect, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { hasUserStartedBefore, startBackgroundMusic } from '../utils/music';
import { playClickSound, playWelcomeChime } from '../utils/sound';
import { BrandLogo, CreatorAvatar } from './BrandLogo';
import { APP_NAME, APP_VERSION, CREATOR_CREDIT } from '../config';

interface SplashIntroProps {
  onDone: () => void;
}

export const SplashIntro: React.FC<SplashIntroProps> = ({ onDone }) => {
  const [fadingOut, setFadingOut] = useState(false);
  const [ctaReady, setCtaReady] = useState(false);
  const returningUser = hasUserStartedBefore();

  useEffect(() => {
    const readyTimer = setTimeout(() => setCtaReady(true), 1050);

    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    let doneTimer: ReturnType<typeof setTimeout> | undefined;
    if (returningUser) {
      fadeTimer = setTimeout(() => setFadingOut(true), 1850);
      doneTimer = setTimeout(() => onDone(), 2150);
    }

    return () => {
      clearTimeout(readyTimer);
      if (fadeTimer) clearTimeout(fadeTimer);
      if (doneTimer) clearTimeout(doneTimer);
    };
  }, [onDone, returningUser]);

  const handleStart = () => {
    if (fadingOut) return;
    playClickSound();
    playWelcomeChime();
    startBackgroundMusic(3.0);
    setFadingOut(true);
    setTimeout(onDone, 240);
  };

  return (
    <div
      onClick={handleStart}
      role="presentation"
      className={`fixed inset-0 z-50 overflow-hidden flex flex-col items-center justify-center bg-[#070708] trading-grid-bg text-[#FAF4E4] transition-opacity duration-300 cursor-pointer px-4 sm:px-6 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle static radial gold glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-80 w-96 max-w-full rounded-full opacity-25"
        style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.38) 0%, transparent 70%)' }}
      />

      <div className="relative flex flex-col items-center gap-6 text-center max-w-sm w-full animate-splash-in">
        {/* Custom Black & Gold Logo */}
        <div className="rounded-3xl p-1 bg-gradient-to-br from-[#FCE79C]/40 via-[#D4AF37]/20 to-transparent shadow-[0_12px_40px_rgba(212,175,55,0.18)]">
          <BrandLogo size={88} />
        </div>

        {/* Self-drawing Black & Gold candlestick SVG */}
        <div className="w-48 h-20 rounded-2xl bg-[#101013] border border-[#D4AF37]/25 px-4 py-2 flex items-center justify-center">
          <svg viewBox="0 0 180 64" className="w-full h-full">
            <path
              d="M 14 48 L 52 38 L 90 42 L 128 24 L 164 12"
              fill="none"
              stroke="rgba(212, 175, 55, 0.5)"
              strokeWidth="2"
              strokeLinecap="round"
              className="animate-draw-shape"
            />
            <line x1="34" y1="24" x2="34" y2="52" stroke="#FF4D1F" strokeWidth="2" strokeLinecap="round" />
            <rect x="27" y="30" width="14" height="15" rx="2.5" fill="#FF4D1F" />

            <line x1="74" y1="20" x2="74" y2="50" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
            <rect x="67" y="26" width="14" height="17" rx="2.5" fill="#D4AF37" />

            <line x1="114" y1="12" x2="114" y2="40" stroke="#F5D061" strokeWidth="2" strokeLinecap="round" />
            <rect x="107" y="18" width="14" height="16" rx="2.5" fill="#F5D061" />

            <line x1="152" y1="6" x2="152" y2="30" stroke="#1DDB04" strokeWidth="2" strokeLinecap="round" />
            <rect x="145" y="10" width="14" height="15" rx="2.5" fill="#1DDB04" />
          </svg>
        </div>

        <div className="space-y-1.5">
          <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-wide gold-gradient-text">
            {APP_NAME}
          </h1>
          <p className="text-xs font-medium text-[#D4AF37]">
            Black &amp; Gold Trading Suite · v{APP_VERSION}
          </p>
        </div>

        {/* Creator Profile Attribution */}
        <div className="inline-flex items-center gap-2.5 rounded-2xl border border-[#D4AF37]/25 bg-[#101013] px-3.5 py-2">
          <CreatorAvatar sizeClass="h-8 w-8" />
          <div className="text-left">
            <p className="text-xs font-bold text-[#FAF4E4]">{CREATOR_CREDIT}</p>
            <p className="text-[10px] text-[#A89F8D]">Educational Intraday Terminal</p>
          </div>
        </div>

        <div
          className={`w-full transition-all duration-300 ${
            ctaReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStart();
            }}
            className="w-full min-h-[52px] inline-flex items-center justify-center gap-2 rounded-full gold-cta active:scale-[0.98] px-6 text-sm font-bold shadow-[0_8px_28px_rgba(212,175,55,0.25)] transition-transform cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Tap karo, shuru karein</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-2.5 text-[11px] text-[#8C8474]">
            Ambient sound aur crisp chart markings ke liye tap karein
          </p>
        </div>
      </div>
    </div>
  );
};
