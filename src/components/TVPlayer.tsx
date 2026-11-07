import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { StreamItem, AspectRatioMode, RecentWatchItem } from '../types/tv';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Sliders,
  Clock,
  ExternalLink,
  X,
  Radio,
  Tv,
  Sparkles,
  Server,
  RefreshCw,
  Monitor,
  CheckCircle2,
  Check
} from 'lucide-react';
import { playFocusSound, playSelectSound, playBackSound } from '../utils/sound';

interface TVPlayerProps {
  stream: StreamItem;
  onClose: () => void;
  onUpdateStatus?: (status: { title: string; url: string; isPlaying: boolean }) => void;
  onProgress?: (progress: { currentTime: number; duration: number }) => void;
  initialTime?: number;
}

export const TVPlayer: React.FC<TVPlayerProps> = ({ stream, onClose, onUpdateStatus, onProgress, initialTime }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Active stream state (allows seamless in-player server switching)
  const [currentStreamUrl, setCurrentStreamUrl] = useState(stream.streamUrl);
  const [currentStreamType, setCurrentStreamType] = useState<'hls' | 'mp4' | 'embed' | 'direct'>(
    stream.streamType || (
      stream.streamUrl.includes('/api/proxy/hls') || stream.streamUrl.includes('.m3u8')
        ? 'hls'
        : stream.streamUrl.includes('playdrive') || stream.streamUrl.includes('embed') || stream.streamUrl.includes('youtube') || stream.streamUrl.includes('vidsrc') || stream.streamUrl.includes('2embed') || stream.streamUrl.includes('multiembed')
        ? 'embed'
        : 'direct'
    )
  );
  const [currentServerLabel, setCurrentServerLabel] = useState<string>(stream.format);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLive, setIsLive] = useState(
    stream.badge === 'LIVE' ||
    stream.format === 'LIVE HLS' ||
    (stream.category && stream.category.includes('Live TV')) ||
    false
  );
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('16:9');
  const [audioBoost, setAudioBoost] = useState<number>(0); // 0, 3, 6 dB
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMarkedWatched, setIsMarkedWatched] = useState(false);
  const lastSavedTimeRef = useRef<number>(0);

  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if current stream requires TV iframe embed
  const isEmbed = currentStreamType === 'embed' || (
    !currentStreamUrl.includes('/api/proxy/hls') &&
    !currentStreamUrl.includes('.m3u8') &&
    (currentStreamUrl.includes('embed') || currentStreamUrl.includes('playdrive.vip') || currentStreamUrl.includes('youtube.com') || currentStreamUrl.includes('vidsrc') || currentStreamUrl.includes('2embed') || currentStreamUrl.includes('multiembed'))
  );

  // Watch Progress & Episode Tracking Persistence
  const saveWatchProgress = useCallback((time: number, totalDur: number, forceCompleted = false) => {
    try {
      const raw = localStorage.getItem('caststream_recent_watched');
      const list: RecentWatchItem[] = raw ? JSON.parse(raw) : [];
      const dur = totalDur > 0 ? totalDur : 3600;
      const progress = Math.min(100, Math.max(0, Math.round((time / dur) * 100)));
      const isCompleted = forceCompleted || progress >= 90;

      const watchId = stream.episodeNumber !== undefined
        ? `${stream.movieId || stream.id}-s${stream.seasonNumber || 1}-e${stream.episodeNumber}`
        : (stream.movieId || stream.id);

      const newItem: RecentWatchItem = {
        id: watchId,
        movieId: stream.movieId || stream.id,
        title: stream.title,
        cleanTitle: stream.title,
        poster: stream.thumbnail,
        url: stream.sourceUrl,
        streamUrl: currentStreamUrl,
        streamType: currentStreamType,
        currentTime: Math.floor(time),
        duration: Math.floor(dur),
        progressPercent: progress,
        lastWatchedAt: new Date().toISOString(),
        isSeries: stream.episodeNumber !== undefined,
        seasonNumber: stream.seasonNumber,
        episodeNumber: stream.episodeNumber,
        episodeTitle: stream.episodeTitle || (stream.episodeNumber ? `Episode ${stream.episodeNumber}` : undefined),
        completed: isCompleted,
      };

      const filtered = list.filter(item => item.id !== watchId);
      const updated = [newItem, ...filtered].slice(0, 40);
      localStorage.setItem('caststream_recent_watched', JSON.stringify(updated));
      if (forceCompleted) setIsMarkedWatched(true);
    } catch {
      // Storage fallback
    }
  }, [stream, currentStreamUrl, currentStreamType]);

  // Track progress periodically for embed mode
  useEffect(() => {
    if (!isEmbed) return;
    let secondsWatched = initialTime || stream.startTime || 0;
    const interval = setInterval(() => {
      secondsWatched += 5;
      saveWatchProgress(secondsWatched, 3600);
    }, 5000);
    return () => clearInterval(interval);
  }, [isEmbed, saveWatchProgress, initialTime, stream.startTime]);

  // Suppress unwanted popup tabs/windows triggered by 3P embed scripts
  useEffect(() => {
    const origOpen = window.open;
    window.open = function() {
      return null;
    };
    return () => {
      window.open = origOpen;
    };
  }, []);


  // Wake and reset OSD hide timer
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, isEmbed ? 6000 : 4000);
  }, [isPlaying, isEmbed]);

  // Audio Boost with Web Audio GainNode
  const setupAudioGain = useCallback((videoEl: HTMLVideoElement) => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          const source = ctx.createMediaElementSource(videoEl);
          const gain = ctx.createGain();
          source.connect(gain);
          gain.connect(ctx.destination);
          audioSourceRef.current = source;
          gainNodeRef.current = gain;
        }
      }
    } catch {
      // Audio element might already be connected
    }
  }, []);

  // Update gain node when audioBoost changes
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      const gainMultiplier = Math.pow(10, audioBoost / 20);
      gainNodeRef.current.gain.setValueAtTime(gainMultiplier, audioContextRef.current.currentTime);
    }
  }, [audioBoost]);

  // Handle switching to a different server
  const switchServer = (url: string, label: string, type?: 'hls' | 'mp4' | 'embed' | 'direct') => {
    playSelectSound();
    setErrorMessage(null);
    setCurrentStreamUrl(url);
    const resolvedType = type || (
      url.includes('/api/proxy/hls') || url.includes('.m3u8')
        ? 'hls'
        : url.includes('playdrive') || url.includes('embed') || url.includes('youtube') || url.includes('vidsrc') || url.includes('2embed') || url.includes('multiembed')
        ? 'embed'
        : 'direct'
    );
    setCurrentStreamType(resolvedType);
    setCurrentServerLabel(label);
    resetHideTimer();
  };

  // Direct HLS / Video source initialization
  useEffect(() => {
    if (isEmbed) {
      // In embed mode, the iframe plays the media directly
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    setErrorMessage(null);
    const isHls = currentStreamUrl.includes('/api/proxy/hls') || currentStreamUrl.includes('.m3u8') || currentStreamType === 'hls' || currentServerLabel.toLowerCase().includes('hls');

    if (isHls && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 15,
        maxBufferLength: 20,
        maxMaxBufferLength: 30,
        maxBufferSize: 30 * 1024 * 1024, // 30MB memory ceiling to prevent OOM kills on 1GB Smart TVs
        progressive: true,
      });
      hlsRef.current = hls;

      hls.loadSource(currentStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          // If browser Autoplay policy blocks unmuted audio, mute and continue playing video
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => setIsPlaying(false));
        });
      });

      let networkRetryCount = 0;
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkRetryCount++;
              if (networkRetryCount <= 2) {
                hls.startLoad();
              } else if (!currentStreamUrl.includes('/api/proxy/hls')) {
                // Auto failover to backend proxy for CORS & SSL bypass
                networkRetryCount = 0;
                const proxied = `/api/proxy/hls?url=${encodeURIComponent(currentStreamUrl)}`;
                setCurrentStreamUrl(proxied);
                setCurrentServerLabel('Smart Stream Proxy (CORS Bypass)');
              } else {
                hls.destroy();
                setErrorMessage(
                  isLive
                    ? 'This live channel is currently offline or blocked by upstream broadcaster. Switch to a verified channel or retry.'
                    : 'Direct HLS connection paused. Switch to Server 2 (PlayDrive Embed) or Server 3 (VidSrc).'
                );
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setErrorMessage(
                isLive
                  ? 'Live broadcast stream encountered an error. Switch to alternative server or choose another channel.'
                  : 'Direct HLS connection paused. Switch to Server 2 (PlayDrive Embed) or Server 3 (VidSrc).'
              );
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && isHls) {
      // Native Apple Safari / Android TV Web HLS
      video.src = currentStreamUrl;
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => setIsPlaying(false));
      });
    } else {
      // Direct MP4 / WebM
      video.src = currentStreamUrl;
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => setIsPlaying(false));
      });
    }

    resetHideTimer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentStreamUrl, currentStreamType, currentServerLabel, isEmbed, resetHideTimer]);

  // Sync state to parent / phone remote
  useEffect(() => {
    if (onUpdateStatus) {
      onUpdateStatus({
        title: stream.title,
        url: currentStreamUrl,
        isPlaying
      });
    }
  }, [isPlaying, stream.title, currentStreamUrl, onUpdateStatus]);

  // Sleep timer interval
  useEffect(() => {
    if (!sleepTimer) return;
    const timer = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      onClose();
    }, sleepTimer * 60 * 1000);

    return () => clearTimeout(timer);
  }, [sleepTimer, onClose]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curTime = videoRef.current.currentTime;
    setCurrentTime(curTime);
    const dur = videoRef.current.duration;
    if (dur && !isNaN(dur) && dur !== Infinity) {
      setDuration(dur);
      setIsLive(false);
      // Persist watch progress every 4 seconds
      if (Math.abs(curTime - lastSavedTimeRef.current) >= 4) {
        lastSavedTimeRef.current = curTime;
        saveWatchProgress(curTime, dur);
        if (onProgress) onProgress({ currentTime: curTime, duration: dur });
      }
    } else {
      setIsLive(true);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    playSelectSound();
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    resetHideTimer();
  };

  const seekRelative = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    playFocusSound();
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    resetHideTimer();
  };

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    if (videoRef.current) {
      videoRef.current.volume = clamped;
      setIsMuted(clamped === 0);
    }
    resetHideTimer();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    playSelectSound();
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    resetHideTimer();
  };

  const toggleFullscreen = () => {
    playSelectSound();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
    resetHideTimer();
  };

  // Keyboard navigation for TV remote in full-screen player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      resetHideTimer();

      switch (e.key) {
        case ' ':
        case 'k':
          if (!isEmbed) {
            e.preventDefault();
            togglePlay();
          }
          break;
        case 'ArrowLeft':
        case 'j':
          if (!isEmbed) {
            e.preventDefault();
            seekRelative(-10);
          }
          break;
        case 'ArrowRight':
        case 'l':
          if (!isEmbed) {
            e.preventDefault();
            seekRelative(10);
          }
          break;
        case 'ArrowUp':
          if (!isEmbed) {
            e.preventDefault();
            handleVolumeChange(volume + 0.1);
          }
          break;
        case 'ArrowDown':
          if (!isEmbed) {
            e.preventDefault();
            handleVolumeChange(volume - 0.1);
          }
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          if (!isEmbed) {
            e.preventDefault();
            toggleMute();
          }
          break;
        case 's':
        case 'S':
          // Remote 'S' key cycles through available stream servers
          if (stream.alternativeServers && stream.alternativeServers.length > 1) {
            e.preventDefault();
            const currIdx = stream.alternativeServers.findIndex(s => s.url === currentStreamUrl);
            const nextIdx = (currIdx + 1) % stream.alternativeServers.length;
            const nextServer = stream.alternativeServers[nextIdx];
            switchServer(nextServer.url, nextServer.label, nextServer.streamType);
          }
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          playBackSound();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, resetHideTimer, volume, isMuted, isPlaying, isEmbed, currentStreamUrl, stream.alternativeServers]);

  // Format seconds to HH:MM:SS or MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Compute CSS sizing for aspect ratio mode
  const getAspectStyle = (): React.CSSProperties => {
    switch (aspectRatio) {
      case 'fill':
        return { objectFit: 'fill', width: '100%', height: '100%' };
      case 'cinema':
        return { objectFit: 'cover', transform: 'scale(1.15)', width: '100%', height: '100%' };
      case '4:3':
        return { objectFit: 'contain', width: '75%', height: '100%', margin: '0 auto' };
      case '16:9':
      default:
        return { objectFit: 'contain', width: '100%', height: '100%' };
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden select-none"
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Video Display Area */}
      {!isEmbed ? (
        <video
          ref={videoRef}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setupAudioGain(videoRef.current);
              const dur = videoRef.current.duration;
              setDuration(dur);
              const targetStart = initialTime || stream.startTime;
              if (targetStart && targetStart > 5 && targetStart < dur - 10) {
                videoRef.current.currentTime = targetStart;
                setCurrentTime(targetStart);
              }
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => setErrorMessage('Unable to play direct HLS stream. Click a Server button above to switch to PlayDrive Embed or VidSrc mirror.')}
          style={getAspectStyle()}
          className="transition-all duration-300 pointer-events-auto"
        />
      ) : (
        /* Fullscreen TV Embed Player (Unsandboxed for full compatibility with VidSrc, 2Embed, PlayDrive) */
        <iframe
          key={currentStreamUrl}
          src={currentStreamUrl}
          title={stream.title}
          className="w-full h-full border-0 absolute inset-0 z-10 bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
          allowFullScreen
        />
      )}

      {/* Playback Error Overlay with Instant 1-Click Server Fallback */}
      {errorMessage && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 border border-red-500/80 text-white p-6 rounded-2xl max-w-xl text-center backdrop-blur-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-700/60 flex items-center justify-center mx-auto mb-3">
            <Tv className="w-6 h-6 text-red-400" />
          </div>
          <p className="font-bold text-lg mb-1">Server Playback Notice</p>
          <p className="text-xs text-slate-300 mb-5 leading-relaxed">{errorMessage}</p>

          {stream.alternativeServers && stream.alternativeServers.length > 0 && (
            <div className="mb-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                Switch to an Alternative Stream Server:
              </span>
              <div className="flex flex-wrap gap-2 justify-center max-h-48 overflow-y-auto no-scrollbar">
                {stream.alternativeServers
                  .filter(s => s.url !== currentStreamUrl)
                  .map((alt, idx) => (
                    <button
                      key={idx}
                      data-tv-focusable="true"
                      onClick={() => switchServer(alt.url, alt.label, alt.streamType)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold tv-btn-focus shadow-md flex items-center gap-1.5"
                    >
                      <Server className="w-3.5 h-3.5" />
                      <span>{alt.label.replace(/^[⚡🌐🎬🚀🍿🎥📥]\s*/, '')}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {isLive && (
            <div className="mb-4 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 block mb-2">
                Switch to Guaranteed Active Live Channels:
              </span>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  data-tv-focusable="true"
                  onClick={() => switchServer('/api/proxy/hls?url=' + encodeURIComponent('https://wiselp.wiseplayout.com/9X_Jalwa/master.m3u8'), '9X Jalwa HD (Live Music)', 'hls')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-200 text-xs font-semibold tv-btn-focus flex items-center gap-1.5 shadow-md"
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>9X Jalwa HD (Music)</span>
                </button>
                <button
                  data-tv-focusable="true"
                  onClick={() => switchServer('/api/proxy/hls?url=' + encodeURIComponent('https://feeds.intoday.in/aajtak/api/aajtakhd/master.m3u8'), 'Aaj Tak HD (Live News)', 'hls')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-200 text-xs font-semibold tv-btn-focus flex items-center gap-1.5 shadow-md"
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Aaj Tak HD (News)</span>
                </button>
                <button
                  data-tv-focusable="true"
                  onClick={() => switchServer('/api/proxy/hls?url=' + encodeURIComponent('https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8'), 'NASA TV Live (ISS)', 'hls')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-200 text-xs font-semibold tv-btn-focus flex items-center gap-1.5 shadow-md"
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>NASA TV (Space)</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center pt-2 border-t border-slate-800">
            <button
              data-tv-focusable="true"
              onClick={() => {
                setErrorMessage(null);
                if (videoRef.current) {
                  videoRef.current.load();
                  videoRef.current.play().catch(() => {});
                }
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium tv-btn-focus flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Current</span>
            </button>
            <button
              data-tv-focusable="true"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium tv-btn-focus"
            >
              Back to Channels
            </button>
          </div>
        </div>
      )}

      {/* 10-Foot Leanback OSD Overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-between p-6 lg:p-10 transition-opacity duration-300 z-30 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top Header Scrim & Server Switcher */}
        <div className="bg-gradient-to-b from-black/95 via-black/80 to-transparent p-6 -m-6 lg:-m-10 pb-12 flex flex-col gap-3 pointer-events-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium mb-1">
                <span className="flex items-center gap-1.5 uppercase tracking-wider font-semibold">
                  <Tv className="w-3.5 h-3.5" />
                  {stream.category || 'HDHub4u Cinema'}
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="font-mono text-slate-300">{stream.resolution || '1080p'}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                  isEmbed ? 'bg-amber-900/80 text-amber-300 border border-amber-700/60' : 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/60'
                }`}>
                  {isEmbed ? 'TV Web Embed Player' : 'Direct 1080p HLS Player'}
                </span>
                {stream.episodeNumber !== undefined && (
                  <>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-900/80 text-violet-200 border border-violet-700/60 shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-violet-400" />
                      {stream.episodeTitle || `S${stream.seasonNumber || 1} EP ${stream.episodeNumber}`}
                    </span>
                  </>
                )}
                {isLive && (
                  <>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="flex items-center gap-1 text-red-400 font-bold tracking-wide">
                      <Radio className="w-3.5 h-3.5 animate-pulse" /> LIVE STREAM
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-xl lg:text-2xl font-display font-bold text-white tracking-tight drop-shadow-md truncate">
                {stream.title}
              </h1>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Mark Episode as Watched button */}
              <button
                id="player-btn-mark-watched"
                data-tv-focusable="true"
                onClick={() => {
                  playSelectSound();
                  saveWatchProgress(duration || 3600, duration || 3600, true);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold tv-btn-focus transition ${
                  isMarkedWatched
                    ? 'bg-emerald-950/90 border-emerald-600 text-emerald-300'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60'
                }`}
                title="Mark as watched"
              >
                {isMarkedWatched ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="hidden sm:inline">Watched</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-slate-400" />
                    <span className="hidden sm:inline">Mark Watched</span>
                  </>
                )}
              </button>

              {/* Stream Inspector */}
              <button
                id="player-btn-inspector"
                data-tv-focusable="true"
                onClick={() => setShowInspector(!showInspector)}
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 tv-btn-focus transition"
                title="Stream Info"
              >
                <Sliders className="w-4 h-4 text-indigo-400" />
              </button>

              <button
                id="player-btn-close"
                data-tv-focusable="true"
                onClick={() => {
                  playBackSound();
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white shadow-lg tv-btn-focus transition font-semibold text-xs uppercase tracking-wider"
              >
                <X className="w-4 h-4" />
                <span>Exit Player (ESC)</span>
              </button>
            </div>
          </div>

          {/* Interactive Server Switcher Ribbon */}
          {stream.alternativeServers && stream.alternativeServers.length > 0 && (
            <div className="flex items-center gap-2 pt-1 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5 shrink-0 pr-1">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                Servers:
              </span>
              {stream.alternativeServers.map((alt, idx) => {
                const isActive = alt.url === currentStreamUrl;
                return (
                  <button
                    key={idx}
                    data-tv-focusable="true"
                    onClick={() => switchServer(alt.url, alt.label, alt.streamType)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 tv-btn-focus border flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-indigo-600 border-indigo-400 text-white font-bold shadow-md shadow-indigo-600/30'
                        : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {alt.streamType === 'hls' ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    ) : (
                      <Monitor className="w-3 h-3 text-indigo-400" />
                    )}
                    <span className="truncate max-w-[200px]">{alt.label.replace(/^[⚡🌐🎬🚀🍿🎥📥]\s*/, '')}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Center Pause Indicator (Direct video mode only) */}
        {!isPlaying && !isEmbed && (
          <div className="self-center p-6 rounded-full bg-black/60 border border-white/20 backdrop-blur-md animate-pulse">
            <Pause className="w-12 h-12 text-white" />
          </div>
        )}

        {/* Bottom Control Dock */}
        {!isEmbed ? (
          <div className="bg-gradient-to-t from-black/95 via-black/70 to-transparent p-6 -m-6 lg:-m-10 pt-16 flex flex-col gap-4 pointer-events-auto">
            {/* Timeline Scrubber */}
            <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
              <span>{formatTime(currentTime)}</span>
              <div
                className="flex-1 relative h-3 bg-slate-800/80 rounded-full cursor-pointer overflow-hidden group border border-slate-700/50"
                onClick={(e) => {
                  if (isLive || !duration) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  if (videoRef.current) {
                    videoRef.current.currentTime = ratio * duration;
                  }
                }}
              >
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full relative transition-all"
                  style={{ width: `${isLive ? 100 : duration ? (currentTime / duration) * 100 : 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform" />
                </div>
              </div>
              <span>{isLive ? 'LIVE' : formatTime(duration)}</span>
            </div>

            {/* Primary 10-foot TV Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Left Transport Controls */}
              <div className="flex items-center gap-3">
                <button
                  id="player-btn-rewind"
                  data-tv-focusable="true"
                  onClick={() => seekRelative(-10)}
                  className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 tv-btn-focus border border-slate-700/50"
                  title="Rewind 10s (Left Arrow)"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  id="player-btn-play-pause"
                  data-tv-focusable="true"
                  onClick={togglePlay}
                  className="p-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white tv-btn-focus shadow-lg shadow-indigo-600/40"
                  title="Play / Pause (Space / Enter)"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
                </button>

                <button
                  id="player-btn-forward"
                  data-tv-focusable="true"
                  onClick={() => seekRelative(10)}
                  className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 tv-btn-focus border border-slate-700/50"
                  title="Skip 10s (Right Arrow)"
                >
                  <RotateCw className="w-5 h-5" />
                </button>

                {/* Volume & Mute */}
                <button
                  id="player-btn-mute"
                  data-tv-focusable="true"
                  onClick={toggleMute}
                  className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 tv-btn-focus border border-slate-700/50 ml-2"
                  title="Mute (M)"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              {/* Right TV Enhancement Controls */}
              <div className="flex items-center gap-2">
                {/* Aspect Ratio Switcher */}
                <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-1 text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 px-2 uppercase">Aspect</span>
                  {(['16:9', 'fill', 'cinema', '4:3'] as AspectRatioMode[]).map((mode) => (
                    <button
                      key={mode}
                      data-tv-focusable="true"
                      onClick={() => {
                        playSelectSound();
                        setAspectRatio(mode);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-medium uppercase transition ${
                        aspectRatio === mode
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {/* Audio Gain Boost */}
                <button
                  id="player-btn-audio-boost"
                  data-tv-focusable="true"
                  onClick={() => {
                    playSelectSound();
                    setAudioBoost((prev) => (prev === 0 ? 3 : prev === 3 ? 6 : 0));
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold tv-btn-focus transition ${
                    audioBoost > 0
                      ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Boost audio volume for quiet web video streams"
                >
                  <span>Boost</span>
                  <span className="font-mono">{audioBoost === 0 ? 'OFF' : `+${audioBoost}dB`}</span>
                </button>

                {/* Playback Speed */}
                <button
                  id="player-btn-speed"
                  data-tv-focusable="true"
                  onClick={() => {
                    playSelectSound();
                    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
                    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
                    const newSpeed = speeds[nextIdx];
                    setPlaybackSpeed(newSpeed);
                    if (videoRef.current) videoRef.current.playbackRate = newSpeed;
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white tv-btn-focus"
                  title="Playback Speed"
                >
                  {playbackSpeed}x
                </button>

                {/* Sleep Timer */}
                <button
                  id="player-btn-sleep"
                  data-tv-focusable="true"
                  onClick={() => {
                    playSelectSound();
                    const timers = [null, 15, 30, 45, 60];
                    const nextIdx = (timers.indexOf(sleepTimer) + 1) % timers.length;
                    setSleepTimer(timers[nextIdx]);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium tv-btn-focus transition ${
                    sleepTimer
                      ? 'bg-indigo-950/80 border-indigo-600 text-indigo-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Sleep Timer for Bedtime TV Watching"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{sleepTimer ? `${sleepTimer}m` : 'Sleep'}</span>
                </button>

                {/* Fullscreen */}
                <button
                  id="player-btn-fullscreen"
                  data-tv-focusable="true"
                  onClick={toggleFullscreen}
                  className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white tv-btn-focus"
                  title="Toggle Fullscreen (F)"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Embed Mode Bottom Helper Dock */
          <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 -m-6 lg:-m-10 flex items-center justify-between text-xs text-slate-400 pointer-events-auto">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Playing in TV Web Player (Press <b>ESC</b> or <b>Remote Back</b> to return)</span>
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-slate-500">
                Press <b>S</b> on TV Remote to cycle servers
              </span>
              <button
                data-tv-focusable="true"
                onClick={toggleFullscreen}
                className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-200 hover:text-white text-xs font-medium tv-btn-focus"
              >
                Fullscreen (F)
              </button>
            </div>
          </div>
        )}

        {/* Stream Inspector Drawer */}
        {showInspector && (
          <div className="absolute right-6 top-24 w-96 bg-slate-900/95 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl pointer-events-auto z-40 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Stream Inspector
              </span>
              <button
                onClick={() => setShowInspector(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-slate-300">
              <div>
                <span className="text-slate-500 block mb-0.5">Active Server</span>
                <span className="font-mono text-indigo-300 font-medium">{currentServerLabel}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Player Mode</span>
                <span className="font-mono text-white font-medium">{isEmbed ? 'Web Embed Player' : 'Direct HLS Engine'}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Active Stream Address</span>
                <span className="font-mono text-[11px] text-slate-300 break-all select-all block bg-slate-950 p-2 rounded border border-slate-800">
                  {currentStreamUrl}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Origin Catalog Page</span>
                <a
                  href={stream.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-indigo-400 hover:underline break-all"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{stream.sourceUrl}</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
