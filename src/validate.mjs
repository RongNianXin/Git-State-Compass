const sourceShape = (value, path, errors) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return errors.push(`${path} must be an object`);
  for (const key of ['freshness', 'observed_at', 'query_method', 'permission']) if (!(key in value)) errors.push(`${path}.${key} is required`);
  if (!['fresh', 'stale', 'unknown', 'unavailable'].includes(value.freshness)) errors.push(`${path}.freshness is invalid`);
  if (!['available', 'denied', 'unknown', 'not_applicable'].includes(value.permission)) errors.push(`${path}.permission is invalid`);
};

export function validateRepoSnapshot(snapshot) {
  const errors = [];
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return { ok: false, errors: ['snapshot must be an object'] };
  for (const key of ['schema_version', 'snapshot_id', 'status', 'started_at', 'completed_at', 'repository', 'worktree', 'refs', 'sources', 'invalidation']) if (!(key in snapshot)) errors.push(`${key} is required`);
  if (snapshot.schema_version !== '1.1') errors.push('schema_version must be 1.1');
  if (!['valid', 'invalid'].includes(snapshot.status)) errors.push('status is invalid');
  if (snapshot.repository?.target_remote !== null && typeof snapshot.repository?.target_remote !== 'string') errors.push('repository.target_remote must be string or null');
  if (typeof snapshot.worktree?.detached !== 'boolean') errors.push('worktree.detached must be boolean');
  for (const key of ['staged', 'conflicts']) if (typeof snapshot.worktree?.index?.[key] !== 'boolean') errors.push(`worktree.index.${key} must be boolean`);
  for (const key of ['modified', 'untracked']) if (typeof snapshot.worktree?.working_tree?.[key] !== 'boolean') errors.push(`worktree.working_tree.${key} must be boolean`);
  for (const key of ['current_ahead', 'current_behind']) if (!Number.isInteger(snapshot.refs?.[key]) || snapshot.refs[key] < 0) errors.push(`refs.${key} must be a non-negative integer`);
  sourceShape(snapshot.sources?.local, 'sources.local', errors); sourceShape(snapshot.sources?.github, 'sources.github', errors);
  if (!snapshot.invalidation || typeof snapshot.invalidation.valid !== 'boolean' || !Array.isArray(snapshot.invalidation.reasons)) errors.push('invalidation is invalid');
  return { ok: errors.length === 0, errors };
}
