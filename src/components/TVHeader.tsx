import React from 'react';
import { TVTab } from '../types/tv';
import {
  Tv,
  Radio,
  Film,
  Sparkles,
  Bookmark,
  Search,
  Smartphone,
  Globe,
  Sliders
} from 'lucide-react';
import { playFocusSound, playSelectSound } from '../utils/sound';

interface TVHeaderProps {
  activeTab: TVTab;
  onTabChange: (tab: TVTab) => void;
  onOpenExtractor: () => void;
  onToggleVirtualRemote: () => void;
  isVirtualRemoteOpen: boolean;
  pairingCode: string | null;
  onOpenSettings?: () => void;
}

export const TVHeader: React.FC<TVHeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenExtractor,
  onToggleVirtualRemote,
  isVirtualRemoteOpen,
  pairingCode,
  onOpenSettings,
}) => {
  const isMoviesActive = activeTab === 'movies' || activeTab === 'bollywood' || activeTab === 'south' || activeTab === 'hollywood' || activeTab === 'home';
  const isSeriesActive = activeTab === 'webseries';
  const isLiveTVActive = activeTab === 'livetv';
  const isLibraryActive = activeTab === 'library' || activeTab === 'watchlist' || activeTab === 'recent';

  const handleTab = (tab: TVTab) => {
    playSelectSound();
    onTabChange(tab);
  };

  return (
    <header className="flex items-center justify-between gap-4 px-4 lg:px-8 py-3 bg-[#080b10] border-b border-slate-800/80 sticky top-0 z-40 select-none w-full">
      {/* Zone 1: Brand Wordmark */}
      <button
        id="nav-brand"
        data-tv-focusable="true"
        onClick={() => handleTab('livetv')}
        onFocus={playFocusSound}
        className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-indigo-400 transition tv-btn-focus rounded-lg px-2 py-1"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-amber-500 flex items-center justify-center shadow-md shadow-indigo-600/30">
          <Tv className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col text-left">
          <span className="font-display font-extrabold tracking-wide leading-tight text-sm">SnapTV</span>
          <span className="text-[10px] text-emerald-400 font-mono font-medium -mt-0.5">Live & Media Hub</span>
        </div>
      </button>

      {/* Zone 2: 4 Primary Hubs (Live TV, Movies, Series, Library) */}
      <nav className="flex items-center gap-1 sm:gap-2 text-xs font-semibold overflow-x-auto no-scrollbar" aria-label="Primary Navigation">
        {/* 1. Live TV Hub */}
        <button
          id="nav-tab-livetv"
          data-tv-focusable="true"
          onClick={() => handleTab('livetv')}
          onFocus={playFocusSound}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition tv-btn-focus border ${
            isLiveTVActive
              ? 'bg-emerald-600 text-white font-bold border-emerald-500 shadow-md shadow-emerald-600/30'
              : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
          }`}
        >
          <div className="relative">
            <Radio className={`w-3.5 h-3.5 ${isLiveTVActive ? 'text-white' : 'text-emerald-400'}`} />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span>Live TV (IPTV)</span>
        </button>

        {/* 2. Movies Hub */}
        <button
          id="nav-tab-movies"
          data-tv-focusable="true"
          onClick={() => handleTab('movies')}
          onFocus={playFocusSound}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition tv-btn-focus border ${
            isMoviesActive
              ? 'bg-indigo-600 text-white font-bold border-indigo-500 shadow-md shadow-indigo-600/30'
              : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
          }`}
        >
          <Film className={`w-3.5 h-3.5 ${isMoviesActive ? 'text-white' : 'text-indigo-400'}`} />
          <span>Movies</span>
        </button>

        {/* 3. Series Hub */}
        <button
          id="nav-tab-webseries"
          data-tv-focusable="true"
          onClick={() => handleTab('webseries')}
          onFocus={playFocusSound}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition tv-btn-focus border ${
            isSeriesActive
              ? 'bg-violet-600 text-white font-bold border-violet-500 shadow-md shadow-violet-600/30'
              : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${isSeriesActive ? 'text-white' : 'text-violet-400'}`} />
          <span>Series</span>
        </button>

        {/* 4. Library Hub */}
        <button
          id="nav-tab-library"
          data-tv-focusable="true"
          onClick={() => handleTab('library')}
          onFocus={playFocusSound}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition tv-btn-focus border ${
            isLibraryActive
              ? 'bg-amber-600 text-white font-bold border-amber-500 shadow-md shadow-amber-600/30'
              : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isLibraryActive ? 'text-white' : 'text-amber-400'}`} />
          <span>Library</span>
        </button>

        {/* Search Shortcut */}
        <button
          id="nav-tab-search"
          data-tv-focusable="true"
          onClick={() => handleTab('search')}
          onFocus={playFocusSound}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition tv-btn-focus border ${
            activeTab === 'search'
              ? 'bg-slate-800 text-white font-bold border-slate-700'
              : 'bg-slate-950 text-slate-400 hover:text-white border-slate-850'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </nav>

      {/* Zone 3: Quick TV Utilities */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Web Streamer */}
        <button
          id="nav-btn-extractor"
          data-tv-focusable="true"
          onClick={() => {
            playSelectSound();
            onOpenExtractor();
          }}
          onFocus={playFocusSound}
          title="Play Any Web Video Link"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-cyan-300 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl transition tv-btn-focus whitespace-nowrap"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Web Player</span>
        </button>

        {/* On-Screen TV Remote HUD Toggle */}
        <button
          id="nav-btn-remote-hud"
          data-tv-focusable="true"
          onClick={() => {
            playSelectSound();
            onToggleVirtualRemote();
          }}
          onFocus={playFocusSound}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl transition tv-btn-focus border whitespace-nowrap ${
            isVirtualRemoteOpen
              ? 'bg-slate-800 text-indigo-300 border-indigo-500/60'
              : 'text-slate-300 hover:text-white bg-slate-900 border-slate-800'
          }`}
          title="Toggle on-screen TV remote controller"
        >
          <Tv className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden md:inline">{isVirtualRemoteOpen ? 'Hide Remote' : 'TV Remote'}</span>
        </button>

        {/* Phone Remote Pairing */}
        <button
          id="nav-btn-phone-companion"
          data-tv-focusable="true"
          onClick={() => handleTab('remote')}
          onFocus={playFocusSound}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/30 transition tv-btn-focus whitespace-nowrap"
        >
          <Smartphone className="w-3.5 h-3.5 text-white" />
          <span className="hidden sm:inline">Phone Remote</span>
          {pairingCode && (
            <span className="font-mono text-[10px] text-indigo-200 bg-indigo-900/80 px-1 rounded">
              {pairingCode}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
