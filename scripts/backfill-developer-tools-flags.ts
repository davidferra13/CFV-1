import { config } from 'dotenv'
import { resolve } from 'path'
import postgres from 'postgres'

config({ path: resolve(process.cwd(), '.env.local'), quiet: true })

const FLAG_NAME = 'developer_tools'
const APPLY = process.argv.includes('--apply')

type UsageSummary = {
  chefId: string
  businessName: string | null
  apiKeyCount: number
  rawWebhookCount: number
  zapierWebhookCount: number
  hasDeveloperToolsFlag: boolean
}

function increment(map: Map<string, number>, key: string | null | undefined) {
  if (!key) return
  map.set(key, (map.get(key) ?? 0) + 1)
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('Missing env var: DATABASE_URL')
  }
  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  })
  try {
    const [chefs, apiKeys, rawWebhooks, zapierWebhooks, flags] = await Promise.all([
      sql<{ id: string; business_name: string | null }[]>`
        select id, business_name
        from chefs
        order by business_name nulls last, id
      `,
      sql<{ tenant_id: string }[]>`
        select tenant_id
        from chef_api_keys
        where is_active = true
      `,
      sql<{ tenant_id: string }[]>`
        select tenant_id
        from webhook_endpoints
        where is_active = true
      `,
      sql<{ tenant_id: string }[]>`
        select tenant_id
        from zapier_webhook_subscriptions
        where is_active = true
      `,
      sql<{ chef_id: string; enabled: boolean }[]>`
        select chef_id, enabled
        from chef_feature_flags
        where flag_name = ${FLAG_NAME}
      `,
    ])

    const apiKeyCounts = new Map<string, number>()
    const rawWebhookCounts = new Map<string, number>()
    const zapierWebhookCounts = new Map<string, number>()
    const flaggedChefIds = new Set<string>()

    for (const row of apiKeys) increment(apiKeyCounts, row.tenant_id)
    for (const row of rawWebhooks) increment(rawWebhookCounts, row.tenant_id)
    for (const row of zapierWebhooks) increment(zapierWebhookCounts, row.tenant_id)
    for (const row of flags) {
      if (row.enabled === true && row.chef_id) flaggedChefIds.add(row.chef_id)
    }

    const usage: UsageSummary[] = chefs
      .map((chef: any) => ({
        chefId: chef.id,
        businessName: chef.business_name ?? null,
        apiKeyCount: apiKeyCounts.get(chef.id) ?? 0,
        rawWebhookCount: rawWebhookCounts.get(chef.id) ?? 0,
        zapierWebhookCount: zapierWebhookCounts.get(chef.id) ?? 0,
        hasDeveloperToolsFlag: flaggedChefIds.has(chef.id),
      }))
      .filter((chef) => chef.apiKeyCount || chef.rawWebhookCount || chef.zapierWebhookCount)
      .sort((a, b) => {
        const aTotal = a.apiKeyCount + a.rawWebhookCount + a.zapierWebhookCount
        const bTotal = b.apiKeyCount + b.rawWebhookCount + b.zapierWebhookCount
        return bTotal - aTotal || (a.businessName ?? '').localeCompare(b.businessName ?? '')
      })

    const missingFlag = usage.filter((chef) => !chef.hasDeveloperToolsFlag)

    console.log(`Developer tools usage audit`)
    console.log(`Mode: ${APPLY ? 'apply' : 'dry-run'}`)
    console.log(`Active API keys: ${apiKeys.length}`)
    console.log(`Active raw webhooks: ${rawWebhooks.length}`)
    console.log(`Active Zapier webhooks: ${zapierWebhooks.length}`)
    console.log(`Chefs with any developer-tools usage: ${usage.length}`)
    console.log(`Chefs already flagged: ${usage.length - missingFlag.length}`)
    console.log(`Chefs missing flag: ${missingFlag.length}`)

    if (usage.length > 0) {
      console.log(`\nPer-chef usage:`)
      for (const chef of usage) {
        const total = chef.apiKeyCount + chef.rawWebhookCount + chef.zapierWebhookCount
        console.log(
          `- ${chef.businessName ?? '(unnamed chef)'} [${chef.chefId}] total=${total} api_keys=${chef.apiKeyCount} raw_webhooks=${chef.rawWebhookCount} zapier=${chef.zapierWebhookCount} flagged=${chef.hasDeveloperToolsFlag}`
        )
      }
    }

    if (!APPLY) {
      console.log(`\nDry run complete. Re-run with --apply to backfill missing flags.`)
      return
    }

    if (missingFlag.length === 0) {
      console.log(`\nNo backfill needed.`)
      return
    }

    const now = new Date().toISOString()
    const rows = missingFlag.map((chef) => ({
      chef_id: chef.chefId,
      flag_name: FLAG_NAME,
      enabled: true,
      updated_at: now,
    }))

    await sql`
      insert into chef_feature_flags ${sql(rows, 'chef_id', 'flag_name', 'enabled', 'updated_at')}
      on conflict (chef_id, flag_name)
      do update set
        enabled = excluded.enabled,
        updated_at = excluded.updated_at
    `

    console.log(`\nBackfilled ${rows.length} chef flag row(s).`)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((error) => {
  console.error(`Developer-tools backfill failed: ${error.message}`)
  process.exit(1)
})
