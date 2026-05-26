# Exit Evaluation: Admin / QA, Security & System Integrity

> Wave 3 | 8 scenarios | Category 9 from `docs/research/admin-exit-points-analysis.md`
> Mode: Solo (NEEDS-DEVELOPER-REVIEW)
> Date: 2026-05-25

---

## Scenario #65: Run admin route coverage tests

**Original classification:** Permanent
**Reclassified to:** Bridgeable

**Why admin leaves:** The admin needs to verify that every `/admin/*` route loads correctly under auth, catches regressions from new routes or layout changes, and confirms that coverage spec expectations match reality. Running `04-admin-routes.spec.ts` and `10-admin-static-inventory.spec.ts` requires terminal access to execute Playwright.

**Context ChefFlow has:**

- Full route inventory via `lib/interface/route-inventory.ts` (discovers all `page.tsx` files, classifies by role)
- `COVERAGE_SPEC_REGISTRY` maps admin to `tests/coverage/04-admin-routes.spec.ts` and `tests/coverage/10-admin-static-inventory.spec.ts`
- `lib/interface/surface-completeness.ts` can run static-route-coverage and build-surface-integrity checks programmatically
- Route discovery (`discoverPageRouteEntriesInAppDir`) classifies admin routes by scanning `app/(admin)` group

**Data source?** No external API. The source data is the filesystem/codebase itself.
**Client-collaborative angle:** N/A (purely internal admin QA)
**Physical reality:** Screen-based. Terminal output with pass/fail counts.
**Compounding:** Medium. Route inventory is a living artifact; each check validates the accumulating surface area.

**Solution design:**

- Surface latest test run results (pass/fail/skip counts) in `/admin/system` System Health page
- Store last-run timestamp and failing route list from CI or local runs in a lightweight JSON artifact
- Add a "Route Coverage" card showing: total admin routes discovered vs. routes covered by specs
- Link to the full proof-pack output file location for deep investigation

**Where it appears:**

- `/admin/system` System Health page (new "Route Coverage" card)
- `/admin/services` Mission Control (link to latest test artifact)

**What remains as permanent exit:**
Running the tests themselves (Playwright execution), debugging individual test failures, modifying specs

**Priority:** Medium frequency (runs on every meaningful change) x Low effort (read existing artifacts) = High value
**Spec needed?** No (add card to existing System Health page)

---

## Scenario #66: Run security integrity tests

**Original classification:** Permanent
**Reclassified to:** Bridgeable

**Why admin leaves:** The admin needs confirmation that security invariants hold: admin self-promotion prevention (Q56), admin action boundary (Q48), Remy/admin separation (Q57), nav/admin parity (Q52), session/JWT integrity (Q50), prospecting admin gate (Q45), auth boundary integrity (Q81), API surface integrity (Q131), public route auth inventory (Q70), and server action auth completeness (Q87). These are structural code-level tests.

**Context ChefFlow has:**

- `tests/system-integrity/` directory with 15+ spec files covering Q45, Q48, Q50, Q52, Q56, Q57, Q70, Q81, Q87, Q131
- `lib/api/auth-inventory.ts` with `buildApiRouteAuthInventory()` that programmatically audits all API routes for auth guards
- `lib/auth/server-action-inventory.ts` with `buildServerActionAuthInventory()` and `buildServerActionMutationInventory()`
- `lib/interface/surface-completeness.ts` includes `api-auth-inventory`, `server-action-auth-inventory`, and `server-action-mutation-inventory` checks
- Each Q-test is self-documenting with clear pass/fail criteria

**Data source?** No. Tests inspect the codebase structure (static analysis via file reading and pattern matching).
**Client-collaborative angle:** N/A (internal security posture)
**Physical reality:** Screen-based. CI/terminal output.
**Compounding:** High. The security test suite grows with the codebase; each passing test is permanent proof of an invariant.

**Solution design:**

- Add "Security Integrity" section to `/admin/system` showing last-known pass/fail status per Q-number
- Run `buildApiRouteAuthInventory()` live in System Health to show current auth coverage ratio
- Show `protectedRouteRatio` percentage and any `unknownNoStandardAuthRoutes` as warnings
- Display server-action-auth completeness count from `buildServerActionAuthInventory()`
- Flag any question IDs that failed on last run

**Where it appears:**

- `/admin/system` System Health (new "Security Integrity" section)
- Hidden Issues feed (if a security test fails in CI, record as critical hidden issue)

**What remains as permanent exit:**
Running the full test suite, debugging failures, writing new Q-tests, CI pipeline management

**Priority:** High frequency (security posture is always-on concern) x Medium effort (wire existing inventory functions) = High value
**Spec needed?** No (leverage existing `surface-completeness.ts` infrastructure)

---

## Scenario #67: Debug client-side JS error

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why admin leaves:** A user reports a broken page or the admin encounters a JS error. Diagnosing requires browser devtools (console, source maps, component stack traces, React error boundaries). The admin opens devtools to see the actual error, stack trace, and component tree.

**Context ChefFlow has:**

- ErrorBoundary components exist across chef pages (calendar, dashboard, finance, clients, events, quotes, recipes, menus, ingredients, settings/integrations)
- `lib/monitoring/non-blocking.ts` captures server-side failures into `side_effect_failures` table
- `/admin/silent-failures` surfaces non-blocking operation failures with source, operation, severity, entity context
- `lib/observability/request-id.ts` provides correlation IDs via AsyncLocalStorage and `x-request-id` header
- No dedicated client-side error capture pipeline (no Sentry/equivalent pushing JS errors to admin)

**Data source?** No external API. Browser runtime is the source.
**Client-collaborative angle:** N/A (technical debugging)
**Physical reality:** Screen-based. Devtools is the native tool.
**Compounding:** Medium. Repeated errors on same pages compound into pattern knowledge.

**Solution design:**

- Add a lightweight client-side error reporter that POSTs uncaught JS errors to an API route
- Store in `side_effect_failures` with source='client-js', include page URL, user agent, component stack
- Surface client-side errors in `/admin/silent-failures` alongside server-side ones
- Include the `x-request-id` correlation ID when available to link client errors to server requests
- Keep devtools as the deep-dive tool; this captures the 80% of errors users encounter but don't report

**Where it appears:**

- `/admin/silent-failures` Hidden Issues (new 'client-js' source filter)
- Error boundary components (add reporter call on catch)

**What remains as permanent exit:**
Deep debugging with breakpoints, network inspection, React DevTools component tree, source map exploration

**Priority:** Medium frequency (errors happen, but not daily) x Medium effort (new error reporter + API route) = Medium value
**Spec needed?** Yes (client-error-capture spec would define the reporter, API route, and admin surface)

---

## Scenario #68: Inspect network failures

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why admin leaves:** A page fails to load data, an API call times out, or a server action returns 500. The admin opens browser devtools Network tab to see HTTP status codes, response bodies, timing waterfall, and retry behavior.

**Context ChefFlow has:**

- `lib/observability/request-id.ts` assigns correlation IDs to requests via AsyncLocalStorage
- Middleware sets `x-request-id` header for server component/action tracing
- `lib/monitoring/non-blocking.ts` records server-side operation failures with context
- `/admin/silent-failures` shows failures by source/severity
- `lib/monitoring/logger.ts` provides structured logging
- No dedicated request/response logging pipeline visible to admin UI

**Data source?** No. Network activity is runtime observable only via browser tooling or server logs.
**Client-collaborative angle:** N/A (infrastructure debugging)
**Physical reality:** Screen-based. Network waterfall is visual.
**Compounding:** Low. Network failures are usually transient; patterns might compound (e.g., "Stripe webhook always times out").

**Solution design:**

- Add request-id visibility: show correlation ID in admin error states so admin can grep logs
- Surface API route response times and error rates in System Health (aggregate, not per-request)
- Add a "Recent Failures" feed to `/admin/system` showing last N server-action or API-route 500s with request-id, path, duration, and error message
- Keep browser devtools as the deep-dive tool for individual request inspection

**Where it appears:**

- `/admin/system` System Health (new "Request Health" or "API Errors" card)
- Error state components (show request-id for correlation)

**What remains as permanent exit:**
Full network waterfall inspection, individual request/response body analysis, timing breakdown, WebSocket debugging

**Priority:** Medium frequency (500s happen weekly) x Medium effort (aggregate from existing logger) = Medium value
**Spec needed?** No (incremental addition to System Health)

---

## Scenario #69: Compare admin nav against route inventory

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why admin leaves:** The admin wants to confirm that every admin route has a corresponding nav entry (no orphan routes), and every nav entry points to a real route (no dead links). Currently requires inspecting `components/navigation/admin-nav-config.ts` against the filesystem.

**Context ChefFlow has:**

- `components/navigation/admin-nav-config.ts` defines all admin nav groups and links
- `lib/interface/route-inventory.ts` discovers all page routes and classifies by role
- `tests/system-integrity/q52-nav-admin-parity.spec.ts` verifies that adminOnly nav items have matching server guards
- `tests/unit/admin-nav-boundary.test.ts` verifies admin routes are owned by admin nav (not chef nav)
- `tests/unit/runtime-surface-contract.test.ts` validates surface alignment (admin surface uses admin-nav)
- `lib/surfaces/runtime-surface-contract.ts` defines canonical surface contracts
- `lib/interface/surface-completeness.ts` has a `route-policy-alignment` check

**Data source?** No. Both sides are in the codebase.
**Client-collaborative angle:** N/A (internal nav hygiene)
**Physical reality:** Screen-based. A comparison table.
**Compounding:** High. The admin route surface grows over time; parity drift accumulates silently.

**Solution design:**

- Add a "Nav/Route Parity" section to `/admin/system` that runs `discoverPageRouteEntriesInAppDir` filtered to admin role, cross-references against admin-nav-config links
- Show: routes without nav entry (orphans), nav entries without matching route (dead links), total coverage percentage
- This is entirely computable at request time from existing infrastructure
- Optionally cache the result and show last-computed timestamp

**Where it appears:**

- `/admin/system` System Health (new "Admin Nav Parity" card)
- Could also appear in `/admin/services` Mission Control as a developer diagnostic

**What remains as permanent exit:**
Nothing. This can be fully rendered in-app from existing route-inventory and nav-config.

**Priority:** Low frequency (checked during builds) x Low effort (wire existing functions) = Medium value
**Spec needed?** No (straightforward wiring of existing infrastructure)

---

## Scenario #70: Validate API route auth inventory

**Original classification:** Permanent
**Reclassified to:** Reducible

**Why admin leaves:** The admin wants to know which API routes have auth guards, which are intentionally public, and whether any new routes were accidentally left unprotected. Currently requires running Q70 test or manually reading `lib/api/auth-inventory.ts`.

**Context ChefFlow has:**

- `lib/api/auth-inventory.ts` with `buildApiRouteAuthInventory()` returning full classification of every API route
- `API_AUTH_GUARDS` list (requireChef, requireClient, requireAdmin, etc.)
- `API_AUTH_ALTERNATIVE_PATTERNS` (token validation, Twilio, Stripe, etc.)
- `API_NO_STANDARD_AUTH_ALLOWLIST_EXTRAS` (intentionally public routes)
- `tests/system-integrity/q70-public-route-auth-inventory.spec.ts` enforces `MIN_PROTECTED_API_ROUTE_RATIO`
- `lib/interface/surface-completeness.ts` includes `api-auth-inventory` check that can run this programmatically

**Data source?** No. The inventory is computed from codebase files.
**Client-collaborative angle:** N/A (security posture)
**Physical reality:** Screen-based. A table of routes and their classifications.
**Compounding:** High. API surface grows continuously; unprotected routes are the #1 security risk.

**Solution design:**

- Call `buildApiRouteAuthInventory()` from a System Health section and render the results
- Show: total routes, standard-auth count, alternative-auth count, allowlisted-no-auth count, unknown-no-auth count (these are the dangerous ones)
- Highlight any `unknownNoStandardAuthRoutes` in red as immediate action items
- Show `protectedRouteRatio` as a percentage badge
- This is fully computable in-app; no terminal needed

**Where it appears:**

- `/admin/system` System Health (new "API Auth Inventory" section)
- `/admin/silent-failures` (flag unknown-unprotected routes as critical hidden issues)

**What remains as permanent exit:**
Nothing for viewing the inventory. Fixing unprotected routes still requires code changes.

**Priority:** High frequency (checked on every deploy) x Low effort (function already exists) = Very High value
**Spec needed?** No (call existing function, render results)

---

## Scenario #71: Investigate Remy/admin boundary

**Original classification:** Permanent
**Reclassified to:** Bridgeable

**Why admin leaves:** The admin needs to confirm that Remy (chef-facing AI) cannot access admin-only operations. This is a structural security boundary: if Remy's tool registry includes admin actions, a regular chef could use natural language to bypass access controls. Verification currently requires reading test output from Q57 or inspecting `lib/ai/remy-actions.ts` imports.

**Context ChefFlow has:**

- `tests/system-integrity/q57-remy-admin-action-boundary.spec.ts` verifies:
  - Remy actions don't import from `lib/admin/`
  - Remy actions don't call `requireAdmin()`
  - Restricted actions file blocks recipe generation
  - Remy input validation blocks admin-classified intents
  - Remy actions use `requireChef()` not `requireAdmin()`
- `app/(chef)/settings/remy/page.tsx` is gated by `requireAdmin()` (Remy config is admin/founder-only)
- `isFounderEmail()` gates founder-only tools including admin Remy access
- Admin Remy is structurally separate from chef Remy

**Data source?** No. Boundary is enforced by import graph and function call patterns.
**Client-collaborative angle:** N/A (security architecture)
**Physical reality:** Screen-based. Structural proof.
**Compounding:** High. As Remy gains capabilities, boundary enforcement becomes more critical.

**Solution design:**

- Surface Remy/admin boundary status in System Health: "Remy imports 0 admin modules" (computed by scanning imports)
- Show the list of Remy action files and confirm none reference `lib/admin/`
- Display Q57 last-pass status
- Add a "Remy Capability Inventory" showing registered tools and their auth scope
- If founder Remy (admin Remy) exists, show it clearly separated with its own auth boundary

**Where it appears:**

- `/admin/system` System Health (new "AI Boundary" card)
- Remy settings page (boundary status indicator for founder)

**What remains as permanent exit:**
Deep structural verification (reading source code), writing new boundary tests, investigating edge cases where Remy prompt injection might circumvent intent classification

**Priority:** Low frequency (checked on Remy capability additions) x Medium effort (scan imports at runtime) = Medium value
**Spec needed?** No (lightweight diagnostic card)

---

## Scenario #72: Prepare a handoff or queue item for admin gaps

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why admin leaves:** The admin identifies a gap (missing feature, broken flow, security concern) and needs to capture it as a build-queue item, spec, or handoff note. Currently this means editing `docs/UNIFIED-BUILD-QUEUE.md`, writing to `docs/specs/`, or creating issues. Product planning happens in repo/queue artifacts outside the admin UI.

**Context ChefFlow has:**

- `docs/UNIFIED-BUILD-QUEUE.md` as the single source of truth for all build work
- `/admin/feedback` for viewing user-submitted issue reports
- `/admin/silent-failures` for surfacing operational failures
- No in-app mechanism for admin to create build-queue entries or specs
- No link from admin diagnostic surfaces to build-queue intake

**Data source?** No. The build queue is a markdown file in the repo.
**Client-collaborative angle:** N/A (internal product planning)
**Physical reality:** Screen-based. Writing structured notes.
**Compounding:** High. Gap tracking compounds into institutional knowledge about what needs building.

**Solution design:**

- Add a "Flag for Build Queue" action on key admin surfaces (System Health, Hidden Issues, Feedback)
- When triggered, capture: source page, timestamp, admin notes, severity, related entity/route
- Store in a lightweight `admin_gap_flags` table or append to a queue-intake JSON artifact
- Surface pending flags in a new `/admin/queue-intake` page for batch processing into the build queue
- Add templates for common gap types: security concern, missing feature, broken flow, performance issue

**Where it appears:**

- `/admin/system` System Health (flag action on each diagnostic)
- `/admin/silent-failures` Hidden Issues (flag action on each failure)
- `/admin/feedback` (link issue to build queue)
- New `/admin/queue-intake` page for reviewing flagged gaps

**What remains as permanent exit:**
Writing detailed specs, prioritizing across the full queue, assigning to build tiers, creating git issues

**Priority:** High frequency (gaps found constantly during admin work) x Medium effort (new table + intake UI) = High value
**Spec needed?** Yes (admin-gap-intake-system spec defining the flow, storage, and surfaces)

---

## Batch Summary

| #   | Title                                          | Reclassified To     | Spec Needed? |
| --- | ---------------------------------------------- | ------------------- | ------------ |
| 65  | Run admin route coverage tests                 | Bridgeable          | No           |
| 66  | Run security integrity tests                   | Bridgeable          | No           |
| 67  | Debug client-side JS error                     | Partially Reducible | Yes          |
| 68  | Inspect network failures                       | Partially Reducible | No           |
| 69  | Compare admin nav against route inventory      | Reducible           | No           |
| 70  | Validate API route auth inventory              | Reducible           | No           |
| 71  | Investigate Remy/admin boundary                | Bridgeable          | No           |
| 72  | Prepare a handoff or queue item for admin gaps | Bridgeable          | Yes          |

---

## Key Findings

**Strongest existing coverage:**

- Security integrity tests (Q45/Q48/Q50/Q52/Q56/Q57/Q70/Q81/Q87/Q131) are comprehensive and well-structured
- `buildApiRouteAuthInventory()` is production-ready for in-app rendering
- Route inventory infrastructure (`lib/interface/route-inventory.ts`) fully supports nav/route parity checks
- Non-blocking failure capture (`lib/monitoring/non-blocking.ts` + `/admin/silent-failures`) provides a model for other diagnostics

**Biggest gaps:**

- No client-side JS error capture pipeline (server-side only)
- No in-app rendering of security/route test results (all require terminal)
- No admin-to-build-queue intake mechanism
- System Health page exists but lacks security/route/API inventory cards

**Pattern:** Most scenarios in this category are "data already exists programmatically but has no admin UI surface." The fix is rendering existing functions (`buildApiRouteAuthInventory`, `discoverPageRouteEntriesInAppDir`, surface-completeness checks) inside System Health cards. Low effort, high value.

---

_All scenarios marked NEEDS-DEVELOPER-REVIEW (solo mode)._
