import { createApp } from './app.js';
import { exigirSegredoJwt } from './auth/token.js';

// Sem segredo não dá para emitir tokens: melhor não subir do que falhar no primeiro login
exigirSegredoJwt();

const port = Number(process.env.BACKEND_PORT) || 3000;

createApp().listen(port, () => {
  console.log(`Backend rodando em http://localhost:${port}`);
});
