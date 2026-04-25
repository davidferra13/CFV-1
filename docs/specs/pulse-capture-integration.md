# Pulse & Capture Integration Spec

## Context

Two new features were built but need proper integration into ChefFlow's UI:

1. **Pulse** (`/pulse`) - Shows every client waiting on the chef, grouped by client, sorted by urgency. Server action at `lib/clients/pulse-actions.ts`, page at `app/(chef)/pulse/`.
2. **Capture** (`/capture`) - Whiteboard photo OCR + brain dump text parser. Server action at `lib/ai/parse-whiteboard.ts`, page at `app/(chef)/capture/`.

Both pages work and compile. The problem: they were temporarily added as primary nav items, which was reverted. They need proper placement that feels native to ChefFlow.

## Design Principles

- ChefFlow's primary nav is capped to a small set of core daily-workflow items (Today, Inbox, Events, Culinary, Clients, etc.)
- New features should fold into existing surfaces or use secondary placement
- Every chef needs "who's waiting on me" (universal). Whiteboard capture is a power-user workflow (available but not prominent).
- No new primary nav items. Use dashboard integration + secondary nav.

## Task 1: Add Pulse Summary to Dashboard

**Goal:** When a chef opens their dashboard (Today), the first thing they see is who's waiting on them.

### Files to modify

**`app/(chef)/dashboard/page.tsx`**

- Import `getClientPulse` from `@/lib/clients/pulse-actions`
- Call `getClientPulse()` in the page's data fetching (add to existing `Promise.all` or fetch separately)
- Render `<PulseSummary>` component ABOVE the existing `<AlertCards>` section
- Pass the pulse data as a prop

**New file: `app/(chef)/dashboard/_sections/pulse-summary.tsx`**

Create a server component that renders a compact pulse summary:

```
+--------------------------------------------------+
| 3 people waiting on you          [See all ->]    |
+--------------------------------------------------+
| [RED]  Sarah M.     New inquiry, 12 days    [->] |
| [RED]  Tom H.       Draft sitting, 8 days   [->] |
| [AMB]  Chef Mike    Quote sent, 5 days      [->] |
+--------------------------------------------------+
```

Requirements:

- Show at most 5 clients (the most urgent ones)
- Each row: urgency color indicator (left border or dot), client name, worst item label + days waiting, link to the relevant page
- "See all" links to `/pulse`
- If nobody is waiting, show a small green "All caught up" message (not a big empty state)
- Use existing `Card`, `Badge` components from `@/components/ui/`
- Wrap the data fetch in a try/catch. On error, don't render (fail invisible, not fail loud)
- This is a server component (no 'use client')

### Color mapping for urgency

```
critical -> red (border-l-red-500, text-red-600)
overdue  -> amber (border-l-amber-500, text-amber-600)
due      -> blue (border-l-blue-500, text-blue-600)
ok       -> stone (border-l-stone-300)
```

## Task 2: Add Secondary Nav Items

**Goal:** Both pages are discoverable in the sidebar without crowding primary nav.

### File to modify

**`components/navigation/nav-config.tsx`**

Find the `navGroups` array (the collapsible grouped section, not `standaloneTop`). Add entries:

1. **Pulse** - Add to the group that contains client-related items. If there's a group with clients-related items, add it there. Otherwise, add it to the first operational group.
   - `href: '/pulse'`
   - `label: 'Who\'s Waiting'`
   - `icon: Activity` (already imported)
   - No `adminOnly`, no `hidden`

2. **Capture** - Add to the group that contains tools or import-related items. If none exists, add to the operational group.
   - `href: '/capture'`
   - `label: 'Quick Capture'`
   - `icon: Camera` (already imported)
   - No `adminOnly`, no `hidden`

### IMPORTANT: Do NOT modify `standaloneTop`. Only add to `navGroups`.

## Task 3: Link from Clients Page

**Goal:** Make Pulse discoverable from the clients list page.

### File to modify

**`app/(chef)/clients/page.tsx`** (or whatever the clients list page is)

Add a small link/button near the top of the clients page:

- Text: "Who's waiting on me?"
- Links to `/pulse`
- Use `Button` with `variant="ghost"` and `size="sm"`
- Position: near the page header, right-aligned

## Guard Rails (READ THESE)

- Do NOT delete any existing files
- Do NOT modify `lib/clients/pulse-actions.ts` or `lib/ai/parse-whiteboard.ts` (they work)
- Do NOT modify `app/(chef)/pulse/` or `app/(chef)/capture/` pages (they work)
- Do NOT add primary nav items to `standaloneTop`
- Do NOT modify the database schema
- Do NOT install new packages
- After changes, run `npx tsc --noEmit --skipLibCheck` to verify. Fix any type errors.
- Use existing UI components (`Card`, `Badge`, `Button` from `@/components/ui/`)
- Follow existing import patterns in the codebase
- No em dashes anywhere
