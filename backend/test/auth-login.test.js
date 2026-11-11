import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { hashSenha } from '../src/auth/senha.js';
import { exigirSegredoJwt, verificarToken } from '../src/auth/token.js';
import { criarDbTeste, limparTabelas } from './helpers/db.js';

const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres';
const SENHA = 'senhaforte123';

let db;
let server;
let base;
let maria;

before(async () => {
  process.env.JWT_SECRET = SEGREDO;
  process.env.JWT_EXPIRES_IN = '8h';
  db = await criarDbTeste();
  await limparTabelas(db);
  [maria] = await db('usuarios')
    .insert({ nome: 'Maria', email: 'maria@loja.com', senha_hash: await hashSenha(SENHA) })
    .returning(['id', 'nome', 'email']);
  server = createApp({ db }).listen(0);
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.close();
  await db.destroy();
});

function login(body) {
  return fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('credenciais corretas: 200 com token e dados básicos do usuário', async () => {
  const res = await login({ email: 'maria@loja.com', senha: SENHA });
  assert.equal(res.status, 200);

  const corpo = await res.json();
  assert.deepEqual(Object.keys(corpo).sort(), ['token', 'usuario']);
  assert.deepEqual(corpo.usuario, { id: maria.id, nome: 'Maria', email: 'maria@loja.com' });
  assert.doesNotMatch(JSON.stringify(corpo.usuario), /senha/);
});

test('token tem o id do usuário e expira em 8 horas', async () => {
  const { token } = await (await login({ email: 'maria@loja.com', senha: SENHA })).json();
  const payload = verificarToken(token);

  assert.equal(payload.sub, String(maria.id));
  assert.equal(payload.exp - payload.iat, 8 * 60 * 60);
  assert.equal(jwt.decode(token, { complete: true }).header.alg, 'HS256');
});

test('token é assinado com o segredo do ambiente', async () => {
  const { token } = await (await login({ email: 'maria@loja.com', senha: SENHA })).json();
  assert.doesNotThrow(() => jwt.verify(token, SEGREDO));
  assert.throws(() => jwt.verify(token, 'outro-segredo-qualquer-com-32-caracteres'), {
    name: 'JsonWebTokenError',
  });
});

test('e-mail é normalizado no login', async () => {
  const res = await login({ email: '  MARIA@Loja.com ', senha: SENHA });
  assert.equal(res.status, 200);
});

test('senha errada e e-mail inexistente: mesmo 401 e mesma mensagem', async () => {
  const senhaErrada = await login({ email: 'maria@loja.com', senha: 'senha-errada' });
  const emailInexistente = await login({ email: 'joao@loja.com', senha: SENHA });

  assert.equal(senhaErrada.status, 401);
  assert.equal(emailInexistente.status, 401);
  const esperado = { erro: 'E-mail ou senha inválidos.' };
  assert.deepEqual(await senhaErrada.json(), esperado);
  assert.deepEqual(await emailInexistente.json(), esperado);
});

test('e-mail inexistente também passa pelo bcrypt (tempo de resposta parecido)', async () => {
  const medir = async (body) => {
    const inicio = performance.now();
    await login(body);
    return performance.now() - inicio;
  };
  const existente = await medir({ email: 'maria@loja.com', senha: 'senha-errada' });
  const inexistente = await medir({ email: 'joao@loja.com', senha: 'senha-errada' });

  // bcrypt custo 10 leva dezenas de ms; sem ele a resposta voltaria quase instantânea
  assert.ok(inexistente > existente / 3, `existente=${existente}ms inexistente=${inexistente}ms`);
});

test('senha com maiúsculas diferentes não passa', async () => {
  const res = await login({ email: 'maria@loja.com', senha: SENHA.toUpperCase() });
  assert.equal(res.status, 401);
});

test('400 com erros por campo quando faltam e-mail ou senha', async () => {
  const res = await login({ email: '  ', senha: 123 });
  assert.equal(res.status, 400);
  assert.deepEqual((await res.json()).campos, {
    email: 'O e-mail é obrigatório.',
    senha: 'A senha é obrigatória.',
  });
});

test('falha cedo se JWT_SECRET estiver ausente ou curto', () => {
  const original = process.env.JWT_SECRET;
  try {
    delete process.env.JWT_SECRET;
    assert.throws(exigirSegredoJwt, /JWT_SECRET/);
    process.env.JWT_SECRET = 'curto';
    assert.throws(exigirSegredoJwt, /32 caracteres/);
  } finally {
    process.env.JWT_SECRET = original;
  }
});
