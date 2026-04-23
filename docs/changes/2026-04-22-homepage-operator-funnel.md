# Homepage Operator Funnel

## What changed

- Repositioned the public homepage hero in `app/(public)/page.tsx` around the operator value proposition instead of a consumer-only marketplace pitch.
- Made `/for-operators` the primary homepage CTA path, with `/for-operators/walkthrough` as the direct high-intent follow-on link.
- Demoted the consumer marketplace search branch by keeping it visible in the hero card but removing it as the main accent CTA.
- Updated `app/(public)/for-operators/page.tsx` so the walkthrough is now the default qualified CTA, while pricing and self-serve signup are secondary.
- Changed `lib/public/public-secondary-entry-config.ts` so operator alternate links stay on operator-specific routes instead of bouncing users into consumer pages.
- Added drift protection in `tests/unit/operator-homepage-funnel.test.ts` and expanded `tests/unit/public-surface-contract.test.ts`.

## Why

The homepage was still speaking mostly to diners even though the strongest acquisition path in the codebase is the operator proof page and walkthrough lane. That created CTA sprawl, weak operator trust above the fold, and unnecessary branching between proof, compare, marketplace, and consumer flows.

## Verification

- `node --test --import tsx tests/unit/public-surface-contract.test.ts tests/unit/operator-homepage-funnel.test.ts`
- Browser verification and screenshots on the real UI after the code changes
