import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

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
});