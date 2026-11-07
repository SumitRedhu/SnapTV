import React from 'react';
import { HDHubMovie } from '../types/tv';
import { Play, Sparkles, Film } from 'lucide-react';
import { playFocusSound, playSelectSound } from '../utils/sound';

interface HDHubMovieCardProps {
  movie: HDHubMovie;
  onSelect: (movie: HDHubMovie) => void;
  index?: number;
}

export const HDHubMovieCard: React.FC<HDHubMovieCardProps> = ({
  movie,
  onSelect,
  index = 0,
}) => {
  return (
    <div
      id={`movie-card-${movie.id}`}
      data-tv-focusable="true"
      tabIndex={0}
      onClick={() => {
        playSelectSound();
        onSelect(movie);
      }}
      onFocus={playFocusSound}
      className="tv-perf-contain group relative flex flex-col rounded-xl bg-slate-900/90 border border-slate-800/80 overflow-hidden cursor-pointer select-none tv-card-focus transition-all duration-150"
    >
      {/* 2:3 Cinema Poster Aspect Ratio */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-black">
        {movie.poster ? (
          <img
            src={movie.poster}
            alt={movie.cleanTitle}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 group-focus:scale-105 transition-transform duration-200"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}

        {/* Subtle Dark Vignette Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
          {movie.qualities && movie.qualities.length > 0 && (
            <span className="text-[10px] font-bold font-mono text-amber-300 bg-amber-950/90 border border-amber-600/60 px-1.5 py-0.2 rounded shadow-sm">
              {movie.qualities[0]}
            </span>
          )}

          {movie.year && (
            <span className="text-[10px] font-mono text-slate-200 bg-black/90 px-1.5 py-0.2 rounded">
              {movie.year}
            </span>
          )}
        </div>

        {/* Center Hover / Focus Play Indicator */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-150 bg-black/40">
          <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 group-focus:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Card Metadata (Zero Pill, Unboxed Text) */}
      <div className="p-3.5 flex flex-col flex-1 justify-between bg-slate-900/50">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 font-medium truncate">
            <span>{movie.languages.slice(0, 2).join(' · ') || 'Dual Audio'}</span>
          </div>

          <h3 className="font-display font-semibold text-white text-sm leading-snug line-clamp-2 group-hover:text-indigo-300 group-focus:text-indigo-300 transition-colors">
            {movie.cleanTitle}
          </h3>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span className="text-indigo-400 font-medium flex items-center gap-1">
            <Film className="w-3 h-3" />
            Watch / Stream
          </span>
          <span className="font-mono text-[10px] text-slate-500">HDHub</span>
        </div>
      </div>
    </div>
  );
};
