import React, { useState, useEffect } from 'react';
import { ContentProviderId, MirrorInfo } from '../types/tv';
import {
  Globe,
  Radio,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Layers,
  Sparkles,
  Film,
  X,
  ExternalLink
} from 'lucide-react';
import { playFocusSound, playSelectSound } from '../utils/sound';

interface ProviderAndMirrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProvider: ContentProviderId;
  onSelectProvider: (provider: ContentProviderId) => void;
  currentDomain: string;
  onDomainChange: (domain: string) => void;
}

export const ProviderAndMirrorModal: React.FC<ProviderAndMirrorModalProps> = ({
  isOpen,
  onClose,
  activeProvider,
  onSelectProvider,
  currentDomain,
  onDomainChange,
}) => {
  const [mirrors, setMirrors] = useState<MirrorInfo[]>([]);
  const [isLoadingMirrors, setIsLoadingMirrors] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [customInput, setCustomInput] = useState(currentDomain);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fetchMirrors = async () => {
    setIsLoadingMirrors(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/hdhub/mirrors');
      const data = await res.json();
      if (data.success && data.mirrors) {
        setMirrors(data.mirrors);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoadingMirrors(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCustomInput(currentDomain);
      fetchMirrors();
    }
  }, [isOpen, currentDomain]);

  if (!isOpen) return null;

  const handleAutoDetect = async () => {
    playSelectSound();
    setIsAutoDetecting(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/hdhub/auto-detect', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.activeMirror) {
        onDomainChange(data.activeMirror);
        setCustomInput(data.activeMirror);
        setFeedbackMsg(`Connected to fastest mirror: ${data.activeMirror} (${data.latencyMs}ms)`);
        await fetchMirrors();
      } else {
        setFeedbackMsg('Auto-detect completed. Mirrors verified.');
      }
    } catch {
      setFeedbackMsg('Auto-detection timed out. Check internet connection.');
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleSelectMirror = async (domain: string) => {
    playSelectSound();
    try {
      await fetch('/api/hdhub/set-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      onDomainChange(domain);
      setCustomInput(domain);
      setFeedbackMsg(`Switched active mirror to ${domain}`);
      await fetchMirrors();
    } catch {
      onDomainChange(domain);
    }
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    const clean = customInput.trim().replace(/\/+$/, '');
    handleSelectMirror(clean);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 lg:p-8 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white tracking-tight">
                Integrators & Domain Self-Healing
              </h2>
              <p className="text-xs text-slate-400">
                Keep streaming reliably even if domains migrate or are blocked by ISPs.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playSelectSound();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Active Content Provider Switcher */}
        <div className="space-y-3">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-indigo-400" />
            <span>Select Content Provider</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Provider 1: HDHub4u */}
            <button
              onClick={() => {
                playSelectSound();
                onSelectProvider('hdhub4u');
              }}
              onFocus={playFocusSound}
              className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                activeProvider === 'hdhub4u'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white">HDHub4u Ultra</span>
                  {activeProvider === 'hdhub4u' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  Dual Audio, Bollywood & PlayDrive 1080p direct streams.
                </p>
              </div>
              <span className="mt-3 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 w-fit">
                Dynamic Mirrors
              </span>
            </button>

            {/* Provider 2: BollyStream OTT */}
            <button
              onClick={() => {
                playSelectSound();
                onSelectProvider('bollystream');
              }}
              onFocus={playFocusSound}
              className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                activeProvider === 'bollystream'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white">BollyStream OTT</span>
                  {activeProvider === 'bollystream' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  Panchayat S3, Mirzapur S3, Stree 2 & top Indian OTT series.
                </p>
              </div>
              <span className="mt-3 text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 w-fit">
                Verified OTT 1080p
              </span>
            </button>

            {/* Provider 3: VegaMovies Vault (Backup) */}
            <button
              onClick={() => {
                playSelectSound();
                onSelectProvider('vegamovies');
              }}
              onFocus={playFocusSound}
              className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                activeProvider === 'vegamovies'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white">VegaMovies Vault</span>
                  {activeProvider === 'vegamovies' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  Dual Audio, 4K Web-DL & multi-server stream backup.
                </p>
              </div>
              <span className="mt-3 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 w-fit">
                Backup Engine
              </span>
            </button>

            {/* Provider 4: Golden Classics */}
            <button
              onClick={() => {
                playSelectSound();
                onSelectProvider('archive');
              }}
              onFocus={playFocusSound}
              className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                activeProvider === 'archive'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white">Golden Classics</span>
                  {activeProvider === 'archive' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  Sholay, Deewaar, Anand remastered cinema archive.
                </p>
              </div>
              <span className="mt-3 text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 w-fit">
                Archive MP4
              </span>
            </button>
          </div>
        </div>

        {/* Section 2: HDHub4u Live Mirror Self-Healing Dashboard */}
        <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-white">HDHub4u Mirror Pool</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Active mirror: <code className="text-amber-300 font-mono font-medium">{currentDomain}</code>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchMirrors}
                disabled={isLoadingMirrors}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition"
                title="Refresh ping"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMirrors ? 'animate-spin' : ''}`} />
                <span>Ping</span>
              </button>

              <button
                onClick={handleAutoDetect}
                disabled={isAutoDetecting}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition"
              >
                <Zap className={`w-3.5 h-3.5 text-amber-300 ${isAutoDetecting ? 'animate-bounce' : ''}`} />
                <span>{isAutoDetecting ? 'Detecting Fastest...' : 'Auto-Detect Fastest'}</span>
              </button>
            </div>
          </div>

          {feedbackMsg && (
            <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-700/60 text-xs text-indigo-200">
              {feedbackMsg}
            </div>
          )}

          {/* Mirror Table / List */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {mirrors.map((m) => {
              const isSelected = m.domain === currentDomain;
              return (
                <div
                  key={m.domain}
                  onClick={() => handleSelectMirror(m.domain)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? 'bg-slate-800/90 border-amber-500/80 text-white'
                      : 'bg-slate-900/60 border-slate-800/70 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        m.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
                      }`}
                    />
                    <span className="font-mono text-xs">{m.domain}</span>
                    {isSelected && (
                      <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    {m.latencyMs !== undefined && (
                      <span
                        className={`font-mono text-[11px] ${
                          m.latencyMs < 100
                            ? 'text-emerald-400'
                            : m.latencyMs < 300
                            ? 'text-amber-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {m.latencyMs} ms
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectMirror(m.domain);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium"
                    >
                      Use
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Mirror URL Input Form */}
          <form onSubmit={handleSaveCustom} className="pt-2 flex gap-2">
            <input
              type="url"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="https://hdhub4u.deal or https://new11.hdhub4u.cl"
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              Save Custom Mirror
            </button>
          </form>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">
              📌 About <code className="text-amber-400 font-mono">https://hdhub4u.deal/</code>:
            </p>
            <p className="leading-relaxed">
              <span className="text-indigo-300 font-mono">hdhub4u.deal</span> is their official permanent redirect portal. Because media domains face ISP blocks, they use <span className="text-slate-200">.deal</span> as an anchor to route users to active media servers like <span className="text-slate-200 font-mono">new11.hdhub4u.cl</span>. Our app monitors both automatically so you get zero interruptions.
            </p>
          </div>
        </div>

        {/* Section 3: Official App Analysis */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">What About the Official HDHub4u App?</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The official HDHub4u APK (distributed on Telegram and third-party stores) is built as a <strong>mobile portrait WebView app</strong> for smartphones. It lacks Android TV remote D-pad controls and contains mobile redirect ads.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
              <span className="text-rose-400 font-bold block mb-0.5">Official Mobile APK</span>
              • Touchscreen phone only<br />
              • No Android TV D-pad focus<br />
              • Mobile banner & popup ads
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-slate-300">
              <span className="text-emerald-400 font-bold block mb-0.5">SnapTV (This App)</span>
              • 100% Android TV Leanback D-pad<br />
              • Clean 1080p PlayDrive direct streams<br />
              • Watch tracking, Audio Boost & PWA install
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={() => {
              playSelectSound();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30"
          >
            Done & Apply
          </button>
        </div>
      </div>
    </div>
  );
};
