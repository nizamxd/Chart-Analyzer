import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Crosshair,
  Maximize2,
  Share2,
  X,
  XCircle,
} from 'lucide-react';
import { findPatternByName, type OHLC, type PatternDefinition } from '../data/patterns';
import type { ChartAnalysis, DetectedCandle } from '../types/chart';
import { cropCandleFromImage, downloadPatternCard } from '../utils/image';
import { playClickSound } from '../utils/sound';

interface PatternIllustrationSvgProps {
  pattern: PatternDefinition;
  compact?: boolean;
  onClick?: () => void;
}

const BULL_COLOR = '#1DDB04';
const BEAR_COLOR = '#FF4D1F';

function getTrendBeforeCandles(trendBefore: PatternDefinition['trendBefore']): OHLC[] {
  if (trendBefore === 'down') {
    return [
      [90, 94, 76, 80],
      [80, 84, 66, 70],
      [70, 74, 56, 60],
    ];
  }
  if (trendBefore === 'up') {
    return [
      [18, 32, 14, 28],
      [28, 44, 24, 40],
      [40, 56, 36, 52],
    ];
  }
  return [
    [45, 56, 40, 50],
    [50, 58, 43, 47],
    [47, 55, 42, 52],
  ];
}

function shortNextLabel(name: string): string {
  const first = name.split('/')[0].split('(')[0].trim();
  if (first.length <= 16) return first;
  return first.replace('Bullish ', 'Bull ').replace('Bearish ', 'Bear ').slice(0, 16);
}

export const PatternIllustrationSvg: React.FC<PatternIllustrationSvgProps> = React.memo(({
  pattern,
  compact = false,
  onClick,
}) => {
  const trendCandles = getTrendBeforeCandles(pattern.trendBefore);
  const patCandles = pattern.candles;
  const lastClose = patCandles[patCandles.length - 1][3];
  const g1Start = Math.max(18, Math.min(72, lastClose));
  const g2Start = Math.max(28, Math.min(82, lastClose));
  const ghostConfirm: OHLC = [g1Start, Math.min(98, g1Start + 22), Math.max(2, g1Start - 2), Math.min(96, g1Start + 18)];
  const ghostFail: OHLC = [g2Start, Math.min(98, g2Start + 2), Math.max(2, g2Start - 22), Math.max(4, g2Start - 18)];

  const svgW = 420;
  const svgH = 220;
  const padX = 20;
  const padTop = 28;
  const padBottom = 38;
  const plotH = svgH - padTop - padBottom;

  const mapY = (price: number) => {
    const clamped = Math.max(0, Math.min(100, price));
    return padTop + ((100 - clamped) / 100) * plotH;
  };

  // Compute slots with slightly extra visual spacing wherever pattern.hasGap is set
  const totalCount = trendCandles.length + patCandles.length + 2;
  const slotStep = (svgW - padX * 2) / totalCount;
  const candleBodyW = Math.min(20, Math.max(11, slotStep * 0.54));

  const patXs = patCandles.map((_, idx) => {
    const gapExtra = pattern.hasGap && idx > 0 ? 4 : 0;
    return padX + slotStep * (trendCandles.length + idx + 0.5) + gapExtra;
  });

  const confirmX = padX + slotStep * (trendCandles.length + patCandles.length + 0.5);
  const failX = padX + slotStep * (trendCandles.length + patCandles.length + 1.5);

  const renderSingleCandle = (
    cx: number,
    ohlc: OHLC,
    color: string,
    key: string,
    options?: {
      opacity?: number;
      dashed?: boolean;
      delayMs?: number;
      labelNum?: number;
    }
  ) => {
    const [o, h, l, c] = ohlc;
    const yHigh = mapY(h);
    const yLow = mapY(l);
    const yTop = mapY(Math.max(o, c));
    const yBot = mapY(Math.min(o, c));
    const bodyH = Math.max(2.5, yBot - yTop);
    const isDoji = Math.abs(o - c) < 1.5;

    return (
      <g
        key={key}
        opacity={options?.opacity ?? 1}
        className={options?.delayMs !== undefined ? 'animate-candle-pop' : undefined}
        style={options?.delayMs !== undefined ? { animationDelay: `${options.delayMs}ms` } : undefined}
      >
        <line
          x1={cx}
          y1={yHigh}
          x2={cx}
          y2={yLow}
          stroke={color}
          strokeWidth={options?.dashed ? 1.6 : 2}
          strokeLinecap="round"
          strokeDasharray={options?.dashed ? '3 3' : undefined}
        />
        {isDoji ? (
          <line
            x1={cx - candleBodyW / 2}
            y1={yTop}
            x2={cx + candleBodyW / 2}
            y2={yTop}
            stroke={color}
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeDasharray={options?.dashed ? '3 3' : undefined}
          />
        ) : (
          <rect
            x={cx - candleBodyW / 2}
            y={yTop}
            width={candleBodyW}
            height={bodyH}
            rx="2.5"
            fill={options?.dashed ? '#141414' : color}
            stroke={color}
            strokeWidth={options?.dashed ? 1.6 : 0}
            strokeDasharray={options?.dashed ? '4 3' : undefined}
          />
        )}

        {options?.labelNum !== undefined && (
          <text
            x={cx}
            y={17}
            textAnchor="middle"
            fill="#E5E7EB"
            fontSize="10"
            fontFamily="Poppins, sans-serif"
            fontWeight="700"
          >
            {options.labelNum}
          </text>
        )}
      </g>
    );
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`relative rounded-2xl bg-[#141414] border border-white/[0.07] overflow-hidden ${
        onClick ? 'cursor-pointer group' : ''
      }`}
    >
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className={`w-full block ${compact ? 'h-44 sm:h-48' : 'aspect-video'}`}
      >
        {/* Subtle horizontal & vertical grid */}
        <g stroke="rgba(255,255,255,0.05)" strokeWidth="1">
          <line x1="12" y1={padTop + plotH * 0.25} x2={svgW - 12} y2={padTop + plotH * 0.25} />
          <line x1="12" y1={padTop + plotH * 0.5} x2={svgW - 12} y2={padTop + plotH * 0.5} />
          <line x1="12" y1={padTop + plotH * 0.75} x2={svgW - 12} y2={padTop + plotH * 0.75} />
        </g>

        {/* Left divider between Trend Before and Pattern */}
        <line
          x1={padX + slotStep * trendCandles.length}
          y1={padTop}
          x2={padX + slotStep * trendCandles.length}
          y2={svgH - padBottom}
          stroke="rgba(255,255,255,0.08)"
          strokeDasharray="3 3"
        />
        <text
          x={padX + (slotStep * trendCandles.length) / 2}
          y={17}
          textAnchor="middle"
          fill="#6B7280"
          fontSize="8.5"
          fontFamily="Poppins, sans-serif"
          fontWeight="600"
        >
          {pattern.trendBefore === 'down'
            ? 'Pehle Down ↓'
            : pattern.trendBefore === 'up'
              ? 'Pehle Up ↑'
              : 'Context'}
        </text>

        {/* 3 Faint grey trend-before candles */}
        {trendCandles.map((tc, i) =>
          renderSingleCandle(
            padX + slotStep * (i + 0.5),
            tc,
            '#6B7280',
            `trend-${i}`,
            { opacity: 0.35 }
          )
        )}

        {/* Visible gap marker when pattern hasGap */}
        {pattern.hasGap && patCandles.length >= 2 && (
          <line
            x1={(patXs[0] + patXs[1]) / 2}
            y1={padTop + 10}
            x2={(patXs[0] + patXs[1]) / 2}
            y2={svgH - padBottom - 8}
            stroke="rgba(251, 191, 36, 0.35)"
            strokeDasharray="2 3"
            strokeWidth="1.2"
          />
        )}

        {/* Pattern candles animated 150ms staggered */}
        {patCandles.map((pc, i) => {
          const isBull = pc[3] >= pc[0];
          return renderSingleCandle(
            patXs[i],
            pc,
            isBull ? BULL_COLOR : BEAR_COLOR,
            `pat-${pattern.id}-${i}`,
            { delayMs: i * 150, labelNum: i + 1 }
          );
        })}

        {/* Thin bracket below pattern candles with pattern name */}
        {patXs.length > 0 && (
          <g>
            <path
              d={`M ${patXs[0] - candleBodyW * 0.7} ${svgH - 27} L ${patXs[0] - candleBodyW * 0.7} ${svgH - 21} L ${patXs[patXs.length - 1] + candleBodyW * 0.7} ${svgH - 21} L ${patXs[patXs.length - 1] + candleBodyW * 0.7} ${svgH - 27}`}
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="1.3"
            />
            <text
              x={(patXs[0] + patXs[patXs.length - 1]) / 2}
              y={svgH - 8}
              textAnchor="middle"
              fill="#E5E7EB"
              fontSize="9"
              fontFamily="Poppins, sans-serif"
              fontWeight="600"
            >
              {pattern.name}
            </text>
          </g>
        )}

        {/* Right divider before Ghost Next Candles */}
        <line
          x1={padX + slotStep * (trendCandles.length + patCandles.length)}
          y1={padTop}
          x2={padX + slotStep * (trendCandles.length + patCandles.length)}
          y2={svgH - padBottom}
          stroke="rgba(255,255,255,0.08)"
          strokeDasharray="3 3"
        />

        {/* Two Ghost Candles: Confirm (Green dashed) + Fail (Red dashed) */}
        {renderSingleCandle(confirmX, ghostConfirm, BULL_COLOR, 'ghost-confirm', {
          dashed: true,
          opacity: 0.9,
        })}
        {renderSingleCandle(failX, ghostFail, BEAR_COLOR, 'ghost-fail', {
          dashed: true,
          opacity: 0.9,
        })}

        <text
          x={confirmX}
          y={16}
          textAnchor="middle"
          fill={BULL_COLOR}
          fontSize="7.5"
          fontFamily="Poppins, sans-serif"
          fontWeight="600"
        >
          Confirm ↑
        </text>
        <text
          x={failX}
          y={25}
          textAnchor="middle"
          fill={BEAR_COLOR}
          fontSize="7.5"
          fontFamily="Poppins, sans-serif"
          fontWeight="600"
        >
          Fail ↓
        </text>
        <text
          x={(confirmX + failX) / 2}
          y={svgH - 8}
          textAnchor="middle"
          fill="#9CA3AF"
          fontSize="7.5"
          fontFamily="Poppins, sans-serif"
          fontWeight="500"
        >
          {shortNextLabel(pattern.nextIfConfirmed.name)}
        </text>
      </svg>

      {onClick && (
        <span className="absolute bottom-2 right-2 h-7 w-7 rounded-full bg-black/70 border border-white/15 flex items-center justify-center text-white/80 group-hover:text-[#1DDB04] transition-colors">
          <Maximize2 className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
});

interface CandlePatternCardProps {
  pattern?: PatternDefinition;
  detectedCandle?: DetectedCandle;
  imageSrc?: string;
  analysis?: ChartAnalysis;
  onFocusOnChart?: (candle: DetectedCandle) => void;
  highlighted?: boolean;
}

export const CandlePatternCard: React.FC<CandlePatternCardProps> = ({
  pattern: explicitPattern,
  detectedCandle,
  imageSrc,
  analysis,
  onFocusOnChart,
  highlighted = false,
}) => {
  const pattern =
    explicitPattern || (detectedCandle ? findPatternByName(detectedCandle.name) : undefined);

  const [cropUrl, setCropUrl] = useState<string>('');
  const [fullscreen, setFullscreen] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let active = true;
    if (!imageSrc || !detectedCandle) {
      setCropUrl('');
      return;
    }
    cropCandleFromImage(imageSrc, detectedCandle)
      .then((url) => {
        if (active) setCropUrl(url);
      })
      .catch(() => {
        if (active) setCropUrl('');
      });
    return () => {
      active = false;
    };
  }, [imageSrc, detectedCandle]);

  if (!pattern) return null;

  // Context mismatch check for reversal patterns
  const ctx = detectedCandle?.trend_context;
  const contextMismatch =
    Boolean(detectedCandle) &&
    pattern.role === 'Reversal' &&
    ((pattern.trendBefore === 'down' && ctx === 'uptrend') ||
      (pattern.trendBefore === 'up' && ctx === 'downtrend'));

  // Personalized Chances + Next Candle guidance using actual chart context
  const nearestSupport = analysis?.support?.[0]?.price_approx;
  const nearestRes = analysis?.resistance?.[0]?.price_approx;
  const volumeNote = analysis?.volume_momentum_hinglish;

  const personalizedChanceReason = detectedCandle
    ? `${
        contextMismatch
          ? 'Trend context ulta hai isliye signal weak hai. '
          : pattern.chancesReasonHinglish + ' '
      }${
        nearestSupport && pattern.bias === 'bullish'
          ? `Paas mein Support ${nearestSupport} hai. `
          : ''
      }${
        nearestRes && pattern.bias === 'bearish'
          ? `Paas mein Resistance ${nearestRes} hai. `
          : ''
      }${volumeNote ? volumeNote : ''}`.trim()
    : pattern.chancesReasonHinglish;

  const biasChip =
    pattern.bias === 'bullish'
      ? 'bg-[#1DDB04]/15 text-[#1DDB04]'
      : pattern.bias === 'bearish'
        ? 'bg-[#FF4D1F]/15 text-[#FF4D1F]'
        : 'bg-[#FBBF24]/15 text-[#FBBF24]';

  const chancePillColor = (level: 'Low' | 'Medium' | 'High', side: 'bull' | 'bear') => {
    if (level === 'High') {
      return side === 'bull' ? 'text-[#1DDB04]' : 'text-[#FF4D1F]';
    }
    if (level === 'Medium') return 'text-[#FBBF24]';
    return 'text-slate-400 dark:text-neutral-500';
  };

  return (
    <>
      <article
        className={`rounded-3xl border p-4 sm:p-5 space-y-4 transition-all ${
          highlighted
            ? 'border-[#1DDB04] bg-[#1DDB04]/5'
            : 'border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414]'
        }`}
      >
        {/* Top Illustration(s): Side-by-side Crop + Textbook SVG in analysis mode, else Textbook SVG */}
        {detectedCandle && imageSrc ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-[#1DDB04] block px-1">
                Tumhare chart ki candle
              </span>
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  playClickSound();
                  onFocusOnChart?.(detectedCandle);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onFocusOnChart?.(detectedCandle);
                  }
                }}
                className="relative rounded-2xl bg-[#0B0B0B] border border-white/[0.07] overflow-hidden h-44 sm:h-48 flex items-center justify-center cursor-pointer"
              >
                {cropUrl ? (
                  <img
                    src={cropUrl}
                    alt={`${pattern.name} crop from chart`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-neutral-500">Cropping candle…</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-neutral-300 block px-1">
                Textbook pattern (Tap to zoom)
              </span>
              <PatternIllustrationSvg
                pattern={pattern}
                compact
                onClick={() => {
                  playClickSound();
                  setFullscreen(true);
                }}
              />
            </div>
          </div>
        ) : (
          <PatternIllustrationSvg
            pattern={pattern}
            onClick={() => {
              playClickSound();
              setFullscreen(true);
            }}
          />
        )}

        {/* Header: Name + Bias + Role + Candle Count */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {detectedCandle && (
                <span
                  className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                    detectedCandle.type === 'bullish'
                      ? 'bg-[#1DDB04] text-black'
                      : detectedCandle.type === 'bearish'
                        ? 'bg-[#FF4D1F] text-white'
                        : 'bg-[#FBBF24] text-black'
                  }`}
                >
                  {detectedCandle.index}
                </span>
              )}
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                {pattern.name}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
              <span className={`px-2.5 py-0.5 rounded-full capitalize ${biasChip}`}>
                {pattern.bias}
              </span>
              <span className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-white/10 text-slate-600 dark:text-neutral-300">
                {pattern.role}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-neutral-400">
                {pattern.candles.length} Candle{pattern.candles.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {contextMismatch && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FBBF24]/15 border border-[#FBBF24]/40 px-3 py-1 text-[11px] font-semibold text-[#D97706] dark:text-[#FBBF24]">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Context match nahi kar raha, weak signal
            </div>
          )}
        </div>

        {/* Kaise banti hai & Kya batati hai */}
        <div className="space-y-2.5 text-xs sm:text-sm">
          <div>
            <p className="font-semibold text-slate-900 dark:text-white mb-0.5">Kaise banti hai</p>
            <p className="text-slate-600 dark:text-neutral-300 leading-relaxed">
              {pattern.howItFormsHinglish}
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white mb-0.5">Kya batati hai</p>
            <p className="text-slate-600 dark:text-neutral-300 leading-relaxed">
              {detectedCandle?.meaning_hinglish || pattern.whatItTellsHinglish}
            </p>
          </div>
        </div>

        {/* Chances Meter */}
        <div className="rounded-2xl bg-slate-50 dark:bg-[#0B0B0B] border border-slate-100 dark:border-white/[0.06] p-3.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
            <span className={chancePillColor(contextMismatch ? 'Low' : pattern.bullishChance, 'bull')}>
              Bullish chance: {contextMismatch && pattern.bias === 'bullish' ? 'Low' : pattern.bullishChance}
            </span>
            <span className={chancePillColor(contextMismatch ? 'Low' : pattern.bearishChance, 'bear')}>
              Bearish chance: {contextMismatch && pattern.bias === 'bearish' ? 'Low' : pattern.bearishChance}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
            {personalizedChanceReason}
          </p>
          <p className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
            Confirmation candle ka wait karo · Yeh sirf probability hai, guarantee nahi.
          </p>
        </div>

        {/* Agli candle kaun si ban sakti hai (Confirm hui / Fail hui) */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-900 dark:text-white">
            Agli candle kaun si ban sakti hai
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-[#1DDB04]/30 bg-[#1DDB04]/10 p-3 space-y-1">
              <p className="text-xs font-bold text-slate-900 dark:text-[#1DDB04] inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Confirm hui: {pattern.nextIfConfirmed.name}
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
              </p>
              <p className="text-[11px] text-slate-700 dark:text-neutral-200 leading-snug">
                {pattern.nextIfConfirmed.meaningHinglish}
              </p>
              <p className="text-[11px] font-medium text-slate-800 dark:text-white leading-snug">
                Kya karein: {pattern.nextIfConfirmed.actionHinglish}
                {nearestRes && pattern.bias === 'bullish' ? ` (Next zone: ${nearestRes})` : ''}
              </p>
            </div>

            <div className="rounded-2xl border border-[#FF4D1F]/30 bg-[#FF4D1F]/10 p-3 space-y-1">
              <p className="text-xs font-bold text-[#FF4D1F] inline-flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                Fail hui: {pattern.nextIfFails.name}
                <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />
              </p>
              <p className="text-[11px] text-slate-700 dark:text-neutral-200 leading-snug">
                {pattern.nextIfFails.meaningHinglish}
              </p>
              <p className="text-[11px] font-medium text-slate-800 dark:text-white leading-snug">
                Stop-loss logic: {pattern.nextIfFails.actionHinglish}
                {nearestSupport && pattern.bias === 'bullish' ? ` (Key S1: ${nearestSupport})` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Kab kaam karta hai / Kab fail hota hai */}
        <div className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed pt-1 border-t border-slate-100 dark:border-white/[0.06]">
          <span className="font-semibold text-slate-900 dark:text-white">
            Kab kaam karta hai / Kab fail hota hai:{' '}
          </span>
          {pattern.whenWorksHinglish}
        </div>

        {/* Actions: Zoom on Chart (if detected) + Share Card PNG */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {detectedCandle && onFocusOnChart && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onFocusOnChart(detectedCandle);
              }}
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1DDB04] hover:bg-[#19C203] active:scale-[0.98] px-4 text-xs font-bold text-black transition-all cursor-pointer"
            >
              <Crosshair className="h-3.5 w-3.5" />
              Chart Par Zoom Karo
            </button>
          )}

          <button
            type="button"
            disabled={sharing}
            onClick={async () => {
              playClickSound();
              setSharing(true);
              try {
                await downloadPatternCard(pattern, {
                  instrument: analysis?.instrument,
                  timeframe: analysis?.timeframe,
                  customChancesText: personalizedChanceReason,
                });
              } finally {
                setSharing(false);
              }
            }}
            className={`${
              detectedCandle && onFocusOnChart ? 'flex-1' : 'w-full'
            } min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#1C1C1C] hover:bg-slate-100 dark:hover:bg-white/10 active:scale-[0.98] px-4 text-xs font-semibold text-slate-900 dark:text-white transition-all cursor-pointer`}
          >
            <Share2 className="h-3.5 w-3.5 text-[#1DDB04]" />
            {sharing ? 'Saving Card…' : 'Share Card'}
          </button>
        </div>
      </article>

      {/* Fullscreen SVG Illustration Modal */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 p-4 flex items-center justify-center animate-page-in"
          onClick={() => setFullscreen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#141414] p-4 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-lg font-bold text-white">{pattern.name}</h4>
                <p className="text-xs text-neutral-400">
                  {pattern.bias.toUpperCase()} · {pattern.role} · {pattern.candles.length} Candle
                  {pattern.candles.length > 1 ? 's' : ''}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close fullscreen illustration"
                onClick={() => {
                  playClickSound();
                  setFullscreen(false);
                }}
                className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <PatternIllustrationSvg pattern={pattern} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-2xl bg-[#1DDB04]/10 border border-[#1DDB04]/30 p-3">
                <p className="font-bold text-[#1DDB04]">Confirm hui: {pattern.nextIfConfirmed.name}</p>
                <p className="text-neutral-200 mt-0.5">{pattern.nextIfConfirmed.actionHinglish}</p>
              </div>
              <div className="rounded-2xl bg-[#FF4D1F]/10 border border-[#FF4D1F]/30 p-3">
                <p className="font-bold text-[#FF4D1F]">Fail hui: {pattern.nextIfFails.name}</p>
                <p className="text-neutral-200 mt-0.5">{pattern.nextIfFails.actionHinglish}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
