import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  FolderDown,
  Laptop,
  RefreshCw,
  Settings,
  Share2,
  ShieldAlert,
  Smartphone,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import {
  APK_FILENAME,
  APK_SIZE_MB,
  APK_VERSION,
  APP_SIZE_LABEL,
  APP_VERSION,
  clearApkUrlOverride,
  getApkUrlOverride,
  getEffectiveApkUrl,
  saveApkUrlOverride,
  subscribeApkUrl,
  validateApkUrl,
} from '../config';
import { playClickSound } from '../utils/sound';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type PlatformType = 'android' | 'ios' | 'desktop';

// Shared module-level capture so beforeinstallprompt & appinstalled work across all screens
let sharedDeferredPrompt: BeforeInstallPromptEvent | null = null;
let sharedIsStandalone = false;
let sharedJustInstalled = false;
const promptListeners = new Set<() => void>();

function notifyPromptListeners() {
  promptListeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  sharedIsStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    sharedDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyPromptListeners();
  });

  window.addEventListener('appinstalled', () => {
    sharedJustInstalled = true;
    sharedDeferredPrompt = null;
    notifyPromptListeners();
  });
}

function detectPlatform(): PlatformType {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  return 'desktop';
}

function usePWAInstallState() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    sharedDeferredPrompt
  );
  const [isStandalone, setIsStandalone] = useState<boolean>(sharedIsStandalone);
  const [justInstalled, setJustInstalled] = useState<boolean>(sharedJustInstalled);
  const [platform] = useState<PlatformType>(() => detectPlatform());

  useEffect(() => {
    const sync = () => {
      setDeferredPrompt(sharedDeferredPrompt);
      setIsStandalone(sharedIsStandalone);
      setJustInstalled(sharedJustInstalled);
    };
    promptListeners.add(sync);
    sync();
    return () => {
      promptListeners.delete(sync);
    };
  }, []);

  const triggerInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!sharedDeferredPrompt) return 'unavailable';
    await sharedDeferredPrompt.prompt();
    const { outcome } = await sharedDeferredPrompt.userChoice;
    if (outcome === 'accepted') {
      sharedJustInstalled = true;
      sharedDeferredPrompt = null;
      notifyPromptListeners();
    }
    return outcome;
  };

  return { deferredPrompt, isStandalone, justInstalled, platform, triggerInstall };
}

function useEffectiveApkUrl(): string {
  const [apkUrl, setApkUrl] = useState<string>(() => getEffectiveApkUrl());

  useEffect(() => {
    const sync = () => setApkUrl(getEffectiveApkUrl());
    const unsub = subscribeApkUrl(sync);
    sync();
    return unsub;
  }, []);

  return apkUrl;
}

function openExternalTab(url: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export const PWAInstallButton: React.FC = () => {
  const { deferredPrompt, isStandalone, justInstalled, platform, triggerInstall } =
    usePWAInstallState();
  const [showGuide, setShowGuide] = useState(false);

  if (isStandalone) return null;

  if (justInstalled) {
    return (
      <div className="min-h-[44px] w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1DDB04]/15 border border-[#1DDB04]/40 px-3.5 py-2 text-xs font-bold text-[#1DDB04] whitespace-nowrap shrink-0">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>App install ho gaya</span>
      </div>
    );
  }

  if (deferredPrompt) {
    return (
      <button
        type="button"
        onClick={async () => {
          playClickSound();
          await triggerInstall();
        }}
        className="min-h-[44px] w-full inline-flex items-center justify-center gap-1.5 rounded-full gold-cta px-3.5 py-2 text-xs font-bold transition-transform active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          playClickSound();
          setShowGuide(true);
        }}
        className="min-h-[44px] w-full inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 dark:border-[#D4AF37]/25 bg-white dark:bg-[#101013] hover:border-[#D4AF37]/60 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="h-3.5 w-3.5 text-[#D4AF37]" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-[#D4AF37]/25 bg-white dark:bg-[#101013] p-6 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              App Install Karein (PWA)
            </h3>
            {platform === 'ios' ? (
              <p className="text-sm text-slate-600 dark:text-neutral-300 leading-relaxed">
                1. Safari toolbar mein <strong>Share</strong> button tap karein.
                <br />
                2. Neeche scroll karke <strong>Add to Home Screen</strong> chunein.
              </p>
            ) : (
              <p className="text-sm text-slate-600 dark:text-neutral-300 leading-relaxed">
                Chrome menu (3 dots) &gt; <strong>Add to Home screen / Install app</strong> par tap
                karein.
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">
              Install sirf published HTTPS link par kaam karta hai, AI Studio preview iframe ke andar
              nahi.
            </p>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowGuide(false);
              }}
              className="w-full min-h-[48px] rounded-full gold-cta text-sm font-bold cursor-pointer"
            >
              Samajh Gaya
            </button>
          </div>
        </div>
      )}
    </>
  );
};

interface ApkInstallStepsSheetProps {
  open: boolean;
  apkUrl: string;
  onClose: () => void;
}

const ApkInstallStepsSheet: React.FC<ApkInstallStepsSheetProps> = ({ open, apkUrl, onClose }) => {
  const [showFallbackLink, setShowFallbackLink] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleLinkTrouble = async () => {
    playClickSound();
    setShowFallbackLink(true);
    try {
      await navigator.clipboard.writeText(apkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Clipboard blocked on some WebViews; text field stays visible for manual copy
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center sm:p-4 animate-page-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-[#D4AF37]/25 bg-white dark:bg-[#101013] p-5 pb-safe shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-[#D4AF37]/30 rounded-full mx-auto sm:hidden" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              APK Install Kaise Karein (4 Easy Steps)
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 font-numeric">
              {APK_FILENAME} · v{APK_VERSION} ({APK_SIZE_MB} MB)
            </p>
          </div>
          <button
            type="button"
            aria-label="Close install steps"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="h-11 w-11 rounded-full border border-slate-200 dark:border-[#D4AF37]/20 flex items-center justify-center text-slate-600 dark:text-neutral-300 shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ol className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-neutral-200">
          <li className="flex items-start gap-3 rounded-2xl border border-slate-100 dark:border-[#D4AF37]/15 bg-slate-50 dark:bg-[#070708] p-3">
            <div className="h-9 w-9 rounded-full bg-[#D4AF37]/15 text-[#9A6F18] dark:text-[#F5D061] flex items-center justify-center shrink-0">
              <FolderDown className="h-4 w-4" />
            </div>
            <p className="leading-relaxed pt-1">
              1. Download complete hone par file par tap karo (Chrome &gt; Downloads).
            </p>
          </li>

          <li className="flex items-start gap-3 rounded-2xl border border-slate-100 dark:border-[#D4AF37]/15 bg-slate-50 dark:bg-[#070708] p-3">
            <div className="h-9 w-9 rounded-full bg-[#D4AF37]/15 text-[#9A6F18] dark:text-[#F5D061] flex items-center justify-center shrink-0">
              <Settings className="h-4 w-4" />
            </div>
            <p className="leading-relaxed pt-1">
              2. Agar &apos;Install blocked&apos; aaye to Settings kholo &gt; &apos;Is source se allow
              karo&apos; ON karo.
            </p>
          </li>

          <li className="flex items-start gap-3 rounded-2xl border border-slate-100 dark:border-[#D4AF37]/15 bg-slate-50 dark:bg-[#070708] p-3">
            <div className="h-9 w-9 rounded-full bg-[#D4AF37]/15 text-[#9A6F18] dark:text-[#F5D061] flex items-center justify-center shrink-0">
              <Smartphone className="h-4 w-4" />
            </div>
            <p className="leading-relaxed pt-1">3. Install dabao, phir Open.</p>
          </li>

          <li className="flex items-start gap-3 rounded-2xl border border-[#FBBF24]/30 bg-[#FBBF24]/10 p-3">
            <div className="h-9 w-9 rounded-full bg-[#FBBF24]/20 text-[#D97706] dark:text-[#FBBF24] flex items-center justify-center shrink-0">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <p className="leading-relaxed pt-1">
              4. Play Protect warning aaye to &apos;Install anyway / More details&apos; chuno (yeh
              apna khud ka app hai, Play Store par nahi hai).
            </p>
          </li>
        </ol>

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleLinkTrouble}
            className="text-xs font-semibold text-[#9A6F18] dark:text-[#F5D061] hover:underline cursor-pointer"
          >
            Link kaam nahi kar raha?
          </button>

          {showFallbackLink && (
            <div className="rounded-2xl border border-slate-200 dark:border-[#D4AF37]/20 bg-slate-50 dark:bg-[#070708] p-3 space-y-2.5">
              <p className="text-[11px] font-medium text-slate-600 dark:text-neutral-300">
                {copied
                  ? 'APK link copy ho gaya! Neeche se Browser me bhi khol sakte ho:'
                  : 'APK link neeche se copy karke Chrome me open karo:'}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={apkUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Direct APK download link"
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] px-3 text-xs text-slate-800 dark:text-neutral-200"
                />
                <button
                  type="button"
                  onClick={handleLinkTrouble}
                  aria-label="Copy APK link"
                  className="h-[42px] px-3 rounded-xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] inline-flex items-center justify-center gap-1 text-xs font-semibold text-slate-700 dark:text-neutral-200 shrink-0 cursor-pointer"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-[#1DDB04]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-[#D4AF37]" />
                  )}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <a
                href={apkUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playClickSound()}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full gold-cta text-xs font-bold whitespace-nowrap"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Browser me kholo</span>
              </a>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-full min-h-[48px] rounded-full border border-slate-200 dark:border-[#D4AF37]/25 bg-slate-100 dark:bg-[#16161B] text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
          >
            Theek Hai, Samajh Gaya
          </button>
        </div>
      </div>
    </div>
  );
};

interface AppDownloadSectionProps {
  onOpenApkSetup?: () => void;
}

export const AppDownloadSection: React.FC<AppDownloadSectionProps> = ({ onOpenApkSetup }) => {
  const { deferredPrompt, isStandalone, justInstalled, platform, triggerInstall } =
    usePWAInstallState();
  const effectiveApkUrl = useEffectiveApkUrl();

  const [showPwaSteps, setShowPwaSteps] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showApkSheet, setShowApkSheet] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  if (isStandalone) return null;

  if (justInstalled) {
    return (
      <section className="rounded-3xl border border-[#1DDB04]/40 bg-[#1DDB04]/10 p-5 flex items-center gap-3">
        <CheckCircle2 className="h-6 w-6 text-[#1DDB04] shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">App install ho gaya</h3>
          <p className="text-xs text-slate-600 dark:text-neutral-300">
            Ab aap Chart Analyzer ko seedha apne Home Screen icon se open kar sakte hain.
          </p>
        </div>
      </section>
    );
  }

  const triggerDownloadToast = () => {
    setToastMsg('Download shuru ho gaya, Notifications ya Downloads me dekho');
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 5500);
  };

  const handleShareLink = async () => {
    playClickSound();
    const url = typeof window !== 'undefined' ? window.location.origin : '';
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Chart Analyzer — Intraday Hinglish App',
          text: 'Apne intraday candlestick chart screenshots ko seconds mein Hinglish mein samjho!',
          url,
        });
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // Ignore clipboard restriction
    }
  };

  const handleInstallPwaClick = async () => {
    playClickSound();
    if (deferredPrompt) {
      const res = await triggerInstall();
      if (res === 'unavailable') setShowPwaSteps(true);
    } else {
      setShowPwaSteps((s) => !s);
    }
  };

  const pwaInstallCard = (
    <div
      key="pwa-install"
      className="rounded-3xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] p-4 sm:p-5 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-2xl bg-[#D4AF37]/15 text-[#9A6F18] dark:text-[#F5D061] border border-[#D4AF37]/25 flex items-center justify-center shrink-0">
            {platform === 'ios' ? (
              <Smartphone className="h-5 w-5" />
            ) : (
              <Laptop className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {platform === 'ios' ? 'iPHONE / iPAD (PWA)' : 'INSTALL APP (PWA)'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
              {platform === 'desktop'
                ? 'Dedicated window + Ctrl+V screenshot paste'
                : 'No APK needed · Instant lightweight install'}
            </p>
          </div>
        </div>
        {platform !== 'android' && (
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-[#D4AF37]/15 text-[#9A6F18] dark:text-[#F5D061] border border-[#D4AF37]/30 whitespace-nowrap">
            Recommended
          </span>
        )}
      </div>

      {platform === 'ios' ? (
        <p className="text-xs text-slate-700 dark:text-neutral-300 leading-relaxed">
          Safari mein neeche <strong>Share → Add to Home Screen</strong> par tap karein.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleInstallPwaClick}
          className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-full gold-cta active:scale-[0.98] px-4 text-xs font-bold transition-transform whitespace-nowrap cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Install App (Recommended)</span>
        </button>
      )}

      {showPwaSteps && platform !== 'ios' && (
        <div className="rounded-2xl bg-slate-50 dark:bg-[#070708] border border-[#D4AF37]/25 p-3 space-y-1 text-xs text-slate-700 dark:text-neutral-200">
          <p>
            <span className="font-semibold text-[#9A6F18] dark:text-[#F5D061]">Chrome Steps: </span>
            Chrome menu (3 dots) &gt; Add to Home screen / Install app
          </p>
          <p className="text-[11px] text-slate-500 dark:text-neutral-400">
            Install sirf published HTTPS link par kaam karta hai, AI Studio preview iframe ke andar
            nahi.
          </p>
        </div>
      )}

      <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-relaxed">
        {platform === 'desktop'
          ? 'Ya browser me kholo, website poori tarah kaam karti hai.'
          : 'Instant PWA: bina Play Store ke seedha Home Screen se khulega.'}
      </p>
    </div>
  );

  const androidApkCard = (
    <div
      key="android-apk"
      className="rounded-3xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] p-4 sm:p-5 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-2xl bg-[#D4AF37]/15 text-[#9A6F18] dark:text-[#F5D061] border border-[#D4AF37]/25 flex items-center justify-center shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">ANDROID APP &amp; APK</h3>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
              {platform === 'android'
                ? 'Direct Android APK download aur PWA install'
                : 'APK sirf Android ke liye hai'}
            </p>
          </div>
        </div>
        {platform === 'android' && (
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-[#D4AF37]/15 text-[#9A6F18] dark:text-[#F5D061] border border-[#D4AF37]/30 whitespace-nowrap">
            Android
          </span>
        )}
      </div>

      {platform !== 'android' ? (
        <div className="rounded-2xl bg-slate-50 dark:bg-[#070708] border border-slate-100 dark:border-[#D4AF37]/15 p-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-600 dark:text-neutral-300">
            APK sirf Android ke liye hai. Is device par upar wala <strong>Install App</strong> option
            use karein.
          </p>
          {effectiveApkUrl && (
            <a
              href={effectiveApkUrl}
              download={APK_FILENAME}
              rel="noopener noreferrer"
              target="_blank"
              onClick={() => {
                playClickSound();
                triggerDownloadToast();
                setShowApkSheet(true);
              }}
              className="text-xs font-semibold text-[#9A6F18] dark:text-[#F5D061] hover:underline whitespace-nowrap"
            >
              Phir bhi APK Download Karein (v{APK_VERSION}) →
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {effectiveApkUrl ? (
            <>
              <a
                href={effectiveApkUrl}
                download={APK_FILENAME}
                rel="noopener noreferrer"
                target="_blank"
                onClick={() => {
                  playClickSound();
                  triggerDownloadToast();
                  setShowApkSheet(true);
                }}
                className="w-full min-h-[50px] inline-flex items-center justify-center gap-2 rounded-full gold-cta active:scale-[0.98] px-4 py-2 text-xs font-bold text-center transition-transform sm:whitespace-nowrap"
              >
                <Download className="h-4 w-4 shrink-0" />
                <span>
                  Download APK (v{APK_VERSION}, {APK_SIZE_MB} MB)
                </span>
              </a>

              <button
                type="button"
                onClick={handleInstallPwaClick}
                className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-[#D4AF37]/25 bg-slate-50 dark:bg-[#16161B] hover:border-[#D4AF37]/60 px-4 text-xs font-semibold text-slate-900 dark:text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="h-4 w-4 text-[#D4AF37]" />
                <span>Install App (PWA)</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleInstallPwaClick}
                className="w-full min-h-[50px] inline-flex items-center justify-center gap-2 rounded-full gold-cta active:scale-[0.98] px-4 text-xs font-bold transition-transform whitespace-nowrap cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Install App (Recommended)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onOpenApkSetup?.();
                }}
                className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-[#D4AF37]/25 bg-slate-50 dark:bg-[#16161B] hover:border-[#D4AF37]/60 px-4 text-xs font-semibold text-slate-800 dark:text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                <Wrench className="h-4 w-4 text-[#D4AF37]" />
                <span>APK Link Setup</span>
              </button>
            </>
          )}

          {showPwaSteps && (
            <div className="rounded-2xl bg-slate-50 dark:bg-[#070708] border border-[#D4AF37]/25 p-3 space-y-1 text-xs text-slate-700 dark:text-neutral-200">
              <p>
                <span className="font-semibold text-[#9A6F18] dark:text-[#F5D061]">Chrome Steps: </span>
                Chrome menu (3 dots) &gt; Add to Home screen / Install app
              </p>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Install sirf published HTTPS link par kaam karta hai, AI Studio preview iframe ke
                andar nahi.
              </p>
            </div>
          )}

          <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-relaxed">
            APK install se pehle Settings me &apos;Install unknown apps&apos; allow karna padega.
          </p>
        </div>
      )}
    </div>
  );

  // Android shows APK card first; iOS and Desktop show Install App (PWA) first
  const orderedCards =
    platform === 'android' ? [androidApkCard, pwaInstallCard] : [pwaInstallCard, androidApkCard];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">App Download Karo</h2>
          <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-numeric tabular-nums">
            App v{APP_VERSION} ({APP_SIZE_LABEL}) · APK v{APK_VERSION} ({APK_SIZE_MB} MB)
          </p>
        </div>

        <button
          type="button"
          onClick={handleShareLink}
          className="min-h-[42px] inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-[#D4AF37]/25 bg-white dark:bg-[#101013] hover:border-[#D4AF37]/60 px-3.5 text-xs font-semibold text-slate-800 dark:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {copiedLink ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#1DDB04]" />
              <span className="text-[#1DDB04]">Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span>Share App Link</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-3">{orderedCards}</div>

      {toastMsg && (
        <div
          role="status"
          className="fixed top-4 left-4 right-4 sm:left-auto sm:right-5 sm:max-w-sm z-50 rounded-2xl border border-[#D4AF37]/50 bg-[#101013] px-4 py-3 text-xs font-semibold text-white shadow-2xl flex items-center justify-between gap-3"
        >
          <span className="text-[#F5D061]">{toastMsg}</span>
          <button
            type="button"
            aria-label="Dismiss toast"
            onClick={() => setToastMsg(null)}
            className="text-neutral-400 hover:text-white cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <ApkInstallStepsSheet
        open={showApkSheet}
        apkUrl={effectiveApkUrl}
        onClose={() => setShowApkSheet(false)}
      />
    </section>
  );
};

interface DeveloperApkSetupPanelProps {
  openSignal?: number;
}

export const DeveloperApkSetupPanel: React.FC<DeveloperApkSetupPanelProps> = ({ openSignal = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const [inputUrl, setInputUrl] = useState<string>(() => getApkUrlOverride());
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'warn' | 'err'; text: string } | null>(
    null
  );
  const [testing, setTesting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openSignal > 0) {
      setExpanded(true);
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
    }
  }, [openSignal]);

  const handleSave = () => {
    playClickSound();
    const res = validateApkUrl(inputUrl);
    if (!res.valid) {
      setFeedback({ type: 'err', text: res.error || 'Invalid APK link.' });
      return;
    }
    saveApkUrlOverride(res.url);
    setInputUrl(res.url);
    setFeedback({
      type: 'ok',
      text: 'APK link save ho gaya! Ab Download APK button active hai.',
    });
  };

  const handleTest = async () => {
    playClickSound();
    const res = validateApkUrl(inputUrl);
    if (!res.valid) {
      setFeedback({ type: 'err', text: res.error || 'Invalid APK link.' });
      return;
    }

    setTesting(true);
    setFeedback(null);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const headRes = await fetch(res.url, {
        method: 'HEAD',
        mode: 'cors',
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (headRes.ok) {
        setFeedback({
          type: 'ok',
          text: 'Link reachable hai! Download karne ke liye Save dabake Download APK test karein.',
        });
      } else {
        openExternalTab(res.url);
        setFeedback({
          type: 'warn',
          text: 'Agar download shuru ho gaya to link sahi hai.',
        });
      }
    } catch {
      // Cross-origin servers (GitHub Releases, S3, etc.) block CORS HEAD checks — test in a new tab directly
      openExternalTab(res.url);
      setFeedback({
        type: 'warn',
        text: 'Agar download shuru ho gaya to link sahi hai.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClear = () => {
    playClickSound();
    clearApkUrlOverride();
    setInputUrl('');
    setFeedback({ type: 'ok', text: 'Saved APK link clear kar diya gaya hai.' });
  };

  return (
    <section
      ref={panelRef}
      className="rounded-3xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] overflow-hidden"
    >
      <button
        type="button"
        onClick={() => {
          playClickSound();
          setExpanded((e) => !e);
        }}
        className="w-full min-h-[54px] flex items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-[#D4AF37]/[0.04]"
      >
        <div className="flex items-center gap-2.5">
          <Wrench className="h-4 w-4 text-[#D4AF37] shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
            Developer: APK Link Set Karo
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-[#D4AF37]/15 space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="apk-override-input"
              className="text-xs font-medium text-slate-600 dark:text-neutral-300 block"
            >
              Direct HTTPS APK URL (e.g. GitHub Releases)
            </label>
            <input
              id="apk-override-input"
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://github.com/user/repo/releases/download/v1.0.0/ChartAnalyzer.apk"
              className="w-full min-h-[46px] rounded-2xl border border-slate-200 dark:border-[#D4AF37]/25 bg-slate-50 dark:bg-[#070708] px-3.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full gold-cta text-xs font-bold cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Save</span>
            </button>

            <button
              type="button"
              disabled={testing}
              onClick={handleTest}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 dark:border-[#D4AF37]/25 bg-slate-50 dark:bg-[#16161B] text-xs font-semibold text-slate-800 dark:text-white cursor-pointer disabled:opacity-60"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span>{testing ? 'Testing…' : 'Test Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full border border-[#FF4D1F]/30 bg-[#FF4D1F]/10 text-xs font-semibold text-[#FF4D1F] cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          </div>

          {feedback && (
            <div
              role="status"
              className={`rounded-2xl px-3 py-2.5 text-xs leading-relaxed ${
                feedback.type === 'err'
                  ? 'bg-[#FF4D1F]/10 border border-[#FF4D1F]/30 text-[#FF4D1F]'
                  : feedback.type === 'warn'
                    ? 'bg-[#FBBF24]/10 border border-[#FBBF24]/30 text-[#D97706] dark:text-[#FBBF24]'
                    : 'bg-[#1DDB04]/10 border border-[#1DDB04]/30 text-slate-800 dark:text-[#1DDB04]'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-relaxed">
            Yeh link sirf is phone/browser me save hota hai. Sabke liye config.ts me APK_URL set
            karo.
          </p>
        </div>
      )}
    </section>
  );
};

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 sm:right-auto z-50 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg text-center sm:text-left">
      Internet off hai — Chart analyze karne ke liye internet connect karein.
    </div>
  );
};

export const UpdateSnackbar: React.FC = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateFn, setUpdateFn] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    try {
      const updateSW = registerSW({
        immediate: false,
        onNeedRefresh() {
          setUpdateFn(() => updateSW);
          setNeedRefresh(true);
        },
      });
    } catch {
      // Ignore if SW registration fails in unsupported preview contexts
    }
  }, []);

  if (!needRefresh || !updateFn) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-5 left-4 right-4 sm:left-auto sm:right-5 z-50 max-w-sm rounded-2xl border border-[#D4AF37]/40 bg-[#101013] px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
      <span className="text-xs font-semibold text-white">
        Naya update available, Refresh karo
      </span>
      <button
        type="button"
        onClick={() => {
          playClickSound();
          updateFn(true);
        }}
        className="min-h-[38px] inline-flex items-center gap-1.5 rounded-full gold-cta px-3.5 text-xs font-bold shrink-0 cursor-pointer"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Refresh
      </button>
    </div>
  );
};
