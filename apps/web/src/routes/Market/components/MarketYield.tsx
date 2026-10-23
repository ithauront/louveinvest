import { formatEuroCents } from '../../../utilities/currency';
import {
  formatBasisPoints,
  formatCollectedAt,
  formatMarketDate,
  formatYieldPercent,
} from '../../../utilities/market-format';
import { useScpiYield } from '../hooks/useScpiYield';

function yieldErrorMessage(code: string): string {
  switch (code) {
    case 'YIELD_DATA_UNAVAILABLE':
      return 'Le dividende ou les paramètres du dernier exercice civil ne sont pas disponibles. Aucun rendement de substitution n’est affiché.';
    case 'SOURCE_TIMEOUT':
    case 'REQUEST_TIMEOUT':
      return 'Le délai de consultation du rendement est dépassé.';
    case 'SOURCE_FORMAT_CHANGED':
    case 'INVALID_RESPONSE':
      return 'Les données reçues ne permettent pas d’afficher le rendement.';
    case 'SCPI_NOT_FOUND':
      return 'Cette SCPI n’est pas disponible.';
    default:
      return 'Le rendement est momentanément indisponible. Vous pouvez réessayer.';
  }
}

export function MarketYield({ scpiId }: { scpiId: string }) {
  const { state, reload } = useScpiYield(scpiId);
  return (
    <section className="market-card" aria-labelledby="yield-title">
      <h2 id="yield-title">Rendement annuel brut</h2>
      {state.status === 'loading' && <p role="status">Chargement du rendement…</p>}
      {state.status === 'error' && (
        <div className="error-summary" role="alert">
          <p>{yieldErrorMessage(state.code)}</p>
        </div>
      )}
      {state.status === 'success' && (
        <>
          {state.data.freshness === 'stale' && (
            <p className="market-warning" role="status">
              Rendement calculé avec les dernières données de secours : la dernière actualisation de
              marché a échoué.
            </p>
          )}
          <p className="yield-value">{formatYieldPercent(state.data.annualYieldPercent)}</p>
          <p>
            Sur la base du dividende brut {state.data.dividend.year} et de l’exécution du{' '}
            {formatMarketDate(state.data.execution.date)}.
          </p>
          <dl className="draft-summary">
            <dt>Dividende annuel brut par part ({state.data.dividend.year})</dt>
            <dd>{formatEuroCents(state.data.dividend.grossPerShareCents)}</dd>
            <dt>Prix vendeur par part hors frais</dt>
            <dd>{formatEuroCents(state.data.execution.sellerPriceCents)}</dd>
            <dt>Commission de cession TTC</dt>
            <dd>{formatBasisPoints(state.data.fees.commissionBasisPoints)} du prix vendeur</dd>
            <dt>Droits d’enregistrement</dt>
            <dd>{formatBasisPoints(state.data.fees.registrationBasisPoints)} du prix vendeur</dd>
            <dt>Coût d’acquisition par part avec frais proportionnels</dt>
            <dd>{formatEuroCents(state.data.acquisitionCostPerShareCents)}</dd>
          </dl>
          <p className="muted">
            Dividende annuel brut par part ÷ coût d’acquisition avec frais proportionnels. Frais
            fixes exclus. Ce rendement historique ne garantit pas les revenus futurs.
          </p>
          <div className="yield-sources">
            <a href={state.data.dividend.source.url} target="_blank" rel="noreferrer">
              Source du dividende · pages {state.data.dividend.source.pages.join(', ')}
            </a>
            <a href={state.data.fees.source.url} target="_blank" rel="noreferrer">
              Source des frais · pages {state.data.fees.source.pages.join(', ')}
            </a>
            <a href={state.data.source.url} target="_blank" rel="noreferrer">
              Source du prix d’exécution
            </a>
          </div>
          <p className="muted">
            Données de marché collectées : {formatCollectedAt(state.data.source.fetchedAt)} (Paris).
            Mise à jour publiée : {formatMarketDate(state.data.source.updatedAtLocal)} (Paris).
          </p>
        </>
      )}
      <button
        type="button"
        className="secondary"
        onClick={state.status === 'loading' ? undefined : reload}
        aria-disabled={state.status === 'loading'}
      >
        {state.status === 'error' ? 'Réessayer le rendement' : 'Actualiser le rendement'}
      </button>
    </section>
  );
}
