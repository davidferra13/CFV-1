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

| ID  | Question                                                                                            | Why It Matters                                    | Primary Owner | Status  | Decision                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q01 | What exact signals and weights should determine the frontier score?                                 | Controls where OpenClaw grows next                | OpenClaw      | Open    |                                                                                                                                                                              |
| Q02 | What makes a geography cell high value enough to prioritize next?                                   | Defines growth priority logic                     | OpenClaw      | Open    |                                                                                                                                                                              |
| Q03 | What are the exact confidence thresholds for inferred prices?                                       | Controls blank vs inferred behavior               | Handshake     | Open    |                                                                                                                                                                              |
| Q04 | What is the exact failure rule for recipe pricing?                                                  | Defines when recipe pricing is trustworthy        | ChefFlow      | Open    |                                                                                                                                                                              |
| Q05 | Which nutrition and allergen sources are trusted enough to use as canonical evidence?               | Controls dietary claim defensibility              | OpenClaw      | Open    |                                                                                                                                                                              |
| Q06 | Which fields must be complete before a product is considered usable in ChefFlow?                    | Defines minimum product quality bar               | Handshake     | Open    |                                                                                                                                                                              |
| Q07 | What freshness SLA should apply to price, stock, image, nutrition, allergen, and source URL data?   | Defines current vs stale behavior                 | Handshake     | Open    |                                                                                                                                                                              |
| Q08 | When should a source be marked healthy, degraded, blocked, or retired?                              | Defines source reliability logic                  | OpenClaw      | Open    |                                                                                                                                                                              |
| Q09 | What should trigger automatic source suppression or takedown?                                       | Defines safety and compliance response            | Handshake     | Open    |                                                                                                                                                                              |
| Q10 | What is the exact operator workflow when data is wrong: report, override, suppress, or appeal?      | Defines correction loop                           | ChefFlow      | Open    |                                                                                                                                                                              |
| Q11 | What manual override powers should founders or admins have?                                         | Defines control and governance                    | Handshake     | Open    |                                                                                                                                                                              |
| Q12 | What parts of the current app-side enrichment should migrate into OpenClaw first?                   | Reduces architecture drift                        | OpenClaw      | Open    |                                                                                                                                                                              |
| Q13 | What exact data should stay in OpenClaw only, and what should be mirrored into ChefFlow?            | Defines the handshake contract                    | Handshake     | Open    |                                                                                                                                                                              |
| Q14 | What is the clean handshake contract between OpenClaw and ChefFlow for product detail pages?        | Prevents boundary confusion                       | Handshake     | Open    |                                                                                                                                                                              |
| Q15 | What outward-facing claims are allowed, and which require extra review?                             | Controls presentation risk                        | ChefFlow      | Open    |                                                                                                                                                                              |
| Q16 | What should be shown publicly, what should be chef-only, and what should remain founder-only?       | Defines access and visibility                     | Handshake     | Open    |                                                                                                                                                                              |
| Q17 | What is the exact compliance strategy for retailer images, logos, stock claims, and dietary claims? | Controls legal risk posture                       | Handshake     | Open    |                                                                                                                                                                              |
| Q18 | What are the dispute and takedown workflows if a retailer objects?                                  | Defines response protocol                         | Handshake     | Open    |                                                                                                                                                                              |
| Q19 | What first-party operator data should we ingest to reduce dependence on scraped sources?            | Improves defensibility and quality                | Handshake     | Open    |                                                                                                                                                                              |
| Q20 | What are the exact success metrics for 30, 90, and 180 days?                                        | Defines whether the build is working              | Handshake     | Partial | KPI contract is now mandatory before a slice starts, and a dedicated goal-governor role owns ongoing scorecards. Exact numeric targets still need to be filled in per slice. |
| Q21 | What does good enough to expand publicly actually mean?                                             | Defines public expansion threshold                | Handshake     | Open    |                                                                                                                                                                              |
| Q22 | What are the highest-priority regions after the current anchor footprint?                           | Guides near-term frontier expansion               | OpenClaw      | Open    |                                                                                                                                                                              |
| Q23 | What categories of products should be prioritized first?                                            | Focuses growth on the most valuable product areas | Handshake     | Open    |                                                                                                                                                                              |
| Q24 | What should the incident-response playbook be when a major source breaks?                           | Defines emergency behavior                        | OpenClaw      | Open    |                                                                                                                                                                              |
| Q25 | What should the founder dashboard show every day to prove the system is progressing?                | Defines operational truth surface                 | Handshake     | Partial | It must include KPI scorecards and slice states, not just activity metrics. Exact dashboard fields still need final definition.                                              |

---

## Recommended Next Sequence

If these questions are answered in order, the next best sequence is:

1. Q01-Q04
2. Q05-Q07
3. Q13-Q17
4. Q20-Q25

That order resolves:

- growth logic first
- trust and quality rules second
- product boundary third
- operational proof last
