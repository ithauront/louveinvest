import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../../src/App';
import { MarketConfrontation } from '../../src/routes/Market/components/MarketConfrontation';
import { confrontationFixture } from './confrontation-fixture';
import { marketResponse } from './market-fixture';
import { yieldFixture } from './yield-fixture';

describe('Confrontation UI', () => {
  it('loads and shows estimated seller price, market volume, interval, dates, source and explanations', async () => {
    let finish!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    render(<MarketConfrontation scpiId="primopierre" />);
    expect(screen.getByRole('status').textContent).toContain('Chargement de l’estimation');
    await act(async () => finish(marketResponse(confrontationFixture())));
    expect(screen.getByText('Prix vendeur estimé hors frais')).toBeTruthy();
    expect(screen.getByText(/31,88\s€/, { selector: 'strong' })).toBeTruthy();
    expect(screen.getByText('364', { selector: 'dd' })).toBeTruthy();
    expect(screen.getByText(/31,88\s€ à 32,00\s€ \(bornes incluses\)/)).toBeTruthy();
    expect(screen.getByText('29 octobre 2026 à 16:00')).toBeTruthy();
    expect(screen.getByText(/une exécution partielle est supposée/)).toBeTruthy();
    expect(
      screen.getByText(/aucune exécution à la prochaine confrontation n’est garantie/),
    ).toBeTruthy();
    expect(screen.getByText(/pas une allocation à votre achat/)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Source du carnet d’ordres' }).getAttribute('href'),
    ).toBe(confrontationFixture().source.url);
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
  });
  it.each([
    ['empty-book', 'Carnet insuffisant'],
    ['no-crossing', 'Aucun croisement'],
  ] as const)('presents %s as no trade, not a failure or a zero price', async (status, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(marketResponse(confrontationFixture(status))));
    render(<MarketConfrontation scpiId="primopierre" />);
    expect(await screen.findByText(new RegExp(message))).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Prix vendeur estimé hors frais')).toBeNull();
    expect(screen.queryByText(/0,00\s€/)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Limites de l’estimation' })).toBeTruthy();
  });
  it('preserves a new source limitation rather than hiding it', async () => {
    const fixture = confrontationFixture();
    fixture.limitations.push('Nouvelle limite de la source');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(marketResponse(fixture)));
    render(<MarketConfrontation scpiId="primopierre" />);
    expect(await screen.findByText('Nouvelle limite de la source')).toBeTruthy();
  });
  it('identifies stale data specifically for the estimate', async () => {
    const fixture = confrontationFixture();
    fixture.freshness = 'stale';
    fixture.warnings = [{ code: 'STALE_DATA', message: 'Last collection' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(marketResponse(fixture)));
    render(<MarketConfrontation scpiId="primopierre" />);
    expect(
      (
        await screen.findByText(/Estimation calculée avec les dernières données de secours/)
      ).getAttribute('role'),
    ).toBe('status');
  });
  it('retries after failure and removes a previous result when refresh fails', async () => {
    const user = userEvent.setup();
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(marketResponse(confrontationFixture()))
      .mockRejectedValueOnce(new TypeError('offline'));
    vi.stubGlobal('fetch', fetcher);
    render(<MarketConfrontation scpiId="primopierre" />);
    expect((await screen.findByRole('alert')).textContent).toContain('momentanément indisponible');
    await user.click(screen.getByRole('button', { name: 'Réessayer l’estimation' }));
    expect(await screen.findByText('Prix vendeur estimé hors frais')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Actualiser l’estimation' }));
    await screen.findByRole('alert');
    expect(screen.queryByText('Prix vendeur estimé hors frais')).toBeNull();
  });
  it('ignores a late previous-SCPI result and cancels on identifier changes', async () => {
    const pending: { resolve: (response: Response) => void; signal: AbortSignal }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, options: RequestInit) =>
          new Promise<Response>((resolve) =>
            pending.push({ resolve, signal: options.signal as AbortSignal }),
          ),
      ),
    );
    const view = render(<MarketConfrontation scpiId="primopierre" />);
    view.rerender(<MarketConfrontation scpiId="other-fund" />);
    expect(pending[0]!.signal.aborted).toBe(true);
    const next = confrontationFixture('no-crossing');
    next.scpi.id = 'other-fund';
    await act(async () => pending[1]!.resolve(marketResponse(next)));
    expect(await screen.findByText(/Aucun croisement/)).toBeTruthy();
    await act(async () => pending[0]!.resolve(marketResponse(confrontationFixture())));
    expect(screen.queryByText('Prix vendeur estimé hors frais')).toBeNull();
  });
  it('keeps all three queries independent and does not send personal data', async () => {
    const user = userEvent.setup();
    let failEstimate = true;
    const fetcher = vi.fn((url: string) =>
      Promise.resolve(
        url.endsWith('/yield')
          ? marketResponse(yieldFixture())
          : url.endsWith('/confrontation-estimate')
            ? failEstimate
              ? marketResponse({ error: { code: 'SOURCE_TIMEOUT', message: 'private' } }, 504)
              : marketResponse(confrontationFixture())
            : marketResponse(),
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Dernière exécution' })).toBeTruthy();
    expect(await screen.findByText(/13,027\s%/)).toBeTruthy();
    const section = screen
      .getByRole('heading', { name: 'Estimation de la prochaine confrontation' })
      .closest('section')!;
    expect((await within(section).findByRole('alert')).textContent).toContain('délai');
    await user.type(screen.getByLabelText('Prénom'), 'PRIVATE-NAME');
    failEstimate = false;
    await user.click(within(section).getByRole('button', { name: 'Réessayer l’estimation' }));
    expect(await within(section).findByText('Prix vendeur estimé hors frais')).toBeTruthy();
    expect(fetcher.mock.calls.filter(([url]) => url.endsWith('/market'))).toHaveLength(1);
    expect(fetcher.mock.calls.filter(([url]) => url.endsWith('/yield'))).toHaveLength(1);
    expect(
      fetcher.mock.calls.filter(([url]) => url.endsWith('/confrontation-estimate')),
    ).toHaveLength(2);
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain('PRIVATE-NAME');
    expect(
      (screen.getByLabelText('Prix maximum par part, hors frais (€)') as HTMLInputElement).value,
    ).toBe('');
  });
});
