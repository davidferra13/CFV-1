# Account Deletion Lifecycle

## Overview

ChefFlow uses a **3-phase soft-delete architecture** for account deletion, compliant with the Terms of Service (30-day grace period) and accounting regulations (7-year financial record retention).

## Three Phases

### Phase 1: Soft Delete (Immediate)

When a chef requests account deletion:

1. Pre-deletion checks verify no blockers exist (active events, outstanding payments, active retainers, active subscription)
2. Password is verified for identity confirmation
3. `deletion_requested_at`, `deletion_scheduled_for` (now + 30 days), and `deletion_reactivation_token` are set on the chef row
4. Auth user is **NOT banned** — chef keeps full access during the grace period
5. Audit entry is created in `account_deletion_audit`
6. A deletion pending banner appears across the chef portal

### Phase 2: Grace Period (30 days)

- Chef has **full access** to the app — can log in, view data, export data, wrap up business
- A red banner shows on every page with the countdown and links to cancel or export
- Chef can cancel deletion from Settings > Delete Account or via the reactivation link (`/reactivate-account?token=...`)
- Cancellation clears all deletion columns and removes the banner

### Phase 3: Final Purge (after 30 days)

The daily cron job (`/api/cron/account-purge`) finds accounts past their grace period and runs:

1. **Anonymize financial records** — `anonymize_financial_records()` DB function strips PII from ledger entries, events, and clients while preserving amounts, dates, and entry types for 7-year retention
2. **Clean storage buckets** — removes all files from Supabase Storage for the chef's tenant
3. **Mark chef as deleted** — sets `is_deleted = true`, redacts remaining PII on the chef row
4. **Delete auth user** — triggers CASCADE on remaining non-financial tables
5. **Log audit entries** — each step is logged to `account_deletion_audit`

## Key Files

| File                                                                | Purpose                                        |
| ------------------------------------------------------------------- | ---------------------------------------------- |
| `lib/compliance/account-deletion-actions.ts`                        | Server actions: request, cancel, status, purge |
| `lib/compliance/pre-deletion-checks.ts`                             | Pre-deletion validation                        |
| `lib/compliance/storage-cleanup.ts`                                 | Storage bucket file cleanup                    |
| `lib/compliance/data-export.ts`                                     | Comprehensive data export (GDPR)               |
| `app/(chef)/settings/delete-account/page.tsx`                       | Delete account page                            |
| `components/settings/delete-account-form.tsx`                       | Form with checklist, export, confirmation      |
| `components/settings/pre-deletion-checklist.tsx`                    | Pre-deletion blocker display                   |
| `app/(public)/reactivate-account/page.tsx`                          | Public reactivation page                       |
| `app/api/cron/account-purge/route.ts`                               | Daily cron for final purge                     |
| `supabase/migrations/20260326000011_account_deletion_lifecycle.sql` | Migration                                      |

## Database Changes

### Columns added to `chefs`

- `deletion_requested_at` — when deletion was requested
- `deletion_scheduled_for` — when purge will execute (30 days after request)
- `deletion_reason` — optional reason the chef chose
- `deletion_reactivation_token` — UUID token for cancellation
- `is_deleted` — true after purge completes

### New table: `account_deletion_audit`

Permanent audit trail for the deletion lifecycle. Not FK-linked to `chefs` so records survive deletion.

### New function: `anonymize_financial_records(p_chef_id UUID)`

SECURITY DEFINER function that temporarily disables ledger immutability triggers to anonymize PII while preserving financial amounts.

## Pre-Deletion Blockers

The following must be resolved before deletion can proceed:

1. **Active events** — events not in `completed` or `cancelled` status
2. **Outstanding payments** — events with unpaid balances
3. **Active retainers** — retainers with `active` status
4. **Active subscription** — SaaS subscription via Stripe

## Data Retention

| Data Category                              | Retention Period      | Treatment                                         |
| ------------------------------------------ | --------------------- | ------------------------------------------------- |
| Financial records (ledger, events, quotes) | 7 years               | Anonymized — amounts/dates kept, PII stripped     |
| Client records                             | 7 years               | Anonymized — names replaced, contact info deleted |
| Chef profile                               | 7 years (row kept)    | Anonymized — marked as "Deleted Account"          |
| All other data                             | Deleted after 30 days | Cascade delete via DB constraints                 |
| Storage files                              | Deleted after 30 days | Removed from all Supabase Storage buckets         |

## Tier

Free — account deletion is core account management and a legal requirement (GDPR right to erasure).
