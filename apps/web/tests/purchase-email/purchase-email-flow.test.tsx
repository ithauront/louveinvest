import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PurchaseEmailPage } from '../../src/routes/PurchaseEmail/PurchaseEmail';
import * as draftExport from '../../src/services/purchase-email/draft-export';

async function fillProject(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Prénom'), 'Marie');
  await user.type(screen.getByLabelText('Nom', { exact: true }), 'Dupont');
  await user.type(screen.getByLabelText('Nombre de parts souhaité'), '10');
  await user.type(screen.getByLabelText('Prix maximum par part, hors frais (€)'), '31,88');
}
async function prepare(user: ReturnType<typeof userEvent.setup>) {
  await fillProject(user);
  await user.click(screen.getByRole('button', { name: /Préparer mon email/ }));
}

describe('Purchase email journey', () => {
  it('builds a preview with required data and never calls an API or persists personal data', async () => {
    const user = userEvent.setup();
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const persist = vi.spyOn(Storage.prototype, 'setItem');
    render(<PurchaseEmailPage />);
    await prepare(user);
    const preview = screen.getByLabelText('Texte complet de l’email') as HTMLTextAreaElement;
    expect(preview.value).toContain('serviceclients@praemiareim.com');
    expect(preview.value).toContain('Prénom : Marie');
    expect(preview.value).toContain('hors frais : 31,88\u00a0€');
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Votre email est prêt à relire' }),
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });
  it('shows and focuses a validation summary instead of creating an incomplete preview', async () => {
    const user = userEvent.setup();
    render(<PurchaseEmailPage />);
    await user.click(screen.getByRole('button', { name: /Préparer mon email/ }));
    expect(document.activeElement).toBe(screen.getByRole('alert'));
    expect(screen.getByLabelText('Prénom').getAttribute('aria-invalid')).toBe('true');
    expect(screen.queryByLabelText('Texte complet de l’email')).toBeNull();
  });
  it('requires the associate number conditionally and excludes it after unchecking', async () => {
    const user = userEvent.setup();
    render(<PurchaseEmailPage />);
    await fillProject(user);
    const checkbox = screen.getByRole('checkbox', { name: /déjà associé/ });
    await user.click(checkbox);
    await user.click(screen.getByRole('button', { name: /Préparer mon email/ }));
    expect(screen.getByLabelText('Numéro d’associé').getAttribute('aria-invalid')).toBe('true');
    await user.type(screen.getByLabelText('Numéro d’associé'), 'PRIVATE-ID');
    await user.click(checkbox);
    await user.click(screen.getByRole('button', { name: /Préparer mon email/ }));
    expect(
      (screen.getByLabelText('Texte complet de l’email') as HTMLTextAreaElement).value,
    ).not.toContain('PRIVATE-ID');
  });
  it('retains values while editing and regenerates the preview from the new values', async () => {
    const user = userEvent.setup();
    render(<PurchaseEmailPage />);
    await prepare(user);
    await user.click(screen.getByRole('button', { name: 'Modifier les informations' }));
    expect((screen.getByLabelText('Prénom') as HTMLInputElement).value).toBe('Marie');
    expect(document.activeElement).toBe(screen.getByLabelText('Prénom'));
    await user.clear(screen.getByLabelText('Nombre de parts souhaité'));
    await user.type(screen.getByLabelText('Nombre de parts souhaité'), '25');
    await user.click(screen.getByRole('button', { name: /Préparer mon email/ }));
    expect(
      (screen.getByLabelText('Texte complet de l’email') as HTMLTextAreaElement).value,
    ).toContain('Nombre de parts souhaité : 25');
  });
  it('copies the complete draft and confirms only after success', async () => {
    const user = userEvent.setup();
    render(<PurchaseEmailPage />);
    await prepare(user);
    const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    await user.click(screen.getByRole('button', { name: 'Copier l’email' }));
    expect(write).toHaveBeenCalledWith(
      (screen.getByLabelText('Texte complet de l’email') as HTMLTextAreaElement).value,
    );
    expect(screen.getByRole('status').textContent).toContain('Email copié');
  });
  it('selects the text and offers manual recovery when clipboard access is denied', async () => {
    const user = userEvent.setup();
    render(<PurchaseEmailPage />);
    await prepare(user);
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Denied'));
    await user.click(screen.getByRole('button', { name: 'Copier l’email' }));
    expect(screen.getByRole('alert').textContent).toContain('copiez-le manuellement');
    const preview = screen.getByLabelText('Texte complet de l’email') as HTMLTextAreaElement;
    expect(document.activeElement).toBe(preview);
    expect(preview.selectionStart).toBe(0);
    expect(preview.selectionEnd).toBe(preview.value.length);
  });
  it('downloads the draft with a fixed filename that contains no personal data', async () => {
    const user = userEvent.setup();
    render(<PurchaseEmailPage />);
    await prepare(user);
    const download = vi.spyOn(draftExport, 'downloadDraft').mockImplementation(() => {});
    await user.click(screen.getByRole('button', { name: /Télécharger le texte/ }));
    expect(download).toHaveBeenCalledWith(
      expect.stringContaining('Marie Dupont'),
      'projet-achat-primopierre.txt',
    );
    expect(screen.getByRole('status').textContent).toContain('Téléchargement');
  });
  it('keeps the preview recoverable when file export fails', async () => {
    const user = userEvent.setup();
    render(<PurchaseEmailPage />);
    await prepare(user);
    vi.spyOn(draftExport, 'downloadDraft').mockImplementation(() => {
      throw new Error('Blocked');
    });
    await user.click(screen.getByRole('button', { name: /Télécharger le texte/ }));
    expect(screen.getByRole('alert').textContent).toContain('Le téléchargement a échoué');
    expect(screen.getByLabelText('Texte complet de l’email')).toBeTruthy();
  });
  it('clears personal information and the generated draft on explicit reset', async () => {
    const user = userEvent.setup();
    render(<PurchaseEmailPage />);
    await prepare(user);
    await user.click(screen.getByRole('button', { name: 'Effacer et recommencer' }));
    expect((screen.getByLabelText('Prénom') as HTMLInputElement).value).toBe('');
    expect(screen.queryByLabelText('Texte complet de l’email')).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText('Prénom'));
  });
  it('rejects fractional shares and a price with excessive decimal places in the actual form', async () => {
    const user = userEvent.setup();
    render(<PurchaseEmailPage />);
    await fillProject(user);
    fireEvent.change(screen.getByLabelText('Nombre de parts souhaité'), {
      target: { value: '1.5' },
    });
    fireEvent.change(screen.getByLabelText('Prix maximum par part, hors frais (€)'), {
      target: { value: '31,888' },
    });
    await user.click(screen.getByRole('button', { name: /Préparer mon email/ }));
    expect(screen.getByLabelText('Nombre de parts souhaité').getAttribute('aria-invalid')).toBe(
      'true',
    );
    expect(
      screen.getByLabelText('Prix maximum par part, hors frais (€)').getAttribute('aria-invalid'),
    ).toBe('true');
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('alert')));
  });
});
