# Residency Chef Suite

## What Changed

- Added chef-side Household management on client detail so residency clients can have per-person allergies, dietary restrictions, dislikes, favorites, and notes.
- Hardened Dinner Circle household dietary lookups to include profiles linked through circle event clients, not only current circle members.
- Made the meal board dietary banner persistent for allergies, restrictions, and unknown allergy responses.
- Added visible per-meal household allergy conflict flags when a meal's allergen flags match household allergies.
- Added weekly shopping-list generation from the meal board, gated by circle token and backed by linked recipe ingredients when available.

## Why

Residency chefs need a standing weekly plan and per-person household dietary context. Allergy data is safety-critical, so failures now surface visibly instead of disappearing into empty states.

## Verification

- `npx tsc --noEmit --skipLibCheck` is blocked by existing unrelated errors in `components/navigation/chef-nav.tsx` and `lib/public-consumer/discovery-actions.ts`.
- `C:\Program Files\Git\bin\bash.exe scripts/compliance-scan.sh` passes em dash, public brand-surface, and ts-nocheck checks. It still reports existing unrelated server-action export violations in `lib/chef-decision-engine/actions.ts`, `lib/directory/actions.ts`, and `lib/public-consumer/menu-actions.ts`.
