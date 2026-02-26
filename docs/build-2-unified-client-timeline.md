# Build 2: Unified Client Communication Timeline

## What Was Built

A chronological activity feed on every client detail page that aggregates events, inquiries, messages, payments, and reviews into a single vertical timeline. This gives the chef a complete at-a-glance history of every touchpoint with a client without needing to navigate between separate sections.

## Files Created / Modified

| File                                             | Role                                                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `lib/clients/unified-timeline.ts`                | Server action `getUnifiedClientTimeline(clientId)` — queries five sources and merges into sorted `UnifiedTimelineItem[]` |
| `lib/clients/unified-timeline-utils.ts`          | `SOURCE_CONFIG` map defining color, icon, and label for each item type                                                   |
| `components/clients/unified-client-timeline.tsx` | `'use client'` component — renders the vertical timeline UI with colored dots and "show more" truncation                 |
| `app/(chef)/clients/[id]/page.tsx`               | Modified — fetches timeline in parallel with other client data, renders it in the Activity tab                           |

## How It Works

- `getUnifiedClientTimeline(clientId)` runs parallel Supabase queries for: events (name, date, status), inquiries (subject, created_at), messages (body preview, sent_at), payments (amount, paid_at), and reviews (rating, created_at). Each result set is mapped to a common `UnifiedTimelineItem` shape: `{ id, type, date, title, subtitle, href }`.
- All items are merged into a single array and sorted descending by date (newest first). The server action is tenant-scoped — it only returns data belonging to the current chef.
- `SOURCE_CONFIG` maps each `type` to a Tailwind color class and a display label (e.g., `payment` → green dot, "Payment Received"; `review` → yellow dot, "Review").
- The React component renders a vertical line with colored dots. Each item shows its title, subtitle, and relative date. Items with an `href` are clickable links that navigate to the relevant event or inquiry.
- The list truncates at 20 items. A "Show all N items" button expands to the full list without a page reload.
- When the client has no recorded activity, an empty state message reads "No activity recorded yet."

## How to Test

1. Open a client detail page for a client who has at least one event and one message.
2. Click the "Activity" tab — confirm the timeline renders with the correct items in reverse-chronological order.
3. Verify each item type shows the correct colored dot matching `SOURCE_CONFIG`.
4. Click an item that has an `href` (e.g., an event) and confirm it navigates to the correct detail page.
5. For a client with more than 20 items, confirm the list truncates and the "Show all" button expands it.
6. Open the Activity tab for a brand-new client with no history — confirm the empty state message appears.
