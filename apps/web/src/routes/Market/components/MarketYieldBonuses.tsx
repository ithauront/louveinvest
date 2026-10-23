import { useRef, useState } from 'react';

import { fetchYieldCurve, simulateYield } from '../../../services/market/simulate-yield';
import {
  validatePurchaseScenario,
  validateYieldCurve,
} from '../../../services/market/yield-bonus-form.validation';
import type { YieldBonusErrors, YieldBonusFields } from '../../../types/yield-bonuses';
import { formatEuroCents } from '../../../utilities/currency';
import { formatQuantity, formatYieldPercent } from '../../../utilities/market-format';
import { useYieldScenario } from '../hooks/useYieldScenario';
import { YieldBonusReference } from './YieldBonusReference';
import { YieldCurveChart } from './YieldCurveChart';

const initialFields: YieldBonusFields = {
  shares: '',
  fixedFees: '',
  sellerPrice: '',
  minimumPrice: '',
  maximumPrice: '',
  priceStep: '',
};
function scenarioError(code: string): string {
  if (code === 'YIELD_DATA_UNAVAILABLE')
    return 'Les paramètres annuels ne sont pas disponibles. Aucun résultat de substitution n’est affiché.';
  if (code === 'INVALID_YIELD_INPUT' || code === 'INVALID_REQUEST')
    return 'Le scénario dépasse les limites acceptées. Vérifiez les montants, la quantité et le nombre de points.';
  if (code === 'INVALID_RESPONSE') return 'La réponse reçue ne correspond pas au scénario demandé.';
  if (code === 'REQUEST_TIMEOUT' || code === 'SOURCE_TIMEOUT')
    return 'Le délai de calcul est dépassé. Vous pouvez réessayer.';
  return 'Le scénario est momentanément indisponible. Vous pouvez réessayer.';
}

export function MarketYieldBonuses({ scpiId }: { scpiId: string }) {
  const [fields, setFields] = useState<YieldBonusFields>(initialFields);
  const [errors, setErrors] = useState<YieldBonusErrors>({});
  const form = useRef<HTMLDivElement>(null);
  const simulation = useYieldScenario(scpiId, simulateYield),
    curve = useYieldScenario(scpiId, fetchYieldCurve);
  function change(field: keyof YieldBonusFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setErrors({});
    simulation.reset();
    curve.reset();
  }
  function submit(mode: 'purchase' | 'curve') {
    if ((mode === 'purchase' ? simulation.state.status : curve.state.status) === 'loading') return;
    const validation =
      mode === 'purchase' ? validatePurchaseScenario(fields) : validateYieldCurve(fields);
    if (!validation.success) {
      setErrors(validation.errors);
      const first = Object.keys(validation.errors)[0];
      form.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({});
    if ('sellerPriceCents' in validation.data) void simulation.run(validation.data);
    else void curve.run(validation.data);
  }
  function field(name: keyof YieldBonusFields, label: string, numeric = false) {
    return (
      <div className="field">
        <label htmlFor={`bonus-${name}`}>{label}</label>
        <input
          id={`bonus-${name}`}
          name={name}
          type="text"
          inputMode={numeric ? 'numeric' : 'decimal'}
          maxLength={30}
          value={fields[name]}
          onChange={(event) => change(name, event.target.value)}
          aria-required="true"
          aria-invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? `bonus-${name}-error` : undefined}
        />
        {errors[name] && (
          <p className="field-error" id={`bonus-${name}-error`}>
            {errors[name]}
          </p>
        )}
      </div>
    );
  }
  return (
    <section
      id="yield-simulations"
      className="market-card bonus-card"
      aria-labelledby="bonuses-title"
    >
      <h2 id="bonuses-title">Simuler votre rendement</h2>
      <p>
        Choisissez vos hypothèses. Les frais fixes s’appliquent une seule fois à l’achat entier.
        Saisissez explicitement 0 si vous ne souhaitez pas ajouter ce coût hypothétique.
      </p>
      <p className="muted">
        Aucune taxe fixe spécifique à la confrontation n’a été confirmée. Les frais proportionnels
        proviennent des données de référence du service. Aucun ordre n’est transmis.
      </p>
      <p className="muted">
        Les hypothèses communes et les champs du scénario demandé sont obligatoires.
      </p>
      <div ref={form}>
        <fieldset>
          <legend>Hypothèses communes</legend>
          <div className="field-grid">
            {field('shares', 'Quantité simulée (parts)', true)}
            {field('fixedFees', 'Coût fixe total hypothétique (€)')}
          </div>
        </fieldset>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit('purchase');
          }}
        >
          <fieldset>
            <legend>Achat souhaité</legend>
            {field('sellerPrice', 'Prix vendeur simulé par part, hors frais (€)')}
            <button
              type="submit"
              className="primary"
              aria-disabled={simulation.state.status === 'loading'}
            >
              Simuler l’achat
            </button>
          </fieldset>
        </form>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit('curve');
          }}
        >
          <fieldset>
            <legend>Courbe de rendement par prix</legend>
            <div className="field-grid">
              {field('minimumPrice', 'Prix minimum hors frais (€)')}
              {field('maximumPrice', 'Prix maximum hors frais (€)')}
              {field('priceStep', 'Pas de prix (€)')}
            </div>
            <p className="muted">
              Jusqu’à 200 points, minimum et maximum inclus. Le dernier intervalle peut être plus
              court que le pas.
            </p>
            <button
              type="submit"
              className="secondary"
              aria-disabled={curve.state.status === 'loading'}
            >
              Tracer la courbe
            </button>
          </fieldset>
        </form>
      </div>
      {simulation.state.status === 'loading' && <p role="status">Calcul de votre achat…</p>}
      {simulation.state.status === 'error' && (
        <p role="alert" className="error-summary">
          {scenarioError(simulation.state.code)} Relancez « Simuler l’achat ».
        </p>
      )}
      {simulation.state.status === 'success' && (
        <section aria-labelledby="purchase-result-title">
          <h3 id="purchase-result-title">Résultat de votre simulation</h3>
          <p>
            {formatQuantity(simulation.state.data.simulation.shares)} parts à{' '}
            {formatEuroCents(simulation.state.data.simulation.sellerPriceCents)} hors frais par
            part.
          </p>
          <dl className="draft-summary">
            <dt>Rendement annuel brut simulé</dt>
            <dd>{formatYieldPercent(simulation.state.data.simulation.annualYieldPercent)}</dd>
            <dt>Coût fixe total hypothétique</dt>
            <dd>{formatEuroCents(simulation.state.data.simulation.fixedFeesCents)}</dd>
            <dt>Coût total avec frais</dt>
            <dd>{formatEuroCents(simulation.state.data.simulation.totalAcquisitionCostCents)}</dd>
            <dt>Coût d’acquisition par part</dt>
            <dd>
              {formatEuroCents(simulation.state.data.simulation.acquisitionCostPerShareCents)}
            </dd>
            <dt>Dividende annuel brut total de référence</dt>
            <dd>{formatEuroCents(simulation.state.data.simulation.annualGrossDividendCents)}</dd>
          </dl>
          <YieldBonusReference reference={simulation.state.data.reference} />
        </section>
      )}
      {curve.state.status === 'loading' && <p role="status">Calcul de la courbe…</p>}
      {curve.state.status === 'error' && (
        <p role="alert" className="error-summary">
          {scenarioError(curve.state.code)} Relancez « Tracer la courbe ».
        </p>
      )}
      {curve.state.status === 'success' && (
        <section aria-labelledby="curve-result-title">
          <h3 id="curve-result-title">Courbe de votre scénario</h3>
          <p>
            {formatQuantity(curve.state.data.points[0]!.shares)} parts · coût fixe total
            hypothétique : {formatEuroCents(curve.state.data.points[0]!.fixedFeesCents)}.
          </p>
          <YieldCurveChart points={curve.state.data.points} />
          <YieldBonusReference reference={curve.state.data.reference} />
        </section>
      )}
    </section>
  );
}
