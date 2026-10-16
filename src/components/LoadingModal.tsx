import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

interface LoadingModalProps {
  onCancel: () => void;
  statusText?: string;
  isComplete?: boolean;
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  onCancel,
  statusText = 'Recortando imagen...',
  isComplete = false,
}) => {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    if (isComplete) {
      setProgress(100);
      return;
    }

    // Fast climb to ~90%, then creeps slowly
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev < 45) {
          return prev + Math.floor(Math.random() * 8) + 6; // Quick jump to 45%
        } else if (prev < 78) {
          return prev + Math.floor(Math.random() * 5) + 3; // Steady jump to 78%
        } else if (prev < 90) {
          return prev + Math.floor(Math.random() * 3) + 1; // Smooth approach to 90%
        } else if (prev < 96) {
          return prev + 0.35; // Slow creep above 90%
        }
        return prev;
      });
    }, 120);

    return () => clearInterval(timer);
  }, [isComplete]);

  const displayPercent = Math.min(100, Math.round(progress));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Sparkle icon badge */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-5 shadow-lg shadow-emerald-500/10">
          <Sparkles className="w-7 h-7 animate-pulse" />
        </div>

        <h3 className="text-xl font-bold text-white mb-1.5">{statusText}</h3>
        <p className="text-xs text-slate-400 mb-6">Aislando sujeto sin bordes blancos</p>

        {/* Big percentage */}
        <div className="text-4xl font-extrabold text-white font-mono tracking-tight mb-3">
          {displayPercent}
          <span className="text-emerald-400 text-2xl font-sans font-bold ml-0.5">%</span>
        </div>

        {/* Progress Bar (0 to 90% trick) */}
        <div className="w-full bg-slate-800/90 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/60 mb-6 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-[#25D366] rounded-full transition-all duration-200 ease-out relative"
            style={{ width: `${displayPercent}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/70 transition cursor-pointer active:scale-95 mb-4"
        >
          <X className="w-3.5 h-3.5 text-rose-400" />
          <span>Cancelar y editar a mano</span>
        </button>

        <span className="text-[11px] text-emerald-400/80 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          100% privado en tu navegador
        </span>
      </div>
    </div>
  );
};
