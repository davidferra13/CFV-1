# API, Security & Compliance — Implementation Notes

## What Was Built

This document covers the API infrastructure, webhook system, and compliance tooling added in migrations `20260309000001` and `20260309000002`.

---

## 1. Database Migrations

### `20260309000001_api_keys.sql` — `chef_api_keys` table

Stores SHA-256 hashed API keys for chef REST API access. The plaintext key is **never stored** — only the hash. The `key_prefix` column stores the first 15 characters for display purposes (e.g., `cf_live_a1b2c3d`).

- RLS policy: chefs can only read/write their own keys via the `user_roles` subquery pattern
- `is_active` allows soft-revocation without deleting the record
- `expires_at` supports optional key expiry
- `scopes` array allows future fine-grained permission control

### `20260309000002_webhook_endpoints.sql` — `webhook_endpoints` + `webhook_deliveries` tables

Two-table structure for webhook management:

- `webhook_endpoints`: chef-configured URLs with event subscriptions and a per-endpoint HMAC secret
- `webhook_deliveries`: immutable delivery log — every attempt recorded with response status, body, and retry metadata
- Both tables have RLS restricting access to the owning chef

---

## 2. API Layer (`lib/api/`)

### `rate-limit.ts`

Lazy-instantiates an Upstash Redis sliding window rate limiter (100 req/min per tenant). If `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are not set (e.g., local dev), all requests are allowed through with a mock response. No crashes in development.

### `auth-api-key.ts`

Three exports:

- `generateApiKey()` — generates a `cf_live_<64 hex chars>` string using `crypto.getRandomValues`
- `hashApiKey(key)` — SHA-256 via Node's `crypto` module
- `validateApiKey(authHeader)` — looks up the hash in `chef_api_keys`, checks `is_active` and `expires_at`, fires a non-blocking `last_used_at` update, and returns an `ApiKeyContext` with `tenantId`, `scopes`, and `keyId`

### `key-actions.ts`

Server actions for the API Keys UI:

- `createApiKey(name)` — generates key, hashes it, inserts record, returns the plaintext key **once**
- `revokeApiKey(id)` — sets `is_active = false`, scoped to the calling chef's tenant

---

## 3. Public REST API (`app/api/v1/`)

All routes follow the same pattern:
1. Validate `Authorization: Bearer cf_live_...` header via `validateApiKey`
2. Check rate limit via `checkRateLimit`
3. Query Supabase with admin client (bypasses RLS) scoped to `ctx.tenantId`

### `GET /api/v1/events`

Query params: `status` (optional filter), `limit` (max 200, default 50).

Returns: `{ data: [...], count: N }` with client name/email nested.

### `GET /api/v1/clients`

Query params: `limit` (max 500, default 100).

Returns: `{ data: [...], count: N }` with basic client fields only (no sensitive financial data).

---

## 4. Webhook System (`lib/webhooks/`)

### `deliver.ts`

Called from server-side event handlers (e.g., after event state transitions). For each active endpoint subscribed to the event type:

1. Builds JSON payload: `{ event, data, timestamp }`
2. Signs with `HMAC-SHA256` using the endpoint's stored secret
3. POSTs to the endpoint URL with a 10-second timeout
4. Records delivery attempt in `webhook_deliveries` — success or failure

Signature header: `X-ChefFlow-Signature: sha256=<hex>`
Event header: `X-ChefFlow-Event: event.completed`

### `actions.ts`

Server actions for the Webhooks UI:

- `createWebhookEndpoint(input)` — generates a 32-byte random hex secret, inserts endpoint
- `deleteWebhookEndpoint(id)` — hard delete (delivery history cascades), scoped to tenant

---

## 5. Settings UI

### `/settings/api-keys` — `ApiKeyManager`

- Lists existing keys (prefix + last used, no plaintext)
- Create form: name only (scopes are defaulted to `events:read`, `clients:read`, `expenses:read`)
- On creation: shows the full key in a green card with copy button — **only shown once**
- Revoke button sets `is_active = false`

### `/settings/webhooks` — `WebhookManager`

- Lists endpoints with event badges and active/inactive status
- Create form: URL validation, description, event multi-select toggle pills
- Delete button hard-removes the endpoint

### `/settings/compliance/gdpr` — `GdprTools`

- Export My Data: calls `exportMyData()` server action, downloads JSON file client-side using blob URL
- Privacy Controls: informational section (encryption, RLS)
- Danger Zone: two-step confirmation for account deletion request (fires `toast.info`, no destructive DB action — requires support ticket flow)

---

## 6. `lib/compliance/data-export.ts`

Server action that pulls all chef-owned data in parallel:
- `events` (all columns)
- `clients` (all columns)
- `expenses` (all columns)
- `recipes` (id, name, cuisine_type, course_type, created_at)

Returns as a structured JSON object with `exported_at` timestamp and `chef_id`.

---

## How It Connects to the System

- **Tenant scoping**: All queries use `tenant_id = user.entityId` or `chef_id = user.entityId` — no cross-tenant leakage possible
- **Admin client for public API**: Routes at `/api/v1/*` use `createServerClient({ admin: true })` because they authenticate via API key, not Supabase session — RLS would reject them without admin bypass
- **Non-blocking last_used_at**: The `.then(() => {})` pattern prevents the update from blocking the API response
- **Webhook delivery as append-only log**: Matches the ledger-first philosophy — deliveries are recorded and never mutated
- **`as any` type cast**: Used on `chef_api_keys`, `webhook_endpoints`, and `webhook_deliveries` because these tables are not yet in the auto-generated `types/database.ts`. After the next `supabase gen types` run, these casts can be removed

---

## Next Steps

- Run `supabase db push --linked` to apply both migrations to remote
- Run `npx supabase gen types typescript --linked > types/database.ts` to update generated types and remove `as any` casts
- Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env.local` to enable rate limiting in production
- Wire `deliverWebhook()` calls into event FSM transitions (e.g., in `lib/events/transitions.ts` after `completed` state)
- Add `/settings/api-keys` and `/settings/webhooks` links to the settings sidebar navigation
