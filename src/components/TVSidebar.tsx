import React, { useState } from 'react';
import { TVTab } from '../types/tv';
import {
  Radio,
  Film,
  Sparkles,
  Bookmark,
  Search,
  Smartphone,
  Tv,
  Globe,
  Sliders,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { playFocusSound, playSelectSound } from '../utils/sound';

interface TVSidebarProps {
  activeTab: TVTab;
  onTabChange: (tab: TVTab) => void;
  onOpenExtractor: () => void;
  onToggleVirtualRemote: () => void;
  isVirtualRemoteOpen: boolean;
  pairingCode: string | null;
  onOpenSettings?: () => void;
}

export const TVSidebar: React.FC<TVSidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenExtractor,
  onToggleVirtualRemote,
  isVirtualRemoteOpen,
  pairingCode,
  onOpenSettings,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Grouped active state checks
  const isMoviesActive = activeTab === 'movies' || activeTab === 'bollywood' || activeTab === 'south' || activeTab === 'hollywood' || activeTab === 'home';
  const isSeriesActive = activeTab === 'webseries';
  const isLiveTVActive = activeTab === 'livetv';
  const isLibraryActive = activeTab === 'library' || activeTab === 'watchlist' || activeTab === 'recent';

  const handleNavClick = (tab: TVTab) => {
    playSelectSound();
    onTabChange(tab);
  };

  return (
    <aside
      id="tv-sidebar"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={`sticky top-0 h-screen shrink-0 z-40 flex flex-col justify-between bg-[#0b0f17] border-r border-slate-800/90 tv-sidebar-transition select-none ${
        isExpanded ? 'w-56 shadow-2xl shadow-black/90' : 'w-20'
      }`}
    >
      {/* Top Section: Brand Logo & Navigation Hubs */}
      <div className="flex flex-col gap-2.5 p-2 sm:p-2.5">
        {/* Brand Icon Button */}
        <button
          id="sidebar-brand-btn"
          data-tv-focusable="true"
          onClick={() => handleNavClick('livetv')}
          onFocus={playFocusSound}
          title="SnapTV"
          className="flex items-center gap-3 w-full p-2 rounded-xl text-white hover:bg-slate-800/70 transition tv-btn-focus overflow-hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/40">
            <Tv className="w-5 h-5 text-white" />
          </div>
          {isExpanded && (
            <div className="flex flex-col text-left whitespace-nowrap overflow-hidden">
              <span className="font-display font-black text-sm tracking-wide leading-tight text-white">SnapTV</span>
              <span className="text-[10px] text-amber-400 font-mono font-medium -mt-0.5">Leanback TV</span>
            </div>
          )}
        </button>

        {/* Search Shortcut */}
        <button
          id="sidebar-nav-search"
          data-tv-focusable="true"
          onClick={() => handleNavClick('search')}
          onFocus={playFocusSound}
          title="Search Movies & Series"
          className={`flex ${isExpanded ? 'flex-row items-center gap-3.5 px-3 py-2.5' : 'flex-col items-center justify-center py-2 px-1'} rounded-xl transition tv-btn-focus text-left overflow-hidden ${
            activeTab === 'search'
              ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Search className="w-5 h-5 shrink-0" />
          {isExpanded ? (
            <span className="text-xs font-semibold whitespace-nowrap">Search</span>
          ) : (
            <span className="text-[9px] font-mono tracking-tight font-medium mt-1 uppercase text-slate-400">Search</span>
          )}
        </button>

        {/* Divider */}
        <div className="h-px bg-slate-800/80 my-0.5 mx-1" />

        {/* 4 CORE NAVIGATION HUBS */}
        <nav className="flex flex-col gap-1.5" aria-label="Main Navigation">
          {/* 1. Live TV Hub */}
          <button
            id="sidebar-nav-livetv"
            data-tv-focusable="true"
            onClick={() => handleNavClick('livetv')}
            onFocus={playFocusSound}
            title="Live TV Broadcasts (Haryanvi, Hindi, Punjabi, Sports)"
            className={`flex ${isExpanded ? 'flex-row items-center gap-3.5 px-3 py-2.5' : 'flex-col items-center justify-center py-2 px-1'} rounded-xl transition tv-btn-focus text-left overflow-hidden relative border ${
              isLiveTVActive
                ? 'bg-emerald-600 text-white font-bold border-emerald-500 shadow-lg shadow-emerald-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent'
            }`}
          >
            <div className="relative shrink-0 flex items-center justify-center">
              <Radio className={`w-5 h-5 ${isLiveTVActive ? 'text-white' : 'text-emerald-400'}`} />
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            {isExpanded ? (
              <div className="flex flex-col whitespace-nowrap overflow-hidden">
                <span className="text-xs font-semibold">Live TV</span>
                <span className="text-[10px] text-emerald-200 font-mono">IPTV Feeds</span>
              </div>
            ) : (
              <span className={`text-[9px] font-mono tracking-tight font-bold mt-1 uppercase ${isLiveTVActive ? 'text-white' : 'text-emerald-400'}`}>
                Live TV
              </span>
            )}
          </button>

          {/* 2. Movies Hub */}
          <button
            id="sidebar-nav-movies"
            data-tv-focusable="true"
            onClick={() => handleNavClick('movies')}
            onFocus={playFocusSound}
            title="Movies (Bollywood, South, Hollywood)"
            className={`flex ${isExpanded ? 'flex-row items-center gap-3.5 px-3 py-2.5' : 'flex-col items-center justify-center py-2 px-1'} rounded-xl transition tv-btn-focus text-left overflow-hidden border ${
              isMoviesActive
                ? 'bg-indigo-600 text-white font-bold border-indigo-500 shadow-lg shadow-indigo-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent'
            }`}
          >
            <Film className={`w-5 h-5 shrink-0 ${isMoviesActive ? 'text-white' : 'text-indigo-400'}`} />
            {isExpanded ? (
              <div className="flex flex-col whitespace-nowrap overflow-hidden">
                <span className="text-xs font-semibold">Movies</span>
                <span className="text-[10px] text-indigo-200 font-mono">Bollywood · South</span>
              </div>
            ) : (
              <span className={`text-[9px] font-mono tracking-tight font-bold mt-1 uppercase ${isMoviesActive ? 'text-white' : 'text-indigo-400'}`}>
                Movies
              </span>
            )}
          </button>

          {/* 3. Series Hub */}
          <button
            id="sidebar-nav-series"
            data-tv-focusable="true"
            onClick={() => handleNavClick('webseries')}
            onFocus={playFocusSound}
            title="Web Series & Shows"
            className={`flex ${isExpanded ? 'flex-row items-center gap-3.5 px-3 py-2.5' : 'flex-col items-center justify-center py-2 px-1'} rounded-xl transition tv-btn-focus text-left overflow-hidden border ${
              isSeriesActive
                ? 'bg-violet-600 text-white font-bold border-violet-500 shadow-lg shadow-violet-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent'
            }`}
          >
            <Sparkles className={`w-5 h-5 shrink-0 ${isSeriesActive ? 'text-white' : 'text-violet-400'}`} />
            {isExpanded ? (
              <div className="flex flex-col whitespace-nowrap overflow-hidden">
                <span className="text-xs font-semibold">Series</span>
                <span className="text-[10px] text-violet-200 font-mono">OTT Originals</span>
              </div>
            ) : (
              <span className={`text-[9px] font-mono tracking-tight font-bold mt-1 uppercase ${isSeriesActive ? 'text-white' : 'text-violet-400'}`}>
                Series
              </span>
            )}
          </button>

          {/* 4. Library Hub */}
          <button
            id="sidebar-nav-library"
            data-tv-focusable="true"
            onClick={() => handleNavClick('library')}
            onFocus={playFocusSound}
            title="My Library (Watchlist & History)"
            className={`flex ${isExpanded ? 'flex-row items-center gap-3.5 px-3 py-2.5' : 'flex-col items-center justify-center py-2 px-1'} rounded-xl transition tv-btn-focus text-left overflow-hidden border ${
              isLibraryActive
                ? 'bg-amber-600 text-white font-bold border-amber-500 shadow-lg shadow-amber-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border-transparent'
            }`}
          >
            <Bookmark className={`w-5 h-5 shrink-0 ${isLibraryActive ? 'text-white' : 'text-amber-400'}`} />
            {isExpanded ? (
              <div className="flex flex-col whitespace-nowrap overflow-hidden">
                <span className="text-xs font-semibold">Library</span>
                <span className="text-[10px] text-amber-200 font-mono">Watchlist · Recent</span>
              </div>
            ) : (
              <span className={`text-[9px] font-mono tracking-tight font-bold mt-1 uppercase ${isLibraryActive ? 'text-white' : 'text-amber-400'}`}>
                Library
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Bottom Section: Remote, Extractor, Settings & Toggle */}
      <div className="flex flex-col gap-1.5 p-2 sm:p-2.5 border-t border-slate-800/80 bg-[#080c14]">
        {/* Web Stream Extractor */}
        <button
          id="sidebar-btn-extractor"
          data-tv-focusable="true"
          onClick={() => {
            playSelectSound();
            onOpenExtractor();
          }}
          onFocus={playFocusSound}
          title="Play Any Web Video Link"
          className={`flex ${isExpanded ? 'flex-row items-center gap-3.5 px-3 py-2' : 'flex-col items-center justify-center py-1.5 px-1'} rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition tv-btn-focus text-left overflow-hidden`}
        >
          <Globe className="w-4 h-4 shrink-0 text-cyan-400" />
          {isExpanded ? (
            <span className="text-xs font-medium whitespace-nowrap">Web Streamer</span>
          ) : (
            <span className="text-[8px] font-mono mt-0.5 text-slate-400 uppercase">Streamer</span>
          )}
        </button>

        {/* On-Screen TV Remote HUD Toggle */}
        <button
          id="sidebar-btn-virtual-remote"
          data-tv-focusable="true"
          onClick={() => {
            playSelectSound();
            onToggleVirtualRemote();
          }}
          onFocus={playFocusSound}
          title="Toggle On-Screen Remote Controller"
          className={`flex ${isExpanded ? 'flex-row items-center gap-3.5 px-3 py-2' : 'flex-col items-center justify-center py-1.5 px-1'} rounded-xl transition tv-btn-focus text-left overflow-hidden ${
            isVirtualRemoteOpen
              ? 'bg-slate-800 text-indigo-300 border border-indigo-500/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Tv className="w-4 h-4 shrink-0 text-indigo-400" />
          {isExpanded ? (
            <span className="text-xs font-medium whitespace-nowrap">
              {isVirtualRemoteOpen ? 'Hide Remote' : 'On-Screen Remote'}
            </span>
          ) : (
            <span className="text-[8px] font-mono mt-0.5 text-slate-400 uppercase">Remote</span>
          )}
        </button>

        {/* Phone Remote Pairing */}
        <button
          id="sidebar-btn-phone-remote"
          data-tv-focusable="true"
          onClick={() => handleNavClick('remote')}
          onFocus={playFocusSound}
          title="Pair Phone as TV Remote"
          className={`flex ${isExpanded ? 'flex-row items-center gap-3 px-3 py-2' : 'flex-col items-center justify-center py-1.5 px-1'} rounded-xl transition tv-btn-focus text-left overflow-hidden ${
            activeTab === 'remote'
              ? 'bg-indigo-600 text-white font-semibold'
              : 'text-slate-300 hover:text-white bg-slate-900/90 border border-slate-800 hover:border-slate-700'
          }`}
        >
          <Smartphone className="w-4 h-4 shrink-0 text-indigo-300" />
          {isExpanded ? (
            <div className="flex flex-col whitespace-nowrap overflow-hidden">
              <span className="text-xs font-semibold">Phone Remote</span>
              {pairingCode && (
                <span className="font-mono text-[9px] text-indigo-200">
                  {pairingCode}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[8px] font-mono mt-0.5 text-indigo-300 uppercase">Pair</span>
          )}
        </button>

        {/* Settings / Mirror Configuration */}
        {onOpenSettings && (
          <button
            id="sidebar-btn-settings"
            data-tv-focusable="true"
            onClick={() => {
              playSelectSound();
              onOpenSettings();
            }}
            onFocus={playFocusSound}
            title="Provider & Mirror Settings"
            className={`flex ${isExpanded ? 'flex-row items-center gap-3 px-3 py-2' : 'flex-col items-center justify-center py-1.5 px-1'} rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition tv-btn-focus text-left overflow-hidden`}
          >
            <Sliders className="w-4 h-4 shrink-0 text-slate-400" />
            {isExpanded ? (
              <span className="text-xs font-medium whitespace-nowrap">Mirrors</span>
            ) : (
              <span className="text-[8px] font-mono mt-0.5 text-slate-400 uppercase">Mirrors</span>
            )}
          </button>
        )}

        {/* Expand / Collapse Button */}
        <button
          id="sidebar-btn-toggle-expand"
          data-tv-focusable="true"
          onClick={() => setIsExpanded(!isExpanded)}
          onFocus={playFocusSound}
          className="flex items-center justify-center w-full py-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition tv-btn-focus"
          title={isExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          {isExpanded ? (
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Collapse</span>
            </div>
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </aside>
  );
};
