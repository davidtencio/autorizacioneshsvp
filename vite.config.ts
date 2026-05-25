/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('firebase')) return 'firebase'
          if (id.includes('react-virtuoso')) return 'virtuoso'
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'

          return 'vendor'
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    exclude: ['firestore-rules-tests/**'],
  },
})
