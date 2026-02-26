# Add Client Button - Clients Page

## What Changed

Added a prominent "+ Add Client" button to the header of the clients page (`app/(chef)/clients/page.tsx`), matching the pattern used on the Partners page.

## Why

The clients page had no clear call-to-action in the header. The invitation form existed lower on the page, but there was no obvious way for a chef to quickly find it. Other list pages (Partners, Events) already had header-level action buttons.

## How It Works

- The button sits in the page header, right-aligned, using the same `flex justify-between items-center` layout as the Partners page.
- Clicking it scrolls to the `#invite` anchor on the invitation card, bringing the "Send Client Invitation" form into view.
- No new pages or routes were created -- the existing invitation form is the mechanism for adding clients.

## Files Changed

| File                          | Change                                                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/clients/page.tsx` | Added `Button` import, header layout with "+ Add Client" anchor, `id="invite"` on invitation card. Removed unused imports (`formatCurrency`, `format`, `Link`). |

## Connection to System

This is a UI-only change. No business logic, database, or server actions were modified. The invitation flow (`inviteClient` server action) remains unchanged.
