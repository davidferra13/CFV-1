# Spec: Platform Shell Command Center

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

| Event                 | Date                    | Agent/Session         | Commit |
| --------------------- | ----------------------- | --------------------- | ------ |
| Created               | 2026-04-29 17:23 -04:00 | Codex planner session |        |
| Status: ready         | 2026-04-29 17:23 -04:00 | Codex planner session |        |
| Claimed (in-progress) |                         |                       |        |
| Spike completed       |                         |                       |        |
| Pre-flight passed     |                         |                       |        |
| Build completed       |                         |                       |        |
| Type check passed     |                         |                       |        |
| Build check passed    |                         |                       |        |
| Playwright verified   |                         |                       |        |
| Status: verified      |                         |                       |        |

---

## Developer Notes

### Raw Signal

The developer asked to inventory everything YouTube exposes as a platform in the provided screenshots, then asked to document every finding and keep reporting on details such as how the panels collapse. After reviewing the findings, the developer asked how those patterns could improve ChefFlow, then asked: "Build out an entire building spec please."

### Developer Intent

- **Core goal:** Turn observed platform-shell patterns into a builder-ready ChefFlow spec.
- **Key constraints:** Improve ChefFlow's existing shell instead of replacing it, preserve production data, keep prospecting admin-only, avoid fake data, avoid locked-button monetization, and do not create AI recipe-generation behavior.
- **Motivation:** ChefFlow already has many product modules. The app needs a clearer operating shell so users can understand the platform without drowning in navigation.
- **Success from the developer's perspective:** A builder can open this spec and implement the navigation, create, history, context panel, and responsive collapse upgrades without guessing.

---

## Validation Gate

REQUEST: Platform-shell improvements inspired by external screenshots and developer intent.

EVIDENCE: developer-intent plus visual product pattern analysis. No real-user validation was provided in this chat.

DECISION: plan. This is a spec, not a build instruction to ship a large new surface without validation.

WHY:

- The request is explicit developer direction.
- The proposed work mostly improves existing ChefFlow shell surfaces rather than inventing a new business workflow.
- Any implementation should be staged and measured before broader rollout.

NEXT STEP:

- Build the smallest complete shell upgrade slice first: context panel contract plus event and client detail integration.

---

## Current State Summary

ChefFlow already has the foundation this spec should extend:

- The chef portal layout is server-authenticated with `requireChef()` before rendering children (`app/(chef)/layout.tsx:94`, `app/(chef)/layout.tsx:100`).
- Shell budgeting already decides when desktop sidebar, mobile nav, breadcrumbs, Remy, quick capture, and live alerts render (`app/(chef)/layout.tsx:132`, `app/(chef)/layout.tsx:256`, `app/(chef)/layout.tsx:270`, `app/(chef)/layout.tsx:309`, `app/(chef)/layout.tsx:313`, `app/(chef)/layout.tsx:320`).
- The desktop chef sidebar already supports persisted collapse state, tablet-forced collapse, rail flyouts, progressive disclosure, global search, notifications, recent pages, and show-all-features behavior (`components/navigation/chef-nav.tsx:100`, `components/navigation/chef-nav.tsx:206`, `components/navigation/chef-nav.tsx:687`, `components/navigation/chef-nav.tsx:710`, `components/navigation/chef-nav.tsx:719`, `components/navigation/chef-nav.tsx:780`, `components/navigation/chef-nav.tsx:904`, `components/navigation/chef-nav.tsx:955`, `components/navigation/chef-nav.tsx:1003`, `components/navigation/chef-nav.tsx:1126`, `components/navigation/chef-nav.tsx:1130`).
- The main content offset already tracks sidebar collapse state (`components/navigation/chef-main-content.tsx:24`, `components/navigation/chef-main-content.tsx:31`).
- The action bar already renders a create dropdown in expanded and rail modes (`components/navigation/action-bar.tsx:65`, `components/navigation/action-bar.tsx:68`, `components/navigation/action-bar.tsx:115`).
- The create dropdown already maps to explicit routes instead of no-op buttons (`components/navigation/create-menu-dropdown.tsx:32`, `components/navigation/create-menu-dropdown.tsx:48`), and its source items live in nav config (`components/navigation/nav-config.tsx:1917`).
- Navigation config already encodes core features, mobile tabs, quick create items, and admin-only items (`components/navigation/nav-config.tsx:105`, `components/navigation/nav-config.tsx:137`, `components/navigation/nav-config.tsx:1483`, `components/navigation/nav-config.tsx:1917`).
- Prospecting is correctly marked admin-only in navigation and guarded by `requireAdmin()` on prospecting routes (`components/navigation/nav-config.tsx:1191`, `components/navigation/nav-config.tsx:1194`, `app/(chef)/prospecting/page.tsx:43`).
- Activity history already exists with Summary and Retrace modes, domain filters, actor filters, time range, load more, breadcrumb sessions, and honest partial-unavailable messaging (`app/(chef)/activity/page.tsx:17`, `app/(chef)/activity/page.tsx:24`, `app/(chef)/activity/page.tsx:55`, `app/(chef)/activity/page.tsx:94`, `app/(chef)/activity/activity-page-client.tsx:154`, `app/(chef)/activity/activity-page-client.tsx:235`, `components/activity/activity-filters.tsx:57`, `components/activity/retrace-timeline.tsx:19`).
- Activity server actions authenticate and tenant-scope reads (`lib/activity/chef-actions.ts:31`, `lib/activity/chef-actions.ts:39`, `lib/activity/breadcrumb-actions.ts:29`, `lib/activity/breadcrumb-actions.ts:37`).
- App audit already records the chef sidebar contract, six-domain shortcuts, breadcrumbs, auth gate, tenant scoping, and the activity surface (`docs/app-complete-audit.md:1185`, `docs/app-complete-audit.md:1655`, `docs/app-complete-audit.md:1660`, `docs/app-complete-audit.md:1661`, `docs/app-complete-audit.md:1662`).

---

## What This Does (Plain English)

This upgrades ChefFlow's chef portal into a clearer platform shell: a left navigation system with consistent expanded, rail, and mobile behavior; a universal create menu with role-aware actions; a right-side context command panel for events and clients; and a stronger activity/history surface that mirrors how users actually retrace work. The goal is to make ChefFlow feel like one operating system for chefs, not a pile of pages.

---

## Why It Matters

ChefFlow has enough modules that navigation itself is now a product surface. The highest-value improvement is to make the app's structure obvious while keeping expert power users fast.

---

## Files to Create

| File                                                  | Purpose                                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `components/platform-shell/context-command-panel.tsx` | Shared right-side command panel container for entity pages.                            |
| `components/platform-shell/context-panel-section.tsx` | Reusable section component with loading, empty, error, and populated states.           |
| `components/platform-shell/context-panel-types.ts`    | Type contract for panel sections, actions, status signals, and collapse behavior.      |
| `components/platform-shell/context-panel-toggle.tsx`  | Accessible toggle used on desktop, tablet drawer, and mobile sheet.                    |
| `components/platform-shell/platform-status-chip.tsx`  | Compact status signal that only uses valid `Badge` variants.                           |
| `lib/platform-shell/context-panel-contract.ts`        | Pure contract helpers for route family, entity type, panel defaults, and storage keys. |
| `tests/unit/platform-shell-context-panel.test.tsx`    | Unit coverage for section rendering, status variants, and empty/error states.          |
| `tests/unit/platform-shell-contract.test.ts`          | Unit coverage for route-family keys and storage-key privacy rules.                     |

Do not create database migrations for this spec.

---

## Files to Modify

| File                                             | What to Change                                                                                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/navigation/chef-nav.tsx`             | Tighten rail behavior, tooltips, active state, status density, and show-all-features affordance without changing the route contract.                      |
| `components/navigation/action-bar.tsx`           | Keep `Create` as a first-class control in expanded and rail modes, and align visual states with the updated shell.                                        |
| `components/navigation/create-menu-dropdown.tsx` | Group create actions into Creative, Pipeline, Operational, and Upload sections with keyboard-safe menu behavior.                                          |
| `components/navigation/nav-config.tsx`           | Review labels and grouping only. Preserve existing routes, `adminOnly`, `coreFeature`, mobile tabs, and direct route access.                              |
| `components/navigation/chef-mobile-nav.tsx`      | Add context-panel sheet entry point for route families that support the panel. Preserve existing bottom-tab reliability.                                  |
| `components/navigation/chef-main-content.tsx`    | Add optional right-panel layout slots while preserving current sidebar padding behavior.                                                                  |
| `app/(chef)/layout.tsx`                          | Pass route family or shell affordance flags if needed. Keep `requireChef()` and current shell budget behavior.                                            |
| `app/(chef)/events/[id]/page.tsx`                | First entity integration. Render an event context command panel using already-loaded event, client, payment, prep, and risk state.                        |
| `app/(chef)/clients/[id]/page.tsx`               | Second entity integration. Render a client context command panel using existing client ops snapshot, preferences, event history, and communication state. |
| `app/(chef)/activity/activity-page-client.tsx`   | Add a platform-style filter row and make Summary/Retrace more discoverable without changing data semantics.                                               |
| `docs/USER_MANUAL.md`                            | After implementation, document shell behavior in-place.                                                                                                   |
| `docs/app-complete-audit.md`                     | After implementation, update the chef portal shell and affected event/client/activity entries.                                                            |
| `project-map/chef-os/*`                          | Update relevant product-map files after implementation.                                                                                                   |

---

## Database Changes

None.

### New Tables

```sql
-- None.
```

### New Columns on Existing Tables

```sql
-- None.
```

### Migration Notes

- No migration is allowed for this spec.
- If a builder believes persistence is needed, stop and write a separate additive migration spec first.

---

## Data Model

No new persisted data model.

Client-side panel collapse state may use storage only if it stores non-sensitive route-family keys such as `event`, `client`, or `activity`. Do not store client names, event names, UUIDs, emails, phone numbers, notes, or financial values in localStorage.

Recommended keys:

- `cf:platform-shell:right-panel:event`
- `cf:platform-shell:right-panel:client`
- `cf:platform-shell:right-panel:activity`

Use `sessionStorage` instead of `localStorage` for any state that must be scoped to the current browser session.

---

## Server Actions

No new server actions are required for the first build slice.

| Action                       | Auth                          | Input            | Output                 | Side Effects |
| ---------------------------- | ----------------------------- | ---------------- | ---------------------- | ------------ |
| Existing event page loaders  | Existing `requireChef()` path | Route params     | Existing page data     | None added   |
| Existing client page loaders | Existing `requireChef()` path | Route params     | Existing page data     | None added   |
| Existing activity actions    | `requireChef()`               | Existing filters | Existing activity rows | None added   |

If implementation adds any server action later, it must:

- Start with `requireChef()`, `requireClient()`, or `requireAdmin()`.
- Scope every query by `.eq('tenant_id', user.tenantId!)` or `.eq('chef_id', user.entityId)`.
- Validate input before any DB call.
- Return `{ success, error? }` or a typed record, never `Promise<void>`.
- Revalidate affected paths or tags after mutations.

---

## UI / Component Spec

### Page Layout

Desktop wide layout:

- Left: existing `ChefSidebar`, expanded or rail.
- Center: page content.
- Right: optional `ContextCommandPanel` for supported route families.

Desktop medium layout:

- Left: rail mode if tablet or user-collapsed.
- Center: page content.
- Right: context panel may remain visible only if content remains usable. Otherwise it becomes a drawer.

Tablet:

- Left sidebar is already forced into rail mode by `isTablet` (`components/navigation/chef-nav.tsx:711`, `components/navigation/chef-nav.tsx:719`).
- Context panel becomes a drawer opened from a compact button near the page title or top shell.

Mobile:

- Existing mobile header and bottom tab bar remain primary navigation.
- Context panel opens as a full-height sheet.
- The sheet must trap focus, close on Escape, and expose an accessible close button.

### Left Navigation

Preserve the six primary chef domains documented in the audit:

- Today
- Inbox
- Events
- Clients
- Culinary
- Finance

Expected improvements:

- Collapsed rail uses clear tooltip labels and stable icon hit targets.
- Active route is visible in both expanded and rail mode.
- Rail flyouts remain available for deep routes.
- `Show all features` remains a progressive disclosure control.
- Admin-only nav remains hidden for non-admin users.
- Direct routes remain accessible even if hidden by progressive disclosure.

### Create Menu

The `Create` menu should become the top-level creation entry point, grouped as:

- Creative: New Menu, New Recipe.
- Pipeline: New Event, New Client, New Quote, New Inquiry.
- Operational: Documents, Prep, Calendar Date, Shopping List, Inventory Item.
- Upload: Upload Receipt, Photo Upload, Upload Menu.

Rules:

- Every item must navigate to a real route.
- No empty `onClick`.
- No locked create items. If a paid feature applies, the free path completes first and the upsell appears after.
- Recipe-related entries must never invoke AI recipe generation.

### Right Context Command Panel

The right panel is an entity-specific command center, not a generic sidebar full of decoration.

Event panel sections:

- Event status and next required action.
- Payment state sourced from real event financial data.
- Allergy and dietary risk state.
- Prep readiness.
- Client contact and notes shortcut.
- Documents and print shortcuts.
- Recent event activity.

Client panel sections:

- Client ops snapshot.
- Upcoming events.
- Preferences and allergy flags.
- Payment or balance summary from real data only.
- Last contact and next follow-up.
- Recent client activity.

Activity panel sections:

- Summary/Retrace toggle explanation through layout, not instructional text.
- Filters: actor, domain, time range.
- Recent changed entities.
- Breadcrumb sessions.

State rules for every section:

- Loading: skeleton or compact spinner.
- Empty: honest empty state with next useful action.
- Error: explicit unavailable state.
- Populated: real values only.

Do not render `$0.00`, `0`, empty arrays, or green success states when data failed to load.

### Status Signals

Use small, scannable signals:

- Event FSM status.
- Payment due or blocked.
- Allergy risk.
- Unread client messages.
- Proposal awaiting client.
- Ledger discrepancy.
- Admin-only risk.

Use only valid variants:

- `Badge`: `default`, `success`, `warning`, `error`, `info`.
- `Button`: `primary`, `secondary`, `danger`, `ghost`.

### Activity History

Treat activity history like a platform feature:

- Keep Summary and Retrace.
- Make filters feel like first-class chips or segmented controls.
- Preserve domain counts.
- Preserve load-more.
- Preserve honest partial-unavailable warning.
- Add links from context panels to filtered activity views where possible.

---

## Edge Cases and Error Handling

| Scenario                        | Correct Behavior                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| Event financial summary fails   | Show "Payment status unavailable" style warning, not `$0.00`.                                       |
| Client ops snapshot fails       | Show "Client Ops Snapshot Unavailable" equivalent, not empty success.                               |
| Activity source partially fails | Preserve existing partial-unavailable banner and show loaded sections only.                         |
| User is non-admin               | Hide prospecting and admin-only panel actions.                                                      |
| User collapses left nav         | Persist existing left-nav preference. Do not store sensitive route details.                         |
| Tablet viewport                 | Force left rail and convert right context panel to drawer if the main content would become cramped. |
| Mobile viewport                 | Use existing mobile nav plus context sheet. Do not add a second permanent sidebar.                  |
| AI runtime unavailable          | Do not hide failure. Show system unavailable if an AI-backed panel section is ever added.           |
| Recipe create route             | Navigate only. Do not generate, suggest, draft, or autofill recipes with AI.                        |
| Missing route                   | Hide the action or disable it with a reason. Do not render a fake working link.                     |

---

## Implementation Order

1. Add pure context-panel types and contract helpers.
2. Add context panel components with unit tests for loading, empty, error, populated, and status variants.
3. Modify `ChefMainContent` to accept a right-panel slot or route-family affordance without breaking current padding.
4. Integrate event detail panel first because event state, payment state, prep state, and risks create the richest proof surface.
5. Integrate client detail panel second using the existing Client Ops Snapshot behavior.
6. Refine create dropdown grouping.
7. Refine collapsed rail labels, active states, and tooltips.
8. Refine activity page filter presentation.
9. Update docs and project map.
10. Run focused tests and UI verification.

---

## Verification Steps

Do not start, kill, restart, deploy, or build long-running processes without explicit developer permission.

1. Run focused unit tests for new platform-shell helpers and components.
2. Run TypeScript check if permitted by the active session rules.
3. If a dev server is already running, sign in with the agent account and verify:
   - `/dashboard` still renders with the shell.
   - `/events/[id]` shows the event context panel on desktop.
   - `/clients/[id]` shows the client context panel on desktop.
   - Collapsing the left nav shifts content without overlap.
   - Tablet width forces rail mode.
   - Mobile width shows bottom nav and opens context as a sheet.
   - Non-admin user does not see prospecting actions.
4. Screenshot desktop expanded, desktop collapsed, tablet, and mobile.
5. Verify no console errors from shell interactions.
6. Run compliance scan for em dashes, public forbidden terms, and TypeScript nocheck directives.

---

## Out of Scope

- No database migration.
- No new billing model.
- No redesign of public marketing pages.
- No AI recipe generation.
- No prospecting access change.
- No destructive data operation.
- No production deploy.
- No `types/database.ts` edits.
- No app-wide visual restyle beyond shell and panel behavior.

---

## Notes for Builder Agent

- Treat this as a shell standardization slice. Do not re-platform navigation from scratch.
- Preserve the current server-side auth and tenant scoping model.
- Use existing components where possible.
- Keep all panel sections source-aware. If the source fails, the panel says unavailable.
- Keep route access stable. Hidden from nav does not mean inaccessible if the route is valid and authorized.
- For mobile, preserve the existing hard-navigation bottom-tab guarantee documented in `components/navigation/chef-mobile-nav.tsx:720`.
- After code changes, update `docs/USER_MANUAL.md`, `docs/app-complete-audit.md`, and relevant `project-map/chef-os/*` files.

---

## Spec Validation

1. **What exists today that this touches?** Chef layout, sidebar, mobile nav, create dropdown, activity history, event detail, client detail, and app audit. Evidence: `app/(chef)/layout.tsx:94`, `components/navigation/chef-nav.tsx:687`, `components/navigation/chef-mobile-nav.tsx:379`, `components/navigation/create-menu-dropdown.tsx:32`, `app/(chef)/activity/page.tsx:17`, `app/(chef)/events/[id]/page.tsx:788`, `app/(chef)/clients/[id]/page.tsx:150`, `docs/app-complete-audit.md:1655`.
2. **What exactly changes?** Add platform-shell context panel components and modify navigation, create dropdown, main content, event detail, client detail, and activity presentation. Evidence for target files is listed in Files to Modify.
3. **What assumptions are being made?** Assumption: event and client pages already load enough data for first-pass panels. Partly verified by existing event tenant-scoped queries (`app/(chef)/events/[id]/page.tsx:339`, `app/(chef)/events/[id]/page.tsx:1085`) and client detail auth (`app/(chef)/clients/[id]/page.tsx:150`). Builder must verify exact props before wiring.
4. **Where will this most likely break?** Layout overlap between left rail, main content, and right panel; mobile sheet focus behavior; stale or missing data in panel sections.
5. **What is underspecified?** Exact visual styling is intentionally constrained to existing design patterns. Builder should use current ChefFlow shell styling, not invent a new theme.
6. **What dependencies or prerequisites exist?** No migration. Existing shell, nav config, activity actions, and event/client loaders are prerequisites.
7. **What existing logic could this conflict with?** Shell budget and density behavior (`lib/interface/surface-governance.ts:285`, `lib/interface/surface-governance.ts:324`), sidebar collapse padding (`components/navigation/chef-main-content.tsx:31`), and progressive disclosure (`components/navigation/chef-nav.tsx:780`).
8. **What is the end-to-end data flow?** User opens event or client page, server-authenticated page loads tenant-scoped data, page renders main content and context panel, panel shows real derived states, user clicks real links or existing actions, mutations remain in existing server actions.
9. **What is the correct implementation order?** See Implementation Order.
10. **What are the exact success criteria?** No layout overlap, no no-op actions, real data only, correct admin gating, responsive collapse behavior, focused tests pass, docs updated.
11. **What are the non-negotiable constraints?** Auth first, tenant scoping, no fake data, no invalid UI variants, no prospecting exposure, no AI recipes, no destructive DB work.
12. **What should NOT be touched?** Main branch, production deploys, migrations, `types/database.ts`, unrelated dirty files, billing model, public marketing redesign.
13. **Is this the simplest complete version?** Yes. It uses existing shell infrastructure and adds a reusable right-panel contract instead of rebuilding all navigation.
14. **If implemented exactly as written, what would still be wrong?** It would still be developer-directed rather than externally validated. After the first slice, measure whether chefs actually use the context panel and create menu more effectively.

## Final Check

This spec is production-ready for a staged builder implementation, with one explicit uncertainty: exact event and client panel data props must be verified by the builder in the target pages before wiring. That uncertainty does not block the spec because the first implementation step is a non-persistent component contract and the integrations are scoped to existing authenticated pages.
