# ChefFlow API v2 Reference

> Full CRUD REST API for programmatic access to every ChefFlow entity.

## Authentication

All v2 endpoints require an API key in the `Authorization` header:

```
Authorization: Bearer cf_live_<your_key>
```

API keys are managed at `/settings/api-keys`. Each key has scoped permissions.

## Rate Limiting

100 requests per minute per tenant. When exceeded, returns `429` with `X-RateLimit-Reset` header.

## Response Format

All responses use a consistent envelope:

```json
// Success
{
  "data": { ... },
  "meta": { "page": 1, "per_page": 50, "total": 142, "count": 50 }
}

// Error
{
  "error": { "code": "not_found", "message": "Event not found", "details": null }
}
```

## Pagination

List endpoints support offset pagination:

| Param      | Default | Max | Description             |
| ---------- | ------- | --- | ----------------------- |
| `page`     | 1       | -   | Page number (1-indexed) |
| `per_page` | 50      | 200 | Results per page        |

---

## Endpoints

### Events

| Method | Path                            | Scope        | Description                                                   |
| ------ | ------------------------------- | ------------ | ------------------------------------------------------------- |
| GET    | `/api/v2/events`                | events:read  | List events (filter by status, client_id, date_from, date_to) |
| POST   | `/api/v2/events`                | events:write | Create event                                                  |
| GET    | `/api/v2/events/:id`            | events:read  | Get event detail with client                                  |
| PATCH  | `/api/v2/events/:id`            | events:write | Update event                                                  |
| DELETE | `/api/v2/events/:id`            | events:write | Soft delete event                                             |
| POST   | `/api/v2/events/:id/transition` | events:write | Transition event state                                        |

### Clients

| Method | Path                  | Scope         | Description                    |
| ------ | --------------------- | ------------- | ------------------------------ |
| GET    | `/api/v2/clients`     | clients:read  | List clients (search with ?q=) |
| POST   | `/api/v2/clients`     | clients:write | Create client                  |
| GET    | `/api/v2/clients/:id` | clients:read  | Get client detail              |
| PATCH  | `/api/v2/clients/:id` | clients:write | Update client                  |

### Quotes

| Method | Path                        | Scope        | Description                                         |
| ------ | --------------------------- | ------------ | --------------------------------------------------- |
| GET    | `/api/v2/quotes`            | quotes:read  | List quotes (filter by status, event_id, client_id) |
| POST   | `/api/v2/quotes`            | quotes:write | Create quote                                        |
| GET    | `/api/v2/quotes/:id`        | quotes:read  | Get quote detail                                    |
| PATCH  | `/api/v2/quotes/:id`        | quotes:write | Update draft quote                                  |
| POST   | `/api/v2/quotes/:id/send`   | quotes:write | Send quote to client                                |
| POST   | `/api/v2/quotes/:id/accept` | quotes:write | Mark quote as accepted                              |

### Inquiries

| Method | Path                    | Scope           | Description        |
| ------ | ----------------------- | --------------- | ------------------ |
| GET    | `/api/v2/inquiries`     | inquiries:read  | List inquiries     |
| POST   | `/api/v2/inquiries`     | inquiries:write | Create inquiry     |
| GET    | `/api/v2/inquiries/:id` | inquiries:read  | Get inquiry detail |
| PATCH  | `/api/v2/inquiries/:id` | inquiries:write | Update inquiry     |

### Menus

| Method | Path                | Scope       | Description     |
| ------ | ------------------- | ----------- | --------------- |
| GET    | `/api/v2/menus`     | menus:read  | List menus      |
| POST   | `/api/v2/menus`     | menus:write | Create menu     |
| GET    | `/api/v2/menus/:id` | menus:read  | Get menu detail |
| PATCH  | `/api/v2/menus/:id` | menus:write | Update menu     |

### Recipes (Read-Only)

| Method | Path                  | Scope        | Description                                        |
| ------ | --------------------- | ------------ | -------------------------------------------------- |
| GET    | `/api/v2/recipes`     | recipes:read | List recipes (filter by category, cuisine, search) |
| GET    | `/api/v2/recipes/:id` | recipes:read | Get recipe detail                                  |

### Finance

| Method | Path                         | Scope         | Description                                  |
| ------ | ---------------------------- | ------------- | -------------------------------------------- |
| GET    | `/api/v2/expenses`           | finance:read  | List expenses                                |
| POST   | `/api/v2/expenses`           | finance:write | Log expense                                  |
| GET    | `/api/v2/expenses/:id`       | finance:read  | Get expense detail                           |
| GET    | `/api/v2/ledger`             | finance:read  | List ledger entries                          |
| POST   | `/api/v2/payments`           | finance:write | Record manual payment                        |
| GET    | `/api/v2/financials/summary` | finance:read  | Financial summary (per-event or tenant-wide) |

### Documents

| Method | Path                         | Scope           | Description             |
| ------ | ---------------------------- | --------------- | ----------------------- |
| GET    | `/api/v2/documents`          | documents:read  | List document snapshots |
| POST   | `/api/v2/documents/generate` | documents:write | Generate document       |

### Search

| Method | Path                    | Scope       | Description                      |
| ------ | ----------------------- | ----------- | -------------------------------- |
| GET    | `/api/v2/search?q=term` | search:read | Universal search across entities |

### Settings

| Method | Path                               | Scope          | Description            |
| ------ | ---------------------------------- | -------------- | ---------------------- |
| GET    | `/api/v2/settings/preferences`     | settings:read  | Get chef preferences   |
| PATCH  | `/api/v2/settings/preferences`     | settings:write | Update preferences     |
| GET    | `/api/v2/settings/pricing`         | settings:read  | Get pricing config     |
| PATCH  | `/api/v2/settings/pricing`         | settings:write | Update pricing config  |
| GET    | `/api/v2/settings/automations`     | settings:read  | List automation rules  |
| POST   | `/api/v2/settings/automations`     | settings:write | Create automation rule |
| PATCH  | `/api/v2/settings/automations/:id` | settings:write | Update rule            |
| DELETE | `/api/v2/settings/automations/:id` | settings:write | Delete rule            |

### Queue

| Method | Path            | Scope      | Description             |
| ------ | --------------- | ---------- | ----------------------- |
| GET    | `/api/v2/queue` | queue:read | Get priority work queue |

---

## Scopes

| Scope           | Description                               |
| --------------- | ----------------------------------------- |
| events:read     | List and view events                      |
| events:write    | Create, update, delete, transition events |
| clients:read    | List and view clients                     |
| clients:write   | Create and update clients                 |
| quotes:read     | List and view quotes                      |
| quotes:write    | Create, update, send, accept quotes       |
| inquiries:read  | List and view inquiries                   |
| inquiries:write | Create and update inquiries               |
| menus:read      | List and view menus                       |
| menus:write     | Create and update menus                   |
| recipes:read    | List and view recipes                     |
| finance:read    | View expenses, ledger, summaries          |
| finance:write   | Log expenses, record payments             |
| documents:read  | List documents                            |
| documents:write | Generate documents                        |
| settings:read   | View preferences and config               |
| settings:write  | Update preferences and config             |
| webhooks:manage | Manage webhook subscriptions              |
| search:read     | Search across entities                    |
| queue:read      | View priority queue                       |

Write scopes implicitly grant the corresponding read scope.

## Event State Machine

```
draft -> proposed -> accepted -> paid -> confirmed -> in_progress -> completed
                                                                  -> cancelled (from any non-terminal state)
```

Use `POST /api/v2/events/:id/transition` with `{ "to_status": "proposed" }` to advance.
