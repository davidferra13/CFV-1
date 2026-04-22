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
- V1 build completeness: 95%
- V1 overall progress: 70% (validation and launch readiness are the gaps)

## Key Numbers

- 265+ pages
- 118 specs (64 verified, 34 ready, 12 built, 2 in progress, 3 draft, 3 deferred)
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

## Release Verification Control Plane (Apr 2026)

**Status:** Built

**What it is:** The shared repo-side release executor now uses the existing release manifest and attestation contract as the authoritative path for release checks.

**What changed:** `scripts/verify-release.mjs` now reads `lib/release/release-gate-manifest.js`, runs the machine-readable surface completeness audit, classifies known warning policies, and writes attestations through `lib/release/release-attestation.js`.

**Design principle:** one release executor, one manifest, one attestation contract. No second checker.

## Surface Contract and Drift Guard (Apr 2026)

**Status:** Built

**What it is:** A shared surface-governance contract now declares the active mode for each runtime shell, and the completeness audit enforces that every root layout keeps publishing the contract instead of letting shells drift silently.

**What changed:** `lib/interface/surface-governance.ts` now resolves explicit modes across public, chef, client, admin, staff, and partner portals. Root layouts publish `data-cf-surface`. `lib/interface/surface-completeness.ts` adds a machine-readable `surface-mode-declaration` check and exposes per-route `surfaceMode` metadata in the contract graph. The web-beta release shell also publishes the same portal/surface markers.

**Design principle:** one surface grammar, one resolver family, one audit path. No chef-only shell contract.

## Privileged Mutation Policy Contract (Apr 2026)

**Status:** Built

**What it is:** The shared server-action mutation inventory now classifies page-facing mutations by blast radius and exposes missing auth or observability controls as a machine-readable policy contract.

**What changed:** `lib/auth/server-action-inventory.ts` now emits privilege metadata for `standard`, `sensitive`, and `critical` mutations, reusing existing file and table ownership instead of inventing a second registry. `tests/unit/server-action-auth-inventory.test.ts` covers the failure path for missing observability, and `tests/system-integrity/q80-revalidation-after-mutation.spec.ts` ensures known admin, finance, contract, and client mutation files keep resolving through the shared classifier.

**Design principle:** one mutation inventory, one privilege classifier, no sibling policy registry.
