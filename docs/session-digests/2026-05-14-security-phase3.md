# Session Digest: 2026-05-14 - Security Phase 3

## What was done

Full Phase 3 (defense-in-depth) of the security audit remediation. 12 items shipped across 57 files.

### Fixes applied:

1. **L2 - Admin middleware gate**: Added `isAdmin` JWT claim to `auth-config.ts`, exposed in session, checked in `route-policy.ts`. Non-admin users now get redirected away from `/admin` at middleware level (previously relied solely on page-level `requireAdmin()`).

2. **M10 - Pi Bridge auth**: Added `PI_BRIDGE_SECRET` env var and Bearer token header to `lib/pricing/pi-bridge.ts`. Pi-side needs matching auth middleware.

3. **L8 - HSTS preload**: Added `preload` directive to all 3 HSTS header blocks in `next.config.js`.

4. **L9 - SSRF IPv6**: Added `fc00::/7`, `fe80::/10`, `::ffff:` mapped IPv4 checks to `lib/ai/server-runtime-guard.ts`.

5. **L10 - DNS rebinding**: Added `dns/promises.lookup` pre-fetch validation in `app/api/openclaw/image/route.ts`.

6. **L11+L12 - Tunnel config**: Removed hardcoded UUID and `noTLSVerify` from `.cloudflared/config.yml`. UUID now passed via env/CLI.

7. **L6+L7 - Session/redirect**: E2E session 30d to 7d. Auth clear redirect from hardcoded localhost to `request.url`.

8. **lib/env.ts**: Zod schema for 15 env vars. Throws in production for missing required vars, warns in dev.

9. **lib/auth/tenant-scope.ts**: `requireTenantMembership()` and `isTenantMember()` helpers for cross-tenant prevention.

10. **JSON-LD XSS consolidation**: 13 public pages migrated from inline `dangerouslySetInnerHTML` to shared `<JsonLd>` component (which has `.replace(/</g, '\\u003c')` XSS fix).

11. **Pino structured logging**: Installed pino, upgraded `lib/monitoring/logger.ts` to use pino backend, converted 10 API routes from `console.log` to structured logging with `sanitize()` integration.

## Commits

- `630b731fd` - fix(security): Phase 3 defense-in-depth hardening (57 files)

## What was NOT done (Phase 4, strategic, weeks 7+)

- M1: Auth.js beta to Better Auth migration (2-4hr)
- M4: MFA enforcement wiring (8-16hr)
- L21: CSP nonce support, requires Next.js 15 (8-24hr)
- RLS re-enablement on sensitive tables (8-16hr)

## Follow-up needed

- Pi Bridge: deploy matching auth middleware on Pi side (check `PI_BRIDGE_SECRET` header)
- Cloudflare tunnel: test with `cloudflared tunnel run $TUNNEL_ID` CLI approach
- Pino: ~240 more API routes still use `console.log`, can be migrated incrementally
- `lib/env.ts` is created but not imported anywhere yet; import it in a startup path to activate validation
- `requireTenantMembership()` is created but not yet wired into `permission-actions.ts` (the 3 cross-tenant RBAC bugs from Phase 1 were fixed directly; this helper is for future use)
- Pre-existing TS errors in `lib/vendors/invite-actions.ts` and `vendor-order-actions.tsx` (not from our changes)

## Dirty state left

- `.planning/HANDOFF.json`, `docs/uptime-history.json` (metadata, not ours)
- `app/robots.ts`, `app/sitemap.ts` (unrelated changes)
- `app/api/sms-bridge/`, `lib/sms-bridge/`, migration (unrelated WIP)
- `app/(public)/how-it-works/page.tsx`, `app/(public)/pricing/page.tsx` (unrelated)
