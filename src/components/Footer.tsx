import React from 'react';
import { Globe } from 'lucide-react';
import { ActiveTab } from '../types';
import { ALL_LOCALE_LIST, getCurrentLang, getLocalizedPath } from '../utils/i18n';

interface FooterProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full bg-[#07060b] border-t border-white/8 text-zinc-400 text-xs mt-12 pt-10 pb-24 md:pb-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <img src="/icon.svg" alt="STREAMORA" className="w-6 h-6 rounded" />
              <span className="text-lg font-black tracking-wider text-white font-heading">
                STREAM<span className="text-purple-400">ORA</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Plateforme cinématographique moderne de films et séries. Découvrez les nouveautés, grands classiques et épisodes avec fiches détaillées et liens directs.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-purple-300 transition-colors py-0.5">
                  Accueil
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('movies')} className="hover:text-purple-300 transition-colors py-0.5">
                  Films populaires &amp; Classiques
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('series')} className="hover:text-purple-300 transition-colors py-0.5">
                  Séries &amp; Épisodes
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('news')} className="hover:text-purple-300 transition-colors py-0.5">
                  Nouveautés
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('direct')} className="hover:text-purple-300 transition-colors py-0.5">
                  Chaînes &amp; Direct
                </button>
              </li>
            </ul>
          </div>

          {/* Partenariat & Services */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Entreprise &amp; Partenariats</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('partenariat')}
                  className="text-purple-300 hover:text-purple-200 font-semibold transition-colors py-0.5"
                >
                  Partenariat et publicité
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('watchlist')} className="hover:text-purple-300 transition-colors py-0.5">
                  Ma Liste personnelle
                </button>
              </li>
              <li>
                <span>Lecteur adaptatif mobile &amp; ordinateur</span>
              </li>
              <li>
                <span>Application installable (PWA)</span>
              </li>
            </ul>
          </div>

          {/* TMDB Official Attribution */}
          <div className="space-y-2.5 bg-[#0e0c17] p-4 rounded-xl border border-white/8 h-fit">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
              Source Catalogue TMDB
            </h4>
            <div className="flex items-center gap-3">
              <img
                src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fd22f3be3dd20b12401e2a4c65dd6d63a002b10ecf44263edec69c2e2a6b.svg"
                alt="TMDB Logo"
                className="w-8 h-8 object-contain shrink-0"
              />
              <p className="text-[11px] text-zinc-400 leading-snug">
                This product uses the TMDB API but is not endorsed or certified by TMDB.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Legal, Signature & International Language Editions */}
        <div className="pt-6 border-t border-white/8 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 text-center sm:text-left">
            <p className="font-medium text-zinc-300">
              © STREAMORA — Fait par Franck. Tous droits réservés.
            </p>
            <div className="flex items-center gap-3 text-[11px] text-zinc-500">
              <button onClick={() => onNavigate('partenariat')} className="hover:text-purple-300 transition-colors">
                Annonceurs &amp; Régie
              </button>
              <span aria-hidden="true">·</span>
              <span>Mobile First</span>
              <span aria-hidden="true">·</span>
              <span>VF / VOSTFR / International</span>
            </div>
          </div>

          {/* International SEO Language Switcher */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1 text-zinc-400 font-medium">
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <span>Langues :</span>
            </span>
            {ALL_LOCALE_LIST.map((loc) => {
              const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
              const activeLang = getCurrentLang();
              const isCurrent = activeLang === loc.code;
              return (
                <a
                  key={loc.code}
                  href={getLocalizedPath(currentPath, loc.code)}
                  hrefLang={loc.code}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    isCurrent
                      ? 'bg-purple-600/20 text-purple-300 font-semibold border border-purple-500/30'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {loc.nativeLabel}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
};
