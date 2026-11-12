import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Key, Lock, Plus, Trash2, Edit3, Star, BarChart3,
  Megaphone, Film, ExternalLink, Check, AlertCircle, RefreshCw, Eye,
  MousePointerClick, Radio, RotateCcw, Bell, Send, LogOut, ArrowLeft, Tv, Users,
  Smartphone, Monitor, Tablet, Globe, Mail, Download, Copy
} from 'lucide-react';
import {
  MediaItem, AdBanner, TrafficStats, ContentReport, AdPlacement,
  LiveStreamChannel, PushNotificationHistoryItem, PartnershipInquiry, Season, AppConfig
} from '../types';
import { storageService } from '../services/storageService';
import { tmdbService } from '../services/tmdbService';
import { getMediaPath } from '../utils/routing';
import { useSeoMeta } from '../utils/seo';

interface AdminPageProps {
  mediaList: MediaItem[];
  onRefreshMedia: () => void;
  onExitAdmin: () => void;
}

type AdminTab =
  | 'content'
  | 'direct'
  | 'ads'
  | 'apk'
  | 'push'
  | 'traffic'
  | 'reports'
  | 'tmdb'
  | 'security';

export const AdminPage: React.FC<AdminPageProps> = ({
  mediaList,
  onRefreshMedia,
  onExitAdmin,
}) => {
  useSeoMeta({
    title: 'Administration — STREAMORA',
    description: 'Interface d’administration privée STREAMORA.',
    path: '/admin',
    noindex: true,
  });

  const [checkingSession, setCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('content');
  const [isSyncingTmdb, setIsSyncingTmdb] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Security password change
  const [currentPwInput, setCurrentPwInput] = useState('');
  const [newPwInput, setNewPwInput] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Content & Episode Management
  const [showMediaForm, setShowMediaForm] = useState(false);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [mediaFormData, setMediaFormData] = useState({
    title: '',
    originalTitle: '',
    type: 'movie' as 'movie' | 'tv',
    releaseYear: new Date().getFullYear(),
    rating: 8.0,
    genres: 'Action, Science-Fiction',
    duration: '2h 10m',
    country: 'France / International',
    director: '',
    synopsis: '',
    poster: '/images/fallback-poster.jpg',
    backdrop: '/images/fallback-backdrop.jpg',
    videoUrl: '',
    trailerUrl: '',
  });
  const [episodeEditorMedia, setEpisodeEditorMedia] = useState<MediaItem | null>(null);
  const [newEpForm, setNewEpForm] = useState({
    seasonNumber: 1,
    episodeNumber: 1,
    title: '',
    duration: '45 min',
    synopsis: '',
    thumbnail: '/images/fallback-backdrop.jpg',
    videoUrl: '',
  });

  // Live direct streams
  const [liveChannels, setLiveChannels] = useState<LiveStreamChannel[]>(() => storageService.getLiveChannels());
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [channelForm, setChannelForm] = useState({
    name: '',
    category: 'Cinéma & Fiction',
    streamUrl: '',
    format: 'mp4' as 'mp4' | 'hls' | 'youtube',
    description: '',
    qualityBadge: '1080p FHD',
  });

  // Ads & Partnerships
  const [ads, setAds] = useState<AdBanner[]>(() => storageService.getAds());
  const [showAdForm, setShowAdForm] = useState(false);
  const [adForm, setAdForm] = useState({
    clientName: '',
    title: '',
    description: '',
    mediaType: 'html' as 'image' | 'video' | 'html',
    mediaUrl: '/images/partnership-hero.jpg',
    imageUrl: '/images/partnership-hero.jpg',
    htmlCode: '',
    targetUrl: '',
    placement: 'in_feed' as AdPlacement,
    badgeText: 'Publicité',
  });
  const [partnerships, setPartnerships] = useState<PartnershipInquiry[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig>({
    apkUrl: '',
    apkVersion: '1.0',
    apkLabel: "Télécharger l'APK",
    apkEnabled: true,
    apkDownloads: 0,
    ownerNotificationEmail: '',
    ownerNotificationWebhook: '',
    adsTxtContent: '',
    adNetworkHeadCode: '',
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Push Notifications
  const [pushEnabled, setPushEnabled] = useState(true);
  const [vapidFromEnv, setVapidFromEnv] = useState(false);
  const [notifyOnAdd, setNotifyOnAdd] = useState(true);
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [pushHistory, setPushHistory] = useState<PushNotificationHistoryItem[]>([]);
  const [pushTotals, setPushTotals] = useState({ campaigns: 0, delivered: 0, failed: 0 });
  const [pushForm, setPushForm] = useState({
    title: '',
    message: '',
    image: '',
    link: '/',
    sound: true,
  });
  const [isSendingPush, setIsSendingPush] = useState(false);
  const [pushResultMsg, setPushResultMsg] = useState<string | null>(null);

  // Traffic & Reports & TMDB
  const [stats, setStats] = useState<TrafficStats>(() => storageService.getTrafficStats());
  const [reports, setReports] = useState<ContentReport[]>(() => storageService.getReports());
  const [tmdbKeyInput, setTmdbKeyInput] = useState(() => storageService.getTmdbKey());
  const [tmdbTestResult, setTmdbTestResult] = useState<string | null>(null);
  const [isTestingTmdb, setIsTestingTmdb] = useState(false);

  const loadAdminServerData = useCallback(async () => {
    try {
      const [pushRes, partRes, trafficRes, configRes] = await Promise.all([
        fetch('/api/admin/push'),
        fetch('/api/admin/partnerships'),
        fetch('/api/traffic'),
        fetch('/api/admin/app-config'),
      ]);
      if (pushRes.ok) {
        const pushData = await pushRes.json();
        setPushEnabled(Boolean(pushData.enabled));
        setVapidFromEnv(Boolean(pushData.vapidFromEnv));
        setSubscribersCount(Number(pushData.subscribersCount || 0));
        setPushHistory(Array.isArray(pushData.history) ? pushData.history : []);
        if (pushData.totals) setPushTotals(pushData.totals);
      }
      if (partRes.ok) {
        const partData = await partRes.json();
        setPartnerships(Array.isArray(partData.items) ? partData.items : []);
      }
      if (trafficRes.ok) {
        const tData = await trafficRes.json();
        if (tData.traffic) {
          setStats((prev) => ({ ...prev, ...tData.traffic }));
        }
      }
      if (configRes.ok) {
        const cData = await configRes.json();
        if (cData.config) {
          setAppConfig(cData.config);
        }
      }
    } catch {
      // ignore offline
    }
  }, []);

  const handleSaveAppConfig = async (e?: React.FormEvent, successText = 'Paramètres enregistrés avec succès.') => {
    if (e) e.preventDefault();
    setIsSavingConfig(true);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appConfig),
      });
      const data = await res.json();
      if (res.ok && data.config) {
        setAppConfig(data.config);
        window.dispatchEvent(new Event('streamora-config-updated'));
        setStatusBanner(successText);
      } else {
        setStatusBanner(data.error || 'Erreur lors de la sauvegarde.');
      }
    } catch {
      setStatusBanner('Erreur réseau lors de la sauvegarde.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  useEffect(() => {
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((data) => {
        setIsAuthenticated(Boolean(data.authenticated));
        setIsConfigured(Boolean(data.configured));
        if (data.authenticated) {
          loadAdminServerData();
        }
      })
      .catch(() => {})
      .finally(() => setCheckingSession(false));
  }, [loadAdminServerData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentification refusée.');
        return;
      }
      setIsAuthenticated(true);
      setPasswordInput('');
      loadAdminServerData();
    } catch {
      setAuthError('Erreur réseau lors de la connexion administrateur.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    setIsAuthenticated(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwInput, newPassword: newPwInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwMsg({ ok: false, text: data.error || 'Erreur.' });
      } else {
        setPwMsg({ ok: true, text: data.message });
        setCurrentPwInput('');
        setNewPwInput('');
      }
    } catch {
      setPwMsg({ ok: false, text: 'Erreur serveur.' });
    }
  };

  const syncAdsToServer = async (updatedAds: AdBanner[]) => {
    try {
      await fetch('/api/admin/ads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ads: updatedAds }),
      });
    } catch {
      // ignore
    }
  };

  const handleSyncFromTmdb = async () => {
    setIsSyncingTmdb(true);
    setStatusBanner(null);
    try {
      const [trend, popM, popTv, classics, classicTv] = await Promise.all([
        tmdbService.getTrending('all'),
        tmdbService.getPopularMovies(),
        tmdbService.getPopularTv(),
        tmdbService.getClassicMovies(),
        tmdbService.getClassicTv(),
      ]);
      const combined = [...trend, ...popM, ...popTv, ...classics, ...classicTv];
      const map = new Map<string, MediaItem>();
      mediaList.filter((m) => m.customAdded).forEach((m) => map.set(String(m.id), m));
      combined.forEach((m) => {
        if (!map.has(String(m.id))) map.set(String(m.id), m);
      });
      const updated = Array.from(map.values());
      storageService.saveMediaCatalog(updated);
      onRefreshMedia();
      setStatusBanner(`${updated.length} titres synchronisés depuis l’API TMDB.`);
    } catch {
      setStatusBanner('Erreur lors de la synchronisation TMDB.');
    } finally {
      setIsSyncingTmdb(false);
    }
  };

  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    const genresArray = mediaFormData.genres.split(',').map((g) => g.trim()).filter(Boolean);
    let savedItem: MediaItem;

    if (editingMedia) {
      savedItem = {
        ...editingMedia,
        ...mediaFormData,
        genres: genresArray,
      };
      storageService.updateMediaItem(savedItem);
    } else {
      savedItem = {
        id: `custom_${Date.now()}`,
        ...mediaFormData,
        releaseDate: `${mediaFormData.releaseYear}-01-01`,
        language: 'Français / VOSTFR',
        genres: genresArray,
        cast: [],
        customAdded: true,
        seasons:
          mediaFormData.type === 'tv'
            ? [{ seasonNumber: 1, title: 'Saison 1', episodesCount: 0, episodes: [] }]
            : undefined,
      };
      storageService.addMediaItem(savedItem);
    }

    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: savedItem,
          notifySubscribers: !editingMedia && notifyOnAdd,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.pushReport?.entry) {
          setStatusBanner(
            `« ${savedItem.title} » ajouté — notification push envoyée (${data.pushReport.entry.deliveredCount}/${data.pushReport.entry.targetedCount} abonné(s)).`
          );
          loadAdminServerData();
        } else if (!editingMedia) {
          setStatusBanner(`« ${savedItem.title} » ajouté au catalogue.`);
        }
      }
    } catch {
      // ignore
    }

    onRefreshMedia();
    setShowMediaForm(false);
    setEditingMedia(null);
  };

  const handleDeleteMedia = async (id: string | number) => {
    storageService.deleteMediaItem(id);
    await fetch(`/api/admin/catalog/${encodeURIComponent(String(id))}`, { method: 'DELETE' }).catch(() => {});
    onRefreshMedia();
  };

  const handleAddEpisodeToSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!episodeEditorMedia || !newEpForm.title.trim()) return;

    const existingSeasons: Season[] = episodeEditorMedia.seasons ? [...episodeEditorMedia.seasons] : [];
    let season = existingSeasons.find((s) => s.seasonNumber === Number(newEpForm.seasonNumber));
    if (!season) {
      season = {
        seasonNumber: Number(newEpForm.seasonNumber),
        title: `Saison ${newEpForm.seasonNumber}`,
        episodesCount: 0,
        episodes: [],
      };
      existingSeasons.push(season);
      existingSeasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
    }

    const epId = `ep-${episodeEditorMedia.tmdbId || episodeEditorMedia.id}-${newEpForm.seasonNumber}-${newEpForm.episodeNumber}`;
    season.episodes = [
      ...season.episodes.filter((ep) => ep.episodeNumber !== Number(newEpForm.episodeNumber)),
      {
        id: epId,
        seasonNumber: Number(newEpForm.seasonNumber),
        episodeNumber: Number(newEpForm.episodeNumber),
        title: newEpForm.title.trim(),
        synopsis: newEpForm.synopsis.trim() || 'Épisode disponible sur STREAMORA.',
        duration: newEpForm.duration.trim() || '45 min',
        thumbnail: newEpForm.thumbnail.trim() || '/images/fallback-backdrop.jpg',
        videoUrl: newEpForm.videoUrl.trim(),
      },
    ].sort((a, b) => a.episodeNumber - b.episodeNumber);
    season.episodesCount = season.episodes.length;

    const updatedSeries: MediaItem = {
      ...episodeEditorMedia,
      customAdded: true,
      seasons: existingSeasons,
      duration: `${existingSeasons.length} Saison${existingSeasons.length > 1 ? 's' : ''}`,
    };

    storageService.updateMediaItem(updatedSeries);
    await fetch('/api/admin/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: updatedSeries }),
    }).catch(() => {});

    setEpisodeEditorMedia(updatedSeries);
    onRefreshMedia();
    setNewEpForm((prev) => ({
      ...prev,
      episodeNumber: prev.episodeNumber + 1,
      title: '',
      synopsis: '',
    }));
  };

  const handleTogglePushSystem = async () => {
    const res = await fetch('/api/admin/push/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !pushEnabled }),
    });
    if (res.ok) {
      const data = await res.json();
      setPushEnabled(Boolean(data.enabled));
    }
  };

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingPush(true);
    setPushResultMsg(null);
    try {
      const res = await fetch('/api/admin/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pushForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setPushResultMsg(data.error || 'Erreur lors de l’envoi.');
        return;
      }
      setPushResultMsg(
        `Notification diffusée : ${data.entry.deliveredCount} délivrée(s), ${data.entry.failedCount} échec(s) (${data.cleanedExpired} expirée(s) nettoyée(s)).`
      );
      setPushForm({ title: '', message: '', image: '', link: '/', sound: true });
      loadAdminServerData();
    } catch {
      setPushResultMsg('Erreur réseau lors de la diffusion push.');
    } finally {
      setIsSendingPush(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-xs text-zinc-400">
        Vérification de la session administrateur...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-[#12101e] border border-purple-800/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-300">
            <Lock className="w-7 h-7" />
          </div>

          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-extrabold text-white font-heading">
              Administration Privée
            </h1>
            <p className="text-xs text-zinc-400">
              Authentification serveur requise pour accéder au panneau de gestion STREAMORA.
            </p>
          </div>

          {!isConfigured && (
            <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs leading-relaxed">
              La variable d’environnement serveur <code>ADMIN_PASSWORD</code> n’est pas encore définie. Configurez-la dans <code>.env</code> ou les secrets du serveur puis redémarrez.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Mot de passe administrateur
              </label>
              <input
                type="password"
                autoFocus
                required
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setAuthError(null);
                }}
                className="w-full bg-[#090810] border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
              />
              {authError && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{authError}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExitAdmin}
                className="flex-1 min-h-[44px] rounded-xl bg-white/6 hover:bg-white/12 text-zinc-300 text-xs font-semibold"
              >
                Retour au site
              </button>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="flex-1 min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold"
              >
                {isLoggingIn ? 'Connexion...' : 'Se connecter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 text-zinc-200">
      {/* Header */}
      <div className="bg-[#141124] border border-purple-900/40 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600 text-white">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white font-heading">
              Administration STREAMORA
            </h1>
            <p className="text-xs text-zinc-400">
              Catalogue, épisodes, régie publicitaire, notifications push Web et sécurité.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onExitAdmin}
            className="px-3.5 min-h-[38px] rounded-xl bg-white/8 hover:bg-white/15 text-xs font-medium text-zinc-200 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voir le site</span>
          </button>
          <button
            onClick={handleSyncFromTmdb}
            disabled={isSyncingTmdb}
            className="px-3.5 min-h-[38px] rounded-xl bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTmdb ? 'animate-spin' : ''}`} />
            <span>Sync TMDB</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 min-h-[38px] rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-200 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs py-2.5 px-4 rounded-xl flex items-center justify-between">
          <span>{statusBanner}</span>
          <button onClick={() => setStatusBanner(null)} className="text-zinc-300 hover:text-white">
            Fermer
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-white/10 overflow-x-auto scrollbar-none text-xs font-medium">
        {[
          { id: 'content' as AdminTab, label: `Films & Séries (${mediaList.length})`, icon: Film },
          { id: 'direct' as AdminTab, label: `Direct (${liveChannels.length})`, icon: Radio },
          {
            id: 'ads' as AdminTab,
            label: `Régies & Pubs (${ads.length}${partnerships.filter((p) => p.status === 'new').length > 0 ? ` · ${partnerships.filter((p) => p.status === 'new').length} dem.` : ''})`,
            icon: Megaphone,
          },
          { id: 'apk' as AdminTab, label: `APK Android (${appConfig.apkDownloads})`, icon: Smartphone },
          { id: 'push' as AdminTab, label: `Notifications Push (${subscribersCount})`, icon: Bell },
          { id: 'traffic' as AdminTab, label: 'Analytique & SEO', icon: BarChart3 },
          { id: 'reports' as AdminTab, label: `Signalements (${reports.filter((r) => r.status === 'pending').length})`, icon: AlertCircle },
          { id: 'tmdb' as AdminTab, label: 'API TMDB', icon: Key },
          { id: 'security' as AdminTab, label: 'Sécurité', icon: Lock },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === id
                ? 'border-purple-500 text-white font-semibold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5 text-purple-400" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: FILMS, SERIES & EPISODES */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white">Gestion du catalogue, saisons &amp; épisodes</h2>
            <button
              onClick={() => {
                setEditingMedia(null);
                setMediaFormData({
                  title: '',
                  originalTitle: '',
                  type: 'movie',
                  releaseYear: new Date().getFullYear(),
                  rating: 8.0,
                  genres: 'Action, Science-Fiction',
                  duration: '2h 10m',
                  country: 'France / International',
                  director: '',
                  synopsis: '',
                  poster: '/images/fallback-poster.jpg',
                  backdrop: '/images/fallback-backdrop.jpg',
                  videoUrl: '',
                  trailerUrl: '',
                });
                setShowMediaForm(true);
              }}
              className="px-4 min-h-[40px] bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un film ou une série</span>
            </button>
          </div>

          <div className="space-y-2">
            {mediaList.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#12101d] border border-white/6"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.poster || '/images/fallback-poster.jpg'}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-10 h-14 object-cover rounded shrink-0 bg-black"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-purple-300">
                        {item.type === 'movie' ? 'Film' : 'Série'}
                      </span>
                      <h3 className="text-sm font-semibold text-white truncate">{item.title}</h3>
                    </div>
                    <p className="text-xs text-zinc-400 truncate">
                      {item.releaseYear} · {item.duration} · {getMediaPath(item)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  {item.type === 'tv' && (
                    <button
                      onClick={() => setEpisodeEditorMedia(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 text-xs font-medium flex items-center gap-1"
                    >
                      <Tv className="w-3.5 h-3.5" />
                      <span>Épisodes</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      storageService.toggleFeatured(item.id);
                      onRefreshMedia();
                    }}
                    className={`p-2 rounded-lg border ${
                      item.isFeatured
                        ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                        : 'bg-white/5 border-white/10 text-zinc-400'
                    }`}
                    title="Mettre à la une"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingMedia(item);
                      setMediaFormData({
                        title: item.title,
                        originalTitle: item.originalTitle || item.title,
                        type: item.type,
                        releaseYear: item.releaseYear,
                        rating: item.rating,
                        genres: item.genres.join(', '),
                        duration: item.duration,
                        country: item.country,
                        director: item.director || '',
                        synopsis: item.synopsis,
                        poster: item.poster,
                        backdrop: item.backdrop,
                        videoUrl: item.videoUrl,
                        trailerUrl: item.trailerUrl,
                      });
                      setShowMediaForm(true);
                    }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/12 text-zinc-200 border border-white/10"
                    title="Modifier"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMedia(item.id)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-red-950/50 text-zinc-400 hover:text-red-300 border border-white/10"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: DIRECT STREAMS */}
      {activeTab === 'direct' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Chaînes &amp; Flux Directs</h2>
            <button
              onClick={() => setShowChannelForm(true)}
              className="px-4 min-h-[40px] bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un flux</span>
            </button>
          </div>
          {liveChannels.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[#12101d] border border-white/6">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                <p className="text-xs font-mono text-zinc-400 truncate">{c.streamUrl}</p>
              </div>
              <button
                onClick={async () => {
                  storageService.deleteLiveChannel(c.id);
                  await fetch(`/api/admin/live-channels/${encodeURIComponent(c.id)}`, { method: 'DELETE' }).catch(() => {});
                  setLiveChannels(storageService.getLiveChannels());
                }}
                className="p-2 rounded-lg bg-white/5 hover:bg-red-950/50 text-zinc-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: REGIES PUBLICITAIRES, BANNIERES & DEMANDES RECUES */}
      {activeTab === 'ads' && (
        <div className="space-y-8">
          {/* Global Ad Network Settings (Head code, ads.txt & Owner Inbox Email/Webhook) */}
          <form
            onSubmit={(e) => handleSaveAppConfig(e, 'Configuration régies publicitaires et réception e-mail enregistrée.')}
            className="bg-[#12101d] border border-purple-900/35 rounded-2xl p-5 sm:p-6 space-y-4 text-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-emerald-300">
                  Régies Publicitaires (AdSense, Adsterra, Monetag) &amp; Réception directe chez vous
                </h2>
                <p className="text-zinc-400 mt-0.5">
                  Configurez l’e-mail qui reçoit les demandes d’affichage, le fichier <code>/ads.txt</code> et le script global <code>&lt;head&gt;</code> de vos régies.
                </p>
              </div>
              <button
                type="submit"
                disabled={isSavingConfig}
                className="px-4 min-h-[38px] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shrink-0"
              >
                {isSavingConfig ? 'Enregistrement...' : 'Sauvegarder la configuration'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">
                  Votre e-mail de réception des demandes pub (affiché &amp; alertes)
                </label>
                <input
                  type="email"
                  placeholder="richefranck0@gmail.com"
                  value={appConfig.ownerNotificationEmail}
                  onChange={(e) => setAppConfig({ ...appConfig, ownerNotificationEmail: e.target.value })}
                  className="w-full bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">
                  Webhook instantané optionnel (Discord / Slack / Make / n8n)
                </label>
                <input
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={appConfig.ownerNotificationWebhook || ''}
                  onChange={(e) => setAppConfig({ ...appConfig, ownerNotificationWebhook: e.target.value })}
                  className="w-full bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">
                  Script global &lt;head&gt; des régies (ex: Google AdSense Auto Ads / validation)
                </label>
                <textarea
                  rows={3}
                  placeholder={'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXX" crossorigin="anonymous"></script>'}
                  value={appConfig.adNetworkHeadCode}
                  onChange={(e) => setAppConfig({ ...appConfig, adNetworkHeadCode: e.target.value })}
                  className="w-full bg-[#090810] border border-white/12 rounded-xl p-2.5 text-emerald-300 font-mono"
                />
              </div>
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">
                  Contenu officiel du fichier <code>/ads.txt</code>
                </label>
                <textarea
                  rows={3}
                  placeholder={'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0'}
                  value={appConfig.adsTxtContent}
                  onChange={(e) => setAppConfig({ ...appConfig, adsTxtContent: e.target.value })}
                  className="w-full bg-[#090810] border border-white/12 rounded-xl p-2.5 text-purple-200 font-mono"
                />
              </div>
            </div>
          </form>

          {/* Banners & Ad Units */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white">Bannières &amp; Emplacements Régies</h2>
                <p className="text-xs text-zinc-400">
                  Collez un code HTML/Script officiel (AdSense, Adsterra, Monetag) ou publiez une bannière sponsor directe.
                </p>
              </div>
              <button
                onClick={() => setShowAdForm(true)}
                className="px-4 min-h-[40px] bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une régie / bannière</span>
              </button>
            </div>

            {ads.length === 0 ? (
              <p className="text-xs text-zinc-400 bg-[#12101d] p-4 rounded-xl border border-white/6">
                Aucune régie active pour le moment — les emplacements bannières affichent des zones réservables sur le site. Cliquez sur « Ajouter une régie / bannière » pour insérer vos codes.
              </p>
            ) : (
              <div className="space-y-3">
                {ads.map((ad) => (
                  <div
                    key={ad.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#12101d] border border-white/6"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {ad.imageUrl && (
                        <img
                          src={ad.imageUrl}
                          alt={ad.title}
                          className="w-16 h-12 object-cover rounded-lg shrink-0 border border-white/10"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`font-bold uppercase text-[10px] ${ad.isActive ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {ad.isActive ? 'Active' : 'Pause'}
                          </span>
                          <span className="text-purple-300 font-semibold">{ad.clientName}</span>
                          <span className="text-zinc-500">· {ad.placement}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-white truncate">{ad.title}</h3>
                        {ad.targetUrl && (
                          <a href={ad.targetUrl} target="_blank" rel="noreferrer" className="text-xs text-zinc-400 hover:text-purple-300 flex items-center gap-1 truncate">
                            <span>{ad.targetUrl}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center text-xs">
                      <div className="text-right text-zinc-400">
                        <div><Eye className="w-3 h-3 inline mr-1" />{ad.impressions}</div>
                        <div><MousePointerClick className="w-3 h-3 inline mr-1" />{ad.clicks}</div>
                      </div>
                      <button
                        onClick={() => {
                          storageService.updateAd({ ...ad, isActive: !ad.isActive });
                          const next = storageService.getAds();
                          setAds(next);
                          syncAdsToServer(next);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-white font-medium"
                      >
                        {ad.isActive ? 'Pause' : 'Activer'}
                      </button>
                      <button
                        onClick={() => {
                          storageService.deleteAd(ad.id);
                          const next = storageService.getAds();
                          setAds(next);
                          syncAdsToServer(next);
                        }}
                        className="p-2 rounded-lg bg-white/5 hover:bg-red-950/50 text-zinc-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Partnership Inquiries Inbox */}
          <div className="space-y-3 pt-6 border-t border-white/8">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Boîte de réception — Demandes d’affichage pub ({partnerships.length})</span>
            </h2>
            {partnerships.length === 0 ? (
              <p className="text-xs text-zinc-400 bg-[#12101d] p-4 rounded-xl border border-white/6">
                Aucune demande reçue pour le moment via la page /partenariat.
              </p>
            ) : (
              <div className="space-y-2.5">
                {partnerships.map((p) => (
                  <div key={p.id} className="p-4 rounded-xl bg-[#12101d] border border-white/8 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <strong className="text-sm text-white">{p.companyName}</strong>
                        <span className="text-zinc-400 ml-2">({p.contactName} · {p.email})</span>
                        <span className="text-zinc-500 ml-2 text-[11px]">
                          {new Date(p.createdAt).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`mailto:${p.email}?subject=${encodeURIComponent(`Re: Demande publicitaire STREAMORA — ${p.companyName}`)}`}
                          className="px-2.5 py-1 rounded-lg bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 font-semibold inline-flex items-center gap-1"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Répondre</span>
                        </a>
                        <button
                          onClick={() => navigator.clipboard?.writeText(p.email)}
                          className="p-1.5 rounded-lg bg-white/6 hover:bg-white/12 text-zinc-300"
                          title="Copier l'e-mail"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={async () => {
                            const nextStatus = p.status === 'new' ? 'reviewed' : 'new';
                            await fetch(`/api/admin/partnerships/${p.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: nextStatus }),
                            });
                            loadAdminServerData();
                          }}
                          className={`px-2.5 py-1 rounded-lg font-semibold ${
                            p.status === 'reviewed'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {p.status === 'reviewed' ? 'Traité' : 'Nouvelle demande'}
                        </button>
                        <button
                          onClick={async () => {
                            await fetch(`/api/admin/partnerships/${p.id}`, { method: 'DELETE' });
                            loadAdminServerData();
                          }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-950/50 text-zinc-400 hover:text-red-300"
                          title="Supprimer la demande"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {p.placementInterest && (
                      <p className="text-purple-300">Format demandé : {p.placementInterest}</p>
                    )}
                    <p className="text-zinc-200 leading-relaxed bg-black/25 p-3 rounded-lg border border-white/5">
                      {p.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: APK ANDROID & API DOWNLOAD LINK */}
      {activeTab === 'apk' && (
        <div className="space-y-6 max-w-2xl">
          <form
            onSubmit={(e) => handleSaveAppConfig(e, 'Lien APK Android mis à jour sur le site et l’API.')}
            className="bg-[#12101d] border border-emerald-500/30 rounded-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white font-heading">
                    Téléchargement Application Android (.apk)
                  </h2>
                  <p className="text-zinc-400">
                    Définissez le lien direct vers votre fichier APK (hébergé sur GitHub Releases, Drive, CDN ou serveur).
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase text-zinc-400 block">Téléchargements</span>
                <span className="text-xl font-extrabold text-emerald-400 tabular-nums">{appConfig.apkDownloads}</span>
              </div>
            </div>

            <div>
              <label className="text-zinc-300 font-semibold block mb-1">
                URL de téléchargement APK (API /api/app-config) *
              </label>
              <input
                type="url"
                placeholder="https://github.com/.../releases/latest/download/streamora.apk"
                value={appConfig.apkUrl}
                onChange={(e) => setAppConfig({ ...appConfig, apkUrl: e.target.value })}
                className="w-full bg-[#090810] border border-white/12 rounded-xl p-3 text-emerald-300 font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Libellé du bouton</label>
                <input
                  type="text"
                  placeholder="Télécharger l'APK"
                  value={appConfig.apkLabel}
                  onChange={(e) => setAppConfig({ ...appConfig, apkLabel: e.target.value })}
                  className="w-full bg-[#090810] border border-white/12 rounded-xl p-3 text-white"
                />
              </div>
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Version affichée</label>
                <input
                  type="text"
                  placeholder="1.0"
                  value={appConfig.apkVersion}
                  onChange={(e) => setAppConfig({ ...appConfig, apkVersion: e.target.value })}
                  className="w-full bg-[#090810] border border-white/12 rounded-xl p-3 text-white font-mono"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-zinc-200 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={appConfig.apkEnabled}
                onChange={(e) => setAppConfig({ ...appConfig, apkEnabled: e.target.checked })}
                className="accent-emerald-500 w-4 h-4"
              />
              <span>Afficher le bouton « Télécharger l’APK » dans la barre de navigation et le pied de page</span>
            </label>

            <div className="pt-2 flex items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-zinc-500">
                API : GET /api/app-config · PUT /api/admin/app-config
              </span>
              <button
                type="submit"
                disabled={isSavingConfig}
                className="px-5 min-h-[42px] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl"
              >
                {isSavingConfig ? 'Enregistrement...' : 'Enregistrer le lien APK'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS PUSH (WEB PUSH + VAPID) */}
      {activeTab === 'push' && (
        <div className="space-y-6">
          {/* Stats & Global Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-[#12101d] p-4 rounded-2xl border border-white/8">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold">Abonnés actifs</span>
              <p className="text-2xl font-extrabold text-white mt-1 tabular-nums">{subscribersCount}</p>
            </div>
            <div className="bg-[#12101d] p-4 rounded-2xl border border-white/8">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold">Campagnes envoyées</span>
              <p className="text-2xl font-extrabold text-purple-400 mt-1 tabular-nums">{pushTotals.campaigns}</p>
            </div>
            <div className="bg-[#12101d] p-4 rounded-2xl border border-white/8">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold">Envois réussis</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1 tabular-nums">{pushTotals.delivered}</p>
            </div>
            <div className="bg-[#12101d] p-4 rounded-2xl border border-white/8 flex flex-col justify-between">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold">Système Push</span>
              <button
                onClick={handleTogglePushSystem}
                className={`mt-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  pushEnabled
                    ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/40'
                    : 'bg-zinc-800 text-zinc-300 border border-white/10'
                }`}
              >
                {pushEnabled ? 'Activé (Cliquer pour couper)' : 'Désactivé (Activer)'}
              </button>
            </div>
          </div>

          {/* VAPID Environment Status & Auto-Notification Banner */}
          <div className="bg-[#12101d] border border-white/8 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="space-y-0.5">
              <p className="font-semibold text-white">
                {vapidFromEnv
                  ? 'Clés VAPID chargées depuis les variables d’environnement serveur'
                  : 'Clés VAPID actives (persistantes côté serveur · surchargeables via VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)'}
              </p>
              <p className="text-zinc-400">
                Chaque nouveau film ou série ajouté depuis le catalogue envoie automatiquement une notification push aux abonnés.
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 w-fit ${
                vapidFromEnv
                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                  : 'bg-purple-950/70 text-purple-200 border border-purple-500/30'
              }`}
            >
              {vapidFromEnv ? 'ENV VAPID actif' : 'VAPID auto-généré'}
            </span>
          </div>

          {/* Send Push Campaign Form */}
          <form onSubmit={handleSendPush} className="bg-[#12101d] border border-purple-900/35 rounded-2xl p-5 sm:p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white font-heading flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-400" />
                <span>Envoyer une notification push aux abonnés</span>
              </h2>
            </div>

            {pushResultMsg && (
              <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-100">
                {pushResultMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Titre *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nouveau film disponible : Dune 2"
                  value={pushForm.title}
                  onChange={(e) => setPushForm({ ...pushForm, title: e.target.value })}
                  className="w-full bg-[#090810] border border-white/12 rounded-xl p-3 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">
                  Lien de destination (ouvre le contenu au clic)
                </label>
                <input
                  type="text"
                  placeholder="/movie/693134 ou /series/1396"
                  value={pushForm.link}
                  onChange={(e) => setPushForm({ ...pushForm, link: e.target.value })}
                  className="w-full bg-[#090810] border border-white/12 rounded-xl p-3 text-white font-mono text-xs"
                />
              </div>
            </div>

            {/* Quick link presets from catalog */}
            {mediaList.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-zinc-500 shrink-0">Raccourcis :</span>
                {mediaList.slice(0, 6).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      setPushForm({
                        ...pushForm,
                        link: getMediaPath(m),
                        image: m.backdrop || m.poster,
                        title: pushForm.title || `À découvrir : ${m.title}`,
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-white/6 hover:bg-purple-600/30 text-zinc-200 whitespace-nowrap"
                  >
                    {m.title}
                  </button>
                ))}
              </div>
            )}

            <div>
              <label className="text-zinc-300 font-semibold block mb-1">Message *</label>
              <textarea
                rows={3}
                required
                placeholder="Ex: Regardez la fiche complète et la bande-annonce dès maintenant sur STREAMORA."
                value={pushForm.message}
                onChange={(e) => setPushForm({ ...pushForm, message: e.target.value })}
                className="w-full bg-[#090810] border border-white/12 rounded-xl p-3 text-white text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Image optionnelle (URL bannière)</label>
                <input
                  type="url"
                  placeholder="https://image.tmdb.org/t/p/w1280/..."
                  value={pushForm.image}
                  onChange={(e) => setPushForm({ ...pushForm, image: e.target.value })}
                  className="w-full bg-[#090810] border border-white/12 rounded-xl p-3 text-white font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pushForm.sound}
                    onChange={(e) => setPushForm({ ...pushForm, sound: e.target.checked })}
                    className="accent-purple-500 w-4 h-4"
                  />
                  <span>Activer la notification sonore</span>
                </label>

                <button
                  type="submit"
                  disabled={isSendingPush || !pushEnabled}
                  className="px-5 min-h-[44px] bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSendingPush ? 'Envoi...' : 'Diffuser'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Push Send History */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Historique des notifications envoyées</h3>
            {pushHistory.length === 0 ? (
              <p className="text-xs text-zinc-400 bg-[#12101d] p-4 rounded-xl border border-white/6">
                Aucune notification push envoyée pour l’instant.
              </p>
            ) : (
              <div className="space-y-2">
                {pushHistory.map((h) => (
                  <div key={h.id} className="p-3.5 rounded-xl bg-[#12101d] border border-white/6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{h.title}</p>
                      <p className="text-zinc-400 line-clamp-1">{h.message}</p>
                      <span className="text-[11px] font-mono text-purple-300">{h.link}</span>
                    </div>
                    <div className="text-right shrink-0 text-zinc-400">
                      <div className="text-emerald-400 font-semibold">
                        {h.deliveredCount} / {h.targetedCount} délivrée(s)
                      </div>
                      <div className="text-[11px]">{new Date(h.sentAt).toLocaleString('fr-FR')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: ANALYTIQUE & AUDIENCE */}
      {activeTab === 'traffic' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white font-heading">
                Analytique, Audience &amp; SEO International
              </h2>
              <p className="text-xs text-zinc-400">
                Suivi temps réel des visiteurs, appareils, langues indexées et performances du catalogue.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadAdminServerData}
                className="px-3.5 py-2 rounded-xl bg-white/6 hover:bg-white/12 text-zinc-200 border border-white/10 text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Actualiser</span>
              </button>
              <button
                onClick={async () => {
                  const res = await fetch('/api/admin/traffic/reset', { method: 'POST' }).catch(() => null);
                  const zero = storageService.resetTrafficStats();
                  if (res && res.ok) {
                    const data = await res.json();
                    setStats(data.traffic || zero);
                  } else {
                    setStats(zero);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-200 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Remettre à zéro</span>
              </button>
            </div>
          </div>

          {/* Primary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-[#12101d] p-4 rounded-2xl border border-white/8">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold">Visiteurs uniques</span>
              <p className="text-2xl font-extrabold text-white mt-1 tabular-nums">{stats.totalVisitors}</p>
            </div>
            <div className="bg-[#12101d] p-4 rounded-2xl border border-white/8">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold">Pages vues</span>
              <p className="text-2xl font-extrabold text-purple-400 mt-1 tabular-nums">{stats.pageViews}</p>
            </div>
            <div className="bg-[#12101d] p-4 rounded-2xl border border-white/8">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold">Lectures vidéo</span>
              <p className="text-2xl font-extrabold text-amber-300 mt-1 tabular-nums">{stats.streamsStarted}</p>
            </div>
            <div className="bg-[#12101d] p-4 rounded-2xl border border-white/8">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold">Abonnés Push</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1 tabular-nums">{subscribersCount}</p>
            </div>
            <div className="bg-[#12101d] p-4 rounded-2xl border border-white/8 col-span-2 lg:col-span-1">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold">Clics / Imp. Pubs</span>
              <p className="text-2xl font-extrabold text-sky-300 mt-1 tabular-nums">
                {ads.reduce((acc, a) => acc + (a.clicks || 0), 0)} / {ads.reduce((acc, a) => acc + (a.impressions || 0), 0)}
              </p>
            </div>
          </div>

          {/* 14-Day Daily Activity Chart + Device Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-[#12101d] p-5 rounded-2xl border border-white/8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  <span>Activité des 14 derniers jours</span>
                </h3>
                <span className="text-[11px] text-zinc-400">Pages vues / Visiteurs</span>
              </div>

              {(!stats.dailyViews || stats.dailyViews.length === 0) ? (
                <div className="h-40 flex items-center justify-center text-xs text-zinc-500 border border-dashed border-white/10 rounded-xl">
                  Aucune donnée quotidienne enregistrée pour le moment.
                </div>
              ) : (
                <div className="h-44 flex items-end gap-2 pt-4">
                  {stats.dailyViews.map((day) => {
                    const maxViews = Math.max(1, ...stats.dailyViews.map((d) => d.views));
                    const heightPct = Math.max(8, Math.round((day.views / maxViews) * 100));
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-mono text-zinc-300">{day.views}</span>
                        <div className="w-full max-w-[28px] h-28 bg-white/5 rounded-t-lg flex items-end overflow-hidden">
                          <div
                            className="w-full bg-gradient-to-t from-purple-700 to-purple-400 rounded-t-lg transition-all"
                            style={{ height: `${heightPct}%` }}
                            title={`${day.date} : ${day.views} vues, ${day.visitors} visiteurs`}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500 truncate max-w-full">
                          {day.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Device Breakdown */}
            <div className="bg-[#12101d] p-5 rounded-2xl border border-white/8 space-y-4">
              <h3 className="text-sm font-bold text-white">Appareils utilisés</h3>
              {(() => {
                const mobile = stats.devices?.mobile || 0;
                const tablet = stats.devices?.tablet || 0;
                const desktop = stats.devices?.desktop || 0;
                const total = Math.max(1, mobile + tablet + desktop);
                const rows = [
                  { label: 'Mobile (Android / iPhone)', count: mobile, icon: Smartphone, color: 'bg-purple-500' },
                  { label: 'Ordinateur', count: desktop, icon: Monitor, color: 'bg-sky-500' },
                  { label: 'Tablette', count: tablet, icon: Tablet, color: 'bg-emerald-500' },
                ];
                return (
                  <div className="space-y-3.5">
                    {rows.map(({ label, count, icon: Icon, color }) => {
                      const pct = mobile + tablet + desktop > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={label} className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-zinc-300">
                            <span className="flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 text-zinc-400" />
                              <span>{label}</span>
                            </span>
                            <span className="font-mono text-white font-semibold">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* International Languages + Top Pages + Top Titles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#12101d] p-5 rounded-2xl border border-white/8 space-y-3 text-xs">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span>Audience SEO Internationale</span>
              </h3>
              {Object.keys(stats.languages || {}).length === 0 ? (
                <p className="text-zinc-500">En attente des premières visites multilingues.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(stats.languages || {})
                    .sort((a, b) => Number(b[1]) - Number(a[1]))
                    .map(([code, count]) => (
                      <div key={code} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/4">
                        <span className="font-semibold uppercase text-purple-300">{code}</span>
                        <span className="font-mono text-white">{count} vues</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="bg-[#12101d] p-5 rounded-2xl border border-white/8 space-y-3 text-xs">
              <h3 className="text-sm font-bold text-white">Pages les plus consultées</h3>
              {(!stats.topRoutes || stats.topRoutes.length === 0) ? (
                <p className="text-zinc-500">Aucune route enregistrée pour l’instant.</p>
              ) : (
                <div className="space-y-2">
                  {stats.topRoutes.map((r) => (
                    <div key={r.path} className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-white/4">
                      <span className="font-mono text-zinc-200 truncate">{r.path}</span>
                      <span className="font-mono text-purple-300 shrink-0">{r.views}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#12101d] p-5 rounded-2xl border border-white/8 space-y-3 text-xs">
              <h3 className="text-sm font-bold text-white">Titres les plus lus</h3>
              {(!stats.topTitles || stats.topTitles.length === 0) ? (
                <p className="text-zinc-500">Aucune lecture lancée pour l’instant.</p>
              ) : (
                <div className="space-y-2">
                  {stats.topTitles.map((t) => (
                    <div key={t.title} className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-white/4">
                      <span className="text-zinc-200 truncate font-medium">{t.title}</span>
                      <span className="font-mono text-amber-300 shrink-0">{t.views}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white">Signalements utilisateurs</h2>
          {reports.map((rep) => (
            <div key={rep.id} className="p-4 rounded-xl bg-[#12101d] border border-white/6 flex items-center justify-between gap-4 text-xs">
              <div>
                <p className="font-bold text-white">{rep.mediaTitle}</p>
                <p className="text-zinc-400 mt-0.5">{rep.comment}</p>
              </div>
              {rep.status === 'pending' ? (
                <button
                  onClick={() => {
                    storageService.resolveReport(rep.id);
                    setReports(storageService.getReports());
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Résoudre</span>
                </button>
              ) : (
                <span className="text-emerald-400 font-semibold">Résolu</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 7: TMDB CONFIG */}
      {activeTab === 'tmdb' && (
        <div className="bg-[#12101d] border border-white/8 rounded-2xl p-6 max-w-xl space-y-4 text-xs">
          <h2 className="text-sm font-bold text-white">Clé API TMDB v3</h2>
          <input
            type="text"
            value={tmdbKeyInput}
            onChange={(e) => setTmdbKeyInput(e.target.value)}
            placeholder="Clé API TMDB..."
            className="w-full bg-[#090810] border border-white/12 rounded-xl p-3 text-white font-mono"
          />
          <button
            disabled={isTestingTmdb}
            onClick={async () => {
              storageService.setTmdbKey(tmdbKeyInput);
              setIsTestingTmdb(true);
              try {
                const res = await fetch(
                  `https://api.themoviedb.org/3/movie/popular?api_key=${tmdbKeyInput.trim()}&language=fr-FR&page=1`
                );
                setTmdbTestResult(res.ok ? 'Connexion TMDB valide.' : `Erreur HTTP ${res.status}`);
              } catch {
                setTmdbTestResult('Erreur réseau TMDB.');
              } finally {
                setIsTestingTmdb(false);
              }
            }}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl"
          >
            Tester &amp; Enregistrer
          </button>
          {tmdbTestResult && <p className="text-purple-300">{tmdbTestResult}</p>}
        </div>
      )}

      {/* TAB 8: SECURITY */}
      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="bg-[#12101d] border border-white/8 rounded-2xl p-6 max-w-md space-y-4 text-xs">
          <h2 className="text-sm font-bold text-white">Modifier le mot de passe administrateur</h2>
          <div>
            <label className="text-zinc-400 block mb-1">Mot de passe actuel</label>
            <input
              type="password"
              required
              value={currentPwInput}
              onChange={(e) => setCurrentPwInput(e.target.value)}
              className="w-full bg-[#090810] border border-white/12 rounded-xl p-3 text-white"
            />
          </div>
          <div>
            <label className="text-zinc-400 block mb-1">Nouveau mot de passe (min. 8 caractères)</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPwInput}
              onChange={(e) => setNewPwInput(e.target.value)}
              className="w-full bg-[#090810] border border-white/12 rounded-xl p-3 text-white"
            />
          </div>
          {pwMsg && (
            <p className={pwMsg.ok ? 'text-emerald-400' : 'text-red-400'}>{pwMsg.text}</p>
          )}
          <button
            type="submit"
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl"
          >
            Mettre à jour
          </button>
        </form>
      )}

      {/* MODAL: ADD / EDIT MEDIA */}
      {showMediaForm && (
        <div
          onClick={() => setShowMediaForm(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveMedia}
            className="w-full max-w-xl bg-[#141124] border border-purple-500/40 rounded-2xl p-6 space-y-3 text-xs my-auto"
          >
            <h3 className="text-base font-bold text-white">
              {editingMedia ? 'Modifier le titre' : 'Ajouter un film ou une série'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Titre"
                value={mediaFormData.title}
                onChange={(e) => setMediaFormData({ ...mediaFormData, title: e.target.value })}
                className="bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white"
              />
              <select
                value={mediaFormData.type}
                onChange={(e: any) => setMediaFormData({ ...mediaFormData, type: e.target.value })}
                className="bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white"
              >
                <option value="movie">Film</option>
                <option value="tv">Série</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                placeholder="Année"
                value={mediaFormData.releaseYear}
                onChange={(e) => setMediaFormData({ ...mediaFormData, releaseYear: Number(e.target.value) })}
                className="bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white"
              />
              <input
                type="text"
                placeholder="Durée"
                value={mediaFormData.duration}
                onChange={(e) => setMediaFormData({ ...mediaFormData, duration: e.target.value })}
                className="bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white"
              />
              <input
                type="text"
                placeholder="Genres"
                value={mediaFormData.genres}
                onChange={(e) => setMediaFormData({ ...mediaFormData, genres: e.target.value })}
                className="bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white"
              />
            </div>
            <textarea
              rows={3}
              required
              placeholder="Synopsis..."
              value={mediaFormData.synopsis}
              onChange={(e) => setMediaFormData({ ...mediaFormData, synopsis: e.target.value })}
              className="w-full bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white"
            />
            <input
              type="text"
              placeholder="URL Affiche (poster)"
              value={mediaFormData.poster}
              onChange={(e) => setMediaFormData({ ...mediaFormData, poster: e.target.value })}
              className="w-full bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white font-mono"
            />
            <input
              type="text"
              placeholder="URL Bande-annonce YouTube Embed (optionnel)"
              value={mediaFormData.trailerUrl}
              onChange={(e) => setMediaFormData({ ...mediaFormData, trailerUrl: e.target.value })}
              className="w-full bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white font-mono"
            />
            <input
              type="text"
              placeholder="URL Vidéo MP4/HLS légale (optionnel)"
              value={mediaFormData.videoUrl}
              onChange={(e) => setMediaFormData({ ...mediaFormData, videoUrl: e.target.value })}
              className="w-full bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white font-mono"
            />
            {!editingMedia && (
              <label className="flex items-center gap-2 text-zinc-200 bg-purple-950/30 border border-purple-500/25 rounded-xl p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnAdd}
                  onChange={(e) => setNotifyOnAdd(e.target.checked)}
                  className="accent-purple-500 w-4 h-4"
                />
                <span>Notifier automatiquement les abonnés par Push Web lors de l’ajout</span>
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowMediaForm(false)} className="px-4 py-2 bg-white/8 rounded-xl">
                Annuler
              </button>
              <button type="submit" className="px-5 py-2 bg-purple-600 text-white font-bold rounded-xl">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: SERIES EPISODE EDITOR */}
      {episodeEditorMedia && (
        <div
          onClick={() => setEpisodeEditorMedia(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#141124] border border-purple-500/40 rounded-2xl p-6 space-y-4 text-xs my-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Épisodes de {episodeEditorMedia.title}
              </h3>
              <button onClick={() => setEpisodeEditorMedia(null)} className="text-zinc-400 hover:text-white">
                Fermer
              </button>
            </div>

            <form onSubmit={handleAddEpisodeToSeries} className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#090810] p-4 rounded-xl border border-white/8">
              <input
                type="number"
                min={1}
                placeholder="Saison"
                value={newEpForm.seasonNumber}
                onChange={(e) => setNewEpForm({ ...newEpForm, seasonNumber: Number(e.target.value) })}
                className="bg-[#141124] border border-white/10 rounded-lg p-2 text-white"
              />
              <input
                type="number"
                min={1}
                placeholder="Épisode"
                value={newEpForm.episodeNumber}
                onChange={(e) => setNewEpForm({ ...newEpForm, episodeNumber: Number(e.target.value) })}
                className="bg-[#141124] border border-white/10 rounded-lg p-2 text-white"
              />
              <input
                type="text"
                required
                placeholder="Titre épisode"
                value={newEpForm.title}
                onChange={(e) => setNewEpForm({ ...newEpForm, title: e.target.value })}
                className="col-span-2 bg-[#141124] border border-white/10 rounded-lg p-2 text-white"
              />
              <input
                type="text"
                placeholder="URL Vidéo MP4/HLS (optionnel)"
                value={newEpForm.videoUrl}
                onChange={(e) => setNewEpForm({ ...newEpForm, videoUrl: e.target.value })}
                className="col-span-2 sm:col-span-3 bg-[#141124] border border-white/10 rounded-lg p-2 text-white font-mono"
              />
              <button type="submit" className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg">
                Ajouter
              </button>
            </form>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {(episodeEditorMedia.seasons || []).flatMap((s) =>
                s.episodes.map((ep) => (
                  <div key={ep.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5">
                    <span>
                      <strong className="text-purple-300">S{ep.seasonNumber}E{ep.episodeNumber}</strong> — {ep.title}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">/episode/{ep.id}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD CHANNEL */}
      {showChannelForm && (
        <div
          onClick={() => setShowChannelForm(false)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              const created = storageService.addLiveChannel({
                ...channelForm,
                logo: '/images/app-icon.png',
                isLive: true,
              });
              await fetch('/api/live-channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel: created }),
              }).catch(() => {});
              setLiveChannels(storageService.getLiveChannels());
              setShowChannelForm(false);
            }}
            className="w-full max-w-md bg-[#141124] border border-purple-500/40 rounded-2xl p-6 space-y-3 text-xs"
          >
            <h3 className="text-base font-bold text-white">Nouveau flux direct</h3>
            <input
              type="text"
              required
              placeholder="Nom du flux"
              value={channelForm.name}
              onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
              className="w-full bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white"
            />
            <input
              type="url"
              required
              placeholder="https://.../stream.mp4"
              value={channelForm.streamUrl}
              onChange={(e) => setChannelForm({ ...channelForm, streamUrl: e.target.value })}
              className="w-full bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white font-mono"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowChannelForm(false)} className="px-4 py-2 bg-white/8 rounded-xl">
                Annuler
              </button>
              <button type="submit" className="px-5 py-2 bg-purple-600 text-white font-bold rounded-xl">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD AD */}
      {showAdForm && (
        <div
          onClick={() => setShowAdForm(false)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              storageService.addAd({
                ...adForm,
                mediaUrl: adForm.mediaType === 'html' ? '' : adForm.mediaUrl,
                imageUrl: adForm.mediaType === 'html' ? '' : adForm.imageUrl,
                isActive: true,
                startDate: new Date().toISOString().split('T')[0],
                endDate: '2028-12-31',
              });
              const next = storageService.getAds();
              setAds(next);
              syncAdsToServer(next);
              setShowAdForm(false);
            }}
            className="w-full max-w-lg bg-[#141124] border border-purple-500/40 rounded-2xl p-6 space-y-3 text-xs"
          >
            <h3 className="text-base font-bold text-white">Connecter une Régie ou Publicité</h3>
            <input
              type="text"
              required
              placeholder="Régie ou Annonceur (ex: AdSense, Adsterra, Sponsor)"
              value={adForm.clientName}
              onChange={(e) => setAdForm({ ...adForm, clientName: e.target.value })}
              className="w-full bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white"
            />
            <input
              type="text"
              required
              placeholder="Nom interne de l'emplacement"
              value={adForm.title}
              onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
              className="w-full bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={adForm.mediaType}
                onChange={(e: any) => setAdForm({ ...adForm, mediaType: e.target.value })}
                className="bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white"
              >
                <option value="html">Code HTML / Script Régie (AdSense, Adsterra...)</option>
                <option value="image">Bannière Image + Lien affilié</option>
                <option value="video">Spot Vidéo MP4 + Lien affilié</option>
              </select>
              <select
                value={adForm.placement}
                onChange={(e: any) => setAdForm({ ...adForm, placement: e.target.value })}
                className="bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white"
              >
                <option value="in_feed">In-Feed (Accueil)</option>
                <option value="sub_hero">Sous Hero</option>
                <option value="under_player">Sous Lecteur</option>
                <option value="direct_feed">Page Direct</option>
                <option value="footer_network">Pied de page</option>
                <option value="header_bar">Barre en-tête</option>
              </select>
            </div>

            {adForm.mediaType === 'html' ? (
              <div>
                <label className="text-zinc-400 block mb-1">
                  Code HTML / &lt;script&gt; fourni par votre régie (AdSense, Adsterra, Monetag...)
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder={'<script async src="https://..."></script>\n<ins class="adsbygoogle" ...></ins>'}
                  value={adForm.htmlCode}
                  onChange={(e) => setAdForm({ ...adForm, htmlCode: e.target.value })}
                  className="w-full bg-[#090810] border border-white/12 rounded-xl p-2.5 text-emerald-300 font-mono"
                />
              </div>
            ) : (
              <>
                <input
                  type="text"
                  required
                  placeholder="URL Image ou Vidéo MP4"
                  value={adForm.mediaUrl}
                  onChange={(e) => setAdForm({ ...adForm, mediaUrl: e.target.value, imageUrl: e.target.value })}
                  className="w-full bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white font-mono"
                />
                <input
                  type="text"
                  required
                  placeholder="Votre lien affilié ou site sponsor (https://...)"
                  value={adForm.targetUrl}
                  onChange={(e) => setAdForm({ ...adForm, targetUrl: e.target.value })}
                  className="w-full bg-[#090810] border border-white/12 rounded-xl p-2.5 text-white font-mono"
                />
              </>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdForm(false)} className="px-4 py-2 bg-white/8 rounded-xl">
                Annuler
              </button>
              <button type="submit" className="px-5 py-2 bg-purple-600 text-white font-bold rounded-xl">
                Publier
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
