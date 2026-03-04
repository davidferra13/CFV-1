# Pricing Tiering Framework

## Objective

This document defines how ChefFlow functions are assigned to `Free`, `Pro`, or `Scale` so product, billing, and marketing stay aligned.

## Current recommendation

1. Keep two enforceable product tiers right now: `Free` and `Pro`.
2. Offer `Scale` as a pilot package (implementation + rollout support), not a third self-serve billing switch yet.
3. Only launch a true third in-product tier after multi-seat permissions and team billing are implemented end-to-end.

## Tier intent

### Free

Use Free for capabilities a solo chef needs every week to run the business.

### Pro

Use Pro for capabilities that significantly increase leverage:

- major automation
- AI acceleration
- growth tooling
- advanced operational controls

### Scale (pilot)

Use Scale for high-touch services where success depends on rollout support, migration, and process coaching across a team.

## Placement rubric

Answer these questions for every new function:

1. Is this required for a solo chef to operate reliably each week?

- Yes: default to `Free`.

2. Does this primarily save substantial time, unlock growth, or add advanced controls?

- Yes: default to `Pro`.

3. Does this require organizational rollout or implementation guidance to succeed?

- Yes: include it in `Scale` package scope.

4. Is there an existing `requirePro()` gate for this function?

- Yes: it must be represented as `Pro` in customer-facing pricing copy.

## Source files

- Tier enforcement: `lib/billing/require-pro.ts`
- Tier resolution: `lib/billing/tier.ts`
- Pro feature registry: `lib/billing/pro-features.ts`
- Module registry: `lib/billing/modules.ts`
- Pricing catalog for page + metadata: `lib/billing/pricing-catalog.ts`

## Function mapping (current state)

### Foundation functions (Free)

- Dashboard
- Pipeline
- Events
- Culinary
- Clients
- Finance
- Core inquiry, quote, booking, client portal, and baseline finance workflows

### Enforced Pro functions (actively gated in code)

- Remy AI assistant (`remy`)
- Marketing workflows (`marketing`)
- Custom reports (`custom-reports`)
- Integrations and automation (`integrations`)
- Commerce engine (`commerce`)
- Protection workflows (`protection`)
- Professional development workflows (`professional`)

### Pro catalog domains (registry)

- AI and assistant workflows
- Analytics and reporting
- Finance expansion
- Marketing and outreach
- Client intelligence
- Loyalty
- Staff operations
- Operational controls
- Compliance/protection
- Community collaboration
- Integrations
- Professional development
- Advanced calendar
- Commerce and POS

### Scale pilot scope (service-led)

- Multi-chef rollout planning
- Workflow migration from spreadsheets and fragmented tools
- Process architecture and change-management support

## Governance

Run a monthly pricing alignment check:

1. Compare all `requirePro('<slug>')` usage to pricing page matrix.
2. Compare `PRO_FEATURES` entries to documented Pro domains.
3. Confirm trial, price, and FAQ copy still match billing constants.
4. Record additions/removals in changelog notes for sales/support.
