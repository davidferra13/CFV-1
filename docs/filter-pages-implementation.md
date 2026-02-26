# Filter Sub-Pages Implementation

## What Changed

Implemented 21 sidebar filter sub-pages across the Chef portal. All pages previously showed "This section is currently being built." Each is now a fully wired server component that fetches real data, applies a hardcoded filter, and renders the same visual layout as its parent pipeline page.

---

## Pages Implemented

### Events (5 pages)

| Route                      | Filter Logic                                                         | Data Source   |
| -------------------------- | -------------------------------------------------------------------- | ------------- |
| `/events/upcoming`         | status in `['proposed','accepted','paid','confirmed','in_progress']` | `getEvents()` |
| `/events/awaiting-deposit` | status = `'accepted'`                                                | `getEvents()` |
| `/events/confirmed`        | status in `['paid','confirmed']`                                     | `getEvents()` |
| `/events/completed`        | status = `'completed'`                                               | `getEvents()` |
| `/events/cancelled`        | status = `'cancelled'`                                               | `getEvents()` |

Sorting: upcoming/awaiting-deposit/confirmed sort ascending by event_date (nearest first). Completed/cancelled sort descending (most recent first).

### Quotes (6 pages)

| Route              | Filter Logic                                | Data Source             |
| ------------------ | ------------------------------------------- | ----------------------- |
| `/quotes/draft`    | status = `'draft'`                          | `getQuotes({ status })` |
| `/quotes/sent`     | status = `'sent'`                           | `getQuotes({ status })` |
| `/quotes/viewed`   | status = `'sent'` + `viewed_at IS NOT NULL` | `getQuotes({ status })` |
| `/quotes/accepted` | status = `'accepted'`                       | `getQuotes({ status })` |
| `/quotes/expired`  | status = `'expired'`                        | `getQuotes({ status })` |
| `/quotes/rejected` | status = `'rejected'`                       | `getQuotes({ status })` |

**Note on `/quotes/viewed`:** There is no `viewed` status in the quotes FSM. This page fetches sent quotes and filters by `viewed_at IS NOT NULL`. If the `viewed_at` field is not present or no quotes have been viewed, the empty state explains that view tracking will populate this list once active.

### Inquiries (5 pages)

| Route                              | DB Status Filter  | Data Source      |
| ---------------------------------- | ----------------- | ---------------- |
| `/inquiries/awaiting-response`     | `awaiting_chef`   | `getInquiries()` |
| `/inquiries/menu-drafting`         | `quoted`          | `getInquiries()` |
| `/inquiries/sent-to-client`        | `awaiting_client` | `getInquiries()` |
| `/inquiries/awaiting-client-reply` | `awaiting_client` | `getInquiries()` |
| `/inquiries/declined`              | `declined`        | `getInquiries()` |

**Note:** `sent-to-client` and `awaiting-client-reply` both map to the `awaiting_client` DB status — they describe the same state from different angles (what you did vs. what you're waiting for). Both show identical data with different contextual descriptions.

**Note:** `menu-drafting` maps to `quoted` — the stage where a quote has been sent and the chef is refining menu details for the client.

### Clients (3 pages)

| Route               | DB Status Filter     | Data Source             |
| ------------------- | -------------------- | ----------------------- |
| `/clients/active`   | `status = 'active'`  | `getClientsWithStats()` |
| `/clients/inactive` | `status = 'dormant'` | `getClientsWithStats()` |
| `/clients/vip`      | `status = 'vip'`     | `getClientsWithStats()` |

All three reuse the existing `ClientsTable` component (with search and sort). Filtering happens after fetch in the page server component.

### Partners (2 pages)

| Route                | Filter                                | Data Source |
| -------------------- | ------------------------------------- | ----------- |
| `/partners/active`   | `getPartners({ status: 'active' })`   | Server-side |
| `/partners/inactive` | `getPartners({ status: 'inactive' })` | Server-side |

Partners use the existing `getPartners()` action which already supports server-side status filtering.

---

## Architecture Pattern

Every filter page follows the same structure:

```
1. requireChef() — auth guard
2. fetch data from action
3. apply filter (either in action args or client-side array filter)
4. render:
   - ← All [Section] breadcrumb link
   - h1 title + count badge
   - subtitle description
   - data rows (same JSX as parent) OR contextual empty state
```

No parent pages were modified. No shared components were extracted. Each page is self-contained.

---

## Empty States

Every page has a contextual empty state with:

- A message explaining what belongs in this view
- A "View All [Section]" secondary button
- For pages where creation makes sense (e.g. draft quotes), a primary "New" button

---

## How to Extend

To add a new filter sub-page in the future:

1. Create the route file under the appropriate section
2. Import the same action as the parent page
3. Apply your filter logic after the fetch
4. Copy the rendering JSX from the parent (or nearest sibling filter page)
5. Update `components/navigation/nav-config.tsx` if adding a new nav item

---

## Known Notes

- **`/quotes/viewed`** is forward-compatible: if `viewed_at` is added to the quotes schema, this page automatically becomes functional. Currently shows an informative empty state.
- **Client status values** in use: `active`, `dormant` (mapped to "Inactive" in UI), `vip`. The `repeat_ready` status has no dedicated filter page yet.
- All pages are server components — no client-side JS overhead for the list rendering.
