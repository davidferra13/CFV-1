# QoL Phase 1 Implementation - Draft Persistence & Error Resilience

> **Date:** 2026-03-15
> **Branch:** feature/openclaw-adoption
> **Scope:** Infrastructure + critical-risk form rollout + dashboard hardening

## What Was Built

### New Infrastructure (3 files created)

**1. `lib/qol/use-protected-form.ts` - Composite Form Protection Hook**

Combines `useDurableDraft` + `useUnsavedChangesGuard` + `visibilitychange` + throttled backup into a single hook call. Reduces per-form boilerplate from ~30 lines to ~5.

Features:

- IndexedDB draft persistence (700ms debounce default)
- Navigation guard (beforeunload + popstate + link intercept)
- `visibilitychange` auto-save (more reliable than beforeunload on mobile, per MDN)
- Optional throttled periodic backup (for long-form text editors)
- Dirty detection with committed data tracking
- `markCommitted()` for post-save cleanup

**2. `components/forms/form-shield.tsx` - Declarative Form UI Wrapper**

Renders `UnsavedChangesDialog`, `DraftRestorePrompt`, and `SaveStateBadge` automatically for any form using `useProtectedForm`. Zero-config UI layer.

**3. `components/ui/widget-error-boundary.tsx` - Granular Error Boundary**

Lightweight error boundary for individual widgets/panels. Two modes:

- `compact`: single-line inline error with retry link
- Standard: centered card with icon, description, and retry button

Unlike the full-page ErrorBoundary, this keeps the rest of the page functional when one widget crashes.

### Direct Rollout (main branch, done by lead)

| File                                                      | What Changed                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------- |
| `app/(chef)/dashboard/page.tsx`                           | All 5 dashboard sections wrapped in `WidgetErrorBoundary`     |
| `components/expenses/expense-actions.tsx`                 | Delete converted to `useDeferredAction` (8s undo window)      |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx`        | Delete converted to `useDeferredAction` (8s undo window)      |
| `app/(chef)/culinary/vendors/vendor-directory-client.tsx` | Delete converted to optimistic removal + `showUndoToast` (8s) |
| `components/prospecting/script-editor.tsx`                | Full `useProtectedForm` + `FormShield` added                  |

### Parallel Agent Rollout (worktrees, pending merge)

5 agents deployed to protect critical-risk forms:

1. Recipe create/edit forms (~25 fields each)
2. Email composer + template editor + business hours editor
3. Chef profile form + profile settings + expense form + vendor form
4. Finance forms (7 files) + contract template editor + menu doc editor
5. Staff/compliance forms (7 files) + culinary profile questionnaire

## Existing Infrastructure (already in codebase, unchanged)

| Component                | Location                                      | Status                                   |
| ------------------------ | --------------------------------------------- | ---------------------------------------- |
| `useDurableDraft`        | `lib/drafts/use-durable-draft.ts`             | Unchanged (used by composite hook)       |
| `useUnsavedChangesGuard` | `lib/navigation/use-unsaved-changes-guard.ts` | Unchanged (used by composite hook)       |
| `useIdempotentMutation`  | `lib/offline/use-idempotent-mutation.ts`      | Unchanged                                |
| `useDeferredAction`      | `hooks/use-deferred-action.ts`                | Unchanged (existing undo infrastructure) |
| `showUndoToast`          | `components/ui/undo-toast.tsx`                | Unchanged                                |
| Offline queue            | `lib/offline/idb-queue.ts`                    | Unchanged                                |
| Save state model         | `lib/save-state/model.ts`                     | Unchanged                                |
| QoL metrics              | `lib/qol/metrics-client.ts`                   | Unchanged                                |

## What's Next (Phase 2+)

### Remaining form rollout (high-risk, ~33 forms)

- All client editor components (demographics, personal info, dietary)
- All settings forms with multi-field input (~20 forms)
- All modal/dialog forms with significant input
- Public/embed forms (localStorage-based, no tenant scoping)

### Remaining undo rollout (~50 destructive actions)

- Client deletion
- Photo/media deletions (client, event, recipe)
- Kitchen rental, campaign template, automation rule deletions
- Calendar event deletions

### Session recovery

- Store `lastActivePath` on route change
- Resume flow after re-authentication

### Data export expansion

- CSV export for all list views
- JSON full-account export
- PDF export for analytics/reports

## How to Add Protection to a New Form

```tsx
import { useProtectedForm } from '@/lib/qol/use-protected-form'
import { FormShield } from '@/components/forms/form-shield'

function MyForm({ tenantId, existingRecord }) {
  const [field1, setField1] = useState(existingRecord?.field1 ?? '')
  const [field2, setField2] = useState(existingRecord?.field2 ?? '')

  const defaultData = useMemo(
    () => ({
      field1: existingRecord?.field1 ?? '',
      field2: existingRecord?.field2 ?? '',
    }),
    [existingRecord]
  )

  const currentData = useMemo(
    () => ({
      field1,
      field2,
    }),
    [field1, field2]
  )

  const protection = useProtectedForm({
    surfaceId: 'my-form',
    recordId: existingRecord?.id,
    tenantId,
    schemaVersion: 1,
    defaultData,
    currentData,
    // throttleMs: 10000,  // enable for long-form text
  })

  function applyFormData(data: typeof defaultData) {
    setField1(data.field1)
    setField2(data.field2)
  }

  async function handleSubmit() {
    await saveAction(currentData)
    protection.markCommitted()
  }

  return (
    <FormShield
      guard={protection.guard}
      showRestorePrompt={protection.showRestorePrompt}
      lastSavedAt={protection.lastSavedAt}
      onRestore={() => {
        const d = protection.restoreDraft()
        if (d) applyFormData(d)
      }}
      onDiscard={protection.discardDraft}
      saveState={protection.saveState}
    >
      {/* form JSX */}
    </FormShield>
  )
}
```

## How to Add Undo to a Destructive Action

```tsx
import { useDeferredAction } from '@/hooks/use-deferred-action'

const { execute } = useDeferredAction({
  delay: 8000,
  toastMessage: 'Item deleted',
  onExecute: async () => await deleteItem(id),
  onUndo: () => restoreItemInUI(),
  onError: (err) => toast.error('Failed to delete'),
})

// Call execute() instead of the direct delete
<Button onClick={execute}>Delete</Button>
```
