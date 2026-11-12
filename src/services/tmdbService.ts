import { MediaItem, Season, Episode } from '../types';
import { storageService } from './storageService';
import { getActiveLocaleConfig } from '../utils/i18n';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Working default TMDB v3 API Key (verified)
const DEFAULT_TMDB_KEY = '844dba0bfd8f3a4f3799f6130ef9e335';

// Memory & LocalStorage Cache
const memoryCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour cache for TMDB queries

// Genre mapping for Movies & TV
export const TMDB_GENRES_MAP: Record<number, string> = {
  28: 'Action', 12: 'Aventure', 16: 'Animation', 35: 'Comédie', 80: 'Policier',
  99: 'Documentaire', 18: 'Drame', 10751: 'Famille', 14: 'Fantastique', 36: 'Histoire',
  27: 'Horreur', 10402: 'Musique', 9648: 'Mystère', 10749: 'Romance', 878: 'Science-Fiction',
  10770: 'Téléfilm', 53: 'Thriller', 10752: 'Guerre', 37: 'Western',
  10759: 'Action & Aventure', 10762: 'Enfants', 10763: 'Actualités', 10764: 'Réalité',
  10765: 'Sci-Fi & Fantastique', 10766: 'Feuilleton', 10767: 'Talk-Show', 10768: 'Guerre & Politique'
};

export const GENRE_NAME_TO_ID: Record<string, number> = {
  'Action': 28,
  'Aventure': 12,
  'Animation': 16,
  'Comédie': 35,
  'Policier': 80,
  'Documentaire': 99,
  'Drame': 18,
  'Famille': 10751,
  'Fantastique': 14,
  'Horreur': 27,
  'Romance': 10749,
  'Science-Fiction': 878,
  'Thriller': 53,
  'Guerre': 10752,
};

export const tmdbService = {
  getApiKey(): string {
    const customKey = storageService.getTmdbKey();
    return customKey && customKey.trim().length > 5 ? customKey.trim() : DEFAULT_TMDB_KEY;
  },

  hasApiKey(): boolean {
    return true;
  },

  async fetchApi<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T | null> {
    const apiKey = this.getApiKey();
    const activeLocale = getActiveLocaleConfig();

    const queryParams: Record<string, string> = {
      api_key: apiKey,
      language: activeLocale.tmdbLang,
    };

    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        queryParams[k] = String(v);
      }
    });

    const queryString = new URLSearchParams(queryParams).toString();
    const cacheKey = `tmdb_cache_${endpoint}?${queryString}`;

    // 1. Check memory cache
    const cachedMemory = memoryCache.get(cacheKey);
    if (cachedMemory && Date.now() - cachedMemory.timestamp < CACHE_TTL_MS) {
      return cachedMemory.data as T;
    }

    // 2. Check localStorage cache
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          memoryCache.set(cacheKey, parsed);
          return parsed.data as T;
        }
      }
    } catch {
      // ignore
    }

    // 3. Network Fetch
    try {
      const response = await fetch(`${TMDB_BASE_URL}${endpoint}?${queryString}`);
      if (!response.ok) {
        console.warn(`TMDB API call failed: ${response.status} for ${endpoint}`);
        return null;
      }
      const data = await response.json();

      // Store in memory & localStorage
      const payload = { timestamp: Date.now(), data };
      memoryCache.set(cacheKey, payload);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch {
        // quota limit fallback
      }

      return data as T;
    } catch (err) {
      console.error('Network error fetching TMDB:', err);
      return null;
    }
  },

  formatTmdbMedia(raw: any, type: 'movie' | 'tv'): MediaItem {
    const isMovie = type === 'movie';
    const releaseDate = isMovie ? raw.release_date || '2024-01-01' : raw.first_air_date || '2024-01-01';
    const releaseYear = releaseDate ? parseInt(releaseDate.split('-')[0], 10) : 2024;
    const title = isMovie ? (raw.title || raw.original_title || 'Titre inconnu') : (raw.name || raw.original_name || 'Titre inconnu');
    const originalTitle = isMovie ? raw.original_title || title : raw.original_name || title;

    // Genres parsing
    let genres: string[] = [];
    if (Array.isArray(raw.genres)) {
      genres = raw.genres.map((g: any) => g.name);
    } else if (Array.isArray(raw.genre_ids)) {
      genres = raw.genre_ids.map((id: number) => TMDB_GENRES_MAP[id]).filter(Boolean);
    }
    if (genres.length === 0) genres = [isMovie ? 'Film' : 'Série TV'];

    // Posters & Backdrops
    const poster = raw.poster_path
      ? `${TMDB_IMAGE_BASE}/w600_and_h900_bestv2${raw.poster_path}`
      : '/images/fallback-poster.jpg';

    const backdrop = raw.backdrop_path
      ? `${TMDB_IMAGE_BASE}/original${raw.backdrop_path}`
      : (raw.poster_path ? `${TMDB_IMAGE_BASE}/original${raw.poster_path}` : '/images/fallback-backdrop.jpg');

    // Default trailers and videos
    let trailerUrl = '';
    if (raw.videos?.results) {
      const trailer = raw.videos.results.find((v: any) => (v.type === 'Trailer' || v.type === 'Teaser') && v.site === 'YouTube');
      if (trailer) {
        trailerUrl = `https://www.youtube.com/embed/${trailer.key}`;
      }
    }

    // Cast parsing
    const cast = (raw.credits?.cast || []).slice(0, 6).map((c: any) => ({
      name: c.name,
      role: c.character || 'Acteur',
      photo: c.profile_path ? `${TMDB_IMAGE_BASE}/w185${c.profile_path}` : undefined,
    }));

    // Director
    let director = 'Cinéma';
    if (raw.credits?.crew) {
      const dirObj = raw.credits.crew.find((cr: any) => cr.job === 'Director');
      if (dirObj) director = dirObj.name;
    } else if (raw.created_by && raw.created_by[0]) {
      director = raw.created_by[0].name;
    }

    // Demo / Sample stream video for player
    const demoStreams = [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    ];
    const videoUrl = demoStreams[Math.abs(Number(raw.id || 0)) % demoStreams.length];

    return {
      id: `${type}-${raw.id}`,
      tmdbId: raw.id,
      type,
      title,
      originalTitle,
      frenchTitle: title,
      synopsis: raw.overview && raw.overview.trim().length > 0
        ? raw.overview
        : `Découvrez cette production remarquable sur STREAMORA. Consultez la fiche complète pour tous les détails et trouvez les sources de visionnage.`,
      poster,
      backdrop,
      releaseYear: isNaN(releaseYear) ? 2024 : releaseYear,
      releaseDate,
      genres,
      rating: raw.vote_average ? Math.round(raw.vote_average * 10) / 10 : 7.6,
      votesCount: raw.vote_count || 350,
      duration: isMovie
        ? (raw.runtime ? `${Math.floor(raw.runtime / 60)}h ${raw.runtime % 60}m` : '2h 05m')
        : `${raw.number_of_seasons || 1} Saison${(raw.number_of_seasons || 1) > 1 ? 's' : ''}`,
      country: raw.production_countries?.[0]?.name || (raw.origin_country?.[0] ? raw.origin_country[0] : 'International'),
      language: raw.original_language ? raw.original_language.toUpperCase() : 'VOSTFR',
      director,
      cast: cast.length > 0 ? cast : [
        { name: 'Casting Principal', role: 'Acteur' },
        { name: 'Distribution Secondaire', role: 'Interprète' }
      ],
      trailerUrl,
      videoUrl,
      isClassic: releaseYear < 2000,
      isNew: releaseYear >= 2023,
      isTopRated: (raw.vote_average || 0) >= 8.2,
      isTrending: (raw.popularity || 0) > 40,
    };
  },

  // 1. Trending
  async getTrending(type: 'all' | 'movie' | 'tv' = 'all', page = 1): Promise<MediaItem[]> {
    const data = await this.fetchApi<{ results: any[] }>(`/trending/${type}/day`, { page });
    if (!data?.results) return [];
    return data.results
      .filter((r: any) => r.poster_path && (r.media_type === 'movie' || r.media_type === 'tv' || type !== 'all'))
      .map((r: any) => this.formatTmdbMedia(r, r.media_type || (type === 'tv' ? 'tv' : 'movie')));
  },

  // 2. Popular Movies
  async getPopularMovies(page = 1): Promise<MediaItem[]> {
    const data = await this.fetchApi<{ results: any[] }>('/movie/popular', { page });
    if (!data?.results) return [];
    return data.results.filter(r => r.poster_path).map(r => this.formatTmdbMedia(r, 'movie'));
  },

  // 3. New / In Theatres Movies
  async getNowPlayingMovies(page = 1): Promise<MediaItem[]> {
    const data = await this.fetchApi<{ results: any[] }>('/movie/now_playing', { page });
    if (!data?.results) return [];
    return data.results.filter(r => r.poster_path).map(r => this.formatTmdbMedia(r, 'movie'));
  },

  // 4. Classic Masterpiece Movies (from 1930 to 1999)
  async getClassicMovies(page = 1): Promise<MediaItem[]> {
    const data = await this.fetchApi<{ results: any[] }>('/discover/movie', {
      sort_by: 'vote_average.desc',
      'vote_count.gte': 1500,
      'primary_release_date.lte': '1999-12-31',
      page,
    });
    if (!data?.results) return [];
    return data.results.filter(r => r.poster_path).map(r => {
      const item = this.formatTmdbMedia(r, 'movie');
      item.isClassic = true;
      return item;
    });
  },

  // 5. Top Rated Movies
  async getTopRatedMovies(page = 1): Promise<MediaItem[]> {
    const data = await this.fetchApi<{ results: any[] }>('/movie/top_rated', { page });
    if (!data?.results) return [];
    return data.results.filter(r => r.poster_path).map(r => this.formatTmdbMedia(r, 'movie'));
  },

  // 6. Popular TV Series
  async getPopularTv(page = 1): Promise<MediaItem[]> {
    const data = await this.fetchApi<{ results: any[] }>('/tv/popular', { page });
    if (!data?.results) return [];
    return data.results.filter(r => r.poster_path).map(r => this.formatTmdbMedia(r, 'tv'));
  },

  // 7. On Air / New TV Series
  async getOnAirTv(page = 1): Promise<MediaItem[]> {
    const data = await this.fetchApi<{ results: any[] }>('/tv/on_the_air', { page });
    if (!data?.results) return [];
    return data.results.filter(r => r.poster_path).map(r => this.formatTmdbMedia(r, 'tv'));
  },

  // 8. Classic TV Series
  async getClassicTv(page = 1): Promise<MediaItem[]> {
    const data = await this.fetchApi<{ results: any[] }>('/discover/tv', {
      sort_by: 'vote_average.desc',
      'vote_count.gte': 800,
      'first_air_date.lte': '2015-12-31',
      page,
    });
    if (!data?.results) return [];
    return data.results.filter(r => r.poster_path).map(r => {
      const item = this.formatTmdbMedia(r, 'tv');
      item.isClassic = true;
      return item;
    });
  },

  // 9. Discover Filtered Movies
  async discoverMovies(params: {
    genreId?: number;
    yearEra?: string;
    sortBy?: string;
    page?: number;
  }): Promise<MediaItem[]> {
    const apiParams: Record<string, any> = {
      page: params.page || 1,
      sort_by: params.sortBy || 'popularity.desc',
    };

    if (params.genreId) {
      apiParams.with_genres = params.genreId;
    }

    if (params.yearEra === '2024') {
      apiParams['primary_release_date.gte'] = '2024-01-01';
    } else if (params.yearEra === '2020-2023') {
      apiParams['primary_release_date.gte'] = '2020-01-01';
      apiParams['primary_release_date.lte'] = '2023-12-31';
    } else if (params.yearEra === '2010-2019') {
      apiParams['primary_release_date.gte'] = '2010-01-01';
      apiParams['primary_release_date.lte'] = '2019-12-31';
    } else if (params.yearEra === '2000-2009') {
      apiParams['primary_release_date.gte'] = '2000-01-01';
      apiParams['primary_release_date.lte'] = '2009-12-31';
    } else if (params.yearEra === 'classics') {
      apiParams['primary_release_date.lte'] = '1999-12-31';
      apiParams['vote_count.gte'] = 300;
    }

    const data = await this.fetchApi<{ results: any[] }>('/discover/movie', apiParams);
    if (!data?.results) return [];
    return data.results.filter(r => r.poster_path).map(r => this.formatTmdbMedia(r, 'movie'));
  },

  // 10. Discover Filtered Series
  async discoverSeries(params: {
    genreId?: number;
    yearEra?: string;
    sortBy?: string;
    page?: number;
  }): Promise<MediaItem[]> {
    const apiParams: Record<string, any> = {
      page: params.page || 1,
      sort_by: params.sortBy || 'popularity.desc',
    };

    if (params.genreId) {
      apiParams.with_genres = params.genreId;
    }

    if (params.yearEra === '2024') {
      apiParams['first_air_date.gte'] = '2024-01-01';
    } else if (params.yearEra === '2020-2023') {
      apiParams['first_air_date.gte'] = '2020-01-01';
      apiParams['first_air_date.lte'] = '2023-12-31';
    } else if (params.yearEra === '2010-2019') {
      apiParams['first_air_date.gte'] = '2010-01-01';
      apiParams['first_air_date.lte'] = '2019-12-31';
    } else if (params.yearEra === 'classics') {
      apiParams['first_air_date.lte'] = '2015-12-31';
      apiParams['vote_count.gte'] = 200;
    }

    const data = await this.fetchApi<{ results: any[] }>('/discover/tv', apiParams);
    if (!data?.results) return [];
    return data.results.filter(r => r.poster_path).map(r => this.formatTmdbMedia(r, 'tv'));
  },

  // 11. Multi Search Live (Titles + Actors via person.known_for + Genres)
  async searchMulti(query: string, page = 1): Promise<MediaItem[]> {
    if (!query.trim()) return [];
    const data = await this.fetchApi<{ results: any[] }>('/search/multi', {
      query: query.trim(),
      page,
    });
    if (!data?.results) return [];

    const results: MediaItem[] = [];
    const seen = new Set<string>();

    const pushItem = (raw: any, type: 'movie' | 'tv') => {
      const formatted = this.formatTmdbMedia(raw, type);
      const key = String(formatted.id);
      if (!seen.has(key)) {
        seen.add(key);
        results.push(formatted);
      }
    };

    data.results.forEach((r: any) => {
      if ((r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path) {
        pushItem(r, r.media_type);
      } else if (r.media_type === 'person' && Array.isArray(r.known_for)) {
        r.known_for.forEach((kf: any) => {
          if ((kf.media_type === 'movie' || kf.media_type === 'tv') && kf.poster_path) {
            pushItem(kf, kf.media_type);
          }
        });
      }
    });

    // If query matches a genre name, supplement with discover results
    const matchedGenreEntry = Object.entries(GENRE_NAME_TO_ID).find(
      ([name]) => name.toLowerCase() === query.trim().toLowerCase()
    );
    if (matchedGenreEntry && results.length < 8) {
      const [gMovies, gSeries] = await Promise.all([
        this.discoverMovies({ genreId: matchedGenreEntry[1], page: 1 }),
        this.discoverSeries({ genreId: matchedGenreEntry[1], page: 1 }),
      ]);
      [...gMovies.slice(0, 6), ...gSeries.slice(0, 6)].forEach((item) => {
        const key = String(item.id);
        if (!seen.has(key)) {
          seen.add(key);
          results.push(item);
        }
      });
    }

    return results;
  },

  async getSimilarMedia(type: 'movie' | 'tv', id: number | string): Promise<MediaItem[]> {
    const cleanId = String(id).replace(/^(movie|tv)-/, '');
    const data = await this.fetchApi<{ results: any[] }>(`/${type}/${cleanId}/similar`, { page: 1 });
    if (!data?.results) return [];
    return data.results.filter((r) => r.poster_path).slice(0, 8).map((r) => this.formatTmdbMedia(r, type));
  },

  // 12. Full Media Details (with Credits, Videos, Seasons)
  async getMovieDetails(movieId: number | string): Promise<MediaItem | null> {
    const cleanId = String(movieId).replace('movie-', '');
    const data = await this.fetchApi<any>(`/movie/${cleanId}`, {
      append_to_response: 'credits,videos,similar',
    });
    if (!data) return null;
    return this.formatTmdbMedia(data, 'movie');
  },

  async getTvDetails(tvId: number | string): Promise<MediaItem | null> {
    const cleanId = String(tvId).replace('tv-', '');
    const data = await this.fetchApi<any>(`/tv/${cleanId}`, {
      append_to_response: 'credits,videos,similar',
    });
    if (!data) return null;
    const media = this.formatTmdbMedia(data, 'tv');

    // Populate seasons structure
    if (Array.isArray(data.seasons)) {
      media.seasons = data.seasons
        .filter((s: any) => s.season_number > 0)
        .map((s: any): Season => ({
          seasonNumber: s.season_number,
          title: s.name || `Saison ${s.season_number}`,
          episodesCount: s.episode_count || 8,
          episodes: Array.from({ length: Math.min(s.episode_count || 6, 12) }).map((_, i) => ({
            id: `ep-${cleanId}-${s.season_number}-${i + 1}`,
            episodeNumber: i + 1,
            seasonNumber: s.season_number,
            title: `Épisode ${i + 1}`,
            synopsis: `Épisode ${i + 1} de la saison ${s.season_number}. Une étape charnière dans la trajectoire des protagonistes.`,
            duration: '48 min',
            thumbnail: s.poster_path ? `${TMDB_IMAGE_BASE}/w500${s.poster_path}` : media.backdrop,
            videoUrl: media.videoUrl,
          }))
        }));
    }

    return media;
  },

  // 13. Fetch real episode list for a season
  async getTvSeason(tvId: number | string, seasonNumber: number): Promise<Episode[]> {
    const cleanId = String(tvId).replace('tv-', '');
    const data = await this.fetchApi<any>(`/tv/${cleanId}/season/${seasonNumber}`);
    if (!data?.episodes) return [];

    return data.episodes.map((ep: any): Episode => ({
      id: `ep-${cleanId}-${seasonNumber}-${ep.episode_number}`,
      episodeNumber: ep.episode_number,
      seasonNumber,
      title: ep.name || `Épisode ${ep.episode_number}`,
      synopsis: ep.overview || 'Informations sur l’épisode disponibles lors de la diffusion.',
      duration: ep.runtime ? `${ep.runtime} min` : '45 min',
      thumbnail: ep.still_path ? `${TMDB_IMAGE_BASE}/w500${ep.still_path}` : '',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    }));
  }
};
