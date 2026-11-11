import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Lê o .env da raiz do repositório
  envDir: '..',
  server: {
    host: true,
    port: Number(process.env.FRONTEND_PORT) || 5173,
  },
});
