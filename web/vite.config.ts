/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { navigateFallbackDenylist: [/^\/api\//] },
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Ora', short_name: 'Ora', description: 'A calm, bilingual daily planner.',
        theme_color: '#2E74BA', background_color: '#F4F8FC', display: 'standalone', start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  // dev: the API runs on :8080; same-origin /api like production (the Caddy gateway strips the prefix)
  server: { host: true, proxy: { '/api': { target: 'http://127.0.0.1:8080', changeOrigin: false, rewrite: (p) => p.replace(/^\/api/, '') } } },
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] }
});
