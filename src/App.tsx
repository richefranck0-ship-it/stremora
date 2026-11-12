/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MediaItem, Episode, ActiveTab, UserProfile, LiveStreamChannel } from './types';
import { storageService } from './services/storageService';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { MediaRow } from './components/MediaRow';
import { MediaCard } from './components/MediaCard';
import { VideoPlayer } from './components/VideoPlayer';
import { MediaDetailPage } from './components/MediaDetailPage';
import { CatalogView } from './components/CatalogView';
import { LiveDirectView } from './components/LiveDirectView';
import { SearchModal } from './components/SearchModal';
import { UserSpaceModal } from './components/UserSpaceModal';
import { PartnershipPage } from './components/PartnershipPage';
import { AdminPage } from './components/AdminPage';
import { AdBannerSlot } from './components/AdBannerSlot';
import { AdNetworkBanners } from './components/AdNetworkBanners';
import { Footer } from './components/Footer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PushPromptBanner } from './components/PushPromptBanner';
import { tmdbService } from './services/tmdbService';
import {
  getEpisodePath,
  getMediaPath,
  getTabPath,
  parsePathname,
  ParsedRoute,
} from './utils/routing';
import { useSeoMeta } from './utils/seo';
import { getCurrentLang, getLocalizedPath, getSeoRouteCopy } from './utils/i18n';
import { Sparkles, Bookmark, Flame, Radio } from 'lucide-react';

const HOME_CATEGORIES: { label: string; genre: string; target: ActiveTab; isDirect?: boolean }[] = [
  { label: 'Tout', genre: 'Tous', target: 'home' },
  { label: 'Direct Live', genre: 'Tous', target: 'direct', isDirect: true },
  { label: 'Films Populaires', genre: 'Tous', target: 'movies' },
  { label: 'Séries TV', genre: 'Tous', target: 'series' },
  { label: 'Action', genre: 'Action', target: 'movies' },
  { label: 'Science-Fiction', genre: 'Science-Fiction', target: 'movies' },
  { label: 'Comédie', genre: 'Comédie', target: 'movies' },
  { label: 'Drame', genre: 'Drame', target: 'movies' },
  { label: 'Horreur', genre: 'Horreur', target: 'movies' },
  { label: 'Animation', genre: 'Animation', target: 'movies' },
  { label: 'Thriller', genre: 'Thriller', target: 'movies' },
];

export default function App() {
  const [route, setRoute] = useState<ParsedRoute>(() => parsePathname(window.location.pathname));
  const [selectedCatalogGenre, setSelectedCatalogGenre] = useState<string>('Tous');
  const [mediaList, setMediaList] = useState<MediaItem[]>(() => storageService.getMediaCatalog());
  const [user, setUser] = useState<UserProfile>(() => storageService.getUserProfile());

  // Overlay Modals
  const [activeMediaForPlayer, setActiveMediaForPlayer] = useState<MediaItem | null>(null);
  const [activeEpisodeForPlayer, setActiveEpisodeForPlayer] = useState<Episode | undefined>(undefined);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [userSpaceOpen, setUserSpaceOpen] = useState(false);
  const [userSpaceInitialTab, setUserSpaceInitialTab] = useState<'profile' | 'watchlist' | 'history'>('watchlist');

  // Sync browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setRoute(parsePathname(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToPath = useCallback((path: string) => {
    const cleanPath = (path.split('?')[0] || '/');
    const activeLang = getCurrentLang();
    const localized = getLocalizedPath(cleanPath, activeLang);
    const currentFull = `${window.location.pathname}${window.location.search}`;
    if (currentFull !== localized) {
      window.history.pushState({}, '', localized);
    }
    setRoute(parsePathname(cleanPath));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigateToTab = useCallback(
    (tab: ActiveTab, genre = 'Tous') => {
      setSelectedCatalogGenre(genre);
      navigateToPath(getTabPath(tab));
    },
    [navigateToPath]
  );

  const navigateToMedia = useCallback(
    (media: MediaItem) => {
      navigateToPath(getMediaPath(media));
    },
    [navigateToPath]
  );

  const navigateToEpisode = useCallback(
    (series: MediaItem, episode: Episode) => {
      navigateToPath(getEpisodePath(series, episode));
    },
    [navigateToPath]
  );

  // International SEO Meta for top-level list routes
  const activeLang = getCurrentLang();
  useSeoMeta(
    useMemo(() => {
      const copy = getSeoRouteCopy(route.tab, activeLang);
      return {
        title: copy.title,
        description: copy.description,
        path: getTabPath(route.tab),
        lang: activeLang,
      };
    }, [route.tab, activeLang])
  );

  // Load live TMDB catalog + server custom items on mount
  useEffect(() => {
    let isCancelled = false;
    const loadCatalog = async () => {
      try {
        const [trend, popM, nowPlaying, classics, popTv, classicTv, topRated, customRes, adsRes] =
          await Promise.all([
            tmdbService.getTrending('all'),
            tmdbService.getPopularMovies(),
            tmdbService.getNowPlayingMovies(),
            tmdbService.getClassicMovies(),
            tmdbService.getPopularTv(),
            tmdbService.getClassicTv(),
            tmdbService.getTopRatedMovies(),
            fetch('/api/catalog/custom').then((r) => (r.ok ? r.json() : { items: [] })).catch(() => ({ items: [] })),
            fetch('/api/ads').then((r) => (r.ok ? r.json() : { ads: null })).catch(() => ({ ads: null })),
          ]);

        if (isCancelled) return;
        if (Array.isArray(adsRes?.ads)) {
          storageService.saveAds(adsRes.ads);
        }
        const map = new Map<string, MediaItem>();

        if (Array.isArray(customRes.items)) {
          customRes.items.forEach((m: MediaItem) => map.set(String(m.id), m));
        }

        storageService
          .getMediaCatalog()
          .filter((m) => m.customAdded)
          .forEach((m) => {
            if (!map.has(String(m.id))) map.set(String(m.id), m);
          });

        [...trend, ...popM, ...nowPlaying, ...classics, ...popTv, ...classicTv, ...topRated].forEach(
          (item) => {
            if (!map.has(String(item.id))) {
              map.set(String(item.id), item);
            }
          }
        );

        const list = Array.from(map.values());
        if (list.length > 0 && !list.some((m) => m.isFeatured)) {
          list[0].isFeatured = true;
        }
        storageService.saveMediaCatalog(list);
        setMediaList(list);
      } catch (err) {
        console.error('Failed to auto-populate catalog:', err);
      }
    };

    loadCatalog();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Record unique session visitor & page view locally + on server
  useEffect(() => {
    const width = window.innerWidth;
    const device = width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
    const routePath = window.location.pathname || '/';

    if (route.tab !== 'admin') {
      try {
        if (!sessionStorage.getItem('streamora_session_counted')) {
          sessionStorage.setItem('streamora_session_counted', '1');
          fetch('/api/traffic/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'visitor', device, lang: activeLang }),
          }).catch(() => {});
        }
      } catch {
        // ignore storage restrictions
      }
    }

    storageService.recordPageView(route.tab);
    fetch('/api/traffic/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'pageview',
        route: routePath,
        lang: activeLang,
        device,
      }),
    }).catch(() => {});
  }, [route.tab, route.movieSlugOrId, route.seriesSlugOrId, route.episodeId, activeLang]);

  const refreshCatalog = useCallback(() => {
    setMediaList(storageService.getMediaCatalog());
  }, []);

  const refreshUser = useCallback(() => {
    setUser(storageService.getUserProfile());
  }, []);

  // Home Sections
  const featuredItems = useMemo(() => {
    const featured = mediaList.filter((m) => m.isFeatured);
    return featured.length > 0 ? featured : mediaList.slice(0, 4);
  }, [mediaList]);

  const trendingItems = useMemo(() => mediaList.filter((m) => m.isTrending), [mediaList]);
  const popularMovies = useMemo(
    () => mediaList.filter((m) => m.type === 'movie' && (m.votesCount || 0) > 2000),
    [mediaList]
  );
  const newReleases = useMemo(
    () => mediaList.filter((m) => m.releaseYear >= 2023 || m.isNew),
    [mediaList]
  );
  const classicFilms = useMemo(
    () => mediaList.filter((m) => m.type === 'movie' && (m.releaseYear < 2000 || m.isClassic)),
    [mediaList]
  );
  const popularSeries = useMemo(() => mediaList.filter((m) => m.type === 'tv'), [mediaList]);
  const topRatedItems = useMemo(() => mediaList.filter((m) => m.rating >= 8.3), [mediaList]);

  const handlePlayMedia = (media: MediaItem, episodeOrId?: Episode | string) => {
    setActiveMediaForPlayer(media);
    if (typeof episodeOrId === 'string') {
      let found: Episode | undefined;
      if (media.seasons) {
        for (const s of media.seasons) {
          found = s.episodes.find((e) => e.id === episodeOrId);
          if (found) break;
        }
      }
      setActiveEpisodeForPlayer(found);
    } else {
      setActiveEpisodeForPlayer(episodeOrId);
    }
    fetch('/api/traffic/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'stream', title: media.title }),
    }).catch(() => {});
  };

  const handleNextEpisode = () => {
    if (!activeMediaForPlayer || activeMediaForPlayer.type !== 'tv' || !activeMediaForPlayer.seasons) return;
    for (const s of activeMediaForPlayer.seasons) {
      if (activeEpisodeForPlayer && s.seasonNumber === activeEpisodeForPlayer.seasonNumber) {
        const nextEpIndex = s.episodes.findIndex((e) => e.id === activeEpisodeForPlayer.id) + 1;
        if (nextEpIndex < s.episodes.length) {
          setActiveEpisodeForPlayer(s.episodes[nextEpIndex]);
          return;
        }
      }
    }
  };

  const handlePlayDirectChannel = (channel: LiveStreamChannel) => {
    const channelMedia: MediaItem = {
      id: `channel-${channel.id}`,
      title: channel.name,
      originalTitle: channel.name,
      type: 'movie',
      releaseYear: new Date().getFullYear(),
      releaseDate: new Date().toISOString().split('T')[0],
      rating: 9.8,
      genres: ['Direct TV', channel.category],
      duration: 'Direct 24/7',
      country: 'Live',
      language: 'Direct',
      cast: [],
      synopsis: channel.description || 'Flux vidéo direct STREAMORA.',
      poster: channel.logo || '/images/fallback-poster.jpg',
      backdrop: channel.logo || '/images/fallback-backdrop.jpg',
      videoUrl: channel.streamUrl,
      trailerUrl: '',
      isFeatured: false,
    };
    handlePlayMedia(channelMedia);
  };

  const handleOpenUserSpace = (tab: 'profile' | 'watchlist' | 'history' = 'watchlist') => {
    setUserSpaceInitialTab(tab);
    setUserSpaceOpen(true);
  };

  const isPrivateAdmin = route.tab === 'admin';

  return (
    <div className="min-h-screen bg-[#08070d] text-[#f3f3f7] flex flex-col font-sans selection:bg-purple-600 selection:text-white overflow-x-hidden">
      {!isPrivateAdmin && <AdBannerSlot placement="header_bar" />}

      {!isPrivateAdmin && (
        <Navbar
          activeTab={route.tab}
          onNavigate={(tab) => navigateToTab(tab)}
          onOpenSearch={() => setSearchModalOpen(true)}
          onOpenUserSpace={handleOpenUserSpace}
          user={user}
          isProfileOpen={userSpaceOpen}
        />
      )}

      <OfflineIndicator />

      <main className="flex-1">
        {/* HOME VIEW (MovieBox Layout + Mobile-First) */}
        {route.tab === 'home' && (
          <div className="space-y-4">
            <HeroBanner
              featuredItems={featuredItems}
              onPlay={handlePlayMedia}
              onOpenDetails={navigateToMedia}
              onOpenDirect={() => navigateToTab('direct')}
              onWatchlistChange={refreshUser}
            />

            {/* MovieBox-style Horizontal Category Strip */}
            <section aria-label="Catégories rapides" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                {HOME_CATEGORIES.map((cat) => (
                  <button
                    key={cat.label}
                    onClick={() => navigateToTab(cat.target, cat.genre)}
                    className={`px-4 min-h-[40px] rounded-xl border text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1.5 ${
                      cat.isDirect
                        ? 'bg-rose-500/15 hover:bg-rose-600 border-rose-500/35 text-rose-200 hover:text-white'
                        : 'bg-[#141122] hover:bg-purple-600 border-white/8 hover:border-purple-500 text-zinc-200 hover:text-white'
                    }`}
                  >
                    {cat.isDirect && <Radio className="w-3.5 h-3.5 text-rose-400" />}
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Discreet Sub-Hero Ad Placement */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <AdBannerSlot placement="sub_hero" />
            </div>

            {/* Resume Watching */}
            {user.history.length > 0 && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-[#12101e] border border-purple-900/35 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-300 flex items-center justify-center shrink-0">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] text-zinc-400 uppercase font-semibold block">
                        Reprendre
                      </span>
                      <h3 className="text-sm font-bold text-white truncate">{user.history[0].title}</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const media = mediaList.find(
                        (m) => String(m.id) === String(user.history[0].mediaId)
                      );
                      if (media) navigateToMedia(media);
                    }}
                    className="px-4 min-h-[40px] bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shrink-0"
                  >
                    Ouvrir
                  </button>
                </div>
              </div>
            )}

            <MediaRow
              title="Tendances du moment"
              subtitle="Les titres les plus recherchés aujourd’hui"
              items={trendingItems}
              onOpenDetails={navigateToMedia}
              onWatchlistChange={refreshUser}
              onSeeAll={() => navigateToTab('movies')}
            />

            <MediaRow
              title="Films populaires"
              subtitle="Succès du box-office et incontournables"
              items={popularMovies}
              onOpenDetails={navigateToMedia}
              onWatchlistChange={refreshUser}
              onSeeAll={() => navigateToTab('movies')}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <AdBannerSlot placement="in_feed" />
            </div>

            <MediaRow
              title="Nouveautés"
              subtitle="Sorties récentes cinéma et plateformes"
              items={newReleases}
              onOpenDetails={navigateToMedia}
              onWatchlistChange={refreshUser}
              onSeeAll={() => navigateToTab('news')}
            />

            <MediaRow
              title="Séries populaires"
              subtitle="Saisons et épisodes avec liens directs"
              items={popularSeries}
              onOpenDetails={navigateToMedia}
              onWatchlistChange={refreshUser}
              onSeeAll={() => navigateToTab('series')}
            />

            <MediaRow
              title="Grands classiques du cinéma"
              subtitle="Chefs-d’œuvre intemporels et patrimoine"
              items={classicFilms}
              onOpenDetails={navigateToMedia}
              onWatchlistChange={refreshUser}
              onSeeAll={() => navigateToTab('movies')}
            />

            <MediaRow
              title="Les mieux notés"
              subtitle="Acclamés par la critique et le public"
              items={topRatedItems}
              onOpenDetails={navigateToMedia}
              onWatchlistChange={refreshUser}
            />
          </div>
        )}

        {/* MOVIES CATALOG */}
        {route.tab === 'movies' && (
          <CatalogView
            type="movie"
            allMedia={mediaList}
            initialGenre={selectedCatalogGenre}
            onOpenDetails={navigateToMedia}
            onWatchlistChange={refreshUser}
          />
        )}

        {/* SERIES CATALOG */}
        {route.tab === 'series' && (
          <CatalogView
            type="tv"
            allMedia={mediaList}
            initialGenre={selectedCatalogGenre}
            onOpenDetails={navigateToMedia}
            onWatchlistChange={refreshUser}
          />
        )}

        {/* NEWS */}
        {route.tab === 'news' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Nouveautés</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
                Dernières Sorties Films &amp; Séries
              </h1>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {newReleases.map((item) => (
                <MediaCard
                  key={item.id}
                  media={item}
                  onOpenDetails={navigateToMedia}
                  onWatchlistChange={refreshUser}
                />
              ))}
            </div>
          </div>
        )}

        {/* WATCHLIST */}
        {route.tab === 'watchlist' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark className="w-4 h-4" />
                <span>Favoris</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
                Ma Liste
              </h1>
            </div>
            {mediaList.filter((m) => user.watchlist.some((id) => String(id) === String(m.id))).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {mediaList
                  .filter((m) => user.watchlist.some((id) => String(id) === String(m.id)))
                  .map((item) => (
                    <MediaCard
                      key={item.id}
                      media={item}
                      onOpenDetails={navigateToMedia}
                      onWatchlistChange={refreshUser}
                    />
                  ))}
              </div>
            ) : (
              <div className="py-16 text-center bg-[#110f1c] rounded-2xl border border-white/6 space-y-3">
                <Bookmark className="w-10 h-10 text-zinc-600 mx-auto" />
                <p className="text-sm font-semibold text-white">Votre liste est vide</p>
                <button
                  onClick={() => navigateToTab('home')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl"
                >
                  Explorer le catalogue
                </button>
              </div>
            )}
          </div>
        )}

        {/* DIRECT */}
        {route.tab === 'direct' && <LiveDirectView onPlayDirectStream={handlePlayDirectChannel} />}

        {/* PARTNERSHIP & ADVERTISING PAGE */}
        {route.tab === 'partenariat' && <PartnershipPage />}

        {/* DIRECT DETAIL PAGES (/movie/:id, /series/:id, /episode/:id) */}
        {route.tab === 'movie' && route.movieSlugOrId && (
          <MediaDetailPage
            mode="movie"
            param={route.movieSlugOrId}
            allMedia={mediaList}
            onBackHome={() => navigateToTab('home')}
            onNavigateMedia={navigateToMedia}
            onNavigateEpisode={navigateToEpisode}
            onPlay={handlePlayMedia}
            onWatchlistChange={refreshUser}
          />
        )}

        {route.tab === 'series_detail' && route.seriesSlugOrId && (
          <MediaDetailPage
            mode="series"
            param={route.seriesSlugOrId}
            allMedia={mediaList}
            onBackHome={() => navigateToTab('home')}
            onNavigateMedia={navigateToMedia}
            onNavigateEpisode={navigateToEpisode}
            onPlay={handlePlayMedia}
            onWatchlistChange={refreshUser}
          />
        )}

        {route.tab === 'episode' && route.episodeId && (
          <MediaDetailPage
            mode="episode"
            param={route.episodeId}
            allMedia={mediaList}
            onBackHome={() => navigateToTab('home')}
            onNavigateMedia={navigateToMedia}
            onNavigateEpisode={navigateToEpisode}
            onPlay={handlePlayMedia}
            onWatchlistChange={refreshUser}
          />
        )}

        {/* PRIVATE ADMIN ROUTE (/admin ONLY) */}
        {route.tab === 'admin' && (
          <AdminPage
            mediaList={mediaList}
            onRefreshMedia={refreshCatalog}
            onExitAdmin={() => navigateToTab('home')}
          />
        )}
      </main>

      {!isPrivateAdmin && route.tab !== 'partenariat' && (
        <AdNetworkBanners onOpenPartnership={() => navigateToTab('partenariat')} />
      )}
      {!isPrivateAdmin && <Footer onNavigate={(tab) => navigateToTab(tab)} />}
      {!isPrivateAdmin && <PushPromptBanner />}

      {/* Video Player Overlay */}
      {activeMediaForPlayer && (
        <VideoPlayer
          media={activeMediaForPlayer}
          currentEpisode={activeEpisodeForPlayer}
          onClose={() => {
            setActiveMediaForPlayer(null);
            setActiveEpisodeForPlayer(undefined);
            refreshUser();
          }}
          onNextEpisode={handleNextEpisode}
        />
      )}

      {/* Search Overlay */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        allMedia={mediaList}
        onSelectMedia={navigateToMedia}
      />

      {/* Personal Watchlist / History / Push Preferences Modal */}
      <UserSpaceModal
        isOpen={userSpaceOpen}
        onClose={() => {
          setUserSpaceOpen(false);
          refreshUser();
        }}
        allMedia={mediaList}
        onPlay={handlePlayMedia}
        onOpenDetails={navigateToMedia}
        initialTab={userSpaceInitialTab}
      />
    </div>
  );
}
