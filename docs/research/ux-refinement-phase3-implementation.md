# UX Refinement Phase 3: Tab-by-Tab Refinement

> **Date:** 2026-03-16
> **Branch:** feature/openclaw-adoption
> **Status:** Complete

## Summary

Phase 3 systematically improved each major section's UX based on the competitive research in `ux-refinement-master-plan.md`. Focus was on high-impact, low-risk changes that improve daily workflows without redesigning existing architecture.

---

## 3a: Inquiries - Response Urgency

**Problem:** Inquiry list items showed status badges but no visual urgency for how long a lead has been waiting for chef action.

**Solution:** Added waiting-time urgency indicators on list items where chef action is needed (status = `new` or `awaiting_chef`).

**Changes:**

- `app/(chef)/inquiries/page.tsx`: Added urgency dot (green/amber/red) based on hours since last update
  - Under 24h: green dot (ok)
  - 24-48h: amber dot (warm)
  - 48h+: red pulsing dot (hot, urgent)
- Added hover hint "Click to respond" on actionable inquiries
- Added `group` class for hover state management

**Why:** Stripe and Linear both use urgency indicators on list items. A chef glancing at their pipeline can instantly see which leads are going cold without clicking into each one.

---

## 3b: Events - Assessment

**Finding:** The event detail page is already well-organized:

- Mobile tabs: Overview > Money > Ops > Wrap-up (matches workflow)
- Kanban board has stuck indicators (amber 4-7d, red 7d+)
- Status color borders on cards
- Drag-drop transitions between valid states

**Decision:** No changes needed. Current architecture matches or exceeds competitive benchmarks.

---

## 3c: Clients - Quick Actions on List

**Problem:** Client list rows had no per-row actions. The only interaction was clicking the entire row to navigate to the detail page. Creating an event or sending a message required navigating to the detail page first, then scrolling to find the right action.

**Solution:** Added a quick-actions column that appears on hover with three icon buttons:

- Calendar+ icon: Create event for this client (links to `/events/new?client_id=`)
- Message icon: Jump to communication section (`/clients/[id]#communication`)
- External link icon: View full profile

**Changes:**

- `app/(chef)/clients/clients-table.tsx`: Added Actions column header, `group` class on rows, quick action icon buttons with `stopPropagation` to prevent row click navigation

**Why:** Square and Toast both show contextual actions on list hover. The two most common next-actions after finding a client are "create event" and "send message." These are now one click away.

---

## 3d: Finance - P&L Snapshot on Hub

**Problem:** The P&L report existed only inside the Reporting sub-section, requiring two clicks to reach. The finance hub showed revenue/refunds/net but no expenses or profit margin at a glance.

**Solution:** Added a "P&L Snapshot" card on the finance hub that shows the current month's revenue, expenses, net profit/loss, and margin percentage.

**Changes:**

- `app/(chef)/finance/page.tsx`: Added `MonthlyPLSnapshot` server component that fetches `getProfitAndLossReport` for the current month. Renders as a 4-column grid (Revenue, Expenses, Net, Margin) with color coding (green for profit, red for loss). Links to full report.

**Why:** Stripe puts the most important financial metrics on the landing page. A chef checking their finances should see profitability immediately, not after navigating through sub-pages.

---

## 3e: Recipes - Photo Thumbnails on Grid Cards

**Problem:** Recipe grid cards showed only text (name, category badge, description, metadata). The `photo_url` field was available on `RecipeListItem` but not rendered in grid view. The CoverFlow view used photos, but the default grid view did not.

**Solution:** Added a photo/gradient header to each recipe card in grid view:

- If the recipe has a `photo_url`: shows the photo as a cover image (object-cover, 128px height)
- If no photo: shows a category-specific gradient background with the first letter of the recipe name as a large watermark
- Category badge overlaid on the top-right corner of the image area

**Changes:**

- `app/(chef)/recipes/recipes-client.tsx`:
  - Added `CATEGORY_GRADIENTS` map (14 categories, each with a distinct gradient)
  - Replaced flat card layout with photo header + content layout
  - Used `<img>` with `loading="lazy"` for performance
  - Card gets `overflow-hidden` for rounded image corners

**Why:** Every major recipe platform (Paprika, Mealie, Notion recipe templates) shows photos in card view. Visual recognition is faster than reading text. Even without photos, the gradient + initial letter creates visual variety that makes scanning easier.

---

## Files Changed

| File                                                   | Change                                |
| ------------------------------------------------------ | ------------------------------------- |
| `app/(chef)/inquiries/page.tsx`                        | Urgency dots, hover hints             |
| `app/(chef)/clients/clients-table.tsx`                 | Quick action column with icon buttons |
| `app/(chef)/finance/page.tsx`                          | Monthly P&L snapshot component        |
| `app/(chef)/recipes/recipes-client.tsx`                | Photo thumbnails, category gradients  |
| `docs/research/ux-refinement-phase3-implementation.md` | This document                         |
