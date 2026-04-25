# MemPalace Recovery And Leverage Report

Date: 2026-04-24
Scope: ChefFlow and OpenClaw work history visible from the local MemPalace export, session logs, memory notes, specs, research docs, and current repo docs.
Status: source-backed planning report

## Search Method And Constraint

I searched the readable MemPalace mirrors and supporting repo memory rather than relying on live Chroma vector search. The live MemPalace query path currently fails with the same Chroma compaction/deserialization error already recorded in the repo: conversation mining depends on `py -m mempalace`, failures are logged and retried, and the latest report records `unsupported opcode 'f'` Chroma errors for both conversation wings (`obsidian_export/live_pipeline_report.md:44`, `obsidian_export/live_pipeline_report.md:55`, `obsidian_export/live_pipeline_report.md:113`, `obsidian_export/live_pipeline_report.md:171`).

Readable corpus covered:

- `obsidian_export/cfv1`: 34,246 files
- `obsidian_export/chatgpt-conversations`: 2,520 files
- `obsidian_export/chefflow-conversations`: 587 files
- `obsidian_export/codex-conversations`: 1,010 files
- `obsidian_export/sessions`: 2 files
- `memory`, `docs`, `docs/archive`, and current repo source

Because live semantic search is broken, this report cites source conversations through `docs/session-log.md` and `docs/archive/session-log-archive.md` where those sessions were summarized, plus the exact repo/memory documents that preserve the decision.

## 1. Abandoned Work

### A1. Built-but-unverified product specs

What it was: shipped implementation work that still lacks Playwright/manual QA proof. The active queue says eight specs remain in "built" status: code was written and type checks passed, but Playwright or manual QA is pending (`docs/research/built-specs-verification-queue.md:9`).

How far it got: enough code exists to produce route-by-route verification checklists. P0s include Chef Golden Path Reliability, Chef Pricing Override Infrastructure, CPA-Ready Tax Export, and Full Cloud AI Runtime (`docs/research/built-specs-verification-queue.md:34`, `docs/research/built-specs-verification-queue.md:74`, `docs/research/built-specs-verification-queue.md:109`, `docs/research/built-specs-verification-queue.md:143`).

Still relevant: yes. The queue ranks Golden Path, Pricing Overrides, CPA export, and AI runtime as high-impact because failures affect core chef workflows, financial truth, tax numbers, and privacy claims (`docs/research/built-specs-verification-queue.md:400`, `docs/research/built-specs-verification-queue.md:401`, `docs/research/built-specs-verification-queue.md:402`, `docs/research/built-specs-verification-queue.md:403`).

Source conversation: phase shift audit found 14 built-but-unverified specs and explicitly set the anti-clutter rule: no new features without validated gaps (`docs/archive/session-log-archive.md:790`, `docs/archive/session-log-archive.md:794`).

### A2. Ticketed events

What it was: public ticketed event distribution and event-ticketing support.

How far it got: a deep audit covered `lib/tickets/*.ts`, public event route, chef event tickets tab, and the ticketing migration. It found five critical blockers: missing `event_share_settings` table creation, missing `public-event-view.tsx`, wrong share token passed from event detail, `event_guests.event_share_id` blocking ticket guests, and missing ledger entries for ticket revenue (`docs/session-log.md:96`, `docs/session-log.md:101`).

Still relevant: yes if ticketed dinners/classes are in scope. It touches events, finance, public distribution, and ledger integrity. Do not treat it as shipped until the migration, public component, share-token wiring, guest schema, and ledger write are fixed.

Source conversation: palace audit agent session (`docs/session-log.md:96`, `docs/session-log.md:101`).

### A3. OpenClaw Pi-only specs

What it was: OpenClaw total capture, archive digester, and capture countdown/pixel schedule.

How far it got: planned and partly verified at the spec level, but not executable from the ChefFlow machine. A session records four specs built and verified, then says three remaining OpenClaw specs all require Raspberry Pi SSH access and cannot be built from the ChefFlow machine (`docs/archive/session-log-archive.md:777`).

Still relevant: yes, but only in the runtime/host lane. Treat these as not abandoned conceptually, but blocked by ownership and host access.

Source conversation: OpenClaw builder closeout (`docs/archive/session-log-archive.md:777`).

### A4. Survey launch lane

What it was: operator and client survey distribution, passive surfacing, deploy verification, public hardening, and analysis.

How far it got: substantial docs and handoffs were built, then repeated context passes redirected fallback docs through the builder-start handoff (`docs/archive/session-log-archive.md:1027`). Later, the default queue was explicitly changed away from survey-first into built-verification debt and hardening work (`docs/research/current-builder-start-handoff-2026-04-02.md:33`, `docs/research/current-builder-start-handoff-2026-04-02.md:37`).

Still relevant: yes as validation work, not as the default builder owner. The real version is "explicit validation branch," not "universal next step."

Source conversation: survey context alignment and authority drift cleanup (`docs/archive/session-log-archive.md:1027`, `docs/archive/session-log-archive.md:1087`).

### A5. OpenClaw VR/MR spatial dashboard

What it was: VR/MR spatial dashboard for OpenClaw.

How far it got: enough to have a live Pi-side surface, but the memory note says any future build must treat the live page and backing API as source of truth until Pi-side code is reconciled into source control (`memory/project_openclaw_vr_spatial_dashboard.md:14`). It also says the live Pi game surface appears newer or different from dashboard files in the repo (`memory/project_openclaw_vr_spatial_dashboard.md:140`).

Still relevant: maybe, but not before reconciliation. This is high-risk to continue until source ownership is fixed.

Source conversation: persistent OpenClaw VR note (`memory/project_openclaw_vr_spatial_dashboard.md:14`, `memory/project_openclaw_vr_spatial_dashboard.md:140`).

### A6. AI vendor auto-calling

What it was: the fourth tier of ingredient sourcing where ChefFlow calls vendors automatically.

How far it got: documented as "in development" in the user manual after the current three-tier food catalog fallback (`docs/USER_MANUAL.md:282`, `docs/USER_MANUAL.md:292`).

Still relevant: later. The safer current work is to make OpenClaw health and ingredient-cost truth reliable before adding autonomous calling.

Source conversation: current manual/product documentation (`docs/USER_MANUAL.md:282`, `docs/USER_MANUAL.md:292`).

### A7. Allergen warning system

What it was: allergen cross-contamination warning engine, UI components, and server actions.

How far it got: it was explicitly "fully built" but not wired into any page; later work connected it to three surfaces (`docs/allergen-integration.md:5`).

Still relevant: mostly resolved, but important as a pattern: built components can sit unused until someone audits wiring.

Source conversation: allergen integration note (`docs/allergen-integration.md:5`).

## 2. Repeated Frustrations

### R1. Context re-entry and handoff drift

Pattern: sessions repeatedly rebuilt the same "where do I start?" context. The current builder handoff exists specifically to provide one canonical starting document for repo posture, planning parent, queue order, and branching rules (`docs/research/current-builder-start-handoff-2026-04-02.md:6`). It later had to say "read these in this exact order" (`docs/research/current-builder-start-handoff-2026-04-02.md:50`).

Specific repetition: fallback docs skipped the builder-start handoff and pointed straight at survey handoffs, requiring another cleanup pass (`docs/archive/session-log-archive.md:1027`). Then a broader sweep found authority drift across fallback, research, and long-term planning docs (`docs/archive/session-log-archive.md:1087`).

Actionable failure: handoff order is stored in prose, not enforced by an executable registry.

### R2. Dirty checkout versus green baseline confusion

Pattern: builders kept re-establishing whether the repo was green, broken, or intentionally dirty. The active handoff states that the baseline is green but lives on a preserved dirty checkout, and that this is not a contradiction (`docs/research/current-builder-start-handoff-2026-04-02.md:18`). Later, a session found the canonical builder prompt still implied a hard clean-worktree stop even though preserved dirty mode was intended (`docs/archive/session-log-archive.md:1486`).

Actionable failure: build truth and dirty-worktree policy are not machine-checkable for a new agent.

### R3. Built-but-unverified treated as complete

Pattern: multiple sessions discovered that "built" did not mean verified. The active queue states eight specs still have code and type checks but lack Playwright/manual QA proof (`docs/research/built-specs-verification-queue.md:9`). The builder-start handoff says the default queue starts by burning down active built-but-unverified debt (`docs/research/current-builder-start-handoff-2026-04-02.md:37`).

Actionable failure: spec status is not tied to verification artifacts in a single registry.

### R4. OpenClaw health truth re-litigated

Pattern: OpenClaw health was audited repeatedly because each surface gave a different answer. The system audit says wrapper-level sync health was red while downstream price propagation completed, creating at least two competing truths (`docs/anthropic-system-audit-2026-04-18.md:11`). A follow-on audit found at least four competing freshness clocks (`docs/anthropic-follow-on-audit-answers-2026-04-18.md:13`).

Actionable failure: no canonical OpenClaw health contract exists yet.

### R5. Lane ownership across ChefFlow, OpenClaw, and Raspberry Pi

Pattern: work was mixed across local app, OpenClaw runtime, and Pi host concerns. A docket had to define four lanes: website-owned, runtime-owned, host-owned, and bridge-owned (`docs/research/builder-docket-runtime-ownership-map-2026-04-03.md:69`). Later session notes say the sorter was needed whenever work crosses ChefFlow, OpenClaw, and Raspberry Pi boundaries (`docs/archive/session-log-archive.md:1549`).

Actionable failure: agents lacked an enforced owner/lane tag before claiming work.

### R6. QA ownership

Pattern: you had to clarify that there are no external testers; Claude/Codex are the QA team, and the goal is to test every input/output across chef, client, and public perspectives (`docs/archive/session-log-archive.md:785`).

Actionable failure: verification responsibility was not attached to each built spec as a mandatory closeout field.

## 3. Buried Decisions

### D1. ChefFlow is operator-first, not a marketplace

Real decision: ChefFlow is a chef-first operating system for independent and small culinary businesses (`docs/project-definition-and-scope.md:23`). The primary product is the authenticated operator workspace (`docs/project-definition-and-scope.md:35`). It is not primarily a consumer marketplace or commission-based booking intermediary (`docs/project-definition-and-scope.md:138`).

Contradiction risk: consumer discovery, public directory, marketplace, and ticketed event work can drift into "marketplace owns the transaction" language.

Use this version: operator system first; public/client/staff/partner/admin/API surfaces support it (`docs/project-definition-and-scope.md:189`).

### D2. Universal/free core access, not hard Pro gating

Real decision: core platform access is universal (`docs/project-definition-and-scope.md:161`), and the user manual says all features are free with optional support contribution (`docs/USER_MANUAL.md:13`).

Contradiction risk: legacy `requirePro`, `UpgradeGate`, and Pro-era terms still exist in implementation history.

Use this version: supportive monetization, not paywalled core functionality.

### D3. AI is deterministic-first and cannot mutate canonical state

Real decision: AI never mutates canonical state (`docs/AI_POLICY.md:7`), ChefFlow is deterministic first and intelligent second (`docs/AI_POLICY.md:149`), and if AI is unplugged, core work still must function (`docs/AI_POLICY.md:167`).

Contradiction risk: Remy/autonomous feature ideas can imply AI-owned workflow execution.

Use this version: AI can draft, explain, summarize, and recommend; deterministic workflows own state changes.

### D4. Default builder queue is no longer survey-first

Real decision: the default queue is explicitly no longer survey-first (`docs/research/current-builder-start-handoff-2026-04-02.md:33`). The default order is built-verification debt, production-hardening foundations, release-contract truth, then continuity/consolidation queue (`docs/research/current-builder-start-handoff-2026-04-02.md:37`).

Contradiction risk: old survey handoffs still feel prominent.

Use this version: survey work is an explicit validation branch, not the default owner.

### D5. OpenClaw is internal infrastructure

Real decision: OpenClaw runtime work must be routed separately from website/product work; runtime, host, website, and bridge lanes are distinct (`docs/research/builder-docket-runtime-ownership-map-2026-04-03.md:69`). Social orchestration memory says ChefFlow is the source of truth and publisher while OpenClaw is the content operator (`docs/archive/session-log-archive.md:605`).

Contradiction risk: OpenClaw-specific UI, public copy, or host tasks get mixed into normal ChefFlow builder work.

Use this version: classify ownership before building.

## 4. Overlapping Work

### O1. Lead scoring

Overlap: before Goldmine Phase 3, ChefFlow had three separate lead scoring systems (`docs/archive/goldmine-phase3-risk-gap-closure.md:197`).

Consolidation: keep the Phase 3 consolidated owner as canonical; do not add a fourth score path. Any future score UI should consume the canonical lead intelligence result.

### O2. Builder-start and survey handoff authority

Overlap: fallback survey docs, recovery docs, and builder-start docs all tried to own "current next step." This caused authority drift until a cleanup made builder-start the canonical top-level entry (`docs/archive/session-log-archive.md:1087`).

Consolidation: build a machine-readable `work-continuity` registry that all handoffs render from instead of editing parallel prose.

### O3. Build health versus release artifact truth

Overlap: canonical build exits `0`, but `.next/BUILD_ID` is missing and still treated as canonical build identity by health/sentinel surfaces (`docs/archive/session-log-archive.md:1797`). The active handoff still says build-artifact truth is incomplete (`docs/research/current-builder-start-handoff-2026-04-02.md:163`).

Consolidation: finish `p1-build-and-release-contract-truth` or make the new continuity registry flag release-contract drift as unresolved.

### O4. Tasks versus todos

Overlap: structured task system and lightweight `chef_todos` previously blurred together. The completeness map says the current lane is closed: tasks are the structured system; todos are lightweight reminders (`docs/research/foundations/2026-04-03-system-completeness-gap-map.md:76`).

Consolidation: preserve the distinction; new work must not create a shared fake schema.

### O5. OpenClaw freshness/status surfaces

Overlap: daemon status, downstream price history, sentinel route freshness counts, scheduled tasks, and route comments all report different partial truths. A follow-on audit says there is no one truthful answer to "Is OpenClaw healthy?" (`docs/anthropic-follow-on-audit-answers-2026-04-18.md:225`), and cadence is spread across daemon code, tasks, routes, and docs (`docs/anthropic-follow-on-audit-answers-2026-04-18.md:381`).

Consolidation: create one canonical OpenClaw health contract with stage-aware status.

### O6. Social publishing and OpenClaw content operation

Overlap: the repo already has a meaningful `/social` subsystem (`memory/project_openclaw_social_media_orchestration.md:11`), while OpenClaw social planning also exists. The memory note calls for truth/drift fixes and a normalized OpenClaw-to-ChefFlow ingestion boundary (`memory/project_openclaw_social_media_orchestration.md:103`, `memory/project_openclaw_social_media_orchestration.md:106`).

Consolidation: ChefFlow owns publishing state and compliance; OpenClaw emits normalized packages.

## 5. Forgotten Leverage

### F1. Verification debt burn-down

Why it matters: the highest ROI work is validating built core flows before adding new ones. Eight built specs still need verification (`docs/research/built-specs-verification-queue.md:9`).

Move now: burn down Golden Path, Pricing Override, CPA export, and AI runtime verification first.

### F2. Ingredient pricing coverage and truth

Why it matters: the sanity check found one fail: ingredient pricing coverage. It called incomplete ingredient pricing the single biggest risk because it leads to inaccurate food cost calculations (`docs/archive/session-log-archive.md:803`).

Move now: connect OpenClaw health, price provenance, and costing confidence into one operator-visible truth path before adding new pricing UI.

### F3. Quote-to-event auto-create

Why it matters: operator research found quote-to-event should auto-create (`docs/archive/session-log-archive.md:803`).

Move later: after quote/pricing verification is complete, convert accepted quotes into draft/accepted events using existing event FSM and audit trails.

### F4. Receipt quick-capture

Why it matters: the same sanity check found receipt quick-capture is a real unmet need (`docs/archive/session-log-archive.md:803`).

Move later: tie receipt capture into expenses, CPA export readiness, and event closeout.

### F5. Chef Opportunity Network

Why it matters: beta/research found chef hiring is weakly served by existing tools and word-of-mouth dominates. The Opportunity Network spec exists and the built queue still includes it (`docs/archive/session-log-archive.md:144`, `docs/research/built-specs-verification-queue.md:184`).

Move now only as QA: verify the built network behavior before extending it.

### F6. Component-aware prep scheduling

Why it matters: the spec uses existing component prep data to generate event prep blocks, closing a real beta-user prep gap (`docs/archive/session-log-archive.md:184`).

Move later: verify current prep timeline and station flows first, then resurrect if event operations needs a visible win.

### F7. Soft-close leverage

Why it matters: follow-up work found the required soft-close pieces were already implemented by a prior session and only needed verification (`docs/archive/session-log-archive.md:741`, `docs/archive/session-log-archive.md:746`).

Move later: make it part of inquiry/pipeline verification, not a new feature.

## 6. ChefFlow + OpenClaw Gaps

### G1. No canonical OpenClaw health contract

Gap: OpenClaw can be "failed" and "fresh" depending on the layer. The audit says ChefFlow cannot answer with one source of truth (`docs/anthropic-system-audit-2026-04-18.md:286`).

Action: build one stage-aware health contract with `success`, `partial`, `stale`, and `failed`; expose it to chef/admin surfaces and logs.

### G2. Fresh price data is not enough to prove sync health

Gap: fresh downstream price history proves some OpenClaw-backed data flowed, but does not prove the full pipeline is healthy (`docs/anthropic-follow-on-audit-supplement-2026-04-18.md:140`).

Action: link price history counts to the health contract by stage and source.

### G3. OpenClaw Auto-Sync is host-owned, not repo-owned

Gap: the running `OpenClaw Auto-Sync` task appears host-owned, and the repo does not contain a checked-in registration script for it (`docs/anthropic-follow-on-audit-answers-2026-04-18.md:20`, `docs/anthropic-follow-on-audit-answers-2026-04-18.md:294`).

Action: either codify the scheduled task in repo-owned host setup or mark it as external host state in the health contract.

### G4. Cadence policy is scattered

Gap: cadence is spread across daemon code, scheduled tasks, route comments, and docs; there is no single configuration authority (`docs/anthropic-follow-on-audit-answers-2026-04-18.md:381`).

Action: create a code/config-level cadence policy and render all docs/status from it.

### G5. Social content ingestion boundary is incomplete

Gap: the social orchestration note says to fix `/social` truth drift and add a normalized OpenClaw-to-ChefFlow ingestion boundary (`memory/project_openclaw_social_media_orchestration.md:103`, `memory/project_openclaw_social_media_orchestration.md:106`).

Action: do not let OpenClaw publish. It should emit packages; ChefFlow should own approvals and platform-safe delivery.

### G6. VR/MR source drift

Gap: live Pi-side VR/MR surface is not reconciled into source control, so future builds do not know which code is real (`memory/project_openclaw_vr_spatial_dashboard.md:14`, `memory/project_openclaw_vr_spatial_dashboard.md:140`).

Action: reconcile source before feature work.

### G7. Ingredient sourcing fourth tier is not wired

Gap: manual docs say AI vendor auto-calling is in development (`docs/USER_MANUAL.md:292`).

Action: postpone autonomous calling until OpenClaw health, vendor relevance, consent, and audit boundaries are explicit.

## 7. Cost Of Repetition

Estimate: at least 18 to 25 sessions were spent re-establishing context that should have been persistent.

Evidence basis:

- repeated survey/builder-start cleanup passes (`docs/archive/session-log-archive.md:1027`, `docs/archive/session-log-archive.md:1077`, `docs/archive/session-log-archive.md:1087`)
- repeated dirty-checkout and build-state interpretation passes (`docs/archive/session-log-archive.md:1486`, `docs/archive/session-log-archive.md:1797`)
- repeated queue-selection and runtime ownership passes (`docs/archive/session-log-archive.md:1540`, `docs/archive/session-log-archive.md:1549`, `docs/archive/session-log-archive.md:1610`)
- repeated OpenClaw health/cadence investigations across system audit, unasked questions, follow-on answers, and supplement (`docs/anthropic-system-audit-2026-04-18.md:11`, `docs/anthropic-follow-on-audit-answers-2026-04-18.md:13`, `docs/anthropic-follow-on-audit-answers-2026-04-18.md:225`, `docs/anthropic-follow-on-audit-answers-2026-04-18.md:381`)
- repeated verification queue rediscovery from 14 built-but-unverified specs down to the active queue (`docs/archive/session-log-archive.md:794`, `docs/research/built-specs-verification-queue.md:9`)

Practical tax:

- Conservative: 18 sessions x 20 minutes = 6 hours of re-contextualization.
- Likely: 25 sessions x 35 minutes = 14.6 hours.
- High-end if you include failed branches and stale handoff cleanup: 25+ hours.

The fix is not more prose. The fix is an additive, source-backed Work Continuity Control Plane that extracts:

1. work item
2. source conversation
3. current status
4. owning lane
5. canonical decision
6. verification evidence
7. next action
8. stale/contradictory pointers

and makes that registry the input to handoffs instead of making each new session reconstruct the world.
