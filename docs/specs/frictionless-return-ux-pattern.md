# Spec: Frictionless Return UX Pattern

> **Status:** ready
> **Priority:** P1
> **Type:** Cross-cutting UX pattern (governance)
> **Depends on:** `docs/specs/universal-interface-philosophy.md`, `docs/specs/surface-grammar-governance.md`
> **Informed by:** `docs/research/chef-exit-points-analysis.md` (64 exit scenarios)

## Timeline

| Event   | Date       | Agent/Session      |
| ------- | ---------- | ------------------ |
| Created | 2026-05-25 | Planner (Opus 4.6) |

---

## What This Does (Plain English)

When a chef leaves ChefFlow (to check a price, research a client, look up weather), the app remembers exactly where they were. When they come back, the same view is waiting. For certain exit types, ChefFlow offers a lightweight prompt to capture what the chef learned while away. No re-navigation. No lost context. No wasted steps.

This spec defines the universal pattern. Every feature that involves an external link, an app-switch, or an in-app deep navigation applies these rules.

---

## Why It Matters

The exit-points analysis found 64 scenarios where chefs leave ChefFlow. The exit friction is mapped. But the **return friction** is often worse: the chef found the answer externally and now has to re-navigate to the right page, find the right field, and manually enter what they learned. Two tasks (research + update) instead of one flow.

ChefFlow is a Next.js SPA. External links open in new tabs. The app state survives in the background tab. The infrastructure supports frictionless returns; the UX patterns just need to be standardized and the intel-capture layer added.

---

## Core Concept: The Round-Trip

Every exit from ChefFlow is a round-trip with three phases:

1. **Departure** - chef clicks an external link or switches apps
2. **Away** - chef is on the external site/app gathering intel
3. **Return** - chef switches back to ChefFlow with new information

Each phase has a design responsibility:

| Phase     | ChefFlow's Job                                                     |
| --------- | ------------------------------------------------------------------ |
| Departure | Preserve app state. Open external in new tab. Never navigate away. |
| Away      | Nothing. ChefFlow is idle in a background tab.                     |
| Return    | Same view waiting. Optionally prompt for intel capture.            |

---

## 1. Context Preservation

### Rule: ChefFlow never navigates away from the current view for external links.

**Technical reality:** ChefFlow is a Next.js SPA. Opening a link with `target="_blank"` keeps the app state intact in the background tab. When the chef returns (alt-tabs, clicks the tab), the exact same view is waiting. No re-navigation needed.

**Requirements:**

- All external links use `target="_blank" rel="noopener noreferrer"`. No exceptions.
- No `window.location.href` or `router.push` for external URLs. Ever.
- If a component needs to open an external URL programmatically, use `window.open(url, '_blank')`.
- SPA state (form inputs, scroll position, expanded sections, active tabs) persists naturally because the page is never unloaded. No special state management needed.

**What already works:**

- `BreadcrumbTracker` (`components/activity/breadcrumb-tracker.tsx`) silently tracks all navigation. It already records `page_view` events with `referrer_path`, `session_id`, and timestamps.
- `BreadcrumbBar` (`components/navigation/breadcrumb-bar.tsx`) renders path-based breadcrumbs with segment labels for known routes.
- `RetraceTimeline` (`components/activity/retrace-timeline.tsx`) shows session-grouped navigation history.

**What does NOT need to change:** The existing breadcrumb system handles in-app navigation memory. This spec adds the external-link pattern and the return-capture layer on top.

### Edge Case: Full-Page Reload

If the chef closes the ChefFlow tab entirely (not just switches away), context is lost. This spec does not attempt to solve tab-close recovery. That is a session-restore feature with different scope. The `BreadcrumbTracker` already records last-visited paths, which enables a "pick up where you left off" feature if built later.

---

## 2. Link-Out Design Pattern

### Rule: External links are visually distinct, consistently grouped, and always open in new tabs.

**Visual Treatment:**

- External links include a small `ExternalLink` (or `ArrowUpRight`) icon after the link text. Size: 12px, muted color (stone-500). The icon signals "this goes outside ChefFlow."
- Internal links never show this icon.
- External links in body text use the same text color as internal links but add the icon suffix.

**Implementation: `ExternalLink` component**

A reusable component wraps the pattern:

```tsx
// components/ui/external-link.tsx
interface ExternalLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  exitType?: 'permanent' | 'bridgeable' | 'reducible'
  returnContext?: ReturnContext // for bridgeable exits
}
```

Props:

- `href`: external URL
- `exitType`: determines whether return-capture prompt fires (only `bridgeable`)
- `returnContext`: metadata for the return prompt (entity type, entity ID, suggested field)

**Grouping Rule:**

When a page has multiple external links for the same purpose (e.g., an event detail page with map, weather, venue website), group them in a labeled section:

- Section label: "Research" or contextual equivalent ("Venue Info", "Price Check")
- Links listed together, not scattered across the page
- Each link has a descriptive label, not just a raw URL

**Existing Audit:** Many components already use `target="_blank"` correctly (found in 20+ files). The `ArrowUpRight` / `ExternalLink` icon is used inconsistently. This pattern standardizes it.

---

## 3. Exit Type Taxonomy in UI

The exit-points analysis defines three types. Each gets different UX treatment:

### 3a. Permanent Exits (23 scenarios)

Chef leaves for a platform ChefFlow will never replace (social media, vendor ordering, government portals, equipment purchasing).

**UI treatment:**

- Clean external link with icon
- No return-capture prompt
- Optional: store the link in ChefFlow for quick re-access (e.g., vendor website on vendor profile, client LinkedIn on client profile)

**Worked example: Chef researches a cooking technique on YouTube**

Scenario #19 from the analysis. Chef is editing a recipe in ChefFlow. They want to learn a technique (tempering chocolate at altitude).

1. Chef sees a "Research" section on the recipe edit page, or uses Cmd+K to search "youtube chocolate tempering"
2. Link opens YouTube in a new tab
3. Chef watches the video, learns the technique
4. Chef alt-tabs back to ChefFlow
5. Recipe edit page is exactly as they left it, cursor in the same field
6. No prompt. No capture. They incorporate what they learned into the recipe notes manually if they choose.

**Why no prompt:** ChefFlow cannot predict what the chef learned from a permanent-exit destination. The intel is unstructured (a video, a social media browse). Prompting would be noise.

### 3b. Reducible Exits (12 scenarios)

Chef leaves because ChefFlow data is missing or stale. The long-term fix is to eliminate the exit entirely by making ChefFlow's data sufficient.

**UI treatment:**

- Inline solution inside ChefFlow replaces the need to leave
- If the data is not yet available, show a clear link-out with a note: "PIE data unavailable for this item. Check [Store Name]."
- No return-capture prompt (the goal is to eliminate the exit, not bridge it)

**Worked example: Chef checks salmon price on Amazon**

Scenario #1 from the analysis. Chef is costing a menu. PIE has a price for Atlantic salmon but it is 3 weeks old.

**Today (reducible exit still exists):**

1. Chef sees PIE price marked "3 weeks old" with a muted freshness indicator
2. Below the PIE price: "Check current price" link to Amazon/Instacart for that item (bridgeable fallback)
3. Chef clicks, checks price in new tab
4. Returns to ChefFlow. The ingredient cost field is still focused.
5. Return-capture prompt: "Update salmon price to $**.**?" with the ingredient pre-focused.

**Future (exit eliminated):**

1. Chef sees PIE price updated within 48 hours, high confidence
2. No need to leave. Exit reduced to zero.

**Transition pattern:** While a reducible exit still exists, treat it as bridgeable (Section 3c). When the in-app data becomes reliable, remove the link-out and the return prompt.

### 3c. Bridgeable Exits (29 scenarios)

Chef will always go external, but ChefFlow can smooth the round-trip by capturing what they learned.

**UI treatment:**

- External link with icon
- On return: lightweight intel-capture prompt (see Section 4)
- Context passed through `returnContext` prop so the prompt knows which entity and field to suggest

**Worked example: Chef researches a new client on Instagram**

Scenario #14 from the analysis. Chef has a new inquiry from "Sarah." Before the tasting, they want to learn about her lifestyle and dietary preferences.

1. Chef is on Sarah's client profile in ChefFlow
2. Client profile has a "Research" section with links: Instagram, Facebook, LinkedIn (if stored), or a generic "Search for [client name]" link
3. Chef clicks Instagram link. Opens in new tab.
4. Chef browses Sarah's Instagram. Sees she posts a lot of vegan food. Notes she has two kids.
5. Chef alt-tabs back to ChefFlow. Sarah's client profile is still showing.
6. Return-capture prompt appears as a dismissible toast at the bottom of the viewport:

   > "Back from research? Add notes to Sarah's profile."
   > [Add Dietary Note] [Add General Note] [Dismiss]

7. Chef clicks "Add Dietary Note." An inline text field expands (or the dietary preferences section scrolls into view and focuses). Chef types "Vegan. Two kids."
8. Saved. Done.

**Worked example: Chef checks weather for Saturday's outdoor event**

Scenario #58. Chef is on the event detail page for "Martinez Farm Dinner, Saturday."

1. Event detail page shows a "Weather" link in the event info section: "Check weather for [event date] in [event location]"
2. Link opens weather.com (or similar) for that location and date. New tab.
3. Chef sees 60% chance of rain Saturday afternoon.
4. Chef returns to ChefFlow. Event detail page is still showing.
5. Return-capture prompt:

   > "Add weather note to Martinez Farm Dinner?"
   > [Add Note] [Dismiss]

6. Chef clicks "Add Note." Inline note field focuses. Chef types "Rain likely Saturday PM. Confirm tent rental with vendor."
7. Saved to event notes.

**Worked example: Chef checks ingredient price at a store**

Scenario #4. Chef is costing a menu and needs to check the price of saffron (specialty item PIE does not cover).

1. Chef is on the menu cost breakdown. Saffron shows "No PIE data. Check specialty vendors."
2. Link opens a spice vendor website in new tab.
3. Chef finds saffron at $12.99/gram.
4. Returns to ChefFlow. Menu cost page is still showing.
5. Return-capture prompt:

   > "Update saffron price? $\_\_\_\_"
   > [Update] [Dismiss]

6. Chef types 12.99, clicks Update. Price pins to the ingredient for this menu. Menu cost recalculates.

---

## 4. Return Capture Prompt

### Rule: For bridgeable exits, surface a lightweight prompt when the chef returns. Never a modal. Always dismissible. Pre-filled with context.

**Implementation: `ReturnCapturePrompt` component**

```tsx
// components/ui/return-capture-prompt.tsx
interface ReturnCapturePromptProps {
  entityType: 'client' | 'event' | 'ingredient' | 'recipe' | 'vendor'
  entityId: string
  entityName: string
  exitCategory: string // "price_check" | "client_research" | "weather" | "venue" | "vendor"
  suggestedActions: SuggestedAction[]
  onDismiss: () => void
}

interface SuggestedAction {
  label: string // "Update price" | "Add dietary note"
  field?: string // which field to focus/prefill
  type: 'text' | 'number' | 'note'
}
```

**Visual design:**

- Position: bottom of viewport, above any persistent footer/nav
- Style: dismissible banner, not a toast (toasts auto-dismiss; this should persist until the chef acts or dismisses)
- Width: max 480px, centered or right-aligned
- Content: one sentence context + 1-2 action buttons + dismiss (X)
- Animation: slide up on appear, slide down on dismiss
- No sound, no badge, no attention-grabbing color. Muted background (stone-800/90), subtle border.

**Trigger logic:**

The prompt fires when:

1. The `ExternalLink` component registered a `returnContext` before the chef left
2. The document regains visibility (`visibilitychange` event, `document.visibilityState === 'visible'`)
3. The `returnContext` is still valid (chef has not navigated away from the originating page)

**Trigger timing:**

- Delay 500ms after tab regains focus (avoid firing during rapid tab-switching)
- Only fire once per exit. If dismissed, do not re-prompt for the same exit.
- If the chef navigated to a different page while away (they had ChefFlow open in another tab too), do not fire.

**Dismissal behavior:**

- X button dismisses immediately, no confirmation
- Clicking an action button opens the inline field, then the prompt transforms to show the input
- After successful save, prompt auto-dismisses with a subtle "Saved" confirmation (1.5s)
- Prompt auto-dismisses after 30 seconds of inactivity if no interaction

**Storage:**

- `returnContext` stored in `sessionStorage` (per-tab, not cross-tab)
- Key: `cf-return-context`
- Value: JSON with `entityType`, `entityId`, `entityName`, `exitCategory`, `timestamp`, `originPath`
- Cleared on dismiss, successful capture, or navigation away from origin page

---

## 5. Breadcrumb Memory (In-App Context Stack)

### Rule: When a chef navigates deep within ChefFlow (recipe to ingredient to PIE data to menu), maintain a task-context stack so they can snap back.

**What already exists:**

- `BreadcrumbBar` shows path-based breadcrumbs (Dashboard > Recipes > Recipe). This handles hierarchical navigation.
- `BreadcrumbTracker` records all navigation events with referrer paths. This is the data layer.
- Browser back button works for linear navigation.

**What this spec adds: "Snap Back" for cross-domain navigation**

When a chef navigates across domains (e.g., from an event page to a recipe page to an ingredient page), the path-based breadcrumb loses the event context. The chef sees "Dashboard > Ingredients > Ingredient" but started from an event.

**Snap-Back Stack:**

A lightweight in-memory stack (client-side, `sessionStorage`) that tracks cross-domain jumps:

- When the chef navigates from Domain A to Domain B via an in-app link, push Domain A's path onto the snap-back stack.
- Show a persistent "Back to [Event Name]" chip in the breadcrumb bar (left side, before the path breadcrumbs).
- Clicking the chip navigates back to the exact path in Domain A.
- Stack depth: max 3. Deeper than 3 cross-domain jumps means the chef is browsing, not task-focused. Oldest entry drops off.

**Visual treatment:**

```
[← Back to Martinez Dinner]  Dashboard > Ingredients > Atlantic Salmon
```

The snap-back chip:

- Appears only when the current path domain differs from the origin domain
- Muted background (stone-800), subtle border, small left-arrow icon
- Shows entity name, not just page type ("Back to Martinez Dinner" not "Back to Event")
- Disappears when the chef uses it or navigates back to the origin domain naturally

**Implementation notes:**

- The `BreadcrumbBar` already handles layout and rendering. Add the snap-back chip as a conditional prefix.
- Use `sessionStorage` key `cf-snap-back-stack` with an array of `{ path: string, label: string, domain: string }`.
- Domain detection: extract from the first meaningful path segment (events, clients, recipes, menus, etc.).

---

## 6. Mobile Considerations

On mobile, app-switching (not tab-switching) is the norm. Context loss is worse because:

- The browser may unload the background tab to save memory
- The chef's thumb is already in a different app's muscle memory
- Re-navigating on a small screen takes more taps

**Mobile-specific rules:**

- All external links still open in new tabs (mobile browsers handle this as new tabs or in-app browsers)
- Return-capture prompt uses bottom-sheet style (full-width at bottom, larger tap targets, 48px minimum)
- Snap-back chip moves to below the breadcrumb bar on mobile (larger tap target, more visible)
- If the browser unloaded the tab and the page reloads on return, check `sessionStorage` for `cf-return-context` and show the prompt after rehydration. This handles the "background tab killed" scenario.

**Deep-link return (future consideration):**

If ChefFlow becomes a PWA (already built, activation pending per MEMORY.md), the service worker can intercept the "app switch back" event and restore context. This spec does not require PWA; it works with standard browser tabs. But the `sessionStorage` approach is PWA-compatible.

---

## 7. Component Inventory

This pattern introduces or modifies these components:

| Component                                    | Status     | Purpose                                                         |
| -------------------------------------------- | ---------- | --------------------------------------------------------------- |
| `components/ui/external-link.tsx`            | **New**    | Standardized external link with icon, exit type, return context |
| `components/ui/return-capture-prompt.tsx`    | **New**    | Dismissible banner for intel capture on return                  |
| `components/navigation/breadcrumb-bar.tsx`   | **Modify** | Add snap-back chip for cross-domain navigation                  |
| `components/activity/breadcrumb-tracker.tsx` | **Modify** | Track external link clicks as `link_out` breadcrumb type        |

**No new routes. No new pages. No database changes.** All state is client-side (`sessionStorage`).

---

## 8. Integration Points

### With BreadcrumbTracker

When a chef clicks an `ExternalLink` component, record a `link_out` breadcrumb event:

```ts
trackBreadcrumb('link_out', 'Amazon - Atlantic Salmon', {
  exitType: 'bridgeable',
  entityType: 'ingredient',
  entityId: '...',
  externalUrl: 'https://amazon.com/...',
})
```

This feeds the retrace timeline and enables analytics on exit patterns.

### With Universal Interface Philosophy

This spec complies with:

- **Section 1.1:** The interface serves the work. Return prompts reduce re-navigation work.
- **Section 7 (Feedback):** Return-capture prompt is "action suggested" urgency (persistent, dismissible banner). Not informational (too transient) or action-required (too aggressive).
- **Section 11 (Anti-patterns):** No modals. No competing CTAs. One primary action per prompt.

### With Surface Grammar Governance

The return-capture prompt is mode-aware:

- In `editing` mode (recipe, menu): prompt suggests field updates
- In `planning` mode (event): prompt suggests notes
- In `triage` mode (dashboard): no prompt (chef is context-switching, not task-focused)
- In `browsing` mode: no prompt (chef is exploring, not on a mission)

---

## 9. Applies To

These exit-point scenarios from the analysis should implement this pattern:

### Bridgeable exits (use return-capture prompt):

| #   | Scenario                         | Return prompt suggestion                                     |
| --- | -------------------------------- | ------------------------------------------------------------ |
| 4   | Specialty ingredient price check | "Update [ingredient] price to $\_\_\_?"                      |
| 5   | Seasonal availability check      | "Mark [ingredient] as [available/unavailable] for [season]?" |
| 11  | Vendor contact                   | "Add note to [vendor name]?"                                 |
| 14  | Client research (social media)   | "Add notes to [client name]?"                                |
| 15  | Client social for event context  | "Pin reference to [event name]?"                             |
| 16  | Client company research          | "Add company info to [client name]?"                         |
| 18  | Client venue/home map            | "Add venue notes to [event name]?"                           |
| 31  | Vendor coordination              | "Add vendor note to [event name]?"                           |
| 39  | Informal payment logging         | "Log payment from [client name]?"                            |
| 43  | Route planning                   | "Add travel time to [event name]?"                           |
| 57  | Venue kitchen research           | "Update venue specs for [event name]?"                       |
| 58  | Weather check                    | "Add weather note to [event name]?"                          |

### Reducible exits (treat as bridgeable until eliminated):

| #   | Scenario                     | In-app solution target          |
| --- | ---------------------------- | ------------------------------- |
| 1   | Menu costing on store apps   | PIE coverage + freshness        |
| 2   | Specific ingredient price    | Real-time PIE lookup            |
| 3   | Multi-store price comparison | PIE comparison dashboard        |
| 6   | Wholesale pricing            | Vendor price import             |
| 7   | Food cost % modeling         | Menu cost modeler               |
| 23  | Food safety reference        | Built-in safety reference table |
| 38  | Payment status check         | Stripe status in-app            |

### Permanent exits (clean link-out only):

All scenarios marked "Permanent exit" in the analysis (8, 9, 10, 19-21, 25-27, 30, 32-37, 44-46, 48-55, 60-64). Use the `ExternalLink` component with `exitType="permanent"`. No return prompt.

---

## 10. Rollout Strategy

This pattern applies universally but should be built and tested incrementally:

**Phase 1: Foundation**

- Build `ExternalLink` component
- Audit and replace all raw `<a target="_blank">` with `ExternalLink` across the codebase
- Add `link_out` tracking to `BreadcrumbTracker`
- Build snap-back stack in `BreadcrumbBar`

**Phase 2: Return Capture (Event Context)**

- Build `ReturnCapturePrompt` component
- Wire to event detail page: weather link, venue link, map link
- Test the visibility-change trigger on desktop and mobile

**Phase 3: Return Capture (Costing Context)**

- Wire to ingredient/menu costing pages: price check links
- Pre-fill ingredient name and current price in the prompt

**Phase 4: Return Capture (Client Context)**

- Wire to client profile: social media links, company links
- Prompt for dietary notes, general notes, company info

---

## Edge Cases

| Scenario                                                                   | Behavior                                                                                                                                                                     |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chef opens 3 external links from same page                                 | Only the most recent `returnContext` is stored. One prompt on return.                                                                                                        |
| Chef opens external link, then navigates away in ChefFlow before returning | `returnContext` invalidated (origin path no longer matches). No prompt.                                                                                                      |
| Chef returns after 10+ minutes                                             | Prompt still fires (no timeout on context validity). Chef can dismiss.                                                                                                       |
| Chef has ChefFlow open in two tabs                                         | `sessionStorage` is per-tab. Each tab manages its own context. No cross-tab interference.                                                                                    |
| Browser kills background tab (mobile)                                      | Page reloads on return. `sessionStorage` persists. Prompt fires after rehydration. App state (form inputs, scroll) is lost; this is a browser limitation, not solvable here. |
| Chef dismisses every prompt for weeks                                      | No learning/suppression. Prompts remain opt-in and dismissible. If analytics show >90% dismiss rate for a specific prompt type, revisit that prompt's usefulness.            |
| External link fails (404, timeout)                                         | Not ChefFlow's problem. The link opened in a new tab; the external site handles its own errors. ChefFlow's tab is unaffected.                                                |

---

## Anti-Patterns (Forbidden)

- **Never use a modal** for return capture. Modals block work. This is a suggestion, not a gate.
- **Never auto-fill a field** with guessed data. The prompt asks the chef to type; it does not assume what they learned.
- **Never fire the prompt in triage or browsing mode.** The chef is multitasking, not on a focused task.
- **Never persist return context in the database.** This is ephemeral, per-tab, per-session state. `sessionStorage` only.
- **Never prompt for permanent exits.** If ChefFlow cannot predict what intel was gathered, do not ask.
- **Never navigate away from ChefFlow for an external link.** This is the foundational rule. Violating it breaks the entire pattern.
- **Never use `window.location.href`** for external URLs. Always `target="_blank"` or `window.open`.

---

## Verification Steps

1. Open any page with external links. Every link opens in a new tab. ChefFlow tab is undisturbed.
2. Every external link shows the `ExternalLink` icon suffix.
3. Click a bridgeable external link (e.g., weather from event page). Switch back. Return-capture prompt appears within 1 second.
4. Dismiss the prompt. It does not reappear for the same exit.
5. Click a permanent external link (e.g., YouTube from recipe page). Switch back. No prompt.
6. Navigate cross-domain (event to recipe to ingredient). Snap-back chip appears with the event name.
7. Click snap-back chip. Returns to the exact event page.
8. On mobile: prompt uses bottom-sheet style with large tap targets.
9. Close the ChefFlow tab entirely, reopen the URL. No stale prompts fire (context cleared on new session).

---

## Out of Scope

- Session restore after tab close (different feature, larger scope)
- Tracking what the chef actually did on external sites (privacy violation, technically impossible)
- Replacing permanent exits with in-app alternatives (each is its own feature spec)
- Push notifications for "come back to ChefFlow" (aggressive, unwanted)
- Cross-device context sync (chef starts on laptop, returns on phone; requires auth-layer state, not session-layer)
