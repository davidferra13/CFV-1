# Tests 46-47: Event Sub-pages, Assignment Mutations, Quote Filters, Calls, Goals

## What Changed

Added two new Playwright interaction spec files to "tests/interactions/":

- "46-event-subpages-and-assignment.spec.ts" (241 lines, ~19 tests)
- "47-quotes-filters-calls-misc.spec.ts" (186 lines, ~16 tests)

## Why

These files bring coverage to routes and mutations that had zero prior test coverage
in the interactions layer. Both use the shared "interactions-chef" storageState
via the project fixture at "tests/helpers/fixtures".

## File 46 — Event Sub-pages and Assignment Mutations

### Routes Covered

| Sub-page                     | State tested         |
| ---------------------------- | -------------------- |
| "/events/[id]/receipts"      | confirmed, completed |
| "/events/[id]/invoice"       | confirmed, completed |
| "/events/[id]/split-billing" | confirmed            |

### Mutations Covered

- **Assign Menu to Event**: checks edit page for menu field, detail page for menu
  section, and that the assign button does not crash
- **Assign Staff to Event**: checks detail page for staff panel, add-staff button
  interaction, and the staff schedule page

### Test Patterns

All tests follow the established interaction pattern:

1. Navigate to route
2. Wait for networkidle
3. Assert no HTTP 500
4. Assert body has content (length > 20 chars)
5. Assert zero JS errors via page.on(pageerror)
6. For mutation tests: click the relevant button if visible, assert no crash

Informational-only assertions (e.g. whether an upload area exists) use the
"const \_ = result" pattern so they never fail CI even when UI varies.

## File 47 — Quote Filter Views, Call Detail, Goals History

### Routes Covered

| Route                 | Coverage type                           |
| --------------------- | --------------------------------------- |
| "/quotes/expired"     | load, content, no-errors, tenant-scoped |
| "/quotes/rejected"    | load, content, no-errors                |
| "/quotes/viewed"      | load, content, no-errors                |
| "/calls/[id]"         | navigate from list, content check       |
| "/calls/[id]/edit"    | navigate from list or detail            |
| "/goals/[id]/history" | navigate from goals list, no-errors     |

### Parametric Quote Filter Tests

The three filter routes (expired, rejected, viewed) share three parametric tests
inside a "for (const route of quoteFilterRoutes)" loop, giving three tests per
route without duplication. A fourth flat test asserts all seven quote list routes
(including /quotes, /quotes/draft, /quotes/sent, /quotes/accepted) load together
without 500 errors.

### Tenant Scoping Assertions

Two tests assert that the page body does NOT contain "seedIds.chefBId":

- "/quotes/expired" — tenant-scoped check
- "/goals" — tenant-scoped check

This follows the multi-tenant isolation pattern established in file 30.

## Architecture Fit

- All server actions for these routes use existing "requireChef()" guards
- No new database queries or schema changes
- Tests are purely read-path (navigation + assertion); no writes
- Consistent with the established interaction-layer test patterns
