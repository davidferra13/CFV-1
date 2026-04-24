# BUILD: Open Booking Consumer Follow-Through

## Context

ChefFlow is a Next.js + PostgreSQL (Drizzle ORM) + Auth.js v5 private chef operations platform. Read `CLAUDE.md` before doing anything.

## Problem

When a consumer submits the open booking form (`/book`), they enter a black hole. No status page, no follow-up if no chef responds, no communication channel. The consumer has zero visibility into what happened to their request. This is a trust-destroying experience.

Contrast with direct inquiry (to a specific chef): that flow auto-creates a Dinner Circle for communication, tracks referral source, and stores budget in cents. Open booking does none of this.

## What to Build

### 1. Booking Status Page

- After submission, redirect consumer to `/book/status/[bookingToken]` (public, no auth)
- Show: submission timestamp, event details they entered, current status
- Statuses: "Sent to chefs" -> "Chef reviewing" -> "Chef responded" (with link to proposal/quote)
- If no response after 48 hours: show "No chef has responded yet" with option to "Expand search" or "Try a specific chef" (link to chef directory)
- This token should be emailed to the consumer immediately after submission

### 2. Consumer Follow-Up Email

- Send confirmation email immediately on booking submission with the status page link
- If no chef has claimed/responded in 48 hours, send a follow-up email:
  - "We haven't found a match yet. Here are some things you can try:"
  - Link to browse chef profiles
  - Link to submit a direct inquiry to a specific chef
  - Link back to status page
- Use existing email infrastructure (search for `lib/email/` patterns)

### 3. Dinner Circle Auto-Creation

- When a chef claims/responds to an open booking, auto-create a Dinner Circle for that consumer-chef pair
- Follow the same pattern direct inquiry uses (search for where direct inquiry creates circles)
- Consumer gets invited to the circle via the booking status page

### 4. Data Quality Fixes

- **Budget:** Parse `budget_range` string ("elevated", "$50-75/person") into `confirmed_budget_cents` integer. Use a mapping table for known range labels. For custom text, attempt numeric extraction.
- **Guest count:** Store both the range bucket and the midpoint. Display to chef as "18 guests (from 13-25 range)" instead of just "18".
- **Referral attribution:** Add `referral_source` and `referral_partner_id` fields to open booking records, matching direct inquiry's attribution model. Capture UTM params from the URL.

### 5. No-Response Escalation

- Background job (cron or scheduled action): check open bookings older than 48 hours with no chef response
- Send the follow-up email (from step 2)
- After 7 days with no response: send final "We couldn't find a match" email with alternative suggestions
- Check existing cron patterns in `app/api/cron/` or `lib/ai/scheduled/`

## Key Files to Read First

- `CLAUDE.md` (mandatory)
- `app/api/book/route.ts` or search for the open booking submission handler
- `app/(public)/book/` - existing booking pages
- Search for `Dinner Circle` or `hub` creation in inquiry flow - replicate pattern
- `lib/email/` - email sending patterns
- `app/api/cron/` - existing cron job patterns
- `lib/ai/scheduled/job-definitions.ts` - scheduled job registry
- Search for `referral_source` - see how direct inquiry tracks attribution
- Search for `confirmed_budget_cents` - see where budget is used downstream

## Rules

- Read CLAUDE.md fully before starting
- No em dashes anywhere
- Public pages = no auth required, use tokens for access
- All monetary amounts in cents
- Non-blocking side effects (emails) in try/catch
- Show migration SQL before creating migration files
- Test with Playwright / screenshots
- Follow existing patterns for email templates, cron jobs, and public pages
