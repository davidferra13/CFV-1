# Dinner Circle Menu Polling: Lifecycle Unification

## Recommendation

Build the **single highest-leverage remaining action** inside the Dinner Circle menu polling scope:

**Unify Dinner Circle final menu locking with ChefFlow's canonical menu lifecycle, instead of using a custom parallel status-transition path.**

This is the highest leverage remaining step because the polling flow is already present on both the chef and Dinner Circle surfaces, but finalization still bypasses the shared menu transition system. That is the one place where the implementation still behaves like a side path instead of a first-class system behavior.

## Why This Is The Right Next Move

### Evidence that core polling surfaces already exist

- Chef-side authoring is already wired from the event approval surface into the Dinner Circle poll composer:
  - [app/(chef)/events/[id]/menu-approval/page.tsx:121](</c:/Users/david/Documents/CFv1/app/(chef)/events/[id]/menu-approval/page.tsx:121>)
  - [app/(chef)/events/[id]/menu-approval/page.tsx:126](</c:/Users/david/Documents/CFv1/app/(chef)/events/[id]/menu-approval/page.tsx:126>)
- The composer already creates poll iterations from canonical dishes:
  - [components/events/dinner-circle-menu-poll-composer.tsx:9](/c:/Users/david/Documents/CFv1/components/events/dinner-circle-menu-poll-composer.tsx:9)
  - [components/events/dinner-circle-menu-poll-composer.tsx:63](/c:/Users/david/Documents/CFv1/components/events/dinner-circle-menu-poll-composer.tsx:63)
  - [components/events/dinner-circle-menu-poll-composer.tsx:79](/c:/Users/david/Documents/CFv1/components/events/dinner-circle-menu-poll-composer.tsx:79)
- The public Dinner Circle already renders the native menu board:
  - [app/(public)/hub/g/[groupToken]/hub-group-view.tsx:30](</c:/Users/david/Documents/CFv1/app/(public)/hub/g/[groupToken]/hub-group-view.tsx:30>)
  - [app/(public)/hub/g/[groupToken]/hub-group-view.tsx:43](</c:/Users/david/Documents/CFv1/app/(public)/hub/g/[groupToken]/hub-group-view.tsx:43>)
  - [app/(public)/hub/g/[groupToken]/hub-group-view.tsx:511](</c:/Users/david/Documents/CFv1/app/(public)/hub/g/[groupToken]/hub-group-view.tsx:511>)
  - [app/(public)/hub/g/[groupToken]/hub-group-view.tsx:522](</c:/Users/david/Documents/CFv1/app/(public)/hub/g/[groupToken]/hub-group-view.tsx:522>)

### Evidence that a parallel lifecycle still exists

- Dinner Circle currently defines its own menu state transition helper:
  - [lib/hub/menu-poll-actions.ts:171](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:171)
  - [lib/hub/menu-poll-actions.ts:263](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:263)
- Final menu locking calls that custom helper directly:
  - [lib/hub/menu-poll-actions.ts:1145](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:1145)
  - [lib/hub/menu-poll-actions.ts:1151](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:1151)
- ChefFlow's shared menu lifecycle still lives separately in `transitionMenu()`:
  - [lib/menus/actions.ts:809](/c:/Users/david/Documents/CFv1/lib/menus/actions.ts:809)
  - [lib/menus/actions.ts:994](/c:/Users/david/Documents/CFv1/lib/menus/actions.ts:994)
- That shared lifecycle still validates against legacy `menu_dishes` instead of real `dishes`:
  - [lib/menus/actions.ts:832](/c:/Users/david/Documents/CFv1/lib/menus/actions.ts:832)
  - [lib/menus/actions.ts:845](/c:/Users/david/Documents/CFv1/lib/menus/actions.ts:845)
- The shared lifecycle also owns side effects that the Dinner Circle custom path bypasses today:
  - transition logging: [lib/menus/actions.ts:873](/c:/Users/david/Documents/CFv1/lib/menus/actions.ts:873)
  - circle-first notifications: [lib/menus/actions.ts:903](/c:/Users/david/Documents/CFv1/lib/menus/actions.ts:903) and [lib/menus/actions.ts:943](/c:/Users/david/Documents/CFv1/lib/menus/actions.ts:943)
  - dish index bridge hook: [lib/menus/actions.ts:984](/c:/Users/david/Documents/CFv1/lib/menus/actions.ts:984)

### Evidence that current tests stop short of lifecycle coverage

- Current added tests only cover poll math and vote summarization:
  - [tests/unit/hub-menu-poll-core.test.ts:1](/c:/Users/david/Documents/CFv1/tests/unit/hub-menu-poll-core.test.ts:1)
  - [tests/unit/hub-menu-poll-core.test.ts:58](/c:/Users/david/Documents/CFv1/tests/unit/hub-menu-poll-core.test.ts:58)
  - [tests/unit/hub-menu-polling-core.test.ts:1](/c:/Users/david/Documents/CFv1/tests/unit/hub-menu-polling-core.test.ts:1)
  - [tests/unit/hub-menu-polling-core.test.ts:79](/c:/Users/david/Documents/CFv1/tests/unit/hub-menu-polling-core.test.ts:79)

## Scope

Stay strictly inside Dinner Circle menu polling and the menu lifecycle it depends on.

Do not redesign the polling model.
Do not add new product surfaces unless required for validation.
Do not break existing menu approval, menu editor, or public Dinner Circle behavior.

## Build Exactly This

### 1. Extract a shared menu transition primitive

Refactor the canonical menu transition flow so there is a lower-level helper that can be used by:

- the existing authenticated chef `transitionMenu()` path
- the Dinner Circle menu finalization path

Recommended shape:

- keep the public `transitionMenu(menuId, toStatus, reason?)` API intact
- add a lower-level helper in `lib/menus/actions.ts` or a nearby menu-lifecycle module, for example:
  - `transitionMenuWithContext({ db, menuId, tenantId, actorUserId, toStatus, reason, source })`

Requirements:

- no breaking changes to current callers
- chef path still uses `requireChef()`
- Dinner Circle path can call the shared helper with resolved tenant + actor context

### 2. Fix the shared transition precondition to use real menu dishes

Update the empty-menu guard in the shared transition flow so `shared` and `locked` validate against `dishes`, not `menu_dishes`.

This is required before Dinner Circle can safely reuse the canonical transition path, because Dinner Circle materializes real `dishes` rows into the event menu.

### 3. Replace the Dinner Circle custom status machine

In `lib/hub/menu-poll-actions.ts`:

- remove the direct use of `setMenuLockedState()`
- route Dinner Circle finalization through the shared menu transition helper
- preserve the existing polling-specific work:
  - canonical dish materialization into `dishes` and `components`
  - `menu_revisions` snapshot for final selections
  - event approval field updates
  - Dinner Circle `hub_messages` final lock message

The goal is:

- Dinner Circle remains responsible for choosing and materializing the final menu
- ChefFlow's shared menu lifecycle remains responsible for state transitions and lifecycle side effects

### 4. Decide and document side-effect behavior explicitly

For the shared helper call from Dinner Circle finalization, make an explicit decision about these side effects:

- activity logging
- circle-first notifications
- dish index bridge on lock

Recommended approach:

- keep shared transition logging and revalidation
- keep shared menu notifications if they do not duplicate the Dinner Circle lock message in a harmful way
- allow the dish-index bridge to run only if it is safe and idempotent for menus composed of `dish_index` references; otherwise add a scoped flag to skip it for Dinner Circle source menus

Whatever you choose, encode it in the helper contract so there is one clear lifecycle path.

### 5. Add lifecycle-focused regression coverage

Add tests that cover the new shared lifecycle behavior, not just poll aggregation.

At minimum cover:

- shared transition rejects empty menus by checking `dishes`
- Dinner Circle finalization uses the shared lifecycle path
- locking a Dinner Circle menu produces the expected menu status and state transitions
- no duplicate or contradictory state transitions are written during finalization

Use the smallest test shape that matches existing repo patterns. Prefer unit/integration coverage over UI tests for this step.

## Acceptance Criteria

- Dinner Circle final menu locking no longer uses a custom parallel status-transition helper.
- `transitionMenu()` continues to work for existing chef flows.
- The shared lifecycle validates against `dishes`, not `menu_dishes`.
- Dinner Circle finalization still materializes canonical winners into the real event menu.
- Menu status, state transitions, and downstream side effects come from one shared lifecycle path.
- All changes are additive and backward-compatible.

## Non-Goals

- Do not redesign poll data structures.
- Do not add freeform or temporary dishes.
- Do not rebuild the public board or composer UI.
- Do not remove existing notifications or approval behavior unless replacing them with the shared path.

## Suggested Files To Touch

- [lib/menus/actions.ts](/c:/Users/david/Documents/CFv1/lib/menus/actions.ts)
- [lib/hub/menu-poll-actions.ts](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts)
- lifecycle tests under [tests/unit](/c:/Users/david/Documents/CFv1/tests/unit) or existing integration test folders if needed

## Verification

Run the smallest useful verification set:

1. targeted tests for the new lifecycle helper and Dinner Circle finalization path
2. the existing poll-core tests to ensure no regression:
   - `node --test --import tsx tests/unit/hub-menu-poll-core.test.ts tests/unit/hub-menu-polling-core.test.ts`
3. a scoped TypeScript check on touched files

## Deliverable

One cohesive PR-sized change that makes Dinner Circle final menu locking use ChefFlow's canonical menu lifecycle instead of a parallel one.
