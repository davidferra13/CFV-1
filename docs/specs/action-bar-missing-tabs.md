# Spec: Action Bar - Add Missing Tabs

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** small (2 files)
> **Created:** 2026-03-28
> **Built by:** Claude Code (2026-03-28)

---

## What This Does (Plain English)

Adds four missing tabs to the sidebar Action Bar: **Recipes**, **Inquiries**, **Tasks**, and **Notifications**. These are daily-driver features that chefs reach for constantly but currently require navigating through nested menus to find. After this change, the Action Bar goes from 8 items to 12, giving one-click access to the chef's full daily workflow.

---

## Why It Matters

Recipes, inquiries, tasks, and notifications are core daily actions that are currently buried 2-3 clicks deep. Every extra click during a busy service day is friction. Inquiries especially are time-sensitive (slow response = lost gig). These four earn a top-level spot without adding noise because they map to distinct daily workflows that don't overlap with existing tabs.

---

## Files to Create

None.

---

## Files to Modify

| File                                   | What to Change                                                      |
| -------------------------------------- | ------------------------------------------------------------------- |
| `components/navigation/nav-config.tsx` | Add 4 new entries to the `actionBarItems` array                     |
| `components/navigation/action-bar.tsx` | Add unread/notification badges for Inquiries and Notifications tabs |

---

## Database Changes

None.

---

## Implementation Details

### 1. `nav-config.tsx` - Add to `actionBarItems`

The current 8 items and the 4 new ones, in workflow order:

```ts
export const actionBarItems: NavItem[] = [
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/notifications', label: 'Notifications', icon: BellRing }, // NEW
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/inquiries', label: 'Inquiries', icon: ChatTeardropText }, // NEW
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/menus', label: 'Menus', icon: UtensilsCrossed },
  { href: '/recipes', label: 'Recipes', icon: BookOpen }, // NEW
  { href: '/financials', label: 'Money', icon: DollarSign },
  { href: '/culinary/prep', label: 'Prep', icon: Timer },
  { href: '/tasks', label: 'Tasks', icon: ListChecks }, // NEW
  { href: '/circles', label: 'Community', icon: MessagesSquare },
]
```

**Ordering rationale:**

- **Notifications** right after Inbox (both are "things demanding attention")
- **Inquiries** between Events and Clients (it's the pipeline between "someone reached out" and "they became a client")
- **Recipes** right after Menus (culinary pair: what you're serving and how you make it)
- **Tasks** after Prep (operational pair: what you're prepping and what else needs doing)

All icons already imported in `nav-config.tsx`: `BellRing`, `ChatTeardropText`, `BookOpen`, `ListChecks`.

### 2. `action-bar.tsx` - Add Badges

Inquiries and Notifications need unread count badges, same pattern as the existing `InboxUnreadBadge` and `CirclesUnreadBadge`.

**For Notifications:** Create or reuse a `NotificationsUnreadBadge` component (check if one exists; if not, create a simple one that queries unread notification count).

**For Inquiries:** Create or reuse an `InquiriesUnreadBadge` component that shows count of inquiries in "awaiting response" status.

Add badge rendering in both collapsed and expanded modes:

```tsx
// In both the collapsed and expanded rendering blocks, add:
{
  item.href === '/notifications' && (
    <span className="absolute -top-1 -right-1">
      <NotificationsUnreadBadge />
    </span>
  )
}
{
  item.href === '/inquiries' && (
    <span className="absolute -top-1 -right-1">
      <InquiriesUnreadBadge />
    </span>
  )
}
```

For the expanded (non-collapsed) mode, use inline badge style (same as Inbox):

```tsx
{
  item.href === '/notifications' && <NotificationsUnreadBadge />
}
{
  item.href === '/inquiries' && <InquiriesUnreadBadge />
}
```

---

## Edge Cases and Error Handling

| Scenario                  | Correct Behavior                                                        |
| ------------------------- | ----------------------------------------------------------------------- |
| Badge count fetch fails   | Show no badge (not zero). Silent failure is fine for a count indicator. |
| 0 unread items            | Hide the badge entirely (don't show "0")                                |
| All 4 pages already exist | They do. No new pages needed. Just wiring nav to them.                  |

---

## Verification Steps

1. Sign in with agent account
2. Verify sidebar shows all 12 items in the correct order
3. Click each new tab (Recipes, Inquiries, Tasks, Notifications) and confirm navigation works
4. Collapse the sidebar to rail mode and verify all 12 icons render correctly
5. Verify badges appear on Inquiries and Notifications when there are unread items
6. Verify badges hide when counts are zero
7. Use nav search filter and confirm new items are filterable by name
8. Screenshot both expanded and collapsed states

---

## Out of Scope

- Reordering existing items (only inserting new ones at logical positions)
- Creating any new pages (all 4 routes already exist and work)
- Changing the "All Features" collapse section
- Mobile tab bar changes (separate spec if needed)
- Making the Action Bar user-configurable (separate spec)

---

## Notes for Builder Agent

- All 4 icons (`BellRing`, `ChatTeardropText`, `BookOpen`, `ListChecks`) are already imported in `nav-config.tsx`. No new imports needed.
- All 4 pages exist: `/recipes`, `/inquiries`, `/tasks`, `/notifications`. This is purely a nav wiring change.
- The badge components for Inbox (`InboxUnreadBadge`) and Community (`CirclesUnreadBadge`) are the pattern to follow. Check if `NotificationsUnreadBadge` and `InquiriesUnreadBadge` already exist before creating new ones.
- The Action Bar renders in two modes (collapsed rail + expanded). Both must show all 12 items.
- The `isItemActive()` helper in `chef-nav-helpers.tsx` handles active state detection. It should work automatically for the new routes.
