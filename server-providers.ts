/**
 * Multi-Integrator Provider Data & Dynamic Domain Engine
 * Integrators:
 * 1. BollyStream OTT & Indian Blockbuster Vault
 * 2. Golden Hindi Classics Archive
 * 3. Dynamic HDHub4u Mirror Manager
 */

export interface ProviderMovie {
  id: string;
  title: string;
  cleanTitle: string;
  year?: string;
  poster: string;
  url: string;
  category: string;
  languages: string[];
  qualities: string[];
  isSeries?: boolean;
  storyline?: string;
  trailerUrl?: string;
  imdbId?: string;
  streamOptions: Array<{
    label: string;
    url: string;
    streamType: 'hls' | 'mp4' | 'embed' | 'direct';
    serverType?: 'hubcdn' | 'hubcloud' | 'watchonline' | 'hubdrive' | 'direct' | 'vidsrc' | 'embed';
  }>;
  episodes?: Array<{
    episodeNumber: number;
    seasonNumber?: number;
    title: string;
    url: string;
    streamType: 'hls' | 'mp4' | 'embed' | 'direct';
  }>;
}

// 1. Curated Indian OTT Series & Blockbuster Mega-Vault
export const BOLLYSTREAM_VAULT: ProviderMovie[] = [
  {
    id: 'bolly-stree-2',
    title: 'Stree 2: Sarkate Ka Aatank (2024) [Hindi Multi-Audio 1080p FHD]',
    cleanTitle: 'Stree 2: Sarkate Ka Aatank',
    year: '2024',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    url: 'https://bollystream.internal/movie/stree-2-2024',
    category: 'Bollywood Cinema',
    languages: ['Hindi (Original)', 'Dual Audio'],
    qualities: ['1080p FHD', '4K UHD', '720p HD'],
    isSeries: false,
    storyline: 'After the events of Stree, the town of Chanderi faces a new terrifying headless monster named Sarkata who abducts modern independent women. The gang must unite with Stree once again to protect their beloved city.',
    trailerUrl: 'https://www.youtube.com/embed/KVn9Yk1U69w',
    imdbId: 'tt28389658',
    streamOptions: [
      {
        label: '⚡ Server 1: Direct 1080p Stream (Multi-Audio)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        streamType: 'mp4',
        serverType: 'direct',
      },
      {
        label: '🌐 Server 2: VidSrc Cinema Server (Full HD)',
        url: 'https://vidsrc.to/embed/movie/tt28389658',
        streamType: 'embed',
        serverType: 'vidsrc',
      },
      {
        label: '🚀 Server 3: 2Embed Cloud CDN',
        url: 'https://www.2embed.cc/embed/tt28389658',
        streamType: 'embed',
        serverType: 'embed',
      },
      {
        label: '🍿 Server 4: MultiEmbed Fast Server',
        url: 'https://multiembed.mov/?video_id=tt28389658',
        streamType: 'embed',
        serverType: 'embed',
      }
    ]
  },
  {
    id: 'bolly-panchayat-s3',
    title: 'Panchayat Season 3 (2024) [Hindi 1080p FHD Web Series]',
    cleanTitle: 'Panchayat (Season 3)',
    year: '2024',
    poster: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=800&q=80',
    url: 'https://bollystream.internal/series/panchayat-s3',
    category: 'Web Series',
    languages: ['Hindi'],
    qualities: ['1080p FHD', '720p HD'],
    isSeries: true,
    storyline: 'Abhishek Tripathi returns to Phulera amidst tense political showdowns, rural rivalries, and heartfelt village drama as election fever heats up in the panchayat.',
    trailerUrl: 'https://www.youtube.com/embed/5mC7FmD8h1I',
    imdbId: 'tt12004706',
    streamOptions: [
      {
        label: '⚡ Server 1: VidSrc High Speed OTT Server',
        url: 'https://vidsrc.to/embed/tv/tt12004706/3/1',
        streamType: 'embed',
        serverType: 'vidsrc',
      },
      {
        label: '🌐 Server 2: 2Embed Cloud Stream',
        url: 'https://www.2embed.cc/embedtv/tt12004706&s=3&e=1',
        streamType: 'embed',
        serverType: 'embed',
      }
    ],
    episodes: [
      { episodeNumber: 1, seasonNumber: 3, title: 'Episode 1: Rangbaazi (The Stand-off)', url: 'https://vidsrc.to/embed/tv/tt12004706/3/1', streamType: 'embed' },
      { episodeNumber: 2, seasonNumber: 3, title: 'Episode 2: Gaddha (The Road & Potholes)', url: 'https://vidsrc.to/embed/tv/tt12004706/3/2', streamType: 'embed' },
      { episodeNumber: 3, seasonNumber: 3, title: 'Episode 3: Ghar Ka Bhedi', url: 'https://vidsrc.to/embed/tv/tt12004706/3/3', streamType: 'embed' },
      { episodeNumber: 4, seasonNumber: 3, title: 'Episode 4: Aatma Samarpan', url: 'https://vidsrc.to/embed/tv/tt12004706/3/4', streamType: 'embed' },
      { episodeNumber: 5, seasonNumber: 3, title: 'Episode 5: Shanti Samjhauta', url: 'https://vidsrc.to/embed/tv/tt12004706/3/5', streamType: 'embed' },
      { episodeNumber: 6, seasonNumber: 3, title: 'Episode 6: Chunaav Ki Tayyari', url: 'https://vidsrc.to/embed/tv/tt12004706/3/6', streamType: 'embed' },
      { episodeNumber: 7, seasonNumber: 3, title: 'Episode 7: Dola Dola', url: 'https://vidsrc.to/embed/tv/tt12004706/3/7', streamType: 'embed' },
      { episodeNumber: 8, seasonNumber: 3, title: 'Episode 8: Hamla (The Final Faceoff)', url: 'https://vidsrc.to/embed/tv/tt12004706/3/8', streamType: 'embed' },
    ]
  },
  {
    id: 'bolly-mirzapur-s3',
    title: 'Mirzapur Season 3 (2024) [Hindi 1080p FHD Prime]',
    cleanTitle: 'Mirzapur (Season 3)',
    year: '2024',
    poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    url: 'https://bollystream.internal/series/mirzapur-s3',
    category: 'Web Series',
    languages: ['Hindi'],
    qualities: ['1080p FHD', '4K UHD'],
    isSeries: true,
    storyline: 'With Kaleen Bhaiya gone into hiding and Guddu Pandit claiming the throne of Purvanchal, new blood, old enemies, and ruthless betrayals plunge Mirzapur into ultimate chaos.',
    trailerUrl: 'https://www.youtube.com/embed/5aLzX8e04b4',
    imdbId: 'tt6473300',
    streamOptions: [
      {
        label: '⚡ Server 1: VidSrc Mirzapur S3 Server',
        url: 'https://vidsrc.to/embed/tv/tt6473300/3/1',
        streamType: 'embed',
        serverType: 'vidsrc',
      },
      {
        label: '🌐 Server 2: 2Embed HD Stream',
        url: 'https://www.2embed.cc/embedtv/tt6473300&s=3&e=1',
        streamType: 'embed',
        serverType: 'embed',
      }
    ],
    episodes: [
      { episodeNumber: 1, seasonNumber: 3, title: 'Episode 1: Tetua (The Grip)', url: 'https://vidsrc.to/embed/tv/tt6473300/3/1', streamType: 'embed' },
      { episodeNumber: 2, seasonNumber: 3, title: 'Episode 2: Man Bhabhuka (Burning Heart)', url: 'https://vidsrc.to/embed/tv/tt6473300/3/2', streamType: 'embed' },
      { episodeNumber: 3, seasonNumber: 3, title: 'Episode 3: Pratishodh', url: 'https://vidsrc.to/embed/tv/tt6473300/3/3', streamType: 'embed' },
      { episodeNumber: 4, seasonNumber: 3, title: 'Episode 4: Kanoon Ka Haath', url: 'https://vidsrc.to/embed/tv/tt6473300/3/4', streamType: 'embed' },
      { episodeNumber: 5, seasonNumber: 3, title: 'Episode 5: Baaghi', url: 'https://vidsrc.to/embed/tv/tt6473300/3/5', streamType: 'embed' },
      { episodeNumber: 6, seasonNumber: 3, title: 'Episode 6: Bhasmasur', url: 'https://vidsrc.to/embed/tv/tt6473300/3/6', streamType: 'embed' },
      { episodeNumber: 7, seasonNumber: 3, title: 'Episode 7: Jung', url: 'https://vidsrc.to/embed/tv/tt6473300/3/7', streamType: 'embed' },
      { episodeNumber: 8, seasonNumber: 3, title: 'Episode 8: Taandav', url: 'https://vidsrc.to/embed/tv/tt6473300/3/8', streamType: 'embed' },
    ]
  },
  {
    id: 'bolly-pushpa-2',
    title: 'Pushpa 2: The Rule (2024) [Hindi Dubbed 1080p FHD]',
    cleanTitle: 'Pushpa 2: The Rule',
    year: '2024',
    poster: 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?auto=format&fit=crop&w=800&q=80',
    url: 'https://bollystream.internal/movie/pushpa-2-2024',
    category: 'South Hindi Dubbed',
    languages: ['Hindi Dubbed', 'Telugu'],
    qualities: ['1080p FHD', '4K UHD'],
    isSeries: false,
    storyline: 'Pushpa Raj rules the red sandalwood empire with an iron fist, going toe-to-toe with SP Bhanwar Singh Shekhawat in a legendary clash of supremacy.',
    trailerUrl: 'https://www.youtube.com/embed/1kVK0MZlbI4',
    imdbId: 'tt16539454',
    streamOptions: [
      {
        label: '⚡ Server 1: Direct 1080p Stream (High Bitrate)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        streamType: 'mp4',
        serverType: 'direct',
      },
      {
        label: '🌐 Server 2: VidSrc Cinema Server',
        url: 'https://vidsrc.to/embed/movie/tt16539454',
        streamType: 'embed',
        serverType: 'vidsrc',
      },
      {
        label: '🚀 Server 3: 2Embed Cloud Mirror',
        url: 'https://www.2embed.cc/embed/tt16539454',
        streamType: 'embed',
        serverType: 'embed',
      }
    ]
  },
  {
    id: 'bolly-kalki-2898',
    title: 'Kalki 2898 AD (2024) [Hindi Dual Audio 1080p FHD]',
    cleanTitle: 'Kalki 2898 AD',
    year: '2024',
    poster: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80',
    url: 'https://bollystream.internal/movie/kalki-2898-ad',
    category: 'South Hindi Dubbed',
    languages: ['Hindi', 'Telugu', 'Dual Audio'],
    qualities: ['1080p FHD', '4K UHD'],
    isSeries: false,
    storyline: 'In a dystopian post-apocalyptic future, immortal Ashwatthama awaits the arrival of Vishnu’s final avatar, Kalki, while bounty hunter Bhairava seeks a ticket to the Complex.',
    trailerUrl: 'https://www.youtube.com/embed/kQDd1AhGIHk',
    imdbId: 'tt12735488',
    streamOptions: [
      {
        label: '⚡ Server 1: VidSrc 1080p Cinema Server',
        url: 'https://vidsrc.to/embed/movie/tt12735488',
        streamType: 'embed',
        serverType: 'vidsrc',
      },
      {
        label: '🌐 Server 2: 2Embed Cloud Mirror',
        url: 'https://www.2embed.cc/embed/tt12735488',
        streamType: 'embed',
        serverType: 'embed',
      }
    ]
  },
  {
    id: 'bolly-12th-fail',
    title: '12th Fail (2023) [Hindi 1080p FHD Full Movie]',
    cleanTitle: '12th Fail',
    year: '2023',
    poster: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
    url: 'https://bollystream.internal/movie/12th-fail-2023',
    category: 'Bollywood Cinema',
    languages: ['Hindi'],
    qualities: ['1080p FHD', '720p HD'],
    isSeries: false,
    storyline: 'Based on the true story of IPS officer Manoj Kumar Sharma, who rose from extreme poverty and failure in 12th grade to achieve his dream of becoming an IPS officer.',
    trailerUrl: 'https://www.youtube.com/embed/we3F6WQmQvM',
    imdbId: 'tt23849204',
    streamOptions: [
      {
        label: '⚡ Server 1: VidSrc 1080p Cinema Server',
        url: 'https://vidsrc.to/embed/movie/tt23849204',
        streamType: 'embed',
        serverType: 'vidsrc',
      },
      {
        label: '🌐 Server 2: 2Embed Mirror',
        url: 'https://www.2embed.cc/embed/tt23849204',
        streamType: 'embed',
        serverType: 'embed',
      }
    ]
  },
  {
    id: 'bolly-sacred-games',
    title: 'Sacred Games (2018-2019) [Hindi 1080p FHD Complete Series]',
    cleanTitle: 'Sacred Games',
    year: '2019',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    url: 'https://bollystream.internal/series/sacred-games',
    category: 'Web Series',
    languages: ['Hindi'],
    qualities: ['1080p FHD'],
    isSeries: true,
    storyline: 'A troubled Mumbai police officer receives an anonymous tip about impending doom from a notorious crime lord presumed dead.',
    trailerUrl: 'https://www.youtube.com/embed/28j8h0RRnq4',
    imdbId: 'tt6077448',
    streamOptions: [
      {
        label: '⚡ Server 1: VidSrc Sacred Games Server',
        url: 'https://vidsrc.to/embed/tv/tt6077448/1/1',
        streamType: 'embed',
        serverType: 'vidsrc',
      }
    ],
    episodes: [
      { episodeNumber: 1, seasonNumber: 1, title: 'Episode 1: Ashwathama', url: 'https://vidsrc.to/embed/tv/tt6077448/1/1', streamType: 'embed' },
      { episodeNumber: 2, seasonNumber: 1, title: 'Episode 2: Halahala', url: 'https://vidsrc.to/embed/tv/tt6077448/1/2', streamType: 'embed' },
      { episodeNumber: 3, seasonNumber: 1, title: 'Episode 3: Atapi Vatapi', url: 'https://vidsrc.to/embed/tv/tt6077448/1/3', streamType: 'embed' },
      { episodeNumber: 4, seasonNumber: 1, title: 'Episode 4: Brahmahatya', url: 'https://vidsrc.to/embed/tv/tt6077448/1/4', streamType: 'embed' },
      { episodeNumber: 5, seasonNumber: 1, title: 'Episode 5: Sarama', url: 'https://vidsrc.to/embed/tv/tt6077448/1/5', streamType: 'embed' },
    ]
  },
  {
    id: 'bolly-jawan',
    title: 'Jawan (2023) [Hindi 1080p FHD Extended Cut]',
    cleanTitle: 'Jawan',
    year: '2023',
    poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
    url: 'https://bollystream.internal/movie/jawan-2023',
    category: 'Bollywood Cinema',
    languages: ['Hindi (Original)'],
    qualities: ['1080p FHD', '4K UHD'],
    isSeries: false,
    storyline: 'A prison warden recruits inmates to execute high-profile heists that address corruption and social injustice in Indian society.',
    trailerUrl: 'https://www.youtube.com/embed/MWOlnZSnXpc',
    imdbId: 'tt15354916',
    streamOptions: [
      {
        label: '⚡ Server 1: VidSrc 1080p Cinema Server',
        url: 'https://vidsrc.to/embed/movie/tt15354916',
        streamType: 'embed',
        serverType: 'vidsrc',
      },
      {
        label: '🌐 Server 2: 2Embed Cloud Mirror',
        url: 'https://www.2embed.cc/embed/tt15354916',
        streamType: 'embed',
        serverType: 'embed',
      }
    ]
  }
];

// 2. Open Hindi Cinema Archive (Golden Classics)
export const HINDI_ARCHIVE_VAULT: ProviderMovie[] = [
  {
    id: 'archive-sholay-1975',
    title: 'Sholay (1975) [Hindi Remastered 1080p HD]',
    cleanTitle: 'Sholay',
    year: '1975',
    poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
    url: 'https://archive.org/details/sholay-1975-remastered',
    category: 'Golden Classics',
    languages: ['Hindi'],
    qualities: ['1080p HD Remaster'],
    isSeries: false,
    storyline: 'After his family is murdered by the ruthless dacoit Gabbar Singh, former police officer Thakur Baldev Singh enlists two ex-convicts, Veeru and Jai, to capture him.',
    trailerUrl: 'https://www.youtube.com/embed/C2u33X-w4A0',
    imdbId: 'tt0073707',
    streamOptions: [
      {
        label: '⚡ Server 1: Archive Direct 1080p MP4',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        streamType: 'mp4',
        serverType: 'direct',
      },
      {
        label: '🌐 Server 2: VidSrc Cinema Mirror',
        url: 'https://vidsrc.to/embed/movie/tt0073707',
        streamType: 'embed',
        serverType: 'vidsrc',
      }
    ]
  },
  {
    id: 'archive-deewaar-1975',
    title: 'Deewaar (1975) [Hindi 1080p Classic Remaster]',
    cleanTitle: 'Deewaar',
    year: '1975',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    url: 'https://archive.org/details/deewaar-1975-classic',
    category: 'Golden Classics',
    languages: ['Hindi'],
    qualities: ['1080p HD'],
    isSeries: false,
    storyline: 'Two brothers who grow up on the streets of Mumbai find themselves on opposite sides of the law — one a defiant underworld don, the other an upright police officer.',
    trailerUrl: 'https://www.youtube.com/embed/W9l6z-k_4hY',
    imdbId: 'tt0072860',
    streamOptions: [
      {
        label: '⚡ Server 1: VidSrc Classic Stream',
        url: 'https://vidsrc.to/embed/movie/tt0072860',
        streamType: 'embed',
        serverType: 'vidsrc',
      }
    ]
  },
  {
    id: 'archive-anand-1971',
    title: 'Anand (1971) [Hindi 1080p Master]',
    cleanTitle: 'Anand',
    year: '1971',
    poster: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=800&q=80',
    url: 'https://archive.org/details/anand-1971-master',
    category: 'Golden Classics',
    languages: ['Hindi'],
    qualities: ['1080p HD'],
    isSeries: false,
    storyline: 'The story of a terminally ill man who wishes to live life to the fullest and spreads joy to everyone around him before his time runs out.',
    imdbId: 'tt0066763',
    streamOptions: [
      {
        label: '⚡ Server 1: VidSrc Classic Server',
        url: 'https://vidsrc.to/embed/movie/tt0066763',
        streamType: 'embed',
        serverType: 'vidsrc',
      }
    ]
  }
];

// 3. Dynamic HDHub4u Mirror Engine Manager
export const KNOWN_HDHUB_MIRRORS = [
  'https://new11.hdhub4u.cl',
  'https://hdhub4u.deal',
  'https://hdhub4u.mov',
  'https://hdhub4u.tv',
  'https://hdhub4u.ms',
  'https://hdhub4u.fans',
  'https://hdhub4u.lat',
  'https://new12.hdhub4u.cl',
  'https://new10.hdhub4u.cl',
];

export let activeHDHubMirror = 'https://new11.hdhub4u.cl';

export function setActiveHDHubMirror(domain: string) {
  const clean = domain.replace(/\/+$/, '');
  activeHDHubMirror = clean;
  console.log(`[MirrorEngine] Active HDHub mirror set to: ${clean}`);
  return activeHDHubMirror;
}

// 4. VegaMovies Dynamic Mirror Engine Manager (Backup Provider)
export const KNOWN_VEGAMOVIES_MIRRORS = [
  'https://vegamovies.lease',
  'https://1vegamovies.tw',
  'https://vglist.nl',
  'https://1vegamovies.pics',
  'https://vegamovies.yt',
];

export let activeVegaMirror = 'https://vegamovies.lease';

export function setActiveVegaMirror(domain: string) {
  const clean = domain.replace(/\/+$/, '');
  activeVegaMirror = clean;
  console.log(`[VegaMirrorEngine] Active VegaMovies mirror set to: ${clean}`);
  return activeVegaMirror;
}

export async function pingMirror(domain: string): Promise<{ domain: string; isOnline: boolean; latencyMs: number; finalUrl: string }> {
  const t0 = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(domain, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeout);
    return {
      domain,
      isOnline: res.status >= 200 && res.status < 400,
      latencyMs: Date.now() - t0,
      finalUrl: res.url
    };
  } catch {
    return {
      domain,
      isOnline: false,
      latencyMs: Date.now() - t0,
      finalUrl: domain
    };
  }
}

