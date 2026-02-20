# T1.5 & T1.6 — Bulk Actions + Smart Empty States

**Date:** 2026-02-20
**Scope:** New UI primitives; minimal edits to two existing pages.

---

## What Changed

### New file: `components/ui/empty-state.tsx`

A reusable, centered empty-content component used on any list page when there are zero items to display. It is a pure presentational component with no server-side dependencies — safe to use in both server and client components.

**Props:**

| Prop | Type | Purpose |
|---|---|---|
| `icon` | `React.ReactNode` | Optional lucide-react icon (rendered at 48 px via CSS) |
| `title` | `string` | Bold headline (stone-900) |
| `description` | `string` | Subdued explanation (stone-500, max-w-sm) |
| `action` | `{ label, href?, onClick? }` | Primary CTA rendered as a `primary` Button |
| `secondaryAction` | `{ label, href? }` | Secondary CTA rendered as a `secondary` Button |

The component does not import `Link` from Next.js — it delegates to the existing `Button` component which already handles `href` by rendering an `<a>` tag. This keeps the component dependency-light.

### New file: `components/ui/bulk-select-table.tsx`

A generic `'use client'` wrapper that adds checkbox-based multi-row selection and a floating bulk-action bar to any data table.

**Key design decisions:**

- Generic over `T extends { id: string }` so it works with any data shape.
- Callers provide `renderHeader()` and `renderRow()` as render-prop callbacks — the component only owns the checkbox column, not the rest of the table structure. This means existing row formatting and link logic stay entirely in the calling page.
- The `indeterminate` state on the select-all checkbox is set imperatively via a `ref` callback (the only correct way to set `indeterminate` in React).
- The floating action bar appears at `bottom-6` fixed-position, centered horizontally with `left-1/2 -translate-x-1/2`, so it floats over content without obscuring the browser chrome.
- After any bulk action completes (resolved or rejected), selection is cleared and the bar hides. If `confirmMessage` is set, a native `window.confirm` dialog appears first.
- A `running` boolean disables all buttons during async execution to prevent double-submission.

### Modified: `app/(chef)/inquiries/page.tsx`

Replaced the inline `<Card className="p-8 text-center">…</Card>` empty state block (two variants: "all" and filtered) with `<EmptyState>` components wrapped in `<Card>`.

- "All" variant: title "No inquiries yet", description with context about the inquiry pipeline, primary action linking to `/inquiries/new`.
- Filtered variant: title showing the humanized status, description noting the filter is active, secondary action linking back to `/inquiries` (all).

No logic was changed. The `InquiryList` async component, filtering, score lookup, and row rendering are identical.

### Modified: `app/(chef)/events/page.tsx`

Same pattern applied to the events list empty state.

- "All" variant: title "No events yet", description mentioning proposals/timelines/financials, primary action linking to `/events/new`.
- Filtered variant: title showing the humanized status, secondary action linking back to `/events`.

No logic was changed.

---

## How It Connects to the System

- `EmptyState` follows the same `forwardRef` + Tailwind class composition pattern as `Button` and `Card`. It uses only the established `primary` / `secondary` Button variants.
- `BulkSelectTable` is intentionally decoupled from any specific data model or server action. Bulk actions are passed as plain callbacks, meaning each calling page owns its own server action wiring (consistent with the `'use server'` pattern).
- Neither component touches the database, the FSM, or any ledger logic.

---

## Usage Example — BulkSelectTable

```tsx
'use client'
import { BulkSelectTable } from '@/components/ui/bulk-select-table'

<BulkSelectTable
  items={inquiries}
  renderHeader={() => (
    <>
      <th className="px-4 py-3 text-left">Client</th>
      <th className="px-4 py-3 text-left">Status</th>
    </>
  )}
  renderRow={(inquiry, selected) => (
    <>
      <td className="px-4 py-3">{inquiry.client?.full_name}</td>
      <td className="px-4 py-3"><InquiryStatusBadge status={inquiry.status} /></td>
    </>
  )}
  bulkActions={[
    {
      label: 'Mark as Closed',
      variant: 'danger',
      confirmMessage: 'Close all selected inquiries?',
      onClick: async (ids) => { await bulkCloseInquiries(ids) },
    },
  ]}
  emptyState={<EmptyState title="No inquiries" description="…" />}
/>
```
