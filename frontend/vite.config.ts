/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Force fresh build - cache bust for React error #185 fixes

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      '@frontend': path.resolve(__dirname, './src'),
      '@backend': path.resolve(__dirname, '../backend'),
      '@intelligence': path.resolve(__dirname, '../intelligence'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core vendor libraries
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/zustand')) {
            return 'vendor-zustand';
          }
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/socket.io-client')) {
            return 'vendor-socket';
          }
          if (id.includes('node_modules')) {
            return 'vendor-misc';
          }
          
          // Intelligence engines (large)
          if (id.includes('pattern-analysis-engine') || 
              id.includes('pattern-ranking-engine') || 
              id.includes('tile-recommendation-engine')) {
            return 'intelligence-engines';
          }
          if (id.includes('pattern-variation-loader') || id.includes('analysis-engine')) {
            return 'intelligence-core';
          }
          
          // Services
          if (id.includes('services/nmjl') || id.includes('services/charleston')) {
            return 'services-data';
          }
          if (id.includes('services/')) {
            return 'services-misc';
          }
          
          // Stores (split large stores)
          if (id.includes('stores/intelligence-store') || id.includes('stores/pattern-store')) {
            return 'stores-heavy';
          }
          if (id.includes('stores/')) {
            return 'stores-core';
          }
          
          // Features (lazy-loadable)
          if (id.includes('features/gameplay') || id.includes('features/charleston')) {
            return 'features-game';
          }
          if (id.includes('features/')) {
            return 'features-ui';
          }
        }
      }
    },
    chunkSizeWarningLimit: 500,
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});