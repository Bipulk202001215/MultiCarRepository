import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    strictPort: true,
    host: true,
    // Proxy API requests to backend to avoid CORS issues
    proxy: {
      '/api': {
        target: 'http://139.84.210.248:8080',
        changeOrigin: true,
        secure: false,
        // Rewrite: remove /api prefix if backend doesn't use it
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    port: 3001,
    strictPort: true,
    host: true,
  },
});

