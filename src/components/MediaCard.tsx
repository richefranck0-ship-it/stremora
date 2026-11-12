import React, { useState } from 'react';
import { Plus, Check, Star } from 'lucide-react';
import { MediaItem } from '../types';
import { storageService } from '../services/storageService';

interface MediaCardProps {
  media: MediaItem;
  onOpenDetails: (media: MediaItem) => void;
  onWatchlistChange?: () => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  media,
  onOpenDetails,
  onWatchlistChange,
}) => {
  const [imageError, setImageError] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(() => storageService.isInWatchlist(media.id));

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    const added = storageService.toggleWatchlist(media.id);
    setInWatchlist(added);
    onWatchlistChange?.();
  };

  return (
    <article
      onClick={() => onOpenDetails(media)}
      className="group relative cursor-pointer select-none rounded-xl overflow-hidden bg-[#12101d] border border-white/6 hover:border-purple-500/45 transition-all duration-200 flex flex-col active:scale-[0.98]"
    >
      {/* Crisp 2:3 Poster */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0c0b13]">
        <img
          src={imageError ? '/images/fallback-poster.jpg' : media.poster || '/images/fallback-poster.jpg'}
          alt={media.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />

        {/* Subtle bottom scrim inside poster for clean rating & type metadata */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none" />

        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-semibold pointer-events-none">
          <span className="flex items-center gap-1 text-amber-300 drop-shadow">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{media.rating.toFixed(1)}</span>
          </span>
          <span className="text-zinc-200 uppercase tracking-wide text-[10px]">
            {media.type === 'tv' ? 'Série' : 'Film'}
          </span>
        </div>

        {/* Touch-friendly Watchlist button */}
        <button
          onClick={handleToggleWatchlist}
          className={`absolute top-2 right-2 w-9 h-9 rounded-lg border backdrop-blur-md flex items-center justify-center transition-colors ${
            inWatchlist
              ? 'bg-purple-600/85 border-purple-400 text-white'
              : 'bg-black/55 border-white/15 text-zinc-200 hover:bg-purple-600/80 hover:text-white'
          }`}
          title={inWatchlist ? 'Retirer de ma liste' : 'Ajouter à ma liste'}
          aria-label={inWatchlist ? 'Retirer de ma liste' : 'Ajouter à ma liste'}
        >
          {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Card Footer */}
      <div className="p-2.5 sm:p-3 flex flex-col justify-between gap-1">
        <h3 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
          {media.title}
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 truncate">
          <span>{media.releaseYear}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{media.genres[0] || (media.type === 'tv' ? 'Série' : 'Film')}</span>
        </div>
      </div>
    </article>
  );
};
