# Quote & Finance Terminology Cleanup

**Date:** 2026-03-09
**Branch:** feature/risk-gap-closure

## Problem

Minor jargon spots in the quote/finance UI. "Adjusted service subtotal" is accounting jargon clients don't understand. Invoice page descriptions used system language ("Past event date, unresolved"). "Pricing quotes" was redundant (quotes ARE pricing).

## Approach

Audited all 120+ user-visible strings across quotes, proposals, invoices, payments, and financial overview pages against the glossary. Most terminology was already clean. Fixed the spots where system/accounting language leaked through.

## Changes

### Invoice View (invoice-view.tsx)

| Old                       | New                      | Why                           |
| ------------------------- | ------------------------ | ----------------------------- |
| Adjusted service subtotal | Subtotal after discounts | Plain language, client-facing |

### Invoice Page (finance/invoices/page.tsx)

| Old                                     | New                                                         | Why                              |
| --------------------------------------- | ----------------------------------------------------------- | -------------------------------- |
| "Past event date, unresolved"           | "Event happened, still unpaid"                              | Chef language                    |
| "Events with refund entries"            | "Refunds issued"                                            | Simpler                          |
| "Event invoices organized by status..." | "Every event gets an invoice. Here's where they all stand." | Conversational, not system-speak |
| "Total events / invoices"               | "Total events"                                              | Simpler                          |
| "Paid invoice value"                    | "Total collected"                                           | More meaningful                  |

### Quote Pages

| Where                     | Old                                    | New                            |
| ------------------------- | -------------------------------------- | ------------------------------ |
| Chef quotes subtitle      | "Create and track pricing quotes"      | "Create and track quotes"      |
| Client my-quotes subtitle | "Review and respond to pricing quotes" | "Review and respond to quotes" |

## What Was NOT Changed (and Why)

- **"Proposal" in proposals section**: Proposals (visual documents with templates/add-ons) are distinct from Quotes (pricing). Both terms are correct.
- **"Proposal" in client-facing event pages**: Clients receive proposals from their chef. This is how clients think about it.
- **Financial overview labels**: "Total Revenue Collected", "Outstanding Balances", etc. are all plain business language chefs understand.
- **Payment page descriptions**: Already clean ("Deposit payments received", "Payments refunded to clients").
- **Invoice statuses**: "Draft", "Sent", "Paid", "Overdue", "Refunded", "Cancelled" are all clear.
- **Quote statuses**: "Draft", "Sent", "Viewed", "Accepted", "Rejected", "Expired" are all clear.

## No Database Changes

All changes are UI-only string replacements.

## Files Changed

- `components/events/invoice-view.tsx`
- `app/(chef)/finance/invoices/page.tsx`
- `app/(chef)/quotes/page.tsx`
- `app/(client)/my-quotes/page.tsx`
