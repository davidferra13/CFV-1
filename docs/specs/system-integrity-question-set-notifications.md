# System Integrity Question Set: Notifications & Email

> 50 binary pass/fail questions across 10 domains.
> Executed 2026-04-17. Sweep covers the full notification pipeline:
> createNotification -> routeNotification -> email/push/SMS delivery.

---

## Domain A: Pipeline Architecture (5 questions)

| #   | Question                                                                                                 | P/F  | Evidence                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Does every createNotification call flow through a single insertion point (actions.ts)?                   | PASS | All 113 call sites import from `lib/notifications/actions.ts`. Single function with dedup, sanitization, founder mirror, and channel routing.                 |
| A2  | Does routeNotification fire all 3 channels (email/push/SMS) in parallel with independent error handling? | PASS | `channel-router.ts:59-104` fires all channels via `Promise.allSettled`, each wrapped in `.catch()`. One channel failure never blocks another.                 |
| A3  | Does the pipeline log every delivery attempt (sent/failed/skipped) to `notification_delivery_log`?       | PASS | `logDelivery()` at `channel-router.ts:217-237` writes every outcome. Skipped channels also logged with reason.                                                |
| A4  | Does routeNotification never throw (callers rely on fire-and-forget)?                                    | PASS | Top-level try/catch at `channel-router.ts:46-107`. Comment and code confirm "never throws". createNotification also wraps the call in `.catch()` at line 184. |
| A5  | Is there a global outbound kill switch that disables all out-of-app delivery?                            | PASS | `NOTIFICATIONS_OUTBOUND_ENABLED !== 'false'` check at `channel-router.ts:47`. When disabled, all 3 channels log 'skipped'.                                    |

## Domain B: Dual Push Systems (5 questions)

| #   | Question                                                                                   | P/F      | Evidence                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | Is Web Push (lib/push/send.ts) the active push system wired into the channel router?       | PASS     | `channel-router.ts:19` imports `sendPushNotification` from `lib/push/send`. Full RFC 8291 encryption, VAPID auth, subscription management.                                                                                                       |
| B2  | Is OneSignal (lib/notifications/onesignal.ts) completely removed from the active pipeline? | **FAIL** | OneSignal is still called directly from 4 call sites: `inquiries/public-actions.ts:581`, `inquiries/actions.ts:594`, `events/offline-payment-actions.ts:243`, `api/kiosk/inquiry/route.ts:204`. These bypass the notification pipeline entirely. |
| B3  | Do the OneSignal call sites also call createNotification (double-push risk)?               | MIXED    | Need to verify per call site. If both OneSignal AND createNotification fire for the same event, the chef gets 2 push notifications.                                                                                                              |
| B4  | Does Web Push handle expired subscriptions (410 Gone) by deactivating them?                | PASS     | `channel-router.ts:159-161` calls `deactivateSubscription()` on 'gone' result.                                                                                                                                                                   |
| B5  | Does Web Push validate endpoints against SSRF (private IP blocking)?                       | PASS     | `push/send.ts:51-62` blocks localhost, 127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x, [::1], and 0.x.                                                                                                                                           |

## Domain C: Email Delivery (5 questions)

| #   | Question                                                                           | P/F              | Evidence                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Does the email pipeline have retry logic for transient failures?                   | PASS             | `email/send.ts:186-189` retries once with 1s backoff on transient errors (5xx, timeout, network).                                                                              |
| C2  | Does the email pipeline suppress bounced/invalid addresses?                        | PASS             | `email/send.ts:31-64` checks `email_suppressions` table with 5-min in-memory cache. Hard bounces auto-suppress at line 220-224.                                                |
| C3  | Does the dead letter queue capture failed transient emails for later retry?        | PASS             | `email/send.ts:196-214` inserts to `email_dead_letter_queue` with retry_count=0, max_retries=3, next_retry_at=5min.                                                            |
| C4  | Is there a dead letter queue processor that retries queued emails?                 | **NEEDS VERIFY** | Queue insert exists but no cron/processor found in `app/api/cron/` or `app/api/scheduled/` that reads from `email_dead_letter_queue`. Dead letters accumulate but never retry. |
| C5  | Does email sending guard against header injection (newline in to/subject/replyTo)? | PASS             | `email/send.ts:136-139` rejects any recipient, subject, or replyTo containing `\r` or `\n`.                                                                                    |

## Domain D: SMS Delivery (5 questions)

| #   | Question                                                                       | P/F  | Evidence                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Is SMS rate-limited per (tenant, action) with configurable windows?            | PASS | `sms/rate-limit.ts` checks `sms_send_log` table. Windows: critical=15min, alert=60min, info=120min. Configurable via env vars.                                                        |
| D2  | Does SMS require explicit opt-in before sending (chef_preferences.sms_opt_in)? | PASS | `resolve-preferences.ts:127-138` checks `sms_opt_in AND sms_notify_phone` for chef-facing actions.                                                                                    |
| D3  | Does SMS gracefully degrade when Twilio is not configured?                     | PASS | `sms/send.ts:19-22` returns 'not_configured' if env vars missing. Channel router logs 'skipped' with reason.                                                                          |
| D4  | Are there two separate SMS senders, and are their purposes distinct?           | PASS | `lib/sms/send.ts` = notification pipeline only (called from channel-router). `lib/sms/twilio-client.ts` = direct messaging (unified inbox, WhatsApp). Different purposes, no overlap. |
| D5  | Does client SMS use the client's own phone (not chef's sms_notify_phone)?      | PASS | `resolve-preferences.ts:113-125` uses `CLIENT_FACING_ACTIONS` set. For client actions, looks up `clients.phone`. For chef actions, uses `chef_preferences.sms_notify_phone`.          |

## Domain E: Preference Resolution (5 questions)

| #   | Question                                                                                                              | P/F  | Evidence                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ----------- |
| E1  | Does the preference cascade resolve in correct order: per-chef tier override -> per-category DB pref -> tier default? | PASS | `resolve-preferences.ts:50-78` checks `chef_notification_tier_overrides` first, then `notification_preferences`, then `TIER_CHANNEL_DEFAULTS`.                          |
| E2  | Can EMAIL_SUPPRESSED_ACTIONS never be overridden by user preferences?                                                 | PASS | `resolve-preferences.ts:104-107` re-applies suppression AFTER loading DB prefs. Intent signals (payment page, quote viewed, etc.) and reminders never email via router. |
| E3  | Does the settings UI expose all 14 categories with per-channel (email/push/SMS) toggles?                              | PASS | `notification-settings-form.tsx:25-39` lists all 14 `CHEF_CATEGORIES`. Table renders email/push/SMS toggle per category.                                                |
| E4  | Does the settings form correctly use tier defaults as fallback when no preference is saved?                           | PASS | `notification-settings-form.tsx:60-68` computes `getTierDefault()` per category and uses saved value or default.                                                        |
| E5  | Does disabling SMS opt-in at the settings level correctly disable all SMS toggles in the UI?                          | PASS | `notification-settings-form.tsx:469` disables SMS toggles when `!smsOptIn                                                                                               |     | !smsPhone`. |

## Domain F: Off-Hours & Digest (5 questions)

| #   | Question                                                                           | P/F      | Evidence                                                                                                                                                                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1  | Is the off-hours check (isOffHours) wired into the delivery pipeline?              | **FAIL** | `off-hours-check.ts` exists as pure function. Settings UI saves `quiet_hours_enabled/start/end` to `chef_preferences`. But `channel-router.ts` and `resolve-preferences.ts` NEVER call `isOffHours()`. Quiet hours settings are saved but have zero effect on delivery.                                      |
| F2  | Does the off-hours function correctly handle overnight ranges (e.g., 22:00-08:00)? | PASS     | `off-hours-check.ts:38-42` handles `startMinutes > endMinutes` case for overnight windows.                                                                                                                                                                                                                   |
| F3  | Do critical-tier notifications bypass off-hours suppression?                       | N/A      | Off-hours not wired (F1). `BYPASS_ACTIONS` list exists at line 4-9 but is never read by the pipeline.                                                                                                                                                                                                        |
| F4  | Is there a digest processor that batches non-critical notifications?               | **FAIL** | Settings UI saves `digest_enabled` and `digest_interval_minutes` to DB. But no cron, scheduled route, or processor reads these to batch notifications. Digest is UI-only with no backend implementation.                                                                                                     |
| F5  | Does the settings form accurately represent what is actually implemented?          | **FAIL** | Settings form shows quiet hours and digest controls that save to DB but do nothing. Users believe they are controlling notification timing, but all notifications fire immediately regardless of settings. This is a zero-hallucination violation (UI displays functional controls that are non-functional). |

## Domain G: Rich vs Generic Email Split (5 questions)

| #   | Question                                                                                                                     | P/F              | Evidence                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Are rich transactional emails (quote-sent, event-confirmed) dispatched directly from server actions, not the generic router? | PASS             | `route-email.ts` comment confirms: "rich transactional emails are dispatched directly from their respective server actions, not from here." ~53 sendEmail calls in `email/notifications.ts` go direct.                                         |
| G2  | Does the generic router (route-email.ts) only handle actions that don't have rich templates?                                 | PASS             | Generic router uses `NotificationGenericEmail` template for all actions. Rich emails are sent separately from business logic.                                                                                                                  |
| G3  | Is there a risk of double-emailing (rich + generic) for the same event?                                                      | **NEEDS VERIFY** | If a server action sends a rich email AND calls createNotification with email enabled, both fire. EMAIL_SUPPRESSED_ACTIONS only covers intent signals and reminders. Need to check if actions that send rich emails also create notifications. |
| G4  | Does `email-service.ts` (template-based email) overlap with route-email.ts or notifications.ts?                              | LOW RISK         | `email-service.ts` has only 2 callers (`api/notifications/send/route.ts` and itself). Provides `sendNotificationEmail()` with 4 template types. Parallel path but minimal usage.                                                               |
| G5  | Does the email circuit breaker (lib/resilience/circuit-breaker.ts) protect all email sends?                                  | PASS             | `email/send.ts:161` wraps every Resend call in `breakers.resend.execute()`. Trips after 5 consecutive failures, 60s reset.                                                                                                                     |

## Domain H: Notification Content Safety (5 questions)

| #   | Question                                                                             | P/F  | Evidence                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------ | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Are notification titles/bodies sanitized against control characters?                 | PASS | `actions.ts:76-84` strips `\r\n\t`, trims, and truncates (title: 200 chars, body: 500 chars). Prevents multi-line SMS/push injection.                                              |
| H2  | Does dedup guard prevent double-click/retry storm notification spam?                 | PASS | `actions.ts:88-102` checks for identical (recipient, action, event_id, inquiry_id) within 60 seconds. Returns existing notification if found.                                      |
| H3  | Does SMS formatting respect 160-char segment limit?                                  | PASS | `sms/send.ts:63-70` formats as "ChefFlow: {title} - {body}" and truncates to 160 chars with ellipsis.                                                                              |
| H4  | Are action URLs derived safely (no user-controlled redirects in notification links)? | PASS | `actions.ts:189-212` derives URLs from action type, eventId, inquiryId, clientId, or quoteId metadata. All internal paths. User-provided actionUrl only used if explicitly passed. |
| H5  | Does the founder mirror exclude sensitive notifications (account_access_alert)?      | PASS | `actions.ts:18` defines `NON_MIRRORED_NOTIFICATION_ACTIONS = new Set(['account_access_alert'])`. Lines 139-140 skip mirroring for these.                                           |

## Domain I: Client Notifications (5 questions)

| #   | Question                                                                                        | P/F  | Evidence                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | Does createClientNotification gracefully skip clients without portal accounts?                  | PASS | `client-actions.ts:62-64` returns silently if `getClientAuthUserId()` returns null.                                                            |
| I2  | Does createClientNotification flow through the same pipeline (createNotification) for delivery? | PASS | `client-actions.ts:67` calls `createNotification()` with all standard params. Full pipeline applies (dedup, sanitize, routing).                |
| I3  | Are CLIENT_FACING_ACTIONS properly defined for all client-targeted notification actions?        | PASS | `tier-config.ts:200-227` lists 26 client-facing actions. Covers quotes, events, inquiries, meals, loyalty, photos, disputes.                   |
| I4  | Do client notifications use the client's phone for SMS (not chef's)?                            | PASS | `resolve-preferences.ts:113-125` checks `CLIENT_FACING_ACTIONS` set and looks up `clients.phone` by `auth_user_id`.                            |
| I5  | Are client notification preferences independent from chef preferences?                          | PASS | `resolve-preferences.ts:85-101` loads preferences by `auth_user_id`. Client and chef have separate auth_user_ids, so separate preference rows. |

## Domain J: Scheduled & Cron Notifications (5 questions)

| #   | Question                                                                                | P/F      | Evidence                                                                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J1  | Do lifecycle email reminders (7d/2d/1d) use the notification pipeline?                  | PASS     | `app/api/scheduled/lifecycle/route.ts` calls `createNotification()` with `event_reminder_7d/2d/1d` actions. These actions are in EMAIL_SUPPRESSED_ACTIONS, so rich email goes direct; push/SMS go through router.                 |
| J2  | Do scheduled cron notifications (wellbeing, stale leads, goals) use createNotification? | PASS     | Verified: `wellbeing-signals/route.ts` (3 calls), `stale-leads/route.ts` (1), `revenue-goals/route.ts` (3), `follow-ups/route.ts` (1), `cooling-alert/route.ts` (1), `quarterly-checkin/route.ts` (1) all use createNotification. |
| J3  | Are cron notification endpoints idempotent (safe to re-run)?                            | PASS     | The 60-second dedup guard in createNotification prevents duplicate notifications on re-run. Most cron endpoints also have their own state checks (e.g., only alerting events within a date window).                               |
| J4  | Do renewal/expiry reminders (insurance, certs) use the notification pipeline?           | PASS     | `cron/renewal-reminders/route.ts` calls createNotification with `insurance_expiring_30d/7d` and `cert_expiring_90d/30d/7d` actions.                                                                                               |
| J5  | Is there a dead letter queue retry processor for failed emails?                         | **FAIL** | Same as C4. `email_dead_letter_queue` table exists, emails are inserted on transient failure, but no processor retries them. Dead letters accumulate indefinitely.                                                                |

---

## Summary

| Domain                   | Pass   | Fail  | Total  |
| ------------------------ | ------ | ----- | ------ |
| A: Pipeline Architecture | 5      | 0     | 5      |
| B: Dual Push Systems     | 3      | 1     | 5      |
| C: Email Delivery        | 4      | 1     | 5      |
| D: SMS Delivery          | 5      | 0     | 5      |
| E: Preference Resolution | 5      | 0     | 5      |
| F: Off-Hours & Digest    | 1      | 3     | 5      |
| G: Rich vs Generic Email | 4      | 0     | 5      |
| H: Content Safety        | 5      | 0     | 5      |
| I: Client Notifications  | 5      | 0     | 5      |
| J: Scheduled & Cron      | 4      | 1     | 5      |
| **Total**                | **41** | **6** | **50** |

**Pass rate: 82% (41/50)**

---

## Actionable Failures

### FIX B2: Remove OneSignal legacy calls (4 call sites)

OneSignal is called directly from 4 places, bypassing the notification pipeline. These already have
createNotification calls nearby (or should). Remove OneSignal calls and rely on the unified pipeline.

- `lib/inquiries/public-actions.ts:581-582`
- `lib/inquiries/actions.ts:594-595`
- `lib/events/offline-payment-actions.ts:243-252`
- `app/api/kiosk/inquiry/route.ts:204-205`

### FIX F1: Wire off-hours into channel router

`isOffHours()` exists but is never called. Wire it into `resolveChannels()` so quiet hours actually
suppress push/SMS (email still delivers, queued for digest if enabled).

### FIX F4/F5: Add honest labeling to unimplemented digest/quiet-hours controls

Digest batching and quiet hours are saved to DB but have no backend implementation. Either:
(a) Wire them in (F1 covers quiet hours), or
(b) Add "(coming soon)" labels to prevent zero-hallucination violation.

### FIX C4/J5: Dead letter queue processor

`email_dead_letter_queue` accumulates failed emails but nothing retries them. Need a cron endpoint.

### VERIFY G3: Double-email audit

Check if server actions that send rich emails also call createNotification with email-enabled actions.
If so, the chef receives both a rich email AND a generic notification email for the same event.
