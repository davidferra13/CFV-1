# T2.1: Kanban Pipeline View for Inquiries

## What changed

Added a kanban board view as an alternative to the existing list view on the Inquiry Pipeline page (`/inquiries`). The user can toggle between the two views using a "List / Kanban" button pair at the top of the content area. The selected view persists in `localStorage` under the key `inquiries-view-mode`.

## Files created

### `components/inquiries/kanban-card.tsx`

A `'use client'` component rendering a single inquiry card. Receives a flat `KanbanCardInquiry` shape (id, status, client_name, occasion, event_date, guest_count, created_at). Displays:

- Client name (bold, truncated)
- Occasion with a Tag icon
- Event date formatted as "Mar 15, 2026" with a Calendar icon
- Guest count with a Users icon
- A left border whose color maps to the inquiry's status

Clicking the card calls `router.push('/inquiries/[id]')`.

### `components/inquiries/kanban-board.tsx`

A `'use client'` component that renders the full board. Defines six columns in pipeline order:

| Column             | Statuses captured                    | Badge variant | Collapsed by default |
| ------------------ | ------------------------------------ | ------------- | -------------------- |
| New                | `new`                                | default       | no                   |
| Awaiting Chef      | `awaiting_chef`, `awaiting_response` | warning       | no                   |
| Awaiting Client    | `awaiting_client`                    | info          | no                   |
| Quoted             | `quoted`                             | info          | no                   |
| Confirmed          | `confirmed`                          | success       | no                   |
| Declined / Expired | `declined`, `expired`                | error         | yes                  |

Each column has a colored top border accent and a sticky header showing the column label and a count badge. The header is a button that toggles the column's collapsed state. The board itself is a horizontally scrollable flex container; each column has `min-width: 280px` / `max-width: 320px`.

### `components/inquiries/inquiries-view-wrapper.tsx`

A `'use client'` component that owns the toggle state. Receives:

- `children: React.ReactNode` — the existing list view (server component subtree) passed as a slot
- `inquiries: KanbanBoardInquiry[]` — pre-fetched inquiry data mapped for the kanban board

On mount it reads `localStorage` to restore the last-used view preference without causing a hydration mismatch (the SSR default is always `'list'`; `mounted` state gates the preference restoration).

## Files modified

### `app/(chef)/inquiries/page.tsx`

Two additions only — the existing `InquiryList` server component was not touched:

1. Import of `InquiriesViewWrapper`.
2. At the page level, `getInquiries()` is called once to build `kanbanInquiries` (a mapped array using the existing `getDisplayName()` helper). This data is passed as the `inquiries` prop to `InquiriesViewWrapper`.
3. The status tab bar and `<Suspense><InquiryList /></Suspense>` block are wrapped in `<div className="space-y-4">` and passed as `children` to `InquiriesViewWrapper`. They are entirely unchanged.

## Architecture notes

- No drag-and-drop. Cards navigate on click only. Transitions still go through `transitionInquiry()` on the inquiry detail page.
- The kanban board always shows all inquiries regardless of the active status tab filter — it is a global pipeline view.
- `getInquiries()` is called twice on the page when in list mode (once at the page level for kanban data, once inside `InquiryList`). This is acceptable because `InquiryList` is a server component rendered in a `Suspense` boundary, and Next.js deduplicates `fetch`-based server actions within a render pass. If the double call becomes a concern it can be refactored to hoist data fetching fully to the page level, but that would require converting `InquiryList` to accept props.
- The `'Declined / Expired'` column collapses by default to keep terminal-state noise out of the active pipeline view at a glance.

## How to verify

1. Visit `/inquiries`.
2. Two buttons "List" and "Kanban" appear below the page header.
3. "List" is active by default and shows the existing tab bar + list.
4. Clicking "Kanban" replaces the list with six columns. Each card links to the inquiry detail page.
5. Switching view and reloading the page restores the last-used preference.
6. The "Declined / Expired" column is collapsed by default; clicking its header expands it.
