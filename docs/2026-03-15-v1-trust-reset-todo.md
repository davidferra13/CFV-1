# V1 Trust Reset TODO

## Goal

Ship a dedicated hardening release before any new product expansion.

This build exists to:

- restore tenant-isolation credibility
- remove public data disclosure paths
- reduce service-role blast radius
- harden token and webhook trust boundaries
- stop treating missing schema as a normal runtime mode

## Phase 0: Stop-Ship Containment

- [ ] Remove public PII prefill from `app/api/public/client-lookup/route.ts`.
- [ ] Keep returning-client detection only if it returns no client profile fields.
- [ ] Rate-limit all public lookup and public intake surfaces with durable policies.
- [ ] Delete duplicate webhook URL validation logic in `app/api/integrations/zapier/subscribe/route.ts`.
- [ ] Route Zapier subscription validation through `lib/security/url-validation.ts`.
- [ ] Fix `lib/rateLimit.ts` so Redis limiters are cached per policy, not per worker singleton.
- [ ] Add expiry, rotation, and revocation semantics to client portal access links.
- [ ] Stop writing raw client portal tokens to the database for newly generated links.

## Phase 1: Trust Boundary Reset

- [ ] Replace `createServerClient({ admin: true })` with explicit privileged client factories.
- [ ] Ban request-scoped service-role access outside a short audited allowlist.
- [ ] Remove all authorization decisions that trust `input.tenantId` or equivalent caller input.
- [ ] Derive tenant context from session, signed job claims, or verified integration credentials only.
- [ ] Replace email-list admin access with a persisted platform authorization model.
- [ ] Audit all existing service-role callsites and collapse unnecessary ones back to user-scoped clients.

## Phase 2: Tests Become Enforcement

- [ ] Convert warning-only auth and service-role checks in `tests/unit/auth.tenant-isolation.test.ts` into hard failures.
- [ ] Add unit coverage for public client lookup so it cannot regress into returning PII.
- [ ] Add unit coverage for webhook URL rejection of localhost, metadata hosts, private IPs, HTTP URLs, and credentialed URLs.
- [ ] Add unit coverage for client portal token hashing, expiry, rotation, and revoke semantics.
- [ ] Fail CI on new `@ts-nocheck` server-action files.

## Phase 3: Schema and Deployment Discipline

- [ ] Stop shipping feature code that depends on tables not present in the active schema.
- [ ] Remove user-facing "table not yet created" fallbacks from production paths.
- [ ] Add migration-state verification to CI or release gating.
- [ ] Regenerate types after schema cleanup and pay down `any` / `@ts-nocheck` debt in trust-critical code first.

## Phase 4: Scope Compression

- [ ] Freeze new expansion work until the trust reset exits cleanly.
- [ ] Define the actual V1 product surface and remove or hide non-core modules from production navigation.
- [ ] Keep experimental surfaces behind explicit feature flags with operational ownership.

## Exit Criteria

- [ ] No unauthenticated route returns client PII.
- [ ] No server action trusts caller-supplied tenant IDs for authorization or data isolation.
- [ ] No request-bound service-role access exists outside the approved allowlist.
- [ ] Tenant-isolation and privileged-client tests pass without warning-only exceptions.
- [ ] No production page depends on a missing table.
- [ ] Public abuse-sensitive routes use durable rate limiting in production.
- [ ] Admin access is role-based, not email-list based.
