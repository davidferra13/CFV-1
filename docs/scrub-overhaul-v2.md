# Prospect Scrub System — V2 + V2.1 + V2.2 + V2.3 + V2.4 Overhaul

**Date:** 2026-02-27
**Status:** Complete (all five waves)

## Summary

Complete overhaul of the AI prospect scrubbing pipeline in four waves:

- **V2 (Wave 1):** 10 improvements across reliability, intelligence quality, UX, and safety
- **V2.1 (Wave 2):** 5 deep intelligence features — multi-page crawling, news intel, cold email drafts, staleness tracking, batch refresh
- **V2.2 (Wave 3):** 4 aggressive lead generation features — seasonal scoring, event signal detection, competitor intelligence, lookalike prospecting
- **V2.3 (Wave 4):** 6 outreach pipeline features — Kanban board, follow-up sequences, AI call scripts, CSV import, geographic clustering, outreach activity log
- **V2.4 (Wave 4.1):** 7 quality-of-life improvements — fuzzy CSV dedup, lead score trending, Kanban revenue totals, smart call queue, CSV export, auto pipeline rules, prospect merge

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

## V2.2 — Wave 3: Aggressive Lead Generation

| Feature                     | What It Does                                                                                                                                                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Seasonal Scoring**        | Lead scores now include a timing bonus (0-8 pts). Maps 14 prospect categories to their peak booking months. +8 points if current month is 1-2 months before peak (ideal outreach window), +4 if in peak. Example: yacht clubs peak May-Aug, so March-April scrubs get boosted scores for yacht clubs.                                 |
| **Event Signal Detection**  | Deep crawl now extracts upcoming event names and dates from the prospect's website. Looks for "upcoming events" sections, scans for lines with month names + years + event keywords (gala, dinner, fundraiser, etc.). Up to 8 signals stored. Events detected = +4-7 bonus lead score points.                                         |
| **Competitor Intelligence** | New scrub mode. Enter a region → system searches for competing private chefs/caterers → scrapes their testimonials, client lists, and portfolio pages → AI extracts venue/client names → inserts as new prospects with `scrub_type='competitor'`. All publicly available data. Includes full enrichment pipeline after extraction.    |
| **Lookalike Prospecting**   | "Find Lookalikes" button on any prospect's dossier page. Takes the source prospect's attributes (category, region, budget, event types, luxury signals) and asks Ollama to find 10 similar organizations in the same area. Reality-checked, deduped, inserted with `scrub_type='lookalike'` and `lookalike_source_id`, then enriched. |

## Files Created

| File                                                                 | Purpose                                                               |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `lib/prospecting/lead-scoring.ts`                                    | Deterministic lead scoring (0-100)                                    |
| `components/prospecting/re-enrich-button.tsx`                        | Single prospect re-enrich button                                      |
| `components/prospecting/batch-re-enrich-button.tsx`                  | Batch refresh stale prospects button                                  |
| `components/prospecting/lookalike-button.tsx`                        | "Find Lookalikes" button for dossier page                             |
| `supabase/migrations/20260327000005_prospect_scrub_enhancements.sql` | `lead_score`, `verified`, `progress_message`                          |
| `supabase/migrations/20260327000006_prospect_intelligence_depth.sql` | `draft_email`, `news_intel`, `last_enriched_at`, `enrichment_sources` |
| `supabase/migrations/20260327000007_prospect_intelligence_wave3.sql` | `event_signals`, `scrub_type`, `lookalike_source_id`                  |

## Files Modified

| File                                             | Changes                                                                                                                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/prospecting/scrub-actions.ts`               | Complete rewrite: deep crawl, news intel, cold email Phase 4, batch re-enrich, staleness timestamps, event signal extraction, competitor intel scrub, lookalike scrub      |
| `lib/prospecting/scrub-prompt.ts`                | Added cold email, competitor intel, and lookalike prompts                                                                                                                  |
| `lib/prospecting/lead-scoring.ts`                | Added seasonal timing bonus (0-8 pts) and event signals bonus (0-7 pts), category-aware scoring                                                                            |
| `lib/prospecting/types.ts`                       | Added `lead_score`, `verified`, `draft_email`, `news_intel`, `last_enriched_at`, `enrichment_sources`, `event_signals`, `scrub_type`, `lookalike_source_id`                |
| `components/prospecting/scrub-form.tsx`          | Mode tabs (Standard / Competitor Intel), mode-specific inputs and "How It Works" panels                                                                                    |
| `components/prospecting/prospect-table.tsx`      | Lead score column with color-coded badges                                                                                                                                  |
| `app/(chef)/prospecting/[id]/dossier-client.tsx` | Draft email card, news intel card, event signals card, staleness indicator, verified badge, lead score badge, Re-Enrich button, Find Lookalikes button, scrub source badge |
| `app/(chef)/prospecting/page.tsx`                | Batch Re-Enrich button above prospect table                                                                                                                                |

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

| Factor              | Points | How                                                                                  |
| ------------------- | ------ | ------------------------------------------------------------------------------------ |
| Budget tier         | 0-25   | Parses dollar amounts: $20k+ = 25, $10k+ = 20, etc.                                  |
| Event frequency     | 0-15   | Parses numbers or keywords: "weekly" = 15, "monthly" = 10                            |
| Luxury indicators   | 0-15   | 3 pts per indicator, capped at 15                                                    |
| Contact quality     | 0-20   | 4 pts phone, 4 email, 3 website, 4 contact person, 3 direct phone, 2 social          |
| Web verification    | 0-10   | 10 pts if confirmed to exist via web search                                          |
| Intelligence depth  | 0-15   | 5 pts each for event types, membership size, events estimate                         |
| **Seasonal timing** | 0-8    | +8 if 1-2 months before category's peak season, +4 if in peak. 14 categories mapped. |
| **Event signals**   | 0-7    | +7 if 3+ upcoming events detected on their site, +4 for 1-2 events                   |

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
- Event signal extraction: Regex for date-containing lines + "upcoming events" section scanning, filtered by event keywords
- Seasonal scoring: Category-to-peak-month mapping, pure math — no AI
- News search: Targets 2025-2026 results for recency
- Staleness: 14-day aging threshold, 30-day stale threshold
- Batch re-enrich: Lowest-score-first ordering — prospects with most to gain get refreshed first
- Competitor intel: Searches for competing chefs → scrapes their sites → AI extracts venue names → full enrichment pipeline
- Lookalike: Uses source prospect's attributes as input → AI generates similar orgs → reality check → dedup → enrich
- All data stays local (Ollama). Web searches access only public information.

## V2.3 — Wave 4: Outreach Pipeline & Advanced Lead Generation

| Feature                        | What It Does                                                                                                                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Outreach Pipeline (Kanban)** | Drag-and-drop Kanban board at `/prospecting/pipeline`. 7 stages: New → Researched → Contacted → Responded → Meeting Set → Converted → Lost. Drag a prospect card between columns to advance it through the funnel. Auto-syncs with existing status field for backwards compatibility. |
| **Follow-Up Sequence**         | "Generate Follow-Up Sequence" button on dossier page. AI writes 2 follow-up emails (Day 5 value-add + Day 12 final check-in) that build on the initial cold outreach. Each email gets shorter, maintains personalization, and references the previous email naturally.                |
| **AI Call Script**             | "Generate AI Call Script" button on dossier page. AI writes a personalized phone script with 5 sections: Opening Hook (10s), Value Prop (15s), The Ask (10s), 3 Objection Handlers, and a Voicemail Script (20s). Uses all gathered intelligence for specificity.                     |
| **CSV Import**                 | `/prospecting/import` page. Upload or paste CSV to bulk-import prospects. Auto-maps common column names (name, phone, email, city, etc.). Deduplicated against existing prospects. Up to 500 per import. Imported prospects can then be enriched via batch re-enrich.                 |
| **Geographic Clustering**      | `/prospecting/clusters` page. Groups all active prospects by region. Shows score ranges, contact indicators, and prospect counts per region. "Plan a [Region] outreach day" hint for route-based selling. Geocode button adds lat/lng from addresses via Nominatim (free API).        |
| **Outreach Activity Log**      | Per-prospect timeline on dossier page. Log emails sent, calls made, follow-up emails, responses received, meetings scheduled, and notes. Auto-advances pipeline stage when you log outreach (email/call → Contacted, response → Responded, meeting → Meeting Set).                    |

## Files Created (Wave 4)

| File                                                                      | Purpose                                                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `lib/prospecting/pipeline-actions.ts`                                     | Pipeline, outreach log, follow-up, call script, CSV import, geoclustering                  |
| `components/prospecting/pipeline-board.tsx`                               | Kanban drag-and-drop board                                                                 |
| `components/prospecting/csv-import-form.tsx`                              | CSV upload/paste form with preview                                                         |
| `components/prospecting/geo-cluster-view.tsx`                             | Geographic cluster accordion view                                                          |
| `components/prospecting/follow-up-sequence-button.tsx`                    | Generate follow-up email sequence button                                                   |
| `components/prospecting/ai-call-script-button.tsx`                        | Generate AI call script button                                                             |
| `components/prospecting/outreach-log-panel.tsx`                           | Outreach activity log timeline + add form                                                  |
| `app/(chef)/prospecting/pipeline/page.tsx`                                | Pipeline Kanban page                                                                       |
| `app/(chef)/prospecting/import/page.tsx`                                  | CSV import page                                                                            |
| `app/(chef)/prospecting/clusters/page.tsx`                                | Geographic clusters page                                                                   |
| `supabase/migrations/20260327000008_prospect_wave4_outreach_pipeline.sql` | Migration: pipeline_stage, follow_up_sequence, ai_call_script, lat/lng, outreach_log table |

## Files Modified (Wave 4)

| File                                             | Changes                                                                                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/prospecting/types.ts`                       | Added `pipeline_stage`, `follow_up_sequence`, `ai_call_script`, `latitude`, `longitude`, `FollowUpSequence`, `OutreachLogEntry`, `GeoCluster` |
| `lib/prospecting/constants.ts`                   | Added `PIPELINE_STAGES`, `PIPELINE_STAGE_LABELS`, `PIPELINE_STAGE_COLORS`, `OUTREACH_TYPES`, `OUTREACH_TYPE_LABELS`                           |
| `lib/prospecting/scrub-prompt.ts`                | Added follow-up sequence prompt and AI call script prompt                                                                                     |
| `app/(chef)/prospecting/page.tsx`                | Added Pipeline, Clusters, Import CSV navigation buttons                                                                                       |
| `app/(chef)/prospecting/[id]/page.tsx`           | Fetches outreach log, passes to dossier client                                                                                                |
| `app/(chef)/prospecting/[id]/dossier-client.tsx` | Pipeline stage badge, AI call script card, follow-up sequence card, outreach log panel                                                        |

## Three Scrub Modes

| Mode                 | Trigger                                           | What It Does                                                                        |
| -------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Standard**         | "Scrub Prospects" button on /prospecting/scrub    | Free-form query → Ollama generates → verify → enrich → strategize → email           |
| **Competitor Intel** | "Competitor Intel" tab on /prospecting/scrub      | Region input → find competing chefs → scrape testimonials → extract venues → enrich |
| **Lookalike**        | "Find Lookalikes" button on prospect dossier page | Source prospect → Ollama finds similar orgs → verify → dedup → enrich               |

## V2.4 — Wave 4.1: Quality-of-Life Improvements

| Feature                   | What It Does                                                                                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fuzzy CSV Dedup**       | CSV import now uses Levenshtein distance (85% similarity) instead of exact name match. Catches "Cape Cod YC" vs "Cape Cod Yacht Club" as duplicates. Also deduplicates within the same batch. Shared `fuzzy-match.ts` utility extracted from scrub pipeline. |
| **Lead Score Trending**   | New `previous_lead_score` column snapshots the last known score. Kanban cards and dossier show trending arrows (↑/↓) with delta values when score changes after re-enrichment.                                                                               |
| **Kanban Revenue Totals** | Each pipeline column shows estimated revenue (sum of `avg_event_budget × annual_events_estimate`). Pipeline summary bar shows total active pipeline revenue. Helps prioritize high-value stages.                                                             |
| **Smart Call Queue**      | Call queue now factors in pipeline stage: hot leads (responded/meeting_set) get priority slot #2 after follow-ups. New leads sorted by lead score (highest first). Cold re-engage slot for prospects not contacted in 7+ days.                               |
| **Export to CSV**         | "Export CSV" button on main prospecting page. Downloads all prospects with 23 columns. Proper CSV escaping for commas/quotes in data. Date-stamped filename.                                                                                                 |
| **Auto Pipeline Rules**   | "Auto-Clean" button on pipeline page runs two rules: (1) Contacted prospects with no outreach for 14+ days → Lost, (2) Follow-ups overdue by 7+ days → priority bumped to High. Both log their changes.                                                      |
| **Prospect Merge**        | Dossier page detects fuzzy name duplicates and shows merge suggestions. One-click merge: fills empty fields from duplicate, combines arrays (tags, luxury indicators), sums call counts, transfers outreach log + notes, deletes duplicate.                  |

## Files Created (Wave 4.1)

| File                                                           | Purpose                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `lib/prospecting/fuzzy-match.ts`                               | Shared fuzzy matching utility (normalizeName, isSimilarName, levenshtein) |
| `components/prospecting/auto-pipeline-rules-button.tsx`        | Auto-Clean button for pipeline page                                       |
| `components/prospecting/export-csv-button.tsx`                 | Export CSV download button                                                |
| `components/prospecting/prospect-merge-panel.tsx`              | Duplicate detection + one-click merge panel                               |
| `supabase/migrations/20260327000010_prospect_improvements.sql` | Migration: previous_lead_score column                                     |

## Files Modified (Wave 4.1)

| File                                             | Changes                                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/prospecting/pipeline-actions.ts`            | Fuzzy CSV dedup, exportProspectsToCSV, getPipelineRevenueByStage, runAutoPipelineRules, mergeProspects, findSimilarProspects, snapshotLeadScores |
| `lib/prospecting/scrub-actions.ts`               | Extracted fuzzy functions to shared `fuzzy-match.ts`, now imports from there                                                                     |
| `lib/prospecting/queue-actions.ts`               | Smart call queue: hot pipeline leads, lead-score ordering, 7-day cold re-engage                                                                  |
| `lib/prospecting/types.ts`                       | Added `previous_lead_score` field to Prospect interface                                                                                          |
| `components/prospecting/pipeline-board.tsx`      | Revenue totals per column, score trend arrows on cards                                                                                           |
| `app/(chef)/prospecting/pipeline/page.tsx`       | Fetches revenue data, renders Auto-Clean button                                                                                                  |
| `app/(chef)/prospecting/page.tsx`                | Added Export CSV button                                                                                                                          |
| `app/(chef)/prospecting/[id]/page.tsx`           | Fetches similar prospects for merge panel                                                                                                        |
| `app/(chef)/prospecting/[id]/dossier-client.tsx` | Lead score trend arrows + delta display, merge panel                                                                                             |
