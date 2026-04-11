import dotenv from 'dotenv'
import adminModule from '@/lib/db/admin'
import historicalScanModule from '../lib/gmail/historical-scan'

const { createAdminClient } = adminModule
const { runHistoricalScanBatch } = historicalScanModule

dotenv.config({ path: '.env.local' })

function getArg(flag: string): string | null {
  const index = process.argv.indexOf(flag)
  if (index === -1) return null
  return process.argv[index + 1] ?? null
}

async function main() {
  const chefId = getArg('--chef-id') ?? '166a7621-c81d-41a8-a510-c488ef53bb74'
  const tenantId = getArg('--tenant-id') ?? chefId
  const maxBatches = Number.parseInt(getArg('--max-batches') ?? '1000', 10)
  const sleepMs = Number.parseInt(getArg('--sleep-ms') ?? '0', 10)
  const batchSize = Number.parseInt(getArg('--batch-size') ?? '500', 10)
  const messageConcurrency = Number.parseInt(getArg('--message-concurrency') ?? '24', 10)

  const db = createAdminClient()

  for (let batchIndex = 1; batchIndex <= maxBatches; batchIndex += 1) {
    const { data: before, error: beforeError } = await db
      .from('google_connections')
      .select(
        'historical_scan_status, historical_scan_total_processed, historical_scan_total_seen, historical_scan_result_size_estimate'
      )
      .eq('chef_id', chefId)
      .single()

    if (beforeError) throw beforeError

    if (before.historical_scan_status === 'completed') {
      console.log(
        `already completed at ${before.historical_scan_total_processed}/${before.historical_scan_result_size_estimate ?? '?'}`
      )
      return
    }

    const result = await runHistoricalScanBatch(chefId, tenantId, {
      batchSize,
      messageConcurrency,
    })
    const { data: after, error: afterError } = await db
      .from('google_connections')
      .select(
        'historical_scan_status, historical_scan_total_processed, historical_scan_total_seen, historical_scan_result_size_estimate, historical_scan_last_run_at'
      )
      .eq('chef_id', chefId)
      .single()

    if (afterError) throw afterError

    console.log(
      JSON.stringify({
        batchIndex,
        batch: {
          processed: result.processed,
          seen: result.seen,
          skipped: result.skipped,
          findingsAdded: result.findingsAdded,
          errors: result.errors.slice(0, 5),
          status: result.status,
        },
        progress: {
          totalProcessed: after.historical_scan_total_processed,
          totalSeen: after.historical_scan_total_seen,
          estimatedTotal: after.historical_scan_result_size_estimate,
          status: after.historical_scan_status,
          lastRunAt: after.historical_scan_last_run_at,
          percentComplete:
            typeof after.historical_scan_result_size_estimate === 'number' &&
            after.historical_scan_result_size_estimate > 0
              ? Math.round(
                  (after.historical_scan_total_seen / after.historical_scan_result_size_estimate) *
                    100
                )
              : null,
        },
      })
    )

    if (result.status === 'completed' || after.historical_scan_status === 'completed') {
      return
    }

    if (result.status === 'error') {
      throw new Error(`Historical scan failed: ${result.errors.join('; ')}`)
    }

    if (sleepMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, sleepMs))
    }
  }

  throw new Error(`Reached max batches (${maxBatches}) before completion`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
