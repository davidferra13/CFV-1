# Codex Build Spec: Auto-Log Menu History on Event Completion

> **Scope:** Wire `autoLogMenuFromEvent` into the event completion lifecycle.
> **Risk:** LOW. One try/catch block added to an existing pattern. Non-blocking side effect.
> **Files to modify:** exactly 1 file. Do NOT create new files.

---

## Problem

The `autoLogMenuFromEvent()` function in `lib/menus/menu-history-actions.ts` exists and works, but it is never called automatically. When an event transitions to "completed", the menu served is not recorded in `menu_service_history`. This means the menu continuity system (repeat detection, "never served" queries, menu history timeline) relies on manual logging by the chef, which rarely happens.

## Goal

Add a non-blocking call to `autoLogMenuFromEvent(eventId)` when an event transitions from `in_progress` to `completed`. This follows the exact same pattern as the 8+ other non-blocking side effects already in the same code block.

---

## File: `lib/events/transitions.ts`

### Where to add

Inside the `if (toStatus === 'completed' && fromStatus === 'in_progress')` block that starts around line 1278. Specifically, add it AFTER the inventory auto-deduction block (which ends around line 1308) and BEFORE the `runCompletedEventPostProcessing` call (around line 1310).

### Exact code to add

Insert this block between the inventory deduction try/catch and the `runCompletedEventPostProcessing` call:

```typescript
// Auto-log menu history for continuity tracking (non-blocking)
// Records what was served to this client so repeat detection and menu progression work.
try {
  const { autoLogMenuFromEvent } = await import('@/lib/menus/menu-history-actions')
  await autoLogMenuFromEvent(eventId)
} catch (menuLogErr) {
  log.events.warn('Menu history auto-log failed (non-blocking)', { error: menuLogErr })
}
```

### Context: what the surrounding code looks like BEFORE your change

```typescript
    // (existing) Auto-deduct inventory block ends here:
    } catch (deductErr) {
      log.events.warn('Inventory auto-deduction failed (non-blocking)', { error: deductErr })
    }

    // >>> YOUR NEW BLOCK GOES HERE <<<

    await runCompletedEventPostProcessing(eventId, event.tenant_id)
```

### Context: what the surrounding code looks like AFTER your change

```typescript
    // (existing) Auto-deduct inventory block ends here:
    } catch (deductErr) {
      log.events.warn('Inventory auto-deduction failed (non-blocking)', { error: deductErr })
    }

    // Auto-log menu history for continuity tracking (non-blocking)
    // Records what was served to this client so repeat detection and menu progression work.
    try {
      const { autoLogMenuFromEvent } = await import('@/lib/menus/menu-history-actions')
      await autoLogMenuFromEvent(eventId)
    } catch (menuLogErr) {
      log.events.warn('Menu history auto-log failed (non-blocking)', { error: menuLogErr })
    }

    await runCompletedEventPostProcessing(eventId, event.tenant_id)
```

---

## Why this works

1. `autoLogMenuFromEvent` uses `requireChef()` internally. The `in_progress -> completed` transition is chef-initiated (the chef clicks "Mark Complete"), so the chef session is active in the request context. `requireChef()` will resolve correctly.

2. The function has built-in idempotency: it checks `menu_service_history` for existing entries with the same `event_id` before inserting (lines 134-143 of `menu-history-actions.ts`). Calling it twice is safe.

3. The function has built-in graceful handling: if the event has no `menu_id`, it inserts an entry with an empty `dishes_served` array. No crash.

4. If it fails for any reason (system transition, missing data, DB error), the catch block logs a warning and the event completion proceeds normally. Non-blocking.

---

## Verification

After making the change:

1. `npx tsc --noEmit --skipLibCheck` must pass
2. The change is 6 lines of code inside an existing try/catch pattern
3. Verify the import path is correct: `@/lib/menus/menu-history-actions` exports `autoLogMenuFromEvent`

---

## DO NOT (critical guardrails)

- Do NOT create any new files
- Do NOT modify any other files
- Do NOT modify any existing code in transitions.ts (only ADD the new block)
- Do NOT change the order of existing side effects
- Do NOT make the call blocking (it MUST be inside try/catch)
- Do NOT add em dashes anywhere
- Do NOT import at the top of the file (use dynamic import inside the block, matching the existing pattern)
- Do NOT modify `autoLogMenuFromEvent` itself
- Do NOT add any other side effects besides this one
