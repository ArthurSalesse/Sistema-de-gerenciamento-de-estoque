import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { createApp, ROTAS_PROTEGIDAS } from '../src/app.js';
import { hashSenha } from '../src/auth/senha.js';
import { gerarToken } from '../src/auth/token.js';
import { HttpError } from '../src/errors.js';
import { autenticar } from '../src/middlewares/autenticar.js';
import { criarDbTeste, limparTabelas } from './helpers/db.js';

const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres';

let db;
let maria;
let api; // app completo
let rotaTeste; // app mínimo que devolve req.usuario

function iniciar(app) {
  const server = app.listen(0);
  return { server, url: `http://localhost:${server.address().port}` };
}

before(async () => {
  process.env.JWT_SECRET = SEGREDO;
  process.env.JWT_EXPIRES_IN = '8h';
  db = await criarDbTeste();
  await limparTabelas(db);
  [maria] = await db('usuarios')
    .insert({
      nome: 'Maria',
      email: 'maria@loja.com',
      senha_hash: await hashSenha('senhaforte123'),
    })
    .returning(['id', 'nome', 'email', 'criado_em']);

  api = iniciar(createApp({ db }));

  const app = express();
  app.get('/privado', autenticar, (req, res) => res.json(req.usuario));
  app.use((erro, req, res, next) => {
    if (erro instanceof HttpError) return res.status(erro.status).json({ erro: erro.message });
    next(erro);
  });
  rotaTeste = iniciar(app);
});

after(async () => {
  api.server.close();
  rotaTeste.server.close();
  await db.destroy();
});

const get = (base, caminho, authorization) =>
  fetch(`${base}${caminho}`, { headers: authorization ? { Authorization: authorization } : {} });

async function esperar401(res, mensagem) {
  assert.equal(res.status, 401);
  assert.equal(res.headers.get('www-authenticate'), 'Bearer');
  assert.deepEqual(await res.json(), { erro: mensagem });
}

// ---------- middleware ----------

test('token válido: libera e deixa req.usuario.id disponível', async () => {
  const res = await get(rotaTeste.url, '/privado', `Bearer ${gerarToken(maria)}`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { id: maria.id });
});

test('aceita "bearer" em minúsculas e espaços extras', async () => {
  const res = await get(rotaTeste.url, '/privado', `  bearer   ${gerarToken(maria)} `);
  assert.equal(res.status, 200);
});

test('401 sem token', async () => {
  await esperar401(await get(rotaTeste.url, '/privado'), 'Token de autenticação não informado.');
});

for (const header of ['Basic abc123', 'Bearer', 'tokensemesquema', 'Bearer a b']) {
  test(`401 com cabeçalho malformado: "${header}"`, async () => {
    await esperar401(
      await get(rotaTeste.url, '/privado', header),
      'Use o cabeçalho Authorization: Bearer <token>.',
    );
  });
}

test('401 com token expirado', async () => {
  const expirado = jwt.sign(
    { sub: String(maria.id), exp: Math.floor(Date.now() / 1000) - 10 },
    SEGREDO,
  );
  await esperar401(
    await get(rotaTeste.url, '/privado', `Bearer ${expirado}`),
    'Sessão expirada. Faça login novamente.',
  );
});

test('401 com token assinado por outro segredo', async () => {
  const falso = jwt.sign({ sub: String(maria.id) }, 'outro-segredo-qualquer-com-32-caracteres');
  await esperar401(await get(rotaTeste.url, '/privado', `Bearer ${falso}`), 'Token inválido.');
});

test('401 com token sem assinatura (alg "none")', async () => {
  const semAssinatura = jwt.sign({ sub: String(maria.id) }, null, { algorithm: 'none' });
  await esperar401(
    await get(rotaTeste.url, '/privado', `Bearer ${semAssinatura}`),
    'Token inválido.',
  );
});

test('401 com token adulterado (trocando o id do usuário)', async () => {
  const [cabecalho, , assinatura] = gerarToken(maria).split('.');
  const payload = Buffer.from(JSON.stringify({ sub: '999' })).toString('base64url');
  await esperar401(
    await get(rotaTeste.url, '/privado', `Bearer ${cabecalho}.${payload}.${assinatura}`),
    'Token inválido.',
  );
});

test('401 com token lixo e com token sem id', async () => {
  await esperar401(await get(rotaTeste.url, '/privado', 'Bearer abc.def.ghi'), 'Token inválido.');
  const semId = jwt.sign({}, SEGREDO);
  await esperar401(await get(rotaTeste.url, '/privado', `Bearer ${semId}`), 'Token inválido.');
});

// ---------- rotas protegidas ----------

for (const rota of ROTAS_PROTEGIDAS) {
  test(`${rota} exige login`, async () => {
    await esperar401(await get(api.url, rota), 'Token de autenticação não informado.');
    await esperar401(await get(api.url, `${rota}/123`), 'Token de autenticação não informado.');
    await esperar401(
      await fetch(`${api.url}${rota}`, { method: 'POST' }),
      'Token de autenticação não informado.',
    );
  });

  test(`${rota} deixa passar com token válido`, async () => {
    const res = await get(api.url, rota, `Bearer ${gerarToken(maria)}`);
    // Ainda não há handler nessas rotas (vêm nas próximas issues): o que importa é não ser 401
    assert.notEqual(res.status, 401);
  });
}

test('rotas públicas continuam abertas', async () => {
  assert.equal((await get(api.url, '/health')).status, 200);
  assert.equal(
    (await fetch(`${api.url}/auth/login`, { method: 'POST' })).status,
    400, // validação, não 401
  );
});

test('rota inexistente devolve 404 em JSON', async () => {
  const res = await get(api.url, '/nao-existe');
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { erro: 'Rota não encontrada.' });
});

// ---------- GET /auth/me ----------

test('GET /auth/me retorna o usuário logado, sem a senha', async () => {
  const res = await get(api.url, '/auth/me', `Bearer ${gerarToken(maria)}`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ...maria, criado_em: maria.criado_em.toISOString() });
});

test('GET /auth/me sem token: 401', async () => {
  await esperar401(await get(api.url, '/auth/me'), 'Token de autenticação não informado.');
});

test('GET /auth/me com token de usuário que não existe mais: 401', async () => {
  const res = await get(api.url, '/auth/me', `Bearer ${gerarToken({ id: 999999 })}`);
  assert.equal(res.status, 401);
  assert.equal((await res.json()).erro, 'Usuário não encontrado. Faça login novamente.');
});
