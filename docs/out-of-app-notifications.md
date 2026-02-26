# Out-of-App Notification System

## Why This Exists

Before this system, ChefFlow only notified you when the browser tab was open.
A client accepting a quote at midnight, paying a deposit, or sending an urgent message
would go unnoticed until you opened the app.

This system adds multi-channel delivery so notifications reach you wherever you are:
**Email, Browser Push, and SMS** — each appropriate to how urgent the event is.

---

## Architecture Overview

```
Event occurs (transition, webhook, cron)
        ↓
createNotification()          ← unchanged call signature for all call sites
        ↓
Insert into notifications     ← in-app bell + realtime toast (existing)
        ↓
routeNotification() ─────────── fire-and-forget tail (never blocks the caller)
        ├─→ resolveChannels()  ← reads DB prefs + applies tier logic
        ├─→ deliverEmail()     ← Phase 2 ✓ (at call site, not router)
        ├─→ deliverPush()      ← Phase 3 ✓ (all active subscriptions via Web Push)
        └─→ deliverSms()       ← Phase 5 ✓ (Twilio REST, rate-limited)
                ↓
        notification_delivery_log  ← audit row per channel per notification
```

**Key principle:** `routeNotification()` never throws and never blocks the caller.
If the entire channel system went down, `createNotification()` would still succeed —
the in-app notification is always created first.

**Email note:** Email is dispatched at call sites (not through the router) because
each email template requires rich context (client name, amounts, event details) that
the router doesn't have. The router's `deliverEmail()` logs 'skipped' — email delivery
happens via dedicated dispatcher functions called alongside `createNotification()`.

---

## Notification Tiers

Every notification action has a default tier defined in
[lib/notifications/tier-config.ts](../lib/notifications/tier-config.ts).

| Tier         | Default Channels   | Examples                                              |
| ------------ | ------------------ | ----------------------------------------------------- |
| **Critical** | Email + Push + SMS | New inquiry, payment received, dispute                |
| **Alert**    | Email + Push       | Quote accepted/rejected, event cancelled, new message |
| **Info**     | Email only         | Follow-up due, client signup, review submitted        |

Intent signals (`client_viewed_quote`, `client_on_payment_page`, etc.) are **Alert**
tier but **never email** — they're real-time nudges where an email 5 minutes later
would be noise.

---

## Resolution Logic

Channel delivery for a given notification is determined by this cascade
(see [lib/notifications/resolve-preferences.ts](../lib/notifications/resolve-preferences.ts)):

1. **Per-category channel overrides** in `notification_preferences` (DB)
   - `email_enabled`, `push_enabled`, `sms_enabled` — nullable, NULL = inherit
2. **Default tier channels** from `DEFAULT_TIER_MAP` + `TIER_CHANNEL_DEFAULTS` (code)
3. **Email suppression** for intent signals (hardcoded, cannot be overridden)
4. **SMS gate**: only fires if `chef_preferences.sms_opt_in = true` AND `sms_notify_phone` is set

---

## Database Tables

### `push_subscriptions`

Stores Web Push API subscription objects per user per device.
One user can have multiple active subscriptions (phone + laptop, etc.).

Key columns: `endpoint` (unique), `p256dh`, `auth_key`, `is_active`, `failed_count`

Subscriptions are deactivated when `failed_count >= 5` or when the push service
returns `410 Gone` (user unsubscribed in browser settings).

### `sms_send_log`

Rate-limit log. One row per (tenant, action) per send.
The SMS sender checks this before every send to prevent flooding.
Rows older than 48 hours are cleaned up by the activity-cleanup cron.

Rate windows by tier (env-configurable, see `lib/sms/rate-limit.ts`):

- `critical` (new_inquiry, payment_received, dispute): 15 min default
- `alert` (quote_accepted, new_message): 60 min default
- `info`: 120 min default

### `notification_delivery_log`

Immutable audit log. One row per channel attempt per notification.
Channels that are disabled or rate-limited are recorded as `'skipped'`.

### Extended: `notification_preferences`

Added `tier`, `email_enabled`, `push_enabled`, `sms_enabled` columns.
`NULL` on a channel column means "inherit from tier default."

### Extended: `chef_preferences`

Added `sms_notify_phone`, `sms_opt_in`, `sms_opt_in_at`.
SMS is never sent without `sms_opt_in = true`.

---

## Build Status — All Phases Complete

| Phase                | Status  | Files                                                                  |
| -------------------- | ------- | ---------------------------------------------------------------------- |
| **1 — Foundation**   | ✅ Done | DB migrations, tier config, resolver, router, delivery log             |
| **2 — Email gaps**   | ✅ Done | 5 new email templates + dispatchers at 5 call sites                    |
| **3 — Browser Push** | ✅ Done | VAPID, encryption, service worker, subscription API, permission prompt |
| **4 — Settings UI**  | ✅ Done | `/settings/notifications` page with per-category channel toggles       |
| **5 — SMS**          | ✅ Done | Twilio REST, rate limiting, opt-in consent, cron cleanup               |

---

## File Map

### Core Library

| File                                       | Purpose                                  |
| ------------------------------------------ | ---------------------------------------- |
| `lib/notifications/tier-config.ts`         | Static tier → channel defaults           |
| `lib/notifications/resolve-preferences.ts` | Runtime channel resolution with DB prefs |
| `lib/notifications/channel-router.ts`      | Orchestrator: push + SMS delivery        |
| `lib/notifications/settings-actions.ts`    | Server actions for settings page         |

### Email (Phase 2)

| File                                               | Purpose                        |
| -------------------------------------------------- | ------------------------------ |
| `lib/email/templates/new-message-chef.tsx`         | New message from client        |
| `lib/email/templates/quote-accepted-chef.tsx`      | Quote accepted                 |
| `lib/email/templates/follow-up-due-chef.tsx`       | Follow-up overdue              |
| `lib/email/templates/new-inquiry-chef.tsx`         | New inquiry (portal/Wix/Gmail) |
| `lib/email/templates/gift-card-purchased-chef.tsx` | Gift card sale                 |

### Browser Push (Phase 3)

| File                                                  | Purpose                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| `lib/push/vapid.ts`                                   | VAPID JWT signing (ECDSA P-256)                                 |
| `lib/push/send.ts`                                    | RFC 8291 AES-128-GCM encrypted push send                        |
| `lib/push/subscriptions.ts`                           | Save/remove/list push subscriptions                             |
| `app/api/push/subscribe/route.ts`                     | POST — save subscription                                        |
| `app/api/push/unsubscribe/route.ts`                   | POST — deactivate subscription                                  |
| `app/api/push/resubscribe/route.ts`                   | POST — rotate subscription endpoint                             |
| `app/api/push/vapid-public-key/route.ts`              | GET — public key for browser                                    |
| `worker/index.ts`                                     | Custom service worker extension (merged into sw.js by next-pwa) |
| `components/notifications/use-push-subscription.ts`   | Client hook                                                     |
| `components/notifications/push-permission-prompt.tsx` | Dismissible banner                                              |

### Settings UI (Phase 4)

| File                                                 | Purpose                          |
| ---------------------------------------------------- | -------------------------------- |
| `app/(chef)/settings/notifications/page.tsx`         | Settings page                    |
| `components/settings/notification-settings-form.tsx` | Per-category toggles + SMS setup |

### SMS (Phase 5)

| File                    | Purpose                                   |
| ----------------------- | ----------------------------------------- |
| `lib/sms/send.ts`       | Twilio REST API wrapper                   |
| `lib/sms/rate-limit.ts` | Rate limit check + record in sms_send_log |

---

## Setup Checklist for Production

### VAPID Keys (required for browser push)

Generate once, add to Vercel env:

```bash
# Using npx (quickest):
npx web-push generate-vapid-keys

# Or via Node REPL:
const { webcrypto } = require('crypto')
const pair = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
```

Required env vars:

```
VAPID_PUBLIC_KEY=       # base64url ~88 chars
VAPID_PRIVATE_KEY=      # base64url ~43 chars
VAPID_CONTACT_EMAIL=    # mailto:admin@cheflowhq.com
```

### Twilio (required for SMS)

1. Create a Twilio account at twilio.com
2. Purchase a phone number (US long-code or toll-free)
3. Add to Vercel env:

```
TWILIO_ACCOUNT_SID=     # ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=      # your auth token from Twilio console
TWILIO_FROM_NUMBER=     # E.164 format: +14155551234
```

### Chef Setup (per chef)

1. Go to `/settings/notifications`
2. Click **Enable push** to subscribe the current browser
3. Enter a phone number and check the SMS opt-in box, then **Save SMS settings**
4. Optionally adjust per-category channel overrides in the table

---

## Adding a New Notification Type

1. Add the action to `NotificationAction` in [lib/notifications/types.ts](../lib/notifications/types.ts)
2. Add display config to `NOTIFICATION_CONFIG` in the same file
3. Add a tier assignment to `DEFAULT_TIER_MAP` in [lib/notifications/tier-config.ts](../lib/notifications/tier-config.ts)
4. Call `createNotification()` at the right event site — push + SMS fire automatically
5. If an email is needed: add a template to `lib/email/templates/` and a dispatcher to `lib/email/notifications.ts`, then call it alongside `createNotification()`

---

## VAPID Key Rotation

Rotating VAPID keys invalidates **all existing push subscriptions** — every user's
browser will need to re-subscribe on their next visit. This is a major disruption.

Only rotate if the private key is compromised. If you must rotate:

1. Generate new key pair
2. Update env vars on Vercel
3. Set `is_active = false` on all `push_subscriptions` rows (one-time migration)
4. The `push-permission-prompt.tsx` component will re-prompt users on next visit
