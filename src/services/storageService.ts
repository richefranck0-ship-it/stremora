import { MediaItem, AdBanner, TrafficStats, UserProfile, UserHistoryItem, ContentReport, LiveStreamChannel } from '../types';
import { INITIAL_MEDIA, INITIAL_ADS, INITIAL_TRAFFIC_STATS, INITIAL_LIVE_CHANNELS } from '../data/mockData';

const STORAGE_KEYS = {
  MEDIA: 'streamora_media_catalog_v1',
  ADS: 'streamora_ads_v1',
  TRAFFIC: 'streamora_traffic_v2',
  USER: 'streamora_current_user_v1',
  WATCHLIST: 'streamora_watchlist_v1',
  HISTORY: 'streamora_watch_history_v1',
  REPORTS: 'streamora_reports_v1',
  TMDB_KEY: 'streamora_tmdb_key_v1',
  LIVE_CHANNELS: 'streamora_live_channels_v1',
};

const DEFAULT_USER: UserProfile = {
  id: 'usr_default_cinema',
  username: 'Cinéphile',
  email: 'spectateur@streamora.tv',
  avatar: '/images/app-icon.png',
  role: 'user',
  joinedDate: '2026-01-10',
  watchlist: ['dune-2', 'oppenheimer', 'breaking-bad'],
  history: [
    {
      mediaId: 'dune-2',
      title: 'Dune : Deuxième Partie',
      poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
      timestamp: 3420,
      duration: 9960,
      progressPercent: 34,
      lastWatched: 'Hier',
      type: 'movie',
    },
    {
      mediaId: 'breaking-bad',
      episodeId: 'bb-s1-e1',
      title: 'Breaking Bad - S1:E1',
      poster: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
      timestamp: 1850,
      duration: 3480,
      progressPercent: 53,
      lastWatched: 'Il y a 3 jours',
      type: 'tv',
      seasonNumber: 1,
      episodeNumber: 1,
    }
  ]
};

export const storageService = {
  // --- MEDIA CATALOG ---
  getMediaCatalog(): MediaItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEDIA);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(INITIAL_MEDIA));
        return INITIAL_MEDIA;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_MEDIA;
    }
  },

  saveMediaCatalog(media: MediaItem[]): void {
    localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(media));
  },

  addMediaItem(item: MediaItem): void {
    const list = this.getMediaCatalog();
    list.unshift({ ...item, customAdded: true });
    this.saveMediaCatalog(list);
  },

  updateMediaItem(updatedItem: MediaItem): void {
    const list = this.getMediaCatalog().map(item => item.id === updatedItem.id ? updatedItem : item);
    this.saveMediaCatalog(list);
  },

  deleteMediaItem(id: string | number): void {
    const list = this.getMediaCatalog().filter(item => item.id !== id);
    this.saveMediaCatalog(list);
  },

  toggleFeatured(id: string | number): void {
    const list = this.getMediaCatalog().map(item => {
      if (item.id === id) {
        return { ...item, isFeatured: !item.isFeatured };
      }
      return item;
    });
    this.saveMediaCatalog(list);
  },

  // --- ADVERTISING BANNERS ---
  getAds(): AdBanner[] {
    const legacyDemoIds = new Set([
      'ad-nordvpn',
      'ad-projector-video',
      'ad-headphones',
      'ad-sub-hero',
      'ad-direct-sponsor',
      'ad-footer-regie',
    ]);
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ADS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.ADS, JSON.stringify(INITIAL_ADS));
        return INITIAL_ADS;
      }
      const parsed: AdBanner[] = JSON.parse(data);
      const cleaned = Array.isArray(parsed)
        ? parsed.filter((ad) => !legacyDemoIds.has(ad.id))
        : INITIAL_ADS;
      if (cleaned.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
        localStorage.setItem(STORAGE_KEYS.ADS, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return INITIAL_ADS;
    }
  },

  saveAds(ads: AdBanner[]): void {
    localStorage.setItem(STORAGE_KEYS.ADS, JSON.stringify(ads));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('streamora-ads-updated'));
    }
  },

  addAd(ad: Omit<AdBanner, 'id' | 'impressions' | 'clicks'>): AdBanner {
    const newAd: AdBanner = {
      ...ad,
      id: `ad_${Date.now()}`,
      impressions: 0,
      clicks: 0,
    };
    const current = this.getAds();
    current.unshift(newAd);
    this.saveAds(current);
    return newAd;
  },

  updateAd(updatedAd: AdBanner): void {
    const list = this.getAds().map(ad => ad.id === updatedAd.id ? updatedAd : ad);
    this.saveAds(list);
  },

  deleteAd(id: string): void {
    const list = this.getAds().filter(ad => ad.id !== id);
    this.saveAds(list);
  },

  recordAdImpression(id: string): void {
    const list = this.getAds().map(ad => {
      if (ad.id === id) {
        return { ...ad, impressions: (ad.impressions || 0) + 1 };
      }
      return ad;
    });
    this.saveAds(list);
  },

  recordAdClick(id: string): void {
    const list = this.getAds().map(ad => {
      if (ad.id === id) {
        return { ...ad, clicks: (ad.clicks || 0) + 1 };
      }
      return ad;
    });
    this.saveAds(list);
  },

  // --- TRAFFIC & SITE METRICS ---
  getTrafficStats(): TrafficStats {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRAFFIC);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.TRAFFIC, JSON.stringify(INITIAL_TRAFFIC_STATS));
        return INITIAL_TRAFFIC_STATS;
      }
      const parsed = JSON.parse(data);
      if (parsed.totalVisitors >= 10000) {
        return this.resetTrafficStats();
      }
      return parsed;
    } catch {
      return INITIAL_TRAFFIC_STATS;
    }
  },

  resetTrafficStats(): TrafficStats {
    const zeroStats: TrafficStats = {
      totalVisitors: 0,
      pageViews: 0,
      streamsStarted: 0,
      totalWatchHours: 0,
      topTitles: [],
      dailyViews: [],
      devices: { mobile: 0, tablet: 0, desktop: 0 },
      languages: {},
      topRoutes: [],
    };
    try {
      localStorage.setItem(STORAGE_KEYS.TRAFFIC, JSON.stringify(zeroStats));
      localStorage.removeItem('streamora_traffic_v1');
    } catch {
      // ignore
    }
    return zeroStats;
  },

  recordPageView(pageName: string): void {
    try {
      const stats = this.getTrafficStats();
      stats.pageViews += 1;
      localStorage.setItem(STORAGE_KEYS.TRAFFIC, JSON.stringify(stats));
    } catch {
      // ignore
    }
  },

  recordStreamStarted(title: string): void {
    try {
      const stats = this.getTrafficStats();
      stats.streamsStarted += 1;
      const existing = stats.topTitles.find(t => t.title.toLowerCase() === title.toLowerCase());
      if (existing) {
        existing.views += 1;
      } else {
        stats.topTitles.unshift({ title, views: 1 });
        if (stats.topTitles.length > 8) stats.topTitles.pop();
      }
      localStorage.setItem(STORAGE_KEYS.TRAFFIC, JSON.stringify(stats));
    } catch {
      // ignore
    }
  },

  // --- USER PROFILE & AUTH ---
  getUserProfile(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEFAULT_USER));
        return DEFAULT_USER;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_USER;
    }
  },

  saveUserProfile(profile: UserProfile): void {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
  },

  toggleWatchlist(mediaId: string | number): boolean {
    const user = this.getUserProfile();
    const index = user.watchlist.findIndex(id => String(id) === String(mediaId));
    let isAdded = false;
    if (index >= 0) {
      user.watchlist.splice(index, 1);
      isAdded = false;
    } else {
      user.watchlist.unshift(mediaId);
      isAdded = true;
    }
    this.saveUserProfile(user);
    return isAdded;
  },

  isInWatchlist(mediaId: string | number): boolean {
    const user = this.getUserProfile();
    return user.watchlist.some(id => String(id) === String(mediaId));
  },

  updateWatchProgress(historyItem: UserHistoryItem): void {
    const user = this.getUserProfile();
    const existingIndex = user.history.findIndex(
      h => String(h.mediaId) === String(historyItem.mediaId) && h.episodeId === historyItem.episodeId
    );
    if (existingIndex >= 0) {
      user.history[existingIndex] = historyItem;
    } else {
      user.history.unshift(historyItem);
    }
    // keep maximum 20 items in history
    if (user.history.length > 20) {
      user.history = user.history.slice(0, 20);
    }
    this.saveUserProfile(user);
  },

  removeHistoryItem(mediaId: string | number, episodeId?: string): void {
    const user = this.getUserProfile();
    user.history = user.history.filter(
      h => !(String(h.mediaId) === String(mediaId) && (!episodeId || h.episodeId === episodeId))
    );
    this.saveUserProfile(user);
  },

  // --- CONTENT REPORTS ---
  getReports(): ContentReport[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
      if (!data) return [
        {
          id: 'rep_1',
          mediaId: 'dune-2',
          mediaTitle: 'Dune : Deuxième Partie',
          reason: 'broken_video',
          comment: 'Le sous-titre français avait un petit décalage de 2 secondes au début.',
          createdAt: '2026-11-10',
          status: 'pending'
        }
      ];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  addReport(report: Omit<ContentReport, 'id' | 'createdAt' | 'status'>): void {
    const reports = this.getReports();
    reports.unshift({
      ...report,
      id: `rep_${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'pending'
    });
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  },

  resolveReport(id: string): void {
    const reports = this.getReports().map(r => r.id === id ? { ...r, status: 'resolved' as const } : r);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  },

  // --- TMDB API KEY ---
  getTmdbKey(): string {
    return localStorage.getItem(STORAGE_KEYS.TMDB_KEY) || (import.meta as any).env?.VITE_TMDB_API_KEY || '';
  },

  setTmdbKey(key: string): void {
    localStorage.setItem(STORAGE_KEYS.TMDB_KEY, key.trim());
  },

  // --- LIVE DIRECT STREAMS & FLUX MP4 / HLS ---
  getLiveChannels(): LiveStreamChannel[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LIVE_CHANNELS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.LIVE_CHANNELS, JSON.stringify([]));
        return [];
      }
      const parsed: LiveStreamChannel[] = JSON.parse(data);
      // Purge any dummy test items (id starting with 'live-' like live-cinema-247)
      const cleaned = parsed.filter(c => c.customAdded || !c.id.startsWith('live-'));
      if (cleaned.length !== parsed.length) {
        this.saveLiveChannels(cleaned);
      }
      return cleaned;
    } catch {
      return [];
    }
  },

  saveLiveChannels(channels: LiveStreamChannel[]): void {
    localStorage.setItem(STORAGE_KEYS.LIVE_CHANNELS, JSON.stringify(channels));
  },

  addLiveChannel(channel: Omit<LiveStreamChannel, 'id' | 'viewersCount'>): LiveStreamChannel {
    const newChan: LiveStreamChannel = {
      ...channel,
      id: `live_${Date.now()}`,
      viewersCount: Math.floor(Math.random() * 1200) + 300,
      customAdded: true,
    };
    const current = this.getLiveChannels();
    current.unshift(newChan);
    this.saveLiveChannels(current);
    return newChan;
  },

  deleteLiveChannel(id: string): void {
    const list = this.getLiveChannels().filter(c => c.id !== id);
    this.saveLiveChannels(list);
  }
};
