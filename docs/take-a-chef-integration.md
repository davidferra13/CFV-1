# TakeAChef / Private Chef Manager Gmail Integration

## Overview

Automatically captures TakeAChef leads, messages, bookings, and payments from the chef's Gmail inbox. Eliminates the need to constantly check TakeAChef — everything flows into ChefFlow's inquiry pipeline.

**Why this exists:** 80% of private chef business flows through TakeAChef. Chefs spend hours daily checking the platform for new inquiries, responding to messages, and manually copying data. This integration makes ChefFlow the single source of truth.

## How It Works

1. Chef connects Gmail via OAuth (Settings > Integrations > Connect TakeAChef)
2. Every 5 minutes, the existing Gmail sync cron fetches new emails
3. Emails from `@privatechefmanager.com` or `@takeachef.com` are detected by sender domain
4. TakeAChef emails bypass Ollama classification — routed to dedicated regex parser
5. Parser identifies email type and extracts structured fields
6. Data flows into ChefFlow's inquiry system with full deduplication

## Email Types Handled

| Email Type        | Subject Pattern                                   | System Action                              |
| ----------------- | ------------------------------------------------- | ------------------------------------------ |
| New Inquiry       | "You just received a new request from {Name}!"    | Create inquiry + client record             |
| Client Message    | "You have a message for the on {Date}"            | Advance status to `awaiting_chef` + notify |
| Booking Confirmed | "New booking confirmed (Order ID: {ID})"          | Advance to `confirmed` + create event      |
| Customer Info     | "Guest contact details for your upcoming booking" | Merge phone/email into client record       |
| Payment           | Payment-related keywords                          | Log notification (parser TBD)              |
| Administrative    | Everything else from TakeAChef                    | Log and skip                               |

## Deduplication

TakeAChef sends the same inquiry notification multiple times. Two layers of dedup:

1. **Email-level:** `gmail_sync_log` unique constraint on `(tenant_id, gmail_message_id)`
2. **Inquiry-level:** Before creating an inquiry, checks for existing TakeAChef inquiry with matching client name + event date. If found, skips. Never overwrites or deletes.

## Dashboard Widget

Shows new leads, awaiting response, confirmed bookings, and daily inquiry volume (today, yesterday, this week, this month).

## File Locations

| File                                                             | Purpose                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------ |
| `lib/gmail/take-a-chef-parser.ts`                                | Email type detection + field extraction                |
| `lib/gmail/take-a-chef-dedup.ts`                                 | Inquiry-level deduplication                            |
| `lib/gmail/take-a-chef-stats.ts`                                 | Stats queries (overview + daily volume)                |
| `lib/gmail/classify.ts`                                          | Modified — sender detection before Ollama              |
| `lib/gmail/sync.ts`                                              | Modified — TakeAChef routing + all email type handlers |
| `components/inquiries/tac-status-prompt.tsx`                     | Message blind spot quick-action prompt                 |
| `components/dashboard/tac-dashboard-widget.tsx`                  | Dashboard widget                                       |
| `components/integrations/take-a-chef-setup.tsx`                  | Onboarding wizard                                      |
| `supabase/migrations/20260322000051_take_a_chef_integration.sql` | DB columns + indexes                                   |

## Database Changes

- `inquiries.external_inquiry_id` — TakeAChef Order ID
- `inquiries.external_platform` — 'take_a_chef'
- `inquiries.external_link` — Direct TakeAChef URL
- `gmail_sync_log.platform_email_type` — tac_new_inquiry, tac_booking_confirmed, etc.

## Future Enhancements

- Payment email parser (need sample email)
- Auto-expiry cron for past-date inquiries
- Multi-platform support for other chef marketplaces
- Commission rate persistence per chef
- Remy drafting TakeAChef responses
