# GOLDMINE Conversion Intelligence

## What This Is

Statistical analysis of 49 real conversation threads from a private chef's Gmail inbox (Nov 2023 - Oct 2024), producing conversion insights, a lead scoring formula, and pricing benchmarks. All derived from real outcomes — no guessing.

## Dataset

| Outcome            | Count | Description                                                   |
| ------------------ | ----- | ------------------------------------------------------------- |
| Booked             | 15    | Explicit email confirmation evidence                          |
| Likely booked      | 8     | Negotiation + pricing + no decline (confirmed via phone/text) |
| Expired            | 18    | Unanswered or minimal engagement                              |
| Declined by client | 4     | Client explicitly cancelled                                   |
| Declined by chef   | 4     | Chef declined the inquiry                                     |

**Conversion rates:**

- Confirmed only: 36.6%
- Including likely booked: **56.1%** (23 of 41 non-declined threads)

## What Predicts a Booking (Lead Score Weights)

Derived from comparing converted threads vs non-converted across every dimension.

| Signal               | Weight | Conversion Lift | Rationale                                     |
| -------------------- | ------ | --------------- | --------------------------------------------- |
| Multi-message (3+)   | 12     | **+38.7%**      | Back-and-forth engagement is the #1 predictor |
| Specific date        | 12     | **+32.6%**      | Inquiries with dates are serious buyers       |
| Pricing quoted       | 12     | **+30.5%**      | If the chef quoted a price, the deal is alive |
| Budget mentioned     | 8      | **+26.2%**      | Explicit budget signals buying intent         |
| Location provided    | 8      | **+18.5%**      | Location = concrete event planning            |
| Dietary restrictions | 5      | **+14.3%**      | Detailed dietary = the event is real          |
| Guest count          | 5      | **+13.8%**      | Knowing headcount = further along in planning |
| Occasion specified   | 0      | -20.2%          | Casual inquiries convert MORE (surprising)    |
| Cannabis preference  | 0      | -8.7%           | No positive effect on conversion              |
| Referral source      | 0      | -7.1%           | Source doesn't predict outcome                |
| Airbnb referral      | 0      | -21.4%          | Airbnb guests have lower close rate           |

### Surprising Findings

- **Occasion hurts conversion** — threads where clients specify "birthday" or "anniversary" convert at 35%, while unspecified occasion threads convert at 55%. Hypothesis: casual/repeat clients don't need to justify the occasion.
- **Airbnb referrals convert less** — despite being the largest referral source. These are one-time vacation bookings with higher price sensitivity.
- **Engagement beats everything** — 3+ messages in the thread is the single strongest predictor. Once you're in a real conversation, you're likely to book.

## Pricing Benchmarks

| Metric                  | Value         |
| ----------------------- | ------------- |
| Average quoted total    | $420          |
| Median quoted total     | $300          |
| Average per-person rate | $191          |
| Median per-person rate  | $150          |
| Price range             | $100 - $1,550 |

### Pricing by Guest Count

Data from 20 threads with pricing quoted:

- **1-2 guests:** Higher per-person rates (intimate dining premium)
- **7-12 guests:** Volume brings per-person down, total up
- **13+ guests:** Largest total amounts (team events, group dinners)

## Messaging Patterns

| Metric              | Converted | Expired | Declined |
| ------------------- | --------- | ------- | -------- |
| Avg messages        | 9         | 1       | 10       |
| Avg inbound         | 4         | 1       | 5        |
| Avg outbound        | 4         | 0       | 5        |
| Avg duration (days) | 22        | 3       | 20       |

The expired threads average just 1 message — these are unanswered inquiries. Converted and declined threads both have substantial engagement (9-10 messages), meaning declined threads aren't "ghosted" — they're active conversations that didn't work out.

## Response Time

- Converted threads: avg 3,379 min (~56 hours), median 2,111 min (~35 hours)
- 4-24 hour window: **100% conversion rate** (3/3 threads)
- 1-3 day window: **50% conversion rate** (2/4 threads)

The 4-24 hour window is the sweet spot for this chef. Responding same-day but not within the first hour appears optimal in this dataset.

## Lead Score Tiers

Based on the scoring formula (0-100):

| Tier | Score | Description                                                |
| ---- | ----- | ---------------------------------------------------------- |
| Hot  | 70+   | Multiple strong signals — date + budget + engagement       |
| Warm | 40-69 | Some signals present — date + location, or budget + guests |
| Cold | 0-39  | Minimal detail — single message, no specific information   |

## Runtime Integration

The lead scoring formula lives at `lib/inquiries/goldmine-lead-score.ts`. It exports:

- `computeLeadScore(input)` — takes boolean flags, returns score + factors + tier
- `scoreFromExtraction(extraction, threadContext)` — bridges the extraction pipeline to the scoring formula

This function is pure deterministic (formula > AI), has zero dependencies on Ollama or any network service, and can be imported by both the build pipeline and the runtime Gmail sync.

## npm Scripts

```bash
npm run email:build:goldmine:dry     # Extract fields + build thread intelligence
npm run email:analyze:goldmine        # Run conversion analysis → conversion-intelligence.json
npm run email:eval:goldmine           # Regression validation
```

## How This Feeds the Platform

1. **Inquiry queue** — sort by lead score (hot/warm/cold) so chefs prioritize high-converting leads
2. **Remy context** — "This inquiry scores 75/100 (hot) — similar leads converted 65% of the time"
3. **Pricing suggestions** — "Typical quote for 4-6 guests is $300-$500"
4. **Response coaching** — "Respond within 24 hours for best conversion"
5. **Dashboard widgets** — conversion funnel powered by real historical data
