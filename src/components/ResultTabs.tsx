import React, { Suspense, lazy, useEffect, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Compass,
  CandlestickChart,
  Target,
  AlertTriangle,
  GraduationCap,
  ShieldCheck,
  Layers,
  Clock,
  CheckCircle2,
  BookOpen,
  Copy,
  Check,
} from 'lucide-react';
import type {
  BiasType,
  ChartAnalysis,
  DetectedCandle,
  LevelStrength,
  PriceShape,
  VerdictDirection,
} from '../types/chart';
import { ShapeCard } from './ShapeCard';
import { CandlePatternCard } from './CandlePatternCard';
import { playClickSound } from '../utils/sound';
import { BrandLogo, CreatorAvatar } from './BrandLogo';
import {
  APP_NAME,
  APP_VERSION,
  COPYRIGHT_NOTICE,
  CREATOR_CREDIT,
  EDUCATIONAL_DISCLAIMER,
} from '../config';

const CandleDictionary = lazy(() =>
  import('./CandleDictionary').then((m) => ({ default: m.CandleDictionary }))
);
const ShapeDictionary = lazy(() =>
  import('./ShapeCard').then((m) => ({ default: m.ShapeDictionary }))
);

export type ResultTabKey = 'overview' | 'candles' | 'shapes' | 'levels' | 'setup' | 'seekho';
export type PlanChoice = 'recommended' | 'bullish' | 'bearish';

const TAB_ITEMS: Array<{ key: ResultTabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'candles', label: 'Candles' },
  { key: 'shapes', label: 'Shapes' },
  { key: 'levels', label: 'Levels' },
  { key: 'setup', label: 'Trade Setup' },
  { key: 'seekho', label: 'Seekho' },
];

interface ResultTabsProps {
  analysis: ChartAnalysis;
  imageSrc: string;
  activeTab: ResultTabKey;
  onTabChange: (tab: ResultTabKey) => void;
  selectedPlan: PlanChoice;
  onPlanChange: (plan: PlanChoice) => void;
  highlightedCandleIndex: number | null;
  onFocusCandle: (candle: DetectedCandle) => void;
  onFlashShape: (shape: PriceShape) => void;
}

function getVerdictStyle(direction: VerdictDirection) {
  if (direction === 'BULLISH') {
    return {
      badge: 'bg-[#1DDB04] text-black',
      bar: 'bg-[#1DDB04]',
      text: 'text-[#1DDB04] dark:text-[#1DDB04]',
      Icon: TrendingUp,
      label: 'BULLISH (Tezi)',
    };
  }
  if (direction === 'BEARISH') {
    return {
      badge: 'bg-[#FF4D1F] text-white',
      bar: 'bg-[#FF4D1F]',
      text: 'text-[#FF4D1F]',
      Icon: TrendingDown,
      label: 'BEARISH (Mandi)',
    };
  }
  return {
    badge: 'bg-[#FBBF24] text-black',
    bar: 'bg-[#FBBF24]',
    text: 'text-[#D97706] dark:text-[#FBBF24]',
    Icon: Minus,
    label: 'SIDEWAYS (Range)',
  };
}

function getBiasBadge(bias: BiasType) {
  if (bias === 'bullish') return 'bg-[#1DDB04]/15 text-[#1DDB04] dark:text-[#1DDB04]';
  if (bias === 'bearish') return 'bg-[#FF4D1F]/15 text-[#FF4D1F]';
  return 'bg-[#FBBF24]/15 text-[#D97706] dark:text-[#FBBF24]';
}

function getBiasText(bias: BiasType) {
  if (bias === 'bullish') return 'Bullish';
  if (bias === 'bearish') return 'Bearish';
  return 'Neutral';
}

function getStrengthText(strength: LevelStrength) {
  if (strength === 'strong') return 'Strong';
  if (strength === 'medium') return 'Medium';
  return 'Weak';
}

export const ResultTabs: React.FC<ResultTabsProps> = ({
  analysis,
  imageSrc,
  activeTab,
  onTabChange,
  selectedPlan,
  onPlanChange,
  highlightedCandleIndex,
  onFocusCandle,
  onFlashShape,
}) => {
  const candleRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [reportCopied, setReportCopied] = React.useState(false);

  useEffect(() => {
    if (activeTab === 'candles' && highlightedCandleIndex !== null) {
      const el = candleRefs.current.get(highlightedCandleIndex);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeTab, highlightedCandleIndex]);

  const verdict = getVerdictStyle(analysis.verdict.direction);
  const VerdictIcon = verdict.Icon;
  const confidence = Math.max(0, Math.min(100, Math.round(analysis.verdict.confidence || 0)));
  const bullishPct = Math.max(0, Math.min(100, Math.round(analysis.verdict.bullish_percent ?? 50)));
  const bearishPct = 100 - bullishPct;

  const shapes = Array.isArray(analysis.shapes) ? analysis.shapes : [];
  const primaryShape = shapes.find((s) => s.is_primary) || shapes[0] || null;
  const candles = Array.isArray(analysis.candles) ? analysis.candles : [];

  const activeSetupData =
    selectedPlan === 'bullish' && analysis.trade_setup.bullish_plan
      ? {
          sideLabel: 'BULLISH PLAN (Educational)',
          entry_zone: analysis.trade_setup.bullish_plan.entry_zone,
          stop_loss: analysis.trade_setup.bullish_plan.stop_loss,
          target1: analysis.trade_setup.bullish_plan.target1,
          target2: analysis.trade_setup.bullish_plan.target2,
          risk_reward: analysis.trade_setup.bullish_plan.risk_reward,
          when_valid: analysis.trade_setup.bullish_plan.when_valid_hinglish,
          avoid_when: analysis.trade_setup.bullish_plan.avoid_when_hinglish,
        }
      : selectedPlan === 'bearish' && analysis.trade_setup.bearish_plan
        ? {
            sideLabel: 'BEARISH PLAN (Educational)',
            entry_zone: analysis.trade_setup.bearish_plan.entry_zone,
            stop_loss: analysis.trade_setup.bearish_plan.stop_loss,
            target1: analysis.trade_setup.bearish_plan.target1,
            target2: analysis.trade_setup.bearish_plan.target2,
            risk_reward: analysis.trade_setup.bearish_plan.risk_reward,
            when_valid: analysis.trade_setup.bearish_plan.when_valid_hinglish,
            avoid_when: analysis.trade_setup.bearish_plan.avoid_when_hinglish,
          }
        : {
            sideLabel: analysis.trade_setup.side,
            entry_zone: analysis.trade_setup.entry_zone,
            stop_loss: analysis.trade_setup.stop_loss,
            target1: analysis.trade_setup.target1,
            target2: analysis.trade_setup.target2,
            risk_reward: analysis.trade_setup.risk_reward,
            when_valid: '',
            avoid_when: analysis.trade_setup.avoid_when_hinglish,
          };

  const handleCopyReport = async () => {
    playClickSound();
    const text = [
      `${APP_NAME} v${APP_VERSION} — Technical Analysis Report`,
      `${CREATOR_CREDIT}`,
      `Instrument: ${analysis.instrument} (${analysis.timeframe}) · Last Close: ${analysis.last_close}`,
      `Bias: ${analysis.verdict.direction} (${confidence}% confidence · Bullish ${bullishPct}% / Bearish ${bearishPct}%)`,
      `Summary: ${analysis.verdict.summary_hinglish}`,
      `Last Candle: ${analysis.last_candle.name} — ${analysis.last_candle.meaning_hinglish}`,
      `Educational Only: ${EDUCATIONAL_DISCLAIMER}`,
      `${COPYRIGHT_NOTICE}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 2200);
    } catch {
      // Ignore clipboard restriction
    }
  };

  return (
    <div className="space-y-4">
      {/* Branded Report Header */}
      <div className="rounded-3xl border border-[#D4AF37]/30 bg-white dark:bg-[#101013] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <CreatorAvatar sizeClass="h-9 w-9" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-[#F5D061] truncate">
              {CREATOR_CREDIT}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-[#A89F8D] truncate font-numeric">
              Report · {analysis.instrument} ({analysis.timeframe}) · v{analysis.report_meta?.version || APP_VERSION}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyReport}
          className="min-h-[38px] inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/35 bg-slate-50 dark:bg-[#18181C] px-3 text-xs font-semibold text-slate-800 dark:text-[#F5D061] whitespace-nowrap shrink-0 cursor-pointer"
        >
          {reportCopied ? <Check className="h-3.5 w-3.5 text-[#1DDB04]" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{reportCopied ? 'Report Copied' : 'Copy Report'}</span>
        </button>
      </div>

      {/* Segmented Control Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar rounded-2xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] p-1.5">
        {TAB_ITEMS.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                playClickSound();
                onTabChange(t.key);
              }}
              className={`min-h-[44px] flex-1 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'gold-cta font-bold shadow-xs'
                  : 'text-slate-600 dark:text-[#A89F8D] hover:text-slate-900 dark:hover:text-[#FAF4E4]'
              }`}
            >
              {t.label}
              {t.key === 'candles' && candles.length > 0 ? ` (${candles.length})` : ''}
              {t.key === 'shapes' && shapes.length > 0 ? ` (${shapes.length})` : ''}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div key={activeTab} className="space-y-4 animate-page-in">
        {activeTab === 'overview' && (
          <>
            {/* 1. VERDICT */}
            <article className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">
                    1. VERDICT · {analysis.instrument} ({analysis.timeframe})
                  </p>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${verdict.badge}`}
                  >
                    <VerdictIcon className="h-4 w-4" />
                    {verdict.label}
                  </span>
                </div>

                <div className="text-right tabular-nums">
                  <span className="text-xs text-slate-500 dark:text-neutral-400 block">
                    Confidence Score
                  </span>
                  <span className={`text-2xl font-bold ${verdict.text}`}>{confidence}%</span>
                </div>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${verdict.bar}`}
                  style={{ width: `${confidence}%` }}
                />
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-[#0B0B0B] border border-slate-100 dark:border-white/[0.06] p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold tabular-nums">
                  <span className="text-[#1DDB04] dark:text-[#1DDB04]">
                    Bullish: {bullishPct}%
                  </span>
                  <span className="text-[#FF4D1F]">Bearish: {bearishPct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#FF4D1F] flex">
                  <div
                    className="h-full bg-[#1DDB04] transition-all duration-300"
                    style={{ width: `${bullishPct}%` }}
                  />
                </div>
              </div>

              <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-white leading-relaxed">
                {analysis.verdict.summary_hinglish}
              </p>
            </article>

            {/* 2. KYA HO RAHA HAI (Chart ki Kahani) */}
            {analysis.story?.what_is_happening_hinglish && (
              <article className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-5 space-y-2.5">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#1DDB04]" />
                  2. Kya Ho Raha Hai (Chart Ki Kahani)
                </h2>
                <p className="text-sm text-slate-700 dark:text-neutral-200 leading-relaxed">
                  {analysis.story.what_is_happening_hinglish}
                </p>
              </article>
            )}

            {/* 3. NEXT STEP (Next 1-3 Candles + Action) */}
            <article className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2">
                  <Compass className="h-4 w-4 text-[#1DDB04]" />
                  3. Next Step (Agle 1–3 Candles)
                </h2>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-[#1DDB04]">
                  <Clock className="h-3.5 w-3.5" />
                  {analysis.next_candle.timeframe_window}
                </span>
              </div>

              <p className="text-sm text-slate-700 dark:text-neutral-200 leading-relaxed">
                {analysis.next_candle.expectation_hinglish}
              </p>

              {Array.isArray(analysis.next_candle.scenarios) &&
                analysis.next_candle.scenarios.length > 0 && (
                  <div className="divide-y divide-slate-100 dark:divide-white/[0.06] pt-1">
                    {analysis.next_candle.scenarios.map((sc, idx) => (
                      <div key={idx} className="py-2.5 first:pt-1 last:pb-0 space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            {sc.name}
                          </p>
                          <span className="text-xs font-bold text-slate-900 dark:text-[#1DDB04] tabular-nums whitespace-nowrap shrink-0">
                            {sc.probability}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                          {sc.trigger_hinglish}
                        </p>
                        {sc.action_hinglish && (
                          <p className="text-xs font-medium text-slate-800 dark:text-[#1DDB04]">
                            Agar yeh hua to: {sc.action_hinglish}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </article>

            {/* 4. LAST CANDLE */}
            <article className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2">
                  <CandlestickChart className="h-4 w-4 text-[#1DDB04]" />
                  4. Last Candle
                </h2>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getBiasBadge(analysis.last_candle.type)}`}>
                  {getBiasText(analysis.last_candle.type)}
                </span>
              </div>

              <p className="text-base font-bold text-slate-900 dark:text-white">
                {analysis.last_candle.name}
              </p>
              <p className="text-sm text-slate-700 dark:text-neutral-300 leading-relaxed">
                {analysis.last_candle.meaning_hinglish}
              </p>

              {analysis.last_candle.entry_advice_hinglish && (
                <div className="rounded-2xl bg-slate-50 dark:bg-[#0B0B0B] border border-slate-100 dark:border-white/[0.06] p-3.5 space-y-1">
                  <p className="text-xs font-semibold text-slate-900 dark:text-[#1DDB04]">
                    Agar abhi entry le rahe ho / hold kar rahe ho:
                  </p>
                  <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                    {analysis.last_candle.entry_advice_hinglish}
                  </p>
                </div>
              )}
            </article>

            {/* 5. TREND & STRUCTURE */}
            <article className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-5 space-y-2.5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                5. Trend &amp; Market Structure
              </h2>
              <p className="text-xs font-semibold text-slate-700 dark:text-[#1DDB04]">
                {analysis.trend.current} · {analysis.trend.structure}
              </p>
              <p className="text-sm text-slate-700 dark:text-neutral-300 leading-relaxed">
                {analysis.trend.explanation_hinglish}
              </p>
              {analysis.volume_momentum_hinglish && (
                <p className="pt-2 border-t border-slate-100 dark:border-white/[0.06] text-xs text-slate-600 dark:text-neutral-400">
                  <span className="font-semibold text-slate-800 dark:text-neutral-200">
                    Volume &amp; Momentum:
                  </span>{' '}
                  {analysis.volume_momentum_hinglish}
                </p>
              )}
            </article>

            {/* 6. STRONG POINTS & WARNINGS */}
            {(analysis.story?.strong_points?.length > 0 || analysis.story?.warnings?.length > 0) && (
              <article className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-5 space-y-4">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  6. Strong Points &amp; Warnings
                </h2>

                {analysis.story.strong_points?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#1DDB04] dark:text-[#1DDB04]">
                      Strong Confirmations
                    </p>
                    <ul className="space-y-1.5">
                      {analysis.story.strong_points.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-neutral-300 leading-relaxed">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#1DDB04] shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.story.warnings?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                    <p className="text-xs font-semibold text-[#FF4D1F]">
                      Dhyan Rakhne Wali Baatein (Warnings)
                    </p>
                    <ul className="space-y-1.5">
                      {analysis.story.warnings.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-neutral-300 leading-relaxed">
                          <AlertTriangle className="h-3.5 w-3.5 text-[#FF4D1F] shrink-0 mt-0.5" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            )}

            {/* 7. Primary Shape Card */}
            {primaryShape && (
              <ShapeCard
                shape={primaryShape}
                instrument={analysis.instrument}
                timeframe={analysis.timeframe}
                onFlashOnChart={onFlashShape}
                compact
                onOpenShapesTab={() => onTabChange('shapes')}
              />
            )}
          </>
        )}

        {activeTab === 'candles' && (
          <>
            <section className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Named Candles (Left → Right)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Kisi bhi candle par tap karein — chart us candle par zoom ho jayega
                  </p>
                </div>
                <span className="text-xs font-bold text-[#1DDB04] tabular-nums">
                  {candles.length}
                </span>
              </div>

              {candles.length > 0 ? (
                <div className="space-y-4">
                  {candles.map((c) => {
                    const selected = highlightedCandleIndex === c.index;
                    return (
                      <div
                        key={c.index}
                        ref={(el) => {
                          if (el) candleRefs.current.set(c.index, el);
                          else candleRefs.current.delete(c.index);
                        }}
                      >
                        <CandlePatternCard
                          detectedCandle={c}
                          imageSrc={imageSrc}
                          analysis={analysis}
                          onFocusOnChart={onFocusCandle}
                          highlighted={selected}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-neutral-400">
                  Clear individual candle patterns nahi mile — chart ko zoom karke 30–60 candles ke saath try karein.
                </p>
              )}
            </section>

            <Suspense
              fallback={
                <div className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-6 text-center text-xs text-slate-500 dark:text-neutral-400">
                  Patterns load ho rahe hain…
                </div>
              }
            >
              <CandleDictionary
                matchedPatternNames={[
                  analysis.last_candle?.name || '',
                  ...candles.map((c) => c.name),
                  ...(analysis.chart_position?.similar_candlesticks?.map((s) => s.name) || []),
                ].filter(Boolean)}
              />
            </Suspense>
          </>
        )}

        {activeTab === 'shapes' && (
          <>
            {shapes.length > 0 ? (
              <div className="space-y-4">
                {shapes.map((sh, idx) => (
                  <ShapeCard
                    key={`${sh.name}-${idx}`}
                    shape={sh}
                    instrument={analysis.instrument}
                    timeframe={analysis.timeframe}
                    onFlashOnChart={onFlashShape}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-5 text-sm text-slate-600 dark:text-neutral-300">
                Is chart par abhi koi clear price shape nahi bani hai.
              </div>
            )}

            <Suspense
              fallback={
                <div className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-6 text-center text-xs text-slate-500 dark:text-neutral-400">
                  Shapes load ho rahe hain…
                </div>
              }
            >
              <ShapeDictionary
                matchedShapeNames={[
                  ...shapes.map((s) => s.name),
                  ...(analysis.chart_position?.similar_shapes?.map((s) => s.name) || []),
                ].filter(Boolean)}
              />
            </Suspense>
          </>
        )}

        {activeTab === 'levels' && (
          <section className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-5 space-y-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Support &amp; Resistance Levels
            </h2>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#FF4D1F]">
                Resistance (Upar ki rukawat)
              </p>
              {analysis.resistance.length > 0 ? (
                <div className="space-y-2">
                  {analysis.resistance.map((r, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-[#0B0B0B] p-3.5 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                          R{idx + 1} · {r.price_approx}
                        </span>
                        <span className="text-slate-500 dark:text-neutral-400">
                          {getStrengthText(r.strength)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-neutral-300">
                        {r.reason_hinglish}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-neutral-400">Clear resistance nahi dikha.</p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#1DDB04] dark:text-[#1DDB04]">
                Support (Neeche ka sahara)
              </p>
              {analysis.support.length > 0 ? (
                <div className="space-y-2">
                  {analysis.support.map((s, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-[#0B0B0B] p-3.5 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                          S{idx + 1} · {s.price_approx}
                        </span>
                        <span className="text-slate-500 dark:text-neutral-400">
                          {getStrengthText(s.strength)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-neutral-300">
                        {s.reason_hinglish}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-neutral-400">Clear support nahi dikha.</p>
              )}
            </div>

            {analysis.trendlines.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-2">
                <p className="text-xs font-semibold text-[#1DDB04]">Trendlines</p>
                {analysis.trendlines.map((tl, idx) => (
                  <p key={idx} className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                    <span className="font-semibold text-slate-900 dark:text-white capitalize">
                      {tl.type.replace('_', ' ')}:
                    </span>{' '}
                    {tl.explanation_hinglish}
                  </p>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'setup' && (
          <section className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2">
                <Target className="h-4 w-4 text-[#1DDB04]" />
                Trade Setup (Educational Only)
              </h2>
              <span className="text-xs font-bold text-[#1DDB04]">
                {activeSetupData.sideLabel}
              </span>
            </div>

            {/* Plan Switcher: Main vs Bullish vs Bearish */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#0B0B0B] p-1">
              {(
                [
                  { key: 'recommended', label: 'AI Main' },
                  { key: 'bullish', label: 'Bullish Plan' },
                  { key: 'bearish', label: 'Bearish Plan' },
                ] as const
              ).map((p) => {
                const active = selectedPlan === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      onPlanChange(p.key);
                    }}
                    className={`min-h-[38px] flex-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? p.key === 'bearish'
                          ? 'bg-[#FF4D1F] text-white'
                          : 'bg-[#1DDB04] text-black'
                        : 'text-slate-500 dark:text-neutral-400'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {activeSetupData.when_valid && (
              <p className="text-xs text-slate-700 dark:text-neutral-300 leading-relaxed">
                <span className="font-semibold text-slate-900 dark:text-white">Kab valid hai: </span>
                {activeSetupData.when_valid}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 tabular-nums">
              <div className="rounded-2xl bg-slate-50 dark:bg-[#0B0B0B] border border-slate-100 dark:border-white/[0.06] p-3">
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 block">Entry Zone</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {activeSetupData.entry_zone}
                </span>
              </div>
              <div className="rounded-2xl bg-slate-50 dark:bg-[#0B0B0B] border border-slate-100 dark:border-white/[0.06] p-3">
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 block">Stop-Loss</span>
                <span className="text-sm font-bold text-[#FF4D1F]">
                  {activeSetupData.stop_loss}
                </span>
              </div>
              <div className="rounded-2xl bg-slate-50 dark:bg-[#0B0B0B] border border-slate-100 dark:border-white/[0.06] p-3">
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 block">Target 1</span>
                <span className="text-sm font-bold text-[#1DDB04] dark:text-[#1DDB04]">
                  {activeSetupData.target1}
                </span>
              </div>
              <div className="rounded-2xl bg-slate-50 dark:bg-[#0B0B0B] border border-slate-100 dark:border-white/[0.06] p-3">
                <span className="text-[11px] text-slate-500 dark:text-neutral-400 block">Target 2</span>
                <span className="text-sm font-bold text-[#1DDB04] dark:text-[#1DDB04]">
                  {activeSetupData.target2}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs px-1 tabular-nums">
              <span className="text-slate-500 dark:text-neutral-400">Risk : Reward Ratio</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {activeSetupData.risk_reward}
              </span>
            </div>

            {/* Agar tum abhi entry le chuke ho */}
            <div className="rounded-2xl border border-[#1DDB04]/30 bg-[#1DDB04]/10 p-4 space-y-1.5">
              <p className="text-xs font-bold text-slate-900 dark:text-[#1DDB04] inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Agar tum abhi entry le chuke ho
              </p>
              <p className="text-xs text-slate-700 dark:text-neutral-200 leading-relaxed">
                {analysis.trade_setup.holding_advice_hinglish || analysis.last_candle.entry_advice_hinglish}
              </p>
            </div>

            {/* Kab entry NAHI leni chahiye */}
            <div className="rounded-2xl border border-[#FF4D1F]/30 bg-[#FF4D1F]/10 p-4 space-y-1.5">
              <p className="text-xs font-bold text-[#FF4D1F] inline-flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Kab entry NAHI leni chahiye
              </p>
              <p className="text-xs text-slate-700 dark:text-neutral-200 leading-relaxed">
                {activeSetupData.avoid_when}
              </p>
            </div>

            <p className="text-[11px] text-center text-slate-500 dark:text-neutral-400 pt-1">
              Yeh sirf educational analysis hai, financial advice nahi. Hamesha stop-loss lagao.
            </p>
          </section>
        )}

        {activeTab === 'seekho' && (
          <div className="space-y-4">
            <article className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-5 space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-[#1DDB04]" />
                Seekho: Aaj Ka Chart Lesson
              </h2>
              <p className="text-sm text-slate-700 dark:text-neutral-200 leading-relaxed">
                {analysis.beginner_lesson_hinglish}
              </p>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {analysis.candle_colors_detected}
              </p>
            </article>

            {analysis.patterns.length > 0 && (
              <article className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#1DDB04]" />
                  Detected Chart Patterns
                </h3>
                <div className="space-y-2.5">
                  {analysis.patterns.map((p, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl bg-slate-50 dark:bg-[#0B0B0B] border border-slate-100 dark:border-white/[0.06] p-3.5 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {p.name}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getBiasBadge(p.bias)}`}>
                          {getBiasText(p.bias)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                        {p.explanation_hinglish}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            )}
          </div>
        )}
      </div>

      {/* Permanent Report Attribution & Educational Disclaimer */}
      <footer className="rounded-3xl border border-[#D4AF37]/25 bg-white dark:bg-[#101013] p-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BrandLogo size={24} />
            <span className="text-xs font-bold text-slate-900 dark:text-[#F5D061]">
              {CREATOR_CREDIT}
            </span>
          </div>
          <span className="text-[11px] font-numeric text-slate-500 dark:text-[#A89F8D]">
            {APP_NAME} v{analysis.report_meta?.version || APP_VERSION}
          </span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-[#BFB6A4] leading-relaxed">
          {EDUCATIONAL_DISCLAIMER}
        </p>
        <p className="text-[10px] text-slate-400 dark:text-[#8C8474]">
          {COPYRIGHT_NOTICE}
        </p>
      </footer>
    </div>
  );
};
