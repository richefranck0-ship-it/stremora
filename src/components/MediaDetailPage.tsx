import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Play, Plus, Check, Star, Share2, Film, Download,
  Flag, CheckCheck, User, ChevronLeft, ChevronRight, Tv, Loader2, ExternalLink
} from 'lucide-react';
import { MediaItem, Episode } from '../types';
import { storageService } from '../services/storageService';
import { tmdbService } from '../services/tmdbService';
import { openOmniSave } from '../utils/omniSave';
import {
  extractIdFromParam,
  getEpisodePath,
  getMediaPath,
  parseEpisodeId,
  shareDirectUrl,
} from '../utils/routing';
import { useSeoMeta } from '../utils/seo';
import { MediaCard } from './MediaCard';
import { AdBannerSlot } from './AdBannerSlot';

interface MediaDetailPageProps {
  mode: 'movie' | 'series' | 'episode';
  param: string;
  allMedia: MediaItem[];
  onBackHome: () => void;
  onNavigateMedia: (media: MediaItem) => void;
  onNavigateEpisode: (series: MediaItem, episode: Episode) => void;
  onPlay: (media: MediaItem, episode?: Episode) => void;
  onWatchlistChange?: () => void;
}

export const MediaDetailPage: React.FC<MediaDetailPageProps> = ({
  mode,
  param,
  allMedia,
  onBackHome,
  onNavigateMedia,
  onNavigateEpisode,
  onPlay,
  onWatchlistChange,
}) => {
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [seasonEpisodes, setSeasonEpisodes] = useState<Episode[]>([]);
  const [similarItems, setSimilarItems] = useState<MediaItem[]>([]);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState<'broken_video' | 'audio_sync' | 'wrong_subtitles' | 'copyright' | 'other'>('broken_video');
  const [reportComment, setReportComment] = useState('');
  const [reportSent, setReportSent] = useState(false);

  const parsedEp = useMemo(
    () => (mode === 'episode' ? parseEpisodeId(param) : null),
    [mode, param]
  );

  // Resolve primary media item (local custom -> catalog -> live TMDB)
  useEffect(() => {
    let cancelled = false;
    setShowTrailer(false);
    setIsLoading(true);

    const resolveMedia = async () => {
      const targetType: 'movie' | 'tv' = mode === 'movie' ? 'movie' : 'tv';
      let lookupId = extractIdFromParam(param);

      if (mode === 'episode' && parsedEp) {
        if (parsedEp.seasonNumber) {
          setSelectedSeasonNumber(parsedEp.seasonNumber);
        }
        if (parsedEp.tvId) {
          lookupId = parsedEp.tvId;
        }
      }

      // Check in local catalog first (handles custom items & legacy ids like 'dune-2' or 'breaking-bad')
      const localMatch = allMedia.find((m) => {
        if (mode === 'episode' && parsedEp && m.seasons) {
          const hasEp = m.seasons.some((s) => s.episodes.some((e) => e.id === parsedEp.rawId));
          if (hasEp) return true;
        }
        return (
          String(m.id) === lookupId ||
          String(m.id) === decodeURIComponent(param) ||
          String(m.tmdbId) === lookupId ||
          String(m.id) === `${targetType}-${lookupId}`
        );
      });

      if (localMatch && !cancelled) {
        setMedia(localMatch);
        setInWatchlist(storageService.isInWatchlist(localMatch.id));
      }

      // Check server custom catalog if still missing
      if (!localMatch) {
        try {
          const customRes = await fetch('/api/catalog/custom');
          if (customRes.ok) {
            const { items } = await customRes.json();
            if (Array.isArray(items)) {
              const serverItem = items.find(
                (m: MediaItem) => String(m.id) === lookupId || String(m.tmdbId) === lookupId
              );
              if (serverItem && !cancelled) {
                setMedia(serverItem);
                setInWatchlist(storageService.isInWatchlist(serverItem.id));
                setIsLoading(false);
                return;
              }
            }
          }
        } catch {
          // continue to TMDB
        }
      }

      // Fetch rich TMDB details when numeric TMDB id is known
      const tmdbIdCandidate = localMatch?.tmdbId ? String(localMatch.tmdbId) : lookupId;
      if (/^\d+$/.test(tmdbIdCandidate)) {
        const fetched =
          targetType === 'movie'
            ? await tmdbService.getMovieDetails(tmdbIdCandidate)
            : await tmdbService.getTvDetails(tmdbIdCandidate);

        if (fetched && !cancelled) {
          setMedia((prev) => {
            if (!prev) return fetched;
            return {
              ...fetched,
              id: prev.id,
              videoUrl: prev.videoUrl || fetched.videoUrl,
              seasons: prev.customAdded && prev.seasons ? prev.seasons : fetched.seasons,
            };
          });
          setInWatchlist(storageService.isInWatchlist(localMatch ? localMatch.id : fetched.id));
        }
      }

      if (!cancelled) setIsLoading(false);
    };

    resolveMedia();
    return () => {
      cancelled = true;
    };
  }, [mode, param, parsedEp, allMedia]);

  // Fetch live season episodes for series
  useEffect(() => {
    let cancelled = false;
    if (!media || media.type !== 'tv') return;

    const activeSeason =
      media.seasons?.find((s) => s.seasonNumber === selectedSeasonNumber) || media.seasons?.[0];

    if (activeSeason?.episodes?.length) {
      setSeasonEpisodes(activeSeason.episodes);
    }

    if (media.tmdbId && !media.customAdded) {
      tmdbService.getTvSeason(media.tmdbId, selectedSeasonNumber).then((eps) => {
        if (!cancelled && eps.length > 0) {
          setSeasonEpisodes(eps);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [media, selectedSeasonNumber]);

  // Fetch similar media from TMDB + local fallback
  useEffect(() => {
    let cancelled = false;
    if (!media) return;

    const loadSimilar = async () => {
      let sims: MediaItem[] = [];
      if (media.tmdbId) {
        sims = await tmdbService.getSimilarMedia(media.type, media.tmdbId);
      }
      if (sims.length < 4) {
        const fallback = allMedia.filter(
          (item) =>
            String(item.id) !== String(media.id) &&
            item.type === media.type &&
            !sims.some((s) => String(s.tmdbId || s.id) === String(item.tmdbId || item.id))
        );
        sims = [...sims, ...fallback].slice(0, 8);
      }
      if (!cancelled) setSimilarItems(sims);
    };

    loadSimilar();
    return () => {
      cancelled = true;
    };
  }, [media, allMedia]);

  // Active episode when viewing /episode/:episodeId
  const activeEpisode: Episode | undefined = useMemo(() => {
    if (mode !== 'episode' || !parsedEp) return undefined;
    if (parsedEp.episodeNumber) {
      return (
        seasonEpisodes.find((e) => e.episodeNumber === parsedEp.episodeNumber) ||
        seasonEpisodes[0]
      );
    }
    return seasonEpisodes.find((e) => e.id === parsedEp.rawId) || seasonEpisodes[0];
  }, [mode, parsedEp, seasonEpisodes]);

  const activeEpisodeIndex = useMemo(() => {
    if (!activeEpisode) return -1;
    return seasonEpisodes.findIndex((e) => e.episodeNumber === activeEpisode.episodeNumber);
  }, [activeEpisode, seasonEpisodes]);

  const prevEpisode = activeEpisodeIndex > 0 ? seasonEpisodes[activeEpisodeIndex - 1] : undefined;
  const nextEpisode =
    activeEpisodeIndex >= 0 && activeEpisodeIndex < seasonEpisodes.length - 1
      ? seasonEpisodes[activeEpisodeIndex + 1]
      : undefined;

  // Dynamic SEO metadata update
  const currentPath = media
    ? mode === 'episode' && activeEpisode
      ? getEpisodePath(media, activeEpisode)
      : getMediaPath(media)
    : window.location.pathname;

  useSeoMeta({
    title: media
      ? mode === 'episode' && activeEpisode
        ? `${media.title} S${activeEpisode.seasonNumber}E${activeEpisode.episodeNumber} : ${activeEpisode.title} — STREAMORA`
        : `${media.title} (${media.releaseYear}) — STREAMORA`
      : 'Chargement — STREAMORA',
    description:
      (activeEpisode?.synopsis || media?.synopsis || 'Fiche détaillée sur STREAMORA.').slice(0, 160),
    path: currentPath,
    image: activeEpisode?.thumbnail || media?.backdrop || media?.poster,
    type: mode === 'movie' ? 'video.movie' : mode === 'episode' ? 'video.episode' : 'video.tv_show',
    jsonLd: media
      ? {
          '@type': mode === 'movie' ? 'Movie' : mode === 'episode' ? 'TVEpisode' : 'TVSeries',
          name: activeEpisode ? `${media.title} — ${activeEpisode.title}` : media.title,
          description: activeEpisode?.synopsis || media.synopsis,
          datePublished: media.releaseDate,
          image: media.poster,
        }
      : undefined,
  });

  const handleToggleWatchlist = () => {
    if (!media) return;
    const added = storageService.toggleWatchlist(media.id);
    setInWatchlist(added);
    onWatchlistChange?.();
  };

  const handleShare = async (title: string, path: string, key = 'main') => {
    const ok = await shareDirectUrl(title, path);
    if (ok) {
      setCopiedId(key);
      window.setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!media || !reportComment.trim()) return;
    storageService.addReport({
      mediaId: media.id,
      mediaTitle: media.title,
      reason: reportReason,
      comment: reportComment.trim(),
    });
    setReportSent(true);
    window.setTimeout(() => {
      setShowReportForm(false);
      setReportSent(false);
      setReportComment('');
    }, 1800);
  };

  if (isLoading && !media) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center gap-3 min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="text-xs text-zinc-400">Chargement de la fiche STREAMORA...</p>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <Film className="w-12 h-12 text-zinc-500 mx-auto" />
        <h1 className="text-2xl font-bold text-white font-heading">Contenu introuvable</h1>
        <p className="text-sm text-zinc-400">
          Cette fiche film, série ou épisode n’est plus disponible ou son identifiant est incorrect.
        </p>
        <button
          onClick={onBackHome}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl"
        >
          Retour à l’accueil
        </button>
      </div>
    );
  }

  const seasonsList = media.seasons && media.seasons.length > 0
    ? media.seasons
    : media.type === 'tv'
    ? [{ seasonNumber: 1, title: 'Saison 1', episodesCount: seasonEpisodes.length, episodes: seasonEpisodes }]
    : [];

  return (
    <div className="pb-12">
      {/* Backdrop Header */}
      <div className="relative w-full min-h-[300px] sm:min-h-[380px] lg:min-h-[440px] bg-[#08070d] overflow-hidden">
        {!showTrailer ? (
          <>
            <img
              src={activeEpisode?.thumbnail || media.backdrop || media.poster || '/images/fallback-backdrop.jpg'}
              alt={media.title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/images/fallback-backdrop.jpg';
              }}
              className="absolute inset-0 w-full h-full object-cover object-top brightness-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08070d] via-[#08070d]/65 to-black/35" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#08070d] via-[#08070d]/70 to-transparent" />
          </>
        ) : (
          <div className="relative w-full aspect-video max-h-[520px] bg-black">
            <iframe
              src={`${media.trailerUrl}?autoplay=1`}
              title={`Bande-annonce ${media.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-none"
            />
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute top-4 right-4 px-3.5 py-2 rounded-xl bg-black/80 text-white text-xs font-semibold border border-white/20 hover:bg-black"
            >
              Fermer la bande-annonce
            </button>
          </div>
        )}

        {/* Top Back Button */}
        {!showTrailer && (
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 z-10">
            <button
              onClick={onBackHome}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/55 hover:bg-black/80 text-zinc-200 text-xs font-semibold backdrop-blur-md border border-white/10 min-h-[40px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Catalogue</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-28 sm:-mt-36 relative z-20 space-y-8">
        <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
          {/* Poster Card */}
          <div className="w-36 sm:w-44 md:w-56 shrink-0 rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-[#100e1b]">
            <img
              src={media.poster || '/images/fallback-poster.jpg'}
              alt={media.title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/images/fallback-poster.jpg';
              }}
              className="w-full aspect-[2/3] object-cover"
            />
          </div>

          {/* Title & Metadata & Actions */}
          <div className="flex-1 min-w-0 space-y-4 pt-2 md:pt-8">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-300">
              <span className="font-bold text-purple-300 uppercase tracking-wider text-[11px]">
                {media.type === 'movie' ? 'Film' : 'Série'}
              </span>
              <span aria-hidden="true" className="text-zinc-500">·</span>
              <span className="flex items-center gap-1 font-semibold text-amber-300">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{media.rating.toFixed(1)}/10</span>
              </span>
              <span aria-hidden="true" className="text-zinc-500">·</span>
              <span>{media.releaseYear}</span>
              <span aria-hidden="true" className="text-zinc-500">·</span>
              <span>{media.duration}</span>
              {media.genres.length > 0 && (
                <>
                  <span aria-hidden="true" className="text-zinc-500">·</span>
                  <span className="text-purple-200">{media.genres.join(', ')}</span>
                </>
              )}
            </div>

            {mode === 'episode' && activeEpisode ? (
              <div className="space-y-1">
                <button
                  onClick={() => onNavigateMedia(media)}
                  className="text-xs sm:text-sm text-purple-300 hover:text-purple-200 font-semibold flex items-center gap-1"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>{media.title}</span>
                </button>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-heading leading-tight">
                  S{activeEpisode.seasonNumber}E{activeEpisode.episodeNumber} — {activeEpisode.title}
                </h1>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white font-heading leading-tight">
                  {media.title}
                </h1>
                {media.originalTitle && media.originalTitle !== media.title && (
                  <p className="text-xs text-zinc-400 mt-1">
                    Titre original : {media.originalTitle}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons (Touch-Friendly ≥44px, sans bouton Regarder) */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">

              {media.trailerUrl && (
                <button
                  onClick={() => setShowTrailer(!showTrailer)}
                  className="px-4 min-h-[44px] bg-white/10 hover:bg-white/18 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center gap-2 border border-white/15 transition-colors"
                >
                  <Film className="w-4 h-4 text-purple-300" />
                  <span>{showTrailer ? 'Masquer bande-annonce' : 'Bande-annonce'}</span>
                </button>
              )}

              <button
                onClick={() =>
                  openOmniSave(
                    activeEpisode
                      ? `${media.title} S${activeEpisode.seasonNumber}E${activeEpisode.episodeNumber}`
                      : media.title || media.originalTitle
                  )
                }
                className="px-4 min-h-[44px] bg-emerald-600/90 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>

              <button
                onClick={() =>
                  handleShare(
                    activeEpisode ? `${media.title} - ${activeEpisode.title}` : media.title,
                    currentPath,
                    'main'
                  )
                }
                className="px-4 min-h-[44px] bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center gap-2 border border-white/15 transition-colors"
              >
                {copiedId === 'main' ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Lien copié !</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Partager</span>
                  </>
                )}
              </button>

              <button
                onClick={handleToggleWatchlist}
                className={`min-h-[44px] px-3.5 rounded-xl border text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  inWatchlist
                    ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                    : 'bg-white/8 border-white/12 text-white hover:bg-white/15'
                }`}
              >
                {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{inWatchlist ? 'Dans ma liste' : 'Ma liste'}</span>
              </button>

              <button
                onClick={() => setShowReportForm(!showReportForm)}
                className="min-w-[44px] min-h-[44px] px-3 rounded-xl bg-white/5 hover:bg-white/12 border border-white/8 text-zinc-400 hover:text-red-300 flex items-center justify-center transition-colors"
                title="Signaler un problème"
                aria-label="Signaler un problème"
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>

            {/* Episode Prev / Next Navigation when viewing /episode/:id */}
            {mode === 'episode' && activeEpisode && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  disabled={!prevEpisode}
                  onClick={() => prevEpisode && onNavigateEpisode(media, prevEpisode)}
                  className="px-3.5 min-h-[40px] rounded-xl bg-white/8 hover:bg-white/15 disabled:opacity-35 text-xs font-semibold text-white flex items-center gap-1.5 border border-white/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Épisode précédent</span>
                </button>
                <button
                  disabled={!nextEpisode}
                  onClick={() => nextEpisode && onNavigateEpisode(media, nextEpisode)}
                  className="px-3.5 min-h-[40px] rounded-xl bg-purple-600/30 hover:bg-purple-600/50 disabled:opacity-35 text-xs font-semibold text-purple-100 flex items-center gap-1.5 border border-purple-500/30"
                >
                  <span>Épisode suivant</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Report Form */}
        {showReportForm && (
          <div className="bg-[#141122] border border-purple-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Flag className="w-4 h-4 text-purple-400" />
              <span>Signaler un souci sur ce titre</span>
            </h3>
            {reportSent ? (
              <p className="text-xs text-emerald-400">
                Merci ! Votre signalement a bien été enregistré pour l’équipe technique.
              </p>
            ) : (
              <form onSubmit={handleSubmitReport} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <select
                  value={reportReason}
                  onChange={(e: any) => setReportReason(e.target.value)}
                  className="bg-[#0b0a12] border border-white/10 rounded-xl p-2.5 text-white"
                >
                  <option value="broken_video">Lecture indisponible</option>
                  <option value="audio_sync">Décalage audio</option>
                  <option value="wrong_subtitles">Sous-titres</option>
                  <option value="copyright">Droits / Contenu</option>
                  <option value="other">Autre</option>
                </select>
                <input
                  type="text"
                  required
                  placeholder="Précisez le problème..."
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  className="bg-[#0b0a12] border border-white/10 rounded-xl p-2.5 text-white"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl"
                  >
                    Envoyer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportForm(false)}
                    className="px-3 py-2.5 bg-white/5 text-zinc-300 rounded-xl"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Synopsis + Cast + Technical Metadata */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                {activeEpisode ? 'Résumé de l’épisode' : 'Synopsis'}
              </h2>
              <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                {activeEpisode?.synopsis || media.synopsis}
              </p>
            </section>

            {media.cast && media.cast.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                  Distribution &amp; Acteurs
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {media.cast.slice(0, 6).map((actor, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#12101d] border border-white/6"
                    >
                      {actor.photo ? (
                        <img
                          src={actor.photo}
                          alt={actor.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/10"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-900/40 text-purple-300 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{actor.name}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{actor.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Info Card */}
          <aside className="bg-[#12101d] border border-white/8 rounded-2xl p-5 text-xs space-y-3 h-fit">
            <div>
              <span className="text-zinc-500 block">Réalisation / Création</span>
              <span className="font-semibold text-white">{media.director || 'Non spécifié'}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Genres</span>
              <span className="font-medium text-purple-300">{media.genres.join(', ')}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Pays &amp; Langue</span>
              <span className="text-zinc-200">{media.country} · {media.language}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Date de sortie</span>
              <span className="text-zinc-200">{media.releaseDate}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Lien direct partageable</span>
              <span className="font-mono text-[11px] text-purple-300 break-all">{currentPath}</span>
            </div>
          </aside>
        </div>

        {/* Non-intrusive Sponsor Slot */}
        <AdBannerSlot placement="in_feed" />

        {/* Series Seasons & Episodes Section */}
        {media.type === 'tv' && seasonsList.length > 0 && (
          <section className="space-y-4 pt-2 border-t border-white/8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-heading">
                  Saisons &amp; Épisodes ({seasonsList.length} saison{seasonsList.length > 1 ? 's' : ''})
                </h2>
                <p className="text-xs text-zinc-400">
                  Chaque épisode possède son propre lien direct partageable.
                </p>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                {seasonsList.map((s) => (
                  <button
                    key={s.seasonNumber}
                    onClick={() => setSelectedSeasonNumber(s.seasonNumber)}
                    className={`px-3.5 min-h-[40px] rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedSeasonNumber === s.seasonNumber
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/6 text-zinc-300 hover:text-white hover:bg-white/12'
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              {seasonEpisodes.map((ep) => {
                const epPath = getEpisodePath(media, ep);
                const isSelected =
                  mode === 'episode' && activeEpisode?.episodeNumber === ep.episodeNumber;
                return (
                  <div
                    key={ep.id}
                    onClick={() => onNavigateEpisode(media, ep)}
                    className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-950/45 border-purple-500/60'
                        : 'bg-[#12101d] hover:bg-[#171426] border-white/6 hover:border-purple-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative w-24 sm:w-28 aspect-video rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                        <img
                          src={ep.thumbnail || media.backdrop || '/images/fallback-backdrop.jpg'}
                          alt={ep.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/images/fallback-backdrop.jpg';
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-purple-400">
                            S{ep.seasonNumber}E{ep.episodeNumber}
                          </span>
                          <span className="text-[11px] text-zinc-500">· {ep.duration}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
                          {ep.title}
                        </h3>
                        <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">
                          {ep.synopsis}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {ep.videoUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlay(media, ep);
                          }}
                          className="px-3.5 min-h-[38px] bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Lire</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openOmniSave(`${media.title} S${ep.seasonNumber}E${ep.episodeNumber}`);
                        }}
                        className="p-2 min-w-[38px] min-h-[38px] bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/30 rounded-xl flex items-center justify-center"
                        title="Télécharger l’épisode"
                        aria-label="Télécharger l’épisode"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(`${media.title} S${ep.seasonNumber}E${ep.episodeNumber}`, epPath, ep.id);
                        }}
                        className="px-3 min-h-[38px] bg-white/8 hover:bg-white/15 text-zinc-200 border border-white/10 rounded-xl text-xs font-medium flex items-center gap-1"
                        title="Partager le lien direct de cet épisode"
                      >
                        {copiedId === ep.id ? (
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden md:inline">{copiedId === ep.id ? 'Copié' : 'Partager'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Similar Movies / Series */}
        {similarItems.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-white/8">
            <h2 className="text-lg sm:text-xl font-bold text-white font-heading">
              {media.type === 'movie' ? 'Films similaires' : 'Séries similaires'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {similarItems.slice(0, 6).map((item) => (
                <MediaCard
                  key={item.id}
                  media={item}
                  onOpenDetails={onNavigateMedia}
                  onWatchlistChange={onWatchlistChange}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
