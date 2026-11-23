import { execFileSync } from 'node:child_process';
import path from 'node:path';

const runGit = (repoPath, args) => execFileSync('git', ['-c', 'core.fsmonitor=false', '-C', repoPath, ...args], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000, maxBuffer: 4 * 1024 * 1024,
  env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_PAGER: 'cat', GIT_TERMINAL_PROMPT: '0' }
}).replace(/\r?\n$/, '');
export function parseStatusPorcelain(output) { const lines = output ? output.split(/\r?\n/).filter(Boolean) : []; return { staged: lines.some((line) => line[0] !== ' ' && line[0] !== '?'), modified: lines.some((line) => line[1] !== ' ' && line[1] !== '?'), untracked: lines.some((line) => line.startsWith('??')) }; }
export function parseRemoteUrl(url) { if (!url) return { host: null, repository: null }; const normalized = url.replace(/^git@([^:]+):/, 'https://$1/').replace(/\.git$/, ''); try { const parsed = new URL(normalized); return { host: parsed.hostname, repository: parsed.pathname.replace(/^\//, '') }; } catch { return { host: null, repository: null }; } }
export function snapshotFromGitData(repoPath, data, now = new Date().toISOString()) { const remotes = data.remotes.map((remote) => ({ name: remote.name, ...parseRemoteUrl(remote.url) })); const target = remotes.length === 1 ? remotes[0] : null; return { schema_version: '1.1', snapshot_id: `local-${Date.now()}`, status: 'valid', started_at: now, completed_at: now, repository: { display_name: target?.repository ?? path.basename(repoPath), root: repoPath, common_git_dir: data.commonGitDir ?? null, default_branch: data.defaultBranch ?? null, baseline: data.baseline ?? null, target_remote: target?.name ?? null, target_host: target?.host ?? null, target_repository: target?.repository ?? null, remotes }, worktree: { path_display: repoPath, head_oid: data.head, branch: data.branch, detached: !data.branch, count: data.worktreeCount ?? 1, detached_count: data.detachedCount ?? 0, index: { staged: data.status.staged, conflicts: data.status.conflicts }, working_tree: { modified: data.status.modified, untracked: data.status.untracked }, operation: null }, refs: { current_ahead: data.ahead, current_behind: data.behind, upstream: data.upstream, local_branches: data.localBranches ?? [], remote_tracking: data.remoteTracking ?? [], open_pr: null }, sources: { local: { freshness: 'fresh', observed_at: now, query_method: 'git', permission: 'not_applicable' }, github: { freshness: 'unavailable', observed_at: null, query_method: null, permission: 'not_applicable' } }, invalidation: { valid: true, reasons: [] } }; }
const parseRefs = (output, remote = false) => (output ? output.split(/\r?\n/).filter(Boolean).map((line) => { const [oid, ...names] = line.split(/\s+/); const full = names.join(' '); return { name: remote ? full.replace(/^refs\/remotes\//, '') : full.replace(/^refs\/heads\//, ''), oid }; }) : []);
export function collectRepoSnapshot(repoPath) {
  const root = runGit(repoPath, ['rev-parse', '--show-toplevel']);
  const branch = (() => { try { return runGit(root, ['symbolic-ref', '--short', '-q', 'HEAD']) || null; } catch { return null; } })();
  const upstream = (() => { try { return runGit(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']) || null; } catch { return null; } })();
  let ahead = 0;
  let behind = 0;
  if (upstream) {
    const counts = runGit(root, ['rev-list', '--left-right', '--count', `HEAD...${upstream}`]).split(/\s+/).map(Number);
    if (counts.length !== 2 || counts.some((count) => !Number.isInteger(count))) throw new Error('无法比较当前分支与上游');
    [ahead, behind] = counts;
  }
  const remoteLines = (() => { try { return runGit(root, ['config', '--get-regexp', '^remote\\..*\\.url$']).split(/\r?\n/).filter(Boolean); } catch { return []; } })();
  const remotes = remoteLines.map((line) => { const match = line.match(/^remote\.([^.]+)\.url\s+(.+)$/); return { name: match?.[1], url: match?.[2] }; }).filter((remote) => remote.name && remote.url);
  const statusOutput = runGit(root, ['status', '--porcelain=v1']);
  const refs = (args, remote = false) => parseRefs(runGit(root, args), remote);
  let defaultBranch = null;
  try { defaultBranch = runGit(root, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']).replace(/^origin\//, ''); } catch {}
  let baseline = null;
  if (defaultBranch) {
    try {
      const reference = `refs/remotes/origin/${defaultBranch}`;
      const oid = runGit(root, ['rev-parse', '--verify', reference]);
      const [aheadOfBase, behindBase] = runGit(root, ['rev-list', '--left-right', '--count', `HEAD...${reference}`]).split(/\s+/).map(Number);
      if (Number.isInteger(aheadOfBase) && Number.isInteger(behindBase)) baseline = { ref: `origin/${defaultBranch}`, oid, ahead: aheadOfBase, behind: behindBase };
    } catch {}
  }
  let worktreeCount = 1;
  let detachedCount = branch ? 0 : 1;
  try {
    const listing = runGit(root, ['worktree', 'list', '--porcelain']);
    worktreeCount = (listing.match(/^worktree /gm) ?? []).length || 1;
    detachedCount = (listing.match(/^detached$/gm) ?? []).length;
  } catch {}
  return snapshotFromGitData(root, {
    head: runGit(root, ['rev-parse', 'HEAD']), commonGitDir: path.resolve(root, runGit(root, ['rev-parse', '--git-common-dir'])), branch, upstream, ahead, behind, defaultBranch, baseline, worktreeCount, detachedCount,
    localBranches: refs(['for-each-ref', '--format=%(objectname) %(refname)', 'refs/heads/']),
    remoteTracking: refs(['for-each-ref', '--format=%(objectname) %(refname)', 'refs/remotes/'], true), remotes,
    status: { ...parseStatusPorcelain(statusOutput), conflicts: statusOutput.split(/\r?\n/).some((line) => /^[UAD][UAD]|^AA|^DD/.test(line)) }
  });
}
