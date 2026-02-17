# Chef Sidebar Overhaul — Collapsible Rail + Grouped Navigation

## What Changed

The chef portal's desktop sidebar and mobile slide-out menu were overhauled from a flat 14-item list into a structured, collapsible navigation system.

### Before
- 14 nav items in 3 loosely labeled sections (main, finance, utility)
- Fixed 240px sidebar with no collapse option
- Mobile slide-out was a flat list of all items

### After
- **6 logical groups** with collapsible sub-menus
- **Rail mode** — sidebar collapses to a 64px icon rail, reclaiming screen space
- **Flyout popovers** in rail mode for accessing group children on hover
- **Persistent collapse state** via localStorage
- **Auto-expand** — navigating to a route automatically opens its parent group
- Mobile slide-out mirrors the grouped structure with collapsible sections

## Navigation Structure

```
Dashboard          (standalone)
─────────────────
Pipeline           → Inquiries, Quotes, Events, Schedule
Culinary           → Menus, Recipes
Clients            → Clients, Loyalty
Finance            → Financials, Expenses
Operations         → Reviews (AAR), Import
─────────────────
Settings           (standalone, pinned bottom)
Sign Out           (pinned bottom)
```

## Files Modified

| File | Change |
|------|--------|
| `components/navigation/chef-nav.tsx` | Full rewrite — collapsible sidebar with grouped nav, rail mode with flyouts, mobile grouped slide-out |
| `components/navigation/chef-main-content.tsx` | **New** — client component that reads sidebar context to dynamically adjust main content left padding |
| `app/(chef)/layout.tsx` | Wrapped in `SidebarProvider`, replaced static `<main>` with `<ChefMainContent>` |

## Architecture Decisions

### SidebarContext pattern
The sidebar collapse state needs to be shared between the sidebar component and the main content area (for padding). A React context (`SidebarProvider`) bridges these two client components while keeping the layout's auth check server-side.

### localStorage persistence
The collapse preference is stored in `localStorage` under `chef-sidebar-collapsed`. On mount, the component reads this value. Before hydration, it defaults to expanded to avoid layout flash.

### Rail flyouts vs tooltips
In collapsed mode, groups use hover-triggered flyout popovers (not just tooltips) so the user can access child links without expanding the sidebar. A 150ms leave delay prevents accidental closure.

### Mobile unchanged (bottom tabs)
The mobile bottom tab bar keeps its 4 most-used shortcuts (Home, Inquiries, Events, Clients) + More. The "More" slide-out now uses the same grouped structure as desktop.

## How It Connects

- **No route changes** — all 15 chef routes remain at the same paths
- **No auth changes** — `requireChef()` still runs server-side in the layout before any client code ships
- **No data model changes** — purely a UI/navigation restructure
- The `SidebarProvider` wraps the entire chef portal, making collapse state available to any future component that needs it
