import { build } from 'esbuild';
import { inject } from 'postject';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32' || process.arch !== 'x64') {
  throw new Error('当前构建脚本只支持 Windows x64');
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(projectRoot, 'output', 'build-portable');
const releaseDir = path.join(projectRoot, 'output', 'portable');
mkdirSync(buildDir, { recursive: true });
mkdirSync(releaseDir, { recursive: true });

const main = path.join(buildDir, 'app.cjs');
const blob = path.join(buildDir, 'app.blob');
const config = path.join(buildDir, 'sea-config.json');
const executable = path.join(releaseDir, 'Git-State-Compass.exe');

await build({
  entryPoints: [path.join(projectRoot, 'bin', 'portable-entry.mjs')],
  outfile: main,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  logLevel: 'warning'
});

writeFileSync(config, JSON.stringify({
  main,
  output: blob,
  disableExperimentalSEAWarning: true,
  useSnapshot: false,
  useCodeCache: false,
  assets: Object.fromEntries(['index.html', 'app.js', 'styles.css'].map((name) => [name, path.join(projectRoot, 'web', name)]))
}, null, 2));

execFileSync(process.execPath, ['--experimental-sea-config', config], { stdio: 'inherit' });
copyFileSync(process.execPath, executable);
await inject(executable, 'NODE_SEA_BLOB', readFileSync(blob), {
  sentinelFuse: 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'
});

const checksum = createHash('sha256').update(readFileSync(executable)).digest('hex');
writeFileSync(path.join(releaseDir, 'SHA256SUMS.txt'), `${checksum}  Git-State-Compass.exe\n`);
console.log(`便携版：${executable}`);
console.log(`SHA-256：${checksum}`);
