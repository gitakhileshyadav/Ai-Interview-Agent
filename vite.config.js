import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // Local dev: proxy API calls to Vercel dev server (vercel dev)
    proxy: {
      '/api': 'http://localhost:3000',
    },
  }
})