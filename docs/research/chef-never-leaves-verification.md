# Chef-Never-Leaves Verification Audit

> **Date:** 2026-05-25
> **Source:** Cross-referenced chef-never-leaves-analysis.md (353 workflows) against actual codebase
> **Method:** 3 parallel agents audited routes, server actions, components, and test coverage

---

## Executive Summary

| Status       | Count | %     | Definition                                                         |
| ------------ | ----- | ----- | ------------------------------------------------------------------ |
| **VERIFIED** | 5     | 1.4%  | Route + server action + evidence of real usage or passing e2e test |
| **EXISTS**   | 334   | 94.6% | Code/route present, no end-to-end verification                     |
| **PLANNED**  | 14    | 4.0%  | Spec'd only, partially coded, or clearly non-functional backend    |

**Real coverage ratio:** Not 85/15. Closer to 1.4% verified / 94.6% unverified / 4% aspirational.

The original doc's 85% claim counts "code exists" as "workflow works." Those are different things. 713 chef routes exist. 5 have been proven to work end-to-end.

---

## The 5 Verified Workflows

| #    | Workflow                      | Evidence                                                                                                             |
| ---- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 96   | Gmail sync + platform parsing | OAuth flow, 10+ platform parsers (Cozymeal, GigSalad, Bark, etc.), sync engine, historical scan, active session logs |
| ~232 | Remy AI chat                  | Streaming works, multiple test files, actively used in dev sessions                                                  |
| ~102 | AI inquiry draft generation   | lib/ai/draft-actions.ts, tested via Remy integration                                                                 |
| ~49  | PIE pricing intelligence      | 15-tier resolution, lib/pricing/ actively queried, data pipeline functional                                          |
| ~36  | Recipe parsing (brain dump)   | lib/ai/parse-brain-dump.ts, Remy pipeline, tested in sessions                                                        |

---

## The 14 Planned-Only Workflows

| #   | Workflow                                    | Evidence                                      |
| --- | ------------------------------------------- | --------------------------------------------- |
| 31  | Tasting menu builder hub                    | No dedicated route found                      |
| 85  | Related client linking (spouse/assistant)   | Referenced, no lib for relationship types     |
| 95  | NDA management                              | lib/ files exist, no dedicated UI             |
| 174 | DOP (Day-of-Production) mobile timer system | Route exists, real-time timer backend unclear |
| 299 | Community feed                              | Route exists, zero users = zero community     |
| 300 | Chef Q&A knowledge sharing                  | Route exists, no community                    |
| 301 | Recipe exchange marketplace                 | Route exists, no participants                 |
| 302 | Mentorship matching                         | Route exists, no participants                 |
| 303 | Local chef network                          | Route exists, no participants                 |
| 304 | Collective purchasing groups                | Route exists, no participants                 |
| 305 | Referral marketplace                        | Route exists, no participants                 |
| 306 | Chef Opportunity Network                    | Route exists, no participants                 |
| 307 | Peer event critique                         | Route exists, no participants                 |
| 308 | Industry benchmarking (anonymous)           | Route exists, no participants                 |

Note: Community features (#299-308) classified as PLANNED because they require multiple users to function. Code exists but the feature is structurally impossible with one user.

---

## Category-by-Category Breakdown

### Category 1: Selling & Booking (#1-#15)

- **0 VERIFIED, 15 EXISTS, 0 PLANNED**
- Routes exist under inquiries/, calendar/, contracts/, events/
- Stripe integration deep (9 lib/stripe/ files, 50+ references)
- BUT: test coverage blueprint lists inquiry-to-booking lifecycle as P0 critical gap with NO behavioral tests
- Quote generation, proposal builder, contract signing all have code but zero e2e proof

### Category 2: Menu Planning & Design (#16-#34)

- **0 VERIFIED, 18 EXISTS, 1 PLANNED** (#31 tasting menu hub)
- culinary/menus/ routes present, lib/menus/ actions coded
- Menu creation/approval listed as P0 critical gap in test blueprint
- Allergen check, scaling, seasonal warnings all have lib/ implementations
- Menu Intelligence (11 toggleable sections) exists but untested

### Category 3: Recipe Management (#35-#48)

- **1 VERIFIED** (#36 brain dump parsing), **13 EXISTS, 0 PLANNED**
- Smart Import AI pipeline coded (parse-recipe.ts, import-actions.ts)
- Recipe save/edit listed as P0 critical gap in test blueprint
- Dish index, component library (sauces, stocks, garnishes) all have routes

### Category 4: Ingredients & Pricing / PIE (#49-#66)

- **1 VERIFIED** (#49 PIE pricing), **17 EXISTS, 0 PLANNED**
- PIE has 15+ lib/pricing/ files, actively queried
- BUT: PIE reliability is Exit #1 in the exit-points doc (contradicts "entirely in-app" claim)
- Receipt OCR pipeline coded but unverified end-to-end
- OpenClaw data pipeline has known infrastructure issues (Pi collapsed)

### Category 5: Client Management (#67-#95)

- **0 VERIFIED, 27 EXISTS, 2 PLANNED** (#85, #95)
- 30-panel CRM exists at clients/[id]/
- Loyalty program, gift cards, segments, duplicate detection all coded
- Client portal invitation system present
- No behavioral test coverage for any CRM workflow

### Category 6: Communication (#96-#112)

- **1 VERIFIED** (#96 Gmail sync), **16 EXISTS, 0 PLANNED**
- Gmail OAuth + sync + 10 platform parsers = strongest verified workflow
- Email campaigns (marketing/page.tsx) and drip sequences (sequences/) exist but: zero sends, no CAN-SPAM compliance testing, no deliverability verification
- Auto-response triggers coded, business hours config present

### Category 7: Finance & Money (#113-#140)

- **0 VERIFIED, 28 EXISTS, 0 PLANNED**
- Invoice generation, Stripe payments, refunds, expense tracking all coded
- Ledger (append-only, immutable) is architecturally sound
- 9 reporting sub-routes (P&L, tax, YTD, YoY, etc.)
- Invoice creation/payment listed as P0 critical gap in test blueprint
- Bank feed integration, contractor 1099s, retainers all have routes + actions

### Category 8: Event Operations Day-Of (#141-#164)

- **0 VERIFIED, 23 EXISTS, 1 PLANNED** (#174 mobile timer)
- events/[id]/ has extensive sub-routes (prep-list, timeline, equipment, shopping-list, etc.)
- Shopping list generation, prep list builder, timeline management all coded
- Day-of-production route exists, Kitchen Display System route exists
- No evidence of real event execution through the system

### Category 9: Post-Event Closeout (#165-#178)

- **0 VERIFIED, 14 EXISTS, 0 PLANNED**
- Feedback collection, photo gallery, financial reconciliation routes present
- Automatic post-event email triggers coded
- Client review request workflow exists
- Event archiving with full history preservation coded

### Category 10: Scheduling & Calendar (#179-#193)

- **0 VERIFIED, 15 EXISTS, 0 PLANNED**
- calendar/page.tsx + lib/calendar/actions.ts
- Availability management, travel time buffer, recurring events all coded
- Waitlist management, conflict detection present
- No test coverage for scheduling flows

### Category 11: Inventory & Shopping (#194-#214)

- **0 VERIFIED, 21 EXISTS, 0 PLANNED**
- inventory/ routes exist, lib/inventory/ actions coded
- Shopping list aggregation, par level alerts, waste tracking present
- Vendor management routes exist
- Pantry tracking, batch cooking inventory adjustment coded

### Category 12: Staff & Team (#215-#231)

- **0 VERIFIED, 17 EXISTS, 0 PLANNED**
- staff/ routes exist, lib/staff/ actions coded
- Delegation, availability, role assignment present
- Payroll tracking, certification monitoring coded
- Communication tools for team exist

### Category 13: AI & Remy Assistance (#232-#253)

- **2 VERIFIED** (Remy chat #232, inquiry drafts #102 counted in Cat 6), **20 EXISTS, 0 PLANNED**
- Remy chat streaming works, multiple test files
- Morning briefing, proactive alerts, intelligence actions all coded
- Menu suggestions, recipe scaling AI, allergen analysis present
- CIL (Continuous Intelligence Layer) built but no UI consumer yet

### Category 14: Analytics & Intelligence (#254-#281)

- **0 VERIFIED, 28 EXISTS, 0 PLANNED**
- analytics/ has extensive sub-routes (reconciliation, pipeline, intelligence, goals)
- Client LTV, revenue forecasting, seasonal patterns all coded
- Business health scoring, churn prediction, market positioning analysis present
- None verified with real data flowing through

### Category 15: Marketing & Growth (#282-#298)

- **0 VERIFIED, 17 EXISTS, 0 PLANNED**
- marketing/ routes exist (push-dinners, campaigns, sequences)
- Portfolio/showcase site builder present
- SEO tools, review management, referral tracking coded
- Brand mention monitoring exists as route

### Category 16: Community & Networking (#299-#308)

- **0 VERIFIED, 0 EXISTS, 10 PLANNED**
- All 10 require multiple users. Routes exist but features are structurally impossible as a single-user app
- Community feed, Q&A, recipe exchange, mentorship, referral marketplace all PLANNED

### Category 17: Compliance & Safety (#309-#320)

- **0 VERIFIED, 12 EXISTS, 0 PLANNED**
- Food safety, HACCP, certification tracking routes exist
- Insurance document management, tax compliance tools coded
- Allergen documentation, incident reporting present
- No verification of any compliance workflow

### Category 18: Onboarding & Import (#321-#334)

- **0 VERIFIED, 13 EXISTS, 1 PLANNED**
- Onboarding wizard route exists, lib/onboarding/ actions coded
- Data import (CSV, recipe bulk, calendar sync) present
- Account setup checklist, business profile builder coded
- Migration tools from other platforms partially built

### Category 19: Guest Experience (#335-#345)

- **0 VERIFIED, 11 EXISTS, 0 PLANNED**
- Client portal routes exist
- Guest dietary form, RSVP management present
- Event countdown, menu preview for guests coded
- Photo sharing, feedback collection routes exist

### Category 20: Daily Operations (#346-#353)

- **0 VERIFIED, 8 EXISTS, 0 PLANNED**
- Morning briefing dashboard coded (Remy integration)
- Today view, task management, quick actions present
- Daily revenue tracking, appointment reminder system coded

---

## Critical Contradictions with Original Doc

1. **PIE reliability** is listed as Exit Point #1 (users leave app for pricing) AND as in-app workflow #49-#66. Both can't be true simultaneously.

2. **Email campaigns** (#110-#112) claimed as "entirely in-app" but: has ChefFlow ever sent a real campaign? CAN-SPAM compliance? Unsubscribe handling? Deliverability testing?

3. **Community features** (#299-#308) claimed as in-app workflows but impossible with one user. These are infrastructure, not features.

4. **Kitchen Display System** (#145/related) claimed as in-app but: has a ticket ever been fired through it?

5. **85% ratio** should be recalculated as: 5 verified + ~180 probably-functional (based on code quality) + ~149 questionable + 14 planned + 64 exits = maybe 51% actually works / 49% unverified or planned.

---

## What This Means

The codebase is genuinely massive. 713 chef routes across 250+ lib domains is extraordinary for a solo-developed app. The SURFACE AREA is real.

But surface area without verification is technical debt, not product completeness. The shakedown manifest philosophy is exactly right: prove it works before claiming it works.

**Recommended next step:** Pick the 20 highest-value workflows (selling funnel, event lifecycle, finance basics) and do aggressive e2e verification. Going from 5 to 25 verified workflows would give honest confidence in the core product loop.

---

## Methodology Notes

- 3 parallel agents audited routes (app/), server actions (lib/), components (components/), and test coverage
- Cross-referenced against docs/test-coverage-blueprint.md for test gap identification
- "VERIFIED" bar intentionally high: requires evidence of real usage or passing integration test, not just "route loads"
- Community features classified as PLANNED due to structural impossibility (need multiple users)
- Some items near boundaries (PIE has real data flowing but pipeline reliability is questionable)
