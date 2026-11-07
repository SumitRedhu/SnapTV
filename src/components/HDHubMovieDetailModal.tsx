import React, { useState, useEffect } from 'react';
import { HDHubMovie, HDHubMovieDetail, StreamItem, RecentWatchItem, EpisodeItem } from '../types/tv';
import {
  Play,
  Bookmark,
  BookmarkCheck,
  X,
  Loader2,
  ExternalLink,
  Film,
  Sparkles,
  Server,
  Radio,
  Tv,
  Check,
  Smartphone,
  CheckCircle2,
  RotateCcw,
  Clock
} from 'lucide-react';
import { playFocusSound, playSelectSound, playBackSound } from '../utils/sound';

interface HDHubMovieDetailModalProps {
  movie: HDHubMovie;
  onClose: () => void;
  onPlayStream: (stream: StreamItem) => void;
  onToggleWatchlist: (stream: StreamItem) => void;
  isBookmarked: boolean;
  onSendToPhone?: (stream: StreamItem) => void;
}

export const HDHubMovieDetailModal: React.FC<HDHubMovieDetailModalProps> = ({
  movie,
  onClose,
  onPlayStream,
  onToggleWatchlist,
  isBookmarked,
  onSendToPhone,
}) => {
  const [details, setDetails] = useState<HDHubMovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServerIdx, setSelectedServerIdx] = useState(0);
  const [selectedEpNumber, setSelectedEpNumber] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [recentProgress, setRecentProgress] = useState<RecentWatchItem | null>(null);
  const [watchedEpisodeMap, setWatchedEpisodeMap] = useState<Record<string, RecentWatchItem>>({});

  // Detect whether this is a TV series or a movie
  const isSeries = Boolean(
    movie.isSeries ||
    (details?.episodes && details.episodes.length > 0) ||
    /season|series|episode/i.test(movie.cleanTitle || movie.title)
  );

  const seasonNumber = details?.episodes?.[0]?.seasonNumber || (
    movie.title.match(/Season\s*(\d+)/i) ? parseInt(movie.title.match(/Season\s*(\d+)/i)![1], 10) : 1
  );

  // Consolidated episodes list with fallback
  const episodeList: EpisodeItem[] = (details?.episodes && details.episodes.length > 0)
    ? details.episodes
    : isSeries
    ? Array.from({ length: 10 }, (_, i) => ({
        episodeNumber: i + 1,
        seasonNumber,
        title: `Episode ${i + 1}`,
        url: details?.streamOptions[0]?.url || movie.url,
        streamType: 'embed' as const,
      }))
    : [];

  const currentSelectedEp = episodeList.find((e) => e.episodeNumber === selectedEpNumber) || episodeList[0];

  // Load Watch Progress & Watched Episodes for this title
  useEffect(() => {
    try {
      const raw = localStorage.getItem('caststream_recent_watched');
      if (raw) {
        const list: RecentWatchItem[] = JSON.parse(raw);
        const match = list.find(
          (i) => i.movieId === `hdhub-${movie.id}` || i.movieId === movie.id || i.url === movie.url
        );
        if (match) {
          setRecentProgress(match);
          if (match.episodeNumber !== undefined) {
            setSelectedEpNumber(match.episodeNumber);
          }
        }

        const epMap: Record<string, RecentWatchItem> = {};
        list
          .filter((i) => i.movieId === `hdhub-${movie.id}` || i.movieId === movie.id || i.url === movie.url)
          .forEach((i) => {
            if (i.episodeNumber !== undefined) {
              epMap[`ep-${i.episodeNumber}`] = i;
            }
          });
        setWatchedEpisodeMap(epMap);
      }
    } catch {
      // Storage fallback
    }
  }, [movie.id, movie.url]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    let endpoint = `/api/hdhub/movie?url=${encodeURIComponent(movie.url)}`;
    if (movie.id.startsWith('bolly-') || movie.url.includes('bollystream.internal')) {
      endpoint = `/api/bollystream/movie?id=${encodeURIComponent(movie.id)}`;
    } else if (movie.id.startsWith('vega-') || movie.url.includes('vegamovies')) {
      endpoint = `/api/vegamovies/movie?url=${encodeURIComponent(movie.url)}`;
    }

    fetch(endpoint)
      .then((res) => res.json())
      .then((json) => {
        if (!mounted) return;
        if (json.success && json.data) {
          setDetails(json.data);
          if (json.data.episodes && json.data.episodes.length > 0) {
            setSelectedEpNumber((prev) => {
              const exists = json.data.episodes.some((e: EpisodeItem) => e.episodeNumber === prev);
              return exists ? prev : json.data.episodes[0].episodeNumber;
            });
          }
        } else {
          setError(json.error || 'Failed to load movie stream details');
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Network error fetching movie stream details');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [movie.url, movie.id]);

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const h = Math.floor(m / 60);
    if (h > 0) {
      return `${h}h ${m % 60}m`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Handle Play Selected Stream (For Movie or direct mirror)
  const handlePlay = (customUrl?: string, customLabel?: string, resumeTime?: number) => {
    playSelectSound();
    
    const playableOpt = details?.streamOptions.find(o => o.streamType === 'hls' || o.streamType === 'embed');
    const chosenOption = customUrl
      ? details?.streamOptions.find((o) => o.url === customUrl)
      : (details?.streamOptions[selectedServerIdx] || playableOpt || details?.streamOptions[0]);

    const serverUrl = customUrl || chosenOption?.url || movie.url;
    const label = customLabel || chosenOption?.label || 'HD Stream';

    const streamType = chosenOption?.streamType || (
      serverUrl.includes('/api/proxy/hls') || serverUrl.includes('.m3u8')
        ? 'hls'
        : serverUrl.includes('playdrive') || serverUrl.includes('embed') || serverUrl.includes('youtube') || serverUrl.includes('vidsrc') || serverUrl.includes('2embed') || serverUrl.includes('multiembed')
        ? 'embed'
        : 'direct'
    );

    const alternativeServers = details?.streamOptions.map((o) => ({
      label: o.label,
      url: o.url,
      streamType: o.streamType,
    })) || [];

    const streamItem: StreamItem = {
      id: `hdhub-${movie.id}`,
      movieId: `hdhub-${movie.id}`,
      title: movie.cleanTitle,
      description: details?.storyline || movie.title,
      streamUrl: serverUrl,
      sourceUrl: movie.url,
      format: `HDHub ${label}`,
      resolution: movie.qualities[0] || '1080p',
      thumbnail: details?.poster || movie.poster,
      category: isSeries ? 'HDHub4u Series' : 'HDHub4u Cinema',
      badge: movie.qualities[0] || 'HD',
      year: movie.year,
      languages: movie.languages,
      streamType,
      startTime: resumeTime,
      alternativeServers,
    };

    onPlayStream(streamItem);
  };

  // Handle Play Episode
  const handlePlayEpisode = (ep: EpisodeItem, resumeTime?: number, customMirrorUrl?: string, customMirrorLabel?: string) => {
    playSelectSound();
    setSelectedEpNumber(ep.episodeNumber);

    const episodeAlternatives = ep.alternativeServers && ep.alternativeServers.length > 0
      ? ep.alternativeServers
      : details?.streamOptions.map((o) => ({
          label: o.label,
          url: o.url,
          streamType: o.streamType,
        })) || [];

    const serverUrl = customMirrorUrl || ep.url;
    const label = customMirrorLabel || ep.title;

    const streamType = ep.streamType || (
      serverUrl.includes('/api/proxy/hls') || serverUrl.includes('.m3u8')
        ? 'hls'
        : serverUrl.includes('playdrive') || serverUrl.includes('hdstream4u') || serverUrl.includes('embed') || serverUrl.includes('vidsrc') || serverUrl.includes('2embed')
        ? 'embed'
        : 'direct'
    );

    const streamItem: StreamItem = {
      id: `hdhub-${movie.id}-s${ep.seasonNumber || seasonNumber}-ep${ep.episodeNumber}`,
      movieId: `hdhub-${movie.id}`,
      title: `${movie.cleanTitle} - ${ep.title}`,
      description: details?.storyline || movie.title,
      streamUrl: serverUrl,
      sourceUrl: movie.url,
      format: `HDHub ${label}`,
      resolution: movie.qualities[0] || '1080p',
      thumbnail: details?.poster || movie.poster,
      category: 'HDHub4u Series',
      badge: `EP ${ep.episodeNumber}`,
      seasonNumber: ep.seasonNumber || seasonNumber,
      episodeNumber: ep.episodeNumber,
      episodeTitle: ep.title,
      startTime: resumeTime,
      streamType,
      alternativeServers: episodeAlternatives,
    };
    onPlayStream(streamItem);
  };

  const handleCopyLink = () => {
    if (!details || details.streamOptions.length === 0) return;
    const current = details.streamOptions[selectedServerIdx];
    navigator.clipboard.writeText(current.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Episode stream alternatives for the currently selected episode
  const currentEpMirrors = currentSelectedEp?.alternativeServers && currentSelectedEp.alternativeServers.length > 0
    ? currentSelectedEp.alternativeServers
    : (details?.streamOptions || []);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 lg:p-8 select-none animate-in fade-in duration-200">
      <div className="bg-[#0f141f] border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl relative flex flex-col">
        {/* Close Button (Escape / Back) */}
        <button
          id="modal-btn-close"
          data-tv-focusable="true"
          onClick={() => {
            playBackSound();
            onClose();
          }}
          className="absolute top-5 right-5 z-20 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 transition tv-btn-focus"
          title="Close (ESC)"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">
              {isSeries ? 'Resolving series episode stream list...' : 'Resolving stream & movie info from HDHub4u...'}
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-4">
            <p className="text-red-400 text-sm font-semibold">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => handlePlay(movie.url, 'Web Source')}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Open Source Page in Player
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Back to TV Catalog
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 lg:p-10 space-y-8">
            {/* Top Split: Poster + Title + Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
              {/* Poster Art */}
              <div className="aspect-[2/3] w-full max-w-[240px] mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl relative">
                <img
                  src={details?.poster || movie.poster}
                  alt={movie.cleanTitle}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                {movie.year && (
                  <div className="absolute top-3 left-3 bg-black/80 font-mono text-[11px] text-white px-2 py-0.5 rounded backdrop-blur-sm">
                    {movie.year}
                  </div>
                )}
                {isSeries && (
                  <div className="absolute bottom-3 left-3 bg-indigo-600/90 font-mono text-[11px] font-bold text-white px-2.5 py-0.5 rounded backdrop-blur-sm border border-indigo-400/40">
                    Season {seasonNumber}
                  </div>
                )}
              </div>

              {/* Title, Languages, and Storyline */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-2 text-xs text-indigo-400 font-mono font-medium">
                  <span className="font-bold">{isSeries ? 'Web Series Stream' : 'Cinema Stream'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-400">{movie.qualities.join(' · ')}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-300">{movie.languages.join(', ')}</span>
                </div>

                <h2 className="text-2xl lg:text-3xl font-display font-extrabold text-white leading-tight">
                  {movie.cleanTitle}
                </h2>

                <p className="text-xs lg:text-sm text-slate-300 leading-relaxed max-h-36 overflow-y-auto no-scrollbar">
                  {details?.storyline}
                </p>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {/* Resume Button if previous progress exists */}
                  {recentProgress && recentProgress.currentTime > 10 && !recentProgress.completed && (
                    <button
                      id="modal-btn-resume"
                      data-tv-focusable="true"
                      onClick={() => {
                        if (isSeries && currentSelectedEp) {
                          const targetEp = episodeList.find(e => e.episodeNumber === recentProgress.episodeNumber) || currentSelectedEp;
                          handlePlayEpisode(targetEp, recentProgress.currentTime);
                        } else {
                          handlePlay(recentProgress.streamUrl, undefined, recentProgress.currentTime);
                        }
                      }}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-amber-600/30 tv-btn-focus transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Resume {recentProgress.episodeTitle ? `${recentProgress.episodeTitle} ` : ''}({formatTime(recentProgress.currentTime)})</span>
                    </button>
                  )}

                  {/* Primary Play Button */}
                  <button
                    id="modal-btn-play-primary"
                    data-tv-focusable="true"
                    onClick={() => {
                      if (isSeries && currentSelectedEp) {
                        handlePlayEpisode(currentSelectedEp);
                      } else {
                        handlePlay();
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/40 tv-btn-focus transition"
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    <span>
                      {isSeries
                        ? `Play S${currentSelectedEp?.seasonNumber || seasonNumber} E${currentSelectedEp?.episodeNumber || 1} (${currentSelectedEp?.title || 'Episode 1'})`
                        : 'Watch Movie in TV Player'}
                    </span>
                  </button>

                  {/* Watchlist Toggle */}
                  <button
                    id="modal-btn-bookmark"
                    data-tv-focusable="true"
                    onClick={() => {
                      playSelectSound();
                      onToggleWatchlist({
                        id: `hdhub-${movie.id}`,
                        title: movie.cleanTitle,
                        description: details?.storyline || movie.title,
                        streamUrl: details?.streamOptions[0]?.url || movie.url,
                        sourceUrl: movie.url,
                        format: isSeries ? 'HDHub Series' : 'HDHub Stream',
                        resolution: movie.qualities[0] || '1080p',
                        thumbnail: details?.poster || movie.poster,
                        category: isSeries ? 'HDHub4u Series' : 'HDHub4u Cinema',
                        badge: movie.qualities[0] || 'HD',
                      });
                    }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/70 text-xs font-semibold tv-btn-focus transition"
                  >
                    {isBookmarked ? (
                      <>
                        <BookmarkCheck className="w-4 h-4 text-cyan-400" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4" />
                        <span>Watchlist</span>
                      </>
                    )}
                  </button>

                  {details?.trailerUrl && (
                    <button
                      id="modal-btn-trailer"
                      data-tv-focusable="true"
                      onClick={() => handlePlay(details.trailerUrl!, 'Official HD Trailer')}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium tv-btn-focus transition"
                    >
                      <Film className="w-4 h-4 text-red-400" />
                      <span>Play Trailer</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* WEB SERIES FLOW: 1. EPISODE SELECTION LIST FIRST (BEFORE STREAM SERVERS) */}
            {/* ========================================================================= */}
            {isSeries && episodeList.length > 0 && (
              <div id="modal-episode-list-section" className="space-y-3 pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-white flex items-center gap-2 font-bold">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Episodes · Season {seasonNumber} ({episodeList.length} Available)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Select an episode to stream immediately or switch mirror below
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-72 overflow-y-auto no-scrollbar p-1">
                  {episodeList.map((ep) => {
                    const epProgress = watchedEpisodeMap[`ep-${ep.episodeNumber}`];
                    const isCompleted = epProgress?.completed;
                    const inProgress = epProgress && epProgress.currentTime > 10 && !isCompleted;
                    const isSelected = selectedEpNumber === ep.episodeNumber;

                    return (
                      <button
                        key={ep.episodeNumber}
                        id={`ep-btn-${ep.episodeNumber}`}
                        data-tv-focusable="true"
                        onClick={() => {
                          setSelectedEpNumber(ep.episodeNumber);
                          handlePlayEpisode(ep, inProgress ? epProgress.currentTime : undefined);
                        }}
                        onFocus={() => {
                          playFocusSound();
                          setSelectedEpNumber(ep.episodeNumber);
                        }}
                        className={`p-3 rounded-xl border text-left transition tv-btn-focus relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-950/80 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-500/50'
                            : isCompleted
                            ? 'bg-emerald-950/40 border-emerald-700/60 text-slate-200 hover:border-emerald-500'
                            : inProgress
                            ? 'bg-amber-950/40 border-amber-500/60 text-white'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                            }`}>
                              EP {ep.episodeNumber}
                            </span>
                            {isCompleted ? (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Watched
                              </span>
                            ) : inProgress ? (
                              <span className="text-[10px] text-amber-400 font-mono font-bold">
                                {epProgress.progressPercent}%
                              </span>
                            ) : isSelected ? (
                              <span className="text-[10px] text-indigo-300 font-mono font-bold">
                                Active
                              </span>
                            ) : null}
                          </div>

                          <span className="text-xs font-bold block truncate">{ep.title}</span>
                          {inProgress ? (
                            <span className="text-[10px] text-amber-300/90 block truncate mt-0.5 font-mono">
                              at {formatTime(epProgress.currentTime)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 block truncate mt-0.5 font-mono">
                              {ep.streamType?.toUpperCase() || 'STREAM'}
                            </span>
                          )}
                        </div>

                        {/* In-progress progress bar */}
                        {inProgress && (
                          <div className="mt-2.5 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-indigo-500 rounded-full"
                              style={{ width: `${epProgress.progressPercent}%` }}
                            />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STREAM MIRRORS & SERVERS (FOR SELECTED EPISODE OR MOVIE) */}
            {/* ========================================================================= */}
            {((isSeries && currentEpMirrors.length > 0) || (!isSeries && details && details.streamOptions.length > 0)) && (
              <div className="space-y-3 pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2 font-bold">
                    <Server className="w-4 h-4 text-indigo-400" />
                    {isSeries
                      ? `Stream Mirrors for S${seasonNumber} Episode ${selectedEpNumber}`
                      : `Available Stream Servers & Qualities (${details?.streamOptions.length || 0})`}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isSeries ? 'Fast Multi-CDN Mirrors (HDStream, VidSrc, 2Embed, AutoEmbed)' : 'Direct links extracted from HDHub4u'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {(isSeries ? currentEpMirrors : details!.streamOptions).map((opt, idx) => (
                    <button
                      key={idx}
                      id={`server-btn-${idx}`}
                      data-tv-focusable="true"
                      onClick={() => {
                        setSelectedServerIdx(idx);
                        if (isSeries && currentSelectedEp) {
                          handlePlayEpisode(currentSelectedEp, undefined, opt.url, opt.label);
                        } else {
                          handlePlay(opt.url, opt.label);
                        }
                      }}
                      onFocus={playFocusSound}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition tv-btn-focus ${
                        selectedServerIdx === idx
                          ? 'bg-indigo-950/70 border-indigo-600 text-white shadow-md'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <span className="text-xs font-bold block truncate">{opt.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">
                          {'serverType' in opt ? (opt as any).serverType?.toUpperCase() || 'MIRROR' : 'MIRROR'}
                        </span>
                      </div>
                      <Play className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Utility Footer */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800/60">
              <span className="truncate max-w-md text-slate-500 font-mono text-[11px]">
                Source: {movie.url}
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Link Copied' : 'Copy Server Link'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
