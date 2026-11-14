export type VerdictDirection = 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
export type BiasType = 'bullish' | 'bearish' | 'neutral';
export type LevelStrength = 'strong' | 'medium' | 'weak';
export type TrendlineType = 'uptrend' | 'downtrend' | 'channel_upper' | 'channel_lower';
export type TimeframeOption = 'Auto' | '1m' | '2m' | '5m' | '10m' | '15m' | '1h' | '1D';
export type ShapeStatus = 'forming' | 'completed' | 'broken';
export type TrendContext = 'uptrend' | 'downtrend' | 'sideways';

export interface ChartVerdict {
  direction: VerdictDirection;
  confidence: number;
  bullish_percent: number;
  bearish_percent: number;
  summary_hinglish: string;
}

export interface ChartStory {
  what_is_happening_hinglish: string;
  strong_points: string[];
  warnings: string[];
}

export interface ChartTrend {
  current: string;
  structure: string;
  explanation_hinglish: string;
}

export interface LastCandleInfo {
  name: string;
  type: BiasType;
  meaning_hinglish: string;
  entry_advice_hinglish: string;
  box: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
}

export interface DetectedCandle {
  index: number;
  name: string;
  type: BiasType;
  candle_count: number;
  x_start: number; // left edge 0-1000
  x_end: number; // right edge 0-1000
  x: number; // horizontal center 0-1000
  y_top: number; // top wick/high 0-1000
  y_bottom: number; // bottom wick/low 0-1000
  trend_context: TrendContext;
  strength: LevelStrength;
  meaning_hinglish: string;
  leads_to_hinglish: string;
}

export interface NextCandleScenario {
  name: string;
  probability: number;
  trigger_hinglish: string;
  action_hinglish: string;
}

export interface NextCandleInfo {
  timeframe_window: string;
  expectation_hinglish: string;
  scenarios: NextCandleScenario[];
}

export interface DetectedPattern {
  name: string;
  bias: BiasType;
  explanation_hinglish: string;
  box: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
}

export interface ShapePoint {
  x: number;
  y: number;
  label: string;
}

export interface PriceShape {
  name: string;
  is_primary: boolean;
  bias: BiasType;
  confidence: number;
  completion_status: ShapeStatus;
  points: ShapePoint[];
  neckline: { y: number } | null;
  time_span: { x_start: number; x_end: number };
  meaning_hinglish: string;
  what_next_hinglish: string;
  how_to_trade_hinglish: string;
  watch_out_hinglish: string;
}

export interface PriceLevel {
  price_approx: string;
  strength: LevelStrength;
  y: number; // normalized 0-1000
  reason_hinglish: string;
}

export interface TrendlineInfo {
  type: TrendlineType;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  explanation_hinglish: string;
}

export interface ScenarioPlan {
  entry_zone: string;
  stop_loss: string;
  target1: string;
  target2: string;
  risk_reward: string;
  when_valid_hinglish: string;
  avoid_when_hinglish: string;
}

export interface TradeSetup {
  side: string;
  entry_zone: string;
  stop_loss: string;
  target1: string;
  target2: string;
  risk_reward: string;
  avoid_when_hinglish: string;
  holding_advice_hinglish: string;
  bullish_plan: ScenarioPlan;
  bearish_plan: ScenarioPlan;
}

export interface SimilarMatchItem {
  name: string;
  similarity_percent: number;
  reason_hinglish: string;
}

export interface ChartPositionInfo {
  level_zone_name: string;
  zone_type: 'near_support' | 'near_resistance' | 'mid_range' | 'breakout_above' | 'breakdown_below';
  nearest_level_label: string;
  position_percent_between_sr: number;
  position_summary_hinglish: string;
  shape_stage_hinglish: string;
  similar_candlesticks: SimilarMatchItem[];
  similar_shapes: SimilarMatchItem[];
}

export interface ReportMeta {
  generated_at: string;
  version: string;
  attributed_to: string;
  copyright: string;
  educational_only: boolean;
  no_profit_guarantee: boolean;
}

export interface ChartAnalysis {
  is_valid_chart: boolean;
  invalid_reason_hinglish: string;
  instrument: string;
  timeframe: string;
  last_close: string;
  price_change_text: string;
  chart_plot_box: [number, number, number, number];
  candle_colors_detected: string;
  volume_momentum_hinglish: string;
  verdict: ChartVerdict;
  story: ChartStory;
  trend: ChartTrend;
  last_candle: LastCandleInfo;
  candles: DetectedCandle[];
  next_candle: NextCandleInfo;
  patterns: DetectedPattern[];
  shapes: PriceShape[];
  support: PriceLevel[];
  resistance: PriceLevel[];
  trendlines: TrendlineInfo[];
  trade_setup: TradeSetup;
  beginner_lesson_hinglish: string;
  chart_position?: ChartPositionInfo;
  report_meta?: ReportMeta;
}

export interface OverlayLayers {
  support: boolean;
  resistance: boolean;
  trendlines: boolean;
  patterns: boolean;
  candleLabels: boolean;
  lastCandle: boolean;
  shapeOverlay: boolean;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  instrument: string;
  timeframe: string;
  verdict: VerdictDirection;
  confidence: number;
  thumbnailDataUrl: string;
  imageDataUrl: string;
  originalDataUrl: string;
  analysis: ChartAnalysis;
}
