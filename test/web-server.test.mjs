import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { readFileSync } from 'node:fs';
import { createAppServer } from '../web/dev-server.mjs';
import clean from '../fixtures/clean.json' with { type: 'json' };

test('本地服务只接受当前会话与可信来源读取仓库', async () => {
  let reads = 0;
  const server = createAppServer({
    sessionToken: 'test-token',
    readSnapshot: () => { reads += 1; return clean; },
    readAsset: (name) => readFileSync(new URL(`../web/${name}`, import.meta.url))
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const endpoint = `${base}/api/state?repo=example&goal=inspect`;
  try {
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /name="gsc-session" content="test-token"/);
    assert.equal((await fetch(endpoint)).status, 403);
    assert.equal((await fetch(endpoint, { headers: { 'X-GSC-Session': 'test-token', Origin: 'https://example.com' } })).status, 403);
    const foreignHostStatus = await new Promise((resolve, reject) => {
      const req = request(endpoint, { headers: { 'X-GSC-Session': 'test-token', Host: 'example.com' } }, (res) => {
        res.resume();
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(foreignHostStatus, 403);
    assert.equal(reads, 0);
    const valid = await fetch(endpoint, { headers: { 'X-GSC-Session': 'test-token' } });
    assert.equal(valid.status, 200);
    assert.equal((await valid.json()).recommendation.rule_id, 'INSPECT-CURRENT-POSITION');
    assert.equal(reads, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('文件夹选择需要当前会话，取消选择不改变路径', async () => {
  let calls = 0;
  const server = createAppServer({ sessionToken: 'test-token', chooseFolder: async () => { calls += 1; return null; }, readAsset: () => Buffer.from('') });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const endpoint = `http://127.0.0.1:${server.address().port}/api/select-folder`;
  try {
    assert.equal((await fetch(endpoint, { method: 'POST' })).status, 403);
    assert.equal((await fetch(endpoint, { method: 'POST', headers: { 'X-GSC-Session': 'test-token', Origin: 'https://example.com' } })).status, 403);
    const response = await fetch(endpoint, { method: 'POST', headers: { 'X-GSC-Session': 'test-token' } });
    assert.deepEqual(await response.json(), { path: null });
    assert.equal(calls, 1);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
