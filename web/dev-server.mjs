import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectRepoSnapshot } from '../src/snapshot.mjs';
import { recommend } from '../src/recommend.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const send = (res, status, body, type = 'application/json; charset=utf-8') => { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(type.startsWith('application/json') ? JSON.stringify(body) : body); };
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/api/state') { const repo = url.searchParams.get('repo'); const goal = url.searchParams.get('goal') ?? 'inspect'; if (!repo) return send(res, 400, { error: '缺少 repo 参数' }); const snapshot = collectRepoSnapshot(repo); return send(res, 200, { snapshot, recommendation: recommend(snapshot, goal) }); }
    const relative = url.pathname === '/' ? '/index.html' : url.pathname; const file = path.resolve(root, `.${relative}`); if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: 'Not found' }); return send(res, 200, fs.readFileSync(file), mime[path.extname(file)] ?? 'application/octet-stream');
  } catch (error) { return send(res, 500, { error: `读取仓库失败：${error.message}` }); }
});
const port = Number(process.env.GSC_PORT ?? 4174); server.listen(port, '127.0.0.1', () => console.log(`Git State Compass dev server: http://127.0.0.1:${port}/`));
