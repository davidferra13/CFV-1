# ChefFlow Integration Platform Master Plan

## Status
- Date: 2026-02-19
- Owner: Product + Engineering
- Scope: Integrate ChefFlow with existing chef websites, POS systems, and SL systems (assumed = scheduling + lead/CRM systems)

## Direct Answer
Yes, your direction is correct: ChefFlow should be the operations layer that plugs into systems chefs already use, not a forced replacement for their website or core tools.

The right build strategy is:
1. Keep external websites as top-of-funnel.
2. Route inquiry and operational events into ChefFlow.
3. Add bidirectional integrations with POS + SL systems using a common adapter framework.

## Assumptions
- "SL" is interpreted as scheduling + lead systems (Calendly, Google Calendar, HubSpot, Salesforce, etc.).
- Existing ChefFlow architecture (Wix + Gmail + Stripe webhook patterns) is the baseline for all new integrations.

## Current State (already in repo)
- Website ingestion exists via Wix webhook + async processor:
  - `app/api/webhooks/wix/route.ts`
  - `lib/wix/process.ts`
  - `supabase/migrations/20260221000015_wix_integration.sql`
- Email ingestion exists via Gmail OAuth + sync:
  - `lib/gmail/google-auth.ts`
  - `lib/gmail/sync.ts`
  - `supabase/migrations/20260218000001_gmail_agent.sql`
- Integration UI pattern exists in settings:
  - `components/settings/connected-accounts.tsx`
  - `components/wix/wix-connection.tsx`
  - `app/(chef)/settings/page.tsx`
- Public profile exists, but no chef website URL field yet:
  - `lib/profile/actions.ts`
  - `app/(public)/chef/[slug]/page.tsx`
  - `app/(chef)/settings/my-profile/chef-profile-form.tsx`

## Product Outcome Targets
1. Any chef can connect their existing website and continue using it as their public funnel.
2. Any chef can connect one or more core business systems (POS, scheduling, CRM/lead).
3. ChefFlow receives, normalizes, deduplicates, and routes inbound activity into inquiries/events/clients.
4. ChefFlow can push important state updates back out (optional per connector).

## Architecture: Integration Hub

### Core model
Build a provider-agnostic integration layer (same pattern as Wix/Gmail, generalized):

1. Connection layer
- Stores OAuth/API credentials and connector settings per tenant.
- Supports one-to-many provider accounts per tenant.

2. Ingestion layer
- Webhook endpoints per provider.
- Fast ack + async processing.
- Raw payload persistence for audit/replay.

3. Normalization layer
- Maps provider payloads to canonical event types.
- Canonical entity IDs + deterministic dedup keys.

4. Sync orchestration layer
- Scheduled pull jobs where webhooks are incomplete.
- Cursor/state tracking for incremental sync.

5. Routing layer
- Maps normalized events to ChefFlow domain actions:
  - create/update inquiry
  - create/update client
  - update event lifecycle
  - log communication
  - trigger automations

### Canonical event contract
Create an internal contract like:
- `source_system` (square, toast, shopify_pos, clover, lightspeed, calendly, hubspot, salesforce, wix, gmail)
- `source_event_type` (provider-native)
- `canonical_event_type` (order_created, payment_captured, lead_created, appointment_booked, etc.)
- `source_event_id` (idempotency key)
- `occurred_at`
- `tenant_id`
- `resource_refs` (external ids)
- `raw_payload`

## Data Model Changes (Supabase)

### New enums
- `integration_provider`: square, toast, clover, lightspeed, shopify_pos, hubspot, salesforce, calendly, google_calendar, wix, gmail, custom_webhook, csv_import
- `integration_auth_type`: oauth2, api_key, pat, none
- `integration_status`: connected, disconnected, error, reauth_required
- `integration_sync_status`: pending, processing, completed, failed, duplicate

### New tables
1. `integration_connections`
- id, tenant_id, chef_id, provider, auth_type
- encrypted credentials/token refs
- scopes, external_account_id, external_account_name
- status, connected_at, last_sync_at, error_count
- config jsonb (field mappings, toggles)
- unique(tenant_id, provider, external_account_id)

2. `integration_events`
- id, tenant_id, provider
- source_event_id, source_event_type, canonical_event_type
- raw_payload jsonb
- status, processing_attempts, error
- received_at, processed_at
- unique(tenant_id, provider, source_event_id)

3. `integration_sync_jobs`
- id, tenant_id, provider, job_type (webhook_process, pull_incremental, replay)
- cursor_before, cursor_after
- status, started_at, finished_at, error

4. `integration_entity_links`
- id, tenant_id, provider
- external_entity_type, external_entity_id
- local_entity_type (client, inquiry, event, quote, payment)
- local_entity_id
- unique(tenant_id, provider, external_entity_type, external_entity_id)

5. `integration_field_mappings`
- id, tenant_id, provider, mapping_name
- external_path, local_field, transform_rule
- active boolean

### Existing table additions
- `chefs`
  - add `website_url text`
  - add `show_website_on_public_profile boolean default true`
  - add `preferred_inquiry_destination text` (website_only | chefflow_only | both)

## Backend Implementation Plan

### Folder structure
Add:
- `lib/integrations/core/*`
- `lib/integrations/providers/square/*`
- `lib/integrations/providers/shopify/*`
- `lib/integrations/providers/clover/*`
- `lib/integrations/providers/toast/*`
- `lib/integrations/providers/lightspeed/*`
- `lib/integrations/providers/calendly/*`
- `lib/integrations/providers/hubspot/*`
- `lib/integrations/providers/salesforce/*`

### Interfaces
Define a provider adapter contract:
- `getAuthUrl()`
- `exchangeCode()`
- `refreshToken()`
- `verifyWebhook(request)`
- `normalizeWebhook(payload)`
- `pullSince(cursor)`
- `upsertMapping()`

### API routes
Add standardized endpoints:
- `app/api/integrations/[provider]/connect/route.ts`
- `app/api/integrations/[provider]/callback/route.ts`
- `app/api/webhooks/[provider]/route.ts`
- `app/api/scheduled/integrations/pull/route.ts`
- `app/api/scheduled/integrations/retry/route.ts`

### Processing pattern
For every provider webhook route:
1. Verify signature/auth.
2. Persist raw event in `integration_events`.
3. Return success fast.
4. Process async (inline fire-and-forget + cron backstop).

This follows proven existing behavior in:
- `app/api/webhooks/wix/route.ts`
- `app/api/webhooks/stripe/route.ts`

## Frontend and Settings Plan

### Integration Center UI
Add a dedicated settings page: `/settings/integrations`

Cards:
- POS connectors
- Scheduling connectors
- CRM/lead connectors
- Website connectors

Per card:
- connect/disconnect
- status, last sync, error count
- reauth button
- sync now button
- event log preview

### Profile website field (requested)
Implement in My Profile:
- Field: `Official Website URL` (optional)
- Toggle: `Show website on public profile`
- Validation: https URL

Show on public page:
- In hero CTA area: `Visit Official Website`
- Open in new tab with safe rel attrs.

Files to change:
- `lib/chef/profile-actions.ts`
- `app/(chef)/settings/my-profile/chef-profile-form.tsx`
- `lib/profile/actions.ts`
- `app/(public)/chef/[slug]/page.tsx`
- plus migration for `chefs` columns

## POS Integration Rollout (phased)

### Wave 1 (self-serve, highest ROI)
1. Square
- OAuth connect
- webhooks ingest
- orders/payments/customer sync to ChefFlow canonical events

2. Shopify POS
- app install + OAuth/token exchange path
- webhook ingest
- optional POS UI extension for in-store actions that call ChefFlow

3. Clover
- v2 OAuth + webhook/events ingestion
- normalize orders/customers/payments

### Wave 2 (partner-gated, enterprise)
4. Toast
- partner onboarding + credentials per location
- webhook + incremental pull with rate-limit aware scheduler

5. Lightspeed
- OAuth + webhook + incremental pull

### Wave 3 (long-tail coverage)
6. Universal inbound connector
- custom webhook endpoint templates
- CSV importer with mapping UI
- optional Zapier/Make style bridge support

This gives practical "everyone" coverage without waiting for first-party connectors for every vendor.

## SL Integration Rollout (scheduling + lead)

### Scheduling
1. Calendly
- OAuth/PAT connection
- ingest `invitee.created`, `invitee.canceled`, routing form submissions
- map to inquiry lifecycle + follow-up timers

2. Google Calendar
- watch channels + renewal scheduler
- map appointment lifecycle to ChefFlow scheduling/communication context

### Lead/CRM
3. HubSpot
- OAuth + webhooks
- contact/deal lifecycle mapping to clients/inquiries

4. Salesforce
- start with inbound from platform events/CDC via Pub/Sub integration worker
- map account/contact/opportunity lifecycle to ChefFlow entities

## Dedup and Identity Strategy
- Dedup key precedence:
  1. provider event id
  2. provider resource id + timestamp window
  3. normalized email + phone + date window
- Use `integration_entity_links` as identity bridge.
- Never create duplicate clients when email + tenant matches existing record.

## Automation and Workflows
Each canonical event can trigger:
- notifications
- task creation
- pipeline state transitions
- outbound messages/templates
- KPI updates in analytics

Reuse existing automation engine where possible:
- `lib/automations/engine.ts`

## Security and Compliance Requirements
- Signature verification for every webhook provider.
- Encrypt secrets/tokens; never log secrets.
- Per-tenant strict isolation in every integration table and query.
- Idempotent inserts for all inbound events.
- Retry with exponential backoff + dead-letter status.
- Auditability: raw payload retained with processing status.

## Testing Plan

### Unit
- provider payload normalization
- signature verification helpers
- dedup logic

### Integration
- oauth callback token exchange
- webhook happy path and retry path
- pull sync pagination/cursor behavior

### End-to-end
- connect provider -> ingest event -> create/update local entities -> surface in UI
- failure injection (timeouts, duplicate events, invalid signatures)

## Operational SLOs
- Webhook acknowledgment p95 < 1s
- Event processing success >= 99.5%
- Duplicate processing rate < 0.5%
- Reconciliation lag < 15 min for pull-based providers

## Delivery Plan (engineering sequencing)

### Phase 0: Foundation (2-3 weeks)
- Build integration core tables, interfaces, scheduler, and UI shell.
- Add website field + public profile rendering.

### Phase 1: POS Wave 1 (4-6 weeks)
- Square + Shopify POS + Clover adapters.
- End-to-end tests and observability dashboards.

### Phase 2: SL Wave 1 (3-4 weeks)
- Calendly + HubSpot adapters.
- Lead and appointment mapping into inquiries/workflow.

### Phase 3: POS Wave 2 + Scheduling deepening (4-6 weeks)
- Toast + Lightspeed + Google Calendar watch-renew cycle.

### Phase 4: Enterprise CRM + Long tail (4-6 weeks)
- Salesforce event ingestion.
- Custom webhook templates + CSV mapping importer.

## Critical Product Decision Points
1. Canonical model depth
- Minimal: map to inquiry/client/event only.
- Full: include inventory/menu/payment details from POS.

2. Sync direction
- Inbound-only first (faster).
- Bi-directional push after confidence.

3. Multi-location support
- Needed early for Toast/Square chains.

4. Marketplace vs private integrations
- Affects OAuth app review and go-live time.

## Why this is the right approach
- Matches your existing proven webhook+async architecture.
- Supports chefs with existing websites immediately.
- Scales from simple website inquiries to full POS/SL connectivity.
- Avoids a rewrite while building toward "integrated with everyone" in realistic, shippable waves.

## External constraints and references (official docs)
- Square OAuth + token lifecycle: https://developer.squareup.com/docs/oauth-api/overview
- Square webhook delivery/retries/idempotency guidance: https://developer.squareup.com/docs/webhooks/overview
- Shopify OAuth/token flows: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant
- Shopify webhook HTTPS delivery, timeout, retries, HMAC verification: https://shopify.dev/docs/apps/build/webhooks/subscribe/https
- Shopify webhook subscription management: https://shopify.dev/docs/apps/build/webhooks/subscribe
- Shopify POS extension architecture: https://shopify.dev/docs/apps/build/pos/index
- Clover OAuth and app approval docs: https://docs.clover.com/dev/docs/oauth-intro and https://docs.clover.com/dev/docs/developer-account-approval
- Toast auth + restaurant context + rate limits + webhook signing/timeouts:
  - https://doc.toasttab.com/doc/devguide/authentication.html
  - https://doc.toasttab.com/doc/devguide/apiRateLimiting.html
  - https://doc.toasttab.com/doc/devguide/apiMessageSigning.html
  - https://doc.toasttab.com/doc/devguide/apiTimeouts.html
- Lightspeed Retail API intro/auth/webhooks/scaling:
  - https://developers.lightspeedhq.com/retail/introduction/introduction/
  - https://developers.lightspeedhq.com/retail/authentication/authentication/
  - https://developers.lightspeedhq.com/retail/webhooks/webhooks/
  - https://developers.lightspeedhq.com/retail/introduction/scaling/
- HubSpot webhooks, OAuth usage, limits:
  - https://developers.hubspot.com/docs/api-reference/webhooks-webhooks-v3/guide
  - https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines
- Calendly OAuth/PAT/webhooks:
  - https://developer.calendly.com/how-to-access-calendly-data-on-behalf-of-authenticated-users
  - https://developer.calendly.com/how-to-authenticate-with-personal-access-tokens
  - https://developer.calendly.com/receive-data-from-scheduled-events-in-real-time-with-webhook-subscriptions
  - https://developer.calendly.com/create-a-developer-account
- Google Calendar push notifications:
  - https://developers.google.com/workspace/calendar/api/guides/push
- Salesforce Pub/Sub auth + event durability:
  - https://developer.salesforce.com/docs/platform/pub-sub-api/guide/intro.html
  - https://developer.salesforce.com/docs/platform/pub-sub-api/guide/supported-auth.html
  - https://developer.salesforce.com/docs/platform/pub-sub-api/guide/event-message-durability.html
