# Confirmation Dialog System

**Date:** 2026-03-15
**Status:** Complete (hook + first wave of 5 dangerous actions)

## What Changed

ChefFlow has 15+ destructive actions that execute on a single click with no confirmation. Before this work:

- API keys could be revoked instantly, breaking integrations
- Webhook endpoints could be deleted, silently stopping external system notifications
- Share links could be revoked, breaking public availability views
- Shift notes could be deleted, losing critical handoff information
- Class registrations could be cancelled without warning

A `ConfirmModal` component existed but required 3+ lines of boilerplate (useState, handler, JSX) each time. Result: developers skipped it.

## Architecture

```
components/ui/confirm-modal.tsx  (EXISTS - the modal UI)
        |
        v
lib/hooks/use-confirm.ts        (NEW - declarative Promise-based hook)
        |
        v
const { confirm, ConfirmDialog } = useConfirm()
// confirm() returns a Promise<boolean>
// <ConfirmDialog /> renders once, handles all state internally
```

## useConfirm Hook

Zero-boilerplate confirmation dialogs. Returns a `confirm()` function that opens the modal and returns a Promise that resolves to `true` (confirmed) or `false` (cancelled).

### Usage

```tsx
import { useConfirm } from '@/lib/hooks/use-confirm'

function MyComponent() {
  const { confirm, ConfirmDialog } = useConfirm()

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Delete this item?',
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    await deleteItem(id)
  }

  return (
    <>
      <ConfirmDialog />
      <Button onClick={() => handleDelete(item.id)}>Delete</Button>
    </>
  )
}
```

### confirm() Options

| Option         | Type                    | Default           | Description                  |
| -------------- | ----------------------- | ----------------- | ---------------------------- |
| `title`        | `string`                | `'Are you sure?'` | Modal heading                |
| `description`  | `string`                | none              | Explanatory text below title |
| `confirmLabel` | `string`                | `'Confirm'`       | Confirm button text          |
| `cancelLabel`  | `string`                | `'Cancel'`        | Cancel button text           |
| `variant`      | `'primary' \| 'danger'` | `'primary'`       | Button color (danger = red)  |

### Key Design Decisions

- **Promise-based**: `await confirm()` reads naturally in async handlers
- **Single render**: `<ConfirmDialog />` renders once at component level
- **No prop drilling**: Hook manages all state internally
- **Escape key + backdrop click**: Built into ConfirmModal (already existed)
- **Focus management**: Confirm button auto-focused on open (already existed)

## Actions Fixed (First Wave)

| Component                         | Action                  | Risk                                        | Fix                         |
| --------------------------------- | ----------------------- | ------------------------------------------- | --------------------------- |
| `api-key-manager.tsx`             | Revoke API key          | Breaks integrations instantly               | useConfirm + danger modal   |
| `webhook-manager.tsx`             | Delete webhook endpoint | External systems stop receiving events      | useConfirm + danger modal   |
| `availability-share-settings.tsx` | Revoke share link       | Public availability link dies               | useConfirm + danger modal   |
| `shift-notes-section.tsx`         | Delete shift note       | Loses handoff info + was console.error only | useConfirm + toast.error    |
| `class-registrations.tsx`         | Cancel registration     | Removes attendee from class                 | useConfirm + toast feedback |

## Remaining Unconfirmed Destructive Actions

Prioritized for future waves:

1. **Menu/dish deletion** (`MenuEditor.tsx`) - affects pricing/service
2. **Email sequence deletion** (`sequence-list.tsx`) - deletes automation
3. **Insurance policy deletion** (`insurance-policy-list.tsx`) - compliance records
4. **Kitchen inventory deletion** (`kitchen-inventory-panel.tsx`) - equipment records
5. **Client connection removal** (`client-connections.tsx`) - relationship data
6. **Journey/entry deletion** (multiple files) - currently using `window.confirm()`

## window.confirm() Migration

Several files use native `window.confirm()` (functional but ugly). These should be migrated to `useConfirm` opportunistically:

- `journey-hub.tsx`, `journey-entry-panel.tsx`, `journey-idea-panel.tsx`
- `journey-media-panel.tsx`, `journey-recipe-links-panel.tsx`
- `charity-hours-list.tsx`
- `staff-pin-manager.tsx`
- `intake-forms-client.tsx` (handleDelete)

## Files Created

- `lib/hooks/use-confirm.ts` - useConfirm hook

## Files Modified

- `components/settings/api-key-manager.tsx` - useConfirm for key revocation
- `components/settings/webhook-manager.tsx` - useConfirm for endpoint deletion
- `components/calendar/availability-share-settings.tsx` - useConfirm for token revocation
- `components/briefing/shift-notes-section.tsx` - useConfirm for note deletion + toast.error
- `components/classes/class-registrations.tsx` - useConfirm for registration cancellation + toast
