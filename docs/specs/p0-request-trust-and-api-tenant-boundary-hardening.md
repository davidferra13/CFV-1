# Spec: Request Trust and API Tenant Boundary Hardening

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event         | Date                 | Agent/Session | Commit |
| ------------- | -------------------- | ------------- | ------ |
| Created       | 2026-04-09 17:39 EDT | Planner       |        |
| Status: ready | 2026-04-09 17:39 EDT | Planner       |        |
| Research pass | 2026-04-09 22:05 EDT | Codex         |        |

---

## Developer Notes

### Raw Signal

The developer is no longer asking for discovery. They are asking for decision. The job now is to turn accumulated knowledge into structured, irreversible advantage by doing the smallest set of changes that create the largest forward movement without unnecessary churn.

They explicitly asked for an audit that is critical, technical, and unsentimental. They want to know whether the architecture is actually sound, secure, coherent, and routing data correctly end to end. If something is weak, unsafe, misleading, or architecturally confused, it should be stated directly and fixed in the correct order.

They also set the execution standard clearly: fully understand the current system first, plan briefly, execute in dependency order, continuously verify alignment, prevent regressions, and leave the system in a clear and structured state. This spec has to preserve their words, not flatten them into generic product language.

They then required stakeholder-by-stakeholder research grounded in real workflows, including technical users, finance and operations users, compliance actors, and external systems. The instruction was to use that research to refine the active work directly, but only where it changes what matters now.

### Developer Intent

- **Core goal:** Convert the architecture audit into one high-leverage hardening slice that removes the most dangerous trust-boundary and tenant-routing ambiguity without broad churn.
- **Key constraints:** No speculative rewrite. No destructive schema work. No accidental breakage of public chef profile routing. No more API handlers that secretly depend on browser-session helpers. Every claim must be evidence-backed.
- **Motivation:** The current system is feature-rich, but the audit found that identity, tenant scoping, and API route coherence are still enforced too much by convention instead of by structure.
- **Success from the developer's perspective:** A builder can implement this spec without guessing which identity fields mean what, which routes are public versus protected, or how API-key traffic is supposed to behave when no browser session exists, while also matching the real needs of integrations, finance workflows, and compliance-sensitive actors.

---

## What This Does (Plain English)

This spec hardens the seam where ChefFlow currently trusts request context and tenant scope too loosely. After it is built, public and skip-auth requests will no longer be able to carry spoofed internal auth headers into downstream helpers, `/api/v2` routes will use explicit tenant-scoped store functions instead of browser-session server actions, notifications will resolve real recipient user IDs instead of treating tenant IDs like users, and the `/chef` public-versus-protected routing story will stop contradicting itself.

---

## Why It Matters

The current code works, but too much of the security and correctness model depends on humans remembering which helpers are session-bound, which IDs are tenants versus auth users, and which route prefixes win first. That is not a stable architecture for a multi-surface product.

---

## Current-State Summary

Today the request-auth fast path is real, but the boundary around it is weaker than it should be. Middleware strips and rehydrates internal `x-cf-*` headers only after it has already early-returned for API skip-auth and public unauthenticated paths, while `getCurrentUser()` trusts those headers before falling back to the Auth.js session. `middleware.ts:55-70`, `lib/auth/request-auth-context.ts:33-38`, `lib/auth/request-auth-context.ts:71-90`, `lib/auth/get-user.ts:41-57`. The Google connect callback sits under `/api/auth/*`, which is explicitly in the middleware skip-auth list, yet it still calls `getCurrentUser()` to verify chef ownership. `lib/auth/route-policy.ts:167-170`, `middleware.ts:59-60`, `app/api/auth/google/connect/callback/route.ts:113-126`.

The route policy is also internally contradictory. The file claims to be the single source of truth, but `/chef` appears in both `CHEF_PROTECTED_PATHS` and `PUBLIC_UNAUTHENTICATED_PATHS`, and the matching helpers are prefix-based. `lib/auth/route-policy.ts:1-2`, `lib/auth/route-policy.ts:4-15`, `lib/auth/route-policy.ts:107-154`, `lib/auth/route-policy.ts:198-235`. That matters because public chef profiles intentionally live at `/chef/[slug]`, while the only `(chef)` routes currently under `/chef/*` are cannabis alias redirects. `app/(public)/chef/[slug]/page.tsx:1-4`, `app/(chef)/chef/cannabis/handbook/page.tsx:1-4`, `app/(chef)/chef/cannabis/rsvps/page.tsx:1-4`. The current coverage test is too coarse because it only scans top-level `(chef)` directories and assumes each directory root must itself be protected. `tests/unit/route-policy.chef-coverage.test.ts:1-32`.

The API-key surface is the other major problem. `withApiAuth()` gives handlers a tenant-scoped context and an admin DB client that explicitly bypasses RLS, so correctness depends on every handler and helper scoping manually. `lib/api/v2/middleware.ts:18-27`, `lib/api/v2/middleware.ts:79-100`, `lib/db/server.ts:1-7`, `lib/db/admin.ts:1-6`. Several `/api/v2` routes still import `'use server'` modules that start with `requireChef()` or `requireAuth()`, which makes them browser-session shaped instead of tenant-context shaped. That is true for notifications preferences, SMS settings, experience settings, tier settings, partner event assignment, and loyalty config. `app/api/v2/notifications/preferences/route.ts:22-58`, `lib/notifications/settings-actions.ts:35-208`, `app/api/v2/notifications/tiers/route.ts:15-44`, `lib/notifications/tier-actions.ts:26-158`, `app/api/v2/partners/[id]/assign-events/route.ts:14-36`, `lib/partners/actions.ts:886-936`, `app/api/v2/loyalty/config/route.ts:9-36`, `lib/loyalty/actions.ts:639-740`.

Notifications are the sharpest concrete failure. `POST /api/v2/notifications` defaults `recipient_id` to `ctx.tenantId`, but the schema says `notifications.recipient_id` is a foreign key to `users.id`, while `notifications.tenant_id` is the foreign key to `chefs.id`. `app/api/v2/notifications/route.ts:11-31`, `app/api/v2/notifications/route.ts:47-69`, `lib/db/schema/schema.ts:1709-1754`. The preferences table has the same identity split: `tenant_id` points to `chefs.id`, `auth_user_id` points to `users.id`, and the uniqueness key is `(auth_user_id, category)`. `lib/db/schema/schema.ts:4080-4105`. The schema already gives the correct sources of truth for these lookups: `chefs.auth_user_id` is non-null, while `clients.auth_user_id` is nullable. `lib/db/schema/schema.ts:19666-19669`, `lib/db/schema/schema.ts:22482-22658`. That means the data model already knows the difference between tenant IDs, client IDs, and auth-user IDs. The current route code is the part that is confused.

The codebase already contains the stronger pattern this spec should move toward. Realtime channel authorization is centralized, explicit, tenant-aware, user-aware, and fail-closed. `app/api/realtime/[channel]/route.ts:31-47`, `lib/realtime/channel-access.ts:11-70`, `tests/unit/realtime-channel-access.test.ts:5-50`. This spec applies that same discipline to request trust and API v2 tenant operations. Broader debt still exists, including in-memory rate limiting, non-transactional public write flows, and builds that ignore lint/type failures, but those are intentionally outside this slice. `app/api/book/route.ts:44-87`, `app/api/book/route.ts:167-280`, `lib/inquiries/public-actions.ts:71-80`, `lib/inquiries/public-actions.ts:186-390`, `lib/api/rate-limit.ts:1-26`, `lib/rateLimit.ts:1-32`, `next.config.js:71-82`.

---

## Research-Backed Constraints

The multi-stakeholder workflow pass makes this spec more urgent and slightly sharper. `docs/research/2026-04-09-multi-stakeholder-workflow-research-for-architecture-refinement.md:1-32`

- Technical users and integration builders expect explicit auth models, OAuth separation, sandbox-versus-production clarity, retry-safe webhooks, and sync fallbacks. API-key routes that secretly depend on browser-session helpers are below that bar. `docs/research/2026-04-09-multi-stakeholder-workflow-research-for-architecture-refinement.md:175-214`, `docs/research/2026-04-09-multi-stakeholder-workflow-research-for-architecture-refinement.md:259-309`
- Operations, finance, and accounting actors need event-linked costs, trustworthy exports, and clean identity boundaries on linked records. Silent ID confusion is expensive here, not merely untidy. `docs/research/2026-04-09-multi-stakeholder-workflow-research-for-architecture-refinement.md:134-173`
- Compliance actors care about who acted, under what authority, and with what audit trail. That strengthens the requirement to keep tenant IDs, auth-user IDs, and client IDs non-interchangeable. `docs/research/2026-04-09-multi-stakeholder-workflow-research-for-architecture-refinement.md:216-257`
- External systems such as Stripe, Square, Gmail, Calendar, and QuickBooks all assume retry, refresh, or resync realities. This spec should preserve that posture by making request trust and tenant ownership explicit and testable before widening the integration surface further. `docs/research/2026-04-09-multi-stakeholder-workflow-research-for-architecture-refinement.md:259-309`

This research does not widen the implementation set, but it does raise the bar on correctness: "mostly works" is not sufficient for integration or compliance-facing routes.

---

## Files to Create

| File                                             | Purpose                                                                                                                           |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `lib/notifications/store.ts`                     | Plain tenant-explicit notification helpers for recipient resolution, read-state updates, preferences, SMS, experience, and tiers. |
| `lib/partners/store.ts`                          | Plain tenant-explicit partner assignment helper used by API routes and server-action wrappers.                                    |
| `lib/loyalty/store.ts`                           | Plain tenant-explicit loyalty config read/update helpers, including default config initialization.                                |
| `tests/unit/request-auth-context.test.ts`        | Verifies header stripping, pathname sentinel enforcement, and request-auth fast-path trust rules.                                 |
| `tests/unit/api-v2-notifications.route.test.ts`  | Verifies API-key notifications use real auth-user recipients and tenant-owned linked IDs only.                                    |
| `tests/unit/api-v2-partners.route.test.ts`       | Verifies partner assign-events works from API keys and rejects cross-tenant event/location references.                            |
| `tests/unit/api-v2-loyalty-config.route.test.ts` | Verifies loyalty config works from API keys without browser-session helpers and preserves seed behavior.                          |

---

## Files to Modify

| File                                              | What to Change                                                                                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `middleware.ts`                                   | Build sanitized request headers before public and skip-auth early returns, and pass them through every non-asset `NextResponse.next()` branch.                     |
| `lib/auth/request-auth-context.ts`                | Require a middleware-owned pathname sentinel before trusting header auth context, and add any small pure helper needed to keep sanitation testable.                |
| `lib/auth/get-user.ts`                            | Keep the fast path, but only after pathname-validated request context; leave Auth.js fallback intact.                                                              |
| `app/api/auth/google/connect/callback/route.ts`   | Stop relying on `getCurrentUser()` for a skip-auth callback; verify chef ownership from the Auth.js session directly.                                              |
| `lib/auth/route-policy.ts`                        | Remove the broad protected `/chef` root and replace it with only the actual protected `/chef/*` aliases that exist.                                                |
| `app/api/v2/notifications/route.ts`               | Route through tenant-explicit notification store helpers, resolve correct recipients, and validate tenant-owned foreign IDs.                                       |
| `app/api/v2/notifications/[id]/route.ts`          | Replace `markAsRead()` with a tenant-explicit store helper that does not require a browser-session recipient user.                                                 |
| `app/api/v2/notifications/preferences/route.ts`   | Replace server-action imports with tenant-explicit store calls keyed to the tenant owner's auth user.                                                              |
| `app/api/v2/notifications/sms-settings/route.ts`  | Replace server-action imports with tenant-explicit store calls.                                                                                                    |
| `app/api/v2/notifications/experience/route.ts`    | Replace server-action imports with tenant-explicit store calls.                                                                                                    |
| `app/api/v2/notifications/tiers/route.ts`         | Replace server-action imports with tenant-explicit store calls.                                                                                                    |
| `app/api/v2/notifications/tiers/reset/route.ts`   | Replace server-action imports with tenant-explicit store calls.                                                                                                    |
| `lib/notifications/settings-actions.ts`           | Keep current portal signatures, but turn the functions into thin `requireChef()` wrappers around `lib/notifications/store.ts`.                                     |
| `lib/notifications/tier-actions.ts`               | Keep current portal signatures, but turn the functions into thin `requireChef()` wrappers around `lib/notifications/store.ts`.                                     |
| `lib/notifications/actions.ts`                    | Make chef recipient resolution query `chefs.auth_user_id` directly instead of `user_roles`, and keep existing notification creation logic aligned with that model. |
| `lib/notifications/client-actions.ts`             | Resolve client recipients from `clients.auth_user_id`, not `user_roles`.                                                                                           |
| `app/api/v2/partners/[id]/assign-events/route.ts` | Replace the session-shaped action import with the new tenant-explicit partner store helper.                                                                        |
| `lib/partners/actions.ts`                         | Keep the portal action signature, but delegate its core DB work to `lib/partners/store.ts`.                                                                        |
| `app/api/v2/loyalty/config/route.ts`              | Replace the session-shaped loyalty action imports with tenant-explicit store helpers.                                                                              |
| `lib/loyalty/actions.ts`                          | Keep the portal action signatures, but delegate config read/update logic to `lib/loyalty/store.ts`.                                                                |
| `tests/unit/middleware.routing.test.ts`           | Add assertions that `/chef` remains public while actual `/chef/cannabis/*` aliases remain protected.                                                               |
| `tests/unit/route-policy.chef-coverage.test.ts`   | Replace top-level directory scanning with actual route-file discovery so public `/chef` is not forced into protected roots.                                        |
| `tests/unit/google-connect-routes.test.ts`        | Update callback tests to use direct session auth and cover spoofed-header rejection via the new trust rules.                                                       |
| `docs/feature-api-map.md`                         | Stop advertising the touched routes as simply `complete` until the tenant-boundary fix is the shipped implementation.                                              |
| `docs/external-directory-implementation-notes.md` | Stop presenting the touched notification/partner routes as already done without the hardening slice.                                                               |
| `docs/external-directory-gap-analysis.md`         | Correct the external API gap summary so it reflects the hardened contract instead of the current optimistic claim.                                                 |
| `docs/feature-inventory.md`                       | Update the notifications-center inventory note so it no longer implies the API surface is already coherent.                                                        |

---

## Database Changes

None.

### New Tables

None.

### New Columns on Existing Tables

None.

### Migration Notes

- No migration belongs in this spec.
- The work must use the existing identity columns and foreign keys, not add new ones.

---

## Data Model

This spec depends on treating three ID domains as distinct and non-interchangeable:

- **Tenant ID:** `chefs.id`. This is what API keys authorize. `lib/api/v2/middleware.ts:18-27`, `lib/db/schema/schema.ts:19666-19669`
- **Auth user ID:** `users.id`. This is what `notifications.recipient_id` and `notification_preferences.auth_user_id` point to. `lib/db/schema/schema.ts:1711-1718`, `lib/db/schema/schema.ts:1746-1754`, `lib/db/schema/schema.ts:4082-4105`
- **Client ID:** `clients.id`. This is optional metadata on notifications and a nullable bridge to a portal auth user through `clients.auth_user_id`. `lib/db/schema/schema.ts:1720-1725`, `lib/db/schema/schema.ts:22482-22658`

The builder must preserve these invariants:

- `ctx.tenantId` from `withApiAuth()` is never a valid `notifications.recipient_id`. `lib/api/v2/middleware.ts:18-27`, `app/api/v2/notifications/route.ts:47-52`, `lib/db/schema/schema.ts:1711-1718`
- The default chef recipient for API-key notification routes is `chefs.auth_user_id` for `ctx.tenantId`, not a `user_roles` lookup and not the tenant UUID itself. `lib/db/schema/schema.ts:19666-19669`, `lib/notifications/actions.ts:425-448`
- A client recipient is addressable only if the target client belongs to the same tenant and has a non-null `clients.auth_user_id`. `lib/db/schema/schema.ts:22482-22658`, `lib/notifications/client-actions.ts:15-33`
- Notification preference rows are per auth user, not merely per tenant. API-key access to `/api/v2/notifications/preferences` therefore maps to the tenant owner's auth user. `lib/db/schema/schema.ts:4080-4105`
- API-key handlers must treat linked foreign IDs such as `client_id`, `event_id`, `partnerId`, and `locationId` as tenant-owned resources that must be validated before mutation. `app/api/v2/notifications/route.ts:59-69`, `lib/partners/actions.ts:896-927`, `lib/loyalty/actions.ts:643-678`

---

## Server Actions

No new UI-facing server actions should be introduced. Existing portal-facing actions must remain callable from the current pages, but they should become thin wrappers over the new plain store modules.

| Action Group                                                              | Auth            | Input                                  | Output                                | Side Effects                                              |
| ------------------------------------------------------------------------- | --------------- | -------------------------------------- | ------------------------------------- | --------------------------------------------------------- |
| Notification settings wrappers in `lib/notifications/settings-actions.ts` | `requireChef()` | Existing current signatures            | Same shapes as today                  | Revalidates `/settings/notifications` as today            |
| Notification tier wrappers in `lib/notifications/tier-actions.ts`         | `requireChef()` | Existing current signatures            | Same shapes as today                  | Revalidates `/settings/notifications` as today            |
| `bulkAssignEventsToPartner(partnerId, locationId, eventIds)`              | `requireChef()` | `string`, `string \| null`, `string[]` | `{ success: boolean, count: number }` | Revalidates `/partners/[id]` and `/events`                |
| `getLoyaltyConfig()` / `updateLoyaltyConfig(input)`                       | `requireChef()` | Existing loyalty config signatures     | Same shapes as today                  | Preserves default-config initialization and recalculation |

The important rule is architectural, not cosmetic: API routes must not import these wrapper files once the store modules exist. API routes consume plain tenant-explicit store helpers. Pages and forms keep using the wrapper actions.

---

## UI / Component Spec

This slice does not add new pages or redesign existing screens. It is a trust-boundary and API-contract hardening pass.

### Page Layout

- Public chef profile pages at `/chef/[slug]` remain public and unchanged in layout. `app/(public)/chef/[slug]/page.tsx:1-4`
- Existing notification and loyalty settings pages remain unchanged in shape because their server-action signatures stay stable and delegate to new store helpers behind the scenes. `lib/notifications/settings-actions.ts:35-208`, `lib/notifications/tier-actions.ts:26-158`, `lib/loyalty/actions.ts:639-740`
- The Google connect callback still redirects back to the settings surface on success or error. `app/api/auth/google/connect/callback/route.ts:113-236`

### States

- **Loading:** unchanged from today. This spec adds no new loading UI.
- **Empty:** notification preferences and tier overrides continue to return empty/default states, but from tenant-explicit store helpers instead of browser-session assumptions. `lib/notifications/settings-actions.ts:35-49`, `lib/notifications/tier-actions.ts:26-63`
- **Error:** API routes return structured JSON errors for tenant mismatch, missing ownership, unresolved recipients, or invalid JSON. They must not silently succeed on an invalid recipient or throw a session-auth 500 that hides the real contract failure. `app/api/v2/notifications/[id]/route.ts:20-35`, `app/api/v2/partners/[id]/assign-events/route.ts:19-33`, `app/api/v2/loyalty/config/route.ts:22-36`
- **Populated:** existing settings UIs and API consumers receive the same broad data shapes as today, but sourced from explicit tenant-scoped helpers.

### Interactions

- No new optimistic UI is added in this slice.
- API-key request flow becomes: request -> `withApiAuth()` -> tenant-explicit store helper -> tenant ownership checks -> DB read/write -> structured response. `lib/api/v2/middleware.ts:53-100`
- Browser settings flow becomes: page or form -> existing `requireChef()` server action wrapper -> same tenant-explicit store helper -> DB read/write -> revalidation. `lib/notifications/settings-actions.ts:35-208`, `lib/notifications/tier-actions.ts:26-158`, `lib/partners/actions.ts:886-936`, `lib/loyalty/actions.ts:639-740`
- Google connect callback becomes: browser redirect -> Auth.js session lookup -> verify `state.chefId` ownership -> token exchange -> DB upsert. It must not trust inbound `x-cf-*` headers as proof of identity on a skip-auth route. `app/api/auth/google/connect/callback/route.ts:113-236`, `middleware.ts:59-70`

---

## Edge Cases and Error Handling

| Scenario                                                                                                            | Correct Behavior                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spoofed `x-cf-*` headers arrive on `/api/auth/*` or a public route                                                  | Middleware strips them before the request reaches downstream code, and the header fast path is ignored unless the middleware pathname sentinel is present. |
| Public `/chef/[slug]` page and protected `/chef/cannabis/*` alias both exist                                        | `/chef/[slug]` stays public. Only the actual protected alias subpaths remain in chef route policy.                                                         |
| `POST /api/v2/notifications` omits `recipient_id` for a chef notification                                           | Resolve the tenant owner's auth user from `chefs.auth_user_id`. Never write `ctx.tenantId` into `recipient_id`.                                            |
| `POST /api/v2/notifications` targets a client whose `clients.auth_user_id` is null                                  | Return a domain error such as `recipient_unavailable` and do not insert a notification row.                                                                |
| `POST /api/v2/notifications` includes `client_id` or `event_id` outside the caller's tenant                         | Return `404` or an equivalent non-leaking ownership error and do not insert.                                                                               |
| `PATCH /api/v2/notifications/:id` is called for a notification not belonging to the tenant owner's recipient record | Return `404` and leave the row unchanged.                                                                                                                  |
| `POST /api/v2/partners/:id/assign-events` includes any event outside the caller's tenant                            | Reject the whole request instead of partially updating the subset that happened to match.                                                                  |
| `GET /api/v2/loyalty/config` runs for a tenant with no config row yet                                               | Initialize the default config exactly once for that tenant, preserving current portal behavior.                                                            |

---

## Verification Steps

1. Run:
   `node --test --import tsx tests/unit/request-auth-context.test.ts tests/unit/middleware.routing.test.ts tests/unit/google-connect-routes.test.ts tests/unit/api-v2-notifications.route.test.ts tests/unit/api-v2-partners.route.test.ts tests/unit/api-v2-loyalty-config.route.test.ts tests/unit/realtime-channel-access.test.ts`
2. Sign in with the agent chef account and open `/settings/notifications`. Verify preferences, SMS settings, quiet hours, and tier pages still load and save after the wrapper-to-store refactor.
3. From the same browser session, reconnect Google integration and verify the callback still returns to `/settings/integrations` on success and still rejects a mismatched chef.
4. Exercise `POST /api/v2/notifications` with an API-key harness or route unit test for:
   - default chef recipient path
   - client recipient path with valid `client_id`
   - invalid foreign-id path
   - read-state path on `/api/v2/notifications/[id]`
5. Exercise `POST /api/v2/partners/:id/assign-events` and `GET/PATCH /api/v2/loyalty/config` without any browser session and confirm they succeed from `ctx.tenantId` alone.
6. Confirm no inserted notification row uses a tenant UUID as `recipient_id`.
7. Update the touched docs only after the tests above pass, so the docs describe the hardened implementation rather than the pre-fix surface.

---

## Out of Scope

- Replacing the raw admin compat client or rolling out true least-privilege DB clients / RLS enforcement. `lib/db/server.ts:1-7`, `lib/db/admin.ts:1-6`
- Replacing in-memory rate limiting or hardening trusted client-IP extraction. `lib/api/rate-limit.ts:1-26`, `lib/rateLimit.ts:1-32`, `app/api/book/route.ts:44-49`
- Making public inquiry and booking flows transactional or moving their side effects to an outbox/job model. `app/api/book/route.ts:167-280`, `lib/inquiries/public-actions.ts:186-390`
- Turning TypeScript and ESLint back into hard build gates. `next.config.js:71-82`
- Auditing every `/api/v2` route in the codebase for session-shaped helpers. This spec covers the verified broken slice only. `app/api/v2/notifications/*`, `app/api/v2/partners/[id]/assign-events/route.ts`, `app/api/v2/loyalty/config/route.ts`

---

## Notes for Builder Agent

- Start with the identity model, not the route handlers. If the code still confuses `tenantId`, `clientId`, and `authUserId`, the route rewrites will still be wrong.
- Use `chefs.auth_user_id` for the default chef recipient and owner notification-preference rows. Do not use `user_roles` for this default path. `lib/db/schema/schema.ts:19666-19669`, `lib/notifications/actions.ts:425-448`
- Use `clients.auth_user_id` for client notification recipients. A nullable client auth user is a real product state, not an edge case to ignore. `lib/db/schema/schema.ts:22482-22658`, `lib/notifications/client-actions.ts:15-33`
- Keep the external-integration mental model in mind while building. Stripe, Square, Google, and Intuit all assume clear callback semantics, explicit tokens, retries, and refresh behavior. Do not leave any touched route in a state where its real principal is ambiguous. `docs/research/2026-04-09-multi-stakeholder-workflow-research-for-architecture-refinement.md:259-309`
- Do not "solve" the `/chef` overlap by removing `/chef` from the public list. That would break public chef profiles. The right fix is to narrow the protected path list and repair the coverage test. `app/(public)/chef/[slug]/page.tsx:1-4`, `tests/unit/route-policy.chef-coverage.test.ts:1-32`
- Do not keep API handlers wired to `'use server'` modules. That is the architectural smell this spec is removing.
- If a small pure helper makes middleware header sanitation easier to test, add it. Testability is part of the hardening, not incidental.

---

## Spec Validation

1. **What exists today that this touches?**  
   Middleware currently returns early for skip-auth and public paths before stripping internal auth headers, while `getCurrentUser()` trusts those headers before session fallback. `middleware.ts:55-70`, `lib/auth/request-auth-context.ts:33-38`, `lib/auth/request-auth-context.ts:71-90`, `lib/auth/get-user.ts:41-57`. `/api/auth/google/connect/callback` is one concrete route that sits on that seam. `lib/auth/route-policy.ts:167-170`, `app/api/auth/google/connect/callback/route.ts:113-126`. The same slice also touches the contradictory `/chef` route policy, the API-key notification routes, the partner assign-events route, and the loyalty config route. `lib/auth/route-policy.ts:4-15`, `lib/auth/route-policy.ts:107-154`, `app/api/v2/notifications/route.ts:11-69`, `app/api/v2/notifications/[id]/route.ts:15-38`, `app/api/v2/partners/[id]/assign-events/route.ts:14-36`, `app/api/v2/loyalty/config/route.ts:9-36`.

2. **What exactly changes?**  
   Sanitize request headers before public and skip-auth early returns, require a middleware pathname sentinel before trusting header auth context, move the Google callback off `getCurrentUser()` fast-path assumptions, narrow the protected `/chef/*` list, extract tenant-explicit store modules for notifications/partners/loyalty, rewire the affected `/api/v2` routes to those store modules, and correct the docs that currently describe the pre-hardening surface as complete. `middleware.ts:55-70`, `lib/auth/request-auth-context.ts:33-38`, `app/api/auth/google/connect/callback/route.ts:113-126`, `lib/auth/route-policy.ts:4-15`, `lib/auth/route-policy.ts:107-154`, `app/api/v2/notifications/route.ts:47-69`, `lib/partners/actions.ts:886-936`, `lib/loyalty/actions.ts:639-740`, `docs/feature-api-map.md:219`, `docs/feature-api-map.md:254-263`, `docs/external-directory-implementation-notes.md:116-137`, `docs/external-directory-gap-analysis.md:109`, `docs/external-directory-gap-analysis.md:129`, `docs/feature-inventory.md:143`.

3. **What assumptions are you making?**  
   Verified: `notifications.recipient_id` points to `users.id`, not `chefs.id`. `lib/db/schema/schema.ts:1711-1718`, `lib/db/schema/schema.ts:1746-1754`. Verified: notification preferences are keyed to `auth_user_id`, not just tenant. `lib/db/schema/schema.ts:4080-4105`. Verified: `chefs.auth_user_id` exists and is non-null, while `clients.auth_user_id` exists and is nullable. `lib/db/schema/schema.ts:19666-19669`, `lib/db/schema/schema.ts:22482-22658`. Verified: public chef profiles intentionally live at `/chef/[slug]` and the only `(chef)` aliases under `/chef/*` currently redirect cannabis pages. `app/(public)/chef/[slug]/page.tsx:1-4`, `app/(chef)/chef/cannabis/handbook/page.tsx:1-4`, `app/(chef)/chef/cannabis/rsvps/page.tsx:1-4`. Unverified: whether any external API consumer already relies on the current broken `recipient_id = ctx.tenantId` default or the current 500-shaped failure modes.

4. **Where will this most likely break?**  
   First, the Google connect callback can break if the builder swaps auth lookup incorrectly, because that route currently depends on `getCurrentUser()` and is already covered by a route test with mocks. `app/api/auth/google/connect/callback/route.ts:113-236`, `tests/unit/google-connect-routes.test.ts:114-255`. Second, route-policy coverage can break if the builder narrows `/chef` protection without fixing the coarse directory-based coverage test. `tests/unit/route-policy.chef-coverage.test.ts:15-31`, `lib/auth/route-policy.ts:4-15`, `lib/auth/route-policy.ts:107-154`. Third, notifications will break if the builder keeps mixing tenant IDs with auth-user IDs or silently ignores clients who lack portal accounts. `app/api/v2/notifications/route.ts:47-69`, `lib/db/schema/schema.ts:1711-1725`, `lib/db/schema/schema.ts:22482-22658`.

5. **What is underspecified?**  
   The current code is underspecified about recipient identity, ownership validation, and API-key semantics. `POST /api/v2/notifications` says `recipient_id` is optional, but it does not define whether the default recipient is a tenant owner, any chef user, or an invalid tenant UUID. `app/api/v2/notifications/route.ts:11-31`, `app/api/v2/notifications/route.ts:47-69`. The current partner assignment path also does not define whether partial event updates are acceptable. `lib/partners/actions.ts:919-927`. This spec removes that ambiguity by making the recipient and tenant-ownership rules explicit.

6. **What dependencies or prerequisites exist?**  
   The implementation depends on the existing API-key context provided by `withApiAuth()`, the existing schema columns for `chefs.auth_user_id` and `clients.auth_user_id`, and the preserved-dirty-checkout workflow documented in the build-state and planner rules. `lib/api/v2/middleware.ts:18-27`, `lib/db/schema/schema.ts:19666-19669`, `lib/db/schema/schema.ts:22482-22658`, `docs/build-state.md:20-29`, `docs/specs/README.md:36-38`. No migration is required or allowed in this slice.

7. **What existing logic could this conflict with?**  
   It can conflict with current portal wrappers if the builder deletes or changes their signatures instead of wrapping store helpers. `lib/notifications/settings-actions.ts:35-208`, `lib/notifications/tier-actions.ts:26-158`, `lib/partners/actions.ts:886-936`, `lib/loyalty/actions.ts:639-740`. It can also conflict with public chef profile routing if the builder removes `/chef` from the public list instead of narrowing the protected list. `app/(public)/chef/[slug]/page.tsx:1-4`, `lib/auth/route-policy.ts:129-132`. Finally, it can conflict with the current optimistic docs if those docs are left unchanged after the code hardening lands. `docs/feature-api-map.md:219`, `docs/feature-api-map.md:254-263`, `docs/external-directory-implementation-notes.md:116-137`.

8. **What is the end-to-end data flow?**  
   For API-key routes: inbound request -> `withApiAuth()` validates key and yields `ctx.tenantId` plus admin DB client -> route calls a tenant-explicit store helper -> helper resolves any required auth-user recipient and validates linked IDs belong to `ctx.tenantId` -> DB write/read -> structured JSON response. `lib/api/v2/middleware.ts:53-100`, `app/api/v2/notifications/route.ts:33-79`, `app/api/v2/partners/[id]/assign-events/route.ts:14-36`, `app/api/v2/loyalty/config/route.ts:9-36`. For browser settings flows: page or form -> existing `requireChef()` action wrapper -> same store helper -> DB -> revalidation. `lib/notifications/settings-actions.ts:35-208`, `lib/notifications/tier-actions.ts:26-158`, `lib/partners/actions.ts:886-936`, `lib/loyalty/actions.ts:639-740`. For the Google callback: browser redirect -> sanitized request headers plus Auth.js session -> chef ownership check -> token exchange -> DB upsert. `middleware.ts:55-70`, `app/api/auth/google/connect/callback/route.ts:113-236`.

9. **What is the correct implementation order?**  
   First fix request trust: sanitize headers before early returns, enforce the pathname sentinel, and update the Google callback auth lookup. Second fix route-policy coherence and its coverage tests so public `/chef` and protected `/chef/cannabis/*` are both modeled correctly. Third extract the tenant-explicit store modules. Fourth rewire the affected `/api/v2` routes to those stores and keep portal wrappers stable. Fifth update the docs and run the focused verification suite. This order matters because the route and API rewires depend on a correct trust model and a correct identity model.

10. **What are the exact success criteria?**  
    Success means all of the following are true at once: spoofed `x-cf-*` headers are not enough to authorize a public or skip-auth request; `/chef/[slug]` remains public while actual `/chef/cannabis/*` aliases remain protected; the touched `/api/v2` routes no longer import session-shaped `'use server'` modules; notification writes never use `ctx.tenantId` as `recipient_id`; partner assign-events and loyalty config work from API keys without any browser session; and the touched docs stop describing the pre-hardening surface as simply complete. `middleware.ts:55-70`, `lib/auth/route-policy.ts:4-15`, `lib/auth/route-policy.ts:107-154`, `app/(public)/chef/[slug]/page.tsx:1-4`, `app/api/v2/notifications/route.ts:47-69`, `app/api/v2/partners/[id]/assign-events/route.ts:14-36`, `app/api/v2/loyalty/config/route.ts:9-36`, `docs/feature-api-map.md:219`, `docs/feature-api-map.md:254-263`.

11. **What are the non-negotiable constraints?**  
    No DB migration. No new dependency on browser-session helpers inside API-key routes. No breakage of public `/chef/[slug]` pages. No signature breakage for existing portal wrappers. No widening of the slice into rate limiting, public-form transactions, or global DB-client/RLS work. `lib/db/schema/schema.ts:1709-1754`, `app/(public)/chef/[slug]/page.tsx:1-4`, `lib/notifications/settings-actions.ts:35-208`, `lib/notifications/tier-actions.ts:26-158`, `lib/partners/actions.ts:886-936`, `lib/loyalty/actions.ts:639-740`, `lib/api/rate-limit.ts:1-26`, `app/api/book/route.ts:167-280`, `lib/db/server.ts:1-7`.

12. **What should NOT be touched?**  
    Do not use this spec to redesign the public website, change realtime authorization, add schema fields, replace the admin DB client, or solve the public booking transaction problem. `app/(public)/chef/[slug]/page.tsx:1-4`, `app/api/realtime/[channel]/route.ts:31-47`, `lib/realtime/channel-access.ts:11-70`, `lib/db/server.ts:1-7`, `app/api/book/route.ts:167-280`, `lib/inquiries/public-actions.ts:186-390`.

13. **Is this the simplest complete version?**  
    Yes. It fixes one coherent architectural seam: request trust plus tenant-correct API routing. It reuses the existing schema, keeps existing portal action signatures stable, and targets only the routes already verified as inconsistent. It does not attempt a platform-wide refactor. `lib/api/v2/middleware.ts:18-27`, `app/api/v2/notifications/route.ts:47-69`, `app/api/v2/partners/[id]/assign-events/route.ts:14-36`, `app/api/v2/loyalty/config/route.ts:9-36`.

14. **If implemented exactly as written, what would still be wrong?**  
    The system would still have broader structural debt outside this slice: raw admin DB access still bypasses RLS, API and public rate limiting are still in-memory, public write flows are still non-transactional and side-effect heavy, and production builds still ignore ESLint and TypeScript failures. `lib/db/server.ts:1-7`, `lib/db/admin.ts:1-6`, `lib/api/rate-limit.ts:1-26`, `lib/rateLimit.ts:1-32`, `app/api/book/route.ts:44-87`, `app/api/book/route.ts:167-280`, `lib/inquiries/public-actions.ts:71-80`, `lib/inquiries/public-actions.ts:186-390`, `next.config.js:71-82`.

### What A Builder Would Get Wrong Building This As Written

- They would keep treating `ctx.tenantId` like a valid notification `recipient_id`. That is wrong because `recipient_id` is a `users.id` foreign key, not a `chefs.id` foreign key. `app/api/v2/notifications/route.ts:47-52`, `lib/db/schema/schema.ts:1711-1718`, `lib/db/schema/schema.ts:1746-1754`
- They would "fix" the `/chef` overlap by removing public `/chef` support, which would break public chef profiles. The correct fix is to narrow the protected list and repair the coverage test. `app/(public)/chef/[slug]/page.tsx:1-4`, `lib/auth/route-policy.ts:129-132`, `tests/unit/route-policy.chef-coverage.test.ts:15-31`
- They would keep importing `'use server'` action files into API routes because it feels convenient. That would preserve the exact session/API-context confusion this spec is supposed to remove. `app/api/v2/notifications/preferences/route.ts:22-58`, `lib/notifications/settings-actions.ts:35-208`, `app/api/v2/partners/[id]/assign-events/route.ts:14-36`, `lib/partners/actions.ts:886-936`, `app/api/v2/loyalty/config/route.ts:9-36`, `lib/loyalty/actions.ts:639-740`
- They would resolve chef and client auth-user IDs through `user_roles` instead of the explicit schema columns that already exist for this purpose. `lib/notifications/actions.ts:425-448`, `lib/notifications/client-actions.ts:15-33`, `lib/db/schema/schema.ts:19666-19669`, `lib/db/schema/schema.ts:22482-22658`
- They would preserve partial-update behavior in partner assign-events instead of rejecting cross-tenant event sets as one invalid request. `lib/partners/actions.ts:919-927`

### Is Anything Assumed But Not Verified?

- Yes. The repo cannot verify whether any external API consumer already relies on the current broken `recipient_id = ctx.tenantId` default or on today's error-shape behavior.
- Yes. The repo cannot verify whether future multi-user chef-recipient delivery is needed on `/api/v2/notifications`, so this spec intentionally keeps the API-key default scoped to the tenant owner auth user only.
- Yes. This planner session verified the broken slice named in this spec, not every `/api/v2` route in the codebase. Other session-shaped imports may still exist elsewhere and should be treated as separate follow-on audit work.

### Final Check

This spec is ready for builder execution. The scope is narrow, dependency-ordered, and evidence-backed. The only intentionally unverified area is external consumer reliance on today's broken notification recipient contract, which cannot be proven from the repo alone.
