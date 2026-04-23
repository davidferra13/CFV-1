# Operator Acquisition Entry Routing

## What changed

- Added `lib/marketing/source-links.ts` as the single owner for public operator acquisition source links and query parsing.
- Updated homepage operator messaging so `/` now routes operators into a proof-first path plus the walkthrough lane instead of one generic operator CTA.
- Updated `/for-operators` with segmented next-step cards that match how the operator currently sells.
- Updated `/for-operators`, `/marketplace-chefs`, and `/compare` so their `PublicPageView` events keep incoming `source_page` and `source_cta` context.
- Added `tests/unit/marketing-source-links.test.ts` to lock the shared source-link contract.

## Why

ChefFlow already had multiple truthful operator acquisition surfaces, but discovery into them was weak and attribution was inconsistent. This slice makes the operator funnel easier to enter and easier to measure without inventing fake proof or fake automation: homepage points into proof, and the proof page then branches by operator intent.

## Verification

- `node --test --import tsx tests/unit/marketing-source-links.test.ts`
- `npx eslint "lib/marketing/source-links.ts" "lib/marketing/signup-links.ts" "lib/marketing/walkthrough-links.ts" "tests/unit/marketing-source-links.test.ts" "app/(public)/page.tsx" "app/(public)/for-operators/page.tsx" "app/(public)/marketplace-chefs/page.tsx" "app/(public)/compare/page.tsx"`
- `npm run typecheck:web-beta`
- Playwright proof on isolated `http://127.0.0.1:3350` with screenshots:
- `test-screenshots/operator-acquisition-home.png`
- `test-screenshots/operator-acquisition-for-operators.png`
- `test-screenshots/operator-acquisition-compare.png`
- `test-screenshots/operator-acquisition-marketplace-chefs.png`
