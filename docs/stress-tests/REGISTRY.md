# Persona Stress Test Registry

> Persistent memory for the `/persona-stress-test` skill. Updated after every run.
> This file is checked at the start of every test to avoid redundant work and track progress.

---

## Coverage Heat Map

| Persona Type | Tested                                           | Untested Examples                                                                                                                                                                     |
| ------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chef**     | 5 (Bob defined; Kai, Leo, Rina, Arthur executed) | Meal prep specialist, catering lead, food truck, grazing artist, estate chef, cannabis chef, farm-to-table, personal/family chef, culinary instructor, food stylist, recipe developer |
| **Client**   | 1 (Joy - full 6-phase)                           | Wedding client, corporate planner, repeat customer, first-timer, family chef employer, vacation rental host, event coordinator, holiday party organizer                               |
| **Guest**    | 0                                                | Dinner guest, dietary-restricted guest, plus-one, child guest, VIP guest, guest with accessibility needs                                                                              |
| **Vendor**   | 0                                                | Ingredient supplier, specialty purveyor, farm/CSA, fishmonger, butcher, bakery, beverage distributor, equipment rental, linen service, cleaning service                               |
| **Staff**    | 0                                                | Sous chef, prep cook, line cook, pastry cook, server, bartender, kitchen manager, event captain, delivery driver, freelance cook                                                      |
| **Partner**  | 1 (Sophie - design persona)                      | Farm co-host, venue owner, referral partner, external event planner, photographer, sommelier, food blogger/influencer, culinary school, wedding planner                               |
| **Public**   | 0                                                | Google searcher, social media follower, word-of-mouth referral, food blog reader, local foodie, journalist/press                                                                      |

## Queue Status

```
Uncompleted: 0 files
Completed:   3 files
Failed:      0 files
```

---

## Persona Registry

| #   | Label                | Type                             | Date            | Score                                     | Method                                             | Report                                                                      | Key Finding                                                                                                                               |
| --- | -------------------- | -------------------------------- | --------------- | ----------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Chef Bob             | Chef (solo private)              | Defined 2026-04 | --                                        | 14-day agent walkthrough (NOT YET EXECUTED)        | `docs/prompts/chef-bob-agent.md`                                            | ~1,100 actions cataloged. Zero days completed.                                                                                            |
| 2   | Client Joy           | Client (home dinner host)        | 2026-04         | ~65/100 (estimated from dimension scores) | 6-phase agent walkthrough (COMPLETED)              | `reports/client-joy-validation/summary.md`                                  | 26 bugs. Trust 7.7, Clarity 6.0, Speed 6.5, Delight 6.3. Quote acceptance = biggest trust gap. Hub terminology chaos.                     |
| 3   | Sophie Kaplan        | Partner (hyper-engaged host)     | 2026-04         | -- (design persona, not scored)           | Spec-driven evaluation                             | `docs/specs/sophie-kaplan-dinner-circle-control-surface.md`                 | All data exists in DB; gap is display/aggregation. 3 new components specced.                                                              |
| 4   | (removed)            | Chef (grazing/artisan)           | 2026-04         | -- (not formally tested)                  | Real beta tester observation                       | (removed)                                                                   | Artisan food producer archetype. Needs e-commerce/public ordering. Social-to-order pipeline.                                              |
| 5   | Kai Donovan          | Chef (supper club drops)         | 2026-04-25      | 73/100                                    | Codex autonomous                                   | `docs/stress-tests/persona-kai-donovan-2026-04-25.md`                       | Strong core event fit, but drop releases, invite waves, and audience curation are not first-class.                                        |
| 6   | Leo Varga            | Chef (yacht/travel)              | 2026-04-25      | 68/100                                    | Codex autonomous                                   | `docs/stress-tests/persona-leo-varga-2026-04-25.md`                         | Connected operations are strong, but offline-first reliability and voyage provisioning are missing.                                       |
| 7   | Rina Solis           | Chef (medical constraints)       | 2026-04-25      | 62/100                                    | Codex autonomous                                   | `docs/stress-tests/persona-rina-solis-2026-04-25.md`                        | Planning is useful, but safety needs hard constraint enforcement and outcome tracking.                                                    |
| 8   | Arthur Klein         | Chef (Excel-driven precision)    | 2026-04-25      | 63/100                                    | Opus 4.6 full pipeline                             | `docs/stress-tests/persona-arthur-klein-excel-precision-chef-2026-04-25.md` | Hardcoded overhead %/labor rate in plate cost is a BLOCKER. Financial ledger + price provenance are strengths. No recipe cost CSV export. |
| 9   | Megan (Bachelorette) | Client (group coordinator/relay) | 2026-04-26      | 46/100 (HOSTILE)                          | Opus 4.6 full pipeline (from real call transcript) | `docs/stress-tests/persona-megan-referral-bachelorette-2026-04-26.md`       | System assumes booker = decision-maker. No menu delegation, no client-facing group split, no logistics capture for verbal agreements.     |

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

| #   | Gap                                                                  | Found By   | Scope        | Status     |
| --- | -------------------------------------------------------------------- | ---------- | ------------ | ---------- |
| 1   | Quote acceptance trust gap (phantom terms, no confirmation)          | Client Joy | REFINE       | Open       |
| 2   | Client portal uses B2B dashboard language                            | Client Joy | REFINE       | Open       |
| 3   | Hub terminology chaos (6+ labels for overlapping concepts)           | Client Joy | REFINE       | Open       |
| 4   | Re-booking ignores returning client data (no pre-fill)               | Client Joy | EXPAND       | Open       |
| 5   | No vendor portal or purchase order surface                           | Research   | EXPAND       | Open       |
| 6   | No delivery tracking for meal prep                                   | Research   | EXPAND       | Open       |
| 7   | No e-commerce/public ordering for artisan producers                  | Tester #4  | OUT-OF-SCOPE | Documented |
| 8   | Dinner Circle host control surface insufficient                      | Sophie     | EXPAND       | Specced    |
| 9   | No BEO generation for catering                                       | Research   | OUT-OF-SCOPE | Documented |
| 10  | No supplier CRM for farm-to-table sourcing                           | Research   | EXPAND       | Open       |
| 11  | No drop-release engine for high-demand event launches                | Kai        | EXPAND       | Open       |
| 12  | No offline-first guarantee for mission-critical workflows            | Leo        | EXPAND       | Open       |
| 13  | No hard medical constraint enforcement engine                        | Rina       | EXPAND       | Open       |
| 14  | Hardcoded overhead % and labor rate in plate cost                    | Arthur     | REFINE       | Open       |
| 15  | No recipe/ingredient cost CSV export                                 | Arthur     | EXPAND       | Open       |
| 16  | No standalone ingredient price CSV import                            | Arthur     | EXPAND       | Open       |
| 17  | No inline formula audit trail on costing views                       | Arthur     | REFINE       | Open       |
| 18  | Confidence decay formula hidden from user                            | Arthur     | REFINE       | Open       |
| 19  | No native .xlsx import (CSV only)                                    | Arthur     | EXPAND       | Open       |
| 20  | No menu delegation to non-account third party (booker != decider)    | Megan      | EXPAND       | Open       |
| 21  | No client-facing group payment split view                            | Megan      | EXPAND       | Open       |
| 22  | No rental property logistics mode (plates, cleanup, kitchen unknown) | Megan      | EXPAND       | Open       |
| 23  | Phone call agreements have no structured capture point               | Megan      | EXPAND       | Open       |
| 24  | Surprise/secret tracking with no menu collision detection            | Megan      | EXPAND       | Open       |
| 25  | Referral trust context not surfaced post-inquiry on event detail     | Megan      | REFINE       | Open       |

---

## Saturation Status

```
Total personas formally tested:  6 (Joy, Kai, Leo, Rina, Arthur, Megan)
Total personas defined:          9 (Bob, Joy, Sophie, Tester #4, Kai, Leo, Rina, Arthur, Megan)
Research personas cataloged:     13
Unique gaps found:               25
New gaps per persona (avg):      3.2 (Megan: 6 new gaps)
Saturation estimate:             MEDIUM (need 10+ formal tests, client-type underrepresented)
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

_Last updated: 2026-04-25 (Arthur Klein run)_
_Next update: after next `/persona-stress-test` run_
| 000-wp1-reliability-test-chef | Chef | 2026-04-26 | 0/100 | local-ollama-v2 | [Report](persona-000-wp1-reliability-test-chef-2026-04-26.md) |
| elena-ruiz | Chef | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-elena-ruiz-2026-04-26.md) |
| ethan-calder | Chef | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-ethan-calder-2026-04-26.md) |
| malik-johnson | Chef | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-malik-johnson-2026-04-26.md) |
| marcus-hale | Chef | 2026-04-26 | 76/100 | local-ollama-v2 | [Report](persona-marcus-hale-2026-04-26.md) |
| victor-hale-2 | Chef | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-victor-hale-2-2026-04-26.md) |
| victor-hale | Chef | 2026-04-26 | 80/100 | local-ollama-v2 | [Report](persona-victor-hale-2026-04-26.md) |
| alexander-davenport | Client | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-alexander-davenport-2026-04-26.md) |
| samantha-miller | Client | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-samantha-miller-2026-04-26.md) |
| samantha-green | Guest | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-samantha-green-2026-04-26.md) |
| tommy-thompson | Vendor | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-tommy-thompson-2026-04-26.md) |
| jordan-hale-cannabis-culinary-director-multi | Chef | 2026-04-26 | 35/100 | local-ollama-v2 | [Report](persona-jordan-hale-cannabis-culinary-director-multi-2026-04-26.md) |
| 000-wp1-reliability-test-chef | Chef | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-000-wp1-reliability-test-chef-2026-04-26.md) |
| alexander-davenport | Client | 2026-04-26 | 56/100 | local-ollama-v2 | [Report](persona-alexander-davenport-2026-04-26.md) |
| dr-julien-armand-michelin | Chef | 2026-04-26 | 40/100 | local-ollama-v2 | [Report](persona-dr-julien-armand-michelin-2026-04-26.md) |
| elena-ruiz | Chef | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-elena-ruiz-2026-04-26.md) |
| ethan-calder | Chef | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-ethan-calder-2026-04-26.md) |
| jordan-hale-cannabis-culinary-director-multi | Chef | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-jordan-hale-cannabis-culinary-director-multi-2026-04-26.md) |
| Kai Donovan | Chef | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-kai-donovan-2026-04-26.md) |
| Leo Varga | Chef | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-leo-varga-2026-04-26.md) |
| malik-johnson | Chef | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-malik-johnson-2026-04-26.md) |
| marcus-hale | Chef | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-marcus-hale-2026-04-26.md) |
| maya-rios-cannabis-pastry-chef-micro | Chef | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-maya-rios-cannabis-pastry-chef-micro-2026-04-26.md) |
| Noah Kessler | Chef | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-noah-kessler-2026-04-26.md) |
| Rina Solis | Chef | 2026-04-26 | 44/100 | local-ollama-v2 | [Report](persona-rina-solis-2026-04-26.md) |
| samantha-green | Guest | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-samantha-green-2026-04-26.md) |
| samantha-miller | Client | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-samantha-miller-2026-04-26.md) |
| tommy-thompson | Vendor | 2026-04-26 | 50/100 | local-ollama-v2 | [Report](persona-tommy-thompson-2026-04-26.md) |
| victor-hale-2 | Chef | 2026-04-26 | 68/100 | local-ollama-v2 | [Report](persona-victor-hale-2-2026-04-26.md) |
| victor-hale-2 | Chef | 2026-04-26 | 84/100 | local-ollama-v2 | [Report](persona-victor-hale-2-2026-04-26.md) |
| owen-miller | Chef | 2026-05-01 | 50/100 | local-ollama-v2 | [Report](persona-owen-miller-2026-05-01.md) |
| paloma-grant | Chef | 2026-05-01 | 50/100 | local-ollama-v2 | [Report](persona-paloma-grant-2026-05-01.md) |
| piper-wells | Chef | 2026-05-01 | 50/100 | local-ollama-v2 | [Report](persona-piper-wells-2026-05-01.md) |
| preeti-mistry | Chef | 2026-05-01 | 50/100 | local-ollama-v2 | [Report](persona-preeti-mistry-2026-05-01.md) |
| priya-desai | Chef | 2026-05-01 | 50/100 | local-ollama-v2 | [Report](persona-priya-desai-2026-05-01.md) |
| rachael-ray | Chef | 2026-05-01 | 56/100 | local-ollama-v2 | [Report](persona-rachael-ray-2026-05-01.md) |
| rafael-chen | Chef | 2026-05-01 | 50/100 | local-ollama-v2 | [Report](persona-rafael-chen-2026-05-01.md) |
| rafael-stone | Chef | 2026-05-01 | 50/100 | local-ollama-v2 | [Report](persona-rafael-stone-2026-05-01.md) |
| rafi-cohen | Chef | 2026-05-01 | 50/100 | local-ollama-v2 | [Report](persona-rafi-cohen-2026-05-01.md) |
| reed-calder | Chef | 2026-05-01 | 50/100 | local-ollama-v2 | [Report](persona-reed-calder-2026-05-01.md) |
| remy-clark | Chef | 2026-05-01 | 75/100 | local-ollama-v2 | [Report](persona-remy-clark-2026-05-01.md) |
| rhea-molina | Chef | 2026-05-01 | 0/100 | local-ollama-v2 | [Report](persona-rhea-molina-2026-05-01.md) |
| rhea-sandoval | Chef | 2026-05-01 | 50/100 | local-ollama-v2 | [Report](persona-rhea-sandoval-2026-05-01.md) |
| rina-vale | Chef | 2026-05-01 | 76/100 | local-ollama-v2 | [Report](persona-rina-vale-2026-05-01.md) |
| robert-irvine | Chef | 2026-05-01 | 50/100 | local-ollama-v2 | [Report](persona-robert-irvine-2026-05-01.md) |
| ronan-price | Chef | 2026-05-01 | 87/100 | local-ollama-v2 | [Report](persona-ronan-price-2026-05-01.md) |
