import dotenv from 'dotenv'
import { createAdminClient } from '@/lib/supabase/admin'
import { MARKETPLACE_PLATFORMS } from '../lib/marketplace/platforms'
import { extractTakeAChefFinanceMeta } from '../lib/integrations/take-a-chef-finance'
import { syncMarketplaceInquiryProjection } from '../lib/marketplace/platform-records'

dotenv.config({ path: '.env.local' })

function getArg(flag: string): string | null {
  const index = process.argv.indexOf(flag)
  if (index === -1) return null
  return process.argv[index + 1] ?? null
}

async function main() {
  const platformChannels = MARKETPLACE_PLATFORMS.map((platform) => platform.channel)
  const limit = Number.parseInt(getArg('--limit') ?? '500', 10)
  const dryRun = process.argv.includes('--dry-run')
  const tenantIdFilter = getArg('--tenant-id')

  const supabase = createAdminClient()

  let query = supabase
    .from('inquiries')
    .select(
      'id, tenant_id, channel, external_platform, external_inquiry_id, external_link, client_id, converted_to_event_id, next_action_required, next_action_by, source_message, unknown_fields'
    )
    .in('channel', platformChannels)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (tenantIdFilter) {
    query = query.eq('tenant_id', tenantIdFilter)
  }

  const { data: inquiries, error } = await query

  if (error) throw error

  let processed = 0
  let skipped = 0
  let failed = 0

  for (const inquiry of inquiries ?? []) {
    const platform =
      (typeof inquiry.external_platform === 'string' && inquiry.external_platform.trim()) ||
      inquiry.channel

    if (!platform) {
      skipped += 1
      continue
    }

    try {
      const finance =
        platform === 'take_a_chef' ? extractTakeAChefFinanceMeta(inquiry.unknown_fields) : null

      if (!dryRun) {
        await syncMarketplaceInquiryProjection({
          supabase,
          tenantId: inquiry.tenant_id,
          inquiryId: inquiry.id,
          platform,
          clientId: inquiry.client_id ?? null,
          eventId: inquiry.converted_to_event_id ?? null,
          externalInquiryId: inquiry.external_inquiry_id ?? null,
          externalUrl: inquiry.external_link ?? null,
          summary:
            typeof inquiry.source_message === 'string'
              ? inquiry.source_message.slice(0, 4000)
              : null,
          nextActionRequired: inquiry.next_action_required ?? null,
          nextActionBy: inquiry.next_action_by ?? null,
          payout: finance
            ? {
                grossBookingCents: finance.grossBookingCents,
                commissionPercent: finance.commissionPercent,
                netPayoutCents: finance.payoutAmountCents,
                payoutStatus: finance.payoutStatus,
                payoutArrivalDate: finance.payoutArrivalDate,
                payoutReference: finance.payoutReference,
                notes: finance.notes,
                capturedAt: finance.updatedAt,
              }
            : null,
          payload: {
            backfill_source: 'legacy_inquiries',
            backfilled_at: new Date().toISOString(),
          },
        })
      }

      processed += 1
    } catch (entryError) {
      failed += 1
      console.error(
        `[backfill-marketplace-platform-records] Failed for inquiry ${inquiry.id}:`,
        entryError
      )
    }
  }

  console.log(
    JSON.stringify({
      dryRun,
      limit,
      tenantId: tenantIdFilter,
      processed,
      skipped,
      failed,
    })
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
