# Beginner Task Flows (v0-core)

These flows describe decisions; they are not automation scripts. Git State Compass currently reads snapshots and recommends a next step. It does not run Push, PR, Merge, or Rebase for the user.

## 1. I want to submit a PR

1. Check the current branch.
2. If the repository is in detached HEAD, switch to a named branch.
3. If the worktree is dirty, inspect the diff and create a local commit first.
4. Confirm the branch has commits that are not in the intended base.
5. Confirm the Base, target remote, and repository are unambiguous.
6. If the remote branch does not exist, Push is a separate remote action that needs confirmation.
7. After Push, read the Head again, then decide separately whether to create or update a PR.

Key idea: Push and creating a PR are different actions. Local code is not automatically remote code.

## 2. I want to merge a PR

1. Confirm the PR is still open and its Head and Base are current.
2. Check whether it is a Draft.
3. Check Checks, Review, and branch protection.
4. If there is a conflict, resolve it and verify again.
5. Read the repository's allowed merge methods and team policy.
6. Compare merge, squash, and rebase only after that.
7. Merging changes remote state; the tool recommends but does not execute it.

Key idea: Passing Checks does not imply one universally correct merge method.

## 3. I want remote changes locally

1. Select one remote and upstream.
2. Confirm the local snapshot is fresh.
3. Protect uncommitted work before integration.
4. Separate Fetch, integration, and worktree changes.
5. If the branch is behind, Fetch first and inspect the difference again.
6. If the histories diverged, the tool does not guess Merge or Rebase.
7. Capture a new snapshot before choosing the next step.

Key idea: Fetch updates local remote-tracking information; it does not merge remote code into the current branch.

## State words

| Tool state | Plain meaning |
|---|---|
| `READY` | Evidence is sufficient for a recommendation; the tool still will not execute it |
| `NEEDS_CHECK` | More information or a target choice is needed |
| `BLOCKED` | Continuing would risk a wrong decision |
| `requires_confirmation` | The action affects remote state or history and needs separate confirmation |
