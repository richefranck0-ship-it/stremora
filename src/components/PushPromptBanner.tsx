import React, { useState, useEffect } from 'react';
import { Bell, X, Volume2, VolumeX, Share, PlusSquare } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

const PUSH_DISMISSED_KEY = 'streamora_push_prompt_dismissed';

export const PushPromptBanner: React.FC = () => {
  const {
    supported,
    serverEnabled,
    isSubscribed,
    permission,
    isBusy,
    errorMsg,
    soundEnabled,
    needsIOSInstall,
    subscribe,
    toggleSound,
  } = usePushNotifications();

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!serverEnabled || isSubscribed || permission === 'denied') return;
    try {
      if (localStorage.getItem(PUSH_DISMISSED_KEY) === '1') return;
    } catch {
      // ignore
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [serverEnabled, isSubscribed, permission]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(PUSH_DISMISSED_KEY, '1');
    } catch {
      // ignore
    }
  };

  if (!visible || isSubscribed || !serverEnabled) return null;

  return (
    <aside
      aria-label="Notifications STREAMORA"
      className="fixed bottom-20 md:bottom-5 right-3 left-3 sm:left-auto sm:w-[390px] z-40 bg-[#141124]/95 backdrop-blur-lg border border-purple-500/40 rounded-2xl p-4 shadow-2xl shadow-purple-950/60"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-bold text-white font-heading">
              Alertes Nouveaux Films &amp; Épisodes
            </h4>
            <button
              onClick={dismiss}
              className="p-1.5 -mt-1 -mr-1 text-zinc-400 hover:text-white rounded-lg"
              aria-label="Fermer la proposition de notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {needsIOSInstall ? (
            <div className="mt-1.5 space-y-2 text-xs text-zinc-300">
              <p>
                Sur iPhone/iPad, ajoutez STREAMORA sur votre écran d’accueil pour activer les notifications push :
              </p>
              <div className="flex items-center gap-2 text-[11px] text-purple-300 bg-black/40 p-2 rounded-lg">
                <Share className="w-3.5 h-3.5 shrink-0" />
                <span>Partager</span>
                <span>→</span>
                <PlusSquare className="w-3.5 h-3.5 shrink-0" />
                <span>Sur l’écran d’accueil</span>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                Recevez une alerte dès la sortie d’un film populaire ou d’un nouvel épisode de vos séries préférées.
              </p>

              {errorMsg && (
                <p className="text-[11px] text-amber-300 mt-1.5">{errorMsg}</p>
              )}

              <div className="flex items-center justify-between gap-2 mt-3">
                <button
                  onClick={toggleSound}
                  className="px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[11px] flex items-center gap-1.5 min-h-[38px]"
                  title={soundEnabled ? 'Son activé' : 'Son coupé'}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-purple-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>{soundEnabled ? 'Avec son' : 'Silencieux'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={dismiss}
                    className="px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-white min-h-[38px]"
                  >
                    Plus tard
                  </button>
                  <button
                    disabled={isBusy || !supported}
                    onClick={async () => {
                      const ok = await subscribe();
                      if (ok) setVisible(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 min-h-[38px]"
                  >
                    {isBusy ? 'Activation...' : 'Activer'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
