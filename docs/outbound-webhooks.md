# Outbound Webhooks (Phase 4 - External Directory)

## What Changed

Added a complete outbound webhook system that lets chefs push real-time event notifications to external services (Zapier, Make, custom integrations, CRM systems, etc.).

## Architecture

### Database (migration `20260309000004`)

Enhanced the existing `webhook_endpoints` and `webhook_deliveries` tables with:

- `failure_count` on endpoints: tracks consecutive failures, auto-disables at 10
- `last_triggered_at` on endpoints: when the endpoint was last fired
- `duration_ms` on deliveries: round-trip time in milliseconds
- `success` boolean on deliveries: whether 2xx was received
- Auto-update trigger on `webhook_endpoints.updated_at`
- Indexes for cleanup and failure monitoring

### Type System (`lib/webhooks/types.ts`)

Defines 18 webhook event types covering events, clients, quotes, inquiries, payments, expenses, menus, and documents. Includes human-readable labels for the UI.

### Emitter (`lib/webhooks/emitter.ts`)

`emitWebhook(chefId, eventType, payload)` is the fire-and-forget entry point:

- Queries active subscriptions matching the event type
- POSTs JSON with HMAC-SHA256 signature (`X-ChefFlow-Signature` header)
- 10-second timeout per delivery
- Logs every attempt to `webhook_deliveries`
- Resets failure count on success; increments on failure
- Auto-disables endpoint after 10 consecutive failures
- Never throws (safe for non-blocking side effects)

### Server Actions (`lib/webhooks/actions.ts`)

Full CRUD:

- `listWebhookSubscriptions()` - all endpoints for current chef
- `createWebhookEndpoint(input)` - creates with auto-generated HMAC secret (returned once)
- `updateWebhookEndpoint(id, input)` - toggle active, change URL/events
- `deleteWebhookEndpoint(id)` - removes endpoint and delivery history
- `testWebhookEndpoint(id)` - sends `test.ping` and returns result
- `getWebhookDeliveryLog(subscriptionId, limit)` - recent deliveries

All actions use `requireChef()` and scope to tenant.

### Settings UI (`app/(chef)/settings/webhooks/page.tsx`)

- Endpoint list with status badges, failure counts, last triggered time
- Create form with all 18 event types as selectable chips
- One-time secret display with copy button after creation
- Pause/enable toggle per endpoint
- Test button with inline result display
- Expandable delivery log per endpoint (last 20 entries)

### Hooks (Non-Blocking Side Effects)

Webhook emission is wired into:

- `lib/events/actions.ts` - `createEvent()` fires `event.created`
- `lib/events/actions.ts` - `updateEvent()` fires `event.updated`
- `lib/events/transitions.ts` - `transitionEvent()` fires `event.transitioned`
- `lib/clients/actions.ts` - `createClient()` fires `client.created`
- `lib/clients/actions.ts` - `updateClient()` fires `client.updated`

All hooks use dynamic `import()` and `try/catch` to avoid circular deps and ensure the main operation succeeds even if webhook delivery fails.

## Security

- SSRF prevention via `validateWebhookUrl()` (blocks private IPs, requires HTTPS)
- HMAC-SHA256 signing with per-endpoint secret
- Tenant scoping on all queries
- 10-second timeout prevents hanging connections
- Auto-disable after 10 consecutive failures prevents infinite retry loops

## Files

| File                                                                   | Purpose                            |
| ---------------------------------------------------------------------- | ---------------------------------- |
| `supabase/migrations/20260309000004_outbound_webhook_enhancements.sql` | Schema additions                   |
| `lib/webhooks/types.ts`                                                | Type definitions                   |
| `lib/webhooks/emitter.ts`                                              | Fire-and-forget emitter            |
| `lib/webhooks/actions.ts`                                              | Server actions (CRUD + test + log) |
| `components/settings/webhook-settings.tsx`                             | Client component for settings UI   |
| `app/(chef)/settings/webhooks/page.tsx`                                | Settings page (server component)   |
