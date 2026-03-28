# Spec: Navigation Action Bar & Chef Portal Overhaul

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-27
> **Built by:** Claude Code (2026-03-28)

---

## What This Does (Plain English)

The chef portal navigation gets a two-layer architecture on both desktop AND mobile. A new **Action Bar** REPLACES the current `standaloneTop` hub links (Dashboard, Inbox, Events, Clients, Culinary, Finance, Operations, Growth) as the chef's daily-driver command center: 8 direct shortcuts to the things chefs use every single day (Inbox, Calendar, Events, Clients, Menus, Money, Prep, Community) plus a prominent **+ Create** button with 15 direct links to real create pages (no quick-create overlays, no duplicate data sources). The current full navigation directory (Pipeline, Clients, Events, Commerce, Culinary, Operations, Supply Chain, Finance, Network, Cannabis, Marketing, Analytics, Protection, Tools, Admin) gets preserved exactly as-is but collapses into an **"All Features"** expandable section below the Action Bar, kept in workflow order. Nothing is removed from `nav-config.tsx`, hidden, or destroyed. The `standaloneTop` data stays in the config for backwards compatibility (mobile tabs, search, Focus Mode). GlobalSearch's quick-create actions are unified with the new `createDropdownItems` so there is one source of truth. The chef sees what matters first, and everything else is one click away. Same experience on desktop and mobile (Q22-Q23).

---

## Why It Matters

Admin work is 90% of the job and not what any chef signed up for (Q4). The chef portal has 518 pages, 160+ top-level nav items, and 300+ sub-items. Everything is built and accessible, but the navigation currently presents as a flat encyclopedia. The most critical daily actions (building a menu, responding to inquiries, checking financials) require the same number of clicks as rarely-used features. Meanwhile, features that ARE built remain buried and unsurfaced (Q26). This spec solves both problems: the Action Bar puts the 8 daily-driver admin tasks front and center so the chef can dispense with admin and get back to creating, while All Features collapses the full directory into a reference section that's one click away but never in the way. The goal is that a chef opens ChefFlow and feels at ease (Q5), not productive, not efficient. At ease.

---

## Survey Context (Developer's Full Responses)

This spec was derived from a comprehensive 26-question survey completed by the developer (a 10+ year private chef who runs every type of food service: private chef, catering, pop-ups, meal prep, personal chef, restaurant, consulting, cannabis-infused events). Every answer is preserved below as the ground truth for design decisions.

### Developer Profile

- **Operation type:** All of them. Private chef, catering (weddings + corporate), pop-ups, meal prep, personal chef, restaurant, consulting, cannabis. Every type. But they all share a unified core: menu generation, costing, managing/executing the dinner, and communication.
- **Events per week:** Ideally at least one a day. Reality is 5-20 dinners/month, varies with effort. Has 5 people waiting right now. Restaurant chefs on the platform could do 100 covers a night. Range: 1/month to 50/month depending on chef.
- **Staff:** Solo right now. But app serves any size: solo operators, small teams, full restaurant crews. Chefs hand off dinners to each other; transferring info is currently a mess.
- **VA/Admin:** Nobody. Does everything alone. Admin work is 90% of the job and not what any chef signed up for. Platform's entire purpose is to eliminate that burden.

### What Chefs Want to See on Login (Q5-Q7)

- **The core feeling:** A chef opens ChefFlow and feels AT EASE. Not overwhelmed, not anxious about forgotten texts or unfinished docs. The system knows what's done, what's pending, who's waiting on who.
- **Dashboard = reassurance engine.** Not a task list. "Everything is handled. Here's where you stand. Go be creative."
- **The system should handle admin** so the chef can be creative. If a client reached out and all they need is "I'm working on this," the system should do that.
- **Communication status is everything:** who's waiting on the chef's response, who's waiting on the client's response. As long as you understand the responses going back and forth, you can make any decision across the website.
- **Five things to show on login:**
  1. **Menu Builder** (with integrated costing, nothing like it exists anywhere)
  2. **Full financial picture** (money in, money out, projected, earned, spent)
  3. **Calendar/Scheduler** (smart, acts on chef's behalf)
  4. **Remy** (AI that knows everything happening and can handle things)
  5. **Dinner Circle + Communication Pipeline** (visual client status so nobody's in the dark, plus community engine)

### What Chefs Create Most Often (Q8)

- **Menu Builder is #1.** Has years of existing menus and recipes to digitize. The chain is: communication > quote > event > menu > recipes > costing. All interconnected.
- **Communication pipeline is the most active thing** (always running), but menu building is the most creative thing.
- Recipe > Dish > Menu hierarchy is well-established in code. Menus are made of dishes, dishes are made of recipes, recipes are made of ingredients.
- System should cost as you type against ground truth pricing data (Kroger API averages already coded).
- Bulk import for existing menus/recipes needed initially, then ongoing creation.

### Real Grinding Day (Q9)

- **No dinner today, one coming up:** Wake up, figure out what needs prepping, grocery shop, do everything to make dinner day easier. 3 days out is ideal prep start. Day before should be fully prepped (cooler packed, equipment ready, car loaded).
- **Day of dinner:** Full throttle execution, block everything else out.
- **After dinner:** Log it, reflect, learn from it. Don't just move on.
- **All documents** (prep lists, grocery lists, execution plans) should be done the moment the menu is set, not the day before.
- **Inquiries overnight:** System should handle them, bring chef up to speed, automate routine stuff ("I'm working on this"), but never sacrifice personal touch.
- **If no dinner and no prep:** Deal with admin/everything else.

### What Eats Time (Q10-Q11)

- **Afternoon killer:** Menu costing when variables are unknown. 5 different menus needed, all different clients, asks, rates, group sizes, seasons. Trying to finalize without all information.
- **Monthly/seasonal nightmare:** Taxes. If system could hand off every number for tax time, that's the dream. Secondary: promoting the business / running ads.

### Pain Points (Q12)

- **Two biggest friction areas:**
  1. **Menu costing manually** (solved if engine works: recipes > dishes > menus, costed as you type)
  2. **Communication/booking pipeline** - 8-12 step back-and-forth: get client info (name, location, headcount, budget, allergies) > send quote > they agree > send menu draft > they respond > revise > confirm > get address > finalize > execute > follow up. Needs a tracker (like Domino's pizza tracker). Unified checklist: is the quote sent? Is the menu confirmed? Are documents generated?
- **Redundancy in nav:** Calls & Meetings has separate "Upcoming" and "Completed" sub-items. Should be one page with filters. This pattern repeats elsewhere.

### On the Job (Q13)

- **Not a fan of "kitchen mode" or hands-free gimmicks.** What's needed on the phone is DOCUMENTS: prep list if prepping, grocery list if shopping, full event summary if driving to a gig.
- **Everything printable should also be quickly viewable on phone.**
- **Checklists** you can check off (finished prepping the puree, made 2 cups, log it so system has ground truth for future costing).
- **No fancy UI.** Just documents and checklists.

### What Actually Happens with Inquiries (Q14)

- **Procrastination.** 7 open inquiries right now, one is 3 days old with zero response. Not even a "thank you, working on it." This is the #1 thing the system needs to solve. The chef knows they should respond. They don't. The friction is too high.

### Action Bar Items (Q15)

- Dashboard (redundant with logo click but expected)
- Inbox / Messaging
- Events
- Clients
- **Menus** (see all menus, create from template, version existing, start from scratch)
- Prep & Grocery (need their own presence)
- Money/Financial (needs to be specific, not vague)
- **Community** (dinner circles, chef network, always visible, opt-in/out)
- Settings, Sign Out
- **Key insight:** Items can't be vague category labels. "Clients" that requires clicking through to messages is annoying. "Menus" needs to land where you can immediately act.
- **Cannabis should NOT be in the action bar.** Admin-only feature. No admin stuff in the action bar.

### Quick-Create Buttons (Q16)

- **Prominent + icon** near top of nav bar
- **NO quick-create overlays** that hold data separately. Every button brings you to the REAL page. One source of truth, no half-assed partial records.
- **Quick-create list:** Menu, Recipe, Calendar Date, Prep List, Shopping List, Inventory Item, Document, Receipt Upload, Photo Upload
- **Quotes** are tricky (usually attached to existing event), but option should exist
- **Just a + icon,** no wording needed. Everyone knows. Drop-down with the list, each item navigates directly to the create page.

### Full Directory Treatment (Q17)

- Collapse into a tab called **"All Features"**
- Organize alphabetically within it
- Don't touch contents, just change presentation
- It becomes the reference encyclopedia: always accessible, never in the way

### Discovery & Redundancy (Q18)

- Browses the nav and finds it overwhelming
- Believes it's still missing things that are built but not surfaced
- Also has redundancy (separate tabs for filtered views of the same page)
- Wants to add missing items AND reduce noise simultaneously

### Dinner Booking Flow (Q19)

- **Sources:** 30% text from known contacts, 60% third-party (TakeAChef, WhyHangry, CozyMeal, personal website), 10% handoff from another chef
- **Standard flow:** Client reaches out with info > chef responds with quote + rough menu > for 4-course menu, send 12 dishes (3 options per course, pick one each, extras cost more) > back and forth revisions > finalize > confirm > deposit > documents auto-generate > prep 3 days out > execute > follow up + photos to dinner circle
- **Critical insight:** Once menu is confirmed, system can do EVERYTHING. Every document, every cost, every projection. Bottleneck is always: waiting for information and confirmation.
- **Autonomy opportunity:** System handles routine comms without overstepping or losing personal touch.

### Menu Building Process (Q20)

- **Two archetypes that live in tandem:**
  1. **Inspiration menus** - not tied to any event. Built from notebooks, food journals, Instagram hashtag browsing (#zucchini), foraging, memories, YouTube. Builds the recipe archive. Seasonal palettes (already coded) support this.
  2. **Event menus** - tied to client, event, date, headcount, budget, allergies, season. Pulls from archive + custom dishes.
- **Real process:** Go to coffee shop, personal notes + communication notes out, brainstorm dishes, categorize by course, create 3-4 options per course, overlap ingredients across concurrent clients (cauliflower in bulk), price on Instacart.
- **Time:** Hours per menu. Sometimes 7 clients simultaneously.
- **What engine should do:** Cost as you type, recognize ingredient overlaps across concurrent menus, know the season, know client restrictions. Don't make chef press "analyze." Just do it.
- **Templates:** 4-course menu, tasting menu, 12-course, 18-course. Show structure and descriptions. Versioning: take existing menu, clone it, assign to new client, modify.

### Next Step Suggestions (Q21)

- Yes, but **per-CLIENT, not per-task.** "What's next for this client?" is the source of truth.
- System should always figure out what's next by understanding all communication + inventory (receipts in/out).
- Not a notification. A centralized hub that's always there when you look.
- Works for restaurants too: what needs to happen today?

### Phone vs Computer (Q22)

- Personally: desktop power user
- Reality: 90% of users will be mobile
- NOT two versions. Same app, same features, properly formatted for mobile
- Must be immaculate on mobile without losing any features

### Mobile Bottom Tabs (Q23)

- Same app, same experience. Just format properly for mobile. No separate mobile version.

### Perfect ChefFlow Experience (Q24)

- **Consumer side:** Beautiful website to hire a chef or find food
- **Operator side:** An OS to log on and see everything needed. Customizable (what's shown, layout) without being annoying. All code exists, front end needs to represent it.
- Never cost out a menu manually again (unless hand-holding the system)
- Don't tell me what to cook. Guide me with data: "this person is allergic to X," "this dinner is in summer"
- Press a few buttons and print everything needed for taxes

### Time Saver (Q25)

- Something that lets clients know the chef is working on their inquiry. A persistent, visible status they can check anytime. Dinner circle solves this. Right now clients are in the dark and chef feels guilty.

### What Feels Buried (Q26)

- A LOT. The front end is not properly representing the codebase. This is THE core problem. Features exist. They're not surfaced.

---

## Design Principles (Derived from Survey)

1. **Ease over efficiency.** The chef should feel at ease, not productive. Productivity is a byproduct of not being anxious.
2. **One source of truth.** No quick-create overlays. No duplicate data entry points. Every button goes to the real page.
3. **Per-client, not per-task.** The system thinks in terms of "what's next for this client?" not "what's your next task?"
4. **Don't tell chefs what to cook.** Guide with data (allergies, season, budget). Never generate recipes. Never suggest dishes.
5. **Cost as you type.** No "analyze" buttons. The menu engine should be live.
6. **Documents are the product.** Prep lists, grocery lists, execution plans, front-of-house menus. These are what chefs actually use on the job. Make them instant and printable.
7. **Communication is the bottleneck.** If you know the communication state (who's waiting on who), you can derive everything else.
8. **The directory is sacred.** 518 pages, 160+ items. Don't touch, don't remove, don't reorganize the contents. Just change how it's presented.
9. **Mobile = desktop.** One app. One experience. Format properly. No feature gaps.
10. **Admin stays hidden.** Cannabis, prospecting, admin panel: never in a non-admin chef's view.
11. **Shortcuts must land actionable.** "Items can't be vague category labels. 'Menus' needs to land where you can immediately act" (Q15). The Action Bar only works if each landing page lets the chef DO something immediately, not browse a list first. This spec doesn't redesign landing pages, but the builder must verify each Action Bar route lands on an actionable surface. If a page requires further clicks to do anything, the shortcut fails its purpose.

---

## Architecture: Two-Layer Navigation

### Layer 1: Action Bar (new, prominent, top of sidebar)

The Action Bar is the chef's daily command center. It sits above everything else in the sidebar and contains:

#### Relationship to `standaloneTop` (CRITICAL)

The current sidebar renders `standaloneTop` items (Dashboard, Inbox, Events, Clients, Culinary, Finance, Operations, Growth) via `resolveStandaloneTop()` in `chef-nav.tsx` (line ~607). The Action Bar **REPLACES this rendering**. The `standaloneTop` array in `nav-config.tsx` must NOT be deleted (it's used by `resolveStandaloneTop()`, Focus Mode, mobile tabs, and `buildPrimaryShortcutOptions()`). Instead, `ChefSidebar` stops rendering `standaloneTop` items directly and renders the Action Bar component in their place. The existing `subMenu` arrays on `standaloneTop` items (Events > New Event/Calendar/Inquiries/Quotes/Proposals, etc.) are superseded by the + Create dropdown and the All Features directory. They remain in the data for search/other consumers.

#### Primary Shortcuts (always visible)

| Position | Item      | Icon              | Route            | Why                                                                |
| -------- | --------- | ----------------- | ---------------- | ------------------------------------------------------------------ |
| Logo     | Dashboard | `LayoutDashboard` | `/dashboard`     | Click logo = home. Standard pattern (existing behavior, no change) |
| 1        | Inbox     | `Inbox`           | `/inbox`         | Communication is the bottleneck. Must be instant                   |
| 2        | Calendar  | `Calendar`        | `/calendar`      | What's happening today/this week                                   |
| 3        | Events    | `CalendarDays`    | `/events`        | Active events, status at a glance                                  |
| 4        | Clients   | `Users`           | `/clients`       | Client directory + relationship status                             |
| 5        | Menus     | `UtensilsCrossed` | `/menus`         | The #1 creative tool. See all, create, version, template           |
| 6        | Money     | `DollarSign`      | `/financials`    | In, out, projected, earned, spent                                  |
| 7        | Prep      | `Timer`           | `/culinary/prep` | Prep lists, shopping lists, timelines                              |
| 8        | Community | `MessagesSquare`  | `/circles`       | Dinner circles, chef network                                       |

**Module gating:** Action Bar items are ALWAYS visible regardless of `enabledModules`. These are core daily-driver shortcuts. Module gating only applies to nav groups inside All Features.

#### + Create Button (prominent, top of Action Bar)

A single **+** icon button. On click, shows a dropdown with direct navigation links (NOT quick-create overlays):

| Create Item    | Navigates To              | Page Exists? | Why                                                                                             |
| -------------- | ------------------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| New Menu       | `/menus/new`              | Yes          | #1 most important create action                                                                 |
| New Recipe     | `/recipes/new`            | Yes          | Builds the recipe archive                                                                       |
| New Event      | `/events/new`             | Yes          | Log a new gig                                                                                   |
| New Client     | `/clients/new`            | Yes          | Add a contact                                                                                   |
| New Quote      | `/quotes/new`             | Yes          | Price out an event                                                                              |
| New Inquiry    | `/inquiries/new`          | Yes          | Log an incoming lead                                                                            |
| New Expense    | `/expenses/new`           | Yes          | Snap a receipt, log a cost                                                                      |
| Documents      | `/documents`              | Yes          | Generate prep list, grocery list, etc. (no `/documents/new` page exists; land on documents hub) |
| Prep           | `/culinary/prep`          | Yes          | Prep workspace (no `/culinary/prep/new` page exists; land on prep hub)                          |
| Upload Receipt | `/receipts`               | Yes          | Receipt library with upload (no `/receipts/upload` page exists; land on receipts hub)           |
| Calendar Date  | `/calendar`               | Yes          | Add a date to the calendar (no `/calendar/new` page; land on calendar hub)                      |
| Shopping List  | `/culinary/prep/shopping` | Yes          | Create a shopping list from prep workspace                                                      |
| Inventory Item | `/inventory`              | Yes          | Log an inventory item (no `/inventory/new` page; land on inventory hub)                         |
| Photo Upload   | `/recipes/photos`         | Yes          | Upload food photos to the recipe photo library                                                  |
| Upload Menu    | `/menus/upload`           | Yes          | Digitize existing menus                                                                         |

Each item navigates directly to a real, existing page. One source of truth. No overlays. No dead links.

**Note for builder:** Several routes (`/documents/new`, `/culinary/prep/new`, `/receipts/upload`, `/calendar/new`, `/inventory/new`) do not have dedicated `page.tsx` files. The table above uses the closest real hub pages. If dedicated create pages are built later (separate spec), the routes here can be updated. Two items intentionally share URLs with Action Bar shortcuts: "Calendar Date" (`/calendar`) duplicates the Calendar shortcut, and "Prep" (`/culinary/prep`) duplicates the Prep shortcut. This is expected (hub-page fallback until dedicated create routes exist). Do not treat this as a bug.

#### Remy (AI Assistant)

Remy's floating widget remains as-is (bottom-right corner). Not in the Action Bar. Always accessible from anywhere. The AI that knows everything.

### Layer 2: All Features Directory (current nav, collapsed)

The existing full navigation becomes a collapsible section labeled **"All Features"** below the Action Bar.

**Behavior:**

- Collapsed by default (shows just the "All Features" header with expand chevron)
- On click/expand: shows the full directory exactly as it exists today
- Contents kept in **workflow order** (Pipeline > Clients > Events > Commerce > Culinary > Operations > Supply Chain > Finance > Network > Cannabis > Marketing > Analytics > Protection > Tools > Admin). This is the existing order in `navGroups` and reflects how chefs think about their workflow. Do NOT sort alphabetically (that would put Admin first and Pipeline last).
- All 15 nav groups preserved with all sub-items
- Admin-only items still hidden for non-admin users
- Cannabis group still gated by membership
- The existing Community section (`communitySectionItems` in `chef-nav-config.ts`: Community Hub, Feed, Channels, Discover Chefs, Connections, Saved Posts, Notifications) and Cannabis section (`cannabisSectionItems`) currently render as standalone `SectionAccordion` components outside the `navGroups` loop. With the All Features wrapper, **move them inside the All Features collapsible container** so they collapse/expand with everything else. They render after the 15 `navGroups`, in their current order (Community, then Cannabis). Do NOT merge them into `navGroups` data; just move their rendering position inside the wrapper. The Action Bar's "Community" item at `/circles` is a shortcut to dinner circles specifically, not a replacement for the full community section.

**What changes about the contents:** Nothing in this spec. A future cleanup pass can merge redundant sub-items (e.g., "Upcoming" and "Completed" calls become one page with filters), but that is out of scope here.

**Relationship to existing Quick Create section:** The current "New" section in the sidebar (`QUICK_CREATE_ITEMS` in `chef-nav-config.ts`: New Event, New Quote, New Inquiry, New Client) is HIDDEN from the sidebar when the Action Bar renders, because the + Create dropdown supersedes it. The `QUICK_CREATE_ITEMS` array in `chef-nav-config.ts` must NOT be deleted (it may be used by mobile nav or search). Just skip rendering it in `ChefSidebar`.

### Focus Mode Interaction

An existing Focus Mode system (`lib/navigation/focus-mode-nav.ts`) strips the nav down to essentials (Dashboard, Inbox, Inquiries, Events, Clients + Pipeline/Events/Clients/Admin groups). With the Action Bar:

- **When Focus Mode is OFF:** Action Bar renders normally. All Features section is collapsible.
- **When Focus Mode is ON:** Action Bar still renders (it IS the focused view). The All Features section is HIDDEN entirely (not collapsed, hidden). Focus Mode's purpose is to reduce noise, and the Action Bar already achieves that. The `focusMode` prop in `ChefSidebar` controls this: `if (focusMode) { hideAllFeatures = true }`.
- The `STRICT_FOCUS_PRIMARY_SHORTCUT_HREFS` and `STRICT_FOCUS_GROUP_ORDER` in `focus-mode-nav.ts` do NOT need changes. They continue to work for any consumer that reads them (e.g., mobile nav). The desktop sidebar just doesn't use them anymore because the Action Bar replaces `standaloneTop` rendering.

### Rail / Collapsed Mode

The sidebar has a collapsed "rail mode" (`collapsed` state, 16px-wide icon-only sidebar with flyout menus on hover). With the Action Bar:

- **When collapsed:** Action Bar items render as icon-only buttons (same pattern as current `standaloneTop` items in rail mode, lines ~884-894 in `chef-nav.tsx`). Each icon is a direct link. No flyouts needed since Action Bar items have no children.
- **+ Create button in rail:** Renders as a `+` icon. On click, shows the same dropdown flyout (positioned to the right of the rail, same pattern as `RailFlyout` component).
- **All Features in rail:** The existing `RailFlyout` components for each nav group continue to work. They render below the Action Bar icons in the rail.
- No new components needed for rail mode. The existing rail rendering patterns in `ChefSidebar` are reused.

### Layer 3: Bottom Section (preserved, no changes)

- Settings link
- Sign Out
- `RecentPagesSection` (already built and shipping in `components/navigation/recent-pages-section.tsx`). Tracks last 8 visited pages with relative timestamps via `useRecentPages` hook, stored in `localStorage` key `cf:recent-pages`. This existing feature is critical for the on-the-job workflow (Q13): a chef driving to a gig needs instant access to the event they were just viewing. Do NOT remove, restructure, or relocate this section

---

## Files to Create

| File                                              | Purpose                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------- |
| `components/navigation/action-bar.tsx`            | The new Action Bar component with primary shortcuts and + Create dropdown     |
| `components/navigation/create-menu-dropdown.tsx`  | The + Create dropdown menu with direct navigation links                       |
| `components/navigation/all-features-collapse.tsx` | Wrapper that collapses the existing nav groups into an "All Features" section |

---

## Files to Modify

| File                                          | What to Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/navigation/chef-nav.tsx`          | **Primary change file.** In `ChefSidebar` (line ~580): replace the `standaloneTop` rendering loop (lines ~884 in rail mode, and the expanded-mode primary items loop) with Action Bar component. Wrap existing `NavGroupSection` rendering in an All Features collapsible container. Hide `QUICK_CREATE_ITEMS` rendering. When `focusMode` is true, hide All Features entirely. Rail mode: render Action Bar items as icon-only links + Create flyout. Key state variables to understand: `collapsed` (rail mode), `openGroups`, `openItems`, `shortcutsOpen`, `quickCreateOpen`, `navFilter`, `focusMode`, `primaryNavHrefs`, `enabledModules`, `isAdmin`.                       |
| `components/navigation/chef-mobile-nav.tsx`   | **Mobile parity (CRITICAL).** The mobile nav is a separate component, not the desktop sidebar in a drawer. It has its own rendering of Quick Create, Shortcuts (standaloneTop), and grouped nav. Update to render the Action Bar shortcuts and the new + Create dropdown in the slide-out menu drawer, replacing the old standaloneTop shortcuts and old 4-item Quick Create section. The mobile bottom tab bar (`MobileBottomTabBar`) is unchanged (it reads from `MOBILE_TAB_OPTIONS` / `resolveMobileTabs`, not standaloneTop). Without this change, mobile gets the old nav while desktop gets the Action Bar, violating the "same app, same experience" principle (Q22-Q23). |
| `components/navigation/nav-config.tsx`        | Add `actionBarItems` export (array of 8 items with href, label, icon). Add `createDropdownItems` export (array of 15 items with href, label, icon). Do NOT modify `standaloneTop`, `navGroups`, `standaloneBottom`, `QUICK_CREATE_ITEMS`, or any existing exports.                                                                                                                                                                                                                                                                                                                                                                                                                |
| `components/search/global-search.tsx`         | **Unify quick-create sources (CRITICAL).** This file has its own hardcoded `QUICK_CREATE_ACTIONS` array (6 items: Event, Quote, Inquiry, Client, Expense, Recipe) that is completely independent from `QUICK_CREATE_ITEMS` and the new `createDropdownItems`. Replace `QUICK_CREATE_ACTIONS` with an import of `createDropdownItems` from `nav-config.tsx` so there is ONE source of truth for quick-create actions across the entire app. Without this, there are three separate quick-create lists in three files with different items.                                                                                                                                         |
| `components/navigation/chef-nav-config.ts`    | No changes to data. But builder should understand `QUICK_CREATE_ITEMS` (4 items) is superseded visually by the new `createDropdownItems` (15 items).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `components/navigation/chef-main-content.tsx` | Verify no spacing changes needed. This file handles mobile padding (`pt-mobile-header`). If the Action Bar changes the sidebar header height, mobile content offset may need adjustment. Likely no changes, but builder must verify.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `lib/navigation/focus-mode-nav.ts`            | No changes needed. Action Bar replaces the Focus Mode primary shortcut rendering. Existing exports stay for other consumers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

---

## Database Changes

None. This is a pure front-end navigation restructure.

---

## UI / Component Spec

### Sidebar Layout (top to bottom)

```text
+----------------------------------+
| [Logo: ChefFlow]  [Search] [Bell]|
+----------------------------------+
| [+ Create]                       |  <-- Prominent + button, top of Action Bar
+----------------------------------+
|  Inbox                           |
|  Calendar                        |
|  Events                          |
|  Clients                         |
|  Menus                           |  <-- Action Bar: 8 primary shortcuts
|  Money                           |
|  Prep                            |
|  Community                       |
+----------------------------------+
|  All Features              [v]   |  <-- Collapsible, closed by default
|    (current full directory)      |
|    Pipeline >                    |
|    Clients >                     |
|    Events >                      |
|    Commerce >                    |
|    Culinary >                    |
|    ...all 15 groups...           |
+----------------------------------+
|  Settings                        |
|  Sign Out                        |
+----------------------------------+
```

### Action Bar Items

- Each item is a single-click nav link (no expand, no children, no submenu)
- Active state: highlighted background matching current theme
- Icons: reuse existing Lucide icons from nav-config
- Compact: icon + label on one line, similar to current standaloneTop styling
- **Visual separator:** Add a subtle divider (thin line or extra spacing) between the bottom of the Action Bar and the All Features header. Without it, the two layers visually blur together when All Features is collapsed. The two-layer hierarchy must be immediately obvious at a glance

### + Create Dropdown

- Floating dropdown menu triggered by the + icon
- Each item has an icon + label
- Click navigates directly to the target page (no overlay, no modal, no partial form)
- Dropdown closes on navigation
- Sorted to reflect the natural workflow chain from Q8: "communication > quote > event > menu > recipes > costing." Creative items first (Menu, Recipe), then pipeline items (Event, Client, Quote, Inquiry, Expense), then operational (Documents, Prep, Calendar Date, Shopping List, Inventory Item), then uploads last (Receipt, Photo, Menu)
- 15 items is a tall dropdown. Add subtle visual separators (thin dividers, no headers) between the logical groups above. Separators are optional polish; the dropdown must work as a flat list at minimum

### All Features Section

- Single collapsible section with header "All Features"
- Chevron icon rotates on expand/collapse
- When expanded: renders all 15 existing nav groups in their current format
- Groups kept in **workflow order** (Pipeline > Clients > Events > Commerce > Culinary > Operations > Supply Chain > Finance > Network > Cannabis > Marketing > Analytics > Protection > Tools > Admin). This is the existing `navGroups` array order. Do NOT re-sort.
- Each group still has its own expand/collapse for sub-items (existing `NavGroupSection` behavior)
- Collapsed state persists across page navigations (localStorage key: `chef-all-features-collapsed`, default: `true`)
- When `focusMode` is active: entire All Features section is hidden (not rendered)

### States

- **Loading:** Sidebar renders with Action Bar immediately (static links, no data fetch needed)
- **Collapsed (default):** All Features section closed. Only Action Bar visible. Clean, minimal.
- **Expanded:** All Features opens to show full directory. Scrollable within sidebar.

---

## Edge Cases and Error Handling

| Scenario                                                | Correct Behavior                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Non-admin user                                          | Admin, Prospecting, Cannabis (if not unlocked), Clover Parity, Observability, Remy History items hidden in All Features. Action Bar never shows admin items                                                                                                                                              |
| Mobile viewport                                         | Action Bar items stack vertically as they do now. All Features collapse works the same. No separate mobile version                                                                                                                                                                                       |
| Chef has custom mobile tabs                             | Mobile bottom tab customization (`resolveMobileTabs`) continues to work independently. It reads from `MOBILE_TAB_OPTIONS`, not from the Action Bar                                                                                                                                                       |
| Chef has custom primary nav (`primaryNavHrefs`)         | The `resolveStandaloneTop(primaryNavHrefs)` function still works but is no longer consumed by the desktop sidebar rendering. The Action Bar items are fixed (not customizable in this spec). Custom primary nav only affects consumers that still call `resolveStandaloneTop()`                          |
| Cmd+K search / `GlobalSearch`                           | Still searches all pages (Action Bar routes + All Features routes). No change to search behavior. `buildPrimaryShortcutOptions()` still builds the full searchable index                                                                                                                                 |
| Focus Mode active                                       | Action Bar renders normally. All Features section is hidden entirely. No `standaloneTop` rendering                                                                                                                                                                                                       |
| Rail / collapsed mode                                   | Action Bar items render as icon-only links. + Create renders as icon with flyout dropdown. All Features groups render as existing `RailFlyout` components                                                                                                                                                |
| All Features items that link to same page as Action Bar | Both work. Action Bar is a shortcut, All Features is the directory. No conflict, expected duplication                                                                                                                                                                                                    |
| Community section vs Action Bar Community               | Action Bar "Community" links to `/circles` (dinner circles). The existing Community section in sidebar (`communitySectionItems`) continues rendering inside All Features. These are different: one is a shortcut, the other is the full section                                                          |
| `enabledModules` gating                                 | Action Bar items are ALWAYS visible (no module gating). Module locks only apply to nav groups inside All Features (existing behavior via `isLocked` prop on `NavGroupSection`)                                                                                                                           |
| Active state in both layers                             | Both the Action Bar shortcut AND the matching All Features group highlight simultaneously when on a shared route (e.g., `/events`). This is intentional: Action Bar confirms "you're here," All Features confirms "this lives in the Events group." Do NOT suppress either highlight                     |
| Deep link into All Features route                       | If the active page lives inside All Features but NOT in the Action Bar (e.g., `/analytics/revenue`), auto-expand All Features to show the active group. Override the `localStorage` collapsed default for this page load only. This prevents the chef from landing on a page with no visible nav context |
| Keyboard navigation on + Create dropdown                | The + Create dropdown MUST use Radix `DropdownMenu` (from `components/ui/dropdown-menu`) for built-in keyboard support: `Escape` to close, arrow keys to navigate items, focus trap. Do NOT build a custom div-based dropdown                                                                            |

---

## Verification Steps

1. Sign in with agent account
2. Verify Action Bar appears at top of sidebar with all 8 items (each with a distinct icon: no duplicate icons between Calendar and Events)
3. Click each Action Bar item, verify it navigates to the correct page
4. Click + Create button, verify dropdown appears with all 15 create items
5. Click each create item, verify it navigates to the real page (no overlay, no modal)
6. Verify + Create dropdown supports keyboard navigation (arrow keys, Escape to close)
7. Verify All Features section is collapsed by default
8. Expand All Features, verify all 15 nav groups + Community + Cannabis sections appear in workflow order
9. Verify all existing nav items within groups still work
10. Collapse All Features, navigate to another page, verify it stays collapsed
11. Navigate to a deep All Features route (e.g., `/analytics/revenue`), verify All Features auto-expands to show the active group
12. Verify both the Action Bar item AND the matching All Features group highlight when on a shared route (e.g., `/events`)
13. Verify admin-only items are hidden for non-admin users
14. Open Cmd+K search, verify quick-create actions match the + Create dropdown (unified source)
15. Open mobile viewport, open the slide-out menu drawer, verify Action Bar shortcuts and + Create items render (not old standaloneTop/Quick Create)
16. Verify mobile bottom tabs are unchanged
17. Test rail/collapsed mode: Action Bar items as icon-only links, + Create as flyout
18. Screenshot desktop, mobile, and rail mode views

---

## Out of Scope

- **Dashboard redesign** (the "reassurance engine" / "what's next per client" hub is a separate spec)
- **Menu engine improvements** (costing as you type, templates, versioning - separate spec)
- **Communication pipeline tracker** (Domino's-style progress tracker - separate spec)
- **Action Bar contextual badges** - unread count on Inbox, "X waiting on you" indicators, inquiry age warnings. The user said "communication status is everything" (Q5-Q7) and inquiry procrastination is the #1 pain point (Q14). Static links solve navigation; badges solve awareness. This is the highest-priority enhancement after this spec ships.
- **Action Bar customization** - the user wants "customizable (what's shown, layout) without being annoying" (Q24). This spec ships with fixed items. A future iteration could let chefs reorder, swap, or pin/unpin Action Bar shortcuts (similar to how `primaryNavHrefs` customizes `standaloneTop` today)
- **Nav item redundancy cleanup + feature surfacing** (merging "Upcoming"/"Completed" into filtered views, surfacing built-but-buried features - future spec #7). NOTE: This spec solves half of the user's Q18 request (reduce noise). Spec #7 solves the other half (surface hidden features). Together they complete the nav overhaul. Neither alone is sufficient.
- **Dinner circle enhancements** (client-visible status - already built, separate spec if changes needed)
- **Mobile-specific optimizations** (beyond ensuring same layout works on mobile)
- **Remy integration** (Remy widget stays as-is, not part of nav restructure)
- **Tax export** (financial tooling, separate spec)
- **Landing page actionability audit** - verifying that each Action Bar destination (`/inbox`, `/calendar`, `/events`, `/clients`, `/menus`, `/financials`, `/culinary/prep`, `/circles`) lands on an immediately actionable surface, not a browse-first list (Q15: "items can't be vague category labels"). This is a dependency for the Action Bar to deliver on its promise.

---

## Future Specs (Derived from Survey)

These are the follow-up specs that should be built after this one, in priority order. Each one traces directly back to specific survey answers.

1. **Action Bar Contextual Badges** (Q5-Q7, Q14) - Add unread/waiting indicators to Action Bar items. Inbox: unread count. Events: upcoming count. Inquiries: "X days without response" warning surfaced on Inbox badge. Communication status is everything; static links solve navigation but badges solve awareness. This is the highest-priority enhancement after the nav ships.
2. **Dashboard Reassurance Engine** (Q5-Q7, Q21, Q24) - "What's next per client?" hub. Status of all communications, financial snapshot, calendar preview, document readiness. Per-client, not per-task (Q21). The chef logs in and feels at ease. The dashboard Action Bar shortcut must land on THIS, not a task list.
3. **Menu Engine v2** (Q8, Q10, Q20) - Cost as you type against Kroger API averages (already coded). Templates (4-course, tasting, 12-course, 18-course). Versioning (clone menu, assign to new client). Ingredient overlap detection across concurrent menus (Q20: "7 clients simultaneously, overlap cauliflower in bulk"). Two menu archetypes: inspiration menus (no event) and event menus (tied to client). Bulk import from photos.
4. **Communication Pipeline Tracker** (Q12, Q19, Q25) - Domino's-style progress tracker per client/event. Who's waiting on who. Unified checklist: info gathered? Quote sent? Menu confirmed? Documents generated? Deposit received? Gives clients persistent visibility into inquiry status (Q25: "right now clients are in the dark and chef feels guilty").
5. **Inquiry Auto-Response** (Q14) - System catches 3-day-old unresponded inquiries and sends "thank you, working on it" on chef's behalf (with chef's permission). Funnel all sources (Q19: 30% text, 60% third-party platforms, 10% chef handoff) into one inbox.
6. **Document Generator** (Q9, Q13) - Once menu is confirmed, auto-generate ALL documents: prep list, grocery list, execution plan, front-of-house menu, event summary sheet. "All documents should be done the moment the menu is set, not the day before" (Q9). Printable and phone-viewable (Q13: "what's needed on the phone is DOCUMENTS").
7. **Tax Export** (Q11) - One button, print everything needed for taxes. "If system could hand off every number for tax time, that's the dream" (Q11). All financial data already tracked, just needs a clean export.
8. **Nav Directory Cleanup + Feature Surfacing** (Q18, Q26) - The second half of the nav overhaul. This spec reduces noise; spec #8 surfaces what's hidden. Merge redundant sub-items (Q12: "Calls & Meetings has separate Upcoming and Completed, should be one page with filters"). Surface features that are built but not linked (Q26: "A LOT feels buried. The front end is not properly representing the codebase").
9. **Action Bar Customization** (Q24) - Let chefs reorder, swap, or pin/unpin Action Bar shortcuts. "Customizable (what's shown, layout) without being annoying" (Q24). Similar pattern to existing `primaryNavHrefs` customization for `standaloneTop`.

---

## Notes for Builder Agent

### What NOT to do

- **DO NOT** delete, rename, or restructure any existing exports in `nav-config.tsx`. The `standaloneTop`, `navGroups`, `standaloneBottom`, `resolveStandaloneTop()`, `buildPrimaryShortcutOptions()`, `MOBILE_TAB_OPTIONS`, `resolveMobileTabs()` arrays/functions must remain untouched. You are only ADDING new exports.
- **DO NOT** delete `QUICK_CREATE_ITEMS` from `chef-nav-config.ts`. Just stop rendering it in the desktop sidebar.
- **DO NOT** delete `communitySectionItems` or `cannabisSectionItems` from `chef-nav-config.ts`.
- **DO NOT** create quick-create overlays or modals. Every + Create item navigates to a real page.
- **DO NOT** sort All Features alphabetically. Keep the existing `navGroups` array order (workflow order).
- **DO NOT** build a custom div-based dropdown for + Create. Use Radix `DropdownMenu` from `components/ui/dropdown-menu` for keyboard accessibility.
- **DO NOT** leave GlobalSearch's `QUICK_CREATE_ACTIONS` as a separate hardcoded list. Replace it with an import of `createDropdownItems`.
- **DO NOT** skip the mobile nav update. `chef-mobile-nav.tsx` is a separate component from `chef-nav.tsx`. Both must render the Action Bar.

### How the sidebar currently works (read before building)

- `ChefSidebar` component (line ~580 in `chef-nav.tsx`) is the main desktop sidebar
- It receives props: `primaryNavHrefs`, `enabledModules`, `isAdmin`, `focusMode`, `userId`, `tenantId`
- `resolveStandaloneTop()` builds the primary hub links from `standaloneTop` data + user preferences
- The sidebar has two modes: expanded (`collapsed=false`, 240px wide, full labels) and rail (`collapsed=true`, 64px wide, icon-only with flyout menus)
- `NavGroupSection` renders each nav group with its own expand/collapse accordion
- `RailFlyout` renders each nav group as an icon with hover flyout in rail mode
- The nav filter input (`NavFilterInput`) filters across all sections. The Action Bar items should also be filterable via `navFilter`
- `SectionAccordion` is used for Community and Cannabis standalone sections
- The sidebar uses `localStorage` for collapse state (`chef-sidebar-collapsed`)

### Implementation approach

1. Add `actionBarItems` and `createDropdownItems` exports to `nav-config.tsx`
2. Create `action-bar.tsx` component that renders the 8 shortcuts + Create dropdown. Use Radix `DropdownMenu` from `components/ui/dropdown-menu` for the + Create dropdown (built-in keyboard a11y)
3. Create `all-features-collapse.tsx` wrapper that wraps the existing `NavGroupSection` loop AND the Community/Cannabis `SectionAccordion` components in a single collapsible container. Auto-expand when the active page is inside All Features but not in the Action Bar
4. In `ChefSidebar`: replace the `standaloneTop` rendering with `ActionBar`. Wrap the `NavGroupSection` loop + Community/Cannabis sections with `AllFeaturesCollapse`. Skip `QUICK_CREATE_ITEMS` rendering. Handle `focusMode` by hiding All Features
5. In rail mode: render Action Bar items as icon-only links (same pattern as current primary items). Render + Create as icon with flyout
6. **In `chef-mobile-nav.tsx`:** Replace the Shortcuts section (standaloneTop rendering) with Action Bar items. Replace the Quick Create section (4 items) with the new `createDropdownItems` (15 items). The mobile bottom tab bar is unchanged
7. **In `global-search.tsx`:** Replace the hardcoded `QUICK_CREATE_ACTIONS` array with an import of `createDropdownItems` from `nav-config.tsx`. One source of truth for quick-create across the entire app
8. Persist All Features collapse state in `localStorage` key `chef-all-features-collapsed` (default: `true` = collapsed). Override to expanded when active page is inside All Features
9. The `navFilter` state should filter Action Bar items too (match label against filter string, same pattern as `filteredPrimaryItems`)
10. Test on both desktop AND mobile viewports. Verify Action Bar items and + Create dropdown render identically in the mobile slide-out drawer
11. Verify `chef-main-content.tsx` spacing is correct with the new sidebar structure (likely no changes, but confirm)

### Files to read before starting

- `components/navigation/chef-nav.tsx` (desktop sidebar, ~900 lines)
- `components/navigation/chef-mobile-nav.tsx` (mobile nav: top bar + drawer + bottom tabs)
- `components/navigation/nav-config.tsx` (all nav data, ~1925 lines)
- `components/navigation/chef-nav-config.ts` (quick create items, community items)
- `components/navigation/chef-nav-helpers.ts` (active state detection helpers)
- `components/search/global-search.tsx` (has separate `QUICK_CREATE_ACTIONS` to unify)
- `components/navigation/chef-main-content.tsx` (mobile spacing, verify no changes needed)
- `lib/navigation/focus-mode-nav.ts` (focus mode config)
