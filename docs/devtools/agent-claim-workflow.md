# Agent Claim Workflow

This workflow keeps concurrent ChefFlow agents from overwriting each other, shipping stale work, or losing ownership context. It is intended for local agent tooling and manual agent operation.

## Goals

- Make file ownership explicit before editing.
- Surface active swarm work without blocking unrelated agents.
- Prevent stale branch pushes.
- Separate warnings from hard blockers.
- Keep cleanup scoped to the current agent's owned files.

## Ownership Rules

An agent owns only the files named in the current task or the files it creates to satisfy that task.

An agent does not own:

- Files already dirty before the task started.
- Files edited by another agent.
- Generated artifacts that were not created by the current task.
- Broad docs, package metadata, lockfiles, config files, or shared helpers unless the task explicitly names them.

If ownership is ambiguous, stop and ask before editing.

## Start

Run this before writing any code or docs.

1. Read the latest user request and project instructions.
2. Identify the exact owned file list.
3. Check the current branch:

   ```powershell
   git branch --show-current
   ```

4. Check current swarm activity:

   ```powershell
   git status --short
   ```

5. Verify each owned file does not already contain another agent's uncommitted work:

   ```powershell
   git status --short -- path/to/owned-file
   ```

6. If creating a new file, verify it does not already exist:

   ```powershell
   Test-Path -LiteralPath path/to/new-file
   ```

7. If the branch is `main`, create a feature branch before editing.
8. Announce the owned files and any unrelated dirty work being preserved.

Start succeeds when all owned paths are known, no owned path is unexpectedly dirty, and the agent is not working directly on `main`.

## Check

Run this before each edit batch and again before staging.

1. Confirm the owned file list still matches the task.
2. Re-check owned paths:

   ```powershell
   git status --short -- path/to/owned-file
   ```

3. Re-check the branch:

   ```powershell
   git branch --show-current
   ```

4. If the branch changed unexpectedly, stop and report branch drift.
5. If an owned file changed unexpectedly, stop and report ownership drift.
6. If unrelated files are dirty, leave them alone.

Checks should be fast and narrow. Do not run full repo cleanup, broad formatting, or dependency changes unless the task explicitly requires them.

## Finish

Run this after the owned edits are complete.

1. Inspect the owned diff only:

   ```powershell
   git diff -- path/to/owned-file
   ```

2. Run targeted validation that matches the owned change. For documentation-only changes, use spelling, ASCII, and banned-character checks instead of builds.
3. Confirm no banned em dash characters in owned files:

   ```powershell
   Select-String -Path path/to/owned-file -Pattern ([char]0x2014) -SimpleMatch
   ```

4. Confirm no forbidden public surface terms were introduced when relevant.
5. Stage only owned files:

   ```powershell
   git add -- path/to/owned-file
   ```

6. Confirm the staged set contains only owned files:

   ```powershell
   git diff --cached --name-only
   ```

7. Commit with the requested or task-appropriate message:

   ```powershell
   git commit -m "chore(agent): short description branch-name"
   ```

8. Push only when the user or project rule requires it. If the user says not to push, do not push.

Finish succeeds when the owned files are committed and unrelated dirty work is preserved.

## Cleanup

Cleanup is scoped to artifacts created by the current agent.

Allowed cleanup:

- Remove temporary files created by the current task.
- Remove generated logs created by the current task if they are not needed as evidence.
- Unstage files that were accidentally staged and are not owned:

  ```powershell
  git restore --staged -- path/to/unowned-file
  ```

Not allowed cleanup:

- Revert unrelated dirty files.
- Delete untracked files created by other agents.
- Reformat broad directories.
- Rewrite package files or lockfiles outside the task.
- Kill or restart servers.

If cleanup would touch another agent's work, report it instead of acting.

## Swarm Status

Use swarm status to communicate what is happening in a dirty shared worktree.

Minimum swarm status:

- Current branch.
- Owned files.
- Unrelated dirty files observed.
- Whether any owned file was already dirty.
- Whether the final commit includes only owned files.

Example:

```text
Branch: feature/example
Owned: docs/devtools/agent-claim-workflow.md
Unrelated dirty work: present, preserved
Owned file pre-existing: no
Committed owned file only: yes
Pushed: no, user requested no push
```

Do not paste the entire dirty tree unless it is needed to explain a blocker.

## Branch Drift Push Guidance

Branch drift means the branch changed after the agent started, the local branch diverged from its upstream, or the intended branch no longer matches the task.

Before pushing, check:

```powershell
git status --short --branch
git branch --show-current
git rev-parse --abbrev-ref --symbolic-full-name @{u}
```

If there is no upstream, push with an explicit upstream only after confirming the branch is correct:

```powershell
git push -u origin current-branch-name
```

If local is behind upstream:

- Do not force push.
- Do not merge or rebase automatically when unrelated dirty work is present.
- Report the drift and ask for direction unless the task explicitly authorizes syncing.

If local and upstream have diverged:

- Treat this as a blocker.
- Do not push.
- Report the local branch, upstream branch, and divergence state.

If the user explicitly says not to push, do not push even if project defaults normally require push.

## Warning vs Block Mode

Use warning mode when the issue is real but the requested scoped work can proceed without risking another agent's changes.

Warnings:

- Unrelated dirty files exist.
- Untracked files exist outside owned paths.
- Full validation is skipped because the task is docs-only.
- A non-owned hook warning appears but the owned diff is clean.
- Push is skipped because the user explicitly requested no push.

Use block mode when proceeding risks data loss, invalid ownership, production impact, or a stale publish.

Blockers:

- Owned file already exists when the task says to create it only if absent.
- Owned file has unexpected pre-existing dirty changes.
- Current branch is `main` and branch creation is not possible.
- Branch drift or upstream divergence exists before push.
- Staged files include unowned paths.
- Required validation fails for owned files.
- The task requires a forbidden action, such as destructive database work, production deploy, unapproved build, or editing generated database types.

Warning mode reports and proceeds. Block mode stops, reports the exact blocker, and leaves unrelated work untouched.

## Command Summary

Start:

```powershell
git branch --show-current
git status --short
git status --short -- path/to/owned-file
Test-Path -LiteralPath path/to/new-file
```

Check:

```powershell
git status --short -- path/to/owned-file
git branch --show-current
```

Finish:

```powershell
git diff -- path/to/owned-file
Select-String -Path path/to/owned-file -Pattern ([char]0x2014) -SimpleMatch
git add -- path/to/owned-file
git diff --cached --name-only
git commit -m "chore(agent): short description branch-name"
```

Push guard:

```powershell
git status --short --branch
git rev-parse --abbrev-ref --symbolic-full-name @{u}
```
