import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../../api/src/app.js';
import { MarketSourceError } from '../../../api/src/application/secondary-market/errors/market-source-error.js';
import { PrimopierreMarketSource } from '../../../api/src/infra/market-data/praemia/primopierre-market-source.js';

const marketHtml = readFileSync(
  resolve(process.cwd(), '../api/tests/fixtures/primopierre-market.html'),
  'utf8',
);
import { App } from '../../src/App';

let api: FastifyInstance | undefined;
afterEach(async () => {
  await api?.close();
  api = undefined;
  vi.restoreAllMocks();
});

function setup() {
  const get = vi.fn().mockResolvedValue(marketHtml);
  const source = new PrimopierreMarketSource(
    { get },
    undefined,
    () => new Date('2026-10-23T10:00:00Z'),
  );
  api = buildApp({
    logger: false,
    marketDataSources: new Map([['primopierre', source]]),
    now: () => new Date('2026-10-23T10:00:00Z'),
  });
  const server = api;
  const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
    const response = await server.inject({
      method: options?.method === 'POST' ? 'POST' : 'GET',
      url,
      headers: options?.headers as Record<string, string>,
      payload: options?.body as string | undefined,
    });
    return new Response(response.body, {
      status: response.statusCode,
      headers: { 'content-type': String(response.headers['content-type']) },
    });
  });
  vi.stubGlobal('fetch', fetcher);
  return { get, fetcher };
}
function fill(label: string, value: string) {
  return userEvent.type(screen.getByLabelText(label, { exact: true }), value);
}
async function email(user: ReturnType<typeof userEvent.setup>, associate = false) {
  await fill('Prénom', 'Éléonore');
  await fill('Nom', 'Martin');
  if (associate) {
    await user.click(screen.getByRole('checkbox', { name: /déjà associé/ }));
    await fill('Numéro d’associé', 'ASSOC-123');
  }
  await fill('Nombre de parts souhaité', '10');
  await fill('Prix maximum par part, hors frais (€)', '31,88');
  await user.click(screen.getByRole('button', { name: 'Préparer mon email' }));
  return screen.getByLabelText('Texte complet de l’email') as HTMLTextAreaElement;
}
async function accessible() {
  // jsdom has no visual layout; contrast/scrollability are separately checked in the real browser.
  const result = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });
  expect(
    result.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}

describe('Parcours intégré : HTML capturé → vraie API → React → email', () => {
  it.each([false, true])(
    'vérifie les valeurs, la simulation, le graphique et la récupération (associé=%s)',
    async (associate) => {
      const user = userEvent.setup();
      const { fetcher, get } = setup();
      const persist = vi.spyOn(Storage.prototype, 'setItem');
      render(<App />);
      await screen.findByRole('heading', { name: 'Dernière exécution' });
      const yieldSection = screen.getByRole('region', { name: 'Rendement annuel brut' });
      expect(await within(yieldSection).findByText(/13,027\s%/)).toBeTruthy();
      expect(within(yieldSection).getByText(/4,56\s€/)).toBeTruthy();
      expect(within(yieldSection).getByText(/35,00\s€/)).toBeTruthy();
      const confrontation = screen.getByRole('region', {
        name: 'Estimation de la prochaine confrontation',
      });
      expect(await within(confrontation).findByText('Prix vendeur estimé hors frais')).toBeTruthy();
      expect(within(confrontation).getByText(/20,00\s€/, { selector: 'strong' })).toBeTruthy();
      expect(within(confrontation).getByText('752', { selector: 'dd' })).toBeTruthy();
      await fill('Quantité simulée (parts)', '10');
      await fill('Coût fixe total hypothétique (€)', '10');
      await fill('Prix vendeur simulé par part, hors frais (€)', '31,88');
      await user.click(screen.getByRole('button', { name: 'Simuler l’achat' }));
      const result = await screen.findByRole('region', { name: 'Résultat de votre simulation' });
      expect(within(result).getByText(/360,04\s€/)).toBeTruthy();
      expect(within(result).getByText(/12,6652\s%/)).toBeTruthy();
      await fill('Prix minimum hors frais (€)', '30');
      await fill('Prix maximum hors frais (€)', '32');
      await fill('Pas de prix (€)', '1');
      await user.click(screen.getByRole('button', { name: 'Tracer la courbe' }));
      await screen.findByRole('img', { name: /Rendement annuel brut selon le prix vendeur/ });
      await user.click(screen.getByText('Consulter toutes les valeurs (3 points)'));
      const curveTable = screen.getByRole('table', {
        name: 'Rendement par prix vendeur hors frais',
      });
      const rows = within(curveTable).getAllByRole('row');
      expect(rows).toHaveLength(4);
      expect(rows[1]!.textContent).toContain('339,40');
      expect(rows[3]!.textContent).toContain('12,619');
      await accessible();
      const beforeEmail = fetcher.mock.calls.length;
      const preview = await email(user, associate);
      expect(preview.value).toContain('Éléonore Martin');
      expect(preview.value).toContain('hors frais : 31,88\u00a0€');
      expect(preview.value.includes('ASSOC-123')).toBe(associate);
      expect(document.activeElement).toBe(
        screen.getByRole('heading', { name: 'Votre email est prêt à relire' }),
      );
      const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
      await user.click(screen.getByRole('button', { name: 'Copier l’email' }));
      expect(copy).toHaveBeenCalledWith(preview.value);
      const create = vi.fn().mockReturnValue('blob:journey'),
        NativeURL = globalThis.URL;
      vi.stubGlobal(
        'URL',
        class extends NativeURL {
          static createObjectURL = create;
          static revokeObjectURL = vi.fn();
        },
      );
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      await user.click(screen.getByRole('button', { name: 'Télécharger le texte (.txt)' }));
      expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe(
        'projet-achat-primopierre.txt',
      );
      const blob = create.mock.calls[0]![0] as Blob;
      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsText(blob);
      });
      expect(text).toBe(preview.value);
      await user.click(screen.getByRole('button', { name: 'Modifier les informations' }));
      expect(document.activeElement).toBe(screen.getByLabelText('Prénom'));
      await user.clear(screen.getByLabelText('Nombre de parts souhaité'));
      await fill('Nombre de parts souhaité', '12');
      await user.click(screen.getByRole('button', { name: 'Préparer mon email' }));
      expect(
        (screen.getByLabelText('Texte complet de l’email') as HTMLTextAreaElement).value,
      ).toContain('Nombre de parts souhaité : 12');
      await accessible();
      expect(fetcher).toHaveBeenCalledTimes(beforeEmail);
      expect(persist).not.toHaveBeenCalled();
      expect(get).toHaveBeenCalledOnce();
      expect(JSON.stringify(fetcher.mock.calls)).not.toContain('ASSOC-123');
      expect(JSON.stringify(fetcher.mock.calls)).not.toContain('Éléonore');
      await user.click(screen.getByRole('button', { name: 'Effacer et recommencer' }));
      expect((screen.getByLabelText('Prénom') as HTMLInputElement).value).toBe('');
    },
    20_000,
  );

  it('conserve le focus sur les boutons d’actualisation et rend les tableaux accessibles au clavier', async () => {
    const user = userEvent.setup();
    setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Dernière exécution' });
    for (const name of [
      'Actualiser les données',
      'Actualiser le rendement',
      'Actualiser l’estimation',
    ]) {
      const button = await screen.findByRole('button', { name });
      await waitFor(() => expect(button.getAttribute('aria-disabled')).toBe('false'));
      await user.click(button);
      await waitFor(() => expect(button.getAttribute('aria-disabled')).toBe('false'));
      expect(document.activeElement).toBe(button);
    }
    for (const name of ['Carnet des achats', 'Carnet des ventes', 'Historique des prix et volumes'])
      expect(screen.getByRole('region', { name }).tabIndex).toBe(0);
    expect(screen.getByRole('main').tabIndex).toBe(-1);
  });

  it('affiche le fallback stale puis une erreur au-delà de sa durée, sans bloquer l’email', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const user = userEvent.setup();
    const { get } = setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Dernière exécution' });
    now = 30 * 60_000;
    get.mockRejectedValue(new MarketSourceError('SOURCE_TIMEOUT', 'private diagnostic'));
    await user.click(screen.getByRole('button', { name: 'Actualiser les données' }));
    await screen.findByText(/Données de secours/);
    now = 2 * 60 * 60_000;
    await user.click(screen.getByRole('button', { name: 'Actualiser les données' }));
    expect((await screen.findByRole('alert')).textContent).toContain('délai');
    expect(screen.queryByRole('heading', { name: 'Dernière exécution' })).toBeNull();
    await email(user);
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new DOMException('Denied', 'NotAllowedError'),
    );
    await user.click(screen.getByRole('button', { name: 'Copier l’email' }));
    const preview = screen.getByLabelText('Texte complet de l’email') as HTMLTextAreaElement;
    expect(document.activeElement).toBe(preview);
    expect(preview.selectionEnd).toBe(preview.value.length);
    const NativeURL = globalThis.URL;
    vi.stubGlobal(
      'URL',
      class extends NativeURL {
        static createObjectURL(): string {
          throw new Error('blocked');
        }
      },
    );
    await user.click(screen.getByRole('button', { name: 'Télécharger le texte (.txt)' }));
    expect(await screen.findByText(/Le téléchargement a échoué/)).toBeTruthy();
    expect(screen.getByLabelText('Texte complet de l’email')).toBeTruthy();
  }, 15_000);

  it('annonce et relie les erreurs de saisie sans envoyer de données personnelles', async () => {
    const user = userEvent.setup();
    const { get, fetcher } = setup();
    get.mockRejectedValue(new MarketSourceError('SOURCE_UNAVAILABLE', 'private'));
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Préparer mon email' }));
    const summary = screen
      .getByText('Vérifiez les informations suivantes :')
      .closest<HTMLElement>('[role="alert"]')!;
    expect(document.activeElement).toBe(summary);
    expect(screen.getByLabelText('Prénom').getAttribute('aria-invalid')).toBe('true');
    await user.click(within(summary).getAllByRole('link')[0]!);
    await accessible();
    expect(fetcher.mock.calls.every(([, options]) => options?.body === undefined)).toBe(true);
  }, 15_000);
});
