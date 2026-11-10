import express from 'express';
import cors from 'cors';
import { HttpError } from './errors.js';
import { ROTA_UPLOADS, storage as storagePadrao } from './storage/index.js';

export function createApp({ storage = storagePadrao } = {}) {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json());

  if (storage.driver === 'local') {
    app.use(
      ROTA_UPLOADS,
      express.static(storage.pasta, {
        index: false,
        setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
      }),
    );
  }

  app.get('/', (req, res) => {
    res.json({ name: 'Sistema de gerenciamento de estoque API', health: '/health' });
  });

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  app.use((erro, req, res, next) => {
    if (erro instanceof HttpError) {
      return res.status(erro.status).json({ erro: erro.message });
    }
    console.error(erro);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  });

  return app;
}
