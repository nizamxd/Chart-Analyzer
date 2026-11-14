import React, { useEffect, useState } from 'react';
import type { TimeframeOption } from '../types/chart';
import { APP_NAME, APP_VERSION, CREATOR_CREDIT } from '../config';

const PROGRESS_MESSAGES = [
  'Candles padh raha hoon…',
  'Candle patterns pehchan raha hoon…',
  'Support/Resistance nikaal raha hoon…',
  'Trendline bana raha hoon…',
];

interface AnalysisLoaderProps {
  selectedTimeframe: TimeframeOption;
}

export const AnalysisLoader: React.FC<AnalysisLoaderProps> = ({ selectedTimeframe }) => {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIdx((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 1600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-5 animate-page-in">
      <div className="rounded-3xl border border-[#D4AF37]/25 bg-white dark:bg-[#101013] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Self-drawing animated mini candlestick chart in Black & Gold */}
          <div className="relative h-28 w-40 shrink-0 rounded-2xl bg-[#070708] border border-[#D4AF37]/30 p-3 overflow-hidden">
            <svg
              viewBox="0 0 160 100"
              className="h-full w-full"
              role="img"
              aria-label="Animated candlestick analysis loader"
            >
              <g stroke="rgba(212,175,55,0.09)" strokeWidth="1">
                <line x1="8" y1="25" x2="152" y2="25" />
                <line x1="8" y1="50" x2="152" y2="50" />
                <line x1="8" y1="75" x2="152" y2="75" />
              </g>

              <g className="animate-candle-rise" style={{ animationDelay: '0ms' }}>
                <line x1="24" y1="44" x2="24" y2="82" stroke="#D4AF37" strokeOpacity="0.65" strokeWidth="2" />
                <rect x="19" y="54" width="10" height="20" rx="2" fill="#D4AF37" fillOpacity="0.55" />
              </g>
              <g className="animate-candle-rise" style={{ animationDelay: '180ms' }}>
                <line x1="52" y1="36" x2="52" y2="74" stroke="#FF4D1F" strokeWidth="2" />
                <rect x="47" y="44" width="10" height="18" rx="2" fill="#FF4D1F" />
              </g>
              <g className="animate-candle-rise" style={{ animationDelay: '360ms' }}>
                <line x1="80" y1="28" x2="80" y2="68" stroke="#D4AF37" strokeWidth="2" />
                <rect x="75" y="36" width="10" height="22" rx="2" fill="#D4AF37" fillOpacity="0.85" />
              </g>
              <g className="animate-candle-rise" style={{ animationDelay: '540ms' }}>
                <line x1="108" y1="20" x2="108" y2="58" stroke="#F5D061" strokeWidth="2" />
                <rect x="103" y="28" width="10" height="20" rx="2" fill="#F5D061" />
              </g>
              <g className="animate-candle-rise" style={{ animationDelay: '720ms' }}>
                <line x1="136" y1="12" x2="136" y2="50" stroke="#1DDB04" strokeWidth="2.2" />
                <rect x="131" y="18" width="10" height="22" rx="2" fill="#1DDB04" />
              </g>

              <path
                d="M 18 76 L 52 62 L 80 54 L 108 38 L 140 20"
                fill="none"
                stroke="#F5D061"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-draw-loop"
              />
            </svg>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <p className="text-xs font-semibold text-[#9A6F18] dark:text-[#D4AF37]">
              {APP_NAME} v{APP_VERSION} · {selectedTimeframe === 'Auto' ? 'Auto Timeframe' : selectedTimeframe}
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#FAF4E4]">
              {PROGRESS_MESSAGES[stepIdx]}
            </h2>
            <p className="text-xs text-slate-600 dark:text-[#A89F8D]">
              Har candle ka naam, price shape aur support/resistance levels taiyaar ho rahe hain…
            </p>

            <div className="pt-1.5 grid grid-cols-4 gap-2 max-w-sm mx-auto sm:mx-0">
              {PROGRESS_MESSAGES.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-colors duration-300 ${
                    i <= stepIdx ? 'bg-[#D4AF37]' : 'bg-slate-200 dark:bg-white/10'
                  }`}
                />
              ))}
            </div>

            <p className="pt-1 text-[11px] text-slate-500 dark:text-[#968D7C]">{CREATOR_CREDIT}</p>
          </div>
        </div>
      </div>

      {/* Skeleton Result Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-6 rounded-3xl border border-[#D4AF37]/15 bg-white dark:bg-[#101013] p-4 space-y-3">
          <div className="h-[260px] sm:h-[340px] w-full rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-10 flex-1 rounded-full bg-slate-100 dark:bg-white/5 animate-pulse" />
            <div className="h-10 flex-1 rounded-full bg-slate-100 dark:bg-white/5 animate-pulse" />
          </div>
        </div>
        <div className="lg:col-span-6 space-y-4">
          {[140, 130, 150].map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}px` }}
              className="rounded-3xl border border-[#D4AF37]/15 bg-white dark:bg-[#101013] p-5 space-y-3"
            >
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
              <div className="h-6 w-48 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
              <div className="h-4 w-full rounded bg-slate-100 dark:bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
