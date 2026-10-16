import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Fit leták',
        short_name: 'Fit leták',
        description: 'Akční ceny, fit produkty a jídelníčky podle aktuálních letáků.',
        lang: 'cs',
        theme_color: '#0e1f3d',
        background_color: '#f2f5f9',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/data/') && url.pathname.endsWith('.json'),
            // Fresh offers matter more than instant load; the cache is only the offline fallback.
            handler: 'NetworkFirst',
            options: { cacheName: 'data-json', networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
});
