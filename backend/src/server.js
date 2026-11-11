import { createApp } from './app.js';

const port = Number(process.env.BACKEND_PORT) || 3000;

createApp().listen(port, () => {
  console.log(`Backend rodando em http://localhost:${port}`);
});
