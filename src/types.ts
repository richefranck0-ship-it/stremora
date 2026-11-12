export type MediaType = 'movie' | 'tv';

export interface CastMember {
  name: string;
  role: string;
  photo?: string;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  synopsis: string;
  duration: string;
  thumbnail: string;
  videoUrl: string;
}

export interface Season {
  seasonNumber: number;
  title: string;
  episodesCount: number;
  episodes: Episode[];
}

export interface MediaItem {
  id: string | number;
  tmdbId?: number;
  type: MediaType;
  title: string;
  originalTitle: string;
  frenchTitle?: string;
  synopsis: string;
  poster: string;
  backdrop: string;
  releaseYear: number;
  releaseDate: string;
  genres: string[];
  rating: number;
  votesCount?: number;
  duration: string;
  country: string;
  language: string;
  director?: string;
  cast: CastMember[];
  trailerUrl: string;
  videoUrl: string;
  qualities?: { label: string; src: string }[];
  seasons?: Season[];
  isFeatured?: boolean;
  isTrending?: boolean;
  isNew?: boolean;
  isClassic?: boolean;
  isTopRated?: boolean;
  categoryTag?: string;
  customAdded?: boolean;
}

export interface LiveStreamChannel {
  id: string;
  name: string;
  category: string;
  logo: string;
  streamUrl: string;
  format: 'mp4' | 'hls' | 'youtube';
  description: string;
  viewersCount: number;
  isLive: boolean;
  qualityBadge?: string;
  customAdded?: boolean;
}

export type AdPlacement =
  | 'header_bar'
  | 'sub_hero'
  | 'in_feed'
  | 'under_player'
  | 'sidebar'
  | 'detail_modal'
  | 'direct_feed'
  | 'footer_network';

export interface AdBanner {
  id: string;
  clientName: string;
  title: string;
  description?: string;
  mediaType: 'image' | 'video' | 'html';
  mediaUrl: string;
  imageUrl?: string;
  htmlCode?: string;
  targetUrl: string;
  placement: AdPlacement;
  isActive: boolean;
  impressions: number;
  clicks: number;
  startDate: string;
  endDate: string;
  badgeText?: string;
}

export interface UserHistoryItem {
  mediaId: string | number;
  episodeId?: string;
  title: string;
  poster: string;
  timestamp: number;
  duration: number;
  progressPercent: number;
  lastWatched: string;
  type: MediaType;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  role: 'user' | 'admin';
  joinedDate: string;
  watchlist: (string | number)[];
  history: UserHistoryItem[];
}

export interface TrafficStats {
  totalVisitors: number;
  pageViews: number;
  streamsStarted: number;
  totalWatchHours: number;
  topTitles: { title: string; views: number }[];
  dailyViews: { date: string; views: number; visitors: number }[];
  devices?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  languages?: Record<string, number>;
  topRoutes?: { path: string; views: number }[];
}

export interface ContentReport {
  id: string;
  mediaId: string | number;
  mediaTitle: string;
  userEmail?: string;
  reason: 'broken_video' | 'audio_sync' | 'wrong_subtitles' | 'copyright' | 'other';
  comment: string;
  createdAt: string;
  status: 'pending' | 'resolved';
}

export interface PushNotificationHistoryItem {
  id: string;
  title: string;
  message: string;
  image?: string;
  link?: string;
  sentAt: string;
  targetedCount: number;
  deliveredCount: number;
  failedCount: number;
}

export interface PartnershipInquiry {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  placementInterest?: string;
  message: string;
  createdAt: string;
  status: 'new' | 'reviewed';
}

export interface AppConfig {
  apkUrl: string;
  apkVersion: string;
  apkLabel: string;
  apkEnabled: boolean;
  apkDownloads: number;
  ownerNotificationEmail: string;
  ownerNotificationWebhook?: string;
  adsTxtContent: string;
  adNetworkHeadCode: string;
}

export type ActiveTab =
  | 'home'
  | 'direct'
  | 'movies'
  | 'series'
  | 'news'
  | 'watchlist'
  | 'partenariat'
  | 'movie'
  | 'series_detail'
  | 'episode'
  | 'admin';
