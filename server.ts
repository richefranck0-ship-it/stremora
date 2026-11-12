import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import type * as WebPushModule from 'web-push';

const require = createRequire(import.meta.url);
const webpush = require('web-push') as typeof WebPushModule;

const ROOT_DIR = import.meta.dirname;
const DATA_DIR = path.join(ROOT_DIR, '.data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';
const DEFAULT_TMDB_KEY = '844dba0bfd8f3a4f3799f6130ef9e335';
const ADMIN_COOKIE_NAME = 'streamora_admin_session';

interface PushSubscriptionRecord {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: string;
  userAgent?: string;
}

interface PushHistoryRecord {
  id: string;
  title: string;
  message: string;
  image?: string;
  link?: string;
  sentAt: string;
  targetedCount: number;
  deliveredCount: number;
  failedCount: number;
}

interface PartnershipRecord {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  placementInterest?: string;
  message: string;
  createdAt: string;
  status: 'new' | 'reviewed';
}

interface StoreState {
  vapid: {
    publicKey: string;
    privateKey: string;
    subject: string;
  };
  sessionSecret: string;
  adminPasswordHash?: string;
  pushEnabled: boolean;
  pushSubscriptions: PushSubscriptionRecord[];
  pushHistory: PushHistoryRecord[];
  partnerships: PartnershipRecord[];
  customMedia: any[];
  ads: any[] | null;
  liveChannels: any[];
  traffic: {
    totalVisitors: number;
    pageViews: number;
    streamsStarted: number;
    totalWatchHours: number;
    topTitles: { title: string; views: number }[];
    dailyViews: { date: string; views: number; visitors: number }[];
    devices: { mobile: number; tablet: number; desktop: number };
    languages: Record<string, number>;
    topRoutes: { path: string; views: number }[];
  };
}

function createEmptyTraffic() {
  return {
    totalVisitors: 0,
    pageViews: 0,
    streamsStarted: 0,
    totalWatchHours: 0,
    topTitles: [] as { title: string; views: number }[],
    dailyViews: [] as { date: string; views: number; visitors: number }[],
    devices: { mobile: 0, tablet: 0, desktop: 0 },
    languages: {} as Record<string, number>,
    topRoutes: [] as { path: string; views: number }[],
  };
}

function normalizeTraffic(raw: any) {
  const empty = createEmptyTraffic();
  if (!raw || typeof raw !== 'object') return empty;
  return {
    totalVisitors: Number(raw.totalVisitors || 0),
    pageViews: Number(raw.pageViews || 0),
    streamsStarted: Number(raw.streamsStarted || 0),
    totalWatchHours: Number(raw.totalWatchHours || 0),
    topTitles: Array.isArray(raw.topTitles) ? raw.topTitles : [],
    dailyViews: Array.isArray(raw.dailyViews) ? raw.dailyViews : [],
    devices: {
      mobile: Number(raw.devices?.mobile || 0),
      tablet: Number(raw.devices?.tablet || 0),
      desktop: Number(raw.devices?.desktop || 0),
    },
    languages: raw.languages && typeof raw.languages === 'object' ? raw.languages : {},
    topRoutes: Array.isArray(raw.topRoutes) ? raw.topRoutes : [],
  };
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadStore(): StoreState {
  ensureDataDir();
  if (fs.existsSync(STORE_PATH)) {
    try {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.vapid?.publicKey && parsed.vapid?.privateKey) {
        return {
          pushEnabled: parsed.pushEnabled ?? true,
          pushSubscriptions: Array.isArray(parsed.pushSubscriptions) ? parsed.pushSubscriptions : [],
          pushHistory: Array.isArray(parsed.pushHistory) ? parsed.pushHistory : [],
          partnerships: Array.isArray(parsed.partnerships) ? parsed.partnerships : [],
          customMedia: Array.isArray(parsed.customMedia) ? parsed.customMedia : [],
          ads: Array.isArray(parsed.ads) ? parsed.ads : null,
          liveChannels: Array.isArray(parsed.liveChannels) ? parsed.liveChannels : [],
          traffic: normalizeTraffic(parsed.traffic),
          vapid: parsed.vapid,
          sessionSecret: parsed.sessionSecret || crypto.randomBytes(32).toString('hex'),
          adminPasswordHash: parsed.adminPasswordHash,
        };
      }
    } catch {
      // Recreate clean store below if corrupt
    }
  }

  const generatedKeys = webpush.generateVAPIDKeys();
  const initialStore: StoreState = {
    vapid: {
      publicKey: process.env.VAPID_PUBLIC_KEY || generatedKeys.publicKey,
      privateKey: process.env.VAPID_PRIVATE_KEY || generatedKeys.privateKey,
      subject: process.env.VAPID_SUBJECT || 'mailto:contact@streamora.app',
    },
    sessionSecret: process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    pushEnabled: true,
    pushSubscriptions: [],
    pushHistory: [],
    partnerships: [],
    customMedia: [],
    ads: null,
    liveChannels: [],
    traffic: createEmptyTraffic(),
  };
  fs.writeFileSync(STORE_PATH, JSON.stringify(initialStore, null, 2));
  return initialStore;
}

const store = loadStore();

// Override VAPID keys from environment if explicitly supplied
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  store.vapid.publicKey = process.env.VAPID_PUBLIC_KEY;
  store.vapid.privateKey = process.env.VAPID_PRIVATE_KEY;
}
if (process.env.VAPID_SUBJECT) {
  store.vapid.subject = process.env.VAPID_SUBJECT;
}
if (process.env.ADMIN_SESSION_SECRET) {
  store.sessionSecret = process.env.ADMIN_SESSION_SECRET;
}

function saveStore() {
  ensureDataDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

webpush.setVapidDetails(store.vapid.subject, store.vapid.publicKey, store.vapid.privateKey);

// --- Password & Signed Cookie Helpers ---
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyScryptPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function isAdminPasswordConfigured(): boolean {
  return Boolean(store.adminPasswordHash || (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length > 0));
}

function verifyAdminPassword(candidate: string): boolean {
  if (!candidate) return false;
  if (store.adminPasswordHash) {
    return verifyScryptPassword(candidate, store.adminPasswordHash);
  }
  const envPass = process.env.ADMIN_PASSWORD || '';
  if (!envPass) return false;
  return timingSafeCompare(candidate, envPass);
}

function signSessionToken(expiresAt: number): string {
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: expiresAt })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', store.sessionSecret)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', store.sessionSecret)
    .update(payload)
    .digest('base64url');
  if (!timingSafeCompare(sig, expectedSig)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    return parsed.role === 'admin' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie || '';
  const cookies: Record<string, string> = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      try {
        cookies[k] = decodeURIComponent(v);
      } catch {
        cookies[k] = v;
      }
    }
  });
  return cookies;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const cookies = parseCookies(req);
  if (!verifySessionToken(cookies[ADMIN_COOKIE_NAME])) {
    res.status(401).json({ error: 'Authentification administrateur requise.' });
    return;
  }
  next();
}

// --- TMDB Server Cache for SSR Meta & Sitemap ---
const tmdbServerCache = new Map<string, { ts: number; data: any }>();
const SERVER_CACHE_TTL = 1000 * 60 * 60;

async function fetchTmdbServer(
  endpoint: string,
  params: Record<string, string | number> = {},
  tmdbLang = 'fr-FR'
): Promise<any | null> {
  const apiKey = process.env.VITE_TMDB_API_KEY || DEFAULT_TMDB_KEY;
  const qs = new URLSearchParams({
    api_key: apiKey,
    language: tmdbLang,
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  }).toString();
  const key = `${endpoint}?${qs}`;
  const cached = tmdbServerCache.get(key);
  if (cached && Date.now() - cached.ts < SERVER_CACHE_TTL) {
    return cached.data;
  }
  try {
    const r = await fetch(`${TMDB_BASE}${endpoint}?${qs}`);
    if (!r.ok) return null;
    const data = await r.json();
    tmdbServerCache.set(key, { ts: Date.now(), data });
    return data;
  } catch {
    return null;
  }
}

type ServerLang = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ar';

interface ServerLocaleConfig {
  code: ServerLang;
  htmlLang: string;
  dir: 'ltr' | 'rtl';
  tmdbLang: string;
  ogLocale: string;
  hreflangs: string[];
  homeTitle: string;
  homeDesc: string;
  moviesTitle: string;
  moviesDesc: string;
  seriesTitle: string;
  seriesDesc: string;
  newsTitle: string;
  newsDesc: string;
  directTitle: string;
  directDesc: string;
  partnerTitle: string;
  partnerDesc: string;
}

const SERVER_LOCALES: Record<ServerLang, ServerLocaleConfig> = {
  fr: {
    code: 'fr',
    htmlLang: 'fr',
    dir: 'ltr',
    tmdbLang: 'fr-FR',
    ogLocale: 'fr_FR',
    hreflangs: ['fr', 'fr-FR', 'fr-CA', 'fr-BE', 'fr-CH'],
    homeTitle: 'STREAMORA — Films, Séries & Direct en Streaming',
    homeDesc: 'Découvrez films populaires, nouveautés, grands classiques, séries par épisode et chaînes en direct sur STREAMORA.',
    moviesTitle: 'Catalogue des Films — STREAMORA',
    moviesDesc: 'Explorez des milliers de films récents et classiques avec bandes-annonces, fiches détaillées et liens directs.',
    seriesTitle: 'Séries TV & Épisodes — STREAMORA',
    seriesDesc: 'Parcourez les séries populaires et classiques par saison et épisode avec liens directs sur STREAMORA.',
    newsTitle: 'Nouveautés Cinéma & Séries — STREAMORA',
    newsDesc: 'Les dernières sorties cinéma et nouvelles séries ajoutées automatiquement au catalogue STREAMORA.',
    directTitle: 'Direct Live & Flux Vidéo — STREAMORA',
    directDesc: 'Regardez et diffusez des chaînes et flux vidéo en direct MP4 et HLS sur mobile et ordinateur.',
    partnerTitle: 'Partenariat et publicité — STREAMORA',
    partnerDesc: 'Promouvez votre entreprise, votre marque ou vos services sur STREAMORA grâce à nos espaces publicitaires ciblés.',
  },
  en: {
    code: 'en',
    htmlLang: 'en',
    dir: 'ltr',
    tmdbLang: 'en-US',
    ogLocale: 'en_US',
    hreflangs: ['en', 'en-US', 'en-GB', 'en-CA'],
    homeTitle: 'STREAMORA — Movies, TV Series & Live Streaming',
    homeDesc: 'Discover trending movies, classics, full TV series by episode, trailers and live streams worldwide on STREAMORA.',
    moviesTitle: 'Movies Catalog — STREAMORA',
    moviesDesc: 'Explore new releases and timeless classic movies with trailers, cast details and direct links on STREAMORA.',
    seriesTitle: 'TV Series & Episodes — STREAMORA',
    seriesDesc: 'Browse popular and classic TV series organized by season and episode with direct links on STREAMORA.',
    newsTitle: 'New Movies & Series Releases — STREAMORA',
    newsDesc: 'Latest cinema releases and trending shows automatically updated on STREAMORA.',
    directTitle: 'Live Direct Channels & Streams — STREAMORA',
    directDesc: 'Watch and share direct MP4 and HLS live video channels on mobile and desktop with STREAMORA.',
    partnerTitle: 'Partnerships & Advertising — STREAMORA',
    partnerDesc: 'Promote your brand, products or services to an international streaming audience on STREAMORA.',
  },
  es: {
    code: 'es',
    htmlLang: 'es',
    dir: 'ltr',
    tmdbLang: 'es-ES',
    ogLocale: 'es_ES',
    hreflangs: ['es', 'es-ES', 'es-MX', 'es-419'],
    homeTitle: 'STREAMORA — Películas, Series y Directo Online',
    homeDesc: 'Descubre películas populares, clásicos, series completas por episodio, tráileres y canales en directo en STREAMORA.',
    moviesTitle: 'Catálogo de Películas — STREAMORA',
    moviesDesc: 'Explora estrenos y películas clásicas con reparto, sinopsis, tráileres y enlaces directos en STREAMORA.',
    seriesTitle: 'Series y Episodios — STREAMORA',
    seriesDesc: 'Encuentra tus series favoritas por temporada y episodio con enlaces directos en STREAMORA.',
    newsTitle: 'Estrenos de Cine y Series — STREAMORA',
    newsDesc: 'Los últimos lanzamientos de cine y televisión actualizados en STREAMORA.',
    directTitle: 'Canales en Directo y Live — STREAMORA',
    directDesc: 'Reproduce canales y transmisiones en directo MP4 y HLS en móvil y ordenador.',
    partnerTitle: 'Publicidad y Alianzas — STREAMORA',
    partnerDesc: 'Promociona tu marca y servicios ante una audiencia global en STREAMORA.',
  },
  de: {
    code: 'de',
    htmlLang: 'de',
    dir: 'ltr',
    tmdbLang: 'de-DE',
    ogLocale: 'de_DE',
    hreflangs: ['de', 'de-DE', 'de-AT', 'de-CH'],
    homeTitle: 'STREAMORA — Filme, Serien & Live-Streams',
    homeDesc: 'Entdecke aktuelle Filme, Klassiker, komplette Serien nach Episoden, Trailer und Live-Kanäle auf STREAMORA.',
    moviesTitle: 'Filmkatalog — STREAMORA',
    moviesDesc: 'Durchsuche beliebte Filme, Neuheiten und Klassiker mit Trailern und Direktlinks auf STREAMORA.',
    seriesTitle: 'Serien & Episoden — STREAMORA',
    seriesDesc: 'Alle Staffeln und Episoden beliebter und klassischer Serien mit Direktlinks auf STREAMORA.',
    newsTitle: 'Neuheiten Kino & Serien — STREAMORA',
    newsDesc: 'Die neuesten Kinostarts und Serien-Highlights auf STREAMORA.',
    directTitle: 'Live-Kanäle & Direkt-Streams — STREAMORA',
    directDesc: 'Spiele MP4- und HLS-Livestreams nahtlos auf Smartphone und Desktop ab.',
    partnerTitle: 'Werbung & Partnerschaften — STREAMORA',
    partnerDesc: 'Präsentiere dein Unternehmen und deine Angebote zielgerichtet auf STREAMORA.',
  },
  pt: {
    code: 'pt',
    htmlLang: 'pt',
    dir: 'ltr',
    tmdbLang: 'pt-PT',
    ogLocale: 'pt_PT',
    hreflangs: ['pt', 'pt-PT', 'pt-BR'],
    homeTitle: 'STREAMORA — Filmes, Séries e Direto Online',
    homeDesc: 'Descubra filmes populares, clássicos, séries por temporada e episódio, trailers e canais ao vivo na STREAMORA.',
    moviesTitle: 'Catálogo de Filmes — STREAMORA',
    moviesDesc: 'Explore estreias e clássicos do cinema com sinopses, elenco e trailers na STREAMORA.',
    seriesTitle: 'Séries e Episódios — STREAMORA',
    seriesDesc: 'Navegue por temporadas e episódios completos com links diretos na STREAMORA.',
    newsTitle: 'Novidades Cinema e Séries — STREAMORA',
    newsDesc: 'Os lançamentos mais recentes de filmes e séries na STREAMORA.',
    directTitle: 'Canais ao Vivo & Direto — STREAMORA',
    directDesc: 'Assista e adicione transmissões diretas MP4 e HLS no telemóvel e computador.',
    partnerTitle: 'Parcerias e Publicidade — STREAMORA',
    partnerDesc: 'Promova a sua marca para uma audiência internacional na STREAMORA.',
  },
  ar: {
    code: 'ar',
    htmlLang: 'ar',
    dir: 'rtl',
    tmdbLang: 'ar-SA',
    ogLocale: 'ar_SA',
    hreflangs: ['ar', 'ar-SA'],
    homeTitle: 'STREAMORA — أفلام ومسلسلات وبث مباشر',
    homeDesc: 'اكتشف أحدث الأفلام والكلاسيكيات والمسلسلات حسب الحلقات والعروض الترويجية والبث المباشر على STREAMORA.',
    moviesTitle: 'دليل الأفلام — STREAMORA',
    moviesDesc: 'تصفح أحدث الأفلام والأفلام الكلاسيكية مع التفاصيل والعروض الترويجية على STREAMORA.',
    seriesTitle: 'المسلسلات والحلقات — STREAMORA',
    seriesDesc: 'تصفح المواسم والحلقات الكاملة مع روابط مباشرة على STREAMORA.',
    newsTitle: 'أحدث الإصدارات — STREAMORA',
    newsDesc: 'أحدث إصدارات السينما والمسلسلات المضافة تلقائياً إلى STREAMORA.',
    directTitle: 'القنوات والبث المباشر — STREAMORA',
    directDesc: 'شاهد وشغّل روابط البث المباشر MP4 وHLS على الهاتف والكمبيوتر.',
    partnerTitle: 'الشراكة والإعلان — STREAMORA',
    partnerDesc: 'روّج لعلامتك التجارية وخدماتك عبر المساحات الإعلانية على STREAMORA.',
  },
};

function resolveServerLang(req: Request): ServerLocaleConfig {
  const raw = typeof req.query?.lang === 'string' ? req.query.lang.toLowerCase().split(/[-_]/)[0] : '';
  if (raw && raw in SERVER_LOCALES) {
    return SERVER_LOCALES[raw as ServerLang];
  }
  return SERVER_LOCALES.fr;
}

function buildLocalizedUrl(origin: string, cleanPath: string, lang: ServerLang): string {
  const normalized = cleanPath === '/' ? '/' : cleanPath;
  return lang === 'fr' ? `${origin}${normalized}` : `${origin}${normalized}?lang=${lang}`;
}

function extractIdFromSlug(param: string): string {
  const decoded = decodeURIComponent(param).trim();
  if (decoded.startsWith('custom_')) return decoded;
  const m = decoded.match(/^(\d+)(?:-|$)/);
  if (m) return m[1];
  const p = decoded.match(/^(?:movie|tv)-(\d+)/);
  if (p) return p[1];
  return decoded;
}

function slugify(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function escapeHtmlAttr(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getBaseOrigin(req: Request): string {
  if (process.env.APP_URL && process.env.APP_URL.startsWith('http')) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

interface SsrMeta {
  title: string;
  description: string;
  image: string;
  type: string;
  url: string;
  origin: string;
  cleanPath: string;
  locale: ServerLocaleConfig;
  noindex?: boolean;
  jsonLd: Record<string, unknown>;
}

async function resolveSsrMeta(req: Request): Promise<SsrMeta> {
  const origin = getBaseOrigin(req);
  const locale = resolveServerLang(req);
  const cleanPath = (req.path || '/').replace(/\/+$/, '') || '/';
  const fullUrl = buildLocalizedUrl(origin, cleanPath, locale.code);

  const defaultMeta: SsrMeta = {
    title: locale.homeTitle,
    description: locale.homeDesc,
    image: `${origin}/images/fallback-backdrop.jpg`,
    type: 'website',
    url: fullUrl,
    origin,
    cleanPath,
    locale,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${origin}/#organization`,
          name: 'STREAMORA',
          url: origin,
          logo: {
            '@type': 'ImageObject',
            url: `${origin}/pwa-512x512.png`,
            width: 512,
            height: 512,
          },
        },
        {
          '@type': 'WebSite',
          '@id': `${origin}/#website`,
          name: 'STREAMORA',
          url: origin,
          publisher: { '@id': `${origin}/#organization` },
          inLanguage: ['fr-FR', 'en-US', 'es-ES', 'de-DE', 'pt-PT', 'ar-SA'],
          potentialAction: {
            '@type': 'SearchAction',
            target: `${origin}/?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
      ],
    },
  };

  if (cleanPath === '/admin') {
    return {
      ...defaultMeta,
      title: 'Administration — STREAMORA',
      noindex: true,
    };
  }

  if (cleanPath === '/partenariat') {
    return {
      ...defaultMeta,
      title: locale.partnerTitle,
      description: locale.partnerDesc,
      image: `${origin}/images/partnership-hero.jpg`,
    };
  }

  if (cleanPath === '/movies') {
    return {
      ...defaultMeta,
      title: locale.moviesTitle,
      description: locale.moviesDesc,
    };
  }

  if (cleanPath === '/series') {
    return {
      ...defaultMeta,
      title: locale.seriesTitle,
      description: locale.seriesDesc,
    };
  }

  if (cleanPath === '/news') {
    return {
      ...defaultMeta,
      title: locale.newsTitle,
      description: locale.newsDesc,
    };
  }

  if (cleanPath === '/direct') {
    return {
      ...defaultMeta,
      title: locale.directTitle,
      description: locale.directDesc,
    };
  }

  if (cleanPath.startsWith('/movie/')) {
    const rawParam = cleanPath.slice('/movie/'.length);
    const id = extractIdFromSlug(rawParam);
    const custom = store.customMedia.find(
      (m) => m.type === 'movie' && (String(m.id) === id || String(m.tmdbId) === id || String(m.id) === rawParam)
    );
    if (custom) {
      return {
        ...defaultMeta,
        title: `${custom.title} (${custom.releaseYear}) — STREAMORA`,
        description: custom.synopsis?.slice(0, 160) || defaultMeta.description,
        image: custom.backdrop || custom.poster || defaultMeta.image,
        type: 'video.movie',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Movie',
          name: custom.title,
          description: custom.synopsis,
          datePublished: custom.releaseDate,
          genre: custom.genres,
          inLanguage: locale.tmdbLang,
          image: custom.poster,
          url: fullUrl,
        },
      };
    }

    if (/^\d+$/.test(id)) {
      const movie = await fetchTmdbServer(`/movie/${id}`, {}, locale.tmdbLang);
      if (movie && movie.title) {
        const year = movie.release_date ? movie.release_date.split('-')[0] : '';
        const img = movie.backdrop_path
          ? `${TMDB_IMG}/w1280${movie.backdrop_path}`
          : movie.poster_path
          ? `${TMDB_IMG}/w600_and_h900_bestv2${movie.poster_path}`
          : defaultMeta.image;
        return {
          ...defaultMeta,
          title: `${movie.title}${year ? ` (${year})` : ''} — STREAMORA`,
          description: (movie.overview || defaultMeta.description).slice(0, 160),
          image: img,
          type: 'video.movie',
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Movie',
            name: movie.title,
            description: movie.overview,
            datePublished: movie.release_date,
            inLanguage: locale.tmdbLang,
            genre: Array.isArray(movie.genres) ? movie.genres.map((g: any) => g.name) : undefined,
            ...(movie.vote_average && movie.vote_count
              ? {
                  aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: Number(movie.vote_average.toFixed(1)),
                    bestRating: 10,
                    ratingCount: movie.vote_count,
                  },
                }
              : {}),
            image: movie.poster_path ? `${TMDB_IMG}/w600_and_h900_bestv2${movie.poster_path}` : img,
            url: fullUrl,
          },
        };
      }
    }
  }

  if (cleanPath.startsWith('/series/')) {
    const rawParam = cleanPath.slice('/series/'.length);
    const id = extractIdFromSlug(rawParam);
    const custom = store.customMedia.find(
      (m) => m.type === 'tv' && (String(m.id) === id || String(m.tmdbId) === id || String(m.id) === rawParam)
    );
    if (custom) {
      return {
        ...defaultMeta,
        title: `${custom.title} (${custom.releaseYear}) — STREAMORA`,
        description: custom.synopsis?.slice(0, 160) || defaultMeta.description,
        image: custom.backdrop || custom.poster || defaultMeta.image,
        type: 'video.tv_show',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'TVSeries',
          name: custom.title,
          description: custom.synopsis,
          genre: custom.genres,
          inLanguage: locale.tmdbLang,
          image: custom.poster,
          url: fullUrl,
        },
      };
    }

    if (/^\d+$/.test(id)) {
      const tv = await fetchTmdbServer(`/tv/${id}`, {}, locale.tmdbLang);
      if (tv && tv.name) {
        const year = tv.first_air_date ? tv.first_air_date.split('-')[0] : '';
        const img = tv.backdrop_path
          ? `${TMDB_IMG}/w1280${tv.backdrop_path}`
          : tv.poster_path
          ? `${TMDB_IMG}/w600_and_h900_bestv2${tv.poster_path}`
          : defaultMeta.image;
        return {
          ...defaultMeta,
          title: `${tv.name}${year ? ` (${year})` : ''} — STREAMORA`,
          description: (tv.overview || defaultMeta.description).slice(0, 160),
          image: img,
          type: 'video.tv_show',
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'TVSeries',
            name: tv.name,
            description: tv.overview,
            numberOfSeasons: tv.number_of_seasons,
            inLanguage: locale.tmdbLang,
            genre: Array.isArray(tv.genres) ? tv.genres.map((g: any) => g.name) : undefined,
            ...(tv.vote_average && tv.vote_count
              ? {
                  aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: Number(tv.vote_average.toFixed(1)),
                    bestRating: 10,
                    ratingCount: tv.vote_count,
                  },
                }
              : {}),
            image: tv.poster_path ? `${TMDB_IMG}/w600_and_h900_bestv2${tv.poster_path}` : img,
            url: fullUrl,
          },
        };
      }
    }
  }

  if (cleanPath.startsWith('/episode/')) {
    const epParam = cleanPath.slice('/episode/'.length);
    const epMatch = epParam.match(/^ep-(\d+)-(\d+)-(\d+)$/);
    if (epMatch) {
      const [, tvId, seasonNum, epNum] = epMatch;
      const [tv, epData] = await Promise.all([
        fetchTmdbServer(`/tv/${tvId}`, {}, locale.tmdbLang),
        fetchTmdbServer(`/tv/${tvId}/season/${seasonNum}/episode/${epNum}`, {}, locale.tmdbLang),
      ]);
      const seriesTitle = tv?.name || 'STREAMORA';
      const epTitle = epData?.name || `Episode ${epNum}`;
      const img = epData?.still_path
        ? `${TMDB_IMG}/w1280${epData.still_path}`
        : tv?.backdrop_path
        ? `${TMDB_IMG}/w1280${tv.backdrop_path}`
        : defaultMeta.image;
      return {
        ...defaultMeta,
        title: `${seriesTitle} S${seasonNum}E${epNum} : ${epTitle} — STREAMORA`,
        description: (epData?.overview || tv?.overview || defaultMeta.description).slice(0, 160),
        image: img,
        type: 'video.episode',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'TVEpisode',
          name: epTitle,
          episodeNumber: Number(epNum),
          inLanguage: locale.tmdbLang,
          partOfSeason: { '@type': 'TVSeason', seasonNumber: Number(seasonNum) },
          partOfSeries: { '@type': 'TVSeries', name: seriesTitle },
          description: epData?.overview,
          url: fullUrl,
        },
      };
    }
  }

  return defaultMeta;
}

function injectSsrMetaIntoHtml(html: string, meta: SsrMeta): string {
  const safeTitle = escapeHtmlAttr(meta.title);
  const safeDesc = escapeHtmlAttr(meta.description);
  const safeImg = escapeHtmlAttr(meta.image);
  const safeUrl = escapeHtmlAttr(meta.url);
  const safeType = escapeHtmlAttr(meta.type);

  let updated = html
    .replace(/<html\b[^>]*>/i, `<html lang="${meta.locale.htmlLang}" dir="${meta.locale.dir}" class="dark">`)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${safeDesc}" />`
    )
    .replace(
      /<meta\s+property="og:locale"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:locale" content="${meta.locale.ogLocale}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${safeTitle}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${safeDesc}" />`
    )
    .replace(
      /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:type" content="${safeType}" />`
    )
    .replace(
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image" content="${safeImg}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:title" content="${safeTitle}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:description" content="${safeDesc}" />`
    )
    .replace(
      /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:image" content="${safeImg}" />`
    )
    .replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="robots" content="${meta.noindex ? 'noindex, nofollow' : 'index, follow'}" />`
    )
    .replace(
      /<script\s+type="application\/ld\+json"\s+id="streamora-jsonld">[\s\S]*?<\/script>/i,
      `<script type="application/ld+json" id="streamora-jsonld">${JSON.stringify(meta.jsonLd)}</script>`
    );

  const hreflangTags: string[] = [];
  if (!meta.noindex) {
    hreflangTags.push(
      `<link rel="alternate" hreflang="x-default" href="${escapeHtmlAttr(buildLocalizedUrl(meta.origin, meta.cleanPath, 'fr'))}" />`
    );
    for (const loc of Object.values(SERVER_LOCALES)) {
      const href = escapeHtmlAttr(buildLocalizedUrl(meta.origin, meta.cleanPath, loc.code));
      for (const hl of loc.hreflangs) {
        hreflangTags.push(`<link rel="alternate" hreflang="${hl}" href="${href}" />`);
      }
    }
  }

  const extraHeadTags = [
    `<link rel="canonical" href="${safeUrl}" />`,
    ...hreflangTags,
    `<meta property="og:url" content="${safeUrl}" />`,
  ].join('\n    ');

  updated = updated.replace('</head>', `    ${extraHeadTags}\n  </head>`);
  return updated;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '4mb' }));

  // --- Health ---
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'streamora', pushEnabled: store.pushEnabled });
  });

  // --- Admin Auth (Server-Side Only, Never Exposed in Client HTML/JS) ---
  app.get('/api/admin/session', (req, res) => {
    const cookies = parseCookies(req);
    const authenticated = verifySessionToken(cookies[ADMIN_COOKIE_NAME]);
    res.json({
      authenticated,
      configured: isAdminPasswordConfigured(),
    });
  });

  app.post('/api/admin/login', (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!isAdminPasswordConfigured()) {
      res.status(503).json({
        error: "ADMIN_PASSWORD n'est pas encore configuré dans l'environnement serveur (.env).",
      });
      return;
    }
    if (!verifyAdminPassword(password)) {
      res.status(401).json({ error: 'Mot de passe administrateur incorrect.' });
      return;
    }
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const token = signSessionToken(expiresAt);
    res.cookie(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PRODUCTION,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ authenticated: true });
  });

  app.post('/api/admin/logout', (_req, res) => {
    res.clearCookie(ADMIN_COOKIE_NAME, { path: '/' });
    res.json({ authenticated: false });
  });

  app.post('/api/admin/change-password', requireAdmin, (req, res) => {
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';
    if (!verifyAdminPassword(currentPassword)) {
      res.status(403).json({ error: 'Le mot de passe actuel est incorrect.' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
      return;
    }
    store.adminPasswordHash = hashPassword(newPassword);
    saveStore();
    res.json({ ok: true, message: 'Mot de passe administrateur mis à jour avec hachage sécurisé.' });
  });

  // --- Web Push Public Endpoints ---
  app.get('/api/push/vapid-public-key', (_req, res) => {
    res.json({
      enabled: store.pushEnabled,
      publicKey: process.env.VAPID_PUBLIC_KEY || store.vapid.publicKey,
    });
  });

  app.get('/api/push/status', (_req, res) => {
    res.json({
      enabled: store.pushEnabled,
      subscribersCount: store.pushSubscriptions.length,
    });
  });

  app.post('/api/push/subscribe', (req, res) => {
    if (!store.pushEnabled) {
      res.status(403).json({ error: 'Les notifications push sont actuellement désactivées.' });
      return;
    }
    const sub = req.body?.subscription || req.body;
    if (!sub || typeof sub.endpoint !== 'string' || !sub.keys?.p256dh || !sub.keys?.auth) {
      res.status(400).json({ error: 'Objet PushSubscription invalide.' });
      return;
    }
    const existingIndex = store.pushSubscriptions.findIndex((s) => s.endpoint === sub.endpoint);
    const record: PushSubscriptionRecord = {
      endpoint: sub.endpoint,
      expirationTime: sub.expirationTime ?? null,
      keys: {
        p256dh: String(sub.keys.p256dh),
        auth: String(sub.keys.auth),
      },
      createdAt: new Date().toISOString(),
      userAgent: req.get('user-agent') || '',
    };
    if (existingIndex >= 0) {
      store.pushSubscriptions[existingIndex] = record;
    } else {
      store.pushSubscriptions.push(record);
    }
    saveStore();
    res.json({ ok: true, subscribersCount: store.pushSubscriptions.length });
  });

  app.post('/api/push/unsubscribe', (req, res) => {
    const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : '';
    if (!endpoint) {
      res.status(400).json({ error: 'Endpoint requis.' });
      return;
    }
    store.pushSubscriptions = store.pushSubscriptions.filter((s) => s.endpoint !== endpoint);
    saveStore();
    res.json({ ok: true, subscribersCount: store.pushSubscriptions.length });
  });

  const isVapidConfiguredFromEnv = Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );

  async function broadcastPushNotification(opts: {
    title: string;
    message: string;
    image?: string;
    link?: string;
    sound?: boolean;
    tag?: string;
    mediaType?: 'movie' | 'tv' | 'episode';
    mediaId?: string | number;
  }) {
    const activePublicKey = process.env.VAPID_PUBLIC_KEY || store.vapid.publicKey;
    const activePrivateKey = process.env.VAPID_PRIVATE_KEY || store.vapid.privateKey;
    const activeSubject = process.env.VAPID_SUBJECT || store.vapid.subject;
    webpush.setVapidDetails(activeSubject, activePublicKey, activePrivateKey);

    const payload = JSON.stringify({
      title: opts.title,
      body: opts.message,
      message: opts.message,
      image: opts.image || undefined,
      icon: '/pwa-192x192.png',
      url: opts.link || '/',
      sound: opts.sound !== false,
      tag: opts.tag,
      mediaType: opts.mediaType,
      mediaId: opts.mediaId,
    });

    const targets = [...store.pushSubscriptions];
    let deliveredCount = 0;
    let failedCount = 0;
    const expiredEndpoints = new Set<string>();

    await Promise.all(
      targets.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              expirationTime: sub.expirationTime ?? undefined,
              keys: sub.keys,
            },
            payload
          );
          deliveredCount += 1;
        } catch (err: any) {
          failedCount += 1;
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            expiredEndpoints.add(sub.endpoint);
          }
        }
      })
    );

    if (expiredEndpoints.size > 0) {
      store.pushSubscriptions = store.pushSubscriptions.filter((s) => !expiredEndpoints.has(s.endpoint));
    }

    const entry: PushHistoryRecord = {
      id: `push_${Date.now()}`,
      title: opts.title,
      message: opts.message,
      image: opts.image || undefined,
      link: opts.link || '/',
      sentAt: new Date().toISOString(),
      targetedCount: targets.length,
      deliveredCount,
      failedCount,
    };
    store.pushHistory.unshift(entry);
    if (store.pushHistory.length > 50) {
      store.pushHistory = store.pushHistory.slice(0, 50);
    }
    saveStore();

    return {
      entry,
      cleanedExpired: expiredEndpoints.size,
      subscribersCount: store.pushSubscriptions.length,
    };
  }

  // --- Web Push Admin Endpoints ---
  app.get('/api/admin/push', requireAdmin, (_req, res) => {
    const totalDelivered = store.pushHistory.reduce((acc, h) => acc + h.deliveredCount, 0);
    const totalFailed = store.pushHistory.reduce((acc, h) => acc + h.failedCount, 0);
    res.json({
      enabled: store.pushEnabled,
      subscribersCount: store.pushSubscriptions.length,
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || store.vapid.publicKey,
      vapidFromEnv: isVapidConfiguredFromEnv,
      history: store.pushHistory,
      totals: {
        campaigns: store.pushHistory.length,
        delivered: totalDelivered,
        failed: totalFailed,
      },
    });
  });

  app.post('/api/admin/push/toggle', requireAdmin, (req, res) => {
    const enabled = typeof req.body?.enabled === 'boolean' ? req.body.enabled : !store.pushEnabled;
    store.pushEnabled = enabled;
    saveStore();
    res.json({ ok: true, enabled: store.pushEnabled });
  });

  app.post('/api/admin/push/send', requireAdmin, async (req, res) => {
    if (!store.pushEnabled) {
      res.status(400).json({ error: 'Activez d’abord le système de notifications push.' });
      return;
    }
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const image = typeof req.body?.image === 'string' ? req.body.image.trim() : '';
    const link = typeof req.body?.link === 'string' ? req.body.link.trim() : '/';
    const sound = req.body?.sound !== false;

    if (!title || !message) {
      res.status(400).json({ error: 'Titre et message requis pour envoyer la notification.' });
      return;
    }

    const result = await broadcastPushNotification({
      title,
      message,
      image: image || undefined,
      link: link || '/',
      sound,
    });

    res.json({
      ok: true,
      ...result,
    });
  });

  // --- Partnerships ("Partenariat et publicité") ---
  app.post('/api/partnerships', (req, res) => {
    const companyName = String(req.body?.companyName || '').trim();
    const contactName = String(req.body?.contactName || '').trim();
    const email = String(req.body?.email || '').trim();
    const placementInterest = String(req.body?.placementInterest || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!companyName || !email || !message) {
      res.status(400).json({ error: 'Veuillez renseigner votre entreprise, email et message.' });
      return;
    }
    const item: PartnershipRecord = {
      id: `part_${Date.now()}`,
      companyName,
      contactName: contactName || companyName,
      email,
      placementInterest,
      message,
      createdAt: new Date().toISOString(),
      status: 'new',
    };
    store.partnerships.unshift(item);
    saveStore();
    res.json({ ok: true, id: item.id });
  });

  app.get('/api/admin/partnerships', requireAdmin, (_req, res) => {
    res.json({ items: store.partnerships });
  });

  app.patch('/api/admin/partnerships/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const status = req.body?.status === 'reviewed' ? 'reviewed' : 'new';
    store.partnerships = store.partnerships.map((p) => (p.id === id ? { ...p, status } : p));
    saveStore();
    res.json({ ok: true });
  });

  // --- Server-Synced Catalog / Ads / Live Channels / Traffic ---
  app.get('/api/catalog/custom', (_req, res) => {
    res.json({ items: store.customMedia });
  });

  app.post('/api/admin/catalog', requireAdmin, async (req, res) => {
    const item = req.body?.item;
    if (!item || !item.id) {
      res.status(400).json({ error: 'Contenu invalide.' });
      return;
    }
    const idx = store.customMedia.findIndex((m) => String(m.id) === String(item.id));
    const isNewItem = idx < 0;
    if (idx >= 0) {
      store.customMedia[idx] = item;
    } else {
      store.customMedia.unshift(item);
    }
    saveStore();

    let pushReport: Awaited<ReturnType<typeof broadcastPushNotification>> | null = null;
    const shouldNotify = isNewItem && req.body?.notifySubscribers !== false && store.pushEnabled;
    if (shouldNotify && store.pushSubscriptions.length > 0) {
      const slug = slugify(String(item.title || ''));
      const prefix = item.type === 'tv' ? '/series/' : '/movie/';
      const directUrl = `${prefix}${item.id}${slug ? `-${slug}` : ''}`;
      const labelPrefix = item.type === 'tv' ? 'Nouvelle série ajoutée' : 'Nouveau film ajouté';
      const yearTag = item.releaseYear ? ` (${item.releaseYear})` : '';

      pushReport = await broadcastPushNotification({
        title: `${labelPrefix} : ${item.title}${yearTag}`,
        message: String(item.synopsis || 'Découvrez la fiche complète et la bande-annonce sur STREAMORA.').slice(0, 150),
        image: typeof item.backdrop === 'string' && item.backdrop.startsWith('http')
          ? item.backdrop
          : typeof item.poster === 'string' && item.poster.startsWith('http')
          ? item.poster
          : undefined,
        link: directUrl,
        sound: true,
        tag: `streamora-new-${item.id}`,
        mediaType: item.type === 'tv' ? 'tv' : 'movie',
        mediaId: item.id,
      });
    }

    res.json({
      ok: true,
      isNew: isNewItem,
      items: store.customMedia,
      pushReport,
    });
  });

  app.delete('/api/admin/catalog/:id', requireAdmin, (req, res) => {
    const id = String(req.params.id);
    store.customMedia = store.customMedia.filter((m) => String(m.id) !== id);
    saveStore();
    res.json({ ok: true, items: store.customMedia });
  });

  app.get('/api/ads', (_req, res) => {
    res.json({ ads: store.ads });
  });

  app.put('/api/admin/ads', requireAdmin, (req, res) => {
    if (Array.isArray(req.body?.ads)) {
      store.ads = req.body.ads;
      saveStore();
    }
    res.json({ ok: true, ads: store.ads });
  });

  app.get('/api/live-channels', (_req, res) => {
    res.json({ channels: store.liveChannels });
  });

  app.post('/api/live-channels', (req, res) => {
    const channel = req.body?.channel;
    if (channel && channel.name && channel.streamUrl) {
      store.liveChannels.unshift(channel);
      saveStore();
    }
    res.json({ ok: true, channels: store.liveChannels });
  });

  app.delete('/api/admin/live-channels/:id', requireAdmin, (req, res) => {
    store.liveChannels = store.liveChannels.filter((c) => c.id !== req.params.id);
    saveStore();
    res.json({ ok: true, channels: store.liveChannels });
  });

  app.get('/api/traffic', (_req, res) => {
    res.json({ traffic: normalizeTraffic(store.traffic) });
  });

  app.post('/api/traffic/event', (req, res) => {
    const type = req.body?.type;
    const today = new Date().toISOString().split('T')[0];
    const device: 'mobile' | 'tablet' | 'desktop' =
      req.body?.device === 'mobile' || req.body?.device === 'tablet' ? req.body.device : 'desktop';
    const lang = typeof req.body?.lang === 'string' && req.body.lang in SERVER_LOCALES ? req.body.lang : 'fr';
    const routePath = typeof req.body?.route === 'string' ? req.body.route.slice(0, 100) : '/';

    if (!store.traffic.devices) store.traffic.devices = { mobile: 0, tablet: 0, desktop: 0 };
    if (!store.traffic.languages) store.traffic.languages = {};
    if (!store.traffic.dailyViews) store.traffic.dailyViews = [];
    if (!store.traffic.topRoutes) store.traffic.topRoutes = [];

    let dayEntry = store.traffic.dailyViews.find((d) => d.date === today);
    if (!dayEntry) {
      dayEntry = { date: today, views: 0, visitors: 0 };
      store.traffic.dailyViews.push(dayEntry);
      if (store.traffic.dailyViews.length > 14) {
        store.traffic.dailyViews = store.traffic.dailyViews.slice(-14);
      }
    }

    if (type === 'pageview') {
      store.traffic.pageViews += 1;
      dayEntry.views += 1;
      store.traffic.languages[lang] = (store.traffic.languages[lang] || 0) + 1;

      if (routePath && !routePath.startsWith('/admin')) {
        const foundRoute = store.traffic.topRoutes.find((r) => r.path === routePath);
        if (foundRoute) foundRoute.views += 1;
        else store.traffic.topRoutes.push({ path: routePath, views: 1 });
        store.traffic.topRoutes.sort((a, b) => b.views - a.views);
        store.traffic.topRoutes = store.traffic.topRoutes.slice(0, 8);
      }
    }

    if (type === 'visitor') {
      store.traffic.totalVisitors += 1;
      dayEntry.visitors += 1;
      store.traffic.devices[device] = (store.traffic.devices[device] || 0) + 1;
    }

    if (type === 'stream') {
      store.traffic.streamsStarted += 1;
      const title = String(req.body?.title || '').trim();
      if (title) {
        const found = store.traffic.topTitles.find((t) => t.title.toLowerCase() === title.toLowerCase());
        if (found) found.views += 1;
        else store.traffic.topTitles.unshift({ title, views: 1 });
        store.traffic.topTitles.sort((a, b) => b.views - a.views);
        store.traffic.topTitles = store.traffic.topTitles.slice(0, 10);
      }
    }

    saveStore();
    res.json({ ok: true });
  });

  app.post('/api/admin/traffic/reset', requireAdmin, (_req, res) => {
    store.traffic = createEmptyTraffic();
    saveStore();
    res.json({ ok: true, traffic: store.traffic });
  });

  // --- SEO: robots.txt & dynamic sitemap.xml ---
  app.get('/robots.txt', (req, res) => {
    const origin = getBaseOrigin(req);
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /api/',
        `Sitemap: ${origin}/sitemap.xml`,
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', async (req, res) => {
    const origin = getBaseOrigin(req);
    const today = new Date().toISOString().split('T')[0];

    const routeMap = new Map<string, { path: string; priority: string; changefreq: string }>();
    const addPath = (p: string, priority: string, changefreq: string) => {
      if (!routeMap.has(p)) {
        routeMap.set(p, { path: p, priority, changefreq });
      }
    };

    addPath('/', '1.0', 'daily');
    addPath('/movies', '0.9', 'daily');
    addPath('/series', '0.9', 'daily');
    addPath('/news', '0.8', 'daily');
    addPath('/direct', '0.8', 'hourly');
    addPath('/partenariat', '0.7', 'monthly');

    const [popMovies, trendMovies, popTv, topTv] = await Promise.all([
      fetchTmdbServer('/movie/popular', { page: 1 }),
      fetchTmdbServer('/trending/movie/week', { page: 1 }),
      fetchTmdbServer('/tv/popular', { page: 1 }),
      fetchTmdbServer('/tv/top_rated', { page: 1 }),
    ]);

    const addMovieList = (results: any[]) => {
      results.slice(0, 20).forEach((m: any) => {
        const slug = slugify(m.title || '');
        addPath(`/movie/${m.id}${slug ? `-${slug}` : ''}`, '0.8', 'weekly');
      });
    };

    const addTvList = (results: any[]) => {
      results.slice(0, 20).forEach((t: any) => {
        const slug = slugify(t.name || '');
        addPath(`/series/${t.id}${slug ? `-${slug}` : ''}`, '0.8', 'weekly');
      });
    };

    if (Array.isArray(popMovies?.results)) addMovieList(popMovies.results);
    if (Array.isArray(trendMovies?.results)) addMovieList(trendMovies.results);
    if (Array.isArray(popTv?.results)) addTvList(popTv.results);
    if (Array.isArray(topTv?.results)) addTvList(topTv.results);

    store.customMedia.forEach((item) => {
      const prefix = item.type === 'movie' ? '/movie/' : '/series/';
      const slug = slugify(item.title || '');
      addPath(`${prefix}${item.id}${slug ? `-${slug}` : ''}`, '0.8', 'weekly');
    });

    const xmlEntries = Array.from(routeMap.values()).map((entry) => {
      const defaultLoc = buildLocalizedUrl(origin, entry.path, 'fr');
      const xhtmlLinks = [
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtmlAttr(defaultLoc)}" />`,
        ...Object.values(SERVER_LOCALES).flatMap((loc) => {
          const href = escapeHtmlAttr(buildLocalizedUrl(origin, entry.path, loc.code));
          return loc.hreflangs.map(
            (hl) => `    <xhtml:link rel="alternate" hreflang="${hl}" href="${href}" />`
          );
        }),
      ];

      return [
        '  <url>',
        `    <loc>${escapeHtmlAttr(defaultLoc)}</loc>`,
        ...xhtmlLinks,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        '  </url>',
      ].join('\n');
    });

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
      ...xmlEntries,
      '</urlset>',
    ].join('\n');

    res.type('application/xml').send(xml);
  });

  // --- Vite Dev Middleware or Static Production Assets + Dynamic SSR Meta Injection ---
  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) {
        next();
        return;
      }
      try {
        const templatePath = path.join(ROOT_DIR, 'index.html');
        let html = fs.readFileSync(templatePath, 'utf-8');
        html = await vite.transformIndexHtml(req.originalUrl, html);
        const meta = await resolveSsrMeta(req);
        html = injectSsrMetaIntoHtml(html, meta);
        res.status(200)
          .set({
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Language': meta.locale.htmlLang,
          })
          .end(html);
      } catch (err: any) {
        vite.ssrFixStacktrace(err);
        next(err);
      }
    });
  } else {
    const distDir = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distDir, { index: false }));

    app.use(async (req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) {
        next();
        return;
      }
      try {
        const distHtmlPath = path.join(distDir, 'index.html');
        let html = fs.readFileSync(distHtmlPath, 'utf-8');
        const meta = await resolveSsrMeta(req);
        html = injectSsrMetaIntoHtml(html, meta);
        res.status(200)
          .set({
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Language': meta.locale.htmlLang,
          })
          .end(html);
      } catch (err) {
        next(err);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[STREAMORA] Server listening on http://0.0.0.0:${PORT} (${IS_PRODUCTION ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[STREAMORA] Fatal startup error:', err);
  process.exit(1);
});
