#!/usr/bin/env npx tsx
/**
 * Backfill platform_records from existing inquiries
 *
 * Reads all inquiries that have external_platform set and creates
 * corresponding platform_records rows. Safe to run multiple times
 * (uses upsert on inquiry_id unique constraint).
 *
 * Usage:
 *   npx tsx scripts/backfill-platform-records.ts
 *   npx tsx scripts/backfill-platform-records.ts --dry-run
 */

import { createAdminClient } from '@/lib/db/admin'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const db = createAdminClient()
const isDryRun = process.argv.includes('--dry-run')

async function main() {
  console.log(`\n=== Backfill platform_records ${isDryRun ? '(DRY RUN)' : ''} ===\n`)

  // Fetch all marketplace inquiries
  const { data: inquiries, error } = await db
    .from('inquiries')
    .select(
      'id, tenant_id, client_id, converted_to_event_id, channel, status, external_platform, external_inquiry_id, external_link, unknown_fields, confirmed_date, confirmed_guest_count, confirmed_location, confirmed_occasion, confirmed_budget_cents, created_at'
    )
    .not('external_platform', 'is', null)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch inquiries:', error.message)
    process.exit(1)
  }

  console.log(`Found ${inquiries.length} marketplace inquiries`)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const inq of inquiries) {
    // Check if platform_record already exists
    const { data: existing } = await db
      .from('platform_records')
      .select('id')
      .eq('inquiry_id', inq.id)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    const uf = (inq.unknown_fields as Record<string, any>) || {}
    const platform = inq.external_platform || inq.channel

    // Determine status from inquiry status
    let statusOnPlatform = 'new'
    if (inq.status === 'confirmed' || inq.status === 'paid') statusOnPlatform = 'booked'
    else if (inq.status === 'awaiting_client' || inq.status === 'quoted')
      statusOnPlatform = 'responded'
    else if (inq.status === 'lost' || inq.status === 'cancelled') statusOnPlatform = 'declined'
    else if (inq.status === 'completed') statusOnPlatform = 'paid'

    const record = {
      tenant_id: inq.tenant_id,
      inquiry_id: inq.id,
      client_id: inq.client_id || null,
      event_id: inq.converted_to_event_id || null,
      platform,
      external_inquiry_id: inq.external_inquiry_id || uf.tac_cta_uri_token || null,
      external_uri_token: uf.tac_cta_uri_token || null,
      external_url: inq.external_link || uf.tac_link || null,
      request_url: inq.external_link || uf.tac_link || null,
      status_on_platform: statusOnPlatform,
      last_capture_type: 'backfill',
      link_health: 'unknown',
      payload: {},
    }

    if (isDryRun) {
      console.log(`  [dry-run] Would create platform_record for inquiry ${inq.id} (${platform})`)
      created++
      continue
    }

    const { data: newRecord, error: insertError } = await db
      .from('platform_records')
      .insert(record as any)
      .select('id')
      .single()

    if (insertError) {
      console.error(`  Error creating record for inquiry ${inq.id}: ${insertError.message}`)
      errors++
      continue
    }

    // Create initial snapshot from inquiry data
    if (newRecord) {
      await db.from('platform_snapshots').insert({
        tenant_id: inq.tenant_id,
        platform_record_id: newRecord.id,
        inquiry_id: inq.id,
        event_id: inq.converted_to_event_id || null,
        capture_type: 'backfill',
        source: 'backfill_script',
        extracted_client_name: uf.original_sender_name || null,
        extracted_booking_date: inq.confirmed_date || null,
        extracted_guest_count: inq.confirmed_guest_count || null,
        extracted_location: inq.confirmed_location || null,
        extracted_occasion: inq.confirmed_occasion || null,
        extracted_amount_cents: inq.confirmed_budget_cents || null,
        summary: `Backfilled from inquiry (${platform})`,
        metadata: { backfilled_at: new Date().toISOString() },
      } as any)

      // Create payout record if financial data exists
      const tacFinance = uf.take_a_chef_finance as Record<string, any> | undefined
      const tacPayouts = Array.isArray(uf.take_a_chef_payouts) ? uf.take_a_chef_payouts : []

      if (inq.confirmed_budget_cents || tacPayouts.length > 0) {
        const latestPayout = tacPayouts[tacPayouts.length - 1] as Record<string, any> | undefined
        const commissionPct =
          latestPayout?.commission_percent ?? tacFinance?.commission_percent ?? null

        await db.from('platform_payouts').insert({
          tenant_id: inq.tenant_id,
          platform_record_id: newRecord.id,
          inquiry_id: inq.id,
          event_id: inq.converted_to_event_id || null,
          platform,
          gross_booking_cents:
            latestPayout?.gross_amount_cents ?? inq.confirmed_budget_cents ?? null,
          commission_percent: commissionPct,
          commission_amount_cents: latestPayout?.commission_cents ?? null,
          net_payout_cents: latestPayout?.net_payout_cents ?? null,
          payout_status: latestPayout
            ? 'paid'
            : inq.confirmed_budget_cents
              ? 'untracked'
              : 'untracked',
          payout_arrival_date: latestPayout?.payout_date ?? null,
          source: 'backfill',
        } as any)
      }
    }

    created++
    if (created % 10 === 0) {
      console.log(`  Progress: ${created} created, ${skipped} skipped, ${errors} errors`)
    }
  }

  console.log(`\n=== Complete ===`)
  console.log(`  Created: ${created}`)
  console.log(`  Skipped (already exist): ${skipped}`)
  console.log(`  Errors: ${errors}`)
  console.log(`  Total processed: ${inquiries.length}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
