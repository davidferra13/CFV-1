# GOLDMINE Phase 3: Risk-Gap Closure — Auto-Fill Intelligence Everywhere

**Date:** 2026-03-02
**Branch:** `feature/risk-gap-closure`

## What Changed

Phase 3 wires GOLDMINE intelligence into every screen. Data now flows automatically from email ingestion through the entire platform — no manual scoring, no Ollama dependency, no data left on the floor.

### Change 1: Set `chef_likelihood` + `follow_up_due_at` on inquiry creation

**File:** `lib/gmail/sync.ts` (4 insert paths)

All 4 inquiry-creation handlers now auto-set:

- `chef_likelihood` = hot/warm/cold (from GOLDMINE lead tier)
- `follow_up_due_at` = now + 4h/24h/72h (from GOLDMINE response time analysis)

Handlers updated: `handleInquiry`, `handleTacNewInquiry`, `handleGenericNewLead`, `handleYhangryNewInquiry`.

The Yhangry handler was also missing lead scoring entirely — now computes it.

### Change 2: Inquiry list reads stored GOLDMINE scores

**Files:** `app/(chef)/inquiries/page.tsx`, `components/inquiries/lead-score-badge.tsx`

Replaced `scoreInquiry()` (from `lib/leads/scoring.ts` — crude formula base 50) with reading stored GOLDMINE scores from `unknown_fields` JSONB. Falls back to `scoreInquiryFields()` for pre-GOLDMINE inquiries.

The badge component now shows score/100 with tier color and factors tooltip.

### Change 3: Inquiry detail shows stored GOLDMINE score

**File:** `app/(chef)/inquiries/[id]/page.tsx`

Replaced `<LeadScoreBadge inquiryId={...} />` (from `components/ai/lead-score-badge.tsx` — Ollama on-demand) with reading the stored score from `unknown_fields`. No Ollama dependency. Instant display.

### Change 4: GOLDMINE pricing benchmarks module

**File:** `lib/inquiries/goldmine-pricing-benchmarks.ts` (NEW)

Hardcoded benchmarks from conversion-intelligence.json (20 pricing data points, 49 threads):

- Guest buckets: 1-2, 3-6, 7-12, 13+
- Overall: avg $420.50/event, median $300, avg $191/person, median $150/person
- Pure lookup — no file I/O, no Ollama, no network calls

### Change 5: Quote form shows pricing benchmarks

**Files:** `app/(chef)/quotes/new/page.tsx`, `components/quotes/quote-form.tsx`, `components/analytics/pricing-suggestion-panel.tsx`

When creating a quote from an inquiry with a guest count, and the chef has no pricing history (< 3 accepted quotes), the GOLDMINE benchmark appears as a subtle hint: "Similar intimate dinners: ~$600 total ($300/person) based on 5 past bookings".

The chef's own pricing history always takes priority when available.

### Change 6: Remy gets lead intelligence context

**File:** `lib/ai/remy-context.ts` (`loadInquiryEntity()`)

When viewing an inquiry, Remy now sees:

```
LEAD INTELLIGENCE:
Lead Score: 73/100 (HOT)
Score Factors: Specific date (+12), Budget mentioned (+8), Location (+8)
Response Coaching: This is a HOT lead — prioritize. Respond within 4-24 hours for best conversion.
```

Remy can now answer "should I respond to this inquiry?" with data-driven advice.

### Change 7: Thread-level extraction (every email enriches the inquiry)

**File:** `lib/gmail/sync.ts` (`handleExistingThread()`)

Previously only the first inquiry email was extracted. Now every email in a thread runs through `extractAndScoreEmail()`. New data fills in null `confirmed_*` fields without overwriting existing data. Lead score updates if the tier improves.

This means: a client who sends "dinner for 4 on March 15" initially, then follows up with "budget is $800, one guest is vegan" — the inquiry automatically captures the budget, date, and dietary info from the follow-up.

## Data Flow (After Phase 3)

```
Email arrives
  → Gmail sync: extract fields + score (deterministic, instant)
  → Inquiry created with: confirmed_* fields, chef_likelihood, follow_up_due_at, lead score
  → Thread replies: extract new fields, update inquiry, improve score
  → Inquiry list: shows GOLDMINE score + tier badge (from stored data)
  → Inquiry detail: shows score immediately (no Ollama)
  → Remy: knows score + tier + factors, coaches response timing
  → Quote form: shows GOLDMINE pricing benchmarks (when no chef history)
  → Event creation: convertInquiryToEvent() maps confirmed_* fields (existing)
```

## What Was Replaced

| Before                                                  | After                                                      | Why                                                           |
| ------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| `lib/leads/scoring.ts` (crude formula)                  | Stored GOLDMINE scores from `unknown_fields`               | Data-driven weights from 49 real threads vs arbitrary base 50 |
| `components/ai/lead-score-badge.tsx` (Ollama on-demand) | `components/inquiries/lead-score-badge.tsx` (stored score) | Instant, works offline, Formula > AI                          |
| No pricing benchmarks                                   | `goldmine-pricing-benchmarks.ts`                           | New chefs get data-driven pricing hints from day 1            |
| Remy had no lead intelligence                           | GOLDMINE context in `loadInquiryEntity()`                  | Remy can now coach response timing                            |
| Only first email extracted                              | Every thread email extracts                                | No data left on the floor                                     |

## Verification

- `npx tsc --noEmit --skipLibCheck` — zero app errors (only pre-existing `scripts/` issues)
- No migrations needed — all data flows through existing columns
- No Ollama dependency — everything is deterministic
