# Rescue Workstream 1: Security and Integrity

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make billing gates, route protection, and test-only endpoints actually enforce what they claim, and fix two data-correctness bugs (invalid inquiry channel, dead push URL), per Sections 4 and 9 of `docs/discovery/2026-07-10-chefflow-rescue-blueprint.md`.

**Architecture:** All enforcement flows through the existing feature-gate layer: `lib/feature-gates/gate-check.ts` gains a real tier resolver reading `chefs.subscription_status` and `chefs.trial_ends_at`; `lib/billing/require-pro.ts` and `components/billing/upgrade-gate.tsx` become its first runtime consumers via a new billing-slug-to-gate-key map. Route protection fixes live entirely in `lib/auth/route-policy.ts` plus one conditional in `middleware.ts`. Endpoint hardening extends the existing `lib/environment/production-safety.ts` startup assertion and adds a shared demo-request guard.

**Tech Stack:** Next.js App Router, PostgreSQL via the supabase-style `createServerClient` wrapper (Drizzle schema in `lib/db/schema/schema.ts`), Auth.js v5, node:test + tsx for unit tests (`npm run test:unit`), Playwright against `http://localhost:3100`.

## Global Constraints

- **Never delete anything.** Every change here is additive or a targeted fix. No route is removed, no file deleted, no table touched.
- **Zero database migrations in this workstream.** Every table and column referenced (`chefs.subscription_status`, `chefs.trial_ends_at`, `chef_feature_flags`, `platform_admins`) already exists in `lib/db/schema/schema.ts` (chefs columns at :20091-20092, chef_feature_flags at :25181). If a builder believes a migration is needed, stop and escalate; the plan is wrong somewhere.
- **Dirty working tree warning:** `lib/auth/route-policy.ts` is MODIFIED in the working tree as of 2026-07-10. Tasks 5 and 6 list Phase A item 1 of the blueprint (workspace settlement via /untangle) as a prerequisite, and their line anchors were read from the dirty tree; re-verify anchors after settlement. All other files in this plan were clean at planning time.
- **Hands off:** `app/(chef)/studio/`, `app/api/studio/`, `components/studio/`, `lib/studio/`, `docs/specs/website-builder-studio.md`, `database/migrations/20260617000001_chef_sites_studio.sql`. Nothing in this plan touches them; do not "fix" anything you notice there.
- **Multi-user:** every check keys off the authenticated chef's own tenant, never a hardcoded account.
- **No em dashes** in any code comment, UI string, or doc text you write.
- **Fail closed on access checks, fail honest on UI.** A lookup failure resolves to the free tier (deny paid features), never to silent access. A denied page shows a plain locked notice or a redirect, never fake content and never a blank screen.
- **Verification canon:** typecheck is `npx tsc --noEmit --skipLibCheck`; single unit file is `node --test --import tsx tests/unit/<file>.test.ts`; full unit suite is `npm run test:unit`; closeout gate is `npm run regression:firewall`; Playwright probes hit `http://localhost:3100` with agent sign-in via `POST http://localhost:3100/api/e2e/auth` using `.auth/agent.json`.
- **Task order:** Tasks 1, 2, 3, 4 are sequential (each consumes the previous one's output). Tasks 5-11 are independent of each other. Task 12 runs last. Task 3's Playwright probe must run BEFORE Task 7's env-flag flip (the probe signs in through the e2e auth endpoint).
- **Cross-workstream note:** the nav workstream (`docs/specs/rescue/2026-07-10-rescue-ws2-phase-a-reorganize.md`: nav/tier retagging, module vocabulary table, module gallery, Labs flags) depends on Tasks 1-3 landing first; the blueprint (Section 4 item 1) is explicit that server-side gating precedes any nav retagging. Nothing in this plan depends on that workstream, with one closeout caveat: `npm run regression:firewall` currently fails for everyone on a pre-existing orphan route (`/studio/preview`, from the untouchable dirty Studio work; see `scripts/wiring-audit-results.json` summary `orphans: 1`). WS2 Task 2 (expected-orphan allowlist) is the fix. Until it lands, treat that specific orphan failure as a documented pre-existing exemption in any firewall run, per Task 12.

---

### Task 1: Real plan tier resolution (P0-2, part 1) [OPUS-ONLY]

The gate system currently tells every chef they are on the free plan forever. `resolveChefTier` at `lib/feature-gates/gate-check.ts:42-45` returns hardcoded `'free'` with a TODO. The real plan storage is the `chefs` table: column `subscription_status` (schema.ts:20091) plus `trial_ends_at` (schema.ts:20092), maintained by the Stripe webhook flow in `lib/stripe/subscription.ts`. The resolution rules already exist as a spec in `tests/unit/billing.tier.test.ts` (it mirrors a since-removed `lib/billing/tier.ts`): `grandfathered`, `active`, `past_due` grant pro; `trialing` grants pro only while `trial_ends_at` is in the future; everything else (canceled, unpaid, null, unknown) is free. There is no storage for an enterprise plan today, so `resolveChefTier` never returns `'enterprise'`; enterprise gates stay reachable only through admin bypass or per-chef `chef_feature_flags` overrides, which is correct.

**Files:**

- Create: `lib/feature-gates/tier-resolution.ts`
- Create: `lib/billing/errors.ts` (restores a module two existing test suites import; it was removed with the old `lib/billing/tier.ts`)
- Create: `tests/unit/feature-gates.tier-resolution.test.ts`
- Modify: `lib/feature-gates/gate-check.ts` (replace the `resolveChefTier` block at lines 37-45; extend imports at lines 4-9)

**Interfaces:**

- Consumes: `GateTier` from `lib/feature-gates/gate-types.ts` (`'free' | 'pro' | 'enterprise'`); `createServerClient` from `@/lib/db/server` (already imported in gate-check.ts); `cache` from `react` (already imported).
- Produces: `resolveTierFromSubscription(snapshot: { subscriptionStatus: string | null; trialEndsAt: string | null }, now?: Date): GateTier` (pure, exported); `resolveChefTier(chefId: string): Promise<GateTier>` (module-private inside gate-check.ts, same name and call sites as today).

**Steps:**

- [ ] Write the failing test at `tests/unit/feature-gates.tier-resolution.test.ts`:

```ts
/**
 * Unit tests for feature-gate tier resolution.
 *
 * Source of truth for a chef's plan: chefs.subscription_status and
 * chefs.trial_ends_at (lib/db/schema/schema.ts:20091-20092), written by
 * lib/stripe/subscription.ts. Rules mirror tests/unit/billing.tier.test.ts.
 *
 * Run: node --test --import tsx tests/unit/feature-gates.tier-resolution.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveTierFromSubscription } from '../../lib/feature-gates/tier-resolution'

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
const PAST = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

describe('resolveTierFromSubscription - always-pro statuses', () => {
  it('active grants pro', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'active', trialEndsAt: null }),
      'pro'
    )
  })

  it('grandfathered grants pro', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'grandfathered', trialEndsAt: null }),
      'pro'
    )
  })

  it('past_due grants pro (grace period)', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'past_due', trialEndsAt: null }),
      'pro'
    )
  })
})

describe('resolveTierFromSubscription - trials', () => {
  it('trialing with a future trial end grants pro', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'trialing', trialEndsAt: FUTURE }),
      'pro'
    )
  })

  it('trialing with an expired trial end is free', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'trialing', trialEndsAt: PAST }),
      'free'
    )
  })

  it('trialing with no trial end date is free', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'trialing', trialEndsAt: null }),
      'free'
    )
  })

  it('trialing with an unparseable trial end date is free (fail closed)', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'trialing', trialEndsAt: 'not-a-date' }),
      'free'
    )
  })
})

describe('resolveTierFromSubscription - everything else is free', () => {
  it('canceled is free', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'canceled', trialEndsAt: null }),
      'free'
    )
  })

  it('null status is free', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: null, trialEndsAt: null }),
      'free'
    )
  })

  it('unknown status string is free', () => {
    assert.equal(
      resolveTierFromSubscription({ subscriptionStatus: 'mystery', trialEndsAt: null }),
      'free'
    )
  })

  it('never returns enterprise (no storage for it yet)', () => {
    for (const status of ['active', 'grandfathered', 'past_due', 'canceled', null]) {
      const tier = resolveTierFromSubscription({ subscriptionStatus: status, trialEndsAt: null })
      assert.notEqual(tier, 'enterprise')
    }
  })
})
```

- [ ] Run `node --test --import tsx tests/unit/feature-gates.tier-resolution.test.ts` and confirm it fails with a module-not-found error for `lib/feature-gates/tier-resolution` (that is the expected RED state).
- [ ] Create `lib/feature-gates/tier-resolution.ts`:

```ts
// lib/feature-gates/tier-resolution.ts
// Pure plan-tier resolution from a chef's subscription snapshot.
// Storage: chefs.subscription_status and chefs.trial_ends_at
// (lib/db/schema/schema.ts:20091-20092), written by lib/stripe/subscription.ts.
// Rules mirror the contract in tests/unit/billing.tier.test.ts.

import type { GateTier } from './gate-types'

export type SubscriptionSnapshot = {
  subscriptionStatus: string | null
  trialEndsAt: string | null
}

const ALWAYS_PRO_STATUSES = ['grandfathered', 'active', 'past_due'] as const

export function resolveTierFromSubscription(
  snapshot: SubscriptionSnapshot,
  now: Date = new Date()
): GateTier {
  const { subscriptionStatus, trialEndsAt } = snapshot

  if (
    subscriptionStatus &&
    (ALWAYS_PRO_STATUSES as readonly string[]).includes(subscriptionStatus)
  ) {
    return 'pro'
  }

  if (subscriptionStatus === 'trialing' && trialEndsAt) {
    const trialEnd = new Date(trialEndsAt)
    if (!Number.isNaN(trialEnd.getTime()) && trialEnd > now) {
      return 'pro'
    }
  }

  // Canceled, unpaid, expired trial, null, unknown: free. Fail closed.
  return 'free'
}
```

- [ ] Run `node --test --import tsx tests/unit/feature-gates.tier-resolution.test.ts` and confirm all tests pass (GREEN).
- [ ] In `lib/feature-gates/gate-check.ts`, add the import below the existing registry import at line 9 (`import { GATE_REGISTRY, type GateKey } from './gate-registry'`):

```ts
import { resolveTierFromSubscription } from './tier-resolution'
```

- [ ] In `lib/feature-gates/gate-check.ts`, replace the entire block from the comment at line 37 through line 45 (the block reading `/** Resolve the effective tier ... */ async function resolveChefTier(_chefId: string): Promise<GateTier> { // TODO ... return 'free' }`) with:

```ts
/**
 * Resolve the effective tier for a chef from the chefs table
 * (subscription_status + trial_ends_at, written by lib/stripe/subscription.ts).
 * Fails closed to 'free' when the row cannot be read.
 * Cached per request via React.cache.
 */
const resolveChefTier = cache(async (chefId: string): Promise<GateTier> => {
  const db: any = createServerClient({ admin: true })
  const { data, error } = await db
    .from('chefs')
    .select('subscription_status, trial_ends_at')
    .eq('id', chefId)
    .single()

  if (error || !data) {
    if (error) console.error('[feature-gates] Failed to load chef plan:', error)
    return 'free'
  }

  return resolveTierFromSubscription({
    subscriptionStatus: (data as any).subscription_status ?? null,
    trialEndsAt: (data as any).trial_ends_at ?? null,
  })
})
```

Note: `chefId` here is always the authenticated chef's own `entityId` (callers are `checkGate` via `requireGate`, `gate-actions.ts` which calls `requireChef()` first, and Task 3's `requirePro`). The admin client is used only to avoid RLS surprises on the chef's own row, matching the precedent in `lib/monetization/status.ts`.

- [ ] Run `npx tsc --noEmit --skipLibCheck` and confirm exit 0.
- [ ] Restore `lib/billing/errors.ts`. This is a PRE-EXISTING failure, not something this task introduced: `tests/unit/billing.tier.test.ts` fails TODAY with `ERR_MODULE_NOT_FOUND` at its ProFeatureRequiredError suite (line 150 dynamically imports `../../lib/billing/errors.js`, and the file does not exist), and `tests/unit/security-trust-reset.test.ts:230` reads the same file's source. Create the file with exactly this content (do not add words like st-ack or tr-ace to comments; security-trust-reset.test.ts asserts the source does not contain them):

```ts
// lib/billing/errors.ts
// Error type thrown when a chef hits a Pro-plan feature on the free tier.
// Consumed by tests/unit/billing.tier.test.ts and
// tests/unit/security-trust-reset.test.ts. Kept free of implementation
// detail so the message is safe to surface in UI.

export class ProFeatureRequiredError extends Error {
  readonly code = 'PRO_FEATURE_REQUIRED'
  readonly featureSlug: string

  constructor(featureSlug: string) {
    super(`This feature requires the Pro plan: ${featureSlug}`)
    this.name = 'ProFeatureRequiredError'
    this.featureSlug = featureSlug
  }
}
```

- [ ] Run `node --test --import tsx tests/unit/billing.tier.test.ts` and confirm it now passes end to end, including the ProFeatureRequiredError suite.
- [ ] Run `npm run test:unit` and confirm no regressions beyond failures already documented as pre-existing elsewhere.
- [ ] Commit (Git Bash): `git add lib/feature-gates/tier-resolution.ts lib/billing/errors.ts lib/feature-gates/gate-check.ts tests/unit/feature-gates.tier-resolution.test.ts && git commit -m "fix(billing): resolve chef tier from subscription status instead of hardcoded free"`

---

### Task 2: Billing slug to gate key map, plus the missing registry entries (P0-1 groundwork) [OPUS-ONLY]

`requirePro` call sites use 15 kebab-case billing slugs, and `UpgradeGate` uses one more (`raffle`). None of them exist in `GATE_REGISTRY` (`lib/feature-gates/gate-registry.ts`), so before `requirePro` can delegate to the gate system, the registry needs 16 additive entries and a slug-to-key map. All 16 land at tier `'pro'` with `defaultEnabled: true`, which preserves today's two-tier model (free floor, everything else pro) from `.constraints/tier-gating.json`. Display names use the chef-facing names from blueprint Section 5 where one exists. Do NOT re-tier or rename any of the 15 existing registry entries; the naming pass over existing entries belongs to the nav workstream (`docs/specs/rescue/2026-07-10-rescue-ws2-phase-a-reorganize.md`).

The slug inventory (from `grep -rn "requirePro('" lib app`): commerce (114 calls), marketing (38), integrations (22), meal-prep-ops (13), staff-management (10), professional-dev (9), protection (6), nutrition-analysis (6), cannabis-portal (5), advanced-calendar (5), client-intelligence (4), intelligence-hub (2), community (2), advanced-analytics (2), payroll (1). Plus `raffle` from `app/(chef)/loyalty/raffle/page.tsx:12`.

**Files:**

- Create: `lib/feature-gates/billing-slug-map.ts`
- Create: `tests/unit/feature-gates.billing-slug-map.test.ts`
- Modify: `lib/feature-gates/gate-registry.ts` (insert new entries immediately above the line `  // --- Enterprise features ---` at line 87)

**Interfaces:**

- Consumes: `GateKey` from `lib/feature-gates/gate-registry.ts`; `gate()` helper already in gate-registry.ts.
- Produces: `BILLING_SLUG_GATES: Record<string, GateKey>` and `type BillingFeatureSlug` from the new map module; 16 new `GateKey` values (`commerce`, `marketing`, `integrations`, `meal_prep_ops`, `staff_management`, `professional_dev`, `protection`, `nutrition_analysis`, `cannabis_portal`, `advanced_calendar`, `client_intelligence`, `intelligence_hub`, `community`, `advanced_analytics`, `payroll`, `raffle`).

**Steps:**

- [ ] Write the failing test at `tests/unit/feature-gates.billing-slug-map.test.ts`:

```ts
/**
 * Unit tests for the billing slug to gate key map.
 *
 * Every requirePro('<slug>') literal in lib/ and app/ must resolve to a
 * gate that exists in GATE_REGISTRY, or enforcement silently fails closed
 * on a page that used to work.
 *
 * Run: node --test --import tsx tests/unit/feature-gates.billing-slug-map.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { BILLING_SLUG_GATES } from '../../lib/feature-gates/billing-slug-map'
import { GATE_REGISTRY } from '../../lib/feature-gates/gate-registry'

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}

function collectRequireProSlugs(): Set<string> {
  const roots = ['lib', 'app']
  const slugs = new Set<string>()
  const pattern = /requirePro\((['"])([^'"]+)\1\)/g
  for (const root of roots) {
    for (const file of walk(path.resolve(__dirname, '../../', root))) {
      const content = fs.readFileSync(file, 'utf-8')
      let match: RegExpExecArray | null
      while ((match = pattern.exec(content)) !== null) {
        slugs.add(match[2])
      }
    }
  }
  return slugs
}

describe('billing slug map', () => {
  it('maps every gate key it declares to a real GATE_REGISTRY entry', () => {
    for (const [slug, gateKey] of Object.entries(BILLING_SLUG_GATES)) {
      assert.ok(
        gateKey in GATE_REGISTRY,
        `slug '${slug}' maps to '${gateKey}' which is missing from GATE_REGISTRY`
      )
    }
  })

  it('covers every requirePro slug literal found in lib/ and app/', () => {
    const found = collectRequireProSlugs()
    assert.ok(found.size >= 15, `expected at least 15 slugs in source, found ${found.size}`)
    for (const slug of found) {
      assert.ok(
        slug in BILLING_SLUG_GATES,
        `requirePro('${slug}') exists in source but has no entry in BILLING_SLUG_GATES`
      )
    }
  })

  it('covers the UpgradeGate slugs (integrations, raffle)', () => {
    assert.ok('integrations' in BILLING_SLUG_GATES)
    assert.ok('raffle' in BILLING_SLUG_GATES)
  })
})
```

- [ ] Run `node --test --import tsx tests/unit/feature-gates.billing-slug-map.test.ts` and confirm it fails with module-not-found for `billing-slug-map` (RED).
- [ ] In `lib/feature-gates/gate-registry.ts`, insert the following block directly ABOVE the line `  // --- Enterprise features ---` (line 87 in the clean file):

```ts
  // --- Billing module gates (pro) ---
  // These back the requirePro() billing slugs via lib/feature-gates/billing-slug-map.ts.
  commerce: gate('commerce', 'Storefront and POS', 'pro', 'Product sales, registers, orders, and settlements'),
  marketing: gate('marketing', 'Marketing', 'pro', 'Campaigns, social posts, and promotional content'),
  integrations: gate('integrations', 'Integrations', 'pro', 'Calendar sync, payment providers, Yelp, Zapier, and other outside services'),
  meal_prep_ops: gate('meal_prep_ops', 'Meal Prep', 'pro', 'Meal prep programs, containers, and deliveries'),
  staff_management: gate('staff_management', 'Team and Staff', 'pro', 'Rosters, schedules, clock-in, and labor tracking'),
  professional_dev: gate('professional_dev', 'Professional Development', 'pro', 'Certifications, goals, and career records'),
  protection: gate('protection', 'Backup Chef', 'pro', 'Insurance records and coverage planning'),
  nutrition_analysis: gate('nutrition_analysis', 'Nutrition Analysis', 'pro', 'Per-dish and per-menu nutrition breakdowns'),
  cannabis_portal: gate('cannabis_portal', 'Cannabis Events', 'pro', 'Infused-event compliance, ledgers, and guest handling'),
  advanced_calendar: gate('advanced_calendar', 'Advanced Calendar', 'pro', 'Protected time blocks and scheduling rules'),
  client_intelligence: gate('client_intelligence', 'Client Insights', 'pro', 'Client lifetime value and retention analysis'),
  intelligence_hub: gate('intelligence_hub', 'Trend Reports', 'pro', 'Price anomaly and dietary trend reporting'),
  community: gate('community', 'Chef Community', 'pro', 'Cross-chef benchmarking and community features'),
  advanced_analytics: gate('advanced_analytics', 'Custom Reports', 'pro', 'Build and save custom report definitions'),
  payroll: gate('payroll', 'Payroll and Tax', 'pro', 'Staff tax reports and payroll paperwork'),
  raffle: gate('raffle', 'Client Raffles', 'pro', 'Loyalty raffle draws for repeat clients'),

```

- [ ] Create `lib/feature-gates/billing-slug-map.ts`:

```ts
// lib/feature-gates/billing-slug-map.ts
// Maps the kebab-case billing feature slugs used by requirePro() and
// <UpgradeGate featureSlug="..."> to gate keys in GATE_REGISTRY.
// This is the enforcement bridge; the chef-facing module vocabulary table
// (blueprint Section 4 item 2) is owned by the nav workstream and may add
// entries here, but must never remove one while a call site still uses it.
// Completeness is asserted by tests/unit/feature-gates.billing-slug-map.test.ts.

import type { GateKey } from './gate-registry'

export const BILLING_SLUG_GATES = {
  'advanced-analytics': 'advanced_analytics',
  'advanced-calendar': 'advanced_calendar',
  'cannabis-portal': 'cannabis_portal',
  'client-intelligence': 'client_intelligence',
  commerce: 'commerce',
  community: 'community',
  integrations: 'integrations',
  'intelligence-hub': 'intelligence_hub',
  marketing: 'marketing',
  'meal-prep-ops': 'meal_prep_ops',
  'nutrition-analysis': 'nutrition_analysis',
  payroll: 'payroll',
  'professional-dev': 'professional_dev',
  protection: 'protection',
  raffle: 'raffle',
  'staff-management': 'staff_management',
} as const satisfies Record<string, GateKey>

export type BillingFeatureSlug = keyof typeof BILLING_SLUG_GATES
```

- [ ] Run `node --test --import tsx tests/unit/feature-gates.billing-slug-map.test.ts` and confirm all tests pass (GREEN).
- [ ] Run `npx tsc --noEmit --skipLibCheck` and confirm exit 0 (the `satisfies Record<string, GateKey>` clause proves every mapped key exists at compile time too).
- [ ] Commit: `git add lib/feature-gates/billing-slug-map.ts lib/feature-gates/gate-registry.ts tests/unit/feature-gates.billing-slug-map.test.ts && git commit -m "feat(billing): add billing-slug gate entries and slug-to-gate map"`

---

### Task 3: Rewire requirePro to real enforcement (P0-1) [OPUS-ONLY]

`lib/billing/require-pro.ts:5-7` ignores its feature slug and returns `requireChef()`. Every one of the 41 app files and 45 lib files below believes it is billing-gated and is not. After this task, a denied request is redirected to `/settings/billing?feature=<slug>` (the page exists at `app/(chef)/settings/billing/`); `redirect()` from `next/navigation` works in server components, server actions, and route handlers, so one code path covers all call-site kinds. The return type stays `Promise<AuthUser>` because call sites like `lib/staff/tax-report-actions.ts:58` do `const user = await requirePro('payroll')`.

Call-site inventory (must all still compile; reproduce with `grep -rln "requirePro(" --include="*.ts" --include="*.tsx" lib app`):

- App pages (41 files): `app/(chef)/cannabis/layout.tsx`; the 20 commerce pages under `app/(chef)/commerce/` (observability, orders, page, parity, products/[id], products/new, products, promotions, reconciliation/[id], reconciliation, register, reports, reports/shifts, sales/[id], sales, schedules, settlements/[id], settlements, table-service, virtual-terminal); `app/(chef)/content/page.tsx`; `app/(chef)/culinary/menus/[id]/nutrition/page.tsx`; `app/(chef)/events/[id]/cannabis/page.tsx`; `app/(chef)/events/cannabis/ledger/page.tsx`; `app/(chef)/events/cannabis/page.tsx`; `app/(chef)/marketing/social/compose/[eventId]/page.tsx`; `app/(chef)/meal-prep/[programId]/page.tsx`; `app/(chef)/meal-prep/page.tsx`; the 10 staff pages under `app/(chef)/staff/` ([id], availability, clock, labor, live, page, performance, permissions, roster, schedule); `app/api/documents/commerce-receipt/[saleId]/route.ts`; `app/api/documents/commerce-shift-report/[sessionId]/route.ts`.
- Lib actions (45 files): `lib/analytics/{client-ltv,custom-report-enhanced-actions,dietary-trends,price-anomaly}.ts`; the 22 files under `lib/commerce/`; `lib/community/benchmarking-actions.ts`; `lib/content/post-event-content-actions.ts`; `lib/integrations/{docusign/docusign-client,ical/ical-actions,payments/payment-method-settings,quickbooks/quickbooks-client,square/square-client,yelp/yelp-actions,zapier/zapier-webhooks}.ts`; `lib/marketing/actions.ts`; `lib/meal-prep/{container-actions,delivery-actions}.ts`; `lib/nutrition/analysis-actions.ts`; `lib/professional/actions.ts`; `lib/protection/insurance-actions.ts`; `lib/scheduling/protected-time-actions.ts`; `lib/social/event-social-actions.ts`; `lib/staff/tax-report-actions.ts`.

**Files:**

- Create: `tests/unit/billing.require-pro-wiring.test.ts`
- Create: `tests/system-integrity/require-pro-enforcement.spec.ts`
- Modify: `lib/billing/require-pro.ts` (whole file, 7 lines)
- Modify: `docs/test-coverage-blueprint.md` (add entries for the two new tests)

**Interfaces:**

- Consumes: `requireChef`, `AuthUser` from `@/lib/auth/get-user`; `checkGate` from `@/lib/feature-gates/gate-check` (Task 1); `BILLING_SLUG_GATES`, `BillingFeatureSlug` from `@/lib/feature-gates/billing-slug-map` (Task 2); `redirect` from `next/navigation`.
- Produces: `requirePro(featureSlug: string): Promise<AuthUser>` (same signature as today; new behavior: redirects to `/settings/billing?feature=<slug>` when the gate denies, throws on an unmapped slug).

**Steps:**

- [ ] Write the failing source-contract test at `tests/unit/billing.require-pro-wiring.test.ts` (the source-scan style follows the in-repo precedent of `tests/system-integrity/q62-billing-gate-completeness.spec.ts`):

```ts
/**
 * Source contract for lib/billing/require-pro.ts.
 *
 * Guards against the P0-1 regression class: requirePro silently reverting
 * to a no-op that returns requireChef() and ignores its slug.
 *
 * Run: node --test --import tsx tests/unit/billing.require-pro-wiring.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(path.resolve(__dirname, '../../lib/billing/require-pro.ts'), 'utf-8')

describe('requirePro wiring', () => {
  it('consults the feature-gate layer', () => {
    assert.ok(source.includes('checkGate'), 'requirePro must call checkGate')
    assert.ok(
      source.includes('BILLING_SLUG_GATES'),
      'requirePro must resolve slugs through BILLING_SLUG_GATES'
    )
  })

  it('no longer ignores its slug', () => {
    assert.ok(!source.includes('_featureSlug'), 'the slug parameter must be used, not discarded')
  })

  it('redirects denied chefs to plan settings instead of rendering the feature', () => {
    assert.ok(source.includes('redirect('), 'denial path must redirect')
    assert.ok(source.includes('/settings/billing'), 'denial redirect must land on plan settings')
  })
})
```

- [ ] Run `node --test --import tsx tests/unit/billing.require-pro-wiring.test.ts` and confirm the first and third tests fail against the current no-op file (RED).
- [ ] Replace the full contents of `lib/billing/require-pro.ts` with:

```ts
'use server'

import { redirect } from 'next/navigation'
import { requireChef, type AuthUser } from '@/lib/auth/get-user'
import { checkGate } from '@/lib/feature-gates/gate-check'
import { BILLING_SLUG_GATES, type BillingFeatureSlug } from '@/lib/feature-gates/billing-slug-map'

/**
 * Plan gate for pro features. Authenticates the chef, then checks the
 * feature gate mapped from the billing slug. Admin accounts and per-chef
 * chef_feature_flags overrides are honored inside checkGate.
 *
 * Denied: redirects to plan settings (works in pages, server actions,
 * and route handlers). Unmapped slug: throws, so a typo fails loudly in
 * development instead of silently granting access. The map is kept
 * complete by tests/unit/feature-gates.billing-slug-map.test.ts.
 */
export async function requirePro(featureSlug: string): Promise<AuthUser> {
  const user = await requireChef()

  const gateKey = BILLING_SLUG_GATES[featureSlug as BillingFeatureSlug]
  if (!gateKey) {
    throw new Error(`Unregistered billing feature slug: ${featureSlug}`)
  }

  const result = await checkGate(user.entityId, gateKey)
  if (!result.allowed) {
    redirect(`/settings/billing?feature=${encodeURIComponent(featureSlug)}`)
  }

  return user
}
```

- [ ] Run `node --test --import tsx tests/unit/billing.require-pro-wiring.test.ts` and confirm it passes (GREEN).
- [ ] Run `npx tsc --noEmit --skipLibCheck` and confirm exit 0. This proves all 86 call-site files still compile against the unchanged signature.
- [ ] Spot-check that no call site wraps `requirePro` in a try/catch that would swallow the redirect and continue doing gated work: run `grep -rn -B2 "await requirePro(" lib app --include="*.ts" --include="*.tsx" | grep -c "try {"` and manually inspect any hits (a `redirect()` throws `NEXT_REDIRECT`; a generic catch that continues would neuter the gate for that action). Record findings in the commit message body if any call site needs a follow-up.
- [ ] Write the Playwright behavior probe at `tests/system-integrity/require-pro-enforcement.spec.ts`:

```ts
/**
 * Behavior proof for P0-1: a free-tier chef who types a pro URL is
 * redirected to plan settings instead of getting the feature.
 *
 * Preconditions: canonical server on http://localhost:3100 with the E2E
 * auth endpoint enabled (run this BEFORE the WS1 Task 7 env flip), and
 * the agent account on the free tier (subscription_status null or
 * canceled) and not present in platform_admins (admin bypasses gates).
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts require-pro-enforcement.spec.ts
 * (The default playwright.config.ts projects never match tests/system-integrity/,
 * so running without -c reports "no tests found". The system-integrity config
 * applies storageState .auth/chef.json, which the /api/e2e/auth call below
 * then overrides for this test's own session.)
 */

import { test, expect } from '@playwright/test'
import fs from 'node:fs'

const BASE = 'http://localhost:3100'

test('free chef hitting /commerce lands on plan settings', async ({ page }) => {
  const creds = JSON.parse(fs.readFileSync('.auth/agent.json', 'utf-8'))
  const res = await page.context().request.post(`${BASE}/api/e2e/auth`, {
    data: { email: creds.email, password: creds.password },
  })
  expect(res.ok()).toBeTruthy()

  await page.goto(`${BASE}/commerce`)
  await page.waitForLoadState('domcontentloaded')

  expect(page.url()).toContain('/settings/billing')
  expect(page.url()).toContain('feature=commerce')
})
```

- [ ] Verify the probe's preconditions before running it. Check the agent account's tier and admin status with read-only SQL against the app database (chefId and authUserId come from `.auth/agent.json`):
      `SELECT subscription_status, trial_ends_at FROM chefs WHERE id = '<chefId>';` (expect null or a non-pro status) and `SELECT 1 FROM platform_admins WHERE auth_user_id = '<authUserId>';` (expect zero rows). If the agent turns out to be a platform admin or on a pro status, the probe will see /commerce render; in that case document the observed bypass reason in the spec run notes and verify denial instead with a second, non-admin free chef account if one exists in `.auth/`. Do not modify any account to force the test.
- [ ] Run `npx playwright test -c playwright.system-integrity.config.ts require-pro-enforcement.spec.ts` against `http://localhost:3100` and confirm it passes. Do not run it through the default config; the default `playwright.config.ts` projects do not match `tests/system-integrity/**` and Playwright would report "no tests found".
- [ ] Add both tests to `docs/test-coverage-blueprint.md`: under the billing/monetization section, add rows for `tests/unit/billing.require-pro-wiring.test.ts` (VERIFIED, requirePro enforcement wiring) and `tests/system-integrity/require-pro-enforcement.spec.ts` (VERIFIED, free-tier denial behavior).
- [ ] Commit: `git add lib/billing/require-pro.ts tests/unit/billing.require-pro-wiring.test.ts tests/system-integrity/require-pro-enforcement.spec.ts docs/test-coverage-blueprint.md && git commit -m "fix(billing): enforce plan gates in requirePro via feature-gate layer"`

---

### Task 4: Wire UpgradeGate to checkGate [OPUS-ONLY]

`components/billing/upgrade-gate.tsx` renders its children unconditionally; the props (`chefId`, `featureSlug`, `mode`) are decoration. Five pages use it: `app/(chef)/loyalty/raffle/page.tsx:12` (slug `raffle`) and four settings pages (`calendar-sync:39`, `payment-methods:43`, `yelp:44`, `zapier:49`, all slug `integrations`). This task makes it a real gate consumer per blueprint Section 4 item 1 ("server components rendering gated content call checkGate").

Owner-visible tension, recorded here so it is not lost: `/settings/payment-methods` sits behind the `integrations` slug, but logging payments is a Tier 0 floor job in the blueprint. Enforcing the gate as declared is correct for this workstream; if the owner decides payment-method settings belong on the free floor, the fix is a one-line re-tier of the `integrations` gate or a per-page slug change in the module vocabulary pass owned by `docs/specs/rescue/2026-07-10-rescue-ws2-phase-a-reorganize.md` Task 3, not a change here.

**Files:**

- Modify: `components/billing/upgrade-gate.tsx` (whole file, 10 lines)

**Interfaces:**

- Consumes: `checkGate` from `@/lib/feature-gates/gate-check`; `BILLING_SLUG_GATES` from `@/lib/feature-gates/billing-slug-map`; `Link` from `next/link`.
- Produces: async server component `UpgradeGate({ chefId, featureSlug, children, mode })`; same props as today, real behavior: allowed renders children, denied renders a locked panel (`block`, and `blur` treated as `block` so no data leaks through a blur), `hide` renders nothing, unknown slug renders children (fail open for typos; map completeness is test-enforced by Task 2).

**Steps:**

- [ ] Replace the full contents of `components/billing/upgrade-gate.tsx` with:

```tsx
import Link from 'next/link'
import { checkGate } from '@/lib/feature-gates/gate-check'
import { BILLING_SLUG_GATES, type BillingFeatureSlug } from '@/lib/feature-gates/billing-slug-map'

type Props = {
  chefId: string
  featureSlug: string
  children: React.ReactNode
  mode?: 'block' | 'blur' | 'hide'
}

export async function UpgradeGate({ chefId, featureSlug, children, mode = 'block' }: Props) {
  const gateKey = BILLING_SLUG_GATES[featureSlug as BillingFeatureSlug]

  // Unknown slugs render children so a typo never blanks a working page.
  // Map completeness is enforced by tests/unit/feature-gates.billing-slug-map.test.ts.
  if (!gateKey) return <>{children}</>

  const result = await checkGate(chefId, gateKey)
  if (result.allowed) return <>{children}</>

  if (mode === 'hide') return null

  // 'block' and 'blur' both render the locked panel. Blurred real data
  // would still ship the data to the client, so blur is not honored.
  return (
    <div className="rounded-md border p-6">
      <h2 className="font-semibold">This feature is part of the Pro plan</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your current plan does not include it. You can manage your plan in Settings.
      </p>
      <Link href="/settings/billing" className="mt-4 inline-block text-sm font-medium underline">
        Go to plan settings
      </Link>
    </div>
  )
}
```

- [ ] Run `npx tsc --noEmit --skipLibCheck` and confirm exit 0 (proves the five consuming pages still compile).
- [ ] Playwright probe (manual or scripted, same sign-in as Task 3's spec): as the free agent chef, open `http://localhost:3100/settings/zapier` and confirm the locked panel text "This feature is part of the Pro plan" renders instead of the Zapier setup form. If the agent account bypasses via admin, note it and verify the denied branch by temporarily asserting with the same second free account used in Task 3, never by editing data.
- [ ] Commit: `git add components/billing/upgrade-gate.tsx && git commit -m "fix(billing): render real locked state in UpgradeGate via checkGate"`

---

### Task 5: Add the four missing chef routes to middleware policy [CODEX-SAFE]

**Prerequisite: blueprint Phase A item 1 (workspace settlement).** `lib/auth/route-policy.ts` is modified in the working tree right now; line anchors below were read from that dirty state and may shift once the tree is settled. Do not start this task while the file has unrelated uncommitted changes you did not make.

`/series`, `/business`, `/reference`, `/shopping-list` all exist under `app/(chef)/` but are absent from `CHEF_PROTECTED_PATHS` (`lib/auth/route-policy.ts:4-125`), so middleware classifies them public (fallback at route-policy.ts:394). The chef layout's `requireChef()` catches it today; this restores defense in depth at the middleware layer.

**Files:**

- Create: `tests/unit/route-policy.chef-coverage.test.ts`
- Modify: `lib/auth/route-policy.ts` (four insertions inside the `CHEF_PROTECTED_PATHS` array, kept in alphabetical order)

**Interfaces:**

- Consumes: existing `isChefRoutePath`, `CHEF_PROTECTED_PATHS` exports.
- Produces: no new exports; four new array entries.

**Steps:**

- [ ] Write the failing test at `tests/unit/route-policy.chef-coverage.test.ts`:

```ts
/**
 * Chef-route coverage for middleware policy.
 * These four sections exist under app/(chef)/ but were missing from
 * CHEF_PROTECTED_PATHS, so middleware treated them as public.
 *
 * Run: node --test --import tsx tests/unit/route-policy.chef-coverage.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isChefRoutePath } from '../../lib/auth/route-policy'

describe('chef route coverage', () => {
  for (const route of ['/series', '/business', '/reference', '/shopping-list']) {
    it(`${route} is a chef-protected path`, () => {
      assert.equal(isChefRoutePath(route), true)
      assert.equal(isChefRoutePath(`${route}/anything`), true)
    })
  }

  it('does not overreach onto lookalike public paths', () => {
    // '/shopping-list' must not capture '/shopping-list-guide' style paths
    assert.equal(isChefRoutePath('/shopping-listing'), false)
    assert.equal(isChefRoutePath('/businesses'), false)
  })
})
```

- [ ] Run `node --test --import tsx tests/unit/route-policy.chef-coverage.test.ts` and confirm the four coverage tests fail (RED).
- [ ] In `lib/auth/route-policy.ts`, inside `CHEF_PROTECTED_PATHS`, add four entries in alphabetical position: `'/business',` after the `'/briefing',` entry; `'/reference',` after the `'/recipes',` entry; `'/series',` before the `'/settings',` entry; `'/shopping-list',` before the `'/shopping/bulk',` entry. (Note `matchesPathOrChild` matches exact-or-`/`-child, so `/shopping-listing` stays unmatched; the test proves it.)
- [ ] Run `node --test --import tsx tests/unit/route-policy.chef-coverage.test.ts` and confirm it passes (GREEN).
- [ ] Run `node --test --import tsx tests/unit/middleware.routing.test.ts` and confirm no existing assertion broke. If an assertion enumerates chef paths and now fails purely because of the four additions, update that assertion to include them and say so in the commit body.
- [ ] Run `npx tsc --noEmit --skipLibCheck` and confirm exit 0.
- [ ] Commit: `git add lib/auth/route-policy.ts tests/unit/route-policy.chef-coverage.test.ts && git commit -m "fix(auth): add series, business, reference, shopping-list to chef route policy"`

---

### Task 6: Fix the public-prefix shadowing of chef routes [OPUS-ONLY]

**Prerequisite: blueprint Phase A item 1 (workspace settlement).** Same dirty-tree warning as Task 5 for `lib/auth/route-policy.ts`; `middleware.ts` was clean at planning time but re-verify anchors after settlement.

Three public prefixes shadow chef pages: `/onboarding` is in both `CHEF_PROTECTED_PATHS` (route-policy.ts:73) and `PUBLIC_UNAUTHENTICATED_PATHS` (route-policy.ts:245); `/chef` (public profiles, route-policy.ts:207) shadows `/chef/cannabis`; `/availability` (public token pages, route-policy.ts:232) shadows the chef page at `app/(chef)/availability/page.tsx`. The public checks win at `middleware.ts:179` (unauthenticated) and `middleware.ts:284` (authenticated), so role policy never runs on these paths.

Route reality, confirmed against the tree: public routes are `app/(public)/onboarding/[token]/page.tsx`, `app/(public)/availability/[token]/page.tsx`, and `app/(public)/chef/[slug]/...`; chef routes are `app/(chef)/onboarding/{page,welcome,clients,features,first-event,help,loyalty,recipes,staff}`, `app/(chef)/availability/page.tsx`, and `app/(chef)/chef/cannabis/...`. Token and slug segments are dynamic, so the public entries cannot become exact matches without breaking token links. The fix (the blueprint's second option): for AUTHENTICATED users with the chef role, evaluate chef policy before the public bypass. Unauthenticated behavior is deliberately unchanged (token pages must stay reachable, and the chef layout's `requireChef()` keeps guarding, which the blueprint records as holding today). A signed-in client opening `/onboarding/<token>` or `/availability/<token>` still passes through the public bypass because the carve-out applies only to the chef role.

**Files:**

- Create: `tests/unit/route-policy.public-shadowing.test.ts`
- Modify: `lib/auth/route-policy.ts` (add `'/availability',` to `CHEF_PROTECTED_PATHS`; add one exported function after `isPublicUnauthenticatedPath` at :362-364)
- Modify: `middleware.ts` (imports at :4-11; the authenticated public bypass at :281-286)

**Interfaces:**

- Consumes: existing `isPublicUnauthenticatedPath`, `isChefRoutePath`, `RouteSessionRole`.
- Produces: `shouldBypassRolePolicyForAuthenticatedUser(pathname: string, role: RouteSessionRole | null | undefined): boolean` exported from `lib/auth/route-policy.ts`.

**Steps:**

- [ ] Write the failing test at `tests/unit/route-policy.public-shadowing.test.ts`:

```ts
/**
 * Public-prefix shadowing fix: for authenticated chefs, chef-protected
 * paths that also live under a public prefix (/onboarding, /chef/cannabis,
 * /availability) must go through role policy instead of the public bypass.
 * Non-chef roles keep the public bypass so token links keep working.
 *
 * Run: node --test --import tsx tests/unit/route-policy.public-shadowing.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isChefRoutePath,
  shouldBypassRolePolicyForAuthenticatedUser,
} from '../../lib/auth/route-policy'

describe('availability joins chef routes', () => {
  it('/availability is chef-protected', () => {
    assert.equal(isChefRoutePath('/availability'), true)
  })
})

describe('authenticated public bypass', () => {
  it('chef on a chef-shadowed public path does NOT bypass role policy', () => {
    assert.equal(shouldBypassRolePolicyForAuthenticatedUser('/onboarding', 'chef'), false)
    assert.equal(shouldBypassRolePolicyForAuthenticatedUser('/onboarding/welcome', 'chef'), false)
    assert.equal(shouldBypassRolePolicyForAuthenticatedUser('/chef/cannabis', 'chef'), false)
    assert.equal(shouldBypassRolePolicyForAuthenticatedUser('/availability', 'chef'), false)
  })

  it('chef on a purely public path still bypasses (profiles, pricing)', () => {
    assert.equal(shouldBypassRolePolicyForAuthenticatedUser('/chef/some-chef-slug', 'chef'), true)
    assert.equal(shouldBypassRolePolicyForAuthenticatedUser('/pricing', 'chef'), true)
  })

  it('client on token pages under the shadowed prefixes still bypasses', () => {
    assert.equal(
      shouldBypassRolePolicyForAuthenticatedUser('/onboarding/tok-abc123', 'client'),
      true
    )
    assert.equal(
      shouldBypassRolePolicyForAuthenticatedUser('/availability/tok-abc123', 'client'),
      true
    )
  })

  it('non-public paths never bypass, for any role', () => {
    assert.equal(shouldBypassRolePolicyForAuthenticatedUser('/dashboard', 'chef'), false)
    assert.equal(shouldBypassRolePolicyForAuthenticatedUser('/my-events', 'client'), false)
  })
})
```

- [ ] Run `node --test --import tsx tests/unit/route-policy.public-shadowing.test.ts` and confirm it fails (missing export, and `/availability` not yet chef-protected). That is RED.
- [ ] In `lib/auth/route-policy.ts`, add `'/availability',` to `CHEF_PROTECTED_PATHS` in alphabetical position (after `'/autopilot',`). Leave `'/availability'` in `PUBLIC_UNAUTHENTICATED_PATHS` untouched; unauthenticated token access depends on it.
- [ ] In `lib/auth/route-policy.ts`, add this function directly after the `isPublicUnauthenticatedPath` function:

```ts
/**
 * Middleware helper for AUTHENTICATED requests only.
 * Public paths normally bypass role policy, but three chef surfaces live
 * under public prefixes (/onboarding token pages, /chef public profiles,
 * /availability share tokens). For a signed-in chef, the chef-protected
 * match must win so role policy runs; every other role keeps the public
 * bypass so token and profile links keep working.
 * Unauthenticated traffic never reaches this check.
 */
export function shouldBypassRolePolicyForAuthenticatedUser(
  pathname: string,
  role: RouteSessionRole | null | undefined
): boolean {
  if (!isPublicUnauthenticatedPath(pathname)) return false
  if (role === 'chef' && isChefRoutePath(pathname)) return false
  return true
}
```

- [ ] Run `node --test --import tsx tests/unit/route-policy.public-shadowing.test.ts` and confirm it passes (GREEN).
- [ ] In `middleware.ts`, add `shouldBypassRolePolicyForAuthenticatedUser,` to the import block from `@/lib/auth/route-policy` (lines 4-11).
- [ ] In `middleware.ts`, replace the AUTHENTICATED public bypass (the second `isPublicUnauthenticatedPath` call site; it sits under the comment block at lines 281-283 that begins `// Route-level access control`):

  Old:

```ts
if (isPublicUnauthenticatedPath(pathname)) {
  return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }), requestId)
}
```

New:

```ts
if (shouldBypassRolePolicyForAuthenticatedUser(pathname, role)) {
  return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }), requestId)
}
```

Do NOT touch the first `isPublicUnauthenticatedPath` call at middleware.ts:179; that is the unauthenticated path and stays as it is.

- [ ] Run `npm run test:unit` and confirm the full unit suite is green. If `tests/unit/middleware.routing.test.ts` or `tests/unit/account-mode-contract.test.ts` assert the OLD contract (for example, that `/availability` is not a chef path), update those specific assertions to the new contract and explain the change in the commit body; do not weaken unrelated assertions.
- [ ] Run `npx tsc --noEmit --skipLibCheck` and confirm exit 0.
- [ ] Playwright regression probe against `http://localhost:3100` (agent sign-in per canon): visit `/onboarding` and `/availability` as the chef and confirm both render their chef pages (no redirect loop, no 404); then, signed out, fetch a known public page such as `/pricing` and confirm 200. If a share/availability token exists in the dev data, open `/availability/<token>` signed out and confirm it still renders.
- [ ] Commit: `git add lib/auth/route-policy.ts middleware.ts tests/unit/route-policy.public-shadowing.test.ts && git commit -m "fix(auth): run role policy on chef routes shadowed by public prefixes"`

---

### Task 7: Production boot tripwire for the test-auth endpoint [OPUS-ONLY]

`app/api/e2e/auth/route.ts:26-31` mints real session cookies whenever `E2E_ALLOW_TEST_AUTH=true` or `DATABASE_E2E_ALLOW_REMOTE=true`, gated only by a spoofable loopback header check. Both `.env:22` and `.env.local:100` currently carry `E2E_ALLOW_TEST_AUTH=true`, and the production process at app.cheflowhq.com boots from this checkout. The fix is a startup assertion in the existing `assertProductionSafetyEnv` chain (already called from `instrumentation.ts` `register()`), so a production boot with either flag hard-fails.

**Files:**

- Create: `tests/unit/production-safety.e2e-auth.test.ts`
- Modify: `lib/environment/production-safety.ts` (insert into `evaluateProductionSafetyEnv`, directly after the existing `DEMO_MODE_ENABLED` check)
- Modify (gated substep): `.env` line 22 and `.env.local` line 100

**Interfaces:**

- Consumes: `evaluateProductionSafetyEnv(env)` (already exported and env-injectable; note it calls `isProductionEnvironment()` which reads `process.env`, so tests must set `process.env.APP_ENV`).
- Produces: two new error strings in the `ProductionSafetyReport` when the flags are set in production.

**Steps:**

- [ ] Write the failing test at `tests/unit/production-safety.e2e-auth.test.ts`:

```ts
/**
 * Production boot tripwire: the E2E test-auth endpoint
 * (app/api/e2e/auth/route.ts) activates on E2E_ALLOW_TEST_AUTH=true or
 * DATABASE_E2E_ALLOW_REMOTE=true. Neither may be set in production.
 *
 * Run: node --test --import tsx tests/unit/production-safety.e2e-auth.test.ts
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateProductionSafetyEnv } from '../../lib/environment/production-safety'

// evaluateProductionSafetyEnv takes an env argument for the flags, but its
// production detection (isProductionEnvironment) reads process.env, so we
// force APP_ENV for the duration of each test.
let savedAppEnv: string | undefined

beforeEach(() => {
  savedAppEnv = process.env.APP_ENV
  process.env.APP_ENV = 'production'
})

afterEach(() => {
  if (savedAppEnv === undefined) delete process.env.APP_ENV
  else process.env.APP_ENV = savedAppEnv
})

const healthyProdEnv = {
  DATABASE_URL: 'postgres://example',
  RESEND_API_KEY: 'x',
  CRON_SECRET: 'x',
  NEXT_PUBLIC_SITE_URL: 'https://cheflowhq.com',
  NEXT_PUBLIC_APP_URL: 'https://app.cheflowhq.com',
} as NodeJS.ProcessEnv

describe('production safety: E2E auth flags', () => {
  it('E2E_ALLOW_TEST_AUTH=true is a boot error in production', () => {
    const report = evaluateProductionSafetyEnv({
      ...healthyProdEnv,
      E2E_ALLOW_TEST_AUTH: 'true',
    })
    assert.ok(report.errors.some((e) => e.includes('E2E_ALLOW_TEST_AUTH')))
  })

  it('DATABASE_E2E_ALLOW_REMOTE=true is a boot error in production', () => {
    const report = evaluateProductionSafetyEnv({
      ...healthyProdEnv,
      DATABASE_E2E_ALLOW_REMOTE: 'true',
    })
    assert.ok(report.errors.some((e) => e.includes('DATABASE_E2E_ALLOW_REMOTE')))
  })

  it('a clean production env produces neither error', () => {
    const report = evaluateProductionSafetyEnv({ ...healthyProdEnv })
    assert.equal(
      report.errors.some(
        (e) => e.includes('E2E_ALLOW_TEST_AUTH') || e.includes('DATABASE_E2E_ALLOW_REMOTE')
      ),
      false
    )
  })
})
```

- [ ] Run `node --test --import tsx tests/unit/production-safety.e2e-auth.test.ts` and confirm the first two tests fail (RED).
- [ ] In `lib/environment/production-safety.ts`, inside `evaluateProductionSafetyEnv`, directly after the existing block:

```ts
if (env.DEMO_MODE_ENABLED === 'true') {
  errors.push('DEMO_MODE_ENABLED must be false in production')
}
```

add:

```ts
if (env.E2E_ALLOW_TEST_AUTH === 'true') {
  errors.push(
    'E2E_ALLOW_TEST_AUTH must not be true in production. It activates the test sign-in endpoint at /api/e2e/auth.'
  )
}
if (env.DATABASE_E2E_ALLOW_REMOTE === 'true') {
  errors.push(
    'DATABASE_E2E_ALLOW_REMOTE must not be true in production. It activates the test sign-in endpoint at /api/e2e/auth.'
  )
}
```

- [ ] Run `node --test --import tsx tests/unit/production-safety.e2e-auth.test.ts` and confirm it passes (GREEN).
- [ ] Run `npx tsc --noEmit --skipLibCheck` and confirm exit 0, then commit the code and test: `git add lib/environment/production-safety.ts tests/unit/production-safety.e2e-auth.test.ts && git commit -m "fix(security): hard-fail production boot when E2E test-auth flags are set"`
- [ ] **GATE (owner): flip the live env flags and restart production.** Question for David: the server behind app.cheflowhq.com will refuse to boot on its next restart while `E2E_ALLOW_TEST_AUTH=true` remains in `.env` (line 22) or `.env.local` (line 100), and flipping them means agent test sign-in through `/api/e2e/auth` on port 3100 stops working (Playwright verification then needs a separate dev-mode server, or UI-form sign-in with `.auth/agent.json`). Blueprint recommendation (Section 9 item 5): flip both to `E2E_ALLOW_TEST_AUTH=false`, confirm `DATABASE_E2E_ALLOW_REMOTE` is absent or false in both files, and restart the production process at an agreed moment. The builder skips this substep unless the gate is marked approved; the tripwire from the previous steps is safe to ship on its own because it only fires on a production boot that still carries the flag, which is exactly the condition it exists to catch.

---

### Task 8: Demo endpoint request guard [OPUS-ONLY]

The three demo endpoints (`app/api/demo/data/route.ts`, `app/api/demo/switch/route.ts`, `app/api/demo/tier/route.ts`) are on the middleware skip list (`API_SKIP_AUTH_PREFIXES` includes `/api/demo`) and gate on `NODE_ENV !== 'production'` plus `DEMO_MODE_ENABLED === 'true'`. Their Origin check is `if (origin && !origin.includes('localhost')...)` in data/route.ts only, which means a request with NO Origin header (any non-browser client) passes, and switch/tier have no origin or loopback check at all. `data/route.ts` also uses the RLS-bypassing admin client (`createAdminClient`), which makes its reachable surface worth locking even in dev. Fix per blueprint Section 9 item 6: reject absent-Origin non-browser requests unless they come from loopback, mirroring the E2E route's IP derivation (`app/api/e2e/auth/route.ts:35-42`).

**Files:**

- Create: `lib/demo/request-guard.ts`
- Create: `tests/unit/demo.request-guard.test.ts`
- Modify: `app/api/demo/data/route.ts` (replace the gate block at the top of `POST`, lines 37-51)
- Modify: `app/api/demo/switch/route.ts` (replace the gate block at the top of `POST`, lines 10-17)
- Modify: `app/api/demo/tier/route.ts` (replace the gate block at the top of `POST`, lines 20-27)

**Interfaces:**

- Consumes: `NextRequest` from `next/server`.
- Produces: `evaluateDemoRequest(ctx: DemoRequestContext): DemoRequestDecision` (pure) and `evaluateDemoNextRequest(req: NextRequest): DemoRequestDecision` (header-reading wrapper).

**Steps:**

- [ ] Write the failing test at `tests/unit/demo.request-guard.test.ts`:

```ts
/**
 * Demo endpoint request guard. The demo routes bypass middleware auth
 * (API_SKIP_AUTH_PREFIXES includes /api/demo) and data/route.ts uses an
 * RLS-bypassing admin client, so the guard is the only gate they have.
 *
 * Run: node --test --import tsx tests/unit/demo.request-guard.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateDemoRequest } from '../../lib/demo/request-guard'

const enabled = { nodeEnv: 'development', demoModeEnabled: 'true' }

describe('demo request guard', () => {
  it('denies in production regardless of everything else', () => {
    const d = evaluateDemoRequest({
      nodeEnv: 'production',
      demoModeEnabled: 'true',
      origin: 'http://localhost:3100',
      remoteIp: '127.0.0.1',
    })
    assert.equal(d.allowed, false)
  })

  it('denies when DEMO_MODE_ENABLED is not true', () => {
    const d = evaluateDemoRequest({
      nodeEnv: 'development',
      demoModeEnabled: undefined,
      origin: 'http://localhost:3100',
      remoteIp: '127.0.0.1',
    })
    assert.equal(d.allowed, false)
  })

  it('allows a local browser request (local Origin header)', () => {
    const d = evaluateDemoRequest({
      ...enabled,
      origin: 'http://localhost:3100',
      remoteIp: '',
    })
    assert.equal(d.allowed, true)
  })

  it('denies a cross-origin browser request', () => {
    const d = evaluateDemoRequest({
      ...enabled,
      origin: 'https://evil.example.com',
      remoteIp: '127.0.0.1',
    })
    assert.equal(d.allowed, false)
  })

  it('allows a non-browser request (no Origin) only from loopback', () => {
    const loopback = evaluateDemoRequest({ ...enabled, origin: null, remoteIp: '127.0.0.1' })
    assert.equal(loopback.allowed, true)

    const remote = evaluateDemoRequest({ ...enabled, origin: null, remoteIp: '203.0.113.9' })
    assert.equal(remote.allowed, false)

    const unknown = evaluateDemoRequest({ ...enabled, origin: null, remoteIp: '' })
    assert.equal(unknown.allowed, false)
  })
})
```

- [ ] Run `node --test --import tsx tests/unit/demo.request-guard.test.ts` and confirm it fails with module-not-found (RED).
- [ ] Create `lib/demo/request-guard.ts`:

```ts
// lib/demo/request-guard.ts
// Shared gate for the /api/demo/* endpoints. These routes bypass
// middleware auth (API_SKIP_AUTH_PREFIXES) and data/route.ts uses the
// RLS-bypassing admin client, so this guard is their only protection.
//
// Rules:
//   1. Never in production.
//   2. Only when DEMO_MODE_ENABLED=true.
//   3. Browser requests (Origin present) must be same-machine local.
//   4. Non-browser requests (no Origin) must come from the loopback
//      interface, matching app/api/e2e/auth/route.ts:35-42.

import type { NextRequest } from 'next/server'

export type DemoRequestContext = {
  nodeEnv: string | undefined
  demoModeEnabled: string | undefined
  origin: string | null
  remoteIp: string
}

export type DemoRequestDecision =
  | { allowed: true }
  | { allowed: false; status: number; reason: string }

export function evaluateDemoRequest(ctx: DemoRequestContext): DemoRequestDecision {
  if (ctx.nodeEnv === 'production') {
    return { allowed: false, status: 403, reason: 'demo endpoints are not available in production' }
  }
  if (ctx.demoModeEnabled !== 'true') {
    return { allowed: false, status: 403, reason: 'DEMO_MODE_ENABLED is not set' }
  }

  const isLoopback =
    ctx.remoteIp === '127.0.0.1' || ctx.remoteIp === '::1' || ctx.remoteIp === 'localhost'
  const isLocalOrigin =
    !!ctx.origin && (ctx.origin.includes('localhost') || ctx.origin.includes('127.0.0.1'))

  if (ctx.origin && !isLocalOrigin) {
    return { allowed: false, status: 403, reason: 'cross-origin request' }
  }
  if (!ctx.origin && !isLoopback) {
    return { allowed: false, status: 403, reason: 'non-browser request from a non-local address' }
  }
  return { allowed: true }
}

export function evaluateDemoNextRequest(req: NextRequest): DemoRequestDecision {
  const forwardedFor = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const remoteIp = forwardedFor?.split(',')[0]?.trim() ?? realIp ?? ''
  return evaluateDemoRequest({
    nodeEnv: process.env.NODE_ENV,
    demoModeEnabled: process.env.DEMO_MODE_ENABLED,
    origin: req.headers.get('origin'),
    remoteIp,
  })
}
```

- [ ] Run `node --test --import tsx tests/unit/demo.request-guard.test.ts` and confirm it passes (GREEN).
- [ ] In each of the three routes, add the import `import { evaluateDemoNextRequest } from '@/lib/demo/request-guard'` and replace the existing gate block at the top of `POST` with:

```ts
const gate = evaluateDemoNextRequest(req)
if (!gate.allowed) {
  return new NextResponse(`Forbidden - ${gate.reason}`, { status: gate.status })
}
```

The blocks being replaced are: in `data/route.ts` the three `if` blocks at lines 37-51 (production check, DEMO_MODE check, and the old origin check); in `switch/route.ts` the two `if` blocks at lines 10-17; in `tier/route.ts` the two `if` blocks at lines 20-27. Remove nothing else; the body parsing and everything below stays as it is.

- [ ] Run `npx tsc --noEmit --skipLibCheck` and confirm exit 0.
- [ ] Behavior probe from the local machine with the dev server up (Git Bash): `curl -s -o /dev/null -w "%{http_code}" -X POST -H "Origin: https://evil.example.com" -H "Content-Type: application/json" -d '{"target":"chef"}' http://localhost:3100/api/demo/switch` must print 403. Then confirm the browser control panel path still works if `DEMO_MODE_ENABLED=true` locally (or note that the flag is off locally and the 403-everything behavior is correct for that state).
- [ ] Commit: `git add lib/demo/request-guard.ts tests/unit/demo.request-guard.test.ts app/api/demo/data/route.ts app/api/demo/switch/route.ts app/api/demo/tier/route.ts && git commit -m "fix(security): require local origin or loopback on demo endpoints"`

---

### Task 9: Label god-mode's hardcoded numbers as sample data [CODEX-SAFE]

`app/(chef)/events/[id]/god-mode/page.tsx` is auth-gated (`requireChef()` at :21) but builds its "Event Operating Packet" from literals: a hardcoded chicken-and-herbs cart at lines 26-44, a $3,000 quote at :48 and :61, fabricated automation counts at :66. It renders these as if they were the event's real figures, which violates the Zero Hallucination rule. The full fix (wire to real data) belongs to the god-mode Labs decision in Phase C (`docs/specs/rescue/2026-07-10-rescue-ws4-phase-c-modules.md` Task 11, which skips its own banner step when this one has landed); this task adds the honest banner the blueprint requires either way (Section 9 item 7). TDD-EXEMPT: pure layout addition, no logic.

**Files:**

- Modify: `app/(chef)/events/[id]/god-mode/page.tsx` (insert one element as the first child of `<main>` at line 79)

**Interfaces:** none (JSX only).

**Steps:**

- [ ] In `app/(chef)/events/[id]/god-mode/page.tsx`, the `<main>` element at line 79 opens with `<section className="space-y-4">` as its first child. Insert this banner between the `<main ...>` open tag and that `<section>`:

```tsx
<div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm lg:col-span-2">
  <span className="font-medium">Sample data.</span> This packet is a demonstration of the
  operating-packet format. The costs, quote, and automation counts below are fixed examples, not
  this event&apos;s real figures.
</div>
```

(`lg:col-span-2` keeps it full-width above the two-column grid.)

- [ ] Run `npx tsc --noEmit --skipLibCheck` and confirm exit 0.
- [ ] Verification grep: `grep -n "Sample data" "app/(chef)/events/[id]/god-mode/page.tsx"` prints the inserted line.
- [ ] Optional render probe if dev data has at least one event: sign in as the agent (canon), open `http://localhost:3100/events`, follow any event link, append `/god-mode` to its URL, and confirm the banner renders above the packet. If no event exists, record that the probe was skipped and why.
- [ ] Commit: `git add "app/(chef)/events/[id]/god-mode/page.tsx" && git commit -m "fix(events): banner god-mode packet as sample data per zero-hallucination rule"`

---

### Task 10: Fix the invalid 'platform' inquiry channel [CODEX-SAFE]

`lib/communication/pipeline.ts:736-737` maps the `takeachef` and `yhangry` sources to channel `'platform'`, which is not a value of the `inquiry_channel` enum (`types/database.ts:52015`; valid values include `take_a_chef` and `yhangry` directly). The insert at pipeline.ts:740-747 therefore fails at the database for those two sources, and the failure is unchecked, so staged inquiries from Take a Chef and Yhangry silently never get created. Fix: correct the two values and move the map into a small exported module so a unit test pins every value to the enum.

**Files:**

- Create: `lib/communication/inquiry-channel-map.ts`
- Create: `tests/unit/communication.inquiry-channel-map.test.ts`
- Modify: `lib/communication/pipeline.ts` (imports at line 1; the inline `channelMap` at lines 730-738 and its use at line 744)
- Modify: `docs/test-coverage-blueprint.md` (add the new test)

**Interfaces:**

- Consumes: nothing (pure data module; pipeline.ts has no 'use server' directive, so importing a const is fine).
- Produces: `INQUIRY_CHANNEL_BY_SOURCE: Record<string, string>` and `INQUIRY_CHANNEL_FALLBACK = 'other'`.

**Steps:**

- [ ] Write the failing test at `tests/unit/communication.inquiry-channel-map.test.ts`:

```ts
/**
 * Inquiry channel mapping for the communication pipeline auto-stager.
 * Every mapped value must be a member of the inquiry_channel enum
 * (types/database.ts:52015). The old inline map sent 'platform', which
 * is not in the enum, so takeachef/yhangry staged inquiries failed
 * silently at insert time.
 *
 * Run: node --test --import tsx tests/unit/communication.inquiry-channel-map.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  INQUIRY_CHANNEL_BY_SOURCE,
  INQUIRY_CHANNEL_FALLBACK,
} from '../../lib/communication/inquiry-channel-map'

// Copied from the inquiry_channel enum in types/database.ts:52015.
// If the enum gains values this list may lag, which is safe; it only
// needs to contain every value the map is allowed to emit.
const VALID_INQUIRY_CHANNELS = [
  'text',
  'email',
  'instagram',
  'take_a_chef',
  'phone',
  'website',
  'other',
  'referral',
  'walk_in',
  'wix',
  'campaign_response',
  'outbound_prospecting',
  'yhangry',
  'kiosk',
  'thumbtack',
  'theknot',
  'bark',
  'cozymeal',
  'google_business',
  'gigsalad',
]

describe('inquiry channel map', () => {
  it('every mapped value is a valid inquiry_channel enum member', () => {
    for (const [source, channel] of Object.entries(INQUIRY_CHANNEL_BY_SOURCE)) {
      assert.ok(
        VALID_INQUIRY_CHANNELS.includes(channel),
        `source '${source}' maps to '${channel}' which is not in the inquiry_channel enum`
      )
    }
  })

  it('the fallback is a valid enum member', () => {
    assert.ok(VALID_INQUIRY_CHANNELS.includes(INQUIRY_CHANNEL_FALLBACK))
  })

  it('never emits the invalid platform value', () => {
    assert.ok(!Object.values(INQUIRY_CHANNEL_BY_SOURCE).includes('platform'))
  })

  it('takeachef and yhangry map to their real enum values', () => {
    assert.equal(INQUIRY_CHANNEL_BY_SOURCE['takeachef'], 'take_a_chef')
    assert.equal(INQUIRY_CHANNEL_BY_SOURCE['yhangry'], 'yhangry')
  })
})
```

- [ ] Run `node --test --import tsx tests/unit/communication.inquiry-channel-map.test.ts` and confirm module-not-found failure (RED).
- [ ] Create `lib/communication/inquiry-channel-map.ts`:

```ts
// lib/communication/inquiry-channel-map.ts
// Maps communication-pipeline sources to inquiries.channel values.
// Values must be members of the inquiry_channel enum
// (types/database.ts:52015); tests/unit/communication.inquiry-channel-map.test.ts
// enforces it. Unmapped sources fall back to 'other'.

export const INQUIRY_CHANNEL_BY_SOURCE: Record<string, string> = {
  email: 'email',
  sms: 'text',
  whatsapp: 'text',
  instagram: 'instagram',
  takeachef: 'take_a_chef',
  yhangry: 'yhangry',
}

export const INQUIRY_CHANNEL_FALLBACK = 'other'
```

- [ ] Run `node --test --import tsx tests/unit/communication.inquiry-channel-map.test.ts` and confirm it passes (GREEN).
- [ ] In `lib/communication/pipeline.ts`, add below the existing imports at the top of the file:

```ts
import { INQUIRY_CHANNEL_BY_SOURCE, INQUIRY_CHANNEL_FALLBACK } from './inquiry-channel-map'
```

- [ ] In `lib/communication/pipeline.ts`, delete the inline map (lines 730-738):

```ts
// Create staged inquiry
const channelMap: Record<string, string> = {
  email: 'email',
  sms: 'text',
  whatsapp: 'text',
  instagram: 'instagram',
  takeachef: 'platform',
  yhangry: 'platform',
}
```

keeping only the comment line `  // Create staged inquiry`, and change the insert field at line 744 from `channel: channelMap[input.source] || 'other',` to:

```ts
    channel: INQUIRY_CHANNEL_BY_SOURCE[input.source] || INQUIRY_CHANNEL_FALLBACK,
```

- [ ] Run `npx tsc --noEmit --skipLibCheck` and confirm exit 0, then `node --test --import tsx tests/unit/communication.inquiry-channel-map.test.ts` once more.
- [ ] Add the new test to `docs/test-coverage-blueprint.md` under the communication section (VERIFIED, inquiry channel enum safety).
- [ ] Commit: `git add lib/communication/inquiry-channel-map.ts lib/communication/pipeline.ts tests/unit/communication.inquiry-channel-map.test.ts docs/test-coverage-blueprint.md && git commit -m "fix(communication): map takeachef/yhangry to valid inquiry channels"`

---

### Task 11: Fix the dead push notification URL [CODEX-SAFE]

`lib/notifications/onesignal.ts:130` sends payment-received pushes with `url: '/finances'`; no such route exists, the door is `/finance`. One-string fix. TDD-EXEMPT: a URL literal inside a push payload, verified by grep and typecheck.

**Files:**

- Modify: `lib/notifications/onesignal.ts` (line 130, inside `notifyPaymentReceived`)

**Interfaces:** none (payload literal).

**Steps:**

- [ ] In `lib/notifications/onesignal.ts`, inside `notifyPaymentReceived` (declared at line 122), change:

```ts
    url: '/finances',
```

to:

```ts
    url: '/finance',
```

- [ ] Verification grep: `grep -rn "'/finances'" lib app --include="*.ts" --include="*.tsx"` returns no hits.
- [ ] Run `npx tsc --noEmit --skipLibCheck` and confirm exit 0.
- [ ] Commit: `git add lib/notifications/onesignal.ts && git commit -m "fix(notifications): point payment push at /finance instead of dead /finances"`

---

### Task 12: Workstream closeout [CODEX-SAFE]

Runs after every non-gated task above has landed (gated substeps may still be pending; note them).

**Files:**

- Modify (if needed): `docs/test-coverage-blueprint.md` (confirm all nine new test files from Tasks 1, 2, 3, 5-8, 10 are recorded; add any missed)

**Steps:**

- [ ] Run `npm run test:unit` and confirm the full unit suite is green.
- [ ] Run `npx tsc --noEmit --skipLibCheck` and confirm exit 0.
- [ ] Run `npm run regression:firewall`. Known pre-existing failure: the wiring audit's zero-orphan contract currently fails on the `/studio/preview` orphan from the untouchable dirty Studio work (verified in `scripts/wiring-audit-results.json`, summary `orphans: 1`). If WS2 Task 2 (expected-orphan allowlist, in `docs/specs/rescue/2026-07-10-rescue-ws2-phase-a-reorganize.md`) has landed, the firewall must pass clean. If it has not landed, that single orphan is the ONLY acceptable failure; record its exact text, cite this exemption, and treat any other failure as this workstream's to fix.
- [ ] Confirm `docs/test-coverage-blueprint.md` lists: feature-gates.tier-resolution.test.ts, feature-gates.billing-slug-map.test.ts, billing.require-pro-wiring.test.ts, require-pro-enforcement.spec.ts, route-policy.chef-coverage.test.ts, route-policy.public-shadowing.test.ts, production-safety.e2e-auth.test.ts, demo.request-guard.test.ts, communication.inquiry-channel-map.test.ts, each with VERIFIED status.
- [ ] Closeout statement must name the exact URL verified (`http://localhost:3100`), list which gated substeps remain open (Task 7 env flip; any Task 3 probe caveat about agent admin bypass), and confirm zero routes were removed and zero migrations were created.
- [ ] Commit any blueprint-doc stragglers: `git add docs/test-coverage-blueprint.md && git commit -m "docs(tests): record WS1 security test coverage"`
