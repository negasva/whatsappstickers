import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { LandingPage } from './components/LandingPage';
import { EditorCanvas, type ToolType } from './components/EditorCanvas';
import { Toolbar } from './components/Toolbar';
import {
  autoRemoveBackground,
  blobToImage,
  createMaskFromCutout,
  getMaskBoundingBox,
  exportStickerCanvas,
  copyCanvasToClipboard,
  type TextOverlay,
} from './utils/imageProcessing';

export const App: React.FC = () => {
  // Main states
  const [originalImg, setOriginalImg] = useState<HTMLImageElement | null>(null);
  const [maskCanvas, setMaskCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Analizando imagen...');

  // Tools & Edit states
  const [tool, setTool] = useState<ToolType>('preview');
  const [brushSize, setBrushSize] = useState(40);
  const [showGhost, setShowGhost] = useState(false);
  const [textOverlay, setTextOverlay] = useState<TextOverlay | null>(null);
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // History for Undo / Redo
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Initial cutout backup (to restore AI cut)
  const initialMaskDataRef = useRef<ImageData | null>(null);

  // Copy feedback & toast
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Push snapshot to history
  const pushHistory = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Truncate future history
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(imgData);

    // Keep max 15 snapshots
    if (nextHistory.length > 15) {
      nextHistory.shift();
    }

    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const handleUndo = () => {
    if (historyIndexRef.current > 0 && maskCanvas) {
      historyIndexRef.current -= 1;
      const targetData = historyRef.current[historyIndexRef.current];
      const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
      if (ctx && targetData) {
        ctx.putImageData(targetData, 0, 0);
        setMaskCanvas(maskCanvas);
        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1 && maskCanvas) {
      historyIndexRef.current += 1;
      const targetData = historyRef.current[historyIndexRef.current];
      const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
      if (ctx && targetData) {
        ctx.putImageData(targetData, 0, 0);
        setMaskCanvas(maskCanvas);
        setCanUndo(true);
        setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      }
    }
  };

  // Reset to original AI cutout
  const handleResetToAI = () => {
    if (initialMaskDataRef.current && maskCanvas) {
      const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.putImageData(initialMaskDataRef.current, 0, 0);
        pushHistory(maskCanvas);
        showToast('Restablecido al recorte original de la IA');
      }
    }
  };

  // When user selects an image
  const handleImageSelected = async (file: File) => {
    try {
      setIsLoading(true);
      setLoadingStep('Cargando imagen original...');

      // 1. Load original image
      const img = await blobToImage(file);
      setOriginalImg(img);

      setLoadingStep('Eliminando fondo con IA en tu dispositivo...');

      // 2. Run background removal AI
      const cutoutBlob = await autoRemoveBackground(file);
      const cutoutImg = await blobToImage(cutoutBlob);

      // 3. Create Mask Canvas
      const mask = createMaskFromCutout(cutoutImg, img.naturalWidth, img.naturalHeight);
      setMaskCanvas(mask);

      // 4. Save initial AI state
      const maskCtx = mask.getContext('2d', { willReadFrequently: true });
      if (maskCtx) {
        initialMaskDataRef.current = maskCtx.getImageData(0, 0, mask.width, mask.height);
      }

      // 5. Calculate bounding box for crop
      const initialBox = getMaskBoundingBox(mask);
      setCropBox(initialBox);

      // 6. Reset history
      historyRef.current = [];
      historyIndexRef.current = -1;
      pushHistory(mask);

      // Switch to preview mode
      setTool('preview');
      setShowGhost(false);
      setTextOverlay(null);
    } catch (err) {
      console.error('Error processing image:', err);
      showToast('No se pudo procesar la imagen con IA. Se abrió para recorte manual.');

      // Fallback: load full original image with empty/full mask so user can cut manually
      const img = await blobToImage(file);
      setOriginalImg(img);
      const mask = document.createElement('canvas');
      mask.width = img.naturalWidth;
      mask.height = img.naturalHeight;
      const maskCtx = mask.getContext('2d', { willReadFrequently: true });
      if (maskCtx) {
        maskCtx.fillStyle = 'white';
        maskCtx.fillRect(0, 0, mask.width, mask.height);
      }
      setMaskCanvas(mask);
      setCropBox({ x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight });
      historyRef.current = [];
      historyIndexRef.current = -1;
      pushHistory(mask);
      setTool('eraser');
      setShowGhost(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Paste image directly anywhere with Ctrl+V
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageSelected(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Copy sticker to clipboard
  const handleCopySticker = async () => {
    if (!originalImg || !maskCanvas) return;

    try {
      const outCanvas = exportStickerCanvas(originalImg, maskCanvas, textOverlay, cropBox);
      const success = await copyCanvasToClipboard(outCanvas);

      if (success) {
        setCopied(true);
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.85 },
        });
        showToast('¡Copiado al portapapeles! Abre WhatsApp y dale Pegar en cualquier chat.');
        setTimeout(() => setCopied(false), 3000);
      } else {
        // Fallback: download directly if clipboard write is blocked by browser
        handleDownloadPNG(outCanvas);
        showToast('Portapapeles no soportado directamente. Descargando PNG para WhatsApp.');
      }
    } catch (err) {
      console.error('Error copying sticker:', err);
      showToast('Error al copiar. Puedes usar el botón de compartir.');
    }
  };

  // Download PNG helper
  const handleDownloadPNG = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `sticker-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Share or Save sticker
  const handleShareSticker = async () => {
    if (!originalImg || !maskCanvas) return;

    const outCanvas = exportStickerCanvas(originalImg, maskCanvas, textOverlay, cropBox);

    outCanvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], 'sticker.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Sticker para WhatsApp',
          });
        } catch {
          // User dismissed share
        }
      } else {
        handleDownloadPNG(outCanvas);
        showToast('Descargando sticker transparente (512x512)...');
      }
    }, 'image/png');
  };

  // Reset back to landing
  const handleBackToLanding = () => {
    setOriginalImg(null);
    setMaskCanvas(null);
    setTool('preview');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b141a] text-slate-100 font-sans antialiased overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 animate-bounce">
          <Info className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <Sparkles className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Recortando automáticamente...</h3>
          <p className="text-sm text-slate-400 max-w-xs">{loadingStep}</p>
          <span className="text-xs text-emerald-400/80 mt-4 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            100% privado en tu navegador
          </span>
        </div>
      )}

      {/* Main View Router */}
      {!originalImg || !maskCanvas ? (
        <LandingPage onImageSelected={handleImageSelected} />
      ) : (
        <div className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full h-screen max-h-screen overflow-hidden">
          {/* Top Bar / Header */}
          <header className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
            <button
              onClick={handleBackToLanding}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Otra foto</span>
            </button>

            {/* Undo / Redo / Reset */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                title="Deshacer"
                className={`p-2 rounded-lg transition cursor-pointer ${
                  canUndo
                    ? 'text-slate-200 hover:bg-slate-800'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                title="Rehacer"
                className={`p-2 rounded-lg transition cursor-pointer ${
                  canRedo
                    ? 'text-slate-200 hover:bg-slate-800'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetToAI}
                title="Restablecer al recorte inicial de IA"
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Interactive Canvas Editor with Ghost mode */}
          <main className="flex-1 flex items-center justify-center overflow-hidden">
            <EditorCanvas
              originalImg={originalImg}
              maskCanvas={maskCanvas}
              tool={tool}
              brushSize={brushSize}
              showGhost={showGhost}
              cropBox={cropBox}
              textOverlay={textOverlay}
              onMaskModified={() => {
                if (maskCanvas) pushHistory(maskCanvas);
              }}
              onCropChange={setCropBox}
              onTextPositionChange={(x, y) => {
                if (textOverlay) {
                  setTextOverlay({ ...textOverlay, x, y });
                }
              }}
            />
          </main>

          {/* Bottom Toolbar & Copy Button */}
          <footer>
            <Toolbar
              tool={tool}
              onToolSelect={setTool}
              brushSize={brushSize}
              onBrushSizeChange={setBrushSize}
              showGhost={showGhost}
              onToggleGhost={() => setShowGhost((prev) => !prev)}
              textOverlay={textOverlay}
              onTextChange={setTextOverlay}
              onAutoFitCrop={() => {
                if (maskCanvas) {
                  const fit = getMaskBoundingBox(maskCanvas);
                  setCropBox(fit);
                  showToast('Encuadre ajustado al sujeto');
                }
              }}
              onResetCrop={() => {
                if (originalImg) {
                  setCropBox({
                    x: 0,
                    y: 0,
                    width: originalImg.naturalWidth,
                    height: originalImg.naturalHeight,
                  });
                  showToast('Encuadre restablecido');
                }
              }}
              onCopySticker={handleCopySticker}
              onShareSticker={handleShareSticker}
              copied={copied}
              isProcessing={isLoading}
            />
          </footer>
        </div>
      )}
    </div>
  );
};

export default App;
