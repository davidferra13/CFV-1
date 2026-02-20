# Remaining Placeholder Pages — Implementation

**Branch:** `feature/packing-list-system`
**Status:** Complete — all 36 placeholder pages implemented

---

## Overview

This document covers the implementation of every placeholder page identified in the codebase audit. All pages were converted from 8-line stubs (`"This section is currently being built."`) to real, data-connected server components.

The culinary section (9 pages) was implemented in a prior session and documented in `docs/culinary-section-implementation.md`. This document covers the remaining 27 pages across Finance, Partners, Clients, and Leads.

---

## Architecture Pattern

All pages follow the same server component pattern:

```typescript
import { requireChef } from '@/lib/auth/get-user'
// ...data action imports...

export default async function PageName() {
  await requireChef()
  const data = await getSomeAction()
  // render
}
```

No client components, no `"use client"` — all data is fetched server-side at request time with full tenant scoping via RLS.

**Key field note:** The clients table uses `full_name` (not `name`) as the display field. All client list pages use `client.full_name`.

---

## Finance (1 page)

### `/finance`
**File:** `app/(chef)/finance/page.tsx`
**Implementation:** Server-side redirect to `/financials`.
**Rationale:** `/finance` and `/financials` were duplicating the same concept. The full financials dashboard already lives at `/financials`, so `/finance` simply redirects there.

---

## Partners (2 pages)

### `/partners/referral-performance`
**File:** `app/(chef)/partners/referral-performance/page.tsx`
**Data:** `getPartnerLeaderboard()` + `getConversionRatesBySource()` from `lib/partners/analytics`
**UI:**
- Summary cards: total partner revenue, events from partners, total partner inquiries
- Partner Leaderboard table: rank, name (linked), type, inquiries, events, completed, revenue, conversion rate
- Conversion by Channel table: channel name, inquiries, confirmed, completed, conversion rate

### `/partners/events-generated`
**File:** `app/(chef)/partners/events-generated/page.tsx`
**Data:** `getPartnerLeaderboard()` from `lib/partners/analytics`
**UI:**
- Filters to partners with `event_count > 0`, sorted by event volume
- Summary cards: total events, completed events, partner-attributed revenue
- Table: name (linked), type, events, completed, guests served, revenue

---

## Clients — Parent Hubs (6 pages)

### `/clients/new`
**File:** `app/(chef)/clients/new/page.tsx`
**Implementation:** Redirect to `/clients`. New client creation is handled via the main clients page modal/form.

### `/clients/communication`
**File:** `app/(chef)/clients/communication/page.tsx`
**Data:** `getClientsWithStats()`
**UI:** Hub with 3 tool cards (Notes, Follow-Ups, Upcoming Touchpoints) + recently active clients list sorted by `lastEventDate`.

### `/clients/history`
**File:** `app/(chef)/clients/history/page.tsx`
**Data:** `getClientsWithStats()`
**UI:** Hub with aggregate stats (total events, lifetime revenue, clients with past events) + 3 view cards (Event History, Past Menus, Spending History).

### `/clients/preferences`
**File:** `app/(chef)/clients/preferences/page.tsx`
**Data:** `getClientsWithStats()`
**UI:** Summary cards (dietary restriction count, allergy count, preference count) + 4 view cards in 2×2 grid.

### `/clients/loyalty`
**File:** `app/(chef)/clients/loyalty/page.tsx`
**Data:** `getClientsWithStats()`
**UI:** Enrolled count, total points, tier distribution badges + 2 view cards (Points, Rewards).

### `/clients/insights`
**File:** `app/(chef)/clients/insights/page.tsx`
**Data:** `getClientsWithStats()`
**UI:** 4 KPI cards (top client by revenue, most frequent, average lifetime spend, at-risk count) + 3 sub-view cards.

---

## Clients — Insights Sub-Pages (3 pages)

### `/clients/insights/top-clients`
**File:** `app/(chef)/clients/insights/top-clients/page.tsx`
**Data:** `getClientsWithStats()` sorted by `totalSpentCents` descending
**UI:** Table with rank, client (linked), events, lifetime spend, avg per event, share of total revenue, last event date.

### `/clients/insights/most-frequent`
**File:** `app/(chef)/clients/insights/most-frequent/page.tsx`
**Data:** `getClientsWithStats()` sorted by `totalEvents` descending
**UI:** Table with rank, client (linked), event count, total spend, avg per event, last event date.

### `/clients/insights/at-risk`
**File:** `app/(chef)/clients/insights/at-risk/page.tsx`
**Data:** `getClientsWithStats()` filtered to `lastEventDate > 90 days ago`
**UI:** Table sorted by most stale first. Days-since colored amber (90–180d) or red (180d+).

---

## Clients — Preferences Sub-Pages (4 pages)

All preference sub-pages:
- Filter `getClientsWithStats()` by the relevant field
- Show a "Most Common" tag cloud aggregated across all clients
- Render a table of clients with their values as colored pill badges

### `/clients/preferences/dietary-restrictions`
Filters to clients where `dietary_restrictions` array is non-empty. Amber pills.

### `/clients/preferences/allergies`
Filters to clients where `allergies` array is non-empty. Red pills (safety-critical).

### `/clients/preferences/favorite-dishes`
Filters to clients where `favorite_dishes` array is non-empty. Green pills.

### `/clients/preferences/dislikes`
Filters to clients where `dislikes` array is non-empty. Stone/gray pills.

---

## Clients — History Sub-Pages (3 pages)

### `/clients/history/event-history`
**Data:** `getEvents()` filtered to `event_date < now`, sorted newest first
**UI:** Summary cards (past events, completed, revenue). Full table with date, client (linked), occasion, guest count, status badge, total (`quoted_price_cents`), link to event.

### `/clients/history/past-menus`
**Data:** `getMenus()` filtered to non-template menus with `status='locked'` or `'archived'`
**UI:** Shows approved and archived event menus with service style, cuisine, status badge, created date.

### `/clients/history/spending-history`
**Data:** `getClientsWithStats()` sorted by `totalSpentCents` descending
**UI:** Summary cards (total revenue, average per client, top spender). Table with rank, client, total spend (+ % of total), events, avg per event, last event.

---

## Clients — Loyalty Sub-Pages (2 pages)

### `/clients/loyalty/points`
**Data:** `getClientsWithStats()` filtered to `loyalty_points > 0`, sorted by points descending
**UI:** Total outstanding points + members count. Table with client (linked), tier badge, points balance, total events.

### `/clients/loyalty/rewards`
**Data:** `getVoucherAndGiftCards()` + `getIncentiveStats()` from `lib/loyalty/voucher-actions`
**UI:** 4 summary cards (total issued, active, redeemed, value applied). Table with code (monospace), type badge, value, status badge, issued date, expiry.

---

## Clients — Communication Sub-Pages (3 pages)

### `/clients/communication/notes`
**Data:** `getClientsWithStats()` filtered by `vibe_notes` field
**UI:** Clients with notes shown as expanded cards with full note preview. Clients without notes shown as a compact pill list linking to their profile to add notes.

### `/clients/communication/follow-ups`
**Data:** `getClientsWithStats()` filtered to past clients with `lastEventDate > 30 days ago`
**UI:** 3 priority buckets (Overdue 180d+, At-Risk 90–180d, Check In 30–90d). Table sorted by most stale first with urgency badge coloring.

### `/clients/communication/upcoming-touchpoints`
**Data:** `getEvents()` filtered to non-cancelled events in the next 60 days
**UI:** 3 time-window cards (this week, this month, next 30–60 days). Table with date, days-away (color-coded red ≤7d, amber ≤14d), client (linked), occasion, guests, status badge.

---

## Leads Sub-Pages (5 pages)

The leads system has no dedicated pipeline table. Pipeline stages map to inquiry statuses filtered by `channel='website'`:

| Stage | Filter |
|---|---|
| New | Unclaimed contact submissions (main `/leads` page) |
| Contacted | `channel='website'`, `status` in `['new', 'awaiting_client', 'awaiting_chef']` |
| Qualified | `channel='website'`, `status='quoted'` |
| Converted | `channel='website'`, `status='confirmed'` |
| Archived | `channel='website'`, `status` in `['declined', 'expired']` |

### `/leads/new`
Redirect to `/leads` — the parent page already shows unclaimed submissions.

### `/leads/contacted`
Active website leads in communication. Status labels: `new` → "Awaiting Response", `awaiting_client` → "Awaiting Client", `awaiting_chef` → "Client Replied".

### `/leads/qualified`
Website leads with a sent quote. Shows inquiry date, occasion, guest count, event date.

### `/leads/converted`
Confirmed website leads. Shows the client's full name (from joined client profile if available).

### `/leads/archived`
Declined and expired website leads. Summary cards split by reason.

---

## What Was Not Built

Three directories exist with **no `page.tsx` at all** (not stubs — genuinely empty):

| Route | Reason not built |
|---|---|
| `/chef/[slug]/gift-cards/` | Public gift card purchase page — requires payment flow design |
| `/chef/[slug]/partner-signup/` | Public partner landing — requires partner onboarding design |
| `/partner-report/` | Public partner contribution report — requires share token auth flow |

These require dedicated product design and integration with Stripe (gift cards) or the partner reporting system before implementation.

---

## Data Sources Summary

| Action | Used by |
|---|---|
| `getClientsWithStats()` | All client insight/preference/history/loyalty pages |
| `getEvents()` | Event history, upcoming touchpoints |
| `getMenus()` | Past menus |
| `getInquiries({ channel, status })` | All leads sub-pages |
| `getPartnerLeaderboard()` | Referral performance, events generated |
| `getConversionRatesBySource()` | Referral performance |
| `getVoucherAndGiftCards()` + `getIncentiveStats()` | Rewards |
