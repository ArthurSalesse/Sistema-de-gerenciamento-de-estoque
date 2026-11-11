import express from 'express';
import cors from 'cors';
import { createAuthRouter } from './auth/auth.routes.js';
import { db as dbPadrao } from './database/connection.js';
import { HttpError } from './errors.js';
import { autenticar } from './middlewares/autenticar.js';
import { ROTA_UPLOADS, storage as storagePadrao } from './storage/index.js';

// Só usuários logados acessam. Os routers dessas áreas entram depois desta linha
// em createApp e devem sempre filtrar os dados por req.usuario.id.
export const ROTAS_PROTEGIDAS = ['/roupas', '/vendas', '/dashboard'];

export function createApp({ storage = storagePadrao, db = dbPadrao } = {}) {
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

  app.use('/auth', createAuthRouter({ db }));

  app.use(ROTAS_PROTEGIDAS, autenticar);

  app.use((req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada.' });
  });

  app.use((erro, req, res, next) => {
    if (erro instanceof HttpError) {
      return res.status(erro.status).json({ erro: erro.message, campos: erro.campos });
    }
    if (erro.type === 'entity.parse.failed') {
      return res.status(400).json({ erro: 'O corpo da requisição não é um JSON válido.' });
    }
    console.error(erro);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  });

  return app;
}
