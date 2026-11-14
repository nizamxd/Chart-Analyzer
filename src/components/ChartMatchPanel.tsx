import React, { useMemo } from 'react';
import { ArrowRight, CandlestickChart, Compass, MapPin, Shapes } from 'lucide-react';
import { findPatternByName, type PatternDefinition } from '../data/patterns';
import type { ChartAnalysis, ChartPositionInfo, DetectedCandle, PriceShape } from '../types/chart';
import { playClickSound } from '../utils/sound';
import { MiniOhlcSvg } from './CandleDictionary';
import { findShapeDictEntry, MiniShapeSvg, type ShapeDictEntry } from './ShapeCard';

interface ChartMatchPanelProps {
  analysis: ChartAnalysis;
  onFocusCandle?: (candle: DetectedCandle) => void;
  onFlashShape?: (shape: PriceShape) => void;
  onOpenCandlesTab?: () => void;
  onOpenShapesTab?: () => void;
}

interface ResolvedCandleMatch {
  name: string;
  similarity: number;
  reason: string;
  patternDef?: PatternDefinition;
  matchedCandle?: DetectedCandle;
  isLastCandle: boolean;
}

interface ResolvedShapeMatch {
  name: string;
  similarity: number;
  reason: string;
  status?: string;
  dictEntry?: ShapeDictEntry;
  detectedShape?: PriceShape;
  isPrimary: boolean;
}

function deriveLevelAndPosition(analysis: ChartAnalysis): ChartPositionInfo {
  const s1 = analysis.support?.[0];
  const r1 = analysis.resistance?.[0];
  const lastBox = analysis.last_candle?.box;
  const lastCenterY =
    Array.isArray(lastBox) && lastBox.length === 4 ? (lastBox[0] + lastBox[2]) / 2 : 500;

  let zoneType: ChartPositionInfo['zone_type'] = 'mid_range';
  let zoneName = 'Support–Resistance Ke Beech (Mid-Range)';
  let posPct = 50;

  if (s1 && r1 && s1.y > r1.y + 10) {
    const rawPct = ((s1.y - lastCenterY) / (s1.y - r1.y)) * 100;
    posPct = Math.max(0, Math.min(100, Math.round(rawPct)));
    if (lastCenterY < r1.y - 12) {
      zoneType = 'breakout_above';
      zoneName = `Breakout Zone (R1 ${r1.price_approx} Ke Upar)`;
    } else if (lastCenterY > s1.y + 12) {
      zoneType = 'breakdown_below';
      zoneName = `Breakdown Risk (S1 ${s1.price_approx} Ke Neeche)`;
    } else if (posPct >= 78) {
      zoneType = 'near_resistance';
      zoneName = `Resistance R1 (${r1.price_approx}) Ke Paas`;
    } else if (posPct <= 22) {
      zoneType = 'near_support';
      zoneName = `Support S1 (${s1.price_approx}) Zone Par`;
    } else {
      zoneType = 'mid_range';
      zoneName = 'Support aur Resistance Ke Beech (Mid-Range)';
    }
  } else if (r1 && Math.abs(lastCenterY - r1.y) < 70) {
    zoneType = 'near_resistance';
    zoneName = `Resistance R1 (${r1.price_approx}) Ke Paas`;
    posPct = 85;
  } else if (s1 && Math.abs(lastCenterY - s1.y) < 70) {
    zoneType = 'near_support';
    zoneName = `Support S1 (${s1.price_approx}) Zone Par`;
    posPct = 15;
  }

  const primaryShape = analysis.shapes?.find((s) => s.is_primary) || analysis.shapes?.[0];
  const srLabel = [
    s1 ? `S1: ${s1.price_approx}` : null,
    r1 ? `R1: ${r1.price_approx}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const fallbackSummary =
    zoneType === 'near_support'
      ? `Abhi price Support (${s1?.price_approx || 'neeche'}) ke paas khadi hai — yahan buyers wapas active ho sakte hain.`
      : zoneType === 'near_resistance'
        ? `Abhi price Resistance (${r1?.price_approx || 'upar'}) ke paas pahunch chuki hai — breakout ya rejection dono ka dhyan rakhein.`
        : zoneType === 'breakout_above'
          ? `Price ne Resistance (${r1?.price_approx || 'upar'}) ke upar breakout zone mein step rakha hai — closing confirm hone dein.`
          : zoneType === 'breakdown_below'
            ? `Price Support (${s1?.price_approx || 'neeche'}) ke neeche aa gayi hai — selling pressure zyada ho sakta hai.`
            : `Price abhi Support aur Resistance ke beech (${posPct}% level par) trade kar rahi hai.`;

  const fallbackStage = primaryShape
    ? `${primaryShape.name} (${
        primaryShape.completion_status === 'completed'
          ? 'Completed'
          : primaryShape.completion_status === 'broken'
            ? 'Broken'
            : 'Forming'
      }) ke right-side active level par.`
    : `${analysis.trend.current} structure ke active candle zone mein.`;

  const srv = analysis.chart_position;
  return {
    level_zone_name: srv?.level_zone_name || zoneName,
    zone_type: srv?.zone_type || zoneType,
    nearest_level_label: srv?.nearest_level_label || srLabel || `Last Close: ${analysis.last_close}`,
    position_percent_between_sr:
      typeof srv?.position_percent_between_sr === 'number' ? srv.position_percent_between_sr : posPct,
    position_summary_hinglish: srv?.position_summary_hinglish || fallbackSummary,
    shape_stage_hinglish: srv?.shape_stage_hinglish || fallbackStage,
    similar_candlesticks: srv?.similar_candlesticks || [],
    similar_shapes: srv?.similar_shapes || [],
  };
}

function getZoneBadgeStyle(zone: ChartPositionInfo['zone_type']) {
  switch (zone) {
    case 'near_support':
    case 'breakout_above':
      return 'bg-[#1DDB04]/15 text-[#1DDB04] border-[#1DDB04]/40';
    case 'near_resistance':
    case 'breakdown_below':
      return 'bg-[#FF4D1F]/15 text-[#FF4D1F] border-[#FF4D1F]/40';
    default:
      return 'bg-[#D4AF37]/15 text-[#9A6F18] dark:text-[#F5D061] border-[#D4AF37]/40';
  }
}

export const ChartMatchPanel: React.FC<ChartMatchPanelProps> = ({
  analysis,
  onFocusCandle,
  onFlashShape,
  onOpenCandlesTab,
  onOpenShapesTab,
}) => {
  const pos = useMemo(() => deriveLevelAndPosition(analysis), [analysis]);

  const candlestickMatches = useMemo<ResolvedCandleMatch[]>(() => {
    const map = new Map<string, ResolvedCandleMatch>();
    const detectedCandles = Array.isArray(analysis.candles) ? analysis.candles : [];

    // 1. Always prioritize server-detected similar_candlesticks
    for (const item of pos.similar_candlesticks) {
      const def = findPatternByName(item.name);
      const key = (def?.name || item.name).toLowerCase();
      if (!map.has(key)) {
        const matched = detectedCandles.find(
          (c) => c.name.toLowerCase() === key || c.name.toLowerCase().includes(key)
        );
        map.set(key, {
          name: def?.name || item.name,
          similarity: item.similarity_percent,
          reason: item.reason_hinglish || def?.whatItTellsHinglish || '',
          patternDef: def,
          matchedCandle: matched,
          isLastCandle: analysis.last_candle?.name?.toLowerCase() === key,
        });
      }
    }

    // 2. Include last_candle if not already present
    if (analysis.last_candle?.name) {
      const def = findPatternByName(analysis.last_candle.name);
      const key = (def?.name || analysis.last_candle.name).toLowerCase();
      if (!map.has(key)) {
        const lastDetected = detectedCandles[detectedCandles.length - 1];
        map.set(key, {
          name: def?.name || analysis.last_candle.name,
          similarity: 90,
          reason: analysis.last_candle.meaning_hinglish || def?.whatItTellsHinglish || '',
          patternDef: def,
          matchedCandle: lastDetected,
          isLastCandle: true,
        });
      }
    }

    // 3. Fill up to 3 items from detected candles (right-to-left so recent candles appear first)
    for (let i = detectedCandles.length - 1; i >= 0 && map.size < 3; i--) {
      const c = detectedCandles[i];
      const def = findPatternByName(c.name);
      const key = (def?.name || c.name).toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: def?.name || c.name,
          similarity: c.strength === 'strong' ? 88 : c.strength === 'medium' ? 76 : 65,
          reason: c.meaning_hinglish || def?.whatItTellsHinglish || '',
          patternDef: def,
          matchedCandle: c,
          isLastCandle: i === detectedCandles.length - 1,
        });
      }
    }

    return Array.from(map.values()).slice(0, 3);
  }, [analysis, pos.similar_candlesticks]);

  const shapeMatches = useMemo<ResolvedShapeMatch[]>(() => {
    const map = new Map<string, ResolvedShapeMatch>();
    const detectedShapes = Array.isArray(analysis.shapes) ? analysis.shapes : [];

    // 1. Primary & detected shapes from chart
    for (const sh of detectedShapes) {
      const dict = findShapeDictEntry(sh.name);
      const key = (dict?.name || sh.name).toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: dict?.name || sh.name,
          similarity: Math.round(sh.confidence || 80),
          reason: sh.meaning_hinglish || dict?.meaning || '',
          status:
            sh.completion_status === 'completed'
              ? 'Completed'
              : sh.completion_status === 'broken'
                ? 'Broken'
                : 'Forming',
          dictEntry: dict,
          detectedShape: sh,
          isPrimary: Boolean(sh.is_primary),
        });
      }
    }

    // 2. Server-provided similar_shapes (resembling shapes from dictionary)
    for (const item of pos.similar_shapes) {
      if (map.size >= 3) break;
      const dict = findShapeDictEntry(item.name);
      const key = (dict?.name || item.name).toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: dict?.name || item.name,
          similarity: item.similarity_percent,
          reason: item.reason_hinglish || dict?.meaning || '',
          dictEntry: dict,
          isPrimary: false,
        });
      }
    }

    return Array.from(map.values()).slice(0, 3);
  }, [analysis.shapes, pos.similar_shapes]);

  const s1Price = analysis.support?.[0]?.price_approx || 'Support S1';
  const r1Price = analysis.resistance?.[0]?.price_approx || 'Resistance R1';

  return (
    <section className="rounded-3xl border border-slate-200 dark:border-[#D4AF37]/30 bg-white dark:bg-[#101013] p-4 sm:p-5 space-y-4">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#9A6F18] dark:text-[#F5D061] shrink-0">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#FAF4E4]">
              Chart Level, Position &amp; Pattern Match
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-[#A89F8D]">
              Abhi chart kis level par hai aur kaun se candlestick / shape se milta julta hai
            </p>
          </div>
        </div>

        <span
          className={`text-[11px] font-bold px-3 py-1 rounded-full border max-w-full whitespace-normal sm:whitespace-nowrap text-center ${getZoneBadgeStyle(
            pos.zone_type
          )}`}
        >
          {pos.level_zone_name}
        </span>
      </div>

      {/* 1. Chart Level & Position Meter */}
      <div className="rounded-2xl border border-slate-100 dark:border-[#D4AF37]/20 bg-slate-50 dark:bg-[#070708] p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-[#FAF4E4]">
            <Compass className="h-3.5 w-3.5 text-[#D4AF37]" />
            Current Position:{' '}
            <strong className="text-[#9A6F18] dark:text-[#F5D061]">
              {analysis.last_close && analysis.last_close !== 'N/A'
                ? analysis.last_close
                : pos.level_zone_name}
            </strong>
          </span>
          <span className="text-[11px] font-numeric text-slate-500 dark:text-[#A89F8D]">
            {pos.nearest_level_label}
          </span>
        </div>

        {/* Visual Support <-> Current Price <-> Resistance Bar */}
        <div className="space-y-1.5">
          <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-[#1DDB04]/35 via-[#D4AF37]/30 to-[#FF4D1F]/35 border border-white/10 overflow-hidden">
            <div
              className="absolute top-0 bottom-0 w-3 -ml-1.5 rounded-full bg-[#F5D061] border border-black shadow-md transition-all duration-300"
              style={{ left: `${pos.position_percent_between_sr}%` }}
              title={`Price Position: ${pos.position_percent_between_sr}%`}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-semibold font-numeric">
            <span className="text-[#1DDB04]">Support: {s1Price}</span>
            <span className="text-[#9A6F18] dark:text-[#F5D061]">
              Position {pos.position_percent_between_sr}%
            </span>
            <span className="text-[#FF4D1F]">Resistance: {r1Price}</span>
          </div>
        </div>

        <p className="text-xs text-slate-700 dark:text-[#CFC6B4] leading-relaxed">
          {pos.position_summary_hinglish}
        </p>
        {pos.shape_stage_hinglish && (
          <p className="text-[11px] text-slate-500 dark:text-[#A89F8D] leading-snug">
            <span className="font-semibold text-slate-700 dark:text-[#F5D061]">
              Shape Stage:{' '}
            </span>
            {pos.shape_stage_hinglish}
          </p>
        )}
      </div>

      {/* 2. Two-Column Dictionary Match Grid: Candlestick Pattern Match vs Price Shape Match */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Column 1: Candlestick Pattern Match */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#D4AF37]/20 bg-slate-50/70 dark:bg-[#09090B] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-[#F5D061] inline-flex items-center gap-1.5">
              <CandlestickChart className="h-3.5 w-3.5 text-[#D4AF37]" />
              Candlestick Pattern Match
            </h3>
            {onOpenCandlesTab && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onOpenCandlesTab();
                }}
                className="text-[11px] font-semibold text-[#9A6F18] dark:text-[#F5D061] inline-flex items-center gap-0.5 hover:underline cursor-pointer"
              >
                Sab Dekho <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {candlestickMatches.length > 0 ? (
            <div className="space-y-2">
              {candlestickMatches.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    if (item.matchedCandle && onFocusCandle) {
                      onFocusCandle(item.matchedCandle);
                    } else if (onOpenCandlesTab) {
                      onOpenCandlesTab();
                    }
                  }}
                  className="w-full text-left flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] hover:border-[#D4AF37]/60 p-2.5 transition-colors cursor-pointer"
                >
                  {item.patternDef ? (
                    <MiniOhlcSvg candles={item.patternDef.candles} />
                  ) : (
                    <div className="h-11 w-11 shrink-0 rounded-xl bg-[#070708] border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
                      <CandlestickChart className="h-5 w-5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-[#FAF4E4] truncate">
                        {item.name}
                      </p>
                      <span className="text-[10px] font-bold font-numeric px-1.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#9A6F18] dark:text-[#F5D061] shrink-0">
                        {item.similarity}% Match
                      </span>
                    </div>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-[#A89F8D]">
                      {item.isLastCandle ? 'Last Candle · ' : ''}
                      {item.patternDef
                        ? `${item.patternDef.role} · ${item.patternDef.bias.toUpperCase()}`
                        : analysis.last_candle.type.toUpperCase()}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-[#CFC6B4] leading-snug line-clamp-2">
                      {item.reason}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Abhi koi clear candlestick pattern match nahi mila.
            </p>
          )}
        </div>

        {/* Column 2: Price Shape Match */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#D4AF37]/20 bg-slate-50/70 dark:bg-[#09090B] p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-[#F5D061] inline-flex items-center gap-1.5">
              <Shapes className="h-3.5 w-3.5 text-[#D4AF37]" />
              Price Shape Match (Kis Se Milta Hai)
            </h3>
            {onOpenShapesTab && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onOpenShapesTab();
                }}
                className="text-[11px] font-semibold text-[#9A6F18] dark:text-[#F5D061] inline-flex items-center gap-0.5 hover:underline cursor-pointer"
              >
                Dictionary <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {shapeMatches.length > 0 ? (
            <div className="space-y-2">
              {shapeMatches.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    if (item.detectedShape && onFlashShape) {
                      onFlashShape(item.detectedShape);
                    } else if (onOpenShapesTab) {
                      onOpenShapesTab();
                    }
                  }}
                  className="w-full text-left flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] hover:border-[#D4AF37]/60 p-2.5 transition-colors cursor-pointer"
                >
                  {item.dictEntry ? (
                    <MiniShapeSvg points={item.dictEntry.points} color={item.dictEntry.color} />
                  ) : (
                    <div className="h-11 w-12 shrink-0 rounded-xl bg-[#070708] border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
                      <Shapes className="h-5 w-5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-[#FAF4E4] truncate">
                        {item.name}
                      </p>
                      <span className="text-[10px] font-bold font-numeric px-1.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#9A6F18] dark:text-[#F5D061] shrink-0">
                        {item.similarity}% Match
                      </span>
                    </div>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-[#A89F8D]">
                      {item.isPrimary ? 'Primary Shape' : 'Similar Structure'}
                      {item.status ? ` · ${item.status}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-[#CFC6B4] leading-snug line-clamp-2">
                      {item.reason}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Abhi koi specific price shape match nahi hui — Shapes tab dekhein.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
