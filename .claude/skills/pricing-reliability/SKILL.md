---
name: pricing-reliability
description: Enforce ChefFlow no-blank, system-owned pricing. Use when work touches ingredient prices, costing, menu or event pricing, quote safety, OpenClaw price resolution, modeled fallbacks, receipt accuracy loops, or any claim that chefs can trust pricing without entering baseline prices.
---

# Pricing Reliability

ChefFlow must produce a system-owned price for every recognized ingredient. User input may improve accuracy, but ChefFlow must not depend on user input to create baseline pricing.

## Core Law

1. No recognized ingredient returns a blank price.
2. Unsupported text is an ingredient-resolution failure, not a pricing failure.
3. Modeled prices are allowed, but must never be displayed as observed, local, fresh, or buyable.
4. Money surfaces must distinguish `safe_to_quote`, `verify_first`, and `planning_only`.
5. Receipts and vendor invoices are accuracy proof and should grade prior estimates when that loop exists.

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
