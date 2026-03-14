# Access Control Matrix — ChefFlow V1

**Last reviewed:** 2026-02-20

This document maps every role to every resource and operation. It is the single source of truth for "can Role X do Action Y on Resource Z?"

---

## Roles

| Role          | Description                                                  | How assigned                                            |
| ------------- | ------------------------------------------------------------ | ------------------------------------------------------- |
| **chef**      | Tenant owner — full access to their own data                 | `user_roles.role = 'chef'` + `entity_id = chefs.id`     |
| **client**    | End-client of a chef — scoped to their events with that chef | `user_roles.role = 'client'` + `entity_id = clients.id` |
| **system**    | Backend-only (Stripe webhooks, cron jobs)                    | Uses `SUPABASE_SERVICE_ROLE_KEY`                        |
| **admin**     | Platform operator — cross-tenant visibility                  | Email in `ADMIN_EMAILS` env var                         |
| **anonymous** | Unauthenticated visitor                                      | No session                                              |

---

## Enforcement Layers

Every action is guarded by **multiple** layers:

1. **Middleware** (`middleware.ts`) — route-level protection, redirects to sign-in
2. **Server action guard** — `requireChef()`, `requireClient()`, `requireAuth()`
3. **RLS policies** — database-level, enforced on every query regardless of app code
4. **Tenant scoping** — all queries include `.eq('tenant_id', tenantId)`

---

## Route Protection

| Route Pattern                                                                                                         | Allowed Roles                 | Middleware Action                        |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------- |
| `/dashboard`, `/events/*`, `/clients/*`, `/financials`, `/culinary/*`, `/operations/*`, `/marketing/*`, `/settings/*` | chef only                     | Redirect to `/auth/signin` if not chef   |
| `/my-events/*`, `/my-quotes/*`, `/my-profile`                                                                         | client only                   | Redirect to `/auth/signin` if not client |
| `/admin/*`                                                                                                            | admin only                    | Redirect to `/auth/signin` if not admin  |
| `/auth/*`                                                                                                             | anonymous + any authenticated | No restriction                           |
| `/p/*` (public booking page)                                                                                          | anonymous + any               | No restriction                           |
| `/portal/*` (client portal)                                                                                           | client (token-based)          | Validate portal token                    |
| `/api/v1/*`                                                                                                           | chef (API key)                | 401 if missing/invalid key               |
| `/api/webhooks/*`                                                                                                     | system (HMAC)                 | 401 if signature invalid                 |
| `/api/scheduled/*`                                                                                                    | system (CRON_SECRET)          | 401 if missing/invalid                   |
| `/api/health`                                                                                                         | anonymous                     | No restriction                           |
| `/api/admin/*`                                                                                                        | admin                         | 401 if not admin                         |

---

## Resource Access Matrix

### Events

| Action                            | Chef (own)          | Chef (other tenant) | Client (own)      | Client (other) | System      | Admin |
| --------------------------------- | ------------------- | ------------------- | ----------------- | -------------: | ----------- | ----- |
| Create event                      | ✅                  | ❌ RLS              | ❌                |             ❌ | ✅          | ✅    |
| View event                        | ✅                  | ❌ RLS              | ✅ (their events) |         ❌ RLS | ✅          | ✅    |
| Update event                      | ✅                  | ❌ RLS              | ❌                |             ❌ | ✅          | ✅    |
| Delete event                      | ✅ (if no payments) | ❌                  | ❌                |             ❌ | ❌          | ✅    |
| Transition: draft→proposed        | ✅                  | ❌                  | ❌                |             ❌ | ❌          | —     |
| Transition: proposed→accepted     | ❌                  | ❌                  | ✅                |             ❌ | ❌          | —     |
| Transition: accepted→paid         | ❌                  | ❌                  | ❌                |             ❌ | ✅ (Stripe) | —     |
| Transition: paid→confirmed        | ✅                  | ❌                  | ❌                |             ❌ | ❌          | —     |
| Transition: \*→cancelled          | ✅                  | ❌                  | ✅ (own)          |             ❌ | ✅          | —     |
| Transition: in_progress→completed | ✅                  | ❌                  | ❌                |             ❌ | ❌          | —     |

### Clients

| Action                 | Chef (own) | Chef (other) | Client (own)  | System | Admin |
| ---------------------- | ---------- | ------------ | ------------- | ------ | ----- |
| Create client          | ✅         | ❌           | ❌            | ✅     | ✅    |
| View client list       | ✅         | ❌ RLS       | ❌            | ✅     | ✅    |
| View own client record | ✅         | ❌           | ✅            | ✅     | ✅    |
| Update client          | ✅         | ❌           | ✅ (own info) | ✅     | ✅    |
| Delete client          | ✅         | ❌           | ❌            | ❌     | ✅    |
| Invite client (portal) | ✅         | ❌           | ❌            | ❌     | —     |

### Ledger / Financial Records

| Action                            | Chef                   | Client | System       | Admin |
| --------------------------------- | ---------------------- | ------ | ------------ | ----- |
| View ledger (own tenant)          | ✅                     | ❌     | ✅           | ✅    |
| Create ledger entry (adjustment)  | ✅                     | ❌     | ✅ (webhook) | ✅    |
| Update ledger entry               | ❌ (immutable trigger) | ❌     | ❌           | ❌    |
| Delete ledger entry               | ❌ (immutable trigger) | ❌     | ❌           | ❌    |
| Export financial data (Excel/CSV) | ✅                     | ❌     | ❌           | ✅    |

### Messages / Chat

| Action            | Chef (own tenant) | Client (own events) | System           | Admin |
| ----------------- | ----------------- | ------------------: | ---------------- | ----- |
| View conversation | ✅                |                  ✅ | ✅               | ✅    |
| Send message      | ✅                |                  ✅ | ✅ (system msgs) | —     |
| Delete message    | ❌                |                  ❌ | ❌               | ✅    |

### Inquiries and Quotes

| Action                   | Chef | Client               | System                 | Admin |
| ------------------------ | ---- | -------------------- | ---------------------- | ----- |
| Submit inquiry           | ❌   | ✅ (via public form) | ✅ (webhook ingestion) | —     |
| View inquiry             | ✅   | ✅ (own)             | ✅                     | ✅    |
| Create quote             | ✅   | ❌                   | ❌                     | —     |
| Accept/reject quote      | ❌   | ✅ (own)             | ❌                     | —     |
| Convert inquiry to event | ✅   | ❌                   | ❌                     | —     |

### Menus and Recipes

| Action              | Chef | Client         | System | Admin |
| ------------------- | ---- | -------------- | ------ | ----- |
| Create menu         | ✅   | ❌             | ❌     | —     |
| View menu           | ✅   | ✅ (if shared) | ✅     | ✅    |
| Approve/reject menu | ❌   | ✅ (own event) | ❌     | —     |
| Manage recipes      | ✅   | ❌             | ❌     | —     |

### Settings and Configuration

| Action                   | Chef | Client | System | Admin |
| ------------------------ | ---- | ------ | ------ | ----- |
| Chef profile update      | ✅   | ❌     | ❌     | ✅    |
| Contract templates       | ✅   | ❌     | ❌     | —     |
| Automation rules         | ✅   | ❌     | ❌     | —     |
| Feature flags (per-chef) | ❌   | ❌     | ❌     | ✅    |
| Webhook endpoints        | ✅   | ❌     | ❌     | ✅    |
| API keys (own)           | ✅   | ❌     | ❌     | ✅    |

### Admin Panel

| Action               | Chef | Client | System | Admin |
| -------------------- | ---- | ------ | ------ | ----- |
| View all tenants     | ❌   | ❌     | ❌     | ✅    |
| Impersonate chef     | ❌   | ❌     | ❌     | ✅    |
| Toggle feature flags | ❌   | ❌     | ❌     | ✅    |
| View admin audit log | ❌   | ❌     | ❌     | ✅    |
| Bulk operations      | ❌   | ❌     | ❌     | ✅    |

---

## RLS Coverage

Every table that stores tenant data has RLS enabled. Key policies:

| Table                     | Chef policy                           | Client policy                                                            | System access             |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------------------ | ------------------------- |
| `events`                  | `tenant_id = get_current_tenant_id()` | `id IN (SELECT event_id FROM event_client_access WHERE client_id = ...)` | Service role bypasses RLS |
| `clients`                 | `tenant_id = get_current_tenant_id()` | `id = get_current_client_id()`                                           | Service role              |
| `ledger_entries`          | `tenant_id = get_current_tenant_id()` | No access                                                                | Service role              |
| `event_state_transitions` | SELECT only, `tenant_id = ...`        | No access                                                                | Service role              |
| `messages`                | `tenant_id = get_current_tenant_id()` | Via conversation membership                                              | Service role              |
| `admin_audit_log`         | No access                             | No access                                                                | Service role only         |
| `dead_letter_queue`       | SELECT own (via tenant_id)            | No access                                                                | Service role              |

---

## What is NOT Supported (By Design)

- **Collaborators** — no shared-access model (Chef A cannot grant Chef B access to their events)
- **Fine-grained scopes** — API keys are all-or-nothing per tenant (no read-only keys)
- **Client write access to menus** — clients can only approve/reject, not author
- **Chef access to ledger via API key** — the public API is read-only for events and clients; no ledger endpoint

---

## Testing Access Control

Automated tests for access control:

- `tests/e2e/17-tenant-isolation.spec.ts` — Cross-tenant isolation (Chef A vs Chef B)
- `tests/e2e/15-coverage-auth-boundaries.spec.ts` — Route protection tests (unauthenticated + wrong role)
- `tests/integration/ledger-idempotency.integration.test.ts` — Ledger immutability

To verify manually:

```bash
# As Chef A: try to access Chef B's event — should get 404 or redirect
curl -X GET https://cheflowhq.com/events/[chef-b-event-id] -H "Cookie: ..."

# Invalid API key:
curl /api/v1/events -H "Authorization: Bearer CF_LIVE_INVALID"
# → 401

# Missing Authorization:
curl /api/v1/events
# → 401
```

---

_Last updated: 2026-02-20_
