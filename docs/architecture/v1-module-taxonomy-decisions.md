# V1 Module Taxonomy Decisions

Status: accepted baseline
Date: 2026-05-01
Scope: V1 module ownership, submodule taxonomy, and build gating

## Decision Summary

ChefFlow is in a module freeze for non-emergency V1 builds.

No new V1 implementation work should proceed unless it maps to an existing module card or a newly approved submodule card. Emergency exceptions are limited to production breakage, security, money, data safety, or explicit Founder Authority override.

The immediate implementation order is:

1. Document the reviewed taxonomy decisions.
2. Create an initial human-readable ownership registry.
3. Update module primer and module cards.
4. Later, update generator rules and add first-class submodule output.
5. Later, regenerate queue artifacts and review assignment quality.

Generator changes, generated queue artifacts, approved queue changes, and product code are out of scope for this baseline.

## Accepted Build Rule

Nothing gets built if it does not get moduled.

Before implementation, every V1 build must name:

1. Module.
2. Submodule.
3. Canonical route family or files.
4. Interface or adapter it attaches to.
5. Invariants the module owns.
6. Test or proof surface.

Unassigned V1 work is not buildable. Broad planning may use `submodule: planning`, but planning is non-executable until converted into a concrete module-owned build packet.

## Module Assignment Policy

Module review is required before build approval.

Accepted flow:

`raw candidate -> module review -> approved module batch -> v1 approved queue -> claim -> build -> receipt -> proof gate`

Module review may:

- assign module and submodule
- reclassify V1 blocker, V1 support, V2, research, blocked, or reject
- mark duplicates with `duplicateOf`
- create a new submodule with a decision record
- update source spec frontmatter when practical
- write sidecar classification for sources that should not be edited

Automation may propose module ownership, but high-risk V1 work requires reviewed or manual assignment before execution.

High-risk areas requiring reviewed or manual assignment:

- `finance-ledger`
- `pricing-trust`
- `auth-security`
- `ai-boundaries`
- `dietary-safety`
- public `client-intake`
- event quote, payment, and state flows
- `v1-control-plane` release gates

## Frontmatter Standard

New V1 specs should include durable ownership metadata.

```md
---
module: v1-control-plane
submodule: validation-proof
assignment: reviewed
classification: v1_blocker
---
```

Existing specs should be backfilled gradually. Generated repair specs may use `assignment: proposed`. Generator output should prefer explicit frontmatter over keyword inference, and report conflicts.

## Submodule Field

The generator should eventually add `submodule` as a first-class field.

Target candidate shape:

```json
{
  "module": { "id": "auth-security", "label": "Auth and Security" },
  "submodule": { "id": "role-hierarchy", "label": "Role Hierarchy" },
  "assignment": "reviewed"
}
```

Future batches should group by module, submodule, and classification.

## Module Maturity

Module maturity should be tracked in the ownership registry.

| Level              | Meaning                                                      |
| ------------------ | ------------------------------------------------------------ |
| `concept`          | Named but not mapped to files.                               |
| `backlog-mapped`   | Candidates and specs assigned.                               |
| `interface-mapped` | Primary interfaces and adapters named.                       |
| `code-mapped`      | Canonical files and route families identified.               |
| `proof-mapped`     | Tests, gates, or evidence linked.                            |
| `enforced`         | Tooling blocks noncompliant work.                            |
| `stable`           | Low ambiguity, recurring builds succeed inside the boundary. |

Mission Control may display module maturity only after the registry records it. Labels must distinguish backlog taxonomy from actual code ownership.

## Accepted Module And Submodule Structure

### `v1-control-plane`

Submodules:

- `v1-roadmap-release-truth`
- `builder-queue`
- `claims-receipts`
- `cannot-fail-gates`
- `validation-proof`
- `cross-system-integrity`
- `mission-control-status`
- `scheduled-ops-proof`
- `planning`

Core invariant:

V1 progress is real only when roadmap claims, approved work, active claims, receipts, blockers, validation evidence, and release gates agree in one current snapshot.

### `auth-security`

Submodules:

- `founder-authority`
- `tenant-scoping`
- `role-hierarchy`
- `admin-gates`
- `server-action-auth`
- `public-token-auth`
- `data-portability`
- `secret-management`

Core invariant:

Every protected action starts with the right auth, every data read or write is scoped, Founder Authority remains owner-level, and secrets or exports never leak private ChefFlow data.

### `client-memory`

New first-class module.

Submodules:

- `client-identity`
- `client-preferences`
- `household-guest-memory`
- `client-portal-visibility`
- `relationship-timeline`
- `communication-ingestion`
- `followup-memory`
- `dinner-circle-continuity`

Core invariant:

Client memory must be tenant-scoped, evidence-backed, portal-safe, and reusable across future work without attaching facts to the wrong person.

### `quality-hallucination`

New first-class module and cross-cutting check provider.

Submodules:

- `unavailable-state-contracts`
- `optimistic-rollback`
- `no-fake-money`
- `no-noop-actions`
- `error-empty-partial-states`
- `hardcoded-metric-detection`
- `cache-truth`

Core invariant:

ChefFlow prefers honest unavailable states over smooth falsehoods.

### `docs-release-proof`

Submodules:

- `build-integrity`
- `test-proof`
- `evidence-freshness`
- `release-attestation`
- `documentation-drift`
- `module-ownership-registry`

Core invariant:

Docs can describe intent, but release proof requires current, source-linked, command-backed evidence with dirty-state awareness.

### `events-ops`

Submodules:

- `event-fsm`
- `event-detail-truth`
- `quote-agreement-boundary`
- `prep-service-readiness`
- `guest-dietary-handoff`
- `service-format-specialization`
- `followup-after-action`
- `event-route-discoverability`

Core invariant:

No event surface can imply booked, paid, ready, served, completed, or followed-up unless the event spine and required evidence support that state.

### `pricing-trust`

Submodules:

- `price-resolution`
- `pricing-confidence`
- `ingredient-matching`
- `unit-conversion`
- `yield-normalization`
- `quote-safety`
- `cost-export`
- `openclaw-price-adapter`

Core invariant:

A chef can price real work only when ingredient identity, unit conversion, yield, price source, freshness, confidence, and quote safety stay explainable and honest.

### `finance-ledger`

Submodules:

- `ledger-core`
- `stripe-payments`
- `invoices`
- `quote-payment-boundary`
- `expenses-tax`
- `financial-reports`
- `supporter-contributions`
- `finance-export-adapter`

Core invariant:

Every money-facing surface must trace to cents, tenant scope, immutable ledger entries where appropriate, idempotent payment handling, and honest unavailable states.

### `menus-offers`

Submodules:

- `menu-builder`
- `proposal-offer-state`
- `recipe-book-search`
- `menu-cost-adapter`
- `public-sample-menus`
- `package-tasting-offers`

Core invariant:

Chef-created menu and recipe data can be searched, organized, costed, and presented, but AI cannot generate chef recipes and offers cannot imply payment or agreement state without the finance and event boundary.

### `sourcing-inventory`

Submodules:

- `inventory-quantity-truth`
- `vendor-supplier-truth`
- `pantry-stock-flow`
- `procurement-planning`
- `price-source-adapters`
- `stock-to-costing-adapter`

Core invariant:

Stock, vendor, and sourcing truth must remain tenant-scoped, unit-explicit, freshness-aware, and must not silently become pricing truth without a pricing adapter.

### `ai-boundaries`

Submodules:

- `ollama-gateway`
- `remy-surfaces`
- `recipe-ip-protection`
- `ai-privacy`
- `ai-tool-permissions`
- `ai-offline-failure`
- `ai-output-validation`

Core invariant:

AI can parse, classify, search chef-owned recipe data, and explain known app state, but it cannot invent facts, generate recipes, silently fall back, or use a second provider.

### `chef-workspace`

Submodules:

- `dashboard-return-to-work`
- `task-calendar-command`
- `settings-configuration`
- `mobile-runtime`
- `workspace-navigation`
- `operator-empty-error-states`

Core invariant:

The workspace must show the chef what changed, what is blocked, what needs action, and where to resume without fake data or duplicate command surfaces.

### `client-intake`

Submodules:

- `public-booking`
- `direct-inquiry`
- `embed-intake`
- `intake-lane-truth`
- `booking-follow-through`
- `intake-to-client-adapter`

Core invariant:

Public intake may collect and route work, but it must not imply acceptance, confirmation, or tenant trust without evidence.

### `public-trust`

Submodules:

- `public-homepage`
- `public-chef-profile`
- `nearby-directory`
- `public-seo-metadata`
- `public-claim-flow`
- `public-proof-copy`

Core invariant:

Public surfaces can create trust and demand only by showing truthful, source-backed, non-private claims and routing conversion into explicit intake flows.

### `dietary-safety`

Submodules:

- `allergy-records`
- `guest-dietary-handoff`
- `menu-safety-check`
- `severity-source-truth`

Core invariant:

Dietary and allergy warnings must be source-backed, severity-aware, connected to the right guest, client, or event, and visible before prep or service decisions.

### `staff-partner`

Lanes:

- `staff-execution`
- `partner-referrals`

Core invariant:

Staff and partner users can support the chef's work, but they cannot gain chef, admin, or Founder Authority powers, and their data must stay scoped to their role contract.

## Adapter Contracts

Module cards should name adapters where cross-module behavior is expected.

Important adapters:

- `menus-offers -> pricing-trust`: menu cost adapter
- `events-ops -> finance-ledger`: quote, payment, and agreement boundary
- `client-intake -> client-memory`: inquiry creates or attaches client identity
- `client-memory -> events-ops`: preferences and history inform event readiness
- `pricing-trust -> public-trust`: public pricing claims must be evidence-backed
- `ai-boundaries -> client-memory`: AI extraction can propose facts, not invent or persist them without evidence
- `v1-control-plane -> docs-release-proof`: release snapshot consumes proof, but does not create proof
- `v1-control-plane -> cross-system-integrity`: release snapshot fails when upstream and downstream evidence disagree

## Forbidden Moves

Module cards should include forbidden moves for high-risk modules.

Examples:

- `pricing-trust`: do not render missing price as `$0.00`; do not treat modeled price as observed.
- `ai-boundaries`: do not generate recipes; do not add fallback providers; do not silently degrade when Ollama is offline.
- `finance-ledger`: do not store mutable balances; do not mutate ledger entries; do not treat budget as revenue.
- `auth-security`: do not trust tenant id from request body; do not weaken Founder Authority; do not manually edit `types/database.ts`.

## Cannot-Fail Contract Ownership

| Contract               | Owner                                    |
| ---------------------- | ---------------------------------------- |
| `money_truth`          | `finance-ledger`                         |
| `pricing_trust`        | `pricing-trust`                          |
| `dietary_safety`       | `dietary-safety`                         |
| `inquiry_continuity`   | `client-intake`                          |
| `event_state_truth`    | `events-ops`                             |
| `client_truth`         | `client-memory`                          |
| `quote_integrity`      | `finance-ledger` plus `events-ops`       |
| `prep_execution`       | `events-ops`                             |
| `followup_memory`      | `client-memory` plus `events-ops`        |
| `tenant_privacy`       | `auth-security` plus `role-hierarchy`    |
| `no_fake_ui`           | `quality-hallucination`                  |
| `core_recovery`        | `chef-workspace` plus `v1-control-plane` |
| `ai_boundaries`        | `ai-boundaries`                          |
| `public_booking_trust` | `client-intake` plus `public-trust`      |
| `release_proof`        | `v1-roadmap-release-truth`               |

## Next Implementation Step

After this docs-only baseline is committed, the next implementation should update the generator to support submodules and assignment status, then regenerate queue artifacts in a separate commit.
