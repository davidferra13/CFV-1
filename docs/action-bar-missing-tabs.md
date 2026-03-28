# Action Bar - Missing Tabs Added

**Date:** 2026-03-28
**Spec:** `docs/specs/action-bar-missing-tabs.md`

## What Changed

Added 4 missing tabs to the sidebar Action Bar, bringing it from 8 to 12 items:

1. **Notifications** (BellRing icon) - after Inbox
2. **Inquiries** (ChatTeardropText icon) - after Events
3. **Recipes** (BookOpen icon) - after Menus
4. **Tasks** (ListChecks icon) - after Prep

## Files Modified

| File                                   | Change                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| `components/navigation/nav-config.tsx` | Added 4 entries to `actionBarItems` array                                                  |
| `components/navigation/action-bar.tsx` | Added badge rendering for Notifications and Inquiries in both collapsed and expanded modes |

## Files Created

| File                                                      | Purpose                                                                                 |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `components/notifications/notifications-unread-badge.tsx` | Polls `getUnreadCount()` every 30s, shows amber badge                                   |
| `components/inquiries/inquiries-unread-badge.tsx`         | Polls `getInquiryStats()` every 30s, shows blue badge for `new` + `awaiting_chef` count |

## Badge Colors

- **Inbox**: red (existing)
- **Notifications**: amber (new)
- **Inquiries**: blue (new)
- **Community**: orange (existing)

## Final Action Bar Order (12 items)

1. Inbox
2. Notifications
3. Calendar
4. Events
5. Inquiries
6. Clients
7. Menus
8. Recipes
9. Money
10. Prep
11. Tasks
12. Community

## How It Connects

- Badge components follow the exact same pattern as `InboxUnreadBadge` and `CirclesUnreadBadge` (polling, visibility check, cleanup)
- No new server actions were needed; reuses `getUnreadCount()` from `lib/notifications/actions.ts` and `getInquiryStats()` from `lib/inquiries/actions.ts`
- No new pages created; all 4 routes already existed
