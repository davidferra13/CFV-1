# Research: Code Audit Decision Register

> **Date:** 2026-04-01
> **Question:** Consolidated register of all candidates from the three audit reports. What is the recommended next action for each?
> **Status:** complete
> **Sources:** `production-reachability-report.md`, `route-discoverability-report.md`, `external-entrypoint-classification.md`

---

## How to Read This Register

- **Category:** the class of the candidate
  - `orphan`: no inbound imports from production surface
  - `test_only`: imported only from test files
  - `hidden_route`: a page.tsx route with no discoverable nav link
  - `external_api`: a route.ts that is triggered externally (never dead from static imports alone)
  - `duplicate`: two files that serve the same purpose; one appears severed
  - `string_registry`: referenced only as a string key in a config/registry, not an import
- **Recommendation:** suggested disposition
  - `keep`: actively used or externally triggered; do not touch
  - `recover`: real feature code, but discoverability or wiring is missing; needs a follow-on spec
  - `investigate`: insufficient evidence to decide; needs developer review or runtime testing
  - `prune_candidate`: meets all prune criteria; safe to remove after confirmation
- **Confidence:** `high`, `medium`, `low`
- **Required evidence before any deletion:** what must be true before this file is removed

---

## Register

### Production Orphans (components, lib, hooks)

| File                                               | Category    | Recommendation    | Confidence | Reason                                                                                                                                                                                       | Required Evidence Before Deletion                                                                                                                                     |
| -------------------------------------------------- | ----------- | ----------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ai/remy-public-widget.tsx`             | `orphan`    | `investigate`     | high       | Zero inbound imports in production surface. Active embed widget exists at `components/embed/embed-inquiry-form.tsx`. May be a parallel, superseded implementation of the public Remy widget. | Developer confirms this is not wired anywhere and is not planned; confirm `components/embed/embed-inquiry-form.tsx` covers the same use case fully.                   |
| `components/admin/admin-sidebar.tsx`               | `orphan`    | `investigate`     | high       | Zero inbound imports. Admin nav is handled via `nav-config.tsx` adminOnly items rendered by `chef-nav.tsx`, not a dedicated sidebar component.                                               | Developer confirms the admin section does not use a separate sidebar and this file is not planned for use.                                                            |
| `components/admin/admin-preview-toggle.tsx`        | `orphan`    | `investigate`     | high       | Zero inbound imports across the entire production surface.                                                                                                                                   | Developer confirms no admin preview toggle feature is planned or in use.                                                                                              |
| `components/activity/client-activity-timeline.tsx` | `orphan`    | `investigate`     | high       | Zero inbound imports. `entity-activity-timeline.tsx` (3 refs) and `client-activity-feed.tsx` (1 ref) appear to be the active equivalents.                                                    | Developer confirms `entity-activity-timeline.tsx` covers client timeline use cases and this file is superseded.                                                       |
| `components/sustainability/sourcing-dashboard.tsx` | `orphan`    | `investigate`     | medium     | Zero inbound imports. `lib/sustainability/` has 2 referenced server actions, meaning the data layer is wired but the UI surface is not rendered anywhere.                                    | Developer confirms the sourcing dashboard feature is not planned for the near term, OR confirms it should be wired and flags it for recovery.                         |
| `components/sustainability/sourcing-log.tsx`       | `orphan`    | `investigate`     | medium     | Zero inbound imports. Same context as sourcing dashboard.                                                                                                                                    | Same as above.                                                                                                                                                        |
| `components/classes/class-form.tsx`                | `orphan`    | `investigate`     | high       | Zero inbound imports. No `/classes` route found in the app. `lib/classes/class-actions.ts` has 4 refs, meaning server actions are wired but no UI renders them.                              | Developer confirms classes feature is not active; OR confirms it should be wired and a UI recovery spec is needed.                                                    |
| `components/classes/class-list.tsx`                | `orphan`    | `investigate`     | high       | Same as above.                                                                                                                                                                               | Same as above.                                                                                                                                                        |
| `components/classes/class-registration-form.tsx`   | `orphan`    | `investigate`     | high       | Same as above.                                                                                                                                                                               | Same as above.                                                                                                                                                        |
| `components/classes/class-registrations.tsx`       | `orphan`    | `investigate`     | high       | Same as above.                                                                                                                                                                               | Same as above.                                                                                                                                                        |
| `components/follow-up/event-sequence-status.tsx`   | `orphan`    | `investigate`     | medium     | Zero inbound imports. `components/followup/` (different spelling) has some referenced files. Naming ambiguity makes this harder to classify without developer input.                         | Developer confirms whether `follow-up/` and `followup/` are intentionally separate directories or a naming accident; clarifies whether this component was superseded. |
| `lib/wine/spoonacular-wine.ts`                     | `orphan`    | `prune_candidate` | high       | Zero inbound imports. No wine pairing route exists in the app. Spoonacular is an external API integration. No dynamic imports or string references found.                                    | Confirm zero references in `scripts/` and `tests/` as well; confirm no wine pairing feature is planned.                                                               |
| `hooks/use-field-validation.ts`                    | `duplicate` | `investigate`     | high       | Zero inbound imports. `lib/validation/use-field-validation.ts` exists as a parallel with the same name. Neither is currently wired.                                                          | Developer confirms which version (hooks/ or lib/validation/) is canonical; the other becomes `prune_candidate`. Both may be prunable if neither is in use.            |
| `lib/validation/use-field-validation.ts`           | `duplicate` | `investigate`     | high       | Zero inbound imports. Same as above.                                                                                                                                                         | Same as above.                                                                                                                                                        |

---

### Test-Only Files

| File                | Category    | Recommendation | Confidence | Reason                                                                                                                                                                                                            | Required Evidence Before Deletion                                                                                                                                                                             |
| ------------------- | ----------- | -------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/events/fsm.ts` | `test_only` | `investigate`  | high       | No imports in production surface (`app/`, `components/`, `lib/`, `hooks/`). Referenced only by `tests/unit/events.fsm.test.ts`. The active event state machine is the 8-state FSM in `lib/events/transitions.ts`. | Developer confirms `lib/events/transitions.ts` is the canonical production FSM and this file is a parallel that was superseded; confirm test suite can be updated to test `transitions.ts` instead if needed. |

---

### String-Registry References Only

| File                         | Category          | Recommendation | Confidence | Reason                                                                                                                                                                                                                                                   | Required Evidence Before Deletion                                                                                                                                                                                             |
| ---------------------------- | ----------------- | -------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/ai/menu-suggestions.ts` | `string_registry` | `investigate`  | medium     | Not imported anywhere in production. Referenced only as a string key `'menu-suggestions'` in `lib/ai/privacy-audit.ts`, which is itself unreferenced. The AI module is written and categorized (Gemini, low sensitivity) but no page or action calls it. | Developer confirms whether a menu-suggestions feature is planned; if so, this is a `recover` candidate; if not, it is a `prune_candidate`.                                                                                    |
| `lib/ai/privacy-audit.ts`    | `string_registry` | `investigate`  | medium     | Not imported anywhere, including tests and scripts. Contains a routing audit map that documents which AI modules should use Ollama vs Gemini. Governance policy lives in `CLAUDE.md`.                                                                    | Developer confirms whether this file is meant to be imported as a runtime routing policy (in which case it needs wiring), or whether it is a docs-style reference only (in which case it may be better kept as a `.md` file). |

---

### Hidden Routes (exist as pages, no discoverable nav link)

| Route                           | Category       | Recommendation | Confidence | Reason                                                                                                                                                                                                                         | Required Evidence Before Deletion                                                                                                               |
| ------------------------------- | -------------- | -------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/outreach`               | `hidden_route` | `recover`      | medium     | Admin route with no entry in `nav-config.tsx` admin nav items. All other admin routes have nav entries. The outreach feature likely represents real admin functionality (managing outreach campaigns) that lost its nav entry. | Add a nav entry in the admin section if the feature is functional; OR confirm it is a stub and remove the page.                                 |
| `/my-events/settings/dashboard` | `hidden_route` | `investigate`  | low        | Client portal route with no client nav link. May be reachable from an in-page button not found in the nav scan. Low confidence because the scan only checked `client-nav.tsx`.                                                 | Check the `/my-events/settings/` page and related client event pages for any `Link` or `href` pointing here.                                    |
| `/discover/[slug]/enhance`      | `hidden_route` | `investigate`  | low        | Public route under the discover section. No public link found. Naming suggests an admin or operator action to enhance a listing.                                                                                               | Check admin-facing tools, OpenClaw-related code, and the discover listing detail page for any link.                                             |
| `/discover/join`                | `hidden_route` | `investigate`  | low        | Under `/(bare)/` route group (minimal chrome). No link found. Naming suggests a join/register landing page.                                                                                                                    | Check marketing materials, email templates, and any external URLs for this path.                                                                |
| `/print/menu/[id]`              | `hidden_route` | `keep`         | high       | A print-optimized view. Functionally it is triggered programmatically (e.g., `window.print()` or a print button that constructs the URL). The absence of a nav link is expected for print views.                               | No deletion needed. Consider adding a search for in-page print triggers to confirm it is wired.                                                 |
| `/chef/cannabis/handbook`       | `hidden_route` | `investigate`  | medium     | Appears to duplicate `/cannabis/handbook` under a different route group. If both exist and render the same content, one is dead.                                                                                               | Check if both pages have the same content/component; if so, one should be removed and any links pointing to the duplicate should be redirected. |
| `/chef/cannabis/rsvps`          | `hidden_route` | `investigate`  | medium     | Same concern as above relative to `/cannabis/rsvps`.                                                                                                                                                                           | Same as above.                                                                                                                                  |

---

### External API Routes (classified for completeness, all are `keep`)

All routes in this section are `keep`. They must not be deleted based on import analysis.

| Route Group                        | Category       | Recommendation | Confidence | Reason                                                                                       |
| ---------------------------------- | -------------- | -------------- | ---------- | -------------------------------------------------------------------------------------------- |
| `/api/cron/*` (14 routes)          | `external_api` | `keep`         | high       | Cron routes with `verifyCronAuth`. Scheduled by external or self-hosted scheduler.           |
| `/api/scheduled/*` (26 routes)     | `external_api` | `keep`         | high       | Same pattern as cron. All use dual GET/POST for scheduler compatibility.                     |
| `/api/gmail/sync`                  | `external_api` | `keep`         | high       | Cron-triggered gmail sync.                                                                   |
| `/api/webhooks/*` (7 routes)       | `external_api` | `keep`         | high       | Incoming webhooks from Stripe, Twilio, Resend, DocuSign, Wix, Instantly.ai.                  |
| `/api/auth/*` OAuth routes         | `external_api` | `keep`         | high       | Auth.js and OAuth callback routes.                                                           |
| `/api/integrations/*`              | `external_api` | `keep`         | high       | OAuth connect and callback flows for DocuSign, QuickBooks, Square, Zapier, social platforms. |
| `/api/kiosk/*`                     | `external_api` | `keep`         | high       | Kiosk device API. Consumed by physical devices.                                              |
| `/api/embed/inquiry`               | `external_api` | `keep`         | high       | Embedded widget endpoint. Consumed from external websites.                                   |
| `/api/sentinel/*`                  | `external_api` | `keep`         | high       | Consumed by OpenClaw Pi.                                                                     |
| `/api/admin/directory/image-queue` | `external_api` | `keep`         | high       | Consumed by OpenClaw Pi for image seeding.                                                   |
| `/api/feeds/calendar/[token]`      | `external_api` | `keep`         | high       | iCal feed for external calendar apps.                                                        |
| `/api/inngest`                     | `external_api` | `keep`         | high       | Inngest task queue receiver.                                                                 |
| `/api/storage/public/[...path]`    | `external_api` | `keep`         | high       | Unauthenticated public file serving.                                                         |

---

### Duplicate Naming Ambiguity

| Items                                             | Category    | Recommendation | Confidence | Reason                                                                                                                                                                 | Required Evidence Before Deletion                                                                              |
| ------------------------------------------------- | ----------- | -------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `components/follow-up/` vs `components/followup/` | `duplicate` | `investigate`  | medium     | Two directories with the same semantic purpose but different names. `follow-up/` appears largely unreferenced (1 file, 0 refs). `followup/` has some referenced files. | Developer confirms the intended canonical directory name and whether `follow-up/` is a leftover from a rename. |

---

## Priority Order for Follow-up

**Highest priority (clear orphans with no value path):**

1. `lib/wine/spoonacular-wine.ts` - clean orphan, no related features in the app
2. `hooks/use-field-validation.ts` and `lib/validation/use-field-validation.ts` - both orphaned, one or both can be removed after developer picks a canonical

**High priority (orphans that need developer intent confirmation):** 3. `components/classes/` (4 files) - server actions exist but no UI routes; determine if classes is a planned feature or dead code 4. `lib/events/fsm.ts` - test-only, likely superseded by `transitions.ts` 5. `components/admin/admin-sidebar.tsx` and `components/admin/admin-preview-toggle.tsx` - isolated orphans with no forward path

**Medium priority (orphans where a parallel active implementation exists):** 6. `components/activity/client-activity-timeline.tsx` - superseded by entity-activity-timeline 7. `components/ai/remy-public-widget.tsx` - superseded by embed widget system 8. `components/sustainability/sourcing-dashboard.tsx` and `sourcing-log.tsx` - lib wired, UI not wired

**Medium priority (hidden routes needing nav or removal decision):** 9. `/admin/outreach` - functional page, missing nav entry 10. `/chef/cannabis/handbook` and `/chef/cannabis/rsvps` - possible route group duplicates

**Lower priority (investigative, may be intentional):** 11. `lib/ai/menu-suggestions.ts` and `lib/ai/privacy-audit.ts` - unclear intent 12. `/my-events/settings/dashboard`, `/discover/[slug]/enhance`, `/discover/join` - limited evidence

---

## Files That Must NOT Be Deleted (Evidence Summary)

| File / Route                                   | Reason                                                                 |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `lib/events/transitions.ts`                    | Active production FSM; not the same as `lib/events/fsm.ts`             |
| All `app/**/page.tsx` files                    | Framework entrypoints by rule                                          |
| All `app/**/route.ts` files                    | Framework entrypoints; external routes cannot be assessed from imports |
| `lib/classes/class-actions.ts`                 | Has 4 inbound references; server actions are wired                     |
| `lib/ai/correspondence.ts`                     | References `ace-ollama.ts`; part of the email correspondence AI chain  |
| `lib/ai/ace-ollama.ts`                         | Referenced by `lib/ai/correspondence.ts`; not an orphan                |
| All cron, scheduled, webhook, and OAuth routes | Externally triggered; invisible to static import analysis              |

---

## What Is Not Covered in This Register

1. **`lib/validation/form-rules.ts` and `lib/validation/schemas.ts`** were not individually import-checked. They should be verified in a follow-on pass.
2. **Full `components/` directory sweep** was partially manual. A programmatic scan tool or second pass would improve coverage over the 140+ component subdirectories not individually checked here.
3. **Dynamic import patterns** beyond the `breadcrumb-tracker` check in the chef layout were not systematically scanned. Any file lazy-loaded via `next/dynamic` or `import()` could appear orphaned in a static grep but be live.
4. **String-based route construction** (e.g., template literals building hrefs from IDs) was not systematically traced. Some routes may be reachable only via constructed URLs.
5. **Backwards compatibility aliases** - some files may be re-exported from index files that were not checked.
