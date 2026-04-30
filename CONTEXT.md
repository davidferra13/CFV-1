# ChefFlow Context

This file defines shared domain language for architecture work. Use these names when deepening ChefFlow into Modules.

## V1 Spine

The V1 Spine is the independent chef operating loop:

`inquiry -> client -> engagement/event -> menu/offer -> quote -> agreement -> payment -> prep -> sourcing -> service -> follow-up -> client memory`

V1 work protects this spine from requiring a spreadsheet, note app, text thread, or memory workaround.

## Pricing Trust Module

The Pricing Trust Module answers whether ChefFlow can safely use current ingredient pricing for a money decision.

Its Interface should answer:

- whether every recognized ingredient has a system-owned price contract
- whether a menu or ingredient set is `safe_to_quote`, `verify_first`, or `planning_only`
- which proof is missing before the chef can trust the number
- which ingredients create the highest quoting risk

Its Implementation may use local observed prices, regional data, national medians, category baselines, modeled fallbacks, geographic proof, source freshness, unit confidence, and no-blank price contracts. Callers should not need to know that ordering.

## Event Commitment Module

The Event Commitment Module owns event state truth from proposal through payment, confirmation, service, completion, cancellation, and post-event side effects.

Its Interface should stay small: request a transition, receive the committed result, warnings, and explicit failure. Its Implementation may coordinate readiness gates, ledger writes, notifications, calendar sync, prep blocks, client memory, and integrations behind internal seams.

## V1 Control Plane Module

The V1 Control Plane Module answers whether ChefFlow V1 can ship.

Its Interface should produce one release snapshot from blueprint progress, V1 governor state, cannot-fail contracts, builder queue, claims, receipts, blockers, parked V2 work, and gate results.
