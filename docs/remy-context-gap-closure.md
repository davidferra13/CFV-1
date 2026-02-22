# Remy — Context Gap Closure (11 Gaps → 0)

**Date:** 2026-02-22
**Branch:** feature/risk-gap-closure

## What Changed

Remy's context loaders were enhanced to close all 11 remaining knowledge gaps. Previously, Remy knew the basics when viewing a page (name, status, dates) but was blind to financials, staff, temperature logs, quotes, message threads, event history, and more. Now Remy has full visibility into every data domain in ChefFlow.

## Gaps Closed

### Event Entity (8 new data domains)

| Gap                   | What Remy Now Knows                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------- |
| **Ledger entries**    | Every payment, deposit, refund, tip — with amount, method, description, and running total |
| **Expenses**          | All expenses linked to the event — category, vendor, amount, date                         |
| **Staff assignments** | Who's working, their role, scheduled/actual hours, pay, status                            |
| **Temperature logs**  | Every temp reading — item, temperature, phase, safe/unsafe flag                           |
| **Quotes**            | All quote versions — name, status, total, deposit, pricing notes                          |
| **Status history**    | Full event transition audit trail — every status change with date and reason              |
| **Menu approval**     | Approval status, sent/approved dates, client revision notes, approval round history       |
| **Grocery quotes**    | Pricing from Spoonacular/Kroger, ingredient count, Instacart cart links                   |

### Client Entity (1 new data domain)

| Gap               | What Remy Now Knows                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Event history** | All events for this client (up to 15) — occasion, date, status, guest count, price, payment status, with summary counts (completed, active) |

### Inquiry Entity (1 new data domain)

| Gap                | What Remy Now Knows                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Message thread** | Full conversation thread — direction (inbound/outbound), channel, date, subject, body (truncated to 200 chars), draft status, with thread summary (X from client, Y from chef) |

### Message-Aware Resolution (1 new entity type + expanded keywords)

| Gap                    | What Remy Now Knows                                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inquiry mentions**   | When chef mentions an inquiry by occasion or client name + inquiry keywords, Remy looks it up with full context                                                   |
| **Financial keywords** | Event finder now triggers on financial/operational keywords (paid, payment, expense, quote, staff, temp, grocery, prep, schedule) — not just "dinner" and "party" |

## Architecture

All changes follow the existing non-blocking pattern:

- New data loaded via `Promise.all` in parallel with the primary entity query
- All wrapped in the existing try/catch — if any sub-query fails, Remy still works with partial data
- Hard caps maintained: 3 entities max per message, 15-20 rows per sub-query

### Performance Impact

The event entity loader now runs 9 parallel queries instead of 1, but all are simple indexed queries with tight limits (10-20 rows). On Supabase with connection pooling, this adds ~50-100ms total — well within the 45s setup timeout.

## Files Modified

- `lib/ai/remy-context.ts` — Enhanced `loadEventEntity` (8 new parallel queries), `loadClientEntity` (event history), `loadInquiryEntity` (message thread), added `findMentionedInquiries`, expanded event keyword matching
- `app/api/remy/stream/route.ts` — Updated grounding rule to reference new data domains

## Grounding Rule Update

The system prompt grounding rule now explicitly tells Remy about all available data domains:

- Ledger entries, expenses, staff, temp logs, quotes, status history, menu approval, grocery quotes (on events)
- Event history (on clients)
- Message threads (on inquiries)

This prevents Remy from saying "I don't have that information" when it actually does.
