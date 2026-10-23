import type { MarketExecution } from '../../../types/market';
import { formatEuroCents } from '../../../utilities/currency';
import { formatMarketDate, formatQuantity } from '../../../utilities/market-format';

export function MarketHistory({ history }: { history: MarketExecution[] }) {
  return (
    <section className="market-card" aria-labelledby="history-title">
      <h2 id="history-title">Historique des confrontations</h2>
      {!history.length ? (
        <p>Aucune exécution historique publiée.</p>
      ) : (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Historique des prix et volumes"
        >
          <table>
            <caption className="visually-hidden">Prix et volumes des exécutions publiées</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Parts échangées</th>
                <th scope="col">Prix vendeur hors frais</th>
                <th scope="col">Prix acquéreur avec frais</th>
              </tr>
            </thead>
            <tbody>
              {history.map((execution) => (
                <tr key={execution.date}>
                  <th scope="row">
                    <time dateTime={execution.date}>{formatMarketDate(execution.date)}</time>
                  </th>
                  <td>{formatQuantity(execution.shares)}</td>
                  <td>{formatEuroCents(execution.sellerPriceCents)}</td>
                  <td>{formatEuroCents(execution.buyerPriceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
