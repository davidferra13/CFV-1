# SMS/Text Notifications (Feature U7)

## Overview

ChefFlow can send SMS text messages to customers for key events: order ready, table ready, delivery ETA, reservation confirmation, and feedback requests. Uses Twilio as the SMS provider, configured per-chef. Gracefully degrades if Twilio is not configured (messages are logged as pending).

## Setup

1. Sign up at [twilio.com](https://www.twilio.com)
2. Get your Account SID, Auth Token, and a phone number
3. Go to Settings > SMS in ChefFlow
4. Enter your Twilio credentials and enable SMS
5. Click "Test Connection" to verify

## Message Types

| Type                  | Trigger                   | Message                                                            |
| --------------------- | ------------------------- | ------------------------------------------------------------------ |
| `order_ready`         | Order is ready for pickup | "Hi [name], your order is ready for pickup!"                       |
| `table_ready`         | Table is available        | "Hi [name], your table for [size] is ready!"                       |
| `delivery_eta`        | Delivery dispatched       | "Hi [name], your delivery arrives in approximately [eta] minutes." |
| `reservation_confirm` | Reservation created       | Confirmation with date, time, party size                           |
| `reservation_remind`  | Before reservation        | Reminder text                                                      |
| `feedback_request`    | After service             | Link to feedback form                                              |
| `custom`              | Manual send               | Any custom message                                                 |

## Architecture

- **Server actions:** `lib/sms/sms-actions.ts` (all actions use `requireChef()` and tenant scoping)
- **Migration:** `supabase/migrations/20260331000022_sms_notifications.sql`
- **Settings UI:** `components/sms/sms-settings.tsx` (Twilio config, enable/disable)
- **History UI:** `components/sms/sms-history.tsx` (message log with filters and stats)
- **Send button:** `components/sms/send-sms-button.tsx` (reusable, embeddable anywhere)
- **Settings page:** `app/(chef)/settings/sms/page.tsx`
- **History page:** `app/(chef)/notifications/sms/page.tsx`

## Non-blocking Pattern

SMS sending follows the non-blocking side effects pattern. If Twilio fails, the main operation still succeeds. Errors are logged to `sms_messages.error_message` and surfaced in the SMS history UI.

## Twilio Integration

Uses the Twilio REST API directly (no SDK dependency). Credentials are stored per-chef in `chef_preferences`. The API call uses Basic auth with Account SID and Auth Token.

## Database

### sms_messages table

- Stores every SMS attempt with status tracking
- RLS scoped to `tenant_id = auth.uid()`
- Indexed on tenant_id, status, created_at, and entity lookups

### chef_preferences columns

- `sms_enabled` (boolean, default false)
- `twilio_account_sid` (text)
- `twilio_auth_token` (text)
- `twilio_phone_number` (text)

## Embedding the Send Button

Use `SendSMSButton` anywhere you have a customer phone number:

```tsx
import { SendSMSButton } from '@/components/sms/send-sms-button'

;<SendSMSButton
  phone="+15551234567"
  customerName="Jane Doe"
  messageType="order_ready"
  orderDetails="Your catering order for 50 guests"
  entityType="event"
  entityId={eventId}
/>
```

## Graceful Degradation

If Twilio is not configured (no credentials), messages are logged with status "pending" and error "Twilio not configured". The chef sees these in SMS History and can resend after configuring Twilio.
