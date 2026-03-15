# Server Action Feedback System

**Date:** 2026-03-15
**Status:** Complete (foundation + first wave of fixes)

## What Changed

ChefFlow has ~453 `startTransition` calls across the app. Before this work:

- ~44% (197 files) had no user-visible error feedback on failure
- Users would click a button, the server action would fail, and the UI would silently revert or do nothing
- This violates Zero Hallucination Law 1: "Never show success without confirmation"

## Architecture

```
lib/hooks/use-server-action.ts (NEW - standardized hook)
        |
        v
Two exported hooks:
  useServerAction()    - for actions that throw on error
  useCheckedAction()   - for actions returning { success, error }
        |
        v
Any component with startTransition + server action pattern
```

## useServerAction Hook

Wraps any server action with `useTransition` + `try/catch` + automatic toast feedback.

### Features

- `useTransition` for non-blocking UI
- Automatic `toast.error()` on failure (opt-out via `suppressErrorToast`)
- Optional `toast.success()` on success
- Optional optimistic update + rollback callbacks
- Optional success/error callbacks for custom logic

### Usage (simple)

```tsx
import { useServerAction } from '@/lib/hooks/use-server-action'

const { execute, isPending } = useServerAction(deleteEvent, {
  successMessage: 'Event deleted',
  errorMessage: 'Failed to delete event',
})

<Button onClick={() => execute(eventId)} loading={isPending}>Delete</Button>
```

### Usage (with optimistic update)

```tsx
const { execute, isPending } = useServerAction(toggleApproval, {
  onOptimistic: () => setApproved(!approved),
  onRollback: () => setApproved(approved),
  errorMessage: 'Failed to update approval',
})
```

### Usage (with result handling)

```tsx
const { execute, isPending } = useServerAction(createEvent, {
  onSuccess: (result) => router.push(`/events/${result.id}`),
  successMessage: 'Event created',
})
```

## useCheckedAction Hook

Same as `useServerAction` but for server actions that return `{ success: boolean, error?: string }` instead of throwing. Many ChefFlow server actions use this pattern.

```tsx
const { execute, isPending } = useCheckedAction(updateSettings, {
  successMessage: 'Settings saved',
})
// If result.success is false, toast.error(result.error) is shown automatically
```

## Options

| Option               | Type                           | Default                  | Description                                 |
| -------------------- | ------------------------------ | ------------------------ | ------------------------------------------- |
| `successMessage`     | `string \| (result) => string` | none                     | Toast shown on success (omit for no toast)  |
| `errorMessage`       | `string`                       | `'Something went wrong'` | Fallback error message                      |
| `onOptimistic`       | `() => void`                   | none                     | Called before action (for optimistic UI)    |
| `onRollback`         | `() => void`                   | none                     | Called on failure (to revert optimistic UI) |
| `onSuccess`          | `(result) => void`             | none                     | Called on success                           |
| `onError`            | `(error) => void`              | none                     | Called on failure                           |
| `suppressErrorToast` | `boolean`                      | `false`                  | Skip error toast (for inline error states)  |

## First Wave: Files Fixed

These files previously had silent failures (no user feedback on error):

| File                             | What was silent                                | Fix                                                    |
| -------------------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| `beta-onboarding-admin.tsx`      | Unenroll rollback, no feedback                 | Added `toast.error`                                    |
| `directory-toggle-row.tsx`       | Directory toggle rollback, no feedback         | Added `toast.error`                                    |
| `intake-forms-client.tsx`        | Create, delete, share all `console.error` only | Replaced with `toast.error`                            |
| `client-meal-requests-panel.tsx` | Inline `Alert` only (easy to miss)             | Added `toast.error` + `toast.success` alongside inline |

## When to Use the Hook vs Direct Toast

**Use `useServerAction`/`useCheckedAction` when:**

- Writing a new component from scratch
- The component has a simple action-per-button pattern
- You want the full standardized pattern (transition + toast + optimistic)

**Add `toast.error()` directly when:**

- Retrofitting an existing component that already has complex state
- The action has side effects (clipboard, redirect, reload) interleaved
- Multiple different actions share one `useTransition`

## Rollout Plan

The hook is available now. Future components should use it by default. Existing components can be migrated opportunistically during normal development, prioritizing:

1. Financial actions (payments, refunds, ledger writes)
2. Data mutation actions (create, update, delete)
3. Admin actions (tier grants, approvals)
4. Settings/preferences
