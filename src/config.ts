// App-wide configuration constants, Creator Branding & APK URL override helpers
export const APK_URL: string = '';
export const APK_VERSION = '1.0.0';
export const APK_SIZE_MB = '12';
export const APK_FILENAME = 'ChartAnalyzer.apk';

export const APP_VERSION = '2.4.0';
export const APP_SIZE_LABEL = '~2.1 MB';
export const APP_NAME = 'Chart Analyzer';
export const APP_SHORT_NAME = 'Analyzer';

export const CREATOR_NAME = 'Nizam XD';
export const CREATOR_CREDIT = 'Created & Developed by Nizam XD';
export const CREATOR_AVATAR_URL =
  '/assets/aistudio/photo_2026-06-14_02-16-44_-_Copy_803016cf.jpg';
export const COPYRIGHT_NOTICE = '© 2026 Nizam XD. All Rights Reserved.';
export const EDUCATIONAL_DISCLAIMER =
  'Yeh sirf educational technical analysis hai — koi financial advice, invented signal ya guaranteed profit nahi. Hamesha stop-loss aur proper risk management follow karein.';

export const APK_OVERRIDE_STORAGE_KEY = 'apk_url_override';

const apkListeners = new Set<() => void>();

export function subscribeApkUrl(listener: () => void): () => void {
  apkListeners.add(listener);
  return () => apkListeners.delete(listener);
}

function notifyApkListeners(): void {
  apkListeners.forEach((fn) => fn());
}

export function isApkUrlConfigured(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.includes('PASTE_APK_LINK_HERE')) return false;
  return true;
}

export function getApkUrlOverride(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(APK_OVERRIDE_STORAGE_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

export function getEffectiveApkUrl(): string {
  const override = getApkUrlOverride();
  if (isApkUrlConfigured(override)) return override;
  if (isApkUrlConfigured(APK_URL)) return APK_URL.trim();
  return '';
}

export function validateApkUrl(raw: string): {
  valid: boolean;
  url: string;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      valid: false,
      url: '',
      error: 'Kripya APK ka HTTPS link paste karein.',
    };
  }

  if (trimmed.toLowerCase().includes('drive.google.com')) {
    return {
      valid: false,
      url: trimmed,
      error: 'Google Drive link direct download nahi deta.',
    };
  }

  let parsedPath = trimmed.toLowerCase();
  try {
    const u = new URL(trimmed);
    parsedPath = u.pathname.toLowerCase();
  } catch {
    // Fallback to raw lowercase string check below
  }

  const isHttps = trimmed.startsWith('https://');
  const looksLikeApk =
    parsedPath.endsWith('.apk') ||
    trimmed.toLowerCase().endsWith('.apk') ||
    trimmed.includes('/releases/download/');

  if (!isHttps || !looksLikeApk) {
    return {
      valid: false,
      url: trimmed,
      error:
        "Yeh direct APK link nahi lag raha. GitHub Releases ka 'Copy link address' wala link daalo.",
    };
  }

  return { valid: true, url: trimmed };
}

export function saveApkUrlOverride(url: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(APK_OVERRIDE_STORAGE_KEY, url.trim());
  notifyApkListeners();
}

export function clearApkUrlOverride(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(APK_OVERRIDE_STORAGE_KEY);
  notifyApkListeners();
}
