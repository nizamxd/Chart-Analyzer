// Web Worker for non-blocking image decoding, resizing (max 2000px JPEG 0.9), thumbnail, and PNG original export

const MAX_WIDTH = 2000;
const JPEG_QUALITY = 0.9;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Image encode fail ho gaya.'));
    reader.readAsDataURL(blob);
  });
}

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<{ id: number; blob: Blob }>) => void) | null;
  postMessage: (data: unknown) => void;
};

workerScope.onmessage = async (event: MessageEvent<{ id: number; blob: Blob }>) => {
  const { id, blob } = event.data;
  try {
    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
      workerScope.postMessage({ id, fallback: true });
      return;
    }

    const bitmap = await createImageBitmap(blob);
    const origW = bitmap.width;
    const origH = bitmap.height;

    if (origW < 60 || origH < 60) {
      bitmap.close();
      workerScope.postMessage({
        id,
        error: 'Image bahut chhoti hai. Kripya ek clear chart screenshot upload karein.',
      });
      return;
    }

    // 1. Original untouched PNG
    const origCanvas = new OffscreenCanvas(origW, origH);
    const origCtx = origCanvas.getContext('2d');
    if (!origCtx) {
      bitmap.close();
      workerScope.postMessage({ id, fallback: true });
      return;
    }
    origCtx.drawImage(bitmap, 0, 0);
    const origPngBlob = await origCanvas.convertToBlob({ type: 'image/png' });
    const originalDataUrl = await blobToDataUrl(origPngBlob);

    // 2. Resized max 2000px JPEG 0.9
    let targetW = origW;
    let targetH = origH;
    if (targetW > MAX_WIDTH) {
      const ratio = MAX_WIDTH / targetW;
      targetW = MAX_WIDTH;
      targetH = Math.round(targetH * ratio);
    }

    const resizedCanvas = new OffscreenCanvas(targetW, targetH);
    const rCtx = resizedCanvas.getContext('2d');
    if (!rCtx) {
      bitmap.close();
      workerScope.postMessage({ id, fallback: true });
      return;
    }
    rCtx.fillStyle = '#0B0B0B';
    rCtx.fillRect(0, 0, targetW, targetH);
    rCtx.drawImage(bitmap, 0, 0, targetW, targetH);

    const jpegBlob = await resizedCanvas.convertToBlob({
      type: 'image/jpeg',
      quality: JPEG_QUALITY,
    });
    const dataUrl = await blobToDataUrl(jpegBlob);
    const base64 = dataUrl.split(',')[1] || '';

    // 3. 300px thumbnail
    const thumbW = Math.min(300, targetW);
    const thumbH = Math.round((thumbW / targetW) * targetH);
    const thumbCanvas = new OffscreenCanvas(thumbW, thumbH);
    const tCtx = thumbCanvas.getContext('2d');
    tCtx?.drawImage(resizedCanvas, 0, 0, thumbW, thumbH);
    const thumbBlob = await thumbCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
    const thumbnailDataUrl = await blobToDataUrl(thumbBlob);

    bitmap.close();

    workerScope.postMessage({
      id,
      result: {
        dataUrl,
        originalDataUrl,
        thumbnailDataUrl,
        base64,
        mimeType: 'image/jpeg',
        width: targetW,
        height: targetH,
      },
    });
  } catch (err) {
    workerScope.postMessage({
      id,
      fallback: true,
      error: err instanceof Error ? err.message : undefined,
    });
  }
};
