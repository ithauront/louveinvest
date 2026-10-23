import type { ScpiYield } from '../../../types/yield';
import { formatEuroCents } from '../../../utilities/currency';
import { formatBasisPoints } from '../../../utilities/market-format';
import { formatCollectedAt, formatMarketDate } from '../../../utilities/market-format';

export function YieldBonusReference({ reference }: { reference: ScpiYield }) {
  return (
    <div className="market-provenance">
      {reference.freshness === 'stale' && (
        <p className="market-warning" role="status">
          Scénario calculé avec les dernières données de secours : l’actualisation du marché a
          échoué.
        </p>
      )}
      <p>
        Dividende brut de référence : {formatEuroCents(reference.dividend.grossPerShareCents)} par
        part ({reference.dividend.year}). Résultat historique indicatif, sans garantie de revenus
        futurs ni d’exécution au prix souhaité.
      </p>
      <p>
        Coût fixe total : hypothèse saisie par vous, pas une commission officielle confirmée de la
        société de gestion.
      </p>
      <p>
        Commission TTC : {formatBasisPoints(reference.fees.commissionBasisPoints)} ; droits
        d’enregistrement : {formatBasisPoints(reference.fees.registrationBasisPoints)}, sur le prix
        vendeur.
      </p>
      <div className="yield-sources">
        <a href={reference.dividend.source.url} target="_blank" rel="noreferrer">
          Dividende · pages {reference.dividend.source.pages.join(', ')}
        </a>
        <a href={reference.fees.source.url} target="_blank" rel="noreferrer">
          Frais proportionnels · pages {reference.fees.source.pages.join(', ')}
        </a>
        <a href={reference.source.url} target="_blank" rel="noreferrer">
          Source du marché
        </a>
      </div>
      <p>
        Collecte : {formatCollectedAt(reference.source.fetchedAt)} (Paris). Mise à jour publiée :{' '}
        {formatMarketDate(reference.source.updatedAtLocal)} (Paris).
      </p>
    </div>
  );
}
