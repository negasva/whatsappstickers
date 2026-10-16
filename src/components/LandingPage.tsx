import React, { useRef } from 'react';
import { ImagePlus, Sparkles, ShieldCheck, Zap } from 'lucide-react';

interface LandingPageProps {
  onImageSelected: (file: File) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onImageSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelected(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelected(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-xl mx-auto w-full text-center select-none"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6 animate-pulse">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Recorte Inteligente Instantáneo</span>
      </div>

      {/* Main Title */}
      <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
        Stickers directos a <span className="text-emerald-400">WhatsApp</span>
      </h1>
      <p className="text-slate-400 text-sm sm:text-base mb-8 max-w-md">
        Sube una foto, se recorta automáticamente sin bordes blancos y con un toque la copias directo al chat.
      </p>

      {/* Primary Action Button (Huge, Friendly, Touch-Target) */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="group relative w-full sm:w-auto min-w-[280px] px-8 py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-lg shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer"
        aria-label="Agregar imagen desde tu dispositivo"
      >
        <ImagePlus className="w-6 h-6 stroke-[2.5] text-slate-950 group-hover:rotate-6 transition-transform" />
        <span className="tracking-wide">Agregar imagen</span>
      </button>

      {/* Drag & Drop Hint */}
      <p className="text-xs text-slate-500 mt-4 hidden sm:block">
        o arrastra y suelta tu foto aquí (o presiona Ctrl + V)
      </p>

      {/* Features Bar */}
      <div className="grid grid-cols-2 gap-3 mt-12 w-full pt-8 border-t border-slate-800/80">
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <h4 className="text-xs font-semibold text-white">100% Privado</h4>
            <p className="text-[11px] text-slate-400">La foto nunca sale de tu móvil/PC</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
          <Zap className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h4 className="text-xs font-semibold text-white">Sin Registro</h4>
            <p className="text-[11px] text-slate-400">Copia y pega en WhatsApp al instante</p>
          </div>
        </div>
      </div>
    </div>
  );
};
