# Spec: Menu Hero Access

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (5 files modified, 0 new files)
> **Created:** 2026-03-29
> **Built by:** Claude Code 2026-03-29

---

## What This Does (Plain English)

The menu engine is ChefFlow's most important feature, but right now it has the same navigation weight as every other page. This spec promotes menu creation and access to first-class status across every quick-access surface in the app: the dashboard header, the Cmd+K command palette, the `QUICK_CREATE_ITEMS` config, and consolidates the confusing dual-route system (`/menus` vs `/culinary/menus`) into a single canonical path. After this is built, a chef who has never used ChefFlow before will find "Create Menu" within one click from anywhere in the app.

---

## Why It Matters

Menus are the center of gravity for everything a chef does in ChefFlow. They tie to events, clients, costing, invoices, communications, seasonal palettes, Remy, and more. A new chef landing on the dashboard should immediately see that menu creation is the primary creative action, not have to hunt through 24 Command Center cards or discover the Action Bar entry by accident.

---

## Files to Create

None. This spec modifies existing files only.

---

## Files to Modify

| File                                       | What to Change                                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/dashboard/page.tsx`            | Add a "Create Menu" secondary action button in the dashboard header next to the existing primary action button |
| `components/search/command-palette.tsx`    | Add "New Menu" to the `QUICK_ACTIONS` array                                                                    |
| `components/navigation/chef-nav-config.ts` | Add Menu to `QUICK_CREATE_ITEMS` array                                                                         |
| `app/(chef)/culinary/menus/page.tsx`       | Replace entire page with a redirect to `/menus`                                                                |
| `docs/app-complete-audit.md`               | Update Section 6.1 to note `/culinary/menus` now redirects to `/menus`                                         |

---

## Database Changes

None.

---

## Data Model

No new data. This spec changes only navigation and access patterns.

---

## Server Actions

None. No new server actions needed.

---

## UI / Component Spec

### Change 1: Dashboard Header - "Create Menu" Button

**File:** `app/(chef)/dashboard/page.tsx`, lines 309-324

**Current state:** The header action area has two buttons:

- "Briefing" (secondary, links to `/briefing`)
- "[Primary Action]" (gradient accent, archetype-driven, always links to `/events/new` or variant)

**New state:** Add a "Create Menu" button between "Briefing" and the primary action:

```
[ Briefing ]  [ Create Menu ]  [ + New Event ]
```

- **Style:** Same as "Briefing" button (secondary, `border border-stone-700 text-stone-300 rounded-xl hover:bg-stone-800`) but with the UtensilsCrossed icon (already imported in nav-config, import it here)
- **Link:** `/menus/new`
- **Position:** Between Briefing and the primary action button
- **Responsive:** On mobile (`flex-wrap`), all three buttons wrap naturally. On small screens where space is tight, the buttons already use `flex-wrap shrink-0`, so this just flows.

**Why not replace the primary action?** The primary action is archetype-driven and may change per chef type. Menu creation is universally important regardless of archetype, so it gets its own dedicated button rather than competing with the event-creation flow.

### Change 2: Cmd+K Command Palette - "New Menu" Quick Action

**File:** `components/search/command-palette.tsx`, lines 40-90

Add a new entry to the `QUICK_ACTIONS` array:

```ts
{
  id: 'action:new-menu',
  label: 'New Menu',
  href: '/menus/new',
  section: 'Quick Actions',
  icon: '+',
},
```

**Position:** Insert after "New Event" (index 0) so the order becomes: New Event, **New Menu**, New Client, New Quote, New Inquiry, New Expense, New Recipe, Open Remy.

Menu goes right after Event because the two are tightly coupled (event creation often leads to menu creation).

### Change 3: QUICK_CREATE_ITEMS - Add Menu

**File:** `components/navigation/chef-nav-config.ts`, lines 8-13

Add Menu to the array:

```ts
export const QUICK_CREATE_ITEMS: NavQuickItem[] = [
  { href: '/events/new', label: 'Event', icon: Plus },
  { href: '/menus/new', label: 'Menu', icon: Plus },
  { href: '/quotes/new', label: 'Quote', icon: Plus },
  { href: '/inquiries/new', label: 'Inquiry', icon: Plus },
  { href: '/clients/new', label: 'Client', icon: Plus },
]
```

Menu goes second (right after Event) for the same coupling reason.

### Change 4: Consolidate `/culinary/menus` to Redirect

**File:** `app/(chef)/culinary/menus/page.tsx`

Replace the entire 167-line duplicate page with a server-side redirect:

```tsx
import { redirect } from 'next/navigation'

export default function CulinaryMenusRedirect() {
  redirect('/menus')
}
```

This eliminates the weaker duplicate. Any bookmark or nav link pointing to `/culinary/menus` will land on the real hub at `/menus`.

**Sub-routes under `/culinary/menus/`** (engineering, drafts, approved, templates, substitutions, scaling, `[id]`, new) are NOT touched by this spec. They remain where they are. Only the list page redirects, because `/menus` is the superior version. The sub-routes serve different purposes (analytics, filtered views) and don't have duplicates.

---

## Edge Cases and Error Handling

| Scenario                              | Correct Behavior                                                                                                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chef has no menus yet                 | Dashboard "Create Menu" button still shows (it links to the create wizard, not the list). Cmd+K "New Menu" still appears. These are create actions, not data-dependent. |
| `/culinary/menus` bookmarked          | Redirect to `/menus` (HTTP 307 via Next.js `redirect()`). Seamless, no error page.                                                                                      |
| Mobile viewport with 3 header buttons | `flex-wrap` on the button container handles this. Buttons wrap to a second line. Already the existing pattern.                                                          |
| Archetype not set (null)              | Primary action defaults to "New Event". "Create Menu" button is independent of archetype, always shows.                                                                 |

---

## Verification Steps

1. Sign in with agent account
2. **Dashboard:** Verify "Create Menu" button appears in the header between "Briefing" and the primary action. Click it, confirm it navigates to `/menus/new`.
3. **Cmd+K:** Press Cmd+K (or Ctrl+K), verify "New Menu" appears in Quick Actions when the palette opens with empty query. Click it, confirm navigation to `/menus/new`.
4. **QUICK_CREATE_ITEMS:** Verify any component consuming `QUICK_CREATE_ITEMS` now shows "Menu" in the list. (Check if quick-create-strip.tsx or other components render this array.)
5. **Redirect:** Navigate to `/culinary/menus` directly. Verify it redirects to `/menus` without error.
6. **Sub-routes preserved:** Navigate to `/culinary/menus/engineering`, `/culinary/menus/templates`, etc. Verify they still render their own pages (not redirected).
7. **Action Bar unchanged:** Verify the "Menus" entry in the Action Bar still links to `/menus` and works.
8. **+ Create dropdown unchanged:** Verify "New Menu" in the Create dropdown still links to `/menus/new` and works.
9. **Mobile:** Resize viewport to mobile width. Verify dashboard header buttons wrap cleanly.
10. Screenshot dashboard header, Cmd+K palette, and `/culinary/menus` redirect behavior.

---

## Out of Scope

- Not redesigning the `/menus` hub page layout (that's a separate concern)
- Not changing the menu creation wizard flow at `/menus/new`
- Not touching the Action Bar entry (it already works correctly)
- Not touching the + Create dropdown (it already has "New Menu" as the first creative item)
- Not redirecting `/culinary/menus/[id]`, `/culinary/menus/engineering`, or any sub-routes (only the list page)
- Not adding a dashboard menu widget or menu list to the dashboard (the button is enough; the hub is one click away)
- Not changing the menu editor, menu detail, or any menu functionality

---

## Notes for Builder Agent

- **Import the icon:** The dashboard page already imports `Plus` from `@/components/ui/icons`. You'll also need `UtensilsCrossed` for the menu button. Check that it's exported from `components/ui/icons` (it's used in nav-config.tsx, so it should be).
- **Don't touch nav-config.tsx:** The `actionBarItems` and `createDropdownItems` arrays are already correct. This spec only touches `chef-nav-config.ts` (the separate quick-create config) and `command-palette.tsx`.
- **The redirect preserves metadata:** The culinary menus page has `export const metadata`. When replacing with a redirect, you can drop the metadata export since the page never renders.
- **Test the QUICK_CREATE_ITEMS consumers:** Grep for `QUICK_CREATE_ITEMS` to find all components that import it, and verify they render the new Menu entry correctly.
- **Keep the `/culinary/menus/` directory:** Only replace `page.tsx`. The directory still holds sub-routes (`[id]/`, `engineering/`, `drafts/`, etc.) that must stay.

---

## Spec Validation (Planner Gate)

### 1. What exists today that this touches?

- `app/(chef)/dashboard/page.tsx:309-324` - Dashboard header with Briefing + primary action buttons
- `components/search/command-palette.tsx:40-90` - QUICK_ACTIONS array (7 items, no menu)
- `components/navigation/chef-nav-config.ts:8-13` - QUICK_CREATE_ITEMS (4 items, no menu)
- `app/(chef)/culinary/menus/page.tsx:1-167` - Duplicate menu list page (table view, weaker than `/menus`)
- `docs/app-complete-audit.md:714-718` - Section 6.1 documenting menu pages

### 2. What exactly changes?

- **dashboard/page.tsx:** Add one `<Link>` button element (~5 lines) to the header flex container
- **command-palette.tsx:** Add one object to QUICK_ACTIONS array (~6 lines)
- **chef-nav-config.ts:** Add one object to QUICK_CREATE_ITEMS array (~1 line)
- **culinary/menus/page.tsx:** Replace 167 lines with 5-line redirect
- **app-complete-audit.md:** Update 1 line noting redirect

### 3. What assumptions am I making?

- **Verified:** `UtensilsCrossed` icon is available (used in nav-config.tsx:1969)
- **Verified:** Dashboard header uses `flex-wrap` for responsive layout (page.tsx:309)
- **Verified:** `/culinary/menus` sub-routes are separate files in the directory (they have their own `page.tsx` files)
- **Verified:** `QUICK_CREATE_ITEMS` is imported by at least `chef-nav-config.ts` consumers
- **Verified:** Command palette QUICK_ACTIONS renders for empty/matching queries (line 40-90)

### 4. Where will this most likely break?

1. **QUICK_CREATE_ITEMS consumers** might have layout assumptions for exactly 4 items. Builder must check all consumers.
2. **Dashboard header button wrapping** on narrow viewports. Three buttons instead of two, but the flex-wrap is already there.

### 5. What is underspecified?

Nothing. Every change is a small, surgical addition to an existing array or container.

### 6. Dependencies or prerequisites?

None. All target files exist. No migrations needed.

### 7. What existing logic could this conflict with?

Nothing. We're adding items to arrays and replacing a page with a redirect. No shared state, no server actions, no database changes.

### 8. End-to-end data flow?

User action (click button / type Cmd+K / click quick-create) -> Next.js client navigation -> `/menus/new` page renders. No server actions, no DB writes, no side effects. Pure navigation.

### 9. Correct implementation order?

1. `chef-nav-config.ts` (smallest, least risk)
2. `command-palette.tsx` (small array addition)
3. `dashboard/page.tsx` (add button)
4. `culinary/menus/page.tsx` (redirect)
5. `app-complete-audit.md` (doc update)
6. Type check + build

### 10. Exact success criteria?

- "Create Menu" button visible on dashboard header, navigates to `/menus/new`
- "New Menu" appears in Cmd+K Quick Actions, navigates to `/menus/new`
- Menu appears in QUICK_CREATE_ITEMS
- `/culinary/menus` redirects to `/menus`
- All sub-routes under `/culinary/menus/` still work
- Type check passes, build passes

### 11. Non-negotiable constraints?

- Auth: Dashboard is already behind `requireChef()`. No new auth needed.
- No menu creation logic changes. Navigation only.

### 12. What should NOT be touched?

- `nav-config.tsx` (actionBarItems and createDropdownItems are already correct)
- Any `/menus/*` pages (hub, detail, editor, new)
- Any menu server actions
- Any `/culinary/menus/*` sub-routes (engineering, templates, etc.)

### 13. Is this the simplest complete version?

Yes. 5 surgical file edits, 0 new files, 0 database changes. Each change is under 10 lines except the redirect (which deletes 162 lines).

### 14. If implemented exactly as written, what would still be wrong?

The `/culinary/menus/[id]` detail page still exists as a separate route from `/menus/[id]`. A chef could land on either depending on which link they followed. This is a deeper consolidation that should be a follow-up spec, not crammed into this one.

---

## Final Check

> Is this spec production-ready, or am I proceeding with uncertainty?

**Production-ready.** Every file has been read, every change is surgical, every assumption is verified with line numbers. No gaps that would cause a builder to guess.
