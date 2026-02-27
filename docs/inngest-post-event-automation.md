# Inngest Post-Event Automation

> **Status:** Implemented (2026-02-26)
> **Branch:** `feature/risk-gap-closure`

## Overview

Inngest is a background job engine wired into ChefFlow for post-event follow-up automation. When a chef marks an event as "completed," three delayed emails are automatically queued:

| Email          | Delay   | Purpose                                    |
| -------------- | ------- | ------------------------------------------ |
| Thank-you      | 3 days  | Warm personal thank-you, invites rebooking |
| Review request | 7 days  | Asks the client to leave a review          |
| Referral ask   | 14 days | Encourages word-of-mouth referrals         |

**Free tier:** 25,000 runs/month (more than enough for early-stage usage).

## Architecture

```
Event completed (transitions.ts)
  |
  v
inngest.send('chefflow/event.completed', { eventId, tenantId, clientId, ... })
  |
  v
Inngest Cloud (manages scheduling + retries)
  |
  +-- after 3 days  --> POST /api/inngest --> postEventThankYou
  +-- after 7 days  --> POST /api/inngest --> postEventReviewRequest
  +-- after 14 days --> POST /api/inngest --> postEventReferralAsk
  |
  v
Each job: lookup event/client from DB --> check guards --> send email via Resend
```

## File Locations

| What                    | Where                                                       |
| ----------------------- | ----------------------------------------------------------- |
| Inngest client          | `lib/jobs/inngest-client.ts`                                |
| Job functions (3 jobs)  | `lib/jobs/post-event-jobs.ts`                               |
| API route (webhook)     | `app/api/inngest/route.ts`                                  |
| Trigger point           | `lib/events/transitions.ts` (at end of `transitionEvent()`) |
| Thank-you template      | `lib/email/templates/post-event-thank-you.tsx`              |
| Review request template | `lib/email/templates/post-event-review-request.tsx`         |
| Referral ask template   | `lib/email/templates/post-event-referral-ask.tsx`           |
| Email dispatchers       | `lib/email/notifications.ts` (3 new functions at bottom)    |
| Middleware bypass       | `middleware.ts` (`/api/inngest` added to bypass list)       |
| Env var example         | `.env.local.example`                                        |

## Environment Variables

Both are obtained from the [Inngest dashboard](https://app.inngest.com):

| Variable              | Purpose                                                         |
| --------------------- | --------------------------------------------------------------- |
| `INNGEST_EVENT_KEY`   | Authenticates `inngest.send()` calls from this app              |
| `INNGEST_SIGNING_KEY` | Validates that webhook calls to `/api/inngest` are from Inngest |

**If neither is set:** The Inngest client initializes but `send()` effectively no-ops. The app runs normally without delayed emails. No errors, no crashes.

**For local development:** Run `npx inngest-cli@latest dev` to start the Inngest Dev Server at `http://localhost:8288`. It intercepts events locally without needing cloud keys.

## Guards (Skip Conditions)

Each job checks these conditions before sending. If any fail, the job skips gracefully:

1. **Event still exists** in the database
2. **Event was not cancelled** after completion (status check)
3. **Client exists** and has an email address
4. **Client has not opted out** of marketing (`marketing_unsubscribed = false`)

## Non-Blocking Design

- The `inngest.send()` call in `transitions.ts` is wrapped in `try/catch` — if Inngest is down or misconfigured, the event transition still succeeds.
- Each job function has `retries: 2` — Inngest automatically retries on transient failures.
- Email sending uses the existing `sendEmail()` utility which is itself non-blocking (logs errors, never throws).

## How to Test

### Local Development (Inngest Dev Server)

1. Install the CLI: `npm i -g inngest-cli` (or use `npx inngest-cli@latest dev`)
2. Start the dev server: `npx inngest-cli@latest dev`
3. Start your Next.js app: `npm run dev`
4. The Inngest Dev Server auto-discovers functions at `/api/inngest`
5. Complete an event in the app — watch the Inngest Dev UI at `http://localhost:8288`
6. You can manually fast-forward sleep timers in the dev UI

### Production

1. Set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in your environment
2. Deploy the app
3. In Inngest dashboard, sync your app: add `https://app.cheflowhq.com/api/inngest`
4. Complete an event — the three follow-up emails will fire on schedule

## Extending

To add more post-event jobs:

1. Add a new `inngest.createFunction()` in `lib/jobs/post-event-jobs.ts`
2. Register it in `app/api/inngest/route.ts` (add to the `functions` array)
3. It will automatically trigger on the same `chefflow/event.completed` event

To add jobs for other lifecycle events (e.g., post-inquiry, post-booking):

1. Define a new event type in `lib/jobs/inngest-client.ts`
2. Add `inngest.send()` at the appropriate trigger point
3. Create new job functions that listen for the new event
