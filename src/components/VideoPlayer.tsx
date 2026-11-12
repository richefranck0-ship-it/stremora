import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize2, Minimize2,
  Settings, Subtitles, SkipForward, X, ArrowLeft, Check, Sparkles, AlertCircle
} from 'lucide-react';
import { MediaItem, Episode } from '../types';
import { storageService } from '../services/storageService';
import { AdBannerSlot } from './AdBannerSlot';

interface VideoPlayerProps {
  media: MediaItem;
  currentEpisode?: Episode;
  onClose: () => void;
  onNextEpisode?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  media,
  currentEpisode,
  onClose,
  onNextEpisode,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentQuality, setCurrentQuality] = useState('1080p FHD');
  const [activeSubtitle, setActiveSubtitle] = useState<'off' | 'fr' | 'en'>('fr');
  const [showControls, setShowControls] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [resumePrompt, setResumePrompt] = useState<{ timestamp: number } | null>(null);
  const [hasError, setHasError] = useState(false);
  const [useTrailerFallback, setUseTrailerFallback] = useState(false);

  const activeVideoUrl = currentEpisode ? currentEpisode.videoUrl : media.videoUrl;
  const activeTitle = currentEpisode
    ? `${media.title} — S${currentEpisode.seasonNumber}:E${currentEpisode.episodeNumber} « ${currentEpisode.title} »`
    : media.title;

  // Record stream event on open
  useEffect(() => {
    storageService.recordStreamStarted(media.title);
  }, [media.title]);

  // Check watch history for resume prompt
  useEffect(() => {
    const user = storageService.getUserProfile();
    const existing = user.history.find(
      h => String(h.mediaId) === String(media.id) && (!currentEpisode || h.episodeId === currentEpisode.id)
    );
    if (existing && existing.timestamp > 15 && existing.timestamp < (existing.duration - 30)) {
      setResumePrompt({ timestamp: existing.timestamp });
    }
  }, [media.id, currentEpisode]);

  // Format seconds into hh:mm:ss or mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Skip ±10 seconds
  const skip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
  };

  // Progress scrubbing
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // Volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      videoRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Speed selection
  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSettingsMenu(false);
  };

  // Auto-hide controls timer
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
        setShowSettingsMenu(false);
        setShowSubtitleMenu(false);
      }, 3500);
    }
  };

  // Update time and save progress
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setCurrentTime(cur);

    // Save every 5 seconds
    if (Math.floor(cur) % 5 === 0 && dur > 0) {
      storageService.updateWatchProgress({
        mediaId: media.id,
        episodeId: currentEpisode?.id,
        title: activeTitle,
        poster: currentEpisode?.thumbnail || media.poster,
        timestamp: Math.floor(cur),
        duration: Math.floor(dur),
        progressPercent: Math.round((cur / dur) * 100),
        lastWatched: "Aujourd'hui",
        type: media.type,
        seasonNumber: currentEpisode?.seasonNumber,
        episodeNumber: currentEpisode?.episodeNumber,
      });
    }
  };

  // Handle Resume
  const handleResume = (confirm: boolean) => {
    if (confirm && resumePrompt && videoRef.current) {
      videoRef.current.currentTime = resumePrompt.timestamp;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else if (!confirm && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    setResumePrompt(null);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skip(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skip(10);
      } else if (e.code === 'Escape') {
        if (!document.fullscreenElement) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-[#08070d] flex flex-col items-center justify-start overflow-y-auto">
      {/* Top Header bar with Close button */}
      <div className="w-full bg-[#0d0b17] border-b border-purple-900/30 px-4 md:px-8 py-3 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium px-2 py-1 rounded-lg hover:bg-white/5"
            aria-label="Quitter le lecteur"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Retour au catalogue</span>
          </button>
          <span className="text-zinc-600 hidden sm:inline">|</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm md:text-base line-clamp-1">
              {activeTitle}
            </span>
            <span className="hidden md:inline text-xs text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/20 font-medium">
              Lecteur HD STREAMORA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.open(`https://videodownloader.site/?utm_source=MB_Official_Website&q=${encodeURIComponent(activeTitle)}`, '_blank', 'noopener,noreferrer')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-950 transition-all"
            title="Trouver les sources vidéo externes sur VideoDownloader"
          >
            <span>Trouver la vidéo (OmniSave)</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Video Viewport Container */}
      <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-4 flex flex-col items-center flex-1">
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onClick={togglePlay}
          className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl shadow-purple-950/40 border border-white/10 group select-none flex items-center justify-center cursor-pointer"
        >
          {/* Video or YouTube trailer fallback */}
          {!useTrailerFallback ? (
            <video
              ref={videoRef}
              src={activeVideoUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setDuration(videoRef.current.duration);
                  setHasError(false);
                }
              }}
              onError={() => {
                setHasError(true);
              }}
              onEnded={() => {
                setIsPlaying(false);
                if (onNextEpisode) onNextEpisode();
              }}
              className="w-full h-full object-contain"
              playsInline
            />
          ) : (
            <iframe
              src={`${media.trailerUrl}?autoplay=1&controls=1`}
              title="Bande-annonce"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              className="w-full h-full border-none"
            />
          )}

          {/* Subtitles simulation overlay */}
          {activeSubtitle !== 'off' && isPlaying && !useTrailerFallback && (
            <div className="absolute bottom-16 left-0 right-0 pointer-events-none flex justify-center px-4">
              <span className="bg-black/80 backdrop-blur-sm text-yellow-300 text-sm md:text-base font-medium px-3 py-1 rounded shadow-lg text-center max-w-xl">
                {activeSubtitle === 'fr'
                  ? `[ST FR] STREAMORA — Diffusion haute qualité sous licence`
                  : `[ST EN] STREAMORA — High fidelity authorized stream`}
              </span>
            </div>
          )}

          {/* Error prompt with quick fallback */}
          {hasError && !useTrailerFallback && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center z-40"
            >
              <AlertCircle className="w-12 h-12 text-purple-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Flux vidéo non accessible directement</h3>
              <p className="text-xs text-zinc-400 max-w-md mb-4">
                Ce flux nécessite une autorisation spécifique ou une connexion locale. Vous pouvez basculer instantanément sur le lecteur officiel ou changer de lien dans l'administration.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setUseTrailerFallback(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Lire via le lecteur officiel
                </button>
                <button
                  onClick={() => {
                    setHasError(false);
                    if (videoRef.current) {
                      videoRef.current.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
                      videoRef.current.play().catch(() => {});
                    }
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs transition-colors"
                >
                  Lire la version démo 4K
                </button>
              </div>
            </div>
          )}

          {/* Resume Prompt Modal */}
          {resumePrompt && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#171426]/95 backdrop-blur-md border border-purple-500/40 rounded-xl p-4 shadow-2xl flex items-center gap-4 z-40 animate-fade-in"
            >
              <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-white">Reprendre la lecture ?</p>
                <p className="text-zinc-400">Dernière position : {formatTime(resumePrompt.timestamp)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleResume(true)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs rounded-lg transition-colors"
                >
                  Reprendre
                </button>
                <button
                  onClick={() => handleResume(false)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-zinc-300 text-xs rounded-lg transition-colors"
                >
                  Recommencer
                </button>
              </div>
            </div>
          )}

          {/* Center Play/Pause button on pause */}
          {!isPlaying && !hasError && !useTrailerFallback && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg shadow-purple-950 scale-100 hover:scale-110 transition-transform">
                <Play className="w-8 h-8 fill-current translate-x-0.5" />
              </div>
            </div>
          )}

          {/* Overlay Controls */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 transition-opacity duration-300 flex flex-col gap-2 ${
              showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Seek Bar */}
            <div className="w-full flex items-center gap-3">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:h-2 transition-all"
              />
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between gap-2 text-white text-xs pt-1">
              {/* Left group */}
              <div className="flex items-center gap-1 sm:gap-3 min-w-0">
                <button
                  onClick={togglePlay}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  aria-label={isPlaying ? 'Pause' : 'Lecture'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                <button
                  onClick={() => skip(-10)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-white transition-colors"
                  title="Reculer de 10s"
                  aria-label="Reculer de 10 secondes"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => skip(10)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-white transition-colors"
                  title="Avancer de 10s"
                  aria-label="Avancer de 10 secondes"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {onNextEpisode && (
                  <button
                    onClick={onNextEpisode}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-xs font-medium border border-purple-500/30 transition-colors shrink-0"
                    title="Épisode suivant"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Épisode suivant</span>
                  </button>
                )}

                {/* Volume */}
                <div className="flex items-center gap-2 group/vol">
                  <button
                    onClick={toggleMute}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-white transition-colors"
                    aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="hidden sm:block w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    aria-label="Volume"
                  />
                </div>

                {/* Time Display */}
                <div className="text-[11px] text-zinc-400 tabular-nums font-mono pl-0.5 truncate">
                  <span>{formatTime(currentTime)}</span>
                  <span className="mx-0.5">/</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Right group */}
              <div className="flex items-center gap-1 sm:gap-2 relative shrink-0">
                {/* Subtitles Menu Trigger */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowSubtitleMenu(!showSubtitleMenu);
                      setShowSettingsMenu(false);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      activeSubtitle !== 'off' ? 'text-purple-400 bg-purple-900/40' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Sous-titres"
                    aria-label="Menu sous-titres"
                  >
                    <Subtitles className="w-4 h-4" />
                  </button>

                  {showSubtitleMenu && (
                    <div className="absolute bottom-10 right-0 bg-[#161424] border border-purple-900/50 rounded-xl p-2 shadow-2xl min-w-[150px] z-50 text-xs">
                      <div className="font-semibold text-zinc-300 px-2 py-1 border-b border-white/5 mb-1">
                        Sous-titres
                      </div>
                      <button
                        onClick={() => { setActiveSubtitle('off'); setShowSubtitleMenu(false); }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 flex items-center justify-between"
                      >
                        <span>Désactivé</span>
                        {activeSubtitle === 'off' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                      </button>
                      <button
                        onClick={() => { setActiveSubtitle('fr'); setShowSubtitleMenu(false); }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 flex items-center justify-between"
                      >
                        <span>Français (Complet)</span>
                        {activeSubtitle === 'fr' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                      </button>
                      <button
                        onClick={() => { setActiveSubtitle('en'); setShowSubtitleMenu(false); }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-white/5 flex items-center justify-between"
                      >
                        <span>English</span>
                        {activeSubtitle === 'en' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Settings Menu (Speed & Quality) */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowSettingsMenu(!showSettingsMenu);
                      setShowSubtitleMenu(false);
                    }}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Paramètres de lecture"
                    aria-label="Paramètres de lecture"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  {showSettingsMenu && (
                    <div className="absolute bottom-10 right-0 bg-[#161424] border border-purple-900/50 rounded-xl p-3 shadow-2xl min-w-[200px] z-50 text-xs space-y-3">
                      <div>
                        <div className="font-semibold text-zinc-300 mb-1.5">Vitesse de lecture</div>
                        <div className="grid grid-cols-3 gap-1">
                          {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                            <button
                              key={spd}
                              onClick={() => changeSpeed(spd)}
                              className={`px-2 py-1 rounded text-center font-medium transition-colors ${
                                playbackSpeed === spd ? 'bg-purple-600 text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                              }`}
                            >
                              {spd}x
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5">
                        <div className="font-semibold text-zinc-300 mb-1.5">Qualité vidéo</div>
                        <div className="space-y-1">
                          {['4K Ultra HD', '1080p FHD', '720p HD', '480p SD'].map((q) => (
                            <button
                              key={q}
                              onClick={() => {
                                setCurrentQuality(q);
                                setShowSettingsMenu(false);
                              }}
                              className="w-full text-left px-2 py-1 rounded hover:bg-white/5 flex items-center justify-between"
                            >
                              <span>{q}</span>
                              {currentQuality === q && <Check className="w-3.5 h-3.5 text-purple-400" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Discreet Sponsor Placement Under the Player */}
        <AdBannerSlot placement="under_player" className="max-w-6xl" />

        {/* Media metadata & technical details under video */}
        <div className="w-full bg-[#110f1c] border border-white/5 rounded-2xl p-6 mt-2 flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="font-semibold text-purple-400">{media.genres.join(', ')}</span>
              <span>·</span>
              <span>Sortie : {media.releaseYear}</span>
              <span>·</span>
              <span>Note TMDB : {media.rating.toFixed(1)}/10</span>
              <span>·</span>
              <span>Qualité active : {currentQuality}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white font-heading">
              {activeTitle}
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {currentEpisode ? currentEpisode.synopsis : media.synopsis}
            </p>
            {media.director && (
              <p className="text-xs text-zinc-400 pt-2">
                <strong className="text-zinc-200">Réalisation :</strong> {media.director}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
            <span className="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider">
              STREAMORA Playback Engine
            </span>
            <div className="text-xs text-zinc-300 bg-black/40 rounded-lg p-3 border border-white/5 space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Flux :</span>
                <span className="text-purple-300 font-mono">H.264 / AAC Direct</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Audio :</span>
                <span>Stéréo 5.1 / VOSTFR</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Protection :</span>
                <span className="text-emerald-400">Diffusion Certifiée</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
