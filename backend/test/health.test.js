import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('GET /health retorna 200', async () => {
  const server = createApp().listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/health`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, 'ok');
  } finally {
    server.close();
  }
});

test('GET / aponta para /health', async () => {
  const server = createApp().listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://localhost:${port}/`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).health, '/health');
  } finally {
    server.close();
  }
});
