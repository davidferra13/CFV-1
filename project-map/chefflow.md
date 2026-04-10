# ChefFlow

**What:** Operating system for food service professionals. One platform for selling, planning, cooking, stocking, invoicing, and growing a food business.

**Who:** Solo private chefs, caterers, meal prep operators, grazing board artists, food truck operators.

**Mission:** ChefFlow handles the business. Chef handles the art.

**Domain:** app.cheflowhq.com
**Tagline:** Ops for Artists
**Revenue:** All features free. Voluntary $12/month supporter contributions.

## V1 Scope

Six pillars: Sell, Plan, Cook, Stock, Money, Grow.
Three user roles: Chef (operator), Client (consumer), Public (visitor).
Full blueprint: `docs/product-blueprint.md`

## Current Phase

- Build phase: OVER (March 2026)
- Validation phase: STARTED (April 1, 2026)
- V1 build completeness: 91%
- V1 overall progress: 68% (validation and launch readiness are the gaps)

## Key Numbers

- 265+ pages
- 174 specs (64 verified, 34 ready, 12 built)
- 135 research reports
- 725 database tables
- 54 settings pages
- 90+ Mission Control API endpoints

## Mobile App + PWA Activation (P0, Apr 2026)

**Spec:** `docs/specs/cloud-mobile-unified-migration.md`
**Status:** Spec complete. Ready for Phase 1 execution.

**Current state:** App is globally reachable at app.cheflowhq.com via Cloudflare Tunnel. 100% self-hosted. No mobile install yet.

**What's already built:** PWA (manifest, service worker, icons, push infra - all done, just disabled). Tauri (deps installed, desktop config + all platform icons in abandoned worktree).

**4 phases:** PWA activation (verify + VAPID keys), Tauri desktop (resurrect from worktree), Tauri Android (add mobile target, build APK), Tauri iOS (blocked on macOS hardware). $0 cost.

## Ingredient Sourcing Intelligence (Apr 2026)

**Spec:** `docs/specs/ingredient-sourcing-intelligence.md`
**Status:** Tier 3 built and live.

**What it is:** A 4-tier sourcing fallback system embedded in the Food Catalog. When a chef searches for an ingredient and gets nothing, the system escalates through tiers automatically rather than leaving the chef with a dead end.

**The 4 tiers:**

1. Catalog lookup (OpenClaw, 15K+ items) - instant. Already existed.
2. Web search via DuckDuckGo across trusted specialty retailers - fast. Already existed.
3. Vendor call queue: pulls the chef's saved supplier contacts, ranks them by specialty relevance (specialty/butcher/farm/fishmonger first), shows phone numbers with a copy-to-clipboard button. **Built April 2026.**
4. AI auto-calling via Bland.ai: system calls vendors on the chef's behalf, reports back async. **Future.**

**Key files:**

- `lib/vendors/sourcing-actions.ts` - `getVendorCallQueue()` server action
- `app/(chef)/culinary/price-catalog/catalog-browser.tsx` - `VendorCallQueuePanel` component

**Design principle:** The catalog should be so good that calls become rare. If Tier 3 fires constantly, the catalog needs work - not the calling system.
