import React, { useState } from 'react';
import { Download } from 'lucide-react';
import type { PriceShape } from '../types/chart';
import { downloadShapeCard } from '../utils/image';
import { playClickSound } from '../utils/sound';

interface ShapeCardProps {
  shape: PriceShape;
  instrument: string;
  timeframe: string;
  onFlashOnChart?: (shape: PriceShape) => void;
  compact?: boolean;
  onOpenShapesTab?: () => void;
}

function getShapeAccent(bias: PriceShape['bias']) {
  if (bias === 'bullish') {
    return {
      stroke: '#1DDB04',
      badge: 'bg-[#1DDB04]/15 text-[#1DDB04]',
      label: 'Bullish',
    };
  }
  if (bias === 'bearish') {
    return {
      stroke: '#FF4D1F',
      badge: 'bg-[#FF4D1F]/15 text-[#FF4D1F]',
      label: 'Bearish',
    };
  }
  return {
    stroke: '#FBBF24',
    badge: 'bg-[#FBBF24]/15 text-[#FBBF24]',
    label: 'Neutral',
  };
}

function getShapeLetterGlyph(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('w shape') || n.includes('double bottom')) return 'W';
  if (n.includes('m shape') || n.includes('double top')) return 'M';
  if (n.includes('inverted v')) return '∧';
  if (n.includes('v shape')) return 'V';
  if (n.includes('rounding bottom') || n.includes('cup')) return '∪';
  if (n.includes('rounding top')) return '∩';
  if (n.includes('head & shoulders')) return '⛰';
  if (n.includes('triangle') || n.includes('wedge') || n.includes('pennant')) return '△';
  if (n.includes('flag') || n.includes('channel') || n.includes('staircase')) return '⚡';
  if (n.includes('rectangle') || n.includes('range')) return '▭';
  return '∿';
}

function buildSmoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const mx = ((p0.x + p1.x) / 2).toFixed(1);
    const my = ((p0.y + p1.y) / 2).toFixed(1);
    if (i === 0) {
      d += ` Q ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} ${mx} ${my}`;
    } else {
      d += ` T ${mx} ${my}`;
    }
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

export const ShapeCard: React.FC<ShapeCardProps> = ({
  shape,
  instrument,
  timeframe,
  onFlashOnChart,
  compact = false,
  onOpenShapesTab,
}) => {
  const [downloading, setDownloading] = useState(false);
  const accent = getShapeAccent(shape.bias);
  const statusLabel =
    shape.completion_status === 'completed'
      ? 'Completed'
      : shape.completion_status === 'broken'
        ? 'Broken'
        : 'Forming';

  // Rescale shape points into 320x180 (16:9) SVG viewBox preserving proportions
  const svgW = 320;
  const svgH = 180;
  const padX = 28;
  const padY = 26;

  const rawPts = Array.isArray(shape.points) ? shape.points : [];
  const xs = rawPts.map((p) => p.x);
  const ys = rawPts.map((p) => p.y);
  if (shape.neckline) ys.push(shape.neckline.y);

  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : 1000;
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxY = ys.length ? Math.max(...ys) : 1000;

  const spanX = Math.max(10, maxX - minX);
  const spanY = Math.max(10, maxY - minY);

  const scaledPts = rawPts.map((p) => ({
    x: padX + ((p.x - minX) / spanX) * (svgW - padX * 2),
    y: padY + ((p.y - minY) / spanY) * (svgH - padY * 2),
    label: p.label,
  }));

  const necklineY = shape.neckline
    ? padY + ((shape.neckline.y - minY) / spanY) * (svgH - padY * 2)
    : null;

  const pathD = buildSmoothPath(scaledPts);
  const glyph = getShapeLetterGlyph(shape.name);

  return (
    <article
      onClick={() => {
        if (onFlashOnChart) {
          playClickSound();
          onFlashOnChart(shape);
        }
      }}
      className="rounded-3xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] p-5 space-y-4 cursor-pointer transition-colors hover:border-[#D4AF37]/50"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`font-semibold px-2.5 py-0.5 rounded-full ${accent.badge}`}>
              {accent.label}
            </span>
            <span className="text-slate-500 dark:text-neutral-400 font-medium">
              {statusLabel}
            </span>
            {shape.is_primary && (
              <span className="text-[#9A6F18] dark:text-[#F5D061] font-semibold">· Primary Shape</span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {shape.name}
          </h3>
        </div>

        <div className="text-right font-numeric tabular-nums">
          <span className="text-[11px] text-slate-500 dark:text-neutral-400 block">Confidence</span>
          <span className="text-lg font-bold text-slate-900 dark:text-[#F5D061]">
            {Math.round(shape.confidence || 0)}%
          </span>
        </div>
      </div>

      {/* Separate 16:9 SVG Illustration */}
      <div className="rounded-2xl bg-[#070708] border border-[#D4AF37]/20 p-2 overflow-hidden">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full aspect-video block">
          {/* Subtle technical grid */}
          <g stroke="rgba(255,255,255,0.05)" strokeWidth="1">
            <line x1="0" y1="45" x2={svgW} y2="45" />
            <line x1="0" y1="90" x2={svgW} y2="90" />
            <line x1="0" y1="135" x2={svgW} y2="135" />
            <line x1="80" y1="0" x2="80" y2={svgH} />
            <line x1="160" y1="0" x2="160" y2={svgH} />
            <line x1="240" y1="0" x2="240" y2={svgH} />
          </g>

          {/* Neckline if present */}
          {necklineY !== null && (
            <g>
              <line
                x1="12"
                y1={necklineY}
                x2={svgW - 12}
                y2={necklineY}
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="1.2"
                strokeDasharray="5 4"
              />
              <text
                x={svgW - 14}
                y={Math.max(12, necklineY - 5)}
                textAnchor="end"
                fill="rgba(255,255,255,0.72)"
                fontSize="9"
                fontFamily="Poppins, sans-serif"
                fontWeight="600"
              >
                Neckline
              </text>
            </g>
          )}

          {/* Animated self-drawing path */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={accent.stroke}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-draw-shape"
            />
          )}

          {/* Swing points and tiny labels */}
          {scaledPts.map((pt, idx) => (
            <g key={idx}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4"
                fill="#0B0B0B"
                stroke={accent.stroke}
                strokeWidth="2"
              />
              <text
                x={pt.x}
                y={pt.y < 24 ? pt.y + 14 : pt.y - 8}
                textAnchor="middle"
                fill="#E5E7EB"
                fontSize="8.5"
                fontFamily="Poppins, sans-serif"
                fontWeight="500"
              >
                {pt.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Big letter glyph + Meaning */}
      <div className="flex items-start gap-3.5">
        <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-[#D4AF37]/10 border border-slate-200 dark:border-[#D4AF37]/25 flex items-center justify-center text-xl font-bold text-slate-900 dark:text-[#F5D061] shrink-0">
          {glyph}
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Iska matlab</p>
          <p className="text-sm text-slate-800 dark:text-neutral-200 leading-relaxed">
            {shape.meaning_hinglish}
          </p>
        </div>
      </div>

      {compact ? (
        onOpenShapesTab && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playClickSound();
              onOpenShapesTab();
            }}
            className="w-full min-h-[44px] rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs font-semibold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Shapes Tab Mein Full Detail Dekho →
          </button>
        )
      ) : (
        <>
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-[#D4AF37]/15 text-xs sm:text-sm">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white mb-0.5">Aage kya hota hai</p>
              <p className="text-slate-600 dark:text-neutral-300 leading-relaxed">
                {shape.what_next_hinglish}
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white mb-0.5">
                Kaise trade karte hain (seekhne ke liye)
              </p>
              <p className="text-slate-600 dark:text-neutral-300 leading-relaxed">
                {shape.how_to_trade_hinglish}
              </p>
            </div>
            <div className="rounded-2xl border border-[#FF4D1F]/25 bg-[#FF4D1F]/10 p-3">
              <p className="font-semibold text-[#FF4D1F] mb-0.5">Dhyan rakho (Fakeout Risk)</p>
              <p className="text-slate-700 dark:text-neutral-200 text-xs leading-relaxed">
                {shape.watch_out_hinglish}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              playClickSound();
              setDownloading(true);
              try {
                await downloadShapeCard(shape, instrument, timeframe);
              } finally {
                setDownloading(false);
              }
            }}
            disabled={downloading}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-[#D4AF37]/30 bg-slate-50 dark:bg-[#16161B] hover:border-[#D4AF37]/60 active:scale-[0.98] px-4 py-2 text-xs font-semibold text-slate-900 dark:text-white transition-all cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#D4AF37]" />
            {downloading ? 'Saving Shape…' : 'Shape Download'}
          </button>
        </>
      )}
    </article>
  );
};

export interface ShapeDictEntry {
  name: string;
  meaning: string;
  points: string;
  color: string;
}

export const SHAPE_DICTIONARY: ShapeDictEntry[] = [
  { name: 'V Shape', meaning: 'Tezi se girne ke baad turant sharp U-turn upar (buyers aggressive).', points: '4,10 24,38 44,8', color: '#1DDB04' },
  { name: 'Inverted V Shape', meaning: 'Tezi se upar jaakar turant sharp girawat (sellers active).', points: '4,38 24,8 44,38', color: '#FF4D1F' },
  { name: 'W Shape', meaning: 'Double Bottom: 2 baar neeche support leke upar breakout.', points: '4,12 14,36 24,20 34,36 44,10', color: '#1DDB04' },
  { name: 'M Shape', meaning: 'Double Top: 2 baar upar takra kar neeche girna.', points: '4,36 14,10 24,26 34,10 44,38', color: '#FF4D1F' },
  { name: 'Triple Bottom', meaning: '3 baar ek hi support par ruk kar upar bounce.', points: '4,16 12,36 20,22 26,36 34,22 40,36 46,12', color: '#1DDB04' },
  { name: 'Triple Top', meaning: '3 baar ek hi resistance se reject hokar girawat.', points: '4,34 12,12 20,26 26,12 34,26 40,12 46,38', color: '#FF4D1F' },
  { name: 'Head & Shoulders', meaning: 'Beech mein sabse bada peak (Head) aur dono side chhote peaks — bearish reversal.', points: '4,36 12,20 18,32 25,8 32,32 38,20 46,38', color: '#FF4D1F' },
  { name: 'Inverse Head & Shoulders', meaning: 'Neeche 3 lows jisme beech wala sabse gehra — bullish reversal.', points: '4,12 12,28 18,16 25,40 32,16 38,28 46,10', color: '#1DDB04' },
  { name: 'Rounding Bottom', meaning: 'Dheere-dheere bowl/U jaisa bottom bana kar uptrend shuru.', points: '4,14 14,32 24,38 34,32 44,14', color: '#1DDB04' },
  { name: 'Rounding Top', meaning: 'Upar dome jaisa curve bana kar dheere-dheere girawat.', points: '4,34 14,16 24,10 34,16 44,34', color: '#FF4D1F' },
  { name: 'Cup & Handle', meaning: 'Gol cup jaisa base aur chhota pullback (handle), phir breakout upar.', points: '4,14 14,36 26,36 34,14 39,22 46,8', color: '#1DDB04' },
  { name: 'Ascending Triangle', meaning: 'Upar flat resistance aur neeche rising lows — upside breakout chance.', points: '4,36 14,14 22,30 30,14 38,24 46,8', color: '#1DDB04' },
  { name: 'Descending Triangle', meaning: 'Neeche flat support aur upar lower highs — downside breakdown risk.', points: '4,12 14,34 22,18 30,34 38,24 46,40', color: '#FF4D1F' },
  { name: 'Symmetrical Triangle', meaning: 'Range chhoti hoti jati hai; jis side breakout ho udhar tezi.', points: '4,10 14,36 24,16 32,30 40,22 46,12', color: '#FBBF24' },
  { name: 'Rising Wedge', meaning: 'Price upar sikudti hai aur achanak neeche toot sakti hai (bearish).', points: '4,38 14,20 22,32 32,12 38,24 46,38', color: '#FF4D1F' },
  { name: 'Falling Wedge', meaning: 'Price neeche sikudti hai aur upar breakout deti hai (bullish).', points: '4,10 14,28 22,16 32,36 38,24 46,10', color: '#1DDB04' },
  { name: 'Bull Flag', meaning: 'Tezi ke baad halka downward pause (flag), phir dubara rally.', points: '4,40 16,12 24,20 32,16 38,24 46,8', color: '#1DDB04' },
  { name: 'Bear Flag', meaning: 'Girawat ke baad halka upward pause, phir dubara fall.', points: '4,8 16,36 24,28 32,32 38,24 46,40', color: '#FF4D1F' },
  { name: 'Pennant', meaning: 'Tez move ke baad chhota triangle pause aur trend continue.', points: '4,40 18,14 26,26 34,18 46,10', color: '#1DDB04' },
  { name: 'Rectangle / Range', meaning: 'Price do fixed lines (box) ke beech upar-neeche ghoomti hai.', points: '4,34 14,14 24,34 34,14 44,34', color: '#FBBF24' },
  { name: 'Channel Up', meaning: 'Do parallel upar jati lines ke beech steady uptrend.', points: '4,38 14,26 22,32 32,18 38,24 46,10', color: '#1DDB04' },
  { name: 'Channel Down', meaning: 'Do parallel neeche jati lines ke beech steady downtrend.', points: '4,10 14,22 22,16 32,30 38,24 46,38', color: '#FF4D1F' },
  { name: 'Staircase Uptrend', meaning: 'Seedhiyon ki tarah Higher Highs & Higher Lows banate hue upar.', points: '4,40 14,28 20,32 30,18 36,22 46,8', color: '#1DDB04' },
  { name: 'Staircase Downtrend', meaning: 'Lower Highs & Lower Lows banate hue neeche girta trend.', points: '4,8 14,20 20,16 30,30 36,26 46,40', color: '#FF4D1F' },
  { name: 'Zig-Zag / Choppy', meaning: 'Koi saaf shape nahi, market confuse ya sideways hai — avoid.', points: '4,24 12,12 20,36 28,14 36,34 46,20', color: '#FBBF24' },
];

export function findShapeDictEntry(name: string): ShapeDictEntry | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  return (
    SHAPE_DICTIONARY.find((s) => s.name.toLowerCase() === n) ||
    SHAPE_DICTIONARY.find((s) => n.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(n))
  );
}

export const MiniShapeSvg: React.FC<{ points: string; color: string }> = React.memo(({ points, color }) => (
  <svg viewBox="0 0 50 46" className="h-11 w-12 shrink-0 rounded-xl bg-[#070708] p-1 border border-[#D4AF37]/20">
    <polyline
      points={points}
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));

export const ShapeDictionary: React.FC<{ matchedShapeNames?: string[] }> = ({
  matchedShapeNames = [],
}) => {
  const normalizedMatches = new Set(
    matchedShapeNames
      .map((m) => findShapeDictEntry(m)?.name.toLowerCase() || m.trim().toLowerCase())
      .filter(Boolean)
  );

  const sortedDict =
    normalizedMatches.size > 0
      ? [
          ...SHAPE_DICTIONARY.filter((item) => normalizedMatches.has(item.name.toLowerCase())),
          ...SHAPE_DICTIONARY.filter((item) => !normalizedMatches.has(item.name.toLowerCase())),
        ]
      : SHAPE_DICTIONARY;

  return (
    <section className="rounded-3xl border border-slate-200 dark:border-[#D4AF37]/20 bg-white dark:bg-[#101013] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Price Shape Dictionary (Seekho)
          </h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Market ki sabhi common price shapes aur unka simple matlab
          </p>
        </div>
        {normalizedMatches.size > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 px-3 py-1 text-[11px] font-bold text-[#9A6F18] dark:text-[#F5D061]">
            Chart Se {normalizedMatches.size} Shape Match
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sortedDict.map((item) => {
          const isMatched = normalizedMatches.has(item.name.toLowerCase());
          return (
            <div
              key={item.name}
              className={`cv-auto flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                isMatched
                  ? 'border-[#D4AF37]/70 bg-[#D4AF37]/10 dark:bg-[#D4AF37]/[0.08]'
                  : 'border-slate-100 dark:border-[#D4AF37]/15 bg-slate-50 dark:bg-[#070708]'
              }`}
            >
              <MiniShapeSvg points={item.points} color={item.color} />
              <div className="min-w-0 space-y-0.5 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  {isMatched && (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#D4AF37] text-black shrink-0">
                      Chart Match
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-neutral-400 leading-snug">
                  {item.meaning}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
