# API Route Auth Matrix

Audit date: 2026-05-14

## Summary

| Metric                                                                     | Count |
| -------------------------------------------------------------------------- | ----- |
| Total API route files                                                      | 400   |
| Middleware-authed (not excluded from matcher)                              | ~210  |
| Self-authed via `withApiAuth` (v2)                                         | 152   |
| Self-authed via `verifyCronAuth` (cron + scheduled)                        | 76    |
| Self-authed via Twilio webhook validation                                  | 8     |
| Self-authed via `requireChef`/`requireClient`/`getCurrentUser`             | ~52   |
| Self-authed via admin check (`isAdmin`/`getCurrentAdminUser`)              | 7     |
| Self-authed via other (Stripe, HMAC, Sentinel, connector key, prospecting) | 15    |
| Intentionally public (health, OG images, static data)                      | ~25   |
| **CRITICAL gaps (no auth at all, exposes data/mutations)**                 | **0** |
| **MEDIUM gaps (auth present but defense-in-depth missing)**                | **5** |

## Auth Layer Architecture

ChefFlow uses a two-layer auth model:

1. **Middleware layer** (`middleware.ts`): Auth.js JWT session check. Routes NOT in the matcher exclusion list get automatic 401 for unauthenticated requests to `/api/*` paths.
2. **Route-level layer**: Routes excluded from middleware must self-authenticate using `verifyCronAuth()`, `withApiAuth()`, webhook signature verification, token auth, or similar.

The middleware matcher excludes these API prefixes (they bypass middleware auth):

```
auth, webhooks, build-version, gmail, scheduled, e2e, remy/client, remy/stream,
remy/public, remy/landing, ollama-status, health, ai/health, ai/monitor, documents,
embed, demo, monitoring, inngest, kiosk, feeds, v2, storage, realtime, book, cron,
discovery, sentinel, openclaw/webhook, ingredients, calling, llm-txt
```

These are also listed in `API_SKIP_AUTH_PREFIXES` in `lib/auth/route-policy.ts`.

---

## Skip-Auth Routes: Self-Authentication Verification

### Cron Routes (`/api/cron/*`) - 31 routes

All 31 cron routes use `verifyCronAuth()`. **Full coverage.**

### Scheduled Routes (`/api/scheduled/*`) - 41 routes

All 41 scheduled routes use `verifyCronAuth()` or equivalent cron secret check. **Full coverage.**

### V2 API Routes (`/api/v2/*`) - 152 routes

All 152 v2 routes use `withApiAuth()` wrapper. **Full coverage.**

### Webhook Routes (`/api/webhooks/*`) - 6 routes

| Route                         | Auth Mechanism                            | Status |
| ----------------------------- | ----------------------------------------- | ------ |
| `/api/webhooks/stripe`        | `stripe.webhooks.constructEvent()`        | OK     |
| `/api/webhooks/resend`        | Webhook secret verification               | OK     |
| `/api/webhooks/twilio`        | `validateTwilioSignature()`               | OK     |
| `/api/webhooks/wix`           | Webhook secret header check               | OK     |
| `/api/webhooks/docusign`      | HMAC signature (`x-docusign-signature-1`) | OK     |
| `/api/webhooks/[provider]`    | Provider-specific verification            | OK     |
| `/api/webhooks/email/inbound` | Resend webhook verification               | OK     |

### Calling Routes (`/api/calling/*`) - 8 routes

| Route                         | Auth Mechanism            | Status |
| ----------------------------- | ------------------------- | ------ |
| `/api/calling/auto-resolve`   | `requireChef()`           | OK     |
| `/api/calling/enabled`        | `auth()` session check    | OK     |
| `/api/calling/gather`         | `validateTwilioWebhook()` | OK     |
| `/api/calling/inbound`        | `validateTwilioWebhook()` | OK     |
| `/api/calling/recording`      | `validateTwilioWebhook()` | OK     |
| `/api/calling/status`         | `validateTwilioWebhook()` | OK     |
| `/api/calling/voicemail`      | `validateTwilioWebhook()` | OK     |
| `/api/calling/voicemail/done` | `validateTwilioWebhook()` | OK     |

### Kiosk Routes (`/api/kiosk/*`) - 8 routes

| Route                       | Auth Mechanism                                         | Status           |
| --------------------------- | ------------------------------------------------------ | ---------------- |
| `/api/kiosk/pair`           | Rate-limited pairing code + hash verification          | OK               |
| `/api/kiosk/heartbeat`      | Device token auth                                      | OK               |
| `/api/kiosk/inquiry`        | Rate-limited, public kiosk form                        | OK (intentional) |
| `/api/kiosk/status`         | Device token auth                                      | OK               |
| `/api/kiosk/verify-pin`     | Device token + PIN verification                        | OK               |
| `/api/kiosk/end-session`    | Device token auth                                      | OK               |
| `/api/kiosk/order/catalog`  | `authenticateOrderKioskRequest()`                      | OK               |
| `/api/kiosk/order/checkout` | `authenticateOrderKioskRequest()`                      | OK               |
| `/api/kiosk/order/drawer`   | `authenticateOrderKioskRequest()` + manager permission | OK               |

### Document Routes (`/api/documents/*`) - 15 routes

All use `requireChef()` internally or serve tenant-scoped data via signed tokens. **Full coverage.**

### Realtime Routes (`/api/realtime/*`) - 3 routes

| Route                     | Auth Mechanism                       | Status |
| ------------------------- | ------------------------------------ | ------ |
| `/api/realtime/[channel]` | `auth()` + channel access validation | OK     |
| `/api/realtime/presence`  | `auth()` + channel access validation | OK     |
| `/api/realtime/typing`    | `auth()` + channel access validation | OK     |

### Storage Routes (`/api/storage/*`) - 2 routes

| Route                           | Auth Mechanism                                  | Status           |
| ------------------------------- | ----------------------------------------------- | ---------------- |
| `/api/storage/[...path]`        | Signed token verification (`verifySignedToken`) | OK               |
| `/api/storage/public/[...path]` | Public buckets allowlist (6 buckets only)       | OK (intentional) |

### Discovery Routes (`/api/discovery/*`) - 6 routes

| Route                            | Auth Mechanism                            | Status |
| -------------------------------- | ----------------------------------------- | ------ |
| `/api/discovery/click`           | Intentionally public (analytics tracking) | OK     |
| `/api/discovery/identify`        | Intentionally public (profile match)      | OK     |
| `/api/discovery/profile`         | Intentionally public (chef profile data)  | OK     |
| `/api/discovery/profile/export`  | Intentionally public (profile export)     | OK     |
| `/api/discovery/profile/outcome` | Intentionally public (outcome tracking)   | OK     |
| `/api/discovery/profile/report`  | Intentionally public (profile report)     | OK     |

### Sentinel Routes (`/api/sentinel/*`) - 3 routes

| Route                       | Auth Mechanism                           | Status |
| --------------------------- | ---------------------------------------- | ------ |
| `/api/sentinel/auth`        | `SENTINEL_SECRET` header + rate limiting | OK     |
| `/api/sentinel/health`      | `SENTINEL_SECRET` header                 | OK     |
| `/api/sentinel/sync-status` | `SENTINEL_SECRET` header                 | OK     |

### Other Skip-Auth Routes

| Route                          | Auth Mechanism                                  | Status           |
| ------------------------------ | ----------------------------------------------- | ---------------- |
| `/api/auth/[...nextauth]`      | Auth.js handler (login/logout)                  | OK (framework)   |
| `/api/auth/clear`              | Session clearing endpoint                       | OK (intentional) |
| `/api/auth/google/connect/*`   | OAuth flow with session check                   | OK               |
| `/api/build-version`           | Static version info, no sensitive data          | OK (intentional) |
| `/api/e2e/auth`                | Dev-only test auth                              | OK (dev-gated)   |
| `/api/embed/inquiry`           | Public inquiry form                             | OK (intentional) |
| `/api/feeds/calendar/[token]`  | Token-based auth in URL                         | OK               |
| `/api/gmail/sync`              | `requireChef()` internally                      | OK               |
| `/api/health/*`                | Health checks, no sensitive data                | OK (intentional) |
| `/api/hub-public/*`            | Public hub data                                 | OK (intentional) |
| `/api/inngest`                 | Inngest framework signing                       | OK               |
| `/api/llm-txt`                 | Static LLM context, no sensitive data           | OK (intentional) |
| `/api/monitoring/report-error` | Client error reporting, no mutations            | OK (intentional) |
| `/api/ollama-status`           | AI service status, no sensitive data            | OK (intentional) |
| `/api/openclaw/webhook`        | Webhook secret verification                     | OK               |
| `/api/remy/client`             | `requireClient()` internally                    | OK               |
| `/api/remy/stream`             | `requireChef()` or `requireClient()` internally | OK               |
| `/api/remy/public`             | Intentionally public (landing page Remy)        | OK               |
| `/api/remy/landing`            | Intentionally public (landing page)             | OK               |
| `/api/book/*`                  | Public booking flow                             | OK (intentional) |
| `/api/demo/*`                  | Demo data, no real tenant data                  | OK (intentional) |
| `/api/ingredients/search`      | Public ingredient search, no PII                | OK (intentional) |
| `/api/ingredients/[id]`        | `requireChef()` internally                      | OK               |
| `/api/web-research/health`     | Service health status, no sensitive data        | OK (intentional) |
| `/api/ai/health`               | Service health status                           | OK (intentional) |
| `/api/ai/monitor`              | Service monitoring                              | OK (intentional) |

---

## Middleware-Authed Routes Without Explicit Route-Level Auth

These routes are NOT in the skip-auth list, so middleware provides session authentication. They do not have explicit `requireChef()`/`requireAuth()` calls in the route file itself, but rely on:

1. Middleware 401 for unauthenticated requests
2. Internal function auth (`requireChef()` inside called server actions/lib functions)
3. Being intentionally public-safe (no PII, read-only)

| Route                                   | Internal Auth                                                      | Exposes                   | Risk                   |
| --------------------------------------- | ------------------------------------------------------------------ | ------------------------- | ---------------------- |
| `/api/activity/track`                   | CSRF verification + rate limiting; no explicit user check in route | Activity tracking writes  | MEDIUM                 |
| `/api/cannabis/rsvps/[eventId]/summary` | Feature disabled (returns 404)                                     | Nothing                   | NONE                   |
| `/api/chefs/parse-search`               | Public NL parser, rate-limited, no PII                             | Search filter suggestions | NONE                   |
| `/api/clients/[clientId]/household`     | `requireChef()` inside `household-actions.ts`                      | Household data mutations  | LOW (defense-in-depth) |
| `/api/interactions`                     | `getCurrentUser()` inside actions, but proceeds without user       | Interaction writes        | MEDIUM                 |
| `/api/og/nearby`                        | Static OG image generator                                          | Open Graph images         | NONE                   |
| `/api/og/services`                      | Static OG image generator                                          | Open Graph images         | NONE                   |
| `/api/openclaw/health`                  | `isAdmin()` check in route                                         | Admin-only data           | OK                     |
| `/api/openclaw/image`                   | Image proxy with SSRF protections                                  | Proxied images            | NONE                   |
| `/api/pie/v1/health`                    | No auth, read-only aggregate stats                                 | PIE health metrics        | NONE                   |
| `/api/pie/v1/price/batch`               | Rate limiting only, no auth                                        | Pricing data              | MEDIUM                 |
| `/api/prep-timeline/ical`               | `requireChef()` inside `ical-export.ts`                            | Prep timeline iCal        | LOW (defense-in-depth) |
| `/api/pricing/bridge-health`            | No auth, read-only status                                          | Circuit breaker state     | NONE                   |
| `/api/public/client-lookup`             | Rate-limited, returns only `found: boolean`                        | Existence check only      | NONE                   |
| `/api/push/vapid-public-key`            | Public key is not secret                                           | VAPID public key          | NONE                   |
| `/api/scheduling/availability`          | `requireChef()` inside `time-blocks.ts`                            | Chef availability         | LOW (defense-in-depth) |
| `/api/system/heal`                      | `isAdmin()` check in route                                         | Admin mutation            | OK                     |
| `/api/system/health`                    | `isAdmin()` check in route                                         | Admin-only health data    | OK                     |
| `/api/tickets/[ticketId]/checkin`       | Token-based (guest_token in query)                                 | Ticket check-in mutation  | OK (token auth)        |
| `/api/tickets/[ticketId]/qr`            | Token-based (guest_token in query)                                 | QR code image             | OK (token auth)        |

---

## CRITICAL Findings

**No critical auth gaps found.** Every route that handles sensitive data or mutations has at least one layer of authentication.

## MEDIUM Findings (5 items)

### 1. `/api/activity/track` - Missing explicit user validation

- **Issue**: Route accepts POST requests and writes activity records. It verifies CSRF origin and rate-limits by IP, but does not explicitly validate the user session at the route level. Middleware provides session auth, but the route reads `tenantId` from the request body rather than from an authenticated session.
- **Impact**: If middleware is ever bypassed or misconfigured, activity could be written with spoofed tenant IDs.
- **Recommendation**: Add `requireChef()` or `requireClient()` at route level and derive tenant from session.

### 2. `/api/interactions` - Proceeds without authenticated user

- **Issue**: The `executeInteractionAction` calls `getCurrentUser()` but continues execution even when no user is found (anonymous actor). While middleware blocks unauthenticated access, the route code does not enforce auth itself.
- **Impact**: If middleware is ever reconfigured to skip this path, anonymous interactions could be written.
- **Recommendation**: Add explicit auth check at route level. Return 401 if no user.

### 3. `/api/pie/v1/price/batch` - Rate-limited but no auth

- **Issue**: Batch price lookup endpoint is rate-limited but has no authentication. It returns pricing intelligence data. While middleware currently protects it, this is not in the skip-auth list and could be accidentally excluded.
- **Impact**: Pricing intelligence data exposure if middleware changes.
- **Recommendation**: Add route-level auth or explicitly document as intentionally semi-public.

### 4. `/api/clients/[clientId]/household` - Auth only in server action layer

- **Issue**: Route has POST/PATCH/DELETE handlers that delegate to `household-actions.ts` which calls `requireChef()`. The route itself has no auth check.
- **Impact**: Defense-in-depth concern. If the server action auth is refactored incorrectly, the route would be unprotected.
- **Recommendation**: Add `requireChef()` at route level before delegating.

### 5. `/api/pie/v1/health` - No auth on PIE health endpoint

- **Issue**: Returns PIE database statistics (census size, coverage percentages, product counts). No auth check.
- **Impact**: Operational metrics leak. Low sensitivity but unnecessary exposure.
- **Recommendation**: Add `isAdmin()` check or basic auth, consistent with `/api/openclaw/health`.

## LOW Findings (defense-in-depth)

The following routes rely on auth inside called library functions rather than at the route level. They work correctly today but lack defense-in-depth:

- `/api/prep-timeline/ical` - `requireChef()` in `lib/prep-timeline/ical-export.ts`
- `/api/scheduling/availability` - `requireChef()` in `lib/scheduling/time-blocks.ts`

**Recommendation**: Move auth checks to route level for all routes that perform mutations or return tenant-scoped data.

---

## Middleware vs. Skip-Auth Alignment

The middleware `config.matcher` regex and `API_SKIP_AUTH_PREFIXES` in `route-policy.ts` are **in sync**. Both lists contain the same prefixes. This is good, no route falls through the cracks between the two lists.

One notable pattern: `API_SKIP_AUTH_PREFIXES` also includes `/auth` (without `/api/` prefix) for the Auth.js callback pages, which middleware handles separately.

---

## Auth Mechanism Distribution

| Mechanism                           | Route Count | Notes                                    |
| ----------------------------------- | ----------- | ---------------------------------------- |
| `withApiAuth()`                     | 152         | All v2 routes                            |
| `verifyCronAuth()`                  | 76          | All cron + scheduled routes              |
| `requireChef()`                     | 35          | Chef workspace API routes                |
| `getCurrentUser()`                  | 12          | Multi-role routes                        |
| `auth()` session                    | 8           | Direct Auth.js session check             |
| `validateTwilioWebhook()`           | 8           | All Twilio callback routes               |
| `validateProspectingAuth()`         | 8           | Prospecting routes                       |
| `isAdmin()`/`getCurrentAdminUser()` | 7           | Admin routes                             |
| `requireClient()`                   | 5           | Client-facing routes                     |
| `authenticateOrderKioskRequest()`   | 3           | Kiosk POS routes                         |
| HMAC/webhook signature              | 3           | DocuSign, OpenClaw                       |
| `SENTINEL_SECRET`                   | 2           | Pi monitoring                            |
| `validateConnectorKey()`            | 3           | Local AI connector                       |
| Signed token (`verifySignedToken`)  | 1           | Storage file access                      |
| Stripe `constructEvent()`           | 1           | Payment webhooks                         |
| Middleware-only (no route-level)    | ~25         | Routes relying solely on middleware      |
| Intentionally public                | ~25         | Health checks, OG images, public lookups |

---

## Conclusion

The API auth posture is **strong overall**. All 400 routes have at least one auth layer. The critical paths (v2 API, cron/scheduled, webhooks, kiosk, storage) all have proper self-authentication. The 5 medium findings are defense-in-depth concerns where routes rely on middleware or internal function auth rather than explicit route-level checks. No route exposes PII or allows mutations without authentication.
