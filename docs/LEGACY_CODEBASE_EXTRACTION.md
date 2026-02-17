# Legacy Codebase Extraction

## What Happened

Scanned 14 legacy BillyBob versions (the full evolution of ChefFlow prototypes) and extracted everything worth keeping into ChefFlow V1. The rest is throwaway — different architecture (React SPA + Express), different auth model (JWT), no RLS, no server actions.

## Source Inventory

| Version | Stack | Verdict |
|---------|-------|---------|
| BillyBob1 | Loose TS utilities | Fragments only — skipped |
| BillyBob2 | Next.js shell | Boilerplate — skipped |
| BillyBob3 | PowerShell ChefBot + DeepSeek | Different paradigm — skipped |
| BillyBob4 | Next.js + Prisma starter | Template only — skipped |
| BillyBob5 | Monorepo (backend + React) | Early split — skipped |
| BillyBob6 | Empty | Nothing |
| BillyBob7 | Backend + .NET traces | Minimal — skipped |
| BillyBob8 | Next.js + Playwright E2E | **Extracted test patterns** |
| BillyBob9 | Express + React + Capacitor | Precursor to 14 — skipped |
| BillyBob10 | Next.js 16 scaffold | Boilerplate — skipped |
| BillyBob11 | Single image | Nothing |
| BillyBob12 | Empty (.vscode only) | Nothing |
| BillyBob13 | Empty (.vscode only) | Nothing |
| BillyBob14 | React SPA + Express + Capacitor | **Extracted constants, types, UI patterns** |

## What Was Extracted

### From BillyBob14 (`imported/CHEIFFFF/`)

**1. Business Constants** → `lib/constants/business.ts`
- Inquiry source options (Word of Mouth, Google, Instagram, etc.)
- Menu type options (Plated Dinner, Family Style, Buffet, etc.)
- Priority levels, income sources, expense categories
- Payment methods, conversation statuses, communication types
- Staff roles, vendor statuses, inventory categories/units
- Dashboard widget configuration defaults
- Contract template with variable placeholders

**2. Master Equipment Catalog** → `lib/constants/equipment.ts`
- Full equipment list organized by category (Cooking, Plating, Pantry, Cleaning, Utensils)
- Flat list export for autocomplete/search
- Category list export

**3. Loyalty Presentation Constants** → `lib/constants/loyalty.ts`
- Culinary badges (achievement system for clients)
- Milestone rewards (people-served thresholds)
- Gift card templates and designs
- Tier display configuration (colors, icons, labels)
- Complements the existing `lib/loyalty/actions.ts` server logic

**4. StatCard Component** → `components/ui/stat-card.tsx`
- Reusable dashboard metric card with icon, value, label, trend indicator
- Adapted from ClientDetailModal's inline StatCard pattern
- Uses lucide-react icons, stone color palette

### From BillyBob8

**5. Playwright Test Infrastructure** → `playwright.config.ts` + `tests/`
- Sequential single-worker config (prevents tenant state leaks)
- Auth test utilities with both UI-based and direct Supabase helpers
- `createUserDirect()` and `createChefDirect()` for reliable test setup
- Route constants as single source of truth
- Smoke tests for auth flows
- E2E contract verification script

**6. E2E Contract Verification** → `scripts/verify-e2e-contract.js`
- Validates Playwright config matches package.json dev port
- Checks required env vars exist
- Verifies test directory structure
- Confirms Supabase migrations present

**7. Test Scripts** → `package.json`
- `test:e2e` — run all Playwright tests
- `test:e2e:headed` — verify contract first, then run headed
- `test:e2e:debug` — interactive debug mode
- `test:e2e:report` — show HTML report
- `verify:e2e-contract` — pre-flight check

## What Was Deliberately Skipped

- **Express server code** — incompatible with server actions architecture
- **Zustand stores** — we use server-side state, not client-side stores
- **React Router** — we use Next.js App Router
- **JWT auth** — we use Supabase Auth + RLS
- **Capacitor mobile** — we're web-first
- **AI inquiry parser** — already exists as `lib/ai/parse-inquiry.ts`
- **Loyalty tier logic** — already exists in `lib/loyalty/actions.ts`
- **Mock data** — our schema is the source of truth
- **WebSocket chat** — use Supabase realtime instead
- **Focus Mode** — concept noted for future implementation (offline kitchen interface)

## Files Created

```
lib/constants/business.ts          — Business constants and enums
lib/constants/equipment.ts         — Master equipment catalog
lib/constants/loyalty.ts           — Badges, milestones, gift cards, tier display
components/ui/stat-card.tsx        — Reusable dashboard metric card
playwright.config.ts               — E2E test configuration
tests/helpers/test-utils.ts        — Test utility functions
tests/helpers/auth-utils.ts        — Auth test helpers for Supabase
tests/smoke/auth.spec.ts           — Auth smoke tests
scripts/verify-e2e-contract.js     — E2E setup verification
```

## Files Modified

```
package.json                       — Added test scripts + @playwright/test devDependency
```

## Future Opportunities (Not Implemented Yet)

- **Focus Mode** — Offline kitchen-safe interface (dark theme, voice commands, ingredient checklists). Worth building once the core event lifecycle is stable.
- **Service catalog / integrations** — Gmail, Instagram, Facebook inquiry import. Requires OAuth setup.
- **Dashboard widget customization** — User-configurable dashboard widgets. The constants are ready in `business.ts`.

## Connection to System

These extractions fill gaps in the operational layer:
- Constants provide dropdown options and form defaults across the chef portal
- Equipment catalog seeds inventory and event prep checklists
- Loyalty badges complement the existing points/tier system
- StatCard standardizes dashboard metrics display
- Playwright infrastructure enables regression testing as features ship
