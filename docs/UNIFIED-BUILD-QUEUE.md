# UNIFIED BUILD QUEUE - ChefFlow V1

> Merged 2026-05-16 from Claude (specs/memory/code gaps) + Codex (GSD queue).
> 237 tracked rows after deduplication and Codex state sync.

---

## LIFECYCLE & EVENTS (28 items)

| #   | Item                                                          | Status     | Depends On                                                                                                                          | Notes                                                                        |
| --- | ------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | Canonical Chef-Client Action Vocabulary Contract              | SPEC-READY | None                                                                                                                                | Codex active                                                                 |
| 2   | Chef-Client Lifecycle Naming And Surface Decision Pass        | SPEC-READY | #1                                                                                                                                  | Codex active                                                                 |
| 3   | Derived Chef-Client Lifecycle Action Graph Builder            | SPEC-READY | #1                                                                                                                                  | Codex active                                                                 |
| 4   | Dashboard And Action Center Lifecycle Feed Integration        | SPEC-READY | #3                                                                                                                                  | Codex active                                                                 |
| 5   | Event Detail Lifecycle Action Card                            | SPEC-READY | #3                                                                                                                                  | Codex active                                                                 |
| 6   | Lifecycle Graph Regression Security And Documentation Harness | SPEC-READY | #3                                                                                                                                  | Codex active                                                                 |
| 7   | Post-Event Closeout Completeness Loop                         | SPEC-READY | None                                                                                                                                | Codex active                                                                 |
| 8   | Waiting State Command Surface For Chef-Client Lifecycle       | SPEC-READY | #1                                                                                                                                  | Codex active                                                                 |
| 9   | Event First Lifecycle Proof Surface Wave Plan                 | SPEC-READY | None                                                                                                                                | Codex active                                                                 |
| 10  | Event Current Operating State Card                            | SPEC-READY | #9                                                                                                                                  | Codex active                                                                 |
| 11  | Event Lifecycle Rail And Stage Navigation                     | SPEC-READY | #9                                                                                                                                  | Codex active                                                                 |
| 12  | Lifecycle Client Visibility And Redaction Rules               | SPEC-READY | #11                                                                                                                                 | Codex active                                                                 |
| 13  | Lifecycle First Wave Ownership And Merge Plan                 | SPEC-READY | #9                                                                                                                                  | Codex active                                                                 |
| 14  | Lifecycle Fixture Matrix For Finish-Gate Proof                | SPEC-READY | #9                                                                                                                                  | Codex active                                                                 |
| 15  | Lifecycle Mobile Sticky Action Footer                         | SPEC-READY | #11                                                                                                                                 | Codex active                                                                 |
| 16  | Lifecycle Recovery Menus And Confirmation Patterns            | SPEC-READY | #11                                                                                                                                 | Codex active                                                                 |
| 17  | Lifecycle Waiting Age And Owner Language System               | SPEC-READY | #8                                                                                                                                  | Codex active                                                                 |
| 18  | Remy Draft Versus Canonical Lifecycle Boundary                | SPEC-READY | Derived Chef-Client Lifecycle Action Graph Builder; ChefFlow Confidence And Evidence Labels Everywhere                              | Codex active                                                                 |
| 19  | Live Service Execution Tracker                                | SPEC-READY | None                                                                                                                                | Claude spec-ready                                                            |
| 20  | Live Service Execution Tracker Regression Coverage            | SPEC-READY | #19                                                                                                                                 | Claude spec-ready                                                            |
| 21  | Service Day Closeout                                          | SPEC-READY | #19                                                                                                                                 | Claude spec-ready                                                            |
| 22  | Component-Aware Prep Scheduling                               | SPEC-READY | None                                                                                                                                | Claude spec-ready                                                            |
| 23  | Ticketed Events (5 critical bugs)                             | PARTIAL    | None                                                                                                                                | KNOWN BLOCKER: missing migration, component, shareToken, NOT NULL, no ledger |
| 24  | Clean Stop/Resume Trails                                      | DRAFT      | None                                                                                                                                | Claude draft                                                                 |
| 25  | Completion Contract                                           | SPEC-READY | None                                                                                                                                | Claude spec-ready; system-wide deterministic engine                          |
| 26  | Event Workspace Information Architecture Deepening            | SPEC-READY | Event Detail Lifecycle Action Card; Chef Navigation And Page Header Unification; Chef UI Design System And Density Contract         | Codex active                                                                 |
| 27  | Day-Of Live Service Mode UI Deepening                         | SPEC-READY | Mobile Chef Operations UI Pass; Event Workspace Information Architecture Deepening; Unified Status Badge And Progress Language Pass | Codex active                                                                 |
| 28  | Event Finance Profitability Cockpit UI Deepening              | SPEC-READY | Post-Event Closeout Completeness Loop; Unified Status Badge And Progress Language Pass; Chef UI Design System And Density Contract  | Codex active                                                                 |

---

## UI SYSTEM & DESIGN LANGUAGE (47 items)

| #   | Item                                                               | Status     | Depends On                                                                                                                                           | Notes                                  |
| --- | ------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | Chef UI Design System And Density Contract                         | SPEC-READY | None                                                                                                                                                 | Codex active; foundational             |
| 2   | Unified Status Badge And Progress Language Pass                    | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 3   | Operational Empty Loading Error And Success States Pass            | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 4   | Dense Tables Lists Filters And Bulk Actions Upgrade                | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 5   | Forms Wizards And Client Intake Interaction Polish                 | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 6   | Lifecycle-Aware Contextual Action Bars                             | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 7   | Dashboard Command Center UI Deepening                              | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 8   | Client Portal Event Experience UI Polish                           | SPEC-READY | None                                                                                                                                                 | Codex active                           |
| 9   | 21st Magic Visual Optimization Gate For UI Queue                   | SPEC-READY | #1                                                                                                                                                   | Codex active; quality gate             |
| 10  | Lifecycle UI 21st Magic Component Kit                              | SPEC-READY | #1, #9                                                                                                                                               | Codex active                           |
| 11  | Event Detail Visual Before After Proof Pass                        | SPEC-READY | #10                                                                                                                                                  | Codex active                           |
| 12  | Evidence Label Visual Treatment Pass                               | SPEC-READY | #10                                                                                                                                                  | Codex active                           |
| 13  | Lifecycle Action Hierarchy Visual System                           | SPEC-READY | #10                                                                                                                                                  | Codex active                           |
| 14  | Lifecycle Mobile Visual Ergonomics Pass                            | SPEC-READY | #10                                                                                                                                                  | Codex active                           |
| 15  | Lifecycle Visual State Styling System                              | SPEC-READY | #10                                                                                                                                                  | Codex active                           |
| 16  | Operational Visual Style Guardrails For ChefFlow UI                | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 17  | ChefFlow Culinary Visual Language Pass                             | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 18  | Data Visualization Upgrade For Chef Ops                            | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 19  | Operational Motion And State Transition System                     | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 20  | Role Specific Portal Visual Modes                                  | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 21  | Trust And Evidence Visual Grammar                                  | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 22  | Visual Priority And Surface Level System                           | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 23  | Visual QA Matrix And Screenshot Harness                            | SPEC-READY | None                                                                                                                                                 | Codex active                           |
| 24  | ChefFlow Card Composition Rules And Cleanup Pass                   | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 25  | ChefFlow Operational Icon Language System                          | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 26  | ChefFlow Signature Workflow Components                             | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 27  | ChefFlow Typography Roles And Text Hierarchy System                | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 28  | First Viewport Discipline For ChefFlow Pages                       | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 29  | Operational Metric Hierarchy Visual System                         | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 30  | Premium Detail Pass For Operational UI Craft                       | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 31  | Scan Understand Act Visual Heuristic Gate                          | SPEC-READY | None                                                                                                                                                 | Codex active; quality gate             |
| 32  | Strict Color Semantics For ChefFlow Operations                     | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 33  | ChefFlow Interaction Microcopy And Content Design System           | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 34  | ChefFlow Layout Grid And Responsive Container System               | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 35  | Modal Drawer And Sheet Interaction System                          | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 36  | ChefFlow Interaction Soundness Pass For Hover Focus Press Disabled | SPEC-READY | Accessibility Keyboard And Focus Reliability Pass; Lifecycle Action Hierarchy Visual System; Strict Color Semantics For ChefFlow Operations          | Codex active                           |
| 37  | Design Debt Map For ChefFlow Surfaces                              | SPEC-READY | None                                                                                                                                                 | Codex active                           |
| 38  | High Contrast And Service Environment Readability Mode             | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 39  | Print PDF And Share Asset Visual Consistency Pass                  | SPEC-READY | None                                                                                                                                                 | Codex active                           |
| 40  | Public Profile And Marketplace Trust Visual Upgrade                | SPEC-READY | None                                                                                                                                                 | Codex active                           |
| 41  | Revision Comparison UI For Menus Quotes And Event Changes          | SPEC-READY | None                                                                                                                                                 | Codex active                           |
| 42  | Route Screenshot Gallery And Design Review Board                   | SPEC-READY | #23                                                                                                                                                  | Codex active                           |
| 43  | Theme Token Hardening And Light Dark Consistency Pass              | SPEC-READY | #1                                                                                                                                                   | Codex active                           |
| 44  | Visual Consistency Lint And Route Audit Tooling                    | SPEC-READY | #23                                                                                                                                                  | Codex active                           |
| 45  | Costing Transparency UI                                            | SPEC-READY | None                                                                                                                                                 | Claude spec-ready (arthur-klein-fix-3) |
| 46  | Accessibility Keyboard And Focus Reliability Pass                  | SPEC-READY | Chef UI Design System And Density Contract                                                                                                           | Codex active                           |
| 47  | Documents And Proof Pack Workspace UI Upgrade                      | SPEC-READY | Operational Empty Loading Error And Success States Pass; Unified Status Badge And Progress Language Pass; Chef UI Design System And Density Contract | Codex active                           |

---

## INTERACTION & POWER USER (14 items)

| #   | Item                                                      | Status     | Depends On                                                                                                      | Notes        |
| --- | --------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------- | ------------ |
| 1   | Bulk Action Review And Undo Safety Pattern                | SPEC-READY | None                                                                                                            | Codex active |
| 2   | ChefFlow Adaptive Density And Workspace Mode Controls     | SPEC-READY | None                                                                                                            | Codex active |
| 3   | ChefFlow Keyboard Shortcut And Power User Command Layer   | SPEC-READY | None                                                                                                            | Codex active |
| 4   | ChefFlow Privacy Consent And Sharing Visual Controls      | SPEC-READY | None                                                                                                            | Codex active |
| 5   | Cross Surface Continuity And Resume Where You Left Off UI | SPEC-READY | None                                                                                                            | Codex active |
| 6   | Freshness Staleness And Last Updated Visual System        | SPEC-READY | None                                                                                                            | Codex active |
| 7   | Scenario Based UI Fixture Library For Chef Workflows      | SPEC-READY | None                                                                                                            | Codex active |
| 8   | ChefFlow Audit Trail And Change History Visual Pattern    | SPEC-READY | None                                                                                                            | Codex active |
| 9   | ChefFlow Inline Editing And Quick Correction Pattern      | SPEC-READY | None                                                                                                            | Codex active |
| 10  | ChefFlow Notification Severity And Interruption Design    | SPEC-READY | None                                                                                                            | Codex active |
| 11  | Client Facing Progress Tracker Visual Upgrade             | SPEC-READY | None                                                                                                            | Codex active |
| 12  | Operator Memory Search And Source Preview UI              | SPEC-READY | None                                                                                                            | Codex active |
| 13  | Inbox Notifications And Triage UI Upgrade                 | SPEC-READY | Waiting State Command Surface For Chef-Client Lifecycle; Dashboard And Action Center Lifecycle Feed Integration | Codex active |
| 14  | Universal Search And Command Palette UI Deepening         | SPEC-READY | Chef UI Design System And Density Contract; Lifecycle-Aware Contextual Action Bars                              | Codex active |

---

## CLIENT COMMUNICATION & REMY (11 items)

| #   | Item                                                   | Status     | Depends On | Notes                                                                                                                                                                                       |
| --- | ------------------------------------------------------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Remy Routines Foundation And Policy Model              | BLOCKED    | None       | Verified 2026-05-16: Remy routines worktree remains partial; runtime match/apply audit logging, tenant/safety tests, proof packs, browser/runtime proof, and auth scan cleanup are missing. |
| 2   | Remy Routine Authoring And Approval Experience         | BLOCKED    | #1         | Verified 2026-05-16: blocked by incomplete Remy routines foundation and missing runtime/proof/auth cleanup.                                                                                 |
| 3   | Remy Routine Runtime Matching And Execution Guardrails | BLOCKED    | #1         | Verified 2026-05-16: blocked by incomplete Remy routines foundation and authoring approval path; runtime/proof/auth cleanup still missing.                                                  |
| 4   | Remy Routine Safety Audit Tests And Observability      | BLOCKED    | #1         | Verified 2026-05-16: blocked by incomplete Remy runtime foundation and missing tenant/safety tests plus proof packs.                                                                        |
| 5   | Remy To Codex Skill Proposal Handoff                   | BLOCKED    | #1         | Verified 2026-05-16: blocked by incomplete Remy routines foundation; human-approved skill proposal handoff cannot proceed until routine policy/runtime is complete.                         |
| 6   | Email Snapshot & Portal Strategy                       | DRAFT      | None       | Claude draft; A/B portal strategy                                                                                                                                                           |
| 7   | Soft-Close Leverage & Reactivation                     | PARTIAL    | None       | Claude: BUILT, needs verification                                                                                                                                                           |
| 8   | Loyalty Client Experience                              | SPEC-READY | None       | Claude spec-ready                                                                                                                                                                           |
| 9   | Loyalty Phase 1: Visibility & Perks                    | SPEC-READY | #8         | Claude spec-ready                                                                                                                                                                           |
| 10  | Handoff Context Enrichment                             | SPEC-READY | None       | Claude spec-ready                                                                                                                                                                           |
| 11  | Inquiry Response Cockpit UI Deepening                  | SPEC-READY | None       | Codex active                                                                                                                                                                                |

---

## CIRCLES & COLLABORATION (9 items)

| #   | Item                                    | Status     | Depends On | Notes                                  |
| --- | --------------------------------------- | ---------- | ---------- | -------------------------------------- |
| 1   | Circle Approval Flow                    | SPEC-READY | None       | Claude spec-ready                      |
| 2   | Circle Reminder Cascade                 | SPEC-READY | #1         | Claude spec-ready                      |
| 3   | Collaborator Circle Bridge              | SPEC-READY | None       | Claude spec-ready                      |
| 4   | Marisol 1: Circle Bridge                | SPEC-READY | #3         | Claude spec-ready                      |
| 5   | Crew Circles Build                      | SPEC-READY | None       | Claude spec-ready                      |
| 6   | Dinner Circle Multi-Host Collaboration  | DRAFT      | None       | Claude draft + spec-ready (both lists) |
| 7   | Dinner Circle Unification               | DRAFT      | None       | Claude draft + spec-ready (both lists) |
| 8   | Circles Operating Loop Build Extraction | DRAFT      | None       | Claude draft                           |
| 9   | Farm Dinner Co-Host Vision              | UNSPECCED  | #6         | Memory item; needs spec                |

---

## MENU & RECIPE & COSTING (11 items)

| #   | Item                                          | Status     | Depends On | Notes                                  |
| --- | --------------------------------------------- | ---------- | ---------- | -------------------------------------- |
| 1   | Configurable Plate Cost                       | SPEC-READY | None       | Claude spec-ready (arthur-klein-fix-1) |
| 2   | Cost CSV Exports                              | SPEC-READY | #1         | Claude spec-ready (arthur-klein-fix-2) |
| 3   | Cost Propagation Wiring                       | SPEC-READY | #1         | Claude spec-ready                      |
| 4   | Menu Costing Interrogation                    | SPEC-READY | #3         | Claude spec-ready                      |
| 5   | Chef Pricing Override Infrastructure          | PARTIAL    | None       | Claude: BUILT, needs verification      |
| 6   | Food Costing Knowledge System                 | PARTIAL    | None       | Claude: BUILT, needs verification      |
| 7   | Ingredient Sourcing Intelligence              | SPEC-READY | None       | Claude spec-ready                      |
| 8   | Menu Builder Chef-Grade Workspace Upgrade     | SPEC-READY | None       | Codex active                           |
| 9   | Menu Storytelling And FOH Presentation Studio | SPEC-READY | None       | Codex active                           |
| 10  | Flexible Creation Order & Recipe Lifecycle    | DRAFT      | None       | Claude draft                           |
| 11  | Recipe Peak Windows                           | DRAFT      | None       | Claude draft                           |

---

## CHEF OPERATIONS (16 items)

| #   | Item                                                             | Status     | Depends On                                                                      | Notes                             |
| --- | ---------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------- | --------------------------------- |
| 1   | Chef Shell Clarity & Guided Settings                             | SPEC-READY | None                                                                            | Claude spec-ready                 |
| 2   | Marisol 2: Batch View                                            | SPEC-READY | None                                                                            | Claude spec-ready                 |
| 3   | Marisol 3: Weekly Retro                                          | SPEC-READY | #2                                                                              | Claude spec-ready                 |
| 4   | Menu Performance Dashboard                                       | SPEC-READY | None                                                                            | Claude spec-ready                 |
| 5   | Prep Sheet Generator                                             | SPEC-READY | None                                                                            | Claude spec-ready                 |
| 6   | Saturation Tracking Core                                         | SPEC-READY | None                                                                            | Claude spec-ready                 |
| 7   | Chef Opportunity Network                                         | PARTIAL    | None                                                                            | Claude: BUILT, needs verification |
| 8   | Pop-Up Operating System (Noah Kim)                               | SPEC-READY | None                                                                            | Claude spec-ready                 |
| 9   | Chef Burnout Capacity And Boundary UI                            | SPEC-READY | None                                                                            | Codex active                      |
| 10  | Chef Quick Capture Everything Inbox                              | SPEC-READY | None                                                                            | Codex active                      |
| 11  | Chef Reputation Studio For Reviews Testimonials And Social Proof | SPEC-READY | Post-Event Closeout Completeness Loop; Client Portal Event Experience UI Polish | Codex active                      |
| 12  | Chef Taste Memory And Preference Learning UI                     | SPEC-READY | None                                                                            | Codex active                      |
| 13  | Multi-Event Week Command Center                                  | SPEC-READY | None                                                                            | Codex active                      |
| 14  | Reusable Service Playbooks And Event Templates Studio            | SPEC-READY | None                                                                            | Codex active                      |
| 15  | Shopping Receipts Inventory Mobile Workbench                     | SPEC-READY | None                                                                            | Codex active                      |
| 16  | Staff Task And Assignment UI Deepening                           | SPEC-READY | None                                                                            | Codex active                      |

---

## CLIENT & GUEST MANAGEMENT (10 items)

| #   | Item                                                                           | Status     | Depends On | Notes                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Client Passport & Delegation                                                   | SPEC-READY | None       | Claude spec-ready                                                                                                                                                                                                                                             |
| 2   | Guest Preference Profile                                                       | SPEC-READY | None       | Claude spec-ready                                                                                                                                                                                                                                             |
| 3   | Client UX Bug Sweep                                                            | SPEC-READY | None       | Claude spec-ready                                                                                                                                                                                                                                             |
| 4   | Corporate Procurement Layer                                                    | SPEC-READY | None       | Claude spec-ready                                                                                                                                                                                                                                             |
| 5   | Overhaul Client Profiles Into Client Intelligence Ledger And Prediction Engine | BLOCKED    | None       | Verified 2026-05-16: RUN-20260515T230923Z delivered a partial tenant-scoped slice, but durable schema expansion, client portal capture, feedback loop, revenue attribution persistence, sensitive-data controls, and full taxonomy workflows remain unproven. |
| 6   | Client Change Request Review Center                                            | SPEC-READY | None       | Codex active                                                                                                                                                                                                                                                  |
| 7   | Client Relationship Cockpit UI Deepening                                       | SPEC-READY | None       | Codex active                                                                                                                                                                                                                                                  |
| 8   | ChefFlow Command Timeline For Every Client Relationship                        | SPEC-READY | None       | Codex active                                                                                                                                                                                                                                                  |
| 9   | Guest Experience And Table Touchpoint Builder                                  | SPEC-READY | None       | Codex active                                                                                                                                                                                                                                                  |
| 10  | Proposal Experience Builder With Add-Ons And Tradeoffs                         | SPEC-READY | None       | Codex active                                                                                                                                                                                                                                                  |

---

## NAVIGATION & INFORMATION ARCHITECTURE (7 items)

| #   | Item                                           | Status     | Depends On | Notes                                                                                                                                                                                                            |
| --- | ---------------------------------------------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Chef Navigation And Page Header Unification    | SPEC-READY | None       | Codex active                                                                                                                                                                                                     |
| 2   | Portal Rail System Foundation                  | BLOCKED    | None       | Verified 2026-05-16: rail worktree implementation remains partial; authenticated runtime screenshots/console/network proof and finish-check are missing, and support edits/local artifacts require lead cleanup. |
| 3   | Admin Portal Rail Prominence                   | BLOCKED    | #2         | Verified 2026-05-16: blocked by partial rail foundation and missing authenticated runtime proof/finish-check.                                                                                                    |
| 4   | Chef and Client Portal Rail Prominence         | BLOCKED    | #2         | Verified 2026-05-16: blocked by partial rail foundation and missing authenticated runtime proof/finish-check.                                                                                                    |
| 5   | Staff Portal Rail Conversion                   | BLOCKED    | #2         | Verified 2026-05-16: blocked by partial rail foundation and missing authenticated runtime proof/finish-check.                                                                                                    |
| 6   | Partner and Vendor Portal Rail Standardization | BLOCKED    | #2         | Verified 2026-05-16: blocked by partial rail foundation and missing authenticated runtime proof/finish-check.                                                                                                    |
| 7   | First Next Handoff Bar Mounts                  | BLOCKED    | None       | Verified 2026-05-16: shared rail improvements exist, but menu/recipe contextual mounts and authenticated route screenshots remain unproven; related route proof is still blocked by dirty/runtime instability.   |

---

## AI & INTELLIGENCE (10 items)

| #   | Item                                 | Status     | Depends On | Notes                                                                                                                                                                                 |
| --- | ------------------------------------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | BYOAI Phase 2: Ollama Adapter        | SPEC-READY | None       | Claude spec-ready                                                                                                                                                                     |
| 2   | BYOAI Phase 2: Privacy Narrative     | SPEC-READY | #1         | Claude spec-ready                                                                                                                                                                     |
| 3   | Full Cloud AI Runtime & Disclosure   | PARTIAL    | None       | Claude: BUILT, needs verification                                                                                                                                                     |
| 4   | Local AI Integration                 | PARTIAL    | None       | Claude: BUILT, needs verification                                                                                                                                                     |
| 5   | Platform Intelligence Hub            | PARTIAL    | None       | Claude: BUILT + IN-PROGRESS                                                                                                                                                           |
| 6   | Business Health Narrative Dashboard  | SPEC-READY | #5         | Codex active                                                                                                                                                                          |
| 7   | Chef Operating Loop External Memory  | DRAFT      | None       | Claude draft                                                                                                                                                                          |
| 8   | Configuration Engine                 | DRAFT      | None       | Claude draft                                                                                                                                                                          |
| 9   | Culinary Operations & Costing System | DRAFT      | None       | Claude draft                                                                                                                                                                          |
| 10  | PIE Current Attention Collector      | BLOCKED    | None       | Verified 2026-05-16: still blocked by dirty dashboard/current operating-loop workspace; app/(chef)/dashboard/page.tsx is dirty and The Current/dashboard route proof is not complete. |

---

## OPENCLAW & DATA INFRASTRUCTURE (8 items)

| #   | Item                                        | Status     | Depends On | Notes                                    |
| --- | ------------------------------------------- | ---------- | ---------- | ---------------------------------------- |
| 1   | OpenClaw Scraper Enrichment                 | IN-FLIGHT  | None       | Claude: in-progress                      |
| 2   | OpenClaw Archive Digester                   | SPEC-READY | None       | Claude spec-ready; #1 cartridge priority |
| 3   | OpenClaw Canonical Scope & Sequence         | SPEC-READY | None       | Claude spec-ready                        |
| 4   | OpenClaw Capture Countdown & Pixel Schedule | SPEC-READY | None       | Claude spec-ready                        |
| 5   | OpenClaw Developer Usage Page               | SPEC-READY | None       | Claude spec-ready                        |
| 6   | OpenClaw Goal Governor & KPI Contract       | SPEC-READY | None       | Claude spec-ready                        |
| 7   | OpenClaw Intelligence Layer                 | PARTIAL    | None       | Claude: BUILT, needs verification        |
| 8   | OpenClaw Food Price Intelligence            | DRAFT      | None       | Claude draft                             |

---

## PUBLIC SURFACE & MARKETING (7 items)

| #   | Item                                                | Status     | Depends On | Notes                               |
| --- | --------------------------------------------------- | ---------- | ---------- | ----------------------------------- |
| 1   | Consumer-First Discovery & Dinner Planning          | SPEC-READY | None       | Claude spec-ready                   |
| 2   | Featured Chef Public Proof & Booking                | SPEC-READY | None       | Claude spec-ready                   |
| 3   | Nearby Directory Redesign                           | SPEC-READY | None       | Claude spec-ready; currently hidden |
| 4   | Directory Post-Claim Enhancement                    | SPEC-READY | #3         | Claude spec-ready                   |
| 5   | Homepage Discovery Rail Completion                  | SPEC-READY | None       | Claude spec-ready (2026-05-12)      |
| 6   | Kill Onboarding Redirect                            | SPEC-READY | None       | Claude spec-ready                   |
| 7   | Public Profile And Marketplace Trust Visual Upgrade | SPEC-READY | None       | Codex active                        |

---

## MOBILE & OFFLINE (5 items)

| #   | Item                                          | Status     | Depends On | Notes                             |
| --- | --------------------------------------------- | ---------- | ---------- | --------------------------------- |
| 1   | Cloud Mobile Unified Migration                | PARTIAL    | None       | Claude: BUILT, needs verification |
| 2   | Mobile Chef Operations UI Pass                | SPEC-READY | None       | Codex active                      |
| 3   | Chef Offline And Bad-Network Continuity Layer | SPEC-READY | None       | Codex active                      |
| 4   | Android Home Screen Widgets                   | SPEC-READY | None       | Claude spec-ready                 |
| 5   | iOS PWA/Tauri                                 | BLOCKED    | None       | Blocked on macOS hardware         |

---

## SECURITY, LEGAL & TRUST (3 items)

| #   | Item                                               | Status     | Depends On | Notes                             |
| --- | -------------------------------------------------- | ---------- | ---------- | --------------------------------- |
| 1   | Legal Readiness Center & Compliance Infrastructure | IN-FLIGHT  | None       | Codex: in-flight                  |
| 2   | Settings, Branding, Account Security               | PARTIAL    | None       | Claude: BUILT, needs verification |
| 3   | ChefFlow Confidence And Evidence Labels Everywhere | SPEC-READY | None       | Codex active                      |

---

## STAFF & VENDOR (3 items)

| #   | Item                                                 | Status     | Depends On | Notes                             |
| --- | ---------------------------------------------------- | ---------- | ---------- | --------------------------------- |
| 1   | Staff Ops Unified Workflow                           | PARTIAL    | None       | Claude: BUILT, needs verification |
| 2   | Referral Partner And Venue Relationship UI Deepening | SPEC-READY | None       | Codex active                      |
| 3   | Venue And Kitchen Recon Intelligence Workspace       | SPEC-READY | None       | Codex active                      |

---

## ADMIN & OPERATIONS (5 items)

| #   | Item                                                         | Status     | Depends On | Notes             |
| --- | ------------------------------------------------------------ | ---------- | ---------- | ----------------- |
| 1   | Mission Control Passive Dashboard                            | SPEC-READY | None       | Claude spec-ready |
| 2   | Admin Quality Console For Tenant UI And Workflow Health      | SPEC-READY | None       | Codex active      |
| 3   | Calendar And Production Planning UI Deepening                | SPEC-READY | None       | Codex active      |
| 4   | Onboarding Import And First-Week Activation UI Deepening     | SPEC-READY | None       | Codex active      |
| 5   | Settings Information Architecture And Preferences UI Cleanup | SPEC-READY | None       | Codex active      |

---

## DEVELOPER INFRASTRUCTURE & QA (13 items)

| #   | Item                                                             | Status     | Depends On                                                                                          | Notes                             |
| --- | ---------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1   | Comprehensive QA Validation                                      | SPEC-READY | None                                                                                                | Claude spec-ready                 |
| 2   | Cross-Boundary Flow Interrogation                                | SPEC-READY | None                                                                                                | Claude spec-ready                 |
| 3   | Hub Table Schema Sync                                            | SPEC-READY | None                                                                                                | Claude spec-ready                 |
| 4   | Comprehensive Domain Inventory Phase 1                           | SPEC-READY | None                                                                                                | Claude spec-ready                 |
| 5   | Digital Twin Simulation Protocol                                 | SPEC-READY | None                                                                                                | Claude spec-ready                 |
| 6   | Internal Codex Readiness Pack                                    | SPEC-READY | None                                                                                                | Claude spec-ready                 |
| 7   | Work Continuity Control Plane                                    | PARTIAL    | None                                                                                                | Claude: BUILT, needs verification |
| 8   | System Improvement Control Tower                                 | PARTIAL    | None                                                                                                | Claude: BUILT, needs verification |
| 9   | David's Docket OpenClaw Cartridge                                | PARTIAL    | None                                                                                                | Claude: BUILT, needs verification |
| 10  | Contextual Wiring Mise en Place                                  | SPEC-READY | None                                                                                                | Claude spec-ready                 |
| 11  | Notes/Dishes/Menus/Client/Event Pipeline                         | PARTIAL    | None                                                                                                | Claude: BUILT, needs verification |
| 12  | Service Simulation                                               | PARTIAL    | None                                                                                                | Claude: BUILT, needs verification |
| 13  | Perceived Performance Skeletons And Route Responsiveness UI Pass | SPEC-READY | Operational Empty Loading Error And Success States Pass; Chef UI Design System And Density Contract | Codex active                      |

---

## ONBOARDING & GETTING STARTED (2 items)

| #   | Item                        | Status | Depends On | Notes                                     |
| --- | --------------------------- | ------ | ---------- | ----------------------------------------- |
| 1   | Onboarding Cohesion Rework  | DRAFT  | None       | Claude draft; config engine (5 questions) |
| 2   | Passive Capture Triage Dock | DRAFT  | None       | Claude draft                              |

---

## REMAINING BUILT (needs Playwright verification) (6 items)

| #   | Item                                      | Status  | Depends On | Notes                     |
| --- | ----------------------------------------- | ------- | ---------- | ------------------------- |
| 1   | CPA-Ready Tax Export & Reconciliation     | PARTIAL | None       | Built, needs verification |
| 2   | Chef Golden Path Reliability              | PARTIAL | None       | Built, needs verification |
| 3   | Chef Pricing Readiness Gate               | PARTIAL | None       | Built, needs verification |
| 4   | Allergy & Dietary Trust Alignment         | PARTIAL | None       | Built, needs verification |
| 5   | Performance Optimization                  | PARTIAL | None       | Built, needs verification |
| 6   | Restaurant Ops Surface & Reliability Pass | PARTIAL | None       | Built, needs verification |

---

## HUMAN BODY BUILD WAVES (10 items)

| #   | Item                                                   | Status    | Depends On | Notes    |
| --- | ------------------------------------------------------ | --------- | ---------- | -------- |
| 0   | Growth Organ Repair (restore build queue contract)     | UNSPECCED | None       | Wave 0   |
| 1   | Immune System Hardening (route protection matrix)      | UNSPECCED | None       | Wave 1   |
| 2   | Blood Flow Standardization (tenant-safe query helpers) | UNSPECCED | None       | Wave 2   |
| 3   | Sense Upgrade (universal search foundation)            | UNSPECCED | None       | Wave 3   |
| 4   | Reflex Observability (side-effect observability)       | UNSPECCED | None       | Wave 4   |
| 5   | Memory Resurfacing (memory at decision points)         | UNSPECCED | None       | Wave 5   |
| 6   | Endocrine/Gating Cleanup (real feature gate contract)  | UNSPECCED | None       | Wave 6   |
| 7   | Surface Ownership Registry (nav ownership)             | UNSPECCED | None       | Body map |
| 8   | Admin Diagnosis Surface (admin dashboard)              | UNSPECCED | None       | Body map |
| 9   | File-to-Organ Inventory (generated body map)           | UNSPECCED | None       | Body map |

---

## REMAINING DRAFTS (7 items)

| #   | Item                                        | Status | Depends On | Notes |
| --- | ------------------------------------------- | ------ | ---------- | ----- |
| 1   | Beta-First Monetization Decision Archive    | DRAFT  | None       |       |
| 2   | Data Export Takeout                         | DRAFT  | None       |       |
| 3   | Human Systems Product Doctrine              | DRAFT  | None       |       |
| 4   | Research-Derived Human Systems Builds Index | DRAFT  | None       |       |
| 5   | Respectful Monetization Foundation          | DRAFT  | None       |       |
| 6   | Support Network Map                         | DRAFT  | None       |       |
| 7   | System Integrity Interrogation              | DRAFT  | None       |       |

---

## V1 EXIT CRITERIA (still open)

| #   | Item                                            | Status    | Notes                      |
| --- | ----------------------------------------------- | --------- | -------------------------- |
| 1   | Real chef used 2+ weeks with feedback           | UNSPECCED | Needs live usage           |
| 2   | Public booking page tested E2E by non-developer | UNSPECCED | Needs external tester      |
| 3   | Onboarding tested with non-technical user       | UNSPECCED | Needs external tester      |
| 4   | iOS app                                         | BLOCKED   | macOS hardware             |
| 5   | 48 ready specs built (nice-to-have)             | PARTIAL   | ~22 built of 60 spec-ready |

---

## SUMMARY

| Status                      | Count   |
| --------------------------- | ------- |
| SPEC-READY                  | 162     |
| PARTIAL (built, unverified) | 24      |
| DRAFT                       | 20      |
| BLOCKED                     | 15      |
| IN-FLIGHT                   | 2       |
| UNSPECCED                   | 14      |
| **TOTAL**                   | **237** |

### Cross-Category Dependencies

- Remy items (Client Communication) depend on Remy Routines Foundation (BLOCKED)
- Portal Rail items (Navigation) block several portal-specific UI items
- PIE Attention Collector (AI) depends on PIE infrastructure (separate system on Pi)
- UI System items (#1 Design Contract) is upstream of ~40 visual/interaction items
- Lifecycle items feed into many UI items (visual styling, mobile ergonomics, etc.)
