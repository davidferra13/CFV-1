# Communication Ingestion Pipeline

Date: 2026-04-21

This document supersedes the earlier `communication_signals` proposal. ChefFlow did not adopt a separate `communication_signals` table. The production-direction model for external business communications is:

- `conversation_threads`: canonical thread container
- `communication_events`: immutable inbound and outbound event record
- `communication_action_log`: operator, automation, and delivery audit log

`messages` and `unified_inbox` remain compatibility surfaces for older UI and workflow dependencies.

## Current-State Map

Inbound endpoints:

- `/api/webhooks/email/inbound`
  - Status: canonical
  - Purpose: Cloudflare-routed or managed mailbox email ingress
  - Behavior: resolves tenant by managed channel ownership, ingests into `communication_events`, mirrors a narrow compatibility row into `messages`
- `/api/webhooks/twilio`
  - Status: legacy-but-active compatibility route
  - Purpose: Twilio inbound webhook
  - Behavior: validates signature with tenant-owned Twilio credentials, then uses the same canonical managed-ingest adapter as email
- `/api/comms/sms`
  - Status: legacy-but-active compatibility/manual-forward route
  - Purpose: Twilio-form ingress and authenticated JSON forwarding
  - Behavior: validates tenant ownership from managed channel records, then uses the same canonical managed-ingest adapter as `/api/webhooks/twilio`

Storage models:

- `conversation_threads`
  - Canonical thread model for external business communication
- `communication_events`
  - Canonical immutable ingress and outbound event record
- `communication_action_log`
  - Canonical audit log for ingestion, classification, follow-up state, reply send success, and reply send failure
- `messages`
  - Legacy-but-active compatibility store for inbox surfaces and older contextual messaging dependencies
- `unified_inbox`
  - Legacy-but-active compatibility view over `messages`, conversations, and notifications
- `notification_delivery_log`
  - Notification-specific provider audit
  - Not used as the canonical store for business-thread communication
- `sms_messages`
  - Notification-specific SMS audit
  - Not used as the canonical store for business-thread communication

Thread models:

- Canonical: `conversation_threads` joined to `communication_events`
- Legacy: `messages.conversation_thread_id` as a bridge back to old inbox and contextual messaging surfaces

Outbound send paths:

- `lib/communication/actions.ts::sendReplyViaChannel`
  - Status: canonical for thread replies
  - Sends via tenant-owned Gmail or Twilio channel
  - Persists outbound canonical event in `communication_events`
  - Persists delivery/send audit in `communication_action_log`
  - Mirrors a compatibility row into `messages`
- `lib/sms/actions.ts`
  - Status: legacy-but-active
  - Still writes `messages`, but now sends with the same tenant-owned Twilio channel resolver used by canonical thread replies

Provider dependencies:

- Email ownership:
  - `chef_email_channels`
  - `google_mailboxes`
  - `google_connections`
- SMS/WhatsApp ownership:
  - `chef_twilio_credentials`
- Provider APIs:
  - Gmail API for outbound managed email
  - Twilio Messages API for outbound SMS and WhatsApp
  - Cloudflare Email Routing for alias ingress

UI surfaces:

- `app/(chef)/inbox/page.tsx`
  - Canonical-capable when communication triage is enabled
  - Legacy-compatible when older inbox feed remains active
- No new inbox surface is introduced by this pipeline

## Canonical Contract

### Managed Channel Registry

ChefFlow uses existing verified channel tables as the logical managed-channel registry:

- `chef_email_channels` for ChefFlow-managed inbound aliases
- `google_mailboxes` for verified mailbox ownership
- `google_connections` for legacy verified mailbox ownership
- `chef_twilio_credentials` for tenant-owned Twilio phone channels

No new registry table is required for this integration cut because these tables already hold the ownership facts needed for routing.

### Inbound Normalization

All direct business-channel ingress should normalize through one adapter:

- `lib/communication/managed-ingest.ts::ingestManagedInboundCommunication`

That adapter is responsible for:

1. Resolving tenant ownership from the managed channel registry
2. Rejecting unmanaged destinations instead of falling back to owner-account assumptions
3. Writing the canonical event through `ingestCommunicationEvent`
4. Writing a narrow `messages` compatibility row only when needed for older surfaces

### Canonical Event Persistence

`lib/communication/pipeline.ts::ingestCommunicationEvent` is the single canonical writer for direct inbound and outbound business-thread events.

It is responsible for:

- resolving or reusing the canonical thread
- resolving client linkage when deterministically possible
- writing immutable `communication_events` rows
- persisting immutable transport metadata on the event row itself:
  - `external_thread_key`
  - `provider_name`
  - `managed_channel_address`
  - `recipient_address`
- logging ingestion metadata to `communication_action_log`
- preserving thread activity timestamps
- triggering classification, suggested links, and follow-up timers

### Outbound Delivery Audit

Outbound thread replies are audited through:

- canonical outbound `communication_events` rows
- `communication_action_log` entries for:
  - `reply_sent_via_channel`
  - `reply_send_failed`
  - `provider_message_status_updated`

Audit state includes:

- provider name
- provider message id when available
- provider lifecycle status when available
- managed channel address used to send
- recipient
- linked inquiry or event context when present

This gives provider-linked delivery/send state without creating another communications store.

## Classification

Canonical:

- `conversation_threads`
- `communication_events`
- `communication_action_log`
- `lib/communication/pipeline.ts`
- `lib/communication/actions.ts::sendReplyViaChannel`
- `app/api/webhooks/email/inbound/route.ts`

Legacy-but-active:

- `app/api/webhooks/twilio/route.ts`
- `app/api/comms/sms/route.ts`
- `messages`
- `unified_inbox`
- `lib/sms/actions.ts`

Duplicate:

- Twilio direct ingress into `messages`
  - Removed in favor of canonical ingest plus compatibility mirroring
- Divergent SMS senders based on global env defaults
  - Replaced for thread replies and managed SMS sends with tenant-owned channel resolution

Incomplete:

- Historical finding import still inserts its compatibility `messages` row directly instead of reusing the shared canonical link/update bridge.
- UI actions for mailbox health are still limited to connect/disconnect/sync; no new operator workflow was added in this cut.

## Intentional Non-Changes

- No new inbox page
- No new `communication_signals` table
- No reuse of `notification_delivery_log` or `sms_messages` for business-thread persistence
- No owner-account fallback for managed channel attribution
- No automatic identity merging without deterministic evidence
- `google_connections` remains the Calendar row and Gmail auth-token compatibility fallback, but `google_mailboxes` is now the operational Gmail mailbox control plane.

## Validation Rules

Before extending this pipeline further:

1. Prefer extending `communication_events`, `conversation_threads`, or `communication_action_log`
2. Only write `messages` when a compatibility dependency still requires it
3. Resolve tenant ownership from verified managed channel records, never from global sender env vars
4. Keep inbound email and SMS on the same normalization and canonical ingest path
