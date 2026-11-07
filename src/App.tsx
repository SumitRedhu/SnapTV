/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StreamItem, HDHubMovie, TVTab, RecentWatchItem, ContentProviderId } from './types/tv';
import { TVSidebar } from './components/TVSidebar';
import { HDHubMovieCard } from './components/HDHubMovieCard';
import { HDHubMovieDetailModal } from './components/HDHubMovieDetailModal';
import { HDHubSearchView } from './components/HDHubSearchView';
import { TVPlayer } from './components/TVPlayer';
import { WebExtractorView } from './components/WebExtractorView';
import { PhoneRemoteModal } from './components/PhoneRemoteModal';
import { CompanionMobileRemote } from './components/CompanionMobileRemote';
import { VirtualTVRemoteHUD } from './components/VirtualTVRemoteHUD';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { ProviderAndMirrorModal } from './components/ProviderAndMirrorModal';
import { IPTVGuideView } from './components/IPTVGuideView';
import { useTVNavigation } from './hooks/useTVNavigation';
import { playFocusSound, playSelectSound, setSoundEffectsEnabled } from './utils/sound';
import {
  Play,
  Bookmark,
  Tv,
  Sparkles,
  Smartphone,
  Sliders,
  Trash2,
  Film,
  Flame,
  Globe,
  Settings,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  RotateCcw,
  X,
  History,
  Layers,
  Compass
} from 'lucide-react';

const DEFAULT_WATCHLIST_KEY = 'caststream_tv_watchlist';
const DEFAULT_DOMAIN_KEY = 'caststream_hdhub_domain';

export default function App() {
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const companionPairCode = urlParams?.get('pair');

  const [isCompanionMode, setIsCompanionMode] = useState<boolean>(!!companionPairCode);
  const [activeTab, setActiveTab] = useState<TVTab>('livetv');
  const [moviesSubFilter, setMoviesSubFilter] = useState<'all' | 'bollywood' | 'south' | 'hollywood'>('all');
  const [librarySubTab, setLibrarySubTab] = useState<'recent' | 'watchlist'>('recent');
  const [hdhubDomain, setHdhubDomain] = useState<string>('https://new11.hdhub4u.cl');

  // Movies State
  const [featuredMovies, setFeaturedMovies] = useState<HDHubMovie[]>([]);
  const [bollywoodMovies, setBollywoodMovies] = useState<HDHubMovie[]>([]);
  const [hollywoodMovies, setHollywoodMovies] = useState<HDHubMovie[]>([]);
  const [webSeriesMovies, setWebSeriesMovies] = useState<HDHubMovie[]>([]);
  const [southMovies, setSouthMovies] = useState<HDHubMovie[]>([]);

  // Series Pagination & Filter State
  const [seriesPage, setSeriesPage] = useState<number>(1);
  const [isLoadingMoreSeries, setIsLoadingMoreSeries] = useState<boolean>(false);
  const [seriesSearchQuery, setSeriesSearchQuery] = useState<string>('');
  const [seriesCategoryFilter, setSeriesCategoryFilter] = useState<'all' | 'hindi' | 'multiaudio' | 'latest'>('all');

  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Selected Movie for Modal
  const [selectedMovie, setSelectedMovie] = useState<HDHubMovie | null>(null);
  const [watchlist, setWatchlist] = useState<StreamItem[]>([]);
  const [activeStream, setActiveStream] = useState<StreamItem | null>(null);
  const [recentWatched, setRecentWatched] = useState<RecentWatchItem[]>([]);
  const [recentFilter, setRecentFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  // Load Recent Watch Progress
  const loadRecentWatched = useCallback(() => {
    try {
      const raw = localStorage.getItem('caststream_recent_watched');
      if (raw) {
        setRecentWatched(JSON.parse(raw));
      } else {
        setRecentWatched([]);
      }
    } catch {
      // Storage fallback
    }
  }, []);

  const removeRecentWatched = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const raw = localStorage.getItem('caststream_recent_watched');
      const list: RecentWatchItem[] = raw ? JSON.parse(raw) : [];
      const updated = list.filter((i) => i.id !== id);
      setRecentWatched(updated);
      localStorage.setItem('caststream_recent_watched', JSON.stringify(updated));
    } catch {}
  };

  const clearAllRecentWatched = () => {
    try {
      localStorage.removeItem('caststream_recent_watched');
      setRecentWatched([]);
    } catch {}
  };

  const formatDuration = (secs: number) => {
    if (!secs || isNaN(secs)) return '0m';
    const m = Math.floor(secs / 60);
    const h = Math.floor(m / 60);
    if (h > 0) {
      return `${h}h ${m % 60}m`;
    }
    return `${m}m`;
  };

  const handleResumeRecent = (item: RecentWatchItem) => {
    playSelectSound();
    const streamItem: StreamItem = {
      id: item.id,
      movieId: item.movieId,
      title: item.isSeries && item.episodeTitle ? `${item.cleanTitle} - ${item.episodeTitle}` : item.cleanTitle,
      description: `Resuming playback from ${formatDuration(item.currentTime)}`,
      streamUrl: item.streamUrl,
      sourceUrl: item.url,
      format: item.isSeries ? item.episodeTitle || 'Episode' : 'Movie',
      resolution: '1080p',
      thumbnail: item.poster,
      category: item.isSeries ? 'Web Series' : 'HDHub4u Cinema',
      badge: item.isSeries ? item.episodeTitle || 'SERIES' : 'RESUME',
      streamType: item.streamType || (item.streamUrl.includes('/api/proxy/hls') ? 'hls' : 'embed'),
      startTime: item.currentTime,
      seasonNumber: item.seasonNumber,
      episodeNumber: item.episodeNumber,
      episodeTitle: item.episodeTitle,
    };
    setActiveStream(streamItem);
  };

  // Phone Pairing
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isVirtualRemoteOpen, setIsVirtualRemoteOpen] = useState(false);
  const [showDomainSettings, setShowDomainSettings] = useState(false);
  const [tempDomainInput, setTempDomainInput] = useState('');

  // TV Navigation integration
  const { moveFocus, setFocusedId } = useTVNavigation({
    enabled: !activeStream && !isCompanionMode && !selectedMovie,
    onBack: () => {
      if (selectedMovie) {
        setSelectedMovie(null);
      } else if (isPhoneModalOpen) {
        setIsPhoneModalOpen(false);
      } else if (isProviderModalOpen) {
        setIsProviderModalOpen(false);
      } else if (activeTab !== 'livetv') {
        setActiveTab('livetv');
      }
    },
  });

  // Load Custom Domain, Watchlist & Recent History
  useEffect(() => {
    try {
      const savedDomain = localStorage.getItem(DEFAULT_DOMAIN_KEY);
      if (savedDomain) {
        setHdhubDomain(savedDomain);
        setTempDomainInput(savedDomain);
      } else {
        setTempDomainInput('https://new11.hdhub4u.cl');
      }

      const savedWatchlist = localStorage.getItem(DEFAULT_WATCHLIST_KEY);
      if (savedWatchlist) {
        setWatchlist(JSON.parse(savedWatchlist));
      }

      loadRecentWatched();
    } catch {
      // Ignore storage errors
    }
  }, [loadRecentWatched]);

  const [activeProvider, setActiveProvider] = useState<ContentProviderId>('hdhub4u');
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);

  // Fetch Catalogs from HDHub4u or Alternate Integrators
  const loadCatalogs = useCallback(async (domainToUse = hdhubDomain, provider = activeProvider) => {
    setIsLoadingCatalog(true);
    setCatalogError(null);

    try {
      if (provider === 'bollystream') {
        const res = await fetch('/api/bollystream/catalog');
        const data = await res.json();
        if (data.success && data.movies) {
          const all: HDHubMovie[] = data.movies;
          setFeaturedMovies(all);
          setBollywoodMovies(all.filter((m: any) => m.category.includes('Bollywood')));
          setWebSeriesMovies(all.filter((m: any) => m.isSeries));
          setSouthMovies(all.filter((m: any) => m.category.includes('South')));
          setHollywoodMovies([]);
        }
      } else if (provider === 'vegamovies') {
        const [resLatest, resSeries, resAction, resSouth] = await Promise.allSettled([
          fetch('/api/vegamovies/catalog?category=latest').then(r => r.json()),
          fetch('/api/vegamovies/catalog?category=webseries').then(r => r.json()),
          fetch('/api/vegamovies/catalog?category=action').then(r => r.json()),
          fetch('/api/vegamovies/catalog?category=south').then(r => r.json()),
        ]);

        const latestMovies = resLatest.status === 'fulfilled' && resLatest.value?.movies ? resLatest.value.movies : [];
        const seriesMovies = resSeries.status === 'fulfilled' && resSeries.value?.movies ? resSeries.value.movies : [];
        const actionMovies = resAction.status === 'fulfilled' && resAction.value?.movies ? resAction.value.movies : [];
        const southMoviesList = resSouth.status === 'fulfilled' && resSouth.value?.movies ? resSouth.value.movies : [];

        setFeaturedMovies(latestMovies.length > 0 ? latestMovies : actionMovies);
        setBollywoodMovies(latestMovies.filter((m: any) => !m.isSeries));
        setWebSeriesMovies(seriesMovies.length > 0 ? seriesMovies : latestMovies.filter((m: any) => m.isSeries));
        setHollywoodMovies(actionMovies);
        setSouthMovies(southMoviesList.length > 0 ? southMoviesList : latestMovies.slice(0, 10));
      } else if (provider === 'archive') {
        const res = await fetch('/api/archive/catalog');
        const data = await res.json();
        if (data.success && data.movies) {
          const all: HDHubMovie[] = data.movies;
          setFeaturedMovies(all);
          setBollywoodMovies(all);
          setWebSeriesMovies([]);
          setSouthMovies([]);
          setHollywoodMovies([]);
        }
      } else {
        // HDHub4u Ultra with mirror failover
        const [resLatest, resBollywood, resHollywood, resSeries, resSouth] = await Promise.allSettled([
          fetch(`/api/hdhub/catalog?category=latest&domain=${encodeURIComponent(domainToUse)}`).then(r => r.json()),
          fetch(`/api/hdhub/catalog?category=bollywood&domain=${encodeURIComponent(domainToUse)}`).then(r => r.json()),
          fetch(`/api/hdhub/catalog?category=hollywood&domain=${encodeURIComponent(domainToUse)}`).then(r => r.json()),
          fetch(`/api/hdhub/catalog?category=webseries&domain=${encodeURIComponent(domainToUse)}`).then(r => r.json()),
          fetch(`/api/hdhub/catalog?category=south&domain=${encodeURIComponent(domainToUse)}`).then(r => r.json()),
        ]);

        if (resLatest.status === 'fulfilled' && resLatest.value?.movies) {
          setFeaturedMovies(resLatest.value.movies);
        }
        if (resBollywood.status === 'fulfilled' && resBollywood.value?.movies) {
          setBollywoodMovies(resBollywood.value.movies);
        }
        if (resHollywood.status === 'fulfilled' && resHollywood.value?.movies) {
          setHollywoodMovies(resHollywood.value.movies);
        }
        if (resSeries.status === 'fulfilled' && resSeries.value?.movies) {
          setWebSeriesMovies(resSeries.value.movies);
        }
        if (resSouth.status === 'fulfilled' && resSouth.value?.movies) {
          setSouthMovies(resSouth.value.movies);
        }
      }
    } catch (err: any) {
      setCatalogError(err.message || 'Unable to connect to content provider');
    } finally {
      setIsLoadingCatalog(false);
      setSeriesPage(1);
    }
  }, [hdhubDomain, activeProvider]);

  // Load More Web Series Handler
  const handleLoadMoreSeries = async () => {
    if (isLoadingMoreSeries) return;
    setIsLoadingMoreSeries(true);
    playSelectSound();

    try {
      const nextPage = seriesPage + 1;
      let endpoint = `/api/hdhub/catalog?category=webseries&domain=${encodeURIComponent(hdhubDomain)}&page=${nextPage}`;
      if (activeProvider === 'vegamovies') {
        endpoint = `/api/vegamovies/catalog?category=webseries&page=${nextPage}`;
      }

      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.success && Array.isArray(data.movies) && data.movies.length > 0) {
        setWebSeriesMovies((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const newItems = data.movies.filter((m: any) => !seen.has(m.id));
          return [...prev, ...newItems];
        });
        setSeriesPage(nextPage);
      }
    } catch (err) {
      console.warn('Failed to load more series:', err);
    } finally {
      setIsLoadingMoreSeries(false);
    }
  };

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  // Safe Initialize TV Remote Pairing Session with graceful retry
  useEffect(() => {
    if (isCompanionMode) return;
    let isCancelled = false;

    const initSession = async () => {
      try {
        const res = await fetch('/api/remote/create-session', { method: 'POST' });
        const cType = res.headers.get('content-type') || '';
        if (res.ok && cType.includes('application/json')) {
          const data = await res.json();
          if (!isCancelled && data?.success && data.code) {
            setPairingCode(data.code);
            return;
          }
        }
      } catch {
        // Dev server or background process starting
      }
      if (!isCancelled) {
        setTimeout(initSession, 3000);
      }
    };

    initSession();

    return () => {
      isCancelled = true;
    };
  }, [isCompanionMode]);

  // Polling for Phone Remote Commands with content-type verification
  useEffect(() => {
    if (!pairingCode || isCompanionMode) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/remote/session/${pairingCode}?role=tv`);
        const cType = res.headers.get('content-type') || '';
        if (res.ok && cType.includes('application/json')) {
          const data = await res.json();
          if (data.actions && data.actions.length > 0) {
            for (const act of data.actions) {
              handleRemoteAction(act);
            }
          }
        }
      } catch {
        // Poll error
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [pairingCode, isCompanionMode, activeStream]);

  // Remote Action Dispatcher
  const handleRemoteAction = (actionItem: { action: string; payload?: any }) => {
    const { action, payload } = actionItem;

    if (action === 'play_stream' && payload) {
      const stream: StreamItem = {
        id: `phone-${Date.now()}`,
        title: payload.title || 'Stream from Phone',
        description: payload.description || 'Web stream received from phone remote.',
        streamUrl: payload.streamUrl,
        sourceUrl: payload.sourceUrl || payload.streamUrl,
        format: payload.format || 'HDHub Stream',
        resolution: payload.resolution || '1080p',
        thumbnail: payload.thumbnail || '',
        category: payload.category || 'Phone Cast',
        badge: 'CASTED',
      };
      setActiveStream(stream);
      setIsPhoneModalOpen(false);
      setSelectedMovie(null);
    } else if (action === 'dpad') {
      const key = payload?.key;
      if (key === 'ArrowUp') moveFocus('up');
      else if (key === 'ArrowDown') moveFocus('down');
      else if (key === 'ArrowLeft') moveFocus('left');
      else if (key === 'ArrowRight') moveFocus('right');
      else if (key === 'Enter') {
        const active = document.activeElement as HTMLElement;
        if (active) active.click();
      } else if (key === 'Escape') {
        if (activeStream) setActiveStream(null);
        else if (selectedMovie) setSelectedMovie(null);
        else if (isPhoneModalOpen) setIsPhoneModalOpen(false);
        else setActiveTab('home');
      }
    } else if (action === 'tab') {
      if (payload?.tab) {
        setActiveTab(payload.tab);
        setActiveStream(null);
        setSelectedMovie(null);
      }
    }
  };

  const toggleWatchlist = (item: StreamItem) => {
    playSelectSound();
    setWatchlist((prev) => {
      const exists = prev.some((i) => i.id === item.id || i.streamUrl === item.streamUrl);
      let updated: StreamItem[];
      if (exists) {
        updated = prev.filter((i) => i.id !== item.id && i.streamUrl !== item.streamUrl);
      } else {
        updated = [item, ...prev];
      }
      try {
        localStorage.setItem(DEFAULT_WATCHLIST_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const isBookmarked = (id: string, url: string) => {
    return watchlist.some((i) => i.id === id || i.sourceUrl === url);
  };

  const handleSaveDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempDomainInput.trim()) return;
    const clean = tempDomainInput.trim().replace(/\/+$/, '');
    setHdhubDomain(clean);
    try {
      localStorage.setItem(DEFAULT_DOMAIN_KEY, clean);
    } catch {}
    setShowDomainSettings(false);
    loadCatalogs(clean);
  };

  // If user opens direct companion link on phone
  if (isCompanionMode && companionPairCode) {
    return (
      <CompanionMobileRemote
        pairingCode={companionPairCode}
        onExitCompanion={() => setIsCompanionMode(false)}
      />
    );
  }

  // Hero Spotlight Movie (first movie in featured)
  const spotlightMovie = featuredMovies[0] || null;

  return (
    <div className="h-screen w-full bg-[#080b10] text-slate-100 flex flex-row font-sans select-none overflow-hidden">
      {/* Docked TV Sidebar Navigation (Always sticky & permanently pinned to the left edge) */}
      <TVSidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          playSelectSound();
          if (tab === 'remote') {
            setIsPhoneModalOpen(true);
          } else {
            setActiveTab(tab);
            if (tab === 'movies') setMoviesSubFilter('all');
            if (tab === 'library') setLibrarySubTab('recent');
          }
        }}
        onOpenExtractor={() => {
          playSelectSound();
          setActiveTab('extractor');
        }}
        onToggleVirtualRemote={() => {
          playSelectSound();
          setIsVirtualRemoteOpen(!isVirtualRemoteOpen);
        }}
        isVirtualRemoteOpen={isVirtualRemoteOpen}
        pairingCode={pairingCode}
        onOpenSettings={() => {
          playSelectSound();
          setIsProviderModalOpen(true);
        }}
      />

      {/* Main Viewport Content Area (Smoothly scrolls while sidebar stays permanently pinned) */}
      <div className="flex-1 min-w-0 h-screen overflow-y-auto no-scrollbar flex flex-col">
        {/* PWA Android TV Install Banner (Top banner across content viewport) */}
        <PWAInstallBanner />

        {/* Source Provider & Mirror Health Indicator Bar */}
        <div className="bg-slate-950/90 border-b border-slate-900 px-6 lg:px-12 py-2 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-400">Provider:</span>
              <span className="text-white font-bold">
                {activeProvider === 'hdhub4u'
                  ? 'HDHub4u Ultra'
                  : activeProvider === 'bollystream'
                  ? 'BollyStream OTT Vault'
                  : 'Golden Hindi Classics'}
              </span>
            </div>

            {activeProvider === 'hdhub4u' && (
              <div className="flex items-center gap-2 text-slate-300">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-mono text-slate-200">{hdhubDomain}</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Auto-Healing Active
                </span>
              </div>
            )}

            {activeProvider === 'bollystream' && (
              <span className="text-violet-300 flex items-center gap-1 font-semibold text-[10px] bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                Direct 1080p OTT Stream Verified
              </span>
            )}

            {activeProvider === 'archive' && (
              <span className="text-cyan-300 flex items-center gap-1 font-semibold text-[10px] bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                <Film className="w-3 h-3" />
                Internet Archive 1080p Master
              </span>
            )}
          </div>

          <button
            onClick={() => {
              playSelectSound();
              setIsProviderModalOpen(true);
            }}
            className="text-slate-300 hover:text-white flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl transition text-xs font-medium tv-btn-focus"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>Integrators & Mirrors</span>
          </button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 pb-16">
          {/* HUB 2: MOVIES & CINEMA */}
          {(activeTab === 'home' || activeTab === 'movies') && (
          <div className="space-y-8">
            {/* Movies Hub Sub-Filter Bar */}
            <div className="tv-safe-zone pt-6 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-400 mb-1">
                  <Film className="w-4 h-4" />
                  <span>HDHub4u Cinema Hub</span>
                </div>
                <h1 className="text-2xl lg:text-3xl font-display font-black text-white tracking-tight">
                  Movies & Premieres
                </h1>
              </div>

              {/* Clean Sub-Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  id="movies-sub-all"
                  data-tv-focusable="true"
                  onClick={() => {
                    playSelectSound();
                    setMoviesSubFilter('all');
                  }}
                  onFocus={playFocusSound}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition tv-btn-focus border ${
                    moviesSubFilter === 'all'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
                  }`}
                >
                  Featured & Releases
                </button>
                <button
                  id="movies-sub-bollywood"
                  data-tv-focusable="true"
                  onClick={() => {
                    playSelectSound();
                    setMoviesSubFilter('bollywood');
                  }}
                  onFocus={playFocusSound}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition tv-btn-focus border ${
                    moviesSubFilter === 'bollywood'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
                  }`}
                >
                  Bollywood ({bollywoodMovies.length})
                </button>
                <button
                  id="movies-sub-south"
                  data-tv-focusable="true"
                  onClick={() => {
                    playSelectSound();
                    setMoviesSubFilter('south');
                  }}
                  onFocus={playFocusSound}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition tv-btn-focus border ${
                    moviesSubFilter === 'south'
                      ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                      : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
                  }`}
                >
                  South Hindi ({southMovies.length})
                </button>
                <button
                  id="movies-sub-hollywood"
                  data-tv-focusable="true"
                  onClick={() => {
                    playSelectSound();
                    setMoviesSubFilter('hollywood');
                  }}
                  onFocus={playFocusSound}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition tv-btn-focus border ${
                    moviesSubFilter === 'hollywood'
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30'
                      : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
                  }`}
                >
                  Hollywood Dual Audio ({hollywoodMovies.length})
                </button>
              </div>
            </div>

            {/* Sub-Filter View: Bollywood Catalog */}
            {moviesSubFilter === 'bollywood' && (
              <section className="tv-safe-zone space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {bollywoodMovies.map((movie, idx) => (
                    <HDHubMovieCard
                      key={`${movie.id}-bollyhub-${idx}`}
                      movie={movie}
                      onSelect={(m) => setSelectedMovie(m)}
                      index={idx}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Sub-Filter View: South Hindi Catalog */}
            {moviesSubFilter === 'south' && (
              <section className="tv-safe-zone space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {southMovies.map((movie, idx) => (
                    <HDHubMovieCard
                      key={`${movie.id}-southhub-${idx}`}
                      movie={movie}
                      onSelect={(m) => setSelectedMovie(m)}
                      index={idx}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Sub-Filter View: Hollywood Catalog */}
            {moviesSubFilter === 'hollywood' && (
              <section className="tv-safe-zone space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {hollywoodMovies.map((movie, idx) => (
                    <HDHubMovieCard
                      key={`${movie.id}-hollyhub-${idx}`}
                      movie={movie}
                      onSelect={(m) => setSelectedMovie(m)}
                      index={idx}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Sub-Filter View: All Releases & Spotlight Hero */}
            {moviesSubFilter === 'all' && (
              <div className="space-y-10">
            {/* Cinematic Hero Spotlight */}
            {spotlightMovie && (
              <section className="relative w-full h-[58vh] min-h-[400px] max-h-[580px] overflow-hidden flex items-end">
                {/* Backdrop Artwork */}
                <div className="absolute inset-0 bg-slate-950">
                  {spotlightMovie.poster ? (
                    <img
                      src={spotlightMovie.poster}
                      alt={spotlightMovie.cleanTitle}
                      className="w-full h-full object-cover object-center opacity-30 filter brightness-90 contrast-125 scale-105"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14] via-[#0b0e14]/75 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0b0e14] via-[#0b0e14]/60 to-transparent w-3/4" />
                </div>

                {/* Spotlight Details */}
                <div className="relative z-10 tv-safe-zone max-w-4xl pb-10 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
                    <span className="bg-amber-950/90 border border-amber-600/70 font-mono font-bold px-2 py-0.5 rounded text-[11px] text-amber-200">
                      TRENDING ON HDHUB4U
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-slate-300 font-mono">{spotlightMovie.qualities.join(' · ')}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-slate-300">{spotlightMovie.languages.join(', ')}</span>
                  </div>

                  <h1 className="text-3xl lg:text-5xl font-display font-extrabold text-white tracking-tight leading-tight">
                    {spotlightMovie.cleanTitle}
                  </h1>

                  <p className="text-xs lg:text-sm text-slate-300 line-clamp-2 max-w-2xl leading-relaxed">
                    {spotlightMovie.title}
                  </p>

                  <div className="flex items-center gap-4 pt-2">
                    <button
                      id="hero-btn-play"
                      data-tv-focusable="true"
                      onClick={() => {
                        playSelectSound();
                        setSelectedMovie(spotlightMovie);
                      }}
                      className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/40 tv-btn-focus transition"
                    >
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                      <span>Watch Movie (Stream Options)</span>
                    </button>

                    <button
                      id="hero-btn-search"
                      data-tv-focusable="true"
                      onClick={() => setActiveTab('search')}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/70 font-semibold text-sm tv-btn-focus transition"
                    >
                      <Search className="w-4 h-4 text-emerald-400" />
                      <span>Search Movies</span>
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Row 0: Continue Watching / Recent Viewed Shelf */}
            {recentWatched.length > 0 && (
              <section className="tv-safe-zone space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-amber-400" />
                    <h2 className="text-xl font-display font-bold text-white tracking-tight">
                      Continue Watching ({recentWatched.length})
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('recent')}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                  >
                    View All History →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {recentWatched.slice(0, 6).map((item, idx) => (
                    <div
                      key={item.id}
                      id={`recent-card-${idx}`}
                      data-tv-focusable="true"
                      onClick={() => handleResumeRecent(item)}
                      onFocus={playFocusSound}
                      className="group relative rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/80 transition-all duration-300 hover:scale-[1.03] shadow-lg cursor-pointer flex flex-col overflow-hidden tv-card-focus"
                    >
                      {/* Poster Art with gradient scrim */}
                      <div className="aspect-[2/3] w-full relative overflow-hidden bg-slate-950">
                        <img
                          src={item.poster}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                        {/* Top Badge: Episode or Progress */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {item.isSeries && (
                            <span className="bg-violet-600/90 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow">
                              {item.episodeTitle || `EP ${item.episodeNumber || 1}`}
                            </span>
                          )}
                          {item.completed && (
                            <span className="bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Watched
                            </span>
                          )}
                        </div>

                        {/* Dismiss / Remove Button */}
                        <button
                          onClick={(e) => removeRecentWatched(item.id, e)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-red-600 text-slate-300 hover:text-white transition opacity-0 group-hover:opacity-100 z-10"
                          title="Remove from history"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        {/* Center Resume Hover Action */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </div>

                        {/* Bottom Progress Bar right on poster */}
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-indigo-500"
                            style={{ width: `${item.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Card Meta */}
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-400 transition-colors">
                            {item.cleanTitle}
                          </h3>
                          {item.isSeries && item.episodeTitle && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {item.episodeTitle}
                            </p>
                          )}
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>{item.completed ? 'Finished' : `${item.progressPercent}%`}</span>
                          <span>{formatDuration(item.currentTime)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Row 1: Latest Uploads & Trending Cinema */}
            <section className="tv-safe-zone space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <h2 className="text-xl font-display font-bold text-white tracking-tight">
                    Latest Releases on HDHub4u
                  </h2>
                </div>
                <span className="text-xs text-slate-400">Newly Uploaded Dual Audio & Hindi Cinema</span>
              </div>

              {isLoadingCatalog && featuredMovies.length === 0 ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {featuredMovies.slice(0, 12).map((movie, idx) => (
                    <HDHubMovieCard
                      key={`${movie.id}-feat-${idx}`}
                      movie={movie}
                      onSelect={(m) => setSelectedMovie(m)}
                      index={idx}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Row 2: Bollywood Blockbusters */}
            {bollywoodMovies.length > 0 && (
              <section className="tv-safe-zone space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-xl font-display font-bold text-white tracking-tight">
                      Bollywood Cinema
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('bollywood')}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    View All Bollywood →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {bollywoodMovies.slice(0, 6).map((movie, idx) => (
                    <HDHubMovieCard
                      key={`${movie.id}-bolly-${idx}`}
                      movie={movie}
                      onSelect={(m) => setSelectedMovie(m)}
                      index={idx}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Row 3: Hollywood & Dual Audio (Hindi / English) */}
            {hollywoodMovies.length > 0 && (
              <section className="tv-safe-zone space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tv className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-xl font-display font-bold text-white tracking-tight">
                      Hollywood Dual Audio (Hindi & English)
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('hollywood')}
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    View All Hollywood →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {hollywoodMovies.slice(0, 6).map((movie, idx) => (
                    <HDHubMovieCard
                      key={`${movie.id}-holly-${idx}`}
                      movie={movie}
                      onSelect={(m) => setSelectedMovie(m)}
                      index={idx}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Row 4: Trending Web Series */}
            {webSeriesMovies.length > 0 && (
              <section className="tv-safe-zone space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    <h2 className="text-xl font-display font-bold text-white tracking-tight">
                      Web Series & Episodes
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('webseries')}
                    className="text-xs text-violet-400 hover:text-violet-300"
                  >
                    View All Series →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {webSeriesMovies.slice(0, 12).map((movie, idx) => (
                    <HDHubMovieCard
                      key={`${movie.id}-series-${idx}`}
                      movie={movie}
                      onSelect={(m) => setSelectedMovie(m)}
                      index={idx}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Row 5: South Indian Hindi Dubbed */}
            {southMovies.length > 0 && (
              <section className="tv-safe-zone space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-500" />
                    <h2 className="text-xl font-display font-bold text-white tracking-tight">
                      South Indian Cinema (Hindi Dubbed)
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('south')}
                    className="text-xs text-amber-400 hover:text-amber-300"
                  >
                    View All South Hindi →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {southMovies.slice(0, 6).map((movie, idx) => (
                    <HDHubMovieCard
                      key={`${movie.id}-south-${idx}`}
                      movie={movie}
                      onSelect={(m) => setSelectedMovie(m)}
                      index={idx}
                    />
                  ))}
                </div>
              </section>
            )}
              </div>
            )}
          </div>
        )}

        {/* TAB 1B: LIVE TV (IPTV-ORG DIRECTORY) */}
        {activeTab === 'livetv' && (
          <IPTVGuideView
            onPlayChannel={(stream) => {
              setActiveStream(stream);
            }}
          />
        )}

        {/* TAB 2: BOLLYWOOD */}
        {activeTab === 'bollywood' && (
          <div className="tv-safe-zone py-8 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-400 mb-1">
                <Film className="w-4 h-4" />
                <span>HDHub4u Bollywood Catalog</span>
              </div>
              <h2 className="text-3xl font-display font-bold text-white tracking-tight">
                Bollywood Movies in HD & 4K
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {bollywoodMovies.map((movie, idx) => (
                <HDHubMovieCard
                  key={`${movie.id}-bollytab-${idx}`}
                  movie={movie}
                  onSelect={(m) => setSelectedMovie(m)}
                  index={idx}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 2B: SOUTH HINDI */}
        {activeTab === 'south' && (
          <div className="tv-safe-zone py-8 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-500 mb-1">
                <Flame className="w-4 h-4" />
                <span>HDHub4u South Hindi Catalog</span>
              </div>
              <h2 className="text-3xl font-display font-bold text-white tracking-tight">
                South Indian Blockbusters (Hindi Dubbed)
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {southMovies.map((movie, idx) => (
                <HDHubMovieCard
                  key={`${movie.id}-southtab-${idx}`}
                  movie={movie}
                  onSelect={(m) => setSelectedMovie(m)}
                  index={idx}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: HOLLYWOOD & DUAL AUDIO */}
        {activeTab === 'hollywood' && (
          <div className="tv-safe-zone py-8 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-400 mb-1">
                <Tv className="w-4 h-4" />
                <span>HDHub4u Hollywood Catalog</span>
              </div>
              <h2 className="text-3xl font-display font-bold text-white tracking-tight">
                Hollywood Dual Audio (Hindi / English)
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {hollywoodMovies.map((movie, idx) => (
                <HDHubMovieCard
                  key={`${movie.id}-hollytab-${idx}`}
                  movie={movie}
                  onSelect={(m) => setSelectedMovie(m)}
                  index={idx}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: WEB SERIES */}
        {activeTab === 'webseries' && (() => {
          const filteredSeries = webSeriesMovies.filter((movie) => {
            if (seriesSearchQuery.trim()) {
              const q = seriesSearchQuery.toLowerCase();
              const matchesTitle = movie.cleanTitle.toLowerCase().includes(q) || movie.title.toLowerCase().includes(q);
              if (!matchesTitle) return false;
            }
            if (seriesCategoryFilter === 'hindi') {
              return movie.languages.some(l => /Hindi/i.test(l)) || /Hindi/i.test(movie.title);
            }
            if (seriesCategoryFilter === 'multiaudio') {
              return movie.languages.some(l => /Dual|Multi/i.test(l)) || /Dual|Multi/i.test(movie.title);
            }
            if (seriesCategoryFilter === 'latest') {
              return /Season\s*[2-9]|\b202[4-6]\b/i.test(movie.title);
            }
            return true;
          });

          return (
            <div className="tv-safe-zone py-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-violet-400 mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>SnapTV Multi-Episode Vault</span>
                  </div>
                  <h2 className="text-3xl font-display font-bold text-white tracking-tight">
                    Web Series & Multi-Episode Shows
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                    Showing {filteredSeries.length} of {webSeriesMovies.length} Shows (Batch {seriesPage})
                  </span>
                </div>
              </div>

              {/* Series Filter & Search Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={seriesSearchQuery}
                    onChange={(e) => setSeriesSearchQuery(e.target.value)}
                    placeholder="Filter series (e.g. Dexter, Bigg Boss, Mirzapur...)"
                    className="bg-transparent border-none outline-none w-full text-slate-200 placeholder-slate-500 text-xs"
                  />
                  {seriesSearchQuery && (
                    <button onClick={() => setSeriesSearchQuery('')} className="text-slate-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {(['all', 'hindi', 'multiaudio', 'latest'] as const).map((filter) => (
                    <button
                      key={filter}
                      data-tv-focusable="true"
                      onClick={() => {
                        playSelectSound();
                        setSeriesCategoryFilter(filter);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold tv-btn-focus transition ${
                        seriesCategoryFilter === filter
                          ? 'bg-violet-600 text-white shadow-md'
                          : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {filter === 'all' ? 'All Series' : filter === 'hindi' ? 'Hindi / OTT' : filter === 'multiaudio' ? 'Dual Audio' : 'Latest Seasons'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Series Cards Grid */}
              {filteredSeries.length === 0 ? (
                <div className="py-16 text-center space-y-3 bg-slate-950/40 rounded-3xl border border-slate-900">
                  <p className="text-slate-400 text-sm">No series found matching &quot;{seriesSearchQuery}&quot;</p>
                  <button
                    onClick={() => setSeriesSearchQuery('')}
                    className="px-4 py-2 bg-slate-800 text-slate-200 text-xs rounded-xl hover:bg-slate-700"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredSeries.map((movie, idx) => (
                    <HDHubMovieCard
                      key={`${movie.id}-seriestab-${idx}`}
                      movie={movie}
                      onSelect={(m) => setSelectedMovie(m)}
                      index={idx}
                    />
                  ))}
                </div>
              )}

              {/* Load More Button */}
              <div className="pt-4 pb-8 flex flex-col items-center justify-center space-y-3">
                <button
                  id="btn-load-more-series"
                  data-tv-focusable="true"
                  onClick={handleLoadMoreSeries}
                  disabled={isLoadingMoreSeries}
                  onFocus={playFocusSound}
                  className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-violet-600/30 tv-btn-focus transition active:scale-95 disabled:opacity-50"
                >
                  {isLoadingMoreSeries ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Fetching Next Batch of Series...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-violet-200" />
                      <span>Load More Series (Batch {seriesPage + 1} · 30 More Shows) ↓</span>
                    </>
                  )}
                </button>
                <span className="text-[11px] font-mono text-slate-500">
                  {webSeriesMovies.length} series loaded in SnapTV Catalog · Click to fetch more
                </span>
              </div>
            </div>
          );
        })()}

        {/* TAB 5: SEARCH */}
        {activeTab === 'search' && (
          <HDHubSearchView onSelectMovie={(m) => setSelectedMovie(m)} />
        )}

        {/* HUB 4: UNIFIED LIBRARY & WATCH HISTORY */}
        {(activeTab === 'library' || activeTab === 'watchlist' || activeTab === 'recent') && (
          <div className="tv-safe-zone py-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-400 mb-1">
                  <Bookmark className="w-4 h-4" />
                  <span>Personal Library Hub</span>
                </div>
                <h1 className="text-2xl lg:text-3xl font-display font-black text-white tracking-tight">
                  My Library & History
                </h1>
              </div>

              {/* Clean Library Sub-Tabs */}
              <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  id="library-tab-recent"
                  data-tv-focusable="true"
                  onClick={() => {
                    playSelectSound();
                    setLibrarySubTab('recent');
                  }}
                  onFocus={playFocusSound}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition tv-btn-focus ${
                    librarySubTab === 'recent'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Continue Watching ({recentWatched.length})</span>
                </button>

                <button
                  id="library-tab-watchlist"
                  data-tv-focusable="true"
                  onClick={() => {
                    playSelectSound();
                    setLibrarySubTab('watchlist');
                  }}
                  onFocus={playFocusSound}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition tv-btn-focus ${
                    librarySubTab === 'watchlist'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Watchlist ({watchlist.length})</span>
                </button>
              </div>
            </div>

            {/* Sub-Tab 1: Continue Watching History */}
            {librarySubTab === 'recent' && (
              <div className="space-y-4">
                {recentWatched.length > 0 && (
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
                      <button
                        onClick={() => setRecentFilter('all')}
                        className={`px-3 py-1 rounded-lg transition ${
                          recentFilter === 'all' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setRecentFilter('in_progress')}
                        className={`px-3 py-1 rounded-lg transition ${
                          recentFilter === 'in_progress' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        In Progress
                      </button>
                      <button
                        onClick={() => setRecentFilter('completed')}
                        className={`px-3 py-1 rounded-lg transition ${
                          recentFilter === 'completed' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Completed
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        playSelectSound();
                        clearAllRecentWatched();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs hover:bg-red-900/60 transition tv-btn-focus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear History</span>
                    </button>
                  </div>
                )}

                {recentWatched.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 max-w-lg mx-auto space-y-3">
                    <History className="w-10 h-10 text-slate-600 mx-auto" />
                    <h3 className="text-base font-bold text-white">No Watch History Yet</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Start watching any movie or web series episode. The app automatically tracks your progress so you can resume anytime.
                    </p>
                    <button
                      onClick={() => setActiveTab('livetv')}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition"
                    >
                      Explore Live TV
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {recentWatched
                      .filter((item) => {
                        if (recentFilter === 'in_progress') return !item.completed;
                        if (recentFilter === 'completed') return item.completed;
                        return true;
                      })
                      .map((item, idx) => (
                        <div
                          key={item.id}
                          id={`recent-full-card-${idx}`}
                          data-tv-focusable="true"
                          onClick={() => handleResumeRecent(item)}
                          onFocus={playFocusSound}
                          className="tv-perf-contain group relative rounded-xl bg-[#0e121b] border border-slate-800 hover:border-amber-500 transition-all cursor-pointer flex flex-col overflow-hidden tv-card-focus"
                        >
                          <div className="aspect-[2/3] w-full relative overflow-hidden bg-black">
                            <img
                              src={item.poster}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                              {item.isSeries && (
                                <span className="bg-violet-600/90 text-white font-mono text-[9px] font-bold px-1.5 py-0.2 rounded shadow">
                                  {item.episodeTitle || `EP ${item.episodeNumber || 1}`}
                                </span>
                              )}
                              {item.completed && (
                                <span className="bg-emerald-600/90 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Finished
                                </span>
                              )}
                            </div>

                            <button
                              onClick={(e) => removeRecentWatched(item.id, e)}
                              className="absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-red-600 text-slate-300 hover:text-white transition opacity-0 group-hover:opacity-100 z-10"
                              title="Remove from history"
                            >
                              <X className="w-3 h-3" />
                            </button>

                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
                              <div className="w-10 h-10 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg">
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </div>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                              <div
                                className="h-full bg-amber-500"
                                style={{ width: `${item.progressPercent}%` }}
                              />
                            </div>
                          </div>

                          <div className="p-2.5 flex-1 flex flex-col justify-between">
                            <div>
                              <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
                                {item.cleanTitle}
                              </h3>
                              {item.isSeries && item.episodeTitle && (
                                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                  {item.episodeTitle}
                                </p>
                              )}
                            </div>

                            <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono text-slate-400">
                              <span>{item.completed ? 'Finished' : `${item.progressPercent}%`}</span>
                              <span>{formatDuration(item.currentTime)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 2: Saved Watchlist */}
            {librarySubTab === 'watchlist' && (
              <div className="space-y-4">
                {watchlist.length > 0 && (
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => {
                        playSelectSound();
                        setWatchlist([]);
                        localStorage.removeItem(DEFAULT_WATCHLIST_KEY);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs hover:bg-red-900/60 transition tv-btn-focus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Watchlist</span>
                    </button>
                  </div>
                )}

                {watchlist.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 max-w-lg mx-auto space-y-3">
                    <Bookmark className="w-10 h-10 text-slate-600 mx-auto" />
                    <h3 className="text-base font-bold text-white">Your Watchlist is Empty</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Bookmark any movie or stream to access it quickly in your TV library.
                    </p>
                    <button
                      onClick={() => {
                        setActiveTab('movies');
                        setMoviesSubFilter('all');
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition"
                    >
                      Browse Movies
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {watchlist.map((item, idx) => (
                      <div
                        key={`${item.id}-${idx}`}
                        id={`watchlist-card-${idx}`}
                        data-tv-focusable="true"
                        onClick={() => setActiveStream(item)}
                        onFocus={playFocusSound}
                        className="tv-perf-contain p-2.5 bg-[#0e121b] border border-slate-800 rounded-xl cursor-pointer hover:border-indigo-500 transition tv-card-focus"
                      >
                        <div className="aspect-[2/3] rounded-lg overflow-hidden bg-black mb-2">
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h4 className="text-xs font-semibold text-white truncate">{item.title}</h4>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{item.format}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: WEB EXTRACTOR */}
        {activeTab === 'extractor' && (
          <WebExtractorView
            onPlayStream={(item) => setActiveStream(item)}
            onAddToWatchlist={toggleWatchlist}
          />
        )}

        {/* TAB 8: PHONE REMOTE */}
        {activeTab === 'remote' && (
          <div className="tv-safe-zone py-8 max-w-3xl mx-auto space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400 mb-1">
                <Smartphone className="w-4 h-4" />
                <span>Pairing Hub</span>
              </div>
              <h2 className="text-3xl font-display font-bold text-white tracking-tight">
                Phone Remote & Web Link Beam
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Search movies on your phone or paste web links to watch directly on this TV.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col items-center text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Smartphone className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">Current TV Code</span>
                <span className="font-mono text-4xl font-black text-white tracking-widest bg-slate-950 px-6 py-2 rounded-2xl border border-slate-800 inline-block">
                  {pairingCode || '----'}
                </span>
              </div>

              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => setIsPhoneModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg transition"
                >
                  Show QR Code to Scan
                </button>

                <button
                  onClick={() => setIsCompanionMode(true)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
                >
                  Test Phone Remote Simulator
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Movie Details Modal (HDHub4u Stream Resolver) */}
      {selectedMovie && (
        <HDHubMovieDetailModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onPlayStream={(stream) => {
            setActiveStream(stream);
            setSelectedMovie(null);
          }}
          onToggleWatchlist={toggleWatchlist}
          isBookmarked={isBookmarked(`hdhub-${selectedMovie.id}`, selectedMovie.url)}
        />
      )}

      {/* Fullscreen 10-Foot TV Media Player Overlay */}
      {activeStream && (
        <TVPlayer
          stream={activeStream}
          initialTime={activeStream.startTime}
          onClose={() => {
            setActiveStream(null);
            loadRecentWatched();
          }}
          onProgress={() => loadRecentWatched()}
          onUpdateStatus={(status) => {
            if (pairingCode) {
              fetch(`/api/remote/session/${pairingCode}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nowPlaying: status }),
              }).catch(() => {});
            }
          }}
        />
      )}

      {/* Phone Remote Pairing Modal */}
      {isPhoneModalOpen && pairingCode && (
        <PhoneRemoteModal
          pairingCode={pairingCode}
          onClose={() => setIsPhoneModalOpen(false)}
          onOpenSimulator={() => {
            setIsPhoneModalOpen(false);
            setIsCompanionMode(true);
          }}
        />
      )}

      {/* Dynamic Integrators & Mirror Self-Healing Modal */}
      <ProviderAndMirrorModal
        isOpen={isProviderModalOpen}
        onClose={() => setIsProviderModalOpen(false)}
        activeProvider={activeProvider}
        onSelectProvider={(prov) => {
          setActiveProvider(prov);
          loadCatalogs(hdhubDomain, prov);
        }}
        currentDomain={hdhubDomain}
        onDomainChange={(domain) => {
          setHdhubDomain(domain);
          try {
            localStorage.setItem(DEFAULT_DOMAIN_KEY, domain);
          } catch {}
          loadCatalogs(domain, activeProvider);
        }}
      />

      {/* On-Screen Virtual Remote HUD */}
      <VirtualTVRemoteHUD
        isOpen={isVirtualRemoteOpen}
        onClose={() => setIsVirtualRemoteOpen(false)}
        onNavigate={(dir) => moveFocus(dir)}
        onSelect={() => {
          const active = document.activeElement as HTMLElement;
          if (active) active.click();
        }}
        onBack={() => {
          if (activeStream) setActiveStream(null);
          else if (selectedMovie) setSelectedMovie(null);
          else if (isPhoneModalOpen) setIsPhoneModalOpen(false);
          else setActiveTab('livetv');
        }}
        onHome={() => {
          setActiveStream(null);
          setSelectedMovie(null);
          setActiveTab('livetv');
        }}
      />
    </div>
  );
}
