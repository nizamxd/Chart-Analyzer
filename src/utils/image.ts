import type { ChartAnalysis, DetectedCandle, OverlayLayers, PriceShape } from '../types/chart';
import type { PatternDefinition } from '../data/patterns';

export interface ProcessedImage {
  dataUrl: string;
  originalDataUrl: string;
  thumbnailDataUrl: string;
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface CandleBadgeHitbox {
  index: number;
  cx: number;
  cy: number;
  r: number;
}

const MAX_WIDTH = 2000;
const JPEG_QUALITY = 0.9;

let workerInstance: Worker | null = null;
let workerJobId = 0;

function processInWorker(file: Blob): Promise<ProcessedImage | null> {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    try {
      if (!workerInstance) {
        workerInstance = new Worker(new URL('../workers/imageWorker.ts', import.meta.url), {
          type: 'module',
        });
      }
      const id = ++workerJobId;
      const cleanup = () => {
        workerInstance?.removeEventListener('message', onMsg);
        workerInstance?.removeEventListener('error', onErr);
      };
      const onMsg = (
        ev: MessageEvent<{
          id: number;
          result?: ProcessedImage;
          error?: string;
          fallback?: boolean;
        }>
      ) => {
        if (ev.data.id !== id) return;
        cleanup();
        if (ev.data.fallback) {
          resolve(null);
        } else if (ev.data.error) {
          reject(new Error(ev.data.error));
        } else if (ev.data.result) {
          resolve(ev.data.result);
        } else {
          resolve(null);
        }
      };
      const onErr = () => {
        cleanup();
        resolve(null);
      };
      workerInstance.addEventListener('message', onMsg);
      workerInstance.addEventListener('error', onErr);
      workerInstance.postMessage({ id, blob: file });
    } catch {
      resolve(null);
    }
  });
}

export async function compressAndResizeImage(file: Blob): Promise<ProcessedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Yeh file image nahi lagti. Kripya PNG, JPG ya WebP chart screenshot upload karein.');
  }

  // Try off-thread Web Worker first so 90/120Hz UI stays butter smooth
  const workerResult = await processInWorker(file);
  if (workerResult) {
    return workerResult;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () =>
        reject(new Error('Image load nahi ho paayi. Kripya ek valid screenshot try karein.'));
      el.src = objectUrl;
    });

    if (img.naturalWidth < 60 || img.naturalHeight < 60) {
      throw new Error('Image bahut chhoti hai. Kripya ek clear chart screenshot upload karein.');
    }

    // Untouched original as PNG for Original Screenshot Download
    const origCanvas = document.createElement('canvas');
    origCanvas.width = img.naturalWidth;
    origCanvas.height = img.naturalHeight;
    const origCtx = origCanvas.getContext('2d');
    if (!origCtx) throw new Error('Browser canvas initialize nahi ho paaya.');
    origCtx.drawImage(img, 0, 0);
    const originalDataUrl = origCanvas.toDataURL('image/png');

    // Resized max 2000px JPEG 0.9 for Gemini analysis & crisp overlay
    let targetWidth = img.naturalWidth;
    let targetHeight = img.naturalHeight;
    if (targetWidth > MAX_WIDTH) {
      const ratio = MAX_WIDTH / targetWidth;
      targetWidth = MAX_WIDTH;
      targetHeight = Math.round(targetHeight * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Browser canvas initialize nahi ho paaya.');

    ctx.fillStyle = '#0B0B0B';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const base64 = dataUrl.split(',')[1] || '';

    // Compact 300px thumbnail for History storage
    const thumbW = Math.min(300, targetWidth);
    const thumbH = Math.round((thumbW / targetWidth) * targetHeight);
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbW;
    thumbCanvas.height = thumbH;
    const tCtx = thumbCanvas.getContext('2d');
    tCtx?.drawImage(canvas, 0, 0, thumbW, thumbH);
    const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);

    return {
      dataUrl,
      originalDataUrl,
      thumbnailDataUrl,
      base64,
      mimeType: 'image/jpeg',
      width: targetWidth,
      height: targetHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

interface LabelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PlotBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  isSubRegion: boolean;
}

function rectsOverlap(a: LabelRect, b: LabelRect): boolean {
  const pad = 4;
  return !(
    a.x + a.w + pad < b.x ||
    b.x + b.w + pad < a.x ||
    a.y + a.h + pad < b.y ||
    b.y + b.h + pad < a.y
  );
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function resolvePlotBounds(
  analysis: ChartAnalysis,
  canvasWidth: number,
  canvasHeight: number
): PlotBounds {
  const box = analysis.chart_plot_box;
  if (Array.isArray(box) && box.length === 4) {
    const [ymin, xmin, ymax, xmax] = box.map(Number);
    if (
      Number.isFinite(ymin) &&
      Number.isFinite(xmin) &&
      Number.isFinite(ymax) &&
      Number.isFinite(xmax) &&
      ymax - ymin >= 120 &&
      xmax - xmin >= 120
    ) {
      const left = clamp((xmin / 1000) * canvasWidth, 0, canvasWidth);
      const top = clamp((ymin / 1000) * canvasHeight, 0, canvasHeight);
      const right = clamp((xmax / 1000) * canvasWidth, left + 40, canvasWidth);
      const bottom = clamp((ymax / 1000) * canvasHeight, top + 40, canvasHeight);
      const isSubRegion = xmin > 15 || ymin > 15 || xmax < 985 || ymax < 985;
      return {
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
        isSubRegion,
      };
    }
  }

  return {
    left: 0,
    top: 0,
    right: canvasWidth,
    bottom: canvasHeight,
    width: canvasWidth,
    height: canvasHeight,
    isSubRegion: false,
  };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function placeLabelChip(
  ctx: CanvasRenderingContext2D,
  placed: LabelRect[],
  text: string,
  preferredX: number,
  preferredY: number,
  bounds: PlotBounds,
  bgColor: string,
  textColor: string,
  fontSize: number,
  alignRight = false
) {
  ctx.font = `600 ${fontSize}px Poppins, sans-serif`;
  const metrics = ctx.measureText(text);
  const padX = Math.max(7, Math.round(fontSize * 0.6));
  const padY = Math.max(3, Math.round(fontSize * 0.3));
  const boxW = Math.ceil(metrics.width + padX * 2);
  const boxH = Math.ceil(fontSize + padY * 2);

  const minX = bounds.left + 6;
  const maxX = Math.max(minX, bounds.right - boxW - 6);
  const minY = bounds.top + 6;
  const maxY = Math.max(minY, bounds.bottom - boxH - 6);

  let x = alignRight ? preferredX - boxW : preferredX;
  x = clamp(x, minX, maxX);
  let y = clamp(preferredY, minY, maxY);

  const step = boxH + 5;
  const candidateOffsets = [0, -step, step, -step * 2, step * 2, -step * 3, step * 3];
  for (const dy of candidateOffsets) {
    const testY = clamp(y + dy, minY, maxY);
    const candidate: LabelRect = { x, y: testY, w: boxW, h: boxH };
    if (!placed.some((p) => rectsOverlap(candidate, p))) {
      y = testY;
      break;
    }
  }

  placed.push({ x, y, w: boxW, h: boxH });

  ctx.save();
  ctx.fillStyle = bgColor;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 1.5;
  drawRoundedRect(ctx, x, y, boxW, boxH, 6);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = textColor;
  ctx.font = `600 ${fontSize}px Poppins, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + boxH / 2 + 0.5);
}

function shortenCandleName(name: string): string {
  return name
    .replace('Bullish ', 'Bull ')
    .replace('Bearish ', 'Bear ')
    .replace(' (plain)', '')
    .replace('Dragonfly ', 'D-Fly ')
    .replace('Gravestone ', 'G-Stone ')
    .replace('Long-Legged ', 'Long ')
    .replace('Three White Soldiers', '3 Soldiers')
    .replace('Three Black Crows', '3 Crows');
}

export function drawChartAnnotations(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  analysis: ChartAnalysis,
  layers: OverlayLayers,
  highlightedCandleIndex: number | null = null,
  flashShape: PriceShape | null = null
): CandleBadgeHitbox[] {
  ctx.clearRect(0, 0, width, height);

  const bounds = resolvePlotBounds(analysis, width, height);
  const scaleFactor = Math.max(0.78, Math.min(1.55, bounds.width / 820));
  const fontSize = Math.round(10.5 * scaleFactor);
  const lineW = Math.max(1.5, 1.9 * scaleFactor);
  const placedLabels: LabelRect[] = [];
  const hitboxes: CandleBadgeHitbox[] = [];

  const toPlotX = (nx: number) => clamp((nx / 1000) * width, bounds.left, bounds.right);
  const toPlotY = (ny: number) => clamp((ny / 1000) * height, bounds.top, bounds.bottom);

  // 0. Optional Shape Overlay (OFF by default, or temporarily flashed when tapping a Shape card)
  const activeShape =
    flashShape ||
    (layers.shapeOverlay && Array.isArray(analysis.shapes)
      ? analysis.shapes.find((s) => s.is_primary) || analysis.shapes[0] || null
      : null);

  if (activeShape && activeShape.time_span) {
    const xStart = toPlotX(activeShape.time_span.x_start);
    const xEnd = toPlotX(activeShape.time_span.x_end);
    const bandW = Math.max(24, xEnd - xStart);
    const bandColor =
      activeShape.bias === 'bullish'
        ? 'rgba(29, 219, 4, 0.10)'
        : activeShape.bias === 'bearish'
          ? 'rgba(255, 77, 31, 0.12)'
          : 'rgba(251, 191, 36, 0.10)';
    const dotColor =
      activeShape.bias === 'bullish'
        ? '#1DDB04'
        : activeShape.bias === 'bearish'
          ? '#FF4D1F'
          : '#FBBF24';

    ctx.save();
    ctx.fillStyle = bandColor;
    ctx.fillRect(xStart, bounds.top, bandW, bounds.height);

    if (Array.isArray(activeShape.points) && activeShape.points.length > 0) {
      ctx.strokeStyle = dotColor;
      ctx.lineWidth = 1.5 * scaleFactor;
      ctx.setLineDash([4 * scaleFactor, 4 * scaleFactor]);
      ctx.beginPath();
      activeShape.points.forEach((pt, idx) => {
        const px = toPlotX(pt.x);
        const py = toPlotY(pt.y);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      ctx.setLineDash([]);
      activeShape.points.forEach((pt) => {
        const px = toPlotX(pt.x);
        const py = toPlotY(pt.y);
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(px, py, 4 * scaleFactor, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();
  }

  // 1. Support levels (green dashed horizontal line + right chip)
  if (layers.support && Array.isArray(analysis.support)) {
    analysis.support.forEach((lvl, idx) => {
      const y = toPlotY(lvl.y);
      ctx.save();
      ctx.strokeStyle = 'rgba(29, 219, 4, 0.85)';
      ctx.lineWidth = lvl.strength === 'strong' ? lineW * 1.2 : lineW;
      ctx.setLineDash([6 * scaleFactor, 5 * scaleFactor]);
      ctx.beginPath();
      ctx.moveTo(bounds.left + 4, y);
      ctx.lineTo(bounds.right - 4, y);
      ctx.stroke();
      ctx.restore();

      placeLabelChip(
        ctx,
        placedLabels,
        `S${idx + 1} ${lvl.price_approx}`,
        bounds.right - 8,
        y - fontSize - 8,
        bounds,
        'rgba(29, 219, 4, 0.94)',
        '#FFFFFF',
        fontSize,
        true
      );
    });
  }

  // 2. Resistance levels (red/orange dashed horizontal line + right chip)
  if (layers.resistance && Array.isArray(analysis.resistance)) {
    analysis.resistance.forEach((lvl, idx) => {
      const y = toPlotY(lvl.y);
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 77, 31, 0.85)';
      ctx.lineWidth = lvl.strength === 'strong' ? lineW * 1.2 : lineW;
      ctx.setLineDash([6 * scaleFactor, 5 * scaleFactor]);
      ctx.beginPath();
      ctx.moveTo(bounds.left + 4, y);
      ctx.lineTo(bounds.right - 4, y);
      ctx.stroke();
      ctx.restore();

      placeLabelChip(
        ctx,
        placedLabels,
        `R${idx + 1} ${lvl.price_approx}`,
        bounds.right - 8,
        y - fontSize - 8,
        bounds,
        'rgba(220, 38, 38, 0.94)',
        '#FFFFFF',
        fontSize,
        true
      );
    });
  }

  // 3. Trendlines (uptrend lime, downtrend orange, channel purple)
  if (layers.trendlines && Array.isArray(analysis.trendlines)) {
    const trendLabelMap: Record<string, string> = {
      uptrend: 'Uptrend',
      downtrend: 'Downtrend',
      channel_upper: 'Channel Top',
      channel_lower: 'Channel Base',
    };

    analysis.trendlines.forEach((tl) => {
      const x1 = toPlotX(tl.x1);
      const y1 = toPlotY(tl.y1);
      const x2 = toPlotX(tl.x2);
      const y2 = toPlotY(tl.y2);

      let strokeColor = 'rgba(29, 219, 4, 0.9)';
      let chipBg = 'rgba(20, 20, 20, 0.95)';
      let chipText = '#1DDB04';

      if (tl.type === 'downtrend') {
        strokeColor = 'rgba(255, 77, 31, 0.92)';
        chipBg = 'rgba(255, 77, 31, 0.95)';
        chipText = '#FFFFFF';
      } else if (tl.type === 'channel_upper' || tl.type === 'channel_lower') {
        strokeColor = 'rgba(168, 85, 247, 0.9)';
        chipBg = 'rgba(126, 34, 206, 0.95)';
        chipText = '#FFFFFF';
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(bounds.left, bounds.top, bounds.width, bounds.height);
      ctx.clip();

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineW * 1.3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();

      placeLabelChip(
        ctx,
        placedLabels,
        trendLabelMap[tl.type] || 'Trendline',
        (x1 + x2) / 2 - 30,
        (y1 + y2) / 2 - fontSize - 10,
        bounds,
        chipBg,
        chipText,
        fontSize
      );
    });
  }

  // 4. Chart Patterns (rounded rectangle + name above)
  if (layers.patterns && Array.isArray(analysis.patterns)) {
    analysis.patterns.forEach((pat) => {
      if (!Array.isArray(pat.box) || pat.box.length !== 4) return;
      const [ymin, xmin, ymax, xmax] = pat.box;
      const x = toPlotX(xmin);
      const y = toPlotY(ymin);
      const w = Math.max(22, toPlotX(xmax) - x);
      const h = Math.max(22, toPlotY(ymax) - y);

      let stroke = 'rgba(251, 191, 36, 0.85)';
      let fill = 'rgba(251, 191, 36, 0.08)';
      let chipBg = 'rgba(30, 30, 30, 0.94)';

      if (pat.bias === 'bullish') {
        stroke = 'rgba(29, 219, 4, 0.88)';
        fill = 'rgba(29, 219, 4, 0.08)';
        chipBg = 'rgba(29, 219, 4, 0.95)';
      } else if (pat.bias === 'bearish') {
        stroke = 'rgba(255, 77, 31, 0.88)';
        fill = 'rgba(255, 77, 31, 0.08)';
        chipBg = 'rgba(220, 38, 38, 0.95)';
      }

      ctx.save();
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineW;
      drawRoundedRect(ctx, x, y, w, h, 8 * scaleFactor);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      placeLabelChip(
        ctx,
        placedLabels,
        pat.name,
        x,
        y - fontSize - 12,
        bounds,
        chipBg,
        '#FFFFFF',
        fontSize
      );
    });
  }

  // 5. CANDLE NAMES ON CHART (Multi-candle brackets + Numbered badges 1..N staggered in 2 rows + compact tags)
  if (layers.candleLabels && Array.isArray(analysis.candles)) {
    const candles = analysis.candles;
    const badgeR = Math.max(8.5, 9.5 * scaleFactor);
    const tagFont = Math.max(8, Math.round(8.5 * scaleFactor));
    const showTags = candles.length <= 12 && bounds.width >= 300;
    const baseStripY = bounds.bottom - badgeR * 2.1 - 6;

    candles.forEach((c, idx) => {
      const cx = clamp(toPlotX(c.x), bounds.left + badgeR + 4, bounds.right - badgeR - 4);
      const cLeft = clamp(toPlotX(c.x_start ?? c.x - 10), bounds.left + 4, bounds.right - 4);
      const cRight = clamp(toPlotX(c.x_end ?? c.x + 10), bounds.left + 4, bounds.right - 4);
      const candleTop = toPlotY(c.y_top);
      const candleBottom = toPlotY(c.y_bottom);

      const rowOffset = idx % 2 === 0 ? 0 : -(badgeR * 2.5);
      const badgeCy = clamp(
        Math.min(baseStripY + rowOffset, Math.max(candleBottom + badgeR + 8, baseStripY + rowOffset)),
        bounds.top + badgeR + 4,
        bounds.bottom - badgeR - 4
      );

      const isHighlighted = highlightedCandleIndex === c.index;
      const badgeColor =
        c.type === 'bullish'
          ? '#1DDB04'
          : c.type === 'bearish'
            ? '#FF4D1F'
            : '#F59E0B';

      // Multi-candle bracket spanning all candles in the pattern
      if ((c.candle_count || 1) > 1 && cRight - cLeft > 12) {
        const bracketY = clamp(candleBottom + 4, bounds.top + 6, badgeCy - badgeR - 3);
        ctx.save();
        ctx.strokeStyle = isHighlighted ? '#1DDB04' : badgeColor;
        ctx.lineWidth = isHighlighted ? 2 : 1.4;
        ctx.beginPath();
        ctx.moveTo(cLeft, bracketY - 5);
        ctx.lineTo(cLeft, bracketY);
        ctx.lineTo(cRight, bracketY);
        ctx.lineTo(cRight, bracketY - 5);
        ctx.stroke();
        ctx.restore();
      }

      // Subtle guide tick from candle bottom to badge
      ctx.save();
      ctx.strokeStyle = isHighlighted ? '#1DDB04' : 'rgba(255, 255, 255, 0.24)';
      ctx.lineWidth = isHighlighted ? 2 : 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, clamp(candleBottom, bounds.top, bounds.bottom));
      ctx.lineTo(cx, badgeCy - badgeR);
      ctx.stroke();
      ctx.restore();

      // Highlight candle / group box if selected
      if (isHighlighted) {
        ctx.save();
        ctx.strokeStyle = '#1DDB04';
        ctx.fillStyle = 'rgba(29, 219, 4, 0.14)';
        ctx.lineWidth = 2.2 * scaleFactor;
        const boxX = Math.min(cx - 10 * scaleFactor, cLeft - 3);
        const boxW = Math.max(20 * scaleFactor, cRight - cLeft + 6);
        const boxH = Math.max(20, candleBottom - candleTop + 8);
        drawRoundedRect(ctx, boxX, candleTop - 4, boxW, boxH, 6);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Numbered circle badge
      ctx.save();
      ctx.fillStyle = isHighlighted ? '#1DDB04' : badgeColor;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(cx, badgeCy, badgeR, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = isHighlighted ? '#0B0B0B' : 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = isHighlighted ? '#0B0B0B' : '#FFFFFF';
      ctx.font = `700 ${Math.round(9.5 * scaleFactor)}px Poppins, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(c.index), cx, badgeCy + 0.5);
      ctx.restore();

      hitboxes.push({ index: c.index, cx, cy: badgeCy, r: badgeR + 8 });

      // Compact tag text above badge if space allows
      if (showTags) {
        const shortTag = shortenCandleName(c.name);
        ctx.font = `600 ${tagFont}px Poppins, sans-serif`;
        const tw = ctx.measureText(shortTag).width + 8;
        const tagRect: LabelRect = {
          x: clamp(cx - tw / 2, bounds.left + 4, bounds.right - tw - 4),
          y: clamp(badgeCy - badgeR - tagFont - 7, bounds.top + 4, bounds.bottom - tagFont - 8),
          w: tw,
          h: tagFont + 5,
        };
        if (!placedLabels.some((p) => rectsOverlap(tagRect, p))) {
          placedLabels.push(tagRect);
          ctx.save();
          ctx.fillStyle = 'rgba(11, 11, 11, 0.86)';
          drawRoundedRect(ctx, tagRect.x, tagRect.y, tagRect.w, tagRect.h, 4);
          ctx.fill();
          ctx.fillStyle = isHighlighted ? '#1DDB04' : '#F5F5F5';
          ctx.textBaseline = 'middle';
          ctx.fillText(shortTag, tagRect.x + 4, tagRect.y + tagRect.h / 2 + 0.5);
          ctx.restore();
        }
      }
    });
  }

  // 6. Last Candle glowing circle + label
  if (
    layers.lastCandle &&
    analysis.last_candle &&
    Array.isArray(analysis.last_candle.box) &&
    analysis.last_candle.box.length === 4
  ) {
    const [ymin, xmin, ymax, xmax] = analysis.last_candle.box;
    const x = toPlotX(xmin);
    const y = toPlotY(ymin);
    const w = Math.max(16, toPlotX(xmax) - x);
    const h = Math.max(20, toPlotY(ymax) - y);

    const cx = clamp(x + w / 2, bounds.left + 12, bounds.right - 12);
    const cy = clamp(y + h / 2, bounds.top + 12, bounds.bottom - 12);
    const radius = Math.min(
      Math.max(w, h) / 2 + 10 * scaleFactor,
      Math.min(bounds.width, bounds.height) * 0.16
    );

    ctx.save();
    ctx.strokeStyle = '#1DDB04';
    ctx.fillStyle = 'rgba(29, 219, 4, 0.14)';
    ctx.shadowColor = 'rgba(29, 219, 4, 0.55)';
    ctx.shadowBlur = 10;
    ctx.lineWidth = lineW * 1.35;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    placeLabelChip(
      ctx,
      placedLabels,
      `Last Candle: ${analysis.last_candle.name}`,
      cx - 75,
      cy - radius - fontSize - 12,
      bounds,
      'rgba(14, 14, 16, 0.96)',
      '#F5D061',
      fontSize
    );
  }

  // 7. Permanent Branded Watermark inside chart plot bottom-left corner
  const wmFont = Math.max(9, Math.round(9.5 * scaleFactor));
  ctx.font = `600 ${wmFont}px "Plus Jakarta Sans", sans-serif`;
  const wmText = 'Created & Developed by Nizam XD · v2.4.0';
  const wmWidth = Math.ceil(ctx.measureText(wmText).width + 16);
  const wmHeight = Math.ceil(wmFont + 10);
  const wmX = bounds.left + 8;
  const wmY = Math.max(bounds.top + 8, bounds.bottom - wmHeight - 8);

  ctx.save();
  ctx.fillStyle = 'rgba(7, 7, 8, 0.82)';
  drawRoundedRect(ctx, wmX, wmY, wmWidth, wmHeight, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#F5D061';
  ctx.textBaseline = 'middle';
  ctx.fillText(wmText, wmX + 8, wmY + wmHeight / 2 + 0.5);
  ctx.restore();

  return hitboxes;
}

async function triggerGallerySave(dataUrl: string, filename: string): Promise<void> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: 'image/png' });
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
    };

    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isMobile && typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: filename });
      return;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    // Fallback to standard download link below
  }

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/** 1. Original Screenshot Download: chart_original_<timestamp>.png */
export async function downloadOriginalScreenshot(originalDataUrl: string): Promise<void> {
  const filename = `chart_original_${Date.now()}.png`;
  await triggerGallerySave(originalDataUrl, filename);
}

/** 2. Marked Chart Download: chart_analyzed_<timestamp>.png */
export async function downloadMarkedChart(
  imageSrc: string,
  analysis: ChartAnalysis,
  layers: OverlayLayers
): Promise<void> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Marked chart export fail ho gaya.'));
    el.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const overlay = document.createElement('canvas');
  overlay.width = canvas.width;
  overlay.height = canvas.height;
  const oCtx = overlay.getContext('2d');
  if (oCtx) {
    drawChartAnnotations(oCtx, canvas.width, canvas.height, analysis, layers, null, null);
    ctx.drawImage(overlay, 0, 0);
  }

  // Permanent bottom-right branded stamp on exported marked chart
  const stampFont = Math.max(12, Math.round(canvas.width * 0.013));
  ctx.save();
  ctx.font = `600 ${stampFont}px "Plus Jakarta Sans", sans-serif`;
  const stampText = `Chart Analyzer v2.4.0 · Created & Developed by Nizam XD · © 2026 Nizam XD`;
  const stampW = Math.ceil(ctx.measureText(stampText).width + 24);
  const stampH = Math.ceil(stampFont + 14);
  const sx = Math.max(12, canvas.width - stampW - 14);
  const sy = Math.max(12, canvas.height - stampH - 14);
  ctx.fillStyle = 'rgba(7, 7, 8, 0.88)';
  drawRoundedRect(ctx, sx, sy, stampW, stampH, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#F5D061';
  ctx.textBaseline = 'middle';
  ctx.fillText(stampText, sx + 12, sy + stampH / 2 + 0.5);
  ctx.restore();

  const filename = `chart_analyzed_${Date.now()}.png`;
  await triggerGallerySave(canvas.toDataURL('image/png'), filename);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** 3. Shape Download: shape_<name>_<timestamp>.png */
export async function downloadShapeCard(
  shape: PriceShape,
  instrument: string,
  timeframe: string
): Promise<void> {
  const width = 1080;
  const padX = 56;
  const contentW = width - padX * 2;
  const svgH = 440;

  const tempCanvas = document.createElement('canvas');
  const mCtx = tempCanvas.getContext('2d');
  if (!mCtx) return;

  mCtx.font = '400 22px Poppins, sans-serif';
  const meaningLines = wrapLines(mCtx, shape.meaning_hinglish, contentW - 48);
  const nextLines = wrapLines(mCtx, shape.what_next_hinglish, contentW - 48);
  const tradeLines = wrapLines(mCtx, shape.how_to_trade_hinglish, contentW - 48);
  const totalHeight =
    210 + svgH + 90 + (meaningLines.length + nextLines.length + tradeLines.length) * 30 + 180;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Obsidian #070708 Black & Gold background
  ctx.fillStyle = '#070708';
  ctx.fillRect(0, 0, width, totalHeight);

  // Header
  ctx.fillStyle = '#D4AF37';
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`PRICE SHAPE  ·  ${instrument}  ·  ${timeframe}`, padX, 58);

  ctx.fillStyle = '#FAF4E4';
  ctx.font = '700 40px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(shape.name, padX, 114);

  const accent =
    shape.bias === 'bullish' ? '#1DDB04' : shape.bias === 'bearish' ? '#FF4D1F' : '#FBBF24';
  ctx.fillStyle = accent;
  ctx.font = '600 22px Poppins, sans-serif';
  ctx.fillText(
    `${shape.bias.toUpperCase()}  ·  ${shape.completion_status.toUpperCase()}  ·  Confidence ${shape.confidence}%`,
    padX,
    158
  );

  // Shape SVG Box (#141414)
  const boxY = 190;
  ctx.fillStyle = '#141414';
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, padX, boxY, contentW, svgH, 24);
  ctx.fill();
  ctx.stroke();

  // Subtle grid inside SVG box
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let gx = 1; gx <= 5; gx++) {
    const x = padX + (contentW / 6) * gx;
    ctx.beginPath();
    ctx.moveTo(x, boxY + 16);
    ctx.lineTo(x, boxY + svgH - 16);
    ctx.stroke();
  }
  for (let gy = 1; gy <= 3; gy++) {
    const y = boxY + (svgH / 4) * gy;
    ctx.beginPath();
    ctx.moveTo(padX + 16, y);
    ctx.lineTo(padX + contentW - 16, y);
    ctx.stroke();
  }

  // Rescale shape points into box
  const pts = shape.points || [];
  if (pts.length > 0) {
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    if (shape.neckline) ys.push(shape.neckline.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(10, maxX - minX);
    const spanY = Math.max(10, maxY - minY);

    const innerPadX = 70;
    const innerPadY = 64;
    const mapX = (vx: number) =>
      padX + innerPadX + ((vx - minX) / spanX) * (contentW - innerPadX * 2);
    const mapY = (vy: number) =>
      boxY + innerPadY + ((vy - minY) / spanY) * (svgH - innerPadY * 2);

    if (shape.neckline) {
      const ny = mapY(shape.neckline.y);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(padX + 28, ny);
      ctx.lineTo(padX + contentW - 28, ny);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '600 18px Poppins, sans-serif';
      ctx.fillText('Neckline', padX + contentW - 120, ny - 10);
    }

    // Smooth path
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((p, idx) => {
      const px = mapX(p.x);
      const py = mapY(p.y);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Points & labels
    pts.forEach((p) => {
      const px = mapX(p.x);
      const py = mapY(p.y);
      ctx.fillStyle = '#0B0B0B';
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#E5E7EB';
      ctx.font = '600 17px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, px, py - 18);
    });
    ctx.textAlign = 'left';
  }

  // Meaning sections
  let ty = boxY + svgH + 48;
  const drawBlock = (heading: string, lines: string[]) => {
    ctx.fillStyle = '#D4AF37';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(heading, padX, ty);
    ty += 34;
    ctx.fillStyle = '#D9D0BF';
    ctx.font = '400 22px "Plus Jakarta Sans", sans-serif';
    lines.forEach((l) => {
      ctx.fillText(l, padX, ty);
      ty += 30;
    });
    ty += 20;
  };

  drawBlock('Iska Matlab', meaningLines);
  drawBlock('Aage Kya Hota Hai', nextLines);
  drawBlock('Kaise Trade Karte Hain (Educational)', tradeLines);

  ctx.fillStyle = '#D4AF37';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    'Created & Developed by Nizam XD · Chart Analyzer v2.4.0 · © 2026 Nizam XD',
    padX,
    totalHeight - 62
  );
  ctx.fillStyle = '#8C8474';
  ctx.font = '500 17px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    'Yeh sirf educational analysis hai, financial advice ya profit guarantee nahi. Hamesha stop-loss lagao.',
    padX,
    totalHeight - 32
  );

  const safeShape = shape.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const filename = `shape_${safeShape || 'pattern'}_${Date.now()}.png`;
  await triggerGallerySave(canvas.toDataURL('image/png'), filename);
}

/** 4. Crop detected candle area sharply from user's screenshot with padding */
export async function cropCandleFromImage(
  imageSrc: string,
  candle: DetectedCandle
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Candle crop load nahi ho paaya.'));
    el.src = imageSrc;
  });

  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const rawLeft = ((candle.x_start ?? candle.x - 14) / 1000) * w;
  const rawRight = ((candle.x_end ?? candle.x + 14) / 1000) * w;
  const rawTop = ((candle.y_top ?? 400) / 1000) * h;
  const rawBottom = ((candle.y_bottom ?? 600) / 1000) * h;

  const cWidth = Math.max(16, rawRight - rawLeft);
  const cHeight = Math.max(24, rawBottom - rawTop);

  const padX = Math.max(cWidth * 1.4, w * 0.06);
  const padY = Math.max(cHeight * 0.7, h * 0.08);

  const sx = Math.max(0, Math.floor(rawLeft - padX));
  const sy = Math.max(0, Math.floor(rawTop - padY));
  const sw = Math.min(w - sx, Math.ceil(cWidth + padX * 2));
  const sh = Math.min(h - sy, Math.ceil(cHeight + padY * 2));

  const outW = 360;
  const outH = 240;
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#0B0B0B';
  ctx.fillRect(0, 0, outW, outH);

  // Preserve aspect inside 360x240 frame using crisp upscaling
  const scale = Math.min(outW / sw, outH / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (outW - dw) / 2;
  const dy = (outH - dh) / 2;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

  // Subtle focus frame around the target candle itself
  const targetX = dx + ((rawLeft - sx) / sw) * dw;
  const targetY = dy + ((rawTop - sy) / sh) * dh;
  const targetW = Math.max(14, (cWidth / sw) * dw);
  const targetH = Math.max(20, (cHeight / sh) * dh);

  ctx.strokeStyle =
    candle.type === 'bullish' ? '#1DDB04' : candle.type === 'bearish' ? '#FF4D1F' : '#FBBF24';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 4]);
  drawRoundedRect(ctx, targetX - 4, targetY - 4, targetW + 8, targetH + 8, 6);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}

/** 5. Share/Download Candle Pattern Card as PNG: candle_<name>_<timestamp>.png */
export async function downloadPatternCard(
  pattern: PatternDefinition,
  contextMeta?: {
    instrument?: string;
    timeframe?: string;
    customChancesText?: string;
    customNextText?: string;
  }
): Promise<void> {
  const width = 1080;
  const padX = 56;
  const contentW = width - padX * 2;
  const svgH = 420;

  const tempCanvas = document.createElement('canvas');
  const mCtx = tempCanvas.getContext('2d');
  if (!mCtx) return;

  mCtx.font = '400 22px Poppins, sans-serif';
  const formLines = wrapLines(mCtx, pattern.howItFormsHinglish, contentW);
  const tellsLines = wrapLines(mCtx, pattern.whatItTellsHinglish, contentW);
  const chanceLines = wrapLines(
    mCtx,
    contextMeta?.customChancesText || pattern.chancesReasonHinglish,
    contentW
  );
  const confirmLines = wrapLines(
    mCtx,
    `Confirm hui (${pattern.nextIfConfirmed.name}): ${pattern.nextIfConfirmed.meaningHinglish} ${pattern.nextIfConfirmed.actionHinglish}`,
    contentW
  );
  const failLines = wrapLines(
    mCtx,
    `Fail hui (${pattern.nextIfFails.name}): ${pattern.nextIfFails.meaningHinglish} ${pattern.nextIfFails.actionHinglish}`,
    contentW
  );

  const totalHeight =
    210 +
    svgH +
    60 +
    (formLines.length + tellsLines.length + chanceLines.length + confirmLines.length + failLines.length) * 30 +
    280;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#070708';
  ctx.fillRect(0, 0, width, totalHeight);

  const subtitle = contextMeta?.instrument
    ? `${contextMeta.instrument} · ${contextMeta.timeframe || ''} · CANDLE PATTERN GUIDE`
    : `CANDLE PATTERN GUIDE · ${pattern.role.toUpperCase()} · ${pattern.candles.length} CANDLE`;

  ctx.fillStyle = '#D4AF37';
  ctx.font = '600 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtitle, padX, 56);

  ctx.fillStyle = '#FAF4E4';
  ctx.font = '700 40px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(pattern.name, padX, 112);

  const accent =
    pattern.bias === 'bullish' ? '#1DDB04' : pattern.bias === 'bearish' ? '#FF4D1F' : '#FBBF24';
  ctx.fillStyle = accent;
  ctx.font = '600 21px Poppins, sans-serif';
  ctx.fillText(
    `${pattern.bias.toUpperCase()}  ·  Bullish: ${pattern.bullishChance}  ·  Bearish: ${pattern.bearishChance}`,
    padX,
    156
  );

  // Dark Illustration box (#141414)
  const boxY = 186;
  ctx.fillStyle = '#141414';
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, padX, boxY, contentW, svgH, 24);
  ctx.fill();
  ctx.stroke();

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    const gy = boxY + (svgH / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padX + 20, gy);
    ctx.lineTo(padX + contentW - 20, gy);
    ctx.stroke();
  }

  // Draw 3 grey context candles + pattern candles + 2 ghost candles
  const trendCandles: Array<[number, number, number, number]> =
    pattern.trendBefore === 'down'
      ? [
          [92, 95, 78, 82],
          [82, 85, 68, 72],
          [72, 75, 58, 62],
        ]
      : pattern.trendBefore === 'up'
        ? [
            [18, 32, 15, 28],
            [28, 44, 25, 40],
            [40, 56, 37, 52],
          ]
        : [
            [46, 56, 40, 50],
            [50, 58, 44, 48],
            [48, 55, 42, 52],
          ];

  const totalSlots = trendCandles.length + pattern.candles.length + 2;
  const innerPadX = 64;
  const innerPadY = 58;
  const slotW = (contentW - innerPadX * 2) / totalSlots;
  const mapY = (val: number) =>
    boxY + innerPadY + ((100 - clamp(val, 0, 100)) / 100) * (svgH - innerPadY * 2);

  const drawCandleSlot = (
    slotIdx: number,
    ohlc: [number, number, number, number],
    fillColor: string,
    dashed = false,
    alpha = 1
  ) => {
    const [o, h, l, c] = ohlc;
    const cx = padX + innerPadX + slotW * (slotIdx + 0.5);
    const bodyW = Math.min(34, slotW * 0.52);
    const yH = mapY(h);
    const yL = mapY(l);
    const yTop = mapY(Math.max(o, c));
    const yBot = mapY(Math.min(o, c));
    const bodyH = Math.max(4, yBot - yTop);

    ctx.save();
    ctx.globalAlpha = alpha;
    if (dashed) ctx.setLineDash([6, 4]);
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, yH);
    ctx.lineTo(cx, yL);
    ctx.stroke();

    if (dashed) {
      ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
      drawRoundedRect(ctx, cx - bodyW / 2, yTop, bodyW, bodyH, 5);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = fillColor;
      drawRoundedRect(ctx, cx - bodyW / 2, yTop, bodyW, bodyH, 5);
      ctx.fill();
    }
    ctx.restore();
    return cx;
  };

  trendCandles.forEach((tc, i) => drawCandleSlot(i, tc, '#6B7280', false, 0.35));

  const patXs: number[] = [];
  pattern.candles.forEach((pc, i) => {
    const isBull = pc[3] >= pc[0];
    const col = isBull ? '#1DDB04' : '#FF4D1F';
    const cx = drawCandleSlot(trendCandles.length + i, pc, col, false, 1);
    patXs.push(cx);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 18px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), cx, boxY + 34);
  });

  // Bracket under pattern candles
  if (patXs.length > 0) {
    const bx1 = patXs[0] - 18;
    const bx2 = patXs[patXs.length - 1] + 18;
    const by = boxY + svgH - 42;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx1, by - 8);
    ctx.lineTo(bx1, by);
    ctx.lineTo(bx2, by);
    ctx.lineTo(bx2, by - 8);
    ctx.stroke();

    ctx.fillStyle = '#D1D5DB';
    ctx.font = '600 18px Poppins, sans-serif';
    ctx.fillText(pattern.name, (bx1 + bx2) / 2, by + 24);
  }

  // Two ghost candles
  const lastClose = pattern.candles[pattern.candles.length - 1][3];
  const g1Start = clamp(lastClose, 20, 72);
  const g2Start = clamp(lastClose, 28, 82);
  const g1Cx = drawCandleSlot(
    trendCandles.length + pattern.candles.length,
    [g1Start, g1Start + 22, g1Start - 2, g1Start + 18],
    '#1DDB04',
    true,
    0.9
  );
  const g2Cx = drawCandleSlot(
    trendCandles.length + pattern.candles.length + 1,
    [g2Start, g2Start + 2, g2Start - 22, g2Start - 18],
    '#FF4D1F',
    true,
    0.9
  );

  ctx.font = '600 14px Poppins, sans-serif';
  ctx.fillStyle = '#1DDB04';
  ctx.fillText('Confirm ↑', g1Cx, boxY + 34);
  ctx.fillStyle = '#FF4D1F';
  ctx.fillText('Fail ↓', g2Cx, boxY + 34);
  ctx.textAlign = 'left';

  let ty = boxY + svgH + 50;
  const drawSec = (heading: string, lines: string[], col = '#D4AF37') => {
    ctx.fillStyle = col;
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(heading, padX, ty);
    ty += 34;
    ctx.fillStyle = '#D9D0BF';
    ctx.font = '400 21px "Plus Jakarta Sans", sans-serif';
    lines.forEach((l) => {
      ctx.fillText(l, padX, ty);
      ty += 30;
    });
    ty += 18;
  };

  drawSec('Kaise Banti Hai', formLines);
  drawSec('Kya Batati Hai', tellsLines);
  drawSec('Chances (Yeh sirf probability hai, guarantee nahi)', chanceLines);
  drawSec('Agar Confirm Hui (Next Candle)', confirmLines, '#1DDB04');
  drawSec('Agar Fail Hui (Stop-Loss Logic)', failLines, '#FF4D1F');

  ctx.fillStyle = '#D4AF37';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    'Created & Developed by Nizam XD · Chart Analyzer v2.4.0 · © 2026 Nizam XD',
    padX,
    totalHeight - 60
  );
  ctx.fillStyle = '#8C8474';
  ctx.font = '500 17px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    'Yeh sirf educational analysis hai, financial advice ya profit guarantee nahi. Confirmation candle ka wait karo.',
    padX,
    totalHeight - 30
  );

  const safeName = pattern.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const filename = `candle_${safeName || 'pattern'}_${Date.now()}.png`;
  await triggerGallerySave(canvas.toDataURL('image/png'), filename);
}
