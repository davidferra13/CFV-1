# Survey Wave 1 Analysis Codebook

> **Date:** 2026-04-02
> **Scope:** Shared analysis rules for the operator and client wave-1 surveys.
>
> **Analysis boundary:** The coding rules below still apply even if collection shifts away from Google Forms. The earlier Google Forms wording reflects the original launch shortcut, not the current canonical system direction. For execution authority and launch sequencing, start with `docs/research/current-builder-start-handoff-2026-04-02.md`. For internal ChefFlow launches, treat the raw admin export or dashboard response layer as the raw dataset.

---

## What This Is For

This document defines how to clean, segment, code, and interpret wave-1 survey results so the output is comparable across channels and actually useful for product decisions.

Use it with:

- `docs/research/survey-food-operator-wave-1-google-forms-ready.md`
- `docs/research/survey-client-wave-1-google-forms-ready.md`
- `data/templates/food-operator-survey-channel-log.csv`
- `data/templates/client-survey-channel-log.csv`
- `data/templates/survey-response-coding.csv`

---

## Review Cadence

### Daily

Track:

- new completions
- qualified completions
- opt-ins
- completion-rate changes by channel
- obvious spam, duplicates, or contradictory responses

### Weekly

Review:

- segment-level patterns
- top message/channel combinations
- open-text themes
- decision thresholds
- whether the live form needs revision before broader scale

---

## Data Hygiene Rules

1. Keep the raw survey export untouched.
2. Make a cleaned analysis sheet or CSV from the raw export.
3. Normalize channel names to match the channel log.
4. Flag contradictory or clearly careless responses rather than deleting them immediately.
5. Keep open-text answers exactly as submitted in the raw dataset.
6. Use coded themes in a separate sheet or file, not by overwriting raw text.

---

## Qualification Rules

### Operator Survey

A response is qualified if:

- the respondent is a real food operator
- the core questions are complete
- the response is not obvious spam or contradiction

Examples of likely low-quality responses:

- impossible combinations that do not make sense
- random or non-serious open text
- answer patterns that show no engagement

### Client Survey

A response is qualified if:

- the respondent is an actual buyer, serious considerer, or clearly relevant prospect
- the core questions are complete
- the response is not obvious spam or contradiction

Signal weighting:

- actual buyers = highest-confidence behavioral signal
- serious considerers = directional signal
- curious-only respondents = exploratory signal, lower weight

---

## Recommended Segments

### Operator Segments

- `primary_business`
- `years_operating`
- `team_size`
- `region`
- `survey_source`

### Client Segments

- `experience_level`
- `event_type`
- `region`
- `survey_source`

---

## Operator Wave 1 Codebook

| Question | Normalized Field           | Type         | Use                                  |
| -------- | -------------------------- | ------------ | ------------------------------------ |
| Q1       | `primary_business`         | segment      | Primary operator-type split          |
| Q2       | `region`                   | segment      | Geography and coverage mix           |
| Q3       | `years_operating`          | segment      | Maturity split                       |
| Q4       | `team_size`                | segment      | Solo vs team split                   |
| Q5       | `tools_used`               | multi-select | Tool fragmentation patterns          |
| Q6       | `workflow_pain_top2`       | multi-select | Top workflow burden                  |
| Q7       | `margin_confidence`        | ordinal      | Pricing/profit confidence            |
| Q8       | `live_pricing_importance`  | ordinal      | Demand for pricing visibility        |
| Q9       | `tool_trial_interest`      | ordinal      | Adoption interest                    |
| Q10      | `price_range`              | ordinal      | Willingness-to-pay range             |
| Q11      | `survey_source`            | segment      | Channel attribution                  |
| Q12A     | `inquiries_source_top2`    | multi-select | Chef/caterer lead-source pattern     |
| Q13A     | `quote_workflow`           | categorical  | Clientflow operational pattern       |
| Q14A     | `communication_breakdown`  | categorical  | Main clientflow failure mode         |
| Q15A     | `grocery_cost_handling`    | categorical  | Grocery reimbursement model          |
| Q12B     | `ingredient_cost_tracking` | categorical  | Location-based cost-tracking pattern |
| Q13B     | `pricing_review_cadence`   | ordinal      | Pricing recalculation frequency      |
| Q14B     | `margin_loss_source`       | categorical  | Main margin-risk area                |
| Q15B     | `manual_ops_pain`          | categorical  | Manual purchasing/pricing burden     |
| Q16      | `one_pain_to_solve`        | open text    | Highest-value problem language       |

Primary decision outputs:

- top workflow pain by operator segment
- degree of pricing/margin blindness
- strength of demand for live ingredient pricing
- adoption interest and price tolerance by segment
- best-performing response channels

---

## Client Wave 1 Codebook

| Question | Normalized Field                 | Type         | Use                                    |
| -------- | -------------------------------- | ------------ | -------------------------------------- |
| Q1       | `experience_level`               | segment      | Buyer vs considerer split              |
| Q2       | `event_type`                     | segment      | Use-case split                         |
| Q3       | `region`                         | segment      | Geography and diversity mix            |
| Q4       | `survey_source`                  | segment      | Channel attribution                    |
| Q5A      | `find_channel_actual_top2`       | multi-select | Real discovery behavior                |
| Q6A      | `choice_factors_actual_top2`     | multi-select | Real decision drivers                  |
| Q7A      | `booking_pain_actual`            | categorical  | Main booking friction for real buyers  |
| Q8A      | `quote_review_preference_actual` | categorical  | Quote/approval presentation preference |
| Q9A      | `portal_deposit_comfort_actual`  | ordinal      | Payment comfort                        |
| Q10A     | `menu_control_preference_actual` | categorical  | Menu-collaboration preference          |
| Q11A     | `rebook_driver_top2`             | multi-select | Repeat/referral driver                 |
| Q5B      | `find_channel_likely_top2`       | multi-select | Likely future discovery path           |
| Q6B      | `trust_factors_top2`             | multi-select | Trust requirements                     |
| Q7B      | `booking_barriers_top2`          | multi-select | Main blockers to hiring                |
| Q8B      | `upfront_info_comfort`           | categorical  | Inquiry-friction tolerance             |
| Q9B      | `quote_review_preference_likely` | categorical  | Preferred quote/approval format        |
| Q10B     | `portal_deposit_comfort_likely`  | ordinal      | Expected payment comfort               |
| Q11B     | `menu_control_preference_likely` | categorical  | Menu-collaboration expectation         |
| Q12B     | `trust_increase_top2`            | multi-select | What could convert them                |
| Q13      | `one_thing_easier`               | open text    | Strongest wording of unmet need        |

Primary decision outputs:

- how people discover and trust chefs
- where booking friction or uncertainty is highest
- how much portal-style payment and quote flows feel normal
- how much menu collaboration they want
- what most increases trust, rebooking, and referral behavior

---

## Open-Text Coding Taxonomy

Each open-text response can have up to `3` coded themes.

### Operator Themes

- `workflow_fragmentation`
- `response_speed`
- `quotes_deposits`
- `pricing_margin_visibility`
- `ingredient_cost_visibility`
- `grocery_reimbursement`
- `inventory_purchasing`
- `menu_revision`
- `scheduling_staffing`
- `bookkeeping_admin`
- `marketing_discovery`
- `community_isolation`
- `other`

### Client Themes

- `discovery_findability`
- `trust_social_proof`
- `pricing_clarity`
- `response_speed`
- `booking_complexity`
- `home_comfort`
- `dietary_confidence`
- `menu_control`
- `portal_payment_comfort`
- `proof_of_quality`
- `value_vs_price`
- `rebooking_experience`
- `other`

---

## Coding Rules

1. Code the respondent's main idea, not every possible interpretation.
2. Use the respondent's wording to decide between adjacent themes.
3. If two themes are equally strong, code both.
4. If the response is too vague, use `other` plus a note.
5. Do not infer sentiment that is not present in the response.

---

## Recommended Summary Tables

### Operator Summary Tables

1. qualified responses by `primary_business`
2. top `workflow_pain_top2` by operator segment
3. `live_pricing_importance` by operator segment
4. `tool_trial_interest` by operator segment
5. `price_range` by operator segment
6. top open-text themes by operator segment

### Client Summary Tables

1. qualified responses by `experience_level`
2. top discovery channels by buyer vs considerer
3. top trust factors by buyer vs considerer
4. quote and portal-payment preferences by `experience_level`
5. menu-control preference by `experience_level`
6. top open-text themes by `experience_level`

---

## Suggested Decision Thresholds

These are not laws. They are working thresholds for wave 1.

### Operator

- `live_pricing_importance` is strong if `Critical` + `Very important` >= `60%` of qualified responses.
- `tool_trial_interest` is strong if `Extremely interested` + `Interested` >= `55%`.
- price acceptance is promising if `15-30`, `30-50`, `50-100`, or `100+` totals >= `40%`.
- a segment is worth follow-up if it produces at least `10` qualified responses with clear pain concentration.

### Client

- portal-payment comfort is strong if `Very comfortable` + `Comfortable after a quick call or message exchange` >= `60%`.
- mobile-friendly or portal-style quote preference is strong if those options together >= `55%`.
- trust is recommendation-led if recommendation options are the top trust signal across both buyers and considerers.
- a barrier is materially important if it appears in the top `3` blockers across serious considerers and actual buyers.

---

## Manual Review Questions

Ask these every week:

1. Which segment is responding fastest?
2. Which channel is producing the cleanest qualified responses?
3. Are open-text themes repeating strongly enough to justify product prioritization?
4. Are we learning anything materially new, or just confirming what we already believed?
5. Is the survey still short and clear enough for broader scale?

---

## Output Rule

The result of wave 1 should not be a giant dump of charts.

The output should be:

1. the top patterns that matter
2. the segments where they are strongest
3. the channels that produced them
4. the concrete product or research decisions they support
