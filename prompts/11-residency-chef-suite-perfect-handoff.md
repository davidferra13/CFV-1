# Prompt 11: Residency Chef Suite, Perfect Integration Handoff

You are starting in a brand new context window in `c:\Users\david\Documents\CFv1`.

## Mandatory First Steps

1. Read `CLAUDE.md` first. Treat it as binding project law for this session.
2. Run `bash scripts/session-briefing.sh` if available, then read `docs/.session-briefing.md`.
3. Read this prompt completely before editing anything.
4. Read these source prompts and specs:
   - `prompts/05-residency-chef-suite.md`
   - `docs/specs/household-profiles.md`
   - `docs/specs/weekly-meal-board.md`
   - `docs/specs/universal-interface-philosophy.md`
   - `docs/specs/surface-grammar-governance.md`
5. Inspect the working tree before changes. The repo is already dirty. Do not revert unrelated work.

## Goal

Finalize the Residency Chef Suite so it is genuinely production-ready and integrated across the chef client detail page and Dinner Circle weekly meal board.

The feature must deliver:

1. Household Profiles on the chef client detail page.
2. A weekly meal board that persistently surfaces household dietary/allergy needs.
3. Per-meal allergy conflict flags when planned meals include household allergens.
4. Weekly shopping-list generation from the meal board.
5. Clean hub client/server bundling with no server-only imports in client bundles.
6. Docs, project map, screenshots, graphify, and closeout status updated.

## Current Implementation State

Substantial implementation is already present. Do not rebuild blindly. Inspect and either preserve, harden, or fix it.

Key files currently involved:

- `app/(chef)/clients/[id]/page.tsx`
- `components/clients/client-household-panel.tsx`
- `lib/hub/household-actions.ts`
- `app/(public)/hub/g/[groupToken]/page.tsx`
- `app/(public)/hub/g/[groupToken]/hub-group-view.tsx`
- `components/hub/weekly-meal-board.tsx`
- `components/hub/dietary-dashboard.tsx`
- `components/hub/hub-member-list.tsx`
- `components/hub/meal-board-shopping-list.tsx`
- `lib/hub/meal-board-shopping-list.ts`
- `components/hub/circle-invite-card.tsx`
- `components/hub/use-hub-invite-link.ts`
- `lib/hub/invite-actions.ts`
- `lib/hub/invite-copy.ts`
- `lib/hub/invite-links.ts`
- `docs/changes/2026-04-24-residency-chef-suite.md`
- `docs/USER_MANUAL.md`
- `docs/app-complete-audit.md`
- `docs/product-blueprint.md`
- `project-map/chef-os/clients.md`
- `project-map/chef-os/network.md`
- `project-map/consumer-os/client-portal.md`

Expected screenshots, if present:

- `test-screenshots/residency-household-panel.png`
- `test-screenshots/residency-meal-board.png`

## What Has Already Been Built

Household Profiles:

- `ClientHouseholdPanel` is a chef-side client detail panel.
- It supports add, edit, and remove of household members.
- It captures name, relationship, age group, allergies, dietary restrictions, dislikes, favorites, and notes.
- It summarizes household member counts, household allergies with attribution, dietary badges, and member cards.
- It uses server actions from `lib/hub/household-actions.ts`.

Server actions:

- `getHouseholdForClient(clientId)` is chef-authenticated and tenant-scoped.
- `addClientHouseholdMember`, `updateClientHouseholdMember`, and `removeClientHouseholdMember` exist.
- Client profile resolution links `clients.id` to `hub_guest_profiles.client_id`, falls back by normalized email when needed, and can create a hub profile for chef-managed household entries.
- Mutations return `{ success, error? }` style results and revalidate the client detail route.

Meal board:

- `WeeklyMealBoard` accepts `groupToken` and calls `getCircleHouseholdSummary(groupId, groupToken)`.
- It shows a persistent Household Dietary Needs banner.
- It shows a hard error banner if household dietary data fails to load.
- It flags individual meals that conflict with household allergies.
- It passes `groupToken` through to `DietaryDashboard` and shopping-list generation.

Shopping list:

- `generateWeeklyShoppingList` requires `groupId`, `groupToken`, `startDate`, and `endDate`.
- It verifies the group token.
- It aggregates linked recipe ingredients where dish/component/recipe data exists.
- It includes unlinked planned dishes for manual shopping.
- It includes household and profile allergen warnings.

Bundling fix:

- `lib/hub/invite-copy.ts` should contain client-safe invite copy helpers and types only.
- `lib/hub/invite-links.ts` should keep token, crypto, and DB work server-side.
- Client components must import copy helpers from `invite-copy`, not `invite-links`.

## Critical Quality Rules

Follow `CLAUDE.md`, especially:

- Always test your own work with Playwright and screenshots.
- Do not kill live servers. If a server is dead, start another port.
- Never use em dashes.
- Never put `OpenClaw` in public/user-facing surfaces.
- All DB migrations must be additive and require approval before writing. For this task, no new migration should be needed unless inspection proves otherwise.
- Never run `drizzle-kit push`.
- Do not use silent empty states for failed data. Show errors.
- New server actions need auth, tenant scoping, validation, error propagation, mutation feedback, and cache invalidation.
- Update docs and project map when UI/workflow changes.
- Run `graphify update .` after code changes.

## Required Inspection

Before editing, verify the current code satisfies these points:

1. `WeeklyMealBoard` receives and passes `groupToken` everywhere needed.
2. `getMealBoard` calls on public hub page include `groupToken`.
3. `getCircleHouseholdSummary` verifies `groupToken` when provided and does not silently swallow DB errors.
4. Household dietary summary includes profile members and event-linked client profiles where relevant.
5. Client-side files do not import `lib/db`, `lib/db/server`, `postgres`, `fs`, `net`, `tls`, `perf_hooks`, or `lib/hub/invite-links` through value imports.
6. Household panel optimistic/mutation behavior rolls back or shows errors on failure.
7. Shopping-list server action validates input and verifies group token before reading meal data.
8. Temporary Playwright seed rows are cleaned after tests.

Use `rg` first, not slow recursive alternatives.

## Verification Scenario

Use the agent account from `.auth/agent.json`.

Known local test data, if still present:

- Chef/client auth:
  - Email: `agent@local.chefflow`
  - Password: `CHEF.jdgyuegf9924092.FLOW`
  - Chef/tenant id: `c0000000-0000-0000-0000-000000000099`
- Test client:
  - `8c40bca7-8b6b-4235-8c52-77489f313ffb`
- Test Dinner Circle:
  - Group id: `b1974000-330d-4ff3-a72b-7bfa3ddefcfa`
  - Group token: `f6008386-396b-4a29-960a-7ac2be3667d2`
  - Chef profile token: `c3c35924-0a00-4f2f-82e9-ee40ce27e1e6`
  - Chef profile id: `560bd2b6-6fbd-4eb9-a1f6-eba61c611203`
  - Guest profile id: `0292a7b0-ba39-41e5-ae55-8b095d73794c`
- Local DB URL:
  - `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

If any of these records are gone, query for equivalent local seed data instead of hardcoding a failure.

Playwright smoke requirements:

1. Start or use a dev server on an available port. Do not kill an existing live server.
2. Authenticate through `POST /api/e2e/auth`.
3. Visit `/clients/8c40bca7-8b6b-4235-8c52-77489f313ffb`.
4. Exercise the Household panel:
   - Add a temporary household member with `Tree Nuts` allergy and `Gluten-Free` dietary restriction.
   - Verify the member appears.
   - Verify Household Allergies appears with attribution.
   - Screenshot `test-screenshots/residency-household-panel.png`.
   - Edit the temporary member.
   - Remove the temporary member.
5. Seed a temporary `hub_household_members` row for the guest profile with `Tree Nuts` and `Gluten-Free`.
6. Seed a temporary current-week `hub_meal_board` row with `allergen_flags = ['Tree Nuts']`.
7. Visit `/hub/g/f6008386-396b-4a29-960a-7ac2be3667d2`.
8. Open the Meals tab.
9. Verify:
   - `Household Dietary Needs`
   - `Tree Nuts`
   - the seeded meal title
   - `Conflicts with household allergies`
   - `Generate Shopping List`
10. Generate the shopping list and verify:

- `Shopping List`
- `Watch for allergens: Tree Nuts`
- `Planned dishes (shop for these)`

11. Screenshot `test-screenshots/residency-meal-board.png`.
12. Clean all temporary DB rows in a `finally` block.
13. Query the DB after cleanup to prove temporary `Residency...` rows count is zero.

## Validation Commands

Run these, report exact results, and fix issues caused by this task:

```bash
npx eslint lib/hub/invite-copy.ts lib/hub/invite-links.ts lib/hub/household-actions.ts lib/hub/meal-board-shopping-list.ts components/clients/client-household-panel.tsx components/hub/weekly-meal-board.tsx components/hub/meal-board-shopping-list.tsx components/hub/circle-invite-card.tsx components/hub/use-hub-invite-link.ts components/hub/dietary-dashboard.tsx "app/(public)/hub/join/[groupToken]/join-form.tsx"
```

```bash
npx tsc --noEmit --skipLibCheck --pretty false
```

```bash
bash scripts/compliance-scan.sh
```

On Windows, if `bash` is unavailable, use:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' scripts/compliance-scan.sh
```

```bash
graphify update .
```

## Known Repo-Level Issues From Prior Session

Do not misattribute these to the residency suite unless your inspection proves your changes caused them:

- Full `npx tsc --noEmit --skipLibCheck` timed out after about 184 seconds in the prior session.
- Compliance scan passed em dash, public brand-surface, and `@ts-nocheck` scans, but failed existing server-action export violations in:
  - `lib/chef-decision-engine/actions.ts`
  - `lib/directory/actions.ts`
  - `lib/public-consumer/menu-actions.ts`
- A previous production build hit Node heap out-of-memory around 4 GB.
- The repo has many unrelated dirty and untracked files. Do not revert or reformat unrelated work.

## Definition of Done

You are done only when:

1. The feature works in real UI via Playwright.
2. Both screenshots exist and visibly show the feature states.
3. Temporary test rows are cleaned.
4. Touched TS/TSX files pass targeted ESLint.
5. Full typecheck and compliance are either passing or their failures are clearly proven unrelated with exact file/error details.
6. `docs/USER_MANUAL.md`, `docs/app-complete-audit.md`, `docs/product-blueprint.md`, and relevant `project-map/` files reflect the feature.
7. `docs/changes/2026-04-24-residency-chef-suite.md` exists and describes what changed.
8. `graphify update .` has been run after code changes.
9. Final response includes:
   - concise summary of built/verified behavior
   - screenshot paths
   - validation commands and results
   - known unrelated blockers
   - any server URL left running for review

## Important Final Instruction

Always refer back to `CLAUDE.md` when unsure. It is the authoritative project rule file for this task.
