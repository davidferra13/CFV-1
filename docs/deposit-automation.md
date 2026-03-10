# Deposit Automation System

## Overview

Automated deposit collection that sends a deposit request to the client immediately after a quote is accepted, if that quote has `deposit_required = true` and `deposit_amount_cents > 0`.

## How It Works

1. Client accepts a quote via the client portal (`acceptQuote()` in `lib/quotes/client-actions.ts`)
2. If the quote requires a deposit, the system calls `triggerDepositRequestOnAcceptance()` as a non-blocking side effect
3. The trigger sends:
   - An email to the client with event details, deposit amount, and a link to the payment page
   - An in-app notification visible in the client's notification bell
   - An activity log entry for the chef's activity feed

## Files

| File                                        | Purpose                                           |
| ------------------------------------------- | ------------------------------------------------- |
| `lib/finance/deposit-automation-actions.ts` | Core server actions: query, send, automate        |
| `lib/email/templates/deposit-request.tsx`   | Email template for deposit requests               |
| `lib/quotes/client-actions.ts`              | Hook point (acceptQuote triggers deposit request) |
| `lib/notifications/types.ts`                | Added `deposit_request_sent` notification action  |

## Server Actions

### `getEventsAwaitingDeposit()`

Chef-facing. Returns all events where the quote was accepted with a deposit required but no deposit ledger entry exists yet.

### `sendDepositRequest(eventId)`

Chef-facing. Manually send a deposit request for a specific event. Validates that the event has an accepted quote with a required deposit and no existing deposit payment.

### `checkAndSendDepositRequests(tenantId?)`

Automation entry point. Scans all events for a tenant and sends deposit requests where needed. Respects the `default_deposit_enabled` automation setting. Can be called by cron or manually.

### `triggerDepositRequestOnAcceptance(tenantId, quoteId)`

Internal (admin client). Called automatically when a quote is accepted. Fires the deposit request email and notification without requiring chef authentication.

## Payment Flow

The deposit request email links to `/my-events/[id]/pay`, which is the existing client portal payment page. No new payment page was needed.

## Automation Settings

The `checkAndSendDepositRequests` function respects the `default_deposit_enabled` setting in `chef_automation_settings`. The `triggerDepositRequestOnAcceptance` function fires unconditionally on quote acceptance (if deposit is required) since the chef explicitly configured the deposit on the quote.

## Error Handling

All side effects (email, notification, activity log) are wrapped in try/catch and logged as non-blocking. The main quote acceptance flow is never interrupted by deposit automation failures.
