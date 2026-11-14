import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { findPatternByName, PATTERN_LIBRARY, type OHLC, type PatternDefinition } from '../data/patterns';
import { CandlePatternCard } from './CandlePatternCard';
import { playClickSound } from '../utils/sound';

type DictFilter = 'all' | 'bullish' | 'bearish' | 'continuation' | 'single' | 'double' | 'triple';

const FILTER_OPTIONS: Array<{ key: DictFilter; label: string }> = [
  { key: 'all', label: `All (${PATTERN_LIBRARY.length})` },
  { key: 'bullish', label: 'Bullish' },
  { key: 'bearish', label: 'Bearish' },
  { key: 'continuation', label: 'Continuation' },
  { key: 'single', label: 'Single' },
  { key: 'double', label: 'Double' },
  { key: 'triple', label: 'Triple+' },
];

const INITIAL_WINDOW = 16;
const WINDOW_STEP = 16;

export const MiniOhlcSvg: React.FC<{ candles: OHLC[] }> = React.memo(({ candles }) => {
  const count = candles.length;
  const w = 44;
  const h = 44;
  const padX = 5;
  const padY = 5;
  const step = (w - padX * 2) / Math.max(1, count);
  const bw = Math.min(10, Math.max(4, step * 0.58));
  const mapY = (val: number) => padY + ((100 - val) / 100) * (h - padY * 2);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-11 w-11 shrink-0 rounded-xl bg-[#141414] border border-white/10"
    >
      {candles.map(([o, hi, lo, c], idx) => {
        const cx = padX + step * (idx + 0.5);
        const col = c >= o ? '#1DDB04' : '#FF4D1F';
        const yH = mapY(hi);
        const yL = mapY(lo);
        const yT = mapY(Math.max(o, c));
        const yB = mapY(Math.min(o, c));
        const bh = Math.max(2, yB - yT);
        const isDoji = Math.abs(o - c) < 1.5;

        return (
          <g key={idx}>
            <line x1={cx} y1={yH} x2={cx} y2={yL} stroke={col} strokeWidth="1.5" strokeLinecap="round" />
            {isDoji ? (
              <line x1={cx - bw / 2} y1={yT} x2={cx + bw / 2} y2={yT} stroke={col} strokeWidth="2" />
            ) : (
              <rect x={cx - bw / 2} y={yT} width={bw} height={bh} rx="1.2" fill={col} />
            )}
          </g>
        );
      })}
    </svg>
  );
});

export const CandleDictionary: React.FC<{ matchedPatternNames?: string[] }> = ({
  matchedPatternNames = [],
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DictFilter>('all');
  const [selectedPattern, setSelectedPattern] = useState<PatternDefinition | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_WINDOW);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const normalizedMatchedIds = useMemo(() => {
    const ids = new Set<number>();
    matchedPatternNames.forEach((raw) => {
      const found = findPatternByName(raw);
      if (found) ids.add(found.id);
    });
    return ids;
  }, [matchedPatternNames]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = PATTERN_LIBRARY.filter((p) => {
      if (filter === 'bullish' && p.bias !== 'bullish') return false;
      if (filter === 'bearish' && p.bias !== 'bearish') return false;
      if (filter === 'continuation' && p.role !== 'Continuation') return false;
      if (filter === 'single' && p.candles.length !== 1) return false;
      if (filter === 'double' && p.candles.length !== 2) return false;
      if (filter === 'triple' && p.candles.length < 3) return false;

      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.whatItTellsHinglish.toLowerCase().includes(q) ||
        p.howItFormsHinglish.toLowerCase().includes(q)
      );
    });
    if (normalizedMatchedIds.size === 0) return list;
    return [
      ...list.filter((p) => normalizedMatchedIds.has(p.id)),
      ...list.filter((p) => !normalizedMatchedIds.has(p.id)),
    ];
  }, [query, filter, normalizedMatchedIds]);

  useEffect(() => {
    setVisibleCount(INITIAL_WINDOW);
  }, [query, filter]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visibleCount >= filtered.length || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((prev) => Math.min(filtered.length, prev + WINDOW_STEP));
        }
      },
      { rootMargin: '220px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filtered.length, visibleCount]);

  const visibleItems = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  return (
    <section className="rounded-3xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Candle Dictionary ({PATTERN_LIBRARY.length} Patterns)
          </h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Kisi bhi pattern par tap karke animated OHLC card, Agli Candle guide aur Share PNG dekhein (offline available)
          </p>
        </div>
        {normalizedMatchedIds.size > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 px-3 py-1 text-[11px] font-bold text-[#9A6F18] dark:text-[#F5D061]">
            Chart Se {normalizedMatchedIds.size} Pattern Match
          </span>
        )}
      </div>

      {/* Search & Filter */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 dark:text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pattern search karo (e.g. Hammer, Morning Star, Engulfing)..."
            className="w-full min-h-[48px] rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0B0B] pl-10 pr-4 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-[#1DDB04]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {FILTER_OPTIONS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  playClickSound();
                  setFilter(f.key);
                }}
                className={`min-h-[42px] rounded-full px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#1DDB04] text-black'
                    : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0B0B] text-slate-600 dark:text-neutral-400'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-neutral-400 py-4 text-center">
          Koi matching pattern nahi mila. Search keyword ya filter badal ke dekhein.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleItems.map((p) => {
              const biasColor =
                p.bias === 'bullish'
                  ? 'text-[#1DDB04]'
                  : p.bias === 'bearish'
                    ? 'text-[#FF4D1F]'
                    : 'text-[#FBBF24]';
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setSelectedPattern(p);
                  }}
                  className={`cv-auto flex items-center gap-3 text-left rounded-2xl border active:scale-[0.99] p-3 transition-transform cursor-pointer ${
                    normalizedMatchedIds.has(p.id)
                      ? 'border-[#D4AF37]/70 bg-[#D4AF37]/10 dark:bg-[#D4AF37]/[0.08]'
                      : 'border-slate-100 dark:border-[#D4AF37]/15 bg-slate-50 dark:bg-[#070708] hover:border-[#D4AF37]/50'
                  }`}
                >
                  <MiniOhlcSvg candles={p.candles} />
                  <div className="min-w-0 space-y-0.5 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {p.name}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {normalizedMatchedIds.has(p.id) && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#D4AF37] text-black">
                            Match
                          </span>
                        )}
                        <span className={`text-[10px] font-semibold uppercase ${biasColor}`}>
                          {p.bias}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-neutral-500">
                      {p.role} · {p.candles.length} Candle{p.candles.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-neutral-400 leading-snug line-clamp-2">
                      {p.whatItTellsHinglish}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {visibleCount < filtered.length && (
            <div ref={sentinelRef} className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setVisibleCount((prev) => Math.min(filtered.length, prev + WINDOW_STEP));
                }}
                className="min-h-[44px] rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0B0B] px-5 text-xs font-semibold text-slate-700 dark:text-neutral-200 cursor-pointer"
              >
                Aur Patterns Dekho ({filtered.length - visibleCount} baaki)
              </button>
            </div>
          )}
        </>
      )}

      {/* Full Pattern Card Modal when a pattern is tapped */}
      {selectedPattern && (
        <div
          className="fixed inset-0 z-50 bg-black/85 p-3 sm:p-6 overflow-y-auto flex items-start sm:items-center justify-center animate-page-in"
          onClick={() => setSelectedPattern(null)}
        >
          <div
            className="w-full max-w-xl my-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close pattern card"
              onClick={() => {
                playClickSound();
                setSelectedPattern(null);
              }}
              className="absolute -top-2 -right-2 z-10 h-11 w-11 rounded-full bg-[#141414] border border-white/15 flex items-center justify-center text-white shadow-lg cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            <CandlePatternCard pattern={selectedPattern} />
          </div>
        </div>
      )}
    </section>
  );
};
