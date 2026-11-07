import React, { useState, useEffect } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  ArrowLeft,
  Tv,
  CheckCircle2,
  Smartphone
} from 'lucide-react';

interface CompanionMobileRemoteProps {
  pairingCode: string;
  onExitCompanion?: () => void;
}

export const CompanionMobileRemote: React.FC<CompanionMobileRemoteProps> = ({
  pairingCode,
  onExitCompanion,
}) => {
  const [targetUrl, setTargetUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<{ title: string; isPlaying: boolean } | null>(null);

  // Poll status from TV session
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/remote/session/${pairingCode}?role=phone`);
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.nowPlaying) {
            setNowPlaying(data.nowPlaying);
          }
        }
      } catch {
        // Ignore poll failures
      }
    }, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [pairingCode]);

  const sendAction = async (action: string, payload?: any) => {
    try {
      await fetch(`/api/remote/session/${pairingCode}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
    } catch (err) {
      console.error('Failed to send remote command:', err);
    }
  };

  const handleSendUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;

    setIsSending(true);
    setSendSuccess(false);

    try {
      // First extract the stream if it's a website
      const extRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl.trim() }),
      });
      const extData = await extRes.json();

      const streamUrl = extData.data?.streamUrl || targetUrl.trim();
      const title = extData.data?.title || 'Web Stream sent from Phone';

      await sendAction('play_stream', {
        streamUrl,
        title,
        sourceUrl: targetUrl.trim(),
        format: extData.data?.format || 'Web Stream',
        resolution: extData.data?.resolution || '1080p',
        category: 'Phone Cast',
      });

      setSendSuccess(true);
      setTargetUrl('');
      setTimeout(() => setSendSuccess(false), 3500);
    } catch {
      // Direct stream fallback
      await sendAction('play_stream', {
        streamUrl: targetUrl.trim(),
        title: 'Direct Link from Phone',
        sourceUrl: targetUrl.trim(),
        format: 'Web Stream',
        category: 'Phone Cast',
      });
      setSendSuccess(true);
      setTargetUrl('');
      setTimeout(() => setSendSuccess(false), 3500);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto p-5 select-none font-sans">
      {/* Top Status */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">SnapTV Remote</h1>
            <p className="text-[11px] text-slate-400">Connected to TV #{pairingCode}</p>
          </div>
        </div>

        {onExitCompanion && (
          <button
            onClick={onExitCompanion}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded bg-slate-900 border border-slate-800"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Switch to TV</span>
          </button>
        )}
      </div>

      {/* Now Playing Banner */}
      {nowPlaying && (
        <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="truncate mr-2">
            <span className="text-[10px] uppercase font-mono text-indigo-400 block">Playing on TV</span>
            <span className="text-xs font-semibold text-white truncate block">{nowPlaying.title}</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
        </div>
      )}

      {/* Cast Web Link to TV Section */}
      <div className="mt-4 p-4 rounded-2xl bg-indigo-950/30 border border-indigo-900/60 shadow-lg space-y-3">
        <label className="block text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Send Website Link or Movie to TV</span>
        </label>
        <p className="text-[11px] text-slate-400">
          Paste any link from HDHub4u or search on your phone instead of typing with a TV remote.
        </p>

        <form onSubmit={handleSendUrl} className="flex gap-2">
          <input
            type="url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="Paste HDHub link or direct video URL"
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
          />
          <button
            type="submit"
            disabled={isSending || !targetUrl.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0"
          >
            {isSending ? 'Sending...' : <Send className="w-3.5 h-3.5" />}
          </button>
        </form>

        {sendSuccess && (
          <div className="text-xs text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sent! Playing on TV right now.</span>
          </div>
        )}
      </div>

      {/* Big Touch D-Pad */}
      <div className="my-auto py-6 flex flex-col items-center">
        <div className="relative w-56 h-56 rounded-full bg-slate-900 border-2 border-slate-800 shadow-2xl flex items-center justify-center p-3">
          {/* Up */}
          <button
            onClick={() => sendAction('dpad', { key: 'ArrowUp' })}
            className="absolute top-2 w-14 h-12 flex items-center justify-center text-slate-300 hover:text-white active:bg-indigo-600/30 rounded-t-full transition"
            aria-label="Up"
          >
            <ChevronUp className="w-7 h-7" />
          </button>

          {/* Down */}
          <button
            onClick={() => sendAction('dpad', { key: 'ArrowDown' })}
            className="absolute bottom-2 w-14 h-12 flex items-center justify-center text-slate-300 hover:text-white active:bg-indigo-600/30 rounded-b-full transition"
            aria-label="Down"
          >
            <ChevronDown className="w-7 h-7" />
          </button>

          {/* Left */}
          <button
            onClick={() => sendAction('dpad', { key: 'ArrowLeft' })}
            className="absolute left-2 w-12 h-14 flex items-center justify-center text-slate-300 hover:text-white active:bg-indigo-600/30 rounded-l-full transition"
            aria-label="Left"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>

          {/* Right */}
          <button
            onClick={() => sendAction('dpad', { key: 'ArrowRight' })}
            className="absolute right-2 w-12 h-14 flex items-center justify-center text-slate-300 hover:text-white active:bg-indigo-600/30 rounded-r-full transition"
            aria-label="Right"
          >
            <ChevronRight className="w-7 h-7" />
          </button>

          {/* Center OK Button */}
          <button
            onClick={() => sendAction('dpad', { key: 'Enter' })}
            className="w-20 h-20 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-sm shadow-lg shadow-indigo-600/50 flex items-center justify-center transition-all"
            aria-label="OK"
          >
            OK
          </button>
        </div>

        {/* Home & Back Buttons */}
        <div className="flex gap-12 mt-6">
          <button
            onClick={() => sendAction('dpad', { key: 'Escape' })}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 active:bg-slate-800 text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[10px] uppercase font-semibold">Back</span>
          </button>

          <button
            onClick={() => sendAction('tab', { tab: 'home' })}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 active:bg-slate-800 text-slate-300"
          >
            <Tv className="w-5 h-5" />
            <span className="text-[10px] uppercase font-semibold">Home</span>
          </button>
        </div>
      </div>

      {/* Media Playback Controls */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-around">
        <button
          onClick={() => sendAction('playback', { type: 'rewind' })}
          className="p-3 rounded-full bg-slate-900 text-slate-300 active:bg-slate-800"
          title="Rewind 10s"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={() => sendAction('playback', { type: 'toggle_play' })}
          className="p-4 rounded-full bg-indigo-600 text-white shadow-lg active:scale-95 transition"
          title="Play / Pause"
        >
          <Play className="w-6 h-6 fill-current ml-0.5" />
        </button>

        <button
          onClick={() => sendAction('playback', { type: 'forward' })}
          className="p-3 rounded-full bg-slate-900 text-slate-300 active:bg-slate-800"
          title="Skip 10s"
        >
          <RotateCw className="w-5 h-5" />
        </button>

        <button
          onClick={() => sendAction('playback', { type: 'mute' })}
          className="p-3 rounded-full bg-slate-900 text-slate-300 active:bg-slate-800"
          title="Mute"
        >
          <VolumeX className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
