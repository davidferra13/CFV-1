# Client Portal Regression Report

## Test context

- Codebase: current local branch state in `CFv1`
- Data model: seeded E2E fixtures (chef + client + cross-tenant records)
- Validation paths used:
  - Existing client suite (`tests/e2e/14-client-portal.spec.ts`)
  - New cross-portal suite:
    - `tests/e2e/chef_client_golden_path.spec.ts`
    - `tests/e2e/client_rls_negative.spec.ts`

## Smoke checklist (client-facing)

### Route and flow sweep

- `/my-events` list load: PASS
- `/my-events/[id]` detail load: PASS
- `/my-events/[id]/proposal`: PASS
- `/my-events/[id]/pay` gating from accepted state: PASS
- `/my-events/[id]/invoice`: PASS
- `/my-events/[id]/approve-menu`: PASS (request-bound route)
- `/my-events/[id]/contract`: PASS
- `/my-quotes` list: PASS
- `/my-quotes/[id]` detail and response actions: FAIL before fix, PASS after fix
- `/my-inquiries` and `/my-inquiries/[id]`: PASS
- `/my-profile`, `/my-rewards`, `/my-spending`: PASS
- `/my-chat` and `/my-chat/[id]`: PASS
- Document endpoints checked in E2E:
  - `/api/documents/foh-menu/[eventId]`: PASS for owned event
  - Cross-tenant access attempts: BLOCKED (expected)

## Findings

## 1) Critical: quote accept/reject could silently fail for clients

- Severity: Critical
- Affected surface:
  - `app/(client)/my-quotes/[id]/quote-response-buttons.tsx`
  - `lib/quotes/client-actions.ts` (`acceptQuote`, `rejectQuote`)
- Repro (pre-fix):
  1. Seed a client-owned quote in `status='sent'`.
  2. Open `/my-quotes/[quoteId]`.
  3. Click `Accept Quote` (or `Decline`).
  4. Observe UI navigation without guaranteed backend state transition.
  5. Check DB row: status could remain `sent`.
- Failing query/component:
  - Query in `acceptQuote` / `rejectQuote`:
    - `supabase.from('quotes').update(...).eq('id', quoteId).eq('client_id', user.entityId).eq('status', 'sent').select('id').maybeSingle()`
  - Returned `null` row without explicit throw in prior behavior.
- Evidence snippet seen during regression:
  - `Failed to accept quote: no rows updated`
- Suspected root cause:
  - Missing/insufficient client `UPDATE` RLS policy for quote response transition.
  - App logic treated "zero rows updated" as success instead of hard failure.
  - Admin fallback path previously used an auth context that did not reliably bypass client-session RLS.
- Fix implemented:
  - Added explicit row-update checks in `acceptQuote` and `rejectQuote`.
  - Switched fallback/admin operations in this path to true service-role client (`createAdminClient`).
  - Added migration:
    - `supabase/migrations/20260328000007_client_quote_response_update_policy.sql`
    - Policy allows client-owned quote updates `sent -> accepted|rejected`.
- Post-fix verification:
  - Golden path test confirms:
    - quote transitions to `accepted`
    - `accepted_at` set
    - `snapshot_frozen=true`
    - chef sees accepted quote in `/quotes/accepted`

## 2) Medium: stale E2E assumptions in client portal smoke tests

- Severity: Medium (test reliability risk; not a production runtime bug)
- Affected surface:
  - `tests/e2e/14-client-portal.spec.ts`
- Repro (pre-fix):
  1. Run client E2E with current seeded data.
  2. Tests expecting static route ownership/labels fail when seed ownership changed.
- Root cause:
  - Tests assumed specific completed-event ownership and brittle selector strings.
- Fix implemented:
  - Updated tests to use seeded IDs and role-based heading/button locators.
  - Added explicit draft-hidden assertion.
- Post-fix verification:
  - Client suite passes with current seed contract.

## 3) Low: transient SSR 500s under E2E navigation bursts

- Severity: Low (intermittent)
- Affected surface:
  - Observed occasionally during route navigation in golden-path test execution.
- Repro:
  1. Rapid navigation across quote/event pages under test load.
  2. Occasional "Internal Server Error" render on first load.
- Mitigation implemented:
  - Added explicit retry helper in golden-path harness for transient 500 page loads.
- Note:
  - This mitigation hardens CI signals; underlying intermittent server condition should still be monitored separately.

## Changes made to resolve regressions

- Application fix:
  - `lib/quotes/client-actions.ts`
- DB policy fix:
  - `supabase/migrations/20260328000007_client_quote_response_update_policy.sql`
- Cross-portal harness:
  - `tests/e2e/chef_client_golden_path.spec.ts`
  - `tests/e2e/client_rls_negative.spec.ts`
  - `playwright.config.ts` (`cross-portal` project)
  - `package.json` (`test:e2e:cross-portal`)
- Existing client suite stabilization:
  - `tests/e2e/14-client-portal.spec.ts`

## Post-fix verification summary

- `npm run test:e2e:cross-portal`: PASS
- Golden contract assertions now continuously prove:
  - clients do not see draft quotes
  - client accepts sent quote and backend state updates
  - chef portal reflects client action
  - client FOH menu PDF access works for owned event
  - cross-tenant isolation and RLS negative checks hold
