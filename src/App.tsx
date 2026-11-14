import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import {
  Moon,
  Sun,
  RefreshCw,
  Upload,
  Volume2,
  VolumeX,
  Music,
  CandlestickChart,
  Shapes,
  History,
  Menu as MenuIcon,
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import { HomeView } from './components/HomeView';
import { InteractiveChart } from './components/InteractiveChart';
import { ResultTabs, type PlanChoice, type ResultTabKey } from './components/ResultTabs';
import { ShapeCard } from './components/ShapeCard';
import { AnalysisLoader } from './components/AnalysisLoader';
import { SplashIntro } from './components/SplashIntro';
import {
  AppDownloadSection,
  DeveloperApkSetupPanel,
  OfflineIndicator,
  PWAInstallButton,
  UpdateSnackbar,
} from './components/PWAInstallButton';
import {
  AboutCreatorCard,
  BrandLogo,
  CreatorAvatar,
  PermanentWatermark,
} from './components/BrandLogo';
import {
  APP_NAME,
  APP_VERSION,
  COPYRIGHT_NOTICE,
  CREATOR_CREDIT,
  CREATOR_NAME,
  EDUCATIONAL_DISCLAIMER,
} from './config';
import { useSmoothMode } from './hooks/useSmoothMode';
import { usePreventPullToRefresh } from './hooks/usePreventPullToRefresh';
import { compressAndResizeImage, type ProcessedImage } from './utils/image';
import {
  clearManualRefreshFlag,
  hasManualRefreshFlag,
  loadSessionState,
  markManualRefresh,
  saveSessionState,
} from './utils/session';
import {
  deleteHistoryItem,
  loadHistory,
  saveAnalysisToHistory,
} from './utils/history';
import {
  isSoundEnabled,
  playClickSound,
  playErrorTone,
  playSuccessChime,
  playWelcomeChime,
  setSoundEnabled,
} from './utils/sound';
import {
  getMusicVolume,
  hasUserStartedBefore,
  isMusicEnabled,
  setMusicDucking,
  setMusicEnabled,
  setMusicVolume,
  startBackgroundMusic,
} from './utils/music';
import type {
  ChartAnalysis,
  DetectedCandle,
  HistoryItem,
  PriceShape,
  TimeframeOption,
} from './types/chart';

const HistoryView = lazy(() =>
  import('./components/HistoryView').then((m) => ({ default: m.HistoryView }))
);
const CandleDictionary = lazy(() =>
  import('./components/CandleDictionary').then((m) => ({ default: m.CandleDictionary }))
);
const ShapeDictionary = lazy(() =>
  import('./components/ShapeCard').then((m) => ({ default: m.ShapeDictionary }))
);
const LearnView = lazy(() =>
  import('./components/LearnView').then((m) => ({ default: m.LearnView }))
);

type NavKey = 'analyze' | 'candles' | 'shapes' | 'history' | 'menu';

const NAV_ITEMS: Array<{ key: NavKey; label: string; Icon: typeof Sparkles }> = [
  { key: 'analyze', label: 'Analyze', Icon: Sparkles },
  { key: 'candles', label: 'Candles', Icon: CandlestickChart },
  { key: 'shapes', label: 'Shapes', Icon: Shapes },
  { key: 'history', label: 'History', Icon: History },
  { key: 'menu', label: 'Menu', Icon: MenuIcon },
];

export default function App() {
  useSmoothMode();
  usePreventPullToRefresh();

  const [initialSession] = useState(() => loadSessionState());
  const [wasManualRefresh] = useState(() => hasManualRefreshFlag());

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('chart-analyzer-theme') !== 'light';
  });

  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const [musicOn, setMusicOn] = useState<boolean>(() => isMusicEnabled());
  const [musicVol, setMusicVolState] = useState<number>(() => getMusicVolume());
  const [showSplash, setShowSplash] = useState<boolean>(() => !wasManualRefresh);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeNav, setActiveNav] = useState<NavKey>(() => {
    if (typeof window !== 'undefined') {
      const action = new URLSearchParams(window.location.search).get('action');
      if (action === 'history') return 'history';
    }
    if (initialSession?.activeNav) return initialSession.activeNav;
    return 'analyze';
  });
  const [showLearnInsideMenu, setShowLearnInsideMenu] = useState<boolean>(
    () => initialSession?.showLearnInsideMenu ?? false
  );
  const [apkSetupSignal, setApkSetupSignal] = useState(0);

  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>(
    () => initialSession?.selectedTimeframe ?? 'Auto'
  );
  const [previewImage, setPreviewImage] = useState<ProcessedImage | null>(
    () => initialSession?.previewImage ?? null
  );
  const [analysis, setAnalysis] = useState<ChartAnalysis | null>(
    () => initialSession?.analysis ?? null
  );
  const [showDetail, setShowDetail] = useState<boolean>(() =>
    Boolean(initialSession?.showDetail && initialSession?.analysis && initialSession?.previewImage)
  );

  const [resultTab, setResultTab] = useState<ResultTabKey>(
    () => initialSession?.resultTab ?? 'overview'
  );
  const [selectedPlan, setSelectedPlan] = useState<PlanChoice>(
    () => initialSession?.selectedPlan ?? 'recommended'
  );
  const [highlightedCandleIndex, setHighlightedCandleIndex] = useState<number | null>(
    () => initialSession?.highlightedCandleIndex ?? null
  );
  const [focusRequest, setFocusRequest] = useState<{ x: number; y: number; nonce: number } | null>(null);
  const [flashShape, setFlashShape] = useState<PriceShape | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const chartPanelRef = useRef<HTMLDivElement>(null);
  const tabsPanelRef = useRef<HTMLDivElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSplashDone = useCallback(() => setShowSplash(false), []);

  useEffect(() => {
    if (!wasManualRefresh) return;
    clearManualRefreshFlag();
    const targetScrollY =
      typeof initialSession?.scrollY === 'number' && initialSession.scrollY > 0
        ? initialSession.scrollY
        : 0;
    if (targetScrollY > 0) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: targetScrollY, behavior: 'auto' });
      });
    }
  }, [wasManualRefresh, initialSession]);

  const workspaceSnapshot = {
    activeNav,
    showLearnInsideMenu,
    selectedTimeframe,
    showDetail,
    resultTab,
    selectedPlan,
    highlightedCandleIndex,
    previewImage,
    analysis,
  };
  const latestWorkspaceRef = useRef(workspaceSnapshot);
  latestWorkspaceRef.current = workspaceSnapshot;

  useEffect(() => {
    saveSessionState({
      ...workspaceSnapshot,
      scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
    });
  }, [
    activeNav,
    showLearnInsideMenu,
    selectedTimeframe,
    showDetail,
    resultTab,
    selectedPlan,
    highlightedCandleIndex,
    previewImage,
    analysis,
  ]);

  useEffect(() => {
    const onPageHide = () => {
      saveSessionState({
        ...latestWorkspaceRef.current,
        scrollY: window.scrollY || 0,
      });
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, []);

  const handleManualRefresh = useCallback(() => {
    if (isRefreshing) return;
    playClickSound();
    setIsRefreshing(true);
    saveSessionState({
      activeNav,
      showLearnInsideMenu,
      selectedTimeframe,
      showDetail,
      resultTab,
      selectedPlan,
      highlightedCandleIndex,
      previewImage,
      analysis,
      scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
    });
    markManualRefresh();
    window.setTimeout(() => {
      window.location.reload();
    }, 180);
  }, [
    isRefreshing,
    activeNav,
    showLearnInsideMenu,
    selectedTimeframe,
    showDetail,
    resultTab,
    selectedPlan,
    highlightedCandleIndex,
    previewImage,
    analysis,
  ]);

  const handleOpenApkSetup = useCallback(() => {
    setActiveNav('menu');
    setShowLearnInsideMenu(false);
    setApkSetupSignal((n) => n + 1);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('chart-analyzer-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('chart-analyzer-theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    let unlocked = false;
    const handleFirstGesture = () => {
      if (unlocked) return;
      unlocked = true;
      if (hasUserStartedBefore()) {
        playWelcomeChime();
        if (isMusicEnabled()) {
          startBackgroundMusic(2.5);
        }
      }
      window.removeEventListener('pointerdown', handleFirstGesture);
    };
    window.addEventListener('pointerdown', handleFirstGesture, { passive: true });
    return () => window.removeEventListener('pointerdown', handleFirstGesture);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playClickSound();
  };

  const toggleMusic = useCallback(() => {
    playClickSound();
    const next = !musicOn;
    setMusicEnabled(next);
    setMusicOn(next);
  }, [musicOn]);

  const handleMusicVolumeChange = (val: number) => {
    setMusicVolume(val);
    setMusicVolState(val);
  };

  const handleImageSelected = useCallback(async (file: Blob) => {
    setLocalError(null);
    setError(null);
    setAnalysis(null);
    setShowDetail(false);
    setHighlightedCandleIndex(null);
    setFocusRequest(null);
    setActiveNav('analyze');
    try {
      const processed = await compressAndResizeImage(file);
      setPreviewImage(processed);
    } catch (err) {
      playErrorTone();
      const msg =
        err instanceof Error
          ? err.message
          : 'Image process karne mein problem aayi. Kripya doosri image try karein.';
      setLocalError(msg);
    }
  }, []);

  const handleClearImage = useCallback(() => {
    playClickSound();
    setPreviewImage(null);
    setAnalysis(null);
    setShowDetail(false);
    setError(null);
    setLocalError(null);
    setHighlightedCandleIndex(null);
    setFocusRequest(null);
    setActiveNav('analyze');
  }, []);

  const runAnalysis = useCallback(
    async (timeframeOverride?: TimeframeOption) => {
      if (!previewImage || isAnalyzing) return;

      playClickSound();
      const tfToUse = timeframeOverride ?? selectedTimeframe;
      if (timeframeOverride) {
        setSelectedTimeframe(timeframeOverride);
      }

      setActiveNav('analyze');
      setIsAnalyzing(true);
      setMusicDucking(true);
      setError(null);
      setLocalError(null);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: previewImage.base64,
            mimeType: previewImage.mimeType,
            timeframe: tfToUse,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const friendlyMsg =
            data?.message_hinglish ||
            (response.status === 429
              ? 'Abhi server par load zyada hai. 10-15 second baad Retry karein.'
              : 'Chart analyze nahi ho paaya. Kripya Retry karein.');
          throw new Error(friendlyMsg);
        }

        const parsed = data as ChartAnalysis;
        if (!parsed || typeof parsed.is_valid_chart !== 'boolean') {
          throw new Error('Analysis response sahi format mein nahi aaya. Kripya Retry karein.');
        }

        if (!parsed.is_valid_chart) {
          playErrorTone();
          setError(
            parsed.invalid_reason_hinglish ||
              'Yeh image blurry hai ya ek clear candlestick chart nahi lag rahi. Kripya 30–60 candles wala saaf screenshot upload karein.'
          );
          return;
        }

        setAnalysis(parsed);
        setShowDetail(true);
        setResultTab('overview');
        setSelectedPlan('recommended');
        setHighlightedCandleIndex(null);

        const nextHistory = saveAnalysisToHistory(previewImage, parsed);
        setHistory(nextHistory);

        playSuccessChime();
      } catch (err) {
        playErrorTone();
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError('Request mein zyada time lag gaya (Timeout). Internet check karke Retry karein.');
        } else if (err instanceof TypeError) {
          setError('Network error: Server se connection nahi ho paaya. Internet check karke Retry karein.');
        } else {
          setError(
            err instanceof Error
              ? err.message
              : 'Kuch technical dikkat aa gayi. Kripya Retry karein.'
          );
        }
      } finally {
        setIsAnalyzing(false);
        setMusicDucking(false);
      }
    },
    [previewImage, isAnalyzing, selectedTimeframe]
  );

  const handleOpenHistoryItem = useCallback((item: HistoryItem) => {
    setPreviewImage({
      dataUrl: item.imageDataUrl,
      originalDataUrl: item.originalDataUrl,
      thumbnailDataUrl: item.thumbnailDataUrl,
      base64: '',
      mimeType: 'image/jpeg',
      width: 1200,
      height: 800,
    });
    setAnalysis(item.analysis);
    setShowDetail(true);
    setError(null);
    setResultTab('overview');
    setSelectedPlan('recommended');
    setHighlightedCandleIndex(null);
    setActiveNav('analyze');
  }, []);

  const handleDeleteHistoryItem = useCallback((id: string) => {
    setHistory(deleteHistoryItem(id));
  }, []);

  const handleSelectCandleFromChart = useCallback((index: number) => {
    setHighlightedCandleIndex(index);
    setResultTab('candles');
    setShowDetail(true);
    setActiveNav('analyze');
  }, []);

  const handleFocusCandleFromList = useCallback((candle: DetectedCandle) => {
    setHighlightedCandleIndex(candle.index);
    const cy = ((candle.y_top ?? 500) + (candle.y_bottom ?? 500)) / 2;
    setFocusRequest({ x: candle.x, y: cy, nonce: Date.now() });
    if (window.innerWidth < 1024) {
      chartPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleFlashShapeOnChart = useCallback((shape: PriceShape) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlashShape(shape);
    flashTimerRef.current = setTimeout(() => {
      setFlashShape(null);
    }, 1800);
    if (window.innerWidth < 1024) {
      chartPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleOpenPlan = useCallback((plan: 'bullish' | 'bearish') => {
    setSelectedPlan(plan);
    setResultTab('setup');
    setTimeout(() => {
      tabsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }, []);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip flex bg-[#F7F5F0] dark:bg-[#070708] dark:trading-grid-bg text-slate-900 dark:text-[#FAF4E4] transition-colors duration-150 relative">
      {showSplash && <SplashIntro onDone={handleSplashDone} />}

      {/* Subtle top metallic gold radial glow in dark mode */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-80 dark:bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.11),transparent_65%)]"
      />

      {/* Desktop Left Sidebar (>= 1024px) */}
      <aside className="hidden lg:flex lg:w-68 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#09090B] z-30 p-5 justify-between">
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveNav('analyze');
              setShowDetail(false);
            }}
            className="flex items-center gap-3 text-left cursor-pointer w-full"
          >
            <BrandLogo size={42} />
            <div className="min-w-0">
              <span className="font-brand text-base font-bold tracking-wide text-slate-900 dark:text-[#F5D061] block truncate">
                {APP_NAME}
              </span>
              <span className="text-[11px] font-numeric text-slate-500 dark:text-[#A89F8D] block">
                Black &amp; Gold · v{APP_VERSION}
              </span>
            </div>
          </button>

          {/* Sidebar Creator Profile Card */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveNav('menu');
              setShowLearnInsideMenu(false);
            }}
            className="w-full flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-[#D4AF37]/25 bg-slate-50 dark:bg-[#101013] p-3 text-left hover:border-[#D4AF37]/60 transition-colors cursor-pointer"
          >
            <CreatorAvatar sizeClass="h-10 w-10" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-[#FAF4E4] truncate">
                {CREATOR_NAME}
              </p>
              <p className="text-[10px] font-medium text-[#9A6F18] dark:text-[#D4AF37] truncate">
                {CREATOR_CREDIT}
              </p>
            </div>
          </button>

          <nav className="space-y-1.5" aria-label="Main navigation">
            {NAV_ITEMS.map(({ key, label, Icon }) => {
              const active = activeNav === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setActiveNav(key);
                    setShowLearnInsideMenu(false);
                  }}
                  className={`w-full min-h-[48px] flex items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition-all cursor-pointer ${
                    active
                      ? 'gold-cta font-bold shadow-sm'
                      : 'text-slate-600 dark:text-[#A89F8D] hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-[#FAF4E4]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                  {key === 'history' && history.length > 0 && (
                    <span
                      className={`ml-auto text-xs font-bold font-numeric ${
                        active ? 'text-black' : 'text-slate-400 dark:text-[#D4AF37]'
                      }`}
                    >
                      {history.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2.5 pt-4 border-t border-slate-200 dark:border-[#D4AF37]/15">
          <PWAInstallButton />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMusic}
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 dark:border-[#D4AF37]/20 bg-slate-50 dark:bg-[#101013] px-2.5 text-xs font-semibold text-slate-700 dark:text-[#FAF4E4] cursor-pointer"
              aria-label="Toggle music"
            >
              <Music className={`h-4 w-4 ${musicOn ? 'text-[#9A6F18] dark:text-[#D4AF37]' : 'text-neutral-500'}`} />
              <span>{musicOn ? 'Music' : 'Muted'}</span>
            </button>
            <button
              type="button"
              onClick={toggleSound}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-2xl border border-slate-200 dark:border-[#D4AF37]/20 bg-slate-50 dark:bg-[#101013] text-slate-700 dark:text-[#FAF4E4] cursor-pointer"
              aria-label="Toggle sound effects"
            >
              {soundOn ? <Volume2 className="h-4 w-4 text-[#9A6F18] dark:text-[#D4AF37]" /> : <VolumeX className="h-4 w-4 text-neutral-500" />}
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setDarkMode((prev) => !prev);
              }}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-2xl border border-slate-200 dark:border-[#D4AF37]/20 bg-slate-50 dark:bg-[#101013] text-slate-700 dark:text-[#FAF4E4] cursor-pointer"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="h-4 w-4 text-[#D4AF37]" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-400 dark:text-[#8C8474]">
            {COPYRIGHT_NOTICE}
          </p>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 w-full lg:pl-68 flex flex-col min-h-screen relative z-10">
        {/* Branded Trading Dashboard Header */}
        <header className="w-full border-b border-slate-200 dark:border-[#D4AF37]/20 bg-white/90 dark:bg-[#09090B]/90 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveNav('analyze');
                setShowDetail(false);
              }}
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
            >
              <BrandLogo size={32} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-brand text-sm sm:text-base font-bold text-slate-900 dark:text-[#F5D061] truncate">
                    {APP_NAME}
                  </span>
                  <span className="text-[10px] font-numeric font-semibold text-slate-500 dark:text-[#D4AF37] shrink-0">
                    v{APP_VERSION}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-[#A89F8D] truncate">
                  {CREATOR_CREDIT}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                aria-label="Refresh app"
                title="Refresh app (preserves your current work)"
                className="min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 dark:border-[#D4AF37]/35 bg-slate-50 dark:bg-[#101013] hover:border-[#D4AF37]/70 active:scale-95 disabled:opacity-75 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-[#F5D061] transition-all cursor-pointer"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-[#9A6F18] dark:text-[#D4AF37] ${
                    isRefreshing ? 'animate-spin' : ''
                  }`}
                />
                <span className="whitespace-nowrap">
                  {isRefreshing ? 'Refreshing…' : 'Refresh'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveNav('menu');
                  setShowLearnInsideMenu(false);
                }}
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-slate-200 dark:border-[#D4AF37]/30 bg-slate-50 dark:bg-[#101013] pl-1 pr-2.5 sm:pl-1.5 sm:pr-3 py-1 hover:border-[#D4AF37]/60 transition-colors cursor-pointer"
              >
                <CreatorAvatar sizeClass="h-7 w-7" />
                <span className="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-[#FAF4E4] whitespace-nowrap">
                  {CREATOR_NAME}
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-safe py-5 sm:py-8 pb-32 lg:pb-10">
          {activeNav === 'analyze' && (
            <>
              {isAnalyzing ? (
                <AnalysisLoader selectedTimeframe={selectedTimeframe} />
              ) : error ? (
                <div className="max-w-xl mx-auto rounded-3xl border border-[#FF4D1F]/30 bg-white dark:bg-[#141414] p-6 sm:p-8 text-center space-y-4 animate-page-in">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Analysis Nahi Ho Paaya
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-neutral-300 leading-relaxed">
                    {error}
                  </p>
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                    {previewImage && previewImage.base64 && (
                      <button
                        type="button"
                        onClick={() => runAnalysis()}
                        className="min-h-[48px] inline-flex items-center gap-2 rounded-full gold-cta px-6 py-2.5 text-sm font-bold transition-all cursor-pointer"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="min-h-[48px] inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#1C1C1C] px-5 py-2.5 text-sm font-semibold text-slate-800 dark:text-white transition-all cursor-pointer"
                    >
                      <Upload className="h-4 w-4" />
                      Naya Chart Upload Karein
                    </button>
                  </div>
                </div>
              ) : showDetail && analysis && previewImage ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-page-in">
                  <div ref={chartPanelRef} className="lg:col-span-6 min-w-0">
                    <InteractiveChart
                      imageSrc={previewImage.dataUrl}
                      originalSrc={previewImage.originalDataUrl}
                      analysis={analysis}
                      highlightedCandleIndex={highlightedCandleIndex}
                      onSelectCandle={handleSelectCandleFromChart}
                      onFocusCandle={handleFocusCandleFromList}
                      flashShape={flashShape}
                      focusRequest={focusRequest}
                      onReset={handleClearImage}
                      onBackHome={() => setShowDetail(false)}
                      onOpenPlan={handleOpenPlan}
                      onFlashShape={handleFlashShapeOnChart}
                      onOpenCandlesTab={() => {
                        setResultTab('candles');
                        tabsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      onOpenShapesTab={() => {
                        setResultTab('shapes');
                        tabsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    />
                  </div>
                  <div ref={tabsPanelRef} className="lg:col-span-6 min-w-0">
                    <ResultTabs
                      analysis={analysis}
                      imageSrc={previewImage.dataUrl}
                      activeTab={resultTab}
                      onTabChange={setResultTab}
                      selectedPlan={selectedPlan}
                      onPlanChange={setSelectedPlan}
                      highlightedCandleIndex={highlightedCandleIndex}
                      onFocusCandle={handleFocusCandleFromList}
                      onFlashShape={handleFlashShapeOnChart}
                    />
                  </div>
                </div>
              ) : (
                <HomeView
                  history={history}
                  previewImage={previewImage}
                  selectedTimeframe={selectedTimeframe}
                  onTimeframeChange={setSelectedTimeframe}
                  onImageSelected={handleImageSelected}
                  onClearImage={handleClearImage}
                  onAnalyze={() => runAnalysis()}
                  isAnalyzing={isAnalyzing}
                  localError={localError}
                  onOpenHistoryItem={handleOpenHistoryItem}
                  onGoHistory={() => setActiveNav('history')}
                  onGoCandles={() => setActiveNav('candles')}
                  musicOn={musicOn}
                  onToggleMusic={toggleMusic}
                  onOpenApkSetup={handleOpenApkSetup}
                />
              )}
            </>
          )}

          {activeNav === 'candles' && (
            <div className="max-w-4xl mx-auto space-y-5 animate-page-in">
              {analysis && Array.isArray(analysis.candles) && analysis.candles.length > 0 && (
                <div className="rounded-3xl border border-[#D4AF37]/30 bg-white dark:bg-[#101013] p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-[#FAF4E4]">
                      {analysis.instrument} ({analysis.timeframe}) mein {analysis.candles.length} candles detect hui
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#A89F8D]">
                      Chart ke upar zoom karke dekhne ke liye open karein
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setResultTab('candles');
                      setShowDetail(true);
                      setActiveNav('analyze');
                    }}
                    className="min-h-[48px] rounded-full gold-cta px-4 text-xs font-bold cursor-pointer"
                  >
                    Chart Par Dekho →
                  </button>
                </div>
              )}
              <Suspense
                fallback={
                  <div className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-6 text-center text-xs text-slate-500 dark:text-neutral-400">
                    Candle patterns load ho rahe hain…
                  </div>
                }
              >
                <CandleDictionary
                  matchedPatternNames={
                    analysis
                      ? [
                          analysis.last_candle?.name || '',
                          ...(analysis.candles?.map((c) => c.name) || []),
                          ...(analysis.chart_position?.similar_candlesticks?.map((s) => s.name) || []),
                        ].filter(Boolean)
                      : []
                  }
                />
              </Suspense>
            </div>
          )}

          {activeNav === 'shapes' && (
            <div className="max-w-4xl mx-auto space-y-5 animate-page-in">
              {analysis && Array.isArray(analysis.shapes) && analysis.shapes.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white px-1">
                    {analysis.instrument} · Detected Price Shapes
                  </h2>
                  {analysis.shapes.map((sh, idx) => (
                    <ShapeCard
                      key={`${sh.name}-${idx}`}
                      shape={sh}
                      instrument={analysis.instrument}
                      timeframe={analysis.timeframe}
                      onFlashOnChart={(shape) => {
                        setShowDetail(true);
                        setActiveNav('analyze');
                        handleFlashShapeOnChart(shape);
                      }}
                    />
                  ))}
                </div>
              )}
              <Suspense
                fallback={
                  <div className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-6 text-center text-xs text-slate-500 dark:text-neutral-400">
                    Price shapes load ho rahe hain…
                  </div>
                }
              >
                <ShapeDictionary
                  matchedShapeNames={
                    analysis
                      ? [
                          ...(analysis.shapes?.map((s) => s.name) || []),
                          ...(analysis.chart_position?.similar_shapes?.map((s) => s.name) || []),
                        ].filter(Boolean)
                      : []
                  }
                />
              </Suspense>
            </div>
          )}

          {activeNav === 'history' && (
            <Suspense
              fallback={
                <div className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-6 text-center text-xs text-slate-500 dark:text-neutral-400">
                  History load ho rahi hai…
                </div>
              }
            >
              <HistoryView
                items={history}
                onOpenItem={handleOpenHistoryItem}
                onDeleteItem={handleDeleteHistoryItem}
              />
            </Suspense>
          )}

          {activeNav === 'menu' && (
            <div className="max-w-2xl mx-auto space-y-5 animate-page-in">
              {showLearnInsideMenu ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setShowLearnInsideMenu(false);
                    }}
                    className="min-h-[48px] rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141414] px-4 text-xs font-semibold text-slate-800 dark:text-white cursor-pointer"
                  >
                    ← Back to Menu
                  </button>
                  <Suspense
                    fallback={
                      <div className="rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141414] p-6 text-center text-xs text-slate-500 dark:text-neutral-400">
                        Learning guide load ho rahi hai…
                      </div>
                    }
                  >
                    <LearnView />
                  </Suspense>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#FAF4E4]">
                      About, Settings &amp; Menu
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-[#A89F8D]">
                      Creator profile, theme, ambient music, sound effects aur app download
                    </p>
                  </div>

                  {/* Prominent About & Creator Profile Section */}
                  <AboutCreatorCard />

                  <div className="rounded-3xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] divide-y divide-slate-100 dark:divide-[#D4AF37]/10">
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-[#FAF4E4]">
                          Appearance (Dark / Light)
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#A89F8D]">
                          {darkMode ? 'Black & Gold Trading Theme Active' : 'Clean Light Theme Active'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setDarkMode((p) => !p);
                        }}
                        className="min-h-[48px] inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-[#D4AF37]/25 bg-slate-50 dark:bg-[#070708] px-4 text-xs font-semibold text-slate-800 dark:text-[#F5D061] cursor-pointer"
                      >
                        {darkMode ? <Sun className="h-4 w-4 text-[#D4AF37]" /> : <Moon className="h-4 w-4" />}
                        {darkMode ? 'Light' : 'Dark'}
                      </button>
                    </div>

                    {/* Generative Background Music Toggle + Volume Slider */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-[#FAF4E4]">
                            Background Music (Ambient)
                          </p>
                          <p className="text-xs text-slate-500 dark:text-[#A89F8D]">
                            Calm generative pad &amp; bell melody (auto-ducks on analyze)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={toggleMusic}
                          className="min-h-[48px] inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-[#D4AF37]/25 bg-slate-50 dark:bg-[#070708] px-4 text-xs font-semibold text-slate-800 dark:text-[#FAF4E4] cursor-pointer"
                        >
                          <Music
                            className={`h-4 w-4 ${musicOn ? 'text-[#9A6F18] dark:text-[#D4AF37]' : 'text-neutral-500'}`}
                          />
                          {musicOn ? 'On' : 'Off'}
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-slate-500 dark:text-[#A89F8D] w-20 shrink-0">
                          Music Vol
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={Math.round(musicVol * 100)}
                          onChange={(e) => handleMusicVolumeChange(Number(e.target.value) / 100)}
                          aria-label="Background music volume"
                          className="w-full accent-[#D4AF37] cursor-pointer h-2"
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-[#F5D061] font-numeric w-10 text-right">
                          {Math.round(musicVol * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Separate Sound Effects Toggle */}
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-[#FAF4E4]">
                          Sound Effects &amp; Chimes
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#A89F8D]">
                          Tap ticks, welcome chime aur success tone
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={toggleSound}
                        className="min-h-[48px] inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-[#D4AF37]/25 bg-slate-50 dark:bg-[#070708] px-4 text-xs font-semibold text-slate-800 dark:text-[#FAF4E4] cursor-pointer"
                      >
                        {soundOn ? (
                          <Volume2 className="h-4 w-4 text-[#9A6F18] dark:text-[#D4AF37]" />
                        ) : (
                          <VolumeX className="h-4 w-4 text-neutral-500" />
                        )}
                        {soundOn ? 'On' : 'Off'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setShowLearnInsideMenu(true);
                      }}
                      className="w-full min-h-[60px] flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <GraduationCap className="h-5 w-5 text-[#9A6F18] dark:text-[#D4AF37]" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-[#FAF4E4]">
                            Seekho: Candles &amp; Price Shapes
                          </p>
                          <p className="text-xs text-slate-500 dark:text-[#A89F8D]">
                            46 Candlestick patterns aur 25 Price Shapes dictionary
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#9A6F18] dark:text-[#F5D061]">Open →</span>
                    </button>
                  </div>

                  {/* Full Platform-Ordered Download / Install Cards */}
                  <AppDownloadSection onOpenApkSetup={() => setApkSetupSignal((n) => n + 1)} />

                  {/* Developer: APK Link Setup Panel */}
                  <DeveloperApkSetupPanel openSignal={apkSetupSignal} />
                </>
              )}
            </div>
          )}
        </main>

        {/* Branded Footer with Permanent Watermark, Version & Copyright */}
        <footer className="border-t border-slate-200 dark:border-[#D4AF37]/15 py-5 pb-28 lg:pb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-2.5 text-center">
            <PermanentWatermark />
            <p className="text-xs text-slate-500 dark:text-[#A89F8D] max-w-2xl">
              {EDUCATIONAL_DISCLAIMER}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-[#8C8474]">
              {COPYRIGHT_NOTICE} · {APP_NAME} v{APP_VERSION}
            </p>
          </div>
        </footer>
      </div>

      {/* Mobile Floating Bottom Navigation Pill (< 1024px) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-3 inset-x-3 z-40 pb-safe pointer-events-none flex justify-center"
      >
        <div className="pointer-events-auto w-full max-w-md rounded-full border border-slate-200 dark:border-[#D4AF37]/30 bg-white/95 dark:bg-[#0E0E11]/95 backdrop-blur-md shadow-2xl px-1.5 py-1.5 grid grid-cols-5 items-center gap-1">
          {NAV_ITEMS.map(({ key, label, Icon }) => {
            const active = activeNav === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveNav(key);
                  setShowLearnInsideMenu(false);
                }}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-full transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#D4AF37]/20 text-[#9A6F18] dark:text-[#F5D061]'
                    : 'text-slate-500 dark:text-[#A89F8D]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-semibold leading-none">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <OfflineIndicator />
      <UpdateSnackbar />
    </div>
  );
}
