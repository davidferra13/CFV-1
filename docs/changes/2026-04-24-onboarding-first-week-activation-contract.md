# Onboarding First-Week Activation Contract

Date: 2026-04-24

## Summary

ChefFlow now uses a shared first-week activation contract for onboarding progress. The primary setup story is the booking loop a solo private chef needs to prove in week one: profile and service setup, lead capture, sent quote, event creation, prep evidence, and invoice artifact.

## What Changed

- Added `lib/onboarding/first-week-activation.ts` as the shared owner for activation step order, completion rules, CTA destinations, evidence labels, and next-step selection.
- Rewired onboarding progress actions, the dashboard checklist, the onboarding hub, and dashboard Resolve Next to use that shared contract.
- Kept client import, recipe library, loyalty, and staff setup available as secondary onboarding work.
- Added deterministic unit coverage for activation-state transitions.
- Updated the onboarding journey spec to use explicit seeded chef states for first-run wizard, wizard-complete-not-activated, and activated-chef assertions.

## Completion Rules

- Profile is complete only when chef identity basics and at least one existing pricing/service surface are present.
- Lead capture accepts an inquiry first; a manually created client is a documented fallback lead.
- Quote completion requires a quote in `sent` or later status.
- Event completion requires at least one event.
- Prep completion requires event prep blocks, event menu assignment, or event prep start evidence.
- Invoice completion requires an event invoice artifact or recurring invoice history in a sent-or-later billing state.

## Verification

Required verification:

```bash
node --test --import tsx tests/unit/onboarding-first-week-activation.test.ts
npx playwright test --project=journey-chef tests/journey/02-onboarding-setup.spec.ts
```

Focused typecheck should be run with the repo typecheck entrypoint or a temporary focused config that is deleted after use.
