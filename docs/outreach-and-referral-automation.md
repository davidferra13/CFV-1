# Outreach & Referral Automation

## What Changed

Two related features built to automate client re-engagement and referral requests.

### Feature 1: Recurring Client Outreach Automation

Surfaces at-risk and dormant clients with actionable outreach suggestions.

**Server Actions** (`lib/outreach/recurring-outreach-actions.ts`):

- `getOutreachCandidates()` - Combines at-risk + dormant clients with health scores, LTV, last event date, and suggested outreach messages
- `generateOutreachSuggestions()` - Deterministic template generator (Formula > AI, no Ollama)
- `markOutreachSent()` - Records outreach to prevent spamming the same client
- `getOutreachHistory()` - Retrieves outreach log for a specific client

**Page** (`app/(chef)/clients/outreach/page.tsx`):

- Dashboard with summary cards (total candidates, high/medium urgency, referral eligible)
- Candidates grouped by urgency (high first, then medium, then low)
- Each card shows: name, email, days since last event, LTV, health tier, suggested message preview
- "Send Outreach" and "Mark Called" action buttons per client
- Client-side component for actions: `outreach-actions.tsx`

**Outreach Templates** (deterministic, no AI):

- Seasonal hooks (spring, summer, fall, holiday)
- Personalized by first name, months since last event, health tier
- Dormant (6+ months): personal check-in tone
- At-risk (3-6 months): seasonal menu follow-up tone

### Feature 2: Post-Event Referral Request Sequence

Automatically identifies clients eligible for referral asks after successful events.

**Server Actions** (`lib/outreach/referral-sequence-actions.ts`):

- `triggerPostEventReferralRequest()` - Called as non-blocking side effect when event transitions to 'completed'
- `getReferralRequestTemplate()` - Deterministic referral request message template
- `markReferralRequestSent()` - Tracks referral request sent
- `getClientsEligibleForReferralAsk()` - Lists clients with recent completed events who have not been asked

**Eligibility Rules** (all deterministic):

- Minimum 3 days after event completion before asking
- 60-day cooldown between referral asks per client
- Client must have at least 1 completed event (relationship signal)

### Integration: Event Completion Hook

In `lib/events/transitions.ts`, added non-blocking call to `triggerPostEventReferralRequest()` when events transition to 'completed'. Follows the existing pattern (try/catch, log warning on failure, never blocks the main transition).

### Email Templates

- `lib/email/templates/referral-request.tsx` - Warm referral ask with share button. Uses BaseLayout.
- `lib/email/templates/recurring-outreach.tsx` - Re-engagement email with seasonal hook and booking CTA. Uses BaseLayout.

### Database Migration

`supabase/migrations/20260331000004_outreach_tracking.sql`:

- `client_outreach_log` - Tracks re-engagement outreach (method, date, notes)
- `referral_request_log` - Tracks referral asks (status: pending/sent/clicked/converted)
- Both have RLS policies scoped to chef's tenant
- Indexed on tenant_id + client_id and sent_at

### Navigation

Added "Outreach & Referrals" to the Communication section in `nav-config.tsx`, linking to `/clients/outreach`.

## Design Decisions

- **Formula > AI**: All templates are deterministic. No Ollama dependency. Seasonal hooks use `new Date().getMonth()`.
- **Non-blocking**: Referral trigger in event transitions is wrapped in try/catch. Outreach never blocks core operations.
- **Spam prevention**: Both outreach and referral asks are tracked with timestamps. Cooldown periods prevent over-contacting.
- **Existing infrastructure**: Leverages `getAtRiskClients()`, `getDormantClients()`, `getClientHealthScores()`, and the existing referral system.
