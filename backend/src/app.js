import express from 'express';
import cors from 'cors';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({ name: 'Sistema de gerenciamento de estoque API', health: '/health' });
  });

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  return app;
}
