import { ActiveTab } from '../types';

export type SupportedLang = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ar';

export interface LocaleConfig {
  code: SupportedLang;
  label: string;
  nativeLabel: string;
  tmdbLang: string;
  ogLocale: string;
  htmlLang: string;
  dir: 'ltr' | 'rtl';
  hreflangs: string[];
}

export const SUPPORTED_LOCALES: Record<SupportedLang, LocaleConfig> = {
  fr: {
    code: 'fr',
    label: 'Français',
    nativeLabel: 'Français',
    tmdbLang: 'fr-FR',
    ogLocale: 'fr_FR',
    htmlLang: 'fr',
    dir: 'ltr',
    hreflangs: ['fr', 'fr-FR', 'fr-CA', 'fr-BE', 'fr-CH'],
  },
  en: {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    tmdbLang: 'en-US',
    ogLocale: 'en_US',
    htmlLang: 'en',
    dir: 'ltr',
    hreflangs: ['en', 'en-US', 'en-GB', 'en-CA'],
  },
  es: {
    code: 'es',
    label: 'Espagnol',
    nativeLabel: 'Español',
    tmdbLang: 'es-ES',
    ogLocale: 'es_ES',
    htmlLang: 'es',
    dir: 'ltr',
    hreflangs: ['es', 'es-ES', 'es-MX', 'es-419'],
  },
  de: {
    code: 'de',
    label: 'Allemand',
    nativeLabel: 'Deutsch',
    tmdbLang: 'de-DE',
    ogLocale: 'de_DE',
    htmlLang: 'de',
    dir: 'ltr',
    hreflangs: ['de', 'de-DE', 'de-AT', 'de-CH'],
  },
  pt: {
    code: 'pt',
    label: 'Portugais',
    nativeLabel: 'Português',
    tmdbLang: 'pt-PT',
    ogLocale: 'pt_PT',
    htmlLang: 'pt',
    dir: 'ltr',
    hreflangs: ['pt', 'pt-PT', 'pt-BR'],
  },
  ar: {
    code: 'ar',
    label: 'Arabe',
    nativeLabel: 'العربية',
    tmdbLang: 'ar-SA',
    ogLocale: 'ar_SA',
    htmlLang: 'ar',
    dir: 'rtl',
    hreflangs: ['ar', 'ar-SA'],
  },
};

export const ALL_LOCALE_LIST: LocaleConfig[] = Object.values(SUPPORTED_LOCALES);

export function normalizeLang(input?: string | null): SupportedLang {
  if (!input) return 'fr';
  const short = input.toLowerCase().split(/[-_]/)[0];
  if (short in SUPPORTED_LOCALES) {
    return short as SupportedLang;
  }
  return 'fr';
}

export function getCurrentLang(): SupportedLang {
  if (typeof window === 'undefined') return 'fr';
  try {
    const params = new URLSearchParams(window.location.search);
    const paramLang = params.get('lang');
    if (paramLang) return normalizeLang(paramLang);
  } catch {
    // ignore
  }
  return 'fr';
}

export function getActiveLocaleConfig(): LocaleConfig {
  return SUPPORTED_LOCALES[getCurrentLang()];
}

export function getLocalizedPath(path: string, lang: SupportedLang): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (lang === 'fr') return cleanPath;
  return `${cleanPath}?lang=${lang}`;
}

export function getLocalizedAbsoluteUrl(path: string, lang: SupportedLang, origin?: string): string {
  const baseOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const cleanPath = (path.split('?')[0] || '/').replace(/\/+$/, '') || '/';
  const suffix = lang === 'fr' ? '' : `?lang=${lang}`;
  return `${baseOrigin}${cleanPath}${suffix}`;
}

const ROUTE_SEO_COPY: Record<
  SupportedLang,
  Partial<Record<ActiveTab, { title: string; description: string }>> & {
    default: { title: string; description: string };
  }
> = {
  fr: {
    default: {
      title: 'STREAMORA — Films, Séries & Direct en Streaming',
      description:
        'Découvrez films populaires, nouveautés, grands classiques, séries par épisode et chaînes en direct sur STREAMORA.',
    },
    movies: {
      title: 'Catalogue des Films — STREAMORA',
      description: 'Explorez des milliers de films récents et classiques avec bandes-annonces, fiches détaillées et liens directs.',
    },
    series: {
      title: 'Séries TV & Épisodes — STREAMORA',
      description: 'Parcourez les séries populaires et classiques par saison et épisode avec liens directs sur STREAMORA.',
    },
    news: {
      title: 'Nouveautés Cinéma & Séries — STREAMORA',
      description: 'Les dernières sorties cinéma et nouvelles séries ajoutées automatiquement au catalogue STREAMORA.',
    },
    direct: {
      title: 'Direct Live & Flux Vidéo — STREAMORA',
      description: 'Regardez et diffusez des chaînes et flux vidéo en direct MP4 et HLS sur mobile et ordinateur.',
    },
    partenariat: {
      title: 'Partenariat et publicité — STREAMORA',
      description: 'Promouvez votre entreprise et vos services sur STREAMORA grâce à nos espaces publicitaires ciblés.',
    },
  },
  en: {
    default: {
      title: 'STREAMORA — Movies, TV Series & Live Streaming',
      description:
        'Discover trending movies, classics, full TV series by episode, trailers and live streams worldwide on STREAMORA.',
    },
    movies: {
      title: 'Movies Catalog — STREAMORA',
      description: 'Explore new releases and timeless classic movies with trailers, cast details and direct links on STREAMORA.',
    },
    series: {
      title: 'TV Series & Episodes — STREAMORA',
      description: 'Browse popular and classic TV series organized by season and episode with direct links on STREAMORA.',
    },
    news: {
      title: 'New Movies & Series Releases — STREAMORA',
      description: 'Latest cinema releases and trending shows automatically updated on STREAMORA.',
    },
    direct: {
      title: 'Live Direct Channels & Streams — STREAMORA',
      description: 'Watch and share direct MP4 and HLS live video channels on mobile and desktop with STREAMORA.',
    },
    partenariat: {
      title: 'Partnerships & Advertising — STREAMORA',
      description: 'Promote your brand, products or services to an international streaming audience on STREAMORA.',
    },
  },
  es: {
    default: {
      title: 'STREAMORA — Películas, Series y Directo Online',
      description:
        'Descubre películas populares, clásicos, series completas por episodio, tráileres y canales en directo en STREAMORA.',
    },
    movies: {
      title: 'Catálogo de Películas — STREAMORA',
      description: 'Explora estrenos y películas clásicas con reparto, sinopsis, tráileres y enlaces directos en STREAMORA.',
    },
    series: {
      title: 'Series y Episodios — STREAMORA',
      description: 'Encuentra tus series favoritas por temporada y episodio con enlaces directos en STREAMORA.',
    },
    news: {
      title: 'Estrenos de Cine y Series — STREAMORA',
      description: 'Los últimos lanzamientos de cine y televisión actualizados en STREAMORA.',
    },
    direct: {
      title: 'Canales en Directo y Live — STREAMORA',
      description: 'Reproduce canales y transmisiones en directo MP4 y HLS en móvil y ordenador.',
    },
    partenariat: {
      title: 'Publicidad y Alianzas — STREAMORA',
      description: 'Promociona tu marca y servicios ante una audiencia global en STREAMORA.',
    },
  },
  de: {
    default: {
      title: 'STREAMORA — Filme, Serien & Live-Streams',
      description:
        'Entdecke aktuelle Filme, Klassiker, komplette Serien nach Episoden, Trailer und Live-Kanäle auf STREAMORA.',
    },
    movies: {
      title: 'Filmkatalog — STREAMORA',
      description: 'Durchsuche beliebte Filme, Neuheiten und Klassiker mit Trailern und Direktlinks auf STREAMORA.',
    },
    series: {
      title: 'Serien & Episoden — STREAMORA',
      description: 'Alle Staffeln und Episoden beliebter und klassischer Serien mit Direktlinks auf STREAMORA.',
    },
    news: {
      title: 'Neuheiten Kino & Serien — STREAMORA',
      description: 'Die neuesten Kinostarts und Serien-Highlights auf STREAMORA.',
    },
    direct: {
      title: 'Live-Kanäle & Direkt-Streams — STREAMORA',
      description: 'Spiele MP4- und HLS-Livestreams nahtlos auf Smartphone und Desktop ab.',
    },
    partenariat: {
      title: 'Werbung & Partnerschaften — STREAMORA',
      description: 'Präsentiere dein Unternehmen und deine Angebote zielgerichtet auf STREAMORA.',
    },
  },
  pt: {
    default: {
      title: 'STREAMORA — Filmes, Séries e Direto Online',
      description:
        'Descubra filmes populares, clássicos, séries por temporada e episódio, trailers e canais ao vivo na STREAMORA.',
    },
    movies: {
      title: 'Catálogo de Filmes — STREAMORA',
      description: 'Explore estreias e clássicos do cinema com sinopses, elenco e trailers na STREAMORA.',
    },
    series: {
      title: 'Séries e Episódios — STREAMORA',
      description: 'Navegue por temporadas e episódios completos com links diretos na STREAMORA.',
    },
    news: {
      title: 'Novidades Cinema e Séries — STREAMORA',
      description: 'Os lançamentos mais recentes de filmes e séries na STREAMORA.',
    },
    direct: {
      title: 'Canais ao Vivo & Direto — STREAMORA',
      description: 'Assista e adicione transmissões diretas MP4 e HLS no telemóvel e computador.',
    },
    partenariat: {
      title: 'Parcerias e Publicidade — STREAMORA',
      description: 'Promova a sua marca para uma audiência internacional na STREAMORA.',
    },
  },
  ar: {
    default: {
      title: 'STREAMORA — أفلام ومسلسلات وبث مباشر',
      description:
        'اكتشف أحدث الأفلام والكلاسيكيات والمسلسلات حسب الحلقات والعروض الترويجية والبث المباشر على STREAMORA.',
    },
    movies: {
      title: 'دليل الأفلام — STREAMORA',
      description: 'تصفح أحدث الأفلام والأفلام الكلاسيكية مع التفاصيل والعروض الترويجية على STREAMORA.',
    },
    series: {
      title: 'المسلسلات والحلقات — STREAMORA',
      description: 'تصفح المواسم والحلقات الكاملة مع روابط مباشرة على STREAMORA.',
    },
    news: {
      title: 'أحدث الإصدارات — STREAMORA',
      description: 'أحدث إصدارات السينما والمسلسلات المضافة تلقائياً إلى STREAMORA.',
    },
    direct: {
      title: 'القنوات والبث المباشر — STREAMORA',
      description: 'شاهد وشغّل روابط البث المباشر MP4 وHLS على الهاتف والكمبيوتر.',
    },
    partenariat: {
      title: 'الشراكة والإعلان — STREAMORA',
      description: 'روّج لعلامتك التجارية وخدماتك عبر المساحات الإعلانية على STREAMORA.',
    },
  },
};

export function getSeoRouteCopy(tab: ActiveTab, lang: SupportedLang): { title: string; description: string } {
  const dict = ROUTE_SEO_COPY[lang] || ROUTE_SEO_COPY.fr;
  return dict[tab] || dict.default;
}
