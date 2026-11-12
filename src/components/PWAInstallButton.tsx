import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { canPromptInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;
  if (!canPromptInstall && !isIOS) return null;

  const handleClick = async () => {
    if (canPromptInstall) {
      await promptInstall();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 text-purple-200 border border-purple-500/30 transition-colors min-h-[40px] ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs font-semibold'
        }`}
        title="Installer l'application STREAMORA"
        aria-label="Installer l'application STREAMORA"
      >
        <Smartphone className="w-4 h-4 text-purple-400 shrink-0" />
        <span className={compact ? 'hidden lg:inline' : ''}>Installer l'app</span>
      </button>

      {showIOSGuide && (
        <div
          onClick={() => setShowIOSGuide(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#12101e] border border-purple-500/40 rounded-2xl p-6 space-y-4 shadow-2xl text-zinc-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white font-heading">
                Installer STREAMORA sur iPhone / iPad
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Sur iOS Safari, ajoutez STREAMORA à votre écran d’accueil pour profiter de l’expérience plein écran et recevoir les notifications push :
            </p>
            <ol className="space-y-3 text-xs text-zinc-200 bg-[#0b0914] p-4 rounded-xl border border-white/5">
              <li className="flex items-center gap-3">
                <Share className="w-4 h-4 text-purple-400 shrink-0" />
                <span>1. Appuyez sur le bouton <strong>Partager</strong> dans la barre Safari.</span>
              </li>
              <li className="flex items-center gap-3">
                <PlusSquare className="w-4 h-4 text-purple-400 shrink-0" />
                <span>2. Sélectionnez <strong>« Sur l’écran d’accueil »</strong> puis confirmez.</span>
              </li>
              <li className="flex items-center gap-3">
                <Download className="w-4 h-4 text-purple-400 shrink-0" />
                <span>3. Ouvrez STREAMORA depuis votre écran d’accueil.</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
};
