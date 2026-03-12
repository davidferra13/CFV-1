# GOLDMINE Phase 3: Risk-Gap Closure — Auto-Fill Intelligence Everywhere

**Date:** 2026-03-02
**Branch:** `feature/risk-gap-closure`
**Commits:** `199c80d3` (Phase 3), plus prior commits on same branch for Phases 1-2

---

## GOLDMINE Timeline

| Phase       | What                                                                                                                                                                                                                           | Commits                            | Key Outcome                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | -------------------------------------------------------------------- |
| **Phase 1** | Email analysis pipeline — parsed 49 real Gmail threads, built deterministic extractors (date, guests, budget, dietary, cannabis, location, referral), email classifier, platform parsers (TakeAChef, Yhangry, Thumbtack, Bark) | `2485be4b`, `f5040c14`, `758c83ff` | Raw extraction + classification from any email                       |
| **Phase 2** | Conversion intelligence — analyzed all 49 threads for conversion patterns, built lead scoring formula (0-100), wired extractors + scoring into live Gmail sync pipeline                                                        | `328e19e7`, `dbc8764d`             | Every new inquiry gets instant extraction + score at ingestion       |
| **Phase 3** | Risk-gap closure — propagated intelligence to every screen (inquiry list, detail, quote form, Remy AI), added thread-level extraction, pricing benchmarks                                                                      | `199c80d3`                         | Zero manual data entry from email to event. Intelligence everywhere. |

---

## What Changed (Phase 3)

Phase 3 wires GOLDMINE intelligence into every screen. Data now flows automatically from email ingestion through the entire platform — no manual scoring, no Ollama dependency, no data left on the floor.

### Change 1: Set `chef_likelihood` + `follow_up_due_at` on inquiry creation

**File:** `lib/gmail/sync.ts` (4 insert paths)

All 4 inquiry-creation handlers now auto-set:

- `chef_likelihood` = hot/warm/cold (from GOLDMINE lead tier)
- `follow_up_due_at` = now + 4h/24h/72h (from GOLDMINE response time analysis)

| Handler                     | What it handles           | What was added                                                                            |
| --------------------------- | ------------------------- | ----------------------------------------------------------------------------------------- |
| `handleInquiry()`           | Direct email inquiries    | `chef_likelihood`, `follow_up_due_at` from `leadScore`                                    |
| `handleTacNewInquiry()`     | TakeAChef platform emails | `chef_likelihood`, `follow_up_due_at` from `tacLeadScore`                                 |
| `handleGenericNewLead()`    | Thumbtack, Bark, etc.     | `chef_likelihood`, `follow_up_due_at` from `platformLeadScore`                            |
| `handleYhangryNewInquiry()` | Yhangry platform emails   | Lead scoring computation (was completely missing) + `chef_likelihood`, `follow_up_due_at` |

**Follow-up timing (from GOLDMINE response time analysis):**

- Hot leads: 4 hours (4-24h = 100% conversion sweet spot)
- Warm leads: 24 hours
- Cold leads: 72 hours

### Change 2: Inquiry list reads stored GOLDMINE scores

**Files:** `app/(chef)/inquiries/page.tsx`, `components/inquiries/lead-score-badge.tsx`

Replaced `scoreInquiry()` (from `lib/leads/scoring.ts` — crude formula base 50) with reading stored GOLDMINE scores from `unknown_fields` JSONB. Falls back to `scoreInquiryFields()` for pre-GOLDMINE inquiries.

The badge component now shows score/100 with tier color and factors tooltip.

**What was replaced:**

- Import: `scoreInquiry, type LeadScore` from `lib/leads/scoring` → `scoreInquiryFields, type LeadScoreData` from `lib/gmail/extract-inquiry-fields`
- Scoring loop: async `scoreInquiry()` per inquiry → synchronous read from `unknown_fields` JSONB
- Badge: `LeadScore` type (label/score/factors) → `LeadScoreData` type (lead_score/lead_tier/lead_score_factors)

### Change 3: Inquiry detail shows stored GOLDMINE score

**File:** `app/(chef)/inquiries/[id]/page.tsx`

Replaced `<LeadScoreBadge inquiryId={...} />` (from `components/ai/lead-score-badge.tsx` — Ollama on-demand) with reading the stored score from `unknown_fields`. No Ollama dependency. Instant display.

**What was replaced:**

- Import: `LeadScoreBadge` from `components/ai/lead-score-badge` → `LeadScoreBadge` from `components/inquiries/lead-score-badge`
- Rendering: lazy Ollama call on click → immediate display from stored data
- Fallback: `scoreInquiryFields()` for pre-GOLDMINE inquiries

### Change 4: GOLDMINE pricing benchmarks module

**File:** `lib/inquiries/goldmine-pricing-benchmarks.ts` (NEW)

Hardcoded benchmarks from conversion-intelligence.json (20 pricing data points, 49 threads):

| Guest Bucket | Avg Total   | Median Total | Per Person      | Sample Size |
| ------------ | ----------- | ------------ | --------------- | ----------- |
| 1-2 guests   | $520        | $600         | $300/person     | 5           |
| 3-6 guests   | $160        | $160         | $53/person      | 1           |
| 7-12 guests  | $1,075      | $1,075       | $133/person     | 2           |
| 13+ guests   | $100        | $100         | $100/person     | 1           |
| **Overall**  | **$420.50** | **$300**     | **$191/person** | **20**      |

Pure lookup — no file I/O, no Ollama, no network calls. Buckets with < 2 samples fall back to overall averages.

**Exports:**

- `getGoldminePricingBenchmark(guestCount)` → full benchmark object
- `formatBenchmarkSuggestion(guestCount)` → human-readable string for UI

### Change 5: Quote form shows pricing benchmarks

**Files:** `app/(chef)/quotes/new/page.tsx`, `components/quotes/quote-form.tsx`, `components/analytics/pricing-suggestion-panel.tsx`

When creating a quote from an inquiry with a guest count, and the chef has no pricing history (< 3 accepted quotes), the GOLDMINE benchmark appears as a subtle hint: "Similar intimate dinners: ~$600 total ($300/person) based on 5 past bookings".

The chef's own pricing history always takes priority when available.

**Prop flow:**

```
page.tsx: formatBenchmarkSuggestion(guestCount) → benchmarkHint string
  → QuoteForm: benchmarkHint prop (new)
    → PricingSuggestionPanel: benchmarkHint prop (new)
      → Renders hint text when suggestion is insufficient_data or null
```

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

**How it works:** Reads `unknown_fields` JSONB (same as inquiry list/detail). Only fires when `unknown_fields` is an object with `lead_score` — compatible with old array-format `unknown_fields` on pre-GOLDMINE inquiries.

### Change 7: Thread-level extraction (every email enriches the inquiry)

**File:** `lib/gmail/sync.ts` (`handleExistingThread()`)

Previously only the first inquiry email was extracted. Now every email in a thread runs through `extractAndScoreEmail()`. New data fills in null `confirmed_*` fields without overwriting existing data. Lead score updates if the tier improves.

This means: a client who sends "dinner for 4 on March 15" initially, then follows up with "budget is $800, one guest is vegan" — the inquiry automatically captures the budget, date, and dietary info from the follow-up.

**Fields updated (only when currently null):**

- `confirmed_date`, `confirmed_guest_count`, `confirmed_budget_cents`
- `confirmed_location`, `confirmed_occasion`
- `confirmed_dietary_restrictions`, `confirmed_cannabis_preference`
- `unknown_fields` (lead score always updates)
- `chef_likelihood` (only upgrades — warm→hot, cold→warm)

---

## Complete File Manifest

| File                                                | Action | Lines Changed | What Changed                                                                                                                             |
| --------------------------------------------------- | ------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/gmail/sync.ts`                                 | MODIFY | +138          | 4 insert paths get `chef_likelihood` + `follow_up_due_at`; Yhangry gets lead scoring; `handleExistingThread()` extracts from every reply |
| `app/(chef)/inquiries/page.tsx`                     | MODIFY | +37/-37       | Read stored GOLDMINE scores from `unknown_fields` instead of computing crude scores                                                      |
| `components/inquiries/lead-score-badge.tsx`         | MODIFY | +20/-20       | Rewritten for `LeadScoreData` type with score/tier/factors                                                                               |
| `app/(chef)/inquiries/[id]/page.tsx`                | MODIFY | +27/-7        | Show stored GOLDMINE score, remove Ollama on-demand scoring                                                                              |
| `lib/inquiries/goldmine-pricing-benchmarks.ts`      | CREATE | +143          | Deterministic pricing benchmarks from conversion-intelligence.json                                                                       |
| `app/(chef)/quotes/new/page.tsx`                    | MODIFY | +5/-18        | Pass `benchmarkHint` prop, remove `as any` hack                                                                                          |
| `components/quotes/quote-form.tsx`                  | MODIFY | +5/-2         | Accept and pass `benchmarkHint` prop                                                                                                     |
| `components/analytics/pricing-suggestion-panel.tsx` | MODIFY | +26/-8        | Accept `benchmarkHint` prop, show fallback text, fix null-safety                                                                         |
| `lib/ai/remy-context.ts`                            | MODIFY | +19           | Add GOLDMINE lead intelligence + response coaching to inquiry context                                                                    |
| `docs/goldmine-phase3-risk-gap-closure.md`          | CREATE | —             | This document                                                                                                                            |

---

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
  → Calendar: event date flows through (existing)
```

**Zero manual data entry from email to event.** The chef's only job: review, approve, and cook.

---

## What Was Replaced

| Before                                                                                              | After                                                                              | Why                                                           |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `lib/leads/scoring.ts` (crude formula, base 50, arbitrary thresholds)                               | Stored GOLDMINE scores from `unknown_fields` JSONB                                 | Data-driven weights from 49 real threads vs arbitrary formula |
| `components/ai/lead-score-badge.tsx` (Ollama on-demand, seconds per score, requires Ollama running) | `components/inquiries/lead-score-badge.tsx` (stored score, instant, works offline) | Formula > AI (CLAUDE.md rule 0b)                              |
| No pricing benchmarks for new chefs                                                                 | `lib/inquiries/goldmine-pricing-benchmarks.ts`                                     | New chefs get data-driven pricing hints from day 1            |
| Remy had no lead intelligence                                                                       | GOLDMINE context in `loadInquiryEntity()`                                          | Remy can now coach response timing with real data             |
| Only first email in thread extracted                                                                | Every email extracts and enriches parent inquiry                                   | No data left on the floor — follow-ups add value              |
| `chef_likelihood` always null on auto-captured inquiries                                            | Set from GOLDMINE tier at creation                                                 | Inquiry list shows priority badges                            |
| `follow_up_due_at` always null on auto-captured inquiries                                           | Set from response time analysis at creation                                        | Cron reminders fire at optimal timing                         |
| Yhangry inquiries had no lead score                                                                 | Full `scoreInquiryFields()` computation added                                      | Parity across all platforms                                   |

---

## Three Lead Scoring Systems (Consolidated)

Before Phase 3, ChefFlow had **three separate lead scoring systems**:

| System                                 | Where Used                      | How It Worked                                                                           | Status After Phase 3                                      |
| -------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `lib/leads/scoring.ts`                 | Inquiry list page               | Crude formula: base 50, +20 for budget, +15 for guest count, async DB query per inquiry | **Replaced** — inquiry list reads stored GOLDMINE scores  |
| `lib/ai/lead-scoring.ts`               | Inquiry detail page (on-demand) | Full Ollama prompt with scoring framework, requires Ollama running, takes seconds       | **Replaced** — detail page reads stored GOLDMINE scores   |
| `lib/inquiries/goldmine-lead-score.ts` | Gmail sync (at ingestion)       | Deterministic formula, 0-100, weights from 49 real threads, instant                     | **Primary** — scores stored at ingestion, read everywhere |

The old files still exist for backward compatibility but are no longer imported by any active UI.

---

## Architectural Decisions

1. **Store at ingestion, read everywhere.** Scoring happens once when the email arrives. Every screen reads the stored score. No redundant computation, no Ollama dependency.

2. **Fill-only-null strategy for thread extraction.** When a follow-up email mentions a date, it only fills `confirmed_date` if it was previously null. This prevents a "dinner for 2 on March 15" from overwriting a chef's manual correction to "March 16". Existing data is never overwritten.

3. **Score upgrades only.** Thread extraction can upgrade `chef_likelihood` (cold→warm, warm→hot) but never downgrade. A lead that was hot stays hot even if a follow-up email has less detail.

4. **`benchmarkHint` as a separate prop.** Rather than hacking a fake `PricingSuggestion` object with `as any`, the benchmark text flows as a clean string prop: `page.tsx` → `QuoteForm` → `PricingSuggestionPanel`. Type-safe, no hacks.

5. **`unknown_fields` dual format.** Pre-GOLDMINE inquiries have `unknown_fields` as a string array (unanswered questions). Post-GOLDMINE inquiries have it as an object with `lead_score`, `lead_tier`, `lead_score_factors` plus other fields. All consumers check `typeof` and `Array.isArray` before accessing.

---

## Verification

- `npx tsc --noEmit --skipLibCheck` — zero app errors (only pre-existing `scripts/` issues)
- No migrations needed — all data flows through existing columns (`chef_likelihood`, `follow_up_due_at`, `unknown_fields`)
- No Ollama dependency — everything is deterministic
- Backward compatible — pre-GOLDMINE inquiries get scores computed from `confirmed_*` fields

---

## Related Documentation

- `docs/goldmine-runtime-integration.md` — Phase 2: how extraction + scoring works at the Gmail sync level
- `data/email-references/local-generated/goldmine/conversion-intelligence.json` — the raw GOLDMINE analysis data
- `lib/gmail/extract-inquiry-fields.ts` — bridge module: `extractAndScoreEmail()` + `scoreInquiryFields()`
- `lib/inquiries/goldmine-lead-score.ts` — the scoring formula with weights
- `scripts/email-references/deterministic-extractors.ts` — regex extractors for all field types
