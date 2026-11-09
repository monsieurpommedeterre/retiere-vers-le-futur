import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Sur GitHub Pages, le site est servi sous /<nom-du-depot>/ :
// le workflow .github/workflows/deploy.yml renseigne VITE_BASE_PATH automatiquement.
const base = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Retiere vers le futur',
        short_name: 'Retiere',
        description: "Minuteur d'entraînement : tours, séries, mises en place, avec carillon de fin de série.",
        lang: 'fr',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#141a26',
        background_color: '#141a26',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,ico,woff2}'],
        // Les grandes icônes ne servent qu'à l'installation : inutile de les mettre en cache hors-ligne.
        globIgnores: ['**/pwa-512x512.png', '**/maskable-icon-512x512.png'],
      },
    }),
  ],
});
