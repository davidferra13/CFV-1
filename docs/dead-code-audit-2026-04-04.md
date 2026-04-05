# ChefFlow V1 - Structural Dead Code Audit

**Date:** 2026-04-04
**Scope:** Full codebase (4,646 source files across app/, components/, lib/, hooks/, features/, types/)
**Method:** 8 parallel analysis agents + targeted verification
**Status:** Research only. Nothing modified.

---

## Executive Summary

| Category | Files Flagged | Confidence | Estimated LOC |
|----------|--------------|------------|---------------|
| Unused components | ~500 files | HIGH | ~25,000+ |
| Unused npm dependencies | 44 packages | HIGH | n/a (bundle) |
| V2 API routes (no callers) | 148 files | HIGH | ~15,000+ |
| Duplicate/orphan scripts | ~15 files | HIGH | ~600 |
| Dead lib modules | 2 files | HIGH | ~175 |
| Unused hooks/types/features | 4 files | MEDIUM | ~400 |
| @ts-nocheck with exports | 1 file | HIGH (risk) | ~80 |
| Playwright config duplication | 16 files | MEDIUM | ~1,200 |
| Commented-out code blocks | 37 files | LOW-MEDIUM | ~500+ |

**Conservative estimate: ~650-700 files (~15% of source) are removable, representing ~40,000+ lines of dead code.**

The npm dependency cleanup alone would reduce `node_modules` significantly (tesseract.js is 7MB+, FullCalendar is 6 packages, tiptap is 3 packages).

---

## Category 1: CONFIRMED DEAD CODE (Safe to Remove)

### 1A. Unused Components (~500 files across 75+ directories)

**Confidence: HIGH** - Zero imports found anywhere in the codebase.

These are complete component directories where every file has zero imports. They represent planned/scaffolded features that were never wired into the app.

**Entire directories with zero usage (sample of largest):**

| Directory | Files | What It Was |
|-----------|-------|-------------|
| components/notifications/ | 6 | Bell, panel, provider, settings, badge, toast |
| components/nutrition/ | 6 | Ingredient search, menu panel, summary, card, label |
| components/print/ | 6 | Event brief, grocery list, menu, recipe print views |
| components/reviews/ | 6 | Chef reviews, client feedback, external sources, import |
| components/safety/ | 6 | Backup chef, incidents, resolution tracker, recalls |
| components/cannabis/ | 6 | Cannabis event portal (entire feature) |
| components/client-dashboard/ | 6 | Collapse controls, widget grid, empty state |
| components/compliance/ | 6 | Certifications, claims, insurance policies |
| components/daily-ops/ | 6 | Daily plan, completion celebration, Remy summary |
| components/devices/ | 6 | Device management, pairing, staff PINs |
| components/email/ | 6 | Enrollment, rebooking, seasonal teaser, sequences |
| components/feedback/ | 6 | Feedback dashboard, forms, nudge cards, surveys |
| components/guests/ | 6 | Guest management, reservations, comp panel, tags |
| components/charity/ | 8 | Charity hours, WFP feed, nonprofit search |
| components/contracts/ | 8 | Contract management (entire feature) |
| components/documents/ | 8 | Document management (entire feature) |
| components/journey/ | 8 | Client journey mapping (entire feature) |
| components/loyalty/ | 8 | Loyalty program (entire feature) |
| components/ai-privacy/ | 7 | AI privacy controls, data flow, Remy gate |
| components/calls/ | 7 | Call tracking (entire feature) |
| components/kiosk/ | 7 | Kiosk mode (entire feature) |
| components/proposals/ | 7 | Proposal builder, comparison, export |
| components/automations/ | 4 | Automation rules, execution log, templates |
| components/billing/ | 4 | Trial banners, upgrade gate, upgrade prompt |
| components/briefing/ | 4 | Daily briefing, prep timers, shift notes |
| components/classes/ | 4 | Cooking class management (entire feature) |
| components/marketplace/ | 4 | Marketplace integration, TakeAChef capture |
| components/migration/ | 4 | CSV import wizard, column mapper, history |
| components/store/ | 4 | Meal prep store (entire feature) |
| components/beta-survey/ | 5 | Beta survey system (entire feature) |
| components/equipment/ | 5 | Equipment inventory, depreciation, maintenance |
| components/expenses/ | 5 | Expense forms, receipt scanner, quick expense |
| components/incentives/ | 5 | Client incentives, redemption, issue form |
| components/integrations/ | 5 | Business tool integrations, connected accounts |
| components/operations/ | 5 | Kitchen ops: course fire, 86 modal, KDS, voice |
| components/portfolio/ | 5 | Portfolio showcase, grid editor, permissions |
| components/booking/ | 2 | Booking calendar and form |
| components/campaigns/ | 2 | Campaign drafts, push dinner builder |
| components/followup/ | 2 | Follow-up rule builder, sequence timeline |
| components/forms/ | 2 | Dietary intake, form shield |
| components/gmail/ | 2 | Historical scan, findings list |
| components/keyboard/ | 2 | Keyboard shortcut help and provider |
| components/kitchen/ | 2 | Kitchen mode, kitchen timer |
| components/meal-prep/ | 2 | Meal prep dashboard, weekly planner |
| components/mobile/ | 2 | Mobile navigation, quick capture |
| components/network/ | 2 | Chef network card, discoverability toggle |
| components/pipeline/ | 2 | Revenue forecast, stuck events widget |
| components/procurement/ | 2 | Purchase orders, supplier directory |
| components/reports/ | 2 | Daily report, financial dashboard |
| components/search/ | 2 | Command palette, global search |
| components/seasonal/ | 2 | Seasonal banner, seasonal sidebar |
| components/sustainability/ | 2 | Sourcing dashboard, sourcing log |
| components/favorite-chefs/ | 1 | Favorite chef editor |
| components/content/ | 1 | Content pipeline panel |
| components/simulation/ | 1 | Simulation results panel |
| components/stories/ | 1 | Event story preview |
| components/payments/ | 1 | Payment reminders |
| components/legal/ | 1 | TOS acceptance |
| components/security/ | 1 | Turnstile widget |
| components/seo/ | 1 | JSON-LD structured data |
| components/dev/ | 1 | Test account banner |
| components/currency/ | 1 | Currency conversion hint |
| components/availability/ | 1 | Availability checklist |
| components/branding/ | 1 | App logo |
| components/auth/ | 1 | Permission gate |
| components/wix/ | 1 | Wix connection |
| components/shared/ | 1 | Version history panel |

### 1B. V2 API Routes (148 files, zero frontend callers)

**Confidence: HIGH** - These routes are never called from the frontend. The app uses server actions exclusively for internal data flow.

- **Location:** `app/api/v2/` (148 route.ts files)
- **Supporting lib:** `lib/api/v2/` (middleware, auth, scopes, pagination)
- **Status:** Fully implemented code (not stubs), but zero consumers exist
- **Context:** Built for future external API access (Zapier, mobile apps, partners)
- **Risk note:** The underlying server functions these routes call ARE used elsewhere. Only the HTTP route wrappers are dead.

**Sub-categories within V2:**
- Commerce: sales, refunds, payments, promotions, settlements, reports (~15 routes)
- Marketing: campaigns, segments, sequences, templates, A/B tests (~20 routes)
- Notifications: preferences, tiers, SMS settings (~7 routes)
- Staff & Partners: CRUD, invites, analytics (~12 routes)
- Safety: incidents, follow-ups, recalls, backup contacts (~8 routes)
- Settings: preferences, modules, automations, tax rates (~12 routes)
- Webhooks: CRUD, logs, test (~4 routes)
- And more: inventory, vendors, search, documents, booking, taxonomy, Remy policies

### 1C. Dead Lib Modules (2 files)

**Confidence: HIGH**

| File | Lines | What It Is | Why Dead |
|------|-------|-----------|----------|
| `lib/wine/spoonacular-wine.ts` | 117 | Wine pairing via Spoonacular API | Never integrated |
| `lib/import/bulk-parser.ts` | 58 | CSV/Excel/PDF bulk import parser | Never wired up |

### 1D. Orphaned Scripts (~15 files)

**Confidence: HIGH**

| File | Lines | What It Is |
|------|-------|-----------|
| `scripts/fix-test.mjs` | 39 | Debugging artifact |
| `scripts/fix-test2.mjs` | 35 | Debugging artifact |
| `scripts/fix-test3.mjs` | 44 | Debugging artifact |
| `scripts/fix-test4.mjs` | 74 | Debugging artifact |
| `scripts/test-nav.mjs` | 50 | Navigation test iteration |
| `scripts/test-nav2.mjs` | 56 | Navigation test iteration |
| `scripts/test-nav3.mjs` | 45 | Navigation test iteration |
| `scripts/test-nav4.mjs` | 56 | Navigation test iteration |
| `scripts/test-context-dock.mjs` | 72 | One-off test |
| `scripts/test-sidebar.mjs` | 63 | One-off test |
| `auth-flows-test.mjs` (root) | ~100 | QA test artifact, not in npm scripts |
| `test-dual-badge.mjs` (root) | ~30 | Badge rendering test, not in npm scripts |
| `.env.local.prod.backup` (root) | 127 | Env backup with credentials (security risk) |

**Also flagged (wrapper scripts with no independent logic):**
- `scripts/create-event-packet.mjs` - delegates to grazing variant
- `scripts/create-event-task-board.mjs` - delegates to grazing variant
- `scripts/reconcile-event-financials.mjs` - delegates to grazing variant
- `scripts/prefill-event-packet.mjs` - delegates to grazing variant
- `scripts/export-event-proposal-bundle.mjs` - delegates to grazing variant

### 1E. Unused npm Dependencies (44 packages)

**Confidence: HIGH** - Zero imports found in any source file.

**Heavy/notable packages (remove first for biggest impact):**

| Package | Size Impact | What It Was For |
|---------|------------|-----------------|
| `tesseract.js` | ~7MB | OCR (never implemented) |
| `@fullcalendar/*` (6 packages) | ~2MB | Calendar widget (never used) |
| `@tiptap/*` (3 packages) | ~1MB | Rich text editor (never used) |
| `@dnd-kit/*` (3 packages) | ~500KB | Drag and drop (never used) |
| `mammoth` | ~500KB | Word doc parsing (never used) |
| `react-hook-form` + `@hookform/resolvers` | ~200KB | Form management (custom forms used instead) |
| `motion` | ~150KB | Animation library (never used) |
| `@sentry/nextjs` | ~500KB | Error tracking (config exists but not integrated) |
| `posthog-js` | ~200KB | Analytics (not integrated) |

**Full list of unused runtime dependencies:**
`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@ducanh2912/next-pwa`, `@fullcalendar/core`, `@fullcalendar/daygrid`, `@fullcalendar/interaction`, `@fullcalendar/list`, `@fullcalendar/react`, `@fullcalendar/timegrid`, `@phosphor-icons/react`, `@radix-ui/react-dropdown-menu`, `@tiptap/pm`, `@tiptap/react`, `@tiptap/starter-kit`, `@react-email/render`, `@react-email/components`, `@auth/drizzle-adapter`, `@google/genai`, `@react-google-maps/api`, `motion`, `react-colorful`, `react-day-picker`, `react-dropzone`, `react-hook-form`, `@hookform/resolvers`, `react-to-print`, `react-webcam`, `signature_pad`, `html5-qrcode`, `tesseract.js`, `mammoth`, `pdf-lib`, `rate-limiter-flexible`, `web-push`, `next-intl`, `@sentry/nextjs`, `posthog-js`

**Unused devDependencies:**
`@axe-core/playwright`, `@capacitor/cli`, `@capacitor/core`, `@supabase/supabase-js`, `@tauri-apps/cli`, `@tauri-apps/api`, `@tauri-apps/plugin-autostart`, `@tauri-apps/plugin-notification`, `@types/google.maps`

---

## Category 2: SUSPECTED UNUSED (Needs Verification)

### 2A. Route Groups with Minimal Integration

These route groups have pages and nav configs but may not be reachable by real users:

| Route Group | Pages | Status |
|-------------|-------|--------|
| `(partner)` | 6 pages | Has nav config, linked from chef portal. Likely active. |
| `(staff)` | 6 pages | Has nav config, linked from chef portal. Likely active. |
| `(mobile)` | 2 pages | Chef dashboard + client events. No nav links found. **Suspect.** |
| `(demo)` | 1 page | Demo page. May be linked externally. **Verify.** |

### 2B. Hooks and Type Files

| File | Status | Reason |
|------|--------|--------|
| `hooks/use-field-validation.ts` | Suspect unused | Zero imports found |
| `types/system.ts` | Suspect unused | Specification/planning file, zero runtime imports |
| `features/registry.ts` | Suspect unused | 100+ feature entries, zero runtime imports |

### 2C. Sentry Configuration Files

Sentry config files exist (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) but `@sentry/nextjs` is never imported in source. These may be remnants from when Sentry was being evaluated.

### 2D. Capacitor/Tauri Configuration

`capacitor.config.ts` and Tauri config exist. The Capacitor config is referenced by one settings page and one test, but there's no evidence of actual mobile builds. The Tauri packages are unused.

---

## Category 3: CRITICAL (Actively Used, Do Not Touch)

These areas are confirmed active and well-connected:

### Core Runtime
- All `lib/` modules except the 2 flagged files (1,724 files healthy)
- All `hooks/` except `use-field-validation.ts` (6 of 7 actively used)
- All server actions (no unused exported functions found)
- All 26 confirmed npm dependencies (`next`, `react`, `drizzle-orm`, `zod`, `stripe`, `date-fns`, `sonner`, `lucide-react`, etc.)

### Active Route Groups
- `(chef)` - 411 pages (core product)
- `(public)` - 64 pages (public-facing)
- `(client)` - 54 pages (client portal)
- `(admin)` - 42 pages (admin panel)
- Core API routes (auth, storage, realtime, cron, webhooks, embed, e2e)

### Infrastructure
- All database migrations
- All `lib/db/` modules
- Auth system (`lib/auth/`)
- Storage system (`lib/storage/`)
- Realtime/SSE system (`lib/realtime/`)
- AI dispatch layer (`lib/ai/dispatch/`)

---

## Category 4: RISK AREAS (Do Not Remove Without Extra Care)

### 4A. @ts-nocheck File Exporting Server Actions

**`lib/waste/actions.ts`** - Has `@ts-nocheck` AND exports 3 async functions (`logWasteEntry`, `getWasteEntries`, `getWasteStats`). The `waste_entries` table doesn't exist. These functions WILL crash at runtime if called. This violates the Zero Hallucination Rule.

**Action needed:** Remove exports or convert to comments until the schema exists.

### 4B. V2 API Routes Share Backend Functions

The V2 routes themselves are dead (no callers), but they delegate to the same server action functions used by the rest of the app. Removing the route files is safe. Removing the underlying `lib/` functions is NOT safe.

### 4C. Commented-Out Code (37 files)

These files contain large blocks of commented-out code. Not dead files, but dead code within active files:

| File | Comment Lines | Nature |
|------|--------------|--------|
| `lib/events/fire-order.ts` | 79 | 65-line commented function (deferred feature) |
| `lib/events/prep-timeline.ts` | 31 | Commented logic blocks |
| `lib/equipment/packing-actions.ts` | 26 | Commented logic blocks |
| `lib/cron/heartbeat.ts` | 13 | Deferred cron call |
| `lib/gmail/sync.ts` | 13+ | Gmail sync logic |
| `lib/analytics/price-anomaly.ts` | 13+ | Analytics logic |
| + 31 more files | varies | Various |

### 4D. Playwright Config Proliferation

16 Playwright config files at the repo root, ~90% identical. Not broken, but maintenance burden. Could be unified into a config factory.

---

## Removal Estimates

### Phase 1: Zero-Risk Removals (no verification needed)
- Orphaned scripts: ~15 files, ~600 lines
- Dead lib modules: 2 files, ~175 lines
- `.env.local.prod.backup`: 1 file (security improvement)
- **Total: ~18 files**

### Phase 2: High-Confidence Removals (bulk cleanup)
- Unused components: ~500 files, ~25,000+ lines
- Unused npm dependencies: 44 packages
- **Total: ~500 files + significant bundle reduction**

### Phase 3: Structural Removals (careful verification)
- V2 API routes: 148 files, ~15,000+ lines
- V2 API lib support: `lib/api/v2/` middleware
- **Total: ~150+ files**

### Phase 4: Cleanup Within Active Files
- Commented-out code blocks in 37 files
- Playwright config consolidation
- Remove @ts-nocheck exports from `lib/waste/actions.ts`
- **Total: in-file edits, no file deletions**

### Grand Total
**~670+ files removable, representing ~40,000+ lines of source code (~15% of codebase)**
**44 npm packages removable, representing ~12MB+ of node_modules reduction**

---

## How This Happened

The codebase grew through rapid, ambitious feature planning. Many features were scaffolded (components, API routes, packages installed) before the product reached the validation phase. The anti-clutter rule (2026-04-01) now prevents new unvalidated features, but the existing scaffolding remains. This audit surfaces it so it can be systematically removed.

---

*This audit is research only. No files were modified. All findings should be verified before any removals.*
