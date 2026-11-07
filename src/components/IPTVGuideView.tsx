import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { IPTVChannel, StreamItem } from '../types/tv';
import {
  Radio,
  Tv,
  Film,
  Flame,
  Globe,
  Sparkles,
  Search,
  Loader2,
  Star,
  CheckCircle2,
  Play,
  RotateCcw,
  Volume2,
  Flag,
  Filter,
  X,
  ShieldCheck,
  Zap,
  Activity,
  Check,
  AlertTriangle,
  Trophy,
  Newspaper,
  Music,
  Compass
} from 'lucide-react';
import { playFocusSound, playSelectSound } from '../utils/sound';

const VERIFIED_QUICK_CHANNELS: IPTVChannel[] = [
  {
    id: 'iptv-dd-sports',
    name: 'DD Sports HD',
    group: 'Sports',
    resolution: '1080P',
    language: 'Hindi',
    region: 'hindi',
    logo: 'https://dtil.tmsimg.com/assets/s158255_ld_h15_aa.png?lock=720x540',
    streamUrl: 'https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8',
    isWorking: true,
    latencyMs: 35,
  },
  {
    id: 'iptv-kabaddi-24x7',
    name: 'Kabaddi 24x7',
    group: 'Sports',
    resolution: '720P',
    language: 'Haryanvi',
    region: 'haryanvi',
    logo: 'https://papaji.freetvindia.com/media/kabaddi_24x7.png',
    streamUrl: 'https://samitaorigin.tangotv.in/KABADDI24X7/SAMITAORIGIN/index.m3u8',
    isWorking: true,
    latencyMs: 40,
  },
  {
    id: 'iptv-9xjalwa-hd',
    name: '9X Jalwa HD',
    group: 'Music',
    resolution: '1080P',
    language: 'Hindi',
    region: 'hindi',
    logo: 'https://xstreamcp-assets-msp.streamready.in/assets/LIVETV/LIVECHANNEL/LIVETV_LIVETVCHANNEL_9X_JALWA/images/LOGO_HD/image.png',
    streamUrl: 'https://wiselp.wiseplayout.com/9X_Jalwa/master.m3u8',
    isWorking: true,
    latencyMs: 38,
  },
  {
    id: 'iptv-aajtak-hd',
    name: 'Aaj Tak HD',
    group: 'News',
    resolution: '1080P',
    language: 'Hindi',
    region: 'hindi',
    logo: 'https://xstreamcp-assets-msp.streamready.in/assets/LIVETV/LIVECHANNEL/LIVETV_LIVETVCHANNEL_AAJ_TAK/images/LOGO_HD/image.png',
    streamUrl: 'https://feeds.intoday.in/aajtak/api/aajtakhd/master.m3u8',
    isWorking: true,
    latencyMs: 42,
  },
  {
    id: 'iptv-zee-delhi-ncr-haryana',
    name: 'Zee Delhi NCR Haryana',
    group: 'News',
    resolution: '720P',
    language: 'Haryanvi',
    region: 'haryanvi',
    logo: 'https://dtil.tmsimg.com/assets/GNLZZGG0023166M.png?lock=720x540',
    streamUrl: 'https://vg-zeefta.akamaized.net/ptnr-yupptv/title-zeedelhincr/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/cc483a15-1b39-4642-872d-5d08d362ed01/main.m3u8',
    isWorking: true,
    latencyMs: 48,
  },
  {
    id: 'iptv-total-tv-haryana',
    name: 'Total TV Haryana',
    group: 'News',
    resolution: '576P',
    language: 'Haryanvi',
    region: 'haryanvi',
    logo: 'https://xstreamcp-assets-msp.streamready.in/assets/LIVETV/LIVECHANNEL/LIVETV_LIVETVCHANNEL_TOTAL_TV/images/LOGO_HD/image.png',
    streamUrl: 'https://mumt04.tangotv.in/m18aqlK4TOTALTV/index.m3u8',
    isWorking: true,
    latencyMs: 52,
  },
  {
    id: 'iptv-chardikla-timetv',
    name: 'Chardikla Time TV',
    group: 'News',
    resolution: '1080P',
    language: 'Punjabi',
    region: 'punjabi',
    logo: 'https://xstreamcp-assets-msp.streamready.in/assets/LIVETV/LIVECHANNEL/LIVETV_LIVETVCHANNEL_CHARDIKLA_TIME_TV/images/LOGO_HD/image.png',
    streamUrl: 'https://chardikalagurbanitv.gigabitcdn.net/in-chardikala/chardikala-timetv/playlist.m3u8',
    isWorking: true,
    latencyMs: 49,
  },
  {
    id: 'iptv-living-india-news',
    name: 'Living India News',
    group: 'News',
    resolution: '1080P',
    language: 'Punjabi',
    region: 'punjabi',
    logo: 'https://papaji.freetvindia.com/media/Living_India_News.png',
    streamUrl: 'https://livingindiaottlive.akamaized.net/livingindia/index.m3u8',
    isWorking: true,
    latencyMs: 50,
  },
  {
    id: 'iptv-abpnews-hd',
    name: 'ABP News HD',
    group: 'News',
    resolution: '1080P',
    language: 'Hindi',
    region: 'hindi',
    logo: 'https://dtil.tmsimg.com/assets/s158138_ld_h15_aa.png?lock=720x540',
    streamUrl: 'https://d1rc86nwwc9fag.cloudfront.net/vglive-sk-472500/abpnews/master.m3u8',
    isWorking: true,
    latencyMs: 46,
  },
  {
    id: 'iptv-nasa-tv',
    name: 'NASA TV Live HD',
    group: 'Science',
    resolution: '1080P',
    language: 'English',
    region: 'english',
    logo: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=200&q=80',
    streamUrl: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    isWorking: true,
    latencyMs: 40,
  }
];

interface IPTVGuideViewProps {
  onPlayChannel: (stream: StreamItem) => void;
}

// Tier 1: Primary Region / Language Filter (Hindi + Haryanvi + Punjabi + English is default)
const REGION_FILTER_TABS = [
  { id: 'all-selected', label: 'All Selected (Haryanvi, Hindi, Punjabi, English)', icon: ShieldCheck, color: 'text-emerald-400', badge: 'Default' },
  { id: 'haryanvi', label: 'Haryanvi', icon: Flag, color: 'text-amber-400', badge: 'Haryanvi' },
  { id: 'hindi', label: 'Hindi', icon: Radio, color: 'text-indigo-400', badge: 'Hindi' },
  { id: 'punjabi', label: 'Punjabi', icon: Flame, color: 'text-rose-400', badge: 'Punjabi' },
  { id: 'english', label: 'English & Global', icon: Globe, color: 'text-cyan-400', badge: 'English' },
  { id: 'favorites', label: 'My Starred', icon: Star, color: 'text-yellow-400', badge: 'Favorites' },
  { id: 'all-global', label: 'All Global Feeds', icon: Tv, color: 'text-slate-400', badge: 'Global' },
];

// Tier 2: Category / Genre Sub-Filters
const GENRE_SUB_FILTERS = [
  { id: 'all', label: 'All Categories', icon: Compass },
  { id: 'sports', label: '⚽ Sports', icon: Trophy, hint: 'Cricket, Pro Kabaddi, Live Games' },
  { id: 'news', label: '📰 News & Live', icon: Newspaper, hint: 'Aaj Tak, Zee, ABP, Regional' },
  { id: 'music', label: '🎵 Music & Ragni', icon: Music, hint: '9X Jalwa, Tashan, Folk' },
  { id: 'entertainment', label: '🎬 Movies & Cinema', icon: Film, hint: 'Cinema & Classic Shows' },
  { id: 'religious', label: '🙏 Spiritual & Gurbani', icon: Sparkles, hint: 'Gurbani, Aastha, Bhajans' },
  { id: 'culture', label: '🎭 Culture & Regional', icon: Flame, hint: 'Folk, Festivals, Arts' },
  { id: 'science', label: '🔬 Science & Discovery', icon: Globe, hint: 'NASA, Space, Tech' },
];

const FAVORITES_STORAGE_KEY = 'caststream_iptv_favorites';

export const IPTVGuideView: React.FC<IPTVGuideViewProps> = ({ onPlayChannel }) => {
  // Dual-Tier Filter state: Region (Tier 1) + Genre Sub-Filter (Tier 2)
  const [activeRegion, setActiveRegion] = useState<string>('all-selected');
  const [activeGenre, setActiveGenre] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(true);

  const [channels, setChannels] = useState<IPTVChannel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(36);

  // Reset pagination on filter or search change to keep DOM small and fast
  useEffect(() => {
    setVisibleCount(36);
  }, [activeRegion, activeGenre, searchQuery]);

  // Load saved favorites
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
  }, []);

  const toggleFavorite = (channelId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playSelectSound();
    setFavorites((prev) => {
      const next = prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [channelId, ...prev];
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const loadChannels = useCallback(async (region: string, genre: string, isVerified: boolean) => {
    if (region === 'favorites') {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const url = `/api/iptv/channels?region=${encodeURIComponent(region)}&genre=${encodeURIComponent(genre)}&verifiedOnly=${isVerified}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.channels) {
        setChannels(data.channels);
      } else {
        setError(data.error || 'Failed to load IPTV channels');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching channels');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch when either Region or Genre Sub-Filter changes
  useEffect(() => {
    loadChannels(activeRegion, activeGenre, verifiedOnly);
  }, [activeRegion, activeGenre, verifiedOnly, loadChannels]);

  // Re-verify stream health across displayed channels
  const handleRecheckStreams = async () => {
    playSelectSound();
    setIsVerifying(true);
    try {
      await loadChannels(activeRegion, activeGenre, verifiedOnly);
    } finally {
      setIsVerifying(false);
    }
  };

  // Filter channels by search and favorites
  const displayedChannels = useMemo(() => {
    let list = channels;
    if (activeRegion === 'favorites') {
      list = channels.filter((ch) => favorites.includes(ch.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (ch) =>
          ch.name.toLowerCase().includes(q) ||
          ch.group.toLowerCase().includes(q) ||
          (ch.region && ch.region.toLowerCase().includes(q)) ||
          (ch.language && ch.language.toLowerCase().includes(q)) ||
          (ch.resolution && ch.resolution.toLowerCase().includes(q))
      );
    }

    // Sort: favorites first, then working status
    return [...list].sort((a, b) => {
      const aFav = favorites.includes(a.id) ? 1 : 0;
      const bFav = favorites.includes(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;

      const aWorking = a.isWorking ? 1 : 0;
      const bWorking = b.isWorking ? 1 : 0;
      return bWorking - aWorking;
    });
  }, [channels, activeRegion, favorites, searchQuery]);

  const handleChannelSelect = (ch: IPTVChannel) => {
    playSelectSound();

    const proxiedUrl = `/api/proxy/hls?url=${encodeURIComponent(ch.streamUrl)}`;
    const directUrl = ch.streamUrl;

    const alternativeServers = [
      {
        label: '⚡ Server 1: Smart Stream Proxy (Bypass CORS & SSL)',
        url: proxiedUrl,
        streamType: 'hls' as const,
      },
      {
        label: '🌐 Server 2: Direct Broadcast CDN',
        url: directUrl,
        streamType: 'hls' as const,
      },
    ];

    const streamItem: StreamItem = {
      id: ch.id,
      title: ch.name,
      description: `Live television broadcast via IPTV-org project. Region: ${ch.region ? ch.region.toUpperCase() : 'INDIA'} | Category: ${ch.group} | Resolution: ${ch.resolution || '1080p'}`,
      streamUrl: proxiedUrl,
      sourceUrl: ch.streamUrl,
      format: 'LIVE HLS',
      resolution: ch.resolution || '1080p',
      thumbnail: ch.logo || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80',
      category: `Live TV · ${ch.region ? ch.region.toUpperCase() : 'INDIA'} · ${ch.group}`,
      badge: 'LIVE',
      streamType: 'hls',
      qualities: [ch.resolution || '1080p FHD'],
      languages: [ch.language || 'Hindi'],
      alternativeServers,
    };
    onPlayChannel(streamItem);
  };

  const activeRegionObj = REGION_FILTER_TABS.find((t) => t.id === activeRegion);
  const activeGenreObj = GENRE_SUB_FILTERS.find((g) => g.id === activeGenre);

  return (
    <div className="w-full px-4 lg:px-8 py-5 select-none space-y-4">
      {/* Header Banner & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-emerald-400 mb-1">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>IPTV-org Open Directory</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-300 font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.2 rounded text-[10px]">
              DEFAULT: HARYANVI · HINDI · PUNJABI · ENGLISH
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-display font-black text-white tracking-tight">
            Live TV & Regional Broadcasts
          </h1>
        </div>

        {/* Status Pill & Live Count */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-white font-mono">
              {displayedChannels.length} Channels Online
            </span>
          </div>

          <button
            id="iptv-btn-recheck"
            data-tv-focusable="true"
            onClick={handleRecheckStreams}
            disabled={isVerifying}
            onFocus={playFocusSound}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white tv-btn-focus transition"
            title="Test stream latency and status"
          >
            <Activity className={`w-3.5 h-3.5 text-indigo-400 ${isVerifying ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isVerifying ? 'Testing...' : 'Health Check'}</span>
          </button>
        </div>
      </div>

      {/* SLEEK DUAL-PILL FILTER BAR (Tier 1: Region + Tier 2: Category) */}
      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
        {/* Tier 1: Region / Language Pill Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold shrink-0 mr-1 flex items-center gap-1">
            <Globe className="w-3 h-3 text-indigo-400" />
            Region:
          </span>
          {REGION_FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeRegion === tab.id;
            return (
              <button
                key={tab.id}
                id={`iptv-region-${tab.id}`}
                data-tv-focusable="true"
                onClick={() => {
                  playSelectSound();
                  setActiveRegion(tab.id);
                }}
                onFocus={playFocusSound}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-medium transition tv-btn-focus shrink-0 border ${
                  isActive
                    ? 'bg-indigo-600 text-white font-bold border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950/80 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.color}`} />
                <span>{tab.label.split('(')[0].trim()}</span>
                {tab.id === 'favorites' && favorites.length > 0 && (
                  <span className="bg-yellow-400/20 text-yellow-300 font-mono text-[9px] px-1 py-0.2 rounded-full font-bold">
                    {favorites.length}
                  </span>
                )}
                {tab.id === 'all-selected' && (
                  <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[8px] px-1 py-0.2 rounded border border-emerald-500/40">
                    DEFAULT
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tier 2: Category / Genre Sub-Filter Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1 border-t border-slate-800/60">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-violet-400" />
            Category:
          </span>
          {GENRE_SUB_FILTERS.map((g) => {
            const isGenreActive = activeGenre === g.id;
            return (
              <button
                key={g.id}
                id={`iptv-genre-sub-${g.id}`}
                data-tv-focusable="true"
                onClick={() => {
                  playSelectSound();
                  setActiveGenre(g.id);
                }}
                onFocus={playFocusSound}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition tv-btn-focus shrink-0 border ${
                  isGenreActive
                    ? 'bg-violet-600 text-white font-bold border-violet-500 shadow-md shadow-violet-600/30'
                    : 'bg-slate-950/80 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                }`}
              >
                <span>{g.label}</span>
              </button>
            );
          })}
        </div>

        {/* Integrated Action Strip: Active Badge, Reset, Verified Toggle & Inline Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Active Combination Chip */}
            <div className="flex items-center gap-1.5 text-xs py-1 px-2.5 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-slate-400 font-mono text-[10px]">Filter:</span>
              <span className="text-indigo-300 font-semibold text-[11px]">
                {activeRegionObj ? activeRegionObj.label.split('(')[0].trim() : activeRegion}
              </span>
              <span className="text-slate-500 font-bold">+</span>
              <span className="text-violet-300 font-semibold text-[11px]">
                {activeGenreObj ? activeGenreObj.label : activeGenre}
              </span>
            </div>

            {/* One-Click Clear / Reset Button */}
            {(activeGenre !== 'all' || activeRegion !== 'all-selected' || searchQuery) && (
              <button
                id="iptv-btn-reset-filters"
                data-tv-focusable="true"
                onClick={() => {
                  playSelectSound();
                  setActiveRegion('all-selected');
                  setActiveGenre('all');
                  setSearchQuery('');
                }}
                onFocus={playFocusSound}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs tv-btn-focus border border-slate-700 font-medium"
              >
                <X className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}

            {/* Verified Health Toggle */}
            <button
              id="iptv-filter-verified-toggle"
              data-tv-focusable="true"
              onClick={() => {
                playSelectSound();
                setVerifiedOnly(!verifiedOnly);
              }}
              onFocus={playFocusSound}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition tv-btn-focus border ${
                verifiedOnly
                  ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
              title="Toggle to hide or show unverified streams"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${verifiedOnly ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>{verifiedOnly ? 'Verified Feeds Only' : 'All Feeds'}</span>
            </button>
          </div>

          {/* Inline Fast Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="iptv-search-input"
              data-tv-focusable="true"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search channel or sports..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg pl-8 pr-7 py-1 text-xs text-white placeholder-slate-500 outline-none transition tv-btn-focus"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
                title="Clear Search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Verified Instant Play Channels Strip (Fast 1-Click Launch) */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">
              Quick Launch Tested Streams
            </span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.2 rounded border border-emerald-500/40">
              CORS & SSL Proxied
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">1-Click Fullscreen</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {VERIFIED_QUICK_CHANNELS.map((vCh, vIdx) => (
            <button
              key={vCh.id}
              id={`verified-quick-${vIdx}`}
              data-tv-focusable="true"
              onClick={() => handleChannelSelect(vCh)}
              onFocus={playFocusSound}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-indigo-600/90 border border-slate-800 hover:border-indigo-500 text-left transition shrink-0 tv-btn-focus group shadow-sm"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <div className="w-4 h-4 rounded bg-black/60 flex items-center justify-center overflow-hidden shrink-0">
                {vCh.logo ? (
                  <img src={vCh.logo} alt="" loading="lazy" decoding="async" className="w-full h-full object-contain" />
                ) : (
                  <Tv className="w-2.5 h-2.5 text-slate-400" />
                )}
              </div>
              <span className="text-[11px] font-semibold text-white group-hover:text-white whitespace-nowrap">
                {vCh.name}
              </span>
              <Play className="w-2.5 h-2.5 text-slate-400 group-hover:text-white shrink-0 fill-current ml-0.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Main Full-Width Channel Grid - Lightweight & Budget TV Optimized */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-xs text-slate-400 font-mono">
            Loading live feeds for {activeRegionObj ? activeRegionObj.label.split('(')[0].trim() : activeRegion}...
          </span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-950/20 border border-red-800/40 text-center max-w-md mx-auto space-y-3">
          <p className="text-xs text-red-300">{error}</p>
          <button
            onClick={() => loadChannels(activeRegion, activeGenre, verifiedOnly)}
            className="px-3.5 py-1.5 rounded-xl bg-red-900/60 hover:bg-red-800 text-white text-xs font-semibold"
          >
            Retry Connection
          </button>
        </div>
      ) : displayedChannels.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-slate-900/40 border border-slate-800 max-w-md mx-auto space-y-3">
          <Tv className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">
            No Channels Found for "{activeRegionObj?.label.split('(')[0].trim()}" + "{activeGenreObj?.label}"
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Try switching to Hindi Sports (DD Sports HD) or All Selected Sports for more live feeds.
          </p>
          <button
            onClick={() => {
              setActiveRegion('all-selected');
              setActiveGenre('all');
              setVerifiedOnly(true);
              setSearchQuery('');
            }}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Reset Filters to Default
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {displayedChannels.slice(0, visibleCount).map((channel, idx) => {
            const isFav = favorites.includes(channel.id);
            const isOnline = channel.isWorking !== false;

            return (
              <div
                key={channel.id}
                id={`iptv-card-${idx}`}
                data-tv-focusable="true"
                onClick={() => handleChannelSelect(channel)}
                onFocus={playFocusSound}
                className="tv-perf-contain group relative rounded-xl bg-[#0e121b] border border-slate-800/80 hover:border-indigo-500 transition-transform duration-150 cursor-pointer flex flex-col justify-between overflow-hidden tv-card-focus p-3"
              >
                {/* Top Bar: Quality & Region Badge & Favorite Toggle */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="bg-slate-950 border border-slate-800 text-slate-300 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded">
                      {channel.resolution || '1080P'}
                    </span>
                    {channel.region && (
                      <span className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.2 rounded border ${
                        channel.region === 'haryanvi'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                          : channel.region === 'punjabi'
                          ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                          : channel.region === 'english'
                          ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60'
                          : 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60'
                      }`}>
                        {channel.region}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => toggleFavorite(channel.id, e)}
                    className="p-1 rounded-lg text-slate-400 hover:text-yellow-400 transition"
                    title="Toggle Favorite"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        isFav ? 'fill-yellow-400 text-yellow-400' : 'hover:text-yellow-400'
                      }`}
                    />
                  </button>
                </div>

                {/* Channel Logo Area with SVG Fallback */}
                <div className="aspect-video w-full rounded-lg bg-black flex items-center justify-center p-2 relative overflow-hidden group-hover:bg-slate-950 transition-colors">
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain filter drop-shadow"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-slate-600">
                      <Tv className="w-6 h-6 text-indigo-400/60" />
                      <span className="text-[9px] font-mono font-bold text-slate-400 line-clamp-1 text-center">
                        {channel.name}
                      </span>
                    </div>
                  )}

                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Channel Info & Status */}
                <div className="mt-2 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <span className={`text-[9px] font-mono uppercase font-bold ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isOnline ? 'LIVE' : 'OFFLINE'}
                      </span>
                    </div>

                    {channel.latencyMs && (
                      <span className="text-[8px] font-mono text-slate-500">
                        {channel.latencyMs}ms
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                    {channel.name}
                  </h3>

                  <p className="text-[10px] text-slate-400 truncate">
                    {channel.group} · {channel.language || 'Hindi'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Low-Memory Pagination Trigger: Load More Channels */}
        {visibleCount < displayedChannels.length && (
          <div className="py-6 flex justify-center">
            <button
              id="iptv-btn-load-more"
              data-tv-focusable="true"
              onClick={() => {
                playSelectSound();
                setVisibleCount((prev) => prev + 36);
              }}
              onFocus={playFocusSound}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-semibold text-xs transition tv-btn-focus"
            >
              <span>Load More Channels ({visibleCount} of {displayedChannels.length})</span>
            </button>
          </div>
        )}
        </div>
      )}
    </div>
  );
};
