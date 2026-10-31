# Projet : Cycling Dashboard (front-end, portfolio junior)

## Objectif
Application 100 % front-end pour mon portfolio de développeur junior frontend/fullstack.
Elle doit démontrer clairement trois compétences : **consommation d'API, gestion d'état, UI complexe**.
Thème : cyclisme (Tour de France + mes propres sorties), car c'est ma passion.

## Décisions prises
- Pas de back-end pour l'instant (possible évolution fullstack plus tard : Node/Python + PostgreSQL + scraping avec cache).
- Les scrapers de résultats cyclisme (procyclingstats, FirstCyclingAPI) sont des outils Python : inutilisables directement dans le navigateur.
- Données = mix de 3 sources :
  1. **Jeu de données JSON figé** (Tour de France 2024 : étapes, classements, coureurs, équipes), préparé une fois par un script séparé (Python + procyclingstats), servi via une fausse API (MSW ou json-server).
  2. **Open-Meteo** (API réelle, sans clé) : météo et vent pour les lieux d'étapes ou de mes sorties.
  3. **Fichiers GPX uploadés** par l'utilisateur, parsés dans le navigateur (pas d'API Strava : son accès développeur est devenu payant en 2026).
- Dans le README, dire clairement que la partie « résultats pro » est servie par une API simulée à partir d'un jeu de données figé.
- Respecter les conditions d'utilisation des sites sources lors de la préparation du JSON, et citer les sources.

## Stack prévue
- React ou Next.js + **TypeScript strict**
- **TanStack Query** (état serveur : cache, refetch, staleTime, requêtes parallèles)
- **Zustand** (état UI : favoris, coureurs comparés, thème), persistance localStorage
- Filtres stockés **dans l'URL** (liens partageables)
- Graphiques : Recharts (D3 si besoin)
- Carte et profil d'altitude : Leaflet
- Tests : Vitest + Testing Library
- Déploiement : Vercel ou Netlify

## Fonctionnalités par compétence à démontrer
**Consommation d'API**
- Couche API séparée avec types TypeScript pour chaque réponse
- Skeletons de chargement, états d'erreur (bouton « réessayer »), états vides
- Pagination ou scroll infini, recherche avec debounce, annulation des requêtes quand un filtre change

**Gestion d'état**
- Filtres (année/édition, équipe, nationalité, type d'étape, tri, plage de dates) synchronisés avec l'URL
- Séparation claire état serveur (TanStack Query) / état UI (Zustand)
- Favoris persistés

**UI complexe**
- Plusieurs graphiques liés : cliquer sur un coureur met à jour tous les graphiques
- Évolution du classement général étape par étape
- Comparateur de 2 à 4 coureurs
- Tableau avec tri, filtres combinés, pagination
- Upload GPX : profil d'altitude, vitesse, dénivelé cumulé, carte, statistiques par mois
- Idée originale : « Ma sortie vs le Tour » (comparer mes sorties avec une étape ou un col)
- Responsive, accessible (clavier, contrastes), mode sombre

## Plan sur 3 à 4 semaines
1. Mise en place : projet, TypeScript strict, lint, structure des dossiers, fausse API avec le JSON du Tour 2024.
2. Écrans Tour de France : liste des étapes, classement général, filtres dans l'URL.
3. Graphiques liés + comparateur de coureurs + favoris.
4. Upload GPX + Open-Meteo + carte et profil d'altitude.
5. Tests, accessibilité, README avec captures, déploiement.

## Livrables attendus pour le portfolio
- Démo en ligne
- README : problème résolu, stack, choix techniques, captures, section « ce que j'ai appris », sources des données
- Quelques tests sur les filtres et les composants clés

## Première demande à Claude Code
Propose-moi l'arborescence du projet et la liste des écrans, puis initialise le projet (étape 1 du plan) en me demandant confirmation avant les choix structurants.
