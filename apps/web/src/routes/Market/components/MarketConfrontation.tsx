import { explainConfrontation } from '../../../constants/confrontation-explanations';
import { formatEuroCents } from '../../../utilities/currency';
import {
  formatCollectedAt,
  formatMarketDate,
  formatQuantity,
} from '../../../utilities/market-format';
import { useScpiConfrontation } from '../hooks/useScpiConfrontation';

function confrontationErrorMessage(code: string): string {
  switch (code) {
    case 'SOURCE_TIMEOUT':
    case 'REQUEST_TIMEOUT':
      return 'Le délai de consultation de l’estimation est dépassé.';
    case 'SOURCE_FORMAT_CHANGED':
    case 'INVALID_RESPONSE':
      return 'Les données reçues ne permettent pas d’afficher l’estimation.';
    case 'SCPI_NOT_FOUND':
      return 'Cette SCPI n’est pas disponible.';
    default:
      return 'L’estimation est momentanément indisponible. Vous pouvez réessayer.';
  }
}

export function MarketConfrontation({ scpiId }: { scpiId: string }) {
  const { state, reload } = useScpiConfrontation(scpiId);
  return (
    <section className="market-card" aria-labelledby="confrontation-title">
      <h2 id="confrontation-title">Estimation de la prochaine confrontation</h2>
      {state.status === 'loading' && <p role="status">Chargement de l’estimation…</p>}
      {state.status === 'error' && (
        <div role="alert" className="error-summary">
          <p>{confrontationErrorMessage(state.code)}</p>
        </div>
      )}
      {state.status === 'success' && (
        <>
          {state.data.freshness === 'stale' && (
            <p role="status" className="market-warning">
              Estimation calculée avec les dernières données de secours : la dernière actualisation
              de marché a échoué.
            </p>
          )}
          <p>
            Confrontation prévue le{' '}
            <time dateTime={state.data.nextConfrontation.localDateTime}>
              {formatMarketDate(state.data.nextConfrontation.localDateTime)}
            </time>{' '}
            (Paris).
          </p>
          <p>
            Estimation indicative sur un carnet partiel : ce résultat ne garantit ni le prix ni
            l’exécution de votre achat.
          </p>
          {state.data.estimate.status === 'estimated' ? (
            <dl className="draft-summary">
              <dt>Prix vendeur estimé hors frais</dt>
              <dd>
                <strong>{formatEuroCents(state.data.estimate.executionPriceCents)}</strong>
              </dd>
              <dt>Parts échangées estimées sur le marché</dt>
              <dd>{formatQuantity(state.data.estimate.exchangedShares)}</dd>
              <dt>Demande éligible</dt>
              <dd>{formatQuantity(state.data.estimate.eligibleDemandShares)} parts</dd>
              <dt>Offre éligible</dt>
              <dd>{formatQuantity(state.data.estimate.eligibleSupplyShares)} parts</dd>
              <dt>Parts éligibles non échangées</dt>
              <dd>{formatQuantity(state.data.estimate.unmatchedEligibleShares)}</dd>
              <dt>Intervalle de prix à demande et offre constantes</dt>
              <dd>
                {formatEuroCents(state.data.estimate.priceInterval.minCents)} à{' '}
                {formatEuroCents(state.data.estimate.priceInterval.maxCents)} (bornes incluses)
              </dd>
            </dl>
          ) : (
            <p role="status" className="draft-notice">
              {state.data.estimate.status === 'empty-book'
                ? 'Carnet insuffisant : au moins un côté ne contient aucun ordre publié. Aucun échange ne peut être estimé.'
                : 'Aucun croisement : les limites de prix publiées ne permettent aucun échange. Aucun prix d’exécution n’est estimé.'}
            </p>
          )}
          <p className="muted">
            Dernier prix vendeur utilisé comme référence de départage :{' '}
            {formatEuroCents(state.data.referencePriceCents)} hors frais. La quantité estimée
            concerne tout le marché, pas une allocation à votre achat.
          </p>
          <h3>Hypothèses du calcul</h3>
          <ul>
            {state.data.assumptions.map((item, index) => (
              <li key={index}>{explainConfrontation(item)}</li>
            ))}
          </ul>
          <h3>Limites de l’estimation</h3>
          <ul>
            {state.data.limitations.map((item, index) => (
              <li key={index}>{explainConfrontation(item)}</li>
            ))}
          </ul>
          <div className="market-provenance">
            <a href={state.data.source.url} target="_blank" rel="noreferrer">
              Source du carnet d’ordres
            </a>
            <p>
              Données collectées : {formatCollectedAt(state.data.source.fetchedAt)} (Paris). Mise à
              jour publiée : {formatMarketDate(state.data.source.updatedAtLocal)} (Paris).
            </p>
          </div>
        </>
      )}
      <button
        type="button"
        className="secondary"
        onClick={state.status === 'loading' ? undefined : reload}
        aria-disabled={state.status === 'loading'}
      >
        {state.status === 'error' ? 'Réessayer l’estimation' : 'Actualiser l’estimation'}
      </button>
    </section>
  );
}
