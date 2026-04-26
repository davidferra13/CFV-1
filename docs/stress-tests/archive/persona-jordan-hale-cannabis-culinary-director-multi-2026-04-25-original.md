# Persona Stress Test: Jordan Hale (Cannabis Culinary Director, Multi-Event/Multi-Chef)

## Persona Summary

Jordan is an operations-heavy cannabis culinary director managing multiple concurrent events, multiple chefs, and repeat guests with different tolerance histories. Jordan’s core need is a centralized control plane that enforces consistent dose policy, chef execution standards, guest risk management, and legally defensible audit trails across events—not just single-event planning tooling.

## Capability Fit (SUPPORTED/PARTIAL/MISSING)

- Cannabis vertical workspace (`/cannabis`, events, RSVPs, invite, compliance tracker, cannabis ledger, handbook): **SUPPORTED** (there is explicit cannabis product surface coverage including dosage/compliance-oriented pages).
- Event operations and command-center visibility (events, ops tab, simulation, schedule, queue, dashboards): **SUPPORTED** (strong event orchestration and operational visibility for active work).
- Cannabis event metadata capture (inquiries include cannabis context; cannabis events include strain pairings, dosage info, compliance badges): **SUPPORTED** (relevant fields and dedicated cannabis event listing exist).
- Compliance documentation discipline across cannabis programs: **PARTIAL** (there are compliance and ledger surfaces, but no explicit end-to-end evidence of immutable, per-dose, per-chef compliance attestations tied to a single canonical chain).
- Guest tolerance continuity across repeated cannabis events: **PARTIAL** (client/guest CRM is broad and cannabis RSVP/intake exists, but there is no explicit cross-event cannabis tolerance progression model called out).
- Centralized dosing engine with standardized per-course enforcement: **MISSING** (no clearly documented platform-wide dosing engine that governs all chefs and all events).
- Multi-chef protocol enforcement at scale: **MISSING** (V1 blueprint explicitly excludes multi-tenant/multi-chef platform design).
- Portfolio-level command dashboard for one director overseeing multiple chefs simultaneously: **PARTIAL** (dashboard/event tools are rich, but the product strategy still centers a single-chef operating model in V1).

## Top 5 Gaps

1. **No canonical central dosing engine**
   - Why it matters: Jordan’s highest-risk failure mode is inconsistent per-course dose allocation across chefs and events.
   - Current state: cannabis pages and dosage fields exist, but there is no explicitly documented rules engine enforcing dose standards globally.

2. **V1 strategy conflicts with multi-chef governance need**
   - Why it matters: Jordan is a director role; safety and consistency depend on cross-chef standardization and oversight.
   - Current state: the blueprint states V1 is single-chef and explicitly out-of-scope for multi-chef platform behavior.

3. **Compliance evidence is fragmented across multiple screens**
   - Why it matters: legal defensibility depends on one coherent chain from intake → dosing decisions → execution → outcome logs.
   - Current state: compliance tracker + cannabis ledger + events + RSVPs exist, but evidence appears feature-separated rather than a unified attestation timeline.

4. **Guest cannabis tolerance history is not modeled as a first-class longitudinal safety signal**
   - Why it matters: repeat guest dosing should improve with historical response and adverse-reaction memory.
   - Current state: CRM and event history are strong, but explicit cannabis tolerance evolution and dose-response profile contracts are not documented.

5. **Director-level cross-event risk cockpit is incomplete for this persona**
   - Why it matters: Jordan needs one glance to see which event/chef/course combinations are dose-risky now.
   - Current state: strong dashboards exist, but no explicit cannabis-risk heatmap or multi-chef exception queue is documented.

## Quick Wins Under 20 Lines

1. **Add a “Dosing policy version” chip to cannabis event cards**
   - File target: `app/(chef)/cannabis/events` event-row/card component.
   - Change: render a small badge such as `Policy vX.Y` next to dosage info.
   - Value: immediate protocol traceability with minimal UI diff.

2. **Add a “Last compliance update” timestamp in cannabis compliance header**
   - File target: `/cannabis/compliance` header component.
   - Change: one-line timestamp text bound to existing updated-at metadata.
   - Value: quickly surfaces stale compliance records.

3. **Add a “Guest has prior cannabis history” badge in cannabis RSVPs table**
   - File target: `/cannabis/rsvps` row renderer.
   - Change: conditional boolean badge only.
   - Value: reduces re-profiling misses and improves dosing caution.

4. **Add “Assigned chef” column to cannabis events list**
   - File target: `/cannabis/events` table columns.
   - Change: one additional display column.
   - Value: increases accountability and easier director-level scanning.

5. **Add “Escalate dose decision” quick action button on cannabis event detail**
   - File target: cannabis event detail quick actions.
   - Change: one CTA linking to notes/approval flow.
   - Value: creates low-friction human-in-the-loop control while deeper engine work is pending.

## Score: 64/100

- Safety & Compliance Fit: 68/100
- Multi-Operator Governance Fit: 40/100
- Event Operations Fit: 85/100
- Data Continuity for Cannabis Risk: 62/100
- Weighted final score: **64/100** — ChefFlow has meaningful cannabis and operational primitives, but Jordan’s defining requirement (director-level multi-chef dosing enforcement with unified evidence) is not fully represented in V1.

## Verdict

ChefFlow can support Jordan’s cannabis program at a tactical event-operations level today, especially for scheduling, documentation surfaces, and baseline compliance workflows. It does not yet satisfy the strategic control requirement of a centralized, enforceable multi-chef dosing governance layer, so this persona remains only partially successful.

## Build Follow-Up - Gap 1

Built one vertical slice toward a canonical dosing engine by adding a centralized cannabis dosing policy module (`lib/cannabis/dosing-policy.ts`) with a single versioned ruleset and category-specific THC guardrails. The cannabis events list now renders a per-event `Policy v1.0` chip from this shared resolver so chefs and directors can see which dosing standard is applied at a glance.

Remaining work: enforce this policy at planning and service execution points, persist policy-version snapshots on event records for audit immutability, and add exception escalation flows when planned doses exceed active limits.

## Build Follow-Up - Gap 2

Built a director-oriented escalation slice for cannabis dose governance: the control packet now includes an "Escalate dose decision" action that routes into compliance with the specific event context. Compliance reads that escalation context, shows a review banner, and highlights the escalated event card for triage.

Remaining work: formal multi-chef assignment and approval workflows are still needed for full cross-chef governance.

## Build Follow-Up - Gap 3

Built a compliance freshness signal by adding a `Last compliance update` timestamp to the cannabis compliance page, derived from active event cannabis details first and event metadata second.

Remaining work: evidence is still distributed across events, RSVPs, and ledger surfaces. A true unified attestation timeline still needs a cross-surface evidence view.

## Build Follow-Up - Gap 4

Built a first-class longitudinal safety signal in the cannabis RSVP dashboard. Guest rows now include prior cannabis history count and a caution marker when previous dose notes, comfort notes, or in-person discussion flags exist.

Remaining work: this is still a UI-level signal. A formal dose-response timeline, adverse-reaction taxonomy, and policy-driven dosing recommendations remain.

## Build Follow-Up - Gap 5

Built an "Escalate dose decision" quick action in the cannabis control packet flow that routes operators into compliance review for the selected event.

Remaining work: a director-level cross-event cannabis risk cockpit is still needed, including heatmap-level risk scoring and a multi-chef exception queue spanning active events.
