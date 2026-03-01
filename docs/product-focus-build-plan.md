# ChefFlow — Product Focus Build Plan

> **Principle: Nothing is deleted. Everything is preserved, gated, or hidden.**
> This document is the exact implementation spec. Every file path, every function, every test case.

---

## Table of Contents

1. [Phase 1: Focus Mode (Uses Existing Module System)](#phase-1-focus-mode)
2. [Phase 2: Core Workflow Verification](#phase-2-core-workflow-verification)
3. [Phase 3: Unit Test Suite for Financial/FSM/Auth](#phase-3-unit-test-suite)
4. [Phase 4: CI/CD Hardening](#phase-4-cicd-hardening)
5. [Phase 5: Environment Separation](#phase-5-environment-separation)
6. [Phase 6: AI Simplification](#phase-6-ai-simplification)
7. [Phase 7: Migration Consolidation](#phase-7-migration-consolidation)
8. [Phase 8: User Onboarding & First Customer](#phase-8-user-onboarding)

---

## Phase 1: Focus Mode {#phase-1-focus-mode}

### What Already Exists (No New Infrastructure Needed)

| Layer               | File                                  | What It Does                                                  |
| ------------------- | ------------------------------------- | ------------------------------------------------------------- |
| Module registry     | `lib/billing/modules.ts`              | 10 modules with `defaultEnabled`, `alwaysVisible`, tier       |
| Module toggle       | `lib/billing/module-actions.ts`       | `getEnabledModules()`, `toggleModule()`, `enableAllModules()` |
| Module storage      | `chef_preferences.enabled_modules`    | JSONB array per chef                                          |
| Nav filtering       | `components/navigation/chef-nav.tsx`  | Filters nav groups by enabled modules                         |
| Pro gating (server) | `lib/billing/require-pro.ts`          | `requirePro(featureSlug)` throws if not Pro                   |
| Pro gating (UI)     | `components/billing/upgrade-gate.tsx` | `<UpgradeGate>` hides/blurs/blocks                            |
| Pro features        | `lib/billing/pro-features.ts`         | 27 features across 13 categories                              |
| Tier resolution     | `lib/billing/tier.ts`                 | Free vs Pro from subscription status                          |

### What To Build

**A "Focus Mode" toggle that sets enabled modules to CORE ONLY.** When on, the chef sees 12 features. When off, they see everything. Uses the existing module system — zero new infrastructure.

### File 1: `lib/billing/focus-mode.ts` (NEW — ~60 lines)

```typescript
'use server'

import { revalidateTag } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { CHEF_LAYOUT_CACHE_TAG } from '@/lib/billing/module-actions'

// The 12 core workflows a private chef needs daily
export const CORE_MODULES = [
  'dashboard', // Home view
  'pipeline', // Inquiries, quotes, leads
  'events', // Events, calendar
  'culinary', // Menus, recipes
  'clients', // Client management
  'finance', // Revenue, expenses, ledger
] as const

// Everything else — preserved, just hidden in Focus Mode
export const EXTENDED_MODULES = [
  'protection', // Safety, compliance
  'more', // Marketing, analytics, community
  'commerce', // Kiosk, POS
  'social-hub', // Social publishing
] as const

export async function isFocusModeEnabled(): Promise<boolean> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('chef_preferences')
    .select('focus_mode')
    .eq('chef_id', user.entityId)
    .single()

  // Default to ON for new users (guided experience)
  return data?.focus_mode ?? true
}

export async function toggleFocusMode(enabled: boolean): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Update focus mode flag
  await supabase.from('chef_preferences').upsert(
    {
      chef_id: user.entityId,
      focus_mode: enabled,
      enabled_modules: enabled ? [...CORE_MODULES] : [...CORE_MODULES, ...EXTENDED_MODULES],
    },
    { onConflict: 'chef_id' }
  )

  revalidateTag(CHEF_LAYOUT_CACHE_TAG(user.entityId))
}
```

### File 2: Migration — Add `focus_mode` column

```sql
-- Migration: add focus_mode to chef_preferences
-- File: supabase/migrations/TIMESTAMP_add_focus_mode.sql

ALTER TABLE chef_preferences
ADD COLUMN IF NOT EXISTS focus_mode BOOLEAN DEFAULT true;

COMMENT ON COLUMN chef_preferences.focus_mode IS
  'When true, sidebar shows only core modules (dashboard, pipeline, events, culinary, clients, finance). All features remain accessible — just hidden from nav.';
```

### File 3: Settings UI — `app/(chef)/settings/modules/page.tsx` (EDIT existing)

Add a Focus Mode toggle at the top of the existing module settings page:

```tsx
// Add at top of the module list, before individual toggles:

;<div className="mb-8 rounded-xl border-2 border-brand-500 bg-brand-50 p-6">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-lg font-semibold">Focus Mode</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Show only the essentials: inquiries, events, clients, menus, recipes, and finances. Turn off
        to unlock all {CORE_MODULES.length + EXTENDED_MODULES.length} modules.
      </p>
    </div>
    <Switch
      checked={focusMode}
      onCheckedChange={async (checked) => {
        await toggleFocusMode(checked)
        router.refresh()
      }}
    />
  </div>
</div>

{
  /* When Focus Mode is ON, show a simple list of what's active */
}
{
  focusMode && (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Active modules in Focus Mode:</p>
      <ul className="list-disc list-inside text-sm space-y-1">
        <li>Dashboard — Your home base</li>
        <li>Sales Pipeline — Inquiries, quotes, leads</li>
        <li>Events — Calendar, event management</li>
        <li>Culinary — Menus, recipes, prep</li>
        <li>Clients — Client profiles, communication</li>
        <li>Finance — Revenue, expenses, payments</li>
      </ul>
      <p className="text-xs text-muted-foreground mt-4">
        All other features (marketing, analytics, commerce, etc.) are still here — just hidden from
        the sidebar. Turn off Focus Mode anytime to see everything.
      </p>
    </div>
  )
}

{
  /* When Focus Mode is OFF, show the existing individual module toggles */
}
{
  !focusMode && <>{/* existing module toggle UI unchanged */}</>
}
```

### File 4: Onboarding default (EDIT `lib/billing/module-actions.ts`)

Change `DEFAULT_ENABLED_MODULES` to match core-only:

```typescript
// BEFORE (current):
export const DEFAULT_ENABLED_MODULES = [
  'dashboard',
  'pipeline',
  'events',
  'culinary',
  'clients',
  'finance',
]

// This is ALREADY core-only! Verify this is the case.
// If it includes extended modules, change it to core-only.
```

### What This Achieves

- **New chef signs up → sees 6 clean module groups in the sidebar** (not 10+)
- **Settings → Modules → Focus Mode OFF → sees everything** (nothing deleted)
- **Existing chefs unaffected** — their `enabled_modules` preference is preserved
- **Zero code deleted** — every page, component, and route stays in the codebase
- **Built on existing infrastructure** — module filtering already works in `chef-nav.tsx`

### Nav Items That Get Hidden in Focus Mode

These nav groups are hidden (not deleted) when Focus Mode is on:

| Nav Group    | What's In It                                      | Status |
| ------------ | ------------------------------------------------- | ------ |
| `protection` | Safety, compliance, temp logs                     | Hidden |
| `more`       | Marketing, analytics, community, network, charity | Hidden |
| `commerce`   | Kiosk, POS, commerce receipts                     | Hidden |
| `social-hub` | Social publishing                                 | Hidden |

### Standalone Top Items to Gate

Review `standaloneTop` in `nav-config.tsx` — some of these should also be gated by Focus Mode:

| Item         | Core?      | Action                                  |
| ------------ | ---------- | --------------------------------------- |
| Dashboard    | Yes        | Always show                             |
| Queue        | Yes        | Always show (inbox)                     |
| Calendar     | Yes        | Always show                             |
| Daily        | Yes        | Always show                             |
| Inquiries    | Yes        | Always show                             |
| Events       | Yes        | Always show                             |
| Clients      | Yes        | Always show                             |
| Quotes       | Yes        | Always show                             |
| Recipes      | Yes        | Always show                             |
| Menus        | Yes        | Always show                             |
| Leads        | Yes        | Always show (part of pipeline)          |
| Finance      | Yes        | Always show                             |
| Activity     | Borderline | Show (low noise)                        |
| Proposals    | Borderline | Show (part of quote flow)               |
| Calls        | No         | Hide in Focus Mode                      |
| Testimonials | No         | Hide in Focus Mode                      |
| Staff        | No         | Hide in Focus Mode (unless staff exist) |

**Implementation:** Add a `focusMode?: boolean` check in `chef-nav.tsx` where `standaloneTop` items are rendered. Tag each item in `nav-config.tsx` with `coreFeature: true/false`.

---

## Phase 2: Core Workflow Verification {#phase-2-core-workflow-verification}

### The 12 Core Workflows — End-to-End Verification

Before writing tests, manually verify (via Playwright agent account) that each core workflow works end-to-end. Document gaps.

| #   | Workflow              | Start                       | End                                 | Pages Involved                          |
| --- | --------------------- | --------------------------- | ----------------------------------- | --------------------------------------- |
| 1   | Receive inquiry       | Public inquiry form / embed | Inquiry appears in queue            | `/embed/inquiry/[chefId]`, `/inquiries` |
| 2   | View & triage inquiry | Inquiry detail              | Inquiry marked, event created       | `/inquiries/[id]`                       |
| 3   | Create quote          | Quote form                  | Quote saved as draft                | `/quotes/new`, `/quotes/[id]`           |
| 4   | Send quote to client  | Quote detail                | Client receives email with quote    | `/quotes/[id]` (send action)            |
| 5   | Client accepts quote  | Client quote view           | Event status → accepted             | `/my-quotes/[id]` (client portal)       |
| 6   | Collect deposit       | Payment link in email       | Ledger entry created, status → paid | Stripe Checkout → webhook               |
| 7   | Plan menu             | Menu builder                | Menu attached to event              | `/menus/[id]`, `/recipes`               |
| 8   | Build grocery list    | Event detail                | Shopping list generated             | `/events/[id]/grocery-quote`            |
| 9   | Execute event         | Event detail                | Status → in_progress → completed    | `/events/[id]` transitions              |
| 10  | Collect final payment | Invoice/payment link        | Full balance paid in ledger         | Stripe → webhook → ledger               |
| 11  | Send receipt/invoice  | Event detail or auto        | Client receives receipt             | `/documents/receipt/[eventId]`          |
| 12  | Follow up             | Client profile              | Thank you sent, rebooking noted     | `/clients/[id]`, chat                   |

### Verification Procedure (Use Agent Account)

For each workflow:

1. Launch Playwright with agent credentials
2. Execute the workflow step by step
3. Screenshot each step
4. Document: works / broken / missing step
5. If broken: fix immediately, re-verify

### Output: `docs/core-workflow-status.md`

Create this file after verification. Format:

```markdown
# Core Workflow Status

| #   | Workflow        | Status     | Notes                                      |
| --- | --------------- | ---------- | ------------------------------------------ |
| 1   | Receive inquiry | ✅ Working | Tested via embed form                      |
| 2   | View & triage   | ⚠️ Partial | Missing "create event from inquiry" button |
| ... | ...             | ...        | ...                                        |
```

---

## Phase 3: Unit Test Suite {#phase-3-unit-test-suite}

### What Already Exists

| What                   | Count      | Location                                                   |
| ---------------------- | ---------- | ---------------------------------------------------------- |
| E2E tests (Playwright) | 148 files  | `tests/`                                                   |
| Unit tests             | 10 files   | `tests/unit/`                                              |
| Integration tests      | 1 file     | `tests/integration/`                                       |
| Soak tests             | 3 files    | `tests/soak/`                                              |
| Remy quality tests     | 12 runners | `tests/remy-quality/`                                      |
| CI pipeline            | 4 jobs     | `.github/workflows/ci.yml`                                 |
| Existing FSM test      | 1 file     | `tests/unit/events.fsm.test.ts`                            |
| Existing ledger test   | 1 file     | `tests/integration/ledger-idempotency.integration.test.ts` |

### What's Missing (The 30 Critical Tests)

Build on the existing `tests/unit/` and `tests/integration/` directories. Use Node's built-in `--test` runner (already configured in `package.json`).

---

### Test Group A: Financial Integrity (10 tests)

**File: `tests/unit/ledger.compute.test.ts` (NEW)**

```typescript
import { describe, it, assert } from 'node:test'
// Test the pure computation logic — no DB required

describe('Ledger Computation', () => {
  it('A1: computes net revenue = payments - refunds', () => {
    // Given ledger entries with 3 payments and 1 refund
    // When computeNetRevenue is called
    // Then result = sum(payments) - sum(refunds)
  })

  it('A2: outstanding balance = quoted - total paid', () => {
    // Given quoted_price_cents = 50000, total_paid = 10000
    // When getOutstandingBalance is called
    // Then result = 40000
  })

  it('A3: profit margin = (revenue - expenses) / revenue', () => {
    // Given revenue = 50000, expenses = 15000
    // When computeProfitMargin is called
    // Then result = 0.70 (70%)
  })

  it('A4: food cost % = expenses / revenue', () => {
    // Given expenses = 15000, revenue = 50000
    // When computeFoodCostPercentage is called
    // Then result = 0.30 (30%)
  })

  it('A5: handles zero revenue without division by zero', () => {
    // Given revenue = 0, expenses = 5000
    // When computeProfitMargin is called
    // Then result = 0 (not NaN, not Infinity)
  })

  it('A6: all amounts are integers (cents), never floats', () => {
    // Given any computation
    // When result is returned
    // Then Number.isInteger(result) === true
  })

  it('A7: tip is tracked separately from revenue', () => {
    // Given payments of 50000 + tip of 5000
    // When computing event financial summary
    // Then tipAmountCents = 5000, not added to totalPaidCents
  })
})
```

**File: `tests/unit/ledger.payment-status.test.ts` (NEW)**

```typescript
describe('Payment Status Derivation', () => {
  it('A8: unpaid when no ledger entries exist', () => {
    // Given event with quoted_price = 50000 and no ledger entries
    // Then payment_status = 'unpaid'
  })

  it('A9: deposit_paid when deposit covered but balance outstanding', () => {
    // Given deposit_amount = 10000, total_paid = 10000, quoted = 50000
    // Then payment_status = 'deposit_paid'
  })

  it('A10: paid when total_paid >= quoted_price', () => {
    // Given quoted = 50000, total_paid = 50000
    // Then payment_status = 'paid'
  })
})
```

---

### Test Group B: Event FSM (8 tests)

**File: `tests/unit/events.fsm.test.ts` (EXTEND existing)**

Add these test cases to the existing FSM test file:

```typescript
describe('Event State Machine', () => {
  // Valid transitions
  it('B1: draft → proposed is allowed (chef)', () => {})
  it('B2: proposed → accepted is allowed (client)', () => {})
  it('B3: accepted → paid is allowed (system/webhook only)', () => {})
  it('B4: paid → confirmed is allowed (chef)', () => {})
  it('B5: confirmed → in_progress is allowed (chef)', () => {})
  it('B6: in_progress → completed is allowed (chef)', () => {})

  // Invalid transitions
  it('B7: draft → paid is rejected (cannot skip steps)', () => {
    // The ONLY exception: draft → paid via instant-book Stripe path (system)
    // Manual chef/client attempt to go draft → paid must fail
  })

  it('B8: completed → draft is rejected (no rollback from terminal)', () => {
    // Completed and cancelled are terminal states
    // No transition out of them is allowed
  })
})
```

---

### Test Group C: Quote Math (5 tests)

**File: `tests/unit/quotes.math.test.ts` (NEW)**

```typescript
describe('Quote Calculations', () => {
  it('C1: per_person pricing = price_per_person × guest_count', () => {
    // Given price_per_person_cents = 7500, guest_count = 8
    // Then total_quoted_cents = 60000
  })

  it('C2: deposit_amount from percentage = total × (percentage / 100)', () => {
    // Given total = 60000, deposit_percentage = 25
    // Then deposit_amount_cents = 15000
  })

  it('C3: flat_rate pricing uses total directly', () => {
    // Given pricing_model = 'flat_rate', total_quoted_cents = 50000
    // Then total = 50000 regardless of guest count
  })

  it('C4: quote snapshot freezes on acceptance', () => {
    // Given a sent quote that is accepted
    // Then snapshot_frozen = true
    // And pricing_snapshot contains the price at time of acceptance
  })

  it('C5: expired quotes cannot be accepted', () => {
    // Given a quote with valid_until in the past
    // When client tries to accept
    // Then rejection with 'quote expired' error
  })
})
```

---

### Test Group D: Auth & Tenant Isolation (7 tests)

**File: `tests/unit/auth.tenant-isolation.test.ts` (NEW)**

```typescript
describe('Tenant Isolation', () => {
  it('D1: requireChef() returns tenantId from session, not request', () => {
    // Verify that tenantId comes from user_roles + entity_id lookup
    // Not from any request body, query param, or header
  })

  it('D2: chef A cannot query chef B tenant data', () => {
    // Given two chefs with different tenant_ids
    // When chef A queries events
    // Then only chef A's events are returned (RLS + explicit .eq)
  })

  it('D3: client can only see their own events', () => {
    // Given a client with 2 events and another client with 3
    // When client A queries events
    // Then only their 2 events are returned
  })

  it('D4: unauthenticated request to protected API returns 401', () => {
    // Given no auth cookie/token
    // When calling any /api/ route that uses requireChef()
    // Then response status = 401
  })

  it('D5: role cookie is HMAC-signed and cannot be forged', () => {
    // Given a tampered role cookie (e.g., "chef.fakesignature")
    // When verifyRoleCookie is called
    // Then returns null (rejected)
  })

  it('D6: admin bypass only works for ADMIN_EMAILS', () => {
    // Given email NOT in ADMIN_EMAILS
    // When isAdmin() is called
    // Then returns false
  })

  it('D7: service role client is never used in user-facing actions', () => {
    // Grep all server actions in lib/
    // Verify createServerClient({ admin: true }) is NOT used
    // Except in: signup, staff setup, partner setup, webhook handlers
  })
})
```

---

### File Locations for All New Tests

```
tests/
├── unit/
│   ├── events.fsm.test.ts              (EXTEND — add B1-B8)
│   ├── ledger.compute.test.ts          (NEW — A1-A7)
│   ├── ledger.payment-status.test.ts   (NEW — A8-A10)
│   ├── quotes.math.test.ts            (NEW — C1-C5)
│   ├── auth.tenant-isolation.test.ts   (NEW — D1-D7)
│   └── ... (existing 9 files unchanged)
├── integration/
│   ├── ledger-idempotency.integration.test.ts  (EXISTING — unchanged)
│   ├── core-workflow.integration.test.ts       (NEW — Phase 2 output)
│   └── stripe-webhook.integration.test.ts      (NEW — future)
└── ... (all existing test dirs unchanged)
```

### Package.json Script Updates

```json
{
  "scripts": {
    "test:unit": "node --test tests/unit/*.test.ts",
    "test:unit:financial": "node --test tests/unit/ledger.*.test.ts tests/unit/quotes.*.test.ts",
    "test:unit:fsm": "node --test tests/unit/events.fsm.test.ts",
    "test:unit:auth": "node --test tests/unit/auth.*.test.ts",
    "test:critical": "node --test tests/unit/ledger.*.test.ts tests/unit/events.fsm.test.ts tests/unit/quotes.*.test.ts tests/unit/auth.*.test.ts"
  }
}
```

---

## Phase 4: CI/CD Hardening {#phase-4-cicd-hardening}

### Current CI (`.github/workflows/ci.yml`)

| Job         | What                               | Timeout |
| ----------- | ---------------------------------- | ------- |
| Type Check  | `tsc --noEmit --skipLibCheck`      | 10 min  |
| Unit Tests  | `npm run test:unit`                | 5 min   |
| Build       | `next build --no-lint`             | 15 min  |
| Smoke Tests | Playwright smoke (PR to main only) | 20 min  |

### What To Add

**File: `.github/workflows/ci.yml` (EDIT)**

Add a `critical-tests` job that runs the 30 financial/FSM/auth tests:

```yaml
critical-tests:
  name: Critical Business Logic Tests
  runs-on: ubuntu-latest
  timeout-minutes: 5
  needs: [type-check]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    - run: npm ci
    - run: npm run test:critical
      env:
        # These tests should NOT need a real DB connection
        # They test pure computation logic
        NODE_ENV: test
```

**Add branch protection rule on GitHub:**

- Require `critical-tests` job to pass before merge to `main`
- Require `type-check` job to pass
- Require `build` job to pass

### Vercel Preview Deployments (Replace Pi for Staging)

**Current:** Pi builds take 8-10 min, 8GB RAM, OOM risk, shared DB, SSH deploy scripts.

**Proposed:** Keep the Pi as-is (don't delete anything), but ADD Vercel previews for feature branches.

**File: `vercel.json` (EDIT)**

```json
{
  "ignoreCommand": "if [ \"$VERCEL_GIT_COMMIT_REF\" = \"main\" ]; then exit 1; else exit 0; fi"
}
```

Wait — this is backwards. Currently Vercel IGNORES feature branches. To get preview deployments, change to:

```json
{
  "ignoreCommand": "exit 1"
}
```

This tells Vercel to build ALL branches (preview) and main (production). Feature branches get preview URLs automatically.

**ALTERNATIVE (safer):** Keep current ignoreCommand. Use GitHub Actions to deploy previews only:

```yaml
preview:
  name: Vercel Preview
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'
  needs: [type-check, critical-tests, build]
  steps:
    - uses: amondnet/vercel-preview-deploy@v2
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

**The Pi stays.** It's still useful for local network testing, Ollama hosting, and as a fallback. Just stop depending on it as the primary staging environment.

---

## Phase 5: Environment Separation {#phase-5-environment-separation}

### Current Problem

| Environment        | Database                        | Risk                   |
| ------------------ | ------------------------------- | ---------------------- |
| localhost:3100     | Supabase (luefkpakzvxcsqroxyhz) | Dev writes to prod DB  |
| beta.cheflowhq.com | Same Supabase                   | Beta writes to prod DB |
| app.cheflowhq.com  | Same Supabase                   | Production             |

All three environments share one database. A bad migration or test data pollution affects production.

### Solution: Separate Supabase Project for Dev/Test

1. **Create a new Supabase project** (free tier): `chefflow-dev`
2. **Apply all 335 migrations** to the new project
3. **Seed with demo data** (the existing demo system already handles this)
4. **Update `.env.local`** on dev machine to point to dev project
5. **Update `.env.local.beta`** to point to dev project (beta is for testing, not production)
6. **Production `.env`** on Vercel stays pointed at the original project

### File Changes

**`.env.local` (dev machine — EDIT):**

```env
NEXT_PUBLIC_SUPABASE_URL=https://NEW_DEV_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=NEW_DEV_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=NEW_DEV_SERVICE_KEY
```

**`.env.local.beta` (beta deploy — EDIT):**

```env
NEXT_PUBLIC_SUPABASE_URL=https://NEW_DEV_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=NEW_DEV_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=NEW_DEV_SERVICE_KEY
```

**Vercel environment variables (UNCHANGED):**

```env
# These stay pointed at production
NEXT_PUBLIC_SUPABASE_URL=https://luefkpakzvxcsqroxyhz.supabase.co
...
```

### Migration Procedure

```bash
# 1. Create new project on Supabase dashboard (free tier)
# 2. Link to it locally
supabase link --project-ref NEW_PROJECT_REF

# 3. Apply all migrations
supabase db push --linked

# 4. Seed demo data
# (Use existing demo seeding — app/api/demo/data/route.ts)

# 5. Verify
supabase db dump --linked > dev-schema-verify.sql
```

---

## Phase 6: AI Simplification {#phase-6-ai-simplification}

### Current AI Footprint

| Agent   | Files                                    | What It Does            | Core?            |
| ------- | ---------------------------------------- | ----------------------- | ---------------- |
| Remy    | ~15 files in `lib/ai/`, `components/ai/` | Client-facing concierge | Yes (simplified) |
| Gustav  | ~5 files in `scripts/launcher/`          | Mission Control AI      | No               |
| Kilo    | External (Ollama agent)                  | Junior engineer         | No               |
| Copilot | External (GitHub)                        | Research bot            | No               |

### What To Do (Nothing Deleted)

**Remy stays** but gets scoped to 3 jobs:

| Job                                  | Already Exists? | File                       |
| ------------------------------------ | --------------- | -------------------------- |
| Answer client questions about events | Yes             | `lib/ai/remy-actions.ts`   |
| Help chef draft messages             | Yes             | `lib/ai/correspondence.ts` |
| Quick lookups (next event, costs)    | Yes             | `lib/ai/agent-actions/`    |

**Gustav stays** in Mission Control (developer tool, doesn't affect user experience).

**No code deleted.** The 3-tier model routing, the agent registry, the conversation management — all preserved. The simplification is about what the USER sees, not what exists in the codebase.

### Remy Focus Mode Behavior

When Focus Mode is ON, Remy's action set is reduced:

**File: `lib/ai/remy-action-filter.ts` (NEW — ~30 lines)**

```typescript
import { isFocusModeEnabled } from '@/lib/billing/focus-mode'

// Actions available in Focus Mode (core workflows only)
const FOCUS_MODE_ACTIONS = new Set([
  'event.list',
  'event.detail',
  'event.search',
  'client.list',
  'client.detail',
  'client.search',
  'quote.list',
  'quote.detail',
  'inquiry.list',
  'inquiry.detail',
  'calendar.upcoming',
  'finance.summary',
  'finance.event_summary',
  'recipe.search',
  'menu.list',
  'draft.message',
  'draft.email',
  'draft.followup',
])

export async function getAvailableActions(allActions: string[]): Promise<string[]> {
  const focusMode = await isFocusModeEnabled()
  if (!focusMode) return allActions // Full mode — everything available
  return allActions.filter((a) => FOCUS_MODE_ACTIONS.has(a))
}
```

This filters the action list passed to Ollama's system prompt, so Remy doesn't offer features the chef hasn't unlocked yet.

---

## Phase 7: Migration Consolidation {#phase-7-migration-consolidation}

### Current State: 335 Migration Files

This is unwieldy but not dangerous. The consolidation is a **cosmetic cleanup**, not a structural change.

### Procedure (Nothing Deleted — Files Archived)

```bash
# 1. Dump the current complete schema
supabase db dump --linked > supabase/baseline/full-schema-$(date +%Y%m%d).sql

# 2. Move all 335 migrations to an archive directory
mkdir -p supabase/migrations-archive
mv supabase/migrations/*.sql supabase/migrations-archive/

# 3. Create a single baseline migration
cp supabase/baseline/full-schema-*.sql \
   supabase/migrations/00000000000000_baseline.sql

# 4. Verify: the baseline migration reproduces the exact schema
supabase db reset --linked  # Applies only the baseline
supabase db dump --linked > verify.sql
diff full-schema-*.sql verify.sql  # Should be identical

# 5. All future migrations are numbered sequentially from here
# Next migration: supabase/migrations/00000000000001_whatever.sql
```

### Safety

- **All 335 original files preserved** in `supabase/migrations-archive/`
- **Full schema dump preserved** in `supabase/baseline/`
- **Git history preserves everything** — `git log --all -- supabase/migrations/` shows full history
- **Production database is untouched** — this only affects future `db reset` operations

### When To Do This

**LAST.** After everything else is stable. This is housekeeping, not a priority.

---

## Phase 8: User Onboarding & First Customer {#phase-8-user-onboarding}

### The Onboarding Flow (Currently Exists)

Route: `app/(chef)/onboarding/page.tsx`

### What To Improve

**Step 1: Simplify the first 5 minutes.**

New chef signs up → sees:

```
Welcome to ChefFlow.

Let's set up your business in 3 steps:

1. Your info (name, business name, location)
2. Your first client (name, email, phone)
3. Your first event (date, guest count, menu idea)

That's it. You're ready to send your first quote.
```

**Step 2: Pre-fill with intelligent defaults.**

| Field           | Default    | Why                           |
| --------------- | ---------- | ----------------------------- |
| Pricing model   | Per person | Most common for private chefs |
| Deposit         | 25%        | Industry standard             |
| Currency        | USD        | Can change in settings        |
| Focus Mode      | ON         | Clean sidebar                 |
| Enabled modules | Core 6     | No overwhelm                  |

**Step 3: First quote in under 10 minutes.**

The onboarding should end with the chef having:

- A profile
- One client entered
- One event created
- One quote ready to send

If a chef can't get to "send first quote" in 10 minutes, the onboarding is broken.

### Getting the First External User

**Target: 3 private chefs using ChefFlow for real events within 90 days.**

| Source             | Action                                                            |
| ------------------ | ----------------------------------------------------------------- |
| Developer (you)    | Use ChefFlow for your own next 3 events                           |
| Chef network       | Reach out to 5 chefs you know, offer free access                  |
| Online communities | Post in r/personalchef, Chef's Roll, private chef Facebook groups |
| Local connections  | Any chef you've worked with or know personally                    |

**What to track:**

Create `docs/user-feedback-log.md`:

```markdown
# User Feedback Log

| Date | User | What They Did | What Broke | What Confused Them | What They Loved |
| ---- | ---- | ------------- | ---------- | ------------------ | --------------- |
|      |      |               |            |                    |                 |
```

**This file becomes the ONLY product roadmap.** Features get built because a user asked for them, not because they seemed cool.

---

## Implementation Order (Exact Sequence)

| Step | What                                                            | Depends On         | Estimated Effort |
| ---- | --------------------------------------------------------------- | ------------------ | ---------------- |
| 1    | Check existing `DEFAULT_ENABLED_MODULES` in `module-actions.ts` | Nothing            | 5 min            |
| 2    | Create `lib/billing/focus-mode.ts`                              | Step 1             | 30 min           |
| 3    | Add `focus_mode` column migration                               | Step 2             | 15 min           |
| 4    | Edit settings/modules page with Focus Mode toggle               | Step 2, 3          | 1 hr             |
| 5    | Add `coreFeature` tags to `nav-config.tsx` standalone items     | Step 2             | 30 min           |
| 6    | Filter standalone items in `chef-nav.tsx` by Focus Mode         | Step 5             | 30 min           |
| 7    | Verify 12 core workflows with agent account                     | Step 1             | 2-3 hrs          |
| 8    | Write `docs/core-workflow-status.md`                            | Step 7             | 30 min           |
| 9    | Write `tests/unit/ledger.compute.test.ts` (A1-A7)               | Nothing            | 1 hr             |
| 10   | Write `tests/unit/ledger.payment-status.test.ts` (A8-A10)       | Nothing            | 30 min           |
| 11   | Extend `tests/unit/events.fsm.test.ts` (B1-B8)                  | Nothing            | 1 hr             |
| 12   | Write `tests/unit/quotes.math.test.ts` (C1-C5)                  | Nothing            | 45 min           |
| 13   | Write `tests/unit/auth.tenant-isolation.test.ts` (D1-D7)        | Nothing            | 1 hr             |
| 14   | Add `test:critical` script to package.json                      | Steps 9-13         | 5 min            |
| 15   | Add `critical-tests` job to CI pipeline                         | Step 14            | 30 min           |
| 16   | Create `lib/ai/remy-action-filter.ts`                           | Step 2             | 30 min           |
| 17   | Wire Remy action filter into `remy-actions.ts`                  | Step 16            | 30 min           |
| 18   | Create dev Supabase project                                     | Nothing            | 30 min           |
| 19   | Apply migrations to dev project                                 | Step 18            | 30 min           |
| 20   | Update `.env.local` and `.env.local.beta`                       | Step 19            | 15 min           |
| 21   | Set up Vercel preview deploys (optional)                        | Nothing            | 1 hr             |
| 22   | Archive migrations (LAST)                                       | Steps 18-20 stable | 1 hr             |

**Total estimated: ~15-20 hours of implementation across 2-3 weeks.**

---

## Files Created (New)

| File                                               | Purpose                            |
| -------------------------------------------------- | ---------------------------------- |
| `lib/billing/focus-mode.ts`                        | Focus Mode toggle actions          |
| `lib/ai/remy-action-filter.ts`                     | Remy action scoping for Focus Mode |
| `tests/unit/ledger.compute.test.ts`                | Financial computation tests        |
| `tests/unit/ledger.payment-status.test.ts`         | Payment status derivation tests    |
| `tests/unit/quotes.math.test.ts`                   | Quote math tests                   |
| `tests/unit/auth.tenant-isolation.test.ts`         | Auth & isolation tests             |
| `docs/core-workflow-status.md`                     | Core workflow verification results |
| `docs/user-feedback-log.md`                        | User feedback tracking             |
| `docs/product-focus-build-plan.md`                 | This document                      |
| `supabase/migrations/TIMESTAMP_add_focus_mode.sql` | Focus Mode column                  |

## Files Modified (Existing)

| File                                   | Change                                      |
| -------------------------------------- | ------------------------------------------- |
| `components/navigation/nav-config.tsx` | Add `coreFeature` flag to standalone items  |
| `components/navigation/chef-nav.tsx`   | Filter standalone items by Focus Mode       |
| `app/(chef)/settings/modules/page.tsx` | Add Focus Mode toggle UI                    |
| `lib/billing/module-actions.ts`        | Verify DEFAULT_ENABLED_MODULES is core-only |
| `tests/unit/events.fsm.test.ts`        | Add B1-B8 test cases                        |
| `.github/workflows/ci.yml`             | Add critical-tests job                      |
| `package.json`                         | Add test:critical and related scripts       |
| `lib/ai/remy-actions.ts`               | Wire in action filter                       |

## Files Deleted

**NONE. Zero. Nothing.**

---

## Success Criteria

| Metric                          | Target              | How to Measure                               |
| ------------------------------- | ------------------- | -------------------------------------------- |
| New chef → first quote sent     | < 10 minutes        | Time from signup to quote sent               |
| Core workflows working          | 12/12 passing       | `docs/core-workflow-status.md`               |
| Critical tests passing          | 30/30 green         | `npm run test:critical`                      |
| CI gates merge                  | All 5 jobs pass     | GitHub branch protection                     |
| Focus Mode default              | ON for new signups  | Verify `chef_preferences.focus_mode` default |
| Sidebar item count (Focus Mode) | ≤ 18 items          | Visual count in sidebar                      |
| External users testing          | ≥ 3 chefs           | `docs/user-feedback-log.md`                  |
| Dev/prod DB separated           | 2 Supabase projects | Env var check                                |
