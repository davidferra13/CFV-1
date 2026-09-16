# ChefFlow Canonical Project Definition and Scope

Status: canonical source of truth
Last updated: 2026-09-16
Purpose: define what ChefFlow is, what it is for, who it serves, and how conflicting summaries should be resolved

## Why This Document Exists

Several repo documents describe ChefFlow from different angles: product strategy, technical architecture, implementation inventory, and research baselines. Those documents are useful, but they have drifted in places.

This file is the canonical answer to the questions:

- What is ChefFlow?
- Who is it for?
- What is in scope?
- What is not the primary identity of the product?
- How should we interpret legacy tier and Pro terminology still present in the repo?

If another document conflicts with this one on project identity, audience, scope, or monetization posture, this document wins and the other document should be updated.

## Canonical Definition

ChefFlow is the universal operating system for professional culinary work.

It is designed so chefs across restaurants, private and personal chef businesses, catering, hotels, resorts, casinos, bakeries, food trucks, commissaries, ghost kitchens, hospitals, senior living, schools, universities, stadiums, corporate dining, estates, yachts, meal-prep businesses, R&D kitchens, multi-location groups, and other professional culinary operations can run their working day from one system.

The north-star question is: "Can a chef operate their entire working day from ChefFlow without needing to think about or manually switch between a stack of other applications?" If the answer is no for a normal chef workflow, that workflow is a ChefFlow capability gap.

ChefFlow is not a collection of separate apps and it is not another app added to the stack. It is one persona-aware operating environment around a shared domain model whose product objective is to eliminate the stack.

## Canonical Product Shape

ChefFlow has one primary product and several supporting surfaces.

### Primary product

The primary product is the authenticated operator workspace.

This is where the business runs:

- inquiries
- quotes
- clients
- events
- menus and recipes
- pricing and food cost
- inventory and vendors
- finance and ledger truth
- documents and execution materials
- staffing, scheduling, and daily ops

### Supporting surfaces

These are important, but they support the operator system rather than replace it as the product center:

- public discovery and booking entry
- client portal and tokenized client flows
- staff execution views
- partner and referral views
- admin mission control
- API and automation surfaces

### Key interpretation

ChefFlow should be understood first as an operator system with attached public, client, partner, staff, and admin surfaces.

## Primary Audience

ChefFlow is chef-first, but not chef-only.

### Primary audience

- chefs and culinary operators in restaurants, hotels, resorts, casinos, stadiums, and corporate dining
- private and personal chefs, catering teams, meal-prep businesses, bakeries, food trucks, commissaries, and ghost kitchens
- culinary teams in hospitals, senior living, schools, and universities
- estate and yacht culinary teams
- culinary R&D teams and multi-location culinary groups

### Persona-aware delivery

ChefFlow is universal in capability coverage but selective in presentation. A pastry chef, private chef, institutional foodservice director, line lead, purchasing chef, and multi-location culinary director should not see the same clutter. Modules and actions that do not serve the active persona or operation should remain hidden while the shared operating model stays intact.

### Important clarification

ChefFlow is not generic software merely because it covers many operation types. Its identity remains chef-first: model the actual jobs professional chefs perform, normalize the fragmented systems behind those jobs, and keep the chef inside one operating environment.

## Core Problem ChefFlow Solves

ChefFlow exists to eliminate operational fragmentation.

Today, many chef-led businesses run across disconnected tools:

- spreadsheets for costing
- scattered notes for recipes and prep
- inboxes and messages for client communication
- separate invoice and payment tools
- manual scheduling and calendar workflows
- ad hoc documents for execution and follow-up

ChefFlow brings those workflows into one system with shared state and role-aware delivery surfaces.

## Core Goals

These are the project's stable goals:

1. Eliminate fragmented operational tooling so professional chefs can run the working day from one operating environment.
2. Give operators clearer financial truth, pricing clarity, and business visibility.
3. Protect the chef-client relationship and treat operational data carefully.
4. Surface the right next action through queueing, briefing, and workflow guidance.
5. Normalize specialized external services behind ChefFlow integrations when owning the workflow is not technically or commercially sensible.
6. Keep capability delivery persona-aware so universal coverage does not create universal clutter.

## Stack-Elimination Workflow Test

For every screen and workflow, answer these questions in order:

1. What job is the chef trying to complete?
2. What applications do chefs currently switch between to complete it?
3. Can ChefFlow own the complete workflow?
4. If not, can ChefFlow integrate the external service so the chef never leaves ChefFlow?
5. If multiple services provide the information, can ChefFlow aggregate them into one normalized interface?
6. What remaining external interaction still prevents ChefFlow from becoming the chef's single operating environment?

Every unanswered item becomes product backlog. The canonical machine-readable backlog is `lib/capabilities/registry.ts`; `npm run audit:capabilities` audits it against current repository evidence and writes the current report to `docs/audit/2026-09-16-chefflow-capability-registry.md`.

## Scope Boundaries

### Clearly in scope

- Today command center, tasks, scheduling, team coordination, and unified inbox
- clients, guests, orders, reservations, events, and relationship workflows
- menus, recipes, prep, inventory, purchasing, receiving, vendors, and food safety
- payments, documents, employees, payroll coordination, financials, and analytics
- POS, delivery, CRM, catering, maintenance, marketing, compliance, nutrition, and employee-management workflows
- public discovery, client visibility, staff execution, partner surfaces, and admin oversight
- APIs, integrations, aggregation, automation, offline continuity, and supporting infrastructure
- operation-specific requirements for restaurants, independent chefs, institutional foodservice, hospitality, mobile food, commissaries, R&D kitchens, and multi-location groups

### Strategy boundary

A workflow may be owned by ChefFlow, integrated through a specialized service, or aggregated from multiple systems. A workflow that still requires the chef to open an external system is LAUNCH ONLY and remains product debt until that handoff can be removed.

### Not the primary identity

- a consumer marketplace that owns the chef-client transaction
- a commission-based booking intermediary
- a thin dashboard that merely links to the chef's existing app stack
- a collection of unrelated products

## Public Directory Position

The public directory is real and important, but it is a supporting surface of the operator platform, not a separate standalone product with equal identity weight.

Its job is to:

- make culinary businesses discoverable
- route potential clients to operators
- support intake and contact entry

Its job is not to redefine ChefFlow away from its core operator-system identity.

## Monetization and Access Contract

The current canonical product contract is:

- core platform access is universal
- the public and billing language should describe support, not escape from limitation
- ChefFlow is currently positioned around voluntary support rather than a hard Pro paywall

### Important implementation note

The repo still contains legacy tier and Pro-era implementation terminology:

- `requirePro(...)`
- `UpgradeGate`
- `PRO_FEATURES`
- `chef_privileged`
- `gated`

These should not be read as the current public product promise by default.

For now, interpret them this way:

- `chef_privileged` means advanced, owner-level, sensitive, or implementation-heavy functionality
- `gated` means controlled, limited, or historically paywalled in the implementation record
- `requirePro(...)` and `UpgradeGate` currently survive mainly as compatibility and routing infrastructure unless a newer document explicitly reintroduces real access differentiation

If monetization changes in the future, this document must be updated first before other docs start describing a new model as settled truth.

## One-Sentence Definition

If someone needs the shortest correct answer, use this:

ChefFlow is the universal operating system for professional culinary work, designed to let chefs complete their working day without thinking about or manually switching between a stack of other applications.

## Questions Everyone Should Be Able To Answer

Everyone working on ChefFlow should be able to answer these the same way:

1. What is ChefFlow?
   The universal operating system for professional culinary work.
2. What is the north-star test?
   A chef should be able to complete a normal working day without thinking about or manually switching between a stack of other applications.
3. What is the primary product?
   The authenticated, persona-aware ChefFlow operating environment.
4. Is the public directory the whole product?
   No. It is a supporting acquisition surface.
5. Is ChefFlow only for independent chefs and small teams?
   No. It serves professional chefs across independent, restaurant, hospitality, institutional, mobile, commissary, R&D, and multi-location operations.
6. Is ChefFlow a commission marketplace?
   No. Discovery is in scope; platform-owned booking take-rate is not the current identity.
7. What happens when a workflow still opens another app?
   It remains a capability gap. LAUNCH ONLY is explicit product debt.
8. Are legacy Pro and gating terms the current canonical monetization story?
   No. They are implementation/history artifacts unless explicitly reintroduced by updated strategy.
## Documentation Precedence

For project identity and scope questions, use this order:

1. this file
2. `docs/system-architecture.md`
3. `docs/chefflow-product-definition.md`
4. `docs/feature-inventory.md`
5. research baselines and supporting investigations

## Maintenance Rule

If product identity, audience, scope, or monetization posture changes, update this document first, then update the downstream docs that inherit from it.
