import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Film, Star, Sparkles, Loader2 } from 'lucide-react';
import { MediaItem } from '../types';
import { tmdbService } from '../services/tmdbService';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  allMedia: MediaItem[];
  onSelectMedia: (media: MediaItem) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  allMedia,
  onSelectMedia,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');
  const [liveTmdbResults, setLiveTmdbResults] = useState<MediaItem[]>([]);
  const [isSearchingTmdb, setIsSearchingTmdb] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setLiveTmdbResults([]);
      setIsSearchingTmdb(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsSearchingTmdb(true);
      try {
        const results = await tmdbService.searchMulti(query);
        setLiveTmdbResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingTmdb(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query]);

  const localResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    return allMedia.filter((item) => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (item.title.toLowerCase().includes(q)) return true;
      if (item.originalTitle?.toLowerCase().includes(q)) return true;
      if (String(item.releaseYear).includes(q)) return true;
      if (item.genres.some((g) => g.toLowerCase().includes(q))) return true;
      if (item.director?.toLowerCase().includes(q)) return true;
      if (item.cast?.some((c) => c.name.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [query, allMedia, filterType]);

  const combinedResults = useMemo(() => {
    const map = new Map<string, MediaItem>();
    localResults.forEach((item) => map.set(String(item.id), item));
    liveTmdbResults.forEach((item) => {
      if (!map.has(String(item.id))) {
        if (filterType === 'all' || item.type === filterType) {
          map.set(String(item.id), item);
        }
      }
    });
    return Array.from(map.values());
  }, [localResults, liveTmdbResults, filterType]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/88 backdrop-blur-md flex items-start justify-center pt-4 sm:pt-14 px-3 sm:px-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-[#110f1c] border border-purple-900/35 rounded-2xl shadow-2xl overflow-hidden flex flex-col mb-10"
      >
        {/* Search Input */}
        <div className="p-3.5 sm:p-5 border-b border-white/8 flex items-center gap-3">
          <Search className="w-5 h-5 text-purple-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher film, série, acteur ou genre..."
            className="w-full bg-transparent text-white placeholder-zinc-500 text-sm sm:text-base focus:outline-none min-h-[40px]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-2 rounded-lg text-zinc-400 hover:text-white"
              aria-label="Effacer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 min-h-[38px] rounded-xl bg-white/8 hover:bg-white/15 text-zinc-200 text-xs font-medium"
          >
            Fermer
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#0c0a14] border-b border-white/6 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {(['all', 'movie', 'tv'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterType === t
                    ? 'bg-purple-600 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-white/6'
                }`}
              >
                {t === 'all' ? 'Tout' : t === 'movie' ? 'Films' : 'Séries'}
              </button>
            ))}
          </div>

          {isSearchingTmdb && (
            <div className="flex items-center gap-1.5 text-purple-400 text-[11px]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Recherche...</span>
            </div>
          )}
        </div>

        {/* Mobile-First Poster Grid Results */}
        <div className="p-4 sm:p-5 max-h-[72vh] overflow-y-auto">
          {query.trim() === '' ? (
            <div className="py-8 space-y-4 text-center">
              <Sparkles className="w-8 h-8 text-purple-400/60 mx-auto" />
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Recherchez par titre, acteur (ex: Zendaya, Leonardo DiCaprio) ou genre (Action, Science-Fiction, Horreur).
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {['Dune', 'Breaking Bad', 'Action', 'Zendaya', 'Science-Fiction', 'Interstellar'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="px-3 py-1.5 bg-white/6 hover:bg-purple-600/30 text-zinc-200 text-xs rounded-xl border border-white/8 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : combinedResults.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {combinedResults.map((item) => (
                <article
                  key={item.id}
                  onClick={() => {
                    onSelectMedia(item);
                    onClose();
                  }}
                  className="group cursor-pointer rounded-xl overflow-hidden bg-[#171426] border border-white/6 hover:border-purple-500/45 transition-all flex flex-col"
                >
                  <div className="relative aspect-[2/3] w-full bg-black overflow-hidden">
                    <img
                      src={item.poster || '/images/fallback-poster.jpg'}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/images/fallback-poster.jpg';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] font-semibold">
                      <span className="flex items-center gap-1 text-amber-300">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {item.rating.toFixed(1)}
                      </span>
                      <span className="text-[10px] uppercase text-zinc-300">
                        {item.type === 'movie' ? 'Film' : 'Série'}
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <h4 className="text-xs font-semibold text-white truncate group-hover:text-purple-300">
                      {item.title}
                    </h4>
                    <span className="text-[11px] text-zinc-400">{item.releaseYear}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-2">
              <Film className="w-10 h-10 text-zinc-600 mx-auto" />
              <h4 className="text-sm font-semibold text-white">
                Aucun résultat pour « {query} »
              </h4>
              <p className="text-xs text-zinc-400">
                Essayez avec un autre titre, acteur ou genre.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
