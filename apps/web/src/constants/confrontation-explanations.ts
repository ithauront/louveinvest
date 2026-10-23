/** Translate known API explanations; preserve new explanations rather than hiding them. */
const explanations: Record<string, string> = {
  'Prices are seller prices excluding fees, on a one-cent grid with inclusive order limits.':
    'Les prix sont des prix vendeur hors frais, par pas d’un centime, avec des limites d’ordre inclusives.',
  'Published quantities are aggregated per price level; partial execution is assumed.':
    'Les quantités publiées sont regroupées par niveau de prix ; une exécution partielle est supposée.',
  'Maximize traded shares, then minimize the unmatched eligible shares (absolute demand/supply imbalance).':
    'Le calcul maximise les parts échangées, puis minimise le déséquilibre entre demande et offre éligibles.',
  'Then choose the closest price to the last execution; choose the lowest price if a tie remains.':
    'En cas d’égalité, le prix le plus proche de la dernière exécution est retenu, puis le plus bas si nécessaire.',
  'Only the public top five price levels per side are available; this is not the full order register.':
    'Seuls les cinq premiers niveaux publics par côté sont disponibles : le registre complet des ordres n’est pas connu.',
  'Individual order priority and all-or-nothing constraints are unavailable and are not simulated.':
    'La priorité des ordres individuels et les contraintes « tout ou rien » sont inconnues et ne sont pas simulées.',
  'The order book may change or be administratively delayed; execution at the next confrontation is not guaranteed.':
    'Le carnet peut évoluer ou être publié avec retard ; aucune exécution à la prochaine confrontation n’est garantie.',
};

export function explainConfrontation(value: string): string {
  return Object.hasOwn(explanations, value) ? explanations[value]! : value;
}
