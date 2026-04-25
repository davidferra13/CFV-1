# Dinner Circle Poll Iteration: Draft Lifecycle Unification

## Recommendation

Build the **single highest-leverage remaining action** inside the Dinner Circle menu polling lifecycle scope:

**Route Dinner Circle poll-iteration menu reopening through the shared menu lifecycle helper instead of directly updating menu status and writing transition rows inside `ensureEventMenuDraft()`.**

This is the right next action because final menu locking now uses the canonical lifecycle path, but the poll-iteration setup path still has its own status-write branch for turning locked or archived menus back into drafts.

## Evidence

### Final locking is now on the shared lifecycle path

- Dinner Circle finalization calls `transitionMenuWithContext()` for the draft-to-shared transition:
  - [lib/hub/menu-poll-actions.ts:1053](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:1053)
  - [lib/hub/menu-poll-actions.ts:1060](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:1060)
- Dinner Circle finalization calls `transitionMenuWithContext()` for the shared-to-locked transition:
  - [lib/hub/menu-poll-actions.ts:1067](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:1067)
  - [lib/hub/menu-poll-actions.ts:1074](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:1074)
- The authenticated chef action also delegates to the shared lifecycle helper:
  - [lib/menus/actions.ts:802](/c:/Users/david/Documents/CFv1/lib/menus/actions.ts:802)
  - [lib/menus/actions.ts:806](/c:/Users/david/Documents/CFv1/lib/menus/actions.ts:806)

### The shared lifecycle helper exists and owns core transition behavior

- Shared helper:
  - [lib/menus/menu-lifecycle.ts:48](/c:/Users/david/Documents/CFv1/lib/menus/menu-lifecycle.ts:48)
- Shared transition validation:
  - [lib/menus/menu-lifecycle.ts:64](/c:/Users/david/Documents/CFv1/lib/menus/menu-lifecycle.ts:64)
  - [lib/menus/menu-lifecycle.ts:67](/c:/Users/david/Documents/CFv1/lib/menus/menu-lifecycle.ts:67)
- Shared empty-menu guard now checks real `dishes`:
  - [lib/menus/menu-lifecycle.ts:71](/c:/Users/david/Documents/CFv1/lib/menus/menu-lifecycle.ts:71)
  - [lib/menus/menu-lifecycle.ts:72](/c:/Users/david/Documents/CFv1/lib/menus/menu-lifecycle.ts:72)
- Shared transition row writing:
  - [lib/menus/menu-lifecycle.ts:113](/c:/Users/david/Documents/CFv1/lib/menus/menu-lifecycle.ts:113)
  - [lib/menus/menu-lifecycle.ts:120](/c:/Users/david/Documents/CFv1/lib/menus/menu-lifecycle.ts:120)

### Remaining parallel lifecycle behavior is in poll-iteration setup

- `ensureEventMenuDraft()` still directly updates locked or archived menus to draft:
  - [lib/hub/menu-poll-actions.ts:133](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:133)
  - [lib/hub/menu-poll-actions.ts:137](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:137)
  - [lib/hub/menu-poll-actions.ts:138](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:138)
  - [lib/hub/menu-poll-actions.ts:139](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:139)
- The same branch manually writes a `menu_state_transitions` row:
  - [lib/hub/menu-poll-actions.ts:146](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:146)
  - [lib/hub/menu-poll-actions.ts:149](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:149)
  - [lib/hub/menu-poll-actions.ts:150](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:150)
  - [lib/hub/menu-poll-actions.ts:152](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:152)
- Poll publishing still depends on `ensureEventMenuDraft()`:
  - [lib/hub/menu-poll-actions.ts:655](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:655)
  - [lib/hub/menu-poll-actions.ts:689](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:689)
- Final locking also calls `ensureEventMenuDraft()` before materializing selections:
  - [lib/hub/menu-poll-actions.ts:896](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:896)
  - [lib/hub/menu-poll-actions.ts:981](/c:/Users/david/Documents/CFv1/lib/hub/menu-poll-actions.ts:981)

## Scope

Stay strictly inside Dinner Circle menu polling and the menu lifecycle helper it depends on.

Do not redesign polling data structures.
Do not change the public Dinner Circle board.
Do not change chef-authenticated menu transition behavior.
Do not change canonical dish materialization.
Do not remove existing event approval or hub message behavior.

## Build Exactly This

### 1. Add a constrained shared lifecycle reopen primitive

In `lib/menus/menu-lifecycle.ts`, add a small helper for reopening an existing menu to draft with resolved tenant and actor context.

Recommended shape:

```ts
export async function reopenMenuDraftWithContext({
  db,
  menuId,
  tenantId,
  actorUserId,
  reason,
  source,
  sideEffects,
}: {
  db: any
  menuId: string
  tenantId: string
  actorUserId: string | null
  reason: string
  source: 'dinner_circle_menu_polling'
  sideEffects?: MenuTransitionSideEffects
})
```

Requirements:

- Only support existing `locked -> draft` and `archived -> draft` reopen cases.
- Do not broaden the public chef `transitionMenu()` API.
- Do not add `locked -> draft` to the normal public transition matrix unless the existing `unlockMenu()` path is also intentionally migrated in this same PR.
- Clear `locked_at` when reopening a locked menu.
- Clear `archived_at` when reopening an archived menu.
- Write the same `menu_state_transitions` shape as `transitionMenuWithContext()`, including `metadata.source`.
- Keep revalidation and activity logging behavior centralized.
- Disable circle notifications and dish-index bridge by default for this Dinner Circle reopen path.

### 2. Replace direct Dinner Circle draft status writes

In `lib/hub/menu-poll-actions.ts`, update `ensureEventMenuDraft()` so the locked/archived branch calls the shared reopen primitive.

Preserve the rest of `ensureEventMenuDraft()`:

- existing menu lookup by `event.menu_id`
- fallback lookup by `event_id`
- initial menu creation when no menu exists
- initial `draft` transition row for newly created Dinner Circle event menus
- event `menu_id` attachment

The only behavior to remove from this function is the direct locked/archived status update and the direct transition insert for the reopen branch.

### 3. Keep finalization behavior unchanged

Do not change the final selection materialization or final lock sequence.

This must remain intact:

- materialize winning canonical dishes into real `dishes` and `components`
- write final `menu_revisions` snapshot
- update event approval fields
- call `transitionMenuWithContext()` to move draft/shared menus into `locked`
- write the Dinner Circle `hub_messages` final lock message

### 4. Make side-effect behavior explicit

For Dinner Circle poll-iteration reopen:

- keep transition row logging
- keep path revalidation
- keep activity logging when `actorUserId` is available
- skip circle notifications because reopening a menu for another poll iteration is an internal authoring action
- skip dish-index bridge because no menu is being locked

Encode this through the helper contract or through the call-site options, not as scattered comments.

### 5. Add regression coverage

Add or extend tests under `tests/unit`.

At minimum cover:

- reopening a locked Dinner Circle menu to draft writes exactly one canonical transition row with `from_status: 'locked'`, `to_status: 'draft'`, and `metadata.source: 'dinner_circle_menu_polling'`
- reopening an archived Dinner Circle menu to draft writes exactly one canonical transition row with `from_status: 'archived'`, `to_status: 'draft'`, and `metadata.source: 'dinner_circle_menu_polling'`
- `ensureEventMenuDraft()` no longer directly updates `menus.status = 'draft'` for locked/archived menus
- Dinner Circle finalization still uses `transitionMenuWithContext()` for final locking

Prefer unit tests against the lifecycle helper plus a small static guard for `lib/hub/menu-poll-actions.ts` if mocking the full server action is too heavy.

## Acceptance Criteria

- Dinner Circle poll-iteration reopening no longer directly updates menu lifecycle state.
- Locked or archived Dinner Circle event menus are reopened through a shared lifecycle helper.
- Final Dinner Circle menu locking remains on `transitionMenuWithContext()`.
- Chef `transitionMenu()` remains backward-compatible.
- Menu transition rows for reopen operations use one canonical shape and include source metadata.
- Existing Dinner Circle poll creation and finalization behavior still works.
- Targeted lifecycle and poll-core tests pass.
- App TypeScript check passes.

## Verification

Run:

```bash
node --test --import tsx tests/unit/menu-lifecycle-dinner-circle.test.ts tests/unit/hub-menu-poll-core.test.ts tests/unit/hub-menu-polling-core.test.ts
npm run typecheck:app
```

## Deliverable

One PR-sized additive change that finishes lifecycle unification for Dinner Circle menu polling by moving the remaining poll-iteration draft/reopen path onto the shared menu lifecycle helper.
