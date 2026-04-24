# BUILD: Safety & Trust Hardening

## Context

ChefFlow is a Next.js + PostgreSQL (Drizzle ORM) + Auth.js v5 private chef operations platform. Read `CLAUDE.md` before doing anything.

## Problem

Multiple safety and trust gaps exist across public-facing surfaces. These aren't features - they're holes that erode trust and create liability.

## What to Fix

### 1. Anti-Spam Parity Across All Public Forms

Current state is inconsistent:

- Open booking (`/book`): honeypot + rate limit + Turnstile
- Direct inquiry (`/chef/[slug]/inquire`): honeypot + rate limit
- Ticket purchase: rate limit only
- Gift card purchase: unknown
- Embed inquiry: unknown
- Kiosk inquiry: unknown

**Task:** Audit every public form submission endpoint. Ensure ALL have at minimum: honeypot field + server-side rate limiting. Document what each has. Add missing protections.

Search for: `app/api/book/`, `app/api/embed/`, `app/api/kiosk/`, and any other `route.ts` files that accept public POST requests without auth.

### 2. Token Expiry Consistency

Current state:

- Tip tokens: expire via `expires_at` column
- Feedback tokens: JWT with expiry
- Review tokens: NEVER expire
- Worksheet tokens: NEVER expire
- Share tokens: NEVER expire

**Task:** Add `expires_at` to review and worksheet tokens. Set reasonable defaults (review: 90 days post-event, worksheet: 30 days post-event). Expired tokens show a friendly "This link has expired. Contact your chef for a new one." page instead of a 404 or broken page.

### 3. Public Remy Abuse Logging

- Chef-facing Remy logs violations. Public Remy (`/api/remy/public` or similar) has guardrails but no audit trail.
- **Task:** Add a lightweight abuse log: IP, timestamp, blocked prompt, reason. Simple table or append-only log file. No need for a dashboard - just make it queryable.

### 4. Staff Event Notifications

- When an event transitions state (confirmed, cancelled, etc.), the chef gets notified but assigned staff members get nothing.
- **Task:** Find the event transition notification logic (search for event state machine or `event_transitions`). When an event transitions to `confirmed`, `in_progress`, or `cancelled`, send notifications to all staff members assigned to that event.
- Use existing notification patterns. Non-blocking (try/catch).

### 5. Dietary/Allergy Consent Verification

- **Task:** Audit every public form that collects dietary/allergy information. Ensure each has explicit consent text: "Dietary information is shared with your chef to ensure food safety. By submitting, you confirm this information is accurate."
- Check: `/book`, `/chef/[slug]/inquire`, ticket purchase, RSVP, embed inquiry, kiosk inquiry
- Add consent checkbox where missing. This is a GDPR Article 9 concern (health data).

## Key Files to Read First

- `CLAUDE.md` (mandatory)
- `app/api/` - all API route handlers
- `app/(public)/` - all public pages
- Search for `honeypot` - find existing anti-spam patterns
- Search for `rateLimit` or `rate-limit` - find existing rate limiting
- Search for `event_transitions` - find state machine notification logic
- `lib/email/notifications.ts` - notification patterns
- Search for `dietary` or `allergy` in public form components

## Rules

- Read CLAUDE.md fully before starting
- No em dashes anywhere
- Show migration SQL before creating migration files
- Non-blocking side effects in try/catch
- Rate limiting must be server-side (never trust client)
- Consent text must be visible without scrolling near the submit button
- Test with Playwright / screenshots
- Do NOT add auth gates to public pages - they must remain public
