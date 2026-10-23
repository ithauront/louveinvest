import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyDraft, downloadDraft } from '../../src/services/purchase-email/draft-export';

afterEach(() => {
  vi.useRealTimers();
});

describe('Draft clipboard adapter', () => {
  it('copies the complete plain text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await copyDraft('À : contact@example.com\nObjet : Projet\n\nBonjour');
    expect(writeText).toHaveBeenCalledExactlyOnceWith(
      'À : contact@example.com\nObjet : Projet\n\nBonjour',
    );
  });
  it('reports unsupported clipboard access explicitly', async () => {
    vi.stubGlobal('navigator', {});
    await expect(copyDraft('Draft')).rejects.toMatchObject({ code: 'CLIPBOARD_UNAVAILABLE' });
  });
  it('preserves a denied clipboard error as its cause', async () => {
    const cause = new DOMException('Denied', 'NotAllowedError');
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(cause) } });
    await expect(copyDraft('Draft')).rejects.toMatchObject({ code: 'COPY_FAILED', cause });
  });
});

describe('Draft file adapter', () => {
  function setup() {
    vi.useFakeTimers();
    const create = vi.fn().mockReturnValue('blob:local-draft');
    const revoke = vi.fn();
    const NativeURL = globalThis.URL;
    vi.stubGlobal(
      'URL',
      class extends NativeURL {
        static createObjectURL = create;
        static revokeObjectURL = revoke;
      },
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    return { create, revoke, click };
  }
  it('creates a UTF-8 text download, removes the anchor and releases its URL', () => {
    const { create, revoke, click } = setup();
    downloadDraft('Bonjour Éléonore', 'projet-achat-primopierre.txt');
    const blob = create.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/plain;charset=utf-8');
    expect(click).toHaveBeenCalledOnce();
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('projet-achat-primopierre.txt');
    expect(anchor.href).toBe('blob:local-draft');
    expect(anchor.isConnected).toBe(false);
    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:local-draft');
  });
  it('reports download failure and still cleans up resources', () => {
    const { click, revoke } = setup();
    click.mockImplementation(() => {
      throw new Error('Blocked');
    });
    expect(() => downloadDraft('Draft', 'draft.txt')).toThrow(
      expect.objectContaining({ code: 'DOWNLOAD_FAILED' }),
    );
    expect(document.querySelector('a')).toBeNull();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledOnce();
  });
});
