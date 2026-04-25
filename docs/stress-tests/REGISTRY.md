# Persona Stress Test Registry

> Persistent memory for the `/persona-stress-test` skill. Updated after every run.
> This file is checked at the start of every test to avoid redundant work and track progress.

---

## Coverage Heat Map

| Persona Type | Tested                          | Untested Examples                                                                                                                                                                                                    |
| ------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chef**     | 1 (Bob - defined, not executed) | Meal prep specialist, catering lead, food truck, grazing artist, estate chef, cannabis chef, farm-to-table, personal/family chef, pop-up chef, supper club host, culinary instructor, food stylist, recipe developer |
| **Client**   | 1 (Joy - full 6-phase)          | Wedding client, corporate planner, repeat customer, first-timer, family chef employer, vacation rental host, event coordinator, holiday party organizer                                                              |
| **Guest**    | 0                               | Dinner guest, dietary-restricted guest, plus-one, child guest, VIP guest, guest with accessibility needs                                                                                                             |
| **Vendor**   | 0                               | Ingredient supplier, specialty purveyor, farm/CSA, fishmonger, butcher, bakery, beverage distributor, equipment rental, linen service, cleaning service                                                              |
| **Staff**    | 0                               | Sous chef, prep cook, line cook, pastry cook, server, bartender, kitchen manager, event captain, delivery driver, freelance cook                                                                                     |
| **Partner**  | 1 (Sophie - design persona)     | Farm co-host, venue owner, referral partner, external event planner, photographer, sommelier, food blogger/influencer, culinary school, wedding planner                                                              |
| **Public**   | 0                               | Google searcher, social media follower, word-of-mouth referral, food blog reader, local foodie, journalist/press                                                                                                     |

## Queue Status

```
Uncompleted: 0 files
Completed:   0 files
Failed:      0 files
```

---

## Persona Registry

| #   | Label         | Type                         | Date            | Score                                     | Method                                      | Report                                                      | Key Finding                                                                                                           |
| --- | ------------- | ---------------------------- | --------------- | ----------------------------------------- | ------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | Chef Bob      | Chef (solo private)          | Defined 2026-04 | --                                        | 14-day agent walkthrough (NOT YET EXECUTED) | `docs/prompts/chef-bob-agent.md`                            | ~1,100 actions cataloged. Zero days completed.                                                                        |
| 2   | Client Joy    | Client (home dinner host)    | 2026-04         | ~65/100 (estimated from dimension scores) | 6-phase agent walkthrough (COMPLETED)       | `reports/client-joy-validation/summary.md`                  | 26 bugs. Trust 7.7, Clarity 6.0, Speed 6.5, Delight 6.3. Quote acceptance = biggest trust gap. Hub terminology chaos. |
| 3   | Sophie Kaplan | Partner (hyper-engaged host) | 2026-04         | -- (design persona, not scored)           | Spec-driven evaluation                      | `docs/specs/sophie-kaplan-dinner-circle-control-surface.md` | All data exists in DB; gap is display/aggregation. 3 new components specced.                                          |
| 4   | (removed)     | Chef (grazing/artisan)       | 2026-04         | -- (not formally tested)                  | Real beta tester observation                | (removed)                                                   | Artisan food producer archetype. Needs e-commerce/public ordering. Social-to-order pipeline.                          |

### Research-Only Personas (Not Formally Tested)

These personas were studied in multi-persona research but never run through the stress test skill:

| Archetype                 | Type   | Research File                                                          | Key Finding                                         | Worth Testing?             |
| ------------------------- | ------ | ---------------------------------------------------------------------- | --------------------------------------------------- | -------------------------- |
| Private Chef (Solo)       | Chef   | `docs/research/2026-04-04-chef-persona-workflow-research.md`           | Primary target. Strong fit.                         | YES (Bob covers this)      |
| Personal/Family Chef      | Chef   | Same                                                                   | Weekly meal prep focus, distinct from event-based   | YES                        |
| Executive Chef            | Chef   | Same                                                                   | NOT ChefFlow's target (venue/POS-centric)           | NO (out of scope)          |
| Sous Chef                 | Chef   | Same                                                                   | NOT a ChefFlow user (zero business tool engagement) | NO (out of scope)          |
| Meal Prep Specialist      | Chef   | Same                                                                   | Batch cooking, delivery logistics gap               | YES                        |
| Farm-to-Table Chef        | Chef   | Same                                                                   | Seasonal menus, supplier CRM gap                    | YES                        |
| Luxury/Estate Chef        | Chef   | Same                                                                   | "House book" per venue, never-repeat-dish           | YES                        |
| Small Business Chef (2-5) | Chef   | `docs/research/2026-04-04-chef-roles-and-business-size-workflows.md`   | Staff scheduling + payroll needs                    | YES                        |
| Wedding Client            | Client | `docs/research/2026-04-04-client-guest-and-user-maturity-workflows.md` | High anxiety, long lead time, vendor coordination   | YES                        |
| Corporate Planner         | Client | Same                                                                   | Structured planning brief needed earlier            | YES                        |
| Repeat Customer           | Client | Same                                                                   | "Don't make me repeat myself"                       | YES (Joy partially covers) |
| First-Time Booker         | Client | Same                                                                   | Step-by-step guidance, price transparency           | YES                        |
| Dinner Guest              | Guest  | Same                                                                   | Dietary safety, clear labeling                      | YES                        |

---

## Gap Inventory

Unique gaps discovered across all persona work (formal + informal):

| #   | Gap                                                         | Found By   | Scope        | Status     |
| --- | ----------------------------------------------------------- | ---------- | ------------ | ---------- |
| 1   | Quote acceptance trust gap (phantom terms, no confirmation) | Client Joy | REFINE       | Open       |
| 2   | Client portal uses B2B dashboard language                   | Client Joy | REFINE       | Open       |
| 3   | Hub terminology chaos (6+ labels for overlapping concepts)  | Client Joy | REFINE       | Open       |
| 4   | Re-booking ignores returning client data (no pre-fill)      | Client Joy | EXPAND       | Open       |
| 5   | No vendor portal or purchase order surface                  | Research   | EXPAND       | Open       |
| 6   | No delivery tracking for meal prep                          | Research   | EXPAND       | Open       |
| 7   | No e-commerce/public ordering for artisan producers         | Tester #4  | OUT-OF-SCOPE | Documented |
| 8   | Dinner Circle host control surface insufficient             | Sophie     | EXPAND       | Specced    |
| 9   | No BEO generation for catering                              | Research   | OUT-OF-SCOPE | Documented |
| 10  | No supplier CRM for farm-to-table sourcing                  | Research   | EXPAND       | Open       |

---

## Saturation Status

```
Total personas formally tested:  1 (Joy)
Total personas defined:          4 (Bob, Joy, Sophie, Tester #4)
Research personas cataloged:     13
Unique gaps found:               10
New gaps per persona (avg):      -- (insufficient data)
Saturation estimate:             LOW (need 10+ formal tests)
```

---

## Recommended Next Tests (Priority Order)

Based on coverage gaps and expected ROI:

1. **Chef Bob** (already defined, never executed) - would validate the entire chef-side surface
2. **Wedding Client** - highest-stakes client type, long engagement cycle, most likely to expose trust/communication gaps
3. **Meal Prep Specialist** - different business model from event-based chefs, would stress the recurring service path
4. **Dinner Guest** - completely untested persona type, uses Hub/public surfaces
5. **Farm Co-Host** - untested partner type, would stress Circles/co-hosting features
6. **Vendor (Specialty Purveyor)** - zero vendor surface exists; would quantify the gap

---

_Last updated: 2026-04-25_
_Next update: after next `/persona-stress-test` run_
