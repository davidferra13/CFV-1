# Feature 7: Bulk Actions on Lists

## What Changed

Added bulk selection and bulk actions to three main list pages in the chef portal: Events, Clients, and Inquiries.

## Architecture

### Pre-Existing Component

- `components/ui/bulk-select-table.tsx` — Generic `BulkSelectTable<T>` component with select-all, per-row checkboxes, floating action bar, and confirmation modal. Already built before this feature.

### New Server Action Files (all use `requireChef()` + tenant scoping)

| File                            | Actions                                        | What They Do                                                                                            |
| ------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `lib/events/bulk-actions.ts`    | `bulkArchiveEvents`, `bulkDeleteDraftEvents`   | Archive sets `archived = true`. Delete drafts soft-deletes via `deleted_at` (only draft-status events). |
| `lib/clients/bulk-actions.ts`   | `bulkArchiveClients`                           | Soft-deletes via `deleted_at` + `deleted_by` (clients table has no `archived` column).                  |
| `lib/inquiries/bulk-actions.ts` | `bulkDeclineInquiries`, `bulkArchiveInquiries` | Decline sets `status = 'declined'`. Archive soft-deletes via `deleted_at`.                              |

### New Client Components

| File                                            | Used By                         | Purpose                                                                                        |
| ----------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `components/events/events-bulk-table.tsx`       | Events list page                | Wraps `BulkSelectTable` with event-specific columns and bulk actions (Archive, Delete Drafts). |
| `components/inquiries/inquiries-bulk-table.tsx` | Inquiries page (filtered views) | Wraps `BulkSelectTable` with inquiry-specific columns and bulk actions (Decline, Archive).     |

### Modified Files

| File                                   | Change                                                                                                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/(chef)/events/page.tsx`           | `EventsList` now serializes event data (including weather) and passes it to `EventsBulkTable` instead of rendering a plain `<Table>`. Removed unused imports (`EventStatusBadge`, `Table*`, `formatCurrency`, `format`). |
| `app/(chef)/clients/clients-table.tsx` | Replaced the inner `<Table>` with `<BulkSelectTable>`. Added `bulkArchiveClients` action. Search/sort controls remain above the table.                                                                                   |
| `app/(chef)/inquiries/page.tsx`        | Filtered views (non-"all") now render `InquiriesBulkTable` instead of card-based `InquiryRow` list. The priority-grouped "all" view is unchanged (cards with urgency grouping).                                          |

## Design Decisions

1. **Events and Clients use `BulkSelectTable` directly** because they render in table format.
2. **Inquiries "all" view keeps its card layout** with priority grouping (Needs Response, Follow-Up Due, Active, Closed) — bulk selection is only available on filtered views which use a table format.
3. **All server actions are safe by design**: they scope every query with `tenant_id` from the authenticated session, never from request input.
4. **Delete Drafts is restricted to draft-status events only** — the `.eq('status', 'draft')` filter is server-side, so even if a non-draft event ID is passed, it won't be deleted.
5. **All actions call `revalidatePath`** to bust the page cache after mutations.

## Available Bulk Actions Per Page

| Page      | Actions                                                   |
| --------- | --------------------------------------------------------- |
| Events    | Archive (secondary), Delete Drafts (danger + confirm)     |
| Clients   | Archive (danger + confirm)                                |
| Inquiries | Decline (secondary + confirm), Archive (danger + confirm) |
