import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

import {
  BOLLYSTREAM_VAULT,
  HINDI_ARCHIVE_VAULT,
  KNOWN_HDHUB_MIRRORS,
  activeHDHubMirror,
  setActiveHDHubMirror,
  KNOWN_VEGAMOVIES_MIRRORS,
  activeVegaMirror,
  setActiveVegaMirror,
  pingMirror
} from './server-providers.ts';

import { getIPTVChannels, searchIPTVChannels, checkStreamHealth } from './server-iptv.ts';

// Default HDHub4u base domain
const DEFAULT_HDHUB_DOMAIN = 'https://new11.hdhub4u.cl';

// In-memory TV Remote Pairing Sessions
interface RemoteSession {
  code: string;
  createdAt: number;
  lastSeen: number;
  queue: Array<{
    id: string;
    action: string;
    payload?: any;
    timestamp: number;
  }>;
  nowPlaying?: {
    title: string;
    url: string;
    isPlaying: boolean;
  } | null;
}

const remoteSessions = new Map<string, RemoteSession>();

setInterval(() => {
  const cutoff = Date.now() - 6 * 60 * 60 * 1000;
  for (const [code, sess] of remoteSessions.entries()) {
    if (sess.lastSeen < cutoff) {
      remoteSessions.delete(code);
    }
  }
}, 60 * 1000);

// Helper to clean movie title and extract metadata
function parseTitleMetadata(rawTitle: string) {
  const clean = rawTitle
    .replace(/<[^>]+>/g, '')
    .replace(/&#8211;/g, '-')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .trim();

  // Extract year
  const yearMatch = clean.match(/\b(19\d\d|20\d\d)\b/);
  const year = yearMatch ? yearMatch[1] : undefined;

  // Extract qualities
  const qualities: string[] = [];
  if (/4K|2160p/i.test(clean)) qualities.push('4K UHD');
  if (/1080p/i.test(clean)) qualities.push('1080p FHD');
  if (/720p/i.test(clean)) qualities.push('720p HD');
  if (/480p/i.test(clean)) qualities.push('480p');
  if (/HEVC|10Bit/i.test(clean)) qualities.push('HEVC x265');

  // Extract languages
  const languages: string[] = [];
  if (/Hindi/i.test(clean)) languages.push('Hindi');
  if (/English/i.test(clean)) languages.push('English');
  if (/Tamil/i.test(clean)) languages.push('Tamil');
  if (/Telugu/i.test(clean)) languages.push('Telugu');
  if (/Dual\s*Audio/i.test(clean)) languages.push('Dual Audio');
  if (/Multi/i.test(clean)) languages.push('Multi Audio');

  // Clean title (remove resolution and junk for display headline)
  const cleanTitle = clean
    .split(/\s*\(?(19\d\d|20\d\d)\)?/)[0]
    .replace(/\[.*?\]/g, '')
    .replace(/\|.*$/g, '')
    .replace(/-.*$/g, '')
    .trim() || clean;

  const isSeries = /Season|Series|Episode|EP-\d+/i.test(clean);

  return {
    cleanTitle: cleanTitle.length > 2 ? cleanTitle : clean,
    year,
    qualities: qualities.length > 0 ? qualities : ['HD Web'],
    languages: languages.length > 0 ? languages : ['Original Audio'],
    isSeries,
  };
}

// Helper to generate a unique movie ID from URL and index
function generateMovieId(url: string, index: number): string {
  try {
    const parsed = new URL(url);
    const slug = parsed.pathname.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-');
    return `hdhub-${slug || 'item'}-${index}`;
  } catch {
    const slug = url.split('/').filter(Boolean).pop()?.replace(/[^a-zA-Z0-9_-]+/g, '-') || 'item';
    return `hdhub-${slug}-${index}`;
  }
}

// Fetch with Dynamic HDHub4u Mirror Failover & Redirect Following
async function fetchWithHDHubMirrorFallback(pathOrUrl: string, preferredDomain?: string): Promise<{ html: string; effectiveDomain: string }> {
  let path = pathOrUrl;
  if (pathOrUrl.startsWith('http')) {
    try {
      const u = new URL(pathOrUrl);
      path = u.pathname + u.search;
    } catch {}
  }
  if (!path.startsWith('/')) path = '/' + path;

  // Build candidate order: preferredDomain -> activeHDHubMirror -> known mirrors
  const candidates: string[] = [];
  if (preferredDomain) {
    const clean = preferredDomain.replace(/\/+$/, '');
    if (!candidates.includes(clean)) candidates.push(clean);
  }
  if (!candidates.includes(activeHDHubMirror)) candidates.push(activeHDHubMirror);
  for (const m of KNOWN_HDHUB_MIRRORS) {
    if (!candidates.includes(m)) candidates.push(m);
  }

  let lastError: Error | null = null;

  for (const domain of candidates) {
    try {
      const targetUrl = `${domain}${path}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const res = await fetch(targetUrl, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const html = await res.text();
        const hasCatalogItems =
          html.includes('class="thumb"') ||
          html.includes('class=\x27thumb\x27') ||
          html.includes('thumb col-md') ||
          html.includes('playdrive.vip') ||
          html.includes('kno-rdesc');

        if (hasCatalogItems) {
          let effectiveDomain = domain;
          try {
            const finalOrigin = new URL(res.url).origin;
            if (finalOrigin && (finalOrigin.includes('hdhub4u') || finalOrigin.includes('.cl'))) {
              effectiveDomain = finalOrigin;
            }
          } catch {}

          if (effectiveDomain !== activeHDHubMirror && !effectiveDomain.includes('.deal')) {
            console.log(`[MirrorEngine] Auto-switched active mirror to: ${effectiveDomain}`);
            setActiveHDHubMirror(effectiveDomain);
          }

          return { html, effectiveDomain };
        }
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw new Error(`HDHub4u mirrors failed to respond. ${lastError ? lastError.message : ''}`);
}

// Scrape HDHub4u Category Catalog with Mirror Fallback
// Scrape HDHub4u Category Catalog with Mirror Fallback & Multi-Page Support
async function scrapeHDHubCatalog(category: string, domain = DEFAULT_HDHUB_DOMAIN, page = 1) {
  let basePath = '/';
  switch (category) {
    case 'bollywood': basePath = '/category/bollywood-movies/'; break;
    case 'hollywood': basePath = '/category/hollywood-movies/'; break;
    case 'webseries': basePath = '/category/web-series/'; break;
    case 'south': basePath = '/category/south-hindi-movies/'; break;
    case 'hindidubbed': basePath = '/category/hindi-dubbed/'; break;
    case 'action': basePath = '/category/action-movies/'; break;
    case 'animated': basePath = '/category/animated-movies/'; break;
    case '300mb': basePath = '/category/300mb-movies/'; break;
    default: basePath = '/'; break;
  }

  // Determine pages to fetch:
  // For webseries on page 1, fetch pages 1, 2, and 3 in parallel to give 45+ series right away!
  // For page > 1, fetch 2 pages at a time to expand the catalog by 30 series per page!
  let pagesToFetch: number[] = [page];
  if (category === 'webseries') {
    if (page === 1) {
      pagesToFetch = [1, 2, 3];
    } else {
      const startP = (page - 1) * 2 + 2;
      pagesToFetch = [startP, startP + 1];
    }
  } else if (page === 1 && (category === 'bollywood' || category === 'south' || category === 'latest')) {
    pagesToFetch = [1, 2];
  }

  const movies: any[] = [];
  const seenUrls = new Set<string>();

  const results = await Promise.allSettled(
    pagesToFetch.map(async (p) => {
      const pagePath = p === 1 ? basePath : `${basePath}page/${p}/`;
      const { html, effectiveDomain } = await fetchWithHDHubMirrorFallback(pagePath, domain);
      return { html, effectiveDomain };
    })
  );

  for (const res of results) {
    if (res.status !== 'fulfilled' || !res.value) continue;
    const { html, effectiveDomain } = res.value;
    const regex = /<li[^>]*class=["\x27][^"\x27]*thumb[^"\x27]*["\x27][^>]*>([\s\S]*?)<\/li>/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const block = match[1];
      const linkMatch = block.match(/href=["\x27]([^"\x27]+)["\x27]/i);
      const imgMatch = block.match(/src=["\x27](https?:\/\/[^"\x27]+)["\x27]/i) ||
                       block.match(/data-src=["\x27](https?:\/\/[^"\x27]+)["\x27]/i);
      const titleMatch = block.match(/<figcaption[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i) ||
                         block.match(/aria-label=["\x27]([^"\x27]+)["\x27]/i);

      if (linkMatch && titleMatch) {
        const fullUrl = linkMatch[1].startsWith('http') ? linkMatch[1] : `${effectiveDomain.replace(/\/+$/, '')}${linkMatch[1]}`;
        if (seenUrls.has(fullUrl)) continue;
        seenUrls.add(fullUrl);

        const rawTitle = titleMatch[1];
        const meta = parseTitleMetadata(rawTitle);

        movies.push({
          id: generateMovieId(fullUrl, movies.length),
          title: rawTitle.replace(/<[^>]+>/g, '').trim(),
          cleanTitle: meta.cleanTitle,
          year: meta.year,
          poster: imgMatch ? imgMatch[1] : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=400&q=80',
          url: fullUrl,
          category: category || 'Latest Releases',
          languages: meta.languages,
          qualities: meta.qualities,
          isSeries: meta.isSeries || /Season|Series|Episode/i.test(rawTitle),
        });
      }
    }
  }

  return movies;
}

// HDHub4u Real-Time Search Engine Integration (via official Pingora Typesense index + Mirror fallback)
async function scrapeHDHubSearch(query: string, domain = DEFAULT_HDHUB_DOMAIN) {
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  // 1. Query the official HDHub4u high-speed search index (returns exact movie hits, not redirects)
  try {
    const apiUrl = new URL('https://search.pingora.fyi/collections/post/documents/search');
    apiUrl.searchParams.append('q', cleanQ);
    apiUrl.searchParams.append('query_by', 'post_title,category,stars,director,imdb_id');
    apiUrl.searchParams.append('query_by_weights', '4,2,2,2,4');
    apiUrl.searchParams.append('sort_by', 'sort_by_date:desc');
    apiUrl.searchParams.append('limit', '24');
    apiUrl.searchParams.append('highlight_fields', 'none');
    apiUrl.searchParams.append('use_cache', 'true');
    apiUrl.searchParams.append('page', '1');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const apiRes = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'Referer': `${activeHDHubMirror}/search.html?q=${encodeURIComponent(cleanQ)}`,
        'Origin': activeHDHubMirror,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeout);

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (Array.isArray(data.hits) && data.hits.length > 0) {
        const movies: any[] = [];
        for (let i = 0; i < data.hits.length; i++) {
          const doc = data.hits[i].document;
          if (!doc || !doc.post_title) continue;

          let fullUrl = doc.permalink;
          try {
            const parsedUrl = new URL(doc.permalink);
            fullUrl = `${activeHDHubMirror.replace(/\/+$/, '')}${parsedUrl.pathname}`;
          } catch {
            fullUrl = `${activeHDHubMirror.replace(/\/+$/, '')}/${doc.permalink.replace(/^\/+/, '')}`;
          }

          const rawTitle = doc.post_title;
          const meta = parseTitleMetadata(rawTitle);
          const categories = Array.isArray(doc.category) ? doc.category : (doc.category ? [doc.category] : []);
          const isDual = categories.some((c: string) => typeof c === 'string' && c.toLowerCase().includes('dual'));
          const isSer = meta.isSeries || doc.post_type === 'series' || categories.some((c: string) => typeof c === 'string' && c.toLowerCase().includes('series'));

          movies.push({
            id: generateMovieId(fullUrl, i),
            title: rawTitle.replace(/<[^>]+>/g, '').trim(),
            cleanTitle: meta.cleanTitle,
            year: meta.year || (doc.post_date ? String(doc.post_date).match(/\d{4}/)?.[0] : undefined),
            poster: doc.post_thumbnail || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=400&q=80',
            url: fullUrl,
            category: categories.length > 0 ? categories.slice(0, 2).join(' · ') : 'Movie',
            languages: meta.languages.length > 0 ? meta.languages : (isDual ? ['Dual Audio', 'Hindi'] : ['Hindi']),
            qualities: meta.qualities.length > 0 ? meta.qualities : ['1080p FHD', '720p HD'],
            isSeries: isSer,
          });
        }
        return movies;
      }
    }
  } catch (err) {
    console.warn('[SearchEngine] Pingora API fetch failed, falling back to mirror scraper:', err);
  }

  // 2. Fallback to HTML Scraper (if API is unreachable)
  const path = `/?s=${encodeURIComponent(cleanQ)}`;
  const { html, effectiveDomain } = await fetchWithHDHubMirrorFallback(path, domain);
  const movies: any[] = [];
  const regex = /<li[^>]*class=["\x27][^"\x27]*thumb[^"\x27]*["\x27][^>]*>([\s\S]*?)<\/li>/gi;
  let match;

  while ((match = regex.exec(html)) !== null && movies.length < 24) {
    const block = match[1];
    const linkMatch = block.match(/href=["\x27]([^"\x27]+)["\x27]/i);
    const imgMatch = block.match(/src=["\x27](https?:\/\/[^"\x27]+)["\x27]/i) ||
                     block.match(/data-src=["\x27](https?:\/\/[^"\x27]+)["\x27]/i);
    const titleMatch = block.match(/<figcaption[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i) ||
                       block.match(/aria-label=["\x27]([^"\x27]+)["\x27]/i);

    if (linkMatch && titleMatch) {
      const fullUrl = linkMatch[1].startsWith('http') ? linkMatch[1] : `${effectiveDomain.replace(/\/+$/, '')}${linkMatch[1]}`;
      const rawTitle = titleMatch[1];
      const meta = parseTitleMetadata(rawTitle);

      movies.push({
        id: generateMovieId(fullUrl, movies.length),
        title: rawTitle.replace(/<[^>]+>/g, '').trim(),
        cleanTitle: meta.cleanTitle,
        year: meta.year,
        poster: imgMatch ? imgMatch[1] : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=400&q=80',
        url: fullUrl,
        category: 'Search Result',
        languages: meta.languages,
        qualities: meta.qualities,
        isSeries: meta.isSeries,
      });
    }
  }

  return movies;
}

// Scrape HDHub4u Movie Details Page with deep stream resolution
async function scrapeHDHubMovieDetails(postUrl: string) {
  let html = '';
  try {
    const res = await fetch(postUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    if (res.ok) {
      html = await res.text();
    }
  } catch {}

  if (!html || (!html.includes('playdrive.vip') && !html.includes('kno-rdesc') && !html.includes('entry-content') && !html.includes('download') && !html.includes('HubCloud'))) {
    // Attempt fallback via active mirror
    try {
      const u = new URL(postUrl);
      const fallback = await fetchWithHDHubMirrorFallback(u.pathname + u.search);
      html = fallback.html;
    } catch {
      throw new Error(`Failed to load movie details from current or fallback mirrors`);
    }
  }

  // Extract Poster & Title
  const ogTitleMatch = html.match(/<meta\s+property=["\x27]og:title["\x27]\s+content=["\x27]([^"\x27]+)["\x27]/i) ||
                       html.match(/<title>([^<]+)<\/title>/i);
  const title = ogTitleMatch ? ogTitleMatch[1].replace(/&#8211;/g, '-').replace(/&#038;/g, '&').trim() : 'Movie Details';

  const posterMatch = html.match(/<meta\s+property=["\x27]og:image["\x27]\s+content=["\x27]([^"\x27]+)["\x27]/i) ||
                      html.match(/src=["\x27](https:\/\/image\.tmdb\.org\/t\/p\/[^"\x27]+)["\x27]/i);
  const poster = posterMatch ? posterMatch[1] : '';

  // Extract Storyline
  const storyMatch = html.match(/Storyline\s*:\s*<\/span>[\s\S]*?<div[^>]*kno-rdesc[^>]*>([\s\S]*?)<\/div>/i) ||
                     html.match(/<div[^>]*kno-rdesc[^>]*>([\s\S]*?)<\/div>/i) ||
                     html.match(/<meta\s+property=["\x27]og:description["\x27]\s+content=["\x27]([^"\x27]+)["\x27]/i);
  const storyline = storyMatch ? storyMatch[1].replace(/<[^>]+>/g, '').trim() : 'Experience full cinematic playback extracted from HDHub4u on your Android TV.';

  // Trailer Embed
  let trailerUrl: string | null = null;
  const trailerMatch = html.match(/src=["\x27](https:\/\/www\.youtube\.com\/embed\/[^"\x27]+)["\x27]/i);
  if (trailerMatch) {
    trailerUrl = trailerMatch[1];
  }

  // Extract IMDb ID if present in HTML
  let imdbId: string | null = null;
  let tmdbId: number | null = null;
  const imdbHtmlMatch = html.match(/imdb\.com\/title\/(tt\d+)/i);
  if (imdbHtmlMatch) {
    imdbId = imdbHtmlMatch[1];
  }

  // Find PlayDrive watch online link
  const playDriveMatch = html.match(/href=["\x27](https:\/\/playdrive\.vip\/e\/[^"\x27]+)["\x27]/i);
  let directHlsUrl: string | null = null;
  let playDriveEmbedUrl: string | null = playDriveMatch ? playDriveMatch[1] : null;

  if (playDriveEmbedUrl) {
    try {
      const pdRes = await fetch(playDriveEmbedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });
      if (pdRes.ok) {
        const pdHtml = await pdRes.text();
        const marker = 'window.__PA_PLAY__ = ';
        const sIdx = pdHtml.indexOf(marker);
        if (sIdx !== -1) {
          const fromMarker = pdHtml.slice(sIdx + marker.length);
          const eIdx = fromMarker.indexOf('};');
          if (eIdx !== -1) {
            const jsonStr = fromMarker.slice(0, eIdx + 1);
            const pdData = JSON.parse(jsonStr);

            if (pdData.streams?.[0]?.m3u8_url) {
              directHlsUrl = pdData.streams[0].m3u8_url;
            }
            if (pdData.movie?.imdb_id) {
              imdbId = pdData.movie.imdb_id;
            }
            if (pdData.movie?.tmdb_id) {
              tmdbId = pdData.movie.tmdb_id;
            }
            if (pdData.item?.trailer_key && !trailerUrl) {
              trailerUrl = `https://www.youtube.com/embed/${pdData.item.trailer_key}`;
            }
          }
        }
      }
    } catch (pdErr) {
      console.warn('PlayDrive deep resolve warning:', pdErr);
    }
  }

  const meta = parseTitleMetadata(title);
  const streamOptions: any[] = [];

  // 1. Direct HLS Multi-Audio Stream (if resolved from PlayDrive)
  if (directHlsUrl) {
    streamOptions.push({
      label: '⚡ Server 1: Direct 1080p Stream (HLS Multi-Audio)',
      url: `/api/proxy/hls?url=${encodeURIComponent(directHlsUrl)}`,
      streamType: 'hls',
      serverType: 'watchonline',
    });
  }

  // 2. PlayDrive Clean TV Embed Player
  if (playDriveEmbedUrl) {
    streamOptions.push({
      label: '🌐 Server 2: PlayDrive TV Web Player (Full HD)',
      url: playDriveEmbedUrl,
      streamType: 'embed',
      serverType: 'watchonline',
    });
  }

  // Detect series status and season number
  const isSeries = meta.isSeries || /Season|Series|Episode|EP-\d+/i.test(title);
  const seasonMatch = title.match(/Season\s*(\d+)/i) || postUrl.match(/season-(\d+)/i);
  const seasonNum = seasonMatch ? parseInt(seasonMatch[1], 10) : 1;

  // 3. Multi-Server Cinema / TV Mirrors if IMDb ID is available
  if (imdbId) {
    if (isSeries) {
      streamOptions.push({
        label: `🎬 Server ${streamOptions.length + 1}: VidSrc 1080p TV Stream (Season ${seasonNum})`,
        url: `https://vidsrc.to/embed/tv/${imdbId}/${seasonNum}/1`,
        streamType: 'embed',
        serverType: 'vidsrc',
      });
      streamOptions.push({
        label: `✨ Server ${streamOptions.length + 1}: VidSrc TV Mirror (Fast Stream)`,
        url: `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${seasonNum}&episode=1`,
        streamType: 'embed',
        serverType: 'vidsrc',
      });
      streamOptions.push({
        label: `🚀 Server ${streamOptions.length + 1}: 2Embed TV Cloud Server`,
        url: `https://www.2embed.cc/embedtv/${imdbId}&s=${seasonNum}&e=1`,
        streamType: 'embed',
        serverType: 'embed',
      });
      streamOptions.push({
        label: `🍿 Server ${streamOptions.length + 1}: AutoEmbed TV Server`,
        url: `https://autoembed.co/tv/imdb/${imdbId}-${seasonNum}-1`,
        streamType: 'embed',
        serverType: 'embed',
      });
      streamOptions.push({
        label: `📡 Server ${streamOptions.length + 1}: SmashyStream Fast CDN`,
        url: `https://embed.smashystream.com/playere.php?imdb=${imdbId}&season=${seasonNum}&episode=1`,
        streamType: 'embed',
        serverType: 'embed',
      });
    } else {
      streamOptions.push({
        label: `🎬 Server ${streamOptions.length + 1}: VidSrc 1080p Cinema Server (Multi-Audio)`,
        url: `https://vidsrc.to/embed/movie/${imdbId}`,
        streamType: 'embed',
        serverType: 'vidsrc',
      });
      streamOptions.push({
        label: `✨ Server ${streamOptions.length + 1}: VidSrc Cinema Mirror (Fast Stream)`,
        url: `https://vidsrc.me/embed/movie?imdb=${imdbId}`,
        streamType: 'embed',
        serverType: 'vidsrc',
      });
      streamOptions.push({
        label: `🚀 Server ${streamOptions.length + 1}: 2Embed Fast CDN Server`,
        url: `https://www.2embed.cc/embed/${imdbId}`,
        streamType: 'embed',
        serverType: 'embed',
      });
      streamOptions.push({
        label: `🍿 Server ${streamOptions.length + 1}: AutoEmbed Cinema Server`,
        url: `https://autoembed.co/movie/imdb/${imdbId}`,
        streamType: 'embed',
        serverType: 'embed',
      });
      streamOptions.push({
        label: `📡 Server ${streamOptions.length + 1}: SmashyStream Fast CDN`,
        url: `https://embed.smashystream.com/playere.php?imdb=${imdbId}`,
        streamType: 'embed',
        serverType: 'embed',
      });
    }
  } else if (tmdbId) {
    if (isSeries) {
      streamOptions.push({
        label: `🎬 Server ${streamOptions.length + 1}: VidSrc 1080p TV Stream`,
        url: `https://vidsrc.to/embed/tv/${tmdbId}/${seasonNum}/1`,
        streamType: 'embed',
        serverType: 'vidsrc',
      });
    } else {
      streamOptions.push({
        label: `🎬 Server ${streamOptions.length + 1}: VidSrc 1080p Cinema Server`,
        url: `https://vidsrc.to/embed/movie/${tmdbId}`,
        streamType: 'embed',
        serverType: 'vidsrc',
      });
    }
  }

  // 4. Official Trailer
  if (trailerUrl) {
    streamOptions.push({
      label: '🎥 Official HD Cinema Trailer (YouTube)',
      url: trailerUrl,
      streamType: 'embed',
      serverType: 'embed',
    });
  }

  // 5. Raw Page Download & Cloud Links
  const linkRegex = /<a[^>]+href=["\x27](https?:\/\/[^"\x27]+)["\x27][^>]*>([\s\S]*?)<\/a>/gi;
  let lMatch;

  while ((lMatch = linkRegex.exec(html)) !== null) {
    const href = lMatch[1];
    const text = lMatch[2].replace(/<[^>]+>/g, '').trim();

    if (
      text.match(/480p|720p|1080p|2160p|4K|WATCH\s*ONLiNE|HubCloud|HubCDN|G-Drive|Download|Stream/i) &&
      !href.includes('twitter.com') &&
      !href.includes('whatsapp') &&
      !href.includes('telegram') &&
      !href.includes('facebook') &&
      href !== playDriveEmbedUrl
    ) {
      let serverType: 'hubcdn' | 'hubcloud' | 'watchonline' | 'hubdrive' | 'direct' = 'direct';
      if (/hubcdn/i.test(href)) serverType = 'hubcdn';
      else if (/greenmotors|hubcloud/i.test(href)) serverType = 'hubcloud';
      else if (/playdrive|watch/i.test(href)) serverType = 'watchonline';
      else if (/hubdrive|drive/i.test(href)) serverType = 'hubdrive';

      streamOptions.push({
        label: `📥 ${text}`,
        url: href,
        streamType: 'direct',
        serverType,
      });
    }
  }

  // Helper to build alternative embed mirrors for an episode
  const buildEpisodeAltServers = (s: number, e: number) => {
    if (!imdbId) return undefined;
    return [
      { label: '🎬 VidSrc 1080p Cinema', url: `https://vidsrc.to/embed/tv/${imdbId}/${s}/${e}`, streamType: 'embed' as const },
      { label: '✨ VidSrc Mirror', url: `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${s}&episode=${e}`, streamType: 'embed' as const },
      { label: '🚀 2Embed Fast Server', url: `https://www.2embed.cc/embedtv/${imdbId}&s=${s}&e=${e}`, streamType: 'embed' as const },
      { label: '🍿 AutoEmbed CDN', url: `https://autoembed.co/tv/imdb/${imdbId}-${s}-${e}`, streamType: 'embed' as const },
      { label: '📡 SmashyStream', url: `https://embed.smashystream.com/playere.php?imdb=${imdbId}&season=${s}&episode=${e}`, streamType: 'embed' as const },
    ];
  };

  // Comprehensive Episode Extraction for Web Series
  const episodes: any[] = [];
  const seenEps = new Set<string>();

  // Strategy A: Section Header Markers (EPiSODE 1, Episode 1, EP 01)
  const epHeaderRegex = /(?:<strong>|<h[2-5][^>]*>|<span>|<b>)\s*(?:EPiSODE|Episode|EP)\s*[-:]?\s*0*(\d+)\s*(?:<\/strong>|<\/h[2-5]>|<\/span>|<\/b>)/gi;
  const markers: { epNum: number; index: number }[] = [];
  let hMatch;
  while ((hMatch = epHeaderRegex.exec(html)) !== null) {
    markers.push({ epNum: parseInt(hMatch[1], 10), index: hMatch.index });
  }

  if (markers.length > 0) {
    for (let i = 0; i < markers.length; i++) {
      const cur = markers[i];
      const epKey = `s${seasonNum}e${cur.epNum}`;
      if (seenEps.has(epKey)) continue;

      const nextIdx = i < markers.length - 1 ? markers[i + 1].index : html.indexOf('class="footer"', cur.index);
      const section = html.slice(cur.index, nextIdx !== -1 && nextIdx > cur.index ? nextIdx : cur.index + 2500);

      const sectionLinks = [...section.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
        .map(m => ({
          url: m[1],
          text: m[2].replace(/<[^>]+>/g, '').trim(),
        }));

      // Priority 1: Direct watch link (hdstream4u.com, playdrive.vip, or text includes WATCH)
      const watchLink = sectionLinks.find(l => 
        /hdstream4u\.com|playdrive\.vip/i.test(l.url) || 
        /WATCH|Watch\s*Online|Play\s*Online/i.test(l.text)
      );

      // Priority 2: HubCDN / GreenMotors / HubCloud instant streaming link
      const fastLink = sectionLinks.find(l => 
        /hubcdn|greenmotors|hubcloud/i.test(l.url) || 
        /instant/i.test(l.text)
      );

      // Priority 3: HubDrive or any Drive link
      const fallbackLink = sectionLinks.find(l => 
        /hubdrive|drive/i.test(l.url) || 
        /drive|download/i.test(l.text)
      );

      const target = watchLink || fastLink || fallbackLink;
      if (target) {
        seenEps.add(epKey);
        episodes.push({
          episodeNumber: cur.epNum,
          seasonNumber: seasonNum,
          title: `Episode ${cur.epNum}`,
          url: target.url,
          streamType: /playdrive|hdstream4u|embed/i.test(target.url) ? 'embed' : 'direct',
          alternativeServers: buildEpisodeAltServers(seasonNum, cur.epNum),
        });
      }
    }
  }

  // Strategy B: PlayDrive direct episode URLs (playdrive.vip/.../ep-N)
  if (episodes.length === 0) {
    const epMatches = [...html.matchAll(/href=["\x27](https:\/\/playdrive\.vip\/e\/[^"\x27]+(?:\/s-(\d+))?\/ep-(\d+))["\x27]/gi)];
    for (const match of epMatches) {
      const epUrl = match[1];
      const sNum = match[2] ? parseInt(match[2], 10) : seasonNum;
      const epNum = parseInt(match[3], 10);
      const epKey = `s${sNum}e${epNum}`;
      if (!seenEps.has(epKey)) {
        seenEps.add(epKey);
        episodes.push({
          episodeNumber: epNum,
          seasonNumber: sNum,
          title: `Episode ${epNum}`,
          url: epUrl,
          streamType: 'embed',
          alternativeServers: buildEpisodeAltServers(sNum, epNum),
        });
      }
    }
  }

  // Strategy C: hdstream4u direct /file/ links with WATCH
  if (episodes.length === 0) {
    const hdStreamMatches = [...html.matchAll(/<a\s+[^>]*href=["'](https?:\/\/hdstream4u\.com\/file\/[^"']+)["'][^>]*>[\s\S]*?(?:WATCH|Watch\s*Online)[\s\S]*?<\/a>/gi)];
    let epCounter = 1;
    for (const m of hdStreamMatches) {
      const epKey = `s${seasonNum}e${epCounter}`;
      if (!seenEps.has(epKey)) {
        seenEps.add(epKey);
        episodes.push({
          episodeNumber: epCounter,
          seasonNumber: seasonNum,
          title: `Episode ${epCounter}`,
          url: m[1],
          streamType: 'embed',
          alternativeServers: buildEpisodeAltServers(seasonNum, epCounter),
        });
      }
      epCounter++;
    }
  }

  // Strategy D: If it is a confirmed Series and IMDb ID is available, auto-populate episodes
  if (isSeries && episodes.length === 0 && imdbId) {
    const epCountMatch = title.match(/\[EP-(\d+)\s+Added\]/i) || title.match(/(\d+)\s*Episodes/i);
    const epCount = epCountMatch ? Math.min(parseInt(epCountMatch[1], 10), 30) : 10;
    for (let ep = 1; ep <= epCount; ep++) {
      episodes.push({
        episodeNumber: ep,
        seasonNumber: seasonNum,
        title: `Episode ${ep}`,
        url: `https://vidsrc.to/embed/tv/${imdbId}/${seasonNum}/${ep}`,
        streamType: 'embed',
        alternativeServers: buildEpisodeAltServers(seasonNum, ep),
      });
    }
  }

  episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

  return {
    title,
    cleanTitle: meta.cleanTitle,
    poster: poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
    storyline,
    trailerUrl,
    qualities: meta.qualities,
    languages: meta.languages,
    streamOptions,
    episodes: episodes.length > 0 ? episodes : undefined,
    sourceUrl: postUrl,
    imdbId: imdbId || undefined,
    tmdbId: tmdbId || undefined,
    extractedAt: new Date().toISOString()
  };
}

// ==========================================
// VEGAMOVIES BACKUP ENGINE SCRAPER
// ==========================================

function cleanVegaTitle(title: string): string {
  if (!title) return 'Featured Movie';
  let clean = title
    .replace(/^Download\s+/i, '')
    .replace(/\s+(480p|720p|1080p|2160p|4K|WEB-DL|BluRay|Multi-Audio|Dual Audio|ORG|HDRip|x264|x265|HEVC|ESubs).*$/i, '')
    .replace(/&#8217;/g, "'")
    .replace(/&#038;/g, '&')
    .replace(/&#8211;/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/\s*:\s*$/, '')
    .trim();
  return clean || title;
}

async function scrapeVegaCatalog(category = 'latest', domain = activeVegaMirror, page = 1) {
  let targetPath = '/dual-audio-movies/';
  if (category === 'webseries') {
    targetPath = '/web-series/';
  } else if (category === 'action' || category === 'hollywood') {
    targetPath = '/movies-by-genres/action/';
  } else if (category === '2024' || category === 'south') {
    targetPath = '/movies-by-year/2024/';
  }

  if (page > 1) {
    targetPath = `${targetPath}page/${page}/`;
  }

  const targetUrl = `${domain.replace(/\/+$/, '')}${targetPath}`;
  let html = '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `${domain}/`,
      }
    });
    clearTimeout(timeout);
    if (res.ok) {
      html = await res.text();
    }
  } catch (err: any) {
    console.warn(`[VegaMovies] Catalog fetch failed for ${targetUrl}:`, err.message);
  }

  const movies: any[] = [];
  const seenUrls = new Set<string>();

  if (html) {
    // 1. Extract from official Schema.org JSON-LD (100% synchronized title, url, image)
    const ldMatches = html.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi) || [];
    for (const ldBlock of ldMatches) {
      try {
        const rawJson = ldBlock.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
        const parsed = JSON.parse(rawJson);
        const list = Array.isArray(parsed.itemListElement) ? parsed.itemListElement : [];
        for (const itemWrapper of list) {
          const item = itemWrapper.item;
          if (item && item.url && item.name && !seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            const cleanTitle = cleanVegaTitle(item.name);
            const yearMatch = item.name.match(/\((\d{4})\)/);
            const year = yearMatch ? yearMatch[1] : '';
            const isSeries = item['@type'] === 'TVSeries' || /Season\s*\d+|Series|Episode/i.test(item.name);
            const slug = item.url.replace(/\/+$/, '').split('/').pop() || String(Date.now());

            movies.push({
              id: `vega-${slug}`,
              title: item.name,
              cleanTitle,
              year,
              poster: item.image || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
              url: item.url,
              category: isSeries ? 'Web Series' : (category === 'action' ? 'Hollywood Action' : 'Dual Audio Cinema'),
              languages: ['Hindi', 'English', 'Dual Audio'],
              qualities: ['1080p FHD', '720p HD', '480p'],
              isSeries,
            });
          }
        }
      } catch {}
    }

    // 2. Extract from primary movie grid (moviesGridMain)
    const gridIdx = html.indexOf('id="moviesGridMain"');
    if (gridIdx !== -1) {
      const gridEnd = html.indexOf('</section>', gridIdx);
      const gridSection = gridEnd !== -1 ? html.slice(gridIdx, gridEnd) : html.slice(gridIdx);
      const cardPattern = /<a\s+[^>]*href=["'](https?:\/\/[^"']+\/download-[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let cardMatch;
      while ((cardMatch = cardPattern.exec(gridSection)) !== null) {
        const link = cardMatch[1];
        if (seenUrls.has(link)) continue;
        seenUrls.add(link);

        const cardContent = cardMatch[2];
        const imgMatch = cardContent.match(/(?:data-src|data-lazy-src|src)=["'](https?:\/\/[^"']+)["']/i);
        const titleMatch = cardContent.match(/<p[^>]*class=["']poster-title["'][^>]*>(.*?)<\/p>/i);
        const altMatch = cardContent.match(/alt=["']([^"']+)["']/i);

        const rawTitle = titleMatch ? titleMatch[1].trim() : (altMatch ? altMatch[1].trim() : 'Movie');
        if (!rawTitle || rawTitle.toLowerCase().includes('download now')) continue;

        const cleanTitle = cleanVegaTitle(rawTitle);
        const yearMatch = rawTitle.match(/\((\d{4})\)/);
        const year = yearMatch ? yearMatch[1] : '';
        const isSeries = /Season\s*\d+|Series|Episode/i.test(rawTitle);
        const slug = link.replace(/\/+$/, '').split('/').pop() || String(Date.now());
        const poster = imgMatch ? imgMatch[1] : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80';

        movies.push({
          id: `vega-${slug}`,
          title: rawTitle,
          cleanTitle,
          year,
          poster,
          url: link,
          category: isSeries ? 'Web Series' : (category === 'action' ? 'Hollywood Action' : 'Dual Audio Cinema'),
          languages: ['Hindi', 'English', 'Dual Audio'],
          qualities: ['1080p FHD', '720p HD', '480p'],
          isSeries,
        });
      }
    }
  }

  // Fallback to high-speed Typesense search index if HTML scraping was blocked or empty
  if (movies.length === 0) {
    const fallbackQuery = category === 'webseries' ? 'season' : (category === 'action' ? 'action' : 'hindi');
    return await scrapeVegaSearch(fallbackQuery, domain);
  }

  return movies;
}

async function scrapeVegaSearch(query: string, domain = activeVegaMirror) {
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  try {
    const cleanDomain = domain.replace(/\/+$/, '');
    const apiUrl = `${cleanDomain}/ts-search.php?q=${encodeURIComponent(cleanQ)}&page=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `${cleanDomain}/search.html?q=${encodeURIComponent(cleanQ)}`,
      }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.hits) && data.hits.length > 0) {
        const movies: any[] = [];
        for (const hit of data.hits) {
          const doc = hit.document;
          if (!doc || !doc.post_title) continue;

          let fullUrl = doc.permalink || '';
          if (fullUrl.startsWith('/')) {
            fullUrl = `${cleanDomain}${fullUrl}`;
          }

          const rawTitle = doc.post_title;
          const cleanTitle = cleanVegaTitle(rawTitle);
          const yearMatch = rawTitle.match(/\((\d{4})\)/);
          const year = yearMatch ? yearMatch[1] : '';
          const isSeries = /Season\s*\d+|Series|Episode/i.test(rawTitle);
          const slug = doc.id || (fullUrl ? fullUrl.replace(/\/+$/, '').split('/').pop() : String(Date.now()));

          movies.push({
            id: `vega-${slug}`,
            title: rawTitle,
            cleanTitle,
            year,
            poster: doc.post_thumbnail || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
            url: fullUrl,
            category: Array.isArray(doc.category) ? doc.category.slice(0, 3).join(', ') : 'Dual Audio Cinema',
            languages: ['Hindi', 'English', 'Dual Audio'],
            qualities: ['1080p FHD', '720p HD', '480p'],
            isSeries,
            imdbId: doc.imdb_id || undefined,
          });
        }
        return movies;
      }
    }
  } catch (err: any) {
    console.warn('[VegaMovies] Typesense search error:', err.message);
  }

  return [];
}

async function scrapeVegaMovieDetails(postUrl: string, imdbIdHint?: string) {
  let html = '';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(postUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    clearTimeout(timeout);
    if (res.ok) {
      html = await res.text();
    }
  } catch (err: any) {
    console.warn('[VegaMovies] Movie page fetch error:', err.message);
  }

  const titleMatch = html.match(/<meta\s+property=["\x27]og:title["\x27]\s+content=["\x27]([^"\x27]+)["\x27]/i) ||
                     html.match(/<title>([^<]+)<\/title>/i);
  const rawTitle = titleMatch ? titleMatch[1].replace(/ - Vegamovies.*$/i, '').trim() : 'VegaMovies Stream';
  const cleanTitle = cleanVegaTitle(rawTitle);

  const posterMatch = html.match(/<meta\s+property=["\x27]og:image["\x27]\s+content=["\x27]([^"\x27]+)["\x27]/i) ||
                      html.match(/src=["\x27](https:\/\/image\.tmdb\.org\/t\/p\/[^"\x27]+)["\x27]/i);
  const poster = posterMatch ? posterMatch[1] : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80';

  const storyMatch = html.match(/Synopsis\s*:\s*<\/span>([\s\S]*?)<\/p>/i) ||
                     html.match(/<meta\s+property=["\x27]og:description["\x27]\s+content=["\x27]([^"\x27]+)["\x27]/i);
  const storyline = storyMatch ? storyMatch[1].replace(/<[^>]+>/g, '').trim() : 'Streaming mirror powered by VegaMovies & multi-server embed network.';

  // Check for IMDb ID
  let imdbId = imdbIdHint;
  if (!imdbId) {
    const imdbMatch = html.match(/(?:imdb\.com\/title\/|imdb:\s*)(tt\d{7,8})/i) || html.match(/\b(tt\d{7,8})\b/i);
    if (imdbMatch) imdbId = imdbMatch[1];
  }

  // Check for PlayDrive direct watch link
  const playDriveMatch = html.match(/https?:\/\/playdrive\.vip\/e\/[A-Za-z0-9_-]+/i) ||
                         html.match(/https?:\/\/hubcloud\.[^\s"'<>]+/i);
  const directWatchUrl = playDriveMatch ? playDriveMatch[0] : null;

  let directHlsUrl: string | null = null;
  if (directWatchUrl && directWatchUrl.includes('playdrive.vip')) {
    try {
      const pdRes = await fetch(directWatchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });
      if (pdRes.ok) {
        const pdHtml = await pdRes.text();
        const marker = 'window.__PA_PLAY__ = ';
        const sIdx = pdHtml.indexOf(marker);
        if (sIdx !== -1) {
          const fromMarker = pdHtml.slice(sIdx + marker.length);
          const eIdx = fromMarker.indexOf('};');
          if (eIdx !== -1) {
            const pdData = JSON.parse(fromMarker.slice(0, eIdx + 1));
            if (pdData.streams?.[0]?.m3u8_url && pdData.streams[0].m3u8_url.startsWith('http')) {
              directHlsUrl = pdData.streams[0].m3u8_url;
            }
            if (pdData.movie?.imdb_id && !imdbId) {
              imdbId = pdData.movie.imdb_id;
            }
          }
        }
      }
    } catch (pdErr) {
      console.warn('[VegaMovies] PlayDrive deep resolve warning:', pdErr);
    }
  }

  const streamOptions: any[] = [];

  // Option 1: Native Direct 1080p Stream (HLS - Zero Iframe, Native Player)
  if (directHlsUrl) {
    streamOptions.push({
      label: '⚡ Server 1: Direct 1080p Stream (HLS Multi-Audio - Native Player)',
      url: `/api/proxy/hls?url=${encodeURIComponent(directHlsUrl)}`,
      streamType: 'hls',
      serverType: 'watchonline',
    });
  }

  // Option 2: Direct PlayDrive VIP Embed
  if (directWatchUrl) {
    streamOptions.push({
      label: `🌐 Server ${streamOptions.length + 1}: PlayDrive TV Web Player (Full HD)`,
      url: directWatchUrl,
      streamType: 'embed',
      serverType: 'watchonline',
    });
  }

  const isSeries = /Season\s*\d+|Series|Episode/i.test(rawTitle) || /season-\d+/i.test(postUrl);
  const seasonMatch = rawTitle.match(/Season\s*(\d+)/i) || postUrl.match(/season-(\d+)/i);
  const seasonNum = seasonMatch ? parseInt(seasonMatch[1], 10) : 1;

  // Option 3: FMHY-Verified Multi-Server Embed Network
  if (imdbId) {
    if (isSeries) {
      streamOptions.push({
        label: `🎬 Server ${streamOptions.length + 1}: VidSrc 1080p TV Stream (Season ${seasonNum})`,
        url: `https://vidsrc.to/embed/tv/${imdbId}/${seasonNum}/1`,
        streamType: 'embed',
        serverType: 'vidsrc',
      });
      streamOptions.push({
        label: `✨ Server ${streamOptions.length + 1}: VidSrc TV Mirror (Fast Stream)`,
        url: `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${seasonNum}&episode=1`,
        streamType: 'embed',
        serverType: 'vidsrc',
      });
      streamOptions.push({
        label: `🚀 Server ${streamOptions.length + 1}: 2Embed TV Cloud Stream`,
        url: `https://www.2embed.cc/embedtv/${imdbId}&s=${seasonNum}&e=1`,
        streamType: 'embed',
        serverType: 'embed',
      });
      streamOptions.push({
        label: `🍿 Server ${streamOptions.length + 1}: AutoEmbed TV Server`,
        url: `https://autoembed.co/tv/imdb/${imdbId}-${seasonNum}-1`,
        streamType: 'embed',
        serverType: 'embed',
      });
      streamOptions.push({
        label: `📡 Server ${streamOptions.length + 1}: SmashyStream Fast CDN`,
        url: `https://embed.smashystream.com/playere.php?imdb=${imdbId}&season=${seasonNum}&episode=1`,
        streamType: 'embed',
        serverType: 'embed',
      });
    } else {
      streamOptions.push({
        label: `🎬 Server ${streamOptions.length + 1}: VidSrc 1080p Cinema Server (Multi-Audio)`,
        url: `https://vidsrc.to/embed/movie/${imdbId}`,
        streamType: 'embed',
        serverType: 'vidsrc',
      });
      streamOptions.push({
        label: `✨ Server ${streamOptions.length + 1}: VidSrc Cinema Mirror (Fast Stream)`,
        url: `https://vidsrc.me/embed/movie?imdb=${imdbId}`,
        streamType: 'embed',
        serverType: 'vidsrc',
      });
      streamOptions.push({
        label: `🚀 Server ${streamOptions.length + 1}: 2Embed High-Speed Cloud Stream`,
        url: `https://www.2embed.cc/embed/${imdbId}`,
        streamType: 'embed',
        serverType: 'embed',
      });
      streamOptions.push({
        label: `🍿 Server ${streamOptions.length + 1}: AutoEmbed Cinema Server`,
        url: `https://autoembed.co/movie/imdb/${imdbId}`,
        streamType: 'embed',
        serverType: 'embed',
      });
      streamOptions.push({
        label: `📡 Server ${streamOptions.length + 1}: SmashyStream Fast CDN`,
        url: `https://embed.smashystream.com/playere.php?imdb=${imdbId}`,
        streamType: 'embed',
        serverType: 'embed',
      });
    }
  } else if (!directWatchUrl && !directHlsUrl) {
    // Fallback embed using title search
    streamOptions.push({
      label: '⚡ Server 1: Cloud Multi-Server Stream',
      url: `https://autoembed.co/movie/search?q=${encodeURIComponent(cleanTitle)}`,
      streamType: 'embed',
      serverType: 'embed',
    });
  }

  // If this is a TV series, provide episode selections with multi-server mirrors
  const episodes: any[] = [];
  if (isSeries && imdbId) {
    const epCountMatch = rawTitle.match(/\[EP-(\d+)\s+Added\]/i) || rawTitle.match(/(\d+)\s*Episodes/i);
    const epCount = epCountMatch ? Math.min(parseInt(epCountMatch[1], 10), 30) : 10;
    for (let ep = 1; ep <= epCount; ep++) {
      episodes.push({
        episodeNumber: ep,
        seasonNumber: seasonNum,
        title: `Episode ${ep}`,
        url: `https://vidsrc.to/embed/tv/${imdbId}/${seasonNum}/${ep}`,
        streamType: 'embed',
        alternativeServers: [
          { label: '🎬 VidSrc 1080p Cinema', url: `https://vidsrc.to/embed/tv/${imdbId}/${seasonNum}/${ep}`, streamType: 'embed' as const },
          { label: '✨ VidSrc Mirror', url: `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${seasonNum}&episode=${ep}`, streamType: 'embed' as const },
          { label: '🚀 2Embed Fast Server', url: `https://www.2embed.cc/embedtv/${imdbId}&s=${seasonNum}&e=${ep}`, streamType: 'embed' as const },
          { label: '🍿 AutoEmbed CDN', url: `https://autoembed.co/tv/imdb/${imdbId}-${seasonNum}-${ep}`, streamType: 'embed' as const },
          { label: '📡 SmashyStream', url: `https://embed.smashystream.com/playere.php?imdb=${imdbId}&season=${seasonNum}&episode=${ep}`, streamType: 'embed' as const },
        ]
      });
    }
  }

  return {
    title: rawTitle,
    cleanTitle,
    poster,
    storyline,
    trailerUrl: null,
    qualities: ['1080p FHD', '720p HD', '480p'],
    languages: ['Hindi', 'Dual Audio', 'English'],
    streamOptions,
    episodes: episodes.length > 0 ? episodes : undefined,
    sourceUrl: postUrl,
    imdbId: imdbId || undefined,
    extractedAt: new Date().toISOString()
  };
}

// HDHub4u Catalog API
app.get('/api/hdhub/catalog', async (req: Request, res: Response) => {
  try {
    const category = (req.query.category as string) || 'latest';
    const domain = (req.query.domain as string) || DEFAULT_HDHUB_DOMAIN;
    const page = parseInt((req.query.page as string) || '1', 10);
    const movies = await scrapeHDHubCatalog(category, domain, page);
    res.json({ success: true, movies, page, count: movies.length });
  } catch (err: any) {
    console.error('HDHub Catalog scrape error:', err.message);
    res.status(500).json({ success: false, error: err.message, movies: [] });
  }
});

// HDHub4u Search API
app.get('/api/hdhub/search', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q || !q.trim()) {
      res.status(400).json({ error: 'Search query required' });
      return;
    }
    const domain = (req.query.domain as string) || DEFAULT_HDHUB_DOMAIN;
    const movies = await scrapeHDHubSearch(q, domain);
    res.json({ success: true, movies });
  } catch (err: any) {
    console.error('HDHub Search error:', err.message);
    res.status(500).json({ success: false, error: err.message, movies: [] });
  }
});

// HDHub4u Movie Details API
app.get('/api/hdhub/movie', async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      res.status(400).json({ error: 'Movie URL required' });
      return;
    }
    const details = await scrapeHDHubMovieDetails(url);
    res.json({ success: true, data: details });
  } catch (err: any) {
    console.error('HDHub Movie Details error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// HDHub4u Dynamic Mirror Management APIs
app.get('/api/hdhub/mirrors', async (req: Request, res: Response) => {
  try {
    const pings = await Promise.all(
      KNOWN_HDHUB_MIRRORS.map(async (domain) => {
        const ping = await pingMirror(domain);
        return {
          ...ping,
          isCurrent: domain === activeHDHubMirror
        };
      })
    );
    res.json({
      success: true,
      activeMirror: activeHDHubMirror,
      mirrors: pings
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/hdhub/set-domain', (req: Request, res: Response) => {
  const { domain } = req.body;
  if (!domain || typeof domain !== 'string') {
    res.status(400).json({ error: 'Domain string required' });
    return;
  }
  const clean = domain.trim().replace(/\/+$/, '');
  const active = setActiveHDHubMirror(clean);
  res.json({ success: true, activeMirror: active });
});

app.post('/api/hdhub/auto-detect', async (req: Request, res: Response) => {
  try {
    const pings = await Promise.all(
      KNOWN_HDHUB_MIRRORS.map(m => pingMirror(m))
    );
    const online = pings.filter(p => p.isOnline).sort((a, b) => a.latencyMs - b.latencyMs);
    if (online.length > 0) {
      const best = online[0].domain;
      setActiveHDHubMirror(best);
      res.json({ success: true, activeMirror: best, latencyMs: online[0].latencyMs, all: pings });
    } else {
      res.json({ success: false, activeMirror: activeHDHubMirror, message: 'No mirrors responded; keeping current.' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Multi-Integrator Content Provider API
app.get('/api/providers', (req: Request, res: Response) => {
  res.json({
    success: true,
    providers: [
      {
        id: 'hdhub4u',
        name: 'HDHub4u Ultra',
        tagline: 'Latest Dual Audio Cinema & Direct 1080p PlayDrive',
        badge: 'AUTO-HEALING MIRRORS',
        activeMirror: activeHDHubMirror
      },
      {
        id: 'bollystream',
        name: 'BollyStream OTT Vault',
        tagline: 'Panchayat, Mirzapur, Stree 2, Pushpa 2 & OTT Series',
        badge: '1080P VERIFIED OTT'
      },
      {
        id: 'vegamovies',
        name: 'VegaMovies Vault (Backup)',
        tagline: 'Dual Audio Cinema, 4K Web-DL & Fast Multi-Server Streams',
        badge: 'STREAM & BACKUP',
        activeMirror: activeVegaMirror
      },
      {
        id: 'archive',
        name: 'Golden Hindi Classics',
        tagline: 'Timeless Bollywood Masters (Sholay, Deewaar, Anand)',
        badge: 'ARCHIVE 1080P'
      }
    ]
  });
});

// VegaMovies Catalog API
app.get('/api/vegamovies/catalog', async (req: Request, res: Response) => {
  try {
    const category = (req.query.category as string) || 'latest';
    const domain = (req.query.domain as string) || activeVegaMirror;
    const page = parseInt((req.query.page as string) || '1', 10);
    const movies = await scrapeVegaCatalog(category, domain, page);
    res.json({ success: true, movies, page, count: movies.length });
  } catch (err: any) {
    console.error('VegaMovies Catalog scrape error:', err.message);
    res.status(500).json({ success: false, error: err.message, movies: [] });
  }
});

// VegaMovies Search API (High Speed Typesense Index)
app.get('/api/vegamovies/search', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q || !q.trim()) {
      res.status(400).json({ error: 'Search query required' });
      return;
    }
    const domain = (req.query.domain as string) || activeVegaMirror;
    const movies = await scrapeVegaSearch(q, domain);
    res.json({ success: true, movies });
  } catch (err: any) {
    console.error('VegaMovies Search error:', err.message);
    res.status(500).json({ success: false, error: err.message, movies: [] });
  }
});

// VegaMovies Movie Details API (With Universal Multi-Server Embeds)
app.get('/api/vegamovies/movie', async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;
    const imdbId = req.query.imdbId as string;
    if (!url) {
      res.status(400).json({ error: 'Movie URL required' });
      return;
    }
    const details = await scrapeVegaMovieDetails(url, imdbId);
    res.json({ success: true, data: details });
  } catch (err: any) {
    console.error('VegaMovies Movie Details error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// VegaMovies Dynamic Mirror Management APIs
app.get('/api/vegamovies/mirrors', async (req: Request, res: Response) => {
  try {
    const pings = await Promise.all(
      KNOWN_VEGAMOVIES_MIRRORS.map(async (domain) => {
        const ping = await pingMirror(domain);
        return {
          ...ping,
          isCurrent: domain === activeVegaMirror
        };
      })
    );
    res.json({ success: true, activeMirror: activeVegaMirror, mirrors: pings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/vegamovies/set-domain', (req: Request, res: Response) => {
  const { domain } = req.body;
  if (!domain || typeof domain !== 'string') {
    res.status(400).json({ error: 'Valid domain required' });
    return;
  }
  const clean = setActiveVegaMirror(domain);
  res.json({ success: true, activeMirror: clean });
});

// BollyStream OTT Catalog API
app.get('/api/bollystream/catalog', (req: Request, res: Response) => {
  const category = (req.query.category as string) || 'all';
  let list = BOLLYSTREAM_VAULT;
  if (category === 'webseries') {
    list = BOLLYSTREAM_VAULT.filter(m => m.isSeries);
  } else if (category === 'bollywood') {
    list = BOLLYSTREAM_VAULT.filter(m => m.category.includes('Bollywood'));
  } else if (category === 'south') {
    list = BOLLYSTREAM_VAULT.filter(m => m.category.includes('South'));
  }
  res.json({ success: true, movies: list });
});

// BollyStream Movie / Series Details API
app.get('/api/bollystream/movie', (req: Request, res: Response) => {
  const id = req.query.id as string;
  const item = BOLLYSTREAM_VAULT.find(m => m.id === id || m.url === id);
  if (!item) {
    res.status(404).json({ error: 'Movie not found in BollyStream vault' });
    return;
  }
  res.json({
    success: true,
    data: {
      title: item.title,
      cleanTitle: item.cleanTitle,
      poster: item.poster,
      storyline: item.storyline || '',
      trailerUrl: item.trailerUrl || null,
      qualities: item.qualities,
      languages: item.languages,
      streamOptions: item.streamOptions,
      episodes: item.episodes,
      sourceUrl: item.url,
      imdbId: item.imdbId,
      extractedAt: new Date().toISOString()
    }
  });
});

// BollyStream Search API
app.get('/api/bollystream/search', (req: Request, res: Response) => {
  const q = (req.query.q as string || '').toLowerCase().trim();
  if (!q) {
    res.json({ success: true, movies: [] });
    return;
  }
  const matches = BOLLYSTREAM_VAULT.filter(m =>
    m.cleanTitle.toLowerCase().includes(q) ||
    m.title.toLowerCase().includes(q) ||
    m.category.toLowerCase().includes(q) ||
    m.languages.some(l => l.toLowerCase().includes(q))
  );
  res.json({ success: true, movies: matches });
});

// Golden Hindi Cinema Archive Catalog API
app.get('/api/archive/catalog', (req: Request, res: Response) => {
  res.json({ success: true, movies: HINDI_ARCHIVE_VAULT });
});

// IPTV-org Open Source Live TV Channels API
app.get('/api/iptv/channels', async (req: Request, res: Response) => {
  try {
    const region = (req.query.region as string) || (req.query.category as string) || 'all-selected';
    const genre = (req.query.genre as string) || 'all';
    const verifiedOnly = req.query.verifiedOnly === undefined ? true : req.query.verifiedOnly === 'true';

    const channels = await getIPTVChannels({ region, genre, verifiedOnly });
    res.json({
      success: true,
      region,
      genre,
      verifiedOnly,
      total: channels.length,
      channels,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, channels: [] });
  }
});

app.get('/api/iptv/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const channels = await searchIPTVChannels(q);
    res.json({ success: true, channels });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, channels: [] });
  }
});

app.post('/api/iptv/check-health', async (req: Request, res: Response) => {
  try {
    const { streamUrl } = req.body;
    if (!streamUrl) {
      res.status(400).json({ success: false, error: 'streamUrl parameter is required' });
      return;
    }
    const health = await checkStreamHealth(streamUrl);
    res.json({ success: true, health });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/iptv/categories', (req: Request, res: Response) => {
  res.json({
    success: true,
    regions: [
      { id: 'all-selected', label: 'All Selected (Hindi, Haryanvi, Punjabi, English)', isDefault: true },
      { id: 'haryanvi', label: 'Haryanvi' },
      { id: 'hindi', label: 'Hindi Channels' },
      { id: 'punjabi', label: 'Punjabi Channels' },
      { id: 'english', label: 'English & Global' },
      { id: 'all-global', label: 'All Global Feeds' },
    ],
    genres: [
      { id: 'all', label: 'All Genres' },
      { id: 'news', label: 'News & Current Affairs' },
      { id: 'music', label: 'Music & Youth' },
      { id: 'entertainment', label: 'Entertainment' },
      { id: 'religious', label: 'Spiritual & Gurbani' },
      { id: 'culture', label: 'Culture & Regional' },
      { id: 'science', label: 'Science & Discovery' },
      { id: 'sports', label: 'Sports & Outdoors' },
    ]
  });
});


// Curated verified web streams for fallback and live TV
const CURATED_TV_FEEDS = [
  {
    id: 'nasa-live',
    title: 'NASA TV — Live Space Missions & Earth Views',
    category: 'Science & Space',
    badge: 'LIVE HLS',
    duration: '24/7 Live Stream',
    streamUrl: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    backupUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    sourceUrl: 'https://www.nasa.gov/live',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    description: 'Official continuous high-definition broadcast of astronaut spacewalks, rocket launches, and views of Earth from the ISS.',
    resolution: '1080p 60fps',
    format: 'HLS / m3u8'
  },
  {
    id: 'tears-of-steel',
    title: 'Tears of Steel (Sci-Fi Cinema 4K)',
    category: 'Cinema & Short Films',
    badge: '4K CINEMA',
    duration: '12 min',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    sourceUrl: 'https://mango.blender.org/',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    description: 'VFX open-source dystopian sci-fi short film set in Amsterdam with towering robotic sentinels and cybernetic warriors.',
    resolution: '4K Ultra-HD',
    format: 'MP4 Web Stream'
  },
  {
    id: 'sintel-fantasy',
    title: 'Sintel: The Dragon Quest (Animation)',
    category: 'Cinema & Short Films',
    badge: 'HD ANIMATION',
    duration: '15 min',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    sourceUrl: 'https://durian.blender.org/',
    thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
    description: 'An emotional animated fantasy quest through icy tundras and desert ruins following a lone heroine and a baby dragon.',
    resolution: '1080p HD',
    format: 'MP4 Web Stream'
  },
  {
    id: 'big-buck-bunny',
    title: 'Big Buck Bunny (Family Classic)',
    category: 'Cinema & Short Films',
    badge: 'FAMILY',
    duration: '10 min',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    sourceUrl: 'https://peach.blender.org/',
    thumbnail: 'https://images.unsplash.com/photo-1535083783855-76ae62b2914e?auto=format&fit=crop&w=800&q=80',
    description: 'A large forest rabbit stands up to forest bullies in this colorful comedy open animation showcase.',
    resolution: '1080p 60fps',
    format: 'MP4 Web Stream'
  }
];

// Helper: Extract media stream from a website URL
async function extractMediaFromWeb(targetUrl: string) {
  const trimmed = targetUrl.trim();

  if (/\.(mp4|m3u8|webm|ogg|mov)(\?.*)?$/i.test(trimmed)) {
    const isHls = /\.m3u8(\?.*)?$/i.test(trimmed);
    const fileName = trimmed.split('/').pop()?.split('?')[0] || 'Web Video Stream';
    return {
      title: decodeURIComponent(fileName.replace(/[-_]/g, ' ')),
      description: `Direct web stream extracted from ${new URL(trimmed).hostname}`,
      sourceUrl: trimmed,
      streamUrl: trimmed,
      format: isHls ? 'HLS / m3u8' : 'Direct MP4/WebM',
      thumbnail: '',
      resolution: isHls ? 'Adaptive HLS' : 'Direct Web Stream',
      extractedAt: new Date().toISOString()
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(trimmed, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12; BRAVIA 4K Build/BRAVIA_ATV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,video/*,*/*;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Failed to fetch web page: HTTP ${res.status}`);
    }

    const html = await res.text();

    let title = '';
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                         html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
    if (ogTitleMatch) title = ogTitleMatch[1];
    if (!title) {
      const docTitleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (docTitleMatch) title = docTitleMatch[1].trim();
    }
    if (!title) {
      title = new URL(trimmed).hostname;
    }

    let description = '';
    const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                        html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    if (ogDescMatch) description = ogDescMatch[1];

    let thumbnail = '';
    const ogImgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImgMatch) thumbnail = ogImgMatch[1];

    let streamUrl = '';
    let format = 'Web Stream';

    const ogVideoMatch = html.match(/<meta\s+property=["']og:video(:secure_url|:url)?["']\s+content=["']([^"']+)["']/i);
    if (ogVideoMatch && ogVideoMatch[2] && !ogVideoMatch[2].includes('youtube.com/embed')) {
      streamUrl = ogVideoMatch[2];
    }

    if (!streamUrl) {
      const twPlayerMatch = html.match(/<meta\s+name=["']twitter:player:stream["']\s+content=["']([^"']+)["']/i);
      if (twPlayerMatch) streamUrl = twPlayerMatch[1];
    }

    if (!streamUrl) {
      const videoSrcMatch = html.match(/<video[^>]+src=["']([^"']+)["']/i);
      if (videoSrcMatch) streamUrl = videoSrcMatch[1];
    }
    if (!streamUrl) {
      const sourceMatch = html.match(/<source[^>]+src=["']([^"']+\.(mp4|m3u8|webm))["']/i);
      if (sourceMatch) streamUrl = sourceMatch[1];
    }

    if (!streamUrl) {
      const hlsMatch = html.match(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/i);
      if (hlsMatch) {
        streamUrl = hlsMatch[0].replace(/\\/g, '');
        format = 'HLS / m3u8';
      }
    }
    if (!streamUrl) {
      const mp4Match = html.match(/https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*/i);
      if (mp4Match) {
        streamUrl = mp4Match[0].replace(/\\/g, '');
        format = 'MP4 Stream';
      }
    }

    if (streamUrl && streamUrl.startsWith('/')) {
      const base = new URL(trimmed);
      streamUrl = `${base.protocol}//${base.host}${streamUrl}`;
    }

    if (!streamUrl) {
      return {
        title,
        description: description || `Extracted media from ${new URL(trimmed).hostname}`,
        sourceUrl: trimmed,
        streamUrl: '',
        format: 'Web Container',
        thumbnail,
        extractedAt: new Date().toISOString(),
        needsDirectStream: true,
        message: 'No direct MP4/HLS tag was found in the public page body. You can paste the direct stream link (.m3u8 / .mp4).'
      };
    }

    return {
      title,
      description: description || `Extracted stream from ${new URL(trimmed).hostname}`,
      sourceUrl: trimmed,
      streamUrl,
      format: streamUrl.includes('.m3u8') ? 'HLS / m3u8' : format,
      thumbnail,
      resolution: streamUrl.includes('.m3u8') ? 'Adaptive Stream' : '1080p Web',
      extractedAt: new Date().toISOString()
    };
  } catch (err: any) {
    return {
      error: err.message || 'Failed to extract stream from web address',
      sourceUrl: targetUrl
    };
  }
}

// Streaming Proxy to bypass anti-hotlinking, mixed-content HTTP, and CORS restrictions
app.all('/api/proxy/hls', async (req: Request, res: Response) => {
  // Always enable CORS so browser and TV video tags can read it
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    res.status(400).send('Missing url parameter');
    return;
  }

  try {
    const upstreamUrl = new URL(targetUrl);
    const referer = (req.query.ref as string) || (upstreamUrl.hostname.includes('uprising.best') ? 'https://playdrive.vip/' : targetUrl);

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': referer,
      'Origin': new URL(referer).origin,
    };
    if (req.headers.range) {
      headers['Range'] = req.headers.range as string;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const upstreamRes = await fetch(targetUrl, {
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      res.status(upstreamRes.status).send(`Upstream error: ${upstreamRes.statusText}`);
      return;
    }

    // Determine the effective base URL after redirects
    const effectiveBaseUrl = new URL(upstreamRes.url || targetUrl);

    // Check if body is an HLS playlist by looking for #EXTM3U magic header
    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const isPlaylist = buf.subarray(0, 10).toString('ascii').includes('#EXTM3U');

    if (isPlaylist) {
      const text = buf.toString('utf-8');
      // Rewrite all sub-playlists, audio tracks, init segments, keys, and chunk paths to route back through /api/proxy/hls
      const lines = text.split('\n');
      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        // Rewrite #EXT-X-MEDIA, #EXT-X-MAP, or #EXT-X-KEY URI="..."
        if (trimmed.startsWith('#EXT-X-MEDIA') || trimmed.startsWith('#EXT-X-MAP') || trimmed.startsWith('#EXT-X-KEY')) {
          return line.replace(/URI=["']([^"']+)["']/g, (_, uri) => {
            const absUri = new URL(uri, effectiveBaseUrl).href;
            return `URI="/api/proxy/hls?url=${encodeURIComponent(absUri)}&ref=${encodeURIComponent(referer)}"`;
          });
        }

        // Rewrite non-comment URL lines
        if (!trimmed.startsWith('#')) {
          const absUri = new URL(trimmed, effectiveBaseUrl).href;
          return `/api/proxy/hls?url=${encodeURIComponent(absUri)}&ref=${encodeURIComponent(referer)}`;
        }

        return line;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'public, max-age=10');
      res.send(rewrittenLines.join('\n'));
      return;
    }

    // Media segment / Binary stream
    if (upstreamRes.headers.get('content-range')) {
      res.setHeader('Content-Range', upstreamRes.headers.get('content-range')!);
    }
    if (upstreamRes.headers.get('content-length')) {
      res.setHeader('Content-Length', upstreamRes.headers.get('content-length')!);
    }
    if (upstreamRes.headers.get('accept-ranges')) {
      res.setHeader('Accept-Ranges', upstreamRes.headers.get('accept-ranges')!);
    }

    res.status(upstreamRes.status);
    const upstreamType = upstreamRes.headers.get('content-type');
    const mimeType = (upstreamType && !upstreamType.includes('text/html'))
      ? upstreamType
      : targetUrl.endsWith('.m4s') || targetUrl.includes('.m4s') || targetUrl.endsWith('.mp4')
      ? 'video/mp4'
      : targetUrl.endsWith('.aac') || targetUrl.includes('.aac')
      ? 'audio/aac'
      : targetUrl.endsWith('.vtt') || targetUrl.includes('.vtt') 
      ? 'text/vtt' 
      : 'video/mp2t';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buf);
  } catch (err: any) {
    console.error('HLS proxy error:', err.message);
    if (!res.headersSent) {
      res.status(502).send(`HLS Gateway Error: ${err.message}`);
    }
  }
});

// API Routes
app.get('/api/curated-channels', (req: Request, res: Response) => {
  res.json({
    success: true,
    channels: CURATED_TV_FEEDS
  });
});

app.post('/api/extract', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'URL parameter is required' });
    return;
  }
  const result = await extractMediaFromWeb(url);
  res.json({
    success: !result.error,
    data: result
  });
});

// Remote TV Pairing & Phone Companion API
app.post('/api/remote/create-session', (req: Request, res: Response) => {
  let code = '';
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (remoteSessions.has(code));

  const session: RemoteSession = {
    code,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    queue: [],
    nowPlaying: null
  };

  remoteSessions.set(code, session);
  res.json({ success: true, code });
});

app.get('/api/remote/session/:code', (req: Request, res: Response) => {
  const { code } = req.params;
  const session = remoteSessions.get(code);
  if (!session) {
    res.status(404).json({ error: 'TV Session not found or expired' });
    return;
  }

  session.lastSeen = Date.now();
  const isTV = req.query.role === 'tv';
  const actions = [...session.queue];

  if (isTV) {
    session.queue = [];
  }

  res.json({
    success: true,
    code: session.code,
    actions,
    nowPlaying: session.nowPlaying
  });
});

app.post('/api/remote/session/:code/send', (req: Request, res: Response) => {
  const { code } = req.params;
  const { action, payload } = req.body;
  const session = remoteSessions.get(code);

  if (!session) {
    res.status(404).json({ error: 'TV Session not found' });
    return;
  }

  session.lastSeen = Date.now();
  const actionItem = {
    id: Math.random().toString(36).substring(2, 9),
    action,
    payload,
    timestamp: Date.now()
  };

  session.queue.push(actionItem);
  if (action === 'play_stream' && payload?.streamUrl) {
    session.nowPlaying = {
      title: payload.title || 'Playing from Web',
      url: payload.streamUrl,
      isPlaying: true
    };
  }

  res.json({ success: true, queuedAction: actionItem });
});

app.post('/api/remote/session/:code/status', (req: Request, res: Response) => {
  const { code } = req.params;
  const { nowPlaying } = req.body;
  const session = remoteSessions.get(code);
  if (session) {
    session.nowPlaying = nowPlaying;
  }
  res.json({ success: true });
});

// Production vs Development Setup
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SnapTV Server running on port ${PORT} (isProduction=${isProduction})`);
  });
}

startServer();
