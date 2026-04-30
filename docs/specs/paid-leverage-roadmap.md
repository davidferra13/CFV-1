# Spec: Paid Leverage Roadmap

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** `founder-confidence-gate.md`, `chefflow-access-revenue-doctrine.md`, `respectful-monetization-foundation.md`
> **Estimated complexity:** medium (3-8 files)

## Timeline

| Event                 | Date                 | Agent/Session         | Commit  |
| --------------------- | -------------------- | --------------------- | ------- |
| Created               | 2026-04-30 13:05 EDT | Codex planner session | pending |
| Status: ready         | 2026-04-30 13:05 EDT | Codex planner session | pending |
| Claimed (in-progress) |                      |                       |         |
| Pre-flight passed     |                      |                       |         |
| Build completed       |                      |                       |         |
| Type check passed     |                      |                       |         |
| Playwright verified   |                      |                       |         |
| Status: verified      |                      |                       |         |

---

## Developer Notes

### Raw Signal

The developer wants ChefFlow to stay an operating system first. The foundation should be free because chefs have needed these tools for decades and should not be blocked from basic operational survival.

The developer specifically agreed that menu pricing should not become a paid wall. A chef should be able to price a menu with honest local data, see real versus estimated numbers, understand freshness and confidence, and use the basic operating system without feeling gatekept.

At the same time, ChefFlow must eventually make money. The developer wants a professional path where paid offerings begin only after the product creates real leverage: automation, scale, advanced intelligence, team operations, compliance, marketplace support, partner revenue, or payment revenue.

The developer is not against monetization. They are against charging too early, charging for baseline tools, and recreating extractive marketplace behavior. Paid layers should feel deserved because ChefFlow has already helped the chef.

### Developer Intent

- **Core goal:** Define the first paid layers ChefFlow may build after free menu pricing, without violating the free-core promise.
- **Key constraints:** Basic menu pricing stays free. Paid offerings must be additive leverage. No locked-button UX, no hostile upsell language, no charging for fake scarcity, no private data sale, and no paid lead gate that owns the chef-client relationship.
- **Motivation:** ChefFlow needs a revenue roadmap before monetization implementation so future builders do not revive old Pro assumptions or make random paywalls.
- **Success from the developer's perspective:** A builder can tell exactly which revenue layers are allowed first, which are later, which are banned, and what evidence is required before each layer ships.

---

## Continuity Preflight

| Question                            | Answer                                                                                                                                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Continuity decision                 | attach                                                                                                                                                                                                                                     |
| Canonical owner                     | `docs/chefflow-access-revenue-doctrine.md` for rules, `lib/billing/feature-classification.ts` for existing feature taxonomy, and `docs/specs/founder-confidence-gate.md` for readiness proof                                               |
| Existing related routes             | `/settings/billing` already handles support-style monetization; this spec does not change the route directly                                                                                                                               |
| Existing related modules/components | `lib/billing/feature-classification.ts` already classifies free vs paid feature categories; `lib/monetization/offers.ts` already defines voluntary support offers                                                                          |
| Recent overlapping commits          | `7679796f6 chore(agent): lock menu pricing access doctrine feature-pwa-device-diagnostics`; `b294ea52c chore(agent): write private dev cockpit spec feature/private-dev-cockpit-spec`                                                      |
| Dirty or claimed overlapping files  | Current tree contains unrelated PWA/mobile/report artifacts and concurrent spec work. Do not touch those files from this roadmap build.                                                                                                    |
| Duplicate or orphan risk            | Medium. Older monetization docs exist. This spec does not replace them. It turns the current doctrine into a sequence for allowed paid leverage.                                                                                           |
| Why this is not a duplicate         | `respectful-monetization-foundation.md` explains monetization tone and unresolved options. `chefflow-access-revenue-doctrine.md` defines the rule. This spec defines the allowed build order for paid leverage after the rule is accepted. |
| What must not be rebuilt            | Do not rebuild billing, Stripe, feature gating, pricing resolution, or marketplace surfaces from this spec alone.                                                                                                                          |

---

## Current State Summary

ChefFlow currently has a free-core doctrine. `docs/chefflow-access-revenue-doctrine.md` says ChefFlow will never charge a chef simply to price a menu with honest local pricing data and that paid offerings begin where ChefFlow adds automation, scale, expensive infrastructure, or business leverage beyond baseline.

The same doctrine identifies allowed paid candidates such as automatic menu price refresh, historical price trends, margin simulation, vendor substitution strategy, procurement plans, proposal automation, advanced analytics, staff workflows, inventory automation, commerce, SMS, integrations, compliance, cannabis operations, multi-location command center, and concierge setup.

The old feature classification map already uses the right product logic: free is complete standalone utility, and paid is leverage, automation, and scale. It also says paid prompts should surface after the free version executes, not as locked buttons.

The gap is sequencing. ChefFlow needs a roadmap that says what paid layer comes first, what waits, what requires the Founder Confidence Gate, and what is banned.

---

## What This Does (Plain English)

This spec defines the first paid roadmap for ChefFlow. It keeps honest menu pricing free, then introduces paid layers only where ChefFlow adds automation, intelligence, scale, or expensive operational infrastructure after the free workflow has already completed.

---

## Why It Matters

Without a roadmap, future agents may either avoid monetization entirely or reintroduce hostile paywalls. This spec gives ChefFlow a revenue path that protects trust while making the business real.

---

## Paid Leverage Sequence

### Layer 0: Support Only

Status: allowed now.

Purpose: voluntary support for development.

Allowed offers:

- monthly support
- one-time support
- founding supporter recognition if cosmetic only

Must not provide functional superiority over non-supporters.

### Layer 1: Menu Leverage After Free Pricing

Status: first paid product layer, blocked until Founder Confidence Gate allows `paid_leverage_ready`.

Free action must complete first:

- Chef prices a menu with honest local data.
- Chef sees real versus estimated values.
- Chef sees confidence, freshness, source, geography, radius, and fallback.

Paid leverage may begin after that:

- automatic weekly or daily refresh for saved menus
- margin simulation
- target-margin scenario planning
- menu price change alerts
- ingredient volatility alerts
- vendor substitution strategy
- procurement plan generation
- multi-menu quote optimization
- client-ready proposal package generation
- archived menu repricing at scale

This is the recommended first paid lane.

### Layer 2: Operations And Team Scale

Status: allowed after Layer 1 proves demand or when a real operator needs it.

Allowed paid features:

- staff seats
- staff scheduling
- prep workflow automation
- labor costing
- inventory automation
- purchase order generation
- recurring prep operations
- multi-event command center
- multi-location command center

Rule: the solo chef baseline remains usable without paying.

### Layer 3: Cost-Bearing Infrastructure

Status: allowed when direct cost exists.

Allowed paid or usage-based features:

- SMS workflows
- high-volume email automation
- premium integrations
- API access
- white-label public surfaces
- custom domains
- advanced exports
- large storage or document processing
- concierge imports and migrations

Rule: charge because ChefFlow incurs cost or provides specialized leverage, not because a basic button was withheld.

### Layer 4: Compliance And Specialized Modules

Status: allowed when legally or operationally specialized.

Allowed paid modules:

- cannabis dining operations
- compliance packets
- audit exports
- insurance and certificate tracking
- food safety documentation upgrades
- specialized operator workflows

Rule: compliance modules can be paid because they are specialized risk-management systems, not baseline menu pricing.

### Layer 5: Marketplace, Ads, And Partner Revenue

Status: later experiment, blocked until Founder Confidence Gate allows `marketplace_experiment_ready`.

Allowed revenue:

- featured chef placement with clear labeling
- sponsored supplier listing
- sponsored ingredient result
- vendor discovery placement
- public event placement
- ticket buyer fee
- gift card purchaser fee
- partner referral fee
- procurement marketplace take rate

Rules:

- ads must say `Sponsored` or `Ad`
- no private chef or client data sale
- no fake system recommendations
- no corrupting price truth
- no charging chefs for low-quality leads
- no hiding client identity to force payment

---

## Banned Monetization

These are blocked unless Founder Authority explicitly changes the access doctrine:

- charging to price a menu
- charging to see whether a price is real or estimated
- charging to see source, freshness, confidence, radius, or fallback
- charging to access the chef's own clients, events, menus, recipes, ledger, or exports
- paid-only basic event creation
- paid-only basic quote creation
- paid-only basic invoice generation
- lead fees for unqualified demand
- ads inside core work surfaces that look like product guidance
- selling private chef, client, guest, or event data

---

## Files to Create

| File                                        | Purpose                                                                                   |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `lib/monetization/paid-leverage-catalog.ts` | Canonical machine-readable list of allowed paid leverage layers, dependencies, and labels |
| `tests/unit/paid-leverage-catalog.test.ts`  | Unit tests that banned free-core items cannot be classified as paid                       |

---

## Files to Modify

| File                                               | What to Change                                                                                                             |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `lib/billing/feature-classification.ts`            | Align legacy paid feature metadata with this roadmap, preserving compatibility helpers                                     |
| `docs/chefflow-access-revenue-doctrine.md`         | Add a short link to the paid leverage roadmap after the roadmap is implemented                                             |
| `docs/specs/respectful-monetization-foundation.md` | Add a reference saying this roadmap defines sequencing, while that spec defines tone and support behavior                  |
| `app/(chef)/settings/billing/page.tsx`             | Later build only: keep support-first language and do not show paid leverage offers until Founder Confidence Gate allows it |

---

## Database Changes

None.

Do not create billing or entitlement tables from this spec alone. A later implementation spec must define storage only after the paid layer and pricing model are selected.

---

## Data Model

```ts
type PaidLeverageLayer =
  | 'support_only'
  | 'menu_leverage'
  | 'ops_team_scale'
  | 'cost_bearing_infrastructure'
  | 'compliance_specialized'
  | 'marketplace_partner'

type PaidLeverageItem = {
  slug: string
  label: string
  layer: PaidLeverageLayer
  allowedWhen:
    | 'now'
    | 'founder_confidence_paid_leverage_ready'
    | 'operator_demand_proven'
    | 'direct_cost_exists'
    | 'marketplace_experiment_ready'
  freePrerequisite: string
  reasonItCanBePaid: string
  bannedIf: string[]
}
```

---

## Server Actions

No new server actions.

This roadmap is a policy and catalog spec. Future checkout, billing, or entitlement actions require a separate implementation spec.

---

## UI / Component Spec

No new UI in this spec.

When this roadmap is implemented, paid leverage prompts must follow these rules:

- free action completes first
- prompt is contextual
- prompt explains the added leverage
- prompt does not use hostile lock language
- user can dismiss or continue without losing free output
- no disabled fake buttons

Example after free menu pricing:

`This menu is priced. ChefFlow can also monitor it weekly and warn you when cost changes threaten your margin.`

---

## Edge Cases and Error Handling

| Scenario                                      | Correct Behavior                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| Feature touches menu pricing                  | Keep basic pricing free and classify only post-pricing automation as paid        |
| Feature touches user-owned data               | Do not charge for access to the user's own records                               |
| Feature uses expensive third-party services   | May be usage-based if cost is disclosed                                          |
| Feature mixes marketplace and operating tools | Default to operating-system trust; marketplace revenue must stay clearly labeled |
| Founder Confidence Gate is not passed         | Show support-only monetization; do not ship paid leverage prompts                |
| Builder cannot classify a feature             | Mark `needs_founder_decision` rather than guessing                               |

---

## Verification Steps

1. Run unit tests for `paid-leverage-catalog`.
2. Verify `price-view-basic`, menu pricing, source labels, freshness labels, confidence labels, and data export cannot be classified as paid.
3. Verify menu refresh, margin simulation, procurement plans, staff automation, compliance modules, and marketplace sponsorship can be classified as paid only under their allowed conditions.
4. Verify no public UI text says `unlock` or implies the free product is crippled.
5. Verify the billing page remains support-first until Founder Confidence Gate permits paid leverage.

---

## Out of Scope

- Not implementing checkout.
- Not setting final prices.
- Not adding entitlement enforcement.
- Not changing Stripe.
- Not changing menu pricing.
- Not creating marketplace ads.
- Not changing public website copy.
- Not building the Founder Confidence Gate.

---

## Spec Validation

1. **What exists today that this touches?** `docs/chefflow-access-revenue-doctrine.md` defines free core and paid leverage. `lib/billing/feature-classification.ts` already has free and paid feature taxonomy. `docs/specs/respectful-monetization-foundation.md` defines tone and support-first constraints.
2. **What exactly changes?** Add a paid leverage roadmap spec. Later build creates a catalog and aligns feature classification metadata.
3. **What assumptions are being made?** The Founder Confidence Gate will determine when paid leverage can be activated. That dependency is explicit.
4. **Where will this most likely break?** Builders may confuse catalog metadata with active gating. The spec fences that off by requiring a separate implementation spec for checkout or entitlement.
5. **What is underspecified?** Final pricing amounts are intentionally not specified.
6. **Dependencies or prerequisites.** Founder Confidence Gate and access doctrine.
7. **Existing logic conflicts.** Old Pro-era names in billing files may conflict with new doctrine. Builders should preserve compatibility but avoid public Pro framing.
8. **Duplicate or fragmentation risk.** Avoided by treating this as sequencing, not a new monetization philosophy.
9. **End-to-end data flow.** None yet. Future implementation flow is free action, contextual prompt, paid leverage checkout, entitlement or usage state, paid feature execution.
10. **Correct implementation order.** Policy catalog first, tests second, feature-classification alignment third, UI prompt spec fourth, billing implementation later.
11. **Success criteria.** Free pricing remains free, first paid layer is post-pricing leverage, and banned monetization cannot enter the catalog.
12. **Non-negotiable constraints.** No basic menu pricing paywall, no private data sale, no fake ads, no disabled fake buttons, no hostile lock copy.
13. **What should not be touched.** Stripe, DB, pricing resolver, marketplace code, PWA/mobile work.
14. **Simplest complete version.** Yes. This defines the roadmap and catalog contract only.
15. **If implemented exactly as written, what would still be wrong?** ChefFlow would still need final prices, checkout UX, entitlement behavior, and real user willingness-to-pay validation.

## Final Check

This spec is production-ready as a roadmap handoff. It is not approval to build billing or charge users. It defines what may be paid when ChefFlow is ready.

---

## Notes for Builder Agent

This spec protects the free-core promise while allowing ChefFlow to become a real business.

Do not turn it into a paywall build. The next implementation step is a catalog and tests, not Stripe checkout.
