import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { collectRepoSnapshot } from '../src/snapshot.mjs';
import { recommend, supportedGoals } from '../src/recommend.mjs';
import { chooseFolder as nativeChooseFolder } from '../src/folder-picker.mjs';
import { findNearbyRepositories } from '../src/repo-discovery.mjs';

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']]
]);
const csp = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}

export function createAppServer({ sessionToken = randomBytes(32).toString('hex'), readSnapshot = collectRepoSnapshot, readAsset, chooseFolder = nativeChooseFolder, findRepositories = findNearbyRepositories } = {}) {
  if (typeof readAsset !== 'function') throw new TypeError('必须提供页面资源读取器');
  const server = http.createServer(async (req, res) => {
    const origin = `http://127.0.0.1:${server.address()?.port}`;
    if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) {
      return send(res, 403, { error: '请求来源不受信任' });
    }
    let url;
    try { url = new URL(req.url, origin); } catch { return send(res, 400, { error: '请求地址无效' }); }
    if (url.pathname === '/api/select-folder') {
      if (req.method !== 'POST') return send(res, 405, { error: '请求方法无效' });
      if (req.headers['x-gsc-session'] !== sessionToken) return send(res, 403, { error: '会话已失效，请重新打开应用' });
      try { return send(res, 200, { path: await chooseFolder() }); }
      catch { return send(res, 500, { error: '无法打开文件夹选择窗口，请手动输入路径。' }); }
    }
    if (req.method !== 'GET') return send(res, 405, { error: '请求方法无效' });
    if (url.pathname === '/api/state') {
      if (req.headers['x-gsc-session'] !== sessionToken) return send(res, 403, { error: '会话已失效，请重新打开应用' });
      const repo = url.searchParams.get('repo')?.trim();
      const goal = url.searchParams.get('goal') ?? 'inspect';
      if (!repo || repo.length > 4096) return send(res, 400, { error: '请选择有效的本地仓库路径' });
      if (!supportedGoals.includes(goal)) return send(res, 400, { error: '不支持的目标' });
      try {
        const snapshot = readSnapshot(repo);
        return send(res, 200, { snapshot, recommendation: recommend(snapshot, goal) });
      } catch {
        let discovery = { repositories: [], limited: false };
        try { discovery = findRepositories(repo); } catch {}
        return send(res, 422, { error: '这个文件夹不是可读取的 Git 仓库。', ...discovery });
      }
    }

    const asset = assets.get(url.pathname);
    if (!asset) return send(res, 404, { error: 'Not found' });
    const [filename, type] = asset;
    const content = readAsset(filename);
    if (filename === 'index.html') {
      return send(res, 200, content.toString().replace('__GSC_SESSION_TOKEN__', sessionToken), type);
    }
    return send(res, 200, content, type);
  });
  return server;
}
