import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { App } from '../../src/App';
import { MarketYield } from '../../src/routes/Market/components/MarketYield';
import { marketResponse } from './market-fixture';
import { yieldFixture } from './yield-fixture';

vi.mock('../../src/routes/Market/components/MarketConfrontation', () => ({
  MarketConfrontation: () => null,
}));

describe('Yield UI and integration', () => {
  it('shows loading then the yield, year, exact input data, excluded fixed fees and sources', async () => {
    let finish!: (value: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    render(<MarketYield scpiId="primopierre" />);
    expect(screen.getByRole('status').textContent).toContain('Chargement du rendement');
    await act(async () => finish(marketResponse(yieldFixture())));
    expect(await screen.findByText(/13,027\s%/)).toBeTruthy();
    expect(screen.getByText(/4,56\s€/)).toBeTruthy();
    expect(screen.getByText(/4,8\s% du prix vendeur/)).toBeTruthy();
    expect(screen.getByText(/5\s% du prix vendeur/)).toBeTruthy();
    expect(screen.getByText(/Dividende annuel brut par part \(2025\)/)).toBeTruthy();
    expect(screen.getByText(/Frais fixes exclus/)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Source du dividende · pages 6' }).getAttribute('href'),
    ).toBe(yieldFixture().dividend.source.url);
    expect(screen.getByRole('link', { name: 'Source des frais · pages 20, 24' })).toBeTruthy();
  });
  it('shows zero as a valid yield', async () => {
    const fixture = yieldFixture();
    fixture.annualYieldPercent = 0;
    fixture.dividend.grossPerShareCents = 0;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(marketResponse(fixture)));
    render(<MarketYield scpiId="primopierre" />);
    expect(await screen.findByText(/0\s%/)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('identifies stale yield data independently', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        marketResponse({
          ...yieldFixture(),
          freshness: 'stale',
          warnings: [{ code: 'STALE_DATA', message: 'Last collection' }],
        }),
      ),
    );
    render(<MarketYield scpiId="primopierre" />);
    expect(
      (
        await screen.findByText(/Rendement calculé avec les dernières données de secours/)
      ).getAttribute('role'),
    ).toBe('status');
  });
  it('explains missing annual data and recovers on retry', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          marketResponse({ error: { code: 'YIELD_DATA_UNAVAILABLE', message: 'private' } }, 503),
        )
        .mockResolvedValueOnce(marketResponse(yieldFixture())),
    );
    render(<MarketYield scpiId="primopierre" />);
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Aucun rendement de substitution',
    );
    expect(screen.queryByText(/13,027/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Réessayer le rendement' }));
    expect(await screen.findByText(/13,027\s%/)).toBeTruthy();
  });
  it('aborts and ignores old SCPI results', async () => {
    const pending: { resolve: (value: Response) => void; signal: AbortSignal }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, options: RequestInit) =>
          new Promise<Response>((resolve) =>
            pending.push({ resolve, signal: options.signal as AbortSignal }),
          ),
      ),
    );
    const view = render(<MarketYield scpiId="primopierre" />);
    view.rerender(<MarketYield scpiId="other-fund" />);
    expect(pending[0]!.signal.aborted).toBe(true);
    const next = yieldFixture();
    next.scpi.id = 'other-fund';
    next.annualYieldPercent = 9.1234;
    await act(async () => pending[1]!.resolve(marketResponse(next)));
    expect(await screen.findByText(/9,1234\s%/)).toBeTruthy();
    await act(async () => pending[0]!.resolve(marketResponse(yieldFixture())));
    expect(screen.queryByText(/13,027/)).toBeNull();
    view.unmount();
  });
  it('aborts an in-flight yield request on unmount', () => {
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
    const view = render(<MarketYield scpiId="primopierre" />);
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
  it('keeps market and email usable if yield is unavailable; retry only queries yield', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn((url: string) =>
      Promise.resolve(
        url.endsWith('/yield')
          ? marketResponse({ error: { code: 'YIELD_DATA_UNAVAILABLE', message: 'private' } }, 503)
          : marketResponse(),
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Dernière exécution' })).toBeTruthy();
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Aucun rendement de substitution',
    );
    await user.type(screen.getByLabelText('Prénom'), 'PRIVATE-NAME');
    await user.click(screen.getByRole('button', { name: 'Réessayer le rendement' }));
    expect(fetcher.mock.calls.filter(([url]) => url.endsWith('/market'))).toHaveLength(1);
    expect(fetcher.mock.calls.filter(([url]) => url.endsWith('/yield'))).toHaveLength(2);
    expect((screen.getByLabelText('Prénom') as HTMLInputElement).value).toBe('PRIVATE-NAME');
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain('PRIVATE-NAME');
  });
  it('can display yield independently when the market query fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          url.endsWith('/yield')
            ? marketResponse(yieldFixture())
            : marketResponse({ error: { code: 'SOURCE_TIMEOUT', message: 'private' } }, 504),
        ),
      ),
    );
    render(<App />);
    expect(await screen.findByText(/13,027\s%/)).toBeTruthy();
    expect((await screen.findByRole('alert')).textContent).toContain('délai');
    const yieldSection = screen
      .getByRole('heading', { name: 'Rendement annuel brut' })
      .closest('section')!;
    expect(within(yieldSection).queryByRole('alert')).toBeNull();
  });
});
