import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../../src/App';
import { MarketPage } from '../../src/routes/Market/Market';
import { marketFixture, marketResponse } from './market-fixture';

// This suite isolates the market slice; both real queries are covered in yield-page.test.tsx.
vi.mock('../../src/routes/Market/components/MarketYield', () => ({ MarketYield: () => null }));

vi.mock('../../src/routes/Market/components/MarketConfrontation', () => ({
  MarketConfrontation: () => null,
}));

describe('Market page', () => {
  it('shows loading followed by real prices, book, history and provenance', async () => {
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
    render(<MarketPage />);
    expect(screen.getByRole('status').textContent).toContain('Chargement');
    await act(async () => finish(marketResponse()));
    expect(await screen.findByRole('heading', { name: 'Primopierre' })).toBeTruthy();
    const execution = screen
      .getByRole('heading', { name: 'Dernière exécution' })
      .closest('section')!;
    expect(within(execution).getByText(/31,88\s€/)).toBeTruthy();
    expect(within(execution).getByText(/35,00\s€/)).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Achats' }).textContent).toContain('1\u202f000');
    expect(screen.getByRole('table', { name: 'Ventes' }).textContent).toContain('32,00');
    expect(
      screen.getByRole('link', { name: 'Consulter la source officielle' }).getAttribute('href'),
    ).toBe(marketFixture().source.url);
    expect(screen.getByText(/Mise à jour publiée/).textContent).toContain(
      '23 octobre 2026 à 11:30',
    );
    expect(screen.getByText(/Horaires de Paris/)).toBeTruthy();
  });
  it('shows stale data with a visible explanation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        marketResponse({
          ...marketFixture(),
          freshness: 'stale',
          warnings: [{ code: 'STALE_DATA', message: 'Last valid collection' }],
        }),
      ),
    );
    render(<MarketPage />);
    expect((await screen.findByText(/Données de secours/)).getAttribute('role')).toBe('status');
    expect(screen.getByRole('heading', { name: 'Primopierre' })).toBeTruthy();
  });
  it('handles empty order book and history explicitly', async () => {
    const fixture = marketFixture();
    fixture.history = [];
    fixture.orderBook.bids = [];
    fixture.orderBook.asks = [];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(marketResponse(fixture)));
    render(<MarketPage />);
    expect(await screen.findByText('Aucun ordre d’achat publié.')).toBeTruthy();
    expect(screen.getByText('Aucun ordre de vente publié.')).toBeTruthy();
    expect(screen.getByText('Aucune exécution historique publiée.')).toBeTruthy();
  });
  it('offers retry after a source error and recovers', async () => {
    const user = userEvent.setup();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        marketResponse({ error: { code: 'SOURCE_UNAVAILABLE', message: 'private' } }, 502),
      )
      .mockResolvedValueOnce(marketResponse());
    vi.stubGlobal('fetch', fetcher);
    render(<MarketPage />);
    expect((await screen.findByRole('alert')).textContent).toContain('momentanément indisponible');
    expect(screen.queryByText('private')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByRole('heading', { name: 'Primopierre' })).toBeTruthy();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('does not keep obsolete data visible after a failed manual refresh', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(marketResponse())
        .mockRejectedValueOnce(new TypeError('offline')),
    );
    render(<MarketPage />);
    await screen.findByRole('heading', { name: 'Primopierre' });
    await user.click(screen.getByRole('button', { name: 'Actualiser les données' }));
    expect((await screen.findByRole('alert')).textContent).toContain('connexion');
    expect(screen.queryByRole('heading', { name: 'Dernière exécution' })).toBeNull();
  });
  it('aborts requests when unmounted', () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_path: string, options: RequestInit) => {
        signal = options.signal as AbortSignal;
        return new Promise(() => {});
      }),
    );
    const view = render(<MarketPage />);
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
  it('ignores late results from a previous SCPI even if the transport ignores abort', async () => {
    const pending: ((response: Response) => void)[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((resolve) => pending.push(resolve))),
    );
    const view = render(<MarketPage />);
    view.rerender(<MarketPage scpiId="another-fund" />);
    const other = marketFixture();
    other.scpi = { ...other.scpi, id: 'another-fund', name: 'Another fund' };
    await act(async () => pending[1]!(marketResponse(other)));
    expect(await screen.findByRole('heading', { name: 'Another fund' })).toBeTruthy();
    await act(async () => pending[0]!(marketResponse()));
    expect(screen.queryByRole('heading', { name: 'Primopierre' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Another fund' })).toBeTruthy();
  });
  it('integrates market and email in App without sending form values', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue(marketResponse());
    vi.stubGlobal('fetch', fetcher);
    render(<App />);
    await screen.findByRole('heading', { name: 'Dernière exécution' });
    expect(screen.getByRole('navigation', { name: 'Parcours d’achat' })).toBeTruthy();
    await user.type(screen.getByLabelText('Prénom'), 'PRIVATE-NAME');
    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain('PRIVATE-NAME');
    expect(screen.getByRole('link', { name: /Préparer mon projet/ }).getAttribute('href')).toBe(
      '#purchase-email',
    );
  });
});
