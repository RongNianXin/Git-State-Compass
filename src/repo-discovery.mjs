import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ignored = new Set(['.git', 'node_modules', '.venv', 'venv', 'dist', 'build', 'output']);

export function findNearbyRepositories(folder, { maxDepth = 4, maxDirectories = 400, maxResults = 20 } = {}) {
  const found = [];
  const queue = [{ directory: folder, depth: 0 }];
  let visited = 0;
  while (queue.length && visited < maxDirectories && found.length < maxResults) {
    const { directory, depth } = queue.shift();
    visited += 1;
    let entries;
    try { entries = readdirSync(directory, { withFileTypes: true }); } catch { continue; }
    if (entries.some((entry) => entry.name === '.git')) {
      try {
        const root = execFileSync('git', ['-C', directory, 'rev-parse', '--show-toplevel'],
          { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        if (path.resolve(root).toLowerCase() === path.resolve(directory).toLowerCase()) {
          found.push(directory);
          continue;
        }
      } catch { /* A .git entry alone does not make a valid repository. */ }
    }
    if (depth >= maxDepth) continue;
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || ignored.has(entry.name)) continue;
      const child = path.join(directory, entry.name);
      try { if (!statSync(child).isSymbolicLink()) queue.push({ directory: child, depth: depth + 1 }); } catch {}
    }
  }
  return { repositories: found, limited: queue.length > 0 || found.length === maxResults };
}
