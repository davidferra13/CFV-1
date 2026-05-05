# Codex Build Queue (2026-05-05)

> Generated from spec inventory. Triage criteria: user-facing value, complexity, independence (can build without blocking on other specs), and relevance to V1 exit criteria.
>
> **Rule:** Codex works feature branches only. Never main. Claude Code merges.

---

## WAVE 1: Bug Fixes & Quick Wins (< 200 lines, independent, ship fast)

These are small, isolated, high-confidence tasks. Run in parallel.

| #   | Spec                                            | What                                       | Lines | Priority |
| --- | ----------------------------------------------- | ------------------------------------------ | ----- | -------- |
| 1   | `codex-client-ux-bug-sweep.md`                  | 3 client-facing UX bugs                    | 157   | P0       |
| 2   | `codex-fix-chat-empty-state.md`                 | Chat empty state wrong copy for clients    | ~100  | P0       |
| 3   | `codex-fix-dev-note-circles.md`                 | Remove dev note from public circles        | ~80   | P0       |
| 4   | `codex-fix-quote-phantom-terms.md`              | Remove phantom terms from quote acceptance | ~80   | P0       |
| 5   | `codex-fix-auto-join-consent.md`                | Add consent check before auto-join         | ~100  | P0       |
| 6   | `codex-fix-rebooking-prefill.md`                | Pre-fill rebooking from client profile     | ~100  | P1       |
| 7   | `arthur-klein-fix-3-costing-transparency-ui.md` | Confidence tooltip + formula toggle        | 160   | P1       |
| 8   | `arthur-klein-fix-1-configurable-plate-cost.md` | Configurable overhead % and labor rate     | 192   | P1       |
| 9   | `arthur-klein-fix-2-cost-csv-exports.md`        | Recipe/menu cost CSV exports               | ~180  | P1       |

**Codex instructions:** All 9 can run in parallel. Each is a single feature branch. No DB migrations.

---

## WAVE 2: Dinner Circles & Client Experience (core product value)

These directly improve the chef-client relationship loop.

| #   | Spec                                      | What                                       | Lines | Priority |
| --- | ----------------------------------------- | ------------------------------------------ | ----- | -------- |
| 10  | `codex-circle-approval-flow.md`           | One-pass circle approval flow              | ~200  | P0       |
| 11  | `codex-circle-reminder-cascade.md`        | Day-of notification cascade                | 155   | P0       |
| 12  | `codex-circle-event-broadcast.md`         | Event broadcast to circle members          | ~200  | P1       |
| 13  | `codex-consumer-upcoming-events.md`       | Consumer hub: upcoming events from circles | ~200  | P1       |
| 14  | `codex-post-dinner-circle-onramp.md`      | Post-dinner circle onramp                  | ~200  | P1       |
| 15  | `codex-handoff-context-enrichment.md`     | Handoff context from dinner circle         | 168   | P1       |
| 16  | `codex-collaborator-circle-bridge.md`     | Collaborator-to-circle bridge              | 174   | P1       |
| 17  | `codex-guest-preference-profile.md`       | Guest preference profile enhancement       | 177   | P2       |
| 18  | `codex-corporate-procurement-layer.md`    | Corporate procurement for circles          | ~250  | P2       |
| 19  | `crew-circles-build-spec.md`              | Crew circles (team coordination)           | 212   | P2       |
| 20  | `codex-client-passport-and-delegation.md` | Client passport + delegation layer         | ~200  | P2       |

**Codex instructions:** 10-11 first (P0). 12-16 can parallel after. 17-20 are lower priority, queue after Wave 1 + 2 P0s land.

---

## WAVE 3: Costing, Pricing & Financial Polish

Directly addresses "pricing is utter dog shit" pain point.

| #   | Spec                                  | What                          | Lines | Priority |
| --- | ------------------------------------- | ----------------------------- | ----- | -------- |
| 21  | `ingredient-sourcing-intelligence.md` | Smart ingredient sourcing     | 243   | P1       |
| 22  | `cost-propagation-wiring.md`          | Cost propagation wiring       | 219   | P1       |
| 23  | `vendor-personalization-layer.md`     | Vendor personalization        | 254   | P2       |
| 24  | `food-costing-knowledge-system.md`    | Food costing knowledge system | 890   | P2       |

**Codex instructions:** 21-22 are independent, run in parallel. 23-24 are larger, serial.

---

## WAVE 4: Operational Features (chef daily workflow)

| #   | Spec                                  | What                           | Lines | Priority |
| --- | ------------------------------------- | ------------------------------ | ----- | -------- |
| 25  | `codex-prep-sheet-generator.md`       | Prep sheet generation          | ~200  | P1       |
| 26  | `codex-service-day-closeout.md`       | Service day closeout flow      | ~200  | P1       |
| 27  | `codex-menu-performance-dashboard.md` | Menu performance tracking      | ~200  | P1       |
| 28  | `codex-saturation-tracking-core.md`   | Saturation tracking core       | ~200  | P1       |
| 29  | `live-service-execution-tracker.md`   | Live service execution tracker | 235   | P2       |
| 30  | `codex-marisol-1-circle-bridge.md`    | Marisol circle bridge          | ~200  | P2       |
| 31  | `codex-marisol-2-batch-view.md`       | Marisol batch view             | ~200  | P2       |
| 32  | `codex-marisol-3-weekly-retro.md`     | Marisol weekly retro           | ~200  | P2       |

**Codex instructions:** 25-28 parallel. 29-32 after.

---

## WAVE 5: Loyalty, Growth & Public Presence

| #   | Spec                                                        | What                            | Lines | Priority |
| --- | ----------------------------------------------------------- | ------------------------------- | ----- | -------- |
| 33  | `loyalty-phase1-visibility-and-perks.md`                    | Loyalty visibility + tier perks | 209   | P2       |
| 34  | `loyalty-client-experience.md`                              | Loyalty client experience       | ~270  | P2       |
| 35  | `featured-chef-public-proof-and-booking.md`                 | Featured chef proof + booking   | ~300  | P2       |
| 36  | `consumer-first-discovery-and-dinner-planning-expansion.md` | Consumer discovery expansion    | ~350  | P2       |
| 37  | `directory-post-claim-enhancement-flow.md`                  | Directory post-claim flow       | ~250  | P2       |
| 38  | `dinner-circle-multi-host-collaboration.md`                 | Multi-host dinner collaboration | ~300  | P2       |

---

## WAVE 6: Infrastructure & Internal Tools

| #   | Spec                                  | What                          | Lines | Priority |
| --- | ------------------------------------- | ----------------------------- | ----- | -------- |
| 39  | `codex-hub-table-schema-sync.md`      | Hub table Drizzle schema sync | 218   | P1       |
| 40  | `codex-intl-phase2-format-wiring.md`  | International format wiring   | ~250  | P2       |
| 41  | `byoai-phase2-ollama-adapter.md`      | BYOAI Ollama adapter          | ~250  | P2       |
| 42  | `byoai-phase2-privacy-narrative.md`   | BYOAI privacy narrative       | 177   | P2       |
| 43  | `digital-twin-simulation-protocol.md` | Digital twin simulation       | ~400  | P3       |
| 44  | `comprehensive-qa-validation.md`      | Comprehensive QA validation   | ~400  | P2       |

---

## VERIFICATION WAVE: Built But Unverified (Playwright needed)

These are ALREADY BUILT. Just need Playwright verification to mark as "verified."

| #   | Spec                                                 | What                         | Lines |
| --- | ---------------------------------------------------- | ---------------------------- | ----- |
| V1  | `receipt-intelligence-and-recipe-scaling.md`         | Receipt OCR + recipe scaling | 148   |
| V2  | `service-simulation.md`                              | Service simulation           | 180   |
| V3  | `p1-performance-optimization.md`                     | Performance optimization     | 262   |
| V4  | `restaurant-ops-surface-and-reliability-pass.md`     | Restaurant ops reliability   | 287   |
| V5  | `settings-branding-account-security.md`              | Settings branding/security   | 290   |
| V6  | `chef-opportunity-network.md`                        | Chef collaboration network   | 291   |
| V7  | `staff-ops-unified-workflow.md`                      | Staff operations workflow    | 349   |
| V8  | `p0-chef-pricing-readiness-gate.md`                  | Pricing readiness gate       | 391   |
| V9  | `p0-chef-golden-path-reliability.md`                 | Chef golden path reliability | 432   |
| V10 | `soft-close-leverage-and-reactivation.md`            | Soft-close + reactivation    | 556   |
| V11 | `p1-allergy-and-dietary-trust-alignment.md`          | Allergy/dietary trust        | 610   |
| V12 | `chef-pricing-override-infrastructure.md`            | Chef pricing overrides       | 630   |
| V13 | `notes-dishes-menus-client-event-pipeline.md`        | Notes-to-dishes pipeline     | 701   |
| V14 | `p0-chef-cpa-ready-tax-export-and-reconciliation.md` | CPA tax export               | 747   |

**Codex instructions:** Run Playwright tests against each. Mark verified or file bugs.

---

## WAVE 7: PIE Test Coverage (test-only, parallel-safe, no prod changes)

53 of 62 PIE modules have zero tests. Test:code ratio is 0.07. These are all test-only specs.

| #   | Spec                                       | What                                 | Lines | Priority |
| --- | ------------------------------------------ | ------------------------------------ | ----- | -------- |
| 45  | `codex-pie-test-synthetic-engine.md`       | Synthetic engine tests (tier 9.5/10) | ~200  | P0       |
| 46  | `codex-pie-test-freshness-enforcer.md`     | Freshness enforcer tests (Law 4)     | ~180  | P0       |
| 47  | `codex-pie-test-anomaly-detector.md`       | Anomaly detector tests               | ~180  | P0       |
| 48  | `codex-pie-test-pi-bridge.md`              | Pi bridge circuit breaker tests      | ~200  | P0       |
| 49  | `codex-pie-test-coverage-gap-detector.md`  | Coverage gap detector tests          | ~200  | P1       |
| 50  | `codex-pie-test-auto-expansion.md`         | Auto-expansion engine tests (Law 5)  | ~200  | P1       |
| 51  | `codex-pie-test-compound-learning.md`      | Compound learning tests (Law 7)      | ~180  | P1       |
| 52  | `codex-pie-test-predictive-supply.md`      | Predictive supply chain tests        | ~220  | P1       |
| 53  | `codex-pie-test-trend-intelligence.md`     | Trend intelligence tests (6 exports) | ~250  | P1       |
| 54  | `codex-pie-test-wholesale-intelligence.md` | Wholesale intelligence tests         | ~200  | P1       |

**Codex instructions:** All 10 run in parallel. Test-only, zero production code changes. Each creates one test file.

---

## WAVE 8: PIE Geographic Expansion (data + cron activation)

Real price data covers ~3 states. Scripts exist for 50 states but need orchestration and cron wiring.

| #   | Spec                                       | What                                    | Lines | Priority |
| --- | ------------------------------------------ | --------------------------------------- | ----- | -------- |
| 55  | `codex-pie-osm-nationwide-run.md`          | Nationwide ingestion orchestrator       | ~150  | P0       |
| 56  | `codex-pie-coverage-cron-activation.md`    | Wire coverage gap + auto-expansion cron | ~120  | P0       |
| 57  | `codex-pie-geographic-census-expansion.md` | Expand census to all 50 states          | ~100  | P1       |

**Codex instructions:** 55 first (creates orchestrator). 56-57 parallel after.

---

## WAVE 9: PIE Compliance & Observability

Compliance checks exist in code but nobody sees results.

| #   | Spec                                      | What                              | Lines | Priority |
| --- | ----------------------------------------- | --------------------------------- | ----- | -------- |
| 58  | `codex-pie-compliance-morning-report.md`  | PIE compliance in Hermes reports  | ~100  | P1       |
| 59  | `codex-pie-compliance-admin-dashboard.md` | Admin page for PIE law compliance | ~200  | P2       |

**Codex instructions:** 58 first (script). 59 after (UI).

---

## WAVE 10: PIE Intelligence Wiring (backend data -> chef-visible UI)

Smart modules live in isolation. Law 11: "actionable intelligence, not data."

| #   | Spec                                     | What                                   | Lines | Priority |
| --- | ---------------------------------------- | -------------------------------------- | ----- | -------- |
| 60  | `codex-pie-trend-price-card.md`          | Trend arrows on price display          | ~150  | P1       |
| 61  | `codex-pie-substitution-suggestions.md`  | Smart substitutions on high-risk items | ~180  | P1       |
| 62  | `codex-pie-wholesale-comparison-view.md` | Wholesale vs retail comparison         | ~200  | P2       |
| 63  | `codex-pie-volatility-alerts-ui.md`      | Volatility alerts on chef surfaces     | ~150  | P2       |
| 64  | `codex-pie-seasonal-calendar.md`         | Seasonal price calendar page           | ~200  | P2       |

**Codex instructions:** 60-61 parallel (P1). 62-64 parallel after (P2).

---

## WAVE 11: PIE Architecture (resolve-price decomposition)

| #   | Spec                                       | What                                       | Lines | Priority |
| --- | ------------------------------------------ | ------------------------------------------ | ----- | -------- |
| 65  | `codex-pie-resolve-price-decomposition.md` | Extract 13 tiers into individual resolvers | ~300  | P2       |

**Codex instructions:** Run AFTER Wave 7 tests pass (tests are the safety net for this refactor). Serial, not parallel.

---

## EXCLUDED (Not Codex-appropriate)

These need Claude Code, human decisions, or are blocked:

- `openclaw-*` specs (Pi infrastructure, not ChefFlow app code)
- `p0-survey-*` specs (need human to launch surveys)
- `cloud-mobile-unified-migration.md` Phase 4 (blocked on macOS)
- `platform-intelligence-hub.md` (1415 lines, too complex for Codex solo)
- `takeachef-privatechefmanager-parity-doc-program.md` (research/doc, not code)
- `menu-costing-interrogation.md` (question set, not buildable)
- `internal-codex-readiness-pack.md` (meta, not a feature)
- `openclaw-canonical-scope-and-sequence.md` (planning doc)
- DB migration specs (need explicit approval)
- Security hardening specs (need Claude Code review)

---

## Execution Order Summary

```
PARALLEL WAVE 1  (9 tasks)   Bug fixes, quick wins             ~2-3 hours Codex time
PARALLEL WAVE 2a (2 tasks)   Circle P0s                        ~1-2 hours
PARALLEL WAVE 2b (5 tasks)   Circle P1s                        ~3-4 hours
PARALLEL WAVE 3  (2 tasks)   Costing P1s                       ~2-3 hours
PARALLEL WAVE 4  (4 tasks)   Ops P1s                           ~3-4 hours
PARALLEL WAVE V  (14 tasks)  Verification (can run anytime)
SERIAL   WAVE 5  (6 tasks)   Growth features                   ~6-8 hours
SERIAL   WAVE 6  (6 tasks)   Infrastructure                    ~4-6 hours
PARALLEL WAVE 7  (10 tasks)  PIE test coverage (all parallel)  ~2-3 hours
SERIAL   WAVE 8  (3 tasks)   PIE geographic expansion          ~1-2 hours
SERIAL   WAVE 9  (2 tasks)   PIE compliance/observability      ~1-2 hours
PARALLEL WAVE 10 (5 tasks)   PIE intelligence wiring           ~3-4 hours
SERIAL   WAVE 11 (1 task)    PIE resolve-price decomposition   ~2-3 hours
                                                                ──────────
                                                 TOTAL: ~69 specs/tasks
```

**Expected outcome:** Waves 1-6 move build completeness from 95% to ~99%. Waves 7-11 turn PIE from "architecturally complete" into "operationally verified" with test coverage, nationwide data, visible compliance, and chef-facing intelligence. The remaining gap is validation, launch, and human-only tasks.
