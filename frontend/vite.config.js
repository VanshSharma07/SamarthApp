import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import svgr from 'vite-plugin-svgr'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Samarth App',
        short_name: 'Samarth',
        description: 'Samarth App - Your Personal Assistant',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // Increased cache limit to 6MB
      }
    }),
    svgr({
      svgrOptions: {
        icon: true,
      },
    })
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/analyze': {
        target: 'https://samarth-backend-233596067763.us-central1.run.app',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    },
    historyApiFallback: true
  },
  build: {
    chunkSizeWarningLimit: 2000, // Avoid warnings for large chunks
  }
})
