import React, { useState } from 'react';
import { Radio, Play, Plus, X, Eye, Check } from 'lucide-react';
import { LiveStreamChannel } from '../types';
import { storageService } from '../services/storageService';
import { AdBannerSlot } from './AdBannerSlot';

interface LiveDirectViewProps {
  onPlayDirectStream: (channel: LiveStreamChannel) => void;
}

export const LiveDirectView: React.FC<LiveDirectViewProps> = ({ onPlayDirectStream }) => {
  const [channels, setChannels] = useState<LiveStreamChannel[]>(() => storageService.getLiveChannels());
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [showAddStreamModal, setShowAddStreamModal] = useState(false);
  const [newStreamData, setNewStreamData] = useState({
    name: '',
    category: 'Cinéma & Fiction',
    streamUrl: '',
    format: 'mp4' as 'mp4' | 'hls' | 'youtube',
    description: '',
    qualityBadge: '1080p FHD',
  });
  const [addSuccess, setAddSuccess] = useState(false);

  const categories = [
    'Tous',
    'Cinéma & Fiction',
    'Science-Fiction',
    'Animation & Art',
    'Classiques',
    'Science & Espace',
    'Sports & Aventure',
  ];

  const filteredChannels =
    selectedCategory === 'Tous'
      ? channels
      : channels.filter((c) => c.category === selectedCategory);

  const handleAddStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreamData.name.trim() || !newStreamData.streamUrl.trim()) return;

    const created = storageService.addLiveChannel({
      name: newStreamData.name.trim(),
      category: newStreamData.category,
      logo: '/images/app-icon.png',
      streamUrl: newStreamData.streamUrl.trim(),
      format: newStreamData.format,
      description: newStreamData.description.trim() || 'Flux direct streaming haute fidélité.',
      isLive: true,
      qualityBadge: newStreamData.qualityBadge,
    });

    try {
      await fetch('/api/live-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: created }),
      });
    } catch {
      // local storage already saved
    }

    setChannels(storageService.getLiveChannels());
    setAddSuccess(true);
    window.setTimeout(() => {
      setAddSuccess(false);
      setShowAddStreamModal(false);
      onPlayDirectStream(created);
    }, 900);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 text-zinc-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#17142b] via-[#120f21] to-[#0c0a15] border border-purple-900/30 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
            Direct &amp; Flux Live · MP4 / HLS
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight font-heading">
            Chaînes &amp; Flux en Direct
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Ajoutez et lancez vos propres flux directs MP4, HLS (.m3u8) ou directs YouTube adaptés mobile et ordinateur.
          </p>
        </div>

        <button
          onClick={() => setShowAddStreamModal(true)}
          className="px-5 min-h-[44px] bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un flux direct</span>
        </button>
      </div>

      {/* Category filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 min-h-[38px] rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-purple-600 text-white font-semibold'
                : 'bg-white/6 text-zinc-300 hover:text-white hover:bg-white/12'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <AdBannerSlot placement="direct_feed" />

      {filteredChannels.length === 0 ? (
        <div className="py-16 px-6 text-center bg-[#110f1c] rounded-3xl border border-white/6 space-y-4 max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-purple-950/60 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
            <Radio className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white font-heading">
              Aucun flux direct actif
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Ajoutez un lien direct MP4, HLS (.m3u8) ou YouTube Live pour le diffuser dans le lecteur STREAMORA.
            </p>
          </div>
          <button
            onClick={() => setShowAddStreamModal(true)}
            className="px-5 min-h-[42px] bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un flux</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChannels.map((channel) => (
            <div
              key={channel.id}
              onClick={() => onPlayDirectStream(channel)}
              className="group rounded-2xl bg-[#120f20] border border-white/6 hover:border-purple-500/45 p-4 flex flex-col justify-between cursor-pointer transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={channel.logo || '/images/app-icon.png'}
                      alt={channel.name}
                      className="w-10 h-10 rounded-xl object-cover shrink-0 bg-black border border-white/10"
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{channel.name}</h3>
                      <span className="text-[11px] text-zinc-400 block truncate">{channel.category}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider shrink-0">
                    Direct
                  </span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2 mb-4">{channel.description}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/6">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  <span className="tabular-nums font-mono">{channel.viewersCount}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayDirectStream(channel);
                  }}
                  className="px-4 min-h-[38px] bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Lancer le direct</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Stream */}
      {showAddStreamModal && (
        <div
          onClick={() => setShowAddStreamModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#141223] border border-purple-500/40 rounded-2xl p-6 shadow-2xl my-auto text-zinc-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Ajouter un flux direct</h3>
              </div>
              <button
                onClick={() => setShowAddStreamModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStream} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Nom de la chaîne ou du flux</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Chaîne Cinéma HD"
                  value={newStreamData.name}
                  onChange={(e) => setNewStreamData({ ...newStreamData, name: e.target.value })}
                  className="w-full bg-[#0d0c15] border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Catégorie</label>
                  <select
                    value={newStreamData.category}
                    onChange={(e) => setNewStreamData({ ...newStreamData, category: e.target.value })}
                    className="w-full bg-[#0d0c15] border border-white/10 rounded-xl p-2.5 text-white"
                  >
                    {categories.filter((c) => c !== 'Tous').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Format</label>
                  <select
                    value={newStreamData.format}
                    onChange={(e: any) => setNewStreamData({ ...newStreamData, format: e.target.value })}
                    className="w-full bg-[#0d0c15] border border-white/10 rounded-xl p-2.5 text-white"
                  >
                    <option value="mp4">Lien direct MP4 / WebM</option>
                    <option value="hls">Flux HLS (.m3u8)</option>
                    <option value="youtube">YouTube Live / Embed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">URL du flux vidéo</label>
                <input
                  type="url"
                  required
                  placeholder="https://.../flux.mp4"
                  value={newStreamData.streamUrl}
                  onChange={(e) => setNewStreamData({ ...newStreamData, streamUrl: e.target.value })}
                  className="w-full bg-[#0d0c15] border border-white/10 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Description (facultatif)</label>
                <input
                  type="text"
                  placeholder="Diffusion en direct HD"
                  value={newStreamData.description}
                  onChange={(e) => setNewStreamData({ ...newStreamData, description: e.target.value })}
                  className="w-full bg-[#0d0c15] border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>

              {addSuccess && (
                <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs py-2 px-3 rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Flux ajouté ! Ouverture du lecteur...</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/8">
                <button
                  type="button"
                  onClick={() => setShowAddStreamModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl"
                >
                  Lancer le flux
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
