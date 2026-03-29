# Directory Operator Outreach Pipeline

Built: 2026-03-29

## What Changed

A slow-drip email outreach system that invites discovered food operators to "be featured" on the directory. Operators never learn their business is already listed. Emails use a neutral sender identity (not cheflowhq.com), and the join page silently matches operators to their existing discovered listing.

## Files Created

| File                                                                | Purpose                                                                                                                 |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `database/migrations/20260401000120_outreach_campaign_tracking.sql` | Adds `outreach_status`, `outreach_contacted_at`, `outreach_batch_id` to `directory_listings` + `outreach_batches` table |
| `lib/discover/outreach-campaign.ts`                                 | Campaign engine: queue selection, ref encryption, send orchestration, admin dashboard stats                             |
| `lib/email/templates/directory-invitation.tsx`                      | Outreach email template (no ChefFlow branding, CAN-SPAM compliant)                                                      |
| `app/(bare)/layout.tsx`                                             | Minimal layout with no header/footer/branding                                                                           |
| `app/(bare)/discover/join/page.tsx`                                 | Neutral landing page: pre-fills from encrypted ref param                                                                |
| `app/(bare)/discover/join/_components/join-form.tsx`                | Client form: submit triggers fuzzy match or new listing creation                                                        |
| `scripts/run-outreach-batch.mjs`                                    | CLI batch runner with --dry-run, --batch-size, --min-score flags                                                        |
| `app/(admin)/admin/outreach/page.tsx`                               | Admin dashboard: funnel stats, batch history, opt-out tracking                                                          |

## Files Modified

| File                      | Change                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `lib/email/send.ts`       | Added optional `from` parameter to `sendEmail()` for sender identity override                           |
| `lib/discover/actions.ts` | Added `claimListingByMatch()` for three-tier fuzzy matching (ref decrypt, exact, loose, new submission) |

## Environment Variables Required

| Variable                        | Purpose                                                            | Required          |
| ------------------------------- | ------------------------------------------------------------------ | ----------------- |
| `DIRECTORY_OUTREACH_FROM_EMAIL` | Sender email on neutral domain (e.g., `hello@fooddirectory.guide`) | Yes (for sending) |
| `OUTREACH_PHYSICAL_ADDRESS`     | CAN-SPAM physical address                                          | Yes (for sending) |
| `OUTREACH_HASH_SECRET`          | AES encryption key for ref params (falls back to AUTH_SECRET)      | Recommended       |
| `MAX_DAILY_OUTREACH`            | Hard cap on daily sends (default: 50)                              | Optional          |

## How to Use

```bash
# Preview what would be sent (safe, no emails)
node scripts/run-outreach-batch.mjs --dry-run

# Send 10 emails to high-quality leads (lead_score >= 70)
node scripts/run-outreach-batch.mjs --batch-size 10 --min-score 70

# View stats
Navigate to /admin/outreach (admin only)
```

## Before First Send

1. Register and verify a neutral domain with Resend (e.g., `fooddirectory.guide`)
2. Set `DIRECTORY_OUTREACH_FROM_EMAIL` in `.env.local`
3. Set `OUTREACH_PHYSICAL_ADDRESS` in `.env.local`
4. Run `--dry-run` first to preview the queue
5. Start with 10/day for domain warmup (weeks 1-2)
