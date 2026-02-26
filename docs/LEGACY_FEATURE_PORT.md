# Legacy Feature Port — ChefFlow MASTER → V1

**Date:** 2026-02-17
**Source:** `C:\Users\david\Desktop\ChefFlow_MASTER` (Vite + React SPA)
**Target:** ChefFlow V1 (Next.js + Supabase)

---

## What Changed

11 features/assets from the old ChefFlow project were ported into V1's architecture. The old project was a Vite + React SPA with client-side state, a separate auth-server, and Electron desktop support. Every feature was adapted to fit V1's server-action, tenant-scoped, Supabase-first architecture.

---

## 1. Logo & Branding Assets

**Files created:**

- `public/logo.svg` — Chef hat with face, orange-to-yellow gradient
- `public/logo.png` — PNG version (24KB)
- `public/favicon.svg` — CF monogram on dark gray
- `public/favicon.ico` — ICO fallback
- `public/og-image.svg` — Social sharing card (1200×630)

**Files modified:**

- `app/layout.tsx` — Added favicon, OG metadata, metadataBase, CookieConsent

**What it connects to:** Every page now has proper branding, social previews, and SEO metadata. The logo SVG can be imported into navigation components.

---

## 2. AI Correspondence Engine (Gemini)

**Files created:**

- `lib/ai/gemini-service.ts` — Server-side Gemini SDK wrapper with 6 exported functions
- `lib/ai/correspondence.ts` — ACE orchestration (draft for inquiry, simple response, follow-up)

**Architecture adaptation:**

- Old: Client-side object with methods, API key in browser env
- New: `'use server'` functions, API key server-only, tenant-scoped via `requireChef()`
- Model updated from `gemini-3-flash-preview` → `gemini-2.0-flash`

**Functions available:**

- `extractTasksFromChat()` — JSON-schema structured task extraction
- `draftChefResponse()` — Tone-aware message drafting
- `generateACEDraft()` — Full ACE pipeline with grounding stack
- `extractTechniques()` — Cooking technique analysis with confidence scores
- `inferEquipmentFromTechniques()` — Equipment phase inference (PREP/SERVICE/EITHER)
- `extractKitchenSpecs()` — Kitchen specification parsing from notes
- `draftResponseForInquiry()` — End-to-end inquiry response with calendar + client context
- `draftPostEventFollowUp()` — Thank-you note generation

**Dependency added:** `@google/genai`

---

## 3. Bulk Import Parser

**File created:** `lib/import/bulk-parser.ts`

**Architecture adaptation:**

- Old: Client-side utility
- New: Same (runs in browser) — file parsing happens client-side before server upload

**Capabilities:** CSV parsing with header detection, file type detection (csv/excel/pdf/image), progress callbacks. Excel/PDF/image parsing flagged as "use CSV for now" (same as old project).

---

## 4. Global Search

**Files created:**

- `lib/search/universal-search.ts` — Server action that searches across clients, events, inquiries, menus, recipes
- `components/search/global-search.tsx` — Client component with keyboard nav, result grouping, highlight matching

**Architecture adaptation:**

- Old: Client-side hook → `/api/search` endpoint → Supabase queries
- New: Direct server action call from client component, no API route needed
- Old had in-memory LRU cache; new relies on React's deduplication + 300ms debounce

**Search across:** Clients (name/email/phone), Events (title), Inquiries (client_name), Menus (name), Recipes (name)

---

## 5. Real-Time Messaging

**File created:** `lib/messages/realtime.ts` — Supabase Realtime subscriptions for messages

**Architecture adaptation:**

- Old: Separate WebSocket server (`api/realtime-server.js`) with JWT auth, `ws` package, broadcast model
- New: Supabase Realtime (Postgres changes) — no separate server needed
- V1 already had `lib/messages/actions.ts` with full CRUD for the communication log model
- Added: `subscribeToMessages()` and `subscribeToChefNotifications()` for real-time updates

**Key difference:** V1's messaging model is a communication LOG (recording conversations from any channel), not a chat system. The old project had a separate chat_threads/chat_messages table. V1's approach is more aligned with the private chef workflow (logging texts, emails, platform messages).

---

## 6. Menu Engineering (BCG Matrix)

**File created:** `lib/analytics/menu-engineering.ts`

**Architecture adaptation:**

- Old: Client-side stub (returned empty results) with BCG matrix types
- New: Server action with actual Supabase queries, computes quadrant assignments

**Capabilities:**

- BCG quadrant assignment (STAR, PLOWHORSE, PUZZLE, DOG)
- Food cost alerts when items exceed target percentage
- Average contribution and popularity calculations
- Per-item: sales count, selling price, food cost, contribution margin

---

## 7. Fire Order & Stations (Kitchen Ops)

**File created:** `lib/events/fire-order.ts`

**Architecture adaptation:**

- Old: Client-side React component with hardcoded data
- New: Server action that builds fire order from actual menu_sections + menu_items

**Capabilities:**

- 10 course types with color codes (AMUSE through PETIT_FOUR)
- 10 brigade station types with labels (SAUCIER through BOUCHER)
- Automatic course type inference from section names
- Station inference from item names and course type
- Lead time estimation per course type
- Fire timing calculation (15-min gaps between courses)

**Important note from old project:** The brigade station model is designed for restaurant kitchens. Private chefs typically work solo — the fire order timeline and station assignments are reference tools, not literal assignments.

---

## 8. Waste Tracking

**File created:** `lib/waste/actions.ts`

**Architecture adaptation:**

- Old: Client-side page component with in-memory state + stub service
- New: Full server actions with Supabase persistence

**Capabilities:**

- 8 waste reasons (OVERPRODUCTION, SPOILAGE, TRIM, MISTAKE, etc.)
- 9 ingredient units (g, kg, oz, lb, ml, L, each, bunch, cup)
- `logWasteEntry()` — Create waste entry with cost estimate
- `getWasteEntries()` — Filtered by reason, period, event
- `getWasteStats()` — Total cost, entry count, breakdown by reason, top reason

**Note:** Requires a `waste_entries` table in the database (not yet in any migration layer).

---

## 9. Revenue Forecasting & Analytics

**File created:** `lib/analytics/revenue-engine.ts`

**Architecture adaptation:**

- Old: 825-line client-side analytics engine with in-memory computation
- New: Server actions querying Supabase directly, tenant-scoped

**Capabilities:**

- Dashboard KPIs: total revenue, booked value, inquiries count, conversion rate, events completed, avg event value
- Revenue by month (from ledger entries)
- Top clients by revenue
- Seasonal performance (monthly event count, cancellation rate, avg guest count)
- Revenue closure strategy solver (goal vs. booked, suggests booking tiers)
- CSV export helper
- Date range helpers (default 30 days, year-to-date)

---

## 10. Google Calendar Sync

**File created:** `lib/scheduling/calendar-sync.ts`

**Architecture adaptation:**

- Old: Client-side component calling a service wrapper
- New: Server actions for OAuth flow + Google Calendar API

**Capabilities:**

- ICS file generation (RFC 5545 VCALENDAR with METHOD:REQUEST)
- Google Calendar connection status check
- OAuth initiation for Google Calendar
- Disconnect flow
- Sync individual events to Google Calendar

**Note:** Requires `chef_settings` table with Google Calendar columns and Google Cloud OAuth credentials.

---

## 11. Cookie Consent

**File created:** `components/ui/cookie-consent.tsx`
**File modified:** `app/layout.tsx` (wired into root layout)

**Architecture adaptation:**

- Old: React component with `localStorage`
- New: Same pattern as client component with Next.js `Link` for privacy page

---

## Files Created (Summary)

```
public/logo.svg
public/logo.png
public/favicon.svg
public/favicon.ico
public/og-image.svg
lib/ai/gemini-service.ts
lib/ai/correspondence.ts
lib/import/bulk-parser.ts
lib/search/universal-search.ts
lib/messages/realtime.ts
lib/analytics/menu-engineering.ts
lib/analytics/revenue-engine.ts
lib/events/fire-order.ts
lib/waste/actions.ts
lib/scheduling/calendar-sync.ts
components/search/global-search.tsx
components/ui/cookie-consent.tsx
```

## Files Modified

```
app/layout.tsx (favicon, OG metadata, CookieConsent)
.env.local.example (GOOGLE_GEMINI_API_KEY, GOOGLE_CLIENT_ID/SECRET, NEXT_PUBLIC_SITE_URL)
package.json (@google/genai dependency)
```

## Database Tables Needed (Not Yet Migrated)

Some ported features reference tables that don't exist yet:

- `waste_entries` — for waste tracking
- `chef_settings` — for Google Calendar token storage (may already exist partially)

These will need migration scripts before the features are fully operational.

---

## What Was NOT Ported (Intentionally)

- **Electron desktop app** — V1 is web-only
- **Separate auth-server** — V1 uses Supabase Auth directly
- **WebSocket realtime server** — Replaced by Supabase Realtime
- **Component library page** — Development tool, not user-facing
- **Old routing/page components** — V1 has its own page structure
- **Feature flags service** — Over-engineering for V1 scope
- **Backup service** — Handled by Supabase
- **Account deletion** — Already in V1's roadmap
