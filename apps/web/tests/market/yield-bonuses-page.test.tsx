import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../../src/App';
import { MarketYieldBonuses } from '../../src/routes/Market/components/MarketYieldBonuses';
import { YieldCurveChart } from '../../src/routes/Market/components/YieldCurveChart';
import { confrontationFixture } from './confrontation-fixture';
import { marketResponse } from './market-fixture';
import { curveFixture, simulationFixture } from './yield-bonuses-fixture';
import { yieldFixture } from './yield-fixture';
async function fillPurchase(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Quantité simulée (parts)'), '10');
  await user.type(screen.getByLabelText('Coût fixe total hypothétique (€)'), '10');
  await user.type(screen.getByLabelText('Prix vendeur simulé par part, hors frais (€)'), '31,88');
}
async function fillCurve(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Prix minimum hors frais (€)'), '30');
  await user.type(screen.getByLabelText('Prix maximum hors frais (€)'), '32');
  await user.type(screen.getByLabelText('Pas de prix (€)'), '1');
}
describe('Yield bonus journey', () => {
  it('sends nothing on mount or typing; submits a purchase only on explicit action', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue(marketResponse(simulationFixture()));
    vi.stubGlobal('fetch', fetcher);
    render(<MarketYieldBonuses scpiId="primopierre" />);
    await fillPurchase(user);
    expect(fetcher).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Simuler l’achat' }));
    expect(
      await screen.findByRole('heading', { name: 'Résultat de votre simulation' }),
    ).toBeTruthy();
    expect(screen.getByText(/12,6652\s%/)).toBeTruthy();
    expect(screen.getByText(/360,04\s€/)).toBeTruthy();
    expect(screen.getByText(/pas une commission officielle confirmée/)).toBeTruthy();
    expect(fetcher).toHaveBeenCalledOnce();
    await user.type(screen.getByLabelText('Quantité simulée (parts)'), '0');
    expect(screen.queryByRole('heading', { name: 'Résultat de votre simulation' })).toBeNull();
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('focuses invalid fields and rejects excessive ranges before sending', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    render(<MarketYieldBonuses scpiId="primopierre" />);
    await user.click(screen.getByRole('button', { name: 'Simuler l’achat' }));
    expect(document.activeElement).toBe(screen.getByLabelText('Quantité simulée (parts)'));
    await fillPurchase(user);
    await fillCurve(user);
    await user.clear(screen.getByLabelText('Pas de prix (€)'));
    await user.type(screen.getByLabelText('Pas de prix (€)'), '0,001');
    await user.click(screen.getByRole('button', { name: 'Tracer la courbe' }));
    expect(screen.getByLabelText('Pas de prix (€)').getAttribute('aria-invalid')).toBe('true');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('draws the curve with keyboard exploration and a complete data table', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue(marketResponse(curveFixture()));
    vi.stubGlobal('fetch', fetcher);
    render(<MarketYieldBonuses scpiId="primopierre" />);
    await fillPurchase(user);
    await fillCurve(user);
    await user.click(screen.getByRole('button', { name: 'Tracer la courbe' }));
    expect(
      await screen.findByRole('img', { name: /Rendement annuel brut selon le prix vendeur/ }),
    ).toBeTruthy();
    const slider = screen.getByRole('slider', { name: 'Explorer les prix de la courbe' });
    fireEvent.change(slider, { target: { value: '2' } });
    expect(slider.getAttribute('aria-valuetext')).toContain('32,00');
    expect(screen.getByText(/Prix sélectionné : 32,00/)).toBeTruthy();
    await user.click(screen.getByText('Consulter toutes les valeurs (3 points)'));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(4);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('supports a one-point curve without a misleading slider or invalid SVG coordinates', () => {
    const points = [curveFixture().points[0]!];
    render(<YieldCurveChart points={points} />);
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.getByRole('img').outerHTML).not.toMatch(/NaN|Infinity/);
  });
  it('preserves stale provenance and can retry unavailable annual data', async () => {
    const user = userEvent.setup();
    const stale = simulationFixture();
    stale.reference.freshness = 'stale';
    stale.reference.warnings = [{ code: 'STALE_DATA', message: 'Last collection' }];
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          marketResponse({ error: { code: 'YIELD_DATA_UNAVAILABLE', message: 'private' } }, 503),
        )
        .mockResolvedValueOnce(marketResponse(stale)),
    );
    render(<MarketYieldBonuses scpiId="primopierre" />);
    await fillPurchase(user);
    await user.click(screen.getByRole('button', { name: 'Simuler l’achat' }));
    expect((await screen.findByRole('alert')).textContent).toContain('paramètres annuels');
    await user.click(screen.getByRole('button', { name: 'Simuler l’achat' }));
    expect(
      await screen.findByText(/Scénario calculé avec les dernières données de secours/),
    ).toBeTruthy();
  });
  it('cancels edited scenarios and ignores their late completion', async () => {
    const user = userEvent.setup();
    let finish!: (response: Response) => void;
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options: RequestInit) => {
        signal = options.signal as AbortSignal;
        return new Promise<Response>((resolve) => {
          finish = resolve;
        });
      }),
    );
    render(<MarketYieldBonuses scpiId="primopierre" />);
    await fillPurchase(user);
    await user.click(screen.getByRole('button', { name: 'Simuler l’achat' }));
    expect(screen.getByRole('status').textContent).toContain('Calcul de votre achat');
    await user.type(screen.getByLabelText('Quantité simulée (parts)'), '0');
    expect(signal?.aborted).toBe(true);
    await act(async () => finish(marketResponse(simulationFixture())));
    expect(screen.queryByRole('heading', { name: 'Résultat de votre simulation' })).toBeNull();
  });
  it('submits the curve form with Enter without triggering a purchase simulation', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue(marketResponse(curveFixture()));
    vi.stubGlobal('fetch', fetcher);
    render(<MarketYieldBonuses scpiId="primopierre" />);
    await fillPurchase(user);
    await fillCurve(user);
    await user.type(screen.getByLabelText('Pas de prix (€)'), '{Enter}');
    expect(await screen.findByRole('heading', { name: 'Courbe de votre scénario' })).toBeTruthy();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]![0]).toContain('/yield-curve');
  });
  it('cancels a pending POST when unmounted', async () => {
    const user = userEvent.setup();
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, options: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            signal = options.signal as AbortSignal;
            signal.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    );
    const view = render(<MarketYieldBonuses scpiId="primopierre" />);
    await fillPurchase(user);
    await user.click(screen.getByRole('button', { name: 'Simuler l’achat' }));
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
  it('keeps the submitting control focused and blocks duplicate submissions while loading', async () => {
    const user = userEvent.setup();
    let finish!: (response: Response) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetcher);
    render(<MarketYieldBonuses scpiId="primopierre" />);
    await fillPurchase(user);
    const button = screen.getByRole('button', { name: 'Simuler l’achat' });
    await user.click(button);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(button);
    await user.click(button);
    await user.keyboard('{Enter}');
    expect(fetcher).toHaveBeenCalledOnce();
    await act(async () => finish(marketResponse(simulationFixture())));
    expect(button.getAttribute('aria-disabled')).toBe('false');
    expect(document.activeElement).toBe(button);
  });
  it('does not send personal data or fill the email price, and leaves the three read queries intact', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn((url: string) =>
      Promise.resolve(
        marketResponse(
          url.endsWith('/yield-simulation')
            ? simulationFixture()
            : url.endsWith('/yield')
              ? yieldFixture()
              : url.endsWith('/confrontation-estimate')
                ? confrontationFixture()
                : undefined,
        ),
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    render(<App />);
    await screen.findByRole('heading', { name: 'Dernière exécution' });
    await user.type(screen.getByLabelText('Prénom'), 'PRIVATE-NAME');
    await fillPurchase(user);
    expect(fetcher).toHaveBeenCalledTimes(3);
    await user.click(screen.getByRole('button', { name: 'Simuler l’achat' }));
    await screen.findByRole('heading', { name: 'Résultat de votre simulation' });
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain('PRIVATE-NAME');
    expect(
      (screen.getByLabelText('Prix maximum par part, hors frais (€)') as HTMLInputElement).value,
    ).toBe('');
  });
});
