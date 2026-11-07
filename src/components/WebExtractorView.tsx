import React, { useState } from 'react';
import { StreamItem, ExtractedStreamResult } from '../types/tv';
import { Sparkles, Play, Plus, Loader2, CheckCircle2, AlertCircle, Globe, ShieldCheck, ArrowRight, Zap } from 'lucide-react';
import { playFocusSound, playSelectSound } from '../utils/sound';

interface WebExtractorViewProps {
  onPlayStream: (stream: StreamItem) => void;
  onAddToWatchlist: (stream: StreamItem) => void;
}

const PRESET_WEB_URLS = [
  {
    name: 'NASA Live (HLS .m3u8)',
    url: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    category: 'Live TV / Space',
    note: 'Adaptive bitrate HLS broadcast'
  },
  {
    name: 'Tears of Steel (4K MP4)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    category: '4K Cinema',
    note: 'Direct high-bitrate WebM/MP4'
  },
  {
    name: 'Sintel Fantasy Film',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    category: 'Animation',
    note: '1080p Web Open Movie'
  },
  {
    name: 'Archive.org Classic',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
    category: 'Archive Film',
    note: 'Public domain stream'
  }
];

export const WebExtractorView: React.FC<WebExtractorViewProps> = ({
  onPlayStream,
  onAddToWatchlist,
}) => {
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedStreamResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasAddedToWatchlist, setHasAddedToWatchlist] = useState(false);

  const handleExtract = async (targetUrl?: string) => {
    const urlToUse = targetUrl || inputUrl;
    if (!urlToUse || !urlToUse.trim()) return;

    playSelectSound();
    setIsLoading(true);
    setErrorMessage(null);
    setExtractedData(null);
    setHasAddedToWatchlist(false);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToUse.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.data?.message || 'Failed to extract stream from website');
      }

      setExtractedData(json.data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect to website. Check URL or network.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayExtracted = () => {
    if (!extractedData || !extractedData.streamUrl) return;
    playSelectSound();

    const streamItem: StreamItem = {
      id: `extracted-${Date.now()}`,
      title: extractedData.title || 'Extracted Web Stream',
      description: extractedData.description || 'Web stream parsed for Android TV.',
      streamUrl: extractedData.streamUrl,
      sourceUrl: extractedData.sourceUrl,
      format: extractedData.format || 'Web Stream',
      resolution: extractedData.resolution || '1080p',
      thumbnail: extractedData.thumbnail || '',
      category: 'Web Extractor',
      badge: 'EXTRACTED',
      addedAt: new Date().toISOString(),
    };

    onPlayStream(streamItem);
  };

  const handleSaveToWatchlist = () => {
    if (!extractedData || !extractedData.streamUrl) return;
    playSelectSound();

    const streamItem: StreamItem = {
      id: `saved-${Date.now()}`,
      title: extractedData.title || 'Extracted Web Stream',
      description: extractedData.description || 'Web stream parsed for Android TV.',
      streamUrl: extractedData.streamUrl,
      sourceUrl: extractedData.sourceUrl,
      format: extractedData.format || 'Web Stream',
      resolution: extractedData.resolution || '1080p',
      thumbnail: extractedData.thumbnail || '',
      category: 'Web Extractor',
      badge: 'EXTRACTED',
      addedAt: new Date().toISOString(),
    };

    onAddToWatchlist(streamItem);
    setHasAddedToWatchlist(true);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 lg:px-8 space-y-10">
      {/* Intro Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-indigo-400 font-mono uppercase tracking-wider mb-2">
          <Globe className="w-4 h-4" />
          <span>Web-to-Android-TV Stream Extractor</span>
        </div>
        <h2 className="text-3xl font-display font-bold text-white tracking-tight">
          Watch Any Website Media on Android TV
        </h2>
        <p className="text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
          Skip clunky TV web browsers, pop-up ads, and impossible remote navigation.
          Paste any website URL or video stream link below. SnapTV extracts clean video streams
          directly into your 10-foot TV media player.
        </p>
      </div>

      {/* Main Extractor Input Bar */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExtract();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="flex-1 relative">
            <input
              id="extractor-input-url"
              data-tv-focusable="true"
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste website URL (e.g. https://... or .m3u8 / .mp4 link)"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 outline-none transition tv-btn-focus"
            />
          </div>

          <button
            id="extractor-btn-submit"
            data-tv-focusable="true"
            type="submit"
            disabled={isLoading || !inputUrl.trim()}
            onClick={() => handleExtract()}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition tv-btn-focus shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting Stream...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Extract & Stream</span>
              </>
            )}
          </button>
        </form>

        {/* Preset Sample Links for Instant Testing */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <span className="text-xs text-slate-500 block mb-2 font-medium">
            Or test with verified sample web streams:
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_WEB_URLS.map((preset) => (
              <button
                key={preset.name}
                id={`preset-btn-${preset.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                data-tv-focusable="true"
                type="button"
                onClick={() => {
                  setInputUrl(preset.url);
                  handleExtract(preset.url);
                }}
                onFocus={playFocusSound}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white border border-slate-700/60 tv-btn-focus transition"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Extraction Feedback & Error */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Extraction Notice</p>
            <p className="text-xs text-red-300 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Extracted Stream Card */}
      {extractedData && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-900/60 shadow-2xl">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold mb-3">
            <CheckCircle2 className="w-4 h-4" />
            <span>Web Stream Ready for Playback</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Thumbnail */}
            <div className="aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden relative">
              {extractedData.thumbnail ? (
                <img
                  src={extractedData.thumbnail}
                  alt={extractedData.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600">
                  <Globe className="w-10 h-10" />
                </div>
              )}
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 font-mono text-[10px] text-white">
                {extractedData.format}
              </div>
            </div>

            {/* Info */}
            <div className="md:col-span-2 space-y-3">
              <h3 className="text-xl font-display font-bold text-white">
                {extractedData.title}
              </h3>
              <p className="text-xs text-slate-400 line-clamp-2">
                {extractedData.description}
              </p>

              <div className="text-xs font-mono text-slate-400 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 break-all">
                <span className="text-slate-500 block mb-0.5">Stream Source:</span>
                {extractedData.streamUrl || 'Website container resolved.'}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {extractedData.streamUrl ? (
                  <button
                    id="extracted-btn-play-now"
                    data-tv-focusable="true"
                    onClick={handlePlayExtracted}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/40 tv-btn-focus transition"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Watch in TV Player</span>
                  </button>
                ) : (
                  <div className="text-xs text-amber-400 bg-amber-950/60 p-2 rounded">
                    Direct video tag not detected. Try a direct media URL.
                  </div>
                )}

                {extractedData.streamUrl && (
                  <button
                    id="extracted-btn-save-watchlist"
                    data-tv-focusable="true"
                    onClick={handleSaveToWatchlist}
                    disabled={hasAddedToWatchlist}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 tv-btn-focus transition disabled:opacity-50"
                  >
                    {hasAddedToWatchlist ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Added to Watchlist</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Save to Watchlist</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Why Native App beats Web Browser on TV Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>The Web Browser Problem on TV</span>
          </div>
          <h4 className="text-base font-bold text-white">Why Browsing on TV Sucks</h4>
          <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
            <li>• Clunky virtual mouse cursor with an arrow remote is slow and frustrating.</li>
            <li>• Popups, cookie consent overlays, and paywalls block video players.</li>
            <li>• TV browsers crash frequently when running complex desktop JavaScript.</li>
            <li>• Video controls are too tiny to click from a couch 10 feet away.</li>
          </ul>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>The SnapTV Solution</span>
          </div>
          <h4 className="text-base font-bold text-white">Native Android TV Experience</h4>
          <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
            <li>• Extracts the pure video stream (HLS/MP4) directly into native hardware player.</li>
            <li>• 100% remote-controllable with D-Pad, Arrow keys, Enter, Back, and Home.</li>
            <li>• Big 10-foot UI with aspect ratio switching, audio boost, and sleep timer.</li>
            <li>• Phone companion: type URLs or search on your phone and beam instantly to TV.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
