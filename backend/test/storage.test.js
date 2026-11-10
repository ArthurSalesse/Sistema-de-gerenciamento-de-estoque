import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createLocalStorage } from '../src/storage/local-storage.js';
import { createApp } from '../src/app.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

async function criarStorage(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'uploads-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return createLocalStorage({ dir, publicUrl: 'http://localhost:3000/uploads' });
}

test('save grava com nome único gerado, nunca o original', async (t) => {
  const storage = await criarStorage(t);

  const a = await storage.save({ buffer: PNG, ext: 'png' });
  const b = await storage.save({ buffer: PNG, ext: 'png' });

  assert.match(a.key, /^[0-9a-f-]{36}\.png$/);
  assert.notEqual(a.key, b.key);
  assert.equal(a.url, `http://localhost:3000/uploads/${a.key}`);
  assert.deepEqual(await readFile(path.join(storage.pasta, a.key)), PNG);
});

test('remove apaga pela URL ou pela key e ignora arquivo inexistente', async (t) => {
  const storage = await criarStorage(t);
  const a = await storage.save({ buffer: PNG, ext: 'png' });
  const b = await storage.save({ buffer: PNG, ext: 'png' });

  await storage.remove(a.url);
  await storage.remove(b.key);
  await storage.remove(a.url); // de novo: não deve falhar
  await storage.remove(null);

  assert.deepEqual(await readdir(storage.pasta), []);
});

test('remove não sai da pasta de uploads', async (t) => {
  const storage = await criarStorage(t);
  const a = await storage.save({ buffer: PNG, ext: 'png' });

  await storage.remove(`../${path.basename(storage.pasta)}/../nao-existe`);
  await storage.remove('/etc/passwd');

  assert.deepEqual(await readdir(storage.pasta), [a.key]);
});

test('imagem salva fica acessível pela URL', async (t) => {
  const storage = await criarStorage(t);
  const { key } = await storage.save({ buffer: PNG, ext: 'png' });
  const server = createApp({ storage }).listen(0);
  t.after(() => server.close());
  const base = `http://localhost:${server.address().port}`;

  const res = await fetch(`${base}/uploads/${key}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), PNG);

  assert.equal((await fetch(`${base}/uploads/nao-existe.png`)).status, 404);
});
