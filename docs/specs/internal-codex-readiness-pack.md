# Internal Codex Readiness Pack

Status: ready for build
Scope: internal developer tooling only
Created: 2026-04-24

## Single Highest-Leverage Action Remaining

Build an internal Codex Readiness Pack: one local command that generates a compact, current execution brief for future Codex agents before they touch the repo.

This is the highest-leverage action inside the current scope because the product is already feature-rich, but future progress is bottlenecked by validation, launch readiness, noisy workspace state, and agents repeatedly rediscovering context. The tool should make smarter Codex sessions start from a precise local truth snapshot instead of scanning a 50GB+ working tree from scratch.

## Evidence

- ChefFlow is already broad and mature: `docs/product-blueprint.md:31` through `docs/product-blueprint.md:40` show 95% build completeness but only 10% validation and 25% launch readiness.
- Launch blockers are validation-oriented, not core feature gaps: `docs/product-blueprint.md:197` through `docs/product-blueprint.md:210` list real-chef usage, non-developer public booking testing, survey analysis, and onboarding testing as remaining work.
- The canonical product is the authenticated operator workspace, with public and client surfaces as supporting surfaces: `docs/project-definition-and-scope.md:21` through `docs/project-definition-and-scope.md:63`.
- The repo already has many verification and operational commands to summarize rather than reinvent: `package.json:6` through `package.json:26`, `package.json:44` through `package.json:66`, and `package.json:100` through `package.json:135`.
- There is live operational drift that future agents need to see immediately: `docs/sync-status.json:1` through `docs/sync-status.json:15` reports a failed sync with a 5400 second timeout, and `docs/sync-status.json:25` through `docs/sync-status.json:30` names failed catalog/pricing steps.
- The repo intentionally ignores many generated and heavy artifacts, which means a readiness tool should classify workspace noise instead of making each agent rediscover it: `.gitignore:12` through `.gitignore:14`, `.gitignore:127` through `.gitignore:145`, `.gitignore:179` through `.gitignore:204`, and `.gitignore:227` through `.gitignore:274`.

## Non-Goals

- Do not add OpenAI, ChatGPT, or cloud AI to ChefFlow user-facing features.
- Do not call external APIs.
- Do not write to the database.
- Do not delete, move, compress, or clean files.
- Do not change production app behavior.
- Do not build a dashboard UI in this pass.

## Build Exactly This

Add a local CLI command:

```bash
npm run codex:brief
```

The command must generate:

```text
docs/.codex-workspace-brief.md
reports/codex-readiness.json
```

The markdown brief must be concise enough to paste into a new Codex thread. Target 150 to 250 lines.

The JSON report must be machine-readable and stable enough for future agents or CI scripts to consume.

## Required Output Sections

The markdown brief must contain these sections in this order:

1. `Product Truth`
   - Read from `docs/project-definition-and-scope.md`.
   - State that ChefFlow is operator-first.
   - State that public discovery, client portal, staff, partner, admin, and API surfaces support the operator system.
   - State that this tool is internal only and does not add user-facing OpenAI.

2. `Launch Blockers`
   - Read from `docs/product-blueprint.md`.
   - Extract unchecked V1 exit criteria and should-have launch items.
   - Include the build, validation, and launch-readiness percentages if present.

3. `Workspace State`
   - Include current branch if available.
   - Include `git status --short` counts grouped by modified, added, deleted, renamed, and untracked.
   - Include the first 40 changed paths, sorted by path.
   - If there are more than 40 changed paths, include the remaining count.
   - Do not fail if git is unavailable.

4. `Operational Health`
   - Read `docs/sync-status.json` if present.
   - Surface status, last error, last success, last failure, elapsed seconds, run id, and failed step names.
   - Read `logs/live-ops-guardian-latest.json` if present.
   - Surface run id, run time, changed path count, and whether new changes were detected.
   - Mark failed sync or missing last success as `attention required`.

5. `Verification Commands`
   - Read `package.json`.
   - List the minimum safe commands future agents should prefer:
     - `npm run typecheck`
     - `npm run typecheck:scripts`
     - `npm run test:unit`
     - `npm run test:e2e:smoke`
     - `npm run verify:release`
     - `npm run sync:audit`
   - Only list commands that actually exist in `package.json`.

6. `Artifact Noise`
   - Read `.gitignore`.
   - Summarize ignored/generated categories relevant to Codex:
     - Next build outputs
     - Playwright outputs
     - logs
     - backups
     - screenshots
     - temp directories
     - Tauri build output
     - local data and private exports
   - Include a warning that this command does not clean them.

7. `Recommended Next Agent Task`
   - Emit one task recommendation from the local evidence.
   - For the current state, this should prioritize launch validation and operational health over new user-facing AI.
   - The recommendation must include file path evidence in the brief.

## Implementation Requirements

Create these files:

```text
scripts/codex-readiness.mjs
scripts/lib/codex-readiness-core.mjs
tests/unit/codex-readiness.test.ts
```

Update:

```text
package.json
```

Add this script:

```json
"codex:brief": "node scripts/codex-readiness.mjs"
```

Keep implementation additive. Do not remove or alter existing scripts.

The CLI should:

- Use Node standard library only unless an existing dependency is clearly justified.
- Use structured parsers for JSON.
- Parse markdown conservatively with simple section and checklist extraction. Do not build a full markdown parser.
- Fail soft. Missing optional files should produce warnings, not process failure.
- Exit non-zero only for malformed `package.json`, write failure, or an unexpected script exception.
- Create `reports/` if it does not exist.
- Overwrite only the two generated outputs listed above.
- Never mutate any source file except `docs/.codex-workspace-brief.md` and `reports/codex-readiness.json`.

## Core Helper Functions

Implement and unit test pure helpers in `scripts/lib/codex-readiness-core.mjs`:

- `parseGitStatusLines(lines)`
- `extractUncheckedChecklistItems(markdown)`
- `extractProgressBlock(markdown)`
- `summarizeSyncStatus(syncJson)`
- `selectExistingPackageScripts(packageJson, desiredScripts)`
- `summarizeGitignoreNoise(gitignoreText)`
- `buildMarkdownBrief(report)`

The CLI wrapper can handle filesystem reads, child process calls, and writes.

## JSON Contract

`reports/codex-readiness.json` must include:

```json
{
  "generatedAt": "ISO-8601 string",
  "productTruth": {
    "operatorFirst": true,
    "source": "docs/project-definition-and-scope.md"
  },
  "launch": {
    "progress": {},
    "uncheckedItems": []
  },
  "workspace": {
    "branch": null,
    "statusCounts": {},
    "changedPathsSample": [],
    "changedPathsRemaining": 0
  },
  "operationalHealth": {
    "sync": {},
    "liveOpsGuardian": {},
    "attentionRequired": []
  },
  "verificationCommands": [],
  "artifactNoise": [],
  "recommendation": {
    "title": "",
    "rationale": "",
    "evidence": []
  },
  "warnings": []
}
```

Additional fields are allowed, but these keys must stay present.

## Acceptance Criteria

- `npm run codex:brief` exits 0 on the current repo.
- `docs/.codex-workspace-brief.md` is created and stays under 250 lines.
- `reports/codex-readiness.json` is created and parses as valid JSON.
- The generated brief includes the failed sync timeout from `docs/sync-status.json` when that file reports it.
- The generated brief includes unchecked V1 exit criteria from `docs/product-blueprint.md`.
- The generated brief states that the build is internal only and does not add user-facing OpenAI.
- Unit tests cover all pure helper functions.
- No database command is run.
- No network call is made.
- No cleanup or deletion happens.

## Verification

Run:

```bash
node --test --import tsx tests/unit/codex-readiness.test.ts
npm run codex:brief
```

Then manually inspect:

```text
docs/.codex-workspace-brief.md
reports/codex-readiness.json
```

Do not run full release gates unless the implementation touches shared app code. This build should not touch shared app code.

## Handoff Notes

This is a single-agent build. Do not split across multiple Codex agents unless the first agent gets blocked. The write set is small and should stay owned by one implementer to avoid package/script/test conflicts.
