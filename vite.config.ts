import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  root: 'client',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5050',
      '/health': 'http://localhost:5050',
      '/ws': {
        target: 'ws://localhost:5050',
        ws: true,
      },
    },
  },
});
