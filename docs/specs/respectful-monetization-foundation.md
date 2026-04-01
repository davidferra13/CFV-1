# Spec: Respectful Monetization Foundation

> **Status:** draft
> **Priority:** P1
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event    | Date             | Agent/Session | Commit   |
| -------- | ---------------- | ------------- | -------- |
| Created  | 2026-03-31 21:21 | Planner       | 0feb1100 |
| Locked   | 2026-03-31 22:28 | Planner       | 5677c711 |
| Reopened | 2026-03-31 23:01 | Planner       | 11e79250 |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

The developer wants ChefFlow to make money without feeling obnoxious, manipulative, or cheap. They do not want the product to put the word "Pro" in people's faces. They do not want the word "unlock" in people's faces. They do not want users constantly reminded that something is locked, withheld, or off-limits. They do not want the app to feel like pay-to-win, and they do not want free users to feel like they are using a worse, embarrassing version of the product.

They are trying to solve a real tension. They want everyone to get the product in their hands right now because they believe this is something people genuinely need. They also want to make money from it because they have spent serious time and real money building it. Leaving the whole thing free forever feels philosophically generous but financially irrational. Going too hard on pricing feels greedy, off-brand, and likely to damage trust.

They are actively torn between multiple models:

- A fully free product with voluntary support or donation.
- A donation or support action that effectively gives someone the whole product without feeling like a hard paywall.
- A cheap one-time purchase, even something as low as $1, if the product demo is strong enough to make the decision feel obvious.
- A real subscription, even though $25/month feels high and risky to ask for.

They also care about dignity and social reality. They want the ability to let close friends use everything without awkwardness, but they do not know whether that is wrong, unacceptable, or messy from a product perspective. They want a path that is respectable, makes money, and still feels aligned with the product's identity.

The developer is still uneasy about finalizing price before the product is fully proven. They do not want the spec to overstate certainty. They want room to consult other people, validate that the product works, and decide whether the final ask should be a fixed supporter price, a donation-style ask, or a Patreon-like patronage structure with optional incentives. The builder must be able to read this spec and understand that monetization implementation is not approved yet.

### Developer Intent

- **Core goal:** Define a monetization system that earns real revenue without making ChefFlow feel manipulative, gated, or inferior in its free experience.
- **Key constraints:** No aggressive "Pro" language, no "unlock" framing, no mocking lockouts, no pay-to-win feel, no degraded free tier, and no UX that makes users feel punished for not paying.
- **Motivation:** The developer wants the product in everyone's hands fast, but they also need a business model that respects the time and money already invested.
- **Success from the developer's perspective:** ChefFlow can ask for money in a way that feels dignified, clear, and deserved. Users understand the value and the ask without feeling pressured or diminished.

---

## What This Does (Plain English)

This spec defines ChefFlow's monetization foundation: the language rules, product behaviors, billing surface expectations, and legacy cleanup needed so ChefFlow can charge respectfully. It does not let builders invent a random paywall. It sets hard UX rules, lays out viable monetization models, recommends a direction, and identifies the exact code and documentation surfaces that must stop thinking in "free vs Pro" terms.

---

## Why It Matters

ChefFlow already claims that every feature is free and that support is voluntary, but the codebase still contains subscription, trial, Pro, and upgrade-era concepts. If monetization evolves without a clear foundation, the product will drift into a confused state where the brand says one thing and the system behaves like another.

This spec also matters because it needs to protect against premature implementation. The developer wants strategic clarity recorded now, but does not want a builder to treat pricing as finalized before product readiness and outside consultation happen.

---

## Current State Summary

ChefFlow currently presents itself as fully free with optional supporter contributions. The dedicated billing page is already titled "Support ChefFlow" and says every feature is included for free, with a voluntary "Become a Supporter" CTA in `app/(chef)/settings/billing/page.tsx:17-31` and `app/(chef)/settings/billing/billing-client.tsx:113-155`. The product definition matches that philosophy in `docs/chefflow-product-definition.md:44-45`, and the monetization shift doc explicitly says the product moved away from "Pro" badges, lock icons, and upgrade pressure in `docs/monetization-shift.md:12-15`.

Under the surface, the app still encodes a real SaaS subscription model. Stripe customer and subscription IDs, subscription status, trial end date, and subscription period end were added to `chefs` in `database/migrations/20260321000006_saas_billing.sql:7-32`. The billing service still creates Stripe customers, starts 14-day trials, resolves active/trial/expired status, and creates a recurring Stripe Checkout session in `lib/stripe/subscription.ts:47-156` and `lib/stripe/subscription.ts:221-245`. Tier resolution still returns `'free' | 'pro'` based on subscription status in `lib/billing/tier.ts:20-67`.

The old gating layer is neutralized, not removed. `requirePro()` is now a pass-through in `lib/billing/require-pro.ts:12-18`, `<UpgradeGate>` always renders children in `components/billing/upgrade-gate.tsx:8-16`, and the trial banner client renders nothing in `components/billing/trial-banner-client.tsx:7-14`. But the concepts still exist in comments, helper APIs, modules, and many route/action call sites across app and lib files.

This leaves the codebase in a mixed state: the user-facing product story is "everything is included," while the implementation story still assumes tiers, trials, subscriptions, and Pro-oriented feature taxonomy.

---

## Product Principles

These are non-negotiable. Any future monetization implementation must obey them.

1. ChefFlow must never frame payment as escaping a bad version of the product.
2. Core workflow access must not be degraded to create payment pressure.
3. The app must not use "Pro," "unlock," "upgrade to unlock," "locked feature," or equivalent taunting language in user-facing monetization surfaces.
4. Monetization prompts must be opt-in, low-pressure, and tied to value already received.
5. A user who does not pay must still feel respected and fully welcome in the product.
6. Payment should feel like support, membership, or an additive business decision, not a punishment avoidance mechanism.
7. If future paid offerings exist, they should be additive and honest about why they cost money. They should not masquerade as arbitrary locks on the core product.

---

## Monetization Options

These are the viable models surfaced by the developer's signal. Builders do not get to invent a fifth model without updating this spec.

### Option A: Supporter-Only

ChefFlow stays fully accessible. Users can make a voluntary recurring contribution to support development. Supporters may receive gratitude and cosmetic recognition, but not functional superiority.

- **Pros:** Best alignment with current product philosophy and current billing page.
- **Risks:** Revenue may underperform unless the product communicates value clearly and repeatedly proves itself before asking.
- **Implementation fit:** Closest to the current system, because recurring Stripe support already exists in `lib/stripe/subscription.ts:221-245`.

### Option B: One-Time Founding Pass

ChefFlow stays usable for everyone, but the product offers a one-time "founding supporter" or "early believer" purchase. This is not framed as escaping a lock; it is framed as backing the product and joining early.

- **Pros:** Low-friction purchase, strong launch hook, good fit for impulse support if the demo is compelling.
- **Risks:** Revenue is front-loaded and non-recurring. If phrased poorly, it can still feel like a disguised unlock fee.
- **Implementation fit:** Technically feasible because the app already has Stripe Checkout payment-mode patterns in `lib/stripe/checkout.ts:129-160`.

### Option C: Respectful Subscription

ChefFlow introduces a recurring paid membership, but the UX avoids taunting free users. The ask lives in dedicated support surfaces and post-value moments, not in daily navigation or disabled controls.

- **Pros:** Predictable recurring revenue.
- **Risks:** Highest brand risk. If this slips back into tier logic, the product will feel exactly like the thing the developer wants to avoid.
- **Implementation fit:** The current backend is already built around recurring subscription plumbing in `lib/stripe/subscription.ts:47-156` and `database/migrations/20260321000006_saas_billing.sql:7-32`.

### Option D: Recommended Hybrid

ChefFlow keeps universal product access, uses recurring supporter membership as the default revenue ask, optionally introduces a one-time founding pass, and reserves future paid offers for additive or cost-bearing services only.

- **Pros:** Preserves dignity, allows recurring revenue, allows a low-friction one-time launch offer, and leaves room for future monetization that does not corrupt the core UX.
- **Risks:** Requires tighter copy rules and a cleaner shared monetization state model than the repo has today.
- **Implementation fit:** Best strategic fit for the developer's actual tension. This is the recommended direction for planning.

### Option E: Patronage / Pay-What-You-Want Support

ChefFlow stays fully accessible and asks users to support it with a donation-style contribution or a Patreon-like patron model. The product may suggest levels, but the primary emotional framing is support rather than purchase.

- **Pros:** Feels philosophically aligned with generosity and community support. Avoids the weirdness of calling something a donation while also pretending there is only one acceptable amount.
- **Risks:** Revenue predictability is lower. If optional incentive tiers are added, those incentives must stay non-hostile and non-core or the system drifts back into soft gating.
- **Implementation fit:** Product-copy fit is plausible, but the repo does not currently have a pay-what-you-want or patron-tier model. This would require a different billing and messaging design from the current recurring support flow.

---

## Recommended Direction

This spec currently leans toward **Option D: universal access plus respectful support offers**, but this is a recommendation, not an approved launch decision.

That means:

- ChefFlow's core product remains fully usable for everyone.
- The primary money ask is framed as support for ChefFlow, not access to withheld functionality.
- A one-time founding pass remains optional and unresolved.
- If future paid offerings are ever added beyond support, they must be additive, explicit, and cost-justified. Examples: concierge onboarding, premium SMS bundles, or genuinely expensive third-party integrations. Core daily workflow cannot become a hostage.

This direction best matches the current product copy, the developer's constraints, and the existing codebase's ability to support recurring Stripe support flows without reintroducing a hostile upsell layer. But it is still a directional recommendation, not a finalized commercial decision.

## Decision Status

This spec is **not approved for build**. It captures the current recommendation and the decision space, but pricing and support structure are still open.

The later beta-first rollout reasoning and OpenClaw clarification are preserved separately in `docs/specs/beta-first-monetization-decision-archive.md`. Read both documents together before any monetization decision is promoted beyond strategy.

At the moment, the recommendation is:

1. Keep core access universal.
2. Use support-style monetization rather than feature-withholding language.
3. Keep additive paid services as the future expansion path if needed.

But these points are still unresolved:

1. Whether the support ask should be fixed-price, pay-what-you-want, or Patreon-style patronage.
2. Whether the pricing page should show one clear suggested amount or multiple contribution levels.
3. Whether any non-core supporter incentives should exist at all.
4. Whether a one-time founding pass belongs in the first monetization release.
5. How much consultation with other operators should happen before pricing is locked.
6. Whether the product is ready enough to justify any monetization ask yet.

## Builder Stop

Builder agents must **not** implement monetization from this spec yet.

They may use this document to understand:

- the constraints,
- the language rules,
- the cleanup surfaces,
- and the leading recommendation.

They must stop and ask for a follow-up decision spec before building if any of the following are still unresolved:

- final pricing model,
- final public pricing copy,
- whether support is fixed-price or pay-what-you-want,
- whether supporter incentives exist,
- whether monetization should ship before product-readiness validation.

---

## Files to Create

| File                                          | Purpose                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `lib/monetization/offers.ts`                  | Canonical list of allowed support offers, CTA labels, and copy rules    |
| `lib/monetization/status.ts`                  | Model-neutral monetization state helper for UI surfaces                 |
| `components/monetization/support-surface.tsx` | Shared respectful support UI for billing/settings/post-value placements |
| `components/monetization/support-nudge.tsx`   | Low-pressure, dismissible contextual support prompt with cooldown       |

---

## Files to Modify

| File                                                         | What to Change                                                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/settings/billing/page.tsx`                       | Keep dedicated support surface, switch to model-neutral status loader, and remove upgrade-era naming          |
| `app/(chef)/settings/billing/billing-client.tsx`             | Replace monthly-only supporter assumptions with offer-driven UI; preserve "everything is included" copy       |
| `app/(chef)/settings/billing/actions.ts`                     | Delegate to model-aware checkout helpers instead of a single generic subscription action                      |
| `lib/stripe/subscription.ts`                                 | Rename/restructure around support offers and recurring support status; stop encoding trials as product access |
| `lib/billing/constants.ts`                                   | Remove `PRO_` naming and trial-era comments from public monetization constants                                |
| `lib/billing/tier.ts`                                        | Deprecate product free/pro semantics for monetization UX; replace with support-state semantics                |
| `lib/billing/modules.ts`                                     | Remove comments and behavior assumptions about Pro modules and locked module UX                               |
| `lib/billing/require-pro.ts`                                 | Keep compatibility shim, but document it as auth-only and stop treating it as monetization logic              |
| `lib/billing/pro-features.ts`                                | Deprecate or repurpose as internal feature catalog metadata, not monetization messaging                       |
| `components/billing/upgrade-gate.tsx`                        | Mark for deprecation or alias to neutral component name                                                       |
| `components/billing/upgrade-prompt.tsx`                      | Replace with shared respectful support component or remove stale call sites                                   |
| `components/billing/trial-banner.tsx`                        | Remove or rename if no trial-based UX remains                                                                 |
| `components/billing/trial-banner-client.tsx`                 | Remove or rename if no trial-based UX remains                                                                 |
| `app/(chef)/layout.tsx`                                      | Stop mounting trial banner or carrying stale trial comments if the banner remains inert                       |
| `app/(chef)/settings/modules/page.tsx`                       | Stop passing tiered monetization semantics into module settings if not used                                   |
| `app/(chef)/settings/modules/modules-client.tsx`             | Remove locked-module assumptions and unused tier/lock UI logic                                                |
| `app/(chef)/settings/page.tsx`                               | Keep settings hub copy aligned with the respectful monetization model                                         |
| `lib/compliance/pre-deletion-checks.ts`                      | Revisit active subscription blocker language so it reflects support billing honestly                          |
| `app/api/demo/tier/route.ts`                                 | Remove Pro/free demo toggle or replace with supporter-state demo behavior                                     |
| `lib/help/page-info-sections/19-chef-portal-settings.ts`     | Update help text away from subscription/upgrade framing                                                       |
| `app/(public)/terms/_components/terms-extended-sections.tsx` | Align public terms copy with final support model and fee language                                             |
| `app/(public)/privacy/page.tsx`                              | Remove "cancel subscription and lose access" framing if universal access remains                              |
| `docs/app-complete-audit.md`                                 | Update audit entries that still describe subscription billing or Pro gating                                   |
| `docs/chefflow-product-definition.md`                        | Keep product definition consistent with final chosen monetization direction                                   |

---

## Database Changes

None for the simplest complete version of this foundation spec.

ChefFlow's existing billing columns are sufficient for a recurring supporter flow, as shown in `database/migrations/20260321000006_saas_billing.sql:7-32`. This spec intentionally avoids new schema work because the monetization structure is not final yet.

### New Tables

```sql
-- None for this phase.
```

### New Columns on Existing Tables

```sql
-- None for this phase.
```

### Migration Notes

- No migration is part of the simplest complete version of this spec.
- If the final decision stays on recurring support, pricing can expand through Stripe price configuration and code-level offer definitions, not new database state.
- If the developer later chooses complimentary support grants or one-time permanent supporter states, write a separate additive schema spec instead of overloading `subscription_status`.

---

## Data Model

This section describes the leading technical shape if the recommendation is approved. It is a planning model, not a finalized implementation contract.

### `MonetizationStatus`

- `accessModel: 'universal'`
- `supportState: 'none' | 'monthly_supporter' | 'annual_supporter' | 'grandfathered' | 'patron_supporter'`
- `canManageRecurringSupport: boolean`
- `nextContributionDate: string | null`
- `badgeLabel: string | null`

### `SupportOffer`

- `id: 'annual_support' | 'monthly_support' | 'patron_support' | 'pay_what_you_want_support'`
- `checkoutMode: 'subscription' | 'payment' | 'variable_payment'`
- `title: string`
- `story: string`
- `ctaLabel: string`
- `priceLabel: string`
- `enabled: boolean`
- `placement: 'billing_page' | 'post_value_nudge'`
- `isPreferred: boolean`

### `SupportNudgePolicy`

- Show only after a clear value moment.
- Never show during onboarding blockage, error recovery, or while a user is trying to finish a critical task.
- Dismissible.
- Cooldown required.
- No lock icon, no crossed-out feature list, no comparison table designed to shame non-supporters.

---

## Provisional Server Actions

| Action                             | Auth                                    | Input                 | Output                                     | Side Effects                                         |
| ---------------------------------- | --------------------------------------- | --------------------- | ------------------------------------------ | ---------------------------------------------------- |
| `getMonetizationStatus(chefId)`    | `requireChef()`                         | `chefId`              | `MonetizationStatus`                       | None                                                 |
| `redirectToSupportCheckout()`      | `requireChef()`                         | `offerId`             | Redirect only                              | Creates recurring Stripe Checkout session            |
| `redirectToSupportBillingPortal()` | `requireChef()`                         | None                  | Redirect only                              | Opens Stripe billing portal for recurring supporters |
| `dismissSupportNudge(context)`     | `requireChef()` or client-only cooldown | `{ context: string }` | `{ success: true }` or local cooldown only | Prevents repeated prompting in the same context      |

Notes:

- If the final decision stays on recurring support, `redirectToSupportCheckout()` should preserve the current recurring support flow, implemented today by `app/(chef)/settings/billing/actions.ts:12-16` and `lib/stripe/subscription.ts:221-245`, while expanding it to support the approved support offers.
- `dismissSupportNudge(context)` may be local-only for the simplest version. Do not add schema just to remember nudge dismissal.

---

## UI / Component Spec

_Describe what the user sees. Be specific: layout, components, states._

### Page Layout

`/settings/billing` remains the primary monetization surface.

If the recommendation is approved, the billing page should show:

- A headline that frames ChefFlow as fully usable today.
- A short mission statement explaining why support matters.
- Current supporter status if applicable.
- A respectful support ask, driven by the final approved support model.
- If fixed recurring prices are chosen, one or more recurring support offers with clear language.
- If a donation-style model is chosen, a suggested amount or pay-what-you-want structure without coercive framing.
- A plain-language explanation that support does not affect access to core product functionality.
- A link to manage recurring support only if the user has an active recurring support subscription.

It should not show:

- A free-versus-paid comparison table.
- Locked feature lists.
- Disabled buttons for things the user can already use.
- Repeated mentions of "upgrade," "Pro," or "unlock."

### States

- **Loading:** Billing page waits for server data. Do not show fake supporter state.
- **Empty:** Non-supporter sees the support story and offer cards.
- **Preferred offer presentation:** Final hierarchy depends on the pricing decision. If multiple fixed offers exist, the preferred option may be emphasized, but the spec does not yet lock which one.
- **Error:** If billing lookup fails, render the support story with a neutral fallback and no fabricated account status. Follow the current non-blocking billing-failure posture in `components/billing/trial-banner.tsx:12-16`.
- **Populated:** Supporter sees gratitude, current recurring date if applicable, and manage link if recurring support exists.

### Interactions

- Clicking a support CTA should submit a server action appropriate to the approved model.
- Clicking the manage CTA submits a server action that redirects to Stripe Billing Portal.
- Contextual support nudges may appear after value moments such as completing setup, closing an event, or successfully using a high-value workflow, but never while the user is blocked or trying to recover from failure.
- Nudge dismissal must suppress repeat prompts for a cooldown period.

---

## Edge Cases and Error Handling

| Scenario                                         | Correct Behavior                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| Billing lookup fails                             | Page still renders without breaking; do not invent supporter state                |
| Final support offer config missing               | Missing offer is hidden or disabled honestly; never submit a broken checkout form |
| User is already a recurring supporter            | Show gratitude + manage link, not another contribution CTA                        |
| Legacy route still imports `UpgradePrompt`       | Render neutral support messaging or migrate the call site; never revive Pro copy  |
| Module settings still receive `tier` props       | Treat monetization data as deprecated; do not reintroduce locked-module UI        |
| Account deletion checks active recurring support | Use honest billing language, not "subscription required for access" wording       |
| Docs drift from product behavior                 | Update docs in same implementation pass                                           |

---

## Verification Steps

_How does the builder agent confirm this works? Be specific._

1. Sign in with the agent account.
2. Navigate to `/settings/billing`.
3. Verify the page contains no user-facing use of `Pro`, `unlock`, `locked features`, or a free-versus-paid comparison.
4. Verify the page explicitly states that all core features remain available.
5. Verify the approved support structure is represented accurately on the page.
6. Trigger the approved support CTA path and verify it redirects to the correct billing flow successfully.
7. If recurring support exists, verify the manage CTA redirects to Stripe Billing Portal successfully.
8. Navigate to `/settings`, `/settings/modules`, and one or two former Pro-era routes and verify no hostile monetization language appears.
9. Check `/privacy` and `/terms` for aligned public wording.
10. Search the repo for user-facing `Upgrade to unlock`, `Pro`, and `locked feature` language after implementation and verify only acceptable internal/deprecated references remain.
11. Screenshot the final billing page and any contextual support nudge that remains in scope.

---

## Out of Scope

- Introducing new feature locks.
- Turning free users into a degraded tier.
- Final pricing choice itself.
- Shipping a one-time founding pass in this phase.
- Designing a full complimentary-access grants system. If the developer wants friend/beta/grace access states, write a separate additive schema spec.
- Adding premium external-cost add-ons such as SMS bundles or concierge services. Those are future monetization specs if needed.

---

## Notes for Builder Agent

- Do not confuse Stripe Connect payouts with ChefFlow support billing. The settings hub explicitly separates them in `app/(chef)/settings/page.tsx:371-399`.
- The current recurring support flow already exists. Reuse it where possible rather than rebuilding Stripe billing from scratch in `app/(chef)/settings/billing/actions.ts:12-21` and `lib/stripe/subscription.ts:221-273`.
- Do not assume recurring annual-plus-monthly pricing is approved just because it is the current recommendation.
- If the pricing model changes to donation-style or patronage-style, update this spec first instead of quietly improvising implementation details.
- Do not reintroduce user-facing `Pro` or `unlock` language anywhere.
- Do not overload `subscription_status` to represent every future monetization state. If permanent or complimentary support states become real, spec the schema explicitly first.

---

## Spec Validation

### 1. What exists today that this touches?

Today this touches the dedicated support page in `app/(chef)/settings/billing/page.tsx:17-31` and `app/(chef)/settings/billing/billing-client.tsx:48-165`, the recurring Stripe support flow in `app/(chef)/settings/billing/actions.ts:12-21` and `lib/stripe/subscription.ts:221-273`, the underlying subscription/trial state resolver in `lib/stripe/subscription.ts:29-156`, the product `free|pro` tier helper in `lib/billing/tier.ts:20-67`, the neutralized gating layer in `lib/billing/require-pro.ts:12-18`, `components/billing/upgrade-gate.tsx:8-16`, `components/billing/upgrade-prompt.tsx:15-29`, `components/billing/trial-banner.tsx:10-26`, and `components/billing/trial-banner-client.tsx:7-14`, the module/tier language in `lib/billing/modules.ts:5-18` and `app/(chef)/settings/modules/modules-client.tsx:213-219`, the settings hub copy in `app/(chef)/settings/page.tsx:363-410`, the account deletion blocker in `lib/compliance/pre-deletion-checks.ts:76-88`, the demo tier endpoint in `app/api/demo/tier/route.ts:20-56`, the public terms/privacy/help text in `app/(public)/terms/_components/terms-extended-sections.tsx:8-35`, `app/(public)/terms/_components/terms-extended-sections.tsx:77-91`, `app/(public)/privacy/page.tsx:136-143`, and `lib/help/page-info-sections/19-chef-portal-settings.ts:82-86`, plus documentation in `docs/monetization-shift.md:12-21`, `docs/chefflow-product-definition.md:44-45`, and `docs/app-complete-audit.md:1261-1262` and `docs/app-complete-audit.md:1601-1604`.

### 2. What exactly changes?

This spec changes language, decision framing, and the eventual support UX direction. It does not yet authorize implementation. Specifically: centralize the constraints and option set; preserve the leading recommendation; identify the cleanup surfaces builders will eventually need to touch; and keep Stripe Connect client-payment flows untouched. The current code locations are cited above, especially `app/(chef)/settings/billing/billing-client.tsx:113-155`, `lib/billing/tier.ts:20-67`, and `lib/compliance/pre-deletion-checks.ts:76-88`.

### 3. What assumptions are you making?

- **Verified:** ChefFlow already supports a recurring monthly support checkout via Stripe subscription in `lib/stripe/subscription.ts:221-245`.
- **Verified:** ChefFlow already has a reusable one-time Stripe Checkout payment pattern in `lib/stripe/checkout.ts:129-160`.
- **Verified:** User-facing product and docs already assert that all features are free in `app/(chef)/settings/billing/page.tsx:24-28`, `app/(chef)/settings/billing/billing-client.tsx:117-153`, and `docs/chefflow-product-definition.md:44-45`.
- **Recommendation only:** A recurring support ask around annual-plus-monthly pricing is currently the leading direction.
- **Open:** Whether pricing should be fixed, pay-what-you-want, or patron-style.
- **Open:** Whether a one-time founding pass should exist.
- **Open:** Whether friend/beta complimentary support needs a formal system.
- **Unverified:** Final public legal/accounting wording may still benefit from external review before launch.

### 4. Where will this most likely break?

1. **Stripe flow naming drift:** If builders rename things without preserving the actual recurring support flow, billing page actions will break or point at the wrong Checkout mode. The current coupling is `app/(chef)/settings/billing/actions.ts:12-21` to `lib/stripe/subscription.ts:221-273`.
2. **Semantic drift in deletion/legal surfaces:** If the support story changes but `lib/compliance/pre-deletion-checks.ts:76-88`, `app/(public)/terms/_components/terms-extended-sections.tsx:21-31`, and `app/(public)/privacy/page.tsx:136-143` are left untouched, the product will still communicate a subscription-access model publicly.
3. **Tier leakage through module/settings code:** `lib/billing/modules.ts:5-18` and `app/(chef)/settings/modules/modules-client.tsx:217-219` still think in locked-module terms. A builder could accidentally revive that mental model if they only patch billing copy.

### 5. What is underspecified?

The core strategic decision is still open. The biggest unresolved area is not micro-copy, it is the monetization structure itself. That means builders should not proceed yet.

### 6. What dependencies or prerequisites exist?

- Existing Stripe recurring support configuration via `STRIPE_SUBSCRIPTION_PRICE_ID` in `lib/stripe/subscription.ts:222-223`, which is relevant if recurring support remains the chosen model.
- Existing billing migration and columns in `database/migrations/20260321000006_saas_billing.sql:7-32`.
- Documentation alignment work in `docs/app-complete-audit.md:1261-1262`, `docs/app-complete-audit.md:1601-1604`, and `docs/chefflow-product-definition.md:44-45`.

### 7. What existing logic could this conflict with?

It can conflict with tier and gating logic in `lib/billing/tier.ts:20-67`, `lib/billing/require-pro.ts:12-18`, and `lib/billing/pro-features.ts:1-212`; neutralized but still-mounted banner/gate components in `components/billing/*`; settings/modules tier assumptions in `app/(chef)/settings/modules/page.tsx:13-18` and `app/(chef)/settings/modules/modules-client.tsx:18-24`; layout comments and mounts in `app/(chef)/layout.tsx:141-143`; and demo tooling in `app/api/demo/tier/route.ts:20-56`.

### 8. What is the end-to-end data flow?

Current recurring support flow:

1. User opens `/settings/billing`.
2. `app/(chef)/settings/billing/page.tsx:17-19` authenticates via `requireChef()` and loads billing state with `getSubscriptionStatus`.
3. `app/(chef)/settings/billing/billing-client.tsx:48-155` renders either supporter status or non-supporter CTA.
4. User submits the CTA form wired to `redirectToCheckout` in `app/(chef)/settings/billing/actions.ts:12-16`.
5. The action calls `createCheckoutSession` in `lib/stripe/subscription.ts:221-245`.
6. Stripe hosts the checkout.
7. On success, Stripe returns the user to `/settings/billing?upgraded=1`, which `app/(chef)/settings/billing/page.tsx:19-31` converts into a thank-you state.

The proposed flow will depend on the final monetization decision. If recurring support is approved, it can keep the same shape with model-neutral support status and offer definitions instead of tier/upgrade language.

### 9. What is the correct implementation order?

1. Finalize the monetization model.
2. Finalize the public pricing story and whether the ask is fixed-price, pay-what-you-want, or patron-style.
3. Only then, write a build spec or promote this spec to ready.
4. After approval, refactor the billing page and stale monetization helpers.
5. Then align deletion, help, privacy, terms, and audit docs.

### 10. What are the exact success criteria?

- `/settings/billing` contains no user-facing `Pro`, `unlock`, or locked-feature shame copy.
- The page clearly states that all core features remain available.
- The final approved support model is represented honestly.
- No builder has to guess what the business model is.
- Supporters can still manage recurring billing.
- Former monetization helper components no longer imply feature withholding.
- Module/settings surfaces no longer imply locked modules.
- Public terms, privacy, help, and app audit stop contradicting the product story.

### 11. What are the non-negotiable constraints?

- Auth remains `requireChef()`-based for chef-facing billing actions, as seen in `app/(chef)/settings/billing/page.tsx:17-19` and `app/(chef)/settings/billing/actions.ts:12-20`.
- Billing lookup failures must never break the app shell, following the current pattern in `components/billing/trial-banner.tsx:12-16`.
- Core product access remains universal. Do not turn support into a gate.
- Stripe Connect payout flows for chef-client payments remain separate from ChefFlow support billing, per `app/(chef)/settings/page.tsx:371-399`.
- Documentation and public legal copy must match actual behavior.

### 12. What should NOT be touched?

- Do not modify Stripe Connect payout routing or event payment checkout in `lib/stripe/checkout.ts:27-163`.
- Do not rewrite core module enable/disable persistence in `lib/billing/module-actions.ts:37-61`; only remove monetization leakage around it.
- Do not introduce new feature gates on commerce, analytics, AI, or integrations just because old `requirePro()` call sites still exist.
- Do not overload unrelated legal/account deletion flows with speculative new billing states.

### 13. Is this the simplest complete version?

No. This is intentionally incomplete as an implementation spec because the commercial decision is not final yet. It is complete as a strategy-capture and builder-stop document.

### 14. If implemented exactly as written, what would still be wrong?

The final model would still be wrong if a builder treated the current recommendation as approved pricing. The spec is preserving strategic thinking, not authorizing monetization implementation yet.

---

## Final Check

> Is this spec production-ready, or am I proceeding with uncertainty?

Proceeding with uncertainty.

This is not a build-ready monetization implementation spec yet. It is a strategy-and-constraints spec. The main unresolved area is the business decision itself: fixed support pricing vs donation-style support vs patron-style support, plus whether monetization should wait until product readiness is stronger.
