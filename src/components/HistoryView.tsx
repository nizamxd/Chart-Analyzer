import React from 'react';
import { Trash2, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { HistoryItem } from '../types/chart';
import { playClickSound } from '../utils/sound';

interface HistoryViewProps {
  items: HistoryItem[];
  onOpenItem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  items,
  onOpenItem,
  onDeleteItem,
}) => {
  return (
    <section className="w-full max-w-3xl mx-auto space-y-4 animate-page-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Saved History
          </h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Last {items.length} / 20 saved chart analyses (tap karke reopen karein)
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] p-8 text-center space-y-2">
          <Clock className="h-8 w-8 mx-auto text-slate-400 dark:text-[#D4AF37]" />
          <p className="text-sm font-semibold text-slate-900 dark:text-[#FAF4E4]">
            Abhi koi history nahi hai
          </p>
          <p className="text-xs text-slate-500 dark:text-[#A89F8D]">
            Jab aap koi chart analyze karenge, woh yahan automatically save ho jayega.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const Icon =
              item.verdict === 'BULLISH'
                ? TrendingUp
                : item.verdict === 'BEARISH'
                  ? TrendingDown
                  : Minus;
            const badgeColor =
              item.verdict === 'BULLISH'
                ? 'text-[#1DDB04] dark:text-[#1DDB04]'
                : item.verdict === 'BEARISH'
                  ? 'text-[#FF4D1F]'
                  : 'text-[#D4AF37]';

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-3xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] p-3 sm:p-4"
              >
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onOpenItem(item);
                  }}
                  className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer"
                >
                  <img
                    src={item.thumbnailDataUrl}
                    alt={`${item.instrument} thumbnail`}
                    referrerPolicy="no-referrer"
                    className="h-16 w-24 rounded-2xl object-cover bg-[#070708] border border-[#D4AF37]/20 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {item.instrument} · {item.timeframe}
                    </p>
                    <p className={`text-xs font-semibold inline-flex items-center gap-1 ${badgeColor} tabular-nums`}>
                      <Icon className="h-3.5 w-3.5" />
                      {item.verdict} ({item.confidence}%)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 tabular-nums">
                      {formatTime(item.timestamp)}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  aria-label="Delete saved analysis"
                  onClick={() => {
                    playClickSound();
                    onDeleteItem(item.id);
                  }}
                  className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl text-slate-400 hover:text-[#FF4D1F] hover:bg-[#FF4D1F]/10 transition-colors shrink-0 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
