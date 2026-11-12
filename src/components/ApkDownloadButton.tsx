import React, { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface PublicApkConfig {
  apkUrl: string;
  apkVersion: string;
  apkLabel: string;
  apkEnabled: boolean;
  apkDownloads: number;
}

interface ApkDownloadButtonProps {
  variant?: 'compact' | 'drawer' | 'footer';
  className?: string;
}

export const ApkDownloadButton: React.FC<ApkDownloadButtonProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const [config, setConfig] = useState<PublicApkConfig | null>(null);
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/app-config');
      if (!res.ok) return;
      const data = await res.json();
      setConfig({
        apkUrl: String(data.apkUrl || ''),
        apkVersion: String(data.apkVersion || '1.0'),
        apkLabel: String(data.apkLabel || "Télécharger l'APK"),
        apkEnabled: data.apkEnabled !== false,
        apkDownloads: Number(data.apkDownloads || 0),
      });
    } catch {
      // ignore offline
    }
  };

  useEffect(() => {
    loadConfig();
    const onUpdated = () => loadConfig();
    window.addEventListener('streamora-config-updated', onUpdated);
    return () => window.removeEventListener('streamora-config-updated', onUpdated);
  }, []);

  if (config && !config.apkEnabled) return null;

  const hasUrl = Boolean(config?.apkUrl && config.apkUrl.trim().length > 0);
  const label = config?.apkLabel || "Télécharger l'APK";
  const version = config?.apkVersion || '1.0';

  const handleClick = (e: React.MouseEvent) => {
    if (!hasUrl) {
      e.preventDefault();
      setShowUnavailableModal(true);
      return;
    }
    fetch('/api/app-config/apk-download', { method: 'POST' }).catch(() => {});
  };

  const buttonNode = hasUrl ? (
    <a
      href={config!.apkUrl}
      target="_blank"
      rel="noopener noreferrer"
      download
      onClick={handleClick}
      className={
        variant === 'footer'
          ? `inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition-colors ${className}`
          : variant === 'drawer'
          ? `w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/35 text-emerald-200 text-sm font-semibold min-h-[44px] transition-colors ${className}`
          : `flex items-center gap-1.5 px-2.5 sm:px-3 min-h-[40px] rounded-xl bg-emerald-600/18 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 hover:text-white text-xs font-semibold transition-colors shrink-0 ${className}`
      }
      aria-label={`${label} (Android v${version})`}
      title={`${label} (Android v${version})`}
    >
      <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
      <span className={variant === 'compact' ? 'hidden xl:inline' : ''}>
        {variant === 'compact' ? 'APK' : `${label} (Android)`}
      </span>
      {variant !== 'compact' && (
        <span className="text-[10px] font-mono bg-emerald-500/25 px-1.5 py-0.5 rounded text-emerald-200">
          v{version}
        </span>
      )}
    </a>
  ) : (
    <button
      type="button"
      onClick={handleClick}
      className={
        variant === 'footer'
          ? `inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 text-xs font-bold transition-colors ${className}`
          : variant === 'drawer'
          ? `w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/35 text-emerald-200 text-sm font-semibold min-h-[44px] transition-colors ${className}`
          : `flex items-center gap-1.5 px-2.5 sm:px-3 min-h-[40px] rounded-xl bg-emerald-600/18 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 hover:text-white text-xs font-semibold transition-colors shrink-0 ${className}`
      }
      aria-label={label}
      title={label}
    >
      <Download className="w-4 h-4 text-emerald-400 shrink-0" />
      <span className={variant === 'compact' ? 'hidden xl:inline' : ''}>
        {variant === 'compact' ? 'APK' : `${label} (Android)`}
      </span>
    </button>
  );

  return (
    <>
      {buttonNode}

      {showUnavailableModal && (
        <div
          onClick={() => setShowUnavailableModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#12101e] border border-emerald-500/35 rounded-2xl p-6 space-y-4 shadow-2xl text-zinc-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <Smartphone className="w-5 h-5" />
                <span>Application Android STREAMORA (.apk)</span>
              </div>
              <button
                onClick={() => setShowUnavailableModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Le fichier APK Android est en cours de publication par l’administrateur. Dès que le lien de téléchargement sera ajouté via l’API dans <code className="text-purple-300">/admin</code>, le téléchargement démarrera directement ici.
            </p>
            <button
              onClick={() => setShowUnavailableModal(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
};
