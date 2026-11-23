import { createAppServer } from '../web/dev-server.mjs';
import { readFileSync } from 'node:fs';

const port = process.env.GSC_PORT ? Number(process.env.GSC_PORT) : 0;
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('GSC_PORT 必须是有效端口号');
  process.exitCode = 1;
} else {
  const server = createAppServer({ readAsset: (name) => readFileSync(new URL(`../web/${name}`, import.meta.url)) });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Git State Compass: http://127.0.0.1:${server.address().port}/`);
  });
}
