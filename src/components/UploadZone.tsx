import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, ClipboardPaste, ArrowRight, RotateCcw, Clock } from 'lucide-react';
import type { ProcessedImage } from '../utils/image';
import type { TimeframeOption } from '../types/chart';
import { playClickSound } from '../utils/sound';

export const TIMEFRAME_OPTIONS: Array<{ value: TimeframeOption; label: string }> = [
  { value: 'Auto', label: 'Auto' },
  { value: '1m', label: '1m' },
  { value: '2m', label: '2m' },
  { value: '5m', label: '5m' },
  { value: '10m', label: '10m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '1D', label: '1D' },
];

interface UploadZoneProps {
  previewImage: ProcessedImage | null;
  selectedTimeframe: TimeframeOption;
  onTimeframeChange: (tf: TimeframeOption) => void;
  onImageSelected: (file: Blob) => Promise<void>;
  onClearImage: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  localError: string | null;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  previewImage,
  selectedTimeframe,
  onTimeframeChange,
  onImageSelected,
  onClearImage,
  onAnalyze,
  isAnalyzing,
  localError,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      await onImageSelected(files[0]);
    },
    [onImageSelected]
  );

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (isAnalyzing) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            playClickSound();
            await onImageSelected(blob);
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isAnalyzing, onImageSelected]);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isAnalyzing) return;
    playClickSound();
    await handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <section className="w-full max-w-3xl mx-auto space-y-5 animate-page-in">
      <div className="space-y-1.5 text-center sm:text-left">
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
          style={{ textWrap: 'balance' }}
        >
          Chart Screenshot Upload Karein
        </h1>
        <p className="text-sm text-slate-600 dark:text-neutral-400">
          NIFTY, BANKNIFTY ya kisi bhi stock ka screenshot daalein — har candle ka naam, price shape aur Hinglish guide 5–10 sec mein.
        </p>
      </div>

      {/* Timeframe selector */}
      <div className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-neutral-300">
            <Clock className="h-3.5 w-3.5 text-slate-700 dark:text-[#1DDB04]" />
            Timeframe Chunein
          </span>
          <span className="text-xs text-slate-500 dark:text-neutral-400">
            {selectedTimeframe === 'Auto' ? 'Auto Detect' : `${selectedTimeframe} Chart`}
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
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
                aria-pressed={active}
                className={`min-h-[48px] rounded-2xl text-xs font-semibold transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#1DDB04] text-black shadow-sm'
                    : 'border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1C1C1C] text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {!previewImage ? (
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
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`group cursor-pointer rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DDB04] ${
            isDragging
              ? 'border-[#1DDB04] bg-[#1DDB04]/10'
              : 'border-slate-300 dark:border-white/15 bg-white dark:bg-[#141414] hover:border-[#1DDB04]/70'
          }`}
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 dark:bg-[#1DDB04]/15 text-[#1DDB04]">
            <Upload className="h-7 w-7" />
          </div>

          <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            Gallery se Screenshot Chunein
          </p>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-neutral-400">
            Tap karein, drag &amp; drop karein, ya desktop par{' '}
            <kbd className="font-semibold text-slate-800 dark:text-neutral-200">Ctrl+V</kbd> se paste karein
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-slate-500 dark:text-neutral-500">
            <span className="inline-flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              Zerodha, Groww, Angel One, Dhan, TradingView
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              <ClipboardPaste className="h-3.5 w-3.5" />
              Clipboard Paste
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-600 dark:text-neutral-400 tabular-nums">
              <span className="font-semibold text-slate-900 dark:text-white">Preview Ready</span>
              <span className="mx-2 text-slate-300 dark:text-white/20">·</span>
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
                className="min-h-[48px] inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1C1C1C] px-4 py-2 text-xs font-semibold text-slate-800 dark:text-neutral-200 active:scale-95 transition-transform whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Badlo
              </button>
              <button
                type="button"
                onClick={onClearImage}
                className="min-h-[48px] rounded-full px-4 py-2 text-xs font-semibold text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-transform whitespace-nowrap shrink-0 cursor-pointer"
              >
                Hatao
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#0B0B0B]">
            <img
              src={previewImage.dataUrl}
              alt="Uploaded candlestick chart preview"
              referrerPolicy="no-referrer"
              className="w-full max-h-[380px] object-contain mx-auto block"
            />
          </div>

          <button
            type="button"
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="w-full h-[56px] inline-flex items-center justify-center gap-2 rounded-full bg-[#1DDB04] hover:bg-[#19C203] active:scale-[0.98] disabled:opacity-60 px-6 text-base font-bold text-black transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            Analyze Karo
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {localError && (
        <div
          role="alert"
          className="rounded-2xl border border-[#FF4D1F]/30 bg-[#FF4D1F]/10 px-4 py-3 text-sm text-[#FF4D1F]"
        >
          {localError}
        </div>
      )}
    </section>
  );
};
