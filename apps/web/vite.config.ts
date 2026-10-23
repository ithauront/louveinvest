import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  base: loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '').VITE_BASE_PATH || '/',
  plugins: [react()],
  server: {
    watch: { usePolling: true },
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3333' },
  },
}));
