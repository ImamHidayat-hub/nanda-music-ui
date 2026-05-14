import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'], // Nanti lu tinggal taro gambar icon di folder public
      manifest: {
        name: "Nanda's Music",
        short_name: 'NandaMusic',
        description: 'Personal Music Player',
        theme_color: '#121212',
        background_color: '#121212',
        display: 'standalone', // INI YANG BIKIN FULL SCREEN KAYAK APLIKASI ASLI 🔥
        icons: [
          {
            src: 'pwa-192x192.png', // Syarat: Lu harus punya gambar logo ukuran 192x192 pixel
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png', // Syarat: Logo ukuran 512x512 pixel
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})