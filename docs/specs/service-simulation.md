# Spec: Service Simulation

> **Status:** built
> **Priority:** P1
> **Depends on:** event readiness, document readiness, prep timeline, prep blocks, travel planning, packing, close-out
> **Created:** 2026-04-22

---

## What This Does

Service Simulation gives the chef a deterministic rehearsal layer on the event Ops tab.

It answers a different question than readiness:

- Readiness asks, "Can this event move forward?"
- Service Simulation asks, "If this event happened now, what would the chef experience, what is missing, what is risky, and has this event been rehearsed under current conditions?"

The feature generates a chronological service walkthrough from current event truth, lets the chef save that walkthrough with `Simulate Service`, and marks the saved run stale when material inputs change later.

---

## Product Rules

- Chef-facing only in V1
- Event-centric only
- No AI narrator
- No new heavy form
- No replacement of prep, grocery, packing, travel, readiness, documents, or wrap-up surfaces
- Every unresolved item must point to the exact route that fixes it
- Unknown truth must stay unknown, not guessed

---

## UX Contract

The Ops tab panel shows:

- One status badge: `Not yet simulated`, `Saved simulation is stale`, or `Simulated under current conditions`
- One primary action when needed: `Simulate Service` or `Re-simulate`
- A fixed, chronological phase list:
  - `Core Facts`
  - `Menu and Guest Truth`
  - `Grocery and Sourcing`
  - `Prep`
  - `Equipment and Packing`
  - `Travel and Arrival`
  - `Service`
  - `Close-out`

Each phase includes:

- status
- one-line summary
- concrete missing items
- concrete risk flags
- exact next action
- exact route to resolve the blocker

---

## Status Rules

- `waiting`: downstream truth cannot honestly exist yet
- `attention`: the system can see a real blocker or gap
- `ready`: current truth supports a realistic rehearsal
- `complete`: the system has recorded completion for that phase

The engine must never mark a phase complete unless the source system has actually recorded completion.

---

## Persistence

Dedicated additive table:

- `event_service_simulation_runs`

Each row stores:

- tenant
- event
- engine version
- deterministic context hash
- normalized context snapshot
- generated simulation payload
- created timestamp

Saved runs are append-only history. The panel compares the latest saved run against current context.

---

## Deterministic Engine

Files:

- `lib/service-simulation/engine.ts`
- `lib/service-simulation/staleness.ts`
- `lib/service-simulation/types.ts`

Rules:

- pure function only
- no DB calls
- phase order is fixed
- output comes only from current event context
- no hidden heuristics

The engine consumes gathered truth from:

- event shell
- menu attachment and menu shape
- document readiness
- readiness gates
- prep blocks
- prep timeline
- packing confirmations
- travel legs
- DOP progress
- close-out state

---

## Staleness Contract

At minimum, a saved simulation becomes stale when any of these change:

- event status
- guest count
- date, service time, or arrival time
- location or access instructions
- dietary restrictions or allergies
- menu attachment, menu IDs, menu shape, or menu approval state
- grocery progress
- readiness blockers or core document readiness
- prep schedule or prep completion
- packing progress
- travel plan
- DOP progress
- service progress
- close-out progress
- engine version

The stale UI must name the reason plainly instead of showing a generic mismatch state.

---

## Surface Wiring

- Loader and save action: `lib/service-simulation/actions.ts`
- Ops panel: `components/events/service-simulation-panel.tsx`
- Event Ops tab integration: `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx`

The panel follows the same self-contained server-action pattern already used by prep planning.

---

## Verification Standard

Required before calling the feature done:

- unit coverage for the deterministic engine and stale rules
- affected-surface typecheck
- Playwright flow covering:
  - no-menu event
  - rich event with enough truth to simulate
  - stale state after material change
  - re-simulation clearing stale state
- manual UI verification with the agent account
- screenshots of the real UI states

---

## Out of Scope

- client portal simulation
- AI-generated narration
- checklist replacement
- new workflow stage system
- simulation-based auto-mutations
