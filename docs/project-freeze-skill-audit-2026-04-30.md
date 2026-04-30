# Project Freeze Skill Audit, 2026-04-30

## Freeze State

Feature work is frozen for this pass. This audit does not authorize new product surface, database migrations, deploys, server restarts, or `next build`.

- Branch: `feature/project-freeze-skill-audit`
- Scope owned by this pass: `.claude/skills/freeze-audit/SKILL.md`, `.claude/skills/omninet/SKILL.md`, `docs/project-freeze-skill-audit-2026-04-30.md`, generated context-continuity report for this prompt
- Existing unrelated dirty work observed before edits: `docs/simulation-history.md`, `docs/simulation-report.md`, `docs/stress-tests/REGISTRY.md`, `docs/sync-status.json`, `logs/live-ops-guardian-alert.txt`, `public/sw.js`, two untracked context-continuity reports
- Continuity decision: `extend`, canonical surface `agent-skill-system`

## Current Evidence

| Evidence                                                                                                                    | Classification                     | Result                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git status --short --branch`                                                                                               | current-dirty                      | Worktree already dirty from unrelated agent work before this pass. Confidence is reduced for global validation.                                                            |
| `node devtools/context-continuity-scan.mjs --prompt ... --write`                                                            | current-dirty                      | Wrote `system/agent-reports/context-continuity/20260430T035440Z-freeze-the-project-and-audit-the-chefflow-codebase-against-the-installed-matt-po.json`; decision `extend`. |
| Installed skill inventory in `C:\Users\david\.codex\skills`                                                                 | current-clean for local filesystem | 18 non-deprecated Matt Pocock skills installed. Current session can read them from disk, but future sessions should restart Codex to register them.                        |
| `package.json` scripts                                                                                                      | current-clean for file read        | Existing hooks and audit scripts already exceed generic setup needs.                                                                                                       |
| `.husky/pre-commit` and `.husky/pre-push`                                                                                   | current-clean for file read        | Pre-commit runs quick regression, secret hook, lint-staged, and claim warning. Pre-push runs TypeScript, quick regression, and snapshot diff.                              |
| Static counts: `@ts-nocheck`, em dash, `OpenClaw`, invalid variants                                                         | heuristic-signal                   | 57 `@ts-nocheck` file hits, 409 em dash file hits, 360 `OpenClaw` file hits, 0 invalid Button variant hits for the searched pattern.                                       |
| `node --test --import tsx tests/unit/auth.tenant-isolation.test.ts`                                                         | current-dirty                      | Failed 2 suites: tenantId-from-input heuristic found 16 files, and stale test path expects `db/migrations` instead of `database/migrations`.                               |
| `node --test --import tsx tests/unit/events.fsm.test.ts tests/unit/ledger.append.test.ts tests/unit/ledger.compute.test.ts` | current-dirty                      | Passed, 130 tests.                                                                                                                                                         |
| `bash scripts/compliance-scan.sh`                                                                                           | current-dirty, incomplete          | Timed out after 124 seconds. Needs a narrower or optimized freeze-safe compliance command.                                                                                 |
| `node --test --import tsx tests/system-integrity/q85-ts-nocheck-export-safety.spec.ts`                                      | invalid-command evidence           | Failed because Playwright specs cannot be run with Node test runner. Use Playwright for that file.                                                                         |

## Findings

### P0: Freeze Needs A Durable Owner

The project had many audit skills and reports, but no single repeatable "freeze and audit against skills" owner. That creates a risk that agents keep building while audits pile up. This pass adds `freeze-audit` and routes future freeze prompts through `omninet`.

Validation target: `node devtools/skill-validator.mjs freeze-audit omninet`.

### P1: Tenant Isolation Test Is Red

`tests/unit/auth.tenant-isolation.test.ts` currently fails. The most important failure is the tenantId-from-input scan, which flagged:

- `lib/ai/chef-profile-actions.ts`
- `lib/auth/actions.ts`
- `lib/booking/instant-book-actions.ts`
- `lib/calls/call-reminder-delivery.ts`
- `lib/chef/profile-actions.ts`
- `lib/client-portal/actions.ts`
- `lib/finance/event-pricing-intelligence-actions.ts`
- `lib/hub/menu-poll-actions.ts`
- `lib/inquiries/follow-up-delivery.ts`
- `lib/operational-awareness/actions.ts`
- `lib/partners/actions.ts`
- `lib/quotes/quote-delivery.ts`
- `lib/reports/daily-report-delivery.ts`
- `lib/sharing/actions.ts`
- `lib/tickets/actions.ts`
- `lib/tickets/purchase-actions.ts`

This is a mixed evidence finding. Some hits may be internal helpers fed from trusted DB rows or session-derived values, but the test correctly points at a high-risk boundary. Next pass should classify each file as real violation, trusted internal helper, stale test, or contract drift.

Validation target: rerun `node --test --import tsx tests/unit/auth.tenant-isolation.test.ts` after classification and fixes.

### P1: Auth Test Contains A Stale Migration Path

The same test expects `db/migrations`, but ChefFlow migrations are under `database/migrations`. This is contract drift in the test, not proof the database migration layer is missing.

Validation target: update the test or helper to use the canonical migration directory, then rerun the auth test.

### P1: Generic Matt Skill Setup Conflicts With ChefFlow Unless Adapted

Matt's `setup-matt-pocock-skills` expects `CONTEXT.md` and `docs/agents/`; neither exists. ChefFlow already uses `AGENTS.md`, `.claude/skills`, `system/canonical-surfaces.json`, `system/agent-reports`, and project-specific hard stops. Applying the generic setup directly would create parallel process surfaces.

Decision: adapt the useful parts into ChefFlow docs or skills, do not add duplicate `docs/agents/` unless a later pass proves it is the canonical home.

### P1: Generic Git Guardrails Should Not Be Installed As-Is

ChefFlow's Git workflow requires every code-writing agent to commit and push feature branches before finishing. Matt's `git-guardrails-claude-code` blocks git push by design. ChefFlow already has `.husky` pre-commit and pre-push gates, so a generic push blocker would conflict with project operations.

Decision: reject direct install. If more guardrails are needed, patch ChefFlow-specific hooks or skills instead.

### P2: Compliance Signals Are Too Broad To Trust Untriaged

Static counts show 57 `@ts-nocheck` file hits, 409 files with em dash hits, and 360 files with `OpenClaw` hits. The counts include docs, tests, internal code, and allowed internal references. They are not release verdicts.

Useful narrowed signal:

- Invalid Button variant pattern searched across `app` and `components`: zero hits.
- Actual `@ts-nocheck` callable export scan found `tests\helpers\e2e-seed.ts`, which is non-production test helper evidence, not a production action violation.
- Public and chef-facing `OpenClaw` hits include comments, imports, route names, admin/internal areas, and at least one public ingredient page comment. Public visible copy still needs a targeted scan.

Validation target: replace broad grep with a scoped compliance runner that separates production UI strings, internal code, docs, scripts, and tests.

### P2: `use server` Auth Scan Needs AST-Level Precision

A naive scan found 1209 files containing `'use server'` and 269 without obvious auth. This is too noisy because many files contain constants, types, internal helpers, public actions, or non-exported server-only modules. The rule remains important, but the check needs an AST-aware server action inventory.

Validation target: build or use a script that identifies exported async functions in `'use server'` files, then checks first-call auth and tenant scoping.

### P2: Core Invariants Have Some Current Green Coverage

FSM and ledger unit tests passed in the targeted run:

- event transitions,
- terminal state behavior,
- actor permissions,
- ledger cents integer validation,
- required ledger fields,
- idempotency classification,
- computed revenue and balances.

This does not prove release health, but it gives a current baseline for two hard-stop domains.

## Installed Skill Fit Matrix

| Skill                           | Freeze Decision      | ChefFlow Use                                                                                    |
| ------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------- |
| `diagnose`                      | apply                | Use for red tests and runtime regressions after a reproduction exists.                          |
| `grill-with-docs`               | adapt                | Use only after mapping to ChefFlow's canonical docs, not generic `CONTEXT.md`.                  |
| `improve-codebase-architecture` | apply                | Use for architecture debt after P1 safety findings are triaged.                                 |
| `setup-matt-pocock-skills`      | adapt                | Do not create duplicate process surfaces by default.                                            |
| `tdd`                           | apply                | Required for freeze-safe repairs after a failing test is classified as current.                 |
| `to-issues`                     | adapt                | Convert findings to local docs or GitHub only after ChefFlow issue tracker policy is confirmed. |
| `to-prd`                        | reject during freeze | PRDs imply new feature planning. Defer unless the freeze is explicitly lifted.                  |
| `triage`                        | apply                | Use for classifying auth, compliance, and stale-test findings.                                  |
| `zoom-out`                      | apply                | Use before touching large unfamiliar modules.                                                   |
| `git-guardrails-claude-code`    | reject as-is         | Conflicts with required feature-branch push workflow.                                           |
| `migrate-to-shoehorn`           | defer                | Relevant only if test fixtures need safer partial data.                                         |
| `scaffold-exercises`            | not relevant         | Course exercise scaffolding is outside ChefFlow product audit.                                  |
| `setup-pre-commit`              | reject as-is         | Existing hooks are project-specific. Patch them only if a gap is proven.                        |
| `edit-article`                  | not relevant         | Use only for article drafts.                                                                    |
| `obsidian-vault`                | defer                | Useful if the user wants this freeze reflected in Obsidian.                                     |
| `caveman`                       | defer                | Communication style only.                                                                       |
| `grill-me`                      | defer                | Useful before ambiguous plans, but the freeze command is clear enough for pass 1.               |
| `write-a-skill`                 | apply                | Used through `skill-creator` guidance to add the local `freeze-audit` skill.                    |

## Rinse Repeat Queue

1. Classify the 16 tenantId-from-input files as real violation, trusted helper, stale test, or contract drift.
2. Fix the stale `db/migrations` path in the auth test if no counter-evidence appears.
3. Replace broad compliance grep with scoped checks for public UI copy, production action exports, docs, scripts, and tests.
4. Run the correct Playwright command for `tests/system-integrity/q85-ts-nocheck-export-safety.spec.ts`.
5. Build an AST-level server action inventory for exported async functions, auth-first checks, tenant scoping, mutation return shape, and cache revalidation.
6. Review public and chef-facing `OpenClaw` references for actual rendered copy versus comments, imports, and internal route names.
7. After P1 safety findings are clean or ticketed, run an architecture pass with `improve-codebase-architecture` focused on one bounded domain at a time.

## Commands Run

```powershell
git status --short --branch
node devtools/context-continuity-scan.mjs --prompt "freeze the project and audit the ChefFlow codebase against the installed Matt Pocock skills on repeat" --write
Get-ChildItem -Directory -LiteralPath 'C:\Users\david\.codex\skills'
rg --files app components lib database docs system
bash scripts/compliance-scan.sh
node --test --import tsx tests/unit/auth.tenant-isolation.test.ts
node --test --import tsx tests/system-integrity/q85-ts-nocheck-export-safety.spec.ts
node --test --import tsx tests/unit/events.fsm.test.ts tests/unit/ledger.append.test.ts tests/unit/ledger.compute.test.ts
```

## Freeze Rule For Next Agents

Until David lifts this freeze, new ChefFlow work should start by loading `freeze-audit`, `evidence-integrity`, and the task-specific safety skill. Build only P1/P0 fixes, test repairs that unblock true safety evidence, or explicitly approved work.
