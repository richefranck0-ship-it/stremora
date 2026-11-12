# STREAMORA — Guide de Configuration, Déploiement, VAPID & Administration

Ce document détaille l'installation complète, la configuration des variables d'environnement, la génération des clés Web Push (VAPID), l'accès privé à l'administration et l'indexation SEO (Google Search Console).

---

## 1. Variables d'environnement (`.env`)

Créez un fichier `.env` à la racine du projet à partir de `.env.example` (ne commitez **jamais** `.env` dans Git) :

```env
# Mot de passe administrateur (obligatoire pour accéder à /admin en production)
ADMIN_PASSWORD="ChoisissezUnMotDePasseTresRobuste!"

# Clé secrète HMAC pour signer les cookies de session admin (recommandé : 32+ caractères aléatoires)
ADMIN_SESSION_SECRET="remplacez-par-une-chaine-aleatoire-longue"

# URL publique du site en production (utilisée pour sitemap.xml, OpenGraph et Web Push)
APP_URL="https://votre-domaine.com"

# Clé API TMDB (The Movie Database)
VITE_TMDB_API_KEY="votre_cle_tmdb"

# Clés Web Push VAPID (voir section 2)
VAPID_PUBLIC_KEY="votre_cle_publique_vapid"
VAPID_PRIVATE_KEY="votre_cle_privee_vapid"
VAPID_SUBJECT="mailto:contact@streamora.tv"
```

---

## 2. Générer vos clés Web Push (VAPID)

Pour que les notifications Web Push restent valides après redémarrage et sur tous vos environnements, générez une paire de clés VAPID persistante avec `web-push` :

```bash
npx web-push generate-vapid-keys
```

La commande affiche :
- `Public Key` → copiez dans `VAPID_PUBLIC_KEY`
- `Private Key` → copiez dans `VAPID_PRIVATE_KEY`
- Ajoutez également `VAPID_SUBJECT="mailto:votre-email@domaine.com"`

> **Note :** En développement local, si `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` ne sont pas encore définies dans `.env`, le serveur génère automatiquement une paire persistée dans `.data/store.json` pour permettre les tests immédiats. En production, définissez toujours les variables d'environnement ci-dessus.

### Comportement sur iPhone / iPad (iOS Safari)
- Apple iOS exige que le site soit **installé sur l'écran d'accueil (PWA)** via Safari (`Partager` → `Sur l'écran d'accueil`) avant d'autoriser les notifications Web Push (iOS 16.4+).
- STREAMORA détecte automatiquement iOS Safari et affiche un guide d'installation étape par étape lorsque l'application n'est pas encore lancée en mode standalone.

---

## 3. Accès Privé à l'Administration (`/admin`)

- **Aucun bouton ou lien d'administration** n'apparaît sur les pages publiques.
- **Aucun mot de passe** n'est stocké dans le code client HTML/JS.
- Pour accéder au panneau de gestion complet (Catalogue, Saisons & Épisodes, Publicités & Demandes de Partenariat, Notifications Web Push, Trafic, Signalements, Paramètres TMDB, Sécurité), saisissez directement l'URL :
  - `https://votre-domaine.com/admin`
- L'authentification s'effectue côté serveur (`POST /api/admin/login`) avec cookie `HttpOnly` signé HMAC-SHA256 (`SameSite=Lax`).
- Vous pouvez également modifier le mot de passe depuis l'onglet **Sécurité** de `/admin` (hachage `scrypt` stocké côté serveur dans `.data/store.json`).

---

## 4. Google Search Console, Sitemap & SEO

- La balise de vérification demandée est intégrée dans `/index.html` :
  ```html
  <meta name="google-site-verification" content="LMfcG16jqIKYBirqeDvQ6R4AxhJDBgf6gLRLt5iMhRE" />
  ```
- Routes SEO générées automatiquement par le serveur (`server.ts`) :
  - `/robots.txt` (autorise l'indexation des fiches, bloque `/admin` et `/api/`)
  - `/sitemap.xml` (dynamique : accueil, `/partenariat`, films/séries/épisodes personnalisés et catalogue principal)
  - Injection SSR des balises `<title>`, `<meta name="description">`, `og:*`, `twitter:*` et JSON-LD Schema.org pour chaque URL directe (`/movie/:id`, `/series/:id`, `/episode/:episodeId`, `/partenariat`), assurant des aperçus riches lors du partage sur WhatsApp, X, Telegram ou Facebook.
  - Balise `<meta name="robots" content="noindex, nofollow" />` sur `/admin`.

---

## 5. Installation, Build et Lancement en Production

```bash
# 1. Installer les dépendances
npm install

# 2. Compiler le frontend & le Service Worker PWA (dist/)
npm run build

# 3. Démarrer le serveur Express + SSR Meta + Web Push sur le port 3000 (ou process.env.PORT)
npm start
```

- Mode développement : `npm run dev` (`tsx server.ts` sur `http://localhost:3000`).
- Vérification TypeScript : `npm run lint`.
