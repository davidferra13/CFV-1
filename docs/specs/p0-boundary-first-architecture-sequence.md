# Spec: Boundary-First Architecture Sequence

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** `p0-request-trust-and-api-tenant-boundary-hardening.md`, `p0-runtime-surface-boundary-enforcement.md`
> **Estimated complexity:** small (1-2 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event         | Date                 | Agent/Session | Commit |
| ------------- | -------------------- | ------------- | ------ |
| Created       | 2026-04-09 22:20 EDT | Codex         |        |
| Status: ready | 2026-04-09 22:20 EDT | Codex         |        |

---

## Developer Notes

### Raw Signal

The developer asked, precisely, for the highest-leverage action now that the research is fully local and internalized. They stated that the team is no longer in a phase of discovery. It is in a phase of decision.

They want the smallest set of actions that produces the largest forward movement while preserving system integrity and avoiding unnecessary churn. They explicitly said the correct next step is not to do more. It is to do what matters, in the correct order, with full awareness of what already exists.

They also instructed that the work should proceed in a dependency-aware sequence, with prerequisites understood before advancing, continuous verification against the current system, and no unnecessary disruption.

Finally, they made one operational constraint explicit for this pass: **no building**. They want a spec doc, not implementation.

### Developer Intent

- **Core goal:** turn the architecture audit and stakeholder research into one explicit execution order that prevents low-value parallel churn.
- **Key constraints:** no code changes in this pass; no widening into feature work; no pretending all architecture debt is equal; no ambiguity about what comes first.
- **Motivation:** the repo now has enough evidence. The risk is no longer lack of insight. The risk is allowing more work to accumulate on top of weak boundaries.
- **Success from the developer's perspective:** one short, builder-readable decision spec that freezes the right work, establishes the exact order, and makes it clear what is blocked until the foundation is corrected.

---

## What This Does (Plain English)

This spec does not add features. It establishes the order in which ChefFlow must now make architectural progress. It says that boundary work comes before expansion work, names the two existing P0 specs that govern that boundary work, and defines which categories of changes are blocked until those foundations are treated as law.

---

## Why It Matters

ChefFlow is already large enough that adding more capability on top of ambiguous trust boundaries or ambiguous surface ownership would create compounding fragility. The canonical product definition says ChefFlow is an operator-first system with supporting public, client, staff, partner, admin, and API surfaces, and the latest stakeholder research supports that structure rather than a blurred all-in-one surface. [project-definition-and-scope.md](/c:/Users/david/Documents/CFv1/docs/project-definition-and-scope.md), [2026-04-09-multi-stakeholder-workflow-research-for-architecture-refinement.md](/c:/Users/david/Documents/CFv1/docs/research/2026-04-09-multi-stakeholder-workflow-research-for-architecture-refinement.md)

---

## Current-State Summary

The repo already contains the two P0 specs that matter most:

1. [Request Trust And API Tenant Boundary Hardening](/c:/Users/david/Documents/CFv1/docs/specs/p0-request-trust-and-api-tenant-boundary-hardening.md)
2. [Runtime Surface Boundary Enforcement](/c:/Users/david/Documents/CFv1/docs/specs/p0-runtime-surface-boundary-enforcement.md)

The first addresses the most dangerous ambiguity in the system: who the actor really is, which tenant owns the data, and whether API and callback routes behave correctly without relying on browser-session assumptions. The second addresses the most visible architectural leakage: admin control-plane ownership versus chef workspace ownership.

The supporting research now says the same thing from multiple angles:

- primary users need light public entry and dense operator execution
- business and support actors need a distinct control plane
- technical and integration actors need explicit trust boundaries
- finance and compliance actors need unambiguous identity and ownership

That means the next move is not to invent more priorities. It is to ratify these two as the controlling sequence.

---

## Decision

ChefFlow now adopts a **boundary-first architecture sequence**.

This means:

1. **Trust boundary hardening is the first gate.**
   No work that touches auth, request trust, API-key behavior, callback semantics, tenant-linked foreign IDs, or integration-facing identity assumptions should proceed unless it conforms to [p0-request-trust-and-api-tenant-boundary-hardening.md](/c:/Users/david/Documents/CFv1/docs/specs/p0-request-trust-and-api-tenant-boundary-hardening.md).

2. **Runtime surface enforcement is the second gate.**
   No work that touches public, chef, client, partner, staff, or admin shell ownership, nav ownership, or route-surface semantics should proceed unless it conforms to [p0-runtime-surface-boundary-enforcement.md](/c:/Users/david/Documents/CFv1/docs/specs/p0-runtime-surface-boundary-enforcement.md).

3. **Everything else is subordinate to those two gates.**
   If a proposed feature, polish pass, or integration expansion depends on weak trust rules or weak surface rules, it is blocked until the relevant gate is resolved.

---

## Execution Order

### Step 1: Freeze boundary drift

Effective immediately, no new work should normalize:

- browser-session assumptions inside API-key routes
- tenant ID / auth-user ID / client ID confusion
- admin routes living as chef-nav convenience
- public, client, partner, staff, and admin surface bleed

### Step 2: Resolve trust first

Trust comes first because it protects:

- security and request authenticity
- integration correctness
- finance and bookkeeping-linked writes
- compliance-sensitive auditability
- external API credibility

This is why [p0-request-trust-and-api-tenant-boundary-hardening.md](/c:/Users/david/Documents/CFv1/docs/specs/p0-request-trust-and-api-tenant-boundary-hardening.md) is the first blocking spec.

### Step 3: Resolve runtime surface ownership second

Surface ownership comes second because it locks:

- chef as the canonical operator workspace
- admin as a real internal control plane
- constrained client, partner, and staff scope
- future shell and nav decisions

This is why [p0-runtime-surface-boundary-enforcement.md](/c:/Users/david/Documents/CFv1/docs/specs/p0-runtime-surface-boundary-enforcement.md) is the second blocking spec.

### Step 4: Resume expansion only after both are treated as law

Only after those two contracts are accepted should ChefFlow resume broader expansion work in areas like:

- public IA and conversion refinement
- new integrations or API breadth
- expanded ops/finance features
- deeper portal polish
- non-critical feature acceleration

---

## Files to Create

None.

This is a sequencing and governance spec only.

---

## Files to Modify

None in this pass.

Future implementation work should modify the files already listed in the two dependency specs rather than inventing a third implementation slice here.

---

## Database Changes

None.

### New Tables

None.

### New Columns on Existing Tables

None.

### Migration Notes

- No migration belongs in this spec.
- This spec is a decision contract, not a schema change.

---

## Data Model

No new data model is introduced here.

This spec governs the order in which the existing identity and surface models are hardened:

- tenant identity and API trust from the request-boundary spec
- surface, shell, and nav ownership from the runtime-surface spec

---

## Server Actions

None.

This spec does not define new runtime behavior. It defines sequencing and blocking rules for future work.

---

## UI / Component Spec

### Page Layout

Not applicable in this pass.

The user-visible outcome of adopting this spec is not an immediate UI change. The effect is that future UI and API work must respect a cleaner boundary model instead of deepening current ambiguity.

### States

- **Loading:** not applicable
- **Empty:** not applicable
- **Error:** not applicable
- **Populated:** not applicable

### Interactions

Not applicable in this pass.

---

## Edge Cases and Error Handling

| Scenario                                                                         | Correct Behavior                                                                |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| A proposed task touches auth or API behavior but is framed as a quick feature    | Block it until it is evaluated against the trust-boundary spec                  |
| A proposed task touches admin, chef, client, partner, or staff navigation/shells | Block it until it is evaluated against the runtime-surface spec                 |
| A task appears unrelated but depends on weak current assumptions                 | Do not approve it as "independent" if it would cement the weak boundary in code |
| A team member wants to work both P0 specs in parallel                            | Default to trust first unless there is a narrowly proven non-overlapping reason |

---

## Verification Steps

1. Confirm [project-definition-and-scope.md](/c:/Users/david/Documents/CFv1/docs/project-definition-and-scope.md) still defines ChefFlow as an operator-first system with supporting surfaces.
2. Confirm [2026-04-09-multi-stakeholder-workflow-research-for-architecture-refinement.md](/c:/Users/david/Documents/CFv1/docs/research/2026-04-09-multi-stakeholder-workflow-research-for-architecture-refinement.md) still supports two conclusions:
   - trust boundaries must be explicit
   - surface ownership must be explicit
3. Confirm [p0-request-trust-and-api-tenant-boundary-hardening.md](/c:/Users/david/Documents/CFv1/docs/specs/p0-request-trust-and-api-tenant-boundary-hardening.md) exists and remains the first blocking spec.
4. Confirm [p0-runtime-surface-boundary-enforcement.md](/c:/Users/david/Documents/CFv1/docs/specs/p0-runtime-surface-boundary-enforcement.md) exists and remains the second blocking spec.
5. Confirm no new spec is allowed to silently bypass this order by claiming to be "just feature work" while touching the same boundaries.

---

## Out of Scope

- Implementing either dependency spec
- Writing code
- Changing routes
- Adjusting auth middleware
- Refactoring admin or chef shells
- Public IA redesign
- New integrations
- New product features

---

## Notes for Builder Agent

- Do not treat this as a meta doc with no force. It is the sequencing contract.
- Do not parallelize unrelated-looking work if it touches the same weak boundary.
- Do not elevate lower-risk polish or feature work above trust or surface clarity because it feels easier.
- If a proposed task depends on current ambiguity, the correct action is to stop and route it through the relevant P0 spec first.
- This spec is complete only if it prevents more drift, not if it merely describes the drift elegantly.
