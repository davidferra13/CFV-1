# BUILD: Monetization Foundation (Voluntary Supporter Model)

## Context

ChefFlow is a Next.js + PostgreSQL (Drizzle ORM) + Auth.js v5 + Stripe private chef operations platform. Read `CLAUDE.md` before doing anything.

IMPORTANT CONTEXT: The developer has decided on a "voluntary supporter" model. All features are FREE. Revenue comes from voluntary contributions only. No paywalls, no Pro tier, no locked features, no Pro badges. Read `memory/project_monetization_shift.md` for full context.

The spec is at `docs/specs/respectful-monetization-foundation.md` (draft status) - READ IT.

## Problem

ChefFlow generates zero revenue. The voluntary supporter model is decided but not implemented. Stripe integration exists (used for client payments to chefs) but there is no mechanism for a chef to support ChefFlow itself.

## What to Build

### 1. Supporter Contribution Page

- Route: `/settings/support` or `/settings/billing` (check which exists)
- Simple, honest page: "ChefFlow is free. If it helps your business, consider supporting its development."
- Contribution options: $5/month, $12/month, $25/month, custom amount
- One-time contribution option alongside monthly
- Stripe Checkout for payment (use existing Stripe setup)
- Show current status: "You're supporting ChefFlow at $12/month since March 2026" or "You're using ChefFlow for free"
- Cancel/change contribution anytime
- NO guilt trips, NO feature degradation, NO "free tier" language

### 2. Stripe Subscription for Contributions

- Create Stripe Products/Prices for supporter tiers (or use dynamic pricing)
- Webhook handler for subscription events (created, updated, cancelled, payment_failed)
- Store supporter status on the chef record (supporter_since, monthly_amount_cents, stripe_subscription_id)
- Schema change: add columns to `chefs` table (show SQL, get approval)

### 3. Supporter Recognition (Subtle)

- Small "Supporter" badge on the chef's own dashboard (visible only to them, not to clients)
- Optional: "Supported by [chef name]" on their public profile (opt-in, off by default)
- NO feature unlocks, NO premium indicators, NO degradation for non-supporters

### 4. Clean Up Legacy Pro/Billing Code

- Search for `requirePro`, `isPaidFeature`, `UpgradeGate`, `UpgradePrompt`, `PRO_FEATURES`
- These exist from a previous Pro tier model that was abandoned
- Do NOT delete them yet (developer code deletion rule) but ensure they degrade gracefully:
  - `requirePro()` should always pass (never redirect)
  - `UpgradeGate` should always show content (never gate)
  - `UpgradePrompt` should never render
- Document what you find in the review

### 5. Thank-You Email

- When a chef starts supporting: send a simple thank-you email
- When a chef cancels: send a graceful "we understand" email with no guilt
- Use existing email patterns in `lib/email/`

## Key Files to Read First

- `CLAUDE.md` (mandatory, especially monetization section)
- `docs/specs/respectful-monetization-foundation.md` (draft spec)
- `memory/project_monetization_shift.md` (decision context)
- `lib/billing/` - existing billing/tier code
- `lib/stripe/` or search for `stripe` - existing Stripe integration
- `app/(chef)/settings/` - settings pages
- `lib/email/templates/` - email template patterns
- Search for `requirePro` - find all Pro gates to neutralize

## Rules

- Read CLAUDE.md fully before starting
- No em dashes anywhere
- All monetary amounts in cents
- Show migration SQL before creating migration files
- Stripe webhook must be idempotent
- Non-blocking side effects in try/catch
- NEVER use words like "upgrade", "unlock", "premium", "Pro tier", or "free tier"
- The language is "support" and "contribute", never "subscribe" or "pay"
- Test with Playwright / screenshots
- No guilt-based UX. No degraded experience. No "you're missing out" copy.
