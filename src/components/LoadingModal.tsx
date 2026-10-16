import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

interface LoadingModalProps {
  onCancel: () => void;
  statusText?: string;
  isComplete?: boolean;
}

// 40 distinct phrases, each maximum 4 words
const WAITING_PHRASES = [
  'Ya casi tenemos foto',
  'Terminando últimos detalles',
  'Espera un momento',
  'Puliendo los bordes',
  'Afinando el recorte',
  'Un segundo más',
  'Ya casi terminamos',
  'Haciendo magia visual',
  'Limpiando cada borde',
  'Quedando perfecto',
  'Último toque mágico',
  'Preparando tu sticker',
  'Rematando detalles finales',
  'Solo un instante',
  'Ajustando transparencia limpia',
  'Suavizando la silueta',
  'A punto terminar',
  'Perfeccionando cada pixel',
  'Sticker casi listo',
  'Dando forma final',
  'Ya casi listo',
  'Afinando los pixeles',
  'Un instante más',
  'Falta muy poco',
  'Preparando el lienzo',
  'Casi en manos',
  'Revisando el resultado',
  'Dejándolo impecable',
  'Silueta casi perfecta',
  'Acomodando los detalles',
  'Optimizando la calidad',
  'Guardando el sticker',
  'Empaquetando tu foto',
  'Paciencia, vale pena',
  'Última pasada rápida',
  'Recorte casi completo',
  'Alineando el sujeto',
  'Afinando trazos finales',
  'Listo en segundos',
  'Ya mero queda',
];

export const LoadingModal: React.FC<LoadingModalProps> = ({
  onCancel,
  statusText = 'Recortando imagen...',
  isComplete = false,
}) => {
  const [progress, setProgress] = useState(15);
  const [phraseIndex, setPhraseIndex] = useState(0);

  // Fast progress up to 99%
  useEffect(() => {
    if (isComplete) {
      setProgress(100);
      return;
    }

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev < 50) {
          return prev + Math.floor(Math.random() * 12) + 8; // Fast leap to 50%
        } else if (prev < 80) {
          return prev + Math.floor(Math.random() * 8) + 5; // Rapid jump to 80%
        } else if (prev < 95) {
          return prev + Math.floor(Math.random() * 5) + 3; // Fast approach to 95%
        } else if (prev < 99) {
          return prev + 1; // Quickly reach 99%
        }
        return 99; // Hold at 99% while final details process
      });
    }, 90);

    return () => clearInterval(timer);
  }, [isComplete]);

  // Rotate through the 40 short phrases when stuck at 99%
  useEffect(() => {
    if (progress >= 99 && !isComplete) {
      const phraseTimer = setInterval(() => {
        setPhraseIndex((prev) => (prev + 1) % WAITING_PHRASES.length);
      }, 1600);
      return () => clearInterval(phraseTimer);
    }
  }, [progress, isComplete]);

  const displayPercent = isComplete ? 100 : Math.min(99, Math.round(progress));
  const activeTitle =
    displayPercent >= 99 && !isComplete
      ? WAITING_PHRASES[phraseIndex]
      : statusText;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Sparkle icon badge */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-5 shadow-lg shadow-emerald-500/10">
          <Sparkles className="w-7 h-7 animate-pulse" />
        </div>

        {/* Dynamic Title (Cycles 40 phrases at 99%) */}
        <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5 transition-all duration-300 min-h-[1.75rem] flex items-center justify-center">
          {activeTitle}
        </h3>
        <p className="text-xs text-slate-400 mb-6">Aislando sujeto sin bordes blancos</p>

        {/* Big percentage + 3 pulsing dots after 70% */}
        <div className="flex items-center justify-center gap-1.5 text-4xl font-extrabold text-white font-mono tracking-tight mb-3">
          <span>{displayPercent}</span>
          <span className="text-emerald-400 text-2xl font-sans font-bold">%</span>

          {/* 3 Animated Dots when > 70% */}
          {displayPercent >= 70 && !isComplete && (
            <span className="inline-flex items-center gap-1 ml-1.5 self-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
            </span>
          )}
        </div>

        {/* Progress Bar (0 to 99% fast) */}
        <div className="w-full bg-slate-800/90 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/60 mb-6 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-[#25D366] rounded-full transition-all duration-150 ease-out relative"
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
