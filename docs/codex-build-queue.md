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
PARALLEL WAVE 1  (9 tasks)   Bug fixes, quick wins        ~2-3 hours Codex time
PARALLEL WAVE 2a (2 tasks)   Circle P0s                   ~1-2 hours
PARALLEL WAVE 2b (5 tasks)   Circle P1s                   ~3-4 hours
PARALLEL WAVE 3  (2 tasks)   Costing P1s                  ~2-3 hours
PARALLEL WAVE 4  (4 tasks)   Ops P1s                      ~3-4 hours
PARALLEL WAVE V  (14 tasks)  Verification (can run anytime)
SERIAL   WAVE 5  (6 tasks)   Growth features              ~6-8 hours
SERIAL   WAVE 6  (6 tasks)   Infrastructure               ~4-6 hours
                                                           ─────────
                                              TOTAL: ~48 specs/tasks
```

**Expected outcome:** Moves build completeness from 95% to ~99%. Moves overall V1 from 71% to ~80%. The remaining 20% is validation, launch, and human-only tasks.
