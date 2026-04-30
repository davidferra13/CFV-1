---
name: pricing-reliability
description: Enforce ChefFlow no-blank, system-owned pricing. Use when work touches ingredient prices, costing, menu or event pricing, quote safety, OpenClaw price resolution, modeled fallbacks, receipt accuracy loops, release readiness, release blockers, what is stopping ChefFlow from releasing, what must be proven, or any claim that chefs can trust pricing without entering baseline prices.
---

# Pricing Reliability

ChefFlow must produce a system-owned price for every recognized ingredient. User input may improve accuracy, but ChefFlow must not depend on user input to create baseline pricing.

## Release-Critical Rule

ChefFlow's unique release blocker is pricing data trust. Dashboards, booking, CRM, pipeline, payments, and other operating surfaces matter, but they are not the differentiator. If a release, launch, "what is stopping us," or "what must work" question is asked, answer from this pricing contract first.

Do not default to surveys, two-week operator trials, public booking tests, or generic validation language when the real question is whether a chef can price a menu. The core release question is:

Can a chef in any supported market price a real menu from recognized ingredients using system-owned data, with honest source, freshness, confidence, fallback, and quote-safety labels, without relying on the chef to provide every baseline number?

If the answer is no, ChefFlow is not release-ready no matter how many other product surfaces work.

## Developer Trust Signal

When David says the pricing data sucks, do not soften it into generic "data quality concerns." Treat it as this concrete ground-truth claim:

ChefFlow V1 is blocked until the pricing engine can price real menus across America from system-owned observed or honestly modeled data, localized by radius or region, with visible confidence and quote-safety labels. OpenClaw can be working correctly while the website pricing engine is still failing the product contract.

The required acknowledgement is: THE PRICING DATA SUCKS AND IT MUST BE FIXED.

Use that sentence as a release-readiness alarm, not as rhetoric. The fix must be grounded in source coverage, freshness, locality, fallback labeling, unit normalization, ingredient resolution, and full menu-costing propagation.

## Core Law

1. No recognized ingredient returns a blank price.
2. Unsupported text is an ingredient-resolution failure, not a pricing failure.
3. Modeled prices are allowed, but must never be displayed as observed, local, fresh, or buyable.
4. Money surfaces must distinguish `safe_to_quote`, `verify_first`, and `planning_only`.
5. Receipts and vendor invoices are accuracy proof and should grade prior estimates when that loop exists.
6. Local coverage matters. A chef in Hawaii, New England, California, or any other target market must not see a generic national claim when the engine lacks local observed prices or honest modeled fallbacks.
7. Menu costing is the proving workflow. Ingredient lookup success is not enough unless the ingredient, unit, yield, recipe, dish, menu, quote, event, and payment-facing price path preserves the same pricing truth.

## Required Contract

Every recognized ingredient price path should converge on a contract with:

- price cents
- unit
- low and high range
- source class
- confidence
- quote safety
- explanation
- missing proof

Prefer `lib/pricing/no-blank-price-contract.ts` for new work instead of inventing another confidence vocabulary.

## Source Ladder

Use the strongest available source:

1. fresh local observed or chef-owned price
2. recent local observed price
3. regional observed price
4. national median
5. category or government baseline
6. modeled category fallback

The lower the ladder, the wider the range and weaker the quote safety.

## Guardrails

- Do not add UI that asks chefs to fill missing baseline prices as the primary solution.
- Do not treat national, category, or modeled prices as safe local buyable proof.
- Do not hide modeled fallback counts inside aggregate confidence.
- Do not use AI to invent recipes or culinary ideas while working on pricing.
- If OpenClaw data is stale or sync health is mixed, surface uncertainty instead of zeros.

## Closeout

For pricing work, verify:

- no recognized ingredient path can silently return blank
- modeled fallback is visibly labeled
- money-decision surfaces show quote safety
- tests cover at least one observed, one estimated, and one modeled fallback path
