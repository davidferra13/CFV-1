# Build: Mobile Readiness — Full-Time Tablet + Phone Use

**Branch:** `feature/scheduling-improvements`
**Date:** 2026-02-21

---

## What This Build Does

Makes ChefFlow fully usable for full-time tablet and phone use. The PWA foundation (bottom tabs, safe-area insets, offline fallback, manifest) was already solid. This build fixes the two main blockers for daily phone use — page length — plus three global polish items.

---

## Changes Made

### 1. Dashboard — Mobile Priority Strip + Collapsible Analytics

**File:** [app/(chef)/dashboard/page.tsx](<../app/(chef)/dashboard/page.tsx>)
**New file:** [components/dashboard/mobile-dashboard-expander.tsx](../components/dashboard/mobile-dashboard-expander.tsx)

The dashboard rendered ~35 sections as a single vertical stack (~8,000–10,000px on mobile). On phone, a chef doesn't need revenue trends and AAR stats — they need today's schedule and the priority queue.

**Solution:** Everything from the Service Quality section downward is now wrapped in `<MobileDashboardExpander>`. On phones (< 768px), this section collapses behind a "Analytics & more" toggle button. On tablet/desktop (md+), it's a transparent passthrough — no behavioral change.

**Always visible on mobile:**

- Priority banner (next action / all caught up)
- Scheduling gap warning
- Onboarding checklist
- Upcoming calls
- Pending collaborations / recipe shares
- Recipe debt
- Today's schedule
- Next action card
- Week strip
- Priority queue
- Overdue follow-ups
- DOP task digest
- Prep prompts

**Behind "Analytics & more" on mobile (expanded on tablet+):**

- Service quality / AAR
- Business snapshot (all metric cards)
- YoY comparison
- Pipeline forecast
- Hours log
- Stuck events
- Dormant clients
- Seasonality
- Activity feed / live presence
- Career journal
- Todo list
- Everything else

### 2. Event Detail — 4-Tab Mobile Navigation

**File:** [app/(chef)/events/[id]/page.tsx](<../app/(chef)/events/[id]/page.tsx>)
**New file:** [components/events/event-detail-mobile-nav.tsx](../components/events/event-detail-mobile-nav.tsx)

The event detail page rendered ~40 sections in a single scroll (~8,000–12,000px on mobile). On a dinner day, you need event info and status — not the full analytics dump.

**Solution:** A sticky 4-tab bar appears below the event header on mobile only. State is stored in the URL (`?tab=overview|money|ops|wrap`) so it survives refresh and is linkable. On tablet/desktop (md+), the tab bar is hidden and all sections render in full scroll as before.

| Tab          | Sections                                                                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview** | Event details + client info grid, client portal QR, service contract, guests, communication log                                                                                             |
| **Money**    | Menu approval, financial summary, record payment, payment plan, mileage, tips, refund, budget, receipts, expenses, profit, loyalty                                                          |
| **Ops**      | Time tracking, staff, collaborators, temp log, substitutions, menu mods, carry-forward, unused ingredients, contingency, documents, readiness gate, FSM transitions, closure checklist, AAR |
| **Wrap-up**  | File AAR CTA, debrief CTA, client survey, transition history                                                                                                                                |

**Always visible (above tabs on all sizes):**

- Header (title, date, action buttons)
- All status banners (collaborator role, deposit shortfall, TAC conversion, quick debrief prompt)
- DOP progress bar
- Packing progress
- Prep block nudge
- Prep schedule

### 3. Tap Target — Hamburger Menu Button

**File:** [components/navigation/chef-nav.tsx](../components/navigation/chef-nav.tsx)

Mobile top header hamburger button: `p-2` → `p-2.5` for a larger tap target (~44px).

### 4. inputMode on Numeric Inputs

**File:** [components/events/event-form.tsx](../components/events/event-form.tsx)

Three inputs now get the correct mobile keyboard:

- Guest count: `inputMode="numeric"` → number pad (no decimal)
- Quoted price: `inputMode="decimal"` → number pad with decimal
- Deposit amount: `inputMode="decimal"` → number pad with decimal

### 5. Pre-existing Bug Fix — allergen-risk.ts

**File:** [lib/ai/allergen-risk.ts](../lib/ai/allergen-risk.ts)

Untracked file with a Supabase type instantiation error blocking the build. Fixed by using a typed `any` cast for tables not yet in the generated schema (`event_guests`, `event_menu_components`). Explicit tuple type annotation preserves the contract downstream.

---

## What Was NOT Changed

- Bottom tab bar navigation — already working
- Top header (PWA, safe areas) — already correct
- FAB quick capture — already correct
- Content wrapper padding — already correct
- Inbox page — already mobile-friendly (simple vertical stack)
- PWA manifest, service worker, offline fallback — already correct

---

## Architecture Notes

- `MobileDashboardExpander` is `'use client'` with a simple `useState(false)` for expanded state. Uses `md:contents` (CSS display: contents) to make the wrapper transparent on tablet+.
- `EventDetailMobileNav` uses `useSearchParams` + `router.replace()` with `scroll: false` so switching tabs doesn't jump to top.
- `EventDetailSection` is a pure presentational wrapper — shows/hides with `hidden md:contents` based on `activeTab === tab`. The server page reads `searchParams.tab` and passes `activeTab` directly to each `EventDetailSection`.
- All section groupings are `md:contents` on tablet+ so existing CSS layout (gaps, spacing) is unchanged — no grid or flex container disruption.

---

## Verification Checklist

**Phone (375px viewport):**

- [ ] Dashboard: only the priority strip loads; "Analytics & more" button appears at bottom; tap it to expand analytics
- [ ] Event detail: 4 tabs (Overview / Money / Ops / Wrap-up) visible below header; tab switching works without page jump
- [ ] Overview tab: shows event details grid + client info + comms
- [ ] Money tab: shows financial summary + payments + expenses
- [ ] Ops tab: shows staff, transitions, closure checklist
- [ ] Wrap-up tab: shows debrief prompts, history
- [ ] Event form: number inputs open numeric keypad on phone
- [ ] Hamburger button is easily tappable

**Tablet (768px+):**

- [ ] Dashboard: no "Analytics & more" button; all sections render in full scroll as before
- [ ] Event detail: no tab bar; all sections render in full scroll as before

**Build:**

- [x] `npx tsc --noEmit --skipLibCheck` — zero errors in `app/` and `components/`
- [x] `npx next build --no-lint` — exit 0
