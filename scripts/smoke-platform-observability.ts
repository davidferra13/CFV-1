import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import postgres from 'postgres'
import dotenv from 'dotenv'
import platformObservabilityEvents from '@/lib/platform-observability/events'
import platformObservabilityDigest from '@/lib/platform-observability/digest'

dotenv.config({ path: '.env.local', quiet: true })
dotenv.config({ path: '.env.local.dev', quiet: true })
dotenv.config({ path: '.env', quiet: true })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required to smoke-test platform observability.')
}

const MIGRATION_PATH = path.join(
  process.cwd(),
  'database/migrations/20260408000001_platform_observability_events.sql'
)

async function ensureObservabilityTable(sql: postgres.Sql) {
  const existing = await sql`select to_regclass('public.platform_observability_events') as regclass`
  if (existing[0]?.regclass) {
    return { created: false }
  }

  const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8')
  await sql.unsafe(migrationSql)
  return { created: true }
}

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 })

  try {
    const migration = await ensureObservabilityTable(sql)
    const validationKey = `manual-validation-${Date.now()}`

    await platformObservabilityEvents.recordPlatformEvent({
      eventKey: 'system.client_error_reported',
      source: 'manual_validation',
      actorType: 'system',
      subjectType: 'validation',
      subjectId: validationKey,
      summary: 'Manual validation alert for platform observability pipeline',
      details:
        'Triggered manually to verify realtime alert delivery through Resend and local Postgres persistence.',
      metadata: {
        validation: true,
        validation_key: validationKey,
        triggered_by: 'smoke-platform-observability',
      },
      alertDedupeKey: `manual-validation:${validationKey}`,
    })

    const digestResult = await platformObservabilityDigest.sendPlatformObservabilityDigest()

    const eventRows = await sql`
      select event_key, source, summary, realtime_alert_status, realtime_alert_sent_at, occurred_at
      from platform_observability_events
      where subject_id = ${validationKey}
      order by occurred_at desc
      limit 1
    `

    console.log(
      JSON.stringify(
        {
          migration,
          validationKey,
          eventRecord: eventRows[0] ?? null,
          digestResult,
        },
        null,
        2
      )
    )
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((error) => {
  console.error('[smoke-platform-observability] failed:', error)
  process.exit(1)
})
