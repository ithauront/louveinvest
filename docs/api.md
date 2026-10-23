# Contrat API

Préfixe : `/api/scpis/:scpiId`. Identifiant pris en charge : `primopierre`.
Prix/montants en **centimes entiers sûrs**, quantités entières, taux en points-base (480 = 4,8 %), rendement en unités de pourcentage (13.027 = 13,027 %). Dates civiles/horaires locaux en Europe/Paris ; `fetchedAt` est un instant UTC.

## Lecture

| Méthode et chemin | Résultat |
| --- | --- |
| GET `/api/health` | État du service |
| GET `…/market` | SCPI, source, dernière exécution, historique, carnet, prochaines échéances |
| GET `…/yield` | Rendement brut, coût par part, exécution utilisée, dividende/année et frais sourcés |
| GET `…/confrontation-estimate` | Estimation, prix de référence, prochaine échéance, hypothèses et limites |

Les réponses de marché/calcul comportent `source`, `freshness` (`fresh` ou `stale`) et `warnings`. `fresh` décrit la collecte/cache, pas la fraîcheur administrative de la source. Les dates des différentes consultations peuvent différer ; chaque bloc présente son propre contexte.

L’estimation vaut `estimated`, `empty-book` ou `no-crossing`. Sans échange estimable, `executionPriceCents` et les données d’éligibilité sont null, `exchangedShares` vaut 0. Un état sans échange est une réponse 200, pas une panne. Un résultat `estimated` fournit aussi l’intervalle inclusif à demande/offre constantes ; il ne s’agit pas d’un intervalle probabiliste.

## Simuler une acquisition

```sh
curl -X POST http://127.0.0.1:3333/api/scpis/primopierre/yield-simulation \
  -H 'Content-Type: application/json' \
  -d '{"sellerPriceCents":3188,"shares":10,"fixedFeesCents":1000}'
```

Les trois champs sont obligatoires. Prix et quantité positifs ; `fixedFeesCents` est un coût **total hypothétique**, appliqué une fois, positif ou zéro explicite. Les 10 € de l’exemple ne sont pas une taxe officielle.

La réponse contient `reference` (contrat de GET yield), `fixedFeesBasis: "user-assumption"` et `simulation` : prix/quantité/coût fixe saisis, coût total, coût par part, dividende brut total et rendement. Pour l’exemple avec dividende 2025 : coût total **36004**, rendement **12.6652**. La référence exclut les frais fixes ; le scénario les inclut selon l’hypothèse.

## Courbe par prix

```sh
curl -X POST http://127.0.0.1:3333/api/scpis/primopierre/yield-curve \
  -H 'Content-Type: application/json' \
  -d '{"minimumPriceCents":3000,"maximumPriceCents":3200,"priceStepCents":100,"shares":10,"fixedFeesCents":1000}'
```

Tous les champs sont obligatoires. Bornes positives, minimum ≤ maximum, pas positif ; mêmes règles de quantité/coût fixe. Maximum **200 points**, bornes incluses : si le pas n’atteint pas exactement le maximum, celui-ci forme le dernier point. Deux bornes égales produisent un point.

La réponse contient `reference`, `fixedFeesBasis` et `points`, chaque point ayant les champs d’une simulation. Les calculs utilisent des rapports exacts ; arrondir un coût unitaire avant de le multiplier ne reproduit pas nécessairement le coût total retourné.

## Erreurs

Enveloppe : `{"error":{"code":"…","message":"…"}}`.

| HTTP | Code | Signification |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Paramètres ou JSON invalides |
| 400 | `INVALID_YIELD_INPUT` | Scénario invalide, trop de points ou résultat numériquement non représentable |
| 404 | `SCPI_NOT_FOUND` | Source non enregistrée |
| 502 | `SOURCE_UNAVAILABLE`, `SOURCE_FORMAT_CHANGED` | Source indisponible ou HTML incompatible |
| 503 | `YIELD_DATA_UNAVAILABLE` | Paramètres absents pour l’exercice civil précédent |
| 504 | `SOURCE_TIMEOUT` | Délai de collecte dépassé |
| 500 | `INTERNAL_ERROR` | Erreur inattendue, diagnostic privé non exposé |

Avant deux heures d’âge total, une erreur de collecte typée peut retourner le dernier snapshot en `stale` avec avertissement. Sans cache utilisable, la panne est explicite. Ces endpoints ne stockent pas de projet et ne transmettent aucun ordre. Le brouillon d’email est produit et exporté localement, sans endpoint dédié.
