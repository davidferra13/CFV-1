# GOLDMINE Email Analysis — Session Report

## What This Is

Processed 299 real emails from the developer's private chef Gmail inbox (Nov 2023 – Oct 2024) into structured reference data, regression fixtures, and classifier improvements.

## Source Data

- **File:** `.auth/EmailGOLDMINE/Takeout/Mail/Dinner Email Export.mbox` (54 MB, git-ignored)
- **Date range:** Nov 10, 2023 → Oct 9, 2024 (about 1 year)
- **49 conversation threads**, avg 6.1 messages each

## Email Breakdown

| Category             | Count | Description                              |
| -------------------- | ----- | ---------------------------------------- |
| outbound             | 146   | David's replies                          |
| direct_followup      | 97    | Client replies within existing threads   |
| direct_first_contact | 24    | First incoming message from a new client |
| partner_ember        | 19    | Ember Brand Fire referral partner        |
| wix_form             | 8     | Wix website form submissions             |
| platform_takeachef   | 3     | TakeAChef notifications                  |
| post_event_feedback  | 1     | Post-dinner thank you (not an inquiry)   |
| bounce               | 1     | Delivery failure                         |

## What Was Built

### 1. Shared MBOX Utilities (`scripts/email-references/mbox-utils.ts`)

Extracted all MBOX parsing logic (MIME decoding, header parsing, boundary handling, etc.) from the existing platform build script into a shared module. Both the platform reference pipeline and the new GOLDMINE pipeline use it.

### 2. GOLDMINE Build Pipeline (`scripts/email-references/build-goldmine-reference.ts`)

Processes the MBOX file and outputs to `data/email-references/local-generated/goldmine/`:

- **build-summary.json** — Category counts, thread stats, heuristic accuracy metrics
- **regression-fixtures.json** — All 299 emails with expected classification
- **thread-map.json** — Thread structure (thread ID → ordered message list)
- **rulepack.json** — Partner domains, negative signal patterns, missed inquiries
- **report.md** — Human-readable summary

### 3. Classifier Improvements (`lib/gmail/classify.ts`)

**Layer 1.5 — Partner/Referrer Detection (NEW)**

- Ember Brand Fire (`emberbrandfire.com`) now auto-detected as a referral partner
- Partner emails classified as `inquiry` with `high` confidence — always ingested as leads
- Extensible: add more partner domains to the `PARTNER_DOMAINS` map

**Layer 4.5 — Negative Signals (ENHANCED)**

- `Re:` subject prefix: -1 point
- Post-event praise ("remarkable meal", "every single bite"): -2 points
- Thank-you/gratitude language: -2 points
- Logistics confirmation ("sounds good", "see you then") on a reply: -1 point
- Net score (positive - negative) must still hit threshold for inquiry classification

### 4. Regression Tests

- **Eval script:** `npm run email:eval:goldmine` — verifies sender classification + partner detection (100%)
- **Test suite:** `tests/unit/gmail-goldmine-regression.test.ts` — 5 tests (all pass)
- **No regressions:** Existing platform regression (`npm run email:eval:private-reference`) still 100%

## Heuristic Accuracy (Key Finding)

The Layer 4.5 inquiry heuristic was tested against all 41 first-contact emails (non-outbound):

| Threshold                     | Caught | Rate    |
| ----------------------------- | ------ | ------- |
| Score ≥ 2 (medium confidence) | 36/41  | **88%** |
| Score ≥ 3 (high confidence)   | 26/41  | **63%** |

### What the heuristic catches well:

- Airbnb referrals (dominant pattern)
- Date + guest count combinations
- Cannabis/THC inquiries
- Location-specific inquiries (Maine/NH)

### What it misses (correctly deferred to Ollama):

- Wix form submissions (handled by dedicated parser, not heuristic)
- Bounce notifications (no inquiry signals)
- Non-dinner inquiries (freeze-drying business — correctly filtered)
- Very short messages with only 1 signal

## Top Inquiry Signals (by frequency in non-outbound emails)

| Signal               | Count |
| -------------------- | ----- |
| date_mention         | 142   |
| price_or_booking_ask | 115   |
| local_geography      | 102   |
| dietary              | 86    |
| guest_count          | 49    |
| occasion             | 43    |
| cannabis             | 43    |
| airbnb_referral      | 29    |
| referral             | 10    |
| website_followup     | 7     |

## npm Scripts

```bash
npm run email:build:goldmine        # Process MBOX → reference data
npm run email:eval:goldmine          # Regression check (strict mode)
npm run email:build:private-reference  # Existing platform pipeline (unchanged)
npm run email:eval:private-reference   # Existing platform regression (unchanged)
```

## Future Work (Not in This Session)

1. **Direct client email parser** — Deterministic field extraction from free-form inquiry emails (date, guests, dietary, location, cannabis preference) before Ollama fallback
2. **Thread intelligence** — Aggregate details across multi-email threads into a single inquiry record
3. **Outbound pattern analysis** — David's reply templates for auto-draft suggestions
