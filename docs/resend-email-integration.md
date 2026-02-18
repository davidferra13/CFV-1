# Resend Transactional Email Integration

**Date:** 2026-02-17
**Branch:** `feature/resend-email`
**Status:** Code complete — awaiting API key configuration

---

## What Changed

### New Files (Email Infrastructure)

| File | Purpose |
|------|---------|
| `lib/email/resend-client.ts` | Resend SDK singleton initialization |
| `lib/email/send.ts` | `sendEmail()` — non-blocking, fire-and-forget email dispatch |
| `lib/email/notifications.ts` | Centralized email dispatcher functions for each notification type |
| `lib/email/templates/base-layout.tsx` | Shared email layout (header, footer, CheFlow branding) |
| `lib/email/templates/client-invitation.tsx` | "You're invited to CheFlow" with signup link |
| `lib/email/templates/quote-sent.tsx` | Quote details with pricing summary and CTA |
| `lib/email/templates/event-proposed.tsx` | Event proposal details with CTA |
| `lib/email/templates/payment-confirmation.tsx` | Payment receipt with remaining balance |
| `lib/email/templates/payment-failed.tsx` | Payment failure with retry link |
| `lib/email/templates/event-confirmed.tsx` | Confirmed event details |
| `lib/email/templates/event-completed.tsx` | Thank you + review prompt |
| `lib/email/templates/event-cancelled.tsx` | Cancellation notice |
| `lib/email/templates/event-reminder.tsx` | 24-hour event reminder |

### Modified Files (Integration Points)

| File | What Was Added |
|------|---------------|
| `lib/events/transitions.ts` | Email sends on: proposed, confirmed, completed, cancelled |
| `app/api/webhooks/stripe/route.ts` | Client email on: payment success, payment failure |
| `lib/quotes/actions.ts` | Client email when quote transitions to `sent` |
| `lib/clients/actions.ts` | Invitation email on `inviteClient()` |
| `app/api/scheduled/lifecycle/route.ts` | Event reminder emails for confirmed events happening tomorrow |
| `.env.local.example` | Added `RESEND_API_KEY` and `RESEND_FROM_EMAIL` |
| `.env.local` | Added placeholder Resend env vars |

---

## Design Decisions

### Non-blocking, fire-and-forget
All email sends are wrapped in try/catch. Errors are logged but never thrown. Email failure should never block a business-critical operation (payment processing, event transitions, etc.).

### Graceful degradation
If `RESEND_API_KEY` is not set, `sendEmail()` silently returns `false` and logs a skip message. The app works identically without Resend configured — all existing notification paths (in-app) remain untouched.

### Centralized dispatchers
Instead of embedding template instantiation in each integration point, `lib/email/notifications.ts` provides named functions like `sendPaymentConfirmationEmail()` that handle template creation and data formatting. This keeps the integration points clean (one-liner imports + calls).

### React Email templates
Templates use `@react-email/components` for composable, type-safe email markup. Each template receives strongly-typed props — no raw HTML strings.

### Amounts in cents → formatted display
All amounts pass through as cents (matching the ledger-first model) and are formatted to `$X.XX` display strings only at the template layer via the `formatCents()` helper.

---

## Email Trigger Map

| Trigger | Recipient | Template | Source File |
|---------|-----------|----------|-------------|
| Chef proposes event | Client | `event-proposed` | `lib/events/transitions.ts` |
| Chef confirms event | Client | `event-confirmed` | `lib/events/transitions.ts` |
| Chef completes event | Client | `event-completed` | `lib/events/transitions.ts` |
| Event cancelled | Client | `event-cancelled` | `lib/events/transitions.ts` |
| Payment succeeded | Client | `payment-confirmation` | `app/api/webhooks/stripe/route.ts` |
| Payment failed | Client | `payment-failed` | `app/api/webhooks/stripe/route.ts` |
| Quote sent to client | Client | `quote-sent` | `lib/quotes/actions.ts` |
| Client invited | Client | `client-invitation` | `lib/clients/actions.ts` |
| Event tomorrow | Client | `event-reminder` | `app/api/scheduled/lifecycle/route.ts` |

---

## Configuration Required

1. Sign up at [resend.com](https://resend.com)
2. Get API key → set `RESEND_API_KEY` in `.env.local`
3. Verify `cheflow.us` domain in Resend dashboard (add DNS records)
4. Set `RESEND_FROM_EMAIL=noreply@cheflow.us` (already set)
5. For production on Vercel, add these env vars to the Vercel project settings

---

## Pre-existing Build Issues Found

During this work, we fixed several pre-existing type errors unrelated to Resend:
- `components/reviews/chef-reviews-list.tsx` — Badge variant `"secondary"` → `"default"`
- `lib/clients/actions.ts` — `household` column type mismatch (cast to `any`)
- `lib/connections/actions.ts` — `client_connections` table not in generated types (cast to `any`)
- `lib/events/actions.ts` — `household_id` not in Zod schema (removed reference)
- `app/(chef)/partners/[id]/edit/page.tsx` — partner `.name` not in generated types (cast to `any`)

All 113 pre-existing type errors stem from stale `types/database.ts` that hasn't been regenerated after recent schema changes. Running `supabase gen types` would resolve all of them.

---

## What's Next

- Phase 2: Google Maps / Places (address autocomplete + event location maps)
- Future enhancement: Email delivery tracking (log sends to DB)
- Future enhancement: Email preference toggles (let clients opt out per category)
