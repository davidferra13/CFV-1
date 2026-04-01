# Spec: OpenClaw Internal-Only Boundary and Product Debranding

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** `openclaw-canonical-scope-and-sequence.md`
> **Estimated complexity:** medium (3-8 files)

## Timeline

| Event                 | Date                 | Agent/Session               | Commit   |
| --------------------- | -------------------- | --------------------------- | -------- |
| Created               | 2026-03-31 23:45 EDT | Codex                       |          |
| Status: ready         | 2026-03-31 23:45 EDT | Codex                       |          |
| Claimed (in-progress) | 2026-04-01 02:30 EST | Builder (Claude Sonnet 4.6) |          |
| Build completed       | 2026-04-01 02:35 EST | Builder (Claude Sonnet 4.6) | 2dc3e510 |
| Type check passed     | 2026-04-01 02:35 EST | Builder (Claude Sonnet 4.6) | 2dc3e510 |
| Build check passed    | 2026-04-01 02:35 EST | Builder (Claude Sonnet 4.6) | 2dc3e510 |
| Status: verified      | 2026-04-01 02:35 EST | Builder (Claude Sonnet 4.6) | 2dc3e510 |

---

## Developer Notes

### Raw Signal

The developer clarified that OpenClaw should be strictly a developer tool living on the Raspberry Pi. It should not be interacting with the public. They explicitly want that forbidden.

They also said there should be no mention of OpenClaw on the website at all from the user standpoint. They noticed the website currently says OpenClaw in some places and called that horrible. They do not want the app telling users how data is scraped or what internal tool is doing the work.

They also made the current priority clear: OpenClaw's most important job right now is creating the databases and grocery price coverage the website depends on. The app should consume the results, not expose the mechanism.

### Developer Intent

- **Core goal:** Lock OpenClaw behind ChefFlow as internal infrastructure only, and remove all product-facing OpenClaw branding or disclosure.
- **Key constraints:** No public user path into OpenClaw, no user-facing OpenClaw copy, no product route that exposes OpenClaw by name, no runtime redesign that turns OpenClaw into a public feature.
- **Motivation:** The current UI leaks internal implementation details and weakens the boundary between internal tooling and the product itself.
- **Success from the developer's perspective:** Users only see ChefFlow and its outputs. OpenClaw stays invisible, internal, and strictly behind the product.

---

## What This Does (Plain English)

This spec removes OpenClaw from chef-facing and public-facing product copy, routes, and labels, while preserving internal admin and developer usage where it is actually needed. It also defines the architecture rule that public users must never talk directly to OpenClaw and that ChefFlow should expose outcomes, not internal tool names.

---

## Why It Matters

Right now the product leaks internal mechanism language into the user experience. That is unnecessary for users, creates avoidable risk, and blurs the line between infrastructure and product.

---

## Core Decisions

1. OpenClaw is internal infrastructure, not a product feature.
2. Public-facing and chef-facing product surfaces must not mention OpenClaw by name.
3. Product URLs, titles, buttons, empty states, and helper copy must use neutral ChefFlow language.
4. Public users and ordinary product users must never talk directly to OpenClaw.
5. ChefFlow may consume OpenClaw-produced data only through ChefFlow-controlled server/database layers.
6. Internal admin or founder-only surfaces may mention OpenClaw when operationally necessary.
7. This spec overrides older specs anywhere they leak OpenClaw naming into user-facing product surfaces.
8. Raw OpenClaw lead browsing is not kept as a chef-facing product feature. It is deferred or moved to a separate founder/admin-only internal workflow later.

---

## Current Audit Findings

These are the current user-facing leaks that need to be cleaned up.

| File                                                                 | Current Leak                                                    | Required Direction                                                                |
| -------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `components/events/grocery-quote-panel.tsx`                          | Mentions local OpenClaw prices in helper copy and source legend | Replace with neutral price-data language                                          |
| `app/(chef)/settings/store-preferences/store-preferences-client.tsx` | Says `Tracked by OpenClaw` and `price data from OpenClaw`       | Replace with neutral store-coverage language                                      |
| `components/pricing/coverage-health-widget.tsx`                      | Says `Run OpenCLAW sync first`                                  | Replace with neutral data-sync language                                           |
| `app/(chef)/prices/page.tsx`                                         | Says prices are `updated daily by OpenClaw`                     | Remove internal tool name entirely                                                |
| `app/(chef)/prices/prices-client.tsx`                                | Says `The OpenClaw inventory system...`                         | Replace with neutral data-pipeline language                                       |
| `app/(chef)/prospecting/page.tsx`                                    | Button and stat card say `OpenClaw Leads`                       | Remove raw-source lead browsing from chef-facing product                          |
| `app/(chef)/prospecting/openclaw/page.tsx`                           | Route, metadata, title, and subtitle expose OpenClaw            | Remove chef-facing route or redirect back to normal prospecting                   |
| `components/prospecting/openclaw-leads-browser.tsx`                  | Empty state says `No OpenClaw leads found`                      | Remove from chef-facing bundle or reserve for future internal-only review surface |

The route handlers in `app/api/cron/openclaw-sync/route.ts`, `app/api/cron/openclaw-polish/route.ts`, `app/api/cron/price-sync/route.ts`, and `app/api/sentinel/sync-status/route.ts` are already CRON-secret gated. That boundary should be preserved, not exposed.

---

## Files to Create

None in the chef-facing or public-facing product surface.

If raw-source lead review is still wanted later, write a separate founder/admin-only spec for it. Do not create a chef-facing replacement route in this spec.

---

## Files to Modify

| File                                                                 | What to Change                                                                                         |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `components/events/grocery-quote-panel.tsx`                          | Replace all user-facing OpenClaw mentions with neutral price-source and coverage wording               |
| `app/(chef)/settings/store-preferences/store-preferences-client.tsx` | Replace OpenClaw quick-add copy with neutral tracked-store language                                    |
| `components/pricing/coverage-health-widget.tsx`                      | Replace `Run OpenCLAW sync first` with neutral data-sync guidance                                      |
| `app/(chef)/prices/page.tsx`                                         | Remove `updated daily by OpenClaw` and keep the subtitle outcome-focused                               |
| `app/(chef)/prices/prices-client.tsx`                                | Replace OpenClaw inventory-system copy with neutral pipeline/status copy                               |
| `app/(chef)/prospecting/page.tsx`                                    | Remove the raw-source OpenClaw leads button and stat card from chef-facing prospecting                 |
| `app/(chef)/prospecting/openclaw/page.tsx`                           | Replace with redirect to `/prospecting` or `notFound()`. Do not create a chef-facing replacement route |
| `components/prospecting/openclaw-leads-browser.tsx`                  | Remove from chef-facing use. If retained later, reserve it for internal-only review tooling            |
| `lib/prospecting/openclaw-import.ts`                                 | Remove chef-facing route revalidation dependencies while leaving internal symbol names alone for now   |

**Do not modify in this spec:**

- `lib/openclaw/*` internal modules unless needed for route/path revalidation
- Raspberry Pi runtime scripts
- sync internals
- database schemas

Internal names can stay internal for now. This spec is about product boundary and disclosure, not backend namespace refactors.

---

## Database Changes

None.

This is a boundary and naming cleanup, not a schema project.

---

## Data Model

No data model changes are required.

The important model distinction is architectural:

- **User-visible layer:** ChefFlow language only
- **Internal integration layer:** OpenClaw may exist here
- **Runtime boundary:** OpenClaw is never directly invoked from the user browser

---

## Server Actions

No new server actions are required.

If any server-side code currently revalidates or links to `/prospecting/openclaw`, it must stop depending on that chef-facing route. Route cleanup should point back to `/prospecting` or an eventual internal-only route defined in a separate spec.

---

## UI / Component Spec

### Naming Rule

Use neutral user-facing language such as:

- live grocery price data
- local store coverage
- tracked stores
- market data
- data sync
- imported leads

Do not use:

- OpenClaw
- scraper
- cartridge
- Pi
- crawl
- scraped by OpenClaw

### Route Rule

The current chef-facing route `/prospecting/openclaw` should not remain a visible product route.

Do not replace it with another chef-facing raw-source route.

Preferred behavior:

1. Remove all chef-facing links to the raw-source route immediately.
2. Keep a temporary redirect from `/prospecting/openclaw` to `/prospecting` only if required for a safe transition.
3. If raw-source review is still needed later, move it to a founder/admin-only internal surface under a separate spec.

### Copy Replacement Direction

Use these replacements as the default direction.

| Current Style                                            | Replacement Direction                                |
| -------------------------------------------------------- | ---------------------------------------------------- |
| `Uses local OpenClaw store prices first`                 | `Uses current local store price data first`          |
| `Checking local OpenClaw prices first`                   | `Checking local store price coverage first`          |
| `OpenClaw - Local store prices`                          | `Local store coverage`                               |
| `Tracked by OpenClaw (quick add)`                        | `Tracked stores (quick add)`                         |
| `These stores have price data from OpenClaw`             | `These stores already have price coverage`           |
| `Run OpenCLAW sync first`                                | `Run a data sync first`                              |
| `updated daily by OpenClaw`                              | `updated regularly` or neutral freshness wording     |
| `The OpenClaw inventory system is collecting store data` | `The store data pipeline is still building coverage` |
| `OpenClaw Leads`                                         | Remove from chef-facing UI rather than rename        |
| `Businesses scraped by OpenClaw`                         | Remove from chef-facing UI rather than replace       |
| `No OpenClaw leads found`                                | Remove from chef-facing UI rather than replace       |

### Internal Boundary Rule

These rules are non-negotiable:

1. No client-side code should call `OPENCLAW_API_URL` directly.
2. No public route should proxy arbitrary user requests to OpenClaw.
3. OpenClaw cron and sync routes must remain secret-gated or admin-gated.
4. Public users can consume data that originated in OpenClaw only after it has passed through ChefFlow-owned storage and rules.

### Allowed Internal Visibility

OpenClaw naming is still allowed in:

- founder-only documentation
- internal admin tooling
- server-side module names
- logs and operational notes

That is the correct place for it.

---

## Edge Cases and Error Handling

| Scenario                                                | Correct Behavior                                                                        |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Chef page currently linked to `/prospecting/openclaw`   | Remove link and point users back to normal `/prospecting`                               |
| Old bookmarked `/prospecting/openclaw` URL still exists | Temporary redirect to `/prospecting` is acceptable for one release only if needed       |
| Internal code still uses `openclaw` symbol names        | Allowed if not user-visible                                                             |
| Admin/internal pages mention OpenClaw                   | Allowed if access stays internal                                                        |
| Product copy needs to explain missing data              | Use neutral language like `coverage`, `data sync`, `freshness`, or `price availability` |
| Route handlers already protected by `verifyCronAuth`    | Keep protection as-is; do not weaken it during cleanup                                  |

---

## Verification Steps

1. Search the product UI code for user-facing `OpenClaw` strings.
2. Confirm all chef-facing and public-facing matches are removed or neutralized.
3. Visit `/prices` and confirm there is no OpenClaw naming in titles, subtitles, empty states, or helper text.
4. Visit the grocery quote flow and confirm the source explanation is neutral and outcome-focused.
5. Visit store preferences and confirm tracked-store copy no longer mentions OpenClaw.
6. Visit prospecting and confirm the raw-source OpenClaw button and stat card are gone from the chef-facing surface.
7. Confirm `/prospecting/openclaw` is no longer a visible chef-facing route and either redirects to `/prospecting` temporarily or is removed.
8. Confirm no chef-facing replacement route for raw-source lead browsing was introduced in this cleanup.
9. Confirm `app/api/cron/openclaw-sync/route.ts`, `app/api/cron/openclaw-polish/route.ts`, `app/api/cron/price-sync/route.ts`, and `app/api/sentinel/sync-status/route.ts` still require secret-gated access.
10. Confirm no browser-executed code fetches `OPENCLAW_API_URL` directly.

---

## Out of Scope

- Renaming every internal `openclaw` file, type, function, or module
- Rebuilding the Raspberry Pi runtime
- Re-architecting sync infrastructure
- Changing database schema
- Turning OpenClaw into a public feature
- Adding a second OpenClaw machine

---

## Notes for Builder Agent

1. Treat this as a boundary spec first and a copy spec second.
2. If an older spec tells you to expose OpenClaw in chef-facing UI, this spec wins.
3. The right product language is outcome language, not mechanism language.
4. Keep the internal integration intact. The point is to hide it behind ChefFlow, not pretend it does not exist.
5. The most important structural change is to remove raw-source lead browsing from chef-facing prospecting rather than rename it.
6. If internal users still need raw lead review later, that is a separate founder/admin-only spec.
7. If you find more user-facing OpenClaw strings during implementation, remove them under this same rule instead of stopping for another spec.

---

## Final Check

This spec is complete as written. It gives the builder a clear policy, a concrete audit list, a route decision, replacement language, and verification criteria without changing the underlying OpenClaw runtime.
