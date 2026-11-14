import type { ChartAnalysis, HistoryItem } from '../types/chart';
import type { ProcessedImage } from './image';

const STORAGE_KEY = 'chart-analyzer-history-v1';
const MAX_ITEMS = 20;

export function loadHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAnalysisToHistory(
  image: ProcessedImage,
  analysis: ChartAnalysis
): HistoryItem[] {
  const existing = loadHistory();
  const item: HistoryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    instrument: analysis.instrument || 'Unknown Instrument',
    timeframe: analysis.timeframe || 'Auto',
    verdict: analysis.verdict.direction,
    confidence: analysis.verdict.confidence,
    thumbnailDataUrl: image.thumbnailDataUrl,
    imageDataUrl: image.dataUrl,
    originalDataUrl: image.originalDataUrl,
    analysis,
  };

  const next = [item, ...existing].slice(0, MAX_ITEMS);
  persistHistory(next);
  return next;
}

export function deleteHistoryItem(id: string): HistoryItem[] {
  const next = loadHistory().filter((item) => item.id !== id);
  persistHistory(next);
  return next;
}

function persistHistory(items: HistoryItem[]): void {
  if (typeof window === 'undefined') return;
  let list = [...items];
  while (list.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return;
    } catch {
      // If quota exceeded, drop oldest item and retry
      list.pop();
    }
  }
  // Last resort: store lightweight metadata without heavy full-res copies
  try {
    const light = items.slice(0, 8).map((it) => ({
      ...it,
      originalDataUrl: it.thumbnailDataUrl,
      imageDataUrl: it.thumbnailDataUrl,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(light));
  } catch {
    // Ignore if storage completely blocked
  }
}
