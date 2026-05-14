# Tenant Isolation Matrix

Audit date: 2026-05-14
Auditor: Claude Opus 4.6 (automated)
Scope: All database queries in `lib/` using compat layer (`.from().select().eq()`) and Drizzle ORM (`db.select/insert/update/delete`)

## Executive Summary

ChefFlow uses **manual tenant scoping** on every query. There is no RLS enforcement; the `createServerClient({ admin: true })` flag is a no-op (returns identical client). The compat layer in `lib/db/compat.ts` executes raw SQL via postgres.js with no automatic tenant injection.

**Overall assessment: GOOD with isolated gaps.** The vast majority of queries (estimated 95%+) correctly scope by `tenant_id` or `chef_id`. High-sensitivity domains (finance, contracts, recipes, client PII) are consistently well-scoped. Gaps exist primarily in secondary/helper functions and one client-facing mutation.

### Findings Summary

| Category                                                | Count |
| ------------------------------------------------------- | ----- |
| Queries audited (sampled)                               | ~200  |
| Properly scoped                                         | ~185  |
| System/platform queries (OK unscoped)                   | ~8    |
| Parent-scoped (OK, ID from prior tenant-verified query) | ~4    |
| **REAL GAPS**                                           | **3** |
| Low-risk gaps (internal-only callers)                   | 2     |

---

## CRITICAL Findings

### GAP-1: `recordGoogleReviewClick` - Unscoped event mutation (MEDIUM-HIGH)

**File:** `lib/reviews/actions.ts:225`
**Query:** `db.from('events').update({ review_link_sent: true }).eq('id', eventId)`
**Context:** Called by authenticated clients. The `eventId` comes from client-side params. The preceding review update is correctly scoped by `client_id`, but the event update on line 225 has NO tenant or client scoping.
**Impact:** An authenticated client could set `review_link_sent = true` on ANY event in the database by supplying an arbitrary eventId. While the data mutation is limited (single boolean field), it demonstrates a cross-tenant write vector.
**Fix:** Add `.eq('client_id', user.entityId)` or `.eq('tenant_id', event.tenant_id)` to the update, or use the event fetched in line 229 to verify ownership first.

### GAP-2: `generatePrepTimeline` (events version) - Unscoped read (MEDIUM)

**File:** `lib/events/prep-timeline-actions.ts:174-197`
**Query:** Queries `event_menus`, `events`, `menu_courses`, `recipes` all by `event_id` without tenant filter.
**Context:** Called from `components/events/prep-timeline-panel.tsx` with eventId from URL params. The function calls `requireChef()` (authentication) but never verifies the chef owns the event. Other functions in the same file (`getPrepTimeline`, `togglePrepItem`) correctly use `verifyEventAccess()`.
**Impact:** An authenticated chef could read another chef's menu structure, recipe names, prep/cook times by guessing event UUIDs. This leaks chef IP (recipe details).
**Fix:** Add `verifyEventAccess()` call at the top, matching the pattern used by sibling functions in the same file.

### GAP-3: `addPrepTimelineItem` - Unscoped write (MEDIUM)

**File:** `lib/events/prep-timeline-actions.ts:92-119`
**Query:** `db.from('event_prep_timeline').insert({ event_id: input.eventId, tenant_id: user.entityId, ... })`
**Context:** While this inserts with the current user's `tenant_id`, it does NOT verify the eventId belongs to that tenant. A chef could attach prep timeline items to another chef's event. The items would have the wrong `tenant_id` but would show up in queries filtered by `event_id`.
**Fix:** Add `verifyEventAccess()` call before insert.

---

## Low-Risk Gaps (Internal-Only Callers)

### LOW-1: `checkMenuAllergyConflicts` - Unscoped event read

**File:** `lib/events/readiness.ts:655-685`
**Query:** `db.from('events').select('client_id').eq('id', eventId).single()` using admin client, no tenant filter.
**Impact:** MINIMAL. Not imported by any app/ or component/ file. Only called internally from other scoped functions. No direct user exposure. However, if a new caller is added without awareness, it could become a vector.

### LOW-2: `getCriticalPathForGuest` - Token-scoped, not tenant-scoped

**File:** `lib/lifecycle/critical-path.ts:263-300`
**Query:** Fetches events and inquiries by ID without tenant filter after resolving a `group_token`.
**Impact:** LOW. Access requires a valid `group_token` (opaque, long random string). The function is designed for guest access via hub tokens. The token itself acts as an authorization gate.

---

## High-Sensitivity Domain Analysis

### Finance (`lib/finance/`)

**Status: WELL SCOPED**
All sampled functions (`getExpenses`, `createExpense`, `calculateDeposit`, `getEventFinancialSummaryFull`, `calculateClientLTV`) correctly filter by `tenant_id` or `chef_id`. The `createExpense` function even cross-validates `event_id` ownership before attaching. No gaps found.

### Contracts (`lib/contracts/`)

**Status: WELL SCOPED**
Template CRUD operations all filter by `chef_id`. Event contracts filter by `chef_id` (chef view) or `client_id` (client view). The `getClientPortalEventContract` validates via portal token then scopes by `clientId`. Delete and update operations include tenant filter. No gaps found.

### Recipes (`lib/recipes/`)

**Status: WELL SCOPED**
`getRecipes`, `getRecipeById`, `updateRecipe` all filter by `tenant_id`. Recipe nutrition also scoped. Chef IP is protected. No gaps found.

### Clients (`lib/clients/`)

**Status: WELL SCOPED**
`getClientById` filters by both `id` and `tenant_id`. Client lists filter by `tenant_id`. Client portal access resolves via opaque tokens. No gaps found.

### Events (`lib/events/`)

**Status: MOSTLY SCOPED, 2 GAPS**
`getEventById` properly checks ownership then falls back to collaborator check. `getEvents` filters by `tenant_id`. Venue details verify owner/collaborator. Invoice, deposit, and financial summary actions all scope correctly. The gaps in `prep-timeline-actions.ts` are documented above.

### Client Portal (`lib/client-portal/`)

**Status: WELL SCOPED**
Portal access resolves via opaque tokens with rate limiting. Payment checkout verifies `client_id` AND `tenant_id` on the event. No gaps found.

---

## API Route Analysis

### V2 API Routes (`app/api/v2/`)

**Status: WELL SCOPED**
All sampled v2 routes use `withApiAuth` which provides `ctx.tenantId`. Queries consistently filter by `ctx.tenantId`. Examples: goals, incidents, safety, marketing, settings.

### Document Routes (`app/api/documents/`)

**Status: WELL SCOPED**
Invoice, receipt, contract, and financial summary routes delegate to library functions that enforce tenant scoping internally. Contract route passes owner context for role-based scoping.

### Prospecting Routes (`app/api/prospecting/`)

**Status: WELL SCOPED**
Convert route validates via `validateProspectingAuth` and filters by `auth.tenantId` on all queries.

---

## RLS Status Assessment

**RLS is NOT enforced.** The `createServerClient` function in `lib/db/server.ts` ignores the `admin` flag entirely:

```typescript
export function createServerClient(_opts?: { admin?: boolean }): CompatClient {
  return createCompatClient()
}
```

The compat layer connects directly via postgres.js as the database owner. Any RLS policies defined in the schema are bypassed. This means:

1. ALL tenant isolation depends on application-level `.eq('tenant_id', ...)` filters
2. The `{ admin: true }` parameter throughout the codebase is a no-op (cosmetic only)
3. There is no safety net for missed tenant filters

---

## Tenant Column Naming Inconsistency

Two naming conventions coexist:

- `tenant_id` (majority of tables: events, clients, expenses, recipes, menus, notifications, etc.)
- `chef_id` (contracts, admin_time_logs, vendors, prospects, phone_numbers entity-based)

This inconsistency increases the risk of missed scoping when developers assume one naming convention.

---

## Recommendations

### Immediate (fix the 3 gaps)

1. **GAP-1:** Add `.eq('client_id', user.entityId)` to the event update in `recordGoogleReviewClick`
2. **GAP-2:** Add `verifyEventAccess()` to `generatePrepTimeline` in `lib/events/prep-timeline-actions.ts:174`
3. **GAP-3:** Add `verifyEventAccess()` to `addPrepTimelineItem` in `lib/events/prep-timeline-actions.ts:92`

### Short-term

4. **Standardize tenant column naming.** Pick `tenant_id` as canonical; alias `chef_id` in views or add migration comments.
5. **Add a lint rule or grep-based CI check** that flags new `.eq('id', ...)` queries without an accompanying `tenant_id`/`chef_id` filter.
6. **Audit all `createServerClient({ admin: true })` call sites** since the flag is meaningless; callers may incorrectly assume it bypasses something and skip manual scoping.

### Medium-term

7. **Implement a `scopedClient(tenantId)` wrapper** around the compat layer that automatically injects `.eq('tenant_id', tenantId)` on every query. This would make unscoped queries impossible by default.
8. **Remove the `admin` flag** from `createServerClient` to avoid false confidence in RLS.
9. **Consider enabling actual RLS** as a defense-in-depth layer, even though application-level scoping is the primary mechanism.
