import React, { useState, useEffect } from 'react';
import {
  X, User, Bookmark, History, Play, Trash2, Check, Clock, Bell, Volume2, VolumeX
} from 'lucide-react';
import { MediaItem, UserProfile } from '../types';
import { storageService } from '../services/storageService';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface UserSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  allMedia: MediaItem[];
  onPlay: (media: MediaItem, episodeId?: string) => void;
  onOpenDetails: (media: MediaItem) => void;
  initialTab?: 'profile' | 'watchlist' | 'history';
}

const AVATAR_PRESETS = ['/images/app-icon.png', '/images/fallback-poster.jpg'];

export const UserSpaceModal: React.FC<UserSpaceModalProps> = ({
  isOpen,
  onClose,
  allMedia,
  onPlay,
  onOpenDetails,
  initialTab = 'watchlist',
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'watchlist' | 'history'>(initialTab);
  const [user, setUser] = useState<UserProfile>(() => storageService.getUserProfile());
  const [usernameInput, setUsernameInput] = useState(user.username);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      const latestUser = storageService.getUserProfile();
      setUser(latestUser);
      setUsernameInput(latestUser.username);
    }
  }, [isOpen, initialTab]);

  const {
    supported,
    serverEnabled,
    isSubscribed,
    isBusy,
    soundEnabled,
    subscribe,
    unsubscribe,
    toggleSound,
  } = usePushNotifications();

  if (!isOpen) return null;

  const watchlistItems = allMedia.filter((item) =>
    user.watchlist.some((id) => String(id) === String(item.id))
  );

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...user,
      username: usernameInput.trim() || 'Cinéphile',
    };
    storageService.saveUserProfile(updated);
    setUser(updated);
    setSavedSuccess(true);
    window.setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSelectAvatar = (url: string) => {
    const updated: UserProfile = { ...user, avatar: url };
    storageService.saveUserProfile(updated);
    setUser(updated);
  };

  const handleRemoveFromWatchlist = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    storageService.toggleWatchlist(id);
    setUser(storageService.getUserProfile());
  };

  const handleRemoveHistoryItem = (
    e: React.MouseEvent,
    mediaId: string | number,
    episodeId?: string
  ) => {
    e.stopPropagation();
    storageService.removeHistoryItem(mediaId, episodeId);
    setUser(storageService.getUserProfile());
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-[#110f1c] border border-purple-900/35 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto text-zinc-200"
      >
        {/* Header — NO Admin button */}
        <div className="bg-[#151224] border-b border-white/6 p-4 sm:p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={user.avatar || '/images/app-icon.png'}
              alt={user.username}
              className="w-12 h-12 rounded-full object-cover border-2 border-purple-500"
            />
            <div>
              <h3 className="text-lg font-bold text-white font-heading">{user.username}</h3>
              <p className="text-xs text-zinc-400">Espace personnel STREAMORA</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-white/6 bg-[#0d0c15] px-4 sm:px-6 text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'watchlist'
                ? 'border-purple-500 text-white font-semibold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Ma Liste ({watchlistItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-purple-500 text-white font-semibold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historique ({user.history.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-purple-500 text-white font-semibold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Préférences &amp; Alertes</span>
          </button>
        </div>

        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'watchlist' && (
            <div>
              {watchlistItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {watchlistItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onClose();
                        onOpenDetails(item);
                      }}
                      className="group flex gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-purple-950/40 border border-white/6 transition-all cursor-pointer"
                    >
                      <div className="w-14 h-20 rounded-lg overflow-hidden bg-black shrink-0">
                        <img
                          src={item.poster || '/images/fallback-poster.jpg'}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                        <div>
                          <span className="text-[10px] text-purple-400 font-semibold uppercase">
                            {item.type === 'movie' ? 'Film' : 'Série'}
                          </span>
                          <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                          <span className="text-[11px] text-zinc-400">{item.releaseYear}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                              onOpenDetails(item);
                            }}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-medium"
                          >
                            Ouvrir
                          </button>
                          <button
                            onClick={(e) => handleRemoveFromWatchlist(e, item.id)}
                            className="p-1 text-zinc-400 hover:text-red-400"
                            title="Retirer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center space-y-2">
                  <Bookmark className="w-10 h-10 text-zinc-600 mx-auto" />
                  <h4 className="text-sm font-semibold text-white">Votre liste est vide</h4>
                  <p className="text-xs text-zinc-400">
                    Ajoutez des films et séries via le bouton « + » sur n’importe quelle fiche.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {user.history.length > 0 ? (
                user.history.map((hist, idx) => {
                  const media = allMedia.find((m) => String(m.id) === String(hist.mediaId));
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (media) {
                          onClose();
                          onPlay(media, hist.episodeId);
                        }
                      }}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 hover:bg-purple-950/40 border border-white/6 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={hist.poster || '/images/fallback-poster.jpg'}
                          alt={hist.title}
                          referrerPolicy="no-referrer"
                          className="w-16 h-11 rounded-lg object-cover shrink-0 bg-black"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">{hist.title}</h4>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                            <Clock className="w-3 h-3 text-purple-400" />
                            <span>{hist.progressPercent}%</span>
                            <span>· {hist.lastWatched}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (media) {
                              onClose();
                              onPlay(media, hist.episodeId);
                            }
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Reprendre</span>
                        </button>
                        <button
                          onClick={(e) => handleRemoveHistoryItem(e, hist.mediaId, hist.episodeId)}
                          className="p-1.5 text-zinc-400 hover:text-red-400"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center space-y-2">
                  <History className="w-10 h-10 text-zinc-600 mx-auto" />
                  <p className="text-sm font-semibold text-white">Aucun historique récent</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-md">
              {/* Push Notification Preferences */}
              {serverEnabled && (
                <div className="p-4 rounded-xl bg-[#161327] border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-white">Notifications Push</span>
                    </div>
                    <button
                      type="button"
                      disabled={isBusy || (!supported && !isSubscribed)}
                      onClick={() => (isSubscribed ? unsubscribe() : subscribe())}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        isSubscribed
                          ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-purple-600 hover:bg-purple-500 text-white'
                      }`}
                    >
                      {isSubscribed ? 'Activées (Désactiver)' : 'Activer'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-300 pt-2 border-t border-white/6">
                    <span>Signal sonore lors des alertes</span>
                    <button
                      type="button"
                      onClick={toggleSound}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/15 text-xs"
                    >
                      {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-purple-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                      <span>{soundEnabled ? 'Activé' : 'Silencieux'}</span>
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                    Avatar
                  </label>
                  <div className="flex items-center gap-3">
                    {AVATAR_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectAvatar(preset)}
                        className={`w-12 h-12 rounded-full overflow-hidden border-2 ${
                          user.avatar === preset ? 'border-purple-500' : 'border-white/15'
                        }`}
                      >
                        <img src={preset} alt="Avatar" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Pseudo
                  </label>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full bg-[#181528] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
                    required
                  />
                </div>

                {savedSuccess && (
                  <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs py-2 px-3 rounded-lg flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Préférences enregistrées.</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl"
                >
                  Enregistrer
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
