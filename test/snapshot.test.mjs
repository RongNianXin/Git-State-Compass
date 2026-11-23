import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { collectRepoSnapshot, parseRemoteUrl, parseStatusPorcelain, snapshotFromGitData } from '../src/snapshot.mjs';
test('解析 SSH 和 HTTPS remote 地址', () => { assert.deepEqual(parseRemoteUrl('git@github.com:OWNER/REPO.git'), { host: 'github.com', repository: 'OWNER/REPO' }); assert.deepEqual(parseRemoteUrl('https://github.com/OWNER/REPO.git'), { host: 'github.com', repository: 'OWNER/REPO' }); });
test('解析 Git porcelain 工作区状态', () => { assert.deepEqual(parseStatusPorcelain('M  staged.js\n M changed.js\n?? new.js'), { staged: true, modified: true, untracked: true }); });
test('多个 remote 时不猜测目标', () => { const s = snapshotFromGitData('repo', { head: 'abc', branch: 'feature', upstream: null, ahead: 0, behind: 0, remotes: [{ name: 'origin', url: 'https://github.com/A/B.git' }, { name: 'upstream', url: 'https://github.com/C/D.git' }], status: { staged: false, modified: false, untracked: false, conflicts: false } }); assert.equal(s.repository.target_remote, null); assert.equal(s.sources.github.freshness, 'unavailable'); });
test('快照保留默认分支和本地/远端跟踪分支', () => { const s = snapshotFromGitData('repo', { head: 'abc', branch: 'feature', defaultBranch: 'main', localBranches: [{ name: 'main', oid: 'aaa' }], remoteTracking: [{ name: 'origin/main', oid: 'bbb' }], upstream: 'origin/feature', ahead: 1, behind: 2, remotes: [{ name: 'origin', url: 'https://github.com/A/B.git' }], status: { staged: false, modified: false, untracked: false, conflicts: false } }); assert.equal(s.repository.default_branch, 'main'); assert.equal(s.refs.local_branches[0].name, 'main'); assert.equal(s.refs.remote_tracking[0].name, 'origin/main'); });

test('真实仓库的未暂存修改不会被误判为已暂存', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'gsc-status-'));
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { stdio: 'ignore' });
  try {
    git('init', '-q');
    writeFileSync(path.join(dir, 'example.txt'), 'first\n');
    git('add', 'example.txt');
    git('-c', 'user.name=Example', '-c', 'user.email=example@example.invalid', 'commit', '-qm', 'initial');
    writeFileSync(path.join(dir, 'example.txt'), 'changed\n');
    const snapshot = collectRepoSnapshot(dir);
    assert.equal(snapshot.worktree.index.staged, false);
    assert.equal(snapshot.worktree.working_tree.modified, true);
    assert.equal(path.resolve(snapshot.repository.common_git_dir), path.join(dir, '.git'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
