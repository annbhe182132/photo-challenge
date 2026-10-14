import jsQR from 'jsqr';

// Check if BarcodeDetector is supported natively in the browser
let barcodeDetectorInstance: { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } | null = null;
let barcodeDetectorChecked = false;

function getNativeBarcodeDetector() {
  if (barcodeDetectorChecked) return barcodeDetectorInstance;
  barcodeDetectorChecked = true;
  try {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      const BD = (window as unknown as { BarcodeDetector: new (opts?: { formats: string[] }) => typeof barcodeDetectorInstance }).BarcodeDetector;
      barcodeDetectorInstance = new BD({ formats: ['qr_code'] });
    }
  } catch (err) {
    console.warn('[QR Scanner] Native BarcodeDetector not available:', err);
    barcodeDetectorInstance = null;
  }
  return barcodeDetectorInstance;
}

/**
 * Scan raw ImageData with jsQR using:
 * 1. Dual attempt (normal + inverted)
 * 2. High-contrast thresholding
 * 3. Inverted binary thresholding
 */
export function scanImageDataWithJsQR(imageData: ImageData): string | null {
  // 1. Dual attempt (both normal and inverted)
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });
  if (result?.data) {
    return result.data;
  }

  // 2. High contrast & adaptive binary pass (handles low contrast cards & ambient glare)
  try {
    const data = imageData.data;
    const len = data.length;
    const boosted = new Uint8ClampedArray(len);

    let sum = 0;
    const step = 8;
    let count = 0;
    for (let i = 0; i < len; i += step * 4) {
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
      count++;
    }
    const threshold = count > 0 ? sum / count : 128;

    for (let i = 0; i < len; i += 4) {
      const b = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const v = b > threshold ? 255 : 0;
      boosted[i] = v;
      boosted[i + 1] = v;
      boosted[i + 2] = v;
      boosted[i + 3] = 255;
    }

    const boostedResult = jsQR(boosted, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (boostedResult?.data) {
      return boostedResult.data;
    }
  } catch {
    // ignore thresholding error
  }

  return null;
}

/**
 * Extract an ImageData rectangle from a canvas context safely.
 */
function safeGetImageData(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  canvasW: number,
  canvasH: number
): ImageData | null {
  const sx = Math.max(0, Math.min(canvasW - 1, x));
  const sy = Math.max(0, Math.min(canvasH - 1, y));
  const sw = Math.min(canvasW - sx, Math.max(1, w));
  const sh = Math.min(canvasH - sy, Math.max(1, h));
  if (sw <= 10 || sh <= 10) return null;
  try {
    return ctx.getImageData(sx, sy, sw, sh);
  } catch {
    return null;
  }
}

/**
 * Decode from an HTMLCanvasElement using multi-tier crops:
 * 1. Full image
 * 2. Center 70% (viewfinder bounds)
 * 3. Center 45% (tight QR-core, stripping top/bottom "SNAPDECK" text)
 * 4. Center 30% (ultra-tight close-up)
 * 5. 4x2 grid (matching card sheet layouts)
 * 6. 3x3 grid
 */
export function scanCanvasWithFallback(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const w = canvas.width;
  const h = canvas.height;
  if (w <= 0 || h <= 0) return null;

  // 1. Full canvas
  const fullImg = safeGetImageData(ctx, 0, 0, w, h, w, h);
  if (fullImg) {
    const res = scanImageDataWithJsQR(fullImg);
    if (res) return res;
  }

  // 2. Center 70% (standard viewfinder)
  const c70w = Math.floor(w * 0.7);
  const c70h = Math.floor(h * 0.7);
  const img70 = safeGetImageData(ctx, Math.floor((w - c70w) / 2), Math.floor((h - c70h) / 2), c70w, c70h, w, h);
  if (img70) {
    const res = scanImageDataWithJsQR(img70);
    if (res) return res;
  }

  // 3. Center 45% (CRITICAL: removes outer card borders and "SNAPDECK" letters)
  const c45w = Math.floor(w * 0.45);
  const c45h = Math.floor(h * 0.45);
  const img45 = safeGetImageData(ctx, Math.floor((w - c45w) / 2), Math.floor((h - c45h) / 2), c45w, c45h, w, h);
  if (img45) {
    const res = scanImageDataWithJsQR(img45);
    if (res) return res;
  }

  // 4. Center 30% (ultra-close card positioning)
  const c30w = Math.floor(w * 0.3);
  const c30h = Math.floor(h * 0.3);
  const img30 = safeGetImageData(ctx, Math.floor((w - c30w) / 2), Math.floor((h - c30h) / 2), c30w, c30h, w, h);
  if (img30) {
    const res = scanImageDataWithJsQR(img30);
    if (res) return res;
  }

  // 5. 4x2 grid (matches 8-card sheets printed or photographed)
  const g4w = Math.floor(w * 0.32);
  const g4h = Math.floor(h * 0.55);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      const gx = Math.floor(c * (w / 4));
      const gy = Math.floor(r * (h / 2));
      const gImg = safeGetImageData(ctx, gx, gy, g4w, g4h, w, h);
      if (gImg) {
        const res = scanImageDataWithJsQR(gImg);
        if (res) return res;
      }
    }
  }

  // 6. 3x3 grid
  const g3w = Math.floor(w * 0.45);
  const g3h = Math.floor(h * 0.45);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const gx = Math.min(w - g3w, Math.floor(c * (w / 3)));
      const gy = Math.min(h - g3h, Math.floor(r * (h / 3)));
      const gImg = safeGetImageData(ctx, gx, gy, g3w, g3h, w, h);
      if (gImg) {
        const res = scanImageDataWithJsQR(gImg);
        if (res) return res;
      }
    }
  }

  return null;
}

/**
 * Reusable canvases for real-time video frame scanning.
 */
let sharedVfCanvas: HTMLCanvasElement | null = null;
let sharedVfCtx: CanvasRenderingContext2D | null = null;
let sharedTightCanvas: HTMLCanvasElement | null = null;
let sharedTightCtx: CanvasRenderingContext2D | null = null;

/**
 * Scan a single video frame from an HTMLVideoElement.
 * Samples the HIGH-RESOLUTION center viewfinder directly from the camera sensor
 * WITHOUT downscaling the whole frame, preserving all QR modules and finder patterns.
 */
export async function scanVideoElementFrame(video: HTMLVideoElement): Promise<string | null> {
  if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  // 1. Try native BarcodeDetector if supported by the browser / OS
  const detector = getNativeBarcodeDetector();
  if (detector) {
    try {
      const barcodes = await detector.detect(video);
      if (barcodes?.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch {
      // BarcodeDetector error, fallback to JS decoders
    }
  }

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const minDim = Math.min(vw, vh);

  // 2. High-resolution center viewfinder crop (70% of min dimension, scaled to 480x480 max)
  // This captures the exact area the user is targeting on screen with crisp module edges
  const vfCropDim = Math.floor(minDim * 0.72);
  const vfSx = Math.floor((vw - vfCropDim) / 2);
  const vfSy = Math.floor((vh - vfCropDim) / 2);
  const targetDim = Math.min(480, vfCropDim);

  if (!sharedVfCanvas) {
    sharedVfCanvas = document.createElement('canvas');
  }
  if (sharedVfCanvas.width !== targetDim || sharedVfCanvas.height !== targetDim) {
    sharedVfCanvas.width = targetDim;
    sharedVfCanvas.height = targetDim;
    sharedVfCtx = null;
  }
  if (!sharedVfCtx) {
    sharedVfCtx = sharedVfCanvas.getContext('2d', { willReadFrequently: true });
  }

  if (sharedVfCtx) {
    try {
      sharedVfCtx.drawImage(video, vfSx, vfSy, vfCropDim, vfCropDim, 0, 0, targetDim, targetDim);
      const vfResult = scanCanvasWithFallback(sharedVfCanvas);
      if (vfResult) return vfResult;
    } catch {}
  }

  // 3. Ultra-tight center crop (40% of min dimension, scaled to 300x300)
  // Strips off "SNAPDECK" text and decorative borders if user holds card close to camera
  const tightCropDim = Math.floor(minDim * 0.42);
  const tightSx = Math.floor((vw - tightCropDim) / 2);
  const tightSy = Math.floor((vh - tightCropDim) / 2);
  const tightTargetDim = Math.min(300, tightCropDim);

  if (!sharedTightCanvas) {
    sharedTightCanvas = document.createElement('canvas');
  }
  if (sharedTightCanvas.width !== tightTargetDim || sharedTightCanvas.height !== tightTargetDim) {
    sharedTightCanvas.width = tightTargetDim;
    sharedTightCanvas.height = tightTargetDim;
    sharedTightCtx = null;
  }
  if (!sharedTightCtx) {
    sharedTightCtx = sharedTightCanvas.getContext('2d', { willReadFrequently: true });
  }

  if (sharedTightCtx) {
    try {
      sharedTightCtx.drawImage(video, tightSx, tightSy, tightCropDim, tightCropDim, 0, 0, tightTargetDim, tightTargetDim);
      const tightImg = sharedTightCtx.getImageData(0, 0, tightTargetDim, tightTargetDim);
      const tightResult = scanImageDataWithJsQR(tightImg);
      if (tightResult) return tightResult;
    } catch {}
  }

  return null;
}

/**
 * Scan an uploaded image File using multi-pass decoding:
 * 1. Native BarcodeDetector (if supported)
 * 2. Multi-tier crop & sliding window scan with jsQR (attemptBoth: normal + inverted)
 * 3. Scaled pass for high-res photos
 * 4. Html5Qrcode.scanFile fallback
 */
export async function scanQrImageFile(
  file: File,
  html5QrcodeFallback?: (file: File) => Promise<string>
): Promise<string> {
  // 1. Try Native BarcodeDetector via ImageBitmap
  const detector = getNativeBarcodeDetector();
  if (detector && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        const barcodes = await detector.detect(bitmap);
        if (barcodes?.length > 0 && barcodes[0].rawValue) {
          return barcodes[0].rawValue;
        }
      } finally {
        bitmap.close();
      }
    } catch (err) {
      console.warn('[QR File Scan] Native BarcodeDetector error:', err);
    }
  }

  // 2. Load into HTMLImageElement
  const imgUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (e) => reject(e);
      image.src = imgUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx && canvas.width > 0 && canvas.height > 0) {
      ctx.drawImage(img, 0, 0);

      // Pass A: Multi-tier fallback on canvas
      const decodedOriginal = scanCanvasWithFallback(canvas);
      if (decodedOriginal) return decodedOriginal;

      // Pass B: Sliding window search for multi-card images or off-center cards
      const w = canvas.width;
      const h = canvas.height;
      const winW = Math.max(80, Math.floor(w * 0.25));
      const winH = Math.max(80, Math.floor(h * 0.35));
      const stepX = Math.max(30, Math.floor(winW * 0.5));
      const stepY = Math.max(30, Math.floor(winH * 0.5));

      for (let y = 0; y + winH <= h; y += stepY) {
        for (let x = 0; x + winW <= w; x += stepX) {
          const sub = safeGetImageData(ctx, x, y, winW, winH, w, h);
          if (sub) {
            const res = scanImageDataWithJsQR(sub);
            if (res) return res;
          }
        }
      }

      // Pass C: If photo is huge (> 1400px), scale down and retry
      const maxSide = Math.max(w, h);
      if (maxSide > 1400) {
        const scale = 1000 / maxSide;
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = Math.floor(w * scale);
        scaledCanvas.height = Math.floor(h * scale);
        const scaledCtx = scaledCanvas.getContext('2d', { willReadFrequently: true });
        if (scaledCtx) {
          scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
          const decodedScaled = scanCanvasWithFallback(scaledCanvas);
          if (decodedScaled) return decodedScaled;
        }
      }
    }
  } catch (err) {
    console.warn('[QR File Scan] Image canvas parsing error:', err);
  } finally {
    URL.revokeObjectURL(imgUrl);
  }

  // 3. Fallback to html5-qrcode scanFile
  if (html5QrcodeFallback) {
    return await html5QrcodeFallback(file);
  }

  throw new Error('Không nhận diện được mã QR trong ảnh.');
}
