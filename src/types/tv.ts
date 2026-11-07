export interface EpisodeItem {
  episodeNumber: number;
  seasonNumber?: number;
  title: string;
  url: string;
  streamType?: 'hls' | 'mp4' | 'embed' | 'direct';
  alternativeServers?: Array<{
    label: string;
    url: string;
    streamType: 'hls' | 'mp4' | 'embed' | 'direct';
  }>;
}

export interface RecentWatchItem {
  id: string; // unique item id e.g. "hdhub-bigg-boss-s20-e05" or "hdhub-pathaan"
  movieId: string; // root movie ID
  title: string; // display title
  cleanTitle: string;
  poster: string;
  url: string; // catalog page url
  streamUrl: string;
  streamType?: 'hls' | 'mp4' | 'embed' | 'direct';
  currentTime: number; // in seconds
  duration: number; // in seconds
  progressPercent: number; // 0 - 100
  lastWatchedAt: string; // ISO date
  isSeries?: boolean;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string; // e.g. "S20 EP 5"
  completed?: boolean;
}

export interface StreamItem {
  id: string;
  title: string;
  description: string;
  streamUrl: string;
  sourceUrl: string;
  format: string;
  resolution: string;
  thumbnail: string;
  category: string;
  badge?: string;
  duration?: string;
  addedAt?: string;
  year?: string;
  languages?: string[];
  qualities?: string[];
  streamType?: 'hls' | 'mp4' | 'embed' | 'direct';
  alternativeServers?: Array<{
    label: string;
    url: string;
    streamType: 'hls' | 'mp4' | 'embed' | 'direct';
  }>;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  startTime?: number; // seconds to resume playback from
  movieId?: string;
}

export interface HDHubMovie {
  id: string;
  title: string;
  cleanTitle: string;
  year?: string;
  poster: string;
  url: string;
  category: string;
  languages: string[];
  qualities: string[];
  isSeries?: boolean;
}

export interface HDHubMovieDetail {
  title: string;
  cleanTitle: string;
  poster: string;
  storyline: string;
  trailerUrl?: string | null;
  qualities: string[];
  languages: string[];
  streamOptions: Array<{
    label: string;
    url: string;
    streamType: 'hls' | 'mp4' | 'embed' | 'direct';
    serverType?: 'hubcdn' | 'hubcloud' | 'watchonline' | 'hubdrive' | 'direct' | 'vidsrc' | 'embed';
  }>;
  episodes?: EpisodeItem[];
  sourceUrl: string;
  imdbId?: string;
  tmdbId?: number;
}

export type ContentProviderId = 'hdhub4u' | 'bollystream' | 'vegamovies' | 'archive';

export interface ContentProvider {
  id: ContentProviderId;
  name: string;
  tagline: string;
  badge: string;
}

export interface MirrorInfo {
  domain: string;
  isOnline: boolean;
  latencyMs?: number;
  hasCatalog?: boolean;
  isCurrent?: boolean;
}

export interface IPTVChannel {
  id: string;
  name: string;
  logo: string;
  group: string;
  streamUrl: string;
  resolution?: string;
  language?: string;
  country?: string;
  tvgId?: string;
  region?: 'hindi' | 'punjabi' | 'haryanvi' | 'english' | 'other';
  isWorking?: boolean;
  latencyMs?: number;
  lastChecked?: string;
}

export type TVTab = 'home' | 'livetv' | 'movies' | 'bollywood' | 'south' | 'hollywood' | 'webseries' | 'recent' | 'search' | 'watchlist' | 'library' | 'extractor' | 'remote' | 'settings';

export type AspectRatioMode = '16:9' | 'fill' | 'cinema' | '4:3';

export interface PlayerSettings {
  aspectRatio: AspectRatioMode;
  audioBoost: number; // 0, 3, 6 dB
  playbackRate: number; // 0.75, 1.0, 1.25, 1.5, 2.0
  soundEffects: boolean;
  sleepTimerMinutes: number | null;
}

export interface ExtractedStreamResult {
  title: string;
  description: string;
  sourceUrl: string;
  streamUrl: string;
  format: string;
  thumbnail?: string;
  resolution?: string;
  extractedAt: string;
  needsDirectStream?: boolean;
  message?: string;
}
