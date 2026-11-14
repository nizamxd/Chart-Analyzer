import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const scenarioPlanSchema = {
  type: Type.OBJECT,
  properties: {
    entry_zone: { type: Type.STRING },
    stop_loss: { type: Type.STRING },
    target1: { type: Type.STRING },
    target2: { type: Type.STRING },
    risk_reward: { type: Type.STRING },
    when_valid_hinglish: { type: Type.STRING },
    avoid_when_hinglish: { type: Type.STRING },
  },
  required: [
    'entry_zone',
    'stop_loss',
    'target1',
    'target2',
    'risk_reward',
    'when_valid_hinglish',
    'avoid_when_hinglish',
  ],
};

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    is_valid_chart: {
      type: Type.BOOLEAN,
      description: 'True only if the image is a readable candlestick price chart. False if blurry, too zoomed-out to see candles, cropped beyond recognition, or not a candlestick chart.',
    },
    invalid_reason_hinglish: {
      type: Type.STRING,
      description: 'If is_valid_chart is false, explain honestly in friendly Hinglish why it cannot be analyzed. Empty string if valid.',
    },
    instrument: {
      type: Type.STRING,
      description: 'Detected stock/index name (e.g. NIFTY, BANKNIFTY, RELIANCE). Use "Chart" if not visible.',
    },
    timeframe: {
      type: Type.STRING,
      description: 'Active chart timeframe (use user-selected timeframe if provided, else detect from chart e.g. 1m, 2m, 5m, 10m, 15m, 1h, 1D).',
    },
    last_close: {
      type: Type.STRING,
      description: 'Last close / LTP price read from the chart right axis or header (e.g. "25,139.95"). Use "N/A" if axis is hidden.',
    },
    price_change_text: {
      type: Type.STRING,
      description: 'Observed visible change from header or recent move (e.g. "+14.45 (+0.06%)" or "Up from day low").',
    },
    chart_plot_box: {
      type: Type.ARRAY,
      items: { type: Type.NUMBER },
      description: 'Exact bounding box [ymin, xmin, ymax, xmax] (0-1000 scale) of ONLY the main candlestick price-action plotting area inside the screenshot. Strictly exclude phone status bars, top app headers, bottom Buy/Sell buttons, watchlists, right price-axis labels, and separate bottom RSI/MACD indicator panes.',
    },
    candle_colors_detected: {
      type: Type.STRING,
      description: 'Verify bullish vs bearish candle colors directly from this screenshot.',
    },
    volume_momentum_hinglish: {
      type: Type.STRING,
      description: 'Short 1-2 sentence Hinglish observation on volume bars and momentum if visible, else mention volume chart par nahi dikh raha.',
    },
    verdict: {
      type: Type.OBJECT,
      properties: {
        direction: {
          type: Type.STRING,
          enum: ['BULLISH', 'BEARISH', 'SIDEWAYS'],
        },
        confidence: {
          type: Type.INTEGER,
          description: 'Overall confidence score from 0 to 100. Lower honestly if signals conflict or image is noisy.',
        },
        bullish_percent: {
          type: Type.INTEGER,
          description: 'Estimated Bullish probability 0-100 (bullish_percent + bearish_percent = 100).',
        },
        bearish_percent: {
          type: Type.INTEGER,
          description: 'Estimated Bearish probability 0-100 (bullish_percent + bearish_percent = 100).',
        },
        summary_hinglish: {
          type: Type.STRING,
          description: 'One-line friendly Hinglish summary of the current chart bias with tiny bracket explanations for technical terms.',
        },
      },
      required: ['direction', 'confidence', 'bullish_percent', 'bearish_percent', 'summary_hinglish'],
    },
    story: {
      type: Type.OBJECT,
      properties: {
        what_is_happening_hinglish: {
          type: Type.STRING,
          description: 'Step-by-step story of THIS specific chart from left to right in plain Hinglish (e.g. "Pehle tez giravat aayi, phir W shape bana, ab price resistance 25,140 ke paas hai").',
        },
        strong_points: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Up to 3 strongest confirmations directly visible in this chart in Hinglish.',
        },
        warnings: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Up to 2 biggest risks/warnings directly visible in this chart in Hinglish.',
        },
      },
      required: ['what_is_happening_hinglish', 'strong_points', 'warnings'],
    },
    trend: {
      type: Type.OBJECT,
      properties: {
        current: { type: Type.STRING },
        structure: { type: Type.STRING },
        explanation_hinglish: { type: Type.STRING },
      },
      required: ['current', 'structure', 'explanation_hinglish'],
    },
    last_candle: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        type: {
          type: Type.STRING,
          enum: ['bullish', 'bearish', 'neutral'],
        },
        meaning_hinglish: { type: Type.STRING },
        entry_advice_hinglish: {
          type: Type.STRING,
          description: 'Practical beginner advice for someone entering or already holding a trade right now ("Agar tum abhi entry le chuke ho": hold, book partial profit, trail stop-loss, or exit) based on the last candle.',
        },
        box: {
          type: Type.ARRAY,
          items: { type: Type.NUMBER },
          description: 'Tight bounding box [ymin, xmin, ymax, xmax] normalized 0-1000 around the rightmost candle inside chart_plot_box.',
        },
      },
      required: ['name', 'type', 'meaning_hinglish', 'entry_advice_hinglish', 'box'],
    },
    candles: {
      type: Type.ARRAY,
      description: 'Scan the chart left-to-right and report EVERY candle or candle-group whose pattern rules are visibly satisfied. Skip unclear ones rather than guessing.',
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.INTEGER },
          name: {
            type: Type.STRING,
            description: 'Exact pattern name from the 38 Groww patterns + Basics list.',
          },
          type: {
            type: Type.STRING,
            enum: ['bullish', 'bearish', 'neutral'],
          },
          candle_count: {
            type: Type.INTEGER,
            description: 'Number of candles in this pattern (1 for single candle, 2 for engulfing/harami/tweezer/etc, 3+ for Morning Star/Three White Soldiers/etc).',
          },
          x_start: {
            type: Type.NUMBER,
            description: 'Leftmost X (0-1000) of the candle or multi-candle group.',
          },
          x_end: {
            type: Type.NUMBER,
            description: 'Rightmost X (0-1000) of the candle or multi-candle group.',
          },
          x: {
            type: Type.NUMBER,
            description: 'Exact horizontal center X (0-1000) of this candle/group inside chart_plot_box.',
          },
          y_top: { type: Type.NUMBER },
          y_bottom: { type: Type.NUMBER },
          trend_context: {
            type: Type.STRING,
            enum: ['uptrend', 'downtrend', 'sideways'],
          },
          strength: {
            type: Type.STRING,
            enum: ['strong', 'medium', 'weak'],
          },
          meaning_hinglish: { type: Type.STRING },
          leads_to_hinglish: { type: Type.STRING },
        },
        required: [
          'index',
          'name',
          'type',
          'candle_count',
          'x_start',
          'x_end',
          'x',
          'y_top',
          'y_bottom',
          'trend_context',
          'strength',
          'meaning_hinglish',
          'leads_to_hinglish',
        ],
      },
    },
    next_candle: {
      type: Type.OBJECT,
      properties: {
        timeframe_window: { type: Type.STRING },
        expectation_hinglish: { type: Type.STRING },
        scenarios: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              probability: { type: Type.INTEGER },
              trigger_hinglish: { type: Type.STRING },
              action_hinglish: {
                type: Type.STRING,
                description: '"Agar yeh hua to..." practical educational next step in Hinglish.',
              },
            },
            required: ['name', 'probability', 'trigger_hinglish', 'action_hinglish'],
          },
        },
      },
      required: ['timeframe_window', 'expectation_hinglish', 'scenarios'],
    },
    patterns: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          bias: {
            type: Type.STRING,
            enum: ['bullish', 'bearish', 'neutral'],
          },
          explanation_hinglish: { type: Type.STRING },
          box: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
          },
        },
        required: ['name', 'bias', 'explanation_hinglish', 'box'],
      },
    },
    shapes: {
      type: Type.ARRAY,
      description: 'Overall price movement shape(s) detected from actual swing highs and swing lows, ordered chronologically with the most recent marked is_primary=true.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: 'Exact name from: V Shape, Inverted V Shape, W Shape, M Shape, Triple Bottom, Triple Top, Head & Shoulders, Inverse Head & Shoulders, Rounding Bottom, Rounding Top, Cup & Handle, Ascending Triangle, Descending Triangle, Symmetrical Triangle, Rising Wedge, Falling Wedge, Bull Flag, Bear Flag, Pennant, Rectangle / Range, Channel Up, Channel Down, Staircase Uptrend, Staircase Downtrend, Zig-Zag / Choppy.',
          },
          is_primary: { type: Type.BOOLEAN },
          bias: {
            type: Type.STRING,
            enum: ['bullish', 'bearish', 'neutral'],
          },
          confidence: { type: Type.INTEGER },
          completion_status: {
            type: Type.STRING,
            enum: ['forming', 'completed', 'broken'],
          },
          points: {
            type: Type.ARRAY,
            description: '4 to 9 genuine swing points from the chart in strict left-to-right order, normalized 0-1000.',
            items: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                label: { type: Type.STRING },
              },
              required: ['x', 'y', 'label'],
            },
          },
          neckline_y: {
            type: Type.NUMBER,
            description: 'Normalized Y (0-1000) of horizontal neckline confirmation level if applicable, or -1 if not applicable.',
          },
          time_span: {
            type: Type.OBJECT,
            properties: {
              x_start: { type: Type.NUMBER },
              x_end: { type: Type.NUMBER },
            },
            required: ['x_start', 'x_end'],
          },
          meaning_hinglish: { type: Type.STRING },
          what_next_hinglish: { type: Type.STRING },
          how_to_trade_hinglish: { type: Type.STRING },
          watch_out_hinglish: { type: Type.STRING },
        },
        required: [
          'name',
          'is_primary',
          'bias',
          'confidence',
          'completion_status',
          'points',
          'neckline_y',
          'time_span',
          'meaning_hinglish',
          'what_next_hinglish',
          'how_to_trade_hinglish',
          'watch_out_hinglish',
        ],
      },
    },
    support: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          price_approx: { type: Type.STRING },
          strength: {
            type: Type.STRING,
            enum: ['strong', 'medium', 'weak'],
          },
          y: { type: Type.NUMBER },
          reason_hinglish: { type: Type.STRING },
        },
        required: ['price_approx', 'strength', 'y', 'reason_hinglish'],
      },
    },
    resistance: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          price_approx: { type: Type.STRING },
          strength: {
            type: Type.STRING,
            enum: ['strong', 'medium', 'weak'],
          },
          y: { type: Type.NUMBER },
          reason_hinglish: { type: Type.STRING },
        },
        required: ['price_approx', 'strength', 'y', 'reason_hinglish'],
      },
    },
    trendlines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ['uptrend', 'downtrend', 'channel_upper', 'channel_lower'],
          },
          x1: { type: Type.NUMBER },
          y1: { type: Type.NUMBER },
          x2: { type: Type.NUMBER },
          y2: { type: Type.NUMBER },
          explanation_hinglish: { type: Type.STRING },
        },
        required: ['type', 'x1', 'y1', 'x2', 'y2', 'explanation_hinglish'],
      },
    },
    trade_setup: {
      type: Type.OBJECT,
      properties: {
        side: { type: Type.STRING },
        entry_zone: { type: Type.STRING },
        stop_loss: { type: Type.STRING },
        target1: { type: Type.STRING },
        target2: { type: Type.STRING },
        risk_reward: { type: Type.STRING },
        avoid_when_hinglish: { type: Type.STRING },
        holding_advice_hinglish: { type: Type.STRING },
        bullish_plan: scenarioPlanSchema,
        bearish_plan: scenarioPlanSchema,
      },
      required: [
        'side',
        'entry_zone',
        'stop_loss',
        'target1',
        'target2',
        'risk_reward',
        'avoid_when_hinglish',
        'holding_advice_hinglish',
        'bullish_plan',
        'bearish_plan',
      ],
    },
    beginner_lesson_hinglish: { type: Type.STRING },
    chart_position: {
      type: Type.OBJECT,
      description: 'Exact current level/position of the price on the chart plus closest matching candlestick patterns and price shapes from the dictionary.',
      properties: {
        level_zone_name: {
          type: Type.STRING,
          description: 'Clear Hinglish label of current chart level/position, e.g. "Support S1 Zone Par", "Resistance R1 Ke Paas", "Mid-Range Mein", "Breakout Zone (R1 Upar)", "Breakdown Risk (S1 Neeche)".',
        },
        zone_type: {
          type: Type.STRING,
          enum: ['near_support', 'near_resistance', 'mid_range', 'breakout_above', 'breakdown_below'],
        },
        nearest_level_label: {
          type: Type.STRING,
          description: 'Short label of nearest level prices, e.g. "S1: 24,980 · R1: 25,140".',
        },
        position_percent_between_sr: {
          type: Type.INTEGER,
          description: '0 if sitting on Support S1, 50 if mid-range, 100 if sitting on Resistance R1.',
        },
        position_summary_hinglish: {
          type: Type.STRING,
          description: '1-2 line simple Hinglish explanation of exactly which level and position the chart is forming at right now.',
        },
        shape_stage_hinglish: {
          type: Type.STRING,
          description: 'Where in the detected price shape the current candle is located (e.g. "W Shape ke right leg aur neckline ke paas").',
        },
        similar_candlesticks: {
          type: Type.ARRAY,
          description: 'Top 1-3 candlestick patterns from the 38+ pattern library that current/recent candles match or closely resemble.',
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              similarity_percent: { type: Type.INTEGER },
              reason_hinglish: { type: Type.STRING },
            },
            required: ['name', 'similarity_percent', 'reason_hinglish'],
          },
        },
        similar_shapes: {
          type: Type.ARRAY,
          description: 'Top 1-3 price shapes from the 25 shapes dictionary that this chart structure matches or closely resembles.',
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              similarity_percent: { type: Type.INTEGER },
              reason_hinglish: { type: Type.STRING },
            },
            required: ['name', 'similarity_percent', 'reason_hinglish'],
          },
        },
      },
      required: [
        'level_zone_name',
        'zone_type',
        'nearest_level_label',
        'position_percent_between_sr',
        'position_summary_hinglish',
        'shape_stage_hinglish',
        'similar_candlesticks',
        'similar_shapes',
      ],
    },
  },
  required: [
    'is_valid_chart',
    'invalid_reason_hinglish',
    'instrument',
    'timeframe',
    'last_close',
    'price_change_text',
    'chart_plot_box',
    'candle_colors_detected',
    'volume_momentum_hinglish',
    'verdict',
    'story',
    'trend',
    'last_candle',
    'candles',
    'next_candle',
    'patterns',
    'shapes',
    'support',
    'resistance',
    'trendlines',
    'trade_setup',
    'beginner_lesson_hinglish',
    'chart_position',
  ],
};

const SYSTEM_INSTRUCTION = `You are an expert Indian stock market technical analyst (NIFTY, BANKNIFTY, NSE stocks; 1m/2m/5m/10m/15m/1h/1D charts) and a patient teacher for complete beginners.

CRITICAL RULES:
1. HONEST VALIDATION: First verify if the image contains a readable candlestick chart. If blurry, too zoomed-out to distinguish candles, cropped beyond recognition, or NOT a candlestick chart, set "is_valid_chart": false and explain honestly in friendly Hinglish in "invalid_reason_hinglish". Never fake certainty.
2. EXACT CHART PLOT AREA ("chart_plot_box"): Users upload full-screen phone screenshots containing status bar, app headers, buy/sell buttons, right-hand price scale numbers, and bottom RSI/MACD panes.
   - Measure "chart_plot_box": [ymin, xmin, ymax, xmax] (0-1000 scale) covering ONLY the candlestick plotting region.
   - ALL coordinates (support.y, resistance.y, trendlines, patterns.box, last_candle.box, candles x/x_start/x_end/y_top/y_bottom, shapes points) MUST lie strictly inside chart_plot_box!
3. VERIFY COLORS & LAST CLOSE: Verify bullish vs bearish candle colors directly from the image. Read "last_close" and "price_change_text" directly from the chart's price axis / header.
4. EXACT CANDLESTICK PATTERN LIST (38 Groww Patterns + Basics):
   Scan left to right and name ONLY candles/groups whose rules are visibly satisfied; skip unclear ones rather than guessing! Check preceding trend (uptrend/downtrend/sideways) before naming reversal patterns (e.g. Hammer needs downtrend, Hanging Man needs uptrend). Gap patterns (Abandoned Baby, Kicker, Upside Gap Two Crows) require a real visible gap between candles — do NOT force them on continuous 1m/2m/5m charts.
   Allowed exact names:
   BULLISH (21): Bullish Engulfing, Hammer, Morning Star, Piercing Line, Bullish Harami, Three White Soldiers, Inverted Hammer, Dragonfly Doji, Bullish Abandoned Baby, Three Inside Up, Three Outside Up, Bullish Kicker, Tweezer Bottom, Rising Three Methods, Concealing Baby Swallow, Mat Hold, Bullish Separating Lines, Bullish Belt Hold, Bullish Three-Line Strike, Ladder Bottom, Meeting Lines.
   BEARISH (17): Bearish Engulfing, Bearish Belt Hold, Three Black Crows, Bearish Three-Line Strike, Hanging Man, Upside Gap Two Crows, Evening Star, Shooting Star, Bearish Harami, Bearish Doji Star, Bearish Abandoned Baby, Tweezer Top, Bearish Kicker, Bearish Three Inside Down, Bearish Three Outside Down, Bearish Mat Hold, Dark Cloud Cover.
   BASICS: Doji, Gravestone Doji, Long-Legged Doji, Spinning Top, Bullish Marubozu, Bearish Marubozu, Inside Bar, Outside Bar, Bullish Candle, Bearish Candle (only if notably large).
   Always report "candle_count", "x_start", "x_end", "x" (center), "trend_context", "strength", and always include the rightmost candle.
5. PRICE SHAPE DETECTION ("shapes"):
   Match overall swing highs/lows to ONLY: V Shape, Inverted V Shape, W Shape, M Shape, Triple Bottom, Triple Top, Head & Shoulders, Inverse Head & Shoulders, Rounding Bottom, Rounding Top, Cup & Handle, Ascending Triangle, Descending Triangle, Symmetrical Triangle, Rising Wedge, Falling Wedge, Bull Flag, Bear Flag, Pennant, Rectangle / Range, Channel Up, Channel Down, Staircase Uptrend, Staircase Downtrend, Zig-Zag / Choppy.
   Mark the most recent shape "is_primary": true. Use 4 to 9 genuine swing points in left-to-right order (0-1000) and "neckline_y" (or -1). If choppy, return "Zig-Zag / Choppy" honestly.
6. CHART LEVEL, POSITION & DICTIONARY SIMILARITY ("chart_position"):
   - Always identify WHICH exact level & position the current rightmost candle is forming on ("Support S1 Zone Par", "Resistance R1 Ke Paas", "Mid-Range", "Breakout Zone", or "Breakdown Risk"), compute "position_percent_between_sr" (0=Support, 100=Resistance), and explain "shape_stage_hinglish".
   - List 1-3 closest matching candlestick patterns in "similar_candlesticks" (exact names from the 38+ pattern library) and 1-3 closest matching price shapes in "similar_shapes" (exact names from the 25 shapes list) with realistic similarity_percent (0-95) and concise Hinglish reasons.
7. CHART-SPECIFIC STORY & PLANS:
   - Everything ("story", "verdict", "next_candle.scenarios", "trade_setup.bullish_plan", "trade_setup.bearish_plan", "beginner_lesson_hinglish") MUST be derived strictly from THIS chart, never generic boilerplate.
   - NEVER invent fake trading signals, NEVER guarantee profits, and NEVER claim 100% certainty. All setups are strictly educational only.
8. BEGINNER HINGLISH + BRACKETS:
   - Short (1-2 sentences), friendly Hinglish (Hindi in English letters). Add a tiny bracket explanation for every technical term (e.g. "Breakout (jab price rukawat tod kar upar nikle)", "Stop-loss (nuksan rokne ki limit)", "Wick (candle ki patli dandi)").`;

const SERVER_APP_VERSION = '2.4.0';
const ALLOWED_TIMEFRAMES = new Set(['Auto', '1m', '2m', '5m', '10m', '15m', '1h', '1D']);
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BASE64_CHARS = 12 * 1024 * 1024; // ~9 MB raw image

// Sliding window per-IP rate limiter to protect analysis endpoint & API quota
const ipRateMap = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 20;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (ipRateMap.get(ip) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_REQUESTS) {
    ipRateMap.set(ip, recent);
    return true;
  }
  recent.push(now);
  ipRateMap.set(ip, recent);
  if (ipRateMap.size > 500) {
    for (const [k, list] of ipRateMap.entries()) {
      if (list.every((ts) => now - ts >= RATE_WINDOW_MS)) ipRateMap.delete(k);
    }
  }
  return false;
}

function clampCoord(val: unknown, fallback = 500): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1000, n));
}

function stripProfitGuaranteeClaims(text: unknown): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\b100%\s*(sure|confirm|guaranteed?|pakka)\b/gi, 'high-probability (not guaranteed)')
    .replace(/\b(guaranteed?\s*profit|pakka\s*profit|sure\s*shot\s*(call|trade|profit))\b/gi, 'educational probability setup (no guarantee)');
}

function sanitizeAnalysisPayload(parsed: Record<string, any>) {
  if (Array.isArray(parsed.chart_plot_box) && parsed.chart_plot_box.length === 4) {
    const ymin = clampCoord(parsed.chart_plot_box[0], 50);
    const xmin = clampCoord(parsed.chart_plot_box[1], 50);
    const ymax = clampCoord(parsed.chart_plot_box[2], 950);
    const xmax = clampCoord(parsed.chart_plot_box[3], 950);
    parsed.chart_plot_box = [
      Math.min(ymin, ymax - 20),
      Math.min(xmin, xmax - 20),
      Math.max(ymax, ymin + 20),
      Math.max(xmax, xmin + 20),
    ];
  }

  if (parsed?.verdict) {
    const b = Math.max(0, Math.min(100, Math.round(Number(parsed.verdict.bullish_percent ?? 50))));
    const conf = Math.max(0, Math.min(95, Math.round(Number(parsed.verdict.confidence ?? 50))));
    parsed.verdict.bullish_percent = b;
    parsed.verdict.bearish_percent = 100 - b;
    parsed.verdict.confidence = conf;
    parsed.verdict.summary_hinglish = stripProfitGuaranteeClaims(parsed.verdict.summary_hinglish);
  }

  if (parsed?.story) {
    parsed.story.what_is_happening_hinglish = stripProfitGuaranteeClaims(
      parsed.story.what_is_happening_hinglish
    );
  }

  if (Array.isArray(parsed?.shapes)) {
    parsed.shapes = parsed.shapes.map((s: { neckline_y?: number; [k: string]: unknown }) => {
      const ny = typeof s.neckline_y === 'number' ? s.neckline_y : -1;
      const rest = { ...s };
      delete rest.neckline_y;
      return {
        ...rest,
        confidence: Math.max(0, Math.min(95, Math.round(Number(s.confidence ?? 50)))),
        meaning_hinglish: stripProfitGuaranteeClaims(s.meaning_hinglish),
        what_next_hinglish: stripProfitGuaranteeClaims(s.what_next_hinglish),
        how_to_trade_hinglish: stripProfitGuaranteeClaims(s.how_to_trade_hinglish),
        points: Array.isArray(s.points)
          ? s.points.map((pt: any) => ({
              x: clampCoord(pt?.x, 500),
              y: clampCoord(pt?.y, 500),
              label: typeof pt?.label === 'string' ? pt.label.slice(0, 24) : '',
            }))
          : [],
        neckline: ny >= 0 && ny <= 1000 ? { y: ny } : null,
      };
    });
    if (parsed.shapes.length > 0 && !parsed.shapes.some((s: { is_primary?: boolean }) => s.is_primary)) {
      parsed.shapes[parsed.shapes.length - 1].is_primary = true;
    }
  }

  if (Array.isArray(parsed?.candles)) {
    parsed.candles = parsed.candles
      .slice()
      .sort((a: { x: number }, b: { x: number }) => (a.x ?? 0) - (b.x ?? 0))
      .map((c: Record<string, unknown>, idx: number) => {
        const cx = clampCoord(c.x, 500);
        const xStart = clampCoord(typeof c.x_start === 'number' ? c.x_start : cx - 8, cx - 8);
        const xEnd = clampCoord(typeof c.x_end === 'number' ? c.x_end : cx + 8, cx + 8);
        return {
          ...c,
          index: idx + 1,
          candle_count: Math.max(1, Math.min(10, Math.round(Number(c.candle_count ?? 1)))),
          x: cx,
          x_start: Math.min(xStart, cx),
          x_end: Math.max(xEnd, cx),
          y_top: clampCoord(c.y_top, 300),
          y_bottom: clampCoord(c.y_bottom, 700),
          meaning_hinglish: stripProfitGuaranteeClaims(c.meaning_hinglish),
          leads_to_hinglish: stripProfitGuaranteeClaims(c.leads_to_hinglish),
        };
      });
  }

  if (parsed?.trade_setup) {
    parsed.trade_setup.holding_advice_hinglish = stripProfitGuaranteeClaims(
      parsed.trade_setup.holding_advice_hinglish
    );
    parsed.trade_setup.avoid_when_hinglish = stripProfitGuaranteeClaims(
      parsed.trade_setup.avoid_when_hinglish
    );
  }

  if (parsed?.chart_position && typeof parsed.chart_position === 'object') {
    const cp = parsed.chart_position;
    const validZones = new Set([
      'near_support',
      'near_resistance',
      'mid_range',
      'breakout_above',
      'breakdown_below',
    ]);
    parsed.chart_position = {
      level_zone_name:
        typeof cp.level_zone_name === 'string' && cp.level_zone_name.trim()
          ? stripProfitGuaranteeClaims(cp.level_zone_name)
          : 'Current Price Position',
      zone_type: validZones.has(cp.zone_type) ? cp.zone_type : 'mid_range',
      nearest_level_label: typeof cp.nearest_level_label === 'string' ? cp.nearest_level_label : '',
      position_percent_between_sr: Math.max(
        0,
        Math.min(100, Math.round(Number(cp.position_percent_between_sr ?? 50)))
      ),
      position_summary_hinglish: stripProfitGuaranteeClaims(cp.position_summary_hinglish),
      shape_stage_hinglish: stripProfitGuaranteeClaims(cp.shape_stage_hinglish),
      similar_candlesticks: Array.isArray(cp.similar_candlesticks)
        ? cp.similar_candlesticks.slice(0, 4).map((item: any) => ({
            name: typeof item?.name === 'string' ? item.name : 'Candle Pattern',
            similarity_percent: Math.max(
              10,
              Math.min(95, Math.round(Number(item?.similarity_percent ?? 70)))
            ),
            reason_hinglish: stripProfitGuaranteeClaims(item?.reason_hinglish),
          }))
        : [],
      similar_shapes: Array.isArray(cp.similar_shapes)
        ? cp.similar_shapes.slice(0, 4).map((item: any) => ({
            name: typeof item?.name === 'string' ? item.name : 'Price Shape',
            similarity_percent: Math.max(
              10,
              Math.min(95, Math.round(Number(item?.similarity_percent ?? 70)))
            ),
            reason_hinglish: stripProfitGuaranteeClaims(item?.reason_hinglish),
          }))
        : [],
    };
  }

  parsed.report_meta = {
    generated_at: new Date().toISOString(),
    version: SERVER_APP_VERSION,
    attributed_to: 'Created & Developed by Nizam XD',
    copyright: '© 2026 Nizam XD. All Rights Reserved.',
    educational_only: true,
    no_profit_guarantee: true,
  };

  return parsed;
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  app.use(express.json({ limit: '14mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      app: 'Chart Analyzer',
      version: SERVER_APP_VERSION,
      attributed_to: 'Created & Developed by Nizam XD',
      educational_only: true,
    });
  });

  app.post('/api/analyze', async (req, res) => {
    try {
      const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        'unknown';

      if (isRateLimited(clientIp)) {
        return res.status(429).json({
          error: 'RATE_LIMIT',
          message_hinglish:
            'Bahut jaldi-jaldi requests bheji gayi hain. Kripya 30 second ruk kar Retry karein.',
        });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'API_KEY_MISSING',
          message_hinglish: 'Server par API key configured nahi hai. Kripya Settings > Secrets check karein.',
        });
      }

      const { imageBase64, mimeType, timeframe } = req.body ?? {};
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({
          error: 'INVALID_IMAGE',
          message_hinglish: 'Image data valid nahi hai. Kripya ek sahi chart screenshot upload karein.',
        });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '').trim();
      if (cleanBase64.length < 100 || cleanBase64.length > MAX_BASE64_CHARS) {
        return res.status(400).json({
          error: 'INVALID_IMAGE_SIZE',
          message_hinglish: 'Image size valid range mein nahi hai. Kripya ek clear screenshot upload karein.',
        });
      }

      const validMime =
        typeof mimeType === 'string' && ALLOWED_MIMES.has(mimeType) ? mimeType : 'image/jpeg';

      const requestedTf = typeof timeframe === 'string' ? timeframe.trim() : 'Auto';
      const safeTf = ALLOWED_TIMEFRAMES.has(requestedTf) ? requestedTf : 'Auto';
      const userTimeframe = safeTf !== 'Auto' ? safeTf : 'Auto-detect from screenshot';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: validMime,
                data: cleanBase64,
              },
            },
            {
              text: `Analyze this candlestick chart screenshot thoroughly for a complete beginner Indian market trader.
Active timeframe: ${userTimeframe}.
Ensure:
1. Measure "chart_plot_box" strictly around the candlestick area only.
2. Read "last_close" and "price_change_text" from the chart.
3. Scan left-to-right and report every valid pattern in "candles" using exact names from the 38 patterns + basics list, with accurate candle_count, x_start, x_end, x, trend_context, and strength.
4. Detect overall price shape(s) in "shapes" from genuine swing points.
5. Populate "chart_position" showing exact current price level/position (Support/Resistance/Mid-Range/Breakout/Breakdown), current shape stage, and closest matching candlestick patterns + price shapes from the dictionary.
6. Write "story", "next_candle" scenarios with actions, and both educational "bullish_plan" and "bearish_plan" derived strictly from THIS chart in simple Hinglish with tiny bracket explanations. Never invent signals or guarantee profits.`,
            },
          ],
        },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: analysisSchema,
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        return res.status(502).json({
          error: 'EMPTY_RESPONSE',
          message_hinglish: 'AI se response khali aaya. Ek baar Retry dabake phir se koshish karein.',
        });
      }

      const parsed = JSON.parse(rawText);
      const sanitized = sanitizeAnalysisPayload(parsed);

      return res.json(sanitized);
    } catch (err: unknown) {
      const errorObj = err as { status?: number; code?: number; message?: string };
      const msg = errorObj?.message || String(err);
      const status = errorObj?.status || errorObj?.code;

      console.error('Chart analysis error:', status, msg);

      if (status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
        return res.status(429).json({
          error: 'RATE_LIMIT',
          message_hinglish: 'Abhi thodi zyada requests aa rahi hain (Rate Limit). 10-15 second ruk kar Retry karein.',
        });
      }

      if (status === 403 || msg.includes('PERMISSION_DENIED') || (status === 400 && msg.includes('API_KEY'))) {
        return res.status(400).json({
          error: 'INVALID_KEY',
          message_hinglish: 'API key valid nahi lag rahi. Kripya Settings > Secrets mein key verify karein.',
        });
      }

      if (status === 404 || msg.includes('NOT_FOUND')) {
        return res.status(404).json({
          error: 'MODEL_NOT_FOUND',
          message_hinglish: 'AI model abhi available nahi hai. Kripya thodi der baad dobara try karein.',
        });
      }

      return res.status(500).json({
        error: 'ANALYSIS_FAILED',
        message_hinglish: 'Chart analyze karte waqt dikkat aayi. Internet check karein ya ek clear screenshot ke saath Retry karein.',
      });
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
        hmr: hmrDisabled ? false : { server: httpServer },
        watch: hmrDisabled ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, { dotfiles: 'allow' }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Chart Analyzer server running on http://localhost:${PORT}`);
  });
}

startServer();
