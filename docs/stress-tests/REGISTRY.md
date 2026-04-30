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
| 10  | Chef Marco           | Chef (dinner series impresario)  | 2026-04-27      | 48/100 (HOSTILE)                          | Opus 4.6 full pipeline                             | `docs/stress-tests/persona-chef-marco-dinner-series-2026-04-27.md`          | No timed ticket drops (BLOCKER), no add-on checkout (BLOCKER). Drop engine confirmed cross-persona critical gap (Kai + Marco).            |
| 11  | Rafael Ionescu       | Chef (message-stream integrator) | 2026-04-28      | 53/100 (USABLE)                           | Codex evidence-based stress test                   | `docs/stress-tests/persona-rafael-ionescu-2026-04-28.md`                   | Communication-event foundations exist, but Rafael's canonical stream bar fails on full channel coverage, identity graph depth, explicit conversation FSM, and message-to-task/vendor projections. |
| 12  | Valentina Moreno     | Chef (Take a Chef power user)    | 2026-04-30      | 62/100 (USABLE)                           | Codex evidence-based stress test                   | `docs/stress-tests/persona-valentina-moreno-take-a-chef-power-user-2026-04-30.md` | ChefFlow is strong after TAC bookings are captured, but it is not yet a complete tandem system because TAC ingestion, pre-booking communication guardrails, and commission evidence need hardening. |

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

| #   | Gap                                                                    | Found By   | Scope        | Status     |
| --- | ---------------------------------------------------------------------- | ---------- | ------------ | ---------- |
| 1   | Quote acceptance trust gap (phantom terms, no confirmation)            | Client Joy | REFINE       | Open       |
| 2   | Client portal uses B2B dashboard language                              | Client Joy | REFINE       | Open       |
| 3   | Hub terminology chaos (6+ labels for overlapping concepts)             | Client Joy | REFINE       | Open       |
| 4   | Re-booking ignores returning client data (no pre-fill)                 | Client Joy | EXPAND       | Open       |
| 5   | No vendor portal or purchase order surface                             | Research   | EXPAND       | Open       |
| 6   | No delivery tracking for meal prep                                     | Research   | EXPAND       | Open       |
| 7   | No e-commerce/public ordering for artisan producers                    | Tester #4  | OUT-OF-SCOPE | Documented |
| 8   | Dinner Circle host control surface insufficient                        | Sophie     | EXPAND       | Specced    |
| 9   | No BEO generation for catering                                         | Research   | OUT-OF-SCOPE | Documented |
| 10  | No supplier CRM for farm-to-table sourcing                             | Research   | EXPAND       | Open       |
| 11  | No drop-release engine for high-demand event launches                  | Kai        | EXPAND       | Open       |
| 12  | No offline-first guarantee for mission-critical workflows              | Leo        | EXPAND       | Open       |
| 13  | No hard medical constraint enforcement engine                          | Rina       | EXPAND       | Open       |
| 14  | Hardcoded overhead % and labor rate in plate cost                      | Arthur     | REFINE       | Open       |
| 15  | No recipe/ingredient cost CSV export                                   | Arthur     | EXPAND       | Open       |
| 16  | No standalone ingredient price CSV import                              | Arthur     | EXPAND       | Open       |
| 17  | No inline formula audit trail on costing views                         | Arthur     | REFINE       | Open       |
| 18  | Confidence decay formula hidden from user                              | Arthur     | REFINE       | Open       |
| 19  | No native .xlsx import (CSV only)                                      | Arthur     | EXPAND       | Open       |
| 20  | No menu delegation to non-account third party (booker != decider)      | Megan      | EXPAND       | Open       |
| 21  | No client-facing group payment split view                              | Megan      | EXPAND       | Open       |
| 22  | No rental property logistics mode (plates, cleanup, kitchen unknown)   | Megan      | EXPAND       | Open       |
| 23  | Phone call agreements have no structured capture point                 | Megan      | EXPAND       | Open       |
| 24  | Surprise/secret tracking with no menu collision detection              | Megan      | EXPAND       | Open       |
| 25  | Referral trust context not surfaced post-inquiry on event detail       | Megan      | REFINE       | Open       |
| 26  | No ticket checkout add-ons (merch, wine pairings, experience upgrades) | Marco      | EXPAND       | Open       |
| 27  | No public audience signup / "notify me of future events"               | Marco      | EXPAND       | Open       |
| 28  | No consolidated cross-event prep / grocery view                        | Marco      | EXPAND       | Open       |
| 29  | Event series table exists but has no UI or server actions              | Marco      | EXPAND       | Open       |
| 30  | Venue management requires awkward "partner" creation                   | Marco      | EXPAND       | Open       |
| 31  | No series-level financial aggregation or theme P&L                     | Marco      | EXPAND       | Open       |
| 32  | No complete canonical event stream across SMS, email, and social DMs   | Rafael     | EXPAND       | Open       |
| 33  | Conversation state is triage-oriented, not an explicit workflow FSM    | Rafael     | EXPAND       | Open       |
| 34  | Message content does not create durable tasks and next actions         | Rafael     | EXPAND       | Open       |
| 35  | Vendor conversations are not first-class communication projections     | Rafael     | EXPAND       | Open       |
| 36  | Identity resolution lacks handles, confidence, conflicts, and reversals | Rafael     | EXPAND       | Open       |
| 37  | No complete automatic Take a Chef request/thread/proposal sync         | Valentina  | EXPAND       | Open       |
| 38  | TAC-origin pre-booking communication guardrails are not explicit       | Valentina  | REFINE       | Open       |
| 39  | TAC commission calculations need booking-specific evidence labels      | Valentina  | REFINE       | Open       |
| 40  | No single TAC event mirror across request, proposal, booking, payout, review, and transcript | Valentina | EXPAND | Open |
| 41  | Marketplace ROI copy assumes direct conversion instead of TAC-only operation | Valentina | REFINE | Open |
| 42  | No first-class TAC review lifecycle checkpoint                         | Valentina  | EXPAND       | Open       |

---

## Saturation Status

```
Total personas formally tested:  8 (Joy, Kai, Leo, Rina, Arthur, Megan, Marco, Rafael)
Total personas defined:          11 (Bob, Joy, Sophie, Tester #4, Kai, Leo, Rina, Arthur, Megan, Marco, Rafael)
Research personas cataloged:     13
Unique gaps found:               42
New gaps per persona (avg):      3.7 (Valentina: 6 new gaps, strongest duplicates with Rafael #32 and #34 on external-stream freshness and message-to-system bridge)
Saturation estimate:             MEDIUM (TAC-only marketplace operators expose a distinct integration-freshness risk; client/guest/vendor types still underrepresented)
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

_Last updated: 2026-04-30 (Valentina Moreno run)_
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
| david-chang | Chef | 2026-04-27 | 0/100 | local-ollama-v2 | [Report](persona-david-chang-2026-04-27.md) |
| mindy-weiss | Client | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-mindy-weiss-2026-04-27.md) |
| oprah-winfrey | Client | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-oprah-winfrey-2026-04-27.md) |
| emma-chamberlain | Guest | 2026-04-27 | 55/100 | local-ollama-v2 | [Report](persona-emma-chamberlain-2026-04-27.md) |
| ari-weinzweig | Vendor | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-ari-weinzweig-2026-04-27.md) |
| gail-simmons | Staff | 2026-04-27 | 68/100 | local-ollama-v2 | [Report](persona-gail-simmons-2026-04-27.md) |
| miley-cyrus | Guest | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-miley-cyrus-2026-04-27.md) |
| olajide-olatunji | Guest | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-olajide-olatunji-2026-04-27.md) |
| andrew-zimmern | Chef | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-andrew-zimmern-2026-04-27.md) |
| gordon-ramsay | Chef | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-gordon-ramsay-2026-04-27.md) |
| dean-deluca | Vendor | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-dean-deluca-2026-04-27.md) |
| joel-salatin | Vendor | 2026-04-27 | 68/100 | local-ollama-v2 | [Report](persona-joel-salatin-2026-04-27.md) |
| julia | Staff | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-julia-2026-04-27.md) |
| padma-lakshmi | Staff | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-padma-lakshmi-2026-04-27.md) |
| drew-nieporent | Partner | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-drew-nieporent-2026-04-27.md) |
| francis-mallmann | Partner | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-francis-mallmann-2026-04-27.md) |
| ina-garten | Chef | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-ina-garten-2026-04-27.md) |
| elara-chen | Public | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-elara-chen-2026-04-27.md) |
| phil-rosenthal | Public | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-phil-rosenthal-2026-04-27.md) |
| dan-barber | Chef | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-dan-barber-2026-04-27.md) |
| jose-andres | Chef | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-jose-andres-2026-04-27.md) |
| colin-cowie | Client | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-colin-cowie-2026-04-27.md) |
| shawn-carter | Client | 2026-04-27 | 60/100 | local-ollama-v2 | [Report](persona-shawn-carter-2026-04-27.md) |
| jimmy-donaldson | Guest | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-jimmy-donaldson-2026-04-27.md) |
| jean | Vendor | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-jean-2026-04-27.md) |
| lidia-bastianich | Vendor | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-lidia-bastianich-2026-04-27.md) |
| fred-sirieix | Staff | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-fred-sirieix-2026-04-27.md) |
| grant-achatz | Staff | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-grant-achatz-2026-04-27.md) |
| alice-waters | Chef | 2026-04-27 | 50/100 | local-ollama-v2 | [Report](persona-alice-waters-2026-04-27.md) |
| jim-denevan | Partner | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-jim-denevan-2026-04-28.md) |
| keith-mcnally | Partner | 2026-04-28 | 64/100 | local-ollama-v2 | [Report](persona-keith-mcnally-2026-04-28.md) |
| eleanor-vance | Public | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-eleanor-vance-2026-04-28.md) |
| samin-nosrat | Public | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-samin-nosrat-2026-04-28.md) |
| david-beckham | Client | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-david-beckham-2026-04-28.md) |
| david-tutera | Client | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-david-tutera-2026-04-28.md) |
| richard-keithiah-towers | Guest | 2026-04-28 | 75/100 | local-ollama-v2 | [Report](persona-richard-keithiah-towers-2026-04-28.md) |
| woody-harrelson | Guest | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-woody-harrelson-2026-04-28.md) |
| mario | Vendor | 2026-04-28 | 56/100 | local-ollama-v2 | [Report](persona-mario-2026-04-28.md) |
| antoine-dubois | Staff | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-antoine-dubois-2026-04-28.md) |
| ted-allen | Staff | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-ted-allen-2026-04-28.md) |
| stephen-starr | Partner | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-stephen-starr-2026-04-28.md) |
| anthony-bourdain | Public | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-anthony-bourdain-2026-04-28.md) |
| bryan-rafanelli | Client | 2026-04-28 | 76/100 | local-ollama-v2 | [Report](persona-bryan-rafanelli-2026-04-28.md) |
| andrea-drummer | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-andrea-drummer-2026-04-28.md) |
| andrea-reusing | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-andrea-reusing-2026-04-28.md) |
| antonio | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-antonio-2026-04-28.md) |
| martha-stewart | Client | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-martha-stewart-2026-04-28.md) |
| daphne-oz | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-daphne-oz-2026-04-28.md) |
| daphne-oz | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-daphne-oz-2026-04-28.md) |
| eddie-huang | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-eddie-huang-2026-04-28.md) |
| dominique-ansel | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-dominique-ansel-2026-04-28.md) |
| giada-de-laurentiis | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-giada-de-laurentiis-2026-04-28.md) |
| jacques-pepin | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-jacques-pepin-2026-04-28.md) |
| sean-brock | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-sean-brock-2026-04-28.md) |
| tiffani | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-tiffani-2026-04-28.md) |
| kanye-west | Guest | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-kanye-west-2026-04-28.md) |
| zooey | Guest | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-zooey-2026-04-28.md) |
| leah-penniman | Vendor | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-leah-penniman-2026-04-28.md) |
| mario-batali | Vendor | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-mario-batali-2026-04-28.md) |
| tom-colicchio | Staff | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-tom-colicchio-2026-04-28.md) |
| danny-meyer | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-danny-meyer-2026-04-28.md) |
| woody | Guest | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-woody-2026-04-28.md) |
| will-guidara | Partner | 2026-04-28 | 60/100 | local-ollama-v2 | [Report](persona-will-guidara-2026-04-28.md) |
| sarah-chen | Public | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-sarah-chen-2026-04-28.md) |
| julian | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-julian-2026-04-28.md) |
| gwyneth-paltrow | Client | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-gwyneth-paltrow-2026-04-28.md) |
| preston-bailey | Client | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-preston-bailey-2026-04-28.md) |
| novak-djokovic | Guest | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-novak-djokovic-2026-04-28.md) |
| todd-english | Vendor | 2026-04-28 | 68/100 | local-ollama-v2 | [Report](persona-todd-english-2026-04-28.md) |
| mike-lata | Partner | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-mike-lata-2026-04-28.md) |
| charlotte-vance | Public | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-charlotte-vance-2026-04-28.md) |
| jay | Client | 2026-04-28 | 75/100 | local-ollama-v2 | [Report](persona-jay-2026-04-28.md) |
| hailey | Guest | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-hailey-2026-04-28.md) |
| venus-williams | Guest | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-venus-williams-2026-04-28.md) |
| eliot-coleman | Vendor | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-eliot-coleman-2026-04-28.md) |
| leo | Staff | 2026-04-28 | 65/100 | local-ollama-v2 | [Report](persona-leo-2026-04-28.md) |
| jackson | Public | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-jackson-2026-04-28.md) |
| elias-vance | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-elias-vance-2026-04-28.md) |
| gordon | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-gordon-2026-04-28.md) |
| charli-damelio | Guest | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-charli-damelio-2026-04-28.md) |
| zooey-deschanel | Guest | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-zooey-deschanel-2026-04-28.md) |
| erin-french | Partner | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-erin-french-2026-04-28.md) |
| arthur | Public | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-arthur-2026-04-28.md) |
| shawn-richard-carter | Client | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-shawn-richard-carter-2026-04-28.md) |
| alex-chen | Public | 2026-04-28 | 84/100 | local-ollama-v2 | [Report](persona-alex-chen-2026-04-28.md) |
| theodore | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-theodore-2026-04-28.md) |
| alec | Staff | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-alec-2026-04-28.md) |
| robert-bob-hayes | Staff | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-robert-bob-hayes-2026-04-28.md) |
| eliza-chen | Public | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-eliza-chen-2026-04-28.md) |
| hailey-bieber | Guest | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-hailey-bieber-2026-04-28.md) |
| kajetan | Staff | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-kajetan-2026-04-28.md) |
| marcus | Staff | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-marcus-2026-04-28.md) |
| jamie | Public | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-jamie-2026-04-28.md) |
| eleanor | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-eleanor-2026-04-28.md) |
| richard-ksi-kyle | Guest | 2026-04-28 | 65/100 | local-ollama-v2 | [Report](persona-richard-ksi-kyle-2026-04-28.md) |
| stefano-rossi | Vendor | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-stefano-rossi-2026-04-28.md) |
| jacques | Staff | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-jacques-2026-04-28.md) |
| the-enthusiast | Public | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-the-enthusiast-2026-04-28.md) |
| jessica-chen | Client | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-jessica-chen-2026-04-28.md) |
| madison | Guest | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-madison-2026-04-28.md) |
| elias-thorne | Public | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-elias-thorne-2026-04-28.md) |
| alex | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-alex-2026-04-28.md) |
| danny-meyer | Partner | 2026-04-28 | 44/100 | local-ollama-v2 | [Report](persona-danny-meyer-2026-04-28.md) |
| julia-child | Staff | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-julia-child-2026-04-28.md) |
| andrew-zimmern | Public | 2026-04-28 | 78/100 | local-ollama-v2 | [Report](persona-andrew-zimmern-2026-04-28.md) |
| alice | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-alice-2026-04-28.md) |
| adrian-kessler | Chef | 2026-04-28 | 92/100 | local-ollama-v2 | [Report](persona-adrian-kessler-2026-04-28.md) |
| elias-vantrell | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-elias-vantrell-2026-04-28.md) |
| marco-belleni | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-marco-belleni-2026-04-28.md) |
| ronan-vale | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-ronan-vale-2026-04-28.md) |
| aiden-clarke | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-aiden-clarke-2026-04-28.md) |
| aaron-deluca | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-aaron-deluca-2026-04-28.md) |
| caleb-arman-2 | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-caleb-arman-2-2026-04-28.md) |
| andre-costa | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-andre-costa-2026-04-28.md) |
| caleb-arman | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-caleb-arman-2026-04-28.md) |
| caleb-arman | Chef | 2026-04-28 | 73/100 | local-ollama-v2 | [Report](persona-caleb-arman-2026-04-28.md) |
| adrian-solis-2 | Chef | 2026-04-28 | 0/100 | local-ollama-v2 | [Report](persona-adrian-solis-2-2026-04-28.md) |
| dominic-reyes | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-dominic-reyes-2026-04-28.md) |
| adrian-solis | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-adrian-solis-2026-04-28.md) |
| christina-tosi | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-christina-tosi-2026-04-28.md) |
| dorian-hale-2 | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-dorian-hale-2-2026-04-28.md) |
| dorian-hale-2 | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-dorian-hale-2-2026-04-28.md) |
| dorian-hale | Chef | 2026-04-28 | 52/100 | local-ollama-v2 | [Report](persona-dorian-hale-2026-04-28.md) |
| dorian-hale | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-dorian-hale-2026-04-28.md) |
| dorian-hale | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-dorian-hale-2026-04-28.md) |
| evan-calder | Chef | 2026-04-28 | 0/100 | local-ollama-v2 | [Report](persona-evan-calder-2026-04-28.md) |
| evan-carter | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-evan-carter-2026-04-28.md) |
| evan-carter | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-evan-carter-2026-04-28.md) |
| evan-morales | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-evan-morales-2026-04-28.md) |
| evan-morales | Chef | 2026-04-28 | 52/100 | local-ollama-v2 | [Report](persona-evan-morales-2026-04-28.md) |
| elias-vance | Chef | 2026-04-28 | 76/100 | local-ollama-v2 | [Report](persona-elias-vance-2026-04-28.md) |
| jisoo-han-2 | Chef | 2026-04-28 | 0/100 | local-ollama-v2 | [Report](persona-jisoo-han-2-2026-04-28.md) |
| jisoo-han | Chef | 2026-04-28 | 76/100 | local-ollama-v2 | [Report](persona-jisoo-han-2026-04-28.md) |
| jisoo-han | Chef | 2026-04-28 | 60/100 | local-ollama-v2 | [Report](persona-jisoo-han-2026-04-28.md) |
| john-smith | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-john-smith-2026-04-28.md) |
| john-smith | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-john-smith-2026-04-28.md) |
| julian-mercer-2 | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-julian-mercer-2-2026-04-28.md) |
| julien-marchand | Chef | 2026-04-28 | 60/100 | local-ollama-v2 | [Report](persona-julien-marchand-2026-04-28.md) |
| julian-mercer | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-julian-mercer-2026-04-28.md) |
| landon-pierce-2 | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-landon-pierce-2-2026-04-28.md) |
| landon-pierce | Chef | 2026-04-28 | 84/100 | local-ollama-v2 | [Report](persona-landon-pierce-2026-04-28.md) |
| leon-arquette | Chef | 2026-04-28 | 0/100 | local-ollama-v2 | [Report](persona-leon-arquette-2026-04-28.md) |
| luca-moretti | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-luca-moretti-2026-04-28.md) |
| lucas-ardent | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-lucas-ardent-2026-04-28.md) |
| mateo-kova | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-mateo-kova-2026-04-28.md) |
| noah-bennett-2 | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-noah-bennett-2-2026-04-28.md) |
| marco-bellini | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-marco-bellini-2026-04-28.md) |
| marcus-vellaro | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-marcus-vellaro-2026-04-28.md) |
| noah-bennett | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-noah-bennett-2026-04-28.md) |
| noah-bennett | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-noah-bennett-2026-04-28.md) |
| noah-kessler | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-noah-kessler-2026-04-28.md) |
| rafael-ionescu | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-rafael-ionescu-2026-04-28.md) |
| rafael-dorne | Chef | 2026-04-28 | 75/100 | local-ollama-v2 | [Report](persona-rafael-dorne-2026-04-28.md) |
| tyler-quinn | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-tyler-quinn-2026-04-28.md) |
| rafael-ionescu-2 | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-rafael-ionescu-2-2026-04-28.md) |
| victor-hale-2 | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-victor-hale-2-2026-04-28.md) |
| aaron-vale | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-aaron-vale-2026-04-28.md) |
| adrian-kline | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-adrian-kline-2026-04-28.md) |
| victor-hale | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-victor-hale-2026-04-28.md) |
| adrian-volk | Chef | 2026-04-28 | 0/100 | local-ollama-v2 | [Report](persona-adrian-volk-2026-04-28.md) |
| veronica-sinclair | Client | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-veronica-sinclair-2026-04-28.md) |
| alina-brooks | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-alina-brooks-2026-04-28.md) |
| amara-stone | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-amara-stone-2026-04-28.md) |
| aaron-sanchez | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-aaron-sanchez-2026-04-28.md) |
| amelia-knox | Chef | 2026-04-28 | 72/100 | local-ollama-v2 | [Report](persona-amelia-knox-2026-04-28.md) |
| anika-rao | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-anika-rao-2026-04-28.md) |
| arjun-patel-2 | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-arjun-patel-2-2026-04-28.md) |
| arjun-patel-3 | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-arjun-patel-3-2026-04-28.md) |
| arjun-patel | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-arjun-patel-2026-04-28.md) |
| aaron-sanchez | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-aaron-sanchez-2026-04-28.md) |
| arlo-finch | Chef | 2026-04-28 | 50/100 | local-ollama-v2 | [Report](persona-arlo-finch-2026-04-28.md) |
| asha-patel | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-asha-patel-2026-04-29.md) |
| asha-patel | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-asha-patel-2026-04-29.md) |
| beckett-lane | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-beckett-lane-2026-04-29.md) |
| bennett-cruz | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-bennett-cruz-2026-04-29.md) |
| bennett-cruz | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-bennett-cruz-2026-04-29.md) |
| bianca-torres | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-bianca-torres-2026-04-29.md) |
| bianca-vale | Chef | 2026-04-29 | 64/100 | local-ollama-v2 | [Report](persona-bianca-vale-2026-04-29.md) |
| bianca-vale | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-bianca-vale-2026-04-29.md) |
| brennan-cole | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-brennan-cole-2026-04-29.md) |
| brennan-cole | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-brennan-cole-2026-04-29.md) |
| caleb-moore | Chef | 2026-04-29 | 70/100 | local-ollama-v2 | [Report](persona-caleb-moore-2026-04-29.md) |
| caleb-moore | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-caleb-moore-2026-04-29.md) |
| caleb-moss | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-caleb-moss-2026-04-29.md) |
| caleb-moss | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-caleb-moss-2026-04-29.md) |
| calla-stone | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-calla-stone-2026-04-29.md) |
| calla-stone | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-calla-stone-2026-04-29.md) |
| calvin-shore | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-calvin-shore-2026-04-29.md) |
| calvin-shore | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-calvin-shore-2026-04-29.md) |
| camille-hart | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-camille-hart-2026-04-29.md) |
| camille-hart | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-camille-hart-2026-04-29.md) |
| cedric-miles | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-cedric-miles-2026-04-29.md) |
| celeste-ng | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-celeste-ng-2026-04-29.md) |
| celeste-ng | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-celeste-ng-2026-04-29.md) |
| clara-weiss | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-clara-weiss-2026-04-29.md) |
| clara-weiss | Chef | 2026-04-29 | 76/100 | local-ollama-v2 | [Report](persona-clara-weiss-2026-04-29.md) |
| cora-bennett | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-cora-bennett-2026-04-29.md) |
| cora-bennett | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-cora-bennett-2026-04-29.md) |
| dante-rhodes | Chef | 2026-04-29 | 0/100 | local-ollama-v2 | [Report](persona-dante-rhodes-2026-04-29.md) |
| dante-ruiz | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-dante-ruiz-2026-04-29.md) |
| darius-cole | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-darius-cole-2026-04-29.md) |
| devon-hart | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-devon-hart-2026-04-29.md) |
| devin-alexander | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-devin-alexander-2026-04-29.md) |
| diego-rivas | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-diego-rivas-2026-04-29.md) |
| diego-rivas | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-diego-rivas-2026-04-29.md) |
| dominique-ansel | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-dominique-ansel-2026-04-29.md) |
| eli-stone | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-eli-stone-2026-04-29.md) |
| elian-price | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-elian-price-2026-04-29.md) |
| elias-hart | Chef | 2026-04-29 | 0/100 | local-ollama-v2 | [Report](persona-elias-hart-2026-04-29.md) |
| elliot-graves | Chef | 2026-04-29 | 0/100 | local-ollama-v2 | [Report](persona-elliot-graves-2026-04-29.md) |
| emeril-lagasse | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-emeril-lagasse-2026-04-29.md) |
| emil-novak | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-emil-novak-2026-04-29.md) |
| ethan-cole-2 | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-ethan-cole-2-2026-04-29.md) |
| ethan-cole | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-ethan-cole-2026-04-29.md) |
| ethan-pike | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-ethan-pike-2026-04-29.md) |
| evan-duarte | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-evan-duarte-2026-04-29.md) |
| ezra-fox | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-ezra-fox-2026-04-29.md) |
| carla-hall | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-carla-hall-2026-04-29.md) |
| fatima-noor | Chef | 2026-04-29 | 50/100 | local-ollama-v2 | [Report](persona-fatima-noor-2026-04-29.md) |
| felix-morgan | Chef | 2026-04-29 | 0/100 | local-ollama-v2 | [Report](persona-felix-morgan-2026-04-29.md) |
| frances-vale | Chef | 2026-04-29 | 0/100 | local-ollama-v2 | [Report](persona-frances-vale-2026-04-29.md) |
| gavin-moss | Chef | 2026-04-29 | 0/100 | local-ollama-v2 | [Report](persona-gavin-moss-2026-04-29.md) |
| giselle-park | Chef | 2026-04-29 | 0/100 | local-ollama-v2 | [Report](persona-giselle-park-2026-04-29.md) |
| graham-vale | Chef | 2026-04-29 | 0/100 | local-ollama-v2 | [Report](persona-graham-vale-2026-04-29.md) |
| greta-shaw | Chef | 2026-04-29 | 0/100 | local-ollama-v2 | [Report](persona-greta-shaw-2026-04-29.md) |
