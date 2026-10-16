import { removeBackground } from '@imgly/background-removal';

export interface TextOverlay {
  text: string;
  size: number;
  color: string;
  strokeColor: string;
  x: number; // 0 to 1 relative
  y: number; // 0 to 1 relative
}

/**
 * Remove background using client-side AI model
 */
export async function autoRemoveBackground(imageSource: Blob | File | string): Promise<Blob> {
  return await removeBackground(imageSource, {
    progress: (key, current, total) => {
      // Can be tracked if needed
      console.log(`Model progress [${key}]: ${current}/${total}`);
    },
  });
}

/**
 * Convert Blob or File to HTMLImageElement
 */
export function blobToImage(blob: Blob | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Create a mask canvas from a transparent cut-out image
 * Returns an offscreen canvas where white (255) is visible and black (0) is transparent.
 */
export function createMaskFromCutout(
  cutoutImg: HTMLImageElement,
  width: number,
  height: number
): HTMLCanvasElement {
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return maskCanvas;

  ctx.drawImage(cutoutImg, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Convert alpha to grayscale mask (white where alpha > 20, black elsewhere)
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = alpha;
  }
  ctx.putImageData(imgData, 0, 0);
  return maskCanvas;
}

/**
 * Auto-trim transparent pixels and return bounding box
 */
export function getMaskBoundingBox(maskCanvas: HTMLCanvasElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { x: 0, y: 0, width: maskCanvas.width, height: maskCanvas.height };

  const { width, height } = maskCanvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4 + 3; // alpha channel
      if (data[idx] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found) return { x: 0, y: 0, width, height };

  const padding = 10;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width, maxX + padding);
  maxY = Math.min(height, maxY + padding);

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

/**
 * Render the final sticker image onto a 512x512 canvas (WhatsApp sticker spec)
 */
export function exportStickerCanvas(
  originalImg: HTMLImageElement,
  maskCanvas: HTMLCanvasElement,
  textOverlay?: TextOverlay | null,
  cropBox?: { x: number; y: number; width: number; height: number }
): HTMLCanvasElement {
  const targetSize = 512;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = targetSize;
  outCanvas.height = targetSize;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return outCanvas;

  const crop = cropBox || {
    x: 0,
    y: 0,
    width: originalImg.naturalWidth,
    height: originalImg.naturalHeight,
  };

  // Intermediate canvas for cropped result
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = crop.width;
  tempCanvas.height = crop.height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return outCanvas;

  // 1. Draw original cropped image
  tempCtx.drawImage(
    originalImg,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  // 2. Apply mask with destination-in
  tempCtx.globalCompositeOperation = 'destination-in';
  tempCtx.drawImage(
    maskCanvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );
  tempCtx.globalCompositeOperation = 'source-over';

  // 3. Scale and fit into 512x512 keeping aspect ratio
  const scale = Math.min((targetSize - 20) / crop.width, (targetSize - 20) / crop.height);
  const drawWidth = crop.width * scale;
  const drawHeight = crop.height * scale;
  const dx = (targetSize - drawWidth) / 2;
  const dy = (targetSize - drawHeight) / 2;

  ctx.drawImage(tempCanvas, dx, dy, drawWidth, drawHeight);

  // 4. Draw text overlay if present
  if (textOverlay && textOverlay.text.trim()) {
    ctx.save();
    const fontSize = Math.max(16, Math.round(textOverlay.size * (targetSize / 400)));
    ctx.font = `900 ${fontSize}px "Impact", "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(4, Math.round(fontSize * 0.15));
    ctx.strokeStyle = textOverlay.strokeColor || '#000000';
    ctx.fillStyle = textOverlay.color || '#ffffff';

    const tx = targetSize * textOverlay.x;
    const ty = targetSize * textOverlay.y;

    // Text stroke & fill (meme / sticker style)
    ctx.strokeText(textOverlay.text, tx, ty);
    ctx.fillText(textOverlay.text, tx, ty);
    ctx.restore();
  }

  return outCanvas;
}

/**
 * Copy transparent PNG image to clipboard
 */
export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }

      try {
        if (navigator.clipboard && window.ClipboardItem) {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          resolve(true);
        } else {
          resolve(false);
        }
      } catch (err) {
        console.error('Clipboard copy error:', err);
        resolve(false);
      }
    }, 'image/png');
  });
}
