import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  APP_NAME,
  APP_VERSION,
  COPYRIGHT_NOTICE,
  CREATOR_AVATAR_URL,
  CREATOR_CREDIT,
  CREATOR_NAME,
  EDUCATIONAL_DISCLAIMER,
} from '../config';

interface BrandLogoProps {
  size?: number;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 40, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label={`${APP_NAME} custom Black & Gold logo`}
    className={`shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="brandObsidian" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#17171B" />
        <stop offset="100%" stopColor="#050506" />
      </linearGradient>
      <linearGradient id="brandGold" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FCE79C" />
        <stop offset="50%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#9A6F18" />
      </linearGradient>
    </defs>
    <rect x="1.5" y="1.5" width="61" height="61" rx="16" fill="url(#brandObsidian)" stroke="url(#brandGold)" strokeWidth="2.2" />
    <path d="M12 45 Q32 39 50 17" stroke="url(#brandGold)" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.45" />
    {/* Candle 1 */}
    <line x1="19" y1="28" x2="19" y2="48" stroke="#D4AF37" strokeOpacity="0.72" strokeWidth="2.2" strokeLinecap="round" />
    <rect x="15.5" y="33" width="7" height="10" rx="2" fill="#D4AF37" fillOpacity="0.68" />
    {/* Candle 2 */}
    <line x1="32" y1="20" x2="32" y2="44" stroke="url(#brandGold)" strokeWidth="2.4" strokeLinecap="round" />
    <rect x="28.5" y="25" width="7" height="13" rx="2" fill="url(#brandGold)" />
    {/* Candle 3 */}
    <line x1="45" y1="13" x2="45" y2="36" stroke="#FCE79C" strokeWidth="2.4" strokeLinecap="round" />
    <rect x="41.5" y="17.5" width="7" height="13.5" rx="2" fill="url(#brandGold)" stroke="#FCE79C" strokeWidth="0.8" />
  </svg>
);

interface CreatorAvatarProps {
  sizeClass?: string;
  alt?: string;
}

export const CreatorAvatar: React.FC<CreatorAvatarProps> = ({
  sizeClass = 'h-10 w-10',
  alt = `${CREATOR_NAME} creator profile`,
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-gradient-to-br from-[#F5D061] via-[#D4AF37] to-[#8C6214] p-[1.5px] shrink-0`}
        aria-label={alt}
      >
        <div className="h-full w-full rounded-full bg-[#09090B] flex items-center justify-center text-xs font-bold text-[#F5D061]">
          NX
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-[#FCE79C] via-[#D4AF37] to-[#8C6214] p-[1.5px] shrink-0 shadow-[0_0_12px_rgba(212,175,55,0.22)]`}
    >
      <img
        src={CREATOR_AVATAR_URL}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full rounded-full object-cover object-top bg-[#09090B]"
      />
    </div>
  );
};

interface PermanentWatermarkProps {
  compact?: boolean;
  className?: string;
}

export const PermanentWatermark: React.FC<PermanentWatermarkProps> = ({
  compact = false,
  className = '',
}) => (
  <div
    className={`inline-flex max-w-full items-center gap-2 rounded-lg border border-[#D4AF37]/25 bg-[#09090B]/85 backdrop-blur-xs px-2.5 py-1 text-[10px] font-medium text-[#E9D7A6] select-none ${
      compact ? '' : 'flex-wrap justify-center text-center'
    } ${className}`}
  >
    <BrandLogo size={16} />
    <span className={compact ? 'truncate' : 'break-words'}>
      {compact
        ? `${APP_NAME} v${APP_VERSION} · ${CREATOR_CREDIT}`
        : `${APP_NAME} v${APP_VERSION} · ${CREATOR_CREDIT} · ${COPYRIGHT_NOTICE}`}
    </span>
  </div>
);

interface AboutCreatorCardProps {
  compact?: boolean;
}

export const AboutCreatorCard: React.FC<AboutCreatorCardProps> = ({ compact = false }) => (
  <section className="rounded-3xl border border-[#D4AF37]/25 bg-white dark:bg-[#101013] p-5 sm:p-6 space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-3.5 min-w-0">
        <CreatorAvatar sizeClass={compact ? 'h-14 w-14' : 'h-16 w-16'} />
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] font-semibold text-[#9A6F18] dark:text-[#D4AF37]">
            About &amp; Creator Profile
          </p>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#FAF4E4] truncate">
            {CREATOR_CREDIT}
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#A89F8D] font-numeric">
            {APP_NAME} · Version {APP_VERSION}
          </p>
        </div>
      </div>

      <div className="sm:ml-auto flex items-center gap-2.5 shrink-0">
        <BrandLogo size={36} />
        <div className="text-left sm:text-right">
          <p className="text-xs font-bold text-slate-900 dark:text-[#F5D061]">Black &amp; Gold Edition</p>
          <p className="text-[11px] text-slate-500 dark:text-[#A89F8D]">Intraday Technical Suite</p>
        </div>
      </div>
    </div>

    {!compact && (
      <p className="text-xs sm:text-sm text-slate-600 dark:text-[#CFC6B4] leading-relaxed">
        Indian intraday traders (NIFTY, BANKNIFTY, NSE stocks) ke liye bana candlestick chart analyzer — jahan har chart screenshot ka transparent price-action breakdown, pattern recognition aur beginner Hinglish guide milti hai.
      </p>
    )}

    <div className="rounded-2xl border border-[#D4AF37]/20 bg-slate-50 dark:bg-[#08080A] p-3.5 flex items-start gap-2.5">
      <ShieldCheck className="h-4 w-4 text-[#9A6F18] dark:text-[#D4AF37] shrink-0 mt-0.5" />
      <p className="text-xs text-slate-600 dark:text-[#BFB6A4] leading-relaxed">
        {EDUCATIONAL_DISCLAIMER}
      </p>
    </div>

    <div className="pt-2 border-t border-slate-200 dark:border-[#D4AF37]/15 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-[#968D7C]">
      <span>{COPYRIGHT_NOTICE}</span>
      <span className="font-numeric">Build v{APP_VERSION}</span>
    </div>
  </section>
);
