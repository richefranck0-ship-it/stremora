import React, { useState } from 'react';
import { Megaphone, Send, Check, AlertCircle, Monitor, Smartphone, PlayCircle } from 'lucide-react';
import { useSeoMeta } from '../utils/seo';
import { getCurrentLang, getSeoRouteCopy } from '../utils/i18n';

export const PartnershipPage: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [placementInterest, setPlacementInterest] = useState('Bannière In-Feed & Accueil');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeLang = getCurrentLang();
  const seoCopy = getSeoRouteCopy('partenariat', activeLang);

  useSeoMeta({
    title: seoCopy.title,
    description: seoCopy.description,
    path: '/partenariat',
    image: '/images/partnership-hero.jpg',
    lang: activeLang,
  });

  const scrollToForm = () => {
    const form = document.getElementById('partnership-contact-form');
    form?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/partnerships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          contactName,
          email,
          placementInterest,
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi de votre demande.");
      }
      setSuccess(true);
      setCompanyName('');
      setContactName('');
      setEmail('');
      setMessage('');
    } catch (err: any) {
      setError(err?.message || "Impossible d'envoyer votre demande pour le moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden border border-purple-900/40 bg-[#12101e] shadow-2xl">
        <div className="relative h-52 sm:h-72 w-full">
          <img
            src="/images/partnership-hero.jpg"
            alt="Partenariat et publicité sur STREAMORA"
            className="w-full h-full object-cover brightness-65"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12101e] via-[#12101e]/60 to-transparent" />
        </div>

        <div className="relative -mt-20 sm:-mt-24 p-6 sm:p-10 space-y-5">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-300">
            <Megaphone className="w-4 h-4 text-purple-400" />
            <span>Régie Annonceurs STREAMORA</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-heading tracking-tight">
            Partenariat et publicité
          </h1>

          <div className="text-sm sm:text-base text-zinc-200 leading-relaxed max-w-2xl space-y-2">
            <p>
              Vous souhaitez promouvoir votre entreprise, votre marque ou vos services sur STREAMORA ?
            </p>
            <p>
              Nous proposons des espaces publicitaires pour donner de la visibilité à votre activité.
            </p>
            <p>
              Pour toute demande de partenariat ou d'affichage publicitaire, contactez notre équipe.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={scrollToForm}
              className="px-6 min-h-[46px] bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl inline-flex items-center gap-2 shadow-lg shadow-purple-950/60 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Nous contacter</span>
            </button>
          </div>
        </div>
      </section>

      {/* Formats Non-Intrusifs */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-[#12101d] border border-white/8 rounded-2xl p-6 space-y-2">
          <Monitor className="w-6 h-6 text-purple-400" />
          <h2 className="text-base font-bold text-white font-heading">Bannières Desktop &amp; Web</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Emplacements haute visibilité intégrés entre nos sections Films Populaires, Nouveautés et sous le lecteur vidéo sans gêner la navigation.
          </p>
        </div>
        <div className="bg-[#12101d] border border-white/8 rounded-2xl p-6 space-y-2">
          <Smartphone className="w-6 h-6 text-purple-400" />
          <h2 className="text-base font-bold text-white font-heading">Formats Mobile First</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Affichage optimisé pour Android et iPhone, avec liens directs vers votre site web, application ou page promotionnelle.
          </p>
        </div>
        <div className="bg-[#12101d] border border-white/8 rounded-2xl p-6 space-y-2">
          <PlayCircle className="w-6 h-6 text-purple-400" />
          <h2 className="text-base font-bold text-white font-heading">Spots Vidéo &amp; Sponsors</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Diffusion de vidéos MP4 courtes ou visuels HD avec suivi des impressions et des clics gérés depuis notre régie interne.
          </p>
        </div>
      </section>

      {/* Contact Form */}
      <section
        id="partnership-contact-form"
        className="bg-[#12101d] border border-purple-900/35 rounded-3xl p-6 sm:p-8 space-y-6"
      >
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading">
            Demande de partenariat ou d’affichage publicitaire
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Remplissez ce formulaire pour recevoir nos tarifs, disponibilités et formats publicitaires.
          </p>
        </div>

        {success ? (
          <div className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-bold text-white">Votre demande a bien été transmise !</p>
              <p className="text-xs text-emerald-200/90">
                L’équipe STREAMORA examinera votre projet publicitaire et vous répondra rapidement par e-mail.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            {error && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Entreprise / Marque *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Studio Horizon"
                  className="w-full bg-[#090810] border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Nom &amp; Prénom
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ex: Marc Laurent"
                  className="w-full bg-[#090810] border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Adresse e-mail professionnelle *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@votre-entreprise.com"
                  className="w-full bg-[#090810] border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Format souhaité
                </label>
                <select
                  value={placementInterest}
                  onChange={(e) => setPlacementInterest(e.target.value)}
                  className="w-full bg-[#090810] border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Bannière In-Feed & Accueil">Bannière In-Feed &amp; Accueil</option>
                  <option value="Sponsor Sous Lecteur Vidéo">Sponsor Sous Lecteur Vidéo</option>
                  <option value="Spot Vidéo MP4">Spot Vidéo MP4</option>
                  <option value="Régie Globale / Partenariat Sur-Mesure">Régie Globale / Sur-Mesure</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Votre message / Objectif de campagne *
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Décrivez votre marque, le lien à promouvoir, la durée souhaitée..."
                className="w-full bg-[#090810] border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 min-h-[46px] bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl inline-flex items-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Envoi en cours...' : 'Envoyer la demande'}</span>
            </button>
          </form>
        )}
      </section>
    </div>
  );
};
