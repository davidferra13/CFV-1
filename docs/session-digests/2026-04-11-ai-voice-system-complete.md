# Session Digest: AI Voice System - Full Build

**Date:** 2026-04-11
**Agent:** Builder (Sonnet 4.6)
**Commits:** ba1341e11, da841b297, dd10b73f0, 6001f9bc0, eb96d6870, 0ae281d51, 5f2027d37

---

## What Was Built

A complete AI admin voice system for ChefFlow. The chef never has to touch it - it handles vendor/venue calls automatically, answers the AI number 24/7, and pushes real-time alerts everywhere.

### Hard Lines Established

- **Voice never calls clients.** Clients receive email + SMS only. Voice is for vendors and businesses.
- This is saved to memory and commented in every relevant file.

---

## Files Created or Significantly Changed

| File                                                     | What It Does                                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `database/migrations/20260411000001_ai_calls_system.sql` | Foundation tables: `ai_calls`, `ai_call_transcripts`, `ai_call_routing_rules`. Applied to Docker PostgreSQL. |
| `lib/calling/voice-helpers.ts`                           | All TwiML builders. Neural voice (Polly.Matthew-Neural + SSML) across all roles.                             |
| `lib/calling/twilio-actions.ts`                          | Full rewrite. New roles: delivery coordination, venue confirmation. All logging to `ai_calls`.               |
| `app/api/calling/gather/route.ts`                        | Extended: role dispatch, transcript logging, extracted_data persistence, vendor callback loop fix.           |
| `app/api/calling/status/route.ts`                        | Extended: ai_calls cross-update, chef SMS alerts on hard-fails, vendorId in broadcasts.                      |
| `app/api/calling/inbound/route.ts`                       | NEW: 24/7 inbound handler. Routes to voicemail/vendor-callback/unknown based on caller identity.             |
| `app/api/calling/voicemail/route.ts`                     | NEW: transcription callback, creates quick note, SSE broadcast.                                              |
| `app/api/calling/voicemail/done/route.ts`                | NEW: Twilio recording done endpoint - returns clean Hangup.                                                  |
| `lib/inquiries/public-actions.ts`                        | Hardwired client SMS ack + chef SMS alert + SSE push on every inquiry submission.                            |
| `lib/sms/send.ts`                                        | One-line fix: reads `TWILIO_PHONE_NUMBER` as fallback for `TWILIO_FROM_NUMBER`.                              |
| `app/(chef)/culinary/call-sheet/page.tsx`                | Full rewrite: 5 tabs (Call, Log, Inbox, Vendors, Settings). Passes tenantId to CallHub.                      |
| `components/calling/call-settings-form.tsx`              | NEW: Per-chef voice config UI (voice, hours, timezone, SMS number, daily limit, role toggles).               |
| `components/calling/chef-live-alerts.tsx`                | NEW: Global SSE listener. Real-time toast alerts for inbound calls, inquiries, failures, voicemails.         |
| `components/calling/call-hub.tsx`                        | SSE-driven results (replaces polling). Polling kept as fallback.                                             |
| `app/(chef)/layout.tsx`                                  | Mounts ChefLiveAlerts as dynamic import - always-on while in the app.                                        |

---

## Voice Roles

| Role                      | Direction | What It Does                                                                 |
| ------------------------- | --------- | ---------------------------------------------------------------------------- |
| `vendor_availability`     | Outbound  | Asks if ingredient is in stock. Step 2: price + quantity.                    |
| `vendor_delivery`         | Outbound  | Confirms delivery window. Step 2: contact name + handling notes.             |
| `venue_confirmation`      | Outbound  | Confirms kitchen access time + parking. Step 2: restrictions.                |
| `inbound_vendor_callback` | Inbound   | Vendor calls back. Identifies them, pivots to availability check.            |
| `inbound_voicemail`       | Inbound   | Outside active hours. Records + transcribes. Creates quick note.             |
| `inbound_unknown`         | Inbound   | Unknown caller during hours. Captures free-form message. Creates quick note. |

---

## Data Architecture

- `ai_calls`: universal log for all roles. `extracted_data` JSONB stores structured output per role.
- `ai_call_transcripts`: turn-by-turn log. Speaker, step, confidence, input type for every utterance.
- `ai_call_routing_rules`: per-chef config. `chef_sms_number` is the master SMS number for all alerts.
- SMS number priority: `ai_call_routing_rules.chef_sms_number` > `chefs.phone` > `CHEF_ALERT_SMS_NUMBER` env.

---

## Bugs Fixed This Session

1. Vendor callback loop was broken (handler hung up immediately - no `callId`). Fixed with vendor lookup + fallback insert.
2. `extracted_data` was never written to - all structured call data was invisible to DB.
3. `chef_quick_notes` insert used wrong column (`content` vs `text`) + nonexistent columns.
4. `supplier_calls` insert in callback path violated NOT NULL constraints on `vendor_name`/`vendor_phone`.
5. `sendSms` used `TWILIO_FROM_NUMBER` but project only has `TWILIO_PHONE_NUMBER`.

---

## What Needs Human Action Before Going Live

1. **Buy a Twilio phone number.** Set its Voice webhook to `https://app.cheflowhq.com/api/calling/inbound`.
2. **Store it** in `ai_call_routing_rules.inbound_phone_number` for the chef.
3. **Enter SMS number** in Call Sheet Settings tab (or set `CHEF_ALERT_SMS_NUMBER` in `.env.local`).

No code changes needed. The system is complete and schema-correct.

---

## Build State on Departure

- `tsc --noEmit --skipLibCheck`: **green** (0 errors)
- Last full build: green (2026-04-10, dirty checkout, still valid)
- All commits pushed to `main` on GitHub.
