import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base '/' for local dev/watch, '/travel-map/' for GitHub Pages production build
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/travel-map/' : '/',
  build: {
    // MapLibre is large by nature; keep it in its own cacheable chunk.
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks: { maplibre: ['maplibre-gl'] },
      },
    },
  },
}))
