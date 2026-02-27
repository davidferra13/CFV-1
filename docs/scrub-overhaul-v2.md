# Prospect Scrub System — V2 + V2.1 Overhaul

**Date:** 2026-02-27
**Status:** Complete (both waves)

## Summary

Complete overhaul of the AI prospect scrubbing pipeline in two waves:

- **V2 (Wave 1):** 10 improvements across reliability, intelligence quality, UX, and safety
- **V2.1 (Wave 2):** 5 deep intelligence features — multi-page crawling, news intel, cold email drafts, staleness tracking, batch refresh

## V2 — Wave 1: Foundation

### Bug Fix

| #   | Issue                                                                                                                            | Fix                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 9   | Enriched web data (phone, email, website, social profiles) was gathered in Phase 2 but never passed to Phase 3's approach prompt | `buildApproachUserPrompt` now receives `enrichedDetails` string built from all web-enriched fields |

### New Features

| #   | Feature                        | What It Does                                                                                                                                           |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Reality Check**              | After AI generates prospects, each one is web-searched to verify it actually exists. Verified prospects get a `verified=true` flag and +10 lead score. |
| 2   | **Fuzzy Deduplication**        | Name normalization strips articles ("The"), apostrophes, punctuation. City normalization expands abbreviations. Levenshtein 85% similarity check.      |
| 3   | **Lead Scoring**               | Deterministic 0-100 score from budget, frequency, luxury indicators, contact quality, verification, intelligence depth. Formula > AI.                  |
| 4   | **Progress Feedback**          | UI polls `getScrubSessionProgress()` every 3s. Shows "Deep-enriching 3/5: Cape Cod Yacht Club..." etc.                                                 |
| 5   | **Phase Time Budgets**         | Phase 1: 2min, Validate: 1min, Phase 2: 2min, Phase 3: 1.5min, Phase 4: 1.5min. Per-phase instead of global.                                           |
| 6   | **Smarter Contact Extraction** | Phone/email regex prioritizes text near contact keywords (±300 char windows). Expanded junk email filter.                                              |
| 7   | **Rate Limiting**              | Rejects concurrent scrubs per chef.                                                                                                                    |
| 8   | **Partial Failure**            | Only marks `failed` if Phase 1 returns nothing. Phase 2/3/4 failures preserve data.                                                                    |
| 10  | **Re-Enrich**                  | Standalone action for any existing prospect. Re-Enrich button on dossier page.                                                                         |

## V2.1 — Wave 2: Deep Intelligence

| Feature                   | What It Does                                                                                                                                                                                                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Multi-Page Deep Crawl** | Instead of reading only the homepage, the system discovers and crawls contact, events, about, catering, and membership pages. Finds links on the homepage + tries common paths directly. Up to 3 subpages per prospect. Combined text feeds into contact extraction for much richer results. |
| **News Intelligence**     | Searches for `"prospect name" city state news event announcement 2025 OR 2026`. Stores recent press/news items. Fed into approach prompts so talking points reference current events.                                                                                                        |
| **Cold Email Drafts**     | Phase 4 of the pipeline. Ollama drafts a personalized <150 word cold outreach email per prospect using ALL gathered intelligence (dossier + enrichment + news + approach strategy). Subject line + body. Chef reviews and edits before sending.                                              |
| **Staleness Tracking**    | `last_enriched_at` timestamp on every prospect. Dossier page shows freshness: green (< 14 days), amber (14-30 days), red (> 30 days "stale"). Never-enriched prospects get an amber prompt to click Re-Enrich.                                                                               |
| **Batch Re-Enrich**       | "Refresh Stale Prospects" button on main prospecting page. Finds all prospects that are unverified, never enriched, or > 14 days stale. Re-enriches up to 10, lowest lead scores first (most to gain). 2s cooldown between prospects.                                                        |

## Files Created

| File                                                                 | Purpose                                                               |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `lib/prospecting/lead-scoring.ts`                                    | Deterministic lead scoring (0-100)                                    |
| `components/prospecting/re-enrich-button.tsx`                        | Single prospect re-enrich button                                      |
| `components/prospecting/batch-re-enrich-button.tsx`                  | Batch refresh stale prospects button                                  |
| `supabase/migrations/20260327000005_prospect_scrub_enhancements.sql` | `lead_score`, `verified`, `progress_message`                          |
| `supabase/migrations/20260327000006_prospect_intelligence_depth.sql` | `draft_email`, `news_intel`, `last_enriched_at`, `enrichment_sources` |

## Files Modified

| File                                             | Changes                                                                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/prospecting/scrub-actions.ts`               | Complete rewrite: deep crawl, news intel, cold email Phase 4, batch re-enrich, staleness timestamps                                      |
| `lib/prospecting/scrub-prompt.ts`                | Added `COLD_EMAIL_SYSTEM_PROMPT`, `buildColdEmailPrompt()`, news intel in approach prompt                                                |
| `lib/prospecting/types.ts`                       | Added `lead_score`, `verified`, `draft_email`, `news_intel`, `last_enriched_at`, `enrichment_sources`                                    |
| `components/prospecting/scrub-form.tsx`          | Updated "How It Works" to 5 phases, progress polling                                                                                     |
| `components/prospecting/prospect-table.tsx`      | Lead score column with color-coded badges                                                                                                |
| `app/(chef)/prospecting/[id]/dossier-client.tsx` | Draft email card (with copy button), news intel card, staleness indicator, verified/unverified badge, lead score badge, Re-Enrich button |
| `app/(chef)/prospecting/page.tsx`                | Batch Re-Enrich button above prospect table                                                                                              |

## The Pipeline (5 Phases)

```
Phase 1: Generate          → Ollama generates 5-10 prospects from query
Phase 1b: Verify           → Web-search each to confirm they exist
  ↓ Insert into DB (with initial lead score)
Phase 2: Deep Enrich       → Crawl homepage + 3 subpages + gather news intel
Phase 3: Strategize        → AI approach strategy + talking points (using all data)
Phase 4: Draft Email       → AI cold outreach email per prospect
  ↓ Finalize session
```

## Lead Score Breakdown

| Factor             | Points | How                                                                         |
| ------------------ | ------ | --------------------------------------------------------------------------- |
| Budget tier        | 0-25   | Parses dollar amounts: $20k+ = 25, $10k+ = 20, etc.                         |
| Event frequency    | 0-15   | Parses numbers or keywords: "weekly" = 15, "monthly" = 10                   |
| Luxury indicators  | 0-15   | 3 pts per indicator, capped at 15                                           |
| Contact quality    | 0-20   | 4 pts phone, 4 email, 3 website, 4 contact person, 3 direct phone, 2 social |
| Web verification   | 0-10   | 10 pts if confirmed to exist via web search                                 |
| Intelligence depth | 0-15   | 5 pts each for event types, membership size, events estimate                |

## Cold Email Prompt Design

- Opens with something SPECIFIC about the prospect (recent event, award, social media)
- 1-2 sentence service intro (not a pitch deck)
- Proposes low-commitment next step (15-min call, sample menu, tasting)
- Under 150 words
- Human tone — no corporate buzzwords, no "I hope this email finds you well"
- No [Your Name] placeholders — ends with natural sign-off

## Architecture Notes

- Lead scoring: Formula > AI — pure math, zero LLM calls
- Fuzzy dedup: Levenshtein distance — deterministic
- Deep crawl: Discovers subpage links from homepage + tries common paths (`/contact`, `/events`, `/about`)
- News search: Targets 2025-2026 results for recency
- Staleness: 14-day aging threshold, 30-day stale threshold
- Batch re-enrich: Lowest-score-first ordering — prospects with most to gain get refreshed first
- All data stays local (Ollama). Web searches access only public information.
