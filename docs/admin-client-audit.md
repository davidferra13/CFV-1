# Admin Client (`createServerClient({ admin: true })`) Audit

Generated: 2026-03-15
Scope: Every callsite using `createServerClient({ admin: true })` or `createAdminClient()`.

## Summary

184+ callsites use service-role access. Most fall into a handful of justified patterns.
The primary risk is not tenant-ID trust from user input (none found), but the sheer
volume of service-role usage in code that could use a user-scoped client instead.

## Justified Patterns (keep as-is)

### 1. Cron / Scheduled Jobs (no user session available)

All `app/api/scheduled/*/route.ts` handlers run from Vercel Cron with no user session.
Service-role access is required. These are all gated by CRON_SECRET.

Files:

- `app/api/scheduled/follow-ups/route.ts`
- `app/api/scheduled/lifecycle/route.ts`
- `app/api/scheduled/activity-cleanup/route.ts`
- `app/api/scheduled/automations/route.ts`
- `app/api/scheduled/call-reminders/route.ts`
- `app/api/scheduled/campaigns/route.ts`
- `app/api/scheduled/copilot/route.ts`
- `app/api/scheduled/email-history-scan/route.ts`
- `app/api/scheduled/loyalty-expiry/route.ts`
- `app/api/scheduled/monitor/route.ts`
- `app/api/scheduled/push-cleanup/route.ts`
- `app/api/scheduled/revenue-goals/route.ts`
- `app/api/scheduled/reviews-sync/route.ts`
- `app/api/scheduled/sequences/route.ts`
- `app/api/scheduled/social-publish/route.ts`
- `app/api/scheduled/waitlist-sweep/route.ts`
- `app/api/scheduled/wix-process/route.ts`
- `app/api/gmail/sync/route.ts`

### 2. Webhook Handlers (external caller, no user session)

Stripe, Wix, and generic provider webhooks verify signatures, not sessions.

Files:

- `app/api/webhooks/stripe/route.ts` (3 callsites)
- `app/api/webhooks/wix/route.ts`
- `app/api/webhooks/[provider]/route.ts`

### 3. Auth / Signup Flows (user does not exist yet)

Creating auth users and assigning roles requires admin access.

Files:

- `lib/auth/actions.ts` (signUpChef, signUpClient, isAdmin)
- `lib/auth/invitations.ts` (markInvitationUsed)

### 4. Public Intake (no session by design)

Public inquiry forms, embed forms, share pages.

Files:

- `lib/inquiries/public-actions.ts`
- `lib/sharing/actions.ts` (4 callsites - share token lookups, RSVP)
- `lib/clients/actions.ts` (createClientFromLead - automated pipeline)

### 5. Cross-Tenant Reads (chef network, referrals)

Chef-to-chef lookups that need to read across tenant boundaries.
All still call `requireChef()` for auth; admin is for bypassing RLS.

Files:

- `lib/network/actions.ts` (14 callsites)
- `lib/partners/actions.ts` (3 callsites)
- `app/(chef)/network/page.tsx`
- `app/(chef)/network/channels/[slug]/page.tsx`

### 6. Notification / Activity Infrastructure

These run in the context of a server action after auth, but need admin
to write to tables the current user may not have RLS INSERT on.

Files:

- `lib/notifications/actions.ts` (3 callsites)
- `lib/notifications/client-actions.ts`
- `lib/notifications/channel-router.ts`
- `lib/notifications/resolve-preferences.ts`
- `lib/activity/track.ts`
- `lib/activity/log-chef.ts`
- `lib/activity/intent-notifications.ts` (3 callsites)

### 7. Automation / Pipeline Engine (runs from cron context)

Files:

- `lib/automations/engine.ts`
- `lib/automations/action-handlers.ts` (3 callsites)
- `lib/automations/settings-actions.ts`
- `lib/communication/pipeline.ts` (8 callsites)
- `lib/communication/actions.ts` (12 callsites)
- `lib/copilot/orchestrator.ts` (2 callsites)
- `lib/integrations/core/pipeline.ts` (4 callsites)

## Candidates for Downgrade (use user-scoped client instead)

### HIGH PRIORITY - Server actions that already call requireChef()

These functions authenticate the user, derive tenantId from session, but then
create an admin client anyway. They should use the user-scoped client unless
there is a specific RLS reason.

Files to review:

- `lib/social/chef-social-actions.ts` (30+ callsites) - Most of these call
  `requireChef()` but use admin client. Likely because social tables lack
  RLS policies for the authenticated role. Fix: add RLS policies, then
  downgrade to user-scoped client.
- `lib/chef/profile-actions.ts` line 196 - Uses `as any` cast too.
- `lib/events/readiness.ts` (2 callsites) - Called from cron AND server actions.
  Split the cron path from the user path.

### MEDIUM PRIORITY - Mixed cron/action callers

- `lib/events/time-reminders.ts` - Called from cron context, justified.
- `lib/events/transitions.ts` line 316 - Admin used for cross-table writes
  during state transition. May be justified by trigger requirements.
- `lib/events/offline-payment-actions.ts` - Admin for ledger writes.
- `lib/events/financial-summary-actions.ts` line 319 - Admin for summary view.
- `lib/cancellation/refund-actions.ts` (2 callsites) - Admin for Stripe refund flow.

### LOW PRIORITY - External service integration

- `lib/gmail/sync.ts`, `lib/gmail/historical-scan.ts`, `lib/gmail/google-auth.ts`
- `lib/wix/process.ts`
- `lib/social/oauth-actions.ts`
- `lib/reviews/external-sync.ts` (2 callsites)
- `lib/loyalty/auto-award.ts` (2 callsites) - Triggered by webhook/cron.
- `lib/loyalty/redemption-actions.ts` (2 callsites)
- `lib/loyalty/gift-card-purchase-actions.ts` (2 callsites)

## Standalone Admin Client (`createAdminClient()`)

Only one file defines it: `lib/database/admin.ts`.

Importers: `tests/helpers/e2e-seed.ts` (test-only). No production code imports
`createAdminClient()` directly; all production usage goes through
`createServerClient({ admin: true })`.

## Tenant ID Trust Assessment

**No callsite was found that trusts `input.tenantId` from a request body.**

All server actions that accept data from users derive `tenantId` from:

- `requireChef()` returning `user.tenantId`
- `requireClient()` returning `user.tenantId`
- Database lookups (e.g., looking up chef by email/slug)
- Cron iterating over DB records (using the record's own `tenant_id`)

`createClientFromLead(tenantId, ...)` accepts tenantId as a parameter, but all
callers pass it from trusted sources (session or DB records), never from user input.

## Recommendations

1. Add RLS policies for social tables so `chef-social-actions.ts` can use
   user-scoped client (largest single reduction in admin usage).
2. Split `lib/events/readiness.ts` into cron vs. user-action paths.
3. Consider a `createPrivilegedClient(reason: string)` wrapper that logs
   the reason for admin access, making future audits easier.
