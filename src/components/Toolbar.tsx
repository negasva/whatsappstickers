import React from 'react';
import {
  Paintbrush,
  Eraser,
  Crop,
  Type,
  Eye,
  EyeOff,
  Copy,
  Share2,
  Check,
  RotateCcw,
  Sparkles,
  Scissors,
  Maximize2,
} from 'lucide-react';
import type { ToolType } from './EditorCanvas';
import type { TextOverlay } from '../utils/imageProcessing';

interface ToolbarProps {
  tool: ToolType;
  onToolSelect: (tool: ToolType) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  showGhost: boolean;
  onToggleGhost: () => void;
  textOverlay: TextOverlay | null;
  onTextChange: (overlay: TextOverlay | null) => void;
  onAutoFitCrop: () => void;
  onResetCrop: () => void;
  onCopySticker: () => void;
  onShareSticker: () => void;
  copied: boolean;
  isProcessing: boolean;
  isFullImage: boolean;
  onToggleFullImage: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  onToolSelect,
  brushSize,
  onBrushSizeChange,
  showGhost,
  onToggleGhost,
  textOverlay,
  onTextChange,
  onAutoFitCrop,
  onResetCrop,
  onCopySticker,
  onShareSticker,
  copied,
  isProcessing,
  isFullImage,
  onToggleFullImage,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-2 px-3 pb-3 select-none">
      {/* 1. Toggle: Recortada vs Foto Completa */}
      <div className="flex items-center p-1 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-sm">
        <button
          onClick={() => {
            if (isFullImage) onToggleFullImage();
          }}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            !isFullImage
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Versión recortada</span>
        </button>

        <button
          onClick={() => {
            if (!isFullImage) onToggleFullImage();
          }}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            isFullImage
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Foto completa</span>
        </button>
      </div>

      {/* 2. Contextual Controls (sliders / text inputs depending on active tool) */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-2.5 shadow-lg">
        {/* If in full image mode and not using text/crop */}
        {isFullImage && tool !== 'text' && tool !== 'crop' && (
          <div className="flex items-center justify-between text-xs text-slate-300 px-2 py-0.5">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Maximize2 className="w-3.5 h-3.5" />
              Foto completa activa (sin recortes)
            </span>
            <span className="text-[11px] text-slate-400">Lista para copiar</span>
          </div>
        )}

        {/* Brush & Eraser Size Slider (only relevant in cutout mode) */}
        {!isFullImage && (tool === 'brush' || tool === 'eraser') && (
          <div className="flex items-center gap-3 px-1">
            <span className="text-xs font-semibold text-slate-300 shrink-0">
              {tool === 'brush' ? '🖌️ Pincel' : '🧹 Borrador'}:
            </span>
            <input
              type="range"
              min="6"
              max="120"
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="flex-1 accent-emerald-400 h-2 bg-slate-700 rounded-lg cursor-pointer"
            />
            <div className="w-8 text-right font-mono text-xs text-slate-400">{brushSize}px</div>
          </div>
        )}

        {/* Text Tool Options */}
        {tool === 'text' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Escribe tu texto..."
                value={textOverlay?.text || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val.trim() && !textOverlay) return;
                  onTextChange({
                    text: val,
                    size: textOverlay?.size || 34,
                    color: textOverlay?.color || '#ffffff',
                    strokeColor: textOverlay?.strokeColor || '#000000',
                    x: textOverlay?.x || 0.5,
                    y: textOverlay?.y || 0.85,
                  });
                }}
                className="flex-1 bg-slate-800 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
              />
              {textOverlay && textOverlay.text && (
                <button
                  onClick={() => onTextChange(null)}
                  className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 bg-rose-500/10 rounded-lg border border-rose-500/20"
                >
                  Quitar
                </button>
              )}
            </div>

            {textOverlay && textOverlay.text && (
              <div className="flex items-center gap-3 px-1">
                <span className="text-[11px] font-medium text-slate-400 shrink-0">Tamaño:</span>
                <input
                  type="range"
                  min="16"
                  max="64"
                  value={textOverlay.size}
                  onChange={(e) =>
                    onTextChange({
                      ...textOverlay,
                      size: Number(e.target.value),
                    })
                  }
                  className="flex-1 accent-emerald-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] font-mono text-slate-400">{textOverlay.size}pt</span>
              </div>
            )}
          </div>
        )}

        {/* Crop Tool Options */}
        {tool === 'crop' && (
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-xs font-semibold text-slate-300">Ajuste de encuadre:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={onAutoFitCrop}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-medium transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ajustar al sujeto
              </button>
              <button
                onClick={onResetCrop}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer
              </button>
            </div>
          </div>
        )}

        {/* Cutout Preview Info */}
        {!isFullImage && tool === 'preview' && (
          <div className="flex items-center justify-between text-xs text-slate-400 px-2 py-0.5">
            <span>✨ Recorte inteligente activo</span>
            <span className="text-[11px] text-emerald-400/80">Listo para copiar</span>
          </div>
        )}
      </div>

      {/* 3. Tool Selection Bar */}
      <div className="flex items-center justify-between gap-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl p-1.5 shadow-md">
        <button
          onClick={() => {
            if (isFullImage) onToggleFullImage(); // Switch to cutout if clicking brush
            onToolSelect(tool === 'brush' ? 'preview' : 'brush');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-medium transition cursor-pointer ${
            tool === 'brush' && !isFullImage
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30'
              : 'text-slate-300 hover:bg-slate-800/80'
          }`}
          title="Agregar partes faltantes con el pincel"
        >
          <Paintbrush className="w-4 h-4 mb-0.5" />
          <span className="text-[11px]">Pincel</span>
        </button>

        <button
          onClick={() => {
            if (isFullImage) onToggleFullImage(); // Switch to cutout if clicking eraser
            onToolSelect(tool === 'eraser' ? 'preview' : 'eraser');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-medium transition cursor-pointer ${
            tool === 'eraser' && !isFullImage
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30'
              : 'text-slate-300 hover:bg-slate-800/80'
          }`}
          title="Borrar partes no deseadas"
        >
          <Eraser className="w-4 h-4 mb-0.5" />
          <span className="text-[11px]">Borrador</span>
        </button>

        <button
          onClick={() => onToolSelect(tool === 'crop' ? 'preview' : 'crop')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-medium transition cursor-pointer ${
            tool === 'crop'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30'
              : 'text-slate-300 hover:bg-slate-800/80'
          }`}
          title="Recortar encuadre"
        >
          <Crop className="w-4 h-4 mb-0.5" />
          <span className="text-[11px]">Crop</span>
        </button>

        <button
          onClick={() => onToolSelect(tool === 'text' ? 'preview' : 'text')}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-medium transition cursor-pointer ${
            tool === 'text'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30'
              : 'text-slate-300 hover:bg-slate-800/80'
          }`}
          title="Agregar texto rápido"
        >
          <Type className="w-4 h-4 mb-0.5" />
          <span className="text-[11px]">Texto</span>
        </button>

        {/* Ghost background guide toggle (only relevant when in cutout mode) */}
        {!isFullImage && (
          <button
            onClick={onToggleGhost}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex flex-col items-center justify-center ${
              showGhost
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:bg-slate-800/80'
            }`}
            title="Alternar fondo guía al 30%"
          >
            {showGhost ? <Eye className="w-4 h-4 mb-0.5" /> : <EyeOff className="w-4 h-4 mb-0.5" />}
            <span className="text-[10px]">Guía</span>
          </button>
        )}
      </div>

      {/* 4. Primary Bottom CTA (COPY TO WHATSAPP) */}
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={onCopySticker}
          disabled={isProcessing}
          className={`flex-1 relative py-4 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer shadow-lg ${
            copied
              ? 'bg-emerald-400 text-slate-950 shadow-emerald-500/40 scale-[1.01]'
              : 'bg-[#25D366] hover:bg-[#22c35e] text-slate-950 shadow-[#25D366]/30 hover:shadow-[#25D366]/50 active:scale-[0.98]'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-5 h-5 stroke-[3]" />
              <span>¡Copiado! Pégalo en WhatsApp</span>
            </>
          ) : (
            <>
              <Copy className="w-5 h-5 stroke-[2.5]" />
              <span>
                {isFullImage ? 'Copiar Foto Completa' : 'Copiar Sticker Recortado'}
              </span>
            </>
          )}
        </button>

        <button
          onClick={onShareSticker}
          disabled={isProcessing}
          title="Compartir o guardar imagen"
          className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition active:scale-95 border border-slate-700/80 flex items-center justify-center cursor-pointer"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
