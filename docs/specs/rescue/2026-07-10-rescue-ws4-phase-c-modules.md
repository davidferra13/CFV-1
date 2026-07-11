# Rescue WS4: Phase C Module Hardening

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal (one sentence):** Contain the OpenClaw/Pi stack behind environment configuration, make crons and notifications respect per-tenant module state through one shared guard, put Labs surfaces behind experimental flags, and record the Tier 4 and duplicate-domain decisions in writing, all without deleting a single file or breaking a single URL.

**Architecture:** All gating flows through two existing stores: `chef_preferences.enabled_modules` (module on/off, managed by `lib/billing/module-actions.ts`) and `chef_feature_flags` plus `GATE_REGISTRY` (feature flags, managed by `lib/feature-gates/gate-check.ts`). This workstream adds one pure decision module (`lib/billing/module-guard-core.ts`), one server wrapper (`lib/billing/module-guard.ts`), and one OpenClaw config seam (`lib/openclaw/config.ts`); every cron and notification change is a thin call into those three files. No new tables, no migrations, no deletions.

**Tech Stack:** Next.js App Router, PostgreSQL via Supabase-style client (`createServerClient`) and Drizzle schema, Auth.js v5, node:test + tsx for unit tests, Playwright for route probes.

**Source of truth:** `docs/discovery/2026-07-10-chefflow-rescue-blueprint.md`, Section 12 Phase C table, plus Sections 4 (tier mechanism), 6 (duplication resolutions), 9 (security findings), 11 (demotions and renames). Do not re-litigate its decisions.

---

## Global Constraints

1. **Never delete work.** Contain, alias, redirect, flag. Every existing URL keeps resolving (redirects count). When a live page becomes a redirect, its old body is parked as a live unrouted file in the same directory first.
2. **All DB changes additive.** This plan requires ZERO migrations. If you think a task needs one, stop; you have misread the task. `ledger_entries`, `event_transitions`, `quote_state_transitions` are immutable and untouched here.
3. **Multi-user.** Every guard takes a `tenantId`; nothing is keyed to one chef's account. Algorithm-first: no new AI dependencies anywhere in this plan.
4. **HANDS OFF** the other tool's uncommitted work: `app/(chef)/studio/`, `app/api/studio/`, `components/studio/`, `lib/studio/`, `docs/specs/website-builder-studio.md`, `database/migrations/20260617000001_chef_sites_studio.sql`.
5. **Dirty working tree warning.** Roughly 69 files are modified and uncommitted, including three files in this plan's write-set: `app/api/cron/circle-remy-nudges/route.ts`, `app/api/cron/pie-accuracy-check/route.ts`, `app/api/cron/pie-census/route.ts`. Every task that touches a dirty file lists **Phase A item 1 (workspace settlement, `/untangle`) as a prerequisite**. All line anchors in this plan were read from the dirty working tree on 2026-07-10 and may shift after settlement; re-grep before editing if an anchor does not match.
6. **Fail open, never fail silent-off.** A DB read error inside a guard must not turn a pipeline off. Guards log and return "enabled" on error. A module being OFF must never produce fake data either: skipped cron runs return an explicit `{ skipped: true, reason }` payload.
7. **Code placement.** New lib code in `lib/{domain}/`, new components in `components/{domain}/`. No loose root files. No em dashes in any code, comment, or copy. Chef-facing copy never uses the words "tier", "Labs", "Standard", or "Parked".
8. **Verification canon.** Typecheck: `npx tsc --noEmit --skipLibCheck`. Closeout gate: `npm run regression:firewall`. Unit tests: `node --test --import tsx <file>` (there is no `test:affected` script in package.json; do not invent one). Playwright probes run against `http://localhost:3100` with agent auth (`POST http://localhost:3100/api/e2e/auth`, credentials in `.auth/agent.json`, body `{ "email", "password" }`, requires `E2E_ALLOW_TEST_AUTH=true` and loopback). When a test is added, update its row in `docs/test-coverage-blueprint.md`.
9. **Gates.** Tasks marked `GATE (...)` are skipped by builders unless the gate is marked approved in this file. Each gate states the blueprint's recommended default.

## Cross-workstream prerequisites

| This plan                                                                       | Depends on                                                                                                                                                                                                                                          | Why                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tasks 4, 5 (edits to pie-census, pie-accuracy-check, circle-remy-nudges routes) | Phase A item 1: workspace settlement (WS2 Task 0, `docs/specs/rescue/2026-07-10-rescue-ws2-phase-a-reorganize.md`)                                                                                                                                  | Those three route files are dirty in the working tree                                                                                                                                                                                                                                                                                                                                 |
| Tasks 1, 2 (module slugs `dinner-circles`, `market-prices`)                     | WS2 Task 3 (module vocabulary, `docs/specs/rescue/2026-07-10-rescue-ws2-phase-a-reorganize.md`)                                                                                                                                                     | WS2 Task 3 is the SINGLE registrar of both slugs (all rescue slugs land `defaultEnabled: false` there). This plan registers nothing; Task 1 only verifies the slugs exist. If they are missing, WS2 Task 3 has not landed: wait, never add them here                                                                                                                                  |
| Task 5 (dinner-circles cron guard)                                              | WS2 Task 13 (existing-account backfill + global flag flip, same WS2 file)                                                                                                                                                                           | `chef_preferences.enabled_modules` has a non-null DB column default (schema.ts:24666), so most tenants hold a stored array that predates the `dinner-circles` slug and `resolveModuleEnabled` reads it as an explicit OFF. Only the WS2 Task 13 backfill (`hasCircles` seeds `dinner-circles`) makes the guard safe; before it, the guard silences circle digests for nearly everyone |
| Task 11 (Labs gate keys)                                                        | WS2 Tasks 6 and 8 (same WS2 file) own the `labs_experiments` master switch and wire nav visibility plus the /tables mobile tab to it; the god-mode banner may already exist from WS1 Task 9 (`docs/specs/rescue/2026-07-10-rescue-ws1-security.md`) | WS4 reserves per-area keys only; nothing here mints a rival master switch                                                                                                                                                                                                                                                                                                             |
| Task 12 (help section wording)                                                  | Phase A item 9: route-alias map and shell conversions (WS2 Tasks 9-10)                                                                                                                                                                              | Descriptions that reference canonical homes of shelled routes only change after the shell lands                                                                                                                                                                                                                                                                                       |
| Task 13 (leads status pages)                                                    | Phase B "/leads intake tab into /inquiries" (WS3 Tasks 7-8, `docs/specs/rescue/2026-07-10-rescue-ws3-phase-b-core.md`)                                                                                                                              | If the leads shell lands first, leads status pages redirect to `/inquiries`, not `/leads`                                                                                                                                                                                                                                                                                             |

---

## Appendix A (read first): every hardcoded Pi/OpenClaw host in lib and app

Grepped 2026-07-10 for `10.0.0.177`. These 20 sites are the complete inventory this plan contains. `lib/work-continuity/build-index.ts:434` (a documentation string) and `tests/unit/local-ai-provider-url.test.ts` (test fixtures) are excluded on purpose.

| #   | File:line                                       | Hardcoded value                                                   | Env var (existing unless marked new) |
| --- | ----------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------ |
| 1   | `lib/openclaw/pi-stats.ts:6`                    | `http://10.0.0.177:8081`                                          | `OPENCLAW_API_URL`                   |
| 2   | `lib/openclaw/cart-actions.ts:359`              | `http://10.0.0.177:8081`                                          | `OPENCLAW_API_URL`                   |
| 3   | `lib/openclaw/archive-digester-handler.ts:22`   | `10.0.0.177` (bare host)                                          | `OPENCLAW_PI_HOST`                   |
| 4   | `lib/openclaw/event-shopping-actions.ts:12`     | `http://10.0.0.177:8081`                                          | `OPENCLAW_API_URL`                   |
| 5   | `lib/openclaw/directory-images-handler.ts:15`   | `http://10.0.0.177:8085`                                          | `OPENCLAW_DIRECTORY_IMAGES_API_URL`  |
| 6   | `lib/openclaw/polish-job.ts:26`                 | `http://10.0.0.177:8081`                                          | `OPENCLAW_API_URL`                   |
| 7   | `lib/openclaw/price-intelligence-actions.ts:13` | `http://10.0.0.177:8081`                                          | `OPENCLAW_API_URL`                   |
| 8   | `lib/openclaw/price-watch-actions.ts:14`        | `http://10.0.0.177:8081`                                          | `OPENCLAW_API_URL`                   |
| 9   | `lib/openclaw/lead-engine-handler.ts:14`        | `http://10.0.0.177:8083`                                          | `OPENCLAW_LEAD_ENGINE_API_URL`       |
| 10  | `lib/openclaw/sale-calendar-actions.ts:13`      | `http://10.0.0.177:8081`                                          | `OPENCLAW_API_URL`                   |
| 11  | `lib/openclaw/store-preference-actions.ts:11`   | `http://10.0.0.177:8081`                                          | `OPENCLAW_API_URL`                   |
| 12  | `lib/openclaw/wholesale-handler.ts:11`          | `http://10.0.0.177:8081`                                          | `OPENCLAW_API_URL`                   |
| 13  | `lib/openclaw/weekly-briefing-actions.ts:14`    | `http://10.0.0.177:8081`                                          | `OPENCLAW_API_URL`                   |
| 14  | `lib/openclaw/synthesis-client.ts:14`           | `http://10.0.0.177:8090/api/synthesis` (no env read at all today) | `OPENCLAW_SYNTHESIS_API_URL` (new)   |
| 15  | `lib/openclaw/vendor-import-actions.ts:15`      | `http://10.0.0.177:8081`                                          | `OPENCLAW_API_URL`                   |
| 16  | `lib/ai/remy-context.ts:42`                     | `http://10.0.0.177:8081`                                          | `OPENCLAW_API_URL`                   |
| 17  | `lib/ai/command-orchestrator.ts:1824`           | `http://10.0.0.177:8081`                                          | `OPENCLAW_API_URL`                   |
| 18  | `lib/ingredients/receipt-scan-actions.ts:14`    | `http://10.0.0.177:8081`                                          | `OPENCLAW_API_URL`                   |
| 19  | `lib/ingredients/image-actions.ts:7`            | `http://10.0.0.177:8081`                                          | `OPENCLAW_API_URL`                   |
| 20  | `app/api/openclaw/image/route.ts:7`             | `http://10.0.0.177:8081`                                          | `OPENCLAW_API_URL`                   |

**Cron routes in scope for the Market Prices gate (11):** `openclaw-sync`, `openclaw-polish`, `price-sync`, `price-sync-pull`, `resolve-prices`, `source-health`, `pie-census`, `pie-accuracy-check`, `pie-auto-expansion`, `pie-coverage-gaps`, `pie-trends`.

**Deliberately NOT gated:** `app/api/cron/ingredient-cost-refresh/route.ts`. It refreshes `last_price_cents` on recipe ingredients, which feeds the Tier 0 live cost ticker and quote guard (the floor). Its resolution chain includes receipt-derived prices. Gating it would starve the core costing loop. Leave it alone.

---

### Task 1: Verify the Dinner Circles and Market Prices module slugs exist [CODEX-SAFE]

**Prerequisite: WS2 Task 3 (module vocabulary) has landed.** WS2 Task 3 is the single registrar of every rescue module slug, including `dinner-circles` and `market-prices`, all `defaultEnabled: false`. This task ADDS NOTHING to `lib/billing/modules.ts`; it pins the two slugs this plan's guards depend on with a test that stays green regardless of how the defaults evolve (it reads the registry instead of hardcoding defaults, so it can never contradict WS2's `module-vocabulary.test.ts`).

**Files:**

- Create: `tests/unit/module-slugs.test.ts`

**Interfaces:**

- Consumes: `ALL_MODULE_SLUGS`, `DEFAULT_ENABLED_MODULES`, `getModule` from `lib/billing/modules.ts` (entries registered by WS2 Task 3)
- Produces: a pinned contract that both slugs exist and that `market-prices` is off by default

**Coordination check (do this first):** run `grep -n "dinner-circles\|market-prices" lib/billing/modules.ts`. Both slugs must appear exactly once each. If either is MISSING, WS2 Task 3 has not landed: stop this task (and Tasks 2, 4, 5, which consume the slugs) and wait; never add the entries here. If either appears twice, another agent duplicated a registration: stop and reconcile before writing the test.

- [ ] Write the test at `tests/unit/module-slugs.test.ts`:

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ALL_MODULE_SLUGS, DEFAULT_ENABLED_MODULES, getModule } from '@/lib/billing/modules'

describe('module slug registry (rescue WS4 consumers)', () => {
  it('dinner-circles is registered (WS2 Task 3)', () => {
    assert.ok(ALL_MODULE_SLUGS.includes('dinner-circles'))
  })

  it('market-prices is registered (WS2 Task 3)', () => {
    assert.ok(ALL_MODULE_SLUGS.includes('market-prices'))
  })

  it('market-prices is off by default (receipts are the primary price source)', () => {
    assert.ok(!DEFAULT_ENABLED_MODULES.includes('market-prices'))
  })

  it('dinner-circles default matches its registry entry (never hardcode the default here)', () => {
    const def = getModule('dinner-circles')!
    assert.equal(
      DEFAULT_ENABLED_MODULES.includes('dinner-circles'),
      def.defaultEnabled,
      'DEFAULT_ENABLED_MODULES must track the registry defaultEnabled flag'
    )
  })
})
```

- [ ] Run it and see it pass: `node --test --import tsx tests/unit/module-slugs.test.ts` (this test has no RED phase by design; it pins an already-landed contract. If it fails, the coordination check above was skipped: go back to it)
- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck`
- [ ] Add a row to `docs/test-coverage-blueprint.md` for the module slug consumer contract: status COVERED, test `tests/unit/module-slugs.test.ts`
- [ ] Commit: `git add tests/unit/module-slugs.test.ts docs/test-coverage-blueprint.md && git commit -m "test: pin dinner-circles and market-prices slug contract for WS4 guards"`

---

### Task 2: Shared per-tenant module guard for crons and notifications [CODEX-SAFE]

**Files:**

- Create: `lib/billing/module-guard-core.ts` (pure logic, no DB, no Next imports)
- Create: `lib/billing/module-guard.ts` (server wrapper over the admin DB client)
- Create: `tests/unit/module-guard-core.test.ts`

**Interfaces:**

- Consumes: `ALL_MODULE_SLUGS`, `DEFAULT_ENABLED_MODULES` from `lib/billing/modules.ts`; `createServerClient` from `lib/db/server`; table `chef_preferences` (column `enabled_modules text[]`, schema at `lib/db/schema/schema.ts:24666`)
- Produces:
  - `resolveModuleEnabled(moduleSlug: string, storedModules: string[] | null | undefined): boolean`
  - `partitionTenantsByModule(moduleSlug: string, rows: Map<string, string[] | null>): { enabled: Set<string>; disabled: Set<string> }`
  - `isModuleEnabledForTenant(tenantId: string, moduleSlug: string): Promise<boolean>`
  - `tenantsWithModuleDisabled(tenantIds: string[], moduleSlug: string): Promise<Set<string>>`
  - `anyTenantHasModuleEnabled(moduleSlug: string): Promise<boolean>`

**Design notes the builder must not "improve":**

- This does NOT extend `lib/billing/module-actions.ts` in place, because that file is `'use server'` and everything it exports becomes a client-invokable endpoint gated by `requireChef()`. The guard takes a raw `tenantId` and uses the admin client, so it lives in plain server modules (CLAUDE.md server action checklist item 8: internal-only functions go in non-`'use server'` files). It extends the module-actions machinery by reusing its exact fallback semantics (`module-actions.ts:27-29`).
- Unknown slug fails OPEN. If the WS1 vocabulary has not landed, a background pipeline must keep running rather than silently die.
- `chef_preferences.chef_id` is written from `user.entityId` in `module-actions.ts:24` and from `user.tenantId` in `lib/scheduling/schedule-block-actions.ts:59`; both resolve to the chef's tenant id. Cron callers pass `hub_groups.tenant_id` (see `app/api/cron/circle-remy-nudges/route.ts:20`).

- [ ] Write the failing test at `tests/unit/module-guard-core.test.ts`:

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveModuleEnabled, partitionTenantsByModule } from '@/lib/billing/module-guard-core'
import { DEFAULT_ENABLED_MODULES } from '@/lib/billing/modules'

describe('resolveModuleEnabled', () => {
  it('fails open for unknown slugs', () => {
    assert.equal(resolveModuleEnabled('not-a-real-module', []), true)
    assert.equal(resolveModuleEnabled('not-a-real-module', null), true)
  })

  it('falls back to defaults when no preference is stored', () => {
    // dinner-circles reads the registry default (false per WS2 Task 3, may
    // change at WS2 Task 13); never hardcode it, or this suite contradicts
    // WS2's module-vocabulary.test.ts and one of them goes permanently red.
    const circlesDefault = DEFAULT_ENABLED_MODULES.includes('dinner-circles')
    assert.equal(resolveModuleEnabled('dinner-circles', null), circlesDefault)
    assert.equal(resolveModuleEnabled('market-prices', null), false)
    assert.equal(resolveModuleEnabled('dinner-circles', []), circlesDefault)
  })

  it('honors an explicit stored preference', () => {
    assert.equal(resolveModuleEnabled('dinner-circles', ['dashboard']), false)
    assert.equal(resolveModuleEnabled('market-prices', ['dashboard', 'market-prices']), true)
  })

  it('station-ops follows the same rules (notification triggers depend on it)', () => {
    assert.equal(
      resolveModuleEnabled('station-ops', null),
      DEFAULT_ENABLED_MODULES.includes('station-ops')
    )
    assert.equal(resolveModuleEnabled('station-ops', ['dashboard']), false)
  })
})

describe('partitionTenantsByModule', () => {
  it('splits tenants by stored preference with default fallback', () => {
    const rows = new Map<string, string[] | null>([
      ['t-explicit-on', ['dashboard', 'market-prices']],
      ['t-explicit-off', ['dashboard']],
      ['t-no-row', null],
    ])
    const { enabled, disabled } = partitionTenantsByModule('market-prices', rows)
    assert.ok(enabled.has('t-explicit-on'))
    assert.ok(disabled.has('t-explicit-off'))
    assert.ok(disabled.has('t-no-row'))
  })
})
```

- [ ] Run it and see it fail: `node --test --import tsx tests/unit/module-guard-core.test.ts` (expected: module resolution error, `lib/billing/module-guard-core` does not exist)
- [ ] Create `lib/billing/module-guard-core.ts` with exactly:

```ts
// lib/billing/module-guard-core.ts
// Pure decision logic for per-tenant module gating. No DB, no auth, no Next
// imports: unit-testable under node --test.
//
// Semantics (rescue blueprint Section 4 item 5): module OFF means the module
// is removed from nav, search promotion, Today panels, and cron and
// notification output. Pages still resolve. This module answers the cron and
// notification half of that sentence.

import { ALL_MODULE_SLUGS, DEFAULT_ENABLED_MODULES } from './modules'

/**
 * Resolve whether a module is enabled given the raw stored preference.
 *
 * - Unknown slug (not registered in lib/billing/modules.ts): fail OPEN.
 *   A background job must never go quiet because a vocabulary change has
 *   not landed yet.
 * - No stored preference (null, undefined, or empty array): fall back to
 *   DEFAULT_ENABLED_MODULES, mirroring getEnabledModules() in
 *   lib/billing/module-actions.ts:27-29.
 * - Stored preference present: the module is enabled only if listed.
 */
export function resolveModuleEnabled(
  moduleSlug: string,
  storedModules: string[] | null | undefined
): boolean {
  if (!ALL_MODULE_SLUGS.includes(moduleSlug)) return true
  const effective =
    Array.isArray(storedModules) && storedModules.length > 0
      ? storedModules
      : DEFAULT_ENABLED_MODULES
  return effective.includes(moduleSlug)
}

/**
 * Split tenant ids into enabled and disabled sets for one module.
 * `rows` maps tenantId to its stored enabled_modules value (null when the
 * tenant has no chef_preferences row).
 */
export function partitionTenantsByModule(
  moduleSlug: string,
  rows: Map<string, string[] | null>
): { enabled: Set<string>; disabled: Set<string> } {
  const enabled = new Set<string>()
  const disabled = new Set<string>()
  for (const [tenantId, stored] of rows) {
    if (resolveModuleEnabled(moduleSlug, stored)) enabled.add(tenantId)
    else disabled.add(tenantId)
  }
  return { enabled, disabled }
}
```

- [ ] Run the test and see it pass: `node --test --import tsx tests/unit/module-guard-core.test.ts`
- [ ] Create `lib/billing/module-guard.ts` with exactly:

```ts
// lib/billing/module-guard.ts
// Server-side module guard for crons and notification triggers.
//
// Deliberately NOT part of lib/billing/module-actions.ts: that file is
// 'use server' and its exports are client-invokable, session-scoped actions.
// These helpers take a raw tenantId and use the admin client, so they must
// only run from cron routes and server-only trigger code.
//
// Failure posture: fail OPEN. A DB hiccup logs and reports "enabled" so a
// read error never silently turns off a pipeline.

import { createServerClient } from '@/lib/db/server'
import { DEFAULT_ENABLED_MODULES } from '@/lib/billing/modules'
import { partitionTenantsByModule, resolveModuleEnabled } from '@/lib/billing/module-guard-core'

/** Whether one tenant has a module enabled. No session; cron/trigger use only. */
export async function isModuleEnabledForTenant(
  tenantId: string,
  moduleSlug: string
): Promise<boolean> {
  try {
    const db: any = createServerClient({ admin: true })
    const { data, error } = await db
      .from('chef_preferences')
      .select('enabled_modules')
      .eq('chef_id', tenantId)
      .maybeSingle()
    if (error) {
      console.error('[module-guard] read failed, failing open:', error)
      return true
    }
    return resolveModuleEnabled(moduleSlug, data?.enabled_modules ?? null)
  } catch (err) {
    console.error('[module-guard] unexpected failure, failing open:', err)
    return true
  }
}

/**
 * Tenant ids (from the given list) whose module is DISABLED.
 * Batch variant for crons that iterate many tenants in one run.
 * Returns an empty set on error (fail open: nobody gets skipped).
 */
export async function tenantsWithModuleDisabled(
  tenantIds: string[],
  moduleSlug: string
): Promise<Set<string>> {
  const unique = [...new Set(tenantIds)].filter(Boolean)
  if (unique.length === 0) return new Set()
  try {
    const db: any = createServerClient({ admin: true })
    const { data, error } = await db
      .from('chef_preferences')
      .select('chef_id, enabled_modules')
      .in('chef_id', unique)
    if (error) {
      console.error('[module-guard] batch read failed, failing open:', error)
      return new Set()
    }
    const rows = new Map<string, string[] | null>()
    for (const id of unique) rows.set(id, null)
    for (const row of data ?? []) rows.set(row.chef_id, row.enabled_modules ?? null)
    return partitionTenantsByModule(moduleSlug, rows).disabled
  } catch (err) {
    console.error('[module-guard] unexpected batch failure, failing open:', err)
    return new Set()
  }
}

/**
 * Whether ANY tenant has the module enabled. Global pipelines (PIE, OpenClaw
 * sync) skip their run entirely when this is false.
 * Default-on modules short-circuit true: a tenant with no stored preference
 * has every default module.
 */
export async function anyTenantHasModuleEnabled(moduleSlug: string): Promise<boolean> {
  if (DEFAULT_ENABLED_MODULES.includes(moduleSlug)) return true
  try {
    const db: any = createServerClient({ admin: true })
    const { count, error } = await db
      .from('chef_preferences')
      .select('chef_id', { count: 'exact', head: true })
      .contains('enabled_modules', [moduleSlug])
    if (error) {
      console.error('[module-guard] anyTenant read failed, failing open:', error)
      return true
    }
    return (count ?? 0) > 0
  } catch (err) {
    console.error('[module-guard] anyTenant unexpected failure, failing open:', err)
    return true
  }
}
```

- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck`
- [ ] Add a row to `docs/test-coverage-blueprint.md`: `lib/billing/module-guard-core.ts` COVERED via `tests/unit/module-guard-core.test.ts`; `lib/billing/module-guard.ts` PARTIAL (DB wrapper exercised indirectly by cron probes in Tasks 4-5)
- [ ] Commit: `git add lib/billing/module-guard-core.ts lib/billing/module-guard.ts tests/unit/module-guard-core.test.ts docs/test-coverage-blueprint.md && git commit -m "feat: shared per-tenant module guard for crons and notifications"`

---

### Task 3: OpenClaw config seam; retire every hardcoded Pi host [CODEX-SAFE]

**Files:**

- Create: `lib/openclaw/config.ts`
- Create: `tests/unit/openclaw-config.test.ts`
- Modify: all 20 files in Appendix A (exact per-file edits below)

**Interfaces:**

- Produces: `getOpenClawApiUrl(): string | null`, `getOpenClawLeadEngineUrl(): string | null`, `getOpenClawDirectoryImagesUrl(): string | null`, `getOpenClawSynthesisUrl(): string | null`, `getOpenClawPiHost(): string | null`, `isOpenClawConfigured(): boolean`, `OPENCLAW_UNCONFIGURED_URL: string`
- Consumes: `process.env` only

**Design note:** every one of these call sites already survives fetch failure (the Pi has been offline; their catch paths run in production today). So the containment is behavior-preserving: when the env var is unset, the fallback becomes a guaranteed-unresolvable RFC 2606 `.invalid` hostname instead of a private LAN IP that some future device could claim. Existing catch paths keep firing exactly as they do now, and setting the env var restores full function. Callers that can cheaply early-return get the null-checking form; the rest get the `.invalid` fallback form.

- [ ] Write the failing test at `tests/unit/openclaw-config.test.ts`:

```ts
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  getOpenClawApiUrl,
  getOpenClawSynthesisUrl,
  isOpenClawConfigured,
  OPENCLAW_UNCONFIGURED_URL,
} from '@/lib/openclaw/config'

describe('openclaw config seam', () => {
  beforeEach(() => {
    delete process.env.OPENCLAW_API_URL
    delete process.env.OPENCLAW_SYNTHESIS_API_URL
  })

  it('returns null when the env var is unset or blank', () => {
    assert.equal(getOpenClawApiUrl(), null)
    process.env.OPENCLAW_API_URL = '   '
    assert.equal(getOpenClawApiUrl(), null)
    assert.equal(isOpenClawConfigured(), false)
  })

  it('returns the trimmed env value when set', () => {
    process.env.OPENCLAW_API_URL = ' http://example.com:8081 '
    assert.equal(getOpenClawApiUrl(), 'http://example.com:8081')
    assert.equal(isOpenClawConfigured(), true)
  })

  it('synthesis endpoint reads its own env var', () => {
    assert.equal(getOpenClawSynthesisUrl(), null)
    process.env.OPENCLAW_SYNTHESIS_API_URL = 'http://example.com:8090/api/synthesis'
    assert.equal(getOpenClawSynthesisUrl(), 'http://example.com:8090/api/synthesis')
  })

  it('the unconfigured fallback can never reach a real host', () => {
    assert.ok(OPENCLAW_UNCONFIGURED_URL.includes('.invalid'))
  })
})
```

- [ ] Run it and see it fail: `node --test --import tsx tests/unit/openclaw-config.test.ts` (expected: module resolution error, `lib/openclaw/config` does not exist)
- [ ] Create `lib/openclaw/config.ts` with exactly:

```ts
// lib/openclaw/config.ts
// Single configuration seam for every OpenClaw / Pi network endpoint.
// The Pi at 10.0.0.177 is retired hardware; no caller may hardcode it.
// Receipts are the primary price source for ChefFlow (rescue blueprint
// Section 10 item 7); the OpenClaw catalog is an enhancement that lights up
// when these env vars are configured and the Market Prices module is on.
//
// When an env var is unset the helper returns null. Callers either early
// return their existing failure value, or fall back to
// OPENCLAW_UNCONFIGURED_URL, an RFC 2606 .invalid host that fails DNS fast
// and exercises the same catch path a dead Pi does today.

export const OPENCLAW_UNCONFIGURED_URL = 'http://openclaw-unconfigured.invalid'

function readUrl(name: string): string | null {
  const raw = process.env[name]
  if (!raw) return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Main OpenClaw price API (was hardcoded http://10.0.0.177:8081). */
export function getOpenClawApiUrl(): string | null {
  return readUrl('OPENCLAW_API_URL')
}

/** Lead engine API (was hardcoded http://10.0.0.177:8083). */
export function getOpenClawLeadEngineUrl(): string | null {
  return readUrl('OPENCLAW_LEAD_ENGINE_API_URL')
}

/** Directory images API (was hardcoded http://10.0.0.177:8085). */
export function getOpenClawDirectoryImagesUrl(): string | null {
  return readUrl('OPENCLAW_DIRECTORY_IMAGES_API_URL')
}

/** Synthesis API (was hardcoded http://10.0.0.177:8090/api/synthesis). */
export function getOpenClawSynthesisUrl(): string | null {
  return readUrl('OPENCLAW_SYNTHESIS_API_URL')
}

/** Bare Pi host for legacy handlers (was hardcoded 10.0.0.177). */
export function getOpenClawPiHost(): string | null {
  return readUrl('OPENCLAW_PI_HOST')
}

/** True when the main OpenClaw API endpoint is configured. */
export function isOpenClawConfigured(): boolean {
  return getOpenClawApiUrl() !== null
}
```

- [ ] Run the test and see it pass: `node --test --import tsx tests/unit/openclaw-config.test.ts`
- [ ] Apply the standard edit to each `OPENCLAW_API_URL` fallback site. The pattern, shown in full for `lib/openclaw/pi-stats.ts:6`:

  Before:

  ```ts
  return process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'
  ```

  After:

  ```ts
  return getOpenClawApiUrl() ?? OPENCLAW_UNCONFIGURED_URL
  ```

  with this import added at the top of the file:

  ```ts
  import { getOpenClawApiUrl, OPENCLAW_UNCONFIGURED_URL } from '@/lib/openclaw/config'
  ```

  Apply the same two-line change (fallback expression plus import) to sites 1, 2, 4, 6, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20 in Appendix A. Site 2 (`cart-actions.ts:359`) and site 17 (`command-orchestrator.ts:1824`) declare the const inside a function body; edit in place there, do not hoist.

- [ ] Site 3, `lib/openclaw/archive-digester-handler.ts:22`: replace
  ```ts
  const PI_HOST = process.env.OPENCLAW_PI_HOST || '10.0.0.177'
  ```
  with
  ```ts
  import { getOpenClawPiHost } from '@/lib/openclaw/config'
  const PI_HOST = getOpenClawPiHost() ?? 'openclaw-unconfigured.invalid'
  ```
  (bare host, so the `.invalid` literal is used without the `http://` prefix; keep the existing `ARCHIVE_URL` template line unchanged)
- [ ] Site 5, `lib/openclaw/directory-images-handler.ts:15`: replace the `process.env.OPENCLAW_DIRECTORY_IMAGES_API_URL || 'http://10.0.0.177:8085'` expression with `getOpenClawDirectoryImagesUrl() ?? OPENCLAW_UNCONFIGURED_URL` and add the matching import
- [ ] Site 9, `lib/openclaw/lead-engine-handler.ts:14`: replace the `process.env.OPENCLAW_LEAD_ENGINE_API_URL || 'http://10.0.0.177:8083'` expression with `getOpenClawLeadEngineUrl() ?? OPENCLAW_UNCONFIGURED_URL` and add the matching import
- [ ] Site 14, `lib/openclaw/synthesis-client.ts:14`: replace
  ```ts
  const PI_SYNTHESIS_BASE = 'http://10.0.0.177:8090/api/synthesis'
  ```
  with
  ```ts
  import { getOpenClawSynthesisUrl, OPENCLAW_UNCONFIGURED_URL } from '@/lib/openclaw/config'
  const PI_SYNTHESIS_BASE = getOpenClawSynthesisUrl() ?? OPENCLAW_UNCONFIGURED_URL
  ```
  Note this file is `'use server'`; the import goes below the `'use server'` directive with the other imports.
- [ ] Verify no hardcoded host survives outside the two allowed files: `grep -rn "10\.0\.0\.177" lib app --include=*.ts --include=*.tsx` must return only `lib/work-continuity/build-index.ts` (a doc string; leave it) and `lib/openclaw/config.ts` comments if any. Zero other hits.
- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck`
- [ ] Regression check on the floor (rule 4, guard against regression): with the dev server on `http://localhost:3100`, load a recipe cost view and confirm the cost ticker still renders (receipt-priced ingredients unaffected). Name what was verified in the commit body.
- [ ] Add a row to `docs/test-coverage-blueprint.md`: `lib/openclaw/config.ts` COVERED via `tests/unit/openclaw-config.test.ts`
- [ ] Commit: `git add lib/openclaw lib/ai/remy-context.ts lib/ai/command-orchestrator.ts lib/ingredients/receipt-scan-actions.ts lib/ingredients/image-actions.ts "app/api/openclaw/image/route.ts" tests/unit/openclaw-config.test.ts docs/test-coverage-blueprint.md && git commit -m "feat: env-gate all 20 hardcoded Pi hosts behind lib/openclaw/config seam"`

---

### Task 4: Gate the 11 market-price crons on the Market Prices module [CODEX-SAFE]

**Prerequisite:** Phase A item 1 (workspace settlement). `app/api/cron/pie-census/route.ts` and `app/api/cron/pie-accuracy-check/route.ts` are dirty in the working tree; settle before editing. Requires Tasks 1 and 2.

**Files:**

- Modify (insert the same guard block after the cron-auth check in each):
  - `app/api/cron/openclaw-sync/route.ts` (auth check near line 22)
  - `app/api/cron/openclaw-polish/route.ts` (auth check near line 16)
  - `app/api/cron/price-sync/route.ts` (auth check near line 16)
  - `app/api/cron/price-sync-pull/route.ts` (auth check near line 26)
  - `app/api/cron/resolve-prices/route.ts` (auth check near line 24)
  - `app/api/cron/source-health/route.ts` (auth check near line 14)
  - `app/api/cron/pie-census/route.ts` (auth check at lines 29-30)
  - `app/api/cron/pie-accuracy-check/route.ts` (auth check near line 14)
  - `app/api/cron/pie-auto-expansion/route.ts` (auth check near line 17)
  - `app/api/cron/pie-coverage-gaps/route.ts` (auth check near line 19)
  - `app/api/cron/pie-trends/route.ts` (auth check near line 26)

**Interfaces:**

- Consumes: `anyTenantHasModuleEnabled` from `lib/billing/module-guard.ts` (Task 2), slug `'market-prices'` (Task 1)
- Produces: each route returns `{ success: true, skipped: true, reason: 'market-prices module off for all tenants' }` with HTTP 200 when no tenant has the module on

**TDD status:** the decision logic is covered by `tests/unit/module-guard-core.test.ts` (Task 2). This task is wiring; its proof is the live-route probe below.

- [ ] In each of the 11 route files, add the import at the top with the other imports:

```ts
import { anyTenantHasModuleEnabled } from '@/lib/billing/module-guard'
```

- [ ] In each route handler, immediately after the existing cron-auth block (the `verifyCronAuth(...)` call and its `if (authError) return authError` line), insert:

```ts
// Market Prices module gate (rescue blueprint Phase C item 1): this is
// global pricing infrastructure. When no tenant has the module on, skip
// the run instead of exercising retired hardware. Turning the module on
// resumes the pipeline at the next scheduled tick.
if (!(await anyTenantHasModuleEnabled('market-prices'))) {
  return NextResponse.json({
    success: true,
    skipped: true,
    reason: 'market-prices module off for all tenants',
  })
}
```

All 11 files already import `NextResponse`. Do not touch anything else in the handlers; do not touch `app/api/cron/ingredient-cost-refresh/route.ts` (floor costing, see Appendix A).

- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck`
- [ ] Live probe (dev server on 3100). First export the secrets into the shell; `$CRON_SECRET` and `$DATABASE_URL` are NOT set by default (Git Bash):

```bash
export CRON_SECRET=$(grep -m1 '^CRON_SECRET=' .env.local | cut -d= -f2-)
export DATABASE_URL=$(grep -m1 '^DATABASE_URL=' .env.local | cut -d= -f2-)
```

With `market-prices` off for all tenants (the registry default), each route must return the skip payload:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3100/api/cron/pie-trends | grep -c '"skipped":true'
```

Expected output: `1`. Spot-check at least `pie-trends`, `pie-census`, and `openclaw-sync`. Note: `price-sync` and `ingredient-cost-refresh` use POST; use `curl -s -X POST` for those.

- [ ] Reversal probe: enable the module for the agent tenant, then confirm the cron runs (not skipped). A bare `array_append ... WHERE NOT (... = ANY(enabled_modules))` is a silent no-op when the row is absent or `enabled_modules` is NULL (NULL predicate), which would let the reversal probe "pass" without ever enabling the module, so handle all three states and capture the original value for restoration (run in the same shell as the exports above):

```bash
node -e "
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const chefId = require('./.auth/agent.json').tenantId;
  const { rows } = await c.query(
    'SELECT enabled_modules FROM chef_preferences WHERE chef_id = \$1',
    [chefId]
  );
  console.log('BEFORE (restore to this afterward):', JSON.stringify(rows[0] ?? null));
  // Fallback list mirrors DEFAULT_ENABLED_MODULES in lib/billing/modules.ts;
  // verify against that file before running and adjust if it changed.
  const DEFAULTS = ['dashboard','pipeline','events','culinary','clients','finance','protection','more'];
  if (rows.length === 0) {
    await c.query(
      'INSERT INTO chef_preferences (chef_id, enabled_modules) VALUES (\$1, \$2)',
      [chefId, [...DEFAULTS, 'market-prices']]
    );
  } else {
    const current = rows[0].enabled_modules;
    const base = Array.isArray(current) && current.length > 0 ? current : DEFAULTS;
    if (!base.includes('market-prices')) {
      await c.query(
        'UPDATE chef_preferences SET enabled_modules = \$2 WHERE chef_id = \$1',
        [chefId, [...base, 'market-prices']]
      );
    }
  }
  const check = await c.query(
    \"SELECT 'market-prices' = ANY(enabled_modules) AS on FROM chef_preferences WHERE chef_id = \$1\",
    [chefId]
  );
  console.log('market-prices enabled now:', check.rows[0]?.on === true);
  await c.end();
})();
"
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3100/api/cron/pie-trends | head -c 200
```

The node step must print `market-prices enabled now: true` BEFORE the curl counts as evidence; then expect no `"skipped":true` in the curl response. Afterward restore the exact BEFORE state it printed: if BEFORE was `null` (no row), delete nothing; instead run `UPDATE chef_preferences SET enabled_modules = array_remove(enabled_modules, 'market-prices') WHERE chef_id = '<tenantId>';` to strip only the added slug; if BEFORE held an array, `UPDATE chef_preferences SET enabled_modules = '<the BEFORE array>' WHERE chef_id = '<tenantId>';`.

- [ ] Commit: `git add app/api/cron/openclaw-sync app/api/cron/openclaw-polish app/api/cron/price-sync app/api/cron/price-sync-pull app/api/cron/resolve-prices app/api/cron/source-health app/api/cron/pie-census app/api/cron/pie-accuracy-check app/api/cron/pie-auto-expansion app/api/cron/pie-coverage-gaps app/api/cron/pie-trends && git commit -m "feat: gate the 11 market-price crons on the market-prices module"`

---

### Task 5: Per-tenant Dinner Circles guard for circle crons [CODEX-SAFE]

**Prerequisites (all three, hard):** (1) Phase A item 1 (workspace settlement): `app/api/cron/circle-remy-nudges/route.ts` is dirty in the working tree. (2) Tasks 1 and 2. (3) **WS2 Task 13 (existing-account backfill, `docs/specs/rescue/2026-07-10-rescue-ws2-phase-a-reorganize.md`) has LANDED.** The registry default for `dinner-circles` is false (WS2 Task 3), and even a true default would not protect existing tenants: `chef_preferences.enabled_modules` has a non-null DB column default (schema.ts:24666), so tenants with a preferences row hold a stored array that predates the slug and `resolveModuleEnabled` reads it as an explicit OFF. Only the backfill (`hasCircles` seeds `dinner-circles` ON) makes this guard safe. Shipping the guard before the backfill silences circle digests for nearly every tenant with circle data.

- [ ] Pre-flight blast-radius check (run BEFORE any edit; same env exports as Task 4): count the tenants this guard would skip:

```bash
node -e "
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const all = await c.query('SELECT count(*)::int AS n FROM chef_preferences');
  const off = await c.query(
    \"SELECT count(*)::int AS n FROM chef_preferences WHERE enabled_modules IS NOT NULL AND array_length(enabled_modules, 1) > 0 AND NOT ('dinner-circles' = ANY(enabled_modules))\"
  );
  console.log('preference rows:', all.rows[0].n, '| rows the guard would skip:', off.rows[0].n);
  await c.end();
})();
"
```

If the skip count is effectively every row that has circle data, the WS2 Task 13 backfill has not run: ABORT this task, report the two numbers, and mark it BLOCKED on WS2 Task 13 in `docs/UNIFIED-BUILD-QUEUE.md`. Proceed only when tenants with circle data carry the slug.

**Files:**

- Modify: `app/api/cron/circle-remy-nudges/route.ts` (loop starts near line 30)
- Modify: `lib/hub/circle-digest.ts` (`processDigests`, members load at lines 26-41)

**Interfaces:**

- Consumes: `tenantsWithModuleDisabled` from `lib/billing/module-guard.ts`, slug `'dinner-circles'`
- Produces: circles belonging to tenants with the module off are skipped; response shape of both crons unchanged

**TDD status:** the partition logic is covered by `tests/unit/module-guard-core.test.ts` (Task 2, `partitionTenantsByModule`). This task is wiring with the verification probes below.

- [ ] In `app/api/cron/circle-remy-nudges/route.ts`, add the import:

```ts
import { tenantsWithModuleDisabled } from '@/lib/billing/module-guard'
```

- [ ] In the same file, after the empty-circles early return (`if (!circles || circles.length === 0) { ... }`, near line 26) and before `let nudgeCount = 0`, insert:

```ts
// Dinner Circles module gate: tenants that turned the module off get no
// Remy nudges. Their circles and data are untouched; turning the module
// back on resumes nudges at the next tick.
const disabledTenants = await tenantsWithModuleDisabled(
  circles.map((c: any) => c.tenant_id),
  'dinner-circles'
)
```

- [ ] Inside the `for (const circle of circles) {` loop, as its first statement, insert:

```ts
if (disabledTenants.has(circle.tenant_id)) continue
```

- [ ] In `lib/hub/circle-digest.ts`, add the import at the top:

```ts
import { tenantsWithModuleDisabled } from '@/lib/billing/module-guard'
```

- [ ] In `processDigests`, after the members query and its empty-return (`if (!members || members.length === 0) return { sent: 0, skipped: 0 }`, line 41) and before the `memberGroups` construction, insert:

```ts
// Dinner Circles module gate: drop circles whose tenant turned the module
// off before building digests. hub_group_members has no tenant column, so
// resolve group_id -> tenant_id through hub_groups first.
const groupIds = [...new Set(members.map((m: any) => m.group_id))]
const { data: groupRows } = await db.from('hub_groups').select('id, tenant_id').in('id', groupIds)
const tenantByGroup = new Map<string, string>(
  (groupRows ?? []).map((g: any) => [g.id, g.tenant_id])
)
const disabledTenants = await tenantsWithModuleDisabled(
  [...new Set((groupRows ?? []).map((g: any) => g.tenant_id))],
  'dinner-circles'
)
const gatedMembers = members.filter((m: any) => {
  const tenantId = tenantByGroup.get(m.group_id)
  return !tenantId || !disabledTenants.has(tenantId)
})
if (gatedMembers.length === 0) return { sent: 0, skipped: 0 }
```

- [ ] In the same function, change the member loop source from `for (const member of members) {` to `for (const member of gatedMembers) {` (line 54 today). Touch nothing else in the file.
- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck`
- [ ] Live probe: in the post-backfill state (tenants with circle data carry the `dinner-circles` slug), run both crons and confirm they behave exactly as before for those tenants (non-error JSON, `nudges`/`hourly` keys present):

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3100/api/cron/circle-remy-nudges | head -c 200
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3100/api/cron/circle-digest | head -c 200
```

- [ ] Disable probe: remove `dinner-circles` for the agent tenant (SQL mirror of the Task 4 reversal step, using `array_remove`; note the tenant must first HAVE a populated `enabled_modules` row, otherwise set it to the default list minus `dinner-circles`), rerun `circle-remy-nudges`, and confirm the agent tenant's circles produce zero new `hub_messages` rows from source `remy` during the run. Restore the preference afterward.
- [ ] Commit: `git add app/api/cron/circle-remy-nudges/route.ts lib/hub/circle-digest.ts && git commit -m "feat: circle crons skip tenants with dinner-circles module off"`

---

### Task 6: Notification triggers check module state; fix the dead /finances push URL [CODEX-SAFE]

**Requires Task 2.** The `station-ops` module slug already exists (`lib/billing/modules.ts:118-125`, default ON), so this task has no Task 1 dependency. When WS1's vocabulary mapping renames restaurant-ops modules (blueprint name "Restaurant Kitchen" / "Team and Staff"), the slug constant below is the single place to update.

**Files:**

- Modify: `lib/notifications/triggers.ts` (five functions: `notifyTaskAssigned` near line 58, `notifyOrderReady` near line 170, `notifyDeliveryReceived` near line 201, `notifyLowStock` near line 234, `notifyGuestComp` near line 273)
- Modify: `lib/notifications/onesignal.ts:130`

**Interfaces:**

- Consumes: `isModuleEnabledForTenant` from `lib/billing/module-guard.ts`
- Produces: ops notifications (the five that deep-link to `/ops/*`) go quiet for tenants with `station-ops` off; event-workspace notifications (`notifyStaffAssignment`, `notifyStaffScheduleChange`, `notifyScheduleChange`, links to `/events/[id]`) are NOT gated because the event workspace is Tier 0

- [ ] In `lib/notifications/triggers.ts`, add the import below the existing imports (the file is `'use server'`; keep the directive first):

```ts
import { isModuleEnabledForTenant } from '@/lib/billing/module-guard'
```

- [ ] In each of the five functions (`notifyTaskAssigned`, `notifyOrderReady`, `notifyDeliveryReceived`, `notifyLowStock`, `notifyGuestComp`), insert this as the first statement inside the `try {` block (for `notifyOrderReady`, insert it after the existing tenant-mismatch check at lines 171-176, inside the `try`):

```ts
// Restaurant ops module gate (rescue blueprint Phase C item 2): these
// alerts deep-link into /ops/* surfaces. Tenants with the module off
// get no ops notifications. Event-workspace alerts are not gated.
if (!(await isModuleEnabledForTenant(tenantId, 'station-ops'))) return
```

- [ ] Dead `/finances` push URL: this one-string fix is ALSO owned by WS1 Task 11 (`docs/specs/rescue/2026-07-10-rescue-ws1-security.md`), which keeps it. First check whether it already landed: `grep -rn "'/finances'" lib app --include=*.ts --include=*.tsx`. If that returns ZERO hits, WS1 Task 11 shipped it: skip this substep and drop `lib/notifications/onesignal.ts` from this task's commit. If it returns the one hit at `lib/notifications/onesignal.ts:130`, apply the same fix here: change

```ts
    url: '/finances',
```

to

```ts
    url: '/finance',
```

- [ ] Verify the gate coverage is exactly five functions and the two `/events/` triggers are untouched: `grep -n "isModuleEnabledForTenant" lib/notifications/triggers.ts` must return exactly 6 hits (1 import + 5 calls)
- [ ] Verify no dead `/finances` links remain (regardless of which workstream fixed it): `grep -rn "'/finances'" lib app --include=*.ts --include=*.tsx` returns zero hits
- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck`
- [ ] Commit: `git add lib/notifications/triggers.ts lib/notifications/onesignal.ts && git commit -m "feat: ops notification triggers respect station-ops module; fix dead /finances push URL"` (drop `lib/notifications/onesignal.ts` from the stage list and the message tail if WS1 Task 11 already shipped the URL fix)

---

### Task 7: Declare receipts the primary price source [CODEX-SAFE] [TDD-EXEMPT: documentation]

**Files:**

- Modify: `CONTEXT.md` (append one glossary entry)
- Modify: `docs/CLAUDE-DOMAINS.md` (annotate the `openclaw` domain row)

**Interfaces:** none (documentation contract; the code half of this declaration is the `lib/openclaw/config.ts` header comment shipped in Task 3 and the default-off `market-prices` module shipped in Task 1).

- [ ] Append to `CONTEXT.md`, under its glossary/terms area (or at the end if no such section exists), exactly:

```md
## Price sources

**Primary price source: receipts.** A chef's own scanned receipts produce the
prices that feed recipe costing, the live menu cost ticker, and the quote-send
guard. Post-purchase receipt data is 100 percent accurate for that chef.
**Market Prices** (the OpenClaw regional catalog) is an optional enhancement:
a named module, off by default, that adds regional price context and trend
alerts when enabled and when its data endpoints are configured via
`lib/openclaw/config.ts`. No floor feature may depend on Market Prices being
on. (Decided in docs/discovery/2026-07-10-chefflow-rescue-blueprint.md,
Section 10 item 7 and Section 11.)
```

- [ ] In `docs/CLAUDE-DOMAINS.md`, find the row or entry describing the `openclaw` lib domain (search `openclaw`) and append to its Purpose text: `Contained module (Market Prices, default off). Receipts are the primary price source; every network endpoint resolves through lib/openclaw/config.ts.` If no row exists, add one to the most fitting section using the same table shape as its neighbors.
- [ ] Verification: `grep -n "Primary price source" CONTEXT.md` returns 1 hit; `grep -n "config.ts" docs/CLAUDE-DOMAINS.md` returns at least 1 hit
- [ ] Commit: `git add CONTEXT.md docs/CLAUDE-DOMAINS.md && git commit -m "docs: declare receipts the primary price source; Market Prices is a contained module"`

---

### Task 8: lib/circles fold into lib/hub; four lib name twins bridged [OPUS-ONLY]

**GATE (owner, architecture review):** Approve (a) lib/hub as the canonical home for circle primitives with lib/circles bridged as WIP, and (b) the canonical pick per twin pair below. Blueprint recommended default: proceed as written (Section 6, Relationships cluster and Lib name twins row). Builders skip this task until the gate is marked approved.

**Files:**

- Modify: `lib/circles/index.ts` (header comment only, additive)
- Create: `lib/hub/circles-unified.ts`
- Create: `lib/commitment/commitments-bridge.ts`
- Create: `lib/workflows/workflow-bridge.ts`
- Create: `lib/interactions/interaction-bridge.ts`
- Create: `lib/locations/location-bridge.ts`
- Modify: `docs/CLAUDE-DOMAINS.md` (five records)

**Interfaces:**

- Consumes: existing exports of `lib/circles/index.ts`, `lib/commitments/*`, `lib/workflow/*`, `lib/interaction/*`, `lib/location/*`
- Produces: namespace re-exports so all future imports use one canonical namespace per domain. No file is deleted, moved, or renamed anywhere in this task.

**Evidence for the review (verified 2026-07-10):**

| Pair                                                                                                                                                                          | Files                                                                                                                                                                                             | Verdict                                    | Canonical                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------- |
| `lib/commitment` (50+ files) vs `lib/commitments` (9)                                                                                                                         | Genuine overlap: cooling-off and portfolios exist in BOTH (`commitment/cooling-off.ts` vs `commitments/cooling-off-actions.ts`; `commitment/portfolios.ts` vs `commitments/portfolio-actions.ts`) | True twin                                  | `lib/commitment`                    |
| `lib/workflow` (5 files: actions, confirmed-facts, preparable-actions, stage-definitions, types) vs `lib/workflows` (engine, definitions, actions, types)                     | Overlapping concern (workflow stages vs workflow engine)                                                                                                                                          | Near twin                                  | `lib/workflows`                     |
| `lib/interaction` (18 files, all UI preference actions: consent, density, shortcuts, inline-edit) vs `lib/interactions` (registry/execute engine with permissions and schema) | Semantically distinct domains sharing a confusing name                                                                                                                                            | Not a twin; bridge plus doc disambiguation | `lib/interactions` hosts the bridge |
| `lib/location` (account/user location, core) vs `lib/locations` (Multi-Location module actions)                                                                               | Semantically distinct                                                                                                                                                                             | Not a twin; bridge plus doc disambiguation | `lib/locations` hosts the bridge    |

- [ ] Add this header comment to the top of `lib/circles/index.ts` (above the first existing line; change nothing else in the file):

```ts
// STATUS: unwired WIP (zero importers anywhere in app/, components/, or lib/
// as of 2026-07-10; rescue blueprint Section 6, Relationships cluster).
// Canonical home for circle primitives is lib/hub (81 files, 199 importers).
// New code imports from lib/hub, including the bridge at
// lib/hub/circles-unified.ts. Do not delete or move these files.
```

- [ ] Create `lib/hub/circles-unified.ts`:

```ts
// lib/hub/circles-unified.ts
// Alias bridge (rescue blueprint Section 6): lib/circles is unwired
// work-in-progress whose thesis belongs to the hub domain. New code imports
// circle primitives from lib/hub, never from lib/circles directly.
// No lib/circles file is deleted or moved.
export * from '@/lib/circles'
```

- [ ] Create `lib/commitment/commitments-bridge.ts`:

```ts
// lib/commitment/commitments-bridge.ts
// Alias bridge: lib/commitments overlaps lib/commitment (cooling-off and
// portfolios exist in both). lib/commitment is canonical. The lib/commitments
// files stay in place; new code imports through this bridge.
export * as coolingOffActions from '@/lib/commitments/cooling-off-actions'
export * as coolingOffTypes from '@/lib/commitments/cooling-off-types'
export * as delegationTypes from '@/lib/commitments/delegation-types'
export * as portfolioActions from '@/lib/commitments/portfolio-actions'
export * as portfolioTypes from '@/lib/commitments/portfolio-types'
export * as remyMonthlyTypes from '@/lib/commitments/remy-monthly-types'
export * as sayNoActions from '@/lib/commitments/say-no-actions'
export * as witnessActions from '@/lib/commitments/witness-actions'
export * as witnessTypes from '@/lib/commitments/witness-types'
```

- [ ] Create `lib/workflows/workflow-bridge.ts`:

```ts
// lib/workflows/workflow-bridge.ts
// Alias bridge: lib/workflow (lifecycle stage definitions and preparable
// actions) is reachable from the canonical lib/workflows namespace.
// The lib/workflow files stay in place.
export * as stageActions from '@/lib/workflow/actions'
export * as confirmedFacts from '@/lib/workflow/confirmed-facts'
export * as preparableActions from '@/lib/workflow/preparable-actions'
export * as stageDefinitions from '@/lib/workflow/stage-definitions'
export * as stageTypes from '@/lib/workflow/types'
```

- [ ] Create `lib/interactions/interaction-bridge.ts`:

```ts
// lib/interactions/interaction-bridge.ts
// Disambiguation bridge: lib/interaction (singular) is UI preference actions
// (consent, density, shortcuts, inline edit); lib/interactions (plural) is
// the interaction registry and execution engine. They are distinct domains
// that share a confusing name. This bridge makes the singular domain
// reachable from the plural namespace so nobody places code in the wrong one.
export * as consentActions from '@/lib/interaction/consent-actions'
export * as continuityActions from '@/lib/interaction/continuity-actions'
export * as densityActions from '@/lib/interaction/density-actions'
export * as fixtureActions from '@/lib/interaction/fixture-actions'
export * as inlineEditActions from '@/lib/interaction/inline-edit-actions'
export * as memorySearchActions from '@/lib/interaction/memory-search-actions'
export * as notificationPrefsActions from '@/lib/interaction/notification-prefs-actions'
export * as progressTrackerActions from '@/lib/interaction/progress-tracker-actions'
export * as shortcutActions from '@/lib/interaction/shortcut-actions'
```

- [ ] Create `lib/locations/location-bridge.ts`:

```ts
// lib/locations/location-bridge.ts
// Disambiguation bridge: lib/location (singular) is account and user
// location (core, powers radius features); lib/locations (plural) is the
// Multi-Location module. Distinct domains, confusing names. This bridge
// makes the singular domain reachable from the plural namespace.
export * as accountLocation from '@/lib/location/account-location'
export * as locationActions from '@/lib/location/location-actions'
export * as serverLocation from '@/lib/location/server-location'
export * as userLocation from '@/lib/location/user-location'
```

(Deliberately excludes `lib/location/use-user-location.ts` and `public-location-cookie.ts`: client-side hooks must not be re-exported through a namespace that server code imports.)

- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck`. Known risk: namespace re-export of `'use server'` modules can trip the Next compiler even when tsc passes. Also run `npx next build --no-lint` and time it (log to `docs/build-times.log`). If the build rejects a bridge over server-action re-export rules, convert that bridge's offending lines to type-only exports plus a comment naming the direct import path, and record the limitation in `docs/CLAUDE-DOMAINS.md`.
- [ ] Append to `docs/CLAUDE-DOMAINS.md`, in a new subsection titled `### Name twins and bridges (rescue WS4)`:

```md
| Canonical          | Bridged                                      | Mechanism                                | Note                                                                      |
| ------------------ | -------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| `lib/hub`          | `lib/circles` (5 files, WIP, zero importers) | `lib/hub/circles-unified.ts`             | Import circle primitives from lib/hub                                     |
| `lib/commitment`   | `lib/commitments` (9 files)                  | `lib/commitment/commitments-bridge.ts`   | True twin; cooling-off and portfolios existed in both                     |
| `lib/workflows`    | `lib/workflow` (5 files)                     | `lib/workflows/workflow-bridge.ts`       | Engine vs stage definitions                                               |
| `lib/interactions` | `lib/interaction` (18 files)                 | `lib/interactions/interaction-bridge.ts` | Distinct domains: engine vs UI prefs. Do not merge                        |
| `lib/locations`    | `lib/location` (6 files)                     | `lib/locations/location-bridge.ts`       | Distinct domains: Multi-Location module vs account location. Do not merge |
```

- [ ] Commit: `git add lib/circles/index.ts lib/hub/circles-unified.ts lib/commitment/commitments-bridge.ts lib/workflows/workflow-bridge.ts lib/interactions/interaction-bridge.ts lib/locations/location-bridge.ts docs/CLAUDE-DOMAINS.md && git commit -m "refactor: alias bridges for lib/circles and the four lib name twins"`

---

### Task 9: Write the receipt intake unification spec outline [OPUS-ONLY] [TDD-EXEMPT: documentation]

The unification BUILD is gated on this spec (blueprint Phase C: "Queued, own spec; touches the costing mandate"). Writing the outline is not gated; do it now so the gate has something to review. Do not change any code in this task.

**Files:**

- Create: `docs/specs/receipt-intake-unification.md`

**Interfaces:** none (spec document).

- [ ] Create `docs/specs/receipt-intake-unification.md` with exactly this outline (fill each section from the named files, do not invent behavior):

```md
# Receipt Intake Unification (spec outline; build is gated on approval)

Status: OUTLINE for review. The build does not start until this spec is
approved (rescue blueprint Phase C, receipt row). Receipts are the primary
price source (CONTEXT.md, Price sources), so changes here sit directly under
the automated food costing mandate.

## 1. Current inventory (the triplication)

- lib/receipts (canonical candidate, 8 files): actions.ts,
  batch-upload-actions.ts, bulk-actions.ts, client-receipt-actions.ts,
  image-quality-check.ts, library-actions.ts, quick-capture.ts,
  receipt-learning.ts
- lib/expenses (receipt entanglement, 2 of 6 files): receipt-actions.ts,
  receipt-upload.ts
- lib/shopping (receipt entanglement, 2 of 3 files): receipt-actions.ts,
  receipt-types.ts
- For each file: list its exports, its importers (grep), and which DB tables
  it writes.

## 2. Invariants that must survive

- Receipt snap stays reachable in two taps from Today (blueprint Section 7
  panel 5).
- Post-purchase price accuracy: a saved receipt line updates ingredient
  prices exactly once (no double-count through two intake paths).
- lib/receipts/actions.ts:434 remains the costing chain entry point cited by
  the blueprint (Section 2, what works).
- No file is deleted. Non-canonical files become alias re-exports of
  lib/receipts.

## 3. Target shape

- lib/receipts owns parse, store, price-bridge, and learning.
- lib/expenses/receipt-\*.ts re-export from lib/receipts; expense attribution
  stays in lib/expenses.
- lib/shopping/receipt-\*.ts re-export from lib/receipts; shopping-specific
  types move behind an alias.

## 4. Migration plan (all additive)

- Step order, one reviewable commit per step, alias-first, callers moved
  domain by domain.

## 5. Test plan

- Unit: one parser/normalizer test per intake path before touching it.
- E2E: receipt snap through price update through recipe cost refresh on
  http://localhost:3100 with the agent account.
- Update docs/test-coverage-blueprint.md rows for every touched path.

## 6. Open questions for the owner

- Does client-receipt-actions.ts (client-submitted receipts) stay in scope?
- Which of the three upload UIs is the front door?
```

- [ ] Verification: file exists and renders as valid markdown; `grep -c "^## " docs/specs/receipt-intake-unification.md` returns `6`
- [ ] Commit: `git add docs/specs/receipt-intake-unification.md && git commit -m "docs: receipt intake unification spec outline (build gated on approval)"`

---

### Task 10: Combined read view over the two schedule-block tables [CODEX-SAFE]

**GATE (owner, queued):** Blueprint Phase C marks this row Queued. Recommended default: approve; it is read-only, additive, and requires no migration (the blueprint's write-set is `lib/scheduling, lib/availability` only). Builders skip until approved.

**Files:**

- Create: `lib/scheduling/combined-blocks-core.ts` (pure normalization)
- Create: `lib/scheduling/combined-blocks.ts` (server read)
- Create: `tests/unit/combined-blocks-core.test.ts`

**Interfaces:**

- Consumes: table `chef_availability_blocks` (`lib/db/schema/schema.ts:4543-4556`: `block_date date`, `block_type text default 'full_day'`, `start_time time`, `end_time time`, `reason`, `event_id`) and table `chef_schedule_blocks` (`database/migrations/20260426000001_chef_schedule_blocks.sql:6-24`: `title`, `block_type`, `start_at timestamptz`, `end_at timestamptz`, `all_day`, `notes`)
- Produces: `getCombinedTimeBlocks(rangeStart: string, rangeEnd: string): Promise<CombinedTimeBlock[]>` where `CombinedTimeBlock = { id, source: 'availability_block' | 'schedule_block', title, blockType, startAt, endAt, allDay, eventId, notes }`
- **No migration. No SQL view. No data touched.** The combination happens in TypeScript at read time.

- [ ] Write the failing test at `tests/unit/combined-blocks-core.test.ts`:

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeAvailabilityBlock,
  normalizeScheduleBlock,
  mergeChronologically,
} from '@/lib/scheduling/combined-blocks-core'

describe('normalizeAvailabilityBlock', () => {
  it('maps a timed block onto the block date', () => {
    const block = normalizeAvailabilityBlock({
      id: 'a1',
      block_date: '2026-07-12',
      block_type: 'partial',
      start_time: '14:00:00',
      end_time: '18:00:00',
      reason: 'School pickup',
      event_id: null,
    })
    assert.equal(block.source, 'availability_block')
    assert.equal(block.startAt, '2026-07-12T14:00:00')
    assert.equal(block.endAt, '2026-07-12T18:00:00')
    assert.equal(block.allDay, false)
    assert.equal(block.title, 'School pickup')
  })

  it('treats full_day and missing times as all-day', () => {
    const block = normalizeAvailabilityBlock({
      id: 'a2',
      block_date: '2026-07-13',
      block_type: 'full_day',
      start_time: null,
      end_time: null,
      reason: null,
      event_id: 'e9',
    })
    assert.equal(block.allDay, true)
    assert.equal(block.startAt, '2026-07-13T00:00:00')
    assert.equal(block.endAt, '2026-07-13T23:59:59')
    assert.equal(block.title, 'Unavailable')
    assert.equal(block.eventId, 'e9')
  })
})

describe('normalizeScheduleBlock', () => {
  it('passes timestamps through and keeps notes', () => {
    const block = normalizeScheduleBlock({
      id: 's1',
      title: 'Restaurant shift',
      block_type: 'external_shift',
      start_at: '2026-07-12T09:00:00+00:00',
      end_at: '2026-07-12T17:00:00+00:00',
      all_day: false,
      notes: 'Front kitchen',
    })
    assert.equal(block.source, 'schedule_block')
    assert.equal(block.startAt, '2026-07-12T09:00:00+00:00')
    assert.equal(block.notes, 'Front kitchen')
    assert.equal(block.eventId, null)
  })
})

describe('mergeChronologically', () => {
  it('sorts by start ascending without mutating input', () => {
    const a = normalizeScheduleBlock({
      id: 's-late',
      title: 'Late',
      block_type: 'personal',
      start_at: '2026-07-12T20:00:00',
      end_at: '2026-07-12T21:00:00',
      all_day: false,
      notes: null,
    })
    const b = normalizeScheduleBlock({
      id: 's-early',
      title: 'Early',
      block_type: 'personal',
      start_at: '2026-07-12T06:00:00',
      end_at: '2026-07-12T07:00:00',
      all_day: false,
      notes: null,
    })
    const input = [a, b]
    const merged = mergeChronologically(input)
    assert.equal(merged[0].id, 's-early')
    assert.equal(input[0].id, 's-late')
  })
})
```

- [ ] Run it and see it fail: `node --test --import tsx tests/unit/combined-blocks-core.test.ts` (expected: module resolution error)
- [ ] Create `lib/scheduling/combined-blocks-core.ts`:

```ts
// lib/scheduling/combined-blocks-core.ts
// Pure normalization for the combined read over the two time-block tables
// (rescue blueprint Section 6, Time cluster). chef_availability_blocks is
// date-plus-time-of-day; chef_schedule_blocks is timestamptz ranges. This
// module folds both into one shape. Read-only: neither table changes.

export type CombinedTimeBlock = {
  id: string
  source: 'availability_block' | 'schedule_block'
  title: string
  blockType: string
  startAt: string
  endAt: string
  allDay: boolean
  eventId: string | null
  notes: string | null
}

export type AvailabilityBlockRow = {
  id: string
  block_date: string
  block_type: string
  start_time: string | null
  end_time: string | null
  reason: string | null
  event_id: string | null
}

export type ScheduleBlockRow = {
  id: string
  title: string
  block_type: string
  start_at: string
  end_at: string
  all_day: boolean
  notes: string | null
}

export function normalizeAvailabilityBlock(row: AvailabilityBlockRow): CombinedTimeBlock {
  const isFullDay = row.block_type === 'full_day' || !row.start_time || !row.end_time
  return {
    id: row.id,
    source: 'availability_block',
    title: row.reason || 'Unavailable',
    blockType: row.block_type,
    startAt: isFullDay ? `${row.block_date}T00:00:00` : `${row.block_date}T${row.start_time}`,
    endAt: isFullDay ? `${row.block_date}T23:59:59` : `${row.block_date}T${row.end_time}`,
    allDay: isFullDay,
    eventId: row.event_id,
    notes: null,
  }
}

export function normalizeScheduleBlock(row: ScheduleBlockRow): CombinedTimeBlock {
  return {
    id: row.id,
    source: 'schedule_block',
    title: row.title || 'Blocked',
    blockType: row.block_type,
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: row.all_day,
    eventId: null,
    notes: row.notes,
  }
}

export function mergeChronologically(blocks: CombinedTimeBlock[]): CombinedTimeBlock[] {
  return [...blocks].sort((a, b) => a.startAt.localeCompare(b.startAt))
}
```

- [ ] Run the test and see it pass: `node --test --import tsx tests/unit/combined-blocks-core.test.ts`
- [ ] Create `lib/scheduling/combined-blocks.ts`:

```ts
'use server'

// lib/scheduling/combined-blocks.ts
// One read for "when is this chef busy": merges chef_availability_blocks and
// chef_schedule_blocks at read time. No migration, no writes, no data moved.
// Tenant scoping matches lib/scheduling/schedule-block-actions.ts (chef_id =
// user.tenantId).

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  mergeChronologically,
  normalizeAvailabilityBlock,
  normalizeScheduleBlock,
  type CombinedTimeBlock,
} from './combined-blocks-core'

/**
 * All time blocks for the current chef between rangeStart and rangeEnd
 * (ISO timestamps), both tables, chronological. On a partial read failure
 * the successful side still returns; errors are logged, never masked as
 * an empty calendar without a log line.
 */
export async function getCombinedTimeBlocks(
  rangeStart: string,
  rangeEnd: string
): Promise<CombinedTimeBlock[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const [avail, sched] = await Promise.all([
    db
      .from('chef_availability_blocks')
      .select('id, block_date, block_type, start_time, end_time, reason, event_id')
      .eq('chef_id', user.tenantId!)
      .gte('block_date', rangeStart.slice(0, 10))
      .lte('block_date', rangeEnd.slice(0, 10))
      .order('block_date', { ascending: true }),
    db
      .from('chef_schedule_blocks')
      .select('id, title, block_type, start_at, end_at, all_day, notes')
      .eq('chef_id', user.tenantId!)
      .gte('start_at', rangeStart)
      .lte('end_at', rangeEnd)
      .order('start_at', { ascending: true }),
  ])

  if (avail.error) console.error('[combined-blocks] availability read failed', avail.error)
  if (sched.error) console.error('[combined-blocks] schedule read failed', sched.error)

  return mergeChronologically([
    ...((avail.data ?? []) as any[]).map(normalizeAvailabilityBlock),
    ...((sched.data ?? []) as any[]).map(normalizeScheduleBlock),
  ])
}
```

- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck`
- [ ] Add rows to `docs/test-coverage-blueprint.md`: `combined-blocks-core` COVERED via `tests/unit/combined-blocks-core.test.ts`; `combined-blocks` NEEDS-TEST (server read, no consumer yet; first consumer wires a probe)
- [ ] Record in `docs/CLAUDE-DOMAINS.md` under the scheduling domain: `combined-blocks: single read over chef_availability_blocks + chef_schedule_blocks; consumers should prefer it over querying either table alone.`
- [ ] Commit: `git add lib/scheduling/combined-blocks-core.ts lib/scheduling/combined-blocks.ts tests/unit/combined-blocks-core.test.ts docs/test-coverage-blueprint.md docs/CLAUDE-DOMAINS.md && git commit -m "feat: combined read over the two schedule-block tables (no migration)"`

---

### Task 11: Labs per-area gate keys and experimental banners [CODEX-SAFE]

**Coordination, read before starting:**

- **The Labs MASTER switch is `labs_experiments`, owned by WS2 Task 6** (`docs/specs/rescue/2026-07-10-rescue-ws2-phase-a-reorganize.md`); WS2 Tasks 6 and 8 wire the nav tier filter and the /tables mobile tab to it. This task mints NO master switch (an earlier draft's `labs_enabled` key is deleted: two rival master switches means a chef flipping one sees nothing change). The six per-area keys below are RESERVED, additive, and currently unconsumed; they exist so a later pass can gate one Labs area independently, and any such pass must treat `labs_experiments` as the master that gates them all.
- The god-mode demo banner may already have shipped under WS1 Task 9 (`docs/specs/rescue/2026-07-10-rescue-ws1-security.md`). Before the god-mode step, run `grep -n "Sample data\|sample numbers" "app/(chef)/events/[id]/god-mode/page.tsx"`; if it returns a hit, the WS1 banner landed: skip that single step (do not stack two banners). Do not use git-log greps for this check; the source file is the truth.

**Files:**

- Modify: `lib/feature-gates/gate-registry.ts` (append before the closing `} as const` at line 118)
- Create: `tests/unit/labs-gates.test.ts`
- Create: `components/labs/experimental-banner.tsx`
- Modify: `app/(chef)/cannabis/layout.tsx` (return statement at line 16)
- Modify: `app/(chef)/explore/layout.tsx` (single-line body)
- Create: `app/(chef)/network/layout.tsx`
- Create: `app/(chef)/community/layout.tsx`
- Modify: `app/(chef)/pie-cart/page.tsx` (hardcoded plan at lines 11-27)
- Modify: `app/(chef)/events/[id]/god-mode/page.tsx` (demo literals at lines 25-67; header renders at lines 81-90)

**Interfaces:**

- Consumes: `gate()` helper (`gate-registry.ts:6-14`), existing `chef_feature_flags` override machinery in `gate-check.ts` (a Labs flag is turned on per account by inserting a `chef_feature_flags` row; no new table)
- Produces: RESERVED per-area gate keys `labs_cannabis`, `labs_network`, `labs_community`, `labs_explore`, `labs_tables`, `labs_pie_cart`, all `tier: 'free'`, all `defaultEnabled: false`, all currently unconsumed (the master switch is WS2's `labs_experiments`); `ExperimentalBanner` component. Note: `app/(chef)/tables/page.tsx` EXISTS (verified 2026-07-10); the `/tables` route's nav containment still belongs to WS2 Task 8 with the mobile-tab sign-off (blueprint open question 4), and `labs_tables` stays a reserved key only

- [ ] Write the failing test at `tests/unit/labs-gates.test.ts`:

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { GATE_REGISTRY } from '@/lib/feature-gates/gate-registry'

// Per-area Labs keys (reserved; unconsumed until a later pass). The Labs
// MASTER switch is labs_experiments, owned by the WS2 nav workstream.
const LABS_KEYS = [
  'labs_cannabis',
  'labs_network',
  'labs_community',
  'labs_explore',
  'labs_tables',
  'labs_pie_cart',
] as const

describe('Labs gate keys (rescue WS4)', () => {
  it('the master switch labs_experiments exists (WS2 Task 6)', () => {
    const master = (GATE_REGISTRY as Record<string, any>)['labs_experiments']
    assert.ok(master, 'labs_experiments missing; WS2 Task 6 has not landed')
    assert.equal(master.defaultEnabled, false)
  })

  for (const key of LABS_KEYS) {
    it(`${key} exists, is free-tier, and is off by default`, () => {
      const def = (GATE_REGISTRY as Record<string, any>)[key]
      assert.ok(def, `${key} missing from GATE_REGISTRY`)
      assert.equal(def.tier, 'free')
      assert.equal(def.defaultEnabled, false)
    })
  }
})
```

- [ ] Run it and see it fail: `node --test --import tsx tests/unit/labs-gates.test.ts` (expected: `labs_cannabis missing from GATE_REGISTRY`; if the master-switch assertion is what fails, WS2 Task 6 has not landed, stop and wait)
- [ ] In `lib/feature-gates/gate-registry.ts`, insert before the closing `} as const`:

```ts
  // --- Labs per-area keys (experimental; off by default, per-account opt-in
  // via chef_feature_flags; hidden from the default module gallery).
  // RESERVED and currently unconsumed: the Labs MASTER switch is
  // labs_experiments (registered by the WS2 nav workstream), which gates all
  // Labs visibility. Any future per-area gating must check labs_experiments
  // AND the area key, never the area key alone. ---
  labs_cannabis: gate(
    'labs_cannabis',
    'Cannabis Events',
    'free',
    'Cannabis dinner vertical (experimental)',
    false
  ),
  labs_network: gate(
    'labs_network',
    'Chef Network',
    'free',
    'Chef-to-chef connections and collaboration (experimental)',
    false
  ),
  labs_community: gate(
    'labs_community',
    'Community',
    'free',
    'Chef community directory and mentorship (experimental)',
    false
  ),
  labs_explore: gate(
    'labs_explore',
    'Explore',
    'free',
    'Consumer discovery preview inside the chef portal (experimental)',
    false
  ),
  labs_tables: gate(
    'labs_tables',
    'Tables',
    'free',
    'Social dining zone (experimental)',
    false
  ),
  labs_pie_cart: gate(
    'labs_pie_cart',
    'Predictive Cart',
    'free',
    'Predictive shopping cart preview (experimental; sample data)',
    false
  ),
```

- [ ] Run the test and see it pass: `node --test --import tsx tests/unit/labs-gates.test.ts`
- [ ] Create `components/labs/experimental-banner.tsx`:

```tsx
// components/labs/experimental-banner.tsx
// Shown at the top of every experimental surface. Pages always resolve
// (rescue blueprint Section 4 item 5); this label is what marks them.
// Never uses internal tier vocabulary in chef-facing copy.

export function ExperimentalBanner({ area, note }: { area: string; note?: string }) {
  return (
    <div
      role="note"
      className="mb-4 rounded-md border border-amber-600/40 bg-amber-950/30 px-4 py-2 text-sm text-amber-200"
    >
      <span className="font-medium">{area}</span> is an experimental feature and may change without
      notice.{note ? ` ${note}` : ''}
    </div>
  )
}
```

- [ ] In `app/(chef)/cannabis/layout.tsx`, change the return at line 16 from `return <>{children}</>` to:

```tsx
return (
  <>
    <ExperimentalBanner area="Cannabis Events" />
    {children}
  </>
)
```

and add `import { ExperimentalBanner } from '@/components/labs/experimental-banner'` with the other imports.

- [ ] In `app/(chef)/explore/layout.tsx`, replace the whole file with:

```tsx
import { ExperimentalBanner } from '@/components/labs/experimental-banner'

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ExperimentalBanner area="Explore" />
      {children}
    </div>
  )
}
```

- [ ] Create `app/(chef)/network/layout.tsx`:

```tsx
import { ExperimentalBanner } from '@/components/labs/experimental-banner'

export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ExperimentalBanner area="Chef Network" />
      {children}
    </div>
  )
}
```

- [ ] Create `app/(chef)/community/layout.tsx`:

```tsx
import { ExperimentalBanner } from '@/components/labs/experimental-banner'

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ExperimentalBanner area="Community" />
      {children}
    </div>
  )
}
```

- [ ] In `app/(chef)/pie-cart/page.tsx`, add the banner as the first child of the page's outermost rendered element, with the sample-data note (Zero Hallucination: this page builds its plan from hardcoded literals at lines 11-27):

```tsx
<ExperimentalBanner
  area="Predictive Cart"
  note="This preview is built from sample data, not your ingredients."
/>
```

plus the import line. Change nothing else on the page.

- [ ] In `app/(chef)/events/[id]/god-mode/page.tsx` (SKIP this step if the coordination check's source grep found "Sample data" or "sample numbers" already in the file; WS1 Task 9 landed its banner and two banners must not stack), insert directly under the `<header>` open tag at line 81:

```tsx
<div
  role="note"
  className="mb-3 rounded-md border border-amber-600/40 bg-amber-950/30 px-4 py-2 text-sm text-amber-200"
>
  This packet is a demo preview built from sample numbers, not live event data.
</div>
```

(The page is auth-gated but computes its packet from literals at lines 25-67; the banner satisfies security finding 7's "banner it as demo" arm. Wiring it to real data is a separate, unplanned build.)

- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck`
- [ ] Playwright/browser probe on `http://localhost:3100` with the agent account: load `/explore` and `/network` and confirm the banner text "is an experimental feature" renders; load `/pie-cart` and confirm the sample-data note renders
- [ ] Add a row to `docs/test-coverage-blueprint.md`: Labs gate registry COVERED via `tests/unit/labs-gates.test.ts`
- [ ] Commit: `git add lib/feature-gates/gate-registry.ts tests/unit/labs-gates.test.ts components/labs "app/(chef)/cannabis/layout.tsx" "app/(chef)/explore/layout.tsx" "app/(chef)/network/layout.tsx" "app/(chef)/community/layout.tsx" "app/(chef)/pie-cart/page.tsx" "app/(chef)/events/[id]/god-mode/page.tsx" docs/test-coverage-blueprint.md && git commit -m "feat: Labs gate keys and experimental banners for tier 3 surfaces"`

---

### Task 12: Tier 4 documentation pass [CODEX-SAFE] [TDD-EXEMPT: documentation]

**Files:**

- Modify: `docs/CLAUDE-DOMAINS.md` (new WIP section)
- Modify: `lib/help/page-info-sections/12-chef-portal-leads-prospecting.ts` (descriptions only)
- Possibly modify other `lib/help/page-info-sections/*.ts` files found by the retired-name sweep below

**Interfaces:** none (docs and copy strings only; no route, export, or behavior changes).

- [ ] Run the zero-external-importer scan and save its output (this reproduces and refreshes the blueprint's "31 zero-ref lib domains" list):

```bash
cd /c/Users/david/Documents/CFv1
for d in lib/*/; do n=$(basename "$d"); c=$(grep -rl "@/lib/$n/" --include='*.ts' --include='*.tsx' app components middleware.ts lib 2>/dev/null | grep -v "^lib/$n/" | wc -l); echo "$c $n"; done | sort -n | awk '$1 == 0 {print $2}'
```

- [ ] Append a new section to `docs/CLAUDE-DOMAINS.md` titled `## WIP / unwired domains (rescue WS4, 2026-07-10)` containing: an intro sentence (`These domains have zero importers outside their own directory. They are work-in-progress, not dead code. Do not delete; do not export from new surfaces without a blueprint amendment.`), then one table row per domain from the scan output with columns Domain, Files (from `ls lib/<domain> | wc -l`), and Note. Seed the Note column for the six the blueprint already named: `interaction` (bridged in Task 8), `qa`, `commitments` (bridged in Task 8), `work-continuity`, `circles` (bridged in Task 8), `feature-gates` (re-check after Phase A item 4 wires consumers; drop from the list if it now has importers).
- [ ] In the same section, record the two Tier 4 shells this workstream documents (no route changes here; both already lack live pages):

```md
### Tier 4 parked routes recorded

| Route          | State                                                  | Canonical                      |
| -------------- | ------------------------------------------------------ | ------------------------------ |
| /team          | One page, stale since 2026-03-31, superseded by /staff | /staff (Team and Staff module) |
| /shopping-list | Empty scaffold, zero page.tsx, never committed         | /culinary/prep/shopping        |
```

- [ ] Sweep the help sections for names retired by blueprint Section 11: `grep -rn "Pipeline\|Price Intelligence\|Kitchen Ops\|Business Lines\|Growth\|Bulk Buy Optimizer\|Creative Tools" lib/help/page-info-sections/`. For each hit in a `title` or `description` string, replace the retired name with the final chef-facing name (Pipeline becomes Inquiries; Price Intelligence becomes Market Prices; Kitchen Ops becomes Restaurant Kitchen; Marketing and Growth becomes Marketing; Bulk Buy Optimizer becomes Bulk Buying; Creative Tools becomes Idea Board; Business Lines becomes Meal Prep or Consulting depending on which the entry describes). Do NOT change any route-path keys (the `'/leads'`-style object keys): keys are contracts with live URLs and only change when the underlying route shells, which is other workstreams' Phase A item 9 work.
- [ ] In `12-chef-portal-leads-prospecting.ts`, update the `'/leads'` entry description from `'Contact form submissions from your website - claim and convert to inquiries.'` to `'Contact form submissions from your website. Leads feed the Inquiries pipeline; claim one to convert it.'` (title stays `'Website Leads'`)
- [ ] Verification: `npx tsc --noEmit --skipLibCheck` (the help sections are typed TS); `grep -rn "Price Intelligence" lib/help/page-info-sections/` returns zero hits
- [ ] Commit: `git add docs/CLAUDE-DOMAINS.md lib/help/page-info-sections && git commit -m "docs: record WIP lib domains and tier 4 parked routes; retire old names in help copy"`

---

### Task 13: Status-as-page routes to URL params: redirect contract plus worked example [OPUS-ONLY]

**GATE (owner, queued):** Blueprint Phase C marks this Queued (pre-approved in the nav audit at :1025 and :1142, but the conversion wave needs owner scheduling). Recommended default: approve the contract and the inquiries cluster now; schedule events, leads, and invoices clusters after. Builders skip until approved.

**The redirect contract (applies to every conversion in this task and any future wave):**

1. Every old status URL keeps resolving via `redirect()` (temporary semantics, the exact pattern of `app/(chef)/quotes/sent/page.tsx`, which is the finished in-repo precedent: the whole quotes cluster of 6 status pages already converted this way). Nothing 404s.
2. The target is the cluster root with a `?status=` param the root page actually filters on. If the root does not filter on that value yet, the conversion adds the filter value additively first.
3. The old page's bespoke body is parked as a live unrouted file in the same directory before page.tsx is rewritten (never-delete rule; blueprint Tier 4 live-component preservation).
4. `loading.tsx` files stay where they are.
5. Each conversion is recorded in `docs/CLAUDE-DOMAINS.md`, and any pathname-keyed system (Rail pageAffinity, remy-starters, smart-suggestions, help sections, pins/recents) resolves through the Phase A item 9 route-alias map once that map exists; until it exists, add the old-to-new pair to the conversion record so the map task picks it up.
6. Metadata titles are preserved on the redirect file so bookmarks keep their names.

**Worked example in full: `/inquiries/declined`**

**Files:**

- Modify: `app/(chef)/inquiries/page.tsx` (type union at line 65)
- Create: `app/(chef)/inquiries/declined/legacy-declined-list.tsx` (parked copy)
- Modify: `app/(chef)/inquiries/declined/page.tsx` (becomes the redirect)
- Modify: `docs/CLAUDE-DOMAINS.md` (conversion record)

**Interfaces:**

- Consumes: root page filter branch at `app/(chef)/inquiries/page.tsx:97-101` (the generic branch `inquiries.filter((i) => i.status === filter)` already filters any exact status string at runtime; only the TS union needs the new member)
- Produces: `GET /inquiries/declined` responds 307 with `location: /inquiries?status=declined`; that target lists exactly the inquiries with status `declined`

- [ ] In `app/(chef)/inquiries/page.tsx`, extend the `InquiryFilter` union at line 65 by adding one member after `'closed'`:

```ts
  | 'declined'
```

(Runtime behavior is already correct: `'declined'` is not `'all'` and not `'closed'`, so it flows into the exact-match branch at line 100. The old status page filtered exactly `i.status === 'declined'`, so behavior is preserved, unlike mapping onto `'closed'`, which also includes `expired`.)

- [ ] Park the old page body: copy the current contents of `app/(chef)/inquiries/declined/page.tsx` to `app/(chef)/inquiries/declined/legacy-declined-list.tsx`, then in the copy (a) delete the `export const metadata` line and (b) rename `export default async function DeclinedInquiriesPage()` to `export async function LegacyDeclinedInquiriesList()`. The file is unrouted (not named page.tsx) and stays live in the tree.
- [ ] Replace the contents of `app/(chef)/inquiries/declined/page.tsx` with:

```tsx
// Thin redirect: /inquiries/declined -> /inquiries?status=declined
// Kept for backwards compatibility with bookmarks and links
// (same pattern as app/(chef)/quotes/sent/page.tsx; old body parked live
// in ./legacy-declined-list.tsx per the never-delete rule)
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Declined Inquiries' }

export default function DeclinedInquiriesPage() {
  redirect('/inquiries?status=declined')
}
```

- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck`
- [ ] Verify the redirect against the canonical dev server (requires `E2E_ALLOW_TEST_AUTH=true` in `.env.local`, already present per blueprint Section 9 finding 5):

```bash
node -e "
(async () => {
  const { email, password } = require('./.auth/agent.json');
  const auth = await fetch('http://localhost:3100/api/e2e/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
    body: JSON.stringify({ email, password }),
  });
  // getSetCookie() keeps each Set-Cookie header separate; get('set-cookie')
  // would join them with ', ' and keep attributes (Path, Expires with commas),
  // corrupting the forwarded session token.
  const cookie = auth.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const res = await fetch('http://localhost:3100/inquiries/declined', {
    headers: { cookie },
    redirect: 'manual',
  });
  console.log(res.status, res.headers.get('location'));
})();
"
```

Expected output: `307 /inquiries?status=declined` (a `303` is also acceptable; anything `404` or `200` is a failure). Then load `http://localhost:3100/inquiries?status=declined` in the browser with the agent session and confirm the list shows only declined inquiries and the page's empty state (never a fake zero) when there are none.

- [ ] Record the conversion in `docs/CLAUDE-DOMAINS.md` under a `### Status-route conversions (rescue WS4)` heading: `| /inquiries/declined | /inquiries?status=declined | body parked at app/(chef)/inquiries/declined/legacy-declined-list.tsx | 2026-07-10 |`
- [ ] Commit: `git add "app/(chef)/inquiries/page.tsx" "app/(chef)/inquiries/declined" docs/CLAUDE-DOMAINS.md && git commit -m "refactor: /inquiries/declined becomes a param redirect; old body parked live"`

**The rest of the wave is split into per-cluster tasks 13B-13E below (one dispatch each, matching the per-cluster discipline of WS2's shell task). Each repeats the worked-example recipe with its own concrete files; each cluster is its own commit and independently rejectable.**

---

### Task 13B: Inquiries status cluster, remaining four routes [CODEX-SAFE]

**GATE (owner): covered by Task 13's gate (contract plus inquiries cluster recommended approved together).** Requires Task 13's worked example merged (the contract and the `InquiryFilter` extension pattern exist as precedent).

**Files:**

- Modify: `app/(chef)/inquiries/page.tsx` (extend the `InquiryFilter` union at line 65 only if a page's predicate maps to no existing member)
- Create: `app/(chef)/inquiries/awaiting-client-reply/legacy-awaiting-client-reply-list.tsx` (parked body)
- Modify: `app/(chef)/inquiries/awaiting-client-reply/page.tsx` (becomes the redirect)
- Create: `app/(chef)/inquiries/awaiting-response/legacy-awaiting-response-list.tsx`
- Modify: `app/(chef)/inquiries/awaiting-response/page.tsx`
- Create: `app/(chef)/inquiries/menu-drafting/legacy-menu-drafting-list.tsx`
- Modify: `app/(chef)/inquiries/menu-drafting/page.tsx`
- Create: `app/(chef)/inquiries/sent-to-client/legacy-sent-to-client-list.tsx`
- Modify: `app/(chef)/inquiries/sent-to-client/page.tsx`
- Modify: `docs/CLAUDE-DOMAINS.md` (four conversion rows)

`/inquiries/new` is EXCLUDED: it is the Quick Capture create form, not a status list. Never convert it.

**Steps (run the loop once per route, in the Files order):**

- [ ] Read the route's current `page.tsx` and write down its exact filter predicate (the `inquiries.filter(...)` expression or query clause). Map it to a root `InquiryFilter` value: use `awaiting_client` or `awaiting_chef` if the predicate matches those existing members' semantics; otherwise add ONE new additive union member to `app/(chef)/inquiries/page.tsx:65` named exactly after the status string the page filters on (the generic branch at :97-101 already filters any exact status string at runtime).
- [ ] Park the body: copy the current `page.tsx` contents to the cluster's `legacy-*-list.tsx` file; delete the `export const metadata` line; rename the default export to `Legacy<Name>List` as a named export (exact pattern of Task 13's worked example).
- [ ] Replace `page.tsx` with the worked example's redirect shape, substituting this route's status. Shown in full for the first route; repeat with the component name and status changed for the other three:

```tsx
// Thin redirect: /inquiries/awaiting-client-reply -> /inquiries?status=awaiting_client
// Kept for backwards compatibility with bookmarks and links
// (same pattern as app/(chef)/quotes/sent/page.tsx; old body parked live
// in ./legacy-awaiting-client-reply-list.tsx per the never-delete rule)
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Awaiting Client Reply' }

export default function AwaitingClientReplyPage() {
  redirect('/inquiries?status=awaiting_client')
}
```

(Use the status value the diagnosis step mapped, not this example's, if they differ.)

- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck`
- [ ] Probe each converted route with the Task 13 node session probe (same code, swapping the URL), expecting `307 /inquiries?status=<value>`; then load the target in the browser with the agent session and confirm the filtered list or its empty state renders (never a fake zero).
- [ ] Record all four conversions in `docs/CLAUDE-DOMAINS.md` under the `### Status-route conversions (rescue WS4)` heading, one row each in the worked example's format.
- [ ] Commit: `git add "app/(chef)/inquiries" docs/CLAUDE-DOMAINS.md && git commit -m "refactor: inquiries status pages become param redirects; bodies parked live"`

---

### Task 13C: Events status cluster, root filter plus six routes [OPUS-ONLY]

**GATE (owner): Task 13's gate, events cluster (recommended default: schedule after the inquiries cluster proves the recipe).** The events root page has NO `?status=` support today (verified 2026-07-10), so this cluster changes the root's behavior additively before any redirect exists; that is why it is OPUS-ONLY.

**Files:**

- Modify: `app/(chef)/events/page.tsx` (add `searchParams: { status?: string }` support, filter, and tab links; read the settled file first, follow the inquiries root pattern)
- Create + Modify (park body, then redirect, per route): `app/(chef)/events/awaiting-deposit/`, `app/(chef)/events/cancelled/`, `app/(chef)/events/completed/`, `app/(chef)/events/confirmed/`, `app/(chef)/events/current/`, `app/(chef)/events/upcoming/` (each gains `legacy-<name>-list.tsx` and its `page.tsx` becomes a redirect)
- Modify: `docs/CLAUDE-DOMAINS.md` (six conversion rows)

EXCLUDED (views and tools, not statuses; never convert): `/events/new`, `/events/board`, `/events/list`, `/events/timeline`, `/events/travel`, `/events/charity`, `/events/cannabis`, `/events/csv-export`, `/events/equipment-check`.

**Steps:**

- [ ] Read `app/(chef)/events/page.tsx` end to end and each of the six status pages; write down each page's exact predicate (some are status equality, `current`/`upcoming` are date-window predicates). Decide the `?status=` value per page: status pages map to their status string; `current` and `upcoming` map to `?status=current` / `?status=upcoming` implemented as named filter branches, not raw status equality.
- [ ] Add the root filter additively to `app/(chef)/events/page.tsx`: accept `searchParams: { status?: string }`; before render, apply a filter branch per supported value that reproduces the corresponding legacy page's predicate exactly (copy the predicate expressions from the legacy pages verbatim); leave the no-param render identical to today. Add a tab/link row entry per value (`href="/events?status=confirmed"` etc.) following the inquiries root's tab pattern. This step lands and is verified BEFORE any redirect: load `/events?status=confirmed` in the browser with the agent session and confirm it lists exactly what `/events/confirmed` lists today (open both side by side).
- [ ] Per route (six times): park the body to `legacy-<name>-list.tsx` (drop metadata, rename export, worked-example pattern), then replace `page.tsx` with the Task 13 redirect shape targeting `/events?status=<value>`, keeping the old page's `metadata` title on the redirect file.
- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck`
- [ ] Probe each route with the Task 13 node session probe (expect `307 /events?status=<value>`), then confirm the target renders the same list the legacy page rendered, or its empty state.
- [ ] Record six rows in `docs/CLAUDE-DOMAINS.md` under `### Status-route conversions (rescue WS4)`.
- [ ] Commit: `git add "app/(chef)/events" docs/CLAUDE-DOMAINS.md && git commit -m "refactor: events status pages become param redirects; root gains additive status filter"`

---

### Task 13D: Leads status cluster, four routes [CODEX-SAFE]

**GATE (owner): Task 13's gate, leads cluster.** **Coordination first:** check `app/(chef)/leads/page.tsx`. If WS3 Task 8 already shelled `/leads` to `/inquiries?view=intake`, these four pages redirect to the `/inquiries` equivalents; if `/leads` still renders (WS3 Task 8 not landed or not approved), they redirect to `/leads` itself (which lists everything) and this task records a follow-up in `docs/UNIFIED-BUILD-QUEUE.md` to re-point them after the shell lands. `/leads/new` already redirects (verified); leave it.

**Files:**

- Create + Modify (park body, then redirect, per route): `app/(chef)/leads/archived/`, `app/(chef)/leads/contacted/`, `app/(chef)/leads/converted/`, `app/(chef)/leads/qualified/` (each gains `legacy-<name>-list.tsx` and its `page.tsx` becomes a redirect)
- Modify: `docs/CLAUDE-DOMAINS.md` (four conversion rows)
- Modify (only in the not-yet-shelled branch): `docs/UNIFIED-BUILD-QUEUE.md` (re-point follow-up)

**Steps:**

- [ ] Run the coordination check above and write the chosen redirect target per route into the commit message body.
- [ ] Per route (four times): park the body to `legacy-<name>-list.tsx` (drop metadata, rename export), then replace `page.tsx` with the Task 13 redirect shape targeting the chosen target, keeping the metadata title.
- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck`
- [ ] Probe each route with the Task 13 node session probe (expect 307 with the chosen location), then load the target with the agent session and confirm it renders.
- [ ] Record four rows in `docs/CLAUDE-DOMAINS.md`; add the queue follow-up if the not-yet-shelled branch was taken.
- [ ] Commit: `git add "app/(chef)/leads" docs/CLAUDE-DOMAINS.md && git commit -m "refactor: leads status pages become redirects; bodies parked live"` (add `docs/UNIFIED-BUILD-QUEUE.md` to the stage list if touched)

---

### Task 13E: Invoice status cluster plus wave close [CODEX-SAFE]

**GATE (owner): Task 13's gate, invoices cluster.**

**Files:**

- Modify: `app/(chef)/finance/invoices/page.tsx` (check for `?status=` support first; add it additively if missing, following the inquiries root pattern)
- Create + Modify (park body, then redirect, per route): `app/(chef)/finance/invoices/cancelled/`, `app/(chef)/finance/invoices/draft/`, `app/(chef)/finance/invoices/overdue/`, `app/(chef)/finance/invoices/paid/`, `app/(chef)/finance/invoices/refunded/`, `app/(chef)/finance/invoices/sent/` (each gains `legacy-<name>-list.tsx` and its `page.tsx` becomes a redirect)
- Modify: `docs/CLAUDE-DOMAINS.md` (six conversion rows plus the wave-close leftovers list)

**Steps:**

- [ ] Read `app/(chef)/finance/invoices/page.tsx`; if it lacks `?status=` support, add it additively (accept `searchParams: { status?: string }`, per-value filter branches copied verbatim from the legacy pages' predicates, tab links). Verify the filtered root against the legacy page side by side before any redirect, as in Task 13C.
- [ ] Per route (six times): park the body to `legacy-<name>-list.tsx` (drop metadata, rename export), then replace `page.tsx` with the Task 13 redirect shape targeting `/finance/invoices?status=<value>`, keeping the metadata title.
- [ ] Typecheck: `npx tsc --noEmit --skipLibCheck`
- [ ] Probe each route with the Task 13 node session probe (expect `307 /finance/invoices?status=<value>`), then confirm the target renders the filtered list or its empty state.
- [ ] Wave close, enumeration: list any remaining status-shaped routes across the portal (the nav audit counted roughly 60): `ls app/\(chef\)/*/ | grep -E "draft|sent|accepted|rejected|expired|viewed|paid|overdue|cancelled|completed|confirmed|archived|contacted|converted|qualified|declined|upcoming|current|awaiting"` and record leftovers in `docs/CLAUDE-DOMAINS.md` as queued (do not convert them in this task).
- [ ] Wave close, gate: `npm run regression:firewall` (the wiring audit must show zero NEW orphans; redirects count as resolving routes).
- [ ] Record six rows plus the leftovers list in `docs/CLAUDE-DOMAINS.md`.
- [ ] Commit: `git add "app/(chef)/finance/invoices" docs/CLAUDE-DOMAINS.md && git commit -m "refactor: invoice status pages become param redirects; status wave closed with leftovers recorded"`

---

## Closeout (after the last approved task)

- [ ] `npx tsc --noEmit --skipLibCheck` exits 0
- [ ] `node --test --import tsx tests/unit/module-slugs.test.ts tests/unit/module-guard-core.test.ts tests/unit/openclaw-config.test.ts tests/unit/labs-gates.test.ts` all green (plus `tests/unit/combined-blocks-core.test.ts` if Task 10's gate was approved)
- [ ] `npm run regression:firewall` exits 0. Known pre-existing exception: until WS2 Task 2 (expected-orphan allowlist, `docs/specs/rescue/2026-07-10-rescue-ws2-phase-a-reorganize.md`) lands, the wiring audit fails on the `/studio/preview` orphan from the untouchable dirty Studio work; that single documented failure does not block this closeout, anything else red does
- [ ] Named regression re-checks (rule: guard against regression by name): recipe cost ticker renders on `http://localhost:3100`; `circle-digest` and `circle-remy-nudges` crons return non-error JSON in the post-backfill module state; an ops task assignment still notifies a tenant with `station-ops` on
- [ ] Run `/wire-audit` and `/page-xray --delta` on affected routes (`/explore`, `/network`, `/community`, `/pie-cart`, plus `/inquiries`, `/events`, `/leads`, `/finance/invoices` for whichever of Tasks 13-13E ran) per the post-build closeout contract
- [ ] `docs/test-coverage-blueprint.md` rows updated for every test added; `docs/UNIFIED-BUILD-QUEUE.md` items for Phase C marked with their true status (`DONE` only for verified tasks, `BLOCKED` for unapproved gates)
- [ ] Commit and push
