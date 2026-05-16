# Intensify: Intelligence Zone

## Run 2026-05-16 (initial)

STATUS: fresh
DEPTH: quick
YIELD_TREND: stable

SURFACED:

- 56 files, massive output surface (37+ signal types)
- Strong consumption: 5 dashboard sections, intelligence hub, forecast/health/demand pages, 30+ components, Remy context, decision-queue
- 5 orphaned outputs: churn-prevention-triggers, client-lifetime-journey, seasonal-menu-correlation, price-anomaly, prep-time-estimator
- churn-prevention-triggers computed but no automation, no email, no notification acts on them
- price-anomaly computed but no alert wiring (CIL also produces this - potential redundancy)

ACTED ON:

- churn-prevention-triggers wired to CIL signal dispatch + AI re-engagement drafts (swarm session)
- CIL actOnSignal wired to 5 real handlers (payment reminders, follow-ups, cadence, churn)

SKIPPED:

- price-anomaly wiring via CIL finance: redundant path (use decision-queue instead)
- prep-time-estimator: components exist but unmounted; low yield until route exists

NEXT TRIGGER: After churn-triggers wired -> partially-mined

---

## Deep-Pass Run 2026-05-16 (post-swarm)

STATUS: partially-mined
DEPTH: quick
YIELD_TREND: increasing

SURFACED:

- 8 CIL signal sources fall to default no-op in dispatchSignalAction (calendar.overload, calendar.deadSpots, calendar.bookingPace, inventory.priceSpikes, inventory.wastePatterns, reputation.testimonialOpportunity, reputation.ratingTrend, reputation.unreviewedEvents)
- client-lifetime-journey: rich stage/risk data, only consumed by intelligence-hub page. Remy, lifecycle, CIL, decision-queue all lack this data.
- price-anomaly: underpricing/overpricing detection exists but never reaches chef decision surface
- seasonal-menu-correlation: dish performance history exists but Remy can't reference during menu planning
- rebooking-predictions: prediction model exists but CIL doesn't use timing data for proactive outreach
- REDUNDANCY: proactive-alerts.ts + CIL analyzers independently detect same overdue invoices, dormant clients, stale leads. Rail double-surfaces.

LENSES_USED:

- Systems Architect: signal routing, redundancy resolution, coupling direction
- Chef-Operator: which signals actually change chef behavior
- Reliability Engineer: signal storms, cascade failure, noise ratio

EXPERT_VALIDATION:

- Wire 8 undispatched CIL signals: endorsed with caveat (add throttle, prevent signal storms)
- Wire client-lifetime-journey into Remy: strongly endorsed (zero risk, established pattern)
- Wire price-anomaly into decision-queue: endorsed (natural fit, revenue protection)
- Feed seasonal-menu-correlation into Remy: endorsed (chefs ask "what worked last time")
- Wire rebooking-predictions into CIL clients: cautioned (establish one-way coupling direction only)
- Wire price-anomaly into CIL finance: rejected (compounds redundancy without dedup)

EXPERT_ADDITIONS:

- Signal dedup registry (in-memory TTL map) before expanding dispatch surface
- Per-tenant dispatch throttle (max 3 per signal-type per hour) to prevent email floods

REJECTED:

- price-anomaly -> CIL finance: compounds redundancy. decision-queue path achieves same goal without duplication.

ACTED ON:

- Signal dedup registry: lib/cil/signal-dedup.ts (in-memory TTL, 3/hr throttle per tenant)
- client-lifetime-journey wired into Remy context (LTV, retention, at-risk clients)
- price-anomaly wired into decision-queue (underpricing/overpricing alerts)
- seasonal-menu-correlation wired into Remy context (dish history by season)
- 8 CIL signal handlers wired (calendar.overload, deadSpots, bookingPace; inventory.priceSpikes, wastePatterns; reputation.testimonialOpportunity, ratingTrend, unreviewedEvents)
- rebooking-predictions wired into CIL clients analyzer (one-way, 2 signal types)

SKIPPED:

- prep-time-estimator: no route mounts components (extension, not intensification)
- New analyzers or signal types: extension, not intensification

CROSS_REFS:

- [[communication]]: brand-voice + cadence already wired; new signal dispatches will flow through these paths
- [[cil]]: dedup registry prevents CIL/intelligence double-surfacing
- [[discovery]]: rail scoring engine (just built) will benefit from expanded signal surface

STATUS: near-saturated
NEXT TRIGGER: All orphaned outputs wired. Remaining: prep-time-estimator (needs route). Zone saturated until new intelligence outputs are created.

---

## BUILD_PROMPTS: (2026-05-16)

STATUS: COMPLETE (2026-05-16)

### Wave 1 (Parallel - 4 agents)

Agent: remy-lifetime-journey (haiku)
Task: Wire client-lifetime-journey.ts into remy-context.ts parallel fetch
Read: lib/ai/remy-context.ts, lib/intelligence/client-lifetime-journey.ts

Agent: price-anomaly-decision-queue (haiku)
Task: Wire price-anomaly.ts into decision-queue/actions.ts as signal source
Read: lib/intelligence/price-anomaly.ts, lib/decision-queue/actions.ts

Agent: remy-seasonal-menu (haiku)
Task: Wire seasonal-menu-correlation.ts into remy-context.ts parallel fetch
Read: lib/ai/remy-context.ts, lib/intelligence/seasonal-menu-correlation.ts

Agent: signal-dedup-registry (sonnet)
Task: Create lib/cil/signal-dedup.ts, wire into signal-actions.ts dispatch
Read: lib/cil/signal-actions.ts, lib/intelligence/proactive-alerts.ts

### Wave 2 (After Wave 1 - 2 agents)

Agent: cil-dispatch-expansion (opus)
Task: Wire 8 remaining CIL signal sources + per-tenant throttle
Read: lib/cil/signal-actions.ts, lib/cil/signal-dedup.ts, lib/cil/analyzers/

Agent: rebooking-predictions-cil (haiku)
Task: Wire rebooking-predictions into CIL clients analyzer (one-way)
Read: lib/intelligence/rebooking-predictions.ts, lib/cil/analyzers/clients.ts

### Dispatch Notes

Total: 6 agents (4 haiku + 1 sonnet + 1 opus)
Verification: npx tsc --noEmit --skipLibCheck
