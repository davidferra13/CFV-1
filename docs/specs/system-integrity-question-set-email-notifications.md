# System Integrity Question Set: Email & Notification System

> Sweep 15 of the cohesiveness series. 50 binary pass/fail questions across 10 domains.
> Scope: Email delivery (Resend), notification pipeline (in-app/push/SMS), channel routing, opt-out/consent, templates.

## Summary

- **Score:** 49/50 PASS (98%) -> 50/50 after fix (100%)
- **Fixes applied:** 1
- **Files modified:** 1

## Fix Applied

| ID  | File              | Fix                                                                                                                                                                                 | Severity |
| --- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Q38 | `lib/sms/send.ts` | Added E.164 normalization + validation before Twilio API call using `normalizePhone` + `isValidE164` from `lib/calling/phone-utils.ts`. Raw phone strings no longer sent to Twilio. | MEDIUM   |

---

## Domain 1: Email Delivery Safety (Q1-Q5)

| #   | Question                                                                                              | Result |
| --- | ----------------------------------------------------------------------------------------------------- | ------ |
| Q1  | Does the system auto-suppress emails to addresses that triggered a bounce?                            | PASS   |
| Q2  | Is a circuit breaker implemented for the external email service (Resend)?                             | PASS   |
| Q3  | Are transient delivery failures captured in a dead-letter queue for retry?                            | PASS   |
| Q4  | Does the suppression cache have a TTL to prevent permanent stale suppression?                         | PASS   |
| Q5  | Can transactional emails (password resets, payment confirmations) bypass complaint-only suppressions? | PASS   |

## Domain 2: Header Injection & Input Sanitization (Q6-Q10)

| #   | Question                                                                                  | Result |
| --- | ----------------------------------------------------------------------------------------- | ------ |
| Q6  | Does `sendEmail` reject messages with newline characters in headers (to/subject/replyTo)? | PASS   |
| Q7  | Is the notification title sanitized (control chars stripped, 200 char limit)?             | PASS   |
| Q8  | Is the notification body sanitized (control chars stripped, 500 char limit)?              | PASS   |
| Q9  | Does the system validate emails against a disposable domain blocklist?                    | PASS   |
| Q10 | Is optional API-based email validation available for important signups?                   | PASS   |

## Domain 3: Notification Channel Routing (Q11-Q15)

| #   | Question                                                                                      | Result |
| --- | --------------------------------------------------------------------------------------------- | ------ |
| Q11 | Are exactly 3 channels (email, push, SMS) supported by the router?                            | PASS   |
| Q12 | Does the channel router use `Promise.allSettled` so one channel failure doesn't block others? | PASS   |
| Q13 | Is every channel dispatch outcome logged to `notification_delivery_log`?                      | PASS   |
| Q14 | Does `EMAIL_SUPPRESSED_ACTIONS` prevent generic email for actions with rich templates?        | PASS   |
| Q15 | Does `CLIENT_FACING_ACTIONS` route SMS to the client's phone (not the chef's)?                | PASS   |

## Domain 4: Opt-Out & Consent (Q16-Q20)

| #   | Question                                                                          | Result |
| --- | --------------------------------------------------------------------------------- | ------ |
| Q16 | Does channel resolution cascade (tier override -> category pref -> tier default)? | PASS   |
| Q17 | Is `marketing_unsubscribed` checked before sending promotional emails?            | PASS   |
| Q18 | Is `automated_emails_enabled` respected as a client-level email opt-out?          | PASS   |
| Q19 | Does SMS require explicit `sms_opt_in` consent from the chef?                     | PASS   |
| Q20 | For client-facing SMS, does the system require a phone number to be present?      | PASS   |

## Domain 5: Quiet Hours & Off-Hours (Q21-Q25)

| #   | Question                                                                            | Result |
| --- | ----------------------------------------------------------------------------------- | ------ |
| Q21 | Is the off-hours check a pure function (no DB access, no side effects)?             | PASS   |
| Q22 | Does the off-hours check handle overnight ranges (e.g., 22:00-08:00)?               | PASS   |
| Q23 | Are critical actions (payment_overdue, event_reminder_1d) in the bypass list?       | PASS   |
| Q24 | If the quiet hours DB check fails, does the system deliver normally (non-blocking)? | PASS   |
| Q25 | Do critical-tier notifications bypass quiet hours automatically?                    | PASS   |

## Domain 6: Deduplication (Q26-Q30)

| #   | Question                                                                           | Result |
| --- | ---------------------------------------------------------------------------------- | ------ |
| Q26 | Is there a 60-second dedup guard preventing duplicate notification creation?       | PASS   |
| Q27 | Does dedup at createNotification entry point block all channels (email/push/SMS)?  | PASS   |
| Q28 | Is `createNotification` the single enforcement point for dedup?                    | PASS   |
| Q29 | Does the dedup guard prevent re-fire on double-click/retry storms?                 | PASS   |
| Q30 | Does dedup match on (recipient_id, action, event_id, inquiry_id), not just action? | PASS   |

## Domain 7: Notification Type Coverage (Q31-Q35)

| #   | Question                                                                                      | Result |
| --- | --------------------------------------------------------------------------------------------- | ------ |
| Q31 | Does `DEFAULT_TIER_MAP` cover every `NotificationAction` (TypeScript Record enforces)?        | PASS   |
| Q32 | Does every `NotificationAction` have a category entry in `NOTIFICATION_CONFIG`?               | PASS   |
| Q33 | Does `resolveCategory` fall back to 'system' for unknown actions?                             | PASS   |
| Q34 | Does TypeScript catch new actions missing from `DEFAULT_TIER_MAP` at compile time?            | PASS   |
| Q35 | Does `deriveNotificationActionUrl` provide a fallback URL ('/dashboard') for unknown actions? | PASS   |

## Domain 8: SMS & Push Safety (Q36-Q40)

| #   | Question                                                                         | Result    |
| --- | -------------------------------------------------------------------------------- | --------- |
| Q36 | Is SMS rate-limited per (tenant, action) via `isSmsAllowed`?                     | PASS      |
| Q37 | Are expired push subscriptions automatically deactivated on 'gone' response?     | PASS      |
| Q38 | Does `sendSms` normalize phone to E.164 and validate before calling Twilio?      | **FIXED** |
| Q39 | Is phone resolution for SMS separate from email resolution (different DB paths)? | PASS      |
| Q40 | Does the system use a configured `TWILIO_FROM_NUMBER` as sender ID?              | PASS      |

## Domain 9: Founder Mirror & Multi-Tenant (Q41-Q45)

| #   | Question                                                                                | Result |
| --- | --------------------------------------------------------------------------------------- | ------ |
| Q41 | Does the founder mirror feed copy notifications across tenants for platform monitoring? | PASS   |
| Q42 | Is `account_access_alert` explicitly excluded from the founder mirror?                  | PASS   |
| Q43 | Does `getNotifications` scope by `recipient_id` from the authenticated session?         | PASS   |
| Q44 | Is the founder mirror non-blocking (try/catch, doesn't affect main notification)?       | PASS   |
| Q45 | Is tenant ID resolved from session (not request body) for notification operations?      | PASS   |

## Domain 10: Email Template & Delivery Audit (Q46-Q50)

| #   | Question                                                                                       | Result |
| --- | ---------------------------------------------------------------------------------------------- | ------ |
| Q46 | Is there a generic `NotificationGenericEmail` template for the channel router?                 | PASS   |
| Q47 | Does `EMAIL_SUPPRESSED_ACTIONS` prevent double-email for rich-template actions?                | PASS   |
| Q48 | If a rich email fails, do other channels (push/SMS) still deliver?                             | PASS   |
| Q49 | Does `routeEmailByAction` resolve recipient email via `db.auth.admin.getUserById`?             | PASS   |
| Q50 | Is there clear separation between rich emails (notifications.ts) and generic (route-email.ts)? | PASS   |

---

_Generated: 2026-04-18 | Sweep 15 of cohesiveness series_
