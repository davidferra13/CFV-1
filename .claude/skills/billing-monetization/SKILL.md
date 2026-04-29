---
name: billing-monetization
description: Preserve ChefFlow free and paid tier behavior. Use when work touches billing gates, feature classification, modules, subscription checks, upgrade prompts, Stripe pricing, entitlement logic, trial behavior, or any UI that changes what free or paid chefs can do.
---

# Billing Monetization

Use this skill when changing monetization, entitlements, or upgrade surfaces.

## Workflow

1. Start from the canonical classification in `lib/billing/feature-classification.ts`.
2. Check related tier and module helpers before adding new billing logic.
3. Decide whether the feature is free utility or paid leverage, automation, accuracy, or scale.
4. Preserve the rule that free actions execute first, then upgrade prompts may appear after the completed free result.
5. Trace server action, UI, and cache behavior so the same entitlement result appears everywhere.
6. Verify monetary amounts are cents in storage and Stripe integration code.
7. Test both free and paid paths when behavior changes, including failed entitlement loads.

## Guardrails

- Do not add locked buttons for free-tier users.
- Do not hide failures as free access, paid access, `$0.00`, or an empty plan state.
- Do not invent a new tier source if canonical helpers already exist.
- Do not hardcode financial claims, plan limits, prices, or usage numbers unless they come from canonical config or database records.
- Keep tenant scoping on billing queries, and never trust tenant or chef identifiers from request bodies.
- Keep public naming as ChefFlow and email sender naming as CheFlow.
- Avoid non-functional upgrade controls. Hide them or disable them with a real reason.

## Closeout

Report the free path, paid path, and upgrade prompt behavior that was validated. If no code changed, state the decision source used. If code changed, commit only owned task files and leave unrelated dirty work untouched.
