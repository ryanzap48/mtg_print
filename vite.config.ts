import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: {
    format: 'es',
    // Workers are built separately, so they need their own naming to land alongside the rest.
    rollupOptions: { output: { entryFileNames: 'assets/js/[name]-[hash].js' } },
  },
  // pdf-lib is imported only by the PDF worker, so the dev server would otherwise discover it
  // lazily on the first export and force a page reload ("optimized dependencies changed")
  // mid-generation, silently killing the worker. Pre-bundling it at startup avoids that.
  optimizeDeps: { include: ['@cantoo/pdf-lib'] },
  build: {
    rollupOptions: {
      output: {
        // Readable, foldered output: assets/js/main-<hash>.js, assets/css/index-<hash>.css.
        // The hash is deliberate — it is what lets these be cached forever and still update
        // the moment their contents change.
        entryFileNames: 'assets/js/[name]-[hash].js',
        chunkFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react'
          return 'vendor'
        },
      },
    },
  },
})
