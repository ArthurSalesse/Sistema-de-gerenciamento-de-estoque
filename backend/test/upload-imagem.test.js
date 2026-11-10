import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { HttpError } from '../src/errors.js';
import { uploadImagem } from '../src/middlewares/upload-imagem.js';
import { TAMANHO_MAXIMO_IMAGEM } from '../src/storage/imagem.js';

const ASSINATURAS = {
  jpg: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  webp: Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]),
  gif: Buffer.from('GIF89a'),
};

let server;
let url;

before(() => {
  const app = express();
  app.post('/upload', uploadImagem('imagem'), (req, res) => {
    const { ext, contentType, tamanho } = req.imagem ?? {};
    res.json({ ext, contentType, tamanho });
  });
  app.use((erro, req, res, next) => {
    if (erro instanceof HttpError) return res.status(erro.status).json({ erro: erro.message });
    next(erro);
  });
  server = app.listen(0);
  url = `http://localhost:${server.address().port}/upload`;
});

after(() => server.close());

function enviar(
  buffer,
  { nome = 'foto', tipo = 'application/octet-stream', campo = 'imagem' } = {},
) {
  const form = new FormData();
  form.append(campo, new Blob([buffer], { type: tipo }), nome);
  return fetch(url, { method: 'POST', body: form });
}

for (const [ext, tipo] of [
  ['jpg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
]) {
  test(`aceita ${ext.toUpperCase()}`, async () => {
    const res = await enviar(ASSINATURAS[ext], { nome: `foto.${ext}`, tipo });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      ext,
      contentType: tipo,
      tamanho: ASSINATURAS[ext].length,
    });
  });
}

test('rejeita GIF', async () => {
  const res = await enviar(ASSINATURAS.gif, { nome: 'foto.gif', tipo: 'image/gif' });
  assert.equal(res.status, 415);
  assert.match((await res.json()).erro, /JPG, PNG ou WEBP/);
});

test('rejeita arquivo que finge ser PNG (extensão e Content-Type falsos)', async () => {
  const res = await enviar(Buffer.from('<script>alert(1)</script>'), {
    nome: 'foto.png',
    tipo: 'image/png',
  });
  assert.equal(res.status, 415);
});

test('rejeita arquivo acima de 5 MB com mensagem clara', async () => {
  const grande = Buffer.concat([ASSINATURAS.png, Buffer.alloc(TAMANHO_MAXIMO_IMAGEM)]);
  const res = await enviar(grande, { nome: 'grande.png', tipo: 'image/png' });
  assert.equal(res.status, 413);
  assert.equal((await res.json()).erro, 'A imagem é muito grande. O tamanho máximo é 5 MB.');
});

test('aceita exatamente 5 MB', async () => {
  const limite = Buffer.concat([
    ASSINATURAS.png,
    Buffer.alloc(TAMANHO_MAXIMO_IMAGEM - ASSINATURAS.png.length),
  ]);
  const res = await enviar(limite, { nome: 'limite.png', tipo: 'image/png' });
  assert.equal(res.status, 200);
});

test('rejeita imagem em campo errado', async () => {
  const res = await enviar(ASSINATURAS.png, { tipo: 'image/png', campo: 'foto' });
  assert.equal(res.status, 400);
});

test('requisição sem imagem segue sem req.imagem', async () => {
  const res = await fetch(url, { method: 'POST', body: new FormData() });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {});
});
