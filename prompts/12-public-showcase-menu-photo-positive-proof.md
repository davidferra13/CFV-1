# VERIFY: Public Showcase Menu Photo Positive Proof

You are taking over ChefFlow in a fresh context window. `CLAUDE.md` is the governing project contract. Read it before making decisions and follow it over this prompt if there is any conflict.

## Boot Sequence

Before doing anything else:

1. Run `bash scripts/session-briefing.sh`
   - If WSL bash fails on Windows, use Git Bash:
     `C:\Program Files\Git\bin\bash.exe scripts/session-briefing.sh`
2. Read `docs/.session-briefing.md`
3. Read `CLAUDE.md`
4. Read `MEMORY.md`
5. Skim the last 3 files in `docs/session-digests/`
6. Read `graphify-out/GRAPH_REPORT.md`
7. Verify current code and DB state yourself before acting

## Context

The public showcase menu photo enablement work is complete and should be treated as a verification target, not as an invitation to redesign the menu or public profile surfaces.

The completed path is:

- `lib/public/chef-profile-readiness.ts`
  - `PublicShowcaseMenu` includes `photoUrl: string | null`.
  - `getPublicShowcaseMenus()` selects `dishes.photo_url`.
  - It keeps `is_showcase = true` and `status != archived`.
  - It sorts dishes before choosing a representative photo.
  - It ignores blank or whitespace photo URLs.
  - It returns the first usable sorted dish photo as `photoUrl`.

- `app/(public)/chef/[slug]/page.tsx`
  - Public Sample Menu cards render a `CloudinaryFetchImage` hero when `menu.photoUrl` exists.
  - Cards without `photoUrl` keep the clean text fallback.
  - The no-showcase fallback remains clean.

- `app/(chef)/menus/[id]/menu-detail-client.tsx`
  - The showcase toggle is now labeled **Public Profile Sample Menus**.
  - The helper copy explains that non-archived showcase menus can appear publicly.
  - The helper copy explains that the first sorted dish photo becomes the public card image.
  - The helper copy explains that menus without dish photos stay text-only publicly.
  - Toggle behavior still uses the existing tenant-scoped `toggleShowcase()` server action.

- `components/dishes/dish-photo-upload.tsx`
  - Compact dish photo controls now include hover/accessibility copy explaining that, on showcased menus, the first dish photo can be used on the public Sample Menu card.
  - Upload mechanics were not changed.

- `tests/unit/public-showcase-menu-photos.test.ts`
  - Non-mutating mock test covers `photo_url` selection, non-showcase exclusion, archived exclusion, dish sorting, whitespace URL skipping, and first usable sorted photo selection.

- Docs updated:
  - `docs/USER_MANUAL.md`
  - `docs/app-complete-audit.md`
  - `project-map/chef-os/culinary.md`
  - `docs/changes/2026-04-24-public-showcase-menu-photos.md`

## Current DB State Last Verified On April 24, 2026

Do not trust this blindly. Re-run read-only checks.

- `menu_status` enum values: `draft`, `shared`, `locked`, `archived`
- No literal `active` menu status. Treat active menus as non-archived menus.
- `19` non-archived menus
- `0` non-archived showcase menus
- `0` dishes with non-empty `photo_url`
- `dishes.photo_url` exists
- Public `dish-photos` storage bucket exists

## Goal

Independently verify that the public showcase menu photo path is done and protected. Only make code changes if verification finds a real defect.

The ideal outcome is a short final report saying:

- Public read/render wiring remains intact.
- Chef-side workflow copy truthfully explains public Sample Menus and dish-photo behavior.
- Mocked positive-path coverage passes.
- Local real-UI positive photo rendering cannot be verified because the DB has no showcase menus or dish photos.
- No data was mutated.

## Approved Scope

You may inspect and, only if needed, touch:

- `lib/public/chef-profile-readiness.ts`
- `app/(public)/chef/[slug]/page.tsx`
- `app/(chef)/menus/[id]/menu-detail-client.tsx`
- `components/dishes/dish-photo-upload.tsx`
- `components/menus/menu-doc-editor.tsx`
- `tests/unit/public-showcase-menu-photos.test.ts`
- The public showcase menu docs listed above

Do not broaden the task. If everything passes, do not change files just to create activity.

## Do Not Do

- Do not run production builds.
- Do not push.
- Do not run `drizzle-kit push`.
- Do not apply migrations.
- Do not mutate real data.
- Do not seed showcase menus or dish photo URLs without explicit developer approval.
- Do not create fake sample menus, fake demo photos, a new storage bucket, a new image service, or a new upload system.
- Do not redesign menu cards, public profiles, marketplace discovery, onboarding, or ranking.
- Do not expose archived menus, non-showcase menus, cost data, private notes, internal chef notes, storage paths, or any private/internal field.

## Verification Plan

Use local-only checks.

1. Run the focused unit test:
   - `node --test --import tsx tests/unit/public-showcase-menu-photos.test.ts`

2. Run typecheck:
   - `npm run typecheck`

3. Re-run read-only DB checks for:
   - `menu_status` enum values
   - non-archived menu count
   - non-archived showcase menu count
   - non-empty `dishes.photo_url` count
   - `dishes.photo_url` column existence
   - public `dish-photos` bucket existence and public flag

4. Start or reuse a local dev server only.
   - If an existing server is running, do not kill it.
   - If needed, start a separate dev server on another port with an ignored `.next-dev-*` dist dir.

5. Browser verify with Playwright:
   - Authenticate with `.auth/agent.json` through `/api/e2e/auth`.
   - Visit an agent-owned menu detail page that loads successfully.
   - Confirm **Public Profile Sample Menus** helper copy is visible.
   - Visit an existing `/chef/[slug]` profile.
   - Confirm Sample Menus no-showcase/no-photo fallback still renders cleanly.

6. Positive real-UI path:
   - If the DB still has no showcase menus and no dish photos, do not fake success.
   - Report that real public photo-card rendering remains unverified locally because the local DB lacks positive rows.
   - The existing mock test is the positive-path proof unless the developer explicitly approves a local fixture mutation.

7. If and only if code files change, run:
   - `graphify update .`

## Known Local Verification Notes From The Prior Session

- Existing dev servers were listening on ports `3100` and `3101`; `3101` served the public chef profile successfully.
- `http://127.0.0.1:3101/chef/harbor-hearth-canonical` rendered the no-showcase fallback.
- One agent-owned menu, `43071d0d-0793-4496-bd31-4506daf76193`, hit the dashboard error boundary for unrelated local fixture reasons.
- Other agent-owned menus loaded and showed the new helper copy, including `18dbb871-1989-449b-9c1c-15aec548dcb1`.
- The authenticated chef shell logged existing dev-console responses from `/api/ai/health` with `401` and realtime with `403`; do not treat those as part of this feature unless you prove a causal link.

## Definition Of Done

- No regressions found in public showcase menu read/render behavior.
- Chef workflow copy remains truthful and non-cluttered.
- Focused mocked positive path passes.
- `npm run typecheck` passes.
- Read-only DB checks are reported with exact counts.
- Local browser fallback verification is reported.
- Real positive photo-card UI limitation is explicitly reported if the DB still has no showcase/photo rows.
- No production build, push, migration, `drizzle-kit push`, or data mutation occurred.
- Final answer lists changed files, verification, and limitations. If no files changed, say that clearly.
