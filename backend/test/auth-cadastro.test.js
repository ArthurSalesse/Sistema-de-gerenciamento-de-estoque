import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { conferirSenha } from '../src/auth/senha.js';
import { criarDbTeste, limparTabelas } from './helpers/db.js';

let db;
let server;
let base;

before(async () => {
  db = await criarDbTeste();
  server = createApp({ db }).listen(0);
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.close();
  await db.destroy();
});

beforeEach(() => limparTabelas(db));

const VALIDO = { nome: 'Maria', email: 'maria@loja.com', senha: 'senhaforte123' };

function cadastrar(body) {
  return fetch(`${base}/auth/cadastro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

test('201 com os dados do usuário, sem a senha', async () => {
  const res = await cadastrar(VALIDO);
  assert.equal(res.status, 201);

  const usuario = await res.json();
  assert.deepEqual(Object.keys(usuario).sort(), ['criado_em', 'email', 'id', 'nome']);
  assert.equal(usuario.nome, 'Maria');
  assert.equal(usuario.email, 'maria@loja.com');
  assert.doesNotMatch(JSON.stringify(usuario), /senha/);
});

test('senha salva com hash bcrypt, nunca em texto puro', async () => {
  await cadastrar(VALIDO);
  const { senha_hash } = await db('usuarios').first('senha_hash');

  assert.notEqual(senha_hash, VALIDO.senha);
  assert.match(senha_hash, /^\$2[aby]\$10\$/);
  assert.ok(await conferirSenha(VALIDO.senha, senha_hash));
});

test('e-mail normalizado (minúsculas, sem espaços) antes de salvar', async () => {
  const res = await cadastrar({ ...VALIDO, email: '  Maria@LOJA.com ', nome: '  Maria  ' });
  assert.equal(res.status, 201);
  const usuario = await res.json();
  assert.equal(usuario.email, 'maria@loja.com');
  assert.equal(usuario.nome, 'Maria');
  assert.equal((await db('usuarios').first('email')).email, 'maria@loja.com');
});

test('409 se o e-mail já estiver cadastrado, mesmo com maiúsculas/espaços', async () => {
  assert.equal((await cadastrar(VALIDO)).status, 201);

  const res = await cadastrar({ ...VALIDO, email: ' MARIA@loja.com' });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).erro, 'Este e-mail já está cadastrado.');
  assert.equal((await db('usuarios').count('* as total').first()).total, '1');
});

test('409 em cadastros simultâneos com o mesmo e-mail', async () => {
  const status = (await Promise.all([cadastrar(VALIDO), cadastrar(VALIDO), cadastrar(VALIDO)]))
    .map((r) => r.status)
    .sort();
  assert.deepEqual(status, [201, 409, 409]);
});

test('400 com erros por campo quando faltam campos obrigatórios', async () => {
  const res = await cadastrar({});
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), {
    erro: 'Dados inválidos.',
    campos: {
      nome: 'O nome é obrigatório.',
      email: 'O e-mail é obrigatório.',
      senha: 'A senha é obrigatória.',
    },
  });
});

test('400 para nome e e-mail só com espaços', async () => {
  const { campos } = await (await cadastrar({ ...VALIDO, nome: '   ', email: '  ' })).json();
  assert.deepEqual(Object.keys(campos).sort(), ['email', 'nome']);
});

for (const email of ['maria', 'maria@', '@loja.com', 'maria@loja', 'ma ria@loja.com']) {
  test(`400 para e-mail inválido: "${email}"`, async () => {
    const res = await cadastrar({ ...VALIDO, email });
    assert.equal(res.status, 400);
    assert.deepEqual((await res.json()).campos, { email: 'Informe um e-mail válido.' });
  });
}

test('400 para senha com menos de 8 caracteres; 8 é aceito', async () => {
  const curta = await cadastrar({ ...VALIDO, senha: '1234567' });
  assert.equal(curta.status, 400);
  assert.deepEqual((await curta.json()).campos, {
    senha: 'A senha deve ter no mínimo 8 caracteres.',
  });

  assert.equal((await cadastrar({ ...VALIDO, senha: '12345678' })).status, 201);
});

test('400 para senha acima de 72 bytes (limite do bcrypt)', async () => {
  const res = await cadastrar({ ...VALIDO, senha: 'a'.repeat(73) });
  assert.equal(res.status, 400);
  assert.ok((await res.json()).campos.senha);
});

test('400 para campos que não são texto', async () => {
  const res = await cadastrar({ nome: 123, email: ['a@b.com'], senha: 12345678 });
  assert.equal(res.status, 400);
  assert.deepEqual((await res.json()).campos, {
    nome: 'O nome deve ser um texto.',
    email: 'O e-mail deve ser um texto.',
    senha: 'A senha deve ser um texto.',
  });
});

test('400 para JSON malformado', async () => {
  const res = await cadastrar('{"nome": ');
  assert.equal(res.status, 400);
  assert.equal((await res.json()).erro, 'O corpo da requisição não é um JSON válido.');
});
