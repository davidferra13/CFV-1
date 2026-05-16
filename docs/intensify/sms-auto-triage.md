# Intensify: sms-auto-triage

## Deep-Pass Run 2026-05-16

STATUS: fresh
DEPTH: normal (deep-pass: intensify + over-the-shoulder)

SURFACED:

- lib/sms/ingest.ts and lib/communication/pipeline.ts are PARALLEL systems handling inbound messages but NOT connected
- managed-ingest.ts already handles channel='sms' but ingest.ts bypasses it entirely
- The spec proposes 9 new files; correct architecture needs ~4-5 files extending existing systems
- conversation_threads is the unified inbox primitive; triage should be thread state, not separate table
- auto-response.ts already has template selection, double-send guard, AI personalization toggle
- triage-suggestions.ts already computes response times, repeat client, value, conversion probability
- inquiry-response-actions.ts already generates deterministic drafts with brand voice
- ingest.ts currently calls EMAIL classifier with fake subject for SMS (fragile)
- ingest.ts creates inquiries immediately with no triage gate

LENSES_USED:

- Martin Fowler (Enterprise Architecture): Strangler Fig migration, refactoring over rebuild
- Luke Wroblewski (Mobile UX): one-thumb approval, notification interruption design
- Pat Helland (Distributed Systems): idempotency, exactly-once delivery, dedup
- Danny Meyer / Ari Weinzweig (Hospitality Operations): triage under pressure, expo line metaphor
- Gregor Hohpe (Integration Architecture): Channel Adapter pattern, Canonical Data Model, Routing Slip

EXPERT_VALIDATION:

- rank 1 "Route SMS through managed-ingest -> pipeline": ENDORSED UNANIMOUSLY. Eliminates 60% of spec's new code. Strangler Fig pattern.
- rank 2 "VIEW over conversation_threads + priority overlay": CAUTIONED. Pure VIEW won't work (missing draft/ack/escalation columns). Correct: HYBRID with thin sms_triage_metadata table (~6 cols) joining to conversation_threads.
- rank 3 "Wire auto-response.ts for SMS acknowledgment": ENDORSED with latency caveat. Auto-response designed for email (async). SMS needs fast-path (<500ms). May skip inquiry lookup for speed.
- rank 4 "Intercept ingest.ts BEFORE inquiry creation": ENDORSED as critical pivot. Must be transactional: triage+ack OR legacy path. Never lose messages in limbo.
- rank 5 "Reuse triage-suggestions.ts scoring": ENDORSED with refactor. Current function does 90-day batch lookups. Extract lightweight per-message scorer with cached client metadata.
- rank 6 "Surface triage on chef rail via cil-signal-resolver": ENDORSED with threshold. Only P0/P1 items surface; P2+ wait in triage page.
- rank 7 "Reuse inquiry-response-actions.ts draft pattern": ENDORSED with 160-char enforcement at generation time, not send time.

EXPERT_ADDITIONS:

- Move 8: "Triage as thread STATE (active->triaging->awaiting_approval->resolved) rather than separate status column"
- Move 9: "Client context pre-fetch cache for sub-second classification" (avoids 100-200ms per-query on every inbound)
- Move 10: "Unified approval surface within existing inbox, not separate /sms-triage page" (one approval queue, filter by channel)
- Move 11: "Batch-approve undo window (5-10s) for fat-finger safety in kitchen"

REJECTED:

- None outright. All 7 moves directionally correct.

FAILURE_MODES:

1. DUAL-SYSTEM DRIFT: Two classification paths producing different results if migration incomplete
2. ACK-WITHOUT-TRIAGE: Ack fires but triage entry fails = client heard, chef never sees
3. ESCALATION INFINITE LOOP: Chef genuinely unavailable (6-course service). Need "in service" mode
4. DRAFT STALENESS: Remy drafts at ingest, chef checks 4h later, context changed. Regenerate on view or mark stale.
5. SMS CARRIER LATENCY: <60s from "we sent" not "client received." Measure delivery receipts.
6. PHONE AMBIGUITY: Two clients share number (spouse/office). Must handle "known number, ambiguous client."

ACTED ON: (pending user selection)

SKIPPED:

- CIL schema extension: premature, needs schema change, Phase 2
- New SMS-specific classification engine: redundant, pipeline.ts already classifies
- New notification/escalation system: redundant, channel-router.ts + follow-up-actions.ts exists
- Separate Remy draft engine: redundant, inquiry-response-actions.ts pattern exists

CROSS_REFS:

- [[communication]]: pipeline.ts is the canonical ingest path; SMS must route through it
- [[lifecycle]]: client-notifications.ts has NotificationChannel='sms' stub ready to wire
- [[discovery]]: cil-signal-resolver surfaces ProactiveSignals on chef rail
- [[navigation]]: inbox/triage should be a filter within existing inbox, not new nav entry

NEXT TRIGGER: After ranks 1-4 wired (SMS flows through pipeline, triage gate intercepts, metadata table exists, ack templates registered). That build reveals real gaps vs. spec assumptions.
