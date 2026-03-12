# Email Intelligence Pipeline

## What This Is

A three-layer extraction system that turns raw email conversations into structured business intelligence. Built on top of the GOLDMINE classification pipeline (which categorized 299 emails), this adds:

1. **Full Field Extraction** — structured data from every email (name, date, guests, location, dietary, budget, cannabis, phone)
2. **Thread Intelligence** — stitched multi-email threads into unified conversation records with lifecycle stages and outcomes
3. **Outbound Pattern Analysis** — the chef's 146 replies analyzed for pricing, response time, tone, sign-off style

## Architecture: Formula > AI

Two-layer extraction follows CLAUDE.md rule 0b:

- **Layer 1 (deterministic):** Regex extracts phones, emails, dates, guest counts, budgets, dietary, cannabis, locations, referral signals — runs on ALL emails instantly, no Ollama
- **Layer 2 (Ollama):** Only for freeform fields regex can't reliably extract — client name from prose, occasion normalization, service style, referral interpretation. Uses `qwen3:4b` (fast) and `qwen3-coder:30b` (standard)

3-strike skip rule: if Ollama fails on an email 3 times, log it, keep deterministic results, move on.

## Pipeline Phases

| Phase       | What                                           | Depends On                 |
| ----------- | ---------------------------------------------- | -------------------------- |
| **Phase 1** | Parse MBOX, classify, thread, score heuristics | Always runs                |
| **Phase 2** | Extract structured fields per email            | `--extract` or `--dry-run` |
| **Phase 3** | Build thread intelligence                      | Phase 2                    |
| **Phase 4** | Analyze outbound patterns                      | Phase 2                    |

## Files

### New Modules (5)

| File                                                   | Purpose                                                                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/email-references/extraction-types.ts`         | Shared Zod schemas — DeterministicFields, OllamaEnrichedFields, FollowUpFields, OutboundAnalysis, ThreadIntelligence            |
| `scripts/email-references/deterministic-extractors.ts` | Pure regex extraction — phones, emails, dates, guest counts, budgets, dietary, cannabis, occasions, locations, referrals        |
| `scripts/email-references/ollama-extractors.ts`        | Ollama wrappers — first-contact enrichment (standard model), follow-up extraction (fast model), outbound menu/tone (fast model) |
| `scripts/email-references/outbound-analyzer.ts`        | Chef reply analysis — response latency, pricing extraction, sign-off detection, availability/follow-up detection                |
| `scripts/email-references/thread-intelligence.ts`      | Thread aggregation — lifecycle stage detection, outcome classification, fact accumulation, response metrics                     |

### Modified Files (3)

| File                                                       | Change                                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `scripts/email-references/build-goldmine-reference.ts`     | Phases 2-4 orchestration, CLI flags (`--extract`, `--dry-run`), 3 new output files              |
| `scripts/email-references/evaluate-goldmine-regression.ts` | Extraction validation — field coverage, thread intelligence quality, outcome determination rate |
| `package.json`                                             | Added `email:build:goldmine:full` and `email:build:goldmine:dry` scripts                        |

## npm Scripts

```bash
npm run email:build:goldmine            # Phase 1 only (classification, backward compatible)
npm run email:build:goldmine:dry        # Phases 1-4, deterministic only (no Ollama)
npm run email:build:goldmine:full       # Phases 1-4, full extraction (deterministic + Ollama)
npm run email:eval:goldmine             # Regression check (strict mode, now includes extraction validation)
```

## Output Artifacts

All output to `data/email-references/local-generated/goldmine/` (local-only, git-ignored):

| File                       | Content                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| `build-summary.json`       | Category counts, thread stats, heuristic accuracy                      |
| `regression-fixtures.json` | All 299 emails with classification + extraction data                   |
| `thread-map.json`          | Thread structure (thread ID → ordered message list)                    |
| `rulepack.json`            | Partner domains, negative signals, missed inquiries                    |
| `report.md`                | Human-readable summary with extraction sections                        |
| `extracted-fields.json`    | Per-email extraction (deterministic + enriched + follow-up + outbound) |
| `thread-intelligence.json` | Per-thread unified records with lifecycle, outcomes, metrics           |
| `outbound-patterns.json`   | Response latency distribution, pricing patterns, tone, sign-offs       |

## Dry-Run Results (Deterministic Only)

From the first run on 2026-03-02:

### Thread Outcomes (49 threads)

| Outcome            | Count |
| ------------------ | ----- |
| Booked             | 15    |
| Expired            | 26    |
| Declined by chef   | 4     |
| Declined by client | 4     |

**100% outcome determination** — every thread classified. **30.6% conversion rate** (booked / determined).

### Response Latency Distribution

| Window     | Count |
| ---------- | ----- |
| < 15 min   | 16    |
| 15-60 min  | 9     |
| 1-4 hours  | 17    |
| 4-24 hours | 26    |
| > 24 hours | 56    |

Median: ~17 hours. 16 replies under 15 minutes.

### Field Coverage (299 emails)

| Field        | Emails | Rate |
| ------------ | ------ | ---- |
| Dates        | 218    | 73%  |
| Locations    | 105    | 35%  |
| Phones       | 75     | 25%  |
| Budgets      | 59     | 20%  |
| Occasions    | 55     | 18%  |
| Guest counts | 49     | 16%  |
| Cannabis     | 40     | 13%  |
| Dietary      | 37     | 12%  |

### Pricing (88 outbound emails with pricing)

Common patterns: `$600` flat rate, `$90/person` for 2 guests.

## How This Feeds the Runtime System (Future)

1. **Deterministic extractors** → importable into `lib/gmail/` for runtime sync (works offline, no Ollama needed)
2. **Thread intelligence patterns** → inform historical scan's surfacing logic for inbox sync
3. **Outbound patterns** → give Remy data to draft responses matching the chef's style
4. **Extraction schemas** → become the standard interface for any email source worldwide

## Known Edge Cases

- **Phone/guest count collision**: Wix form phone numbers (e.g., `978-973-3703`) can be misread as guest counts when the phone is embedded in unstructured text. Ollama enrichment corrects this.
- **Date year inference**: Dates like "September 18" get `YYYY` placeholder. Thread context and email date can disambiguate in future work.
- **Client name**: 0% coverage in dry-run (expected — requires Ollama). With `--extract`, first contacts should reach >90%.
- **Guest count coverage**: 25% on first contacts. Many inquiries mention "my wife and I" or "us" without explicit numbers — Ollama catches these.
