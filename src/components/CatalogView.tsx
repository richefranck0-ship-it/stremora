import React, { useState, useEffect, useMemo } from 'react';
import { Film, Tv, ChevronDown, Loader2 } from 'lucide-react';
import { MediaItem, MediaType } from '../types';
import { AVAILABLE_GENRES } from '../data/mockData';
import { tmdbService, GENRE_NAME_TO_ID } from '../services/tmdbService';
import { MediaCard } from './MediaCard';
import { AdBannerSlot } from './AdBannerSlot';

interface CatalogViewProps {
  type: MediaType;
  allMedia: MediaItem[];
  initialGenre?: string;
  onOpenDetails: (media: MediaItem) => void;
  onWatchlistChange?: () => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  type,
  allMedia,
  initialGenre = 'Tous',
  onOpenDetails,
  onWatchlistChange,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>(initialGenre);
  const [selectedSort, setSelectedSort] = useState<'popularity' | 'rating' | 'newest' | 'classic'>('popularity');
  const [selectedYearEra, setSelectedYearEra] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [liveTmdbItems, setLiveTmdbItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSelectedGenre(initialGenre || 'Tous');
  }, [initialGenre, type]);

  const isMovies = type === 'movie';
  const pageTitle = isMovies ? 'Catalogue des Films' : 'Catalogue des Séries';
  const pageSubtitle = isMovies
    ? 'Des grands classiques intemporels aux nouveautés mondiales.'
    : 'Séries intégrales classées par saisons et épisodes.';

  const baseItems = useMemo(() => {
    return allMedia.filter((item) => item.type === type);
  }, [allMedia, type]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    baseItems.forEach((i) => {
      if (i.country) {
        i.country.split(/[/,]/).forEach((c) => set.add(c.trim()));
      }
    });
    return Array.from(set).sort();
  }, [baseItems]);

  const tmdbSort = useMemo(() => {
    if (selectedSort === 'rating') return 'vote_average.desc';
    if (selectedSort === 'newest') return isMovies ? 'primary_release_date.desc' : 'first_air_date.desc';
    if (selectedSort === 'classic') return isMovies ? 'primary_release_date.asc' : 'first_air_date.asc';
    return 'popularity.desc';
  }, [selectedSort, isMovies]);

  useEffect(() => {
    setCurrentPage(1);
    setLiveTmdbItems([]);
  }, [selectedGenre, selectedSort, selectedYearEra, type]);

  useEffect(() => {
    let isCancelled = false;
    const fetchTmdb = async () => {
      setIsLoading(true);
      const genreId = selectedGenre !== 'Tous' ? GENRE_NAME_TO_ID[selectedGenre] : undefined;
      try {
        const results = isMovies
          ? await tmdbService.discoverMovies({
              genreId,
              yearEra: selectedYearEra,
              sortBy: tmdbSort,
              page: currentPage,
            })
          : await tmdbService.discoverSeries({
              genreId,
              yearEra: selectedYearEra,
              sortBy: tmdbSort,
              page: currentPage,
            });

        if (!isCancelled) {
          if (currentPage === 1) {
            setLiveTmdbItems(results);
          } else {
            setLiveTmdbItems((prev) => {
              const map = new Map<string, MediaItem>();
              prev.forEach((item) => map.set(String(item.id), item));
              results.forEach((item) => map.set(String(item.id), item));
              return Array.from(map.values());
            });
          }
        }
      } catch (err) {
        console.error('Failed to discover from TMDB:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchTmdb();
    return () => {
      isCancelled = true;
    };
  }, [type, isMovies, selectedGenre, selectedSort, selectedYearEra, currentPage, tmdbSort]);

  const combinedItems = useMemo(() => {
    const map = new Map<string, MediaItem>();
    liveTmdbItems.forEach((item) => map.set(String(item.id), item));

    baseItems.forEach((item) => {
      if (!map.has(String(item.id))) {
        let matches = true;
        if (selectedGenre !== 'Tous' && !item.genres.some((g) => g.toLowerCase() === selectedGenre.toLowerCase())) {
          matches = false;
        }
        if (selectedCountry !== 'all' && !item.country.toLowerCase().includes(selectedCountry.toLowerCase())) {
          matches = false;
        }
        if (matches) map.set(String(item.id), item);
      }
    });

    let list = Array.from(map.values());
    if (selectedCountry !== 'all') {
      list = list.filter((item) => item.country.toLowerCase().includes(selectedCountry.toLowerCase()));
    }
    return list;
  }, [liveTmdbItems, baseItems, selectedGenre, selectedCountry]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
          {isMovies ? <Film className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
          <span>{isMovies ? 'Cinéma & Patrimoine' : 'Séries & Épisodes'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight font-heading">
          {pageTitle}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
          {pageSubtitle}
        </p>
      </div>

      {/* Genre Strip + Filters */}
      <div className="bg-[#110f1c] border border-white/6 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {AVAILABLE_GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3.5 min-h-[38px] text-xs font-medium rounded-xl whitespace-nowrap transition-colors ${
                selectedGenre === genre
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'bg-white/6 text-zinc-300 hover:text-white hover:bg-white/12'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/6">
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Trier par
            </label>
            <select
              value={selectedSort}
              onChange={(e: any) => setSelectedSort(e.target.value)}
              className="w-full bg-[#181528] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              <option value="popularity">Les plus populaires</option>
              <option value="rating">Les mieux notés</option>
              <option value="newest">Sorties récentes</option>
              <option value="classic">Classiques d’abord</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Époque
            </label>
            <select
              value={selectedYearEra}
              onChange={(e) => setSelectedYearEra(e.target.value)}
              className="w-full bg-[#181528] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">Toutes les époques</option>
              <option value="2024">2024 - 2026</option>
              <option value="2020-2023">2020 - 2023</option>
              <option value="2010-2019">2010 - 2019</option>
              <option value="2000-2009">Années 2000</option>
              <option value="classics">Classiques (Avant 2000)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Pays
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full bg-[#181528] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">Tous les pays</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <AdBannerSlot placement="in_feed" />

      {/* Count */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span className="flex items-center gap-2">
          <span>
            <strong className="text-white">{combinedItems.length}</strong> {isMovies ? 'films' : 'séries'}
          </span>
          {isLoading && <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />}
        </span>
        {selectedGenre !== 'Tous' && (
          <button
            onClick={() => {
              setSelectedGenre('Tous');
              setSelectedYearEra('all');
              setSelectedCountry('all');
            }}
            className="text-purple-400 hover:text-purple-300 font-medium"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Mobile-First 2-Column Poster Grid */}
      {combinedItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {combinedItems.map((item) => (
            <MediaCard
              key={item.id}
              media={item}
              onOpenDetails={onOpenDetails}
              onWatchlistChange={onWatchlistChange}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-[#110f1c] rounded-2xl border border-white/6 space-y-3">
          {isLoading ? (
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
          ) : (
            <>
              <Film className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-sm font-semibold text-white">Aucun résultat pour ces filtres</p>
            </>
          )}
        </div>
      )}

      {/* Load More */}
      <div className="flex justify-center pt-4">
        <button
          onClick={() => setCurrentPage((prev) => prev + 1)}
          disabled={isLoading}
          className="px-6 min-h-[44px] bg-[#181528] hover:bg-purple-600 text-zinc-200 hover:text-white text-xs font-semibold rounded-xl border border-white/10 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Chargement...</span>
            </>
          ) : (
            <>
              <span>Charger plus</span>
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
