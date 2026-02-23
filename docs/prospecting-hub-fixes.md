# Prospecting Hub — Bug Fixes & Guidance System

**Date:** 2026-02-23
**Branch:** feature/risk-gap-closure

## What Changed

### Bugs Fixed (7 issues)

1. **Wrong import path** — `queue-actions.ts` imported `Prospect` type from `./actions` (a `'use server'` file) instead of `./types`. Fixed to import from `./types`.

2. **Missing activity types** — `prospect_called` action and `prospecting` domain were not in the `ChefActivityAction`/`ChefActivityDomain` unions. Used `as any` casts to hide the problem. Added proper types and removed casts.

3. **Invalid inquiry channel** — `convertProspectToInquiry()` used `channel: 'outbound_prospecting'` but this value didn't exist in the `inquiry_channel` PostgreSQL enum. Created migration `20260322000053` to add it.

4. **Wrong column name** — Same function wrote to `notes` column on inquiries table, which doesn't exist. Changed to `source_message`.

5. **Missing required field** — Same function didn't provide `first_contact_at` which is NOT NULL. Added it.

6. **Type mismatch in scrub prompts** — `buildApproachUserPrompt()` accepted `string | undefined` but DB returns `string | null`. Updated types to accept both.

7. **Missing CallType in email template** — `CALL_TYPE_LABELS` record in `call-reminder.tsx` didn't include `prospecting`. Added it.

### Navigation Fixes

- Main prospecting page buttons now use `<Link>` from Next.js instead of `<Button href>` for proper client-side navigation.
- Scrub page back button similarly fixed.

### User Guidance Added

- **Main page** — Full onboarding guide with 3-step walkthrough, pipeline visualization, and Ollama requirement notice. Only shows when prospect database is empty.
- **Scrub form** — "How AI Scrub Works" section explaining the 3 phases (Generate → Enrich → Strategize).
- **Call Queue** — Instructions on how to use the queue, what outcomes mean, and how conversion works.

## Files Modified

| File                                                 | Change                                          |
| ---------------------------------------------------- | ----------------------------------------------- |
| `lib/prospecting/queue-actions.ts`                   | Fix import, fix inquiry insert, remove `as any` |
| `lib/prospecting/scrub-prompt.ts`                    | Accept `null` in addition to `undefined`        |
| `lib/activity/chef-types.ts`                         | Add `prospecting` domain + actions + config     |
| `lib/email/templates/call-reminder.tsx`              | Add `prospecting` to CallType labels            |
| `app/api/scheduled/call-reminders/route.ts`          | Import CallType, fix cast                       |
| `app/(chef)/prospecting/page.tsx`                    | Fix navigation, add onboarding guide            |
| `app/(chef)/prospecting/scrub/page.tsx`              | Fix back button navigation                      |
| `components/prospecting/scrub-form.tsx`              | Add "How It Works" section                      |
| `app/(chef)/prospecting/queue/call-queue-client.tsx` | Add usage guide                                 |
| `types/database.ts`                                  | Add `outbound_prospecting` to inquiry_channel   |
| `supabase/migrations/20260322000053_...`             | Add enum value                                  |

## Migration

**`20260322000053_inquiry_channel_outbound_prospecting.sql`** — Adds `outbound_prospecting` to the `inquiry_channel` enum. Additive only, no data affected.

Must be applied before prospect-to-inquiry conversion will work:

```bash
supabase db push --linked
```
