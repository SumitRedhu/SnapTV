import React, { useState } from 'react';
import { HDHubMovie } from '../types/tv';
import { HDHubMovieCard } from './HDHubMovieCard';
import { Search, Loader2, Sparkles, Film, AlertCircle } from 'lucide-react';
import { playFocusSound, playSelectSound } from '../utils/sound';

interface HDHubSearchViewProps {
  onSelectMovie: (movie: HDHubMovie) => void;
}

const POPULAR_SEARCH_PRESETS = [
  'Hindi Dubbed',
  'Pushpa',
  'Pathaan',
  'Mirzapur',
  'Stree 2',
  'Panchayat',
  'Animal',
  'Jawan',
  'KGF',
  'Bigg Boss',
  'Sacred Games',
  'Avengers Hindi',
  'Deadpool Hindi',
  'South Hindi',
];

export const HDHubSearchView: React.FC<HDHubSearchViewProps> = ({ onSelectMovie }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HDHubMovie[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q || !q.trim()) return;

    playSelectSound();
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const [hdhubRes, bollyRes, vegaRes] = await Promise.allSettled([
        fetch(`/api/hdhub/search?q=${encodeURIComponent(q.trim())}`).then((r) => r.json()),
        fetch(`/api/bollystream/search?q=${encodeURIComponent(q.trim())}`).then((r) => r.json()),
        fetch(`/api/vegamovies/search?q=${encodeURIComponent(q.trim())}`).then((r) => r.json()),
      ]);

      const combined: HDHubMovie[] = [];
      const seenTitles = new Set<string>();

      if (bollyRes.status === 'fulfilled' && bollyRes.value?.movies) {
        for (const m of bollyRes.value.movies) {
          const key = m.cleanTitle.toLowerCase().trim();
          if (!seenTitles.has(key)) {
            seenTitles.add(key);
            combined.push(m);
          }
        }
      }

      if (hdhubRes.status === 'fulfilled' && hdhubRes.value?.movies) {
        for (const m of hdhubRes.value.movies) {
          const key = m.cleanTitle.toLowerCase().trim();
          if (!seenTitles.has(key)) {
            seenTitles.add(key);
            combined.push(m);
          }
        }
      }

      if (vegaRes.status === 'fulfilled' && vegaRes.value?.movies) {
        for (const m of vegaRes.value.movies) {
          const key = m.cleanTitle.toLowerCase().trim();
          if (!seenTitles.has(key)) {
            seenTitles.add(key);
            combined.push(m);
          }
        }
      }

      setResults(combined);
    } catch (err: any) {
      setError(err.message || 'Unable to fetch search results');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tv-safe-zone py-8 space-y-8">
      {/* Search Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400 mb-1">
          <Search className="w-4 h-4" />
          <span>HDHub4u Movie & Series Search</span>
        </div>
        <h2 className="text-3xl font-display font-bold text-white tracking-tight">
          Find Any Movie or Web Series
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Search the entire catalog of Bollywood, Hollywood Dual Audio, and Web Series on your TV.
        </p>
      </div>

      {/* TV Search Bar */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl max-w-4xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="flex-1 relative">
            <input
              id="search-input-tv"
              data-tv-focusable="true"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, actor, or franchise (e.g. Spider-Man, Pathaan)..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 outline-none transition tv-btn-focus"
            />
          </div>

          <button
            id="search-btn-submit"
            data-tv-focusable="true"
            type="submit"
            disabled={loading || !query.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition tv-btn-focus shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching HDHub...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Search Chips */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <span className="text-xs text-slate-500 block mb-2 font-medium">
            Popular searches on HDHub4u:
          </span>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCH_PRESETS.map((preset) => (
              <button
                key={preset}
                id={`preset-search-${preset.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                data-tv-focusable="true"
                type="button"
                onClick={() => {
                  setQuery(preset);
                  handleSearch(preset);
                }}
                onFocus={playFocusSound}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white border border-slate-700/60 tv-btn-focus transition"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-xs text-slate-400">Searching HDHub4u live website index...</p>
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <Film className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-white">No movies found matching "{query}"</p>
          <p className="text-xs text-slate-400">Try searching for a shorter keyword or check spelling.</p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Found {results.length} results on HDHub4u</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.map((movie, idx) => (
              <HDHubMovieCard
                key={`${movie.id}-${idx}`}
                movie={movie}
                onSelect={onSelectMovie}
                index={idx}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
