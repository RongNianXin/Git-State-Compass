import { validateRepoSnapshot } from './validate.mjs';

const GOALS = new Set(['inspect', 'create_pr', 'merge_pr', 'sync_remote']);
const fact = (source, observedAt, code, detail) => ({ source, observed_at: observedAt ?? null, code, detail: String(detail) });
const target = (snapshot) => ({ repository: snapshot.repository.target_repository ?? null, host: snapshot.repository.target_host ?? null, remote: snapshot.repository.target_remote ?? null, branch: snapshot.worktree.branch ?? null, pr_number: snapshot.refs.open_pr?.number ?? null });
const result = (snapshot, intent, data) => ({ recommendation_version: '1.0', snapshot_id: snapshot?.snapshot_id ?? null, intent, target: snapshot ? target(snapshot) : { repository: null, host: null, remote: null, branch: null, pr_number: null }, risks: [], invalidated_by: ['工作区、HEAD、refs 或外部事实发生变化'], confidence: 'high', ...data });
const blocked = (snapshot, intent, rule_id, reason, next_step, facts, extra = {}) => result(snapshot, intent, { rule_id, technical_state: extra.technical_state ?? 'BLOCKED', authorization_state: extra.authorization_state ?? 'unknown', title: extra.title ?? '先保护现场并刷新状态', reason, impact: extra.impact ?? '当前快照不能支持安全的下一步判断。', next_step, facts, risks: extra.risks ?? ['继续操作可能基于过期、冲突或不完整事实。'], confidence: 'high' });
const dirty = (s) => s.worktree.index.staged || s.worktree.working_tree.modified || s.worktree.working_tree.untracked;
const githubReady = (s) => s.sources.github.freshness === 'fresh' && s.sources.github.permission === 'available' && Boolean(s.repository.target_remote && s.repository.target_host && s.repository.target_repository);

function inspect(s) {
  const branch = s.worktree.detached ? 'detached HEAD' : s.worktree.branch ?? '未知分支';
  return result(s, 'inspect', { rule_id: 'INSPECT-CURRENT-POSITION', technical_state: 'READY', authorization_state: 'not_required', title: `当前位于 ${branch}`, reason: dirty(s) ? '工作区或暂存区有未提交内容，先把它与分支位置分开看。' : '当前快照没有发现未提交的工作区变化。', impact: '只解释状态，不改变本地仓库或远端。', next_step: '查看当前分支、HEAD、上游分支和工作区差异，再选择具体目标。', facts: [fact('local', s.sources.local.observed_at, 'CURRENT_BRANCH', branch), fact('local', s.sources.local.observed_at, 'HEAD', s.worktree.head_oid ?? '未知'), fact('local', s.sources.local.observed_at, 'WORKTREE_DIRTY', dirty(s) ? 'yes' : 'no'), fact('local', s.sources.local.observed_at, 'UPSTREAM', s.refs.upstream ?? '未设置')] });
}

function createPr(s) {
  if (s.worktree.detached || !s.worktree.branch) return blocked(s, 'create_pr', 'CREATE-PR-NEEDS-BRANCH', '当前不是可提交 PR 的命名分支。', '先创建或切换到用于本次工作的命名分支。', [fact('local', s.sources.local.observed_at, 'BRANCH', 'detached or missing')]);
  if (dirty(s)) return blocked(s, 'create_pr', 'CREATE-PR-PROTECT-WORKTREE', '工作区还有未提交变化，不能把当前代码直接等同于 PR 内容。', '先检查差异并完成本地提交，再重新采集快照。', [fact('local', s.sources.local.observed_at, 'WORKTREE', 'dirty')]);
  if (!githubReady(s)) return blocked(s, 'create_pr', 'CREATE-PR-REMOTE-FACTS', '创建 PR 需要明确的远端、目标仓库和最新 GitHub 查询事实。', '先查询并选择目标 remote、Host、仓库和 Base 分支。', [fact('github', s.sources.github.observed_at, 'GITHUB_FRESHNESS', s.sources.github.freshness)], { technical_state: 'NEEDS_CHECK', title: '先补齐远端事实', risks: ['远端对象不唯一或事实过期时不能安全发布。'] });
  if (s.refs.current_ahead === 0) return blocked(s, 'create_pr', 'CREATE-PR-NO-COMMITS', '当前分支相对上游没有可供 PR 展示的新提交。', '先完成并提交本地改动，或确认是否选错了分支。', [fact('local', s.sources.local.observed_at, 'AHEAD', '0')]);
  if (s.refs.open_pr?.state === 'open') return result(s, 'create_pr', { rule_id: 'CREATE-PR-EXISTS', technical_state: 'READY', authorization_state: 'not_required', title: `已有开放 PR #${s.refs.open_pr.number}`, reason: '当前分支已经关联开放 PR。', impact: '应更新并检查现有 PR，而不是创建第二个 PR。', next_step: '打开现有 PR，核对 Head、Base、检查状态和最新提交。', facts: [fact('github', s.sources.github.observed_at, 'PR', `#${s.refs.open_pr.number}`)], risks: ['重复创建 PR 会分散 Review 上下文。'] });
  return result(s, 'create_pr', { rule_id: 'CREATE-PR-PREPARE-PUBLISH', technical_state: 'READY', authorization_state: 'requires_confirmation', title: '准备创建 PR', reason: '当前分支有未进入上游的本地提交，且没有开放 PR。', impact: 'Push 和创建 PR 都会改变远端协作状态，但本工具不会执行它们。', next_step: '先核对目标 Base 和远端分支；如需发布，先单独确认 Push，Push 后重新采集并核对 Head，再单独决定是否创建 PR。', facts: [fact('local', s.sources.local.observed_at, 'AHEAD', s.refs.current_ahead), fact('github', s.sources.github.observed_at, 'TARGET', s.repository.target_repository)], risks: ['Push 与创建 PR 是两个独立动作。'], confidence: 'medium' });
}

function mergePr(s) {
  if (!githubReady(s)) return blocked(s, 'merge_pr', 'MERGE-PR-REMOTE-FACTS', '合并判断需要最新 GitHub PR、权限和目标仓库事实。', '先查询并选择目标仓库，再重新检查 PR。', [fact('github', s.sources.github.observed_at, 'GITHUB_SOURCE', s.sources.github.freshness)], { technical_state: 'NEEDS_CHECK', title: '先补齐远端事实' });
  const pr = s.refs.open_pr;
  if (!pr || pr.state !== 'open') return blocked(s, 'merge_pr', 'MERGE-PR-NOT-OPEN', '没有可供当前快照判断的开放 PR。', '先查询目标 PR，并确认它的 Head、Base 和状态。', [fact('github', s.sources.github.observed_at, 'PR', 'missing or not open')]);
  if (pr.draft) return blocked(s, 'merge_pr', 'MERGE-PR-DRAFT', `PR #${pr.number} 仍是 Draft。`, '先确认是否完成开发并将 PR 转为可审查状态。', [fact('github', s.sources.github.observed_at, 'DRAFT', 'true')]);
  if (pr.mergeable === 'conflicting') return blocked(s, 'merge_pr', 'MERGE-PR-CONFLICT', `PR #${pr.number} 存在冲突。`, '先在分支上处理冲突并重新验证。', [fact('github', s.sources.github.observed_at, 'MERGEABLE', 'conflicting')]);
  if (pr.checks !== 'passing' || pr.review_state !== 'approved' || pr.branch_protection !== 'satisfied') return blocked(s, 'merge_pr', 'MERGE-PR-GUARDS', `PR #${pr.number} 尚未满足全部合并前置条件。`, '先处理最优先的 Checks、Review 或分支保护缺口。', [fact('github', s.sources.github.observed_at, 'CHECKS', pr.checks), fact('github', s.sources.github.observed_at, 'REVIEW', pr.review_state)]);
  return result(s, 'merge_pr', { rule_id: 'MERGE-PR-VERIFY-POLICY', technical_state: 'READY', authorization_state: 'requires_confirmation', title: `PR #${pr.number} 可以进入合并方式核对`, reason: 'Checks、Review 和分支保护条件满足，但仍需读取团队合并策略。', impact: '合并是远端写操作，本工具不会执行。', next_step: '先核对仓库允许的合并方式和团队约定，再选择 merge、squash 或 rebase。', facts: [fact('github', s.sources.github.observed_at, 'PR', `#${pr.number}`), fact('github', s.sources.github.observed_at, 'BASE', pr.base)], risks: ['错误的合并方式会改变历史结构。'], confidence: 'medium' });
}

function syncRemote(s) {
  if (!s.repository.target_remote || !s.refs.upstream) return blocked(s, 'sync_remote', 'SYNC-REMOTE-TARGET', '目标 remote 或 upstream 不唯一。', '先选择要查询或更新的 remote 和 upstream。', [fact('local', s.sources.local.observed_at, 'TARGET_REMOTE', s.repository.target_remote ?? 'missing')], { technical_state: 'NEEDS_CHECK', title: '先选择远端目标' });
  if (s.sources.local.freshness !== 'fresh') return blocked(s, 'sync_remote', 'SYNC-REMOTE-LOCAL-FACTS', '本地仓库事实已经过期或不可用，不能直接依据旧的 ahead/behind 数值判断。', '先重新采集本地仓库快照，再决定是否 Fetch 或整合。', [fact('local', s.sources.local.observed_at, 'LOCAL_FRESHNESS', s.sources.local.freshness)], { technical_state: 'NEEDS_CHECK', title: '先刷新本地状态', risks: ['旧快照可能已经不再反映当前 HEAD、refs 或工作区。'] });
  if (dirty(s)) return blocked(s, 'sync_remote', 'SYNC-REMOTE-PROTECT-WORKTREE', '工作区有未提交变化，整合远端前应先保护现场。', '先检查或保存本地变化，再决定是否 Fetch 或整合。', [fact('local', s.sources.local.observed_at, 'WORKTREE', 'dirty')]);
  if (s.refs.current_behind > 0) return result(s, 'sync_remote', { rule_id: 'SYNC-REMOTE-BEHIND', technical_state: 'READY', authorization_state: 'not_required', title: '当前分支落后于上游', reason: `检测到落后 ${s.refs.current_behind} 个提交。`, impact: 'Fetch 只更新本地远端跟踪引用；Pull、Merge 或 Rebase 才会进一步改变当前分支。', next_step: '先 Fetch 并重新查看差异，再选择整合方式；本工具不会自动整合。', facts: [fact('local', s.sources.local.observed_at, 'BEHIND', s.refs.current_behind), fact('local', s.sources.local.observed_at, 'UPSTREAM', s.refs.upstream)], risks: ['Fetch、整合和工作树验证是不同阶段。'] });
  return result(s, 'sync_remote', { rule_id: 'SYNC-REMOTE-NO-INTEGRATION', technical_state: 'READY', authorization_state: 'not_required', title: '没有发现需要立即整合的上游提交', reason: '当前分支没有落后于上游。', impact: '远端查询、Fetch 和整合仍是三个不同动作。', next_step: '如果只是想确认远端事实，执行只读查询；不要用“同步”一键代替具体动作。', facts: [fact('local', s.sources.local.observed_at, 'BEHIND', '0')] , confidence: 'medium' });
}

export function recommend(snapshot, goal) {
  if (!GOALS.has(goal)) return blocked(snapshot, 'unknown', 'GOAL-UNKNOWN', `不支持的目标：${goal ?? 'missing'}。`, '选择查看状态、提 PR、合并 PR 或远端更新到本地。', [fact('local', null, 'GOAL', goal ?? 'missing')]);
  const validation = validateRepoSnapshot(snapshot);
  if (!validation.ok || snapshot.status !== 'valid' || snapshot.invalidation.valid !== true) return blocked(snapshot, goal, 'SNAPSHOT-INVALID', validation.errors.join(' ') || snapshot.invalidation.reasons.join(' ') || '快照已失效。', '重新采集并校验完整快照后再判断。', [fact('local', null, 'SNAPSHOT_ID', snapshot?.snapshot_id ?? 'missing')]);
  if (goal === 'inspect') return inspect(snapshot);
  if (goal === 'create_pr') return createPr(snapshot);
  if (goal === 'merge_pr') return mergePr(snapshot);
  return syncRemote(snapshot);
}

export const supportedGoals = [...GOALS];
