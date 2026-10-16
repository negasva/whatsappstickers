import React, { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';

interface LoadingSkeletonProps {
  onCancel: () => void;
  statusText?: string;
  isComplete?: boolean;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  onCancel,
  statusText = 'Recortando imagen...',
  isComplete = false,
}) => {
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    if (isComplete) {
      setProgress(100);
      return;
    }

    // Fast progress to 90%, then creeps slowly
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev < 40) {
          return prev + Math.floor(Math.random() * 8) + 6; // Fast jump to 40%
        } else if (prev < 75) {
          return prev + Math.floor(Math.random() * 5) + 3; // Steady jump to 75%
        } else if (prev < 90) {
          return prev + Math.floor(Math.random() * 3) + 1; // Smooth approach to 90%
        } else if (prev < 96) {
          return prev + 0.4; // Creep slowly above 90%
        }
        return prev;
      });
    }, 120);

    return () => clearInterval(timer);
  }, [isComplete]);

  const displayPercent = Math.min(100, Math.round(progress));

  return (
    <div className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full h-screen max-h-screen overflow-hidden p-3 select-none">
      {/* Top Header Skeleton */}
      <header className="flex items-center justify-between px-3 py-2.5 border border-slate-800/80 rounded-2xl bg-slate-900/60 backdrop-blur-md">
        <div className="w-24 h-7 rounded-xl bg-slate-800 animate-shimmer" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-7 rounded-xl bg-slate-800 animate-shimmer" />
          <div className="w-8 h-7 rounded-xl bg-slate-800 animate-shimmer" />
          <div className="w-8 h-7 rounded-xl bg-slate-800 animate-shimmer" />
        </div>
      </header>

      {/* Center Canvas Area with Progress Card & Skeleton */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 relative">
        {/* Outer Canvas Frame Skeleton */}
        <div className="w-full h-full max-h-[58vh] rounded-2xl bg-checkerboard border border-slate-800/90 relative flex items-center justify-center overflow-hidden shadow-2xl p-6">
          {/* Shimmering Center Silhouette */}
          <div className="w-48 h-64 rounded-3xl bg-slate-800/40 border border-slate-700/30 animate-shimmer absolute" />

          {/* Progress Card (Foreground) */}
          <div className="relative z-10 w-full max-w-sm bg-slate-950/85 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Aislando sujeto</span>
            </div>

            <h3 className="text-base font-bold text-white mb-1">{statusText}</h3>
            <p className="text-xs text-slate-400 mb-5">Preparando recorte sin bordes blancos</p>

            {/* Percentage Display */}
            <div className="text-3xl font-black text-white font-mono tracking-tight mb-3">
              {displayPercent}
              <span className="text-emerald-400 text-xl font-sans font-bold ml-0.5">%</span>
            </div>

            {/* Progress Bar (0 -> 90% trick) */}
            <div className="w-full bg-slate-800/90 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/60 mb-5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-[#25D366] rounded-full transition-all duration-300 ease-out relative"
                style={{ width: `${displayPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>

            {/* Cancel Button */}
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 transition cursor-pointer active:scale-95"
            >
              <X className="w-3.5 h-3.5 text-rose-400" />
              <span>Cancelar y recortar a mano</span>
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Toolbar Skeleton */}
      <footer className="flex flex-col gap-2.5">
        <div className="h-10 rounded-2xl bg-slate-900/60 border border-slate-800 animate-shimmer" />
        <div className="h-12 rounded-2xl bg-slate-900/60 border border-slate-800 animate-shimmer" />
        <div className="h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 animate-shimmer" />
      </footer>
    </div>
  );
};
