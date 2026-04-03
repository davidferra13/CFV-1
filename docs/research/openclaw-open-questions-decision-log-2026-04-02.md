# OpenClaw Open Questions and Decision Log

> **Date:** 2026-04-02
> **Purpose:** capture the most important unanswered questions that still shape the OpenClaw and ChefFlow build direction.

---

## Top 10 Questions

These are the highest-value unanswered questions to drive next.

1. What exact signals and weights should determine the frontier score?
   This controls where OpenClaw grows next and whether expansion is actually rational.

2. What makes a geography cell high value enough to prioritize?
   This decides whether growth follows demand, source richness, operator value, or something else.

3. What are the exact confidence thresholds for inferred prices?
   This controls when a price is shown, labeled as inferred, or left blank.

4. What is the exact failure rule for recipe pricing?
   This defines whether one missing ingredient, one weak-confidence estimate, or another condition counts as failure.

5. Which nutrition and allergen sources are trusted enough to use as canonical evidence?
   This determines whether dietary and health-related data is defensible.

6. Which product fields must be complete before a product is considered usable in ChefFlow?
   This defines the minimum quality bar for real workflow usefulness.

7. What freshness SLA should apply to price, stock, image, nutrition, allergen, and source-link data?
   This defines when data is current, degraded, stale, or unusable.

8. What exact data should remain inside OpenClaw, and what should be mirrored into ChefFlow?
   This defines the clean handshake contract between runtime and product.

9. What outward-facing claims are allowed without special review, and which require extra review?
   This defines the website presentation boundary and compliance risk posture.

10. What does good enough to expand publicly actually mean?
    This defines the threshold between internal intelligence and outward-facing product use.

---

## Full Question Checklist

### Expansion and Prioritization

- What exact signals and weights should determine the frontier score?
- What makes a geography cell high value enough to prioritize next?
- What are the highest-priority regions after the current anchor footprint?
- What categories of products should be prioritized first?
- What first-party operator data should we ingest to reduce dependence on scraped sources?

### Inference and Quality

- What are the exact confidence thresholds for showing an inferred price versus leaving it blank?
- What is the exact failure rule for recipe pricing: one missing ingredient, one weak-confidence ingredient, or something else?
- What exact operator workflow should happen when data is wrong: report, override, suppress, or appeal?
- What exact success metrics should define 30-day, 90-day, and 180-day progress?
- What exact baseline window should we use before locking a KPI target?
- What minimum sample size is required before a KPI is considered trustworthy?
- Which KPIs are primary outcome metrics, and which are only guardrails?
- Which metrics are leading indicators, and which are lagging indicators?
- What exact denominator defines lookup success, recipe completion, and product usability?
- What amount of volatility or noise should count as normal drift versus a real KPI warning?
- Which metrics should block rollout even if the primary KPI improves?
- When should a KPI target be ratcheted upward, kept flat, or revised downward?

### Metadata and Product Completeness

- Which nutrition and allergen sources are trusted enough to use as canonical evidence?
- Which fields must be complete before a product is considered usable in ChefFlow?
- What freshness SLA should apply to price, stock, image, nutrition, allergen, and source URL data?
- What parts of the current app-side enrichment should migrate into OpenClaw first?

### Source Health and Operations

- When should a source be marked `healthy`, `degraded`, `blocked`, or `retired`?
- What should trigger automatic source suppression or takedown?
- What should the incident-response playbook be when a major source breaks?
- What manual override powers should founders or admins have?
- What should the founder dashboard show every day to prove the system is progressing?

### OpenClaw / ChefFlow Boundary

- What exact data should stay in OpenClaw only, and what should be mirrored into ChefFlow?
- What is the clean handshake contract between OpenClaw and ChefFlow for product detail pages?
- What should be shown publicly, what should be chef-only, and what should remain founder-only?

### Legal, Rights, and Presentation

- What outward-facing claims are allowed, and which require extra review?
- What is the exact compliance strategy for retailer images, logos, stock claims, and dietary claims?
- What are the dispute and takedown workflows if a retailer objects?
- What does good enough to expand publicly actually mean?

---

## Spec-Ready Decision Log

Use this table to capture answers as they are decided.

| ID  | Question                                                                                            | Why It Matters                                    | Primary Owner | Status  | Decision                                                                                                                                                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q01 | What exact signals and weights should determine the frontier score?                                 | Controls where OpenClaw grows next                | OpenClaw      | Partial | Use `frontier_score_v1` as the default: repair urgency `22`, adjacency `18`, same-chain extension `14`, chef outcome value `14`, source richness `10`, metadata opportunity `8`, first-party signal `7`, execution feasibility `7`, minus repeated-failure and maintenance-cost penalties up to `10` each. Recalibrate by evidence later. |
| Q02 | What makes a geography cell high value enough to prioritize next?                                   | Defines growth priority logic                     | OpenClaw      | Partial | Treat cells with `frontier_score_v1 >= 60` as high-value frontier by default. Any cell with `repair_urgency >= 0.80` becomes priority repair even if its frontier score is lower.                                                                                                                                                         |
| Q03 | What are the exact confidence thresholds for inferred prices?                                       | Controls blank vs inferred behavior               | Handshake     | Partial | `>= 0.85` strong inferred, `0.70-0.84` usable inferred, `0.55-0.69` weak internal-only inferred, `< 0.55` unresolved and blank. Only `>= 0.70` counts as price-resolved for recipe-completion logic.                                                                                                                                      |
| Q04 | What is the exact failure rule for recipe pricing?                                                  | Defines when recipe pricing is trustworthy        | ChefFlow      | Partial | A recipe-pricing run is successful only if every required ingredient resolves to a direct current/degraded price or an inferred price with confidence `>= 0.70`. If even one required ingredient remains below that bar, the run fails.                                                                                                   |
| Q05 | Which nutrition and allergen sources are trusted enough to use as canonical evidence?               | Controls dietary claim defensibility              | OpenClaw      | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q06 | Which fields must be complete before a product is considered usable in ChefFlow?                    | Defines minimum product quality bar               | Handshake     | Partial | Use tiered usability. `price_usable`: canonical title/link, normalized unit context, price, source/store identity, freshness state. `lookup_usable`: plus source URL, image or brand, and stock state when supported. `nutrition_usable`: plus trusted nutrition or ingredient-text evidence for dietary surfaces.                        |
| Q07 | What freshness SLA should apply to price, stock, image, nutrition, allergen, and source URL data?   | Defines current vs stale behavior                 | Handshake     | Partial | Defaults: direct price `<=72h current`, `<=7d degraded`; stock `<=24h current`, `<=72h degraded`; source URL `<=30d current`, `<=90d degraded`; image `<=30d current`, `<=120d degraded`; nutrition/allergen `<=180d current`, `<=365d degraded`.                                                                                         |
| Q08 | When should a source be marked healthy, degraded, blocked, or retired?                              | Defines source reliability logic                  | OpenClaw      | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q09 | What should trigger automatic source suppression or takedown?                                       | Defines safety and compliance response            | Handshake     | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q10 | What is the exact operator workflow when data is wrong: report, override, suppress, or appeal?      | Defines correction loop                           | ChefFlow      | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q11 | What manual override powers should founders or admins have?                                         | Defines control and governance                    | Handshake     | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q12 | What parts of the current app-side enrichment should migrate into OpenClaw first?                   | Reduces architecture drift                        | OpenClaw      | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q13 | What exact data should stay in OpenClaw only, and what should be mirrored into ChefFlow?            | Defines the handshake contract                    | Handshake     | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q14 | What is the clean handshake contract between OpenClaw and ChefFlow for product detail pages?        | Prevents boundary confusion                       | Handshake     | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q15 | What outward-facing claims are allowed, and which require extra review?                             | Controls presentation risk                        | ChefFlow      | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q16 | What should be shown publicly, what should be chef-only, and what should remain founder-only?       | Defines access and visibility                     | Handshake     | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q17 | What is the exact compliance strategy for retailer images, logos, stock claims, and dietary claims? | Controls legal risk posture                       | Handshake     | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q18 | What are the dispute and takedown workflows if a retailer objects?                                  | Defines response protocol                         | Handshake     | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q19 | What first-party operator data should we ingest to reduce dependence on scraped sources?            | Improves defensibility and quality                | Handshake     | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q20 | What are the exact success metrics for 30, 90, and 180 days?                                        | Defines whether the build is working              | Handshake     | Partial | KPI contract is now mandatory before a slice starts, and a dedicated goal-governor role owns ongoing scorecards. Exact numeric targets still need to be filled in per slice using a baseline-first calibration method rather than guesswork.                                                                                              |
| Q21 | What does good enough to expand publicly actually mean?                                             | Defines public expansion threshold                | Handshake     | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q22 | What are the highest-priority regions after the current anchor footprint?                           | Guides near-term frontier expansion               | OpenClaw      | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q23 | What categories of products should be prioritized first?                                            | Focuses growth on the most valuable product areas | Handshake     | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q24 | What should the incident-response playbook be when a major source breaks?                           | Defines emergency behavior                        | OpenClaw      | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q25 | What should the founder dashboard show every day to prove the system is progressing?                | Defines operational truth surface                 | Handshake     | Partial | It must include KPI scorecards and slice states, not just activity metrics. Exact dashboard fields still need final definition.                                                                                                                                                                                                           |
| Q26 | What exact baseline window should we use before locking a KPI target?                               | Prevents fake certainty in early metrics          | Handshake     | Partial | Default baselines: `14d` for operational and coverage metrics, `28d` for lookup and recipe metrics, `56d` for low-volume strategic metrics. Narrower slice specs may override with stronger evidence.                                                                                                                                     |
| Q27 | What minimum sample size is required before a KPI is trusted?                                       | Prevents tiny samples from driving the build      | Handshake     | Partial | Default sample floors: `200 events` or `50` distinct entities for operational metrics, `250` eligible lookups for lookup metrics, `50` eligible recipe-pricing runs for recipe metrics.                                                                                                                                                   |
| Q28 | Which KPIs are primary outcome metrics, and which are only guardrails?                              | Prevents metric sprawl and wrong incentives       | Handshake     | Partial | Primary outcomes: lookup success, recipe completion, ingredient price resolution, high-value-cell coverage. Guardrails: blank-result rate, stale-source rate, incident rate, dead-letter rate, queue lag, unsafe capacity.                                                                                                                |
| Q29 | Which metrics are leading indicators, and which are lagging indicators?                             | Improves interpretation of movement over time     | Handshake     | Partial | Leading: source freshness, frontier progression, metadata completeness, inference recompute lag, queue lag. Lagging: lookup success, recipe completion, conversion-supporting coverage, retention-supporting usefulness.                                                                                                                  |
| Q30 | What exact denominator defines lookup success, recipe completion, and product usability?            | Prevents metric ambiguity                         | Handshake     | Partial | Lookup denominator: all non-empty normalized lookups not user-cancelled. Recipe denominator: all recipe-pricing runs with at least one required ingredient after parse, excluding explicit cancellation. Product usability denominator: all eligible product rows surfaced within the slice scope.                                        |
| Q31 | What amount of volatility or noise should count as normal drift versus a real KPI warning?          | Prevents overreaction to random swings            | Handshake     | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q32 | Which metrics should block rollout even if the primary KPI improves?                                | Protects against harmful local wins               | Handshake     | Open    |                                                                                                                                                                                                                                                                                                                                           |
| Q33 | When should a KPI target be ratcheted upward, kept flat, or revised downward?                       | Keeps targets ambitious but evidence-based        | Handshake     | Open    |                                                                                                                                                                                                                                                                                                                                           |

---

## Recommended Next Sequence

If these questions are answered in order, the next best sequence is:

1. Q01-Q04
2. Q20 plus Q26-Q33
3. Q05-Q07
4. Q13-Q17
5. Q21-Q25

That order resolves:

- growth logic first
- KPI and ground-truth discipline second
- trust and quality rules third
- product boundary fourth
- operational proof last
