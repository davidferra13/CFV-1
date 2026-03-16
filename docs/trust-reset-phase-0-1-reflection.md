# Trust Reset Phase 0-1 Hardening - Reflection

Date: 2026-03-15
Branch: `feature/openclaw-adoption`

## What Changed

### Phase 0: Stop-Ship Containment

#### 1. Rate-limit durability (`lib/rateLimit.ts`)
**Problem:** The Redis rate limiter used a single `Ratelimit` instance (singleton)
regardless of the `max`/`windowSeconds` parameters. A 5-request/15-min policy
and a 10-request/60-min policy would share the same limiter, with the first one
created winning. Subsequent calls with different policies silently used the wrong
limits.

**Fix:** Replaced the singleton with a `Map<string, Ratelimit>` keyed by
`${max}:${windowSeconds}`. Each unique policy gets its own `Ratelimit` instance
with a distinct Redis key prefix (`cf:rl:5:900` vs `cf:rl:10:3600`).

#### 2. Webhook URL validation (`lib/security/url-validation.ts`)
**Problem:** No centralized URL validation existed. The Zapier integration routes
referenced in the TODO do not exist yet, but the validation utility was missing
for any future webhook/callback URL validation.

**Fix:** Created `lib/security/url-validation.ts` with `validateWebhookUrl()`.
Rejects: non-HTTPS, localhost, private IPs, cloud metadata endpoints
(169.254.169.254, metadata.google.internal), embedded credentials, and
link-local addresses. Returns a typed result with the reason for rejection.

#### 3. Client portal token hashing (`lib/clients/actions.ts`, `lib/auth/invitations.ts`)
**Problem:** Invitation tokens were stored as plaintext hex in the
`client_invitations` table. A database breach would expose all active tokens.

**Fix:**
- `inviteClient()` now stores the SHA-256 hash of the token, not the raw value.
  The raw token is only sent in the invitation URL to the client.
- `getInvitationByToken()` hashes the incoming token before DB lookup.
- Backward compatibility: falls back to plaintext match for tokens created
  before this change (legacy tokens will expire within 7 days naturally).
- Expiry was already enforced (7-day window, checked in query).
- Revocation was already present (`revokeInvitation()` sets `used_at`).

#### 4. CRON_SECRET enforcement (`app/api/scheduled/campaigns/route.ts`, `app/api/scheduled/sequences/route.ts`)
**Problem:** Two scheduled routes used `if (secret && ...)` which silently
allows unauthenticated access when CRON_SECRET is not set. All other routes
correctly check `if (!cronSecret)` first and return 500.

**Fix:** Both routes now follow the standard pattern:
1. Check `!secret` and return 500 if not configured
2. Check `authHeader !== Bearer ${secret}` and return 401 if wrong

All 19 scheduled routes now enforce CRON_SECRET consistently.

### Phase 1: Trust Boundary Reset

#### 5. Admin client audit (`docs/admin-client-audit.md`)
Created a comprehensive audit of all 184+ `createServerClient({ admin: true })`
callsites. Categorized into:
- **Justified:** cron jobs, webhooks, auth flows, public intake, cross-tenant
  reads, notification infrastructure, automation pipelines
- **Candidates for downgrade:** `chef-social-actions.ts` (30+ callsites that
  call `requireChef()` but still use admin client), `events/readiness.ts`
- **Recommendations:** add RLS policies for social tables, split cron/user paths,
  consider a `createPrivilegedClient(reason)` wrapper for audit trail

#### 6. Tenant from session verification
**Finding:** No callsite was found that trusts `input.tenantId` from a request
body. All server actions derive tenant context from:
- `requireChef()` / `requireClient()` session
- Database lookups (chef by slug/email)
- Cron iterating DB records (using the record's own `tenant_id`)

`createClientFromLead(tenantId, ...)` accepts tenantId as a parameter, but every
caller passes it from a trusted source (never from request body). No fix needed.

## What Was NOT Changed (and why)

- **No migrations created.** The `client_invitations.token` column stores the
  hash in the same text field. No schema change required.
- **No Zapier routes exist** to consolidate. The `url-validation.ts` module is
  ready for when they are built.
- **`createAdminClient()`** in `lib/supabase/admin.ts` is only imported by test
  helpers. No production code uses it.
