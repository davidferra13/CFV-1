# Remy — 15 New AI Capabilities Batch

**Date:** 2026-02-22
**Branch:** `feature/risk-gap-closure`
**Commit:** `095a8ce`

---

## What Was Built

15 new AI capabilities across 3 categories: on-demand Remy commands (8), reactive handlers (1), and scheduled jobs (4). Items 14-15 (Cert Expiry Check, Food Cost Alert) were already fully implemented — no work needed.

---

## On-Demand Commands (8 new — via Remy chat)

These are interactive: the chef asks Remy something, Remy executes immediately.

| #   | Task Type                 | Name                     | LLM Required?   | File                              |
| --- | ------------------------- | ------------------------ | --------------- | --------------------------------- |
| 1   | `ops.portion_calc`        | Portion Calculator       | No (pure math)  | `lib/ai/operations-actions.ts`    |
| 2   | `analytics.break_even`    | Break-Even Analysis      | No (pure math)  | `lib/ai/analytics-actions.ts`     |
| 3   | `analytics.client_ltv`    | Client Lifetime Value    | No (pure math)  | `lib/ai/analytics-actions.ts`     |
| 4   | `ops.packing_list`        | Packing List Generator   | No (template)   | `lib/ai/operations-actions.ts`    |
| 5   | `client.event_recap`      | Event Recap              | No (DB query)   | `lib/ai/client-facing-actions.ts` |
| 6   | `client.menu_explanation` | Menu Explanation         | No (DB query)   | `lib/ai/client-facing-actions.ts` |
| 7   | `analytics.recipe_cost`   | Recipe Cost Optimization | Yes (Ollama)    | `lib/ai/analytics-actions.ts`     |
| 8   | `ops.cross_contamination` | Cross-Contamination Risk | No (rule-based) | `lib/ai/operations-actions.ts`    |

**Key design decision:** 7 of 8 commands work WITHOUT Ollama (pure math, templates, or DB queries). Only Recipe Cost Optimization needs Ollama, and it gracefully falls back. This means the chef gets these capabilities even when Ollama is offline.

### Wiring per command (full pipeline):

1. Task description in `lib/ai/command-task-descriptions.ts`
2. Classifier example in `lib/ai/remy-classifier.ts`
3. Executor function + switch case in `lib/ai/command-orchestrator.ts`
4. Result summarizer in `app/api/remy/stream/route.ts`

---

## Reactive Handler (1 new)

| Task Type                  | Name                   | Trigger                                          | LLM?         |
| -------------------------- | ---------------------- | ------------------------------------------------ | ------------ |
| `reactive.payment_overdue` | Payment Reminder Draft | Scheduled scanner finds events >7d in "accepted" | Yes (Ollama) |

**Handler location:** `lib/ai/reactive/handlers.ts`
**Hook:** `onPaymentOverdue()` in `lib/ai/reactive/hooks.ts`
**Pattern:** Calculates outstanding balance from ledger (charges - payments), then asks Ollama to draft a friendly reminder. Tier 2 (draft — chef reviews before sending).

---

## Scheduled Jobs (4 new)

| Task Type                           | Name                     | Interval | LLM?          | Runs on PC?  |
| ----------------------------------- | ------------------------ | -------- | ------------- | ------------ |
| `scheduled.stale_inquiry_scanner`   | Stale Inquiry Scanner    | 6 hours  | No (SQL scan) | Yes          |
| `scheduled.payment_overdue_scanner` | Payment Overdue Scanner  | 1 day    | No (SQL scan) | Yes          |
| `scheduled.social_post_draft`       | Social Post Draft        | 1 week   | Yes (Ollama)  | No (Pi only) |
| `scheduled.client_sentiment`        | Client Sentiment Monitor | 1 week   | Yes (Ollama)  | No (Pi only) |

**Handler location:** `lib/ai/scheduled/jobs.ts`
**Registry:** `lib/ai/queue/registry.ts`
**Scheduler:** `lib/ai/scheduled/scheduler.ts`

### How the scanners work:

- **Stale Inquiry Scanner** finds inquiries >48h in "new" or "awaiting_chef" status. For each, it enqueues a `reactive.inquiry_stale` task which drafts a follow-up email via Ollama.
- **Payment Overdue Scanner** finds events in "accepted" status with `updated_at` >7 days ago. For each, it enqueues a `reactive.payment_overdue` task which drafts a friendly payment reminder.

Both scanners are pure SQL — no LLM needed. They run on PC. The reactive tasks they enqueue DO need Ollama for drafting.

### Social Post Draft:

- Loads recent completed events + upcoming events
- Asks Ollama for 2-3 social media post ideas (Instagram/Facebook/LinkedIn)
- Never mentions client names (privacy)
- Returns structured posts with captions, hashtags, and post types

### Client Sentiment Monitor:

- Aggregates 30-day signals: message count, completion rate, cancellation rate
- If messages exist and Ollama is running, performs light sentiment scan
- Returns overall sentiment (positive/neutral/negative/mixed) + highlights + concerns
- Falls back to data-only report if Ollama is offline

---

## Files Modified

| File                                  | Changes                                    |
| ------------------------------------- | ------------------------------------------ |
| `lib/ai/operations-actions.ts`        | **NEW** — 3 on-demand functions            |
| `lib/ai/analytics-actions.ts`         | **NEW** — 3 on-demand functions            |
| `lib/ai/client-facing-actions.ts`     | **NEW** — 2 on-demand functions            |
| `lib/ai/command-task-descriptions.ts` | +8 task descriptions                       |
| `lib/ai/command-orchestrator.ts`      | +8 executors, imports, switch cases        |
| `lib/ai/remy-classifier.ts`           | +12 classifier examples                    |
| `app/api/remy/stream/route.ts`        | +8 result summarizers                      |
| `lib/ai/reactive/handlers.ts`         | +1 handler (payment_overdue)               |
| `lib/ai/reactive/hooks.ts`            | +1 hook (onPaymentOverdue)                 |
| `lib/ai/scheduled/jobs.ts`            | +4 job handlers                            |
| `lib/ai/scheduled/scheduler.ts`       | +4 scheduler entries                       |
| `lib/ai/queue/registry.ts`            | +5 registrations (1 reactive, 4 scheduled) |

---

## Testing

To test the on-demand commands, open Remy and try:

- "Scale my risotto recipe for 30 guests"
- "Break-even analysis for the Henderson dinner"
- "What's Sarah's lifetime value?"
- "Generate a packing list for Saturday's event"
- "Recap the Thompson anniversary dinner"
- "Explain the tasting menu"
- "Optimize costs for my lobster bisque"
- "Check cross-contamination risks for the Miller dinner"

The scheduled jobs will run automatically when the queue worker starts and seeds tasks.
