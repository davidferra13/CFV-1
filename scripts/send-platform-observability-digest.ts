import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import postgres from 'postgres'
import dotenv from 'dotenv'
import platformObservabilityDigest from '@/lib/platform-observability/digest'

dotenv.config({ path: '.env.local', quiet: true })
dotenv.config({ path: '.env.local.dev', quiet: true })
dotenv.config({ path: '.env', quiet: true })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required to send the platform observability digest.')
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
    const digestResult = await platformObservabilityDigest.sendPlatformObservabilityDigest()

    console.log(
      JSON.stringify(
        {
          migration,
          digestResult,
        },
        null,
        2
      )
    )

    if (!digestResult.sent) {
      process.exitCode = 1
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((error) => {
  console.error('[send-platform-observability-digest] failed:', error)
  process.exit(1)
})
