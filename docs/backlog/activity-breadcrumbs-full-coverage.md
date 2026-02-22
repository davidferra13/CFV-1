# Activity Breadcrumbs — Full Coverage Rollout

## Context

ChefFlow has a working activity logging system (`chef_activity_log` table, `logChefActivity()`, full Activity page with feed/filters/heatmap/retrace). However, only **25 of ~455 server action files** currently call `logChefActivity()`. This means ~95% of chef actions are invisible in the activity feed.

The goal: instrument **every meaningful mutation** across the entire app so chefs get a complete audit trail of everything they do — **completely free**, no Pro gating.

## What Was Done (this session)

### Infrastructure — COMPLETE

1. **Migration created:** `supabase/migrations/20260322000044_expand_activity_domains.sql` — expands the CHECK constraint to add 6 new domains
2. **Types expanded:** `lib/activity/chef-types.ts` — added 6 new domains, ~120 new action types, 6 new DOMAIN_CONFIG colors
3. **Culinary words:** Added "Splintery" and "Burnt" to the Composition Board (constants + animations)

### New Domains Added

| Domain       | Label     | Color   |
| ------------ | --------- | ------- |
| `staff`      | Staff     | orange  |
| `scheduling` | Schedule  | cyan    |
| `document`   | Document  | rose    |
| `marketing`  | Marketing | fuchsia |
| `ai`         | AI        | violet  |
| `settings`   | Settings  | gray    |

## What Still Needs to Be Built

### UI Updates (do before or with Batch 1)

- **`components/activity/chef-activity-feed.tsx`** — expand `getEntityHref()` with ~30 new entity_type → URL mappings
- **`app/(chef)/activity/activity-page-client.tsx`** — expand `getChefEntityHref()` same way
- **`components/activity/activity-filters.tsx`** — add 6 new domains to `DOMAIN_ORDER` array

### Instrumentation — 10 Batches (~150 files, ~400 logging calls)

Each mutation function gets a non-blocking `logChefActivity()` call:

```typescript
try {
  const { logChefActivity } = await import('@/lib/activity/log-chef')
  await logChefActivity({
    tenantId: user.tenantId!,
    actorId: user.id,
    action: 'thing_created',
    domain: 'domain',
    entityType: 'thing',
    entityId: result.id,
    summary: `Created thing: ${result.name}`,
    context: {
      /* relevant data */
    },
  })
} catch (err) {
  console.error('[functionName] Activity log failed (non-blocking):', err)
}
```

#### Batch 1: Core Business — HIGHEST priority

`recipes/actions.ts`, `staff/actions.ts`, `contracts/actions.ts`, `availability/actions.ts`, `calendar/entry-actions.ts`, `scheduling/prep-block-actions.ts`, `todos/actions.ts`, `packing/actions.ts`, `equipment/actions.ts`, `vendors/actions.ts`

#### Batch 2: Financial Operations — HIGH priority

`finance/payment-plan-actions.ts`, `finance/mileage-actions.ts`, `finance/tip-actions.ts`, `finance/payroll-actions.ts`, `finance/recurring-invoice-actions.ts`, `finance/dispute-actions.ts`, `finance/sales-tax-actions.ts`, `finance/contractor-actions.ts`, `finance/bank-feed-actions.ts`, `tax/actions.ts`, `tax/retirement-actions.ts`, `kitchen-rentals/actions.ts`, `admin-time/actions.ts`, `receipts/actions.ts`, `events/invoice-actions.ts`

#### Batch 3: Marketing & Communication — MEDIUM-HIGH

`marketing/actions.ts`, `marketing/holiday-campaign-actions.ts`, `marketing/email-template-actions.ts`, `social/actions.ts`, `social/chef-social-actions.ts`, `testimonials/actions.ts`, `reviews/actions.ts`, `campaigns/push-dinner-actions.ts`, `holidays/outreach-actions.ts`

#### Batch 4: Event Sub-Actions — MEDIUM-HIGH

`events/photo-actions.ts`, `events/menu-approval-actions.ts`, `events/pre-event-checklist-actions.ts`, `events/safety-checklist-actions.ts`, `events/equipment-checklist-actions.ts`, `events/scope-drift-actions.ts`, `events/alcohol-log-actions.ts`

#### Batch 5: Client Management Extensions — MEDIUM

`clients/tag-actions.ts`, `clients/nda-actions.ts`, `clients/preference-learning-actions.ts`, `clients/import-actions.ts`, `clients/photo-actions.ts`, `connections/actions.ts`, `client-portal/actions.ts`

#### Batch 6: AI and Import — MEDIUM

`ai/remy-actions.ts`, `ai/remy-conversation-actions.ts`, `ai/remy-memory-actions.ts`, `ai/import-actions.ts`, `ai/import-receipt-action.ts`, `documents/import-actions.ts`

#### Batch 7: Settings & Configuration — MEDIUM-LOW

`profile/actions.ts`, `automations/actions.ts`, `automations/settings-actions.ts`, `custom-fields/actions.ts`, `event-labels/actions.ts`, `booking/booking-settings-actions.ts`, `billing/module-actions.ts`, `notifications/settings-actions.ts`, `onboarding/actions.ts`

#### Batch 8: Operational & Professional — MEDIUM-LOW

`compliance/actions.ts`, `contingency/actions.ts`, `daily-ops/actions.ts`, `waste/actions.ts`, `safety/incident-actions.ts`, `operations/kds-actions.ts`, `goals/actions.ts`, `professional/actions.ts`, `portfolio/actions.ts`, `seasonal/actions.ts`, `checklist/actions.ts`

#### Batch 9: Communication & Networking — LOW

`loyalty/actions.ts`, `network/actions.ts`, `collaboration/actions.ts`, `partners/actions.ts`, `surveys/actions.ts`, `feedback/actions.ts`, `recurring/actions.ts`

#### Batch 10: Remaining & Niche — LOWEST

`wellbeing/wellbeing-actions.ts`, `protection/*-actions.ts`, `proposals/*-actions.ts`, `inventory/*-actions.ts`, `reputation/mention-actions.ts`, `simulation/simulation-actions.ts`

### Files to SKIP (no logging needed)

- Pure read/query files (analytics, compute, forecast, export)
- Client-facing actions (already tracked by client activity system)
- Admin-only actions (separate admin audit trail)
- System/cron/webhook triggers (not chef-initiated)
- Auth flow (login/logout)
- The activity system itself (avoid recursion)

## Priority

**HIGH** — This is a foundational feature that makes the entire Activity page useful. Currently 95% of actions are invisible.

## Estimated Effort

**Heavy — multi-session.** Ideal for multi-agent parallel execution (batches are independent). Each batch is ~30-60 minutes for one agent. With 5 parallel agents, all 10 batches could be done in 2-3 hours wall time.

## Files to Modify

- **Infrastructure (DONE):** `lib/activity/chef-types.ts`, `supabase/migrations/20260322000044_expand_activity_domains.sql`
- **UI (TODO):** `components/activity/chef-activity-feed.tsx`, `app/(chef)/activity/activity-page-client.tsx`, `components/activity/activity-filters.tsx`
- **Instrumentation (TODO):** ~150 files across `lib/` (see batches above)
- **Documentation (TODO):** `docs/activity-breadcrumbs-rollout.md`

## Verification

1. `npx tsc --noEmit --skipLibCheck` passes
2. `npx next build --no-lint` passes
3. Activity page shows entries from newly instrumented domains
4. New domain filter pills appear and work correctly
5. Entity links navigate to correct pages
6. Non-blocking — no action breaks if activity logging fails
