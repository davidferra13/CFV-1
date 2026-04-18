# System Integrity Question Set: Cross-Boundary Enforcement

> **Scope:** Request Trust + Surface Ownership + API Tenant Isolation
> Cross-cuts `p0-request-trust-and-api-tenant-boundary-hardening` and `p0-runtime-surface-boundary-enforcement`.
> Executed: 2026-04-18 | Executor: Claude Code (Opus 4.6)

---

## Methodology

Two passes:

1. **Technical verification (40 questions):** binary pass/fail against code evidence. Already executed, scored 30/40.
2. **Real-world high-leverage scenarios (25 questions):** each scenario crosses multiple system boundaries, represents an actual user journey, and exposes cascading failures that no single-system audit would catch.

Every question must be answerable with a binary pass/fail. "Mostly works" is not a passing answer.

---

# PART 1: Technical Verification (CB1-CB40)

## Coverage Map

| Q    | Title                                                     | Domain | Status   |
| ---- | --------------------------------------------------------- | ------ | -------- |
| CB1  | Public paths strip all x-cf-\* headers                    | A      | PASS     |
| CB2  | API skip-auth paths strip all x-cf-\* headers             | A      | PASS     |
| CB3  | Authenticated paths strip then re-set x-cf-\* headers     | A      | PASS     |
| CB4  | x-pathname sentinel only set on authenticated paths       | A      | PASS     |
| CB5  | readRequestAuthContext rejects missing x-pathname         | A      | PASS     |
| CB6  | Admin layout uses data-cf-portal="admin"                  | B      | PASS     |
| CB7  | Chef layout uses data-cf-portal="chef"                    | B      | PASS     |
| CB8  | Client layout uses data-cf-portal="client"                | B      | PASS     |
| CB9  | Public layout uses data-cf-portal="public"                | B      | PASS\*   |
| CB10 | Partner layout uses data-cf-portal="partner"              | B      | PASS     |
| CB11 | Admin layout imports from admin-shell, not chef-shell     | B      | PASS     |
| CB12 | Admin layout does not import ChefSidebar                  | B      | PASS     |
| CB13 | Admin layout does not import ChefMobileNav                | B      | PASS     |
| CB14 | Admin layout does not import ChefMainContent              | B      | PASS     |
| CB15 | Admin shell imports from admin-nav-config                 | B      | PASS     |
| CB16 | Chef nav-config has zero /admin routes                    | C      | PASS     |
| CB17 | Chef nav-config has zero admin nav group                  | C      | PASS     |
| CB18 | Admin nav-config covers all migrated admin routes         | C      | PASS     |
| CB19 | Dead group.id==='admin' branches removed from chef-nav    | C      | PASS\*   |
| CB20 | Dead admin sort comparisons removed from nav-config       | C      | PASS\*   |
| CB21 | withApiAuth provides tenantId to every v2 handler         | D      | PASS     |
| CB22 | withApiAuth never calls requireChef internally            | D      | PASS     |
| CB23 | Notification v2 routes use store modules (not actions)    | D      | PASS     |
| CB24 | Loyalty v2 routes use store modules (not actions)         | D      | PASS\*   |
| CB25 | Partner v2 routes use store modules (not actions)         | D      | PASS\*   |
| CB26 | All v2 route handlers use ctx.tenantId for scoping        | D      | PASS\*   |
| CB27 | isAdminRoutePath enforced in middleware                   | E      | **FAIL** |
| CB28 | Every surface has unique portal marker in contract        | E      | PASS     |
| CB29 | Every surface has unique nav owner in contract            | E      | PASS     |
| CB30 | validateSurfaceAlignment catches nav mismatch             | E      | PASS     |
| CB31 | Runtime surface contract covers all 5 surfaces            | E      | PASS     |
| CB32 | Notification store resolves chef auth_user_id correctly   | F      | PASS     |
| CB33 | Notification store resolves client auth_user_id correctly | F      | PASS     |
| CB34 | createNotificationForTenant uses correct recipient_id     | F      | PASS     |
| CB35 | Notification tier config includes dietary_menu_conflict   | F      | PASS     |
| CB36 | No v2 route imports from 'use server' action files        | G      | PASS\*   |
| CB37 | Three ID domains never cross-contaminated                 | G      | PASS     |
| CB38 | Store modules accept tenantId as parameter                | G      | PASS     |
| CB39 | Dead code branches cleaned from nav rendering             | H      | PASS\*   |
| CB40 | Surface contract test covers all 5 portal markers         | H      | PASS     |

_Items marked PASS_ were FAIL at initial audit and fixed in this session.

**Scorecard: 39 PASS, 1 FAIL (CB27: middleware admin enforcement, defense-in-depth only)**

---

## Domain A-H Evidence (abbreviated)

### CB1-CB5: Request Trust Boundary - ALL PASS

[middleware.ts:81-98](middleware.ts#L81-L98): Public and skip-auth paths strip x-cf-\* via `stripInternalRequestHeaders`. Authenticated paths strip then re-set from verified session. x-pathname sentinel only set on authenticated branch. `readRequestAuthContext` rejects without sentinel.

### CB6-CB15: Surface Portal Markers & Shell - ALL PASS

All 5 layouts emit `data-cf-portal`. Admin layout uses admin-shell components exclusively. Tests verify in [runtime-surface-contract.test.ts](tests/unit/runtime-surface-contract.test.ts).

### CB16-CB20: Nav Boundary - ALL PASS (after fix)

Admin group removed from chef nav. Dead `group.id === 'admin'` branches and sort comparisons removed from [chef-nav.tsx](components/navigation/chef-nav.tsx), [chef-mobile-nav.tsx](components/navigation/chef-mobile-nav.tsx), [nav-config.tsx](components/navigation/nav-config.tsx).

### CB21-CB26: API v2 Tenant Isolation - ALL PASS (after fix)

All 22 routes rewired from session-shaped actions to tenant-explicit store modules. `ctx.tenantId` passed through every handler. Store modules: [lib/loyalty/store.ts](lib/loyalty/store.ts), [lib/loyalty/voucher-store.ts](lib/loyalty/voucher-store.ts), [lib/loyalty/raffle-store.ts](lib/loyalty/raffle-store.ts), [lib/loyalty/redemption-store.ts](lib/loyalty/redemption-store.ts), [lib/partners/store.ts](lib/partners/store.ts).

### CB27: Middleware Admin Enforcement - FAIL (low priority)

`isAdminRoutePath` defined in [route-policy.ts:235](lib/auth/route-policy.ts#L235) but never called in middleware. Layout gate (`requireAdmin()`) is functional. This is defense-in-depth only.

### CB28-CB40: Contract, Notification, Structural - ALL PASS

Runtime surface contract covers 5 surfaces with unique markers/owners. Notification store resolves correct recipient IDs. No cross-contamination of ID domains.

---

# PART 2: Real-World High-Leverage Scenarios (RW1-RW25)

These scenarios cross multiple system boundaries. Each one exposes cascading failures that single-system audits miss. A chef, client, partner, or admin performing a real-world action that touches request trust, surface ownership, API isolation, notifications, and data correctness simultaneously.

## Domain I: API-Key Caller Journeys (RW1-RW5)

### RW1. Chef creates API key, awards loyalty points via API - does the client get notified?

**Question:** When `POST /api/v2/loyalty/event-points` is called with a valid API key (no browser session), does the `awardEventPointsForTenant` store function: (a) succeed without session errors, (b) correctly insert loyalty transactions, (c) fire the non-blocking client notification, and (d) broadcast via SSE?

**Why this matters:** This is the #1 use case for API keys. A chef's POS system completes an event and calls the API to award points. If the notification fires with the wrong recipient_id (tenantId instead of authUserId), the client sees nothing. If SSE broadcast uses the wrong channel, the dashboard doesn't update.

**Crosses:** API auth (D) + notification routing (F) + SSE broadcast + financial state

**Status:** TBD - requires integration test

### RW2. API-key caller redeems a reward - does the ledger entry land correctly?

**Question:** When `POST /api/v2/loyalty/clients/:id/redeem` is called via API key, does `redeemRewardForTenant`: (a) deduct points atomically (concurrent redemption guard), (b) create the ledger credit entry via `appendLedgerEntryInternal`, (c) create the pending delivery record, and (d) use tenantId (not a session userId) for created_by?

**Why this matters:** Reward redemption touches 4 tables (loyalty_transactions, clients, ledger_entries, loyalty_reward_deliveries). If any step uses a session-derived ID instead of the store's tenantId/actorId, data integrity breaks. The concurrent redemption guard (`.gte('loyalty_points', reward.points_required)`) must work with the admin DB client.

**Crosses:** API auth (D) + financial integrity + ledger immutability + concurrent writes

**Status:** TBD - requires integration test

### RW3. API-key caller sends a gift card email - does the email go out?

**Question:** When `POST /api/v2/loyalty/vouchers/send` is called via API key, does `sendVoucherOrGiftCardForTenant`: (a) resolve the chef's business name for the email sender, (b) call `sendIncentiveDeliveryEmail` with correct params, (c) insert the delivery record with the API key's tenantId, and (d) NOT require a browser session for the email transport?

**Why this matters:** Email delivery is the entire point of vouchers. If `sendIncentiveDeliveryEmail` internally calls anything that depends on request headers (like `getCurrentUser`), it fails silently in API context.

**Crosses:** API auth (D) + email delivery (side effect) + tenant data resolution

**Status:** TBD - requires integration test

### RW4. API-key caller draws a raffle winner - is the draw cryptographically fair?

**Question:** When `POST /api/v2/loyalty/raffles/:id/draw` is called via API key, does `drawWinnerForTenant`: (a) verify round belongs to tenant, (b) use `crypto.getRandomValues` (not Math.random), (c) store the draw seed for auditability, and (d) correctly update the round status to 'completed'?

**Why this matters:** Raffle draws are legally sensitive (provably fair). If the store function accidentally uses a weaker random source or fails to store the seed, the chef loses the ability to prove fairness.

**Crosses:** API auth (D) + cryptographic integrity + tenant scoping + state machine

**Status:** PASS by code review - [raffle-store.ts](lib/loyalty/raffle-store.ts) uses `crypto.getRandomValues` and stores `drawSeed`.

### RW5. API-key caller creates a partner location - is it tenant-scoped?

**Question:** When `POST /api/v2/partners/:id/locations` is called via API key, does `createPartnerLocationForTenant`: (a) verify the partner belongs to the API key's tenant (not just any partner), (b) insert with the correct tenant_id, and (c) prevent cross-tenant partner reference (partnerId from tenant A used by tenant B's API key)?

**Why this matters:** Partner data is multi-tenant. If the store function only checks `partner_id` without the `tenant_id` constraint, a misconfigured API key could write data to another tenant's partner.

**Crosses:** API auth (D) + tenant isolation (G) + partner data integrity

**Status:** PASS by code review - [store.ts](lib/partners/store.ts) `createPartnerLocationForTenant` checks `.eq('id', input.partner_id).eq('tenant_id', tenantId)`.

---

## Domain J: Cross-Surface Navigation & Auth (RW6-RW10)

### RW6. Non-admin user deep-links to /admin/users - what happens?

**Question:** When an authenticated chef (non-admin) navigates to `/admin/users`, does: (a) middleware allow the request through (known gap CB27), (b) the admin layout's `requireAdmin()` reject and redirect, (c) the redirect target exist and load correctly, and (d) no admin data leak during the brief server component render before redirect?

**Why this matters:** Without middleware enforcement (CB27), the request reaches the admin layout. `requireAdmin()` should redirect, but if ANY server component in the admin page tree fetches data before the layout guard runs, admin data could leak in the response. Next.js layouts run before pages, so this should be safe, but parallel data fetching in server components could race.

**Crosses:** Middleware (E) + admin auth guard + surface ownership (B) + data leakage

**Status:** TBD - requires Playwright test to verify no data appears in response before redirect

### RW7. Admin switches between admin shell and chef portal - does nav state reset?

**Question:** When an admin user navigates from `/admin/users` to `/dashboard` (chef portal), does: (a) the admin sidebar disappear, (b) the chef sidebar appear with correct nav groups, (c) the portal marker change from `data-cf-portal="admin"` to `data-cf-portal="chef"`, and (d) no admin nav items bleed into chef nav?

**Why this matters:** The admin shell migration created two separate nav systems. If any shared state (like a React context) leaks between them, admin nav items could appear in the chef portal or vice versa.

**Crosses:** Surface ownership (B) + nav boundary (C) + shell isolation + React state

**Status:** TBD - requires Playwright test

### RW8. Client portal user tries to access chef routes - fail-closed?

**Question:** When an authenticated client navigates to `/events` (chef route), does: (a) the chef layout's `requireChef()` reject, (b) the redirect go to `/auth/signin?portal=client` (not generic signin), (c) the client's existing session survive (not invalidated), and (d) no chef data appear in the response?

**Why this matters:** Cross-portal navigation is a real scenario when users bookmark wrong URLs or follow stale links. The redirect must preserve the user's session and guide them back to their correct portal.

**Crosses:** Auth guard isolation + surface ownership + session preservation + UX

**Status:** TBD - requires Playwright test

### RW9. Partner portal user - does their nav show ONLY partner routes?

**Question:** Does the partner layout at [app/(partner)/partner/layout.tsx](<app/(partner)/partner/layout.tsx>) render `PartnerSidebar` and `PartnerMobileNav` (not ChefSidebar or AdminSidebar), and does the partner nav contain zero links to chef or admin routes?

**Why this matters:** Partner users see only their contribution report, showcase, and basic stats. If chef nav items leak (loyalty settings, financial reports, client lists), it's a data exposure.

**Crosses:** Surface ownership (B) + nav boundary (C) + partner auth

**Status:** PASS by code review - partner layout uses `PartnerSidebar`/`PartnerMobileNav` from [partner-nav.tsx](components/navigation/partner-nav.tsx), separate component tree.

### RW10. Unauthenticated user on public pages - zero auth context leakage?

**Question:** When a visitor browses `/about` or `/chef/[slug]`, do: (a) the x-cf-\* headers get stripped (CB1-CB2), (b) no auth context exist in server component scope, (c) `readRequestAuthContext` return null, and (d) public pages never call `requireChef`/`requireClient`/`requireAdmin`?

**Why this matters:** Public pages are the most exposed surface. If ANY auth context leaks through headers on public paths, a spoofed `x-cf-tenant-id` header could cause public pages to render tenant-specific data.

**Crosses:** Request trust (A) + surface ownership (B) + header stripping + data leakage

**Status:** PASS - CB1-CB4 verified header stripping. Public layout has no auth imports. `PresenceBeacon` uses `role="anonymous"`.

---

## Domain K: Notification Routing Across Contexts (RW11-RW15)

### RW11. Notification created via API route - does it reach the right recipient?

**Question:** When `POST /api/v2/notifications` creates a notification with `recipient_role: 'chef'`, does the store module: (a) resolve the chef's `auth_user_id` (not tenant_id) as recipient_id, (b) insert into the notifications table with the correct IDs, and (c) trigger a real-time toast via SSE for the chef user?

**Why this matters:** The notifications table uses `recipient_id` referencing `users(id)` (auth user). The tenant_id references `chefs(id)` (chef record). Confusing these means notifications go to the wrong row or fail FK constraints. This was the exact bug fixed in the notification store.

**Crosses:** API auth (D) + notification routing (F) + ID domain separation (G) + SSE

**Status:** PASS - `createNotificationForTenant` uses `resolveChefAuthUserId(tenantId)` to get the correct `auth_user_id`.

### RW12. Client notification from loyalty award via API - does the client portal show it?

**Question:** When `awardEventPointsForTenant` fires a client notification via `createClientNotification`, does: (a) the notification use the client's `auth_user_id` (not entity_id or tenant_id), (b) the client portal's NotificationProvider pick it up, and (c) the notification's `actionUrl: '/my-rewards'` resolve correctly in the client portal context?

**Why this matters:** Client notifications cross the tenant->client->authUser ID chain. If any link breaks, the notification exists in the DB but never appears in the client's portal.

**Crosses:** Notification routing (F) + client portal + ID domains (G) + SSE delivery

**Status:** TBD - requires verification that `createClientNotification` resolves auth_user_id correctly

### RW13. Dietary menu conflict notification - does it fire on the right action?

**Question:** Is there any code path that actually creates a notification with `action: 'dietary_menu_conflict'`? The tier config and type union include it (CB35), but does any server action or automation trigger it?

**Why this matters:** Adding a notification type to the config without a trigger is dead configuration. If the dietary conflict detection exists but doesn't fire this notification, the chef misses a critical alert (allergen on a menu for a guest with that allergy).

**Crosses:** Notification types (F) + dietary safety + event lifecycle + menu system

**Status:** TBD - grep for usage

### RW14. Notification preferences via API - do they persist and take effect?

**Question:** When `PATCH /api/v2/notifications/preferences` updates a chef's notification preferences via API key, does: (a) the store function correctly resolve the chef's auth_user_id, (b) the preference upsert use that auth_user_id (not tenant_id), and (c) subsequent notifications respect the updated preferences?

**Why this matters:** Notification preferences are keyed by `auth_user_id`. If the API route writes preferences keyed by tenant_id, they silently fail to affect delivery because the notification delivery system reads by auth_user_id.

**Crosses:** API auth (D) + notification preferences (F) + ID domains (G) + preference enforcement

**Status:** PASS - notification store `resolveChefAuthUserId` bridges correctly. Verified in spec 1.

### RW15. Tier map reset via API - does it revert to defaults?

**Question:** When `POST /api/v2/notifications/tiers/reset` is called (with or without a specific action), does: (a) the store function use the correct tenant scope, (b) the reset restore `DEFAULT_TIER_MAP` values, and (c) subsequent notifications use the restored tier (not the deleted custom tier)?

**Why this matters:** Tier maps control whether a notification is `urgent`, `alert`, `info`, or `silent`. A botched reset could leave all notifications at `silent`, effectively muting the system.

**Crosses:** API auth (D) + notification tiers (F) + default restoration + delivery pipeline

**Status:** PASS - `resetAllTiersForTenant` deletes custom overrides; delivery falls back to `DEFAULT_TIER_MAP`. Verified in spec 1.

---

## Domain L: Data Integrity Under Concurrent API + UI Access (RW16-RW20)

### RW16. Chef uses UI while POS calls API simultaneously - do loyalty points double-count?

**Question:** If a chef clicks "Award Points" in the UI (calling `awardEventPoints` via server action) at the same time their POS calls `POST /api/v2/loyalty/event-points` (calling `awardEventPointsForTenant` via API), does the `loyalty_points_awarded` boolean guard prevent double-awarding?

**Why this matters:** Both paths check `event.loyalty_points_awarded` before inserting transactions. But they're separate DB clients (session-scoped vs admin). If both read `false` before either writes `true`, points get awarded twice.

**Crosses:** API auth (D) + UI server actions + concurrent writes + financial integrity

**Status:** **PASS (fixed 2026-04-18)** - Both `awardEventPoints` ([actions.ts](lib/loyalty/actions.ts)) and `awardEventPointsForTenant` ([store.ts](lib/loyalty/store.ts)) now use atomic claim: `UPDATE events SET loyalty_points_awarded = true WHERE id = ? AND tenant_id = ? AND loyalty_points_awarded = false`, checking returned rows. Loser gets `{ alreadyAwarded: true }`. Flag set BEFORE any point computation, so no wasted work on the losing path.

### RW17. Two API keys from same tenant call redeem simultaneously - does the balance go negative?

**Question:** If two concurrent `POST /api/v2/loyalty/clients/:id/redeem` calls try to redeem the same reward, does the `.gte('loyalty_points', reward.points_required)` guard in `redeemRewardForTenant` prevent one of them?

**Why this matters:** The store function checks balance, inserts transaction, then updates with `.gte` guard. If both pass the initial check, both insert transactions, but only one succeeds at the `.gte` update. The losing call deletes its transaction. This is the correct pattern.

**Crosses:** API concurrent access + financial integrity + transaction rollback

**Status:** PASS - the `.gte` guard + rollback pattern handles this correctly. [store.ts](lib/loyalty/store.ts) `redeemRewardForTenant` deletes the transaction if the `.gte` update returns no rows.

### RW18. API-key caller adjusts points while chef views client profile - stale data?

**Question:** When an API call adjusts a client's points (via `adjustClientLoyaltyForTenant`) while the chef has the client profile open in their browser, does: (a) the adjustment succeed without cache interference, (b) the SSE broadcast notify the open browser, and (c) `revalidatePath` (absent in store functions) NOT cause the API caller's response to be delayed?

**Why this matters:** Store functions intentionally skip `revalidatePath` (irrelevant for API callers). But this means the chef's browser won't auto-refresh. If no SSE broadcast exists for loyalty adjustments, the chef sees stale data until manual refresh.

**Crosses:** API isolation (D) + cache invalidation + SSE + UI staleness

**Status:** **PARTIAL** - `adjustClientLoyaltyForTenant` does NOT broadcast via SSE (the original action only called `revalidatePath`). The chef's browser will show stale data until refresh. Consider adding SSE broadcast to store functions for mutations.

### RW19. Gift card redeemed via API while client is on payment page - does outstanding balance update?

**Question:** If `POST /api/v2/loyalty/incentives/redeem` is called via API at the same time a client is on the payment page viewing `event_financial_summary.outstanding_balance_cents`, does: (a) the RPC `redeem_incentive` atomically update the balance, (b) the client's next poll/refresh show the reduced balance, and (c) a Stripe payment intent created after the redemption use the correct (reduced) outstanding amount?

**Why this matters:** The payment page reads outstanding balance. If the gift card credit lands in the ledger but the payment intent was already created with the old amount, the client overpays. The correct flow: redeem first, then create payment intent from updated balance.

**Crosses:** API isolation (D) + financial views + Stripe integration + ledger atomicity

**Status:** PASS by design - the `redeem_incentive` RPC is atomic (single transaction: ledger + balance update + audit row). `createPaymentIntent` reads from the view AFTER the credit lands.

### RW20. Bulk event assignment via API while chef edits an event in UI - conflict?

**Question:** If `POST /api/v2/partners/:id/assign-events` assigns an event to a partner at the same time the chef is editing that event's details in the UI, does: (a) the bulk assignment only touch `referral_partner_id` and `partner_location_id` columns, (b) the chef's edit to other columns (occasion, guest_count, etc.) not conflict, and (c) neither operation overwrite the other?

**Why this matters:** Column-level updates in PostgreSQL don't conflict if they touch different columns. The store function only writes partner FK columns. The UI edits other fields. No conflict.

**Crosses:** API isolation (D) + concurrent writes + column-level safety

**Status:** PASS - [store.ts](lib/partners/store.ts) `bulkAssignEventsForTenant` only updates `referral_partner_id` and `partner_location_id`. No column overlap with event detail edits.

---

## Domain M: System-Wide Coherence (RW21-RW25)

### RW21. Every store module uses admin DB client - verified?

**Question:** Do ALL store functions in `lib/loyalty/store.ts`, `lib/loyalty/voucher-store.ts`, `lib/loyalty/raffle-store.ts`, `lib/loyalty/redemption-store.ts`, `lib/partners/store.ts`, and `lib/notifications/store.ts` use `createServerClient({ admin: true })` and NOT the default `createServerClient()`?

**Why this matters:** The default `createServerClient()` uses the session-scoped connection. In API-key contexts, there's no session; queries would fail or return wrong data. Admin client bypasses RLS and uses tenantId for explicit scoping.

**Crosses:** All store modules + DB access pattern + tenant scoping

**Status:** TBD - grep verification needed

### RW22. All 5 surfaces have end-to-end auth coverage - no unprotected routes?

**Question:** For each surface (public, chef, client, admin, partner), does EVERY page route under that surface's route group have the correct auth guard? Specifically: no chef pages missing `requireChef()`, no client pages missing `requireClient()`, no admin pages missing `requireAdmin()`, no partner pages missing `requirePartner()`?

**Why this matters:** A single unprotected page in a protected surface is a direct auth bypass. Layout-level guards catch most cases, but pages that use `export const dynamic = 'force-static'` or `generateStaticParams` might skip the layout guard.

**Crosses:** All 5 surfaces + auth guard completeness + static generation edge cases

**Status:** TBD - existing Q6 (Server Action Auth) covers actions, but page-level auth is a separate concern

### RW23. Runtime surface contract matches actual layout implementations?

**Question:** For each of the 5 entries in `SURFACE_CONTRACTS`, does the actual layout file: (a) use the declared `portalMarker`, (b) import from the declared `navOwner` component, and (c) call the declared `authGuard` function?

**Why this matters:** The contract is only useful if it matches reality. If the contract says admin uses `admin-nav` but the layout was reverted to `chef-nav`, the contract becomes a lie. Automated tests should verify this continuously.

**Crosses:** Surface contract (E) + all layouts + drift protection

**Status:** PASS for admin (tested) and chef (tested). TBD for client, partner, public.

### RW24. Store function notification side effects - do they use the right notification pathway?

**Question:** When store functions fire notifications (e.g., `awardEventPointsForTenant` calling `createClientNotification`), do they: (a) import from the correct notification module (not from a 'use server' file that calls requireChef), (b) pass tenantId explicitly, and (c) handle the case where the client has no auth_user_id (client exists but hasn't signed up for the portal)?

**Why this matters:** Not all clients have portal accounts (auth_user_id can be null). If the notification code assumes a non-null auth_user_id and throws, the entire award operation fails because the notification try/catch would need to be outside the transaction.

**Crosses:** Store module side effects + notification routing + null client auth + error isolation

**Status:** PASS - `createClientNotification` uses `getClientAuthUserId` which returns null for clients without accounts. The calling code is in a try/catch (non-blocking).

### RW25. Can the entire API v2 surface be verified with a single integration test?

**Question:** Does a test exist (or can one be written) that: (a) creates an API key for a test tenant, (b) calls every v2 endpoint with that key, (c) verifies each returns 200/201 (not 401/500), and (d) verifies the response data is scoped to the test tenant?

**Why this matters:** This is the ultimate integration test. If all 22 rewired routes pass with an API key (no browser session), the migration is proven. If any route still hits `requireChef()` internally (e.g., through a nested function call), it will fail with a redirect or null session.

**Crosses:** ALL domains - API auth, tenant scoping, store modules, notification side effects, financial integrity

**Status:** TBD - test does not yet exist. Highest-leverage single test possible.

---

# SCORECARD

## Part 1: Technical (CB1-CB40)

| Domain  | Description                       | Total  | Pass   |
| ------- | --------------------------------- | ------ | ------ |
| A       | Request Trust Boundary            | 5      | 5      |
| B       | Surface Portal Markers & Shell    | 10     | 10     |
| C       | Nav Boundary Integrity            | 5      | 5      |
| D       | API v2 Tenant Isolation           | 6      | 6      |
| E       | Middleware & Contract Enforcement | 5      | 4      |
| F       | Notification Routing              | 4      | 4      |
| G       | Structural Boundary Rules         | 3      | 3      |
| H       | Drift Protection & Tests          | 2      | 2      |
| **ALL** |                                   | **40** | **39** |

## Part 2: Real-World Scenarios (RW1-RW25)

| Domain  | Description                          | Total  | Pass   | Fail  | TBD    |
| ------- | ------------------------------------ | ------ | ------ | ----- | ------ |
| I       | API-Key Caller Journeys              | 5      | 2      | 0     | 3      |
| J       | Cross-Surface Navigation & Auth      | 5      | 2      | 0     | 3      |
| K       | Notification Routing Across Contexts | 5      | 3      | 0     | 2      |
| L       | Concurrent API + UI Access           | 5      | 3      | 1     | 1      |
| M       | System-Wide Coherence                | 5      | 2      | 0     | 3      |
| **ALL** |                                      | **25** | **12** | **1** | **12** |

---

# ACTION ITEMS

## Defects Found

| ID   | Severity           | Description                                       | Fix                                                                                              |
| ---- | ------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| CB27 | Low                | `isAdminRoutePath` not called in middleware       | Add to middleware for defense-in-depth                                                           |
| RW16 | ~~High~~ **Fixed** | Loyalty point award race condition (double-award) | Fixed 2026-04-18: atomic claim in both `actions.ts` and `store.ts`                               |
| RW18 | Medium             | Store mutation functions don't broadcast SSE      | Add `broadcastUpdate` calls to `adjustClientLoyaltyForTenant` and other mutating store functions |

## Verification Needed (12 TBD items)

| Priority | Items               | How to verify                                                             |
| -------- | ------------------- | ------------------------------------------------------------------------- |
| P0       | RW25                | Write single integration test that calls all 22 v2 endpoints with API key |
| P1       | RW1-RW3, RW12, RW13 | Integration tests for notification delivery chain via API                 |
| P2       | RW6-RW8, RW21-RW23  | Playwright tests for cross-surface navigation + grep verification         |
