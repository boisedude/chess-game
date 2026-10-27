import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Use relative paths for subdirectory deployment
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    port: 3003,
    open: true,
  },
  worker: { format: 'es' },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disabled for production - protects source code and reduces bundle size
    minify: 'terser', // Better minification than default esbuild
    terserOptions: {
      compress: {
        drop_console: false, // Keep console.error for debugging, remove only console.log
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select'],
        },
      },
    },
  },
})
