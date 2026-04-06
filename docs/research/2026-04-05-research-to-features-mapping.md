# Research-to-Features Mapping: Food Operator Knowledge

> Created: 2026-04-05
> Purpose: Maps the food operator business research (3 reports) to existing ChefFlow features and identifies enhancement opportunities.

---

## How to Read This Document

Each row maps a research finding to:

- **ChefFlow Status**: Does the platform already handle this?
- **Where**: What feature/route covers it?
- **Gap**: What could be improved or added?

---

## 1. Revenue & Pricing

| Finding                                                 | ChefFlow Status   | Where                                                      | Gap                                      |
| ------------------------------------------------------- | ----------------- | ---------------------------------------------------------- | ---------------------------------------- |
| Private chefs earn $55-$175/hr, $50-$150/person         | Supported         | Event costing, quote builder                               | None (chef sets own rates)               |
| Grocery markup 10-25%                                   | Supported         | Cost-plus buildup in costing tools                         | Could surface a recommended markup range |
| Service charge 10-25%                                   | Supported         | Operator cost lines (`lib/costing/operator-cost-lines.ts`) | None                                     |
| Travel fees                                             | Supported         | Operator cost lines (mileage line item)                    | None                                     |
| Tasting/consultation fees                               | Partial           | Can create as an event type                                | No dedicated "tasting" event template    |
| Weekly meal prep retainers ($200-$800/wk)               | Partial           | Events support recurring, but no formal retainer tracking  | Retainer/subscription management feature |
| Per-person, hourly, flat rate, cost-plus pricing models | Supported         | Costing tools support all models                           | No "which model should I use?" guidance  |
| 42% still use pen-and-paper                             | Marketing insight | FAQ, For Operators page                                    | Already referenced on website            |

## 2. Food Costing

| Finding                                                      | ChefFlow Status               | Where                                  | Gap                                               |
| ------------------------------------------------------------ | ----------------------------- | -------------------------------------- | ------------------------------------------------- |
| Food cost % target: 25-35% (private chef), 28-32% (catering) | Fully supported               | Recipe costing, menu blending          | Shows targets in costing knowledge system         |
| Yield factors (AP/EP conversion)                             | Fully supported               | 150+ ingredients with yield data       | None                                              |
| Q-factor (5-10% incidentals)                                 | Fully supported               | Configurable per chef                  | None                                              |
| Cross-utilization (shared prep across dishes)                | Partially supported           | Documented, component costing exists   | No UI for "cross-utilization score" per menu      |
| Actual vs. theoretical food cost                             | Supported                     | Variance tracking exists               | Needs more prominent post-event reconciliation UI |
| Menu engineering (Star/Puzzle/Plow Horse/Dog)                | Partially supported           | Dish index tracks appearances + costs  | No explicit quadrant classification in UI         |
| Price anchoring (Good/Better/Best tiers)                     | Partially supported           | Can build tiered proposals manually    | No guided tier-building workflow                  |
| Seasonal sourcing (30-60% cost reduction)                    | Partial                       | Price history shows seasonal variation | No "seasonal buying plan" or seasonal alerts      |
| Case break waste analysis                                    | Mentioned in knowledge system | Warning type exists                    | No calculator or recommendation                   |

## 3. Client Management

| Finding                                                  | ChefFlow Status   | Where                                          | Gap                                        |
| -------------------------------------------------------- | ----------------- | ---------------------------------------------- | ------------------------------------------ |
| Client lifetime value ($10K-$25K over 3 years)           | Fully supported   | Remy `analytics.client_ltv` (deterministic)    | None                                       |
| Referred clients spend 200% more                         | Knowledge only    | Not tracked                                    | No referral source tracking on inquiries   |
| 5% retention increase = 25-95% profit increase           | Knowledge only    | Client engagement badges exist (HOT/WARM/COLD) | No "at-risk" proactive alerts              |
| Client journey: event -> repeat -> meal prep -> referral | Partially tracked | Event history, repeat rate                     | No visual "client journey stage" indicator |
| Dietary profiles (FDA Big 9 + custom)                    | Fully supported   | Client profile, allergen tracking              | None                                       |
| Post-event follow-up (thank you, referral ask)           | Supported         | Remy draft templates exist                     | Not automated/prompted after events        |

## 4. Operations & Logistics

| Finding                                     | ChefFlow Status       | Where                                              | Gap                                            |
| ------------------------------------------- | --------------------- | -------------------------------------------------- | ---------------------------------------------- |
| Invisible labor (60% non-cooking)           | Addressed by platform | ChefFlow automates admin tasks                     | Marketing message, not a feature gap           |
| Prep planning and timeline                  | Fully supported       | `/culinary/prep/timeline`, active timers, stations | None                                           |
| Packing checklists                          | Fully supported       | Packing templates, confirmations                   | None                                           |
| Pre-service checklist                       | Fully supported       | Auto-generated safety/prep/venue/staff checklists  | None                                           |
| Transportation logistics (hot/cold holding) | Not supported         | No feature                                         | Food safety transport checklist could be added |
| Multiple overlapping events in a week       | Partially supported   | Calendar shows events, prep timeline exists        | No "batch prep optimizer" across events        |
| Emergency/contingency planning              | Partially supported   | `lib/ai/contingency-ai.ts` exists                  | Could be more prominent in event workflow      |
| Home kitchen vs. commissary considerations  | Not tracked           | No feature                                         | Could be a venue/kitchen profile on events     |

## 5. Financial Management

| Finding                                     | ChefFlow Status     | Where                                 | Gap                                   |
| ------------------------------------------- | ------------------- | ------------------------------------- | ------------------------------------- |
| Immutable ledger                            | Fully supported     | `lib/ledger/`                         | None                                  |
| 9 report types (revenue, profit, tax, etc.) | Fully supported     | `/financials`                         | None                                  |
| Event financial summary                     | Fully supported     | Database view per event               | None                                  |
| Expense tracking                            | Fully supported     | `/expenses`                           | None                                  |
| Tax write-offs (mileage, equipment, etc.)   | Partially supported | Mileage tracked, expenses categorized | No "tax deduction summary" view       |
| Quarterly estimated tax calculation         | Not supported       | Tax reports exist                     | No quarterly estimate calculator      |
| Scope creep surcharges (30%/100%/200%)      | Not supported       | Contract terms are manual             | Could template escalating change fees |

## 6. Waste & Variance

| Finding                                          | ChefFlow Status      | Where                                         | Gap                                      |
| ------------------------------------------------ | -------------------- | --------------------------------------------- | ---------------------------------------- |
| Waste tracking by category                       | Supported            | `lib/waste/actions.ts`, categorization exists | UI could be more prominent               |
| Shrink (75% internal)                            | Knowledge documented | Warning types exist                           | Not yet user-visible                     |
| Variance benchmarks (0-1% excellent, 5%+ crisis) | Knowledge documented | In costing knowledge system                   | Could show benchmark in variance reports |
| Over-portioning detection                        | Partial              | Portion tracking exists                       | No "you over-portioned by X%" alert      |
| Spoilage risk analysis                           | Supported            | Warnings in costing system                    | None                                     |
| Buffet waste target (under 12%)                  | Knowledge only       | Not tracked                                   | Could set waste targets by service style |

## 7. Staff & Scaling

| Finding                          | ChefFlow Status | Where                                | Gap                                      |
| -------------------------------- | --------------- | ------------------------------------ | ---------------------------------------- |
| Staff roster and task management | Fully supported | `/staff`, kanban, hours, performance | None                                     |
| 1099 vs W-2 distinction          | Not tracked     | Staff roles exist                    | No contractor vs employee classification |
| Solo operator cap ($80K-$100K)   | Knowledge only  | Revenue tracking exists              | Could show "scaling readiness" indicator |
| Labor cost integration           | Supported       | Operator cost lines include labor    | None                                     |
| Payroll (941, W-2)               | Supported       | Payroll management exists            | None                                     |

## 8. Marketing & Growth

| Finding                                | ChefFlow Status | Where                                 | Gap                                       |
| -------------------------------------- | --------------- | ------------------------------------- | ----------------------------------------- |
| 60-80% of new business from referrals  | Knowledge only  | No referral tracking                  | Could add referral source to inquiry form |
| Specialization commands 15-40% premium | Knowledge only  | Chef profiles support specializations | No pricing guidance based on niche        |
| Tasting as a sales tool                | Not formalized  | Could create tasting events           | No "tasting conversion rate" tracking     |
| Social media content                   | Not in scope    | N/A                                   | External tool domain                      |

## 9. Legal & Compliance

| Finding                            | ChefFlow Status     | Where                    | Gap                                     |
| ---------------------------------- | ------------------- | ------------------------ | --------------------------------------- |
| Liability insurance ($300-$500/yr) | Not tracked         | No feature               | Could add to business profile/checklist |
| Food handler certifications        | Not tracked         | No feature               | Could add to chef profile               |
| Cancellation policies              | Partially supported | Contract terms exist     | Could template standard policies        |
| Allergy waivers/disclaimers        | Not supported       | Allergen tracking exists | No waiver generation                    |
| LLC/business entity status         | Not tracked         | No feature               | Low priority                            |

---

## Priority Enhancement Opportunities

Ranked by impact on operator profitability and retention:

### High Impact (directly affects money)

1. **Post-event reconciliation prominence** - Actual vs. theoretical is tracked but buried. Make it a required step in event completion.
2. **Referral source tracking** - Add "How did you hear about this chef?" to inquiry forms. Free data, high value.
3. **Scope creep policy templates** - Template escalating change fees in contracts/proposals.
4. **Cross-utilization scoring** - Show chefs which menus share ingredients efficiently.

### Medium Impact (improves operations)

5. **Batch prep optimizer** - When multiple events in a week share ingredients, suggest consolidated prep.
6. **Seasonal price alerts** - Flag when ingredient prices are seasonally high/low.
7. **Menu engineering quadrants** - Classify dishes as Star/Puzzle/Plow Horse/Dog in the dish index.
8. **Variance benchmarks in reports** - Show industry benchmarks alongside the chef's actual variance.

### Low Impact (nice to have)

9. **Tasting event template** - Dedicated event type for tastings with conversion tracking.
10. **Tax deduction summary** - Year-end view of deductible expenses by category.
11. **Kitchen/venue profile** - Track what equipment is available at each client's location.
12. **Food safety transport checklist** - Temperature holding requirements for transport.

---

## Where This Research Is Now Used

| Surface            | What Changed                                            | File                                  |
| ------------------ | ------------------------------------------------------- | ------------------------------------- |
| FAQ page           | Expanded from 6 to 24 questions with real industry data | `app/(public)/faq/page.tsx`           |
| For Operators page | Added pain-points section + enhanced capabilities       | `app/(public)/for-operators/page.tsx` |
| Research archive   | 3 reports saved                                         | `docs/research/2026-04-05-*.md`       |
| This mapping doc   | Connects findings to features                           | This file                             |
