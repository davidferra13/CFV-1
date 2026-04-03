# ChefFlow Feature Registry Builder Handoff

## Purpose

This document is the builder-facing handoff for the completed feature-registry archaeology pass. It defines what was produced, what is verified, what the builder should consume as source-of-truth, and which execution queues should be used next.

This handoff is documentation-only. No runtime behavior, route logic, API handlers, or schema migrations were changed as part of this pass.

## Deliverables

Primary source-of-truth:

- `features/registry.ts`

Human-readable registry companion:

- `docs/feature-inventory.md`

Coverage appendices:

- `docs/feature-route-map.md`
- `docs/feature-api-map.md`
- `docs/feature-schema-map.md`
- `docs/feature-gap-report.md`

Research input:

- `docs/research/chef-dev-current-workflows-2026-04-02.md`

Repeatable audit generator:

- `scripts/feature-docs-audit.cjs`

## Validated Final State

Registry and inventory:

- total normalized features: `136`
- inventory parity: `136 == 136`
- missing inventory ids: `0`
- extra inventory ids: `0`

Classification breakdown:

- `chef_standard`: `61`
- `chef_privileged`: `54`
- `internal_admin`: `8`
- `developer_tool`: `4`
- `internal_only`: `9`

Visibility breakdown:

- `visible`: `97`
- `hidden`: `11`
- `gated`: `10`
- `internal`: `18`

Status breakdown:

- `complete`: `126`
- `partial`: `9`
- `stub`: `1`

Surface coverage:

- page routes mapped: `690 / 690`
- API routes mapped: `311 / 311`
- schema tables mapped: `614 / 614`
- registry features without appendix representation: `0`

Validation executed:

- `node scripts/feature-docs-audit.cjs`
- `npx tsc --noEmit --pretty false features/registry.ts`

## Session Outcomes

This session completed the following:

1. Normalized the ChefFlow system into a feature-family registry suitable for discoverability and builder handoff.
2. Closed route coverage across all discovered page routes in `app/`.
3. Closed API coverage across all discovered route handlers in `app/`.
4. Closed schema coverage across all tables parsed from `clean-schema.sql`.
5. Added and documented missing feature families identified during the forensic pass:
   - `cooking-classes`
   - `mentorship-exchange`
   - `favorite-chef-curation`
   - `food-operator-retail-ops`
6. Expanded `safety-protection` to explicitly include certifications, HACCP, insurance, incidents, claims, and continuity workflows.
7. Created a repeatable audit script so future archaeology and documentation refreshes can be rerun deterministically instead of manually reconstructed.

## Research-Informed Priorities

The builder must treat the registry as more than a static catalog.

External workflow research shows:

- chefs and operators usually split clientflow systems from kitchen-economics systems
- chef users think in lifecycle order before they think in product-module terms
- developers rely on multiple partial discoverability tools, so coverage and freshness have to be enforced, not assumed

That changes the implementation priority of the next documentation-driven builds:

1. Browse experiences should support both domain-based discovery and workflow-based discovery.
2. Mission Control should expose trust metadata, not just feature names.
3. Governance should prioritize rerunnable validation and drift detection over more static prose.
4. ChefFlow's differentiator should stay explicit: it connects service-business workflow with live pricing, vendor, inventory, and operational economics.

## Builder Contract

The builder agent must follow these rules:

1. `features/registry.ts` is the canonical machine-readable source-of-truth.
2. `docs/feature-inventory.md` is the human-readable companion, not the primary authority.
3. The appendix docs are verification layers and traceability aids:
   - route ownership
   - API ownership
   - schema-implied ownership
4. If a future build changes routes, APIs, or schema:
   - update `features/registry.ts` if a feature family changes
   - rerun `node scripts/feature-docs-audit.cjs`
   - regenerate the appendix docs
5. Do not rename feature ids casually. Any id change breaks the inventory, appendices, and future discoverability work.

## Queue Assignments

### Queue A: Browse Everything

Objective:

- build the chef-facing browse/discoverability surface from the registry
- support both domain view and workflow view

Input:

- `features/registry.ts`
- `docs/research/chef-dev-current-workflows-2026-04-02.md`
- filter primarily to `classification === 'chef_standard'`

Builder rules:

- default to `visibility !== 'internal'`
- preserve hidden and gated entries as discoverable only if the product owner explicitly wants them surfaced
- do not invent new feature families in UI code
- do not make the experience domain-only; chefs commonly navigate by lifecycle stage
- preserve an explicit workflow ordering model:
  - inquiry
  - quote
  - contract / deposit
  - menu / recipe
  - pricing / vendor / inventory
  - prep / production / service
  - invoice / payment / closeout
  - follow-up / reviews / loyalty / repeat service
- keep pricing and evidence-backed cost intelligence visibly central rather than treating every feature as equal-weight browse content

### Queue B: Mission Control

Objective:

- build privileged and internal control surfaces for advanced users and operators

Input:

- `features/registry.ts`
- include:
  - `chef_privileged`
  - `internal_admin`
  - `developer_tool`
  - `internal_only`

Builder rules:

- maintain explicit access control boundaries
- do not collapse admin and developer surfaces into public or standard chef navigation
- include trust metadata wherever the control surface renders feature records:
  - owner
  - evidence type
  - last verified date
  - route coverage state
  - API coverage state
  - schema coverage state
  - confidence or maturity notes
- favor operational clarity over visual compression; internal users need to see why a feature is trusted, partial, gated, or internal

### Queue C: Registry Governance

Objective:

- keep the registry and appendix specs synchronized as the platform evolves

Input:

- `scripts/feature-docs-audit.cjs`
- all five documentation artifacts

Builder rules:

- any newly discovered surface must either:
  - map to an existing feature id, or
  - justify creation of a new feature family
- if it is not in the registry, it should be treated as non-canonical until documented
- prioritize automation before prose expansion:
  - rerun the audit on changes
  - catch drift early
  - fail fast when routes, APIs, or schema move without documentation updates
- next metadata additions should be standardized, not ad hoc:
  - owner
  - evidence type
  - last verified date
  - maturity / confidence notes
  - ADR or decision-record reference where applicable
- hidden, gated, and service-only systems must remain first-class in governance; lack of UI does not make them non-features

## Do Not Touch

The following are out of scope for the builder unless separately authorized:

- route auth logic
- feature gating logic
- billing tier rules
- existing migrations
- live API behavior
- registry ids without coordinated documentation updates

## Optional Expansions

These are not required for archive readiness, but they have credible return:

1. CI audit check for registry drift
   - effort: `2-4 hours`
   - expected return: `50-60%` reduction in future documentation drift

2. Ownership and freshness metadata pass
   - effort: `3-5 hours`
   - expected return: `25-35%` faster builder decisions and less ambiguity around partial systems

3. Workflow-view browse spec
   - effort: `3-4 hours`
   - expected return: `20-30%` better alignment with how chefs actually navigate the problem space

4. Component-to-feature appendix
   - effort: `4-6 hours`
   - expected return: `15-20%` faster archaeology for UI-only or partially wired systems

5. JSON export of the registry plus appendix coverage
   - effort: `2-3 hours`
   - expected return: `20-30%` faster builder integration for search, dashboards, or admin tooling

## Archive State

Documentation is complete, validated, and ready for builder handoff. This thread can be archived after review of the listed artifacts.
