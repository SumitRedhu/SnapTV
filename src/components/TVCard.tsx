import React from 'react';
import { StreamItem } from '../types/tv';
import { Play, Bookmark, BookmarkCheck } from 'lucide-react';
import { playFocusSound, playSelectSound } from '../utils/sound';

interface TVCardProps {
  stream: StreamItem;
  onPlay: (stream: StreamItem) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (stream: StreamItem) => void;
  index?: number;
  focused?: boolean;
}

export const TVCard: React.FC<TVCardProps> = ({
  stream,
  onPlay,
  isBookmarked = false,
  onToggleBookmark,
  focused = false,
}) => {
  return (
    <div
      id={`tv-card-${stream.id}`}
      data-tv-focusable="true"
      tabIndex={0}
      onClick={() => {
        playSelectSound();
        onPlay(stream);
      }}
      onFocus={playFocusSound}
      className={`group relative flex flex-col rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden cursor-pointer select-none tv-card-focus transition-all duration-200 ${
        focused ? 'is-focused ring-4 ring-indigo-500' : ''
      }`}
    >
      {/* 16:9 Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-950">
        {stream.thumbnail ? (
          <img
            src={stream.thumbnail}
            alt={stream.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 group-focus:scale-105"
            onError={(e) => {
              // Graceful fallback to styled gradient
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}

        {/* Ambient Overlay Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          {stream.badge ? (
            <span className="text-[11px] font-bold font-mono text-indigo-200 bg-indigo-950/80 border border-indigo-700/60 px-2 py-0.5 rounded shadow-sm">
              {stream.badge}
            </span>
          ) : (
            <span className="text-[11px] font-mono text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded">
              {stream.format}
            </span>
          )}

          {stream.duration && (
            <span className="text-[11px] font-mono text-slate-200 bg-black/70 px-2 py-0.5 rounded backdrop-blur-sm">
              {stream.duration}
            </span>
          )}
        </div>

        {/* Center Hover/Focus Play Icon */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200 bg-black/40 backdrop-blur-[2px]">
          <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-600/50 transform scale-90 group-hover:scale-100 group-focus:scale-100 transition-transform">
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Card Content & Zero-Pill Metadata */}
      <div className="p-4 flex flex-col flex-1 justify-between bg-slate-900/40">
        <div>
          {/* Clean Unboxed Metadata with · separator */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5 font-medium">
            <span>{stream.category || 'Web Media'}</span>
            <span aria-hidden="true">·</span>
            <span>{stream.resolution || '1080p'}</span>
          </div>

          <h3 className="font-display font-semibold text-white text-base leading-snug line-clamp-1 group-hover:text-indigo-300 group-focus:text-indigo-300 transition-colors">
            {stream.title}
          </h3>

          <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
            {stream.description || 'Web stream ready for Android TV instant playback.'}
          </p>
        </div>

        {/* Quick Action Footer */}
        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px] text-indigo-400 flex items-center gap-1">
            <Play className="w-3 h-3" />
            Watch Now
          </span>

          {onToggleBookmark && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                playSelectSound();
                onToggleBookmark(stream);
              }}
              className="p-1 rounded text-slate-400 hover:text-white transition"
              title={isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4 text-cyan-400" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
