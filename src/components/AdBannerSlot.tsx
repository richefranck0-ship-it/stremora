import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, X, Sparkles, Play } from 'lucide-react';
import { AdBanner, AdPlacement } from '../types';
import { storageService } from '../services/storageService';

interface AdBannerSlotProps {
  placement: AdPlacement;
  className?: string;
}

const HtmlAdScriptContainer: React.FC<{ htmlCode: string }> = ({ htmlCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !htmlCode.trim()) return;
    el.innerHTML = '';
    try {
      const range = document.createRange();
      range.selectNode(el);
      const fragment = range.createContextualFragment(htmlCode);
      el.appendChild(fragment);
    } catch {
      el.innerHTML = htmlCode;
    }
  }, [htmlCode]);

  return <div ref={containerRef} className="w-full flex items-center justify-center overflow-hidden" />;
};

export const AdBannerSlot: React.FC<AdBannerSlotProps> = ({ placement, className = '' }) => {
  const [ad, setAd] = useState<AdBanner | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const pickAd = () => {
      const allAds = storageService.getAds().filter((a) => a.isActive && a.placement === placement);
      if (allAds.length > 0) {
        const selected = allAds[Math.floor(Math.random() * allAds.length)];
        setAd(selected);
        storageService.recordAdImpression(selected.id);
      } else {
        setAd(null);
      }
    };

    pickAd();
    const handleAdsUpdated = () => pickAd();
    window.addEventListener('streamora-ads-updated', handleAdsUpdated);
    return () => window.removeEventListener('streamora-ads-updated', handleAdsUpdated);
  }, [placement]);

  if (!ad || dismissed) return null;

  const handleClick = () => {
    storageService.recordAdClick(ad.id);
    if (ad.targetUrl) {
      window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Real Ad Network HTML/Script Tag Mode (Google AdSense, Adsterra, Monetag, PropellerAds...)
  if (ad.mediaType === 'html' && ad.htmlCode) {
    return (
      <aside
        aria-label={ad.badgeText || 'Publicité'}
        className={`w-full my-4 rounded-2xl bg-[#0e0c18] border border-white/8 p-3 flex flex-col items-center justify-center relative overflow-hidden ${className}`}
      >
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 self-start">
          {ad.badgeText || 'Sponsorisé'}
        </span>
        <HtmlAdScriptContainer htmlCode={ad.htmlCode} />
      </aside>
    );
  }

  const adMediaUrl = ad.mediaUrl || ad.imageUrl || '';
  const isVideo = ad.mediaType === 'video' || adMediaUrl.endsWith('.mp4') || adMediaUrl.endsWith('.webm');

  // Header Bar style (Discreet top sponsor bar)
  if (placement === 'header_bar') {
    return (
      <aside aria-label="Sponsorisé" className={`w-full bg-[#12101e] border-b border-purple-900/30 text-xs px-4 py-2 flex items-center justify-between text-zinc-300 transition-colors ${className}`}>
        <div className="flex items-center gap-3 truncate max-w-[85%] cursor-pointer" onClick={handleClick}>
          <span className="bg-purple-600/20 text-purple-300 border border-purple-500/30 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
            {ad.badgeText || 'Sponsorisé'}
          </span>
          <span className="font-medium text-white truncate hover:text-purple-300 transition-colors">
            {ad.title}
          </span>
          {ad.description && (
            <span className="hidden md:inline text-zinc-400 truncate text-[11px]">
              — {ad.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleClick}
            className="flex items-center gap-1 text-purple-400 hover:text-purple-300 font-medium text-xs transition-colors"
          >
            <span>Découvrir</span>
            <ExternalLink className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
            }}
            className="text-zinc-500 hover:text-zinc-300 p-1"
            title="Masquer"
            aria-label="Masquer l'annonce"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  // Under Player or Sub-Hero Banner (supports Video Spots and Image Banners)
  if (placement === 'under_player' || placement === 'sub_hero') {
    return (
      <aside aria-label="Sponsor" className={`w-full bg-[#110f1c] border border-purple-900/30 rounded-2xl p-4 my-4 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden group shadow-lg ${className}`}>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full cursor-pointer" onClick={handleClick}>
          {isVideo ? (
            <div className="w-full sm:w-48 h-28 rounded-xl overflow-hidden shrink-0 border border-purple-500/30 bg-black relative">
              <video
                src={adMediaUrl}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
              <span className="absolute top-1.5 left-1.5 bg-purple-950/80 text-purple-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-purple-500/30 flex items-center gap-1">
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>Vidéo</span>
              </span>
            </div>
          ) : adMediaUrl ? (
            <img
              src={adMediaUrl}
              alt={ad.title}
              referrerPolicy="no-referrer"
              className="w-full sm:w-48 h-28 object-cover rounded-xl shrink-0 border border-white/5"
            />
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/20">
                {ad.badgeText || 'Partenaire STREAMORA'}
              </span>
              <span className="text-zinc-600 text-xs">·</span>
              <span className="text-xs text-zinc-400 font-medium truncate">
                {ad.clientName}
              </span>
            </div>
            <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
              {ad.title}
            </h4>
            {ad.description && (
              <p className="text-xs text-zinc-300 line-clamp-2 mt-1 leading-relaxed">
                {ad.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          <button
            onClick={handleClick}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 transition-colors shadow-md shadow-purple-950"
          >
            <span>Profiter de l'offre</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-white/5"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  // Default In-Feed / Direct Feed / Sidebar Card
  return (
    <aside aria-label="Sponsor" className={`my-6 rounded-2xl bg-gradient-to-r from-[#171426] via-[#1b1730] to-[#141221] border border-purple-900/30 p-5 md:p-6 relative overflow-hidden shadow-xl ${className}`}>
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <span className="text-[10px] text-purple-400 font-medium uppercase tracking-wider flex items-center gap-1 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/20">
          <Sparkles className="w-3 h-3 text-purple-400" />
          {ad.badgeText || 'Sponsorisé'}
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md"
          aria-label="Fermer l'annonce"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-5 cursor-pointer" onClick={handleClick}>
        {isVideo ? (
          <div className="w-full md:w-64 h-36 rounded-xl overflow-hidden shrink-0 border border-purple-500/30 bg-black relative">
            <video
              src={adMediaUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm text-purple-300 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>Vidéo Sponsor</span>
            </span>
          </div>
        ) : adMediaUrl ? (
          <div className="w-full md:w-64 h-36 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black/40">
            <img
              src={adMediaUrl}
              alt={ad.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
        ) : null}

        <div className="flex-1 min-w-0">
          <span className="text-xs text-zinc-400 font-medium mb-1 block">
            {ad.clientName}
          </span>
          <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 hover:text-purple-300 transition-colors">
            {ad.title}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300 line-clamp-2 mb-4 leading-relaxed">
            {ad.description || 'Découvrez cette offre exclusive sélectionnée pour les membres STREAMORA.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClick}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-purple-950"
            >
              <span>En savoir plus</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
