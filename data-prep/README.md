# Fausse API : Tour de France 2026

Jeu de données figé (course terminée le 26 juillet 2026) servi dans le navigateur par **MSW**
(`src/mocks/handlers.ts`), pour développer le dashboard cyclisme sans back-end.

> Ce n'est pas une vraie API : les données sont statiques, préparées une fois par
> `build_db.py` à partir de sources publiques (voir `meta.sources`).

## Utilisation

Rien à lancer : `npm run dev` démarre MSW, qui sert `src/mocks/data/db.json` sous `/api`.
Les handlers imitent json-server 0.17 (filtres, `q`, `_sort`/`_order`, `_page`/`_limit`, en-tête `X-Total-Count`).

## Contenu

| Ressource | Contenu |
|---|---|
| `/api/meta` | Infos de l'édition, maillots finaux, notes sur la qualité des données |
| `/api/teams` | 23 équipes (18 WorldTeams + 5 ProTeams) |
| `/api/riders` | 158 arrivants + 5 abandons connus (163 au total, sur 184 partants) |
| `/api/stages` | 21 étapes : parcours, distance, type, vainqueur, maillot jaune, notes |
| `/api/gc` | Classement général final complet (158 lignes) |
| `/api/points` | Maillot vert, top 10 |
| `/api/mountains` | Maillot à pois, top 10 |
| `/api/youth` | Maillot blanc, top 10 |
| `/api/teamClassification` | Classement par équipes, top 10 |
| `/api/gcLead` | Avance du leader sur le 2e à 5 moments vérifiés (étapes 6, 11, 12, 18, 21) |

## Exemples de requêtes

```
/api/stages?type=mountain                      filtrer par type d'étape
/api/stages?_sort=distanceKm&_order=desc       trier
/api/riders?teamId=lidl-trek                   coureurs d'une équipe
/api/riders?nationality=FRA&_page=1&_limit=20  pagination (en-tête X-Total-Count)
/api/riders?q=pogacar                          recherche plein texte
```

Remarque : `_expand` n'est pas géré. Les ids (`riderId`, `teamId`, `winnerRiderId`,
`yellowJerseyRiderId`…) se résolvent côté front en croisant avec `/api/riders` et `/api/teams`
(bon exercice TanStack Query).

## Limites connues (à écrire dans ton README de projet)

- Les résultats complets étape par étape ne sont pas inclus. `stages[].topFinishers` ne contient
  que les positions vérifiées (podiums partiels). Pour le classement général étape par étape,
  il faudrait scraper ProCyclingStats / FirstCycling (script Python à part).
- Étape 1 (contre-la-montre par équipes) : `winnerRiderId` est `null`, le vainqueur est dans `winnerTeamId`.
- La somme des distances d'étapes donne 3 246,0 km, la source annonce 3 245 km (arrondis).
- Les points du maillot vert incluent l'étape 21 (Wikipedia) ; d'autres sites affichent des totaux
  plus bas (publiés avant la dernière étape).
- Pidcock (9e) et Jegat (10e) : certains tableaux tiers mélangent noms et équipes. Wikipedia a été retenue.

## Régénérer

```bash
python3 data-prep/build_db.py   # réécrit src/mocks/data/db.json
```

Le script valide l'intégrité des relations (ids de coureurs et d'équipes existants, 158 rangs consécutifs).

## Sources

- https://en.wikipedia.org/wiki/2026_Tour_de_France (source principale)
- OA Sport et CyclingUpToDate (recoupement des classements finaux)

Respecte les conditions d'utilisation de ces sites et cite-les dans ton projet.
