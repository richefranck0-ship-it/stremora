import { ActiveTab, Episode, MediaItem } from '../types';

export interface ParsedRoute {
  tab: ActiveTab;
  movieSlugOrId?: string;
  seriesSlugOrId?: string;
  episodeId?: string;
}

export function slugifyTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

export function getMediaRawId(media: Pick<MediaItem, 'id' | 'tmdbId'>): string {
  if (media.tmdbId) return String(media.tmdbId);
  return String(media.id).replace(/^(movie|tv)-/, '');
}

export function getMediaPath(
  media: Pick<MediaItem, 'id' | 'tmdbId' | 'type' | 'title' | 'customAdded'>
): string {
  const idPart = media.customAdded
    ? String(media.id)
    : getMediaRawId(media);
  const slug = slugifyTitle(media.title || '');
  const segment = slug ? `${idPart}-${slug}` : idPart;
  return media.type === 'movie' ? `/movie/${segment}` : `/series/${segment}`;
}

export function getEpisodePath(
  series: Pick<MediaItem, 'id' | 'tmdbId'>,
  episode: Pick<Episode, 'id' | 'seasonNumber' | 'episodeNumber'>
): string {
  if (episode.id && episode.id.startsWith('ep-')) {
    return `/episode/${encodeURIComponent(episode.id)}`;
  }
  const seriesId = getMediaRawId(series);
  return `/episode/ep-${seriesId}-${episode.seasonNumber}-${episode.episodeNumber}`;
}

export function getAbsoluteUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${normalized}`;
}

export function extractIdFromParam(param: string): string {
  const decoded = decodeURIComponent(param).trim();
  if (decoded.startsWith('custom_')) return decoded;
  const numericMatch = decoded.match(/^(\d+)(?:-|$)/);
  if (numericMatch) return numericMatch[1];
  const prefixedMatch = decoded.match(/^(?:movie|tv)-(\d+)/);
  if (prefixedMatch) return prefixedMatch[1];
  return decoded;
}

export function parseEpisodeId(episodeParam: string): {
  rawId: string;
  tvId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
} {
  const clean = decodeURIComponent(episodeParam).trim();
  const epMatch = clean.match(/^ep-(.+)-(\d+)-(\d+)$/);
  if (epMatch) {
    return {
      rawId: clean,
      tvId: epMatch[1],
      seasonNumber: parseInt(epMatch[2], 10),
      episodeNumber: parseInt(epMatch[3], 10),
    };
  }
  // Support custom ids like bb-s1-e1 or st-s1-e2
  const altMatch = clean.match(/^([a-z0-9-]+)-s(\d+)-e(\d+)$/i);
  if (altMatch) {
    return {
      rawId: clean,
      tvId: altMatch[1],
      seasonNumber: parseInt(altMatch[2], 10),
      episodeNumber: parseInt(altMatch[3], 10),
    };
  }
  return { rawId: clean, tvId: null, seasonNumber: null, episodeNumber: null };
}

export function parsePathname(pathname: string): ParsedRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';

  if (clean === '/' || clean === '/accueil') {
    return { tab: 'home' };
  }
  if (clean === '/movies' || clean === '/films') {
    return { tab: 'movies' };
  }
  if (clean === '/series') {
    return { tab: 'series' };
  }
  if (clean === '/news' || clean === '/nouveautes') {
    return { tab: 'news' };
  }
  if (clean === '/direct' || clean === '/live') {
    return { tab: 'direct' };
  }
  if (clean === '/watchlist' || clean === '/ma-liste') {
    return { tab: 'watchlist' };
  }
  if (clean === '/partenariat' || clean === '/publicite') {
    return { tab: 'partenariat' };
  }
  if (clean === '/admin') {
    return { tab: 'admin' };
  }
  if (clean.startsWith('/movie/')) {
    return { tab: 'movie', movieSlugOrId: clean.slice('/movie/'.length) };
  }
  if (clean.startsWith('/series/')) {
    return { tab: 'series_detail', seriesSlugOrId: clean.slice('/series/'.length) };
  }
  if (clean.startsWith('/episode/')) {
    return { tab: 'episode', episodeId: clean.slice('/episode/'.length) };
  }

  return { tab: 'home' };
}

export function getTabPath(tab: ActiveTab): string {
  switch (tab) {
    case 'home':
      return '/';
    case 'movies':
      return '/movies';
    case 'series':
      return '/series';
    case 'news':
      return '/news';
    case 'direct':
      return '/direct';
    case 'watchlist':
      return '/watchlist';
    case 'partenariat':
      return '/partenariat';
    case 'admin':
      return '/admin';
    default:
      return '/';
  }
}

export async function shareDirectUrl(title: string, path: string): Promise<boolean> {
  const url = getAbsoluteUrl(path);
  try {
    if (navigator.share) {
      await navigator.share({ title, text: `Découvrir ${title} sur STREAMORA`, url });
      return true;
    }
  } catch {
    // User cancelled native share or unsupported; fall back to clipboard
  }
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // Fallback textarea copy
    try {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}
