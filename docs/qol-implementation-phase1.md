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

### Form Protection Rollout (useProtectedForm + FormShield)

| File                                                   | What Changed                              |
| ------------------------------------------------------ | ----------------------------------------- |
| `components/prospecting/script-editor.tsx`             | Full protection added                     |
| `components/settings/cancellation-policy-editor.tsx`   | Full protection + baseline data tracking  |
| `app/(chef)/recipes/[id]/edit/edit-recipe-client.tsx`  | Full protection (25+ fields, ingredients) |
| `app/(chef)/recipes/new/create-recipe-client.tsx`      | Full protection (new record drafts)       |
| `app/(chef)/settings/my-profile/chef-profile-form.tsx` | Full protection (text fields only)        |
| `components/expenses/expense-form.tsx`                 | Full protection (financial data)          |
| `components/staff/staff-member-form.tsx`               | Full protection                           |
| `components/contracts/contract-template-editor.tsx`    | Full protection (long-form text, 10s)     |
| `components/menus/menu-doc-editor.tsx`                 | Full protection                           |

### Undo for Destructive Actions (useDeferredAction / showUndoToast)

| File                                                          | What Changed                    |
| ------------------------------------------------------------- | ------------------------------- |
| `components/expenses/expense-actions.tsx`                     | 8s deferred delete with undo    |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx`            | 8s deferred delete with undo    |
| `app/(chef)/culinary/vendors/vendor-directory-client.tsx`     | Optimistic removal + undo toast |
| `app/(chef)/marketing/templates/template-actions-client.tsx`  | 8s deferred delete with undo    |
| `app/(chef)/inventory/locations/locations-client.tsx`         | Optimistic removal + undo toast |
| `components/tasks/template-page-client.tsx`                   | 8s deferred delete with undo    |
| `components/social/social-post-card.tsx`                      | 8s deferred delete with undo    |
| `components/partners/partner-detail-client.tsx`               | 8s deferred delete with undo    |
| `components/events/travel-plan-client.tsx`                    | Optimistic removal + undo toast |
| `app/(chef)/clients/intake/intake-forms-client.tsx`           | Optimistic removal + undo toast |
| `app/(chef)/settings/automations/automations-list.tsx`        | 8s deferred delete with undo    |
| `components/messages/template-manager.tsx`                    | 8s deferred delete with undo    |
| `app/(chef)/settings/emergency/emergency-contacts-client.tsx` | Optimistic removal + undo toast |

### Error Boundaries (WidgetErrorBoundary)

| Page           | Sections Wrapped                          |
| -------------- | ----------------------------------------- |
| Dashboard      | 5 sections (hero, schedule, alerts, etc.) |
| Inquiries list | 1 section (inquiry list)                  |
| Events list    | 1 section (events list)                   |
| Recipes        | 1 section (dietary trends)                |
| Client detail  | 3 sections (duplicates, intel, events)    |

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

### Remaining form rollout (~25 forms)

- Client editor components (demographics, personal info, dietary)
- Remaining settings forms (notifications, billing, embed)
- Modal/dialog forms with significant input
- Public/embed forms (localStorage-based, no tenant scoping)

### Remaining undo rollout (~20 destructive actions)

- Client deletion
- Photo/media deletions (client gallery, dish photos, event media)
- Calendar event deletions
- Journey entry/idea/media deletions
- Certification deletions
- Prep schedule task deletions

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
