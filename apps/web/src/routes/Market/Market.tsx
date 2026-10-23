import { formatEuroCents } from '../../utilities/currency';
import { formatCollectedAt, formatMarketDate, formatQuantity } from '../../utilities/market-format';
import { MarketConfrontation } from './components/MarketConfrontation';
import { MarketHistory } from './components/MarketHistory';
import { MarketOrderBook } from './components/MarketOrderBook';
import { MarketYield } from './components/MarketYield';
import { MarketYieldBonuses } from './components/MarketYieldBonuses';
import { useScpiMarket } from './hooks/useScpiMarket';

function errorMessage(code: string): string {
  switch (code) {
    case 'SCPI_NOT_FOUND':
      return 'Cette SCPI n’est pas disponible.';
    case 'SOURCE_FORMAT_CHANGED':
    case 'INVALID_RESPONSE':
      return 'Les données reçues ne peuvent pas être affichées. Veuillez réessayer plus tard.';
    case 'SOURCE_TIMEOUT':
    case 'REQUEST_TIMEOUT':
      return 'Le délai de consultation est dépassé. Vous pouvez réessayer.';
    case 'SOURCE_UNAVAILABLE':
      return 'La source de marché est momentanément indisponible.';
    case 'NETWORK_ERROR':
      return 'Impossible de joindre le service. Vérifiez votre connexion puis réessayez.';
    default:
      return 'La consultation du marché a échoué. Veuillez réessayer.';
  }
}

export function MarketPage({ scpiId = 'primopierre' }: { scpiId?: string }) {
  const { state, reload } = useScpiMarket(scpiId);
  return (
    <section id="market" aria-labelledby="market-title" className="market-page">
      <div className="market-hero">
        <div className="page-intro">
          <p className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" /> SCPI · Marché secondaire
          </p>
          <h1 id="market-title">
            <span>Consulter</span> le marché
          </h1>
          <p>
            Les prix, les ordres et les bons repères pour préparer votre prochain achat de parts.
          </p>
          <a className="hero-action" href="#yield-simulations">
            Explorer les simulations <span aria-hidden="true">↗</span>
          </a>
        </div>
        <aside className="hero-guide" aria-label="Les étapes de votre analyse">
          <span className="hero-guide-mark" aria-hidden="true">
            ↗
          </span>
          <p className="eyebrow">Votre parcours</p>
          <p className="hero-guide-title">
            Des données.
            <br />
            Une décision éclairée.
          </p>
          <ol>
            <li>
              <span>01</span> Observer le marché
            </li>
            <li>
              <span>02</span> Évaluer votre rendement
            </li>
            <li>
              <span>03</span> Préparer votre projet
            </li>
          </ol>
        </aside>
      </div>
      <div className="market-heading">
        <div>
          <h2>{state.status === 'success' ? state.data.scpi.name : 'Données de marché'}</h2>
          {state.status === 'success' && <p>{state.data.scpi.manager}</p>}
        </div>
        <button
          type="button"
          className="secondary"
          onClick={state.status === 'loading' ? undefined : reload}
          aria-disabled={state.status === 'loading'}
        >
          {state.status === 'error' ? 'Réessayer' : 'Actualiser les données'}
        </button>
      </div>
      {state.status === 'loading' && <p role="status">Chargement des données de marché…</p>}
      {state.status === 'error' && (
        <div className="error-summary" role="alert">
          <p>{errorMessage(state.code)}</p>
        </div>
      )}
      {state.status === 'success' && (
        <>
          {state.data.freshness === 'stale' && (
            <p role="status" className="market-warning">
              Données de secours : la dernière actualisation a échoué. Les dernières données
              disponibles sont affichées.
            </p>
          )}
          <div className="market-metrics">
            <section className="market-card">
              <h2>Dernière exécution</h2>
              <p>
                <time dateTime={state.data.lastExecution.date}>
                  {formatMarketDate(state.data.lastExecution.date)}
                </time>{' '}
                · {formatQuantity(state.data.lastExecution.shares)} parts échangées
              </p>
              <dl className="draft-summary">
                <dt>Prix vendeur hors frais</dt>
                <dd>{formatEuroCents(state.data.lastExecution.sellerPriceCents)}</dd>
                <dt>Prix acquéreur avec frais</dt>
                <dd>{formatEuroCents(state.data.lastExecution.buyerPriceCents)}</dd>
              </dl>
            </section>
            <section className="market-card">
              <h2>Prochaines échéances</h2>
              <dl className="draft-summary">
                <dt>Confrontation</dt>
                <dd>
                  <time dateTime={state.data.nextConfrontation.localDateTime}>
                    {formatMarketDate(state.data.nextConfrontation.localDateTime)}
                  </time>
                </dd>
                <dt>Date limite des ordres</dt>
                <dd>
                  <time dateTime={state.data.orderDeadline.localDateTime}>
                    {formatMarketDate(state.data.orderDeadline.localDateTime)}
                  </time>
                </dd>
              </dl>
              <p className="muted">
                Horaires de Paris, tels que publiés par la société de gestion.
              </p>
            </section>
          </div>
          <MarketOrderBook orderBook={state.data.orderBook} />
          <MarketHistory history={state.data.history} />
          <div className="market-provenance">
            <a href={state.data.source.url} target="_blank" rel="noreferrer">
              Consulter la source officielle
            </a>
            <p>
              Mise à jour publiée : {formatMarketDate(state.data.source.updatedAtLocal)} (Paris).
              <br />
              Données collectées : {formatCollectedAt(state.data.source.fetchedAt)} (Paris).
            </p>
            <p>
              Une collecte récente ne garantit pas une mise à jour récente par la société de
              gestion. L’actualisation utilise le cache du service.
            </p>
          </div>
        </>
      )}
      <div className="market-analysis-grid">
        <MarketYield scpiId={scpiId} />
        <MarketConfrontation scpiId={scpiId} />
      </div>
      <MarketYieldBonuses key={scpiId} scpiId={scpiId} />
      <a href="#purchase-email" className="market-next">
        Préparer mon projet d’achat →
      </a>
    </section>
  );
}
