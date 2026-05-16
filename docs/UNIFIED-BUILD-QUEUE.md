# UNIFIED BUILD QUEUE - ChefFlow V1

> Merged 2026-05-16 from Claude (specs/memory/code gaps) + Codex (GSD queue).
> 237 tracked rows after deduplication and Codex state sync.

---

## LIFECYCLE & EVENTS (33 items)

| #   | Item                                                          | Status     | Depends On                                                                                                                          | Notes                                                                                                                                                                                    |
| --- | ------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Canonical Chef-Client Action Vocabulary Contract              | SPEC-READY | None                                                                                                                                | Codex active                                                                                                                                                                             |
| 2   | Chef-Client Lifecycle Naming And Surface Decision Pass        | SPEC-READY | #1                                                                                                                                  | Codex active                                                                                                                                                                             |
| 3   | Derived Chef-Client Lifecycle Action Graph Builder            | SPEC-READY | #1                                                                                                                                  | Codex active                                                                                                                                                                             |
| 4   | Dashboard And Action Center Lifecycle Feed Integration        | SPEC-READY | #3                                                                                                                                  | Codex active                                                                                                                                                                             |
| 5   | Event Detail Lifecycle Action Card                            | SPEC-READY | #3                                                                                                                                  | Codex active                                                                                                                                                                             |
| 6   | Lifecycle Graph Regression Security And Documentation Harness | SPEC-READY | #3                                                                                                                                  | Codex active                                                                                                                                                                             |
| 7   | Post-Event Closeout Completeness Loop                         | SPEC-READY | None                                                                                                                                | Codex active                                                                                                                                                                             |
| 8   | Waiting State Command Surface For Chef-Client Lifecycle       | SPEC-READY | #1                                                                                                                                  | Codex active                                                                                                                                                                             |
| 9   | Event First Lifecycle Proof Surface Wave Plan                 | SPEC-READY | None                                                                                                                                | Codex active                                                                                                                                                                             |
| 10  | Event Current Operating State Card                            | SPEC-READY | #9                                                                                                                                  | Codex active                                                                                                                                                                             |
| 11  | Event Lifecycle Rail And Stage Navigation                     | SPEC-READY | #9                                                                                                                                  | Codex active                                                                                                                                                                             |
| 12  | Lifecycle Client Visibility And Redaction Rules               | SPEC-READY | #11                                                                                                                                 | Codex active                                                                                                                                                                             |
| 13  | Lifecycle First Wave Ownership And Merge Plan                 | SPEC-READY | #9                                                                                                                                  | Codex active                                                                                                                                                                             |
| 14  | Lifecycle Fixture Matrix For Finish-Gate Proof                | SPEC-READY | #9                                                                                                                                  | Codex active                                                                                                                                                                             |
| 15  | Lifecycle Mobile Sticky Action Footer                         | SPEC-READY | #11                                                                                                                                 | Codex active                                                                                                                                                                             |
| 16  | Lifecycle Recovery Menus And Confirmation Patterns            | SPEC-READY | #11                                                                                                                                 | Codex active                                                                                                                                                                             |
| 17  | Lifecycle Waiting Age And Owner Language System               | SPEC-READY | #8                                                                                                                                  | Codex active                                                                                                                                                                             |
| 18  | Remy Draft Versus Canonical Lifecycle Boundary                | SPEC-READY | Derived Chef-Client Lifecycle Action Graph Builder; ChefFlow Confidence And Evidence Labels Everywhere                              | Codex active                                                                                                                                                                             |
| 19  | Live Service Execution Tracker                                | SPEC-READY | None                                                                                                                                | Claude spec-ready                                                                                                                                                                        |
| 20  | Live Service Execution Tracker Regression Coverage            | SPEC-READY | #19                                                                                                                                 | Claude spec-ready                                                                                                                                                                        |
| 21  | Service Day Closeout                                          | SPEC-READY | #19                                                                                                                                 | Claude spec-ready                                                                                                                                                                        |
| 22  | Component-Aware Prep Scheduling                               | SPEC-READY | None                                                                                                                                | Claude spec-ready                                                                                                                                                                        |
| 23  | Ticketed Events (5 critical bugs)                             | PARTIAL    | None                                                                                                                                | KNOWN BLOCKER: missing migration, component, shareToken, NOT NULL, no ledger                                                                                                             |
| 24  | Clean Stop/Resume Trails                                      | DRAFT      | None                                                                                                                                | Claude draft                                                                                                                                                                             |
| 25  | Completion Contract                                           | SPEC-READY | None                                                                                                                                | Claude spec-ready; system-wide deterministic engine                                                                                                                                      |
| 26  | Event Workspace Information Architecture Deepening            | SPEC-READY | Event Detail Lifecycle Action Card; Chef Navigation And Page Header Unification; Chef UI Design System And Density Contract         | Codex active                                                                                                                                                                             |
| 27  | Day-Of Live Service Mode UI Deepening                         | SPEC-READY | Mobile Chef Operations UI Pass; Event Workspace Information Architecture Deepening; Unified Status Badge And Progress Language Pass | Codex active                                                                                                                                                                             |
| 28  | Event Finance Profitability Cockpit UI Deepening              | SPEC-READY | Post-Event Closeout Completeness Loop; Unified Status Badge And Progress Language Pass; Chef UI Design System And Density Contract  | Codex active                                                                                                                                                                             |
| 29  | Menu Variant Accommodations                                   | SPEC-READY | None                                                                                                                                | P1. Same dish, dietary swap (beef->beet). Guest-to-variant assignment, split shopping lists, per-seat service notes, variant pricing. Spec: `docs/specs/menu-variant-accommodations.md`  |
| 30  | Allergy Severity Tiers                                        | SPEC-READY | #29                                                                                                                                 | P0. Preference/intolerance/allergy (yellow/orange/red). Different prep protocols. Cross-contamination tracking. EpiPen/emergency info. Spec: `docs/specs/allergy-severity-tiers.md`      |
| 31  | Equipment Packing List Auto-Generation                        | SPEC-READY | None                                                                                                                                | P1. Menu + venue + guest count -> auto packing list. Chef registry, venue profile, technique-to-equipment map. Spec: `docs/specs/equipment-packing-list.md`                              |
| 32  | Day-Of Timeline Auto-Generation                               | SPEC-READY | #29, #31                                                                                                                            | P1. Reverse-engineer from service time. Travel, setup, prep per course, variants, fire, serve, cleanup. Live tracker on event day. Spec: `docs/specs/day-of-timeline-auto-generation.md` |
| 33  | Guest Count Flex                                              | SPEC-READY | #29, #32                                                                                                                            | P1. 4-stage count tracking (quoted/confirmed/final/actual). Impact assessment, cascade updates, cutoff policies, pricing models. Spec: `docs/specs/guest-count-flex.md`                  |

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

## CLIENT COMMUNICATION & REMY (26 items)

| #   | Item                                                   | Status     | Depends On    | Notes                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------ | ---------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Remy Routines Foundation And Policy Model              | BLOCKED    | None          | Verified 2026-05-16: Remy routines worktree remains partial; runtime match/apply audit logging, tenant/safety tests, proof packs, browser/runtime proof, and auth scan cleanup are missing.                                                                             |
| 2   | Remy Routine Authoring And Approval Experience         | BLOCKED    | #1            | Verified 2026-05-16: blocked by incomplete Remy routines foundation and missing runtime/proof/auth cleanup.                                                                                                                                                             |
| 3   | Remy Routine Runtime Matching And Execution Guardrails | BLOCKED    | #1            | Verified 2026-05-16: blocked by incomplete Remy routines foundation and authoring approval path; runtime/proof/auth cleanup still missing.                                                                                                                              |
| 4   | Remy Routine Safety Audit Tests And Observability      | BLOCKED    | #1            | Verified 2026-05-16: blocked by incomplete Remy runtime foundation and missing tenant/safety tests plus proof packs.                                                                                                                                                    |
| 5   | Remy To Codex Skill Proposal Handoff                   | BLOCKED    | #1            | Verified 2026-05-16: blocked by incomplete Remy routines foundation; human-approved skill proposal handoff cannot proceed until routine policy/runtime is complete.                                                                                                     |
| 6   | Email Snapshot & Portal Strategy                       | DRAFT      | None          | Claude draft; A/B portal strategy                                                                                                                                                                                                                                       |
| 7   | Soft-Close Leverage & Reactivation                     | PARTIAL    | None          | Claude: BUILT, needs verification                                                                                                                                                                                                                                       |
| 8   | Loyalty Client Experience                              | SPEC-READY | None          | Claude spec-ready                                                                                                                                                                                                                                                       |
| 9   | Loyalty Phase 1: Visibility & Perks                    | SPEC-READY | #8            | Claude spec-ready                                                                                                                                                                                                                                                       |
| 10  | Handoff Context Enrichment                             | SPEC-READY | None          | Claude spec-ready                                                                                                                                                                                                                                                       |
| 11  | Inquiry Response Cockpit UI Deepening                  | SPEC-READY | None          | Codex active                                                                                                                                                                                                                                                            |
| 12  | Inquiry-to-Booking Orchestration                       | PARTIAL    | None          | P0. BUILT 2026-05-16: trigger engine, referral deep-link, response enforcement, client status updates, sample menu quick-send, quote auto-gen, journey orchestrator. Needs Playwright verification.                                                                     |
| 13  | Pre-Event Confidence Cadence                           | PARTIAL    | #12           | P1. BUILT 2026-05-16: cadence scheduler, confidence email template, countdown component, migration, rule engine. Needs Playwright verification.                                                                                                                         |
| 14  | Social Proof Loop                                      | PARTIAL    | None          | P1. BUILT 2026-05-16: 48h review request, 7-day reminder, token submission, moderation dashboard, profile integration, portfolio gallery, verified badge. Needs Playwright verification.                                                                                |
| 15  | Referrer Circle Visibility                             | PARTIAL    | #12           | P2. BUILT 2026-05-16: referrer notifications, milestone emails, appreciation actions, thank-you prompt, status timeline, my-referrals enhancement. Needs Playwright verification.                                                                                       |
| 16  | Client Portal Guest Dietary Surfacing                  | PARTIAL    | None          | P1. BUILT 2026-05-16: guest invite card, dietary summary panel, aggregation query, chef-side nudge, reminder action. Needs Playwright verification.                                                                                                                     |
| 17  | Post-Event Photo Gallery                               | PARTIAL    | #14           | P1. BUILT 2026-05-16: photo actions, upload prompt, client gallery, chef management page with visibility toggle. Needs Playwright verification.                                                                                                                         |
| 18  | One-Click Rebook                                       | PARTIAL    | None          | P1. BUILT 2026-05-16: rebook button, prefill logic, repeat client badge, past event context panel, seasonal rebook engine, priority queue bump. Needs Playwright verification.                                                                                          |
| 19  | Client Communications Brand Voice                      | PARTIAL    | None          | P1. BUILT 2026-05-16: brand-voice.ts (3 presets), personal-thank-you template, template audit, communication settings page. Needs Playwright verification.                                                                                                              |
| 20  | Day-Of Live Client Status                              | SPEC-READY | LIFECYCLE #19 | P1. Client-facing live status page on event day (en route -> arrived -> prepping -> serving -> done). 15-min delay auto-notification. Spec: `docs/specs/day-of-live-client-status.md`                                                                                   |
| 21  | Professional Invoice Delivery                          | SPEC-READY | None          | P1. PDF invoice generation, client portal download, auto-email after final payment, corporate "Bill To" support. Spec: `docs/specs/professional-invoice-delivery.md`                                                                                                    |
| 22  | Returning Client Recognition                           | SPEC-READY | #12           | P0. Auto-match inquiries to past clients (email, phone, name, address, referrer chain). Gold "Returning Client" banner, VIP routing, 4h SLA, welcome-back flow, lapsed client outreach, multi-generation family web. Spec: `docs/specs/returning-client-recognition.md` |
| 23  | Event Total Recall                                     | SPEC-READY | #22           | P0. Complete event archive (menu, financial, contract, people, confidential notes, venue, photos). One-tap recall. Seasonal context engine. Age/milestone tracking. Family tree. Proactive dietary intelligence. Spec: `docs/specs/event-total-recall.md`               |
| 24  | Event Media Vault                                      | SPEC-READY | #23           | P0. 4-tier media (raw/curated/polished/published). Venue photo memory. Social post archive. Consent tracking. Cross-event dish photo search. Chef never scrolls Instagram to remember events. Spec: `docs/specs/event-media-vault.md`                                   |
| 25  | Tip Tracking and Gratitude Intelligence                | SPEC-READY | #23           | P2. Log tips per event. Client value scoring. Returning client banner enrichment. Lapsed outreach priority. Tip trends. Spec: `docs/specs/tip-tracking-gratitude-intelligence.md`                                                                                       |
| 26  | Personal Assistant / Delegate Access                   | SPEC-READY | None          | P2. PA/assistant gets own portal token. View/coordinate/approve roles. Chef sees who they're talking to. Multi-delegate support. Spec: `docs/specs/delegate-access.md`                                                                                                  |
| 27  | Wire brand-voice.ts Into Outbound Emails               | DONE       | #19           | Already wired (6 importers). Verified 2026-05-16.                                                                                                                                                                                                                       |
| 28  | Consolidate Dual Payment Reminder Paths                | DONE       | #21           | Already consolidated: reminder-actions.ts delegates to sendPaymentReminderEmail. Verified 2026-05-16.                                                                                                                                                                   |
| 29  | Wire cadence-trigger-handler Into deposit-actions.ts   | DONE       | #13           | Wired in deposit-actions.ts:232 and journey-orchestrator.ts:18. Verified 2026-05-16.                                                                                                                                                                                    |
| 30  | Consolidate Dual Push Notification Systems             | DONE       | None          | Pipeline.ts now routes through createNotification/channel-router. push-notify.ts deleted. Commit e55e4e792.                                                                                                                                                             |
| 31  | Audit Dual Follow-Up Engines                           | DRAFT      | None          | /intensify: lib/communication/follow-up-actions.ts vs lib/follow-up/sequence-engine.ts. May serve different lifecycle stages. Audit before merge. MED yield, unstable.                                                                                                  |
| 32  | Remy SMS Auto-Triage & Intelligent Response            | IN-FLIGHT  | None          | P0 CRITICAL. Rank 1 DONE (SMS routes through pipeline). Migration + auto-ack + triage-gate building. Remaining: approval UI in inbox, escalation logic, Remy draft generation.                                                                                          |

---

## CIRCLES & COLLABORATION (12 items)

| #   | Item                                    | Status     | Depends On | Notes                                                                                                                                                                                                                  |
| --- | --------------------------------------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Circle Approval Flow                    | SPEC-READY | None       | Claude spec-ready                                                                                                                                                                                                      |
| 2   | Circle Reminder Cascade                 | SPEC-READY | #1         | Claude spec-ready                                                                                                                                                                                                      |
| 3   | Collaborator Circle Bridge              | SPEC-READY | None       | Claude spec-ready                                                                                                                                                                                                      |
| 4   | Marisol 1: Circle Bridge                | SPEC-READY | #3         | Claude spec-ready                                                                                                                                                                                                      |
| 5   | Crew Circles Build                      | SPEC-READY | None       | Claude spec-ready                                                                                                                                                                                                      |
| 6   | Dinner Circle Multi-Host Collaboration  | DRAFT      | None       | Claude draft + spec-ready (both lists)                                                                                                                                                                                 |
| 7   | Dinner Circle Unification               | DRAFT      | None       | Claude draft + spec-ready (both lists)                                                                                                                                                                                 |
| 8   | Circles Operating Loop Build Extraction | DRAFT      | None       | Claude draft                                                                                                                                                                                                           |
| 9   | Farm Dinner Co-Host Vision              | UNSPECCED  | #6         | Memory item; needs spec                                                                                                                                                                                                |
| 10  | QR Circle Join                          | SPEC-READY | None       | P0. QR replaces business cards. Chef persistent QR + event-specific QR. Token join, no app. 20 guests in 60 seconds. Lead capture funnel. Spec: `docs/specs/qr-circle-join.md`                                         |
| 11  | Dinner Circle as Event Hub              | SPEC-READY | #10        | P0. Circle = living event document. Rail nav (overview/menu/guests/updates/dietary/photos/details/chat). Real-time updates. Personalized guest view. Host+chef controls. Spec: `docs/specs/dinner-circle-event-hub.md` |
| 12  | Circle Recurring Event Support          | SPEC-READY | #11        | P2. Same circle, new event within it. Monthly dinner clubs. Guest data persists across events. Past menus archived. Covered in dinner-circle-event-hub.md edge case B.                                                 |

---

## MENU & RECIPE & COSTING (19 items)

| #   | Item                                          | Status     | Depends On    | Notes                                                                                                                                                                                                  |
| --- | --------------------------------------------- | ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Configurable Plate Cost                       | SPEC-READY | None          | Claude spec-ready (arthur-klein-fix-1)                                                                                                                                                                 |
| 2   | Cost CSV Exports                              | SPEC-READY | #1            | Claude spec-ready (arthur-klein-fix-2)                                                                                                                                                                 |
| 3   | Cost Propagation Wiring                       | SPEC-READY | #1            | Claude spec-ready                                                                                                                                                                                      |
| 4   | Menu Costing Interrogation                    | SPEC-READY | #3            | Claude spec-ready                                                                                                                                                                                      |
| 5   | Chef Pricing Override Infrastructure          | PARTIAL    | None          | Claude: BUILT, needs verification                                                                                                                                                                      |
| 6   | Food Costing Knowledge System                 | PARTIAL    | None          | Claude: BUILT, needs verification                                                                                                                                                                      |
| 7   | Ingredient Sourcing Intelligence              | SPEC-READY | None          | Claude spec-ready                                                                                                                                                                                      |
| 8   | Menu Builder Chef-Grade Workspace Upgrade     | SPEC-READY | None          | Codex active                                                                                                                                                                                           |
| 9   | Menu Storytelling And FOH Presentation Studio | SPEC-READY | None          | Codex active                                                                                                                                                                                           |
| 10  | Flexible Creation Order & Recipe Lifecycle    | DRAFT      | None          | Claude draft                                                                                                                                                                                           |
| 11  | Recipe Peak Windows                           | DRAFT      | None          | Claude draft                                                                                                                                                                                           |
| 12  | Menu Provenance System                        | SPEC-READY | None          | P0 FOUNDATIONAL. origin_type + origin_metadata columns on menus. Tracks how every menu came into existence. All other menu lifecycle specs build on this. Spec: `docs/specs/menu-provenance-system.md` |
| 13  | Client-Provided Menus                         | SPEC-READY | #12           | P1. Client submits menu (text/form/upload), chef reviews/accepts/modifies/counter-proposes. Reverse approval flow. Spec: `docs/specs/client-provided-menus.md`                                         |
| 14  | Menu Proposal Sets                            | SPEC-READY | #12           | P1. Present 2-3 menu options per event. Client comparison view. Track chosen vs unchosen. Unchosen recycle to library. Spec: `docs/specs/menu-proposal-sets.md`                                        |
| 15  | Menu Fork Lineage                             | SPEC-READY | #12           | P1. Track parent/child menu relationships. Fork count, generation depth, lineage tree. Boost high-fork menus in template suggestions. Spec: `docs/specs/menu-fork-lineage.md`                          |
| 16  | Menu Fate Tracking                            | SPEC-READY | #14, #15      | P1. Business outcome tracking (served/abandoned/proposed_not_selected/superseded/recycled). Separate from status. Auto-derived + manual override. Spec: `docs/specs/menu-fate-tracking.md`             |
| 17  | Dish-Level Menu Assembly                      | SPEC-READY | None          | P1. Build menus bottom-up from dish catalog. Browse/search/filter dishes, assemble into menu. Smart complementary suggestions. Spec: `docs/specs/dish-level-menu-assembly.md`                          |
| 18  | Fixed Menu Offerings                          | SPEC-READY | #14           | P1. Set menus as bookable products. Price/availability/seasonal rotation. Client storefront. "Book This Menu" flow. Spec: `docs/specs/fixed-menu-offerings.md`                                         |
| 19  | Collaborative Menu Editing                    | SPEC-READY | #12, #13, #15 | P2. Turn-based chef+client co-editing. Client suggests changes, chef reviews. Self-fork from showcase. Inline comments. Spec: `docs/specs/collaborative-menu-editing.md`                               |

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

## NAVIGATION & INFORMATION ARCHITECTURE (8 items)

| #   | Item                                           | Status     | Depends On | Notes                                                                                                                                                                                                             |
| --- | ---------------------------------------------- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Chef Navigation And Page Header Unification    | SPEC-READY | None       | Codex active                                                                                                                                                                                                      |
| 2   | Portal Rail System Foundation                  | BLOCKED    | #8         | Verified 2026-05-16: rail worktree implementation remains partial; authenticated runtime screenshots/console/network proof and finish-check are missing, and support edits/local artifacts require lead cleanup.  |
| 3   | Admin Portal Rail Prominence                   | BLOCKED    | #2         | Verified 2026-05-16: blocked by partial rail foundation and missing authenticated runtime proof/finish-check.                                                                                                     |
| 4   | Chef and Client Portal Rail Prominence         | BLOCKED    | #2         | Verified 2026-05-16: blocked by partial rail foundation and missing authenticated runtime proof/finish-check.                                                                                                     |
| 5   | Staff Portal Rail Conversion                   | BLOCKED    | #2         | Verified 2026-05-16: blocked by partial rail foundation and missing authenticated runtime proof/finish-check.                                                                                                     |
| 6   | Partner and Vendor Portal Rail Standardization | BLOCKED    | #2         | Verified 2026-05-16: blocked by partial rail foundation and missing authenticated runtime proof/finish-check.                                                                                                     |
| 7   | First Next Handoff Bar Mounts                  | BLOCKED    | None       | Verified 2026-05-16: shared rail improvements exist, but menu/recipe contextual mounts and authenticated route screenshots remain unproven; related route proof is still blocked by dirty/runtime instability.    |
| 8   | Rail Item Lifecycle And Scoring Engine         | PARTIAL    | None       | BUILT 2026-05-16. 9 files in lib/rail/: types, scoring, state, aggregator, 5 source adapters. Migration SQL ready (not applied). No UI consumer yet. Spec: `docs/specs/rail-item-lifecycle-and-scoring-engine.md` |

---

## AI & INTELLIGENCE (10 items)

| #   | Item                                         | Status     | Depends On | Notes                                                                                                                                                                                                       |
| --- | -------------------------------------------- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | BYOAI Phase 2: Ollama Adapter                | SPEC-READY | None       | Claude spec-ready                                                                                                                                                                                           |
| 2   | BYOAI Phase 2: Privacy Narrative             | SPEC-READY | #1         | Claude spec-ready                                                                                                                                                                                           |
| 3   | Full Cloud AI Runtime & Disclosure           | PARTIAL    | None       | Claude: BUILT, needs verification                                                                                                                                                                           |
| 4   | Local AI Integration                         | PARTIAL    | None       | Claude: BUILT, needs verification                                                                                                                                                                           |
| 5   | Platform Intelligence Hub                    | PARTIAL    | None       | Claude: BUILT + IN-PROGRESS                                                                                                                                                                                 |
| 6   | Business Health Narrative Dashboard          | SPEC-READY | #5         | Codex active                                                                                                                                                                                                |
| 7   | Chef Operating Loop External Memory          | DRAFT      | None       | Claude draft                                                                                                                                                                                                |
| 8   | Configuration Engine                         | DRAFT      | None       | Claude draft                                                                                                                                                                                                |
| 9   | Culinary Operations & Costing System         | DRAFT      | None       | Claude draft                                                                                                                                                                                                |
| 10  | PIE Current Attention Collector              | PARTIAL    | None       | BUILT 2026-05-16: attention resolver, actions, card component, registered in god-mode-dispatcher. Needs Playwright verification.                                                                            |
| 11  | CIL-to-Communication Action Bridge           | SPEC-READY | #5         | /intensify: Wire actOnSignal() to real dispatchers (overdue-invoice->sendPaymentReminder, expired-quote->follow-up, follow_up_needed->email). Both sides exist. Bridge is pure switch/dispatch. HIGH yield. |
| 12  | Lifecycle Engine Activation (Event FSM Hook) | SPEC-READY | None       | /intensify: 8/13 lifecycle files orphaned. Wire trigger-engine + journey-orchestrator into event transitions. Activates entire automated layer. HIGH yield.                                                 |
| 13  | Churn Triggers -> Communication Cadence      | SPEC-READY | #11        | /intensify: intelligence/churn-prevention-triggers computed but no automation acts. Wire into communication cadence for at-risk re-engagement. HIGH yield.                                                  |
| 14  | PIE -> Event Menu Auto-Costing               | SPEC-READY | None       | /intensify: resolve-price chain built (65 files, 8 crons) but never surfaces at event/menu creation. Wire for instant margin visibility before quoting. HIGH yield.                                         |

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

## SECURITY, LEGAL & TRUST (8 items)

| #   | Item                                               | Status     | Depends On | Notes                                                                                                                          |
| --- | -------------------------------------------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Legal Readiness Center & Compliance Infrastructure | IN-FLIGHT  | None       | Codex: in-flight                                                                                                               |
| 2   | Settings, Branding, Account Security               | PARTIAL    | None       | Claude: BUILT, needs verification                                                                                              |
| 3   | ChefFlow Confidence And Evidence Labels Everywhere | SPEC-READY | None       | Codex active                                                                                                                   |
| 4   | Route Coverage CI Test (all pages classified)      | IN-FLIGHT  | None       | Over-the-shoulder: Stripe/NASA lens. Glob all page.tsx, assert each matches route-policy tier. Fail CI on unclassified routes. |
| 5   | Admin Middleware Defense-in-Depth (isAdmin check)  | IN-FLIGHT  | None       | Over-the-shoulder: NASA lens. Runtime-only gate insufficient; add middleware isAdmin enforcement for /admin/\* paths.          |
| 6   | Token Path Rate Limiting (Cloudflare WAF)          | SPEC-READY | None       | Over-the-shoulder: Cloudflare/SRE lens. Brute-force protection for /proposal/, /tip/, /share/ etc. 10 req/min/IP.              |
| 7   | Route Manifest JSON (machine-readable inventory)   | SPEC-READY | #4         | Over-the-shoulder: Linear lens. Auto-generated route manifest with tier, test status, purpose. Powers health dashboard.        |
| 8   | Dead Route Detection & Cleanup                     | SPEC-READY | #4, #7     | Over-the-shoulder: NASA lens. 269 routes with no nav path. Classify as intentional-token-access or orphan. Dispose orphans.    |

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

## DISCOVERY INTENSIFICATION (6 items)

> Surfaced by `/intensify discovery` 2026-05-16 (first deep run, 141 files). Pure wiring, no new features.

| #   | Item                                                       | Status | Depends On | Notes                                                                                                                                                    |
| --- | ---------------------------------------------------------- | ------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CIL Signals -> God-Mode Dispatcher                         | DONE   | None       | /intensify: cil-signal-resolver.ts maps ProactiveSignal -> GodModeResolvedItem. Registered in warmResolvers(). Built 2026-05-16.                         |
| 2   | Intelligence Layer -> God-Mode Resolver(s)                 | DONE   | None       | /intensify: intelligence-resolver.ts wires proactive-alerts, churn, post-event, inquiry-triage. 4 sources parallel, capped at 8 items. Built 2026-05-16. |
| 3   | Scoring Path Consolidation (3 engines -> layered pipeline) | DONE   | None       | /intensify: getTieredRail() server action in universal-rail-actions.ts. Canonical unified path through assembleTieredRail(). Built 2026-05-16.           |
| 4   | Wire Orphaned Rail-Tier-Assigner                           | DONE   | #3         | /intensify: tiered-rail.tsx + tier-row.tsx already consume. Server action wrapper added. Built 2026-05-16.                                               |
| 5   | Cadence Trigger Handler -> God-Mode Resolver               | DONE   | None       | /intensify: scheduled-message-resolver.ts queries pending messages, tiers by urgency (overdue p1, today p2, upcoming p3). Built 2026-05-16.              |
| 6   | Search Autocomplete -> Rail Registry Query                 | DONE   | None       | /intensify: buildDynamicAutocompleteSources() reads constants + public registry. Deduped, fallback preserved. Built 2026-05-16.                          |

---

## RAIL INTENSIFICATION (6 items)

> Surfaced by `/intensify rail` 2026-05-16 (deep pass #2, 120+ files). Trigger met from run #1. Pure wiring + cleanup.

| #   | Item                                                          | Status     | Depends On | Notes                                                                                                                                                                     |
| --- | ------------------------------------------------------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Wire Lifecycle Journey-Orchestrator -> Rail Resolver          | SPEC-READY | None       | /intensify: new lifecycle-stage-resolver.ts. Reads getJourneyState + evaluateTriggers, emits rail items per active event. 10-stage lifecycle, zero rail visibility today. |
| 2   | Wire Cadence-Scheduler Due Items -> Rail Resolver             | SPEC-READY | None       | /intensify: new cadence-due-resolver.ts. Lookahead on processDueCadenceItems, surfaces "email firing in X hours". 7 cadence points invisible today.                       |
| 3   | Delete Dead Rail Code (GodModeRailSection + old 5-tier)       | SPEC-READY | None       | /intensify: remove GodModeRailSection (dashboard page), rail-full.tsx, rail-tier-group.tsx, getGodModeRail/assembleGodModeRail. All superseded by tiered-rail.tsx.        |
| 4   | Wire Completion Resolver (hydrate chef-rail-registry entries) | SPEC-READY | None       | /intensify: completion engine stable. Registry declares items (chef.completion_menu etc.) but no resolver fills them. Mechanical wiring.                                  |
| 5   | Rail Item State Table + Seen/Snoozed/Dismissed Tracking       | SPEC-READY | #1, #2, #4 | /intensify: migration + thin persistence. Spec defines state machine (surfaced->seen->acted->resolved->expired->archived). Value compounds after resolvers land.          |
| 6   | Density Caps Enforcement (3/8/12/6 per tier)                  | SPEC-READY | None       | /intensify: clamp logic in assembleTieredRail. Prevents tier overflow as resolver count grows. Simple, low-risk.                                                          |

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

## CHEF AS CONSUMER (4 items)

| #   | Item                                               | Status     | Depends On | Notes                                                                                  |
| --- | -------------------------------------------------- | ---------- | ---------- | -------------------------------------------------------------------------------------- |
| 1   | Discover: Browse Food Experiences From Chef Portal | SPEC-READY | None       | Reuses lib/discover (18), lib/public-consumer (2), lib/directory (7). Zero new backend |
| 2   | Book: Hire Another Chef As A Client                | SPEC-READY | None       | Reuses lib/booking (9), lib/events (68), lib/quotes (9). Client-perspective wrapper    |
| 3   | Community Events: Attend Peer Dinners And Pop-Ups  | SPEC-READY | None       | Reuses lib/tickets (14), lib/dinner-circles (6), lib/popups (5). Attendee view only    |
| 4   | Local Food: Farmers Markets, Trucks, Shops Near Me | SPEC-READY | None       | Reuses lib/discover (18), lib/ingredients (5), PIE seasonal data. Consumer lens        |

> Spec: `docs/specs/chef-as-consumer.md`
> Cohesion multiplier: zero new tables, zero new APIs. New views on existing data.

---

## GROWTH & GUEST CONVERSION (3 items)

| #   | Item                                             | Status     | Depends On | Notes                                                                                                                                                                            |
| --- | ------------------------------------------------ | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Fix Guest Feedback CTA Label And Attribution     | SPEC-READY | None       | Quick win. "Book Again" → "Hire {chef}". Add `?ref=guest-feedback&via={name}` to inquiry link. ~10 lines in `app/(public)/guest-feedback/[token]/page.tsx`                       |
| 2   | Guest Conversion Source Attribution On Inquiries | SPEC-READY | None       | Add `source_type` + `source_event_id` to inquiries table. Relax ref validation in inquiry form. Chef sees "from dinner guest" on inquiry list. Additive migration                |
| 3   | Positive-Feedback Guest Conversion Email         | SPEC-READY | #2         | New Inngest job. Guest rates 4+ stars → 3 days later gets "book your own dinner" email. Only non-clients who haven't inquired. Attribution flows through. Compounds every dinner |

> Research basis: Post-dinner guests are warmest leads. 60 guests/month already in system with no conversion mechanism. Even 5% click rate = 1-2 new inquiries/month from zero chef effort.
> Files: `lib/jobs/post-event-jobs.ts` (pattern), `lib/sharing/actions.ts` (trigger), `app/(public)/guest-feedback/[token]/page.tsx` (CTA fix)

---

## SUMMARY

| Status                      | Count   |
| --------------------------- | ------- |
| SPEC-READY                  | 192     |
| PARTIAL (built, unverified) | 24      |
| DRAFT                       | 20      |
| BLOCKED                     | 15      |
| IN-FLIGHT                   | 2       |
| UNSPECCED                   | 14      |
| **TOTAL**                   | **267** |

### Cross-Category Dependencies

- Remy items (Client Communication) depend on Remy Routines Foundation (BLOCKED)
- Portal Rail items (Navigation) block several portal-specific UI items
- PIE Attention Collector (AI) depends on PIE infrastructure (separate system on Pi)
- UI System items (#1 Design Contract) is upstream of ~40 visual/interaction items
- Lifecycle items feed into many UI items (visual styling, mobile ergonomics, etc.)
