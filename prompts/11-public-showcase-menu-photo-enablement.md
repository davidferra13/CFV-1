# BUILD: Public Showcase Menu Photo Enablement

## Context

You are taking over ChefFlow in a fresh context window. ChefFlow is a Next.js + PostgreSQL + Auth.js v5 private chef operations platform. `CLAUDE.md` is the governing project contract. Read it before making decisions and follow it over this prompt if there is any conflict.

This work continues the public showcase menu photo wiring. The previous session completed the public read/render slice, but the local DB still has no positive showcase/photo data. Your job is to verify the wiring, tighten any missing edge cases, and make the smallest product-facing enablement improvement that lets chefs understand how a dish photo-backed showcase menu reaches the public profile.

## Boot Sequence

Before doing anything else:

1. Run `bash scripts/session-briefing.sh`
   - If WSL bash fails on Windows, use Git Bash:
     `C:\Program Files\Git\bin\bash.exe scripts/session-briefing.sh`
2. Read `docs/.session-briefing.md`
3. Read `CLAUDE.md`
4. Read `MEMORY.md`
5. Skim the last 3 files in `docs/session-digests/`
6. Read `graphify-out/GRAPH_REPORT.md` before answering architecture or codebase questions
7. Verify current code and DB state yourself before acting

## Current Verified State From Previous Session

Do not assume these are still true. Verify before acting.

- Public marketplace chef cards already show chef images through `CloudinaryFetchImage`.
  - `app/(public)/chefs/page.tsx`
- Internal chef menu library cards already show the first dish photo as a menu card hero.
  - `app/(chef)/menus/page.tsx`
  - `app/(chef)/menus/menus-client-wrapper.tsx`
- Dish photo upload already exists.
  - `components/dishes/dish-photo-upload.tsx`
  - `lib/dishes/photo-actions.ts`
  - `components/menus/menu-doc-editor.tsx`
- Menu showcase toggle already exists on menu detail.
  - `app/(chef)/menus/[id]/menu-detail-client.tsx`
  - `lib/menus/showcase-actions.ts`
- Public chef profile Sample Menus were changed to support photo heroes.
  - `app/(public)/chef/[slug]/page.tsx`
  - `CloudinaryFetchImage` is imported and each Sample Menu card renders an image when `menu.photoUrl` exists.
- Public showcase menu data was changed to include a representative photo.
  - `lib/public/chef-profile-readiness.ts`
  - `PublicShowcaseMenu.photoUrl: string | null`
  - `getPublicShowcaseMenus()` selects `dishes.photo_url`, preserves showcase and non-archived filters, sorts dishes by course/sort order, then returns the first non-empty sorted dish photo.
- Docs were updated.
  - `docs/USER_MANUAL.md`
  - `docs/app-complete-audit.md`
  - `project-map/public/directory.md`
  - `docs/changes/2026-04-24-public-showcase-menu-photos.md`

## Local DB State Verified April 24, 2026

- `menu_status` enum values: `draft`, `shared`, `locked`, `archived`
- No literal `active` menu status. Treat active menus as non-archived menus.
- `19` non-archived menus
- `0` showcase menus
- `0` dishes with non-empty `photo_url`
- `dishes.photo_url` exists
- Public `dish-photos` storage bucket exists

Re-run read-only checks before coding.

## Goal

Build the narrow enablement layer around the existing systems. A chef should be able to understand, from the menu detail/library workflow, that:

- A showcased menu can appear on the public chef profile Sample Menus section.
- The public card photo comes from the first dish photo on that menu.
- If no dish photo exists, the public Sample Menu still renders cleanly as text.

Do not build a new upload system. Do not build a new asset system. Prefer wiring, copy, and verification over expansion.

## Approved Scope

You may touch only the narrow public showcase menu path:

- `app/(chef)/menus/[id]/menu-detail-client.tsx`
  - Clarify the existing showcase toggle label or helper copy so it truthfully reflects public profile visibility.
  - Mention that dish photos can be used on public Sample Menu cards only if the existing UI can do so without adding clutter.
  - Preserve current toggle behavior and tenant-scoped server action.

- `app/(chef)/menus/menus-client-wrapper.tsx`
  - Only if needed, add a small, non-invasive status cue for showcase/photo readiness on existing menu cards.
  - Do not redesign menu cards.

- `components/menus/menu-doc-editor.tsx`
  - Only if needed, adjust existing dish photo copy to clarify that dish photos can represent public showcase menus.
  - Do not change upload mechanics unless verification proves they are broken.

- `lib/public/chef-profile-readiness.ts`
  - Only fix edge cases in the already-added `photoUrl` transform if verification finds one.
  - Keep returned public data limited to showcase, non-archived menus.
  - Do not expose cost, private notes, internal chef notes, storage paths, or non-showcase menus.

- `app/(public)/chef/[slug]/page.tsx`
  - Only fix edge cases in the already-added Sample Menu hero rendering if verification finds one.
  - Preserve no-photo fallback.

- Tests/docs
  - Add a focused unit test if an existing pattern can cover representative photo selection and non-showcase exclusion without broad setup.
  - Update `docs/USER_MANUAL.md`, `docs/app-complete-audit.md`, `project-map/public/directory.md`, and a focused `docs/changes/...` note if UI behavior changes.

## Do Not Do

- Do not run production builds.
- Do not push.
- Do not run `drizzle-kit push`.
- Do not apply migrations.
- Do not mutate real data or seed showcase menus without explicit developer approval.
- Do not broaden into discovery ranking, marketplace redesign, onboarding, public profile redesign, or chef-facing upload rebuilds.
- Do not create a new image service, CDN wrapper, or storage bucket.
- Do not add fake sample menus or demo photos to production-like data.
- Do not expose archived or non-showcase menus.
- Do not expose internal/private/cost fields.

## Verification Plan

Use local-only checks.

1. Typecheck only:
   - `npm run typecheck`
2. Re-run read-only DB checks for:
   - `menu_status` enum values
   - non-archived menu count
   - showcase menu count
   - non-empty `dishes.photo_url` count
   - `dishes.photo_url` column existence
   - public `dish-photos` bucket
3. Start or reuse a local dev server only.
   - If an existing server is running, do not kill it.
   - If needed, start a separate dev server on another port with an ignored `.next-dev-*` dist dir.
4. Visit an existing `/chef/[slug]` profile.
   - Confirm Sample Menus no-showcase/no-photo fallback still renders cleanly.
5. Positive path:
   - Because local DB currently has `0` showcase menus and `0` dish photo URLs, do not fake success in the UI.
   - Prefer a focused non-mutating unit/mock test that proves:
     - `getPublicShowcaseMenus()` selects `dishes.photo_url`
     - non-showcase and archived menus remain filtered out
     - dishes are sorted before representative photo selection
     - blank/whitespace photo URLs are ignored
     - the first non-empty sorted photo becomes `photoUrl`
   - If you believe a temporary local DB fixture is necessary, stop and ask for explicit approval before mutating data.
6. If code files change, run `graphify update .` before final.
7. Report exactly what was verified and what could not be verified because the local DB has no showcase menus or dish photos.

## Definition of Done

- Public showcase menu photo wiring remains intact.
- Chef-side menu workflow truthfully communicates how showcase visibility and first dish photos affect public Sample Menus.
- No-photo and no-showcase fallbacks remain clean.
- No non-showcase, archived, cost, internal, or private fields are exposed.
- Focused automated or mocked verification covers the positive representative-photo path if local DB lacks positive data.
- `npm run typecheck` passes.
- No production build, no push, no DB mutation, no `drizzle-kit push`.
- `graphify update .` is run after code edits.
- Final answer lists changed files, verification, and any local DB limitations.

## Current Files To Inspect First

| Purpose                          | Path                                                     |
| -------------------------------- | -------------------------------------------------------- |
| Project contract                 | `CLAUDE.md`                                              |
| Public showcase read model       | `lib/public/chef-profile-readiness.ts`                   |
| Public chef profile Sample Menus | `app/(public)/chef/[slug]/page.tsx`                      |
| Chef menu library cards          | `app/(chef)/menus/menus-client-wrapper.tsx`              |
| Chef menu list data              | `app/(chef)/menus/page.tsx`                              |
| Chef menu detail showcase toggle | `app/(chef)/menus/[id]/menu-detail-client.tsx`           |
| Showcase server action           | `lib/menus/showcase-actions.ts`                          |
| Dish photo upload component      | `components/dishes/dish-photo-upload.tsx`                |
| Dish photo server actions        | `lib/dishes/photo-actions.ts`                            |
| Menu document editor dish rows   | `components/menus/menu-doc-editor.tsx`                   |
| Existing change note             | `docs/changes/2026-04-24-public-showcase-menu-photos.md` |
