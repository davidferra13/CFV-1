# ChefFlow Revival Spine

## Decision

ChefFlow is the canonical chef operating platform. The other culinary projects are permanent roles around that platform, not competing replacements.

| Project                       | Permanent role                                             | Current path status                                     |
| ----------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| ChefFlow                      | Canonical platform                                         | Verified                                                |
| DF Private Chef               | Live reference implementation and operational truth source | Canonical root verified; current Git state pending scan |
| Chef Operating System Default | Default ChefFlow workspace                                 | Role defined, path unresolved                           |
| Chef Collect                  | Network, referral, dispatch, and commission layer          | Role defined, path unresolved                           |
| Anthony's system              | Second-chef validation case                                | Candidate path, Git verification pending                |

This is a product decision. It does not authorize folder renames, repository merges, data migrations, deployments, or deletion.

## One-way evidence flow

1. A real DFPC need appears.
2. DFPC proves the behavior in daily operation.
3. The behavior crosses an explicit seam into a deep ChefFlow module.
4. ChefFlow Default receives the generalized interface and safe starter configuration.
5. Anthony validates that the interface works for a second Chef with isolated data.
6. Chef Collect connects qualified Chefs and traceable referrals around the platform.

No step may be skipped by substituting mock data, route existence, AI-only usage, or documentation for real operation.

## Recovery dispositions

- **Adopt** means preserve the product decision and verify its current implementation.
- **Rebuild** means preserve the user need while replacing an interface or implementation that blocks daily use.
- **Archive** means remove the item from active product authority. It does not mean delete it.

The machine-readable decisions live in `docs/revival/recovery-decisions.json`.

## First operating milestone

One real DFPC engagement must complete the contract in `docs/revival/dfpc-operating-loop.json`, from Inquiry through approved follow-up. The loop must use real persisted evidence, honest errors, immutable financial records, and David's direct use.

The repeatability gate is three real engagements completed without maintaining a second private workflow in Gmail, memory, or scattered documents. Anthony is the second-chef gate after that.

### First real shadow case

`DFPC-REAL-001` is the first privacy-safe evaluation against live DFPC evidence. At the evidence cutoff, inquiry passed; discovery and quote-and-scope remained open; stages 4–12 were not due. The lifecycle was `availability-reviewed`, the next action belonged to the client, and nothing was sent or mutated.

This shadow case proves the evaluator and honest failure states. It does not count as a completed engagement or advance the three-event repeatability gate. See `docs/revival/real-cases/generated/dfpc-0492597d-shadow-report.md`.

## Completion controls

- One canonical product ledger.
- One in-flight operating-loop milestone.
- No new chef application or duplicate repository for a feature idea.
- New ideas enter the existing build queue.
- No feature is done until its real interface, failure behavior, and drift protection are verified.
- External messages and consequential money actions remain approval-gated.
- CFV1 recovery work must remain resource-bounded and cannot start duplicate servers.

## CLO-40 check

The first loop directly covers Culinary Craft, Menu Design, Ingredients and Sourcing, Dietary Needs, Kitchen Execution, Sales, Client Memory, Communication, Contracts, Pricing and Cost Control, Payments, Operations, Scheduling, Vendors, Technology, and Reputation.

Its largest current blind spots are long-term career development, health and burnout, personal finances, legal obligations, and legacy. Those remain visible platform obligations, but they do not expand the first operating-loop milestone.

## Evidence ledger

Run:

```powershell
node scripts/revival/build-capability-ledger.mjs --write
node scripts/revival/build-capability-ledger.mjs --check
node scripts/revival/verify-revival-contracts.mjs
node --test tests/unit/revival-capability-ledger.test.mjs
```

The generated ledger reports candidate file evidence only. A matching filename never proves a feature is functional, useful, safe, or complete.
