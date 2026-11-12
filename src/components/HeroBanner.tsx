import React, { useState, useEffect } from 'react';
import {
  Info, Plus, Check, Star, Share2, CheckCheck, ChevronRight, ChevronLeft, Download, Radio
} from 'lucide-react';
import { MediaItem } from '../types';
import { storageService } from '../services/storageService';
import { openOmniSave } from '../utils/omniSave';
import { getMediaPath, shareDirectUrl } from '../utils/routing';

interface HeroBannerProps {
  featuredItems: MediaItem[];
  onPlay?: (media: MediaItem) => void;
  onOpenDetails: (media: MediaItem) => void;
  onOpenDirect?: () => void;
  onWatchlistChange?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  featuredItems,
  onOpenDetails,
  onOpenDirect,
  onWatchlistChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const current = featuredItems[currentIndex] || featuredItems[0];

  useEffect(() => {
    if (current) {
      setInWatchlist(storageService.isInWatchlist(current.id));
    }
  }, [current]);

  useEffect(() => {
    if (featuredItems.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [featuredItems.length]);

  if (!current) return null;

  const handleToggleWatchlist = () => {
    const added = storageService.toggleWatchlist(current.id);
    setInWatchlist(added);
    onWatchlistChange?.();
  };

  const handleShare = async () => {
    const ok = await shareDirectUrl(current.title, getMediaPath(current));
    if (ok) {
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  return (
    <section
      aria-label="Sélection à la une"
      className="relative w-full h-[64vh] sm:h-[70vh] min-h-[460px] max-h-[720px] overflow-hidden bg-[#08070d]"
    >
      {/* Background Backdrop */}
      <div className="absolute inset-0">
        <img
          src={current.backdrop || current.poster || '/images/fallback-backdrop.jpg'}
          alt={current.title}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/images/fallback-backdrop.jpg';
          }}
          className="w-full h-full object-cover object-top brightness-85 transition-opacity duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08070d] via-[#08070d]/55 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08070d] via-[#08070d]/65 to-transparent w-full md:w-3/4" />
      </div>

      {/* Hero Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-10 sm:pb-14 z-10">
        <div className="max-w-2xl space-y-3 sm:space-y-4">
          {/* Unboxed concise metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-300">
            <span className="font-bold text-purple-300 uppercase tracking-wider text-[11px]">
              À la une
            </span>
            <span aria-hidden="true" className="text-zinc-500">·</span>
            <span className="flex items-center gap-1 font-semibold text-amber-300">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{current.rating.toFixed(1)}</span>
            </span>
            <span aria-hidden="true" className="text-zinc-500">·</span>
            <span>{current.releaseYear}</span>
            <span aria-hidden="true" className="text-zinc-500">·</span>
            <span>{current.duration}</span>
            {current.genres[0] && (
              <>
                <span aria-hidden="true" className="text-zinc-500">·</span>
                <span className="text-zinc-300">{current.genres.slice(0, 2).join(', ')}</span>
              </>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight font-heading text-balance">
            {current.title}
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-zinc-300 line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-xl">
            {current.synopsis}
          </p>

          {/* Touch-friendly Action Bar (No "Regarder" or "Aperçu" button) */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              onClick={() => onOpenDetails(current)}
              className="px-5 min-h-[44px] bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-purple-950/60"
            >
              <Info className="w-4 h-4" />
              <span>Voir la fiche</span>
            </button>

            <button
              onClick={() => openOmniSave(current.title || current.originalTitle)}
              className="px-4 min-h-[44px] bg-emerald-600/90 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Télécharger</span>
            </button>

            {onOpenDirect && (
              <button
                onClick={onOpenDirect}
                className="px-4 min-h-[44px] bg-rose-600/85 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-colors"
              >
                <Radio className="w-4 h-4" />
                <span>Direct</span>
              </button>
            )}

            <button
              onClick={handleShare}
              className="px-3.5 min-h-[44px] bg-white/10 hover:bg-white/20 text-white font-medium text-xs sm:text-sm rounded-xl flex items-center gap-1.5 backdrop-blur-md border border-white/10 transition-colors"
              aria-label="Partager le lien direct"
            >
              {copiedShare ? (
                <>
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">Copié</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Partager</span>
                </>
              )}
            </button>

            <button
              onClick={handleToggleWatchlist}
              className={`min-w-[44px] min-h-[44px] px-3 rounded-xl border backdrop-blur-md flex items-center justify-center transition-colors ${
                inWatchlist
                  ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                  : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
              }`}
              title={inWatchlist ? 'Dans ma liste' : 'Ajouter à ma liste'}
              aria-label={inWatchlist ? 'Dans ma liste' : 'Ajouter à ma liste'}
            >
              {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Slide Controls */}
        {featuredItems.length > 1 && (
          <div className="absolute right-4 sm:right-8 bottom-10 flex items-center gap-1.5 bg-black/50 backdrop-blur-md p-1 rounded-full border border-white/10">
            <button
              onClick={() => setCurrentIndex((prev) => (prev - 1 + featuredItems.length) % featuredItems.length)}
              className="p-2 rounded-full hover:bg-white/10 text-zinc-300"
              aria-label="Titre précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-medium text-zinc-300 px-1 tabular-nums">
              {currentIndex + 1}/{featuredItems.length}
            </span>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % featuredItems.length)}
              className="p-2 rounded-full hover:bg-white/10 text-zinc-300"
              aria-label="Titre suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
