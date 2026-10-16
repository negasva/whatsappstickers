import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { TextOverlay } from '../utils/imageProcessing';

export type ToolType = 'brush' | 'eraser' | 'crop' | 'text' | 'preview';

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EditorCanvasProps {
  originalImg: HTMLImageElement;
  maskCanvas: HTMLCanvasElement;
  tool: ToolType;
  brushSize: number;
  showGhost: boolean;
  cropBox: CropBox;
  textOverlay: TextOverlay | null;
  onMaskModified: () => void;
  onCropChange: (box: CropBox) => void;
  onTextPositionChange: (x: number, y: number) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  originalImg,
  maskCanvas,
  tool,
  brushSize,
  showGhost,
  cropBox,
  textOverlay,
  onMaskModified,
  onCropChange,
  onTextPositionChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Cursor position for brush outline preview
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  // State for dragging text or crop handles
  const isDraggingTextRef = useRef(false);
  const isDraggingCropRef = useRef<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; crop: CropBox }>({
    x: 0,
    y: 0,
    crop: { ...cropBox },
  });

  // Internal composite buffer canvas
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!compositeCanvasRef.current) {
    compositeCanvasRef.current = document.createElement('canvas');
  }

  // Convert client pointer event (mouse/touch) to image coordinates
  const getImageCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = originalImg.naturalWidth / rect.width;
      const scaleY = originalImg.naturalHeight / rect.height;
      return {
        x: Math.max(0, Math.min(originalImg.naturalWidth, (clientX - rect.x) * scaleX)),
        y: Math.max(0, Math.min(originalImg.naturalHeight, (clientY - rect.y) * scaleY)),
      };
    },
    [originalImg]
  );

  // Main Render Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = originalImg.naturalWidth;
    const height = originalImg.naturalHeight;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    // 1. Ghost Background (Original Image at ~30% opacity)
    // Active if tool is brush or eraser, or if explicitly enabled
    const isGhostMode = showGhost || tool === 'brush' || tool === 'eraser';
    if (isGhostMode) {
      ctx.save();
      ctx.globalAlpha = 0.30; // 30% ghost opacity
      ctx.drawImage(originalImg, 0, 0, width, height);
      ctx.restore();
    }

    // 2. Cutout Image at 100% opacity
    // Composite original image with current mask
    const compCanvas = compositeCanvasRef.current;
    if (compCanvas) {
      if (compCanvas.width !== width || compCanvas.height !== height) {
        compCanvas.width = width;
        compCanvas.height = height;
      }
      const compCtx = compCanvas.getContext('2d');
      if (compCtx) {
        compCtx.clearRect(0, 0, width, height);
        compCtx.globalCompositeOperation = 'source-over';
        compCtx.drawImage(originalImg, 0, 0, width, height);
        compCtx.globalCompositeOperation = 'destination-in';
        compCtx.drawImage(maskCanvas, 0, 0, width, height);

        // Draw cutout onto main canvas
        ctx.save();
        ctx.globalAlpha = 1.0; // 100% opacity for cutout
        ctx.drawImage(compCanvas, 0, 0, width, height);
        ctx.restore();
      }
    }

    // 3. Render Text Overlay if available
    if (textOverlay && textOverlay.text.trim()) {
      ctx.save();
      const fontSize = Math.max(18, Math.round(textOverlay.size * (Math.max(width, height) / 400)));
      ctx.font = `900 ${fontSize}px "Impact", "Arial Black", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.16));
      ctx.strokeStyle = textOverlay.strokeColor || '#000000';
      ctx.fillStyle = textOverlay.color || '#ffffff';

      const tx = width * textOverlay.x;
      const ty = height * textOverlay.y;

      ctx.strokeText(textOverlay.text, tx, ty);
      ctx.fillText(textOverlay.text, tx, ty);
      ctx.restore();
    }

    // 4. Render Crop Overlay if in crop mode
    if (tool === 'crop') {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';

      // Outer darkened area
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.rect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
      ctx.fill('evenodd');

      // Crop border
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = Math.max(2, Math.round(width / 300));
      ctx.strokeRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);

      // Crop corner handles
      const handleSize = Math.max(12, Math.round(width / 50));
      ctx.fillStyle = '#10b981';
      // Corners
      ctx.fillRect(cropBox.x - handleSize / 2, cropBox.y - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(
        cropBox.x + cropBox.width - handleSize / 2,
        cropBox.y - handleSize / 2,
        handleSize,
        handleSize
      );
      ctx.fillRect(
        cropBox.x - handleSize / 2,
        cropBox.y + cropBox.height - handleSize / 2,
        handleSize,
        handleSize
      );
      ctx.fillRect(
        cropBox.x + cropBox.width - handleSize / 2,
        cropBox.y + cropBox.height - handleSize / 2,
        handleSize,
        handleSize
      );

      ctx.restore();
    }
  }, [originalImg, maskCanvas, tool, showGhost, cropBox, textOverlay]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Pointer event handlers for drawing (Brush / Eraser)
  const drawStroke = (x: number, y: number) => {
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!maskCtx) return;

    maskCtx.save();
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';
    maskCtx.lineWidth = brushSize;

    if (tool === 'brush') {
      // Paint white to restore pixels
      maskCtx.globalCompositeOperation = 'source-over';
      maskCtx.strokeStyle = 'white';
      maskCtx.fillStyle = 'white';
    } else if (tool === 'eraser') {
      // Erase alpha from mask
      maskCtx.globalCompositeOperation = 'destination-out';
      maskCtx.strokeStyle = 'rgba(0,0,0,1)';
      maskCtx.fillStyle = 'rgba(0,0,0,1)';
    }

    maskCtx.beginPath();
    if (lastPointRef.current) {
      maskCtx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      maskCtx.lineTo(x, y);
      maskCtx.stroke();
    } else {
      maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      maskCtx.fill();
    }
    maskCtx.restore();

    lastPointRef.current = { x, y };
    renderCanvas();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const coords = getImageCoordinates(e.clientX, e.clientY);

    if (tool === 'brush' || tool === 'eraser') {
      isDrawingRef.current = true;
      lastPointRef.current = null;
      drawStroke(coords.x, coords.y);
    } else if (tool === 'text' && textOverlay) {
      isDraggingTextRef.current = true;
      onTextPositionChange(
        coords.x / originalImg.naturalWidth,
        coords.y / originalImg.naturalHeight
      );
    } else if (tool === 'crop') {
      isDraggingCropRef.current = 'move';
      dragStartRef.current = {
        x: coords.x,
        y: coords.y,
        crop: { ...cropBox },
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = getImageCoordinates(e.clientX, e.clientY);

    // Track cursor on canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      setCursorPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        visible: tool === 'brush' || tool === 'eraser',
      });
    }

    if (isDrawingRef.current && (tool === 'brush' || tool === 'eraser')) {
      drawStroke(coords.x, coords.y);
    } else if (isDraggingTextRef.current && tool === 'text') {
      onTextPositionChange(
        coords.x / originalImg.naturalWidth,
        coords.y / originalImg.naturalHeight
      );
    } else if (isDraggingCropRef.current && tool === 'crop') {
      const dx = coords.x - dragStartRef.current.x;
      const dy = coords.y - dragStartRef.current.y;
      const initial = dragStartRef.current.crop;

      const newX = Math.max(0, Math.min(originalImg.naturalWidth - initial.width, initial.x + dx));
      const newY = Math.max(0, Math.min(originalImg.naturalHeight - initial.height, initial.y + dy));

      onCropChange({
        ...initial,
        x: newX,
        y: newY,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if capture was lost
    }

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      onMaskModified();
    }
    isDraggingTextRef.current = false;
    isDraggingCropRef.current = null;
  };

  const handlePointerLeave = () => {
    setCursorPos((prev) => ({ ...prev, visible: false }));
  };

  // Calculate brush radius in display pixels for cursor indicator
  const canvas = canvasRef.current;
  const displayScale = canvas
    ? canvas.getBoundingClientRect().width / originalImg.naturalWidth
    : 1;
  const displayBrushRadius = Math.max(3, (brushSize * displayScale) / 2);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full max-h-[62vh] overflow-hidden select-none touch-none p-2"
    >
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 bg-checkerboard flex items-center justify-center max-w-full max-h-full">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className={`block max-h-[58vh] max-w-full object-contain ${
            tool === 'brush' || tool === 'eraser' ? 'cursor-none' : 'cursor-crosshair'
          }`}
        />

        {/* Dynamic Brush Circle Cursor Indicator */}
        {cursorPos.visible && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.8)]"
            style={{
              left: `${cursorPos.x}px`,
              top: `${cursorPos.y}px`,
              width: `${displayBrushRadius * 2}px`,
              height: `${displayBrushRadius * 2}px`,
              backgroundColor:
                tool === 'brush' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
            }}
          />
        )}
      </div>
    </div>
  );
};
