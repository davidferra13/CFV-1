# Dirty Tree Triage

- Date: 2026-04-30
- Branch: `feature/v1-builder-runtime-scaffold`
- Commit at triage: `e2686a13e`
- Task: Classify current dirty work without cleaning, reverting, or reading sensitive vault contents.

## Verdict

The tree is dirty, but the dirty work is separable. There is no evidence that the Obsidian memory commit left owned files uncommitted. The remaining dirt is from other active or generated work.

Do not run broad cleanup. Do not `git add -A`. Do not delete or revert anything without explicit owner approval.

## Post-Push Note

After this report was first committed, the commit and push hooks restored the pre-existing dirty state and surfaced two additional dirty files:

- `AGENTS.md`
- `tests/unit/v1-builder-queue.test.mjs`

Those files are included below in bucket 7.

## Cleanup Action

After explicit approval, the high-risk untracked artifacts were moved outside the repo to:

- `C:\Users\david\Documents\CFv1-local-quarantine\20260430T193900Z\origin`
- `C:\Users\david\Documents\CFv1-local-quarantine\20260430T193900Z\identity-claims-browser-sessions`
- `C:\Users\david\Documents\CFv1-local-quarantine\20260430T193900Z\identity-claims-vault.enc.json`

Ignore rules were added for `/origin/`, `/system/identity-claims/browser-sessions/`, and `/system/identity-claims/vault.enc.json` so these artifacts do not reappear in `git status` if recreated.

## Buckets

### 1. Runtime and generated evidence artifacts

Files:

- `docs/simulation-history.md`
- `docs/simulation-report.md`
- `docs/stress-tests/REGISTRY.md`
- `docs/sync-status.json`
- `logs/live-ops-guardian-alert.txt`
- `logs/live-ops-guardian.log.old`

Classification: `current-dirty` and `report-artifact`.

What changed:

- Simulation report moved from run `5497a724` at `2026-04-30T09:16:14.575Z` to run `e38c3608` at `2026-04-30T14:16:42.911Z`.
- Simulation history added four more `0% pass rate` runs.
- Stress-test registry added 72 persona rows, including one duplicate `kenji-morita` row.
- Sync status changed from 7 consecutive failures to 12. Latest failure includes `cannot refresh materialized view "public.category_price_baselines" concurrently`.
- Live Ops Guardian alert file was deleted, while the old log still records `launch-public` needs attention.

Disposition:

- Preserve for the owning simulation, persona, sync, or live-ops agent.
- Treat these as evidence, not source code.
- Commit only if the operator wants a checkpoint of current operational truth.

### 2. Local build or runtime pollution

Files:

- `public/sw.js`
- `tsconfig.next.json`

Classification: `current-dirty` with product risk.

What changed:

- `public/sw.js` stamped `BUILD_VERSION` from `e925385f5` to `7230befbf`, which is stale relative to current `HEAD` `e2686a13e`.
- `tsconfig.next.json` added local `.next-dev-mobile-*` and `.next-dev-probe-*` generated type paths.

Disposition:

- Do not commit automatically.
- These look like local run or build artifacts, not intentional source changes.
- They should be handled by the owner of the build or mobile audit run.

### 3. Identity claim artifacts

Files:

- `system/identity-claims/identity-claim-report.md`
- `system/identity-claims/state.json`
- `system/identity-claims/vault.enc.json`
- `system/identity-claims/browser-sessions/`

Classification: sensitive operational state.

What changed:

- Identity state/report changed from missing operator inputs to captured credentials for internal ChefFlow identities, with account provisioning still paused.
- `vault.enc.json` is untracked, 14,136 bytes.
- `browser-sessions/` is untracked, 2,760 files, about 245 MB.

Disposition:

- Browser profile internals were not read.
- Browser sessions were moved outside the repo after explicit approval.
- `vault.enc.json` was moved outside the repo after explicit approval.
- Ignore rules now prevent these local artifacts from reappearing in `git status` if recreated.

### 4. Full repo copy under `origin/`

Path:

- `origin/feature/private-dev-cockpit-spec/`

Classification: untracked duplicate workspace.

Evidence:

- About 10,929 files.
- About 240 MB.
- Contains its own `.git` directory and a full ChefFlow-like tree.

Disposition:

- Moved outside the repo after explicit approval.
- Not deleted.
- Likely accidental extraction, copied checkout, or failed branch materialization.

### 5. Active pricing proof agent claim

Files:

- `system/agent-claims/20260430T175158Z-feature-pricing-proof-evidence-scoring-build-pricing-reliability-engine-proof-lo.json`
- `system/agent-reports/context-continuity/20260430T175158Z-build-pricing-reliability-engine-proof-loop-blockers-unit-normalization-coverage.json`
- `system/agent-reports/flight-records/20260430T175158Z-build-pricing-reliability-engine-proof-loop-blockers-unit-normalization-coverage.json`
- `system/agent-reports/router-decisions/20260430T175156Z-build-pricing-reliability-engine-proof-loop-blockers-unit-normalization-coverage.json`

Classification: active other-agent work.

Evidence:

- Claim status is `active`.
- Claimed branch is `feature/pricing-proof-evidence-scoring`.
- Owned paths include `lib/pricing`, `tests/unit`, and `scripts/audit-geographic-pricing-proof.mjs`.

Disposition:

- Preserve.
- Do not close or commit this from the current branch unless the pricing-proof owner explicitly hands it off.

### 6. Founder Confidence Gate spec

File:

- `docs/specs/founder-confidence-gate.md`

Classification: untracked planner artifact.

Evidence:

- Status: `ready`.
- Priority: `P0 (blocking)`.
- Created by Codex planner session at `2026-04-30 12:55 EDT`.

Disposition:

- Safe to review as a spec.
- Do not commit automatically from this branch unless this branch is the intended owner.

### 7. Source-level active workflow changes surfaced after hooks

Files:

- `AGENTS.md`
- `tests/unit/v1-builder-queue.test.mjs`

Classification: source-level active work.

What changed:

- `AGENTS.md` adds `swarm-governor` to the ChefFlow operating loop and skill list.
- `tests/unit/v1-builder-queue.test.mjs` adds builder-gate intake tests for ready V1 specs, approved queue write caps, hard-stop findings, and research sink behavior.

Disposition:

- Do not commit from this triage task.
- These are not generated logs. They look like active workflow and builder-runtime work.
- They should be owned by the swarm-governor or V1 builder-runtime task owner.

## Immediate Recommendation

1. Leave all current dirty files untouched.
2. Ask the identity-claim owner whether `vault.enc.json` and `browser-sessions/` should be ignored, moved outside the repo, or committed under a specific secure policy.
3. Ask whether the `origin/feature/private-dev-cockpit-spec/` duplicate checkout can be removed or relocated.
4. Let the pricing-proof active claim finish on its own branch.
5. Only after those decisions, run a clean health proof.

## Evidence Integrity

CLAIM: The tree is dirty but classifiable.

VERDICT: trusted for classification, not a full product health verdict.

EVIDENCE:

- `current-dirty` `git status --short --branch`: lists remaining modified, deleted, and untracked files after the Obsidian memory commit.
- `current-dirty` `git diff --stat`: initially showed 10 tracked dirty files with 533 insertions and 409 deletions. After hook restoration it showed 12 tracked dirty files with 629 insertions and 411 deletions.
- `current-dirty` `git diff public/sw.js tsconfig.next.json`: identifies stale service worker stamp and local `.next` path additions.
- `current-dirty` `git diff docs/sync-status.json`: identifies current sync failure metadata.
- `current-dirty` active claim JSON: identifies other-agent pricing proof ownership.
- `heuristic-signal` file counts and sizes: classifies duplicate checkout and browser sessions by metadata only.

CONFLICTS:

- Push hook type check and quick regression passed on commit `e2686a13e`, but the working tree remains dirty with unrelated artifacts.
- `docs/sync-status.json` is current-dirty evidence of pricing sync failure, not live proof that all pricing runtime layers are down.
- `public/sw.js` points at an older build hash than current `HEAD`.

NEXT PROOF:

- Resolve or explicitly preserve identity artifacts and the duplicate `origin/` checkout.
- Then run current health checks from a clean tree.
