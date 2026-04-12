# Session Digest: MemPalace Backlog Execution - Alerts, Billing, Guidance

**Date:** 2026-04-12 (afternoon continuation)
**Agent:** Builder (Claude Sonnet 4.6)
**Commits:** 27b5c1370, 38a42c929, 68bd929f4

---

## What Was Done

### 1. Permit Registry UI (from prior session, finished this session)

- Created `lib/compliance/permit-actions.ts` with full CRUD for the `permits` table
- Created `app/(chef)/settings/compliance/permit-form.tsx` with `PermitList` and `PermitForm` components
- Wired into compliance settings page with expiry alert section
- The `permits` DB table existed but had no UI

### 2. Remy Proactive Alerts (full stack)

- **DB:** Created `database/migrations/20260412000001_remy_alerts.sql` - `remy_alerts` table + two indexes. The engine in `lib/ai/remy-proactive-alerts.ts` was fully built but the table was missing.
- **Cron:** Added `runAlertRulesAdmin(tenantId)` to `remy-proactive-alerts.ts` - admin-client-safe version that bypasses session requirement for cron context
- **Endpoint:** Created `app/api/scheduled/proactive-alerts/route.ts` - GET/POST handler, queries all active tenants (events in last 90 days), runs `runAlertRulesAdmin` for each, records heartbeat
- **Display:** Created `components/dashboard/remy-alerts-widget.tsx` - client component with dismiss (calls `dismissAlert` server action), priority bar (red=urgent, amber=high), action links per alert type
- Wired into `alerts-section.tsx` via `getActiveAlerts(10)` in Promise.all, renders urgent/high alerts at top with `order: -1`

### 3. Payment Failure Recovery

- **Dashboard:** Added payment failure banner to `alerts-section.tsx` - shows when `subscription_status === 'past_due' || 'unpaid'`, links to `/settings/billing` with "Fix now"
- **Billing page:** Added failure banner to `billing-client.tsx` with "Update Payment Method" button that calls `redirectToBillingPortal` server action

### 4. Client Message Form Guidance

- Added inline hints to `components/messages/message-log-form.tsx`:
  - Internal Note channel: amber warning "only visible to you - clients never see these"
  - Other channels: "This is a record for your timeline only - logging it does not send anything"
  - Direction labels: contextual text below the I sent/I received toggle

### 5. Backlog Audit

Audited all "unbuilt features" - most were already built:

- Scheduled message queue: BUILT (`schedule-message-dialog.tsx` + actions)
- Read receipts: BUILT (chat-message-bubble.tsx shows "Read" via `otherParticipantLastReadAt`)
- Pantry/inventory subtraction from shopping lists: BUILT (`generate-grocery-list.ts:354`)
- Bulk platform import (TakeAChef etc): BUILT (`import-take-a-chef-action.ts` + `/import` page)
- Staff portal: BUILT (full `app/(staff)/` with dashboard, tasks, recipes, schedule, station, time)
- Analytics pricing-suggestions occasion matching: BUILT (not a placeholder)

---

## Genuine Remaining Gaps (complex, no quick win)

- **SMS channel** - needs Twilio/SMS provider integration, not started
- **Google Calendar sync** - needs OAuth flow, only internal calendar exists
- **Multi-chef client view** - no spec, not started
- **Quick-service menu board display** - no spec file, not built
- **Location roster + rotation calendar** - no spec file, no matching routes

---

## Key Architectural Notes

- `remy_alerts` table uses `dismissed_at IS NULL` partial index for active alert queries
- `runAlertRulesAdmin` uses `createAdminClient()` directly - safe for cron (no user session needed). Regular `runAlertRules` requires user session via `createServerClient()`
- Payment failure only affects voluntary supporters (all features are free), `past_due` = Stripe retrying, `unpaid` = Stripe gave up
- The `MessageLogForm` is for logging external messages (text, email, DMs) - it never sends anything. Tooltips now make this explicit.

---

## Files Changed

| File                                                   | Change                              |
| ------------------------------------------------------ | ----------------------------------- |
| `lib/compliance/permit-actions.ts`                     | Created                             |
| `app/(chef)/settings/compliance/permit-form.tsx`       | Created                             |
| `app/(chef)/settings/compliance/page.tsx`              | Modified                            |
| `database/migrations/20260412000001_remy_alerts.sql`   | Created                             |
| `lib/ai/remy-proactive-alerts.ts`                      | Modified (added runAlertRulesAdmin) |
| `app/api/scheduled/proactive-alerts/route.ts`          | Created                             |
| `components/dashboard/remy-alerts-widget.tsx`          | Created                             |
| `app/(chef)/dashboard/_sections/alerts-section.tsx`    | Modified                            |
| `app/(chef)/settings/billing/billing-client.tsx`       | Modified                            |
| `components/messages/message-log-form.tsx`             | Modified                            |
| `components/public/public-secondary-entry-cluster.tsx` | Created (prior session)             |
| `lib/public/public-secondary-entry-config.ts`          | Created (prior session)             |
