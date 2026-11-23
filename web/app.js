const token = document.querySelector('meta[name="gsc-session"]').content;
const form = document.querySelector('#repoForm');
const pathInput = document.querySelector('#repoPath');
const loadButton = document.querySelector('#loadButton');
const browseButton = document.querySelector('#browseButton');
const folderResult = document.querySelector('#folderResult');
const goalButtons = [...document.querySelectorAll('.goal')];
const factLabels = { CURRENT_BRANCH: '当前分支', HEAD: '提交', WORKTREE_DIRTY: '未提交修改', UPSTREAM: '上游分支', AHEAD: '领先提交', BEHIND: '落后提交', TARGET: '目标仓库', PR: 'PR', BASE: '目标分支', CHECKS: '检查', REVIEW: '审查', LOCAL_FRESHNESS: '本地信息', GITHUB_FRESHNESS: 'GitHub 信息' };
let loadedPath = '';
let currentRequest = null;
let pendingPath = '';

function setText(selector, value) { document.querySelector(selector).textContent = value; }
function showFolderResult(message, repositories = [], limited = false) {
  folderResult.replaceChildren();
  folderResult.hidden = !message;
  if (!message) return;
  const description = document.createElement('p');
  description.textContent = message;
  folderResult.append(description);
  for (const repository of repositories) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `打开仓库：${repository}`;
    button.addEventListener('click', () => { pathInput.value = repository; showFolderResult(''); loadState(); });
    folderResult.append(button);
  }
  if (limited) {
    const note = document.createElement('small');
    note.textContent = '只查找了附近有限数量的文件夹，结果可能不完整。';
    folderResult.append(note);
  }
}
function summarizeRefs(refs) {
  const names = refs.map((ref) => ref.name);
  return names.slice(0, 8).join(' · ') + (names.length > 8 ? ` · 另有 ${names.length - 8} 个` : '') || '无';
}
function setAdvice({ title, reason, impact = '', fact = '', state = '等待' }) {
  setText('#adviceTitle', title);
  setText('#adviceReason', reason);
  setText('#adviceImpact', impact || '—');
  setText('#adviceFact', fact || '—');
  const pill = document.querySelector('#statePill');
  pill.textContent = { READY: '可继续', NEEDS_CHECK: '需核对', BLOCKED: '需先处理' }[state] ?? state;
  pill.className = `state-pill ${state === 'READY' ? 'ready' : 'warn'}`;
}

function clearState(message = '选择仓库后读取状态') {
  loadedPath = '';
  goalButtons.forEach((button) => { button.disabled = true; });
  setText('#snapshotMeta', '尚未读取仓库');
  setText('#repositoryName', '本地仓库');
  setText('#repoRoot', '未读取');
  setText('#commonGitDir', '未读取');
  setText('#worktreePath', '未读取');
  setText('#baselineState', '未确认');
  setText('#worktreeCount', '未读取');
  setText('#currentBranch', '未读取');
  setText('#currentDetail', '—');
  setText('#upstreamBranch', '未读取');
  setText('#upstreamDetail', '—');
  setText('#localBranches', '—');
  setText('#remoteBranches', '—');
  setText('#worktreeState', '未读取');
  setText('#aheadBehind', '—');
  setText('#snapshotState', '未读取');
  setText('#localSource', '等待读取');
  setText('#localFreshness', '未读取');
  setText('#githubFreshness', '未查询');
  setAdvice({ title: message, reason: '选择文件夹后读取，查看当前分支和下一步建议。' });
}

function renderState({ snapshot: s, recommendation: r }) {
  loadedPath = pathInput.value.trim();
  goalButtons.forEach((button) => { button.disabled = false; });
  setText('#snapshotMeta', '本地快照 · 已读取');
  setText('#repositoryName', s.repository.display_name);
  showFolderResult('');
  setText('#repoRoot', s.repository.root ?? loadedPath);
  setText('#commonGitDir', s.repository.common_git_dir ?? '无法确认');
  setText('#worktreePath', s.worktree.path_display ?? loadedPath);
  setText('#baselineState', s.repository.baseline ? `${s.repository.baseline.ref} · 领先 ${s.repository.baseline.ahead} / 落后 ${s.repository.baseline.behind}` : '无法确认默认主线');
  setText('#worktreeCount', `${s.worktree.count ?? 1} 个，其中 ${s.worktree.detached_count ?? 0} 个未挂在分支上`);
  setText('#currentBranch', s.worktree.branch ?? '未挂在分支上');
  setText('#currentDetail', `HEAD ${(s.worktree.head_oid ?? '').slice(0, 7) || '未知'}`);
  setText('#upstreamBranch', s.refs.upstream ?? '未设置上游分支');
  setText('#upstreamDetail', s.refs.upstream ? '当前分支显式跟踪' : '没有可确认的跟踪关系');
  setText('#localBranches', summarizeRefs(s.refs.local_branches));
  setText('#remoteBranches', summarizeRefs(s.refs.remote_tracking));
  const dirty = s.worktree.index.staged || s.worktree.index.conflicts || s.worktree.working_tree.modified || s.worktree.working_tree.untracked;
  setText('#worktreeState', dirty ? '有未提交内容' : '干净');
  document.querySelector('#worktreeState').className = dirty ? 'caution' : 'safe';
  setText('#aheadBehind', s.refs.upstream ? `领先 ${s.refs.current_ahead} / 落后 ${s.refs.current_behind}` : '无上游，无法比较');
  setText('#snapshotState', s.status === 'valid' ? '读取时有效' : '失效');
  setText('#localSource', `Git · ${s.sources.local.observed_at ?? '未知时间'}`);
  setText('#localFreshness', s.sources.local.freshness === 'fresh' ? '新鲜' : s.sources.local.freshness);
  setText('#githubFreshness', '未查询');
  setAdvice({
    title: r.next_step,
    reason: r.reason,
    impact: r.impact,
    fact: r.facts.map((fact) => {
      const detail = fact.code === 'HEAD' ? String(fact.detail).slice(0, 7) : fact.code === 'WORKTREE_DIRTY' ? (fact.detail === 'yes' ? '有' : '无') : fact.detail;
      return `${factLabels[fact.code] ?? fact.code}：${detail}`;
    }).join('；'),
    state: r.technical_state
  });
}

async function loadState() {
  const repo = pathInput.value.trim();
  if (!repo) { clearState('请先选择文件夹'); return; }
  currentRequest?.abort();
  const controller = new AbortController();
  currentRequest = controller;
  pendingPath = repo;
  loadButton.disabled = true;
  setAdvice({ title: '正在读取仓库', reason: '请稍候。' });
  const goal = document.querySelector('.goal.active').dataset.goal;
  try {
    const response = await fetch(`/api/state?repo=${encodeURIComponent(repo)}&goal=${encodeURIComponent(goal)}`, {
      headers: { 'X-GSC-Session': token }, signal: controller.signal
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 422) showFolderResult('所选文件夹不是有效 Git 仓库。下面是附近找到的仓库；请确认后选择。', data.repositories, data.limited);
      throw new Error(data.error);
    }
    if (currentRequest === controller) renderState(data);
  } catch (error) {
    if (error.name !== 'AbortError' && currentRequest === controller) {
      clearState('读取失败');
      setText('#adviceReason', error.message);
      setText('#statePill', '需先处理');
    }
  } finally {
    if (currentRequest === controller) {
      currentRequest = null;
      pendingPath = '';
      loadButton.disabled = false;
    }
  }
}

form.addEventListener('submit', (event) => { event.preventDefault(); loadState(); });
browseButton.addEventListener('click', async () => {
  browseButton.disabled = true;
  try {
    const response = await fetch('/api/select-folder', { method: 'POST', headers: { 'X-GSC-Session': token } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    if (data.path) { pathInput.value = data.path; clearState(); showFolderResult(''); loadState(); }
  } catch (error) { showFolderResult(error.message); }
  finally { browseButton.disabled = false; }
});
pathInput.addEventListener('input', () => {
  showFolderResult('');
  if (currentRequest && pathInput.value.trim() !== pendingPath) {
    currentRequest.abort();
    currentRequest = null;
    pendingPath = '';
    loadButton.disabled = false;
    clearState('路径已更改，请重新读取');
    return;
  }
  if (loadedPath && pathInput.value.trim() !== loadedPath) {
    clearState('路径已更改，请重新读取');
  }
});
goalButtons.forEach((button) => button.addEventListener('click', () => {
  goalButtons.forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  loadState();
}));
clearState();
