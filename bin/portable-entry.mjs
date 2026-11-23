import { spawn } from 'node:child_process';
import { getAsset, isSea } from 'node:sea';
import { createAppServer } from '../web/dev-server.mjs';

if (!isSea()) throw new Error('此入口只能在便携版中运行');

const server = createAppServer({ readAsset: (name) => Buffer.from(getAsset(name)) });
server.listen(0, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${server.address().port}/`;
  console.log(`Git State Compass 已启动：${url}`);
  console.log('关闭此窗口即可退出。');
  if (process.argv.includes('--no-open')) return;
  const browser = spawn('explorer.exe', [url], { detached: true, stdio: 'ignore', windowsHide: true });
  browser.on('error', () => console.log(`浏览器未能自动打开，请手动访问：${url}`));
  browser.unref();
});
