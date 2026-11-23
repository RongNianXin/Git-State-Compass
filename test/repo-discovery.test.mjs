import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findNearbyRepositories } from '../src/repo-discovery.mjs';

test('外层普通目录仅列出下层有效仓库，不把空 .git 误认为仓库', () => {
  const outer = mkdtempSync(path.join(os.tmpdir(), 'gsc-discovery-'));
  const repository = path.join(outer, 'project', 'example');
  try {
    mkdirSync(path.join(outer, '.git'));
    mkdirSync(repository, { recursive: true });
    execFileSync('git', ['-C', repository, 'init', '-q']);
    writeFileSync(path.join(outer, 'notes.txt'), 'not a repository');
    assert.deepEqual(findNearbyRepositories(outer).repositories, [repository]);
    assert.deepEqual(findNearbyRepositories(outer, { maxDepth: 1 }).repositories, []);
  } finally { rmSync(outer, { recursive: true, force: true }); }
});
