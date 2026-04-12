# Session Digest: Nav Reduction

**Date:** 2026-04-12
**Agent:** Builder (Sonnet 4.6)
**Branch:** main

---

## What Was Discussed

The developer's core concern: the ChefFlow sidebar had grown to 346 destinations across 34 screen heights when fully expanded. Not David's personal workflow problem - a product problem for ALL chefs. A new user lands in the app and faces a wall of navigation.

Research context (prior session): Professional organizer frameworks (KonMari, Morgenstern Zone Model, Yamashita Danshari / Gate Rule, 90/90 Rule) were studied. Key synthesis: clutter = mismatch between visible and actually used. Yamashita Gate Rule: features earn visibility.

The decision: sidebar is not a sitemap. Its job is daily-driver access, not comprehensive feature directory.

---

## What Changed

**Architecture decision:** Reduce sidebar accordion groups from 13 to 5 core workflow groups. Everything else is accessible via an "All Features" gateway at `/features`.

**Core groups (kept in sidebar):** Events, Clients, Culinary, Finance, Operations, Admin (admins only)

**Removed from sidebar:** Analytics, Commerce, Marketing, Network, Pipeline, Protection, Tools

**Gateway:** "All Features" (Compass icon) added to both expanded and rail sidebar, pointing to `/features` - an already-built page that organizes all features by workflow (Get Clients, Plan Events, Cook, Get Paid, Grow, Configure).

**Implementation:** Single `CORE_GROUP_IDS` constant in `nav-config.tsx`. One-line `.filter()` in `chef-nav.tsx` and `chef-mobile-nav.tsx`. Fully reversible.

**Focus mode:** Cleaned up `STRICT_FOCUS_GROUP_IDS` to remove `pipeline` and `remy` (both were already filtered by CORE_GROUP_IDS before focus mode ran). Focus mode now shows Events + Clients only.

**USER_MANUAL.md:** Added Navigation section explaining the 3-layer structure. Fixed 4 stale "Sidebar > X" paths for removed groups (Analytics, Activity, Queue, Briefing).

---

## Decisions Made

- Hub architecture (full rewrite) rejected: too much build cost, requires new internal page nav
- Stub removal (Option A) rejected as insufficient: even without stubs, Finance/Clients had 47-73 items
- Chose: 5 core groups + All Features gateway. Pure subtraction, no new pages
- Removed groups are still indexed by universal search (Cmd+K) - accessible without sidebar
- `/features` page verified: covers all removed groups organized by workflow

---

## What the Next Agent Should Know

- `CORE_GROUP_IDS` in `components/navigation/nav-config.tsx` is the single control point for sidebar group visibility. Add a group ID there to resurface it.
- Pre-existing TSC errors in `remy-personality-engine.ts` (untracked WIP) and `remy-actions.ts` (unstaged WIP). Not from nav work. Previous build was green.
- Mobile nav slide-out was also filtered (same CORE_GROUP_IDS logic in `chef-mobile-nav.tsx`).
- The `/features` page at `app/(chef)/features/page.tsx` is the gateway for removed groups. If a feature is important enough to resurface, add it to that page first, then consider promoting to CORE_GROUP_IDS.

---

## Open Items

- The `remy-personality-engine.ts` and `remy-actions.ts` WIP errors should be resolved when Remy personality feature is completed
- Consider whether Operations group items that overlap with Action Bar (Events, Clients, Finance) create any UX confusion on mobile
- The `/features` page could add Commerce/POS, Equipment Inventory, and Supply Chain/Purchasing sections for fuller coverage of removed groups
