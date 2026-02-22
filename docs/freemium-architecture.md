# Freemium Architecture — ChefFlow Monetization & Progressive Disclosure

**Date:** 2026-02-21
**Branch:** `feature/risk-gap-closure`

---

## What Changed

ChefFlow now has a two-system monetization and UX personalization layer:

1. **Tier gating** (Free vs Pro) — controls what users _can access_. Drives revenue.
2. **Module toggling** — controls what users _see_. Drives UX clarity. Independent of tier.

Both systems are fully implemented, wired into the nav/layout, and ready for incremental gate application.

---

## New Files Created

| File                                                     | Purpose                                                                                                                                               |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/billing/tier.ts`                                    | `getTierForChef()`, `hasProAccess()` — resolves Free vs Pro from `subscription_status` + `trial_ends_at`. Uses React `cache()` for per-request dedup. |
| `lib/billing/errors.ts`                                  | `ProFeatureRequiredError` class. Lives outside `'use server'` (class exports aren't allowed in server action files).                                  |
| `lib/billing/require-pro.ts`                             | `requirePro(featureSlug)` — server action guard. Throws `ProFeatureRequiredError` if Free. Admins always bypass.                                      |
| `lib/billing/pro-features.ts`                            | Declarative registry of all Pro features (slug, label, description, category). Single source of truth for what's Pro.                                 |
| `lib/billing/modules.ts`                                 | Module definitions for progressive disclosure. Each module: slug, label, description, tier, defaultEnabled, alwaysVisible.                            |
| `lib/billing/module-actions.ts`                          | Server actions: `getEnabledModules()`, `updateEnabledModules()`, `toggleModule()`, `enableAllModules()`.                                              |
| `components/billing/upgrade-gate.tsx`                    | Server component wrapper. Modes: `block` (upgrade card), `blur` (blurred preview), `hide` (renders nothing). Admin bypass built in.                   |
| `components/billing/upgrade-prompt.tsx`                  | Client component — branded upgrade card with CTA to `/settings/billing`.                                                                              |
| `app/(chef)/settings/modules/page.tsx`                   | Module toggle settings page (server component).                                                                                                       |
| `app/(chef)/settings/modules/modules-client.tsx`         | Client component — toggle grid with Select All / Reset to Defaults.                                                                                   |
| `supabase/migrations/20260322000034_enabled_modules.sql` | Adds `enabled_modules TEXT[]` to `chef_preferences`. Backfills existing chefs with ALL modules.                                                       |

## Files Modified

| File                                             | Change                                                                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `components/navigation/nav-config.tsx`           | Added `module?: string` to `NavGroup` type. Each nav group now has a module slug. Added `/settings/modules` to settings shortcuts.  |
| `components/navigation/chef-nav.tsx`             | Accepts `enabledModules` prop. Filters `navGroups` to only show groups whose module is in the enabled set.                          |
| `lib/chef/layout-cache.ts`                       | Added `enabled_modules` and `subscription_status` to the cached layout data.                                                        |
| `app/(chef)/layout.tsx`                          | Fetches tier + admin status + modules. Passes `enabledModules` to sidebar. Conditionally renders `<RemyDrawer>` for Pro/admin only. |
| `app/(chef)/settings/billing/billing-client.tsx` | Rewritten — no hardcoded prices. Shows Free vs Pro comparison grid. Price comes from Stripe at runtime.                             |
| `components/billing/trial-banner-client.tsx`     | Updated messaging to reference "Pro" instead of generic subscription language.                                                      |
| `CLAUDE.md`                                      | Added tier assignment rule (Section 5 in Implementation Patterns) + billing file locations.                                         |

---

## Tier Resolution Logic

```
subscription_status = 'grandfathered' | 'active' | 'past_due'  →  Pro
subscription_status = 'trialing' AND trial_ends_at > now()      →  Pro
subscription_status = 'trialing' AND trial_ends_at <= now()      →  Free
subscription_status = 'canceled' | 'unpaid' | null               →  Free
isAdmin() = true                                                  →  Always Pro (bypass)
```

Implemented in `lib/billing/tier.ts` via `getTierForChef()`.

---

## Module System

### Module Definitions (`lib/billing/modules.ts`)

| Module       | Default ON | Tier | Nav Groups                                                   |
| ------------ | ---------- | ---- | ------------------------------------------------------------ |
| `dashboard`  | Always on  | Free | Dashboard                                                    |
| `pipeline`   | ON         | Free | Pipeline (Inquiries, Quotes, Proposals)                      |
| `events`     | ON         | Free | Events, Calendar                                             |
| `clients`    | ON         | Free | Clients                                                      |
| `finance`    | ON         | Free | Finance (basic)                                              |
| `protection` | OFF        | Pro  | Safety, Protection settings                                  |
| `more`       | OFF        | Pro  | Everything else (AI, Analytics, Marketing, Staff, Ops, etc.) |

### How It Works

1. `chef_preferences.enabled_modules` stores an array of module slugs
2. Layout reads modules from `getChefLayoutData()` (cached 60s)
3. `chef-nav.tsx` filters `navGroups` — only groups whose `module` is in `enabledModules` are rendered
4. Pages still exist at their URLs (direct access works) — modules only control nav visibility
5. Settings > Modules page lets chefs toggle modules on/off

### Defaults

- **New signups:** `['dashboard', 'pipeline', 'events', 'calendar', 'clients', 'finance']`
- **Existing chefs (migration backfill):** ALL modules enabled — nothing changes

---

## Three Gating Patterns

### Pattern A: Server Action Gate (hard enforcement)

```typescript
import { requirePro } from '@/lib/billing/require-pro'

export async function createABTest(input: {...}) {
  await requirePro('marketing')  // throws if Free, bypasses for admin
  // ... action logic
}
```

### Pattern B: Page-Level Gate (soft, shows upgrade prompt)

```typescript
import { UpgradeGate } from '@/components/billing/upgrade-gate'

export default async function BenchmarksPage() {
  const user = await requireChef()
  return (
    <UpgradeGate chefId={user.entityId} featureSlug="advanced-analytics">
      {/* existing page content */}
    </UpgradeGate>
  )
}
```

### Pattern C: Nav/Component Hide

```typescript
// In layout — already implemented for Remy:
{(tierStatus.tier === 'pro' || userIsAdmin) && <RemyDrawer />}
```

---

## Admin Bypass

Admins (`isAdmin()` from `lib/auth/admin`) bypass all tier restrictions at every enforcement point:

- `requirePro()` — returns immediately for admins
- `<UpgradeGate>` — renders children directly for admins
- Layout — Remy always visible for admins regardless of tier

---

## Pricing Strategy

**No dollar amounts are hardcoded in the codebase.** The billing page fetches the actual price from Stripe at runtime. Changing the price = updating the Stripe Product in the dashboard. Zero code changes needed.

The existing Stripe integration (`lib/stripe/subscription.ts`) handles checkout sessions. The billing page now supports both monthly and annual intervals.

---

## What's Left (Incremental)

### Phase 4: Apply Gates to Individual Pro Features

Each Pro feature area needs `<UpgradeGate>` on its pages and `requirePro()` on its server actions. This is incremental work — do it as features are touched:

- AI/Remy pages
- Advanced analytics (benchmarks, custom reports, etc.)
- Marketing (campaigns, sequences, A/B tests)
- Staff management
- Operations/inventory
- Protection pages
- Community/network
- Professional development
- Loyalty program
- Advanced calendar features

### Phase 5: Onboarding Module Selection

Add a "What do you need?" step to the onboarding wizard where new chefs pick which modules they want. Pre-check the free defaults, let them enable Pro modules during trial.

### Stripe Dashboard Setup

1. Create Product: "ChefFlow Pro"
2. Create monthly + annual Price objects
3. Set env vars: `STRIPE_SUBSCRIPTION_PRICE_ID`, `STRIPE_SUBSCRIPTION_PRICE_ID_ANNUAL`

---

## CLAUDE.md Tier Assignment Rule

Every new feature must be assigned to a tier and module. The rule is now in CLAUDE.md Section 5 (Implementation Patterns). It requires:

1. Determine the tier (core = Free, everything else = Pro)
2. Assign a module slug from `lib/billing/modules.ts`
3. Add gating (`requirePro()` for actions, `<UpgradeGate>` for pages, `module` field for nav)
4. Register in `lib/billing/pro-features.ts` if Pro
5. Update `lib/billing/modules.ts` if a new module is needed
