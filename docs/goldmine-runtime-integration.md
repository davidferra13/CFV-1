# GOLDMINE Runtime Integration

## What Changed

The Gmail sync pipeline now runs **instant deterministic extraction + GOLDMINE lead scoring** on every incoming email. Previously, email parsing relied entirely on Ollama (AI) — if Ollama was offline, no fields were extracted. Now:

1. **Deterministic regex extraction runs FIRST** — instant, free, always works
2. **Lead score computed immediately** — 0-100 score from GOLDMINE-derived formula
3. **Ollama supplements for freeform fields** — client_name, occasion normalization, service style
4. **If Ollama is offline**, all structured fields (date, guests, budget, dietary, cannabis, location, referral) still get extracted

## How It Works

### Email Inquiry Flow (Direct Emails)

```
Email arrives → classifyEmail() → inquiry detected
  ↓
extractAndScoreEmail(subject, body)          ← NEW (instant, regex)
  → dates, guests, budget, dietary, location, referral, cannabis
  → lead score: 0-100, tier: hot/warm/cold
  ↓
parseInquiryFromText(body)                   ← EXISTING (Ollama, may fail)
  → client_name, occasion normalization, service style, notes
  ↓
Merge: deterministic wins for structured data, Ollama wins for freeform
  ↓
Insert inquiry with all fields + lead score in unknown_fields
  ↓
Notification: "🔥 HOT inquiry received" (score-aware)
```

### Platform Inquiry Flow (TakeAChef, Thumbtack, Bark, etc.)

Platform parsers already extract structured fields. The new integration adds lead scoring:

```
Platform email → dedicated parser → structured fields
  ↓
scoreInquiryFields(parsedFields)             ← NEW (instant, formula)
  → lead score: 0-100, tier: hot/warm/cold
  ↓
Insert inquiry with lead score in unknown_fields
```

## Where Lead Score Lives

Lead score is stored in the `unknown_fields` JSONB column on the `inquiries` table:

```json
{
  "lead_score": 73,
  "lead_tier": "hot",
  "lead_score_factors": [
    "Specific date mentioned (+12)",
    "Budget mentioned (+8)",
    "Location provided (+8)",
    "Guest count provided (+5)"
  ],
  "original_sender_name": "...",
  "original_sender_email": "..."
}
```

No database migration required — `unknown_fields` is existing JSONB.

## Files

| File                                                   | What It Does                                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `lib/gmail/extract-inquiry-fields.ts`                  | **NEW** — Bridge module. `extractAndScoreEmail()` for raw emails, `scoreInquiryFields()` for pre-parsed platform data    |
| `lib/inquiries/goldmine-lead-score.ts`                 | Lead scoring formula (0-100, pure deterministic)                                                                         |
| `scripts/email-references/deterministic-extractors.ts` | Regex extraction (dates, phones, guests, budget, dietary, cannabis, location, referral)                                  |
| `lib/gmail/sync.ts`                                    | **MODIFIED** — `handleInquiry()` now runs deterministic extraction before Ollama. Platform handlers compute lead scores. |

## Lead Score Weights

Derived from 49 real conversation threads, 56.1% effective conversion rate:

| Factor               | Weight | Lift   |
| -------------------- | ------ | ------ |
| Specific date        | 12     | +32.6% |
| Pricing quoted       | 12     | +30.5% |
| Multi-message (3+)   | 12     | +38.7% |
| Budget mentioned     | 8      | +26.2% |
| Location provided    | 8      | +18.5% |
| Guest count          | 5      | +13.8% |
| Dietary restrictions | 5      | +14.3% |

Score tiers: **Hot** (70+), **Warm** (40-69), **Cold** (0-39)

## What This Enables

1. **Inquiry queue sorting** — sort by lead_score to prioritize high-value leads
2. **Smart notifications** — "🔥 HOT lead received" vs generic "New inquiry"
3. **Remy context** — "This inquiry scores 73/100 (hot) — respond within 24 hours"
4. **Offline extraction** — Ollama down? All structured fields still extracted
5. **Response coaching** — "Respond within 4-24 hours for best conversion" (from GOLDMINE data)

## Phase 3: Risk-Gap Closure (2026-03-02)

Phase 3 propagated the intelligence stored at ingestion to every screen in the app. See `docs/goldmine-phase3-risk-gap-closure.md` for full details.

**Key additions:**

- `chef_likelihood` + `follow_up_due_at` auto-set on all 4 inquiry creation paths
- Inquiry list + detail read stored GOLDMINE scores (replaced crude formula + Ollama)
- Pricing benchmarks module for new chefs with no quote history
- Remy gets lead score + tier + factors + response coaching in inquiry context
- Thread-level extraction: every email in a thread enriches the parent inquiry
