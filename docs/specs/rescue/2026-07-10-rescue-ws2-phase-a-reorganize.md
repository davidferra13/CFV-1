# Rescue Workstream 2: Phase A Reorganize (tiered navigation, Today homepage, module gallery, day-of sheet)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement blueprint Section 12 Phase A items 1-3 and 5-12: settle the workspace, amend the navigation contract, retool the wiring audit for tiers, extend the module vocabulary, tag and filter all navigation by tier, fix nav defects, ship the route-alias map and shell conversions, rebuild Today as a 5-panel homepage, rebuild the module gallery with backfill, and ship the read-only day-of sheet.

**Architecture:** A single JSON tier map (`lib/navigation/ia-tier-map.json`) is the source of truth for which of the 100 chef-portal sections sits at which tier; TypeScript nav code and the plain-Node wiring audit both read it, so no TSX parsing is needed anywhere. Navigation filtering is a pure function behind one rollback gate (`nav_tiered_ia`); the flag covers tier-based nav VISIBILITY only (Tasks 6, 8, and the gallery-driven visibility in 12-13). The label sweep (Task 5), the five-slot action bar (Task 7), shell conversions (Task 10), and the Today rebuild (Task 11) sit outside the flag's blast radius: their rollback is a git revert (or, for Today, the workspace-density 'power' switch), not the flag. Every URL keeps resolving: Tier 4 conversions are `redirect()` shells with sibling components left live in place, and a route-alias map keeps pathname-keyed intelligence (Rail, Remy starters, suggestions, help, pins) working through the shells.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind (design tokens), PostgreSQL via Drizzle/postgres.js (`createServerClient`), Auth.js v5, node:test + tsx for unit tests, Playwright for e2e against `http://localhost:3100`.

**Source of truth:** `docs/discovery/2026-07-10-chefflow-rescue-blueprint.md` (Sections 4, 5, 7, 8, 11, 12). Do not re-litigate its decisions.

---

## Global Constraints

### Hard rules (violating any = defect)

1. **NEVER delete work.** Contain, alias, redirect, flag. Every existing URL keeps resolving (redirects count). Removing a duplicate nav _link_ is allowed only when another link to the same route remains or the route becomes a working redirect.
2. **All DB changes additive.** No DROP/DELETE/TRUNCATE. `ledger_entries`, `event_transitions`, `quote_state_transitions` are immutable. This plan requires **zero migrations**; if a builder believes one is needed, stop and escalate. (Highest existing migration timestamp is `20260617000001`; any future migration must be strictly higher.)
3. **Multi-user.** Works for any chef, not just David. No David-specific copy anywhere. Algorithm-first: no new AI dependencies.
4. **HANDS OFF the other tool's uncommitted work:** `app/(chef)/studio/`, `app/api/studio/`, `components/studio/`, `lib/studio/`, `docs/specs/website-builder-studio.md`, `database/migrations/20260617000001_chef_sites_studio.sql`. Never stage, commit, edit, or move these.
5. **Dirty working tree warning.** ~69 files are modified and uncommitted, including `components/navigation/nav-config.tsx`, `lib/auth/route-policy.ts`, `app/(chef)/dashboard/_sections/hero-metrics.tsx`, `hero-metrics-client.tsx`, `hero-zone.tsx`, and several cron routes. **Every line anchor in this plan was read from the dirty working tree on 2026-07-10 and may shift after Task 0 settles the workspace.** Re-locate anchors with the quoted code, not the line number, if they do not match.
6. **No em dashes** in any file this plan produces. No AI-sounding copy.
7. **Never render fake data as real.** Empty states over zeros. No success toasts without confirmed writes.
8. **New lib code in `lib/{domain}/`, components in `components/{domain}/`.** Never loose root files.
9. **No OpenClaw string** in UI, errors, emails, localStorage keys, or metadata.

### Verification canon (real commands, verified against package.json 2026-07-10)

- Typecheck: `npx tsc --noEmit --skipLibCheck`
- Closeout gate: `npm run regression:firewall`
- Unit tests: `npm run test:unit` (all) or `node --test --import tsx tests/unit/<file>.test.ts` (one file). Unit tests may import `@/lib/...`.
- **`npm run test:affected` does NOT exist in package.json.** Do not cite it. Use `npm run test:unit` plus targeted Playwright.
- Playwright against the canonical dev server `http://localhost:3100`. Agent auth: `POST http://localhost:3100/api/e2e/auth` with credentials from `.auth/agent.json` (storage state file `.auth/agent.json` is the Playwright storageState).
- When a test is added, update its row in `docs/test-coverage-blueprint.md`.

### Phase A item source (copied from blueprint Section 12; items 4 and 13 belong to Workstream 1)

| #   | Item                                                                                                                                                                                                                                                                                                                                                                                  | Status                                                     | Write-set                                                                                                                                                                                      | Effort | Owner                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------- |
| 1   | Settle the workspace: commit or stash the dirty tree (roughly 60 modified files including nav-config.tsx and hero-zone.tsx) via /untangle; check UNIFIED-BUILD-QUEUE.md for in-flight dashboard work                                                                                                                                                                                  | Build now                                                  | working tree, docs/UNIFIED-BUILD-QUEUE.md                                                                                                                                                      | S      | WS2 Task 0              |
| 2   | File the contract amendment first (this blueprint as the Section 13 study): Inquiries to the floor, Pipeline label retired, Finance label, single gallery with the all-474-links invariant, Tables bottom-tab sign-off, module naming table                                                                                                                                           | Build now                                                  | docs/chef-navigation-decision-contract.md, docs/CLAUDE-DOMAINS.md                                                                                                                              | S      | WS2 Task 1              |
| 3   | Retool the measuring stick before retagging: wiring-audit reads tier tags, asserts reachability per tier; expected-orphan allowlist entry for /studio/preview                                                                                                                                                                                                                         | Build now                                                  | scripts/wiring-audit.mjs, scripts/regression-firewall.mjs, scripts/wiring-audit-results.json                                                                                                   | M      | WS2 Task 2              |
| 4   | Security P0: wire requirePro to requireGate, give gate-check real consumers, resolve the tier lookup; add the 4 missing CHEF_PROTECTED_PATHS; fix the /onboarding, /chef, /availability prefix conflicts                                                                                                                                                                              | Build now                                                  | lib/billing/require-pro.ts, lib/feature-gates/gate-check.ts, lib/auth/route-policy.ts, middleware.ts                                                                                           | M      | **WS1 (not this plan)** |
| 5   | Module vocabulary mapping table (blueprint name, billing slug, gate keys, plan tier), extending lib/billing/modules.ts additively                                                                                                                                                                                                                                                     | Build now                                                  | docs (amendment appendix), lib/billing/modules.ts                                                                                                                                              | S      | WS2 Task 3              |
| 6   | Wire the tier renderer: chef-nav and chef-mobile-nav read tier and module state; action bar capped and its five slots named; the hardcoded /tables mobile tab behind the Labs flag; nav_tiered_ia rollback flag; one label per route; desktop/mobile parity acceptance check                                                                                                          | Build now                                                  | components/navigation/nav-config.tsx, chef-nav.tsx, chef-mobile-nav.tsx, action-bar.tsx, lib/interface/surface-governance.ts, lib/feature-gates/gate-registry.ts                               | M      | WS2 Tasks 6-8           |
| 7   | Tag all ~600 nav entries with tier and module                                                                                                                                                                                                                                                                                                                                         | Build now                                                  | nav-config.tsx                                                                                                                                                                                 | M      | WS2 Task 4              |
| 8   | Nav defect sweep: duplicate Insights labels, double listings, 27 dup labels, 14 dup hrefs, single gallery destination                                                                                                                                                                                                                                                                 | Build now                                                  | nav-config.tsx, chef-nav.tsx:1068                                                                                                                                                              | S      | WS2 Task 5              |
| 9   | Route-alias map plus shell conversions (temporary redirects; live-page components preserved as live files; Rail pageAffinity, remy-starters, smart-suggestions, help sections, pins and recents resolve through the map)                                                                                                                                                              | Queued behind per-cluster owner approval (open question 5) | new alias module under lib/navigation, six route files, lib/discovery/registries/chef-rail-registry.ts, lib/ai/remy-starters.ts, lib/onboarding/smart-suggestions.ts, pinned/recent components | M      | WS2 Tasks 9-10          |
| 10  | Today 5-panel contract with the empty-state rules, mobile order, old layout as labeled temporary fallback with review date                                                                                                                                                                                                                                                            | Build now (after item 1 clears the dashboard files)        | app/(chef)/dashboard/page.tsx and \_sections                                                                                                                                                   | M      | WS2 Task 11             |
| 11  | Module gallery at /settings/modules: cards per the assignment table, chef-facing naming pass including gate-registry name fields, existing-account backfill (Tier 2 modules with tenant data seed ON via TenantDataPresence checks), first-login banner ("your tools moved into named modules, nothing was removed"), Labs hidden by default, Series smoke pass before its card ships | Build now                                                  | settings/modules pages, modules-client.tsx, lib/billing/module-actions.ts, lib/feature-gates/gate-registry.ts, features/page.tsx (shell)                                                       | M      | WS2 Tasks 12-13         |
| 12  | Minimal read-only day-of sheet under /events/[id]: menu, allergies, timeline, contacts, address, phone-first                                                                                                                                                                                                                                                                          | Build now                                                  | events/[id] section components, nav-config                                                                                                                                                     | M      | WS2 Task 14             |
| 13  | E2E-auth production assertion and demo-endpoint origin/loopback hardening                                                                                                                                                                                                                                                                                                             | Build now                                                  | app/api/e2e/auth/route.ts, app/api/demo/\*, next.config.js                                                                                                                                     | S      | **WS1 (not this plan)** |

### Execution order and dependencies

```
Task 0 (settle workspace, GATE)  -> prerequisite for every task touching dirty files
Task 1 (contract amendment)      -> prerequisite for Tasks 5, 7 (label changes need the amendment on file)
Task 2 (wiring-audit retool)     -> prerequisite for Tasks 4-14 (else regression:firewall goes red mid-restructure)
Task 3 (module vocabulary)       -> prerequisite for Tasks 4, 6, 12, 13
Task 4 (tier map + tagging)      -> prerequisite for Tasks 6, 12
Task 5 (nav defect sweep)        -> independent after 0, 1, 2
Task 6 (tier filter + flag)      -> prerequisite for Tasks 7, 8, 12
Task 7 (action bar 5 slots)      -> GATE (owner Q3)
Task 8 (/tables behind Labs)     -> GATE (owner Q4)
Task 9 (route-alias map)         -> prerequisite for Task 10
Task 10 (shell conversions)      -> GATE (owner Q5, per cluster)
Task 11 (Today 5-panel)          -> after 0; independent of nav tasks
Task 12 (module gallery)         -> after 3, 4, 6
Task 13 (backfill + banner)      -> after 12; GATE (owner Q6, recommended default stated)
Task 14 (day-of sheet)           -> after 0; independent
```

**Cross-workstream:** Workstream 1 owns Phase A items 4 and 13 (security P0: `requirePro` -> `requireGate`, gate-check consumers, route-policy fixes, e2e/demo hardening). Tasks 6, 12, and 13 in this plan call `checkGate` from `lib/feature-gates/gate-check.ts`, which already works for free-tier gates with per-chef `chef_feature_flags` overrides, so they do not hard-block on WS1. But the tier model is decoration until WS1 item 4 lands: schedule WS1 item 4 before or alongside Task 6.

---

## Task 0: Settle the workspace [OPUS-ONLY]

**GATE (owner): approve the commit grouping of the ~69 dirty files.** Recommended default: run `/untangle` with the owner present; group non-Studio changes into topical commits; Studio files stay uncommitted (or get committed by the other tool). Decide the Studio disposition by reading `.planning/HANDOFF.json` at execution time. The builder skips this task unless the gate is marked approved, and skips every task marked "prereq: Task 0" until this completes.

**Dispatcher note:** this gate transitively blocks roughly 15 tasks across all four rescue plans (every task that touches a dirty file). It is the program's FIRST owner interaction, not one gate among many: if the owner batch-approves gates, approve this one first, or builders exhaust Tasks 1-3 here and stall.

**Files:**

- Modify: working tree state only (git commits). No code edits.
- Read: `.planning/HANDOFF.json`, `docs/UNIFIED-BUILD-QUEUE.md`

**Interfaces:**

- Consumes: `git status --short`, the `/untangle` skill.
- Produces: a clean tree except the Studio paths listed in Global Constraints rule 4.

**Steps:**

- [ ] Read `.planning/HANDOFF.json` (`uncommitted_files` array) and confirm whether any entry outside the Studio paths is claimed by an in-flight task. As of 2026-07-10 it is an auto-checkpoint with empty `remaining_tasks`; if that changed, stop and report.
- [ ] Search `docs/UNIFIED-BUILD-QUEUE.md` for `IN-FLIGHT` items touching `dashboard`, `hero-zone`, or `nav-config`: `grep -n "IN-FLIGHT" docs/UNIFIED-BUILD-QUEUE.md`. If any claim the dashboard `_sections` files, list them for the owner before committing.
- [ ] Run `git status --short` and partition files: (a) Studio paths (untouched, per Global Constraints rule 4), (b) everything else.
- [ ] Invoke the `/untangle` skill to group partition (b) into topical conventional commits (owner present, approves each group).
- [ ] Verify: `git status --short` output contains only Studio paths (lines beginning `??` or `M` under `app/(chef)/studio/`, `app/api/studio/`, `components/studio/`, `lib/studio/`, `docs/specs/website-builder-studio.md`, `database/migrations/20260617000001_chef_sites_studio.sql`).
- [ ] Verify nothing broke: `npx tsc --noEmit --skipLibCheck` exits 0.
- [ ] No separate commit step: the commits ARE the task output. Push: `git push origin main`.

---

## Task 1: Contract amendment document [CODEX-SAFE]

**Files:**

- Modify: `docs/chef-navigation-decision-contract.md` (append a new section at end of file)
- Modify: `docs/CLAUDE-DOMAINS.md` (append one paragraph at end of file)

**Interfaces:**

- Consumes: blueprint Sections 4, 5, 8, 11.
- Produces: the written amendment that Tasks 5 and 7 cite when changing locked labels.

**Steps (TDD-EXEMPT, doc-only):**

- [ ] Append to `docs/chef-navigation-decision-contract.md`:

```markdown
---

## Amendment 1 (2026-07-10): Tiered IA per the Rescue Blueprint

Filed per Section 13 of this contract. The study is
`docs/discovery/2026-07-10-chefflow-rescue-blueprint.md`. This amendment
records, in writing, the changes that blueprint makes to locked decisions:

1. **Inquiries joins the floor.** The Tier 0 door set is: Today (dashboard),
   Inbox, Inquiries, Quotes, Events, Calendar, Clients, Menus, Recipes,
   Culinary, Finance, Receipts. This supersedes "Pipeline is secondary"
   at the earlier decision in this contract.
2. **The word "Pipeline" is retired from the UI entirely.** The route
   `/inquiries` is labeled "Inquiries" on every surface. `/pipeline`
   becomes a redirect shell to `/inquiries`.
3. **The money door is labeled "Finance"** (as this contract already fixed).
   The current nav label "Money" is a drift defect and is corrected.
   Owner may veto at amendment review (blueprint open question 7).
4. **`/settings/modules` is the single module gallery.** `/features` and
   `/onboarding/features` become redirect shells into it in the same commit.
   Acceptance check preserving Principle 8 (the directory is sacred): the
   regrouped directory inside the gallery contains every one of the 474
   existing links.
5. **Tables bottom tab (mobile):** moves behind the Labs flag pending owner
   sign-off (blueprint open question 4). The convergence thesis stays on
   record.
6. **The Six Pillars remain the completeness ledger; this contract's domains
   remain the IA.** They are not interchangeable.
7. **Module naming table:** the chef-facing module names and their slugs are
   recorded in Appendix A below (filled by the module vocabulary task).
8. **Tier vocabulary is internal.** The chef sees door names and module names
   only; "Tier", "Standard", "Labs", "Shell" never render in the UI.

### Appendix A: module vocabulary (filled by the module vocabulary task)

| Chef-facing name                                  | Billing slug | Sections it covers | Gate keys | Plan tier |
| ------------------------------------------------- | ------------ | ------------------ | --------- | --------- |
| (filled by lib/billing/modules.ts extension task) |              |                    |           |           |
```

- [ ] Append to `docs/CLAUDE-DOMAINS.md`:

```markdown
## Navigation contract amendment (2026-07-10)

Amendment 1 in docs/chef-navigation-decision-contract.md is in force: 12-door
Tier 0 floor, "Pipeline" retired as a UI word, Finance label, single module
gallery at /settings/modules, tier tags live in lib/navigation/ia-tier-map.json.
Tier 4 shell conversions are recorded in this file as they land (see the
"Shell conversions" section appended by the shell-conversion task).
```

- [ ] Verify: `grep -c "Amendment 1" docs/chef-navigation-decision-contract.md` prints `1` or more, and the appended lines contain no em dash: `node -e "const d=require('child_process').execSync('git diff docs/').toString(); process.exit(d.includes(String.fromCharCode(8212))?1:0)"` exits 0.
- [ ] Commit: `git add docs/chef-navigation-decision-contract.md docs/CLAUDE-DOMAINS.md && git commit -m "docs: file navigation contract amendment 1 for tiered IA"`

---

## Task 2: Wiring-audit retool, tier-aware reachability [OPUS-ONLY]

Prereq: Task 0 (only if `scripts/` files appear dirty; as of 2026-07-10 they do not). This task lands BEFORE any nav retagging so the closeout gate never goes red mid-restructure.

**Files:**

- Create: `lib/navigation/ia-tier-map.json` (seeded with an empty object here; fully populated in Task 4)
- Create: `scripts/wiring-tier-rules.mjs`
- Create: `scripts/wiring-expected-orphans.json`
- Create: `tests/unit/wiring-tier-rules.test.ts`
- Modify: `scripts/wiring-audit.mjs` (status classification block, currently at :406-415, and the summary/output block at :448-470)

**Interfaces:**

- Consumes: `lib/navigation/ia-tier-map.json` shape `Record<string, { tier: 0|1|2|3|4, module?: string }>` keyed by top-level chef section slug (e.g. `"guests": { "tier": 2, "module": "ticketed-dinners" }`).
- Produces: `classifyRouteStatus(input) => 'WIRED' | 'WEAK' | 'ORPHAN' | 'ALLOWED'` exported from `scripts/wiring-tier-rules.mjs` with signature:

```js
export function tierForRoute(route, tierMap) // -> { tier, module } | null
export function classifyRouteStatus({ route, refCount, navRefs, tierEntry, allowlist, moduleSlugs, isMiddlewareWired })
```

**Reachability rules per tier (blueprint Section 4 item 8):**

- Tier 0/1 (and untagged routes): current behavior. 0 refs = ORPHAN; 1 non-nav ref = WEAK.
- Tier 2: WIRED if its `module` slug exists in `lib/billing/modules.ts` (a gallery path exists), regardless of nav refs; else fall through to current rules.
- Tier 3 / Tier 4: WIRED if refCount >= 1 OR the route file is a redirect (Tier 4 shells self-reference their target); 0 refs = ORPHAN unless allowlisted.
- Allowlisted routes classify as `ALLOWED` and never fail the firewall.

**Steps:**

- [ ] Create `lib/navigation/ia-tier-map.json` with content `{}` (placeholder; Task 4 populates it; the rules must handle the empty map by treating every route as untagged).
- [ ] Create `scripts/wiring-expected-orphans.json`:

```json
{
  "expected_orphans": ["/studio/preview"],
  "note": "Routes here are known unreachable on purpose (in-flight work with a written destination). Each entry needs a blueprint or queue reference. /studio/preview: uncommitted Studio work, pre-assigned Tier 3 Labs per rescue blueprint Section 5."
}
```

- [ ] Write the failing test `tests/unit/wiring-tier-rules.test.ts`:

```ts
/**
 * Unit tests for tier-aware wiring-audit classification.
 * Run: node --test --import tsx tests/unit/wiring-tier-rules.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
// @ts-expect-error plain .mjs module without type declarations
import { tierForRoute, classifyRouteStatus } from '../../scripts/wiring-tier-rules.mjs'

const tierMap = {
  guests: { tier: 2, module: 'ticketed-dinners' },
  cannabis: { tier: 3 },
  pipeline: { tier: 4 },
  dashboard: { tier: 0 },
}
const moduleSlugs = new Set(['ticketed-dinners'])
const allowlist = new Set(['/studio/preview'])

describe('tierForRoute', () => {
  it('maps a route to its top-level section tier', () => {
    assert.deepEqual(tierForRoute('/guests/tickets/scan', tierMap), {
      tier: 2,
      module: 'ticketed-dinners',
    })
  })
  it('returns null for untagged sections', () => {
    assert.equal(tierForRoute('/not-a-section', tierMap), null)
  })
})

describe('classifyRouteStatus', () => {
  const base = { refCount: 0, navRefs: 0, allowlist, moduleSlugs, isMiddlewareWired: false }
  it('keeps current behavior for tier 0: zero refs is ORPHAN', () => {
    assert.equal(
      classifyRouteStatus({ ...base, route: '/dashboard/x', tierEntry: { tier: 0 } }),
      'ORPHAN'
    )
  })
  it('keeps current behavior for untagged routes: one non-nav ref is WEAK', () => {
    assert.equal(
      classifyRouteStatus({ ...base, route: '/whatever', tierEntry: null, refCount: 1 }),
      'WEAK'
    )
  })
  it('tier 2 with a registered module slug is WIRED even with zero nav refs', () => {
    assert.equal(
      classifyRouteStatus({
        ...base,
        route: '/guests/waitlist',
        tierEntry: { tier: 2, module: 'ticketed-dinners' },
      }),
      'WIRED'
    )
  })
  it('tier 2 with an unregistered module falls back to ORPHAN at zero refs', () => {
    assert.equal(
      classifyRouteStatus({
        ...base,
        route: '/guests/waitlist',
        tierEntry: { tier: 2, module: 'missing-module' },
      }),
      'ORPHAN'
    )
  })
  it('tier 3 with one ref of any kind is WIRED', () => {
    assert.equal(
      classifyRouteStatus({ ...base, route: '/cannabis', tierEntry: { tier: 3 }, refCount: 1 }),
      'WIRED'
    )
  })
  it('allowlisted route is ALLOWED regardless of refs', () => {
    assert.equal(
      classifyRouteStatus({ ...base, route: '/studio/preview', tierEntry: null }),
      'ALLOWED'
    )
  })
})
```

- [ ] Run and see it fail: `node --test --import tsx tests/unit/wiring-tier-rules.test.ts`. Expected failure: `Cannot find module '.../scripts/wiring-tier-rules.mjs'`.
- [ ] Create `scripts/wiring-tier-rules.mjs`:

```js
// Tier-aware route classification for the wiring audit.
// Source of tier truth: lib/navigation/ia-tier-map.json (keyed by top-level
// chef section slug). Reachability contract per the rescue blueprint S4.8:
//   tier 0/1 and untagged: need nav refs (legacy WEAK/ORPHAN rules)
//   tier 2: a registered module slug in lib/billing/modules.ts counts as a
//           gallery path, so the route is WIRED
//   tier 3/4: any single reference suffices
//   allowlisted routes are ALLOWED and never fail the firewall

export function tierForRoute(route, tierMap) {
  const segment = String(route).split('/').filter(Boolean)[0]
  if (!segment) return null
  const entry = tierMap[segment]
  return entry ? { tier: entry.tier, module: entry.module } : null
}

export function classifyRouteStatus({
  route,
  refCount,
  navRefs,
  tierEntry,
  allowlist,
  moduleSlugs,
  isMiddlewareWired,
}) {
  if (allowlist && allowlist.has(route)) return 'ALLOWED'

  const tier = tierEntry ? tierEntry.tier : null

  if (tier === 2 && tierEntry.module && moduleSlugs && moduleSlugs.has(tierEntry.module)) {
    return 'WIRED'
  }
  if ((tier === 3 || tier === 4) && refCount >= 1) {
    return 'WIRED'
  }

  // Legacy rules (mirrors the pre-retool logic in wiring-audit.mjs)
  if (refCount === 0) return 'ORPHAN'
  if (refCount === 1 && navRefs === 0) {
    return isMiddlewareWired ? 'WIRED' : 'WEAK'
  }
  return 'WIRED'
}
```

- [ ] Run and see it pass: `node --test --import tsx tests/unit/wiring-tier-rules.test.ts` exits 0, all assertions green.
- [ ] Modify `scripts/wiring-audit.mjs`. At the top (after the existing imports around :6-10), add:

```js
import { tierForRoute, classifyRouteStatus } from './wiring-tier-rules.mjs'

const IA_TIER_MAP = JSON.parse(
  readFileSync(join(PROJECT_ROOT, 'lib', 'navigation', 'ia-tier-map.json'), 'utf8')
)
const EXPECTED_ORPHANS = new Set(
  JSON.parse(readFileSync(join(PROJECT_ROOT, 'scripts', 'wiring-expected-orphans.json'), 'utf8'))
    .expected_orphans
)
const MODULE_SLUGS = new Set(
  [
    ...readFileSync(join(PROJECT_ROOT, 'lib', 'billing', 'modules.ts'), 'utf8').matchAll(
      /slug:\s*'([^']+)'/g
    ),
  ].map((m) => m[1])
)
```

- [ ] Replace the classification block in `scripts/wiring-audit.mjs` (currently :406-415, the `let status = 'WIRED' ... status = isMiddlewareWired ? 'WIRED' : 'WEAK'` block) with:

```js
const tierEntry = tierForRoute(r.route, IA_TIER_MAP)
const isMiddlewareWired = MIDDLEWARE_WIRED_PREFIXES.some(
  (p) => r.route === p || r.route.startsWith(p + '/')
)
const status = classifyRouteStatus({
  route: r.route,
  refCount: refFiles.length,
  navRefs,
  tierEntry,
  allowlist: EXPECTED_ORPHANS,
  moduleSlugs: MODULE_SLUGS,
  isMiddlewareWired,
})
if (status === 'ORPHAN') orphanCount++
```

Keep the surrounding `results.push({...})` intact but add `tier: tierEntry ? tierEntry.tier : null` to the pushed object. Delete the now-unused inner `isMiddlewareWired` computation if it duplicates.

- [ ] In the output block (currently :448-457), add `allowed: results.filter((r) => r.status === 'ALLOWED').length` to `summary` so the results file records allowlisted routes. Do NOT count ALLOWED in `orphans`.
- [ ] Regenerate the results file: `node scripts/wiring-audit.mjs`. Confirm the console summary shows `/studio/preview` no longer in the Orphans list and `orphans: 0` stays true (or matches the pre-change count minus allowlisted).
- [ ] Verify the firewall still passes: `npm run regression:firewall` (the firewall reads `summary.orphans` and `summary.weak` from the results file at `scripts/regression-firewall.mjs:245-260`; ALLOWED routes are excluded by construction, so no firewall change is needed; if weak/orphan counts changed for unrelated reasons, stop and report rather than adjusting the gate).
- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck` exits 0.
- [ ] Update `docs/test-coverage-blueprint.md`: add a row for `scripts/wiring-tier-rules.mjs` with status COVERED (unit).
- [ ] Commit: `git add scripts/wiring-tier-rules.mjs scripts/wiring-expected-orphans.json scripts/wiring-audit.mjs scripts/wiring-audit-results.json lib/navigation/ia-tier-map.json tests/unit/wiring-tier-rules.test.ts docs/test-coverage-blueprint.md && git commit -m "feat: tier-aware wiring audit with expected-orphan allowlist"`

---

## Task 3: Module vocabulary, extend lib/billing/modules.ts additively [CODEX-SAFE]

Prereq: Task 1 (Appendix A exists to fill).

**Single-registrar rule:** this task is the ONLY place that inserts the rescue module slugs into `lib/billing/modules.ts`. WS4 (`docs/specs/rescue/2026-07-10-rescue-ws4-phase-c-modules.md` Task 1) verifies these slugs exist but adds nothing; if a builder finds `market-prices` or `dinner-circles` already registered when starting this task, another agent ran out of order: stop and reconcile rather than appending duplicates (the no-duplicate-slug test below would catch it). All rescue slugs, including `dinner-circles`, land `defaultEnabled: false`; existing accounts with circle data are protected by the Task 13 presence backfill (`hasCircles` seeds `dinner-circles` ON), and WS4's circle-digest cron guard is sequenced after that backfill.

**Files:**

- Modify: `lib/billing/modules.ts` (append to the `MODULES` array, currently ending at :135; do not touch the 13 existing entries)
- Modify: `docs/chef-navigation-decision-contract.md` (fill Appendix A)
- Create: `tests/unit/module-vocabulary.test.ts`

**Interfaces:**

- Consumes: existing `ModuleDefinition` type (`lib/billing/modules.ts:8-16`).
- Produces: 19 new `ModuleDefinition` entries, all `defaultEnabled: false`, plus the filled Appendix A. `DEFAULT_ENABLED_MODULES` and `ALL_MODULE_SLUGS` (:137-139) pick them up automatically.

**The module vocabulary (from blueprint Sections 5 and 11; these names are final, old names retired):**

| Chef-facing name       | New slug                    | Sections covered                                           | Gate keys                 | Plan tier |
| ---------------------- | --------------------------- | ---------------------------------------------------------- | ------------------------- | --------- |
| Event Debriefs         | `event-debriefs`            | aar                                                        | none                      | free      |
| Reports                | `reports`                   | analytics, guest-analytics, intelligence, journey, surveys | profitability_cockpit     | free      |
| Remy                   | `remy`                      | remy, autopilot                                            | remy_chat, remy_autopilot | pro       |
| Open Dates             | `open-dates`                | availability                                               | none                      | free      |
| Restaurant Kitchen     | `restaurant-kitchen`        | business, ops, stations                                    | none                      | free      |
| Dinner Circles         | `dinner-circles`            | circles                                                    | none                      | free      |
| Storefront and POS     | (existing `commerce`)       | commerce                                                   | none                      | free      |
| Consulting             | `consulting`                | consulting                                                 | none                      | free      |
| Marketing              | `marketing`                 | content, loyalty, marketing, portfolio                     | none                      | free      |
| Idea Board             | `idea-board`                | culinary-board                                             | none                      | free      |
| Ticketed Dinners       | `ticketed-dinners`          | guests, waitlist                                           | none                      | free      |
| Sourcing and Inventory | `sourcing-inventory`        | inventory, shopping, vendors                               | none                      | free      |
| Multi-Location         | (existing `multi-location`) | locations                                                  | multi_location            | paid      |
| Meal Prep              | `meal-prep`                 | meal-prep                                                  | none                      | free      |
| Referral Network       | `referral-network`          | partners                                                   | none                      | free      |
| Market Prices          | `market-prices`             | prices                                                     | none                      | free      |
| Reputation             | `reputation`                | reputation, reviews                                        | none                      | free      |
| Backup Chef            | `backup-chef`               | safety                                                     | none                      | free      |
| Dinner Series          | `dinner-series`             | series                                                     | none                      | free      |
| Team and Staff         | `team-staff`                | staff, tasks                                               | team_management           | free      |
| Payroll and Tax        | `payroll-tax`               | finance hub subsections (nav-config.tsx:842-905)           | none                      | free      |

**Steps:**

- [ ] Write the failing test `tests/unit/module-vocabulary.test.ts`:

```ts
/**
 * Module vocabulary contract: rescue-blueprint Tier 2 modules exist as
 * additive ModuleDefinition entries; legacy slugs are untouched.
 * Run: node --test --import tsx tests/unit/module-vocabulary.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MODULES, DEFAULT_ENABLED_MODULES, getModule } from '@/lib/billing/modules'

const LEGACY_SLUGS = [
  'dashboard',
  'pipeline',
  'events',
  'culinary',
  'clients',
  'finance',
  'protection',
  'more',
  'commerce',
  'social-hub',
  'multi-location',
  'station-ops',
  'operations',
]

const RESCUE_SLUGS = [
  'event-debriefs',
  'reports',
  'remy',
  'open-dates',
  'restaurant-kitchen',
  'dinner-circles',
  'consulting',
  'marketing',
  'idea-board',
  'ticketed-dinners',
  'sourcing-inventory',
  'meal-prep',
  'referral-network',
  'market-prices',
  'reputation',
  'backup-chef',
  'dinner-series',
  'team-staff',
  'payroll-tax',
]

describe('module vocabulary', () => {
  it('keeps every legacy slug', () => {
    for (const slug of LEGACY_SLUGS) {
      assert.ok(getModule(slug), `legacy slug missing: ${slug}`)
    }
  })
  it('defines every rescue module slug', () => {
    for (const slug of RESCUE_SLUGS) {
      assert.ok(getModule(slug), `rescue slug missing: ${slug}`)
    }
  })
  it('new rescue modules are off by default', () => {
    for (const slug of RESCUE_SLUGS) {
      assert.equal(getModule(slug)!.defaultEnabled, false, `${slug} must default off`)
    }
  })
  it('defaults did not change for existing accounts', () => {
    for (const slug of RESCUE_SLUGS) {
      assert.ok(!DEFAULT_ENABLED_MODULES.includes(slug))
    }
  })
  it('has no duplicate slugs', () => {
    const slugs = MODULES.map((m) => m.slug)
    assert.equal(slugs.length, new Set(slugs).size)
  })
})
```

- [ ] Run and see it fail: `node --test --import tsx tests/unit/module-vocabulary.test.ts`. Expected failure: `rescue slug missing: event-debriefs` (and peers).
- [ ] Append to the `MODULES` array in `lib/billing/modules.ts`, directly before the closing `]` at :135 (every entry `tier: 'free'` except where noted, `defaultEnabled: false`, `alwaysVisible: false`, no `navGroupId` yet; descriptions are one plain sentence, no adjectives, no numbers):

```ts
  // --- Rescue blueprint Tier 2 modules (2026-07-10). Additive; legacy entries above untouched. ---
  { slug: 'event-debriefs', label: 'Event Debriefs', description: 'Post-event write-ups and lessons for your own record', tier: 'free', defaultEnabled: false, alwaysVisible: false },
  { slug: 'reports', label: 'Reports', description: 'Business reports, trends, and survey results', tier: 'free', defaultEnabled: false, alwaysVisible: false },
  { slug: 'remy', label: 'Remy', description: 'AI concierge for drafting replies and watching your pipeline', tier: 'paid', defaultEnabled: false, alwaysVisible: false },
  { slug: 'open-dates', label: 'Open Dates', description: 'Publish dates you want booked and take reservations against them', tier: 'free', defaultEnabled: false, alwaysVisible: false },
  { slug: 'restaurant-kitchen', label: 'Restaurant Kitchen', description: 'Stations, line ops, and kitchen management for restaurant settings', tier: 'free', defaultEnabled: false, alwaysVisible: false },
  { slug: 'dinner-circles', label: 'Dinner Circles', description: 'Shared spaces with clients and collaborators around your dinners', tier: 'free', defaultEnabled: false, alwaysVisible: false },
  { slug: 'consulting', label: 'Consulting', description: 'Track consulting engagements separately from dinners', tier: 'free', defaultEnabled: false, alwaysVisible: false },
  { slug: 'marketing', label: 'Marketing', description: 'Content, portfolio, loyalty, and promotion tools', tier: 'free', defaultEnabled: false, alwaysVisible: false },
  { slug: 'idea-board', label: 'Idea Board', description: 'A board for dish ideas and menu concepts', tier: 'free', defaultEnabled: false, alwaysVisible: false },
  { slug: 'ticketed-dinners', label: 'Ticketed Dinners', description: 'Sell seats to public dinners with guest lists and waitlists', tier: 'free', defaultEnabled: false, alwaysVisible: false },
  { slug: 'sourcing-inventory', label: 'Sourcing and Inventory', description: 'Vendors, stock on hand, and bulk buying', tier: 'free', defaultEnabled: false, alwaysVisible: false },
  { slug: 'meal-prep', label: 'Meal Prep', description: 'Weekly meal prep clients and delivery runs', tier: 'free', defaultEnabled: false, alwaysVisible: false },
  { slug: 'referral-network', label: 'Referral Network', description: 'Track partners who send you work and work you send back', tier: 'free', defaultEnabled: false, alwaysVisible: false },
  { slug: 'market-prices', label: 'Market Prices', description: 'Regional ingredient price data; your receipts stay the primary source', tier: 'free', defaultEnabled: false, alwaysVisible: false },
  { slug: 'reputation', label: 'Reputation', description: 'Reviews, testimonials, and the review ask after each dinner', tier: 'free', defaultEnabled: false, alwaysVisible: false },
  { slug: 'backup-chef', label: 'Backup Chef', description: 'Coverage plans so a dinner survives an injury or emergency', tier: 'free', defaultEnabled: false, alwaysVisible: false },
  { slug: 'dinner-series', label: 'Dinner Series', description: 'Recurring dinner programs that share a theme and guest circle', tier: 'free', defaultEnabled: false, alwaysVisible: false },
  { slug: 'team-staff', label: 'Team and Staff', description: 'Standing staff rosters, assignments, and a shared task board', tier: 'free', defaultEnabled: false, alwaysVisible: false },
  { slug: 'payroll-tax', label: 'Payroll and Tax', description: 'Payroll runs, 941s, W-2s, and the tax center inside Finance', tier: 'free', defaultEnabled: false, alwaysVisible: false },
```

- [ ] Run and see it pass: `node --test --import tsx tests/unit/module-vocabulary.test.ts` exits 0.
- [ ] Fill Appendix A in `docs/chef-navigation-decision-contract.md` with the vocabulary table from this task (copy the table above verbatim, replacing the placeholder row).
- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck` exits 0. Also confirm the modules settings page still renders the legacy grid unchanged (new modules appear as extra cards; that is acceptable until Task 12 regroups them): `node scripts/wiring-audit.mjs` still passes.
- [ ] Update `docs/test-coverage-blueprint.md`: add `lib/billing/modules.ts` vocabulary row, status COVERED (unit).
- [ ] Commit: `git add lib/billing/modules.ts docs/chef-navigation-decision-contract.md tests/unit/module-vocabulary.test.ts docs/test-coverage-blueprint.md && git commit -m "feat: add rescue-blueprint module vocabulary to billing modules registry"`

---

## Task 4: Populate the tier map and tag nav entries [CODEX-SAFE]

Prereq: Tasks 0, 2, 3. Line anchors in `nav-config.tsx` were read from the dirty tree; re-locate by quoted code after Task 0.

**Files:**

- Modify: `lib/navigation/ia-tier-map.json` (replace the `{}` placeholder with the full 100-section map below)
- Create: `lib/navigation/ia-tier.ts`
- Modify: `components/navigation/nav-config.tsx` (type extension only: add `iaTier` and `module` optional fields)
- Create: `tests/unit/ia-tier-map.test.ts`

**Interfaces:**

- Consumes: `lib/billing/modules.ts` slugs (Task 3).
- Produces:

```ts
// lib/navigation/ia-tier.ts
export type IaTierEntry = { tier: 0 | 1 | 2 | 3 | 4; module?: string }
export function getIaTier(href: string): IaTierEntry | null
```

**The assignment table (copied from blueprint Section 5; section -> tier -> module; do not reinterpret):**

Tier 0 (12): dashboard, inbox, inquiries, quotes, events, calendar, clients, menus, recipes, culinary, finance, receipts.

Tier 1 (26): settings, activity, briefing, calls, capture, chat, communication, contracts, daily, documents, help, import, kitchen, marketplace, notifications, onboarding, prep, proposals, pulse, queue, quick-log, rate-card, reference, reminders, waiting, wix-submissions.

Tier 2 (35, with module): aar -> event-debriefs; analytics -> reports; autopilot -> remy; availability -> open-dates; business -> restaurant-kitchen; circles -> dinner-circles; commerce -> commerce; consulting -> consulting; content -> marketing; culinary-board -> idea-board; guest-analytics -> reports; guests -> ticketed-dinners; intelligence -> reports; inventory -> sourcing-inventory; journey -> reports; locations -> multi-location; loyalty -> marketing; marketing -> marketing; meal-prep -> meal-prep; ops -> restaurant-kitchen; partners -> referral-network; portfolio -> marketing; prices -> market-prices; remy -> remy; reputation -> reputation; reviews -> reputation; safety -> backup-chef; series -> dinner-series; shopping -> sourcing-inventory; staff -> team-staff; stations -> restaurant-kitchen; surveys -> reports; tasks -> team-staff; vendors -> sourcing-inventory; waitlist -> ticketed-dinners.

Tier 3 (10): cannabis, chef, community, dev, explore, network, pie-cart, prospecting, studio, tables.

Tier 4 (17): team, shopping-list, leads, pipeline, payments, expenses, food-cost, insights, production, nutrition, imports, social, charity, guest-leads, welcome, travel, features.

**Two standing exceptions (blueprint Section 5, do not lose):** `/events/[id]/staff` and per-event vendor contacts stay Tier 0 because they live under the `events` section, which is already Tier 0; the section-level map handles this automatically. Never add `staff` or `vendors` overrides that would hide event-workspace tabs.

**Steps:**

- [ ] Write the failing test `tests/unit/ia-tier-map.test.ts`:

```ts
/**
 * IA tier map contract: 100 sections, tier subtotals 12/26/35/10/17,
 * every tier-2 module slug exists in the billing modules registry.
 * Run: node --test --import tsx tests/unit/ia-tier-map.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import tierMap from '@/lib/navigation/ia-tier-map.json'
import { getIaTier } from '@/lib/navigation/ia-tier'
import { getModule } from '@/lib/billing/modules'

const entries = Object.entries(tierMap as Record<string, { tier: number; module?: string }>)

describe('ia-tier-map', () => {
  it('covers exactly 100 sections', () => {
    assert.equal(entries.length, 100)
  })
  it('matches the blueprint subtotals 12/26/35/10/17', () => {
    const counts = [0, 0, 0, 0, 0]
    for (const [, v] of entries) counts[v.tier]++
    assert.deepEqual(counts, [12, 26, 35, 10, 17])
  })
  it('every tier-2 section names a module that exists in the registry', () => {
    for (const [section, v] of entries) {
      if (v.tier !== 2) continue
      assert.ok(v.module, `${section} missing module`)
      assert.ok(getModule(v.module!), `${section} names unknown module ${v.module}`)
    }
  })
  it('the twelve floor doors are tier 0', () => {
    for (const door of [
      'dashboard',
      'inbox',
      'inquiries',
      'quotes',
      'events',
      'calendar',
      'clients',
      'menus',
      'recipes',
      'culinary',
      'finance',
      'receipts',
    ]) {
      assert.equal((tierMap as any)[door]?.tier, 0, `${door} must be tier 0`)
    }
  })
  it('getIaTier resolves nested hrefs through the section', () => {
    assert.deepEqual(getIaTier('/guests/waitlist/manage'), { tier: 2, module: 'ticketed-dinners' })
    assert.equal(getIaTier('/dashboard')?.tier, 0)
    assert.equal(getIaTier('/no-such-section'), null)
  })
})
```

- [ ] Run and see it fail: `node --test --import tsx tests/unit/ia-tier-map.test.ts`. Expected failure: `covers exactly 100 sections` (map is `{}`) and `Cannot find module '@/lib/navigation/ia-tier'`.
- [ ] Replace the content of `lib/navigation/ia-tier-map.json` with the full map. Build it mechanically from the assignment table above: every Tier 0 section as `{"tier": 0}`, Tier 1 as `{"tier": 1}`, Tier 2 as `{"tier": 2, "module": "<slug>"}` using the exact pairs listed, Tier 3 as `{"tier": 3}`, Tier 4 as `{"tier": 4}`. Example of the exact JSON shape (the full file has all 100 keys):

```json
{
  "dashboard": { "tier": 0 },
  "inbox": { "tier": 0 },
  "inquiries": { "tier": 0 },
  "quotes": { "tier": 0 },
  "events": { "tier": 0 },
  "calendar": { "tier": 0 },
  "clients": { "tier": 0 },
  "menus": { "tier": 0 },
  "recipes": { "tier": 0 },
  "culinary": { "tier": 0 },
  "finance": { "tier": 0 },
  "receipts": { "tier": 0 },
  "settings": { "tier": 1 },
  "activity": { "tier": 1 },
  "briefing": { "tier": 1 },
  "calls": { "tier": 1 },
  "capture": { "tier": 1 },
  "chat": { "tier": 1 },
  "communication": { "tier": 1 },
  "contracts": { "tier": 1 },
  "daily": { "tier": 1 },
  "documents": { "tier": 1 },
  "help": { "tier": 1 },
  "import": { "tier": 1 },
  "kitchen": { "tier": 1 },
  "marketplace": { "tier": 1 },
  "notifications": { "tier": 1 },
  "onboarding": { "tier": 1 },
  "prep": { "tier": 1 },
  "proposals": { "tier": 1 },
  "pulse": { "tier": 1 },
  "queue": { "tier": 1 },
  "quick-log": { "tier": 1 },
  "rate-card": { "tier": 1 },
  "reference": { "tier": 1 },
  "reminders": { "tier": 1 },
  "waiting": { "tier": 1 },
  "wix-submissions": { "tier": 1 },
  "aar": { "tier": 2, "module": "event-debriefs" },
  "analytics": { "tier": 2, "module": "reports" },
  "autopilot": { "tier": 2, "module": "remy" },
  "availability": { "tier": 2, "module": "open-dates" },
  "business": { "tier": 2, "module": "restaurant-kitchen" },
  "circles": { "tier": 2, "module": "dinner-circles" },
  "commerce": { "tier": 2, "module": "commerce" },
  "consulting": { "tier": 2, "module": "consulting" },
  "content": { "tier": 2, "module": "marketing" },
  "culinary-board": { "tier": 2, "module": "idea-board" },
  "guest-analytics": { "tier": 2, "module": "reports" },
  "guests": { "tier": 2, "module": "ticketed-dinners" },
  "intelligence": { "tier": 2, "module": "reports" },
  "inventory": { "tier": 2, "module": "sourcing-inventory" },
  "journey": { "tier": 2, "module": "reports" },
  "locations": { "tier": 2, "module": "multi-location" },
  "loyalty": { "tier": 2, "module": "marketing" },
  "marketing": { "tier": 2, "module": "marketing" },
  "meal-prep": { "tier": 2, "module": "meal-prep" },
  "ops": { "tier": 2, "module": "restaurant-kitchen" },
  "partners": { "tier": 2, "module": "referral-network" },
  "portfolio": { "tier": 2, "module": "marketing" },
  "prices": { "tier": 2, "module": "market-prices" },
  "remy": { "tier": 2, "module": "remy" },
  "reputation": { "tier": 2, "module": "reputation" },
  "reviews": { "tier": 2, "module": "reputation" },
  "safety": { "tier": 2, "module": "backup-chef" },
  "series": { "tier": 2, "module": "dinner-series" },
  "shopping": { "tier": 2, "module": "sourcing-inventory" },
  "staff": { "tier": 2, "module": "team-staff" },
  "stations": { "tier": 2, "module": "restaurant-kitchen" },
  "surveys": { "tier": 2, "module": "reports" },
  "tasks": { "tier": 2, "module": "team-staff" },
  "vendors": { "tier": 2, "module": "sourcing-inventory" },
  "waitlist": { "tier": 2, "module": "ticketed-dinners" },
  "cannabis": { "tier": 3 },
  "chef": { "tier": 3 },
  "community": { "tier": 3 },
  "dev": { "tier": 3 },
  "explore": { "tier": 3 },
  "network": { "tier": 3 },
  "pie-cart": { "tier": 3 },
  "prospecting": { "tier": 3 },
  "studio": { "tier": 3 },
  "tables": { "tier": 3 },
  "team": { "tier": 4 },
  "shopping-list": { "tier": 4 },
  "leads": { "tier": 4 },
  "pipeline": { "tier": 4 },
  "payments": { "tier": 4 },
  "expenses": { "tier": 4 },
  "food-cost": { "tier": 4 },
  "insights": { "tier": 4 },
  "production": { "tier": 4 },
  "nutrition": { "tier": 4 },
  "imports": { "tier": 4 },
  "social": { "tier": 4 },
  "charity": { "tier": 4 },
  "guest-leads": { "tier": 4 },
  "welcome": { "tier": 4 },
  "travel": { "tier": 4 },
  "features": { "tier": 4 }
}
```

- [ ] Create `lib/navigation/ia-tier.ts`:

```ts
// IA tier resolution for navigation surfaces.
// Source of truth: ia-tier-map.json (also read by scripts/wiring-audit.mjs).
import tierMap from './ia-tier-map.json'

export type IaTierEntry = { tier: 0 | 1 | 2 | 3 | 4; module?: string }

const MAP = tierMap as Record<string, IaTierEntry>

export function getIaTier(href: string): IaTierEntry | null {
  const segment = href.split('/').filter(Boolean)[0]
  if (!segment) return null
  return MAP[segment] ?? null
}
```

If `tsconfig.json` lacks `"resolveJsonModule": true`, add it (check first: `grep -n resolveJsonModule tsconfig.json`).

- [ ] Run and see it pass: `node --test --import tsx tests/unit/ia-tier-map.test.ts` exits 0.
- [ ] Extend the nav types in `components/navigation/nav-config.tsx` additively. In the `NavItem` type (currently :100-111) add two optional fields after `tier?: 'primary' | 'secondary'`; do NOT change or repurpose the legacy `tier` field (it drives the existing top/below-divider split):

```ts
  /** Rescue-blueprint IA tier override. When absent, tier resolves from the href's top-level section via lib/navigation/ia-tier-map.json. */
  iaTier?: 0 | 1 | 2 | 3 | 4
  /** Module slug override (lib/billing/modules.ts). When absent, resolves from ia-tier-map.json. */
  module?: string
```

Add the same two fields to `NavSubItem` (:112-118). `NavGroup` already has `module?: string` (:129); leave it.

- [ ] Per-entry tagging: the section-level JSON map already covers every one of the ~600 nav entries because tier resolves from the href's first path segment. Explicit `iaTier` overrides are needed only where an entry's tier differs from its section; as of the blueprint there are none. Record this in a comment above `navGroups` (:190):

```ts
// IA tiers: every entry's tier resolves from lib/navigation/ia-tier-map.json
// via its href's top-level section. Use the iaTier field only to override a
// single entry away from its section's tier (rare; document why inline).
```

- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck` exits 0.
- [ ] Run `node scripts/wiring-audit.mjs` then `npm run regression:firewall`: both green (tier 2/3/4 routes now classify under the new rules; if weak count DROPS, that is expected; if anything new goes red, stop and report).
- [ ] Update `docs/test-coverage-blueprint.md`: add `lib/navigation/ia-tier.ts` row, COVERED (unit).
- [ ] Commit: `git add lib/navigation/ia-tier-map.json lib/navigation/ia-tier.ts components/navigation/nav-config.tsx tests/unit/ia-tier-map.test.ts tsconfig.json docs/test-coverage-blueprint.md && git commit -m "feat: populate ia tier map for all 100 chef sections and extend nav types"`

---

## Task 5: Nav defect sweep [CODEX-SAFE]

Prereq: Tasks 0, 1, 2. Anchors from dirty tree; re-locate by quoted code.

**Files:**

- Modify: `components/navigation/nav-config.tsx`
- Modify: `components/navigation/chef-nav.tsx` (the All Features link, currently :1069)
- Modify: `tests/unit/chef-nav-priority.test.ts` (assertions at :60-61 hardcode `/inquiries -> 'Pipeline'` and `/finance -> 'Money'`; they break on this task's label fixes and must be updated in the same commit)
- Create: `tests/unit/nav-config-defects.test.ts`

**Interfaces:**

- Consumes: `navGroups`, `standaloneTop`, `standaloneBottom`, `mobileTabItems`, `MOBILE_TAB_OPTIONS`, `actionBarItems` from `components/navigation/nav-config.tsx`.
- Produces: one label per route across all exported nav lists; no two different routes sharing a label within the same group; single gallery destination.

**Steps:**

- [ ] Write the failing test `tests/unit/nav-config-defects.test.ts`:

```ts
/**
 * Nav defect contract (rescue blueprint Section 8):
 * one label per route everywhere; Pipeline retired; Finance label;
 * no duplicate items within a group; single gallery destination.
 * Run: node --test --import tsx tests/unit/nav-config-defects.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  navGroups,
  standaloneTop,
  standaloneBottom,
  mobileTabItems,
  MOBILE_TAB_OPTIONS,
  actionBarItems,
} from '@/components/navigation/nav-config'

type Pair = { href: string; label: string; where: string }

function collect(): Pair[] {
  const pairs: Pair[] = []
  for (const list of [
    ['standaloneTop', standaloneTop],
    ['standaloneBottom', standaloneBottom],
    ['mobileTabItems', mobileTabItems],
    ['MOBILE_TAB_OPTIONS', MOBILE_TAB_OPTIONS],
    ['actionBarItems', actionBarItems],
  ] as const) {
    for (const item of list[1]) pairs.push({ href: item.href, label: item.label, where: list[0] })
  }
  for (const group of navGroups) {
    for (const item of group.items) {
      pairs.push({ href: item.href, label: item.label, where: `group:${group.id}` })
      for (const child of item.children ?? []) {
        pairs.push({ href: child.href, label: child.label, where: `group:${group.id}` })
      }
    }
  }
  return pairs
}

// Approved label aliases (contract Amendment 1): the action bar and mobile
// tabs may carry a short daily-driver alias for a route whose sidebar label
// stays canonical. Task 7 names the /events slot "Tonight" while the sidebar
// keeps "Events". Keep this list tiny and owner-approved.
const LABEL_ALIASES: Record<string, string[]> = {
  '/events': ['Events', 'Tonight'],
}

describe('nav defects', () => {
  const pairs = collect()

  it('every route has exactly one label across all surfaces (allowlisted aliases exempt)', () => {
    const byHref = new Map<string, Set<string>>()
    for (const p of pairs) {
      if (!byHref.has(p.href)) byHref.set(p.href, new Set())
      byHref.get(p.href)!.add(p.label)
    }
    const offenders = [...byHref.entries()].filter(([href, labels]) => {
      const allowed = LABEL_ALIASES[href]
      if (allowed && [...labels].every((l) => allowed.includes(l))) return false
      return labels.size > 1
    })
    assert.deepEqual(
      offenders.map(([href, labels]) => `${href}: ${[...labels].join(' | ')}`),
      [],
      'routes with more than one label'
    )
  })

  it('no label points at two different routes within the same group', () => {
    const byGroupLabel = new Map<string, Set<string>>()
    for (const p of pairs) {
      if (!p.where.startsWith('group:')) continue
      const key = `${p.where}::${p.label}`
      if (!byGroupLabel.has(key)) byGroupLabel.set(key, new Set())
      byGroupLabel.get(key)!.add(p.href)
    }
    const offenders = [...byGroupLabel.entries()].filter(([, hrefs]) => hrefs.size > 1)
    assert.deepEqual(
      offenders.map(([key, hrefs]) => `${key} -> ${[...hrefs].join(', ')}`),
      [],
      'labels reused for different routes in one group'
    )
  })

  it('no duplicate hrefs inside a single group item list', () => {
    for (const group of navGroups) {
      const hrefs = group.items.map((i) => i.href)
      assert.equal(hrefs.length, new Set(hrefs).size, `duplicate item hrefs in group ${group.id}`)
    }
  })

  it('the word Pipeline never renders as a nav label', () => {
    assert.deepEqual(
      pairs.filter((p) => /pipeline/i.test(p.label)).map((p) => `${p.where} ${p.href}`),
      []
    )
  })

  it('the money door is labeled Finance', () => {
    const money = standaloneTop.find((i) => i.href === '/finance')
    assert.equal(money?.label, 'Finance')
  })
})
```

- [ ] Run and see it fail: `node --test --import tsx tests/unit/nav-config-defects.test.ts`. Expected failures include: `/inquiries: Pipeline | Inquiries`, the two `Insights` labels in `group:analytics`, `/waiting` listed twice, and the Finance assertion (`Money`).
- [ ] Fix the known label defects in `components/navigation/nav-config.tsx`:
  - `standaloneTop`: change `label: 'Pipeline'` to `label: 'Inquiries'` on the `/inquiries` entry (currently :151), and `label: 'Money'` to `label: 'Finance'` on the `/finance` entry (currently :179).
  - `mobileTabItems`: change `label: 'Pipeline'` to `label: 'Inquiries'` (currently :1561).
  - `MOBILE_TAB_OPTIONS`: change `label: 'Pipeline'` to `label: 'Inquiries'` (currently :1577).
  - Analytics group duplicate "Insights" (currently :225-244): rename the `/insights` item label from `'Insights'` to `'Reports'`, and the `/analytics/intelligence` item label from `'Insights'` to `'Trends'` (blueprint Section 5: signals surface renamed Alerts or Trends; Trends chosen).
  - Waiting double listing (currently :331-340): keep the `/pulse` item with its `/waiting` child; delete the standalone `{ href: '/waiting', label: 'Waiting Radar', icon: Clock }` item. The route stays reachable through the `/pulse` child, so this is a duplicate-link removal, not a removal of reach.
- [ ] Re-run the test; fix every remaining offender it prints (these are the "27 duplicate labels, 14 duplicate hrefs" from the blueprint; the test enumerates them exactly, so fix by renaming to distinct plain labels or removing the second identical link when the first remains). Rules: never invent AI-sounding names; when two items point at the same href with the same label in the same group, remove one; when the same label names two routes, qualify the less canonical one with its plain job (e.g. "Guest Reviews" vs "Testimonials").
- [ ] Single gallery destination, part 1: in `components/navigation/chef-nav.tsx`, change the All Features rail link (currently :1069) `href="/onboarding/features"` to `href="/settings/modules"` and update its `pathname.startsWith('/onboarding/features')` active-check to `pathname.startsWith('/settings/modules')`.
- [ ] Single gallery destination, part 2: in `standaloneBottom` (currently :1552), change `{ href: '/features', label: 'Show all features', icon: Compass }` to `{ href: '/settings/modules', label: 'Modules', icon: Compass }`. (The `/features` ROUTE keeps resolving; Task 12 shells it.)
- [ ] Run until green: `node --test --import tsx tests/unit/nav-config-defects.test.ts` exits 0.
- [ ] Update the two existing nav tests that pin the OLD labels, in this same commit, citing contract Amendment 1: in `tests/unit/chef-nav-priority.test.ts` change `assert.equal(labelsByHref.get('/inquiries'), 'Pipeline')` (:60) to expect `'Inquiries'` and `assert.equal(labelsByHref.get('/finance'), 'Money')` (:61) to expect `'Finance'`. Do not touch that file's action-bar or mobile-tab shape assertions here; those change in Task 7 (or stay if Task 7's gate is not approved). Run `npm run test:unit` and confirm the only failures remaining are ones already documented as pre-existing.
- [ ] Typecheck and gate: `npx tsc --noEmit --skipLibCheck` exits 0; `node scripts/wiring-audit.mjs && npm run regression:firewall` green. **This is exactly the step where the Task 2 retool proves itself: label removals must not create WEAK routes for tier 2/3/4 sections.** If a tier 0/1 route goes weak, restore a link to it rather than allowlisting.
- [ ] Playwright spot-check against `http://localhost:3100` (agent auth per Verification canon): sidebar renders "Inquiries" and "Finance"; no "Pipeline" text in the nav. One probe spec or manual browser check; state what was checked.
- [ ] Update `docs/test-coverage-blueprint.md`: add `nav-config defects` row, COVERED (unit).
- [ ] Commit: `git add components/navigation/nav-config.tsx components/navigation/chef-nav.tsx tests/unit/nav-config-defects.test.ts tests/unit/chef-nav-priority.test.ts docs/test-coverage-blueprint.md && git commit -m "fix: nav defect sweep, one label per route, Pipeline retired, single gallery destination"`

---

## Task 6: Tier filter engine, nav_tiered_ia rollback flag, renderer wiring [OPUS-ONLY]

Prereq: Tasks 0, 2, 3, 4. Cross-workstream note: uses `checkGate` (works today); full server-side enforcement is WS1's item 4.

**Files:**

- Modify: `lib/feature-gates/gate-registry.ts` (add two gates before the closing `} as const` at :118)
- Create: `lib/navigation/tier-filter.ts`
- Create: `tests/unit/nav-tier-filter.test.ts`
- Modify: `app/(chef)/layout.tsx` (compute flags server-side; it already computes `enabledModules` around :218 and passes it to ChefNav at :278 and ChefMobileNav at :300)
- Modify: `components/navigation/chef-nav.tsx` (accept and apply the filter; props at :704-721)
- Modify: `components/navigation/chef-mobile-nav.tsx` (accept and apply the filter; props at :401-412)

**Interfaces:**

- Produces:

```ts
// lib/navigation/tier-filter.ts
export type TierFilterState = {
  tieredIaOn: boolean
  enabledModules: ReadonlySet<string>
  labsOn: boolean
  isAdmin?: boolean
}
export function isNavHrefVisible(href: string, state: TierFilterState): boolean
```

- Semantics (blueprint Section 4 items 3-5): when `tieredIaOn` is false, everything is visible (old tree, rollback switch). When true: tier 0 and tier 1 always visible; tier 2 visible only if its module slug is in `enabledModules`; tier 3 visible only if `labsOn` (admins always see tier 3); tier 4 visible (they are redirects; hiding the links is Task 5/10 work, the filter never breaks them); untagged hrefs visible (fail-open to old behavior).

**Steps:**

- [ ] Write the failing test `tests/unit/nav-tier-filter.test.ts`:

```ts
/**
 * Tier filter contract for chef navigation.
 * Run: node --test --import tsx tests/unit/nav-tier-filter.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isNavHrefVisible } from '@/lib/navigation/tier-filter'

const off = { tieredIaOn: false, enabledModules: new Set<string>(), labsOn: false }
const on = { tieredIaOn: true, enabledModules: new Set<string>(), labsOn: false }

describe('isNavHrefVisible', () => {
  it('rollback: with the flag off everything is visible', () => {
    assert.equal(isNavHrefVisible('/cannabis', off), true)
    assert.equal(isNavHrefVisible('/guests', off), true)
  })
  it('tier 0 and 1 always visible when flag on', () => {
    assert.equal(isNavHrefVisible('/dashboard', on), true)
    assert.equal(isNavHrefVisible('/daily', on), true)
  })
  it('tier 2 hidden until its module is enabled', () => {
    assert.equal(isNavHrefVisible('/guests', on), false)
    assert.equal(
      isNavHrefVisible('/guests', { ...on, enabledModules: new Set(['ticketed-dinners']) }),
      true
    )
  })
  it('tier 3 hidden unless labs is on or admin', () => {
    assert.equal(isNavHrefVisible('/cannabis', on), false)
    assert.equal(isNavHrefVisible('/cannabis', { ...on, labsOn: true }), true)
    assert.equal(isNavHrefVisible('/cannabis', { ...on, isAdmin: true }), true)
  })
  it('untagged hrefs fail open', () => {
    assert.equal(isNavHrefVisible('/some-unknown-thing', on), true)
  })
})
```

- [ ] Run and see it fail: `node --test --import tsx tests/unit/nav-tier-filter.test.ts`. Expected: `Cannot find module '@/lib/navigation/tier-filter'`.
- [ ] Create `lib/navigation/tier-filter.ts`:

```ts
// Pure nav visibility by IA tier. Client-safe (no server imports).
// Rollback contract: tieredIaOn=false restores the full ungated tree.
import { getIaTier } from './ia-tier'

export type TierFilterState = {
  tieredIaOn: boolean
  enabledModules: ReadonlySet<string>
  labsOn: boolean
  isAdmin?: boolean
}

export function isNavHrefVisible(href: string, state: TierFilterState): boolean {
  if (!state.tieredIaOn) return true
  const entry = getIaTier(href)
  if (!entry) return true
  switch (entry.tier) {
    case 0:
    case 1:
    case 4:
      return true
    case 2:
      return entry.module ? state.enabledModules.has(entry.module) : true
    case 3:
      return state.labsOn || state.isAdmin === true
  }
}
```

- [ ] Run and see it pass: `node --test --import tsx tests/unit/nav-tier-filter.test.ts` exits 0.
- [ ] Add two gates to `GATE_REGISTRY` in `lib/feature-gates/gate-registry.ts`, before the closing `} as const` (:118):

```ts
  // --- IA rollout switches (rescue blueprint Phase A) ---
  nav_tiered_ia: gate(
    'nav_tiered_ia',
    'Tiered Navigation',
    'free',
    'Renders the 12-door tiered sidebar; off restores the full ungated tree',
    false
  ),
  labs_experiments: gate(
    'labs_experiments',
    'Labs',
    'free',
    'Shows experimental surfaces in navigation and the module gallery',
    false
  ),
```

(BOTH gates default off via the fifth `gate()` argument. `nav_tiered_ia` ships OFF on purpose: turning it on before the module gallery (Task 12) and the data backfill (Task 13) exist would hide circle/staff/inventory sections from accounts that use them with no way to re-enable. The global flip to default-on is the LAST step of Task 13, inside that task's gate. Per-account preview before then: insert a `chef_feature_flags` row `nav_tiered_ia=true`. Per-account rollback after the flip: a `nav_tiered_ia=false` row. Tier tags survive either way.)

- [ ] In `app/(chef)/layout.tsx`, where `enabledModules` is computed (around :218), add:

```ts
const [tieredIaOn, labsOn] = await Promise.all([
  isGateEnabled(user.entityId, 'nav_tiered_ia'),
  isGateEnabled(user.entityId, 'labs_experiments'),
])
```

with `import { isGateEnabled } from '@/lib/feature-gates/gate-check'` added to the imports. Pass `tieredIaOn={tieredIaOn}` and `labsOn={labsOn}` to both `<ChefNav ...>` (:278 region) and `<ChefMobileNav ...>` (:297-300 region). Wrap BOTH `isGateEnabled` calls in `.catch(() => false)`: a flags-table read failure degrades to the full ungated tree (the safe state regardless of the registry default), never a crash and never a surprise-hidden section.

- [ ] In `components/navigation/chef-nav.tsx`: add `tieredIaOn?: boolean` and `labsOn?: boolean` to the props type (:721 region, next to `enabledModules?: string[]`). Build the filter state once:

```ts
const tierState = useMemo(
  () => ({
    tieredIaOn: tieredIaOn ?? true,
    enabledModules: new Set(enabledModules ?? []),
    labsOn: labsOn ?? false,
  }),
  [tieredIaOn, enabledModules, labsOn]
)
```

with `import { isNavHrefVisible } from '@/lib/navigation/tier-filter'`. Apply it where groups and standalone items are rendered: filter `navGroups` items (`group.items.filter((i) => isNavHrefVisible(i.href, tierState))`), drop groups whose filtered items are empty, and filter `standaloneBottom` the same way. Keep the existing `enabledModules`/`DEFAULT_MODULE_SLUGS` group-level module logic untouched (legacy behavior when the flag is off depends on it).

- [ ] In `components/navigation/chef-mobile-nav.tsx`: same prop additions (:412 region) and the same `isNavHrefVisible` filtering over `navGroups` items and the slide-out menu lists. Do NOT touch the hardcoded `/tables` fallback tab in this task (Task 8 owns it, behind its own gate).
- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck` exits 0.
- [ ] Runtime verification on `http://localhost:3100` (agent auth): (a) default account sees the full old tree unchanged (the flag defaults OFF until Task 13 flips it); (b) insert a `chef_feature_flags` override `nav_tiered_ia=true` for the agent account, reload, confirm the sidebar hides `/guests`, `/cannabis`, `/staff` links; leave the override in place through the parity check below, then remove it. State both observations.
- [ ] Desktop/mobile parity check: with the agent's `nav_tiered_ia=true` override still active, the set of visible group labels in the desktop sidebar equals the set in the mobile slide-out (compare by reading both DOMs in one Playwright run; a temporary probe spec is fine, and Task 7 lands the permanent assertion). Remove the override after.
- [ ] Run the gate: `npm run regression:firewall` green.
- [ ] Update `docs/test-coverage-blueprint.md`: `lib/navigation/tier-filter.ts` COVERED (unit).
- [ ] Commit: `git add lib/navigation/tier-filter.ts lib/feature-gates/gate-registry.ts "app/(chef)/layout.tsx" components/navigation/chef-nav.tsx components/navigation/chef-mobile-nav.tsx tests/unit/nav-tier-filter.test.ts docs/test-coverage-blueprint.md && git commit -m "feat: tiered nav rendering behind nav_tiered_ia rollback flag"`

---

## Task 7: Action bar capped at five named slots [CODEX-SAFE]

**GATE (owner): confirm the five action-bar slots.** Recommended default (blueprint Section 8, open question 3): Today, Inbox, Tonight's Event, Capture, Calendar. "Tonight's Event" links to `/events` with the label "Tonight" until a next-event resolver ships (queued as Phase B follow-up; do not build a resolver in this task). Builder skips this task unless the gate is marked approved.

Prereq: Tasks 0, 1, 5, 6.

**Files:**

- Modify: `components/navigation/nav-config.tsx` (`actionBarItems` :1964-1978, `mobileTabItems` :1558-1564)
- Modify: `components/navigation/action-bar.tsx` (add the hard cap)
- Modify: `tests/unit/chef-nav-priority.test.ts` (the six-shortcut action-bar assertion at :72-81 and the mobile-defaults assertion at :83-91 pin the old shapes; update in the same commit)
- Modify: `tests/unit/nav-regression.test.ts` (the required action-bar hrefs at :23-27 include `/inquiries` and `/circles`; update in the same commit)
- Create: `tests/unit/action-bar-slots.test.ts`

**Interfaces:**

- Consumes: `MAX_PRIMARY_NAV_ITEMS` (`lib/interface/surface-governance.ts:1`, value 7).
- Produces: `actionBarItems.length === 5`, identical items and labels in `mobileTabItems`, and a render-time cap so no future edit can bypass governance again.

**Steps:**

- [ ] Write the failing test `tests/unit/action-bar-slots.test.ts`:

```ts
/**
 * Action bar governance: five named slots, desktop/mobile parity,
 * capped by MAX_PRIMARY_NAV_ITEMS.
 * Run: node --test --import tsx tests/unit/action-bar-slots.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { actionBarItems, mobileTabItems } from '@/components/navigation/nav-config'
import { MAX_PRIMARY_NAV_ITEMS } from '@/lib/interface/surface-governance'

const EXPECTED = [
  { href: '/dashboard', label: 'Today' },
  { href: '/inbox', label: 'Inbox' },
  { href: '/events', label: 'Tonight' },
  { href: '/capture', label: 'Capture' },
  { href: '/calendar', label: 'Calendar' },
]

describe('action bar slots', () => {
  it('has exactly the five approved slots', () => {
    assert.deepEqual(
      actionBarItems.map(({ href, label }) => ({ href, label })),
      EXPECTED
    )
  })
  it('respects the governance cap', () => {
    assert.ok(actionBarItems.length <= MAX_PRIMARY_NAV_ITEMS)
  })
  it('mobile tabs ship the same items and labels (parity)', () => {
    assert.deepEqual(
      mobileTabItems.map(({ href, label }) => ({ href, label })),
      EXPECTED
    )
  })
})
```

- [ ] Run and see it fail: `node --test --import tsx tests/unit/action-bar-slots.test.ts`. Expected: 13 items vs 5, parity mismatch.
- [ ] Replace `actionBarItems` in `components/navigation/nav-config.tsx` (:1964-1978) with:

```ts
// Action Bar: the five daily-driver slots (owner-approved, contract Amendment 1).
// Capped by MAX_PRIMARY_NAV_ITEMS at render time in action-bar.tsx.
export const actionBarItems: NavItem[] = [
  { href: '/dashboard', label: 'Today', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/events', label: 'Tonight', icon: CalendarDays },
  { href: '/capture', label: 'Capture', icon: Camera },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
]
```

The nine removed shortcuts (`/clients`, `/menus`, `/recipes`, `/recipes/ingredients`, `/culinary/prep/shopping`, `/culinary/prep`, `/inquiries`, `/circles`, `/finance/invoices`) all remain reachable from the Tier 0 doors and groups; nothing loses reach.

- [ ] Replace `mobileTabItems` (:1558-1564) with the same five entries (same hrefs, labels, icons).
- [ ] In `components/navigation/action-bar.tsx`, enforce the cap at render time. After the `items` computation (currently around :56-59), add:

```ts
const cappedItems = items.slice(0, MAX_PRIMARY_NAV_ITEMS)
```

with `import { MAX_PRIMARY_NAV_ITEMS } from '@/lib/interface/surface-governance'`, and render `cappedItems` where `items` was rendered.

- [ ] Watch the parity trap: the action bar remaps the `/events` label through `getArchetypeCopy(archetype).eventsLabel` (action-bar.tsx:54). With the slot named "Tonight", remove that remap line for the `/events` item (delete the `.map(...)` that swaps in `copy.eventsLabel`) so desktop and mobile show the identical label. If archetype copy is needed later it must apply to both surfaces at once.
- [ ] Run and see it pass: `node --test --import tsx tests/unit/action-bar-slots.test.ts` exits 0.
- [ ] Update the two existing nav tests that pin the OLD action-bar shape, in this same commit, citing contract Amendment 1: in `tests/unit/chef-nav-priority.test.ts`, rewrite the six-shortcut assertion (:72-81, `['/dashboard','/inbox','/inquiries','/events','/culinary','/finance']`) and the mobile-defaults assertion (:83-91, `['/dashboard','/inbox','/inquiries','/events','/daily']`) to the new five-slot list `['/dashboard','/inbox','/events','/capture','/calendar']`; in `tests/unit/nav-regression.test.ts`, change the required action-bar hrefs (:23-27) from `['/dashboard','/inbox','/inquiries','/events','/circles']` to `['/dashboard','/inbox','/events','/capture','/calendar']` (note `/inquiries` and `/circles` remain reachable via the Tier 0 doors and sidebar groups; the regression guard's `allHrefs` union assertion proves it).
- [ ] Re-run the Task 5 defects test: `node --test --import tsx tests/unit/nav-config-defects.test.ts` exits 0 (the `/events -> 'Tonight'` slot is covered by that test's `LABEL_ALIASES` allowlist; if it fails, the allowlist is missing, not this task).
- [ ] Run `npm run verify:chef-nav` (it iterates `actionBarItems` and runs inside `regression:firewall`; confirm it accepts the five-slot bar, and if it asserts the old shape, update its expectation in the same commit with the Amendment 1 citation).
- [ ] Run `npm run test:unit` and confirm the only remaining failures are ones already documented as pre-existing.
- [ ] Note on `/capture`: confirm the route exists (`app/(chef)/capture/` exists as of 2026-07-10, Tier 1 field-capture inbox). No new route needed.
- [ ] Typecheck + gate: `npx tsc --noEmit --skipLibCheck` and `npm run regression:firewall` both green. If removing action-bar links makes any tier 0/1 route WEAK, add the link back inside its proper sidebar group instead of the action bar.
- [ ] Playwright parity probe on `http://localhost:3100`: desktop action bar and mobile bottom tabs render the same five labels. State the observation.
- [ ] Update `docs/test-coverage-blueprint.md`: action bar slots COVERED (unit).
- [ ] Commit: `git add components/navigation/nav-config.tsx components/navigation/action-bar.tsx tests/unit/action-bar-slots.test.ts tests/unit/chef-nav-priority.test.ts tests/unit/nav-regression.test.ts docs/test-coverage-blueprint.md && git commit -m "feat: cap action bar at five named slots with desktop/mobile parity"`

---

## Task 8: /tables mobile tab behind the Labs flag [CODEX-SAFE]

**GATE (owner): open question 4, move the hardcoded Tables bottom tab behind the Labs flag until the social zone has users.** Recommended default: yes, behind `labs_experiments`. The thesis stays on record; the route keeps resolving. Builder skips unless approved.

Prereq: Task 6 (the `labsOn` prop exists).

**Files:**

- Modify: `components/navigation/chef-mobile-nav.tsx` (the `hasTablesTab` fallback block, currently starting near :280 with `const hasTablesTab = tabItems.some((item) => item.href === '/tables')` and the `{!hasTablesTab && (` render block near :318)

**Interfaces:**

- Consumes: `labsOn` prop threaded from `app/(chef)/layout.tsx` in Task 6 (thread it down to the tab-bar subcomponent that renders the fallback; it currently receives `tabItems`, `pathname`, `onMoreClick`).
- Produces: the extra `/tables` tab renders only when `labsOn === true`. A user who explicitly picked Tables in their custom mobile tabs (`MOBILE_TAB_OPTIONS`) keeps it: the filter applies ONLY to the hardcoded fallback, not to `tabItems`.

**Steps (TDD-EXEMPT: pure conditional render; gate logic already unit-tested in Task 6):**

- [ ] Thread `labsOn: boolean` into the mobile tab-bar subcomponent's props (the component containing the `hasTablesTab` logic).
- [ ] Change the fallback condition from `{!hasTablesTab && (` to `{!hasTablesTab && labsOn && (`.
- [ ] Verify hidden: with the default account (labs off) on `http://localhost:3100` at mobile viewport (Playwright `--project` or browser devtools emulation), the bottom bar shows no Tables tab.
- [ ] Verify preserved: enable labs for the agent account (insert `chef_feature_flags` row `labs_experiments=true`), reload, Tables tab appears; remove the override after. Also verify `/tables` still resolves by direct URL either way (HTTP 200).
- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck` exits 0. Gate: `npm run regression:firewall` green (`/tables` is tier 3 in the map, so audit reachability holds through its registry entry).
- [ ] Commit: `git add components/navigation/chef-mobile-nav.tsx && git commit -m "feat: put hardcoded tables mobile tab behind the labs flag"`

---

## Task 9: Route-alias map for pathname-keyed intelligence [OPUS-ONLY]

Prereq: Tasks 0, 2. This ships BEFORE any shell conversion (Task 10) so no intelligence dies silently.

**Alias vs redirect, on purpose:** `resolveRouteAlias` cannot carry query strings, so an alias records the canonical PATH for affinity keying while the actual redirect route file may append a query param. Two known intentional differences: `'/leads': '/inquiries'` while the WS3 lead-intake shell redirects to `/inquiries?view=intake`, and `'/production': '/calendar'` while the WS3 production shell redirects to `/calendar?view=production`. Record the same canonical strings in `docs/CLAUDE-DOMAINS.md` when those shells land. The `/production` and `/leads` SHELL route files themselves are owned by WS3 (`docs/specs/rescue/2026-07-10-rescue-ws3-phase-b-core.md` Tasks 8 and 10-11), not by Task 10 here; this task only ships the map entries.

**Files:**

- Create: `lib/navigation/route-aliases.ts`
- Create: `tests/unit/route-aliases.test.ts`
- Modify: `lib/discovery/registries/chef-rail-registry.ts` (pageAffinity lookups, keys around :2228-2330)
- Modify: `lib/ai/remy-starters.ts` (pathname branch around :52)
- Modify: `lib/onboarding/smart-suggestions.ts` (pathname keys)
- Modify: `components/navigation/pinned-surfaces-section.tsx` and `components/navigation/recent-pages-section.tsx` (resolve on read; no data migration)

**Interfaces:**

- Produces:

```ts
// lib/navigation/route-aliases.ts
export const ROUTE_ALIASES: Readonly<Record<string, string>>
export function resolveRouteAlias(pathname: string): string
```

- `resolveRouteAlias` maps an old path (exact or prefix) to its canonical path, longest prefix wins, identity for unknown paths. Every pathname-keyed system calls it before matching.

**Steps:**

- [ ] Write the failing test `tests/unit/route-aliases.test.ts`:

```ts
/**
 * Route alias contract: old paths resolve to canonical paths for every
 * pathname-keyed system (rail, remy starters, suggestions, pins, recents).
 * Run: node --test --import tsx tests/unit/route-aliases.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ROUTE_ALIASES, resolveRouteAlias } from '@/lib/navigation/route-aliases'

describe('resolveRouteAlias', () => {
  it('maps the planned tier-4 shells', () => {
    assert.equal(resolveRouteAlias('/expenses'), '/finance/expenses')
    assert.equal(resolveRouteAlias('/food-cost'), '/culinary/costing')
    assert.equal(resolveRouteAlias('/insights'), '/analytics')
    assert.equal(resolveRouteAlias('/pipeline'), '/inquiries')
    assert.equal(resolveRouteAlias('/guest-leads'), '/inquiries')
    assert.equal(resolveRouteAlias('/payments'), '/finance/payments')
  })
  it('resolves nested paths by longest prefix', () => {
    assert.equal(resolveRouteAlias('/expenses/new'), '/finance/expenses/new')
    assert.equal(resolveRouteAlias('/imports/business-history'), '/import/business-history')
  })
  it('is identity for canonical and unknown paths', () => {
    assert.equal(resolveRouteAlias('/finance/expenses'), '/finance/expenses')
    assert.equal(resolveRouteAlias('/recipes'), '/recipes')
  })
  it('never maps an alias to another alias', () => {
    for (const target of Object.values(ROUTE_ALIASES)) {
      const targetRoot = '/' + target.split('/').filter(Boolean)[0]
      assert.ok(!(targetRoot in ROUTE_ALIASES), `${target} points into an aliased tree`)
    }
  })
})
```

- [ ] Run and see it fail: `node --test --import tsx tests/unit/route-aliases.test.ts`. Expected: module not found.
- [ ] Create `lib/navigation/route-aliases.ts`:

```ts
// One old-path-to-canonical map for the tier-4 shell program.
// Every pathname-keyed system (rail pageAffinity, remy starters, smart
// suggestions, help sections, pinned/recent surfaces) resolves through
// resolveRouteAlias BEFORE matching, so shells never silently kill
// intelligence. Redirect route files consume the same map.
export const ROUTE_ALIASES: Readonly<Record<string, string>> = {
  '/leads': '/inquiries',
  '/pipeline': '/inquiries',
  '/guest-leads': '/inquiries',
  '/payments': '/finance/payments',
  '/expenses': '/finance/expenses',
  '/food-cost': '/culinary/costing',
  '/insights': '/analytics',
  '/production': '/calendar',
  '/nutrition': '/culinary/menus',
  '/imports': '/import',
  '/social': '/marketing/social',
  '/charity': '/events/charity',
  '/welcome': '/onboarding/welcome',
  '/travel': '/events/travel',
  '/features': '/settings/modules',
  '/team': '/staff',
  '/shopping-list': '/culinary/prep/shopping',
}

const PREFIXES = Object.keys(ROUTE_ALIASES).sort((a, b) => b.length - a.length)

export function resolveRouteAlias(pathname: string): string {
  for (const prefix of PREFIXES) {
    if (pathname === prefix) return ROUTE_ALIASES[prefix]
    if (pathname.startsWith(prefix + '/')) {
      return ROUTE_ALIASES[prefix] + pathname.slice(prefix.length)
    }
  }
  return pathname
}
```

- [ ] Run and see it pass: `node --test --import tsx tests/unit/route-aliases.test.ts` exits 0.
- [ ] Wire the consumers, resolve-on-read in each (import `resolveRouteAlias` and apply it to the incoming pathname before any key lookup or `startsWith` branch):
  - `lib/discovery/registries/chef-rail-registry.ts`: at the function that matches `pageAffinity` keys against the current pathname, resolve the pathname first. Locate with `grep -n "pageAffinity" lib/discovery/registries/chef-rail-registry.ts` and apply at the match site, not at the 100+ key definitions.
  - `lib/ai/remy-starters.ts` (:52 region): `const path = resolveRouteAlias(rawPath)` before the `/expenses` branch chain; the `/expenses` branch then keys on `/finance/expenses`.
  - `lib/onboarding/smart-suggestions.ts`: same treatment at its pathname entry point.
  - `components/navigation/pinned-surfaces-section.tsx` and `recent-pages-section.tsx`: resolve each stored href on read before rendering the link (`href={resolveRouteAlias(stored.href)}`); stored data untouched.
  - Help page-info sections (`lib/help/page-info-sections/`): locate the lookup that maps pathname to section (`grep -rn "pathname" lib/help/page-info-sections lib/help | head`) and resolve there. If help keys on exact old paths (e.g. the expenses and leads sections), resolving the pathname keeps them matching after shells.
- [ ] Typecheck + unit suite: `npx tsc --noEmit --skipLibCheck` exits 0; `npm run test:unit` green (or at minimum the touched-domain tests plus the new one; state which ran).
- [ ] Gate: `npm run regression:firewall` green.
- [ ] Update `docs/test-coverage-blueprint.md`: `lib/navigation/route-aliases.ts` COVERED (unit).
- [ ] Commit: `git add lib/navigation/route-aliases.ts tests/unit/route-aliases.test.ts lib/discovery/registries/chef-rail-registry.ts lib/ai/remy-starters.ts lib/onboarding/smart-suggestions.ts components/navigation/pinned-surfaces-section.tsx components/navigation/recent-pages-section.tsx docs/test-coverage-blueprint.md && git commit -m "feat: route-alias map resolved by all pathname-keyed intelligence"`

---

## Task 10: Tier 4 shell conversions, per cluster [CODEX-SAFE, one cluster per dispatch]

**GATE (owner): open question 5, approve live-page shell conversions PER CLUSTER.** Gated clusters (live pages being converted): (a) /expenses, (b) /food-cost, (c) /insights. Recommended default: approve all three; components stay live in the tree, only the index route file becomes a redirect. Builder converts ONLY approved clusters; each cluster is its own commit and independently rejectable.

**Ungated clusters (no live page exists, nothing to approve):** (d) /nutrition and (e) /imports have NO index `page.tsx` today (verified 2026-07-10: `app/(chef)/nutrition/` holds only `[menuId]/` and `loading.tsx`; `app/(chef)/imports/` holds only `business-history/`). Their index URLs 404 right now. These two clusters CREATE a new redirect `page.tsx`, which fixes a 404; they need no owner gate and skip the live-page pre-checks below.

**Removed from this task:** the former cluster (f) `/production` is OWNED BY WS3 (`docs/specs/rescue/2026-07-10-rescue-ws3-phase-b-core.md` Tasks 10-11). `app/(chef)/production/page.tsx` is a 379-line live month grid whose body must first be extracted to `ProductionCalendarView` and mounted on `/calendar`; shelling it here would destroy a working capability before its replacement exists. Do not touch `/production` in this task.

Prereq: Tasks 0, 2, 9. Blueprint Section 4 item 5 rules: `redirect()` temporary semantics (matches the precedent at `app/(chef)/payments/page.tsx:7`), never permanent; sibling component files stay exactly where they are (a directory without `page.tsx` content does not route, so replacing only `page.tsx` preserves every component as a live file); each conversion recorded in `docs/CLAUDE-DOMAINS.md`.

**Files (per cluster, index page.tsx only; subroutes stay live and are covered by the alias map):**

- Modify: `app/(chef)/expenses/page.tsx` -> redirect to `/finance/expenses`
- Modify: `app/(chef)/food-cost/page.tsx` -> redirect to `/culinary/costing`
- Modify: `app/(chef)/insights/page.tsx` -> redirect to `/analytics`
- Create: `app/(chef)/nutrition/page.tsx` -> redirect to `/culinary/menus` (new file; index 404s today)
- Create: `app/(chef)/imports/page.tsx` -> redirect to `/import` (new file; index 404s today)
- Modify: `docs/CLAUDE-DOMAINS.md` (append one line per conversion)

**Interfaces:**

- Consumes: `redirect` from `next/navigation`; targets from `ROUTE_ALIASES` (Task 9); precedent shell at `app/(chef)/payments/page.tsx`.
- Produces: old URL returns a temporary redirect; canonical page carries the job.

**Steps (repeat this exact block once per APPROVED cluster; the /expenses block is written out; the other five use the same code with their own paths and targets as listed in Files):**

- [ ] Pre-check the target carries the job: open the canonical route in the browser (`http://localhost:3100/finance/expenses`) and confirm it is a live page, not itself a redirect (`grep -L "redirect(" "app/(chef)/finance/expenses/page.tsx"` returns the file). If the canonical page is missing or broken, STOP this cluster and report; do not shell a live page into a dead one.
- [ ] Inventory what is being preserved: `ls "app/(chef)/expenses/"`. Record the sibling files (client components, subdirectories) in the commit message body. They are NOT moved or deleted.
- [ ] Replace ONLY the contents of `app/(chef)/expenses/page.tsx` with:

```tsx
// Shell route (rescue blueprint Tier 4, contract Amendment 1).
// Canonical surface: /finance/expenses. Temporary redirect on purpose
// (never permanent; see payments/page.tsx precedent). Sibling components
// in this directory are preserved as live files.
import { redirect } from 'next/navigation'

export default function ExpensesShellPage() {
  redirect('/finance/expenses')
}
```

If the old `page.tsx` exported components or helpers consumed elsewhere (`grep -rn "from '@/app/(chef)/expenses/page'" app lib components`), move those exports into a sibling file first (e.g. `expenses-page-content.tsx`) and re-export nothing from `page.tsx`.

- [ ] Verify the redirect live with an AUTHENTICATED probe. An unauthenticated curl proves nothing here: `/expenses` is in `CHEF_PROTECTED_PATHS`, so middleware answers every signed-out request with a redirect to sign-in and never reaches the shell. Use Playwright with the agent session (throwaway spec or the Playwright MCP):

```ts
// throwaway probe; do not commit. Run: npx playwright test <this-file> --config=playwright.system-integrity.config.ts
import { test, expect } from '@playwright/test'
import fs from 'node:fs'

test('shell redirect and subroute survival', async ({ page }) => {
  const creds = JSON.parse(fs.readFileSync('.auth/agent.json', 'utf-8'))
  const res = await page.context().request.post('http://localhost:3100/api/e2e/auth', {
    data: { email: creds.email, password: creds.password },
  })
  expect(res.ok()).toBeTruthy()

  await page.goto('http://localhost:3100/expenses')
  await expect(page).toHaveURL(/\/finance\/expenses/)

  const sub = await page.goto('http://localhost:3100/expenses/new')
  expect(sub?.status()).not.toBe(404)
})
```

State the observed final URL and subroute status in the task notes.

- [ ] Append to `docs/CLAUDE-DOMAINS.md` under a `## Shell conversions (Phase A)` heading (create the heading on the first cluster):

```markdown
- 2026-07: /expenses index shelled to /finance/expenses (temporary redirect). Sibling components preserved live in app/(chef)/expenses/. Owner-approved cluster (a).
```

- [ ] Typecheck + gate: `npx tsc --noEmit --skipLibCheck` and `node scripts/wiring-audit.mjs && npm run regression:firewall` green (the shell route is tier 4; the redirect self-reference plus alias-map mention keep it out of ORPHAN).
- [ ] Commit (per cluster): `git add "app/(chef)/expenses/page.tsx" docs/CLAUDE-DOMAINS.md && git commit -m "refactor: shell /expenses index into /finance/expenses (components preserved live)"`
- [ ] Repeat the block for each remaining approved gated cluster: `/food-cost` -> `/culinary/costing`; `/insights` -> `/analytics`. Same pre-checks, same redirect code shape (change the component name and target), same subroute check, same docs line, same per-cluster commit.
- [ ] Then the two ungated CREATE clusters: `/nutrition` -> `/culinary/menus` and `/imports` -> `/import`. Same redirect code shape (component names `NutritionShellPage` and `ImportsShellPage`), same docs line, same per-cluster commit, BUT skip the live-page pre-checks (`grep -L "redirect("` on the index file and the exported-helpers grep both fail on a file that does not exist; there is nothing to preserve at the index). Still run the target pre-check (canonical page renders) and the authenticated subroute probe (`/nutrition/<some-menu-id>` via a real menu link, `/imports/business-history` directly). `/production` is NOT in this list; WS3 owns it.

---

## Task 11: Today 5-panel homepage [OPUS-ONLY]

Prereq: Task 0 (dashboard `_sections` files are dirty). Check `docs/UNIFIED-BUILD-QUEUE.md` for in-flight dashboard items before starting (blueprint Section 7 note on hero-zone). Blueprint Section 7 is the contract; do not add a sixth panel.

**Files:**

- Create: `lib/dashboard/today-panels.ts`
- Create: `tests/unit/today-panels.test.ts`
- Create: `app/(chef)/dashboard/_sections/quick-capture-strip.tsx`
- Create: `app/(chef)/dashboard/_sections/classic-dashboard.tsx` (receives the current layout JSX, moved not rewritten)
- Modify: `app/(chef)/dashboard/page.tsx` (568 lines as of 2026-07-10; CommandCenterLayout at :264, ThisWeekSection at :324, OnboardingZone at :352, HeroZone at :362, ProfitAtAGlance loader at :375-376 and :540-562, AmbientLayer at :432-435)

**Interfaces:**

- Consumes: `CommandCenterLayout` (`components/command-center/command-center-layout`), `ThisWeekSection`, `OnboardingZone`, `ProfitAtAGlance` + `getProfitAtAGlance` (`lib/finance/profit-actions`), `getWorkspaceDensity` (`lib/chef/preferences-actions:7`, returns `'minimal' | 'standard' | 'power'`), `getTenantDataPresence` (`lib/progressive-disclosure/tenant-data-presence.ts:121`), `isBrandNewChef` (`lib/progressive-disclosure/nav-visibility.ts:6`).
- Produces:

```ts
// lib/dashboard/today-panels.ts
import type { TenantDataPresence } from '@/lib/progressive-disclosure/types'
export type TodayPanel = 'attention' | 'next' | 'money' | 'getting-started' | 'quick-capture'
export function shouldShowMoneyPanel(presence: TenantDataPresence): boolean
export function orderedPanels(opts: { mobile: boolean }): TodayPanel[]
```

**Panel contract (blueprint Section 7, verbatim rules):**

1. **Attention**: `CommandCenterLayout`, the only ranked list. Empty state: "Nothing needs you right now." The chips row, `AmbientLayer`, Tiered Rail section, and the second command center inside Business Health all retire from the default view; the component files stay in the tree untouched.
2. **Next**: `ThisWeekSection` (schedule plus pipeline snapshot). Empty state: "No dinners booked. Start with an inquiry."
3. **Money**: `ProfitAtAGlance`, rendered only after the first logged payment or expense (`shouldShowMoneyPanel`); before that, the slot shows "Log your first payment" linking `/finance/payments`. Never `$0.00` styled as a stat. `HeroZone` retires from the default view.
4. **Getting Started**: `OnboardingZone` while `isBrandNewChef(presence)`; the module-discovery rotation that replaces it post-onboarding is Phase B, so after onboarding this slot renders nothing (empty slot, not an empty card).
5. **Quick capture strip**: three buttons: Brain Dump (`/recipes/dump`), Quick expense (`/expenses/new`, resolves through the Task 9 alias once shells land), Receipt snap (`/receipts`).

Desktop order: 1, 2, 3, 4, 5. Mobile order: 1, 5, 2, 3 (Getting Started rides its slot rules on both).

**Steps:**

- [ ] Write the failing test `tests/unit/today-panels.test.ts`:

```ts
/**
 * Today homepage panel rules (rescue blueprint Section 7).
 * Run: node --test --import tsx tests/unit/today-panels.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { shouldShowMoneyPanel, orderedPanels } from '@/lib/dashboard/today-panels'
import type { TenantDataPresence } from '@/lib/progressive-disclosure/types'

function presence(overrides: Partial<TenantDataPresence>): TenantDataPresence {
  return {
    hasEvents: false,
    hasClients: false,
    hasRecipes: false,
    hasMenus: false,
    hasInquiries: false,
    hasQuotes: false,
    hasInvoices: false,
    hasExpenses: false,
    hasStaff: false,
    hasDocuments: false,
    hasContracts: false,
    hasLeads: false,
    hasConversations: false,
    hasCircles: false,
    hasNetwork: false,
    hasInventory: false,
    hasTasks: false,
    populatedCount: 0,
    ...overrides,
  }
}

describe('today panels', () => {
  it('money panel hidden until an expense or invoice exists (invoice is the deliberate proxy for first payment; TenantDataPresence has no payments field)', () => {
    assert.equal(shouldShowMoneyPanel(presence({})), false)
    assert.equal(shouldShowMoneyPanel(presence({ hasExpenses: true })), true)
    assert.equal(shouldShowMoneyPanel(presence({ hasInvoices: true })), true)
  })
  it('desktop order is attention, next, money, getting-started, quick-capture', () => {
    assert.deepEqual(orderedPanels({ mobile: false }), [
      'attention',
      'next',
      'money',
      'getting-started',
      'quick-capture',
    ])
  })
  it('mobile puts quick capture directly under attention', () => {
    assert.deepEqual(orderedPanels({ mobile: true }), [
      'attention',
      'quick-capture',
      'next',
      'money',
      'getting-started',
    ])
  })
})
```

- [ ] Run and see it fail: `node --test --import tsx tests/unit/today-panels.test.ts`. Expected: module not found.
- [ ] Create `lib/dashboard/today-panels.ts`:

```ts
// Panel rules for the Today homepage (rescue blueprint Section 7).
import type { TenantDataPresence } from '@/lib/progressive-disclosure/types'

export type TodayPanel = 'attention' | 'next' | 'money' | 'getting-started' | 'quick-capture'

// Blueprint Section 7 says "after the first logged payment or expense".
// TenantDataPresence carries no payments field, so hasInvoices is the
// deliberate proxy for payment activity: a sent-but-unpaid invoice can
// surface the panel early, which is accepted because ProfitAtAGlance
// renders real invoice/expense figures, never a fabricated zero. If a
// payments presence flag is ever added, switch to it here and in the test.
export function shouldShowMoneyPanel(presence: TenantDataPresence): boolean {
  return presence.hasExpenses || presence.hasInvoices
}

export function orderedPanels(opts: { mobile: boolean }): TodayPanel[] {
  return opts.mobile
    ? ['attention', 'quick-capture', 'next', 'money', 'getting-started']
    : ['attention', 'next', 'money', 'getting-started', 'quick-capture']
}
```

- [ ] Run and see it pass: `node --test --import tsx tests/unit/today-panels.test.ts` exits 0.
- [ ] Create `app/(chef)/dashboard/_sections/quick-capture-strip.tsx`:

```tsx
// Quick capture strip: the only Today panel used with wet hands.
import Link from 'next/link'
import { BookOpen, DollarSign, Receipt } from '@/components/ui/icons'

const CAPTURES = [
  { href: '/recipes/dump', label: 'Brain Dump', icon: BookOpen },
  { href: '/expenses/new', label: 'Quick expense', icon: DollarSign },
  { href: '/receipts', label: 'Receipt snap', icon: Receipt },
]

export function QuickCaptureStrip() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {CAPTURES.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-stone-800 bg-stone-900/60 py-4 text-sm text-stone-200 hover:border-stone-600 hover:text-stone-50 transition-colors no-underline"
        >
          <Icon className="w-5 h-5" />
          {label}
        </Link>
      ))}
    </div>
  )
}
```

(Match icon names to what `@/components/ui/icons` actually exports; `BookOpen`, `DollarSign`, `Receipt` all appear in nav-config imports so they exist.)

- [ ] Move, do not rewrite: create `app/(chef)/dashboard/_sections/classic-dashboard.tsx` and relocate the entire current default-layout JSX of `ChefDashboard` (everything currently rendered after data fetching, including HeroZone, chips, AmbientLayer, Business Health, widget sections) into an exported `ClassicDashboard` component that accepts the already-fetched props it needs. Keep every existing import working; this is a cut-and-paste refactor of render code, zero logic changes. At its top render a one-line labeled banner:

```tsx
<p className="text-xs text-stone-500">
  Classic layout (temporary fallback, review by 2026-08-15). Switch back in Settings under workspace
  density.
</p>
```

- [ ] Rewrite `ChefDashboard` in `app/(chef)/dashboard/page.tsx` to branch:

```tsx
const [density, presence] = await Promise.all([
  getWorkspaceDensity(),
  getTenantDataPresence(user.entityId),
])

if (density === 'power') {
  // Props contract: ClassicDashboard receives every variable its relocated
  // JSX references, passed by its existing name. Determine the exact list
  // mechanically while cutting the JSX into classic-dashboard.tsx: each
  // typecheck error names a missing identifier; add it as a prop (expect at
  // least commandCenterData, queuePromise, and the profit loader inputs).
  return <ClassicDashboard commandCenterData={commandCenterData} queuePromise={queuePromise} />
}

const brandNew = isBrandNewChef(presence)
const showMoney = shouldShowMoneyPanel(presence)

return (
  <div className="space-y-6">
    {/* 1. Attention */}
    <CommandCenterWithWeight data={commandCenterData} />
    {/* 5 on mobile, rendered here and ordered by CSS: quick capture */}
    <div className="md:hidden">
      <QuickCaptureStrip />
    </div>
    {/* 2. Next */}
    <Suspense fallback={<SkeletonCard />}>
      <ThisWeekSection queuePromise={queuePromise} />
    </Suspense>
    {/* 3. Money, or the getting-started step, never a zero */}
    {showMoney ? (
      <Suspense fallback={<ProfitAtAGlanceSkeleton />}>
        <ProfitAtAGlanceLoader />
      </Suspense>
    ) : (
      <Link
        href="/finance/payments"
        className="block rounded-lg border border-stone-800 p-4 text-stone-300 hover:border-stone-600 no-underline"
      >
        Log your first payment
      </Link>
    )}
    {/* 4. Getting started */}
    {brandNew ? <OnboardingZone /> : null}
    {/* 5. Quick capture, desktop position */}
    <div className="hidden md:block">
      <QuickCaptureStrip />
    </div>
  </div>
)
```

Keep the existing data fetching (`getCommandCenterData`, the queue promise, etc.) above the branch so both layouts share it. Retired-from-default components (`HeroZone`, chips, `AmbientLayer`, Tiered Rail, Business Health) render ONLY inside `ClassicDashboard`; their files are untouched. `user` comes from the page's existing auth call; if the page does not currently expose the user id, add `const user = await requireChef()` consistent with the codebase pattern.

- [ ] Standing rule check (blueprint Section 7): grep the new default path for literal dollar or count placeholders: `git diff "app/(chef)/dashboard/page.tsx" | grep -E '\$0|placeholder|demo'` returns nothing suspicious. No derived, placeholder, or demo numbers render on Today.
- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck` exits 0.
- [ ] Playwright verification on `http://localhost:3100` (agent auth): (a) `/dashboard` renders the Attention panel first; (b) at mobile viewport the quick-capture strip sits directly under Attention; (c) with the agent account (which has data) the Money panel shows real ProfitAtAGlance, not "Log your first payment"; (d) set the agent's density preference to `power` and confirm the classic layout returns with its fallback banner, then set it back. State all four observations.
- [ ] Run the gate: `npm run regression:firewall` green. Also `npm run test:unit` green.
- [ ] Update `docs/test-coverage-blueprint.md`: `lib/dashboard/today-panels.ts` COVERED (unit); dashboard 5-panel layout PARTIAL (Playwright probe, journey test is Phase B).
- [ ] Commit: `git add "app/(chef)/dashboard/page.tsx" "app/(chef)/dashboard/_sections/classic-dashboard.tsx" "app/(chef)/dashboard/_sections/quick-capture-strip.tsx" lib/dashboard/today-panels.ts tests/unit/today-panels.test.ts docs/test-coverage-blueprint.md && git commit -m "feat: today five-panel homepage with classic layout as labeled fallback"`

---

## Task 12: Module gallery rebuild at /settings/modules [OPUS-ONLY]

Prereq: Tasks 3, 4, 6.

**Files:**

- Create: `app/(chef)/settings/modules/gallery-groups.ts`
- Create: `tests/unit/module-gallery-grouping.test.ts`
- Modify: `app/(chef)/settings/modules/modules-client.tsx` (254 lines; grid render + `handleToggleFocusMode` at :33-52)
- Modify: `app/(chef)/settings/modules/page.tsx` (34 lines; pass labs flag)
- Modify: `lib/feature-gates/gate-registry.ts` (display-name pass: :55 `'Profitability Cockpit'` -> `'Profit Reports'`, :50 `'Weather Intelligence'` -> `'Weather Alerts'`)
- Create: `components/billing/module-off-notice.tsx`
- Create: `app/(chef)/guests/layout.tsx` (proof wiring of the off-notice; pattern documented for Phase B rollout to the other Tier 2 anchors)
- Modify: `app/(chef)/features/page.tsx` -> redirect shell to `/settings/modules`
- Modify: `app/(chef)/onboarding/features/page.tsx` -> redirect shell to `/settings/modules`

**Interfaces:**

- Consumes: extended `MODULES` (Task 3), `labs_experiments` gate (Task 6), `getEnabledModules`/`toggleModule` (`lib/billing/module-actions.ts`), `CORE_MODULES`/`EXTENDED_MODULES` (`lib/billing/focus-mode`).
- Produces: a grouped gallery (seven job groups), Labs entries hidden unless the labs flag is on, gate display names cleaned, one gallery destination.

**Gallery groups (blueprint Section 5; each card one plain sentence, no numbers unless real, no adjectives):**

| Group                 | Module slugs                                                      |
| --------------------- | ----------------------------------------------------------------- |
| Selling and Marketing | marketing, open-dates, referral-network, reputation               |
| Kitchen and Sourcing  | sourcing-inventory, market-prices, idea-board, restaurant-kitchen |
| Money and Reports     | reports, payroll-tax, event-debriefs                              |
| People and Coverage   | team-staff, backup-chef                                           |
| Dinners at Scale      | ticketed-dinners, dinner-series, dinner-circles                   |
| Remy                  | remy                                                              |
| Other Services        | meal-prep, consulting, commerce, multi-location, social-hub       |

Legacy workspace-visibility modules (dashboard, pipeline, events, culinary, clients, finance, protection, more, station-ops, operations) keep rendering in a separate "Workspace areas" section exactly as today, so no existing toggle disappears.

**Steps (TDD for the focus-mode preservation bug; gallery layout TDD-EXEMPT with Playwright verification):**

- [ ] Write the failing test `tests/unit/module-gallery-grouping.test.ts`:

```ts
/**
 * Gallery grouping covers every rescue module exactly once, and gate
 * display names carry no marketing adjectives.
 * Run: node --test --import tsx tests/unit/module-gallery-grouping.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { GALLERY_GROUPS } from '@/app/(chef)/settings/modules/gallery-groups'
import { GATE_REGISTRY } from '@/lib/feature-gates/gate-registry'

const RESCUE_SLUGS = [
  'event-debriefs',
  'reports',
  'remy',
  'open-dates',
  'restaurant-kitchen',
  'dinner-circles',
  'consulting',
  'marketing',
  'idea-board',
  'ticketed-dinners',
  'sourcing-inventory',
  'meal-prep',
  'referral-network',
  'market-prices',
  'reputation',
  'backup-chef',
  'dinner-series',
  'team-staff',
  'payroll-tax',
]

describe('module gallery', () => {
  it('groups cover every rescue module exactly once', () => {
    const grouped = GALLERY_GROUPS.flatMap((g) => g.slugs)
    for (const slug of RESCUE_SLUGS) {
      assert.equal(grouped.filter((s) => s === slug).length, 1, slug)
    }
  })
  it('gate registry names got the plain-language pass', () => {
    assert.equal(GATE_REGISTRY.profitability_cockpit.name, 'Profit Reports')
    assert.equal(GATE_REGISTRY.weather_intelligence.name, 'Weather Alerts')
  })
})
```

- [ ] Run and see it fail: `node --test --import tsx tests/unit/module-gallery-grouping.test.ts`. Expected: `gallery-groups` module not found and the two name assertions.
- [ ] Create `app/(chef)/settings/modules/gallery-groups.ts`:

```ts
// Gallery grouping (rescue blueprint Section 5). Chef-facing group names.
export type GalleryGroup = { id: string; label: string; slugs: string[] }

export const GALLERY_GROUPS: GalleryGroup[] = [
  {
    id: 'selling',
    label: 'Selling and Marketing',
    slugs: ['marketing', 'open-dates', 'referral-network', 'reputation'],
  },
  {
    id: 'kitchen',
    label: 'Kitchen and Sourcing',
    slugs: ['sourcing-inventory', 'market-prices', 'idea-board', 'restaurant-kitchen'],
  },
  { id: 'money', label: 'Money and Reports', slugs: ['reports', 'payroll-tax', 'event-debriefs'] },
  { id: 'people', label: 'People and Coverage', slugs: ['team-staff', 'backup-chef'] },
  {
    id: 'scale',
    label: 'Dinners at Scale',
    slugs: ['ticketed-dinners', 'dinner-series', 'dinner-circles'],
  },
  { id: 'remy', label: 'Remy', slugs: ['remy'] },
  {
    id: 'other',
    label: 'Other Services',
    slugs: ['meal-prep', 'consulting', 'commerce', 'multi-location', 'social-hub'],
  },
]
```

- [ ] Apply the gate-registry naming pass in `lib/feature-gates/gate-registry.ts`: change the `name` argument `'Profitability Cockpit'` to `'Profit Reports'` (:55) and `'Weather Intelligence'` to `'Weather Alerts'` (:50). Keys and tiers untouched.
- [ ] Run and see it pass: `node --test --import tsx tests/unit/module-gallery-grouping.test.ts` exits 0.
- [ ] Rework `modules-client.tsx` rendering: render `GALLERY_GROUPS` sections first (cards for each slug via `getModule(slug)`, existing toggle wiring through `toggleModule`/`updateEnabledModules` unchanged), then the "Workspace areas" section with the 10 legacy visibility modules rendered exactly as the current grid. Each card body: the module `label`, its one-sentence `description`, the toggle, and the fixed footnote line "Off means: out of your menus and daily views. Pages and data stay." (this is the Section 4 item 5 promise so the toggle never overpromises).
- [ ] Fix the focus-mode wipe bug while in the file: in `handleToggleFocusMode` (currently :33-52), the OFF branch sets `setEnabled(new Set([...CORE_MODULES, ...EXTENDED_MODULES]))` and the ON branch `new Set(CORE_MODULES)`, which would erase rescue-module states. Change both branches to preserve rescue modules:

```ts
const rescueOn = [...enabled].filter(
  (s) => !CORE_MODULES.includes(s as any) && !EXTENDED_MODULES.includes(s as any)
)
if (next) {
  setEnabled(new Set([...CORE_MODULES, ...rescueOn]))
} else {
  setEnabled(new Set([...CORE_MODULES, ...EXTENDED_MODULES, ...rescueOn]))
}
```

Then check `lib/billing/focus-mode-actions.ts` (`toggleFocusMode`) for the same overwrite server-side and apply the same preservation there (read current `enabled_modules`, keep unknown-to-focus-mode slugs).

- [ ] Labs hidden by default: the gallery renders no Tier 3 cards at all (none of the rescue modules are Tier 3, so this is already true; assert it stays true by NOT adding cannabis/network/community/explore/tables/pie-cart cards; they arrive in Phase C behind the labs flag).
- [ ] Pass `labsOn` from `page.tsx` (add `isGateEnabled(user.entityId, 'labs_experiments')` alongside the existing `Promise.all` fetches; `requireChef()` already runs, capture its return as `user`) into `ModulesClient` for future Labs sections; render nothing extra when false.
- [ ] Series smoke pass BEFORE its card ships (blueprint Section 5): open `http://localhost:3100/series` signed in; it must render without an error boundary. If it crashes, remove the `dinner-series` slug from `GALLERY_GROUPS` (keep the module definition), update the grouping test's slug list comment accordingly, and file it in `docs/UNIFIED-BUILD-QUEUE.md` as a BLOCKED item; do not ship a card to a broken page.
- [ ] Create `components/billing/module-off-notice.tsx` (blueprint Section 4 item 5, per-module header note shown only while off):

```tsx
// One-line header note on a module page whose module is off.
// Names the job and where to turn it on. Renders nothing when on.
import Link from 'next/link'

export function ModuleOffNotice({
  moduleLabel,
  enabled,
}: {
  moduleLabel: string
  enabled: boolean
}) {
  if (enabled) return null
  return (
    <div className="mb-4 rounded-md border border-stone-700 bg-stone-900/70 px-3 py-2 text-sm text-stone-300">
      This page belongs to {moduleLabel}.{' '}
      <Link href="/settings/modules" className="underline text-stone-100">
        Turn it on in Settings
      </Link>{' '}
      to add it to your menus.
    </div>
  )
}
```

- [ ] Proof-wire it once, in `app/(chef)/guests/layout.tsx` (create the file; if a layout already exists there, add the notice into it instead):

```tsx
import { requireChef } from '@/lib/auth/get-user'
import { getEnabledModules } from '@/lib/billing/module-actions'
import { ModuleOffNotice } from '@/components/billing/module-off-notice'

export default async function GuestsLayout({ children }: { children: React.ReactNode }) {
  await requireChef()
  const enabled = await getEnabledModules().catch(() => [] as string[])
  return (
    <>
      <ModuleOffNotice
        moduleLabel="Ticketed Dinners"
        enabled={enabled.includes('ticketed-dinners')}
      />
      {children}
    </>
  )
}
```

Rolling the notice to the other Tier 2 anchors is a Phase B line item; record that in `docs/UNIFIED-BUILD-QUEUE.md` as SPEC-READY.

- [ ] Shell the two old gallery destinations in the same commit (Section 8 requirement). Replace `app/(chef)/features/page.tsx` content with:

```tsx
// Shell route: the single module gallery is /settings/modules (Amendment 1).
import { redirect } from 'next/navigation'

export default function FeaturesShellPage() {
  redirect('/settings/modules')
}
```

and `app/(chef)/onboarding/features/page.tsx` with the same body (component name `OnboardingFeaturesShellPage`). Sibling files (`feature-discovery-client.tsx`, `loading.tsx`) stay in place, live.

- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck` exits 0.
- [ ] Playwright verification on `http://localhost:3100`: `/settings/modules` renders the seven group headings plus Workspace areas; toggling `ticketed-dinners` ON makes `/guests` links appear in the sidebar (tier filter from Task 6) and the off-notice disappear on `/guests`; `/features` and `/onboarding/features` both land on the gallery. State observations.
- [ ] Gate: `npm run regression:firewall` green.
- [ ] Update `docs/test-coverage-blueprint.md`: gallery grouping COVERED (unit), gallery page PARTIAL (probe).
- [ ] Commit: `git add "app/(chef)/settings/modules" lib/feature-gates/gate-registry.ts lib/billing/focus-mode-actions.ts components/billing/module-off-notice.tsx "app/(chef)/guests/layout.tsx" "app/(chef)/features/page.tsx" "app/(chef)/onboarding/features/page.tsx" tests/unit/module-gallery-grouping.test.ts docs/test-coverage-blueprint.md docs/UNIFIED-BUILD-QUEUE.md && git commit -m "feat: grouped module gallery, gate naming pass, single gallery destination"`

---

## Task 13: Existing-account module backfill and first-login banner [OPUS-ONLY]

**GATE (owner): open question 6, confirm the seeded-on set for existing accounts.** Recommended default: any Tier 2 module whose tenant data presence is true seeds ON (so nothing vanishes from a working sidebar): `hasCircles` -> `dinner-circles`, `hasInventory` -> `sourcing-inventory`, `hasStaff` or `hasTasks` -> `team-staff`. `commerce` and `multi-location` keep their existing stored states untouched. Builder skips unless approved.

Prereq: Task 12.

**Files:**

- Create: `lib/billing/module-backfill.ts`
- Create: `tests/unit/module-backfill.test.ts`
- Modify: `app/(chef)/settings/modules/page.tsx` (run backfill once on gallery load)
- Create: `components/billing/modules-moved-banner.tsx`
- Modify: `app/(chef)/dashboard/page.tsx` (render the banner once post-rollout)
- Modify: `lib/feature-gates/gate-registry.ts` (final step only: flip `nav_tiered_ia` defaultEnabled to true)

**Interfaces:**

- Consumes: `TenantDataPresence` (`lib/progressive-disclosure/types.ts:1-20`), `getTenantDataPresence` (`lib/progressive-disclosure/tenant-data-presence.ts:121`), `getEnabledModules`/`updateEnabledModules` (`lib/billing/module-actions.ts`).
- Produces:

```ts
// lib/billing/module-backfill.ts
export function computeSeededModules(presence: TenantDataPresence, current: string[]): string[]
```

Pure: returns the union of `current` plus data-seeded rescue slugs; never removes anything; returns `current` unchanged (same reference not required, same members) when nothing to add.

**Steps:**

- [ ] Write the failing test `tests/unit/module-backfill.test.ts`:

```ts
/**
 * Existing-account module backfill: modules with tenant data seed ON,
 * nothing is ever removed.
 * Run: node --test --import tsx tests/unit/module-backfill.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeSeededModules } from '@/lib/billing/module-backfill'
import type { TenantDataPresence } from '@/lib/progressive-disclosure/types'

function presence(overrides: Partial<TenantDataPresence>): TenantDataPresence {
  return {
    hasEvents: false,
    hasClients: false,
    hasRecipes: false,
    hasMenus: false,
    hasInquiries: false,
    hasQuotes: false,
    hasInvoices: false,
    hasExpenses: false,
    hasStaff: false,
    hasDocuments: false,
    hasContracts: false,
    hasLeads: false,
    hasConversations: false,
    hasCircles: false,
    hasNetwork: false,
    hasInventory: false,
    hasTasks: false,
    populatedCount: 0,
    ...overrides,
  }
}

describe('computeSeededModules', () => {
  it('seeds modules that have tenant data', () => {
    const out = computeSeededModules(presence({ hasCircles: true, hasStaff: true }), ['dashboard'])
    assert.ok(out.includes('dinner-circles'))
    assert.ok(out.includes('team-staff'))
    assert.ok(out.includes('dashboard'))
  })
  it('never removes an already-enabled module', () => {
    const out = computeSeededModules(presence({}), ['dashboard', 'commerce', 'reports'])
    for (const slug of ['dashboard', 'commerce', 'reports']) assert.ok(out.includes(slug))
  })
  it('adds nothing without data', () => {
    assert.deepEqual(computeSeededModules(presence({}), ['dashboard']).sort(), ['dashboard'])
  })
  it('does not duplicate slugs', () => {
    const out = computeSeededModules(presence({ hasCircles: true }), ['dinner-circles'])
    assert.equal(out.filter((s) => s === 'dinner-circles').length, 1)
  })
})
```

- [ ] Run and see it fail: `node --test --import tsx tests/unit/module-backfill.test.ts`. Expected: module not found.
- [ ] Create `lib/billing/module-backfill.ts`:

```ts
// Seed Tier 2 modules ON for accounts that already hold that module's data,
// so the tiered nav never hides a surface someone is actively using.
// Pure and additive: never removes a slug.
import type { TenantDataPresence } from '@/lib/progressive-disclosure/types'

const PRESENCE_TO_MODULE: Array<[keyof TenantDataPresence, string]> = [
  ['hasCircles', 'dinner-circles'],
  ['hasInventory', 'sourcing-inventory'],
  ['hasStaff', 'team-staff'],
  ['hasTasks', 'team-staff'],
]

export function computeSeededModules(presence: TenantDataPresence, current: string[]): string[] {
  const out = new Set(current)
  for (const [key, slug] of PRESENCE_TO_MODULE) {
    if (presence[key] === true) out.add(slug)
  }
  return [...out]
}
```

- [ ] Run and see it pass: `node --test --import tsx tests/unit/module-backfill.test.ts` exits 0.
- [ ] Apply on gallery load: in `app/(chef)/settings/modules/page.tsx`, after fetching `enabledModules`, fetch presence and reconcile:

```ts
const user = await requireChef()
const presence = await getTenantDataPresence(user.entityId).catch(() => null)
let effectiveModules = enabledModules
if (presence) {
  const seeded = computeSeededModules(presence, enabledModules)
  if (seeded.length > enabledModules.length) {
    await updateEnabledModules(seeded)
    effectiveModules = seeded
  }
}
```

Pass `effectiveModules` to `ModulesClient`. Failure of the presence read degrades to no seeding, never an error page. (This runs on every gallery visit but writes only when it adds something, so it is idempotent.)

- [ ] Also apply it once in the chef layout path where `enabledModules` is loaded for nav (`app/(chef)/layout.tsx`, :218 region), same guarded write, so an existing account gets seeded on first login after rollout rather than only when visiting settings. Keep the `.catch` guards; a failed seed must never block the layout.
- [ ] Create `components/billing/modules-moved-banner.tsx`:

```tsx
'use client'

// One-time banner after the tiered-IA rollout. Dismiss stored client-side.
import { useEffect, useState } from 'react'
import Link from 'next/link'

const KEY = 'cf_modules_moved_banner_dismissed'

export function ModulesMovedBanner() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(KEY) !== '1')
    } catch {
      setVisible(false)
    }
  }, [])
  if (!visible) return null
  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-stone-700 bg-stone-900/70 px-3 py-2 text-sm text-stone-300">
      <p className="m-0">
        Your tools moved into named modules. Nothing was removed.{' '}
        <Link href="/settings/modules" className="underline text-stone-100">
          See your modules
        </Link>
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        className="text-stone-500 hover:text-stone-200"
        onClick={() => {
          try {
            window.localStorage.setItem(KEY, '1')
          } catch {}
          setVisible(false)
        }}
      >
        &times;
      </button>
    </div>
  )
}
```

- [ ] Render `<ModulesMovedBanner />` at the top of the Today page's returned JSX in `app/(chef)/dashboard/page.tsx` (both layout branches so classic users see it too).
- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck` exits 0.
- [ ] Playwright verification on `http://localhost:3100`: if the agent account has circles data, `dinner-circles` shows ON in the gallery without ever being toggled; the banner shows once on `/dashboard` and stays dismissed after clicking the x and reloading. State observations.
- [ ] Gate: `npm run regression:firewall` green.
- [ ] **Turn the tiered nav on globally (the flip Task 6 deliberately deferred):** in `lib/feature-gates/gate-registry.ts`, change the `nav_tiered_ia` entry's fifth `gate()` argument from `false` to `true` (remove the argument or set it true; defaultEnabled becomes true). This step runs ONLY inside this gated task, after the backfill and banner verify green, so no account loses a data-backed section without the gallery and seeding in place. Re-run the Task 6 runtime verification with no per-account override: the default account now sees the tiered sidebar, and its data-backed modules (seeded above) remain visible. Per-account rollback stays available via a `chef_feature_flags` row `nav_tiered_ia=false`.
- [ ] Cross-workstream unblock note: once this task lands, WS4's dinner-circles cron guard (`docs/specs/rescue/2026-07-10-rescue-ws4-phase-c-modules.md` Task 5) is unblocked; before this backfill, that guard would silence circle digests for tenants whose stored `enabled_modules` predates the `dinner-circles` slug.
- [ ] Update `docs/test-coverage-blueprint.md`: `lib/billing/module-backfill.ts` COVERED (unit).
- [ ] Commit: `git add lib/billing/module-backfill.ts tests/unit/module-backfill.test.ts "app/(chef)/settings/modules/page.tsx" "app/(chef)/layout.tsx" components/billing/modules-moved-banner.tsx "app/(chef)/dashboard/page.tsx" lib/feature-gates/gate-registry.ts docs/test-coverage-blueprint.md && git commit -m "feat: seed data-backed modules on for existing accounts with first-login banner"`

---

## Task 14: Read-only day-of sheet under /events/[id]/day-of [CODEX-SAFE]

Prereq: Task 0 (events section components are in the dirty set). Blueprint Sections 3 and 12 item 12: the highest-stakes moment is a phone in someone else's kitchen at 4:45pm. Menu, allergies, timeline, contacts, address. Read-only, phone-first, no new tables, no new fetch logic beyond composing existing actions.

**Path ownership:** this task is the permanent owner of `app/(chef)/events/[id]/day-of/page.tsx`. WS3's day-of door task (`docs/specs/rescue/2026-07-10-rescue-ws3-phase-b-core.md` Task 12) later MOUNTS a view switcher and an "Open <winner cockpit>" link at the top of this same sheet; it must never replace this file with a redirect. If a builder finds a `redirect(...)` body at this path, the sheet was clobbered: restore it from git history before continuing.

**Files:**

- Create: `app/(chef)/events/[id]/day-of/page.tsx`
- Modify: `app/(chef)/events/[id]/page.tsx` (add the entry link next to `<EventExitLinksSection ...>`, currently :110-115)

**Interfaces:**

- Consumes (all existing, verified 2026-07-10): `getEventById` (`lib/events/actions.ts:619`), `getEventAllergyReport` (`lib/dietary/allergy-severity-actions.ts:131`), `getEventPrepTimeline` (`lib/prep-timeline/actions.ts:148`), `getServiceTimeline` (`lib/lifecycle/timeline-generator-actions.ts`), `getEventStaffRoster` (`lib/staff/actions.ts`), `listEmergencyContacts` (`lib/contingency/actions.ts`). Address fields on the event row: `location_address`, `location_city`, `location_state`, `location_zip` (used at `app/(chef)/events/[id]/_sections/event-exit-links-section.tsx:33-38`); client phone via the event's joined `client.phone`.
- Produces: one server-rendered page, single column, large type, tel: links, zero mutations, zero client JS beyond Next defaults.

**Steps (TDD-EXEMPT: read-only composition of existing verified actions; verification via Playwright probe):**

- [ ] Create `app/(chef)/events/[id]/day-of/page.tsx`:

```tsx
// Day-of sheet: read-only, phone-first. The one page a chef opens in
// someone else's kitchen. Menu, allergies, timeline, contacts, address.
// No mutations. Every fetch degrades to a section-level empty state.
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { getEventAllergyReport } from '@/lib/dietary/allergy-severity-actions'
import { getEventPrepTimeline } from '@/lib/prep-timeline/actions'
import { getServiceTimeline } from '@/lib/lifecycle/timeline-generator-actions'
import { getEventStaffRoster } from '@/lib/staff/actions'
import { listEmergencyContacts } from '@/lib/contingency/actions'

export const metadata: Metadata = { title: 'Day-of sheet' }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-stone-800 bg-stone-900/60 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400 mb-2">{title}</h2>
      {children}
    </section>
  )
}

export default async function DayOfSheetPage({ params }: { params: Promise<{ id: string }> }) {
  await requireChef()
  const { id } = await params
  const event: any = await getEventById(id).catch(() => null)
  if (!event) notFound()

  const [allergyReport, prepTimeline, serviceTimeline, staffRoster, emergencyContacts] =
    await Promise.all([
      getEventAllergyReport(id).catch(() => null),
      getEventPrepTimeline(id).catch(() => null),
      getServiceTimeline(id).catch(() => null),
      getEventStaffRoster(id).catch(() => null),
      listEmergencyContacts().catch(() => null),
    ])

  const client = event.client ?? null
  const addressParts = [
    event.location_address,
    event.location_city,
    event.location_state,
    event.location_zip,
  ].filter(Boolean)
  const address = addressParts.join(', ')

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-16">
      <header>
        <h1 className="text-2xl font-bold text-stone-100">{event.title ?? 'Day-of sheet'}</h1>
        <p className="text-stone-400">
          {event.event_date ?? ''}
          {event.guest_count ? ` · ${event.guest_count} guests` : ''}
        </p>
      </header>

      <Section title="Allergies">
        {allergyReport &&
        Array.isArray((allergyReport as any).guests) &&
        (allergyReport as any).guests.length > 0 ? (
          <ul className="space-y-1 text-lg text-stone-100 m-0 pl-0 list-none">
            {(allergyReport as any).guests.map((g: any) => (
              <li key={g.guestId ?? g.name}>
                <span className="font-semibold">{g.name}</span>
                {': '}
                {(g.allergies ?? []).map((a: any) => a.allergen ?? a).join(', ')}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-stone-400 m-0">No recorded allergies for this event.</p>
        )}
      </Section>

      <Section title="Address">
        {address ? (
          <a
            className="text-lg text-stone-100 underline"
            href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
          >
            {address}
          </a>
        ) : (
          <p className="text-stone-400 m-0">No address on file. Add it on the event page.</p>
        )}
      </Section>

      <Section title="Contacts">
        <ul className="space-y-2 m-0 pl-0 list-none">
          {client?.name ? (
            <li className="text-lg text-stone-100">
              {client.name}
              {client.phone ? (
                <>
                  {' '}
                  <a className="underline" href={`tel:${client.phone}`}>
                    {client.phone}
                  </a>
                </>
              ) : null}
            </li>
          ) : null}
          {Array.isArray(staffRoster)
            ? staffRoster.map((s: any) => (
                <li key={s.id} className="text-lg text-stone-100">
                  {s.name ?? s.staff_name}
                  {s.role ? ` (${s.role})` : ''}
                  {s.phone ? (
                    <>
                      {' '}
                      <a className="underline" href={`tel:${s.phone}`}>
                        {s.phone}
                      </a>
                    </>
                  ) : null}
                </li>
              ))
            : null}
          {Array.isArray(emergencyContacts)
            ? emergencyContacts.map((c: any) => (
                <li key={c.id} className="text-lg text-stone-100">
                  {c.name}
                  {c.phone ? (
                    <>
                      {' '}
                      <a className="underline" href={`tel:${c.phone}`}>
                        {c.phone}
                      </a>
                    </>
                  ) : null}
                </li>
              ))
            : null}
        </ul>
        {!client && !staffRoster?.length && !emergencyContacts?.length ? (
          <p className="text-stone-400 m-0">No contacts on file.</p>
        ) : null}
      </Section>

      <Section title="Timeline">
        {serviceTimeline &&
        Array.isArray((serviceTimeline as any).items) &&
        (serviceTimeline as any).items.length > 0 ? (
          <ul className="space-y-1 m-0 pl-0 list-none">
            {(serviceTimeline as any).items.map((item: any, i: number) => (
              <li key={i} className="text-lg text-stone-100">
                {item.time ? <span className="font-semibold">{item.time} </span> : null}
                {item.label ?? item.title ?? item.description}
              </li>
            ))}
          </ul>
        ) : prepTimeline &&
          Array.isArray((prepTimeline as any).items) &&
          (prepTimeline as any).items.length > 0 ? (
          <ul className="space-y-1 m-0 pl-0 list-none">
            {(prepTimeline as any).items.map((item: any, i: number) => (
              <li key={i} className="text-lg text-stone-100">
                {item.label ?? item.title ?? item.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-stone-400 m-0">No timeline built yet.</p>
        )}
      </Section>

      <Section title="Menu">
        {event.menu_id ? (
          <Link className="text-lg text-stone-100 underline" href={`/menus/${event.menu_id}`}>
            Open the menu
          </Link>
        ) : (
          <p className="text-stone-400 m-0">No menu attached.</p>
        )}
      </Section>

      <p className="text-xs text-stone-500">
        Read-only sheet. Edit details on the{' '}
        <Link href={`/events/${id}`} className="underline">
          event page
        </Link>
        .
      </p>
    </div>
  )
}
```

**Shape-check note for the builder:** before finishing, open `lib/dietary/allergy-severity-actions.ts` (the `AllergyReport` return type near :131), `lib/prep-timeline/actions.ts:148` (the `getEventPrepTimeline` return type), and `lib/lifecycle/timeline-generator-actions.ts` (the `getServiceTimeline` return type), and adjust the property names in the JSX above to the real fields (`guests`, `items`, `time`, `label` are the expected names; if the real types differ, follow the types, keep the layout). Do the same for `getEventStaffRoster` and `listEmergencyContacts` (roster entries may carry `staff_name`/`phone` on a joined record). The `params: Promise<...>` signature must match the codebase's Next version convention; copy whatever `app/(chef)/events/[id]/page.tsx` does for its own `params`.

- [ ] Add the entry link in `app/(chef)/events/[id]/page.tsx`, directly ABOVE the `<EventExitLinksSection ...>` block (currently :110-115):

```tsx
{
  /* Day-of sheet: read-only, phone-first (rescue blueprint Phase A) */
}
;<Link
  href={`/events/${eventId}/day-of`}
  className="inline-flex items-center gap-2 rounded-md border border-stone-700 px-3 py-1.5 text-sm text-stone-200 hover:border-stone-500 no-underline"
>
  Day-of sheet
</Link>
```

Use the page's existing event id variable name (check whether it is `eventId`, `id`, or `params.id` in that scope and match it). Add `import Link from 'next/link'` if the file lacks it.

- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck` exits 0.
- [ ] Playwright verification on `http://localhost:3100` (agent auth): open an existing event, click "Day-of sheet", assert the h1 renders and the Allergies, Address, Contacts, Timeline, Menu sections are present; on an event with no allergies the section shows "No recorded allergies for this event." and never an empty stat. Check at mobile viewport (single column, tap targets legible). State observations.
- [ ] Gate: `npm run regression:firewall` green (`/events/[id]/day-of` sits under the tier 0 `events` section and gains a nav reference from the event page link).
- [ ] Update `docs/test-coverage-blueprint.md`: day-of sheet PARTIAL (probe; journey coverage is Phase B).
- [ ] Commit: `git add "app/(chef)/events/[id]/day-of/page.tsx" "app/(chef)/events/[id]/page.tsx" docs/test-coverage-blueprint.md && git commit -m "feat: read-only day-of sheet under the event workspace"`

---

## Closeout (after the last landed task)

- [ ] `npm run regression:firewall` green.
- [ ] `npm run test:unit` green.
- [ ] Run `/wire-audit` (project rule: no build is done until wire-audit runs) and `/page-xray --delta` on the affected routes from `scripts/wiring-audit-results.json` (`post_build_domain_matrix.affected_routes`).
- [ ] Confirm every gated task is either landed (gate approved) or still cleanly skipped with its gate question intact.
- [ ] Push: `git push origin main`.
