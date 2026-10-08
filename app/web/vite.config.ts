import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En dev, /api est proxifié vers l'API locale (même origine → pas de CORS).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    },
  },
});
