import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Download,
  Image as ImageIcon,
  MoreHorizontal,
  PlusCircle,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { ChartAnalysis, DetectedCandle, OverlayLayers, PriceShape } from '../types/chart';
import {
  type CandleBadgeHitbox,
  downloadMarkedChart,
  downloadOriginalScreenshot,
  drawChartAnnotations,
} from '../utils/image';
import { playClickSound } from '../utils/sound';
import { PermanentWatermark } from './BrandLogo';
import { ChartMatchPanel } from './ChartMatchPanel';

interface InteractiveChartProps {
  imageSrc: string;
  originalSrc: string;
  analysis: ChartAnalysis;
  highlightedCandleIndex: number | null;
  onSelectCandle: (index: number) => void;
  onFocusCandle: (candle: DetectedCandle) => void;
  flashShape: PriceShape | null;
  focusRequest: { x: number; y: number; nonce: number } | null;
  onReset: () => void;
  onBackHome: () => void;
  onOpenPlan: (plan: 'bullish' | 'bearish') => void;
  onFlashShape?: (shape: PriceShape) => void;
  onOpenCandlesTab?: () => void;
  onOpenShapesTab?: () => void;
}

type LayerPreset = 'all' | 'candles' | 'levels' | 'trendlines' | 'shapes';

const LAYER_CONFIG: Array<{
  key: keyof OverlayLayers;
  label: string;
  dotColor: string;
}> = [
  { key: 'support', label: 'Support', dotColor: 'bg-[#1DDB04]' },
  { key: 'resistance', label: 'Resistance', dotColor: 'bg-[#FF4D1F]' },
  { key: 'trendlines', label: 'Trendlines', dotColor: 'bg-[#1DDB04]' },
  { key: 'patterns', label: 'Chart Patterns', dotColor: 'bg-[#FBBF24]' },
  { key: 'candleLabels', label: 'Candle Names', dotColor: 'bg-[#1DDB04]' },
  { key: 'lastCandle', label: 'Last Candle', dotColor: 'bg-[#1DDB04]' },
  { key: 'shapeOverlay', label: 'Shape Overlay', dotColor: 'bg-purple-400' },
];

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  imageSrc,
  originalSrc,
  analysis,
  highlightedCandleIndex,
  onSelectCandle,
  onFocusCandle,
  flashShape,
  focusRequest,
  onReset,
  onBackHome,
  onOpenPlan,
  onFlashShape,
  onOpenCandlesTab,
  onOpenShapesTab,
}) => {
  const [preset, setPreset] = useState<LayerPreset>('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const [layers, setLayers] = useState<OverlayLayers>({
    support: true,
    resistance: true,
    trendlines: true,
    patterns: true,
    candleLabels: true,
    lastCandle: true,
    shapeOverlay: false,
  });

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [downloadingOrig, setDownloadingOrig] = useState(false);
  const [downloadingMarked, setDownloadingMarked] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitboxesRef = useRef<CandleBadgeHitbox[]>([]);
  const lastTapRef = useRef<number>(0);

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);

  const applyPreset = (next: LayerPreset) => {
    playClickSound();
    setPreset(next);
    if (next === 'all') {
      setLayers({
        support: true,
        resistance: true,
        trendlines: true,
        patterns: true,
        candleLabels: true,
        lastCandle: true,
        shapeOverlay: false,
      });
    } else if (next === 'candles') {
      setLayers({
        support: false,
        resistance: false,
        trendlines: false,
        patterns: false,
        candleLabels: true,
        lastCandle: true,
        shapeOverlay: false,
      });
    } else if (next === 'levels') {
      setLayers({
        support: true,
        resistance: true,
        trendlines: false,
        patterns: false,
        candleLabels: false,
        lastCandle: false,
        shapeOverlay: false,
      });
    } else if (next === 'trendlines') {
      setLayers({
        support: false,
        resistance: false,
        trendlines: true,
        patterns: true,
        candleLabels: false,
        lastCandle: false,
        shapeOverlay: false,
      });
    } else if (next === 'shapes') {
      setLayers({
        support: false,
        resistance: false,
        trendlines: false,
        patterns: true,
        candleLabels: false,
        lastCandle: false,
        shapeOverlay: true,
      });
    }
  };

  const dirtyRef = useRef<boolean>(true);
  const rafRef = useRef<number | null>(null);

  const performDraw = useCallback(() => {
    rafRef.current = null;
    if (!dirtyRef.current) return;
    dirtyRef.current = false;

    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const width = img.clientWidth;
    const height = img.clientHeight;
    if (width === 0 || height === 0) return;

    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const targetW = Math.round(width * dpr);
    const targetH = Math.round(height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hitboxesRef.current = drawChartAnnotations(
      ctx,
      width,
      height,
      analysis,
      layers,
      highlightedCandleIndex,
      flashShape
    );
  }, [analysis, layers, highlightedCandleIndex, flashShape]);

  const scheduleOverlayRender = useCallback(() => {
    dirtyRef.current = true;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(performDraw);
    }
  }, [performDraw]);

  useEffect(() => {
    scheduleOverlayRender();
  }, [scheduleOverlayRender]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const observer = new ResizeObserver(() => scheduleOverlayRender());
    observer.observe(img);
    window.addEventListener('resize', scheduleOverlayRender, { passive: true });
    window.addEventListener('orientationchange', scheduleOverlayRender, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scheduleOverlayRender);
      window.removeEventListener('orientationchange', scheduleOverlayRender);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [scheduleOverlayRender]);

  useEffect(() => {
    if (!focusRequest || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const targetZoom = 2.1;
    const nx = focusRequest.x / 1000;
    const ny = focusRequest.y / 1000;
    const offsetX = (0.5 - nx) * rect.width * targetZoom;
    const offsetY = (0.5 - ny) * rect.height * targetZoom;
    setZoom(targetZoom);
    setPan({ x: offsetX, y: offsetY });
  }, [focusRequest]);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.22 : -0.22;
    setZoom((prev) => {
      const next = Math.max(1, Math.min(4, Number((prev + delta).toFixed(2))));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartRef.current = { dist, zoom };
      dragStartRef.current = null;
    } else if (pointersRef.current.size === 1) {
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
        moved: false,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const scale = dist / Math.max(10, pinchStartRef.current.dist);
      const nextZoom = Math.max(1, Math.min(4, pinchStartRef.current.zoom * scale));
      setZoom(nextZoom);
      if (nextZoom <= 1.02) setPan({ x: 0, y: 0 });
    } else if (pointersRef.current.size === 1 && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.hypot(dx, dy) > 6) {
        dragStartRef.current.moved = true;
      }
      if (zoom > 1) {
        setPan({
          x: dragStartRef.current.panX + dx,
          y: dragStartRef.current.panY + dy,
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }

    if (dragStartRef.current && !dragStartRef.current.moved) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const localX = ((e.clientX - rect.left) / rect.width) * canvas.clientWidth;
        const localY = ((e.clientY - rect.top) / rect.height) * canvas.clientHeight;
        const hit = hitboxesRef.current.find(
          (hb) => Math.hypot(localX - hb.cx, localY - hb.cy) <= hb.r
        );
        if (hit) {
          playClickSound();
          onSelectCandle(hit.index);
          dragStartRef.current = null;
          return;
        }
      }

      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        playClickSound();
        resetZoom();
      }
      lastTapRef.current = now;
    }
    dragStartRef.current = null;
  };

  const toggleLayer = (key: keyof OverlayLayers) => {
    playClickSound();
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const confidence = Math.max(0, Math.min(100, Math.round(analysis.verdict.confidence || 0)));
  const totalSegments = 24;
  const filledSegments = Math.max(1, Math.round((confidence / 100) * totalSegments));
  const isBearish = analysis.verdict.direction === 'BEARISH';
  const candles = Array.isArray(analysis.candles) ? analysis.candles : [];

  return (
    <div className="space-y-4">
      {/* Detail Top Header (matches Reference Screen 2) */}
      <div className="relative flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Back to Home"
          onClick={() => {
            playClickSound();
            onBackHome();
          }}
          className="h-11 w-11 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141414] flex items-center justify-center text-slate-800 dark:text-white active:scale-95 transition-transform cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="text-center min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {analysis.instrument}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-neutral-400">
            {analysis.timeframe} Intraday Chart
          </p>
        </div>

        <button
          type="button"
          aria-label="Chart options"
          onClick={() => {
            playClickSound();
            setMenuOpen((prev) => !prev);
          }}
          className="h-11 w-11 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141414] flex items-center justify-center text-slate-800 dark:text-white active:scale-95 transition-transform cursor-pointer"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-13 z-30 w-60 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141414] p-2 shadow-xl space-y-1">
            <button
              type="button"
              onClick={async () => {
                setMenuOpen(false);
                playClickSound();
                await downloadOriginalScreenshot(originalSrc);
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              Original Screenshot Download
            </button>
            <button
              type="button"
              onClick={async () => {
                setMenuOpen(false);
                playClickSound();
                await downloadMarkedChart(imageSrc, analysis, layers);
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 dark:text-[#1DDB04] hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              Marked Chart Download
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                playClickSound();
                onReset();
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              Naya Chart Analyze Karein
            </button>
          </div>
        )}
      </div>

      {/* Top Filter Pill Selector Row (like 1D 1W 1M 1Y in Reference 2) */}
      <div className="flex items-center justify-between gap-1 rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-1 overflow-x-auto no-scrollbar">
        {(
          [
            { key: 'all', label: 'All' },
            { key: 'candles', label: 'Candles' },
            { key: 'levels', label: 'Levels' },
            { key: 'trendlines', label: 'Trendlines' },
            { key: 'shapes', label: 'Shapes' },
          ] as const
        ).map((item) => {
          const active = preset === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => applyPreset(item.key)}
              className={`min-h-[38px] flex-1 px-3 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-slate-900 dark:bg-[#232323] text-white'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Big Headline: Instrument = Last Close + delta */}
      <div className="px-1 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
          {analysis.instrument}{' '}
          {analysis.last_close && analysis.last_close !== 'N/A'
            ? `= ${analysis.last_close}`
            : `· ${analysis.verdict.direction}`}
        </h1>
        <p
          className={`text-xs font-semibold tabular-nums ${
            isBearish ? 'text-[#FF4D1F]' : 'text-[#1DDB04] dark:text-[#1DDB04]'
          }`}
        >
          {isBearish ? '▼' : '▲'}{' '}
          {analysis.price_change_text || analysis.verdict.summary_hinglish}
        </p>
      </div>

      {/* Interactive Zoomable & Pannable Chart Canvas */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#D4AF37]/25 bg-white dark:bg-[#101013] p-2.5 sm:p-3 space-y-2.5">
        <div
          ref={viewportRef}
          data-chart-viewport="true"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-[#070708] touch-none select-none cursor-grab active:cursor-grabbing"
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            className="relative w-full transition-transform duration-75 ease-out"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Analyzed candlestick chart"
              referrerPolicy="no-referrer"
              onLoad={scheduleOverlayRender}
              draggable={false}
              className="w-full h-auto block pointer-events-none"
            />
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute top-0 left-0 w-full h-full"
            />
          </div>

          <PermanentWatermark compact className="hidden sm:inline-flex absolute top-2.5 left-2.5 pointer-events-none" />

          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-full bg-black/85 border border-[#D4AF37]/30 px-2 py-1">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => {
                playClickSound();
                setZoom((z) => {
                  const n = Math.max(1, Number((z - 0.5).toFixed(2)));
                  if (n === 1) setPan({ x: 0, y: 0 });
                  return n;
                });
              }}
              className="h-8 w-8 flex items-center justify-center rounded-full text-white hover:bg-white/10 cursor-pointer"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] font-semibold text-white tabular-nums px-1">
              {zoom.toFixed(1)}×
            </span>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => {
                playClickSound();
                setZoom((z) => Math.min(4, Number((z + 0.5).toFixed(2))));
              }}
              className="h-8 w-8 flex items-center justify-center rounded-full text-white hover:bg-white/10 cursor-pointer"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            {zoom > 1 && (
              <button
                type="button"
                aria-label="Reset zoom"
                onClick={() => {
                  playClickSound();
                  resetZoom();
                }}
                className="h-8 w-8 flex items-center justify-center rounded-full text-[#1DDB04] hover:bg-white/10 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dedicated interactive candle-number strip below chart (like month axis labels in Reference 2) */}
        {candles.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {candles.map((c) => {
              const selected = highlightedCandleIndex === c.index;
              return (
                <button
                  key={c.index}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onFocusCandle(c);
                  }}
                  className={`min-h-[34px] inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    selected
                      ? 'bg-[#1DDB04] text-black'
                      : 'bg-slate-100 dark:bg-[#0B0B0B] text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-white/[0.06]'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      c.type === 'bullish'
                        ? 'bg-[#1DDB04]'
                        : c.type === 'bearish'
                          ? 'bg-[#FF4D1F]'
                          : 'bg-[#FBBF24]'
                    }`}
                  />
                  <span>
                    #{c.index} {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Fine-grained Layer Toggle Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {LAYER_CONFIG.map((item) => {
          const active = layers[item.key];
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => toggleLayer(item.key)}
              className={`min-h-[42px] inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-slate-900 dark:text-[#F5D061]'
                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#101013] text-slate-500 dark:text-[#A89F8D]'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${item.dotColor} ${
                  active ? 'opacity-100' : 'opacity-35'
                }`}
              />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* RISK / CONFIDENCE CARD */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#D4AF37]/25 bg-white dark:bg-[#101013] p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-700 dark:text-[#CFC6B4] font-numeric">
            Confidence{' '}
            <strong className="text-slate-900 dark:text-[#FAF4E4]">{confidence}/100</strong>
          </span>
          <span className="text-slate-600 dark:text-[#CFC6B4] font-medium truncate max-w-[260px]">
            Bias:{' '}
            <strong className="text-[#9A6F18] dark:text-[#F5D061]">
              {analysis.verdict.direction}
            </strong>
          </span>
        </div>

        {/* Segmented Metallic Gold Bar */}
        <div className="grid grid-cols-24 gap-1 h-4">
          {Array.from({ length: totalSegments }).map((_, idx) => {
            const active = idx < filledSegments;
            return (
              <span
                key={idx}
                className={`rounded-xs transition-colors ${
                  active ? 'bg-[#D4AF37]' : 'bg-slate-200 dark:bg-white/10'
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-[#A89F8D]">
          <span>Low Risk</span>
          <span>High Risk</span>
        </div>
      </div>

      {/* Chart Level, Current Position & Matching Candlestick / Shape Column */}
      <ChartMatchPanel
        analysis={analysis}
        onFocusCandle={onFocusCandle}
        onFlashShape={onFlashShape}
        onOpenCandlesTab={onOpenCandlesTab}
        onOpenShapesTab={onOpenShapesTab}
      />

      {/* Two Big Pill Buttons (Bullish Plan / Bearish Plan — educational only) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onOpenPlan('bullish');
          }}
          className="h-[54px] rounded-full bg-[#1DDB04] hover:bg-[#19C203] active:scale-[0.98] px-4 flex flex-col items-center justify-center text-black transition-all cursor-pointer"
        >
          <span className="text-sm font-bold leading-tight">Bullish Plan</span>
          <span className="text-[10px] font-medium opacity-75">educational only</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onOpenPlan('bearish');
          }}
          className="h-[54px] rounded-full bg-[#FF4D1F] hover:bg-[#eb4115] active:scale-[0.98] px-4 flex flex-col items-center justify-center text-white transition-all cursor-pointer"
        >
          <span className="text-sm font-bold leading-tight">Bearish Plan</span>
          <span className="text-[10px] font-medium opacity-85">educational only</span>
        </button>
      </div>

      {/* Downloads + Naya Chart */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={async () => {
            playClickSound();
            setDownloadingOrig(true);
            try {
              await downloadOriginalScreenshot(originalSrc);
            } finally {
              setDownloadingOrig(false);
            }
          }}
          disabled={downloadingOrig}
          className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-white/15 bg-white dark:bg-[#141414] hover:bg-slate-50 dark:hover:bg-white/5 active:scale-[0.98] px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white text-center transition-all sm:whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ImageIcon className="h-4 w-4 text-slate-500 dark:text-neutral-300 shrink-0" />
          {downloadingOrig ? 'Saving…' : 'Original Screenshot Download'}
        </button>

        <button
          type="button"
          onClick={async () => {
            playClickSound();
            setDownloadingMarked(true);
            try {
              await downloadMarkedChart(imageSrc, analysis, layers);
            } finally {
              setDownloadingMarked(false);
            }
          }}
          disabled={downloadingMarked}
          className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-full border border-[#D4AF37]/50 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 active:scale-[0.98] px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-[#F5D061] text-center transition-all sm:whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="h-4 w-4 shrink-0" />
          {downloadingMarked ? 'Saving…' : 'Marked Chart Download'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          playClickSound();
          onReset();
        }}
        className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] hover:border-[#D4AF37]/50 active:scale-[0.98] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-[#CFC6B4] transition-all cursor-pointer"
      >
        <PlusCircle className="h-4 w-4" />
        Naya Chart Analyze Karein
      </button>
    </div>
  );
};
