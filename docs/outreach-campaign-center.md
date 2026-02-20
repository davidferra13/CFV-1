# Chef Outreach & Campaign Center

## What Changed

Built a complete outreach system across 8 phases — transforming the basic campaign stub into a production-grade communication command center. The chef can now reach any client, in any channel, at scale or one-by-one, with full tracking.

## Why

Private chefs have a relationship-based business. Staying top-of-mind with past clients is the single highest-ROI action between events. Before this, there was no way to do that from inside ChefFlow — chefs were manually emailing from personal accounts with no tracking, no personalization, and no channel awareness. This closes that gap completely.

## What Was Built

### Phase A — Core Campaign Execution (Fixed)

The existing `sendCampaignNow()` had three critical problems: it sent raw HTML without rendering tokens, it used `dangerouslySetInnerHTML` instead of a proper React email component, and it had no unsubscribe link (a legal requirement in most jurisdictions). All three are now fixed.

**`lib/marketing/tokens.ts`** (new)
- `renderTokens(template, ctx)` — replaces `{{first_name}}`, `{{last_name}}`, `{{full_name}}`, `{{chef_name}}`, `{{last_event_date}}`, `{{unsubscribe_url}}` in any string
- `splitName(fullName)` — splits a full name into first/last for token context
- `AVAILABLE_TOKENS` — exported array for the UI toolbar

**`lib/email/templates/campaign.tsx`** (new)
- Proper Resend React component matching the existing 31 transactional templates
- Converts newline-separated plain text into individual `<Text>` paragraphs
- Includes a compliant footer: "This message was sent by [Chef Name] via CheFlow." + unsubscribe link

**`lib/marketing/actions.ts`** (overhauled)
- `sendCampaignNow()`: inserts each `campaign_recipients` row first (to get its UUID as the unsubscribe token), renders tokens per-recipient, sends via Resend directly (using `getResendClient()`) to capture the `resend_message_id`, updates the row with `sent_at` + `resend_message_id`
- `recordUnsubscribeByRecipientId(recipientId)`: public action (no auth) that uses the admin Supabase client to set `clients.marketing_unsubscribed = true` — used by the public unsubscribe page

**`app/(public)/unsubscribe/page.tsx`** (new)
- `/unsubscribe?rid=<campaign_recipient_id>` — no authentication required
- Calls `recordUnsubscribeByRecipientId()` and shows a clean confirmation page
- Distinguishes between "unsubscribed" and "invalid link" states

### Phase B — Channel Intelligence

Campaigns now respect client communication preferences instead of blasting everyone by email.

**`getChannelSplit(segment)`** — splits the resolved audience by `clients.preferred_contact_method`:
- `email` — will receive the campaign automatically
- `sms` — prefer text; system queues a draft SMS to copy
- `call` — prefer phone; system shows a call list with phone numbers
- `instagram` — prefer DM; system shows the message body to copy into Instagram
- `no_method` — no preference set, defaults to email

The campaign builder's **preview step** now shows this breakdown before you send, with the full client list and drafted message for each non-email channel.

**Extended audience segments** (7 total, up from 3):
| Segment | Logic |
|---|---|
| `all_clients` | All subscribed clients with an email |
| `dormant_90_days` | No events in 90+ days |
| `vip` | `loyalty_tier = 'vip'` |
| `birthday_next_30` | Birthday milestone within next 30 days |
| `post_event_30_60` | Last event was 30–60 days ago |
| `high_value` | Lifetime spend ≥ $1,500 |
| `never_booked` | Has no events at all |

### Phase C — Campaign Analytics

**`app/(chef)/marketing/[id]/page.tsx`** (new)
- Stats cards: Total | Sent | Opened (rate) | Clicked (rate) | Unsubscribed
- Revenue attribution card: events booked within 30 days of send by campaign recipients
- Full recipient table: per-email delivery status
- "Save as template" button

**`getCampaignRevenueAttribution(campaignId)`** — queries `events` created in the 30-day window after send for all campaign recipients. Returns `{ bookings, revenue_cents }`.

Campaign list on `/marketing` is now clickable — each card links to its detail page.

### Phase D — Template Library

**New migration `20260304000003`** adds `campaign_templates` table.

**6 pre-seeded system templates** (auto-seeded per chef on first load):
1. Re-Engagement — "It's been a while — dinner soon?"
2. Seasonal Announcement — "New seasonal menus are live"
3. Birthday — "Happy birthday, {{first_name}}"
4. Post-Event Thank You — "It was such a pleasure cooking for you"
5. New Offering — "Something new is on the menu"
6. Holiday Availability — "Holiday dinners — limited dates available"

**Template picker** appears at the top of the campaign builder. Clicking a template pre-fills campaign type, subject, and body.

**Token insertion toolbar** above the message body: clickable buttons that insert `{{first_name}}`, `{{last_name}}`, etc. at the cursor position.

**`app/(chef)/marketing/templates/page.tsx`** — template library with system templates + own templates, create form, delete for own templates.

### Phase E — 1:1 Direct Outreach

**`sendDirectOutreach(input)`** — server action for sending individual messages from a client's profile:
- `email`: calls `sendEmail()` with the `CampaignEmail` template + token rendering
- `sms`: calls `sendSms()` with the message body
- `call_note` / `instagram_note`: logs the note to `direct_outreach_log` only (no delivery)

All channels are logged to `direct_outreach_log` with channel, body, delivered status, and error if applicable.

**`components/marketing/direct-outreach-panel.tsx`** (new)
- Auto-selects the client's preferred contact method as the default channel
- Disables email if no email on file, SMS if no phone
- Shows call/Instagram as "log only" with a note
- Shows outreach history (last 20 entries) below the form

Added to **`app/(chef)/clients/[id]/page.tsx`** — "Send Message" card appears after the statistics section.

### Phase F — Scheduled Campaign Cron

**`app/api/scheduled/campaigns/route.ts`** (new) — fires hourly, processes all `status = 'scheduled'` campaigns whose `scheduled_at <= now()`.

**`processScheduledCampaigns()`** in `lib/marketing/actions.ts` — iterates due campaigns, calls `sendCampaignNow()` for each, reverts status to draft if send fails.

Campaign builder now includes a **schedule toggle** — shows a datetime-local picker. Campaigns saved with a `scheduled_at` are set to `status = 'scheduled'` and fired by the cron.

### Phase G — Automated Sequences

**New migration `20260304000004`** adds:
- `automated_sequences` — one row per sequence (name, trigger_type, is_active)
- `sequence_steps` — email steps with delay_days and subject/body
- `sequence_enrollments` — per-client enrollment tracking with UNIQUE(sequence_id, client_id) to prevent double-enrollment

**Three trigger types:**
- `birthday` — enroll 7 days (configurable) before birthday; checked by daily cron
- `dormant_90` — enroll when client crosses 90 days without an event
- `post_event` — enroll N days after event completes (hook in `enrollInSequence()`)

**`processSequences()`** — cron-called: fetches enrollments where `next_send_at <= now()`, sends the current step via `CampaignEmail`, advances to next step or marks complete.

**`processBirthdayEnrollments()`** — checks all clients' `personal_milestones` JSONB for birthdays matching `today + daysBefore`, enrolls them.

**`app/(chef)/marketing/sequences/page.tsx`** + supporting client components — sequence list with step previews, active/paused toggle, and sequence builder form.

**`app/api/scheduled/sequences/route.ts`** (new) — fires daily at 06:00 UTC, runs both `processBirthdayEnrollments()` and `processSequences()` in parallel.

### Phase H — Resend Webhook (Open/Click Tracking)

**`app/api/webhooks/resend/route.ts`** (new)
- Receives `email.opened` and `email.clicked` events from Resend
- Verifies HMAC-SHA256 signature against `RESEND_WEBHOOK_SECRET`
- Looks up `campaign_recipients` by `resend_message_id`
- Updates `opened_at` or `clicked_at` on the matching row
- Uses Supabase service role client (bypasses RLS)

**`resend_message_id` column** added to `campaign_recipients` via migration `20260304000003`. Populated at send time from Resend's response.

**Setup required in Resend dashboard:**
1. Webhooks → Add endpoint → `https://your-domain.com/api/webhooks/resend`
2. Events: `email.opened`, `email.clicked`
3. Copy signing secret → set `RESEND_WEBHOOK_SECRET` env var

### Phase I — Marketing Page Overhaul

`/marketing` now shows:
- Summary stats (total campaigns, total emails sent, scheduled count)
- Clickable campaign list with status badges and inline stats
- Quick links to Sequences and Templates pages
- Campaign builder (same page, improved)

## New Migrations

| File | Tables Added |
|---|---|
| `20260304000003_campaign_system_v2.sql` | `campaign_templates`, `direct_outreach_log`, + `resend_message_id` column on `campaign_recipients` |
| `20260304000004_automated_sequences.sql` | `automated_sequences`, `sequence_steps`, `sequence_enrollments` |

## New Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `RESEND_WEBHOOK_SECRET` | Verify Resend webhook signatures | For open/click tracking |

(Existing: `RESEND_API_KEY`, `TWILIO_*` already required for email/SMS)

## File Map

| File | Status | What |
|---|---|---|
| `lib/marketing/tokens.ts` | New | Token rendering |
| `lib/email/templates/campaign.tsx` | New | Campaign email template |
| `lib/marketing/actions.ts` | Overhauled | All campaign, template, sequence, outreach actions |
| `app/(public)/unsubscribe/page.tsx` | New | Public unsubscribe page |
| `app/(chef)/marketing/page.tsx` | Overhauled | Tabbed marketing hub |
| `app/(chef)/marketing/campaign-builder-client.tsx` | Overhauled | Template picker, token toolbar, channel split, schedule |
| `app/(chef)/marketing/[id]/page.tsx` | New | Campaign detail + analytics |
| `app/(chef)/marketing/[id]/save-template-button.tsx` | New | Save campaign as template |
| `app/(chef)/marketing/sequences/page.tsx` | New | Sequence list + builder |
| `app/(chef)/marketing/sequences/sequence-builder-client.tsx` | New | Sequence creation form |
| `app/(chef)/marketing/sequences/sequence-toggle-button.tsx` | New | Active/pause toggle |
| `app/(chef)/marketing/templates/page.tsx` | New | Template library |
| `app/(chef)/marketing/templates/create-template-client.tsx` | New | Create template form |
| `app/(chef)/marketing/templates/template-actions-client.tsx` | New | Delete template |
| `components/marketing/direct-outreach-panel.tsx` | New | 1:1 outreach component |
| `app/(chef)/clients/[id]/page.tsx` | Modified | Added Direct Outreach panel + outreach history |
| `app/api/scheduled/campaigns/route.ts` | New | Scheduled campaign cron |
| `app/api/scheduled/sequences/route.ts` | New | Sequence processing cron |
| `app/api/webhooks/resend/route.ts` | New | Resend open/click webhook |
| `vercel.json` | Modified | Added 2 new cron entries |

## How It All Connects

```
Chef clicks "Preview & audience split"
  → getChannelSplit() resolves audience by preferred_contact_method
  → Email group: sendCampaignNow() → per-recipient token rendering
     → Resend.send() → resend_message_id stored on campaign_recipient row
     → /unsubscribe?rid=<row_id> in email footer
  → SMS group: shown as a draft to copy and send manually
  → Call group: shown as a call list with phone numbers
  → Instagram group: shown as DM copy to paste

Open/click webhook:
  Resend → POST /api/webhooks/resend → match by resend_message_id → update opened_at/clicked_at

Automated sequences:
  Daily cron → processBirthdayEnrollments() checks personal_milestones
  Event completed → enrollInSequence(chef, client, 'post_event', ...)
  Daily cron → processSequences() → sends step N → advances to step N+1

1:1 outreach:
  Client profile → DirectOutreachPanel → sendDirectOutreach() → email/SMS/log
  → direct_outreach_log → displayed in panel history
```
