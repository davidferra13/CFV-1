# Work Continuity Index

Generated from repo-local source files. Missing source files produce warnings, not generation failures.

## Summary Counts

### By Category

- abandoned_work: 0
- built_unverified: 11
- buried_decision: 2
- overlap: 0
- forgotten_leverage: 1
- openclaw_gap: 4
- release_gap: 2
- handoff_drift: 0

### By Lane

- website-owned: 12
- runtime-owned: 1
- host-owned: 1
- bridge-owned: 3
- docs-owned: 3

### By Status

- ready_spec: 1
- built_unverified: 11
- verified: 2
- blocked: 3
- stale: 0
- research_backed_unspecced: 2
- needs_triage: 1

## Start Here

- **Ticketed events critical blockers:** Run ticketed-events repair handoff before treating ticketing as shipped.

## Built-Unverified Queue

### Built-but-unverified specs

- Category: built_unverified
- Lane: website-owned
- Status: built_unverified
- Next action: Verify built specs in queue order.
- Sources: docs/research/built-specs-verification-queue.md:9 (built specs verification queue summary)

### Chef Golden Path Reliability

- Category: built_unverified
- Lane: website-owned
- Status: built_unverified
- Next action: Run the verification steps for docs/specs/p0-chef-golden-path-reliability.md.
- Sources: docs/research/built-specs-verification-queue.md:34 (P0 built spec queue entry); docs/research/built-specs-verification-queue.md:36 (docs/specs/p0-chef-golden-path-reliability.md)

### Chef Opportunity Network

- Category: built_unverified
- Lane: website-owned
- Status: built_unverified
- Next action: Run the verification steps for docs/specs/chef-opportunity-network.md.
- Sources: docs/research/built-specs-verification-queue.md:184 (P1 built spec queue entry); docs/research/built-specs-verification-queue.md:186 (docs/specs/chef-opportunity-network.md)

### Chef Pricing Override Infrastructure

- Category: built_unverified
- Lane: website-owned
- Status: built_unverified
- Next action: Run the verification steps for docs/specs/chef-pricing-override-infrastructure.md.
- Sources: docs/research/built-specs-verification-queue.md:74 (P0 built spec queue entry); docs/research/built-specs-verification-queue.md:76 (docs/specs/chef-pricing-override-infrastructure.md)

### CPA-Ready Tax Export and Reconciliation

- Category: built_unverified
- Lane: website-owned
- Status: built_unverified
- Next action: Run the verification steps for docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md.
- Sources: docs/research/built-specs-verification-queue.md:109 (P0 built spec queue entry); docs/research/built-specs-verification-queue.md:111 (docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md)

### Featured Chef Public Proof and Booking

- Category: built_unverified
- Lane: website-owned
- Status: built_unverified
- Next action: Run the verification steps for docs/specs/featured-chef-public-proof-and-booking.md.
- Sources: docs/research/built-specs-verification-queue.md:255 (P1 built spec queue entry); docs/research/built-specs-verification-queue.md:257 (docs/specs/featured-chef-public-proof-and-booking.md)

### Full Cloud AI Runtime and Disclosure

- Category: built_unverified
- Lane: website-owned
- Status: built_unverified
- Next action: Run the verification steps for docs/specs/full-cloud-ai-runtime-and-disclosure.md.
- Sources: docs/research/built-specs-verification-queue.md:143 (P0 built spec queue entry); docs/research/built-specs-verification-queue.md:145 (docs/specs/full-cloud-ai-runtime-and-disclosure.md)

### Notes-Dishes-Menus Client-Event Pipeline

- Category: built_unverified
- Lane: website-owned
- Status: built_unverified
- Next action: Run the verification steps for docs/specs/notes-dishes-menus-client-event-pipeline.md.
- Sources: docs/research/built-specs-verification-queue.md:217 (P1 built spec queue entry); docs/research/built-specs-verification-queue.md:219 (docs/specs/notes-dishes-menus-client-event-pipeline.md)

### Public Chef Credentials Showcase

- Category: built_unverified
- Lane: website-owned
- Status: built_unverified
- Next action: Run the verification steps for docs/specs/public-chef-credentials-showcase.md.
- Sources: docs/research/built-specs-verification-queue.md:290 (P1 (depends on featured-chef-public-proof-and-booking) built spec queue entry); docs/research/built-specs-verification-queue.md:292 (docs/specs/public-chef-credentials-showcase.md)

### Soft-Close Leverage and Reactivation

- Category: built_unverified
- Lane: website-owned
- Status: built_unverified
- Next action: Run the verification steps for docs/specs/soft-close-leverage-and-reactivation.md.
- Sources: docs/research/built-specs-verification-queue.md:327 (P1 built spec queue entry); docs/research/built-specs-verification-queue.md:329 (docs/specs/soft-close-leverage-and-reactivation.md)

### Staff Ops Unified Workflow

- Category: built_unverified
- Lane: website-owned
- Status: built_unverified
- Next action: Run the verification steps for docs/specs/staff-ops-unified-workflow.md.
- Sources: docs/research/built-specs-verification-queue.md:363 (P1 built spec queue entry); docs/research/built-specs-verification-queue.md:365 (docs/specs/staff-ops-unified-workflow.md)

## Blocked Work

### MemPalace live query failure

- Category: forgotten_leverage
- Lane: docs-owned
- Status: blocked
- Next action: Source-backed continuity index remains required until vector path is repaired.
- Sources: obsidian_export/live_pipeline_report.md:55 (latest live pipeline MemPalace error); obsidian_export/live_pipeline_report.md:171 (Chroma compaction/deserialization failure)

### VR/MR source drift

- Category: openclaw_gap
- Lane: host-owned
- Status: blocked
- Next action: Reconcile Pi-side source before feature work.
- Sources: memory/project_openclaw_vr_spatial_dashboard.md:14 (Pi-hosted live page is source of truth); memory/project_openclaw_vr_spatial_dashboard.md:140 (Pi source must be reconciled first)

### Ticketed events critical blockers

- Category: release_gap
- Lane: website-owned
- Status: blocked
- Next action: Run ticketed-events repair handoff before treating ticketing as shipped.
- Sources: docs/session-log.md:71 (ticketed events audit found critical blockers)

## Buried Decisions

### Preserved dirty checkout policy

- Category: buried_decision
- Lane: docs-owned
- Status: verified
- Canonical decision: Preserved dirty mode is allowed only when build-state and active handoff both authorize it.
- Next action: Continue requiring build-state plus active handoff authorization before preserving dirty mode.
- Sources: docs/archive/session-log-archive.md:1486 (dirty checkout policy clarified)

### Survey handoff demotion

- Category: buried_decision
- Lane: docs-owned
- Status: verified
- Canonical decision: Survey is explicit validation branch, not default builder queue.
- Next action: Keep survey work behind explicit branch selection.
- Sources: docs/research/current-builder-start-handoff-2026-04-02.md:35 (default builder queue starts elsewhere); docs/research/current-builder-start-handoff-2026-04-02.md:42 (survey is explicitly not the default queue)

## OpenClaw/ChefFlow Bridge Gaps

### OpenClaw health split

- Category: openclaw_gap
- Lane: bridge-owned
- Status: ready_spec
- Contradiction: Wrapper health, downstream price data, local mirror freshness, and sync-run state answer different questions.
- Next action: Build canonical stage-aware OpenClaw health contract.
- Sources: docs/anthropic-system-audit-2026-04-18.md:11 (audit identifies competing OpenClaw health truths); docs/anthropic-follow-on-audit-answers-2026-04-18.md:225 (follow-on audit confirms no canonical health answer)

### OpenClaw social ingestion boundary

- Category: openclaw_gap
- Lane: bridge-owned
- Status: research_backed_unspecced
- Next action: Normalized OpenClaw-to-ChefFlow package ingestion, ChefFlow owns approval/publishing.
- Sources: memory/project_openclaw_social_media_orchestration.md:103 (existing social truth/drift must be fixed first); memory/project_openclaw_social_media_orchestration.md:106 (normalized ingestion boundary still needed)

### VR/MR source drift

- Category: openclaw_gap
- Lane: host-owned
- Status: blocked
- Next action: Reconcile Pi-side source before feature work.
- Sources: memory/project_openclaw_vr_spatial_dashboard.md:14 (Pi-hosted live page is source of truth); memory/project_openclaw_vr_spatial_dashboard.md:140 (Pi source must be reconciled first)

### OpenClaw cadence policy scattered

- Category: openclaw_gap
- Lane: runtime-owned
- Status: research_backed_unspecced
- Next action: Create code/config cadence authority.
- Sources: docs/anthropic-follow-on-audit-answers-2026-04-18.md:381 (cadence policy is not centralized)

### Ingredient pricing coverage risk

- Category: release_gap
- Lane: bridge-owned
- Status: needs_triage
- Next action: Tie OpenClaw health/provenance to costing confidence.
- Sources: docs/archive/session-log-archive.md:803 (pricing coverage concern in prior session log)

## Stale Or Contradictory Handoff Pointers

### OpenClaw health split

- Category: openclaw_gap
- Lane: bridge-owned
- Status: ready_spec
- Contradiction: Wrapper health, downstream price data, local mirror freshness, and sync-run state answer different questions.
- Next action: Build canonical stage-aware OpenClaw health contract.
- Sources: docs/anthropic-system-audit-2026-04-18.md:11 (audit identifies competing OpenClaw health truths); docs/anthropic-follow-on-audit-answers-2026-04-18.md:225 (follow-on audit confirms no canonical health answer)

## Source Coverage And Warnings

- Source files configured: 14
- Source files with warnings: 0
- No missing source files or parse warnings.
