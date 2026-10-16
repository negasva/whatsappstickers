import { removeBackground } from '@imgly/background-removal';

export interface TextOverlay {
  text: string;
  size: number;
  color: string;
  strokeColor: string;
  x: number;
  y: number;
}

export type StickerDisplayMode = 'cutout' | 'square' | 'full';

export async function optimizeImageForSticker(
  file: File | Blob,
  maxDimension = 640
): Promise<{
  optimizedBlob: Blob;
  img: HTMLImageElement;
  width: number;
  height: number;
}> {
  const originalImg = await blobToImage(file);
  const origW = originalImg.naturalWidth;
  const origH = originalImg.naturalHeight;

  const scale = Math.min(1, maxDimension / Math.max(origW, origH));
  const targetW = Math.max(1, Math.round(origW * scale));
  const targetH = Math.max(1, Math.round(origH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.drawImage(originalImg, 0, 0, targetW, targetH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Failed to create image blob'));
        return;
      }
      const resizedImg = await blobToImage(blob);
      resolve({
        optimizedBlob: blob,
        img: resizedImg,
        width: targetW,
        height: targetH,
      });
    }, 'image/png');
  });
}

export async function autoRemoveBackground(
  imageSource: Blob | File | string,
  onProgress?: (ratio: number) => void
): Promise<Blob> {
  return await removeBackground(imageSource, {
    model: 'isnet_quint8',
    rescale: true,
    proxyToWorker: false,
    device: 'cpu',
    progress: (_key, current, total) => {
      if (total > 0 && onProgress) {
        onProgress(Math.min(1, current / total));
      }
    },
  });
}

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
      const idx = (y * width + x) * 4 + 3;
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

  const padding = 8;
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

export function exportStickerCanvas(
  originalImg: HTMLImageElement,
  maskCanvas: HTMLCanvasElement,
  textOverlay?: TextOverlay | null,
  cropBox?: { x: number; y: number; width: number; height: number },
  displayMode: StickerDisplayMode = 'cutout'
): HTMLCanvasElement {
  const targetSize = 512;
  const crop = cropBox || {
    x: 0,
    y: 0,
    width: originalImg.naturalWidth,
    height: originalImg.naturalHeight,
  };

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = crop.width;
  tempCanvas.height = crop.height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return tempCanvas;

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

  if (displayMode === 'cutout') {
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
  }

  const outCanvas = document.createElement('canvas');
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return outCanvas;

  if (displayMode === 'square') {
    // Keep exact image aspect ratio, zero cropped content, rounded corners + thin 4px transparent margin for iOS subject lift
    const margin = 4;
    const maxDim = targetSize - margin * 2;
    const scale = Math.min(maxDim / crop.width, maxDim / crop.height);
    const cardW = Math.max(1, Math.round(crop.width * scale));
    const cardH = Math.max(1, Math.round(crop.height * scale));
    const radius = Math.max(12, Math.round(Math.min(cardW, cardH) * 0.065));

    outCanvas.width = cardW + margin * 2;
    outCanvas.height = cardH + margin * 2;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(margin, margin, cardW, cardH, radius);
    ctx.clip();
    ctx.drawImage(tempCanvas, margin, margin, cardW, cardH);
    ctx.restore();
  } else if (displayMode === 'full') {
    const scale = Math.min(targetSize / crop.width, targetSize / crop.height);
    outCanvas.width = Math.max(1, Math.round(crop.width * scale));
    outCanvas.height = Math.max(1, Math.round(crop.height * scale));
    ctx.drawImage(tempCanvas, 0, 0, outCanvas.width, outCanvas.height);
  } else {
    outCanvas.width = targetSize;
    outCanvas.height = targetSize;
    const padding = 16;
    const available = targetSize - padding * 2;
    const scale = Math.min(available / crop.width, available / crop.height);
    const drawWidth = crop.width * scale;
    const drawHeight = crop.height * scale;
    const dx = (targetSize - drawWidth) / 2;
    const dy = (targetSize - drawHeight) / 2;
    ctx.drawImage(tempCanvas, dx, dy, drawWidth, drawHeight);
  }

  if (textOverlay && textOverlay.text.trim()) {
    ctx.save();
    const fontSize = Math.max(16, Math.round(textOverlay.size * (Math.max(outCanvas.width, outCanvas.height) / 400)));
    ctx.font = `800 ${fontSize}px "Poppins", "Impact", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(4, Math.round(fontSize * 0.16));
    ctx.strokeStyle = textOverlay.strokeColor || '#000000';
    ctx.fillStyle = textOverlay.color || '#ffffff';

    const tx = outCanvas.width * textOverlay.x;
    const ty = outCanvas.height * textOverlay.y;

    ctx.strokeText(textOverlay.text, tx, ty);
    ctx.fillText(textOverlay.text, tx, ty);
    ctx.restore();
  }

  return outCanvas;
}

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
