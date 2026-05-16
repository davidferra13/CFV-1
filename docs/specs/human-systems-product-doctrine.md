# Human Systems Product Doctrine

> **Status:** canonical doctrine draft
> **Priority:** P1
> **Applies to:** research-derived planning, ChefFlow operating-loop work, Current, CIL, action center, rail, client memory, quick capture, waiting states, and resume trails
> **Implementation rule:** doctrine/spec artifact only until explicitly queued or fired

## Purpose

This document is the canonical doctrine artifact for the human-systems research thread. It keeps the research as product doctrine and build-shaping guidance, not as an instruction to edit app code.

The research compares the body, memory, support networks, journalism, passive capture, and an extremely organized life. The product conclusion is that ChefFlow should behave like a chef's external operating system: capturing signals, preserving context, labeling uncertainty, tracking waiting states, and making the next useful handoff visible.

## Core Thesis

ChefFlow should reduce friction between intention and action.

The product should help the chef know:

- what is active
- what is waiting
- what changed
- what is uncertain
- what needs proof
- what has a next action
- what can safely be ignored
- where to resume interrupted work

This is not a dashboard decoration idea. It is a coordination doctrine for product surfaces.

## Product Promises

### 0. Shared Work Lives In Circles

Portals are private cockpits for role-specific and canonical work. Circles are shared operating spaces for relationships, coordination, trust, status, evidence, memory, and handoffs.

When work involves other people, shared context, approvals, visibility, support, or relationship continuity, it should happen in a Circle or be projected into one. The Circle should coordinate shared truth without replacing the canonical Event, Menu, Quote, Client, Staff, Vendor, Partner, Inventory, Contract, or financial record.

### 1. Capture Before Organization

Thoughts, notes, client signals, vendor facts, reminders, pricing changes, messages, and operational fragments should have a fast place to land before the chef has time to organize them.

Capture should preserve the raw source. Triage can happen later.

### 2. Waiting Is A Real State

Waiting is not an absence of progress. ChefFlow should explicitly track work waiting on:

- a client reply
- a chef decision
- a vendor answer
- payment
- a staff handoff
- a system job
- a date or deadline
- missing proof

Every important waiting item should have a source, reason, follow-up route, and follow-up time when available.

### 3. Truth Needs Labels

ChefFlow must distinguish:

- confirmed facts
- deterministic calculations
- user-entered claims
- inferred signals
- stale information
- disputed information
- unknowns

The product should never convert weak inference into confident copy just because the UI has room for a sentence.

### 4. Relationships Are Infrastructure

Clients, households, staff, vendors, partners, referrals, venues, future leads, and past collaborators form support infrastructure around the chef's business.

ChefFlow should show who matters to a workflow, what context they carry, and what action depends on them. It should not create a decorative social graph.

### 5. Clean Stops Matter

The chef should be able to stop work cleanly and resume without reconstructing context from memory.

Whenever possible, ChefFlow should preserve:

- the last meaningful action
- what changed
- what remains unfinished
- the next concrete step
- the route back to the work
- the proof or source record

### 6. Handoffs Should Be Visible

A completed action should naturally reveal the next useful handoff.

Examples:

- create menu -> attach to event, save as template, generate shopping list
- create recipe -> add to menu, cost recipe, add dietary flags
- file AAR -> send follow-up, request review, close financials
- capture note -> triage to task, reminder, client note, recipe, event, or dismissal

## Builder Rules

These doctrine rules apply before any implementation work:

1. Do not implement from this doctrine directly.
2. Use the build queue or firing workflow before app-code work.
3. Treat the linked specs as queue-ready drafts, not active build instructions.
4. Prefer existing systems before adding new abstractions:
   - `lib/current`
   - `lib/action-center`
   - `lib/cil`
   - `lib/discovery/*rail*`
   - client profile and relationship modules
   - activity/audit/resume modules
5. Preserve tenant privacy and ChefFlow auth invariants.
6. Label uncertainty instead of smoothing it over.
7. Do not create a second source of truth for client, task, note, event, menu, recipe, vendor, or payment data.

## Canonical Spec Set

| Spec                                                        | Role                                                                                                                    |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `docs/specs/chef-operating-loop-external-memory.md`         | Core operating-loop spec derived from the research.                                                                     |
| `docs/domain/circles.md`                                    | Canonical Circle domain charter: portals vs shared worlds, ownership, source-of-truth boundaries, and Circle types.     |
| `docs/architecture/circles-current-state-inventory.md`      | Inventory of existing Circle/Hub routes, modules, tests, mismatches, and security constraints.                          |
| `docs/architecture/circles-policy-matrix.md`                | Implementation contract for Circle type, ownership, creation, access, public token, and linked-object visibility rules. |
| `docs/architecture/circles-source-of-truth-boundaries.md`   | Boundary contract preventing Circles from duplicating canonical Event/Menu/Client/Payment/Staff/Vendor truth.           |
| `docs/architecture/circles-swarm-execution-plan.md`         | Fresh-context swarm execution plan for fired Circles queue work.                                                        |
| `docs/specs/circles-operating-loop-build-extraction.md`     | Research-to-build extraction for making Circles the shared operating-loop primitive.                                    |
| `docs/specs/research-derived-human-systems-builds-index.md` | Index of research-derived build candidates and sequencing.                                                              |
| `docs/specs/passive-capture-triage-dock.md`                 | Quick capture and triage for raw thoughts and fragments.                                                                |
| `docs/specs/waiting-state-radar.md`                         | Explicit waiting-state surface.                                                                                         |
| `docs/specs/truth-net-evidence-labels.md`                   | Shared evidence/source/confidence labels.                                                                               |
| `docs/specs/support-network-map.md`                         | Operational relationship and support graph.                                                                             |
| `docs/specs/clean-stop-resume-trails.md`                    | Resume trails for interrupted work.                                                                                     |
| `docs/specs/contextual-wiring-mise-en-place.md`             | Existing companion spec for wiring, next steps, sidebars, and handoffs.                                                 |

## First Build Batch Recommendation

When the developer explicitly authorizes queue firing or direct build work, start with the smallest sequence that creates trust and daily utility:

1. `docs/domain/circles.md` and `docs/specs/circles-operating-loop-build-extraction.md` if the work touches shared relationships.
2. `truth-net-evidence-labels.md`
3. `passive-capture-triage-dock.md`
4. `waiting-state-radar.md`

Rationale:

- Evidence labels should come first because later surfaces will display inferred or computed intelligence.
- Passive capture gives immediate daily value and preserves raw context.
- Waiting radar turns captured and existing pending work into a calm operational surface.

## Later Build Batch Recommendation

After the first batch is verified:

1. `clean-stop-resume-trails.md`
2. `support-network-map.md`
3. deeper `chef-operating-loop-external-memory.md` integration
4. broader contextual wiring from `contextual-wiring-mise-en-place.md`

## Non-Goals

- No app-code implementation from this doctrine alone.
- No new database tables unless a specific fired build proves existing storage is insufficient.
- No AI automation that acts without chef confirmation.
- No "perfect transparency" claims.
- No decorative metaphor-heavy UI.
- No duplicate client, task, note, event, menu, recipe, vendor, or payment models.

## Doctrine Summary

ChefFlow should not ask the chef to remember what the system can safely remember, infer what should be labeled as uncertain, or manually reconnect work that the product can keep connected.

The product standard is simple:

Everything important has a place.
Everything active has a next action.
Everything waiting has a follow-up.
Everything inferred has a label.
Everything interrupted has a resume path.
Everything finished has proof.
