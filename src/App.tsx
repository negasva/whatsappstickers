import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  RotateCcw,
  Info,
} from 'lucide-react';
import { LandingPage } from './components/LandingPage';
import { EditorCanvas, type ToolType } from './components/EditorCanvas';
import { Toolbar } from './components/Toolbar';
import { LoadingModal } from './components/LoadingModal';
import {
  optimizeImageForSticker,
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
  const [loadingStep, setLoadingStep] = useState('Recortando foto...');
  const [isAiComplete, setIsAiComplete] = useState(false);

  // Full image vs Cutout toggle
  const [isFullImage, setIsFullImage] = useState(false);

  // Cancellation ref
  const isCancelledRef = useRef(false);

  // Edit states
  const [tool, setTool] = useState<ToolType>('preview');
  const [brushSize, setBrushSize] = useState(38);
  const [showGhost, setShowGhost] = useState(false);
  const [textOverlay, setTextOverlay] = useState<TextOverlay | null>(null);
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // History for Undo / Redo
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Initial cutout backup
  const initialMaskDataRef = useRef<ImageData | null>(null);

  // Copy feedback & toast
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const pushHistory = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(imgData);

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

  const handleResetToAI = () => {
    if (initialMaskDataRef.current && maskCanvas) {
      const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.putImageData(initialMaskDataRef.current, 0, 0);
        pushHistory(maskCanvas);
        showToast('Restablecido al recorte inicial');
      }
    }
  };

  // Image selection pipeline
  const handleImageSelected = async (file: File) => {
    isCancelledRef.current = false;
    setIsLoading(true);
    setIsAiComplete(false);
    setIsFullImage(false);
    setLoadingStep('Optimizando foto...');

    try {
      const { optimizedBlob, img, width, height } = await optimizeImageForSticker(file, 800);

      if (isCancelledRef.current) return;
      setOriginalImg(img);

      setLoadingStep('Recortando fondo con IA...');

      const cutoutBlob = await autoRemoveBackground(optimizedBlob);

      if (isCancelledRef.current) return;

      const cutoutImg = await blobToImage(cutoutBlob);
      const mask = createMaskFromCutout(cutoutImg, width, height);
      setMaskCanvas(mask);

      const maskCtx = mask.getContext('2d', { willReadFrequently: true });
      if (maskCtx) {
        initialMaskDataRef.current = maskCtx.getImageData(0, 0, mask.width, mask.height);
      }

      const initialBox = getMaskBoundingBox(mask);
      setCropBox(initialBox);

      historyRef.current = [];
      historyIndexRef.current = -1;
      pushHistory(mask);

      setIsAiComplete(true);
      setTool('preview');
      setShowGhost(false);
      setTextOverlay(null);

      setTimeout(() => {
        if (!isCancelledRef.current) {
          setIsLoading(false);
        }
      }, 350);
    } catch (err) {
      if (isCancelledRef.current) return;
      console.error('Error in AI cutout:', err);
      showToast('No se pudo recortar automático. Abriendo para edición manual.');
      handleFallbackManual(file);
    }
  };

  const handleFallbackManual = async (file: File | Blob) => {
    try {
      const { img, width, height } = await optimizeImageForSticker(file, 800);
      setOriginalImg(img);

      const mask = document.createElement('canvas');
      mask.width = width;
      mask.height = height;
      const maskCtx = mask.getContext('2d', { willReadFrequently: true });
      if (maskCtx) {
        maskCtx.fillStyle = 'white';
        maskCtx.fillRect(0, 0, width, height);
      }
      setMaskCanvas(mask);
      setCropBox({ x: 0, y: 0, width, height });

      historyRef.current = [];
      historyIndexRef.current = -1;
      pushHistory(mask);

      setTool('eraser');
      setShowGhost(true);
      setIsLoading(false);
    } catch (e) {
      console.error('Fallback failed:', e);
      setIsLoading(false);
    }
  };

  const handleCancelLoading = () => {
    isCancelledRef.current = true;
    setIsLoading(false);
    if (originalImg) {
      const mask = document.createElement('canvas');
      mask.width = originalImg.naturalWidth;
      mask.height = originalImg.naturalHeight;
      const maskCtx = mask.getContext('2d', { willReadFrequently: true });
      if (maskCtx) {
        maskCtx.fillStyle = 'white';
        maskCtx.fillRect(0, 0, mask.width, mask.height);
      }
      setMaskCanvas(mask);
      setCropBox({ x: 0, y: 0, width: originalImg.naturalWidth, height: originalImg.naturalHeight });
      historyRef.current = [];
      historyIndexRef.current = -1;
      pushHistory(mask);
      setTool('eraser');
      setShowGhost(true);
      showToast('Cancelado. Ahora puedes recortar con el borrador.');
    } else {
      setOriginalImg(null);
      setMaskCanvas(null);
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

  // Copy sticker (respects isFullImage state)
  const handleCopySticker = async () => {
    if (!originalImg || !maskCanvas) return;

    try {
      const outCanvas = exportStickerCanvas(
        originalImg,
        maskCanvas,
        textOverlay,
        cropBox,
        isFullImage
      );
      const success = await copyCanvasToClipboard(outCanvas);

      if (success) {
        setCopied(true);
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.85 },
        });
        showToast(
          isFullImage
            ? '¡Foto completa copiada! Pégala en WhatsApp.'
            : '¡Sticker recortado copiado! Pégalo en WhatsApp.'
        );
        setTimeout(() => setCopied(false), 3000);
      } else {
        handleDownloadPNG(outCanvas);
        showToast('Descargando imagen para WhatsApp.');
      }
    } catch (err) {
      console.error('Error copying sticker:', err);
      showToast('Error al copiar. Usa el botón de compartir.');
    }
  };

  const handleDownloadPNG = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `${isFullImage ? 'foto' : 'sticker'}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleShareSticker = async () => {
    if (!originalImg || !maskCanvas) return;

    const outCanvas = exportStickerCanvas(
      originalImg,
      maskCanvas,
      textOverlay,
      cropBox,
      isFullImage
    );

    outCanvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], `${isFullImage ? 'foto' : 'sticker'}.png`, {
        type: 'image/png',
      });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: isFullImage ? 'Foto para WhatsApp' : 'Sticker para WhatsApp',
          });
        } catch {
          // Dismissed
        }
      } else {
        handleDownloadPNG(outCanvas);
        showToast('Descargando imagen transparente (512x512)...');
      }
    }, 'image/png');
  };

  const handleBackToLanding = () => {
    setOriginalImg(null);
    setMaskCanvas(null);
    setTool('preview');
    setIsFullImage(false);
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

      {/* Loading Modal with 90% progress bar and cancel button */}
      {isLoading && (
        <LoadingModal
          onCancel={handleCancelLoading}
          statusText={loadingStep}
          isComplete={isAiComplete}
        />
      )}

      {/* Main Content Router */}
      {!originalImg || !maskCanvas ? (
        <LandingPage onImageSelected={handleImageSelected} />
      ) : (
        <div className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full h-screen max-h-screen overflow-hidden">
          {/* Top Bar */}
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
                disabled={!canUndo || isFullImage}
                title="Deshacer"
                className={`p-2 rounded-lg transition cursor-pointer ${
                  canUndo && !isFullImage
                    ? 'text-slate-200 hover:bg-slate-800'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo || isFullImage}
                title="Rehacer"
                className={`p-2 rounded-lg transition cursor-pointer ${
                  canRedo && !isFullImage
                    ? 'text-slate-200 hover:bg-slate-800'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetToAI}
                disabled={isFullImage}
                title="Restablecer al recorte inicial"
                className={`p-2 rounded-lg transition cursor-pointer ${
                  !isFullImage
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Interactive Canvas Editor */}
          <main className="flex-1 flex items-center justify-center overflow-hidden">
            <EditorCanvas
              originalImg={originalImg}
              maskCanvas={maskCanvas}
              tool={tool}
              brushSize={brushSize}
              showGhost={showGhost}
              cropBox={cropBox}
              textOverlay={textOverlay}
              isFullImage={isFullImage}
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
              onDownloadSticker={() => {
                if (!originalImg || !maskCanvas) return;
                const outCanvas = exportStickerCanvas(
                  originalImg,
                  maskCanvas,
                  textOverlay,
                  cropBox,
                  isFullImage
                );
                handleDownloadPNG(outCanvas);
                showToast('¡Guardado! Ve a Fotos para agregarlo a WhatsApp sin borde.');
              }}
              copied={copied}
              isProcessing={isLoading}
              isFullImage={isFullImage}
              onToggleFullImage={() => {
                const nextState = !isFullImage;
                setIsFullImage(nextState);
                showToast(
                  nextState
                    ? 'Modo foto completa (sin recorte)'
                    : 'Modo sticker recortado'
                );
              }}
            />
          </footer>
        </div>
      )}
    </div>
  );
};

export default App;
