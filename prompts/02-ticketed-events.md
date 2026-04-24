# BUILD: Ticketed Events & Distribution (Phase 1 - Native Tickets)

## Context

ChefFlow is a Next.js + PostgreSQL (Drizzle ORM) + Auth.js v5 + Stripe private chef operations platform. Read `CLAUDE.md` before doing anything. The developer is a private chef who co-hosts farm dinners with venue partners. This is the #1 missing feature for his actual business.

## Problem

Chefs cannot sell tickets/seats to events through ChefFlow. Pop-up dinners, farm-to-table events, and ticketed tastings require external platforms (Eventbrite, etc.). The full spec exists at `docs/specs/ticketed-events-and-distribution.md` - READ IT FULLY before building.

## What to Build (Phase 1 Only - Native Tickets via Stripe)

### 1. Database Schema

- Read existing migration files in `database/migrations/` to understand patterns
- Design tables for: ticket types (per event), ticket purchases, ticket holders
- Each ticket type: name, price_cents, capacity, description, dietary_collection (boolean)
- Each purchase: buyer info, stripe_payment_intent_id, status, dietary_data (JSONB)
- Follow migration safety rules in CLAUDE.md (additive only, show SQL, get approval before running)

### 2. Public Event Page

- Route: `/e/[shareToken]` (public, no auth required)
- Displays: event name, date, location (general area, not exact), description, menu preview, ticket types with prices and remaining capacity
- Ticket purchase form: name, email, phone, guest count, dietary info (if ticket type requires it)
- Stripe Checkout integration for payment
- After purchase: confirmation page with ticket details and "Add to Calendar" link

### 3. Chef Management UI

- Add "Tickets" tab or section to existing event detail page (`app/(chef)/events/[id]/`)
- Configure ticket types: add/edit/remove types, set capacity, set price
- View purchases: list of buyers, dietary info collected, check-in status
- Toggle: enable/disable ticket sales for this event
- Generate shareable link to `/e/[shareToken]`

### 4. Stripe Integration

- Use existing Stripe setup (check `lib/stripe/` or search for `stripe` imports)
- Create Checkout Session per purchase
- Webhook handler for payment confirmation (update purchase status)
- Refund capability from chef management UI

### 5. Capacity Enforcement

- Real-time capacity tracking (prevent overselling)
- Show "X spots remaining" on public page
- Auto-close sales when capacity reached

## Key Files to Read First

- `CLAUDE.md` (mandatory, especially data safety section)
- `docs/specs/ticketed-events-and-distribution.md` (full spec)
- `database/schema/` - existing schema patterns
- `database/migrations/` - migration patterns and latest timestamp
- `lib/stripe/` or search `stripe` - existing Stripe integration
- `app/(chef)/events/[id]/` - existing event detail pages
- `app/(public)/` - existing public page patterns
- `lib/events/` - event server actions

## Rules

- Read CLAUDE.md fully before starting
- No em dashes anywhere
- "OpenClaw" must never appear in any user-facing surface
- All monetary amounts in cents (integer)
- Tenant scoping on every query - tenant_id from session, never request body
- Show migration SQL and get approval before creating migration files
- Test with Playwright / screenshots
- Follow existing UI patterns (read sibling components before writing new ones)
- Stripe webhook must be idempotent
- Non-blocking side effects (emails, notifications) wrapped in try/catch
