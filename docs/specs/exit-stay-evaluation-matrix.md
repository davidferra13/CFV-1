# Exit/Stay Evaluation Matrix

> **Status:** Draft canonical matrix
> **Date:** 2026-05-25
> **Purpose:** Evaluate every ChefFlow exit scenario and every never-leaves claim with one shared contract.
> **Skills:** `.agents/skills/exit-scenario-round-trip/SKILL.md` and `.agents/skills/never-leaves-proof-ledger/SKILL.md`

---

## Why This Exists

ChefFlow needs two complementary audits:

1. **Exit audit:** If a user leaves ChefFlow, did the product make the trip context-rich, low-friction, and lossless?
2. **Stay audit:** If ChefFlow claims the user never leaves, can the user actually complete, recover, verify, and remember the workflow in-app?

The exit is not the failure. The failure is no context, no return path, no capture point, or a false stay claim.

---

## Canonical Treatments

| Treatment      | Meaning                                                   | Success Standard                                           |
| -------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| Source it      | The external tool is only a data source                   | ChefFlow pulls the needed slice into the right surface     |
| Automate it    | ChefFlow has enough context to complete or draft the work | User approves instead of manually assembling               |
| Bridge it      | The external tool stays external                          | ChefFlow preloads the exit and captures what returns       |
| Permanent exit | The outside ecosystem is the true destination             | ChefFlow creates a clean door out and a lossless door back |

## Stay Verdicts

| Verdict           | Meaning                                                              |
| ----------------- | -------------------------------------------------------------------- |
| Proven in-app     | Route, action, data, state, permissions, recovery, and proof exist   |
| Partially in-app  | Some steps exist, but the workflow still leaks                       |
| Visually present  | UI exists, but action/data/state is missing or not trusted           |
| Aspirational      | The workflow is described but no credible app surface is proven      |
| Should be an exit | The outside ecosystem is legitimate and should move to exit handling |

---

## Canonical Matrix Template

| Field                  | Required Answer                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Canonical ID           | Stable ID, e.g. `chef-exit-058`, `client-stay-231`                                                                   |
| Source doc ID          | Original numbered item and document                                                                                  |
| Role scope             | chef, client, guest, staff, vendor, partner, admin                                                                   |
| Scenario or stay claim | Human-readable workflow                                                                                              |
| Current label          | Permanent, reducible, bridgeable, or never-leaves claim                                                              |
| Exit treatment         | Source it, automate it, bridge it, permanent exit, or none                                                           |
| Stay verdict           | Proven in-app, partially in-app, visually present, aspirational, should be an exit, or not applicable                |
| ChefFlow already knows | Relevant context already in the system                                                                               |
| User needs             | Full external tool, narrow data slice, communication channel, financial rail, legal authority, physical-world action |
| Default surface        | First place this should appear                                                                                       |
| Shared surface         | Dinner Circle, client portal, guest portal, staff brief, Remy email, event packet, recap, or none                    |
| Progressive disclosure | Quiet glance, expanded detail, deep tabs, advanced path                                                              |
| Outbound handoff       | Deep link, native link, prefilled search, message, clipboard, export, packet, QR/share card                          |
| Inbound capture        | Structured fact, note, price pin, call summary, vendor memory, payment log, document, timeline entry                 |
| Return path            | Where the user lands and what next action is waiting                                                                 |
| What disappears        | Text, search, spreadsheet, duplicate entry, manual calculation, support question, lost note                          |
| Proof needed           | Route, component, action, data source, auth/tenant scope, state coverage, runtime check, screenshot, test            |
| Priority               | P0/P1/P2/P3 with reason                                                                                              |

---

## Seed Evaluation: 10 Mixed Scenarios

| Canonical ID    | Source doc ID                        | Role scope                                          | Scenario or stay claim                        | Current label                                        | Exit treatment                                         | Stay verdict                                                                           | ChefFlow already knows                                                                       | Default surface             | Shared surface                                                                | Outbound handoff                                            | Inbound capture                                                                     | What disappears                                                       | Proof needed                                                                                           | Priority                                |
| --------------- | ------------------------------------ | --------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| chef-exit-058   | `chef-exit-points-analysis.md` #58   | chef, client                                        | Check weather for outdoor event               | Bridgeable, reclassified reducible                   | Source it                                              | Aspirational/spec-ready until wired                                                    | Event date, time, venue address, event type, client-facing event page                        | Event detail weather widget | Dinner Circle header, client portal, Remy confirmation email                  | Full forecast link only as fallback                         | Weather snapshot on event timeline, weather-risk note                               | Weather.com visit, "what's the weather?" client text                  | Open-Meteo fetch, event widget, Dinner Circle glance, stale/error state, screenshot                    | P0: proven weather-style exemplar       |
| client-exit-075 | `client-exit-points-analysis.md` #75 | client, guest                                       | Check weather for outdoor event               | Bridgeable                                           | Source it                                              | Aspirational/spec-ready until wired                                                    | Event date, venue address, start time, outdoor/venue notes                                   | Client portal event header  | Dinner Circle header, guest portal, Remy email                                | Weather app link only for radar/deep curiosity              | Client-visible weather acknowledgement or event note                                | Host/client weather text to chef                                      | Client route rendering, token-safe weather data, no PII leak, mobile screenshot                        | P0: client anxiety reducer              |
| chef-exit-090   | `chef-exit-points-analysis.md` #90   | chef, client, staff                                 | Check parking/loading dock logistics at venue | Bridgeable                                           | Bridge it, partially source it if venue profile exists | Partially in-app if event access fields exist                                          | Venue address, event date, chef vehicle/staff needs, venue notes, client/home access details | Event logistics panel       | Client portal access card, staff brief                                        | Google Maps/Street View link prefilled with venue address   | Venue profile fields: parking, loading dock, elevator, code, contact, last verified | Street View search, venue call memory loss, repeated access questions | Event logistics fields, role-scoped sensitive access, Maps deep link, staff/client visibility controls | P0: high day-of risk                    |
| client-exit-068 | `client-exit-points-analysis.md` #68 | client, chef, staff                                 | Share home access details                     | Reducible                                            | Automate it                                            | Partially in-app if secure access fields exist                                         | Client address, event, assigned chef/staff, portal identity                                  | Client event prep checklist | Chef event logistics, staff brief                                             | SMS/email fallback only when portal blocked                 | Secure event access instruction with audit/history                                  | Sensitive access text thread, copied codes, lost instructions         | Auth-gated field, tenant scope, redaction, edit history, expiration/revocation state                   | P0: security-sensitive                  |
| chef-exit-074   | `chef-exit-points-analysis.md` #74   | chef                                                | Scale recipe from 4 to 40 servings            | Reducible                                            | Automate it                                            | Claimed in-app by `chef-never-leaves-analysis.md` #39; proof required                  | Recipe ingredients, yields, serving count, units                                             | Recipe detail/editor        | Shopping list, menu editor                                                    | None unless export recipe is needed                         | Scaled recipe version and event-specific quantity snapshot                          | Calculator/spreadsheet scaling                                        | Scaling action, non-linear ingredient warnings, undo, test cases                                       | P1: small build, frequent use           |
| chef-exit-075   | `chef-exit-points-analysis.md` #75   | chef                                                | Convert units                                 | Reducible                                            | Source it/automate it                                  | Gap unless quantity converter is proven                                                | Ingredient quantity, unit, recipe context, chef unit preference                              | Inline quantity field       | Recipe print/export, shopping list                                            | None unless user opens source reference                     | Preferred unit conversion stored per view/profile                                   | Google unit conversion                                                | Unit conversion utility, density-aware mappings, visible affordance, regression tests                  | P1: tiny repeated friction              |
| chef-exit-023   | `chef-exit-points-analysis.md` #23   | chef, staff, client when safety reassurance matters | Verify food safety temps/times                | Reducible                                            | Source it                                              | Partially in-app if temp logging exists; reference lookup still needs proof            | Recipe proteins, cooking method, event service style, holding plan                           | Recipe/prep safety panel    | Staff brief, event packet if client-visible safety reassurance is appropriate | FDA/ServSafe link as fallback                               | Safety reference attached to recipe/event prep notes                                | Google/FDA search mid-prep                                            | Static reference source, search, recipe matching, disclaimer, stale-data policy                        | P1: tiny static reference, high trust   |
| chef-exit-038   | `chef-exit-points-analysis.md` #38   | chef, client                                        | Check if client payment cleared               | Reducible                                            | Source it/automate it                                  | Claimed in-app by `chef-never-leaves-analysis.md` #115; proof required                 | Invoice, Stripe payment intent, event, client, due date                                      | Event financial summary     | Client portal payment status                                                  | Stripe dashboard link as fallback                           | Payment status timeline entry, webhook audit                                        | Stripe dashboard visit, "did deposit clear?" check                    | Webhook-backed status, stale webhook state, auth, client-safe display, route check                     | P1: per-event confidence                |
| client-exit-054 | `client-exit-points-analysis.md` #54 | client, guest, chef                                 | Collect dietary restrictions                  | Reducible                                            | Automate it                                            | Claimed in-app by `client-never-leaves-analysis.md` #231 and chef #337; proof required | Event, guest list, dietary schema, allergies, reminders, portal tokens                       | Guest RSVP/dietary link     | Chef guest rollup, client portal, staff brief                                 | Shareable no-login dietary link                             | Guest dietary response, confidence/follow-up status                                 | Google Forms, texts, spreadsheet chasing                              | Token flow, validation, reminders, chef rollup, allergy severity, edit/resubmit state                  | P0: removes host chasing                |
| client-exit-027 | `client-exit-points-analysis.md` #27 | client, chef                                        | Text the chef directly                        | Permanent communication channel, reducible confusion | Bridge it                                              | Claimed in-app by `client-never-leaves-analysis.md` #85-87; trust proof required       | Client, event, message context, unread state, notification prefs                             | Event conversation thread   | Chef inbox, client portal, Remy summary                                       | SMS deep link with event-prefilled message only as fallback | Message summary/call note tied to event                                             | Contextless texts, lost decisions, duplicate questions                | Portal messaging proof, notification proof, SMS fallback capture, mobile route check                   | P0: highest-frequency relationship leak |

---

## Immediate High-Leverage Batch

1. **Weather dual-surface proof**: `chef-exit-058` and `client-exit-075` share one data source and should prove the pattern.
2. **Event logistics/access spine**: `chef-exit-090` and `client-exit-068` share sensitive event logistics, but need strict role visibility.
3. **Guest dietary autopilot**: `client-exit-054` removes host chasing and feeds chef/staff execution.
4. **Communication capture**: `client-exit-027` accepts that SMS exists while making the return path lossless.
5. **Culinary reference quick wins**: `chef-exit-074`, `chef-exit-075`, and `chef-exit-023` are small, frequent, and should be easy to prove.

---

## Open Reconciliation Questions

1. The repo currently has count drift: chef exit docs refer to 95 scenarios, companion specs mention 91, and never-leaves docs have their own counts. A canonical ID map should resolve this before the full audit.
2. The matrix should eventually cover chef, client, staff, vendor, and partner docs, not only chef/client.
3. Each seeded stay verdict above is a planning verdict, not runtime proof. It must be checked against code/routes before moving to "proven in-app."
