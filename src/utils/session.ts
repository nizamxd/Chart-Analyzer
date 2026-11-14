import type { ChartAnalysis, TimeframeOption } from '../types/chart';
import type { ProcessedImage } from './image';

const SESSION_STATE_KEY = 'chart-analyzer-session-v1';
const MANUAL_REFRESH_KEY = 'chart-analyzer-manual-refresh-v1';

export type PersistedNavKey = 'analyze' | 'candles' | 'shapes' | 'history' | 'menu';
export type PersistedResultTabKey = 'overview' | 'candles' | 'shapes' | 'levels' | 'setup' | 'seekho';
export type PersistedPlanChoice = 'recommended' | 'bullish' | 'bearish';

export interface AppSessionState {
  activeNav: PersistedNavKey;
  showLearnInsideMenu: boolean;
  selectedTimeframe: TimeframeOption;
  showDetail: boolean;
  resultTab: PersistedResultTabKey;
  selectedPlan: PersistedPlanChoice;
  highlightedCandleIndex: number | null;
  previewImage: ProcessedImage | null;
  analysis: ChartAnalysis | null;
  scrollY: number;
}

export function saveSessionState(state: AppSessionState): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify(state));
  } catch {
    // If full image + base64 exceeds sessionStorage quota, keep essential UI state + lighter preview
    try {
      const compactPreview = state.previewImage
        ? {
            ...state.previewImage,
            originalDataUrl: state.previewImage.thumbnailDataUrl || '',
            base64: '',
          }
        : null;
      window.sessionStorage.setItem(
        SESSION_STATE_KEY,
        JSON.stringify({ ...state, previewImage: compactPreview })
      );
    } catch {
      try {
        window.sessionStorage.setItem(
          SESSION_STATE_KEY,
          JSON.stringify({ ...state, previewImage: null })
        );
      } catch {
        try {
          window.sessionStorage.setItem(
            SESSION_STATE_KEY,
            JSON.stringify({ ...state, previewImage: null, analysis: null })
          );
        } catch {
          // Ignore if sessionStorage is disabled
        }
      }
    }
  }
}

export function loadSessionState(): Partial<AppSessionState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Partial<AppSessionState>;
  } catch {
    return null;
  }
}

export function markManualRefresh(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(MANUAL_REFRESH_KEY, '1');
  } catch {
    // Ignore
  }
}

export function hasManualRefreshFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(MANUAL_REFRESH_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearManualRefreshFlag(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(MANUAL_REFRESH_KEY);
  } catch {
    // Ignore
  }
}
