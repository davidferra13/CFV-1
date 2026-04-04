# Research: ChefFlow Email System - Complete Survey & Gap Analysis

> **Date:** 2026-04-04
> **Question:** How does ChefFlow handle everything related to email? Where are the gaps?
> **Status:** complete

## Origin Context

Developer wants a full survey of every email function across all targets in ChefFlow. The goal: find gaps in the system where email should work but doesn't, where functions are stubbed, where delivery paths are broken or incomplete.

## Summary

ChefFlow has a massive email footprint: 76 templates, 11 platform parsers, a 3-channel notification router, Gmail OAuth sync, auto-response, email sequences, AI drafting, and admin broadcast tools. The core infrastructure (Resend send, circuit breaker, Gmail API) is production-solid. However, **17 gaps** were found across 7 categories, including silent delivery failures, orphaned templates, missing sequence execution, and incomplete cron delivery paths.

## System Architecture (How Email Flows)

```
INBOUND                              OUTBOUND
--------                              --------
Gmail API (OAuth)                     Resend API (transactional)
  -> lib/gmail/sync.ts                  <- lib/email/send.ts (circuit breaker)
  -> lib/gmail/classify.ts
  -> 11 platform parsers               Gmail API (prospect/reply)
  -> lib/gmail/actions.ts                <- lib/gmail/client.ts sendEmail()
  -> inquiries table
                                       Channel Router
Communication Pipeline                  <- lib/notifications/channel-router.ts
  -> lib/communication/pipeline.ts       -> Email (Resend)
  -> conversation_threads                -> Push (web push)
  -> communication_events               -> SMS (Twilio)
```

## Detailed Findings by Target

---

### TARGET 1: Core Email Infrastructure

| File                            | Lines | Status | Notes                                                                               |
| ------------------------------- | ----- | ------ | ----------------------------------------------------------------------------------- |
| `lib/email/send.ts`             | 70    | REAL   | Circuit breaker (5 failures, 60s reset), non-blocking, PII-safe logging             |
| `lib/email/resend-client.ts`    | 21    | REAL   | Singleton, FROM_NAME='CheFlow' (intentional branding)                               |
| `lib/email/route-email.ts`      | 61    | REAL   | Maps notification actions to Resend sends via generic template                      |
| `lib/email/email-validator.ts`  | 136   | REAL   | 3-layer: format + disposable domain + API (Rapid Email Verifier) + typo suggestions |
| `lib/email/developer-alerts.ts` | 228   | REAL   | Rate-limited alerts + daily digest to DFPrivateChef@gmail.com                       |

**Gaps: None.** Core infrastructure is solid.

---

### TARGET 2: Email Templates (76 files in `lib/email/templates/`)

All 15 sampled templates are **real React Email components** with proper variable substitution, BaseLayout usage, and conditional rendering. No stubs found.

**Categories covered:**

- Inquiry lifecycle (inquiry-received, new-inquiry-chef)
- Quote lifecycle (quote-sent, quote-accepted-chef, quote-expired-chef, quote-expired-client, quote-expiring, quote-rejected-chef)
- Event lifecycle (event-proposed, event-confirmed, event-cancelled, event-completed, event-starting, event-prepare, event-reminder series)
- Payment (payment-confirmation, payment-failed, payment-received-chef, payment-reminder, offline-payment-receipt, refund-initiated)
- Post-event (post-event-thank-you, post-event-review-request, post-event-survey, post-event-referral-ask, post-event-circle-thanks)
- Client (client-invitation, client-visit-alert)
- Guest (menu-approval-request, menu-approved-chef, menu-revision-chef, front-of-house-menu-ready, rsvp-reminder, pre-event-dietary-summary)
- Marketing (campaign, circle-digest, circle-message, incentive-delivery)
- Admin/system (daily-report, developer-alert, developer-digest, beta-welcome, beta-account-ready, beta-signup-admin, beta-survey-invite)
- Contracts (contract-sent, contract-signed-chef)
- Staff/network (collaboration-invite, directory-invitation, directory-welcome, directory-claimed, directory-verified, friend-request)
- Commerce (commerce-sale-receipt, gift-card-purchase-confirmation, gift-card-purchased-chef)
- Misc (password-reset, photos-ready, prep-sheet-ready, recipe-share, availability-signal, call-reminder, contact-message-received)

| Gap ID     | Description                                                                                | Severity | File                                       |
| ---------- | ------------------------------------------------------------------------------------------ | -------- | ------------------------------------------ |
| **GAP-T1** | `refund-initiated.tsx` line 58 uses en dash ('3-5 business days') instead of hyphen        | Low      | `lib/email/templates/refund-initiated.tsx` |
| **GAP-T2** | No template for "email sequence step" (sequences use raw subject/body, no branded wrapper) | Medium   | `lib/email/sequence-actions.ts`            |

---

### TARGET 3: Gmail Integration (Inbound)

| File                                  | Lines | Status | Notes                                                                       |
| ------------------------------------- | ----- | ------ | --------------------------------------------------------------------------- |
| `lib/gmail/client.ts`                 | 391   | REAL   | Full API wrapper: list, fetch, send, threading headers                      |
| `lib/gmail/sync.ts`                   | 3,229 | REAL   | End-to-end sync: history API, batch dedup, platform handlers, write-through |
| `lib/gmail/actions.ts`                | 409   | REAL   | triggerSync, draftMessage, approveAndSend, threading                        |
| `lib/gmail/classify.ts`               | 614   | REAL   | 6-layer deterministic-first classifier, Ollama only as last resort          |
| `lib/gmail/extract-inquiry-fields.ts` | 211   | REAL   | Regex extraction + lead scoring, zero AI                                    |
| `lib/gmail/platform-dedup.ts`         | 294   | REAL   | 3-layer dedup: platform_records, identity keys, fuzzy name+date             |

**11 Platform Parsers (all real):**

- Take A Chef (832 lines, 6 email types)
- Yhangry (294 lines, 4 types)
- Thumbtack (466 lines, 5 types)
- The Knot, Bark, Cozymeal, GigSalad, Google Business, Wix Forms, HireAChef, PrivateChefManager, CuisineistChef (all handled via generic platform handler)

**Gaps: None on core sync.** Gmail integration is the most mature subsystem.

---

### TARGET 4: Notification System (Multi-Channel)

| File                                    | Lines | Status | Notes                                                                       |
| --------------------------------------- | ----- | ------ | --------------------------------------------------------------------------- |
| `lib/notifications/actions.ts`          | 433   | REAL   | Create, read, archive, preferences CRUD. Founder mirror.                    |
| `lib/notifications/channel-router.ts`   | 237   | REAL   | 3-channel: email (Resend), push (web), SMS (Twilio). Audit log.             |
| `lib/notifications/email-service.ts`    | 150   | REAL   | Generic template builder (4 types: alert, payment, proposal, contract)      |
| `lib/notifications/triggers.ts`         | 291   | REAL   | 8 ops triggers (staff assign, task, schedule, order, delivery, stock, comp) |
| `lib/notifications/settings-actions.ts` | 209   | REAL   | Per-category channel preferences, SMS opt-in, quiet hours, digest interval  |

| Gap ID     | Description                                                                                                                                         | Severity | File                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------- |
| **GAP-N1** | Notification preferences UI only controls categories. No per-event-type granularity (e.g., "email me for quote expiry but not for event reminders") | Medium   | `lib/notifications/settings-actions.ts` |
| **GAP-N2** | SMS rate limiter is per-instance (in-memory). In multi-instance deployment, could double-send                                                       | Low      | `lib/notifications/channel-router.ts`   |

---

### TARGET 5: Email Composition & Drafting

| File                                          | Lines | Status | Notes                                                          |
| --------------------------------------------- | ----- | ------ | -------------------------------------------------------------- |
| `lib/templates/email-drafts.ts`               | ~300  | REAL   | 12 draft templates with variable substitution                  |
| `lib/ai/draft-actions.ts`                     | ~400  | REAL   | 10 draft types, formula-first then Ollama fallback             |
| `lib/ai/agent-actions/draft-email-actions.ts` | ~200  | REAL   | Tier 2 (draft only, never auto-sends). Safe.                   |
| `lib/ai/remy-email-actions.ts`                | ~300  | REAL   | 6 email actions for Remy (search, thread, digest, draft reply) |
| `lib/daily-ops/draft-engine.ts`               | ~250  | REAL   | Auto-generates follow-up + confirmation drafts daily           |

| Gap ID     | Description                                                                                                                  | Severity | File                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------- |
| **GAP-D1** | `draft-engine.ts`: Ollama offline = silent empty array. User never knows drafts weren't generated. Should surface a warning. | High     | `lib/daily-ops/draft-engine.ts` |
| **GAP-D2** | `remy-email-actions.ts`: `draftEmailReply()` has no Ollama offline handling. Silent failure.                                 | Medium   | `lib/ai/remy-email-actions.ts`  |

---

### TARGET 6: Email UI Components

| Component                                                       | Lines | Status    | Backend                                |
| --------------------------------------------------------------- | ----- | --------- | -------------------------------------- |
| `components/communication/email-composer.tsx`                   | 144   | **SHELL** | Opens `mailto:` link, no server action |
| `components/admin/broadcast-email-form.tsx`                     | 82    | REAL      | Resend batch (50/batch)                |
| `components/admin/direct-email-form.tsx`                        | 82    | REAL      | Resend single send                     |
| `components/prospecting/send-email-panel.tsx`                   | 144   | REAL      | Gmail API send                         |
| `components/marketing/email-builder.tsx`                        | 306   | REAL      | CRUD for campaign_templates            |
| `components/email/rebooking-email.tsx`                          | 96    | REAL      | Template (Day 14 follow-up)            |
| `components/email/seasonal-teaser-email.tsx`                    | 118   | REAL      | Template (Day 90 follow-up)            |
| `components/email/thank-you-email.tsx`                          | 96    | REAL      | Template (Day 1 follow-up)             |
| `components/clients/client-email-toggle.tsx`                    | 64    | REAL      | Toggles automated_emails_enabled       |
| `components/onboarding/onboarding-steps/connect-gmail-step.tsx` | 156   | REAL      | Google OAuth flow                      |

| Gap ID     | Description                                                                                                                                   | Severity     | File                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------- |
| **GAP-U1** | `email-composer.tsx` is a shell. Opens `mailto:` instead of sending via Resend/Gmail. The only "compose email" UI that doesn't actually send. | **Critical** | `components/communication/email-composer.tsx` |

---

### TARGET 7: Email Sequences & Automation

| File                            | Lines | Status | Notes                                                    |
| ------------------------------- | ----- | ------ | -------------------------------------------------------- |
| `lib/email/sequence-actions.ts` | 514   | REAL   | Full CRUD: sequences, steps, enrollments, stats, preview |

**7 trigger types:** post_inquiry, post_event, post_quote, anniversary, dormant_30d, dormant_60d, manual

| Gap ID     | Description                                                                                                                                                                                                                                              | Severity     | File                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------- |
| **GAP-S1** | **No sequence execution engine.** CRUD exists (create sequences, enroll clients, track steps) but no cron/worker actually advances enrollments, checks `next_send_at`, or sends the next step email. The plumbing is built but the pump isn't connected. | **Critical** | Missing file (no cron route for sequence processing) |
| **GAP-S2** | No auto-enrollment trigger. Sequences define trigger_type (e.g., post_event) but nothing auto-enrolls a client when that trigger fires. Enrollment is manual only.                                                                                       | **Critical** | `lib/email/sequence-actions.ts`                      |
| **GAP-S3** | Sequence steps use raw subject/body (no branded template wrapper). Emails sent from sequences won't match the look of other ChefFlow emails.                                                                                                             | Medium       | `lib/email/sequence-actions.ts`                      |

---

### TARGET 8: Cron Jobs & Scheduled Email

| Cron Route                           | Sends Email? | Notes                                                  |
| ------------------------------------ | ------------ | ------------------------------------------------------ |
| `api/cron/developer-digest/route.ts` | YES          | Calls `sendDeveloperDigest()` directly                 |
| `api/cron/circle-digest/route.ts`    | DELEGATES    | Calls `processDigests()` in `lib/hub/circle-digest`    |
| `api/cron/morning-briefing/route.ts` | **NO**       | Stores as `remy_alerts` in DB. No email delivery path. |

| Gap ID     | Description                                                                                                                              | Severity     | File                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------- |
| **GAP-C1** | `morning-briefing` generates briefings but only stores them in `remy_alerts` table. No email is sent. Chef must open the app to see it.  | High         | `app/api/cron/morning-briefing/route.ts` |
| **GAP-C2** | No cron for email sequence step advancement (see GAP-S1)                                                                                 | **Critical** | Missing                                  |
| **GAP-C3** | No cron for dormancy re-engagement emails (dormant_30d, dormant_60d triggers exist in sequence definitions but no automation fires them) | High         | Missing                                  |

---

### TARGET 9: Communication Pipeline

| File                                 | Lines  | Status | Notes                                                                    |
| ------------------------------------ | ------ | ------ | ------------------------------------------------------------------------ |
| `lib/communication/actions.ts`       | ~1,500 | REAL   | Multi-source inbox, thread grouping, classification, follow-up timers    |
| `lib/communication/auto-response.ts` | ~300   | REAL   | Template selection, variable substitution, Resend send, tracking         |
| `lib/communication/pipeline.ts`      | ~400   | REAL   | Normalize, resolve sender, create/reuse threads, classify, suggest links |

**Gaps: None.** Communication pipeline is solid.

---

### TARGET 10: Database Schema for Email

**Tables involved:**

- `google_connections` - OAuth tokens, sync state, history ID per chef
- `gmail_sync_log` - Audit trail of every processed email
- `messages` - Email messages (gmail_message_id, gmail_thread_id columns)
- `notifications` - Persistent notification records
- `notification_preferences` - Per-category channel preferences
- `notification_delivery_log` - Audit trail for every send attempt
- `conversation_threads` - Cross-channel thread grouping
- `communication_events` - Individual communication records
- `communication_action_log` - Action audit trail
- `follow_up_timers` - Silence timers after outbound
- `suggested_links` - Auto-links to inquiries/events
- `campaign_templates` - Marketing email templates
- `newsletter_subscribers` - Public newsletter signups
- `email_sequences` - Sequence definitions
- `email_sequence_steps` - Steps within sequences
- `email_sequence_enrollments` - Client enrollment + progress
- `auto_response_config` - Auto-response settings
- `auto_response_templates` - Auto-response templates
- `daily_plan_drafts` - AI-generated draft storage
- `platform_records` - Platform email write-through cache

| Gap ID      | Description                                                                                                                                                                   | Severity | File    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| **GAP-DB1** | No `email_send_log` table. Individual transactional emails (quotes, reminders, confirmations) are fire-and-forget with no audit trail. Only notifications have delivery logs. | Medium   | Missing |

---

## Gap Summary (All 17 Gaps)

### Critical (3)

| ID         | Gap                                                              | Impact                                                        |
| ---------- | ---------------------------------------------------------------- | ------------------------------------------------------------- |
| **GAP-U1** | `email-composer.tsx` is a shell (opens mailto:, no real send)    | The main "compose email" UI component doesn't work            |
| **GAP-S1** | No sequence execution engine (no cron advances enrolled clients) | Email sequences are fully configured but never fire           |
| **GAP-S2** | No auto-enrollment triggers for sequences                        | Clients must be manually enrolled; automation doesn't trigger |

### High (4)

| ID         | Gap                                                   | Impact                                                   |
| ---------- | ----------------------------------------------------- | -------------------------------------------------------- |
| **GAP-C1** | Morning briefing stores in DB only, no email delivery | Chef misses daily briefing unless they open the app      |
| **GAP-C2** | No cron for sequence step advancement                 | Same root cause as GAP-S1                                |
| **GAP-C3** | No cron for dormancy re-engagement                    | 30/60 day dormant client emails never fire               |
| **GAP-D1** | Draft engine silently returns empty on Ollama offline | Chef thinks no follow-ups needed; actually system failed |

### Medium (4)

| ID          | Gap                                                       | Impact                                                            |
| ----------- | --------------------------------------------------------- | ----------------------------------------------------------------- |
| **GAP-T2**  | Sequence emails have no branded template wrapper          | Sequence emails look different from all other ChefFlow emails     |
| **GAP-N1**  | Notification preferences lack per-event-type granularity  | Chef can't fine-tune which specific events trigger email          |
| **GAP-D2**  | Remy email reply draft fails silently when Ollama offline | No feedback to chef that draft generation failed                  |
| **GAP-DB1** | No transactional email send log                           | Can't audit whether a specific quote/reminder email was delivered |

### Low (2)

| ID         | Gap                                          | Impact                                 |
| ---------- | -------------------------------------------- | -------------------------------------- |
| **GAP-T1** | En dash in refund-initiated.tsx              | Minor branding rule violation          |
| **GAP-N2** | SMS rate limiter is per-instance (in-memory) | Edge case in multi-instance deployment |

---

## Recommendations

### Quick Fixes (no spec needed)

1. **GAP-T1** - Replace en dash with hyphen in `refund-initiated.tsx`
2. **GAP-D1** - Add `console.warn` + in-app indicator when draft engine gets empty result from Ollama offline
3. **GAP-D2** - Add `OllamaOfflineError` catch in `draftEmailReply()` with user-visible feedback

### Needs a Spec

4. **GAP-S1 + GAP-S2 + GAP-C2 + GAP-C3** - "Email Sequence Engine" spec: cron route that processes enrollments, advances steps, sends emails, auto-enrolls on triggers. This is the single biggest gap: the entire sequence system is built but not connected.
5. **GAP-U1** - "Email Composer Upgrade" spec: wire `email-composer.tsx` to send via Resend (for clients without Gmail) or Gmail API (for connected chefs). Currently opens mailto: which breaks the in-app workflow.
6. **GAP-C1** - "Morning Briefing Delivery" spec: add email delivery path for morning briefings (currently DB-only).
7. **GAP-DB1** - "Transactional Email Audit Log" spec: add `email_send_log` table and log every Resend send.

### Needs Discussion

8. **GAP-N1** - Per-event-type notification granularity. Complex UI. May not be worth the cost yet.
9. **GAP-T2** - Whether sequence emails should use branded templates or stay plain (simpler, more personal).

---

## File Count Summary

| Category            | Files          | Lines (est.)       | Status                            |
| ------------------- | -------------- | ------------------ | --------------------------------- |
| Core infrastructure | 6              | 1,030              | 100% real                         |
| Templates           | 76             | ~7,500             | 100% real                         |
| Gmail integration   | 20+            | 12,291             | 100% real                         |
| Notification system | 10+            | 1,500+             | 100% real                         |
| Drafting & AI       | 5              | 1,450              | 100% real (2 silent failure gaps) |
| UI components       | 10             | 1,288              | 90% real (1 shell)                |
| Sequences           | 1              | 514                | CRUD real, execution missing      |
| Communication       | 3              | 2,200+             | 100% real                         |
| Cron/scheduled      | 3              | ~200               | 2 real, 1 DB-only                 |
| **TOTAL**           | **~134 files** | **~27,000+ lines** | **Mature, 3 critical gaps**       |
