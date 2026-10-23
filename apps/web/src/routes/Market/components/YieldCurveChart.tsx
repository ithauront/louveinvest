import { useId, useState } from 'react';

import type { PurchaseScenario } from '../../../types/yield-bonuses';
import { formatEuroCents } from '../../../utilities/currency';
import { formatYieldPercent } from '../../../utilities/market-format';

export function YieldCurveChart({ points }: { points: PurchaseScenario[] }) {
  const titleId = useId(),
    descriptionId = useId();
  const [selected, setSelected] = useState(0);
  const activeIndex = Math.min(selected, points.length - 1),
    active = points[activeIndex]!;
  const minPrice = points[0]!.sellerPriceCents,
    maxPrice = points[points.length - 1]!.sellerPriceCents;
  const yields = points.map((point) => point.annualYieldPercent),
    minYield = Math.min(...yields),
    maxYield = Math.max(...yields);
  const x = (point: PurchaseScenario) =>
    minPrice === maxPrice
      ? 320
      : 70 + ((point.sellerPriceCents - minPrice) / (maxPrice - minPrice)) * 500;
  const y = (point: PurchaseScenario) =>
    minYield === maxYield
      ? 130
      : 220 - ((point.annualYieldPercent - minYield) / (maxYield - minYield)) * 180;
  return (
    <div className="yield-curve">
      <svg viewBox="0 0 640 280" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
        <title id={titleId}>Rendement annuel brut selon le prix vendeur</title>
        <desc id={descriptionId}>
          Prix hors frais en abscisse, rendement en ordonnée. Les valeurs exactes sont disponibles
          dans le tableau.
        </desc>
        <path d="M70 30 V220 H590" fill="none" stroke="currentColor" />
        <text x="10" y="42">
          {formatYieldPercent(maxYield)}
        </text>
        {minYield !== maxYield && (
          <text x="10" y="220">
            {formatYieldPercent(minYield)}
          </text>
        )}
        <text x="70" y="245">
          {formatEuroCents(minPrice)}
        </text>
        <text x="570" y="245" textAnchor="end">
          {formatEuroCents(maxPrice)}
        </text>
        <text x="70" y="270">
          Prix vendeur hors frais
        </text>
        <polyline
          points={points.map((point) => `${x(point)},${y(point)}`).join(' ')}
          fill="none"
          className="curve-line"
          strokeWidth="3"
        />
        <circle cx={x(active)} cy={y(active)} r="5" className="curve-point" />
      </svg>
      {points.length > 1 && (
        <>
          <label htmlFor={`${titleId}-point`}>Explorer les prix de la courbe</label>
          <input
            id={`${titleId}-point`}
            type="range"
            min="0"
            max={points.length - 1}
            value={activeIndex}
            onChange={(event) => setSelected(Number(event.target.value))}
            aria-valuetext={`${formatEuroCents(active.sellerPriceCents)} : ${formatYieldPercent(active.annualYieldPercent)}`}
          />
        </>
      )}
      <p aria-live="polite">
        Prix sélectionné : {formatEuroCents(active.sellerPriceCents)} · Rendement :{' '}
        {formatYieldPercent(active.annualYieldPercent)}
      </p>
      <details>
        <summary>Consulter toutes les valeurs ({points.length} points)</summary>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Valeurs de la courbe">
          <table>
            <caption>Rendement par prix vendeur hors frais</caption>
            <thead>
              <tr>
                <th scope="col">Prix vendeur</th>
                <th scope="col">Coût total</th>
                <th scope="col">Rendement annuel brut</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.sellerPriceCents}>
                  <th scope="row">{formatEuroCents(point.sellerPriceCents)}</th>
                  <td>{formatEuroCents(point.totalAcquisitionCostCents)}</td>
                  <td>{formatYieldPercent(point.annualYieldPercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
