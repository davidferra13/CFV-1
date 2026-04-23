# Managed Channel Integration Note

Date: 2026-04-21

Integration decision:

- Extend the existing `conversation_threads` + `communication_events` model instead of adding a new communication store.
- Use the existing provider/channel tables as the logical managed-channel registry instead of creating a new registry table.
- Keep `messages` as a compatibility mirror only where older inbox surfaces still depend on it.

Why the previous state was insufficient:

- inbound email and Twilio SMS did not share one normalization path
- Twilio ingress and legacy SMS send paths depended on non-tenant-scoped assumptions
- older SMS writes targeted `messages` with enum values that do not match the actual schema
- outbound thread replies were not carrying provider-linked audit state forward in a canonical way
- canonical communication rows did not persist enough transport metadata to audit provider/channel ownership without replaying the action log

Canonical model:

- External business communications now enter `conversation_threads` + `communication_events` first.
- `communication_events` now also carry immutable transport metadata (`external_thread_key`, `provider_name`, `managed_channel_address`, `recipient_address`).
- `communication_action_log` remains the delivery lifecycle audit for outbound thread replies, including provider send state, later provider status callbacks, and failure details.

Managed channel ownership:

- Email ownership resolves through tenant-scoped records already in the schema:
  - `chef_email_channels`
  - `google_mailboxes`
  - `google_connections`
- SMS/WhatsApp ownership resolves through `chef_twilio_credentials`.
- Owner-account fallback is no longer used for managed SMS ingress.

Ingress routes:

- `/api/webhooks/email/inbound` is the canonical direct email webhook.
- `/api/webhooks/twilio` is the canonical Twilio webhook compatibility route.
- `/api/comms/sms` remains a compatibility/manual-forward endpoint, but now uses the same managed-channel adapter and canonical event ingest.

Current classification:

- Canonical:
  - `/api/webhooks/email/inbound`
  - `conversation_threads`
  - `communication_events`
  - `communication_action_log`
  - `sendReplyViaChannel`
- Legacy-but-active:
  - `/api/webhooks/twilio`
  - `/api/comms/sms`
  - `messages`
  - `unified_inbox`
  - `lib/sms/actions.ts`
- Incomplete:
  - delivery and health summaries still need more operator actions in UI; this cut only surfaces mailbox-native state and provider-linked thread audit
  - historical finding import still writes its legacy `messages` row directly instead of reusing the shared compat bridge

Compatibility bridge:

- `messages` and `unified_inbox` remain legacy-but-active compatibility surfaces.
- New direct-channel email/SMS ingests write canonical communication events first, then mirror a narrow compatibility record into `messages` when needed for older surfaces.
- Gmail sync now uses one shared canonical link/update + `messages-compat` bridge for:
  - standard Gmail inquiry/thread imports
  - TakeAChef imports
  - Yhangry imports
  - generic platform Gmail imports

Intentionally not changed:

- `google_connections` remains the Calendar row and Gmail auth-token compatibility fallback, but `google_mailboxes` is now the operational Gmail mailbox source of truth for ownership, sync state, historical scan state, and managed outbound identity.
- Legacy rows are still mirrored during Gmail token refresh/disconnect so older callers do not break during migration.
- `sms_messages` and `notification_delivery_log` were not repurposed; they remain notification-specific audit stores, not business-thread storage.
- The repair path is additive and idempotent: a migration plus runtime upsert keep `google_mailboxes` reconciled from legacy `google_connections` without introducing another ownership system.
