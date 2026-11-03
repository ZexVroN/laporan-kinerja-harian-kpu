import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Backend Laravel saat pengembangan (php artisan serve).
const backend = process.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:8000'

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Hasil build disajikan Laravel dari public/spa (satu domain, tanpa Node di server).
  // Hanya berkas aset yang berada di /spa/; alamat halaman tetap /beranda, /laporan, dst.
  base: command === 'build' ? '/spa/' : '/',
  build: {
    outDir: '../backend/public/spa',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // Proxy membuat browser melihat satu origin, sehingga cookie sesi & CSRF Sanctum berfungsi.
    proxy: {
      '/api': { target: backend, changeOrigin: false },
      '/sanctum': { target: backend, changeOrigin: false },
    },
  },
}))
