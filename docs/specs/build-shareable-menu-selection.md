# Build: Shareable Menu Selection Token

**Goal:** Let a chef generate a share link so a non-account third party can browse the event menu and submit picks, eliminating the relay problem for group coordinators.
**Label:** CLAUDE
**Estimated scope:** M (5-7 files)
**Depends on:** build-fix-tsc-errors (tsc must be green first)

## Context Files (read first)

- `lib/sharing/actions.ts` (event share token pattern: `crypto.randomBytes(32).toString('hex')`)
- `lib/proposals/client-proposal-actions.ts` (public proposal page pattern: `createAdminClient()`, rate limiting)
- `app/(public)/proposal/[token]/page.tsx` (public token-gated page, no auth)
- `lib/menus/preference-actions.ts` (`submitMenuPreferences`, `menu_preferences` table)
- `app/(client)/my-events/[id]/choose-menu/choose-menu-client.tsx` (authenticated menu selection UI)
- `lib/db/schema/schema.ts` (existing table patterns)

## Design

**Flow:**

1. Chef clicks "Share menu for selection" on event detail page
2. System generates a token, stores it in `menu_selection_tokens` table
3. Chef copies the link (`/menu-pick/[token]`) and sends it via text/email
4. Recipient opens link (no auth required), sees the event menu with dishes
5. Recipient taps/clicks to select items (apps, entrees, dessert)
6. Recipient submits selections with optional name and notes
7. Selections write to `menu_preferences` (or a linked table) with `token_id` reference
8. Chef sees "Menu picks received from [name]" notification on event detail

**Token table:** `menu_selection_tokens`

- `id` uuid PK default gen_random_uuid()
- `event_id` uuid FK events NOT NULL
- `tenant_id` uuid FK chefs NOT NULL
- `token` text NOT NULL UNIQUE default encode(gen_random_bytes(32), 'hex')
- `label` text (e.g. "Sarah - bride's sister")
- `is_active` boolean default true
- `expires_at` timestamptz (default 30 days)
- `created_at` timestamptz default now()

**Selections storage:** Extend `menu_preferences` with nullable `menu_token_id` FK. When a token-based selection is submitted, `client_id` is null but `menu_token_id` points to the token record. This keeps all menu preferences in one table for the chef to review.

## Files to Modify/Create

1. **New migration** `database/migrations/XXXXXX_menu_selection_tokens.sql`
   - Create `menu_selection_tokens` table
   - Add `menu_token_id` nullable FK column to `menu_preferences`
   - Add RLS policy matching `event_shares` pattern

2. **New actions** `lib/menus/menu-share-actions.ts`
   - `createMenuSelectionToken(eventId, label?)` - chef-authenticated, generates token
   - `getMenuByToken(token)` - public, rate-limited, returns menu dishes for the event
   - `submitTokenMenuSelections(token, selections)` - public, rate-limited, writes to `menu_preferences`

3. **New page** `app/(public)/menu-pick/[token]/page.tsx`
   - Server component, no auth
   - Calls `getMenuByToken(token)`
   - Renders menu dishes grouped by course with selection toggles
   - Submit button with name field and optional notes

4. **New client component** `app/(public)/menu-pick/[token]/menu-pick-client.tsx`
   - Interactive dish selection (checkboxes/toggles per course)
   - Name input, notes textarea
   - Submit action calls `submitTokenMenuSelections`
   - Success state: "Your picks have been sent to the chef!"

5. **Modify** `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx`
   - Add "Share menu for selection" button
   - Show received token-based selections with submitter label
   - Copy-to-clipboard for generated link

6. **Modify** `types/database.ts` (after migration, regenerate)

## Steps

1. Read all context files
2. Create migration (glob existing migrations for next timestamp)
3. Create `lib/menus/menu-share-actions.ts` with all three actions
4. Create the public page + client component at `app/(public)/menu-pick/[token]/`
5. Add the "Share menu" button and received-selections display to event detail overview tab
6. Run `npx tsc --noEmit --skipLibCheck`
7. Test: generate a token via the event detail page, open the link in incognito, select dishes, submit, verify they appear on the event detail

## Constraints

- Do NOT require authentication for the public page
- Do NOT modify existing `menu_preferences` rows or behavior; only add the new nullable column
- Do NOT change the authenticated choose-menu flow
- Rate limit the public page (match `proposal/[token]` pattern)
- Use `createAdminClient()` for public queries (bypass RLS, match existing pattern)
- No em dashes anywhere
- Follow `docs/specs/universal-interface-philosophy.md` for UI

## Verification

- [ ] `npx tsc --noEmit --skipLibCheck` passes
- [ ] `npx next build --no-lint` passes
- [ ] Manual: chef can generate a menu share link from event detail
- [ ] Manual: unauthenticated user can open link, see menu, select dishes, submit
- [ ] Manual: chef sees submitted selections on event detail

## Rollback

If verification fails and you cannot fix within 2 attempts: `git stash`, report what failed.
