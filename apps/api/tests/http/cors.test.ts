import { describe, expect, it } from 'vitest';

import { buildApp } from '../../src/app.js';

const origin = 'https://ithauront.github.io';

describe('Deployed frontend CORS', () => {
  it('allows reading JSON from the configured frontend', async () => {
    const app = buildApp({ logger: false, allowedOrigin: origin });
    try {
      const response = await app.inject({ url: '/api/health', headers: { origin } });
      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-credentials']).toBeUndefined();
    } finally {
      await app.close();
    }
  });

  it('accepts JSON POST preflights for simulations', async () => {
    const app = buildApp({ logger: false, allowedOrigin: origin });
    try {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/api/scpis/primopierre/yield-simulation',
        headers: {
          origin,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type',
        },
      });
      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toBe('Content-Type');
    } finally {
      await app.close();
    }
  });

  it('does not reflect an arbitrary requesting origin', async () => {
    const app = buildApp({ logger: false, allowedOrigin: origin });
    try {
      const response = await app.inject({
        url: '/api/health',
        headers: { origin: 'https://unrelated.example' },
      });
      expect(response.headers['access-control-allow-origin']).toBe(origin);
    } finally {
      await app.close();
    }
  });

  it('keeps local same-origin use without CORS configuration', async () => {
    const app = buildApp({ logger: false });
    try {
      const response = await app.inject({ url: '/api/health', headers: { origin } });
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      await app.close();
    }
  });
});
