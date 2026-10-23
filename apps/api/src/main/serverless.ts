import type { IncomingMessage, ServerResponse } from 'node:http';

import { buildApp } from '../app.js';

// One application/cache per warm function instance; never start a listening socket.
const app = buildApp({ allowedOrigin: process.env.ALLOWED_ORIGIN });
const ready = app.ready();

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  await ready;
  app.server.emit('request', request, response);
}
