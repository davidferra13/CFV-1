# UX Refinement Phase 1 - Implementation Notes

**Date:** 2026-03-15
**Branch:** feature/openclaw-adoption
**Companion:** `docs/research/ux-refinement-master-plan.md`

---

## What Changed

### 1. Command Palette Recents (Enhancement)

**Files:** `components/search/command-palette.tsx`

The command palette (Ctrl+K) already existed with fuzzy search, keyboard nav, and data search. This change wires up the existing `lib/search/search-recents.ts` infrastructure so that:

- When opening with no query, up to 5 recent selections appear at the top (blue "Recent" section)
- When a user selects a data result (client, event, inquiry, etc.), it's saved to localStorage
- Quick actions and nav-only items are NOT saved (they're always available)
- ARIA accessibility fixes: added `aria-label` to search input, fixed `aria-selected` string type

### 2. Sidebar Nav Declutter (Phase 1c)

**Files:** `components/navigation/nav-config.tsx`

Removed 11 items from `standaloneTop` that were duplicated in nav groups:

| Removed from standaloneTop | Still accessible via |
| -------------------------- | -------------------- |
| Rate Card                  | Sales group          |
| Staff                      | Operations group     |
| Tasks                      | Operations group     |
| Stations                   | Operations group     |
| Commerce (hub)             | Commerce group       |
| POS Register               | Commerce group       |
| Virtual Terminal           | Commerce group       |
| Table Service              | Commerce group       |
| Promotions                 | Commerce group       |
| Observability              | Commerce group       |
| Clover Parity              | Commerce group       |

All items remain accessible via their nav groups AND the command palette (Ctrl+K). Focus Mode (`coreFeature: true`) items were NOT removed.

### 3. Time-Aware Dashboard Sections (Phase 2b)

**Files:** `app/(chef)/dashboard/page.tsx`

Dashboard sections now reorder based on time of day:

| Time                  | Section Order                               | Why                                   |
| --------------------- | ------------------------------------------- | ------------------------------------- |
| Morning (before noon) | Schedule > Intelligence > Alerts > Business | Chef needs to know today's plan first |
| Afternoon (noon-5pm)  | Schedule > Alerts > Business > Intelligence | Active event time, alerts matter more |
| Evening (after 5pm)   | Business > Alerts > Schedule > Intelligence | End-of-day financials, wrap-up        |

The greeting subtitle also changes:

- Morning: "Here's your schedule and what needs attention today."
- Afternoon: "Check your alerts and upcoming events."
- Evening: "Here's your end-of-day financial summary."

This is a sort-order change only. All sections still render regardless of time.

---

## What Was Already Done (by previous agent)

- Command Palette component (Phase 1a)
- Hero Metrics row (Phase 2c) with 4 always-visible stats
- Focus Mode default ON for new users (Phase 1b)
- Keyboard shortcuts (Ctrl+K, /, ?, chord shortcuts)
- Universal search across 12 data types

## What's Next (Remaining Roadmap)

- Phase 1d: Customizable Mobile Bottom Tabs
- Phase 2a: Reduce Default Widget Count (8-12 starter set)
- Phase 3: Tab-by-Tab Refinement (Inquiries > Events > Clients > Finance > Recipes)
