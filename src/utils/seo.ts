import { useEffect } from 'react';
import {
  ALL_LOCALE_LIST,
  getCurrentLang,
  getLocalizedAbsoluteUrl,
  SUPPORTED_LOCALES,
  SupportedLang,
} from './i18n';

export interface SeoMetaOptions {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: 'website' | 'video.movie' | 'video.tv_show' | 'video.episode';
  noindex?: boolean;
  lang?: SupportedLang;
  jsonLd?: Record<string, unknown>;
}

function upsertMeta(attrName: 'name' | 'property', attrValue: string, content: string) {
  let el = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function syncHreflangTags(cleanPath: string, origin: string) {
  document.querySelectorAll('link[data-streamora-hreflang="1"]').forEach((node) => node.remove());

  const addAlternate = (hreflang: string, href: string) => {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = hreflang;
    link.href = href;
    link.setAttribute('data-streamora-hreflang', '1');
    document.head.appendChild(link);
  };

  addAlternate('x-default', getLocalizedAbsoluteUrl(cleanPath, 'fr', origin));
  for (const locale of ALL_LOCALE_LIST) {
    const href = getLocalizedAbsoluteUrl(cleanPath, locale.code, origin);
    for (const tag of locale.hreflangs) {
      addAlternate(tag, href);
    }
  }
}

function syncAlternateOgLocales(activeOgLocale: string) {
  document
    .querySelectorAll('meta[property="og:locale:alternate"][data-streamora-alt-locale="1"]')
    .forEach((node) => node.remove());

  for (const locale of ALL_LOCALE_LIST) {
    if (locale.ogLocale === activeOgLocale) continue;
    const meta = document.createElement('meta');
    meta.setAttribute('property', 'og:locale:alternate');
    meta.setAttribute('content', locale.ogLocale);
    meta.setAttribute('data-streamora-alt-locale', '1');
    document.head.appendChild(meta);
  }
}

export function useSeoMeta(options: SeoMetaOptions) {
  useEffect(() => {
    const origin = window.location.origin;
    const activeLang = options.lang || getCurrentLang();
    const locale = SUPPORTED_LOCALES[activeLang];
    const rawPath = options.path || window.location.pathname || '/';
    const cleanPath = (rawPath.split('?')[0] || '/').replace(/\/+$/, '') || '/';
    const canonicalUrl = getLocalizedAbsoluteUrl(cleanPath, activeLang, origin);
    const ogImage = options.image || `${origin}/images/fallback-backdrop.jpg`;

    // Sync <html lang="..." dir="...">
    document.documentElement.lang = locale.htmlLang;
    document.documentElement.dir = locale.dir;

    document.title = options.title;
    upsertMeta('name', 'description', options.description);
    upsertMeta('property', 'og:title', options.title);
    upsertMeta('property', 'og:description', options.description);
    upsertMeta('property', 'og:type', options.type || 'website');
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:locale', locale.ogLocale);
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('name', 'twitter:title', options.title);
    upsertMeta('name', 'twitter:description', options.description);
    upsertMeta('name', 'twitter:image', ogImage);

    // Robots directive (noindex for private admin)
    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (options.noindex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.name = 'robots';
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.content = 'noindex, nofollow';
    } else if (robotsMeta) {
      robotsMeta.content = 'index, follow';
    }

    // Canonical link (self-referencing international canonical)
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    // International hreflang & og:locale:alternate
    if (!options.noindex) {
      syncHreflangTags(cleanPath, origin);
      syncAlternateOgLocales(locale.ogLocale);
    } else {
      document.querySelectorAll('link[data-streamora-hreflang="1"]').forEach((node) => node.remove());
    }

    // Schema.org JSON-LD
    const defaultJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'STREAMORA',
      url: origin,
      inLanguage: ['fr-FR', 'en-US', 'es-ES', 'de-DE', 'pt-PT', 'ar-SA'],
      potentialAction: {
        '@type': 'SearchAction',
        target: `${origin}/?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    };

    const jsonLdPayload = options.jsonLd
      ? {
          '@context': 'https://schema.org',
          inLanguage: locale.tmdbLang,
          ...options.jsonLd,
        }
      : defaultJsonLd;

    let script = document.getElementById('streamora-jsonld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'streamora-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLdPayload);
  }, [
    options.title,
    options.description,
    options.path,
    options.image,
    options.type,
    options.noindex,
    options.lang,
    options.jsonLd,
  ]);
}
