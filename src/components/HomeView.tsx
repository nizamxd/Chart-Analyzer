import React, { useEffect, useRef, useState } from 'react';
import {
  Upload,
  ClipboardPaste,
  Camera,
  History,
  Eye,
  EyeOff,
  Search,
  Bell,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  RotateCcw,
  Clock,
  CandlestickChart,
  Music,
  VolumeX,
} from 'lucide-react';
import type { HistoryItem, TimeframeOption } from '../types/chart';
import type { ProcessedImage } from '../utils/image';
import { TIMEFRAME_OPTIONS } from './UploadZone';
import { AppDownloadSection } from './PWAInstallButton';
import { playClickSound } from '../utils/sound';
import { AboutCreatorCard, CreatorAvatar } from './BrandLogo';
import { APP_VERSION, CREATOR_CREDIT, CREATOR_NAME } from '../config';

interface HomeViewProps {
  history: HistoryItem[];
  previewImage: ProcessedImage | null;
  selectedTimeframe: TimeframeOption;
  onTimeframeChange: (tf: TimeframeOption) => void;
  onImageSelected: (file: Blob) => Promise<void>;
  onClearImage: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  localError: string | null;
  onOpenHistoryItem: (item: HistoryItem) => void;
  onGoHistory: () => void;
  onGoCandles: () => void;
  musicOn: boolean;
  onToggleMusic: () => void;
  onOpenApkSetup?: () => void;
}

const SAMPLE_MOVERS = [
  { name: 'Bullish Engulfing', tag: 'NIFTY · Reversal', bias: 'bullish' as const, strength: 'Strong' },
  { name: 'Hammer', tag: 'BANKNIFTY · Support', bias: 'bullish' as const, strength: 'Strong' },
  { name: 'Morning Star', tag: 'RELIANCE · 3-Candle', bias: 'bullish' as const, strength: 'Strong' },
  { name: 'Shooting Star', tag: 'HDFCBANK · Resistance', bias: 'bearish' as const, strength: 'Medium' },
  { name: 'Doji', tag: 'INFY · Indecision', bias: 'neutral' as const, strength: 'Medium' },
];

export const HomeView: React.FC<HomeViewProps> = ({
  history,
  previewImage,
  selectedTimeframe,
  onTimeframeChange,
  onImageSelected,
  onClearImage,
  onAnalyze,
  isAnalyzing,
  localError,
  onOpenHistoryItem,
  onGoHistory,
  onGoCandles,
  musicOn,
  onToggleMusic,
  onOpenApkSetup,
}) => {
  const [hideVerdict, setHideVerdict] = useState(false);
  const [moverTab, setMoverTab] = useState<'all' | 'bullish' | 'bearish' | 'neutral' | 'new'>('all');
  const [pasteNote, setPasteNote] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (isAnalyzing) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            playClickSound();
            setPasteNote(null);
            await onImageSelected(blob);
            return;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isAnalyzing, onImageSelected]);

  const handlePasteAction = async () => {
    playClickSound();
    setPasteNote(null);
    try {
      if (navigator.clipboard && 'read' in navigator.clipboard) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imgType = item.types.find((t) => t.startsWith('image/'));
          if (imgType) {
            const blob = await item.getType(imgType);
            await onImageSelected(blob);
            return;
          }
        }
        setPasteNote('Clipboard mein abhi koi chart screenshot nahi mila — Ctrl+V press karein ya Upload chunein.');
        return;
      }
    } catch {
      // Clipboard API permission denied or unsupported
    }
    setPasteNote('Desktop par Ctrl+V dabayein ya mobile par Upload button se screenshot chunein.');
  };

  const latest = history[0] || null;
  const latestCandles = latest?.analysis?.candles || [];

  const moversSource =
    latestCandles.length > 0 && moverTab !== 'new'
      ? latestCandles.map((c) => ({
          name: c.name,
          tag: `${latest.instrument} · ${latest.timeframe}`,
          bias: c.type,
          strength: c.strength ? c.strength[0].toUpperCase() + c.strength.slice(1) : 'Medium',
          historyItem: latest,
        }))
      : SAMPLE_MOVERS.map((s) => ({ ...s, historyItem: null as HistoryItem | null }));

  const filteredMovers = moversSource.filter((m) => {
    if (moverTab === 'all' || moverTab === 'new') return true;
    return m.bias === moverTab;
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-page-in">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await onImageSelected(file);
          e.target.value = '';
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await onImageSelected(file);
          e.target.value = '';
        }}
      />

      {/* Home Trading Terminal Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CreatorAvatar sizeClass="h-11 w-11" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#9A6F18] dark:text-[#D4AF37] truncate">
              {CREATOR_CREDIT}
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-[#FAF4E4] truncate">
              {CREATOR_NAME} · Trading Desk
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label="Search candle patterns"
            onClick={() => {
              playClickSound();
              onGoCandles();
            }}
            className="h-11 w-11 rounded-full border border-slate-200 dark:border-[#D4AF37]/25 bg-white dark:bg-[#101013] flex items-center justify-center text-slate-700 dark:text-[#F5D061] hover:border-[#D4AF37]/60 transition-colors cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Recent notifications and history"
            onClick={() => {
              playClickSound();
              onGoHistory();
            }}
            className="h-11 w-11 rounded-full border border-slate-200 dark:border-[#D4AF37]/25 bg-white dark:bg-[#101013] flex items-center justify-center text-slate-700 dark:text-[#F5D061] hover:border-[#D4AF37]/60 transition-colors cursor-pointer"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Hero Block: Last Market Verdict */}
      <div className="rounded-3xl border border-[#D4AF37]/25 bg-white dark:bg-[#101013] p-5 flex items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-[#A89F8D]">
            Last Market Verdict · v{APP_VERSION}
          </p>
          {hideVerdict ? (
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-[#FAF4E4]">
              ••••••
            </h1>
          ) : latest ? (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-[#FAF4E4]">
                {latest.verdict}
              </h1>
              <p
                className={`text-xs font-semibold font-numeric ${
                  latest.verdict === 'BEARISH'
                    ? 'text-[#FF4D1F]'
                    : 'text-[#1DDB04] dark:text-[#1DDB04]'
                }`}
              >
                {latest.verdict === 'BEARISH' ? '▼' : '▲'} {latest.confidence}% confidence ·{' '}
                {latest.instrument} {latest.timeframe}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-[#FAF4E4]">
                Chart upload karo
              </h1>
              <p className="text-xs font-semibold text-[#9A6F18] dark:text-[#D4AF37]">
                Best result ke liye chart ko zoom karke 30–60 candles dikhao.
              </p>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={hideVerdict ? 'Show verdict' : 'Hide verdict'}
          onClick={() => {
            playClickSound();
            setHideVerdict((v) => !v);
          }}
          className="h-11 w-11 rounded-full border border-slate-200 dark:border-[#D4AF37]/25 bg-slate-50 dark:bg-[#070708] flex items-center justify-center text-slate-500 dark:text-[#D4AF37] shrink-0 cursor-pointer"
        >
          {hideVerdict ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {/* 4 Rounded Quick-Action Tiles: Upload, Paste, Camera, History */}
      <div className="grid grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            fileInputRef.current?.click();
          }}
          className="min-h-[78px] rounded-2xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] hover:border-[#D4AF37]/70 active:scale-95 flex flex-col items-center justify-center gap-1.5 text-slate-800 dark:text-[#FAF4E4] transition-all cursor-pointer"
        >
          <Upload className="h-5 w-5 text-[#9A6F18] dark:text-[#F5D061]" />
          <span className="text-xs font-semibold">Upload</span>
        </button>

        <button
          type="button"
          onClick={handlePasteAction}
          className="min-h-[78px] rounded-2xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] hover:border-[#D4AF37]/70 active:scale-95 flex flex-col items-center justify-center gap-1.5 text-slate-800 dark:text-[#FAF4E4] transition-all cursor-pointer"
        >
          <ClipboardPaste className="h-5 w-5 text-[#9A6F18] dark:text-[#F5D061]" />
          <span className="text-xs font-semibold">Paste</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            cameraInputRef.current?.click();
          }}
          className="min-h-[78px] rounded-2xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] hover:border-[#D4AF37]/70 active:scale-95 flex flex-col items-center justify-center gap-1.5 text-slate-800 dark:text-[#FAF4E4] transition-all cursor-pointer"
        >
          <Camera className="h-5 w-5 text-[#9A6F18] dark:text-[#F5D061]" />
          <span className="text-xs font-semibold">Camera</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onGoHistory();
          }}
          className="min-h-[78px] rounded-2xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] hover:border-[#D4AF37]/70 active:scale-95 flex flex-col items-center justify-center gap-1.5 text-slate-800 dark:text-[#FAF4E4] transition-all cursor-pointer"
        >
          <History className="h-5 w-5 text-[#9A6F18] dark:text-[#F5D061]" />
          <span className="text-xs font-semibold">History</span>
        </button>
      </div>

      {/* Preview + Timeframe + Metallic Gold Analyze CTA when image is chosen */}
      {previewImage ? (
        <div className="rounded-3xl border border-[#D4AF37]/40 bg-white dark:bg-[#101013] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-600 dark:text-[#A89F8D] font-numeric">
              <span className="font-semibold text-slate-900 dark:text-[#FAF4E4]">Screenshot Ready</span>
              <span className="mx-2 text-slate-300 dark:text-[#D4AF37]/30">·</span>
              <span>
                {previewImage.width} × {previewImage.height} px
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  fileInputRef.current?.click();
                }}
                className="min-h-[42px] inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-[#D4AF37]/25 bg-slate-50 dark:bg-[#18181C] px-3.5 text-xs font-semibold text-slate-800 dark:text-[#FAF4E4] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Badlo
              </button>
              <button
                type="button"
                onClick={onClearImage}
                className="min-h-[42px] rounded-full px-3 text-xs font-semibold text-slate-500 dark:text-[#A89F8D] cursor-pointer"
              >
                Hatao
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-[#D4AF37]/20 bg-slate-50 dark:bg-[#070708]">
            <img
              src={previewImage.dataUrl}
              alt="Uploaded candlestick chart preview"
              referrerPolicy="no-referrer"
              className="w-full max-h-[340px] object-contain mx-auto block"
            />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-[#D4AF37]">
              <Clock className="h-3.5 w-3.5" />
              Timeframe ({selectedTimeframe})
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {TIMEFRAME_OPTIONS.map((tf) => {
                const active = selectedTimeframe === tf.value;
                return (
                  <button
                    key={tf.value}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      onTimeframeChange(tf.value);
                    }}
                    className={`min-h-[42px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? 'gold-cta font-bold'
                        : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#18181C] text-slate-700 dark:text-[#CFC6B4]'
                    }`}
                  >
                    {tf.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="w-full h-[56px] inline-flex items-center justify-center gap-2 rounded-full gold-cta active:scale-[0.98] disabled:opacity-60 px-6 text-base font-bold shadow-[0_8px_24px_rgba(212,175,55,0.25)] transition-all cursor-pointer"
          >
            Analyze Karo
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            playClickSound();
            fileInputRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className="cursor-pointer rounded-3xl border border-dashed border-slate-300 dark:border-[#D4AF37]/35 bg-white dark:bg-[#101013] hover:border-[#D4AF37] p-6 text-center transition-all active:scale-[0.99]"
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-[#FAF4E4]">
            Tap karke Chart Screenshot upload karein ya Ctrl+V se paste karein
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#A89F8D]">
            Best result ke liye chart ko zoom karke 30–60 candles dikhao · Zerodha, Groww, Dhan, TradingView
          </p>
        </div>
      )}

      {(localError || pasteNote) && (
        <div
          role="alert"
          className="rounded-2xl border border-[#FF4D1F]/30 bg-[#FF4D1F]/10 px-4 py-3 text-xs sm:text-sm text-[#FF4D1F]"
        >
          {localError || pasteNote}
        </div>
      )}

      {/* Section: Recent Analyses */}
      {history.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-[#FAF4E4]">Recent Analyses</h2>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onGoHistory();
              }}
              className="text-xs font-semibold text-[#9A6F18] dark:text-[#D4AF37] cursor-pointer"
            >
              See all
            </button>
          </div>

          <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-1">
            {history.slice(0, 6).map((item) => {
              const isBear = item.verdict === 'BEARISH';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onOpenHistoryItem(item);
                  }}
                  className="w-40 shrink-0 text-left rounded-3xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] p-3 space-y-2 hover:border-[#D4AF37]/60 active:scale-95 transition-all cursor-pointer"
                >
                  <img
                    src={item.thumbnailDataUrl}
                    alt={item.instrument}
                    referrerPolicy="no-referrer"
                    className="h-20 w-full rounded-2xl object-cover bg-[#070708]"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-[#FAF4E4] truncate">
                      {item.instrument} · {item.timeframe}
                    </p>
                    <p
                      className={`text-xs font-semibold font-numeric ${
                        isBear ? 'text-[#FF4D1F]' : 'text-[#1DDB04] dark:text-[#1DDB04]'
                      }`}
                    >
                      {isBear ? '▼' : '▲'} {item.confidence}% {item.verdict}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Section: Candle Movers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-[#FAF4E4]">Candle Movers</h2>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onGoCandles();
            }}
            className="text-xs font-semibold text-[#9A6F18] dark:text-[#D4AF37] cursor-pointer"
          >
            38+ Patterns →
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'bullish', label: 'Bullish' },
              { key: 'bearish', label: 'Bearish' },
              { key: 'neutral', label: 'Neutral' },
              { key: 'new', label: 'NEW' },
            ] as const
          ).map((tab) => {
            const active = moverTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  playClickSound();
                  setMoverTab(tab.key);
                }}
                className={`min-h-[38px] rounded-full px-3.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-slate-900 dark:bg-[#18181C] text-white dark:text-[#F5D061] border border-[#D4AF37]/50'
                    : 'text-slate-500 dark:text-[#A89F8D] hover:text-slate-900 dark:hover:text-[#FAF4E4]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] divide-y divide-slate-100 dark:divide-[#D4AF37]/10">
          {filteredMovers.slice(0, 5).map((m, idx) => {
            const Icon =
              m.bias === 'bullish'
                ? TrendingUp
                : m.bias === 'bearish'
                  ? TrendingDown
                  : Minus;
            const iconBg =
              m.bias === 'bullish'
                ? 'bg-[#1DDB04]/15 text-[#1DDB04] dark:text-[#1DDB04]'
                : m.bias === 'bearish'
                  ? 'bg-[#FF4D1F]/15 text-[#FF4D1F]'
                  : 'bg-[#D4AF37]/15 text-[#D4AF37]';
            return (
              <button
                key={`${m.name}-${idx}`}
                type="button"
                onClick={() => {
                  playClickSound();
                  if (m.historyItem) onOpenHistoryItem(m.historyItem);
                  else onGoCandles();
                }}
                className="w-full flex items-center justify-between gap-3 p-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.02] first:rounded-t-3xl last:rounded-b-3xl transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                    {idx === 0 ? <CandlestickChart className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-[#FAF4E4] truncate">
                      {m.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#A89F8D] truncate">{m.tag}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-[#FAF4E4] capitalize">
                    {m.bias}
                  </p>
                  <p
                    className={`text-[11px] font-semibold ${
                      m.bias === 'bullish'
                        ? 'text-[#1DDB04] dark:text-[#1DDB04]'
                        : m.bias === 'bearish'
                          ? 'text-[#FF4D1F]'
                          : 'text-[#D4AF37]'
                    }`}
                  >
                    {m.strength}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* About & Creator Profile Card */}
      <AboutCreatorCard compact />

      {/* Prominent App Download / Install Card */}
      <AppDownloadSection onOpenApkSetup={onOpenApkSetup} />

      {/* Small floating music mute button on Home screen */}
      <button
        type="button"
        onClick={onToggleMusic}
        aria-label={musicOn ? 'Mute background music' : 'Play background music'}
        title={musicOn ? 'Music On (Tap to mute)' : 'Music Muted (Tap to play)'}
        className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-30 h-12 w-12 rounded-full border border-slate-200 dark:border-[#D4AF37]/35 bg-white dark:bg-[#101013] shadow-xl flex items-center justify-center text-slate-700 dark:text-[#F5D061] hover:border-[#D4AF37] active:scale-95 transition-transform cursor-pointer"
      >
        {musicOn ? (
          <Music className="h-5 w-5 text-[#9A6F18] dark:text-[#D4AF37]" />
        ) : (
          <VolumeX className="h-5 w-5 text-slate-400 dark:text-[#8C8474]" />
        )}
      </button>
    </div>
  );
};
