import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const marketHtml = readFileSync(
  fileURLToPath(new URL('../fixtures/primopierre-market.html', import.meta.url)),
  'utf8',
);
