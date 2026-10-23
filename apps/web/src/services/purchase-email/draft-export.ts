export class DraftExportError extends Error {
  constructor(
    readonly code: 'CLIPBOARD_UNAVAILABLE' | 'COPY_FAILED' | 'DOWNLOAD_FAILED',
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'DraftExportError';
  }
}

export async function copyDraft(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) throw new DraftExportError('CLIPBOARD_UNAVAILABLE');
  try {
    await navigator.clipboard.writeText(text);
  } catch (cause) {
    throw new DraftExportError('COPY_FAILED', { cause });
  }
}

export function downloadDraft(text: string, filename: string): void {
  let url: string | undefined;
  let anchor: HTMLAnchorElement | undefined;
  try {
    url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
  } catch (cause) {
    throw new DraftExportError('DOWNLOAD_FAILED', { cause });
  } finally {
    anchor?.remove();
    if (url) {
      const objectUrl = url;
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  }
}
