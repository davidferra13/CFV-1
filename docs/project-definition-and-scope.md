# ChefFlow Canonical Project Definition and Scope

Status: canonical source of truth
Last updated: 2026-04-30
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

ChefFlow is a chef-first operating system for independent and small culinary businesses.

It is designed to unify the operational stack of a chef-led business into one shared system: sales, client relationships, events, menus, recipes, pricing, inventory, staffing, finance, documents, communication, and follow-through.

ChefFlow is not a collection of separate apps. It is one platform with multiple surfaces around a shared domain model.

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

- independent private chefs
- small chef-led catering operations
- recurring meal-prep operators
- chef businesses with small teams

### Secondary adjacent audience

- food trucks
- pop-ups
- chef-led hospitality businesses with retail or service extensions
- other small culinary operators when the workflows still fit the chef-led operating model

### Important clarification

ChefFlow is not best described as a generic software platform for every food business. The repo contains broader operator and retail-adjacent capabilities, but the product identity remains chef-led and operator-first.

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

1. Replace fragmented operational tooling with one integrated system for chef-led businesses.
2. Give operators clearer financial truth, pricing clarity, and business visibility.
3. Protect the chef-client relationship and treat operational data carefully.
4. Surface the right next action through queueing, briefing, and workflow guidance.
5. Help operators get discovered and contacted without turning ChefFlow into a commission marketplace.
6. Support relationship surfaces around the business: clients, staff, collaborators, partners, and admins.

## Scope Boundaries

### Clearly in scope

- chef/operator business management
- inquiry-to-event lifecycle
- client relationship and follow-through
- culinary workflow management
- pricing, costing, and procurement support
- finance, invoices, payments, and ledger support
- day-of operations and documentation
- public discovery and operator acquisition support
- client visibility and self-service
- admin oversight and internal control surfaces
- APIs, integrations, automation, and supporting infrastructure

### In scope but not core identity

- partner and referral workflows
- public directory and discovery
- staff execution tooling
- kiosk, mobile, demo, and tokenized delivery surfaces
- retail and commerce extensions
- restaurant- or bakery-adjacent schema and experiments

### Not the primary identity

- a consumer marketplace that owns the transaction
- a commission-based booking intermediary
- a generic enterprise suite for all restaurant operations
- a collection of unrelated products

## Public Directory Position

The public directory is real and important, but it is a supporting surface of the operator platform, not a separate standalone product with equal identity weight.

Its job is to:

- make culinary businesses discoverable
- route potential clients to operators
- support intake and contact entry

Its job is not to redefine ChefFlow away from its core operator-system identity.

## Monetization and Access Contract

The canonical access and revenue doctrine lives in `docs/chefflow-access-revenue-doctrine.md`.

The current product contract is:

- core platform access is universal
- ChefFlow will never charge a chef simply to price a menu with honest local pricing data
- the public and billing language should describe support, not escape from limitation
- ChefFlow is currently positioned around voluntary support rather than a hard Pro paywall
- future paid offerings must be additive leverage, automation, scale, compliance, commerce, marketplace, partner, or payment revenue, not arbitrary locks on baseline chef infrastructure
- marketplace-capable infrastructure is in scope, but ChefFlow remains an operating system first

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
For monetization detail, update `docs/chefflow-access-revenue-doctrine.md` first, then reflect the change here.

## One-Sentence Definition

If someone needs the shortest correct answer, use this:

ChefFlow is a chef-first operating system for independent and small culinary businesses, centered on the operator workspace and supported by public discovery, client, staff, partner, admin, and API surfaces.

## Questions Everyone Should Be Able To Answer

Everyone working on ChefFlow should be able to answer these the same way:

1. What is ChefFlow?
   A chef-first operating system for independent and small culinary businesses.
2. What is the primary product?
   The authenticated operator workspace.
3. Is the public directory the whole product?
   No. It is a supporting acquisition surface.
4. Is ChefFlow chef-only?
   No. It is chef-first, with adjacent support for other small culinary operators.
5. Is ChefFlow a commission marketplace?
   No. Discovery is in scope; platform-owned booking take-rate is not the current identity.
6. Are legacy Pro and gating terms the current canonical monetization story?
   No. They are implementation/history artifacts unless explicitly reintroduced by updated strategy.
7. Can ChefFlow charge chefs just to price a menu?
   No. Honest local menu pricing is baseline infrastructure.

## Documentation Precedence

For project identity and scope questions, use this order:

1. this file
2. `docs/chefflow-access-revenue-doctrine.md` for access and monetization specifics
3. `docs/system-architecture.md`
4. `docs/chefflow-product-definition.md`
5. `docs/feature-inventory.md`
6. research baselines and supporting investigations

## Maintenance Rule

If product identity, audience, scope, or monetization posture changes, update this document first, then update the downstream docs that inherit from it.
