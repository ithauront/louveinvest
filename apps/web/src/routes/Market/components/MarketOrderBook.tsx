import type { ScpiMarket } from '../../../types/market';
import { formatEuroCents } from '../../../utilities/currency';
import { formatQuantity } from '../../../utilities/market-format';

export function MarketOrderBook({ orderBook }: { orderBook: ScpiMarket['orderBook'] }) {
  return (
    <section className="market-card" aria-labelledby="order-book-title">
      <h2 id="order-book-title">Carnet d’ordres</h2>
      <p className="muted">
        Jusqu’à cinq niveaux de prix publics par côté. Ce carnet partiel ne garantit aucune
        exécution.
      </p>
      <div className="order-book-grid">
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Carnet des achats">
          <table>
            <caption>Achats</caption>
            <thead>
              <tr>
                <th scope="col">Ordres</th>
                <th scope="col">Parts</th>
                <th scope="col">Limite hors frais</th>
                <th scope="col">Limite avec frais</th>
              </tr>
            </thead>
            <tbody>
              {orderBook.bids.map((level) => (
                <tr key={level.sellerLimitCents}>
                  <td>{formatQuantity(level.orderCount)}</td>
                  <td>{formatQuantity(level.shares)}</td>
                  <td>{formatEuroCents(level.sellerLimitCents)}</td>
                  <td>{formatEuroCents(level.buyerLimitCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orderBook.bids.length && <p>Aucun ordre d’achat publié.</p>}
        </div>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Carnet des ventes">
          <table>
            <caption>Ventes</caption>
            <thead>
              <tr>
                <th scope="col">Ordres</th>
                <th scope="col">Parts</th>
                <th scope="col">Limite hors frais</th>
              </tr>
            </thead>
            <tbody>
              {orderBook.asks.map((level) => (
                <tr key={level.sellerLimitCents}>
                  <td>{formatQuantity(level.orderCount)}</td>
                  <td>{formatQuantity(level.shares)}</td>
                  <td>{formatEuroCents(level.sellerLimitCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orderBook.asks.length && <p>Aucun ordre de vente publié.</p>}
        </div>
      </div>
    </section>
  );
}
