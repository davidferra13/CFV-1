# ChefFlow API Reference

**Base URL:** `https://cheflowhq.com/api/v1`
**Authentication:** Bearer API key (`Authorization: Bearer CF_LIVE_...`)
**Rate limit:** 100 requests/minute per tenant
**Response format:** JSON

---

## Authentication

All `/api/v1/` endpoints require a valid API key in the `Authorization` header:

```
Authorization: Bearer CF_LIVE_your_api_key_here
```

API keys can be generated at: **Settings → Integrations → API Keys**

Keys are scoped to a single tenant (chef account). A key from Chef A cannot access Chef B's data.

### Error codes

| Status | Meaning                                            |
| ------ | -------------------------------------------------- |
| 200    | Success                                            |
| 400    | Bad request — invalid parameters                   |
| 401    | Missing or invalid API key                         |
| 403    | Forbidden — key lacks permission for this resource |
| 404    | Resource not found                                 |
| 429    | Rate limit exceeded                                |
| 500    | Server error                                       |

---

## Endpoints

### Events

#### GET /api/v1/events

List all events for the authenticated tenant.

**Query parameters:**

| Parameter | Type    | Default | Description                                                                                                     |
| --------- | ------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| `status`  | string  | (all)   | Filter by status: `draft`, `proposed`, `accepted`, `paid`, `confirmed`, `in_progress`, `completed`, `cancelled` |
| `page`    | integer | 1       | Page number (1-indexed)                                                                                         |
| `limit`   | integer | 25      | Events per page (max 200)                                                                                       |

**Request:**

```
GET /api/v1/events?status=confirmed&limit=10
Authorization: Bearer CF_LIVE_...
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "occasion": "Birthday Dinner",
      "event_date": "2026-03-15",
      "status": "confirmed",
      "guest_count": 12,
      "location": "123 Main St, Boston, MA",
      "client_id": "uuid",
      "tenant_id": "uuid",
      "created_at": "2026-02-01T10:00:00Z",
      "updated_at": "2026-02-10T14:30:00Z"
    }
  ],
  "meta": {
    "total": 47,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

---

#### GET /api/v1/events/:id

Retrieve a single event by ID.

**Response:** Same as the event object in the list endpoint, plus related data:

```json
{
  "data": {
    "id": "uuid",
    "occasion": "Birthday Dinner",
    "event_date": "2026-03-15",
    "status": "confirmed",
    "guest_count": 12,
    "location": "...",
    "client_id": "uuid",
    "tenant_id": "uuid",
    "serve_time": "19:00",
    "notes": "...",
    "budget_cents": 350000,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

### Clients

#### GET /api/v1/clients

List all clients for the authenticated tenant.

**Query parameters:**

| Parameter | Type    | Default | Description                                              |
| --------- | ------- | ------- | -------------------------------------------------------- |
| `search`  | string  | (none)  | Filter by name or email (case-insensitive partial match) |
| `page`    | integer | 1       | Page number                                              |
| `limit`   | integer | 25      | Clients per page (max 500)                               |

**Request:**

```
GET /api/v1/clients?search=johnson&limit=20
Authorization: Bearer CF_LIVE_...
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "full_name": "Sarah Johnson",
      "email": "sarah@example.com",
      "phone": "+1-617-555-0100",
      "created_at": "2026-01-15T09:00:00Z"
    }
  ],
  "meta": {
    "total": 83,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

---

## Internal API Endpoints (Chef Session Auth)

The following endpoints are used by the ChefFlow web app. They require an active Supabase session cookie (not an API key). They are documented here for reference but are not intended for third-party use.

> **Note:** These endpoints may change without notice. Use the `/api/v1/` endpoints for stable integrations.

### Health

#### GET /api/health

Public health check. No authentication required.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-02-20T10:00:00.000Z",
  "version": "chefflow-build",
  "requestId": "abc123def456",
  "checks": {
    "env": "ok",
    "database": "ok",
    "redis": "ok",
    "circuit_breakers": "ok"
  },
  "latencyMs": {
    "database": 12,
    "redis": 8
  },
  "circuit_breakers": {
    "stripe": { "state": "CLOSED", "failures": 0 },
    "resend": { "state": "CLOSED", "failures": 0 }
  },
  "uptimeMs": 120000
}
```

Status values: `ok` (all checks pass), `degraded` (optional services unavailable), `error` (critical checks failed — returns HTTP 503).

---

### Webhooks

#### POST /api/webhooks/stripe

Stripe webhook receiver. Requires `Stripe-Signature` header (HMAC SHA-256).
Handled events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `checkout.session.completed`, `customer.subscription.*`

#### POST /api/webhooks/resend

Resend email event receiver. Processes `email.bounced`, `email.complained`.

#### POST /api/webhooks/[provider]

Generic webhook receiver for external integrations.

---

### Cron Endpoints (Internal — Vercel Cron)

All cron endpoints require `Authorization: Bearer {CRON_SECRET}`.

| Endpoint                               | Schedule       | Purpose                         |
| -------------------------------------- | -------------- | ------------------------------- |
| `POST /api/gmail/sync`                 | Every 5 min    | Gmail inbox sync                |
| `POST /api/scheduled/automations`      | Every 15 min   | Automation rule evaluation      |
| `POST /api/scheduled/follow-ups`       | Every 30 min   | Overdue follow-up reminders     |
| `POST /api/scheduled/lifecycle`        | Hourly         | Event lifecycle automation      |
| `POST /api/scheduled/revenue-goals`    | Daily 6am      | Revenue goal progress           |
| `POST /api/scheduled/reviews-sync`     | Daily 3am      | External review aggregation     |
| `POST /api/scheduled/copilot`          | Hourly         | Ops Copilot planning            |
| `POST /api/scheduled/activity-cleanup` | Weekly Sun 2am | Old activity log purge          |
| `POST /api/scheduled/push-cleanup`     | Daily          | Expired push subscription purge |
| `POST /api/scheduled/monitor`          | Every 5 min    | Cron health aggregator          |

---

## Versioning Policy

The `/api/v1/` public REST API follows these stability guarantees:

- **Additive changes only:** New fields may be added to responses without notice
- **Breaking changes:** Only in a new version (`/api/v2/`) with 90-day deprecation notice
- **Deprecated fields:** Marked in documentation, removed only in the next major version
- **Schema versioning:** Response schema version included in headers (`X-API-Version: 1`)

---

## Rate Limiting

Rate limits are enforced per API key using a sliding window (powered by Upstash Redis):

| Limit        | Window   |
| ------------ | -------- |
| 100 requests | 1 minute |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1740000060
```

When the limit is exceeded, the response is:

```json
{ "error": "Rate limit exceeded. Retry after 30 seconds." }
```

---

## Changelog

| Date       | Version | Change                                                  |
| ---------- | ------- | ------------------------------------------------------- |
| 2026-02-20 | v1      | Initial public API: `/api/v1/events`, `/api/v1/clients` |

---

_Last updated: 2026-02-20_
