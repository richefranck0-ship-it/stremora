import React, { useEffect, useState } from 'react';
import { Megaphone, ExternalLink, ShieldCheck } from 'lucide-react';
import { AdBanner } from '../types';
import { storageService } from '../services/storageService';
import { AdBannerSlot } from './AdBannerSlot';

interface AdNetworkBannersProps {
  onAdClick?: (ad: AdBanner) => void;
  onOpenPartnership?: () => void;
  className?: string;
}

export const AdNetworkBanners: React.FC<AdNetworkBannersProps> = ({
  onAdClick,
  onOpenPartnership,
  className = '',
}) => {
  const [ads, setAds] = useState<AdBanner[]>(() => storageService.getAds());

  useEffect(() => {
    const sync = () => setAds(storageService.getAds());
    window.addEventListener('streamora-ads-updated', sync);
    return () => window.removeEventListener('streamora-ads-updated', sync);
  }, []);

  const networkAds = ads.filter(
    (a) => a.isActive && (a.placement === 'footer_network' || a.placement === 'in_feed')
  );
  const currentAd = networkAds.length > 0 ? networkAds[0] : null;

  const handleRecordClick = (ad: AdBanner) => {
    storageService.recordAdClick(ad.id);
    setAds(storageService.getAds());
    onAdClick?.(ad);
    if (ad.targetUrl) {
      window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 ${className}`}>
      <div className="bg-gradient-to-b from-[#131024] to-[#0c0a15] border border-purple-900/35 rounded-3xl p-5 sm:p-7 space-y-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/6 pb-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-purple-400" />
              <span>Espace Régie Publicitaire &amp; Partenaires</span>
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold text-white font-heading">
              Emplacements publicitaires STREAMORA
            </h3>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Espaces prêts pour régies officielles (Google AdSense, Adsterra, Monetag, PropellerAds) et campagnes sponsors directes gérées par l’éditeur.
            </p>
          </div>

          <button
            onClick={() => {
              if (onOpenPartnership) {
                onOpenPartnership();
              } else {
                window.location.href = '/partenariat';
              }
            }}
            className="px-4 min-h-[42px] bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shrink-0"
          >
            <Megaphone className="w-4 h-4" />
            <span>Annoncer sur STREAMORA</span>
          </button>
        </div>

        {currentAd ? (
          currentAd.mediaType === 'html' && currentAd.htmlCode ? (
            <AdBannerSlot placement={currentAd.placement} />
          ) : (
            <div
              onClick={() => handleRecordClick(currentAd)}
              className="group relative rounded-2xl overflow-hidden border border-purple-500/30 hover:border-purple-400 bg-black/60 shadow-xl transition-all cursor-pointer flex flex-col md:flex-row items-center justify-between"
            >
              <div className="w-full md:w-3/5 h-44 sm:h-52 relative overflow-hidden bg-black shrink-0">
                {currentAd.mediaType === 'video' ? (
                  <video
                    src={currentAd.mediaUrl}
                    poster={currentAd.imageUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={currentAd.mediaUrl || currentAd.imageUrl || '/images/partnership-hero.jpg'}
                    alt={currentAd.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent via-black/40 to-[#0e0c1a]" />
                <span className="absolute top-3 left-3 bg-black/80 backdrop-blur-md text-[10px] uppercase font-bold text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                  {currentAd.badgeText || 'Sponsor'}
                </span>
              </div>

              <div className="p-5 md:p-6 flex-1 space-y-3 w-full">
                <div>
                  <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wide">
                    {currentAd.clientName}
                  </span>
                  <h4 className="text-base sm:text-lg font-bold text-white group-hover:text-purple-300 transition-colors mt-0.5">
                    {currentAd.title}
                  </h4>
                  {currentAd.description && (
                    <p className="text-xs text-zinc-300 mt-1 line-clamp-2 leading-relaxed">
                      {currentAd.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
                  <span className="text-[11px] text-zinc-400 truncate max-w-xs font-mono">
                    {currentAd.targetUrl}
                  </span>
                  <span className="px-4 py-2 bg-purple-600 group-hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors">
                    <span>Visiter</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="p-6 text-center bg-black/35 rounded-2xl border border-dashed border-white/10 space-y-2.5">
            <ShieldCheck className="w-8 h-8 text-purple-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">
              Emplacements publicitaires disponibles pour vos partenaires
            </h4>
            <p className="text-xs text-zinc-400 max-w-lg mx-auto">
              Aucune régie publicitaire n’est encore connectée ici. Les annonceurs intéressés peuvent contacter l’éditeur via la page Partenariat et publicité.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
