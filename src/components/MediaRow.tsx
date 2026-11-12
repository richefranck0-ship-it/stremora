import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';

interface MediaRowProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  onOpenDetails: (media: MediaItem) => void;
  onWatchlistChange?: () => void;
  onSeeAll?: () => void;
}

export const MediaRow: React.FC<MediaRowProps> = ({
  title,
  subtitle,
  items,
  onOpenDetails,
  onWatchlistChange,
  onSeeAll,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.78;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (items.length === 0) return null;

  return (
    <section className="my-6 sm:my-8 relative group/row">
      {/* Row Header */}
      <div className="flex items-end justify-between mb-3 px-4 sm:px-6 lg:px-8 gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white font-heading truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-0.5 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span>Voir tout</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => scroll('left')}
              className="p-2 rounded-lg bg-white/5 hover:bg-purple-600/30 hover:text-purple-200 text-zinc-400 border border-white/8 transition-colors"
              aria-label="Défiler vers la gauche"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-2 rounded-lg bg-white/5 hover:bg-purple-600/30 hover:text-purple-200 text-zinc-400 border border-white/8 transition-colors"
              aria-label="Défiler vers la droite"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Carousel with Snap Swipe */}
      <div
        ref={rowRef}
        className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto scrollbar-none px-4 sm:px-6 lg:px-8 py-1 scroll-smooth snap-x snap-mandatory"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="w-[42vw] min-w-[144px] max-w-[185px] sm:w-44 md:w-48 shrink-0 snap-start"
          >
            <MediaCard
              media={item}
              onOpenDetails={onOpenDetails}
              onWatchlistChange={onWatchlistChange}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
