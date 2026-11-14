import React, { Suspense, lazy, useState } from 'react';
import { playClickSound } from '../utils/sound';

const CandleDictionary = lazy(() =>
  import('./CandleDictionary').then((m) => ({ default: m.CandleDictionary }))
);
const ShapeDictionary = lazy(() =>
  import('./ShapeCard').then((m) => ({ default: m.ShapeDictionary }))
);

export const LearnView: React.FC = () => {
  const [section, setSection] = useState<'candles' | 'shapes'>('candles');

  return (
    <section className="w-full max-w-4xl mx-auto space-y-4 animate-page-in">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Seekho: Candles &amp; Price Shapes
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400">
          Intraday charts padhne ke liye sabhi candlestick patterns aur price shapes simple Hinglish mein
        </p>
      </div>

      <div className="inline-flex rounded-full border border-slate-200 dark:border-[#D4AF37]/25 bg-white dark:bg-[#101013] p-1 gap-1">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setSection('candles');
          }}
          className={`min-h-[44px] px-5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            section === 'candles'
              ? 'gold-cta font-bold'
              : 'text-slate-600 dark:text-[#A89F8D]'
          }`}
        >
          Candle Dictionary
        </button>
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setSection('shapes');
          }}
          className={`min-h-[44px] px-5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            section === 'shapes'
              ? 'gold-cta font-bold'
              : 'text-slate-600 dark:text-[#A89F8D]'
          }`}
        >
          Price Shapes
        </button>
      </div>

      <Suspense
        fallback={
          <div className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-6 text-center text-xs text-slate-500 dark:text-neutral-400">
            Dictionary load ho rahi hai…
          </div>
        }
      >
        {section === 'candles' ? <CandleDictionary /> : <ShapeDictionary />}
      </Suspense>
    </section>
  );
};
