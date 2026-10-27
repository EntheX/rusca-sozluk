import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages'te depo adı alt klasör olur: BASE_PATH=/rusca-sozluk/ ile derle.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Rusça Sözlüğüm',
        short_name: 'Sözlüğüm',
        description: 'Yazdığın Rusça metinlerden kişisel sözlük',
        lang: 'tr',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#f6f5f1',
        theme_color: '#2f5bd3',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Morfoloji sözlüğü dahil her şey önbelleğe: ilk açılıştan sonra tamamen çevrimdışı.
        globPatterns: ['**/*.{js,css,html,svg,png,json,dawg,intdawg,array}'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        navigateFallback: base + 'index.html',
      },
    }),
  ],
})
