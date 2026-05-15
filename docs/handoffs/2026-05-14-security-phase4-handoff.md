# Handoff Prompt

Context: Security audit and remediation. Read `docs/security/2026-05-14-security-audit.md` first. It has the full 33-finding audit, 8 research areas, and phased remediation roadmap.

What's done: Phases 1-3 (all critical, high, and medium-impact items resolved across commits `0da0b73e7`, `8dac067a9`, and `630b731fd`). 28 of 33 findings remediated. Remaining 4 are Phase 4 (strategic, major upgrades).

Your job: Phase 4 (strategic improvements). From the roadmap in the audit doc:

## Phase 4 Items

### M1: Auth.js beta to Better Auth migration (2-4hr)

- **File:** `package.json` (next-auth 5.0.0-beta.30)
- **Context:** Auth.js v5 never reached GA. Project was acquired by Better Auth (Sep 2025). Current beta is frozen but functional.
- **Action:** Evaluate Better Auth as replacement. If viable, migrate. If not, document decision and pin current version.
- **Risk:** Auth is deeply integrated (middleware, JWT callbacks, session types, OAuth, MFA scaffolding). Full regression testing required.

### M4: MFA enforcement wiring (8-16hr)

- **File:** `lib/auth/auth-config.ts:133-234`
- **Context:** MFA backend is fully built (TOTP, recovery codes, challenges, security events, UI page at `/settings/security`). But `authorize()` never calls MFA challenge, and middleware never checks `mfaPending` session flag.
- **Action:** Wire up MFA enforcement: after password verification in `authorize()`, check if user has MFA enabled, set `mfaPending` flag, block protected routes in middleware until MFA is completed.
- **Key files:** `lib/mfa/challenge.ts`, `lib/auth/auth-config.ts`, `middleware.ts`, `app/auth/mfa/page.tsx`

### L21: CSP nonce support (8-24hr)

- **File:** `next.config.js:286`
- **Context:** `unsafe-inline` in CSP `script-src` is a Next.js 14 limitation. Next.js 15 supports nonce-based CSP.
- **Action:** Upgrade to Next.js 15, then replace `unsafe-inline` with nonce-based script loading.
- **Risk:** Next.js 14->15 migration has breaking changes (async request APIs, Turbopack default, React 19). Major upgrade.

### RLS re-enablement on sensitive tables (8-16hr)

- **File:** `database/migrations/20260401000098_disable_rls_all_tables.sql`
- **Context:** Row-Level Security was explicitly disabled on all tables. Re-enabling on sensitive tables (`events`, `clients`, `ledger_entries`, `contracts`) with `SET LOCAL` transaction wrapping would add a DB-level tenant isolation layer.
- **Action:** Identify top 5 most sensitive tables, write RLS policies, test with multi-tenant scenarios, create migration.

## Also note (follow-ups from Phase 3):

1. `lib/env.ts` exists but is not imported in any startup path yet. Import it in `lib/db/index.ts` or a root layout to activate env validation.
2. `requireTenantMembership()` in `lib/auth/tenant-scope.ts` exists but is not yet used. Wire it into `lib/auth/permission-actions.ts` for the RBAC permission functions.
3. Pi Bridge (`lib/pricing/pi-bridge.ts`) now sends `Authorization: Bearer $PI_BRIDGE_SECRET`. The Pi-side API server needs matching middleware to validate the token.
4. ~240 API routes still use `console.log`. Continue incremental migration to `import { createLogger } from '@/lib/logger'`.
5. Pre-existing TS errors in `lib/vendors/invite-actions.ts` (9 errors) and `vendor-order-actions.tsx` (1 error) need fixing independently.
