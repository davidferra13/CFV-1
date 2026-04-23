import { config } from 'dotenv'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

config({ path: resolve(process.cwd(), '.env.local'), quiet: true })

export const LEGACY_DEFAULT_REGION = 'haverhill-ma'
export const LEGACY_REGION_STATES = new Set(['MA', 'NH'])
export const DEFAULT_REMOVED_ON = new Date('2026-04-21T00:00:00.000Z')
export const DEFAULT_CONNECT_RETRY_LIMIT = 5
export const DEFAULT_CONNECT_RETRY_DELAY_MS = 1500
export const DEFAULT_PREVIEW_LIMIT = 25

const CLASSIFICATION_ORDER = [
  'likely_inherited_default_outside_legacy_market',
  'manual_review_mixed_market_signals',
  'manual_review_missing_location_signals',
  'legacy_default_with_local_signals',
] as const

type ClassificationOrder = (typeof CLASSIFICATION_ORDER)[number]

export type AuditRow = {
  id: string
  business_name: string | null
  email: string
  created_at: string
  preferred_region: string | null
  chef_city: string | null
  chef_state: string | null
  community_city: string | null
  community_state: string | null
  community_area: string | null
  marketplace_city: string | null
  marketplace_state: string | null
  listing_city: string | null
  listing_state: string | null
}

type RegionSummaryRow = {
  preferred_region: string | null
  chef_count: string
}

export type PreferredRegionClassification =
  | 'likely_inherited_default_outside_legacy_market'
  | 'manual_review_missing_location_signals'
  | 'manual_review_mixed_market_signals'
  | 'legacy_default_with_local_signals'

export type PreferredRegionAuditCandidate = {
  chefId: string
  businessName: string | null
  email: string
  createdAt: string
  createdBeforeDefaultDrop: boolean
  preferredRegion: string | null
  signalAreas: string[]
  signalCities: string[]
  signalStates: string[]
  classification: PreferredRegionClassification
  recommendedAction: string
}

export type PreferredRegionAuditSummary = {
  auditMode: 'read-only'
  defaultRemovedOn: string
  generatedAt: string
  legacyDefaultRegion: string
  distinctPreferredRegions: number
  topPreferredRegions: Array<{
    preferredRegion: string | null
    chefCount: number
  }>
  legacyDefaultCandidateCount: number
  classificationCounts: Record<PreferredRegionClassification, number>
  candidates: PreferredRegionAuditCandidate[]
}

export type PreferredRegionAuditCliOptions = {
  connectRetryDelayMs: number
  connectRetryLimit: number
  format: 'json' | 'markdown' | 'text'
  help: boolean
  outPath: string | null
  previewLimit: number
}

function readFlagValue(args: string[], flag: string) {
  const index = args.indexOf(flag)
  if (index === -1) return null
  return args[index + 1] ?? null
}

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function formatDate(value: string) {
  return value.slice(0, 10)
}

function escapeMarkdown(value: string) {
  return value.replace(/[|`]/g, '\\$&')
}

export function parseAuditOptions(args = process.argv.slice(2)): PreferredRegionAuditCliOptions {
  const explicitFormat = readFlagValue(args, '--format')
  const format: PreferredRegionAuditCliOptions['format'] =
    explicitFormat === 'json' || explicitFormat === 'markdown' || explicitFormat === 'text'
      ? explicitFormat
      : args.includes('--json')
        ? 'json'
        : args.includes('--markdown')
          ? 'markdown'
          : 'text'

  return {
    connectRetryDelayMs: parsePositiveInteger(
      readFlagValue(args, '--retry-delay-ms'),
      DEFAULT_CONNECT_RETRY_DELAY_MS
    ),
    connectRetryLimit: parsePositiveInteger(
      readFlagValue(args, '--retry-limit'),
      DEFAULT_CONNECT_RETRY_LIMIT
    ),
    format,
    help: args.includes('--help') || args.includes('-h'),
    outPath: readFlagValue(args, '--out'),
    previewLimit: parsePositiveInteger(readFlagValue(args, '--limit'), DEFAULT_PREVIEW_LIMIT),
  }
}

export function getPreferredRegionAuditHelpText() {
  return [
    'Preferred-region legacy default audit (read-only)',
    '',
    'Usage:',
    '  tsx scripts/audit-preferred-region-default.ts [--json|--markdown|--format text] [--out <path>] [--limit <n>] [--retry-limit <n>] [--retry-delay-ms <ms>]',
    '',
    'Flags:',
    '  --json                Emit the full audit as JSON.',
    '  --markdown            Emit the audit as Markdown.',
    '  --format <value>      One of: text, json, markdown.',
    '  --out <path>          Write a review artifact to disk. Output remains read-only.',
    '  --limit <n>           Preview rows per classification in terminal output. Default: 25.',
    `  --retry-limit <n>     Connection retry attempts. Default: ${DEFAULT_CONNECT_RETRY_LIMIT}.`,
    `  --retry-delay-ms <n>  Base delay between retries in milliseconds. Default: ${DEFAULT_CONNECT_RETRY_DELAY_MS}.`,
  ].join('\n')
}

function normalizeState(value: string | null) {
  return value?.trim().toUpperCase() || null
}

function normalizeCity(value: string | null) {
  return value?.trim() || null
}

export function uniqueStates(row: AuditRow) {
  return Array.from(
    new Set(
      [row.chef_state, row.community_state, row.marketplace_state, row.listing_state]
        .map(normalizeState)
        .filter(Boolean)
    )
  ) as string[]
}

export function uniqueCities(row: AuditRow) {
  return Array.from(
    new Set(
      [row.chef_city, row.community_city, row.marketplace_city, row.listing_city]
        .map(normalizeCity)
        .filter(Boolean)
    )
  ) as string[]
}

export function uniqueAreas(row: AuditRow) {
  return Array.from(new Set([row.community_area].map(normalizeCity).filter(Boolean))) as string[]
}

export function classifyRow(row: AuditRow): PreferredRegionClassification {
  const states = uniqueStates(row)
  const hasLegacyState = states.some((state) => LEGACY_REGION_STATES.has(state))
  const hasOutsideLegacyState = states.some((state) => !LEGACY_REGION_STATES.has(state))

  if (states.length === 0) return 'manual_review_missing_location_signals'
  if (hasLegacyState && hasOutsideLegacyState) return 'manual_review_mixed_market_signals'
  if (hasOutsideLegacyState) return 'likely_inherited_default_outside_legacy_market'
  return 'legacy_default_with_local_signals'
}

export function recommendedAction(classification: PreferredRegionClassification) {
  switch (classification) {
    case 'likely_inherited_default_outside_legacy_market':
      return 'Manual review first. If no intentional local-market dependency exists, clear preferred_region explicitly.'
    case 'manual_review_missing_location_signals':
      return 'Do not mutate automatically. Confirm service-area intent before clearing preferred_region.'
    case 'manual_review_mixed_market_signals':
      return 'Review the chef profile and store-coverage setup together before changing preferred_region.'
    case 'legacy_default_with_local_signals':
      return 'Leave as-is unless the chef confirms a different preferred region.'
  }
}

export function shouldRetryConnection(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return (
    message.includes('too many clients already') ||
    message.includes('too many clients') ||
    message.includes('remaining connection slots are reserved')
  )
}

function sleep(ms: number) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

type LoadAuditRowsOptions = Pick<
  PreferredRegionAuditCliOptions,
  'connectRetryDelayMs' | 'connectRetryLimit'
>

async function loadAuditRows(connectionString: string, options: LoadAuditRowsOptions) {
  let lastError: unknown

  for (let attempt = 1; attempt <= options.connectRetryLimit; attempt += 1) {
    const sql = postgres(connectionString, {
      max: 1,
      idle_timeout: 5,
      connect_timeout: 10,
      prepare: false,
    })

    try {
      const [tablePresence] = await sql<
        {
          community_profiles: string | null
          chef_marketplace_profiles: string | null
          chef_directory_listings: string | null
        }[]
      >`
        select
          to_regclass('public.community_profiles')::text as community_profiles,
          to_regclass('public.chef_marketplace_profiles')::text as chef_marketplace_profiles,
          to_regclass('public.chef_directory_listings')::text as chef_directory_listings
      `

      const columnRows = await sql<
        {
          table_name: string
          column_name: string
        }[]
      >`
        select table_name, column_name
        from information_schema.columns
        where table_schema = 'public'
          and table_name in ('community_profiles', 'chef_marketplace_profiles', 'chef_directory_listings')
      `

      const columnsByTable = new Map<string, Set<string>>()
      for (const row of columnRows) {
        const existing = columnsByTable.get(row.table_name) ?? new Set<string>()
        existing.add(row.column_name)
        columnsByTable.set(row.table_name, existing)
      }

      const hasColumn = (tableName: string, columnName: string) =>
        columnsByTable.get(tableName)?.has(columnName) ?? false

      const communityCityExpression = hasColumn('community_profiles', 'service_area_city')
        ? 'cp.service_area_city'
        : hasColumn('community_profiles', 'city')
          ? 'cp.city'
          : 'null::text'
      const communityStateExpression = hasColumn('community_profiles', 'service_area_state')
        ? 'cp.service_area_state'
        : hasColumn('community_profiles', 'state')
          ? 'cp.state'
          : 'null::text'
      const communityAreaExpression = hasColumn('community_profiles', 'service_area')
        ? 'cp.service_area'
        : 'null::text'
      const marketplaceCityExpression = hasColumn('chef_marketplace_profiles', 'service_area_city')
        ? 'mp.service_area_city'
        : hasColumn('chef_marketplace_profiles', 'city')
          ? 'mp.city'
          : 'null::text'
      const marketplaceStateExpression = hasColumn(
        'chef_marketplace_profiles',
        'service_area_state'
      )
        ? 'mp.service_area_state'
        : hasColumn('chef_marketplace_profiles', 'state')
          ? 'mp.state'
          : 'null::text'
      const listingCityExpression = hasColumn('chef_directory_listings', 'city')
        ? 'dl.city'
        : 'null::text'
      const listingStateExpression = hasColumn('chef_directory_listings', 'state')
        ? 'dl.state'
        : 'null::text'

      const selectFragments = [
        'c.id',
        'c.business_name',
        'c.email',
        'c.created_at',
        'c.preferred_region',
        'c.city as chef_city',
        'c.state as chef_state',
        tablePresence?.community_profiles
          ? `${communityCityExpression} as community_city, ${communityStateExpression} as community_state, ${communityAreaExpression} as community_area`
          : 'null::text as community_city, null::text as community_state, null::text as community_area',
        tablePresence?.chef_marketplace_profiles
          ? `${marketplaceCityExpression} as marketplace_city, ${marketplaceStateExpression} as marketplace_state`
          : 'null::text as marketplace_city, null::text as marketplace_state',
        tablePresence?.chef_directory_listings
          ? `${listingCityExpression} as listing_city, ${listingStateExpression} as listing_state`
          : 'null::text as listing_city, null::text as listing_state',
      ]

      const joinFragments = [
        tablePresence?.community_profiles
          ? 'left join community_profiles cp on cp.chef_id = c.id'
          : '',
        tablePresence?.chef_marketplace_profiles
          ? 'left join chef_marketplace_profiles mp on mp.chef_id = c.id'
          : '',
        tablePresence?.chef_directory_listings
          ? 'left join chef_directory_listings dl on dl.chef_id = c.id'
          : '',
      ].filter(Boolean)

      const regionSummaryRows = await sql<RegionSummaryRow[]>`
        select preferred_region, count(*)::text as chef_count
        from chefs
        group by preferred_region
        order by count(*) desc, preferred_region asc nulls last
      `

      const candidateRows = await sql.unsafe<AuditRow[]>(
        `
          select
            ${selectFragments.join(',\n            ')}
          from chefs c
          ${joinFragments.join('\n          ')}
          where c.preferred_region = $1
          order by c.created_at asc, c.business_name asc nulls last, c.id asc
        `,
        [LEGACY_DEFAULT_REGION]
      )

      await sql.end({ timeout: 5 })
      return { regionSummaryRows, candidateRows }
    } catch (error) {
      lastError = error
      await sql.end({ timeout: 5 }).catch(() => undefined)

      if (!shouldRetryConnection(error) || attempt === options.connectRetryLimit) {
        throw error
      }

      await sleep(options.connectRetryDelayMs * attempt)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Preferred-region audit failed')
}

function compareClassificationPriority(
  left: PreferredRegionClassification,
  right: PreferredRegionClassification
) {
  return CLASSIFICATION_ORDER.indexOf(left) - CLASSIFICATION_ORDER.indexOf(right)
}

function sortCandidates(candidates: PreferredRegionAuditCandidate[]) {
  return [...candidates].sort((left, right) => {
    const classificationOrder = compareClassificationPriority(
      left.classification,
      right.classification
    )
    if (classificationOrder !== 0) return classificationOrder
    if (left.createdBeforeDefaultDrop !== right.createdBeforeDefaultDrop) {
      return left.createdBeforeDefaultDrop ? -1 : 1
    }
    if (left.createdAt !== right.createdAt) return left.createdAt.localeCompare(right.createdAt)
    if ((left.businessName ?? '') !== (right.businessName ?? '')) {
      return (left.businessName ?? '').localeCompare(right.businessName ?? '')
    }
    return left.chefId.localeCompare(right.chefId)
  })
}

export function buildPreferredRegionAuditSummary(
  regionSummaryRows: RegionSummaryRow[],
  candidateRows: AuditRow[]
): PreferredRegionAuditSummary {
  const candidates = sortCandidates(
    candidateRows.map((row) => {
      const states = uniqueStates(row)
      const classification = classifyRow(row)

      return {
        chefId: row.id,
        businessName: row.business_name,
        email: row.email,
        createdAt: row.created_at,
        createdBeforeDefaultDrop: new Date(row.created_at).getTime() < DEFAULT_REMOVED_ON.getTime(),
        preferredRegion: row.preferred_region,
        signalAreas: uniqueAreas(row),
        signalCities: uniqueCities(row),
        signalStates: states,
        classification,
        recommendedAction: recommendedAction(classification),
      }
    })
  )

  const classificationCounts = CLASSIFICATION_ORDER.reduce<
    Record<PreferredRegionClassification, number>
  >(
    (counts, classification) => {
      counts[classification] = 0
      return counts
    },
    {
      likely_inherited_default_outside_legacy_market: 0,
      manual_review_missing_location_signals: 0,
      manual_review_mixed_market_signals: 0,
      legacy_default_with_local_signals: 0,
    }
  )

  for (const candidate of candidates) {
    classificationCounts[candidate.classification] += 1
  }

  return {
    auditMode: 'read-only',
    defaultRemovedOn: DEFAULT_REMOVED_ON.toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    legacyDefaultRegion: LEGACY_DEFAULT_REGION,
    distinctPreferredRegions: regionSummaryRows.length,
    topPreferredRegions: regionSummaryRows.slice(0, 10).map((row) => ({
      preferredRegion: row.preferred_region,
      chefCount: Number(row.chef_count),
    })),
    legacyDefaultCandidateCount: candidates.length,
    classificationCounts,
    candidates,
  }
}

export function groupCandidatesByClassification(candidates: PreferredRegionAuditCandidate[]) {
  return CLASSIFICATION_ORDER.map((classification) => ({
    classification,
    candidates: candidates.filter((candidate) => candidate.classification === classification),
  }))
}

function formatSignalSummary(candidate: PreferredRegionAuditCandidate) {
  if (candidate.signalStates.length === 0 && candidate.signalAreas.length === 0) {
    return 'No location signals'
  }

  if (candidate.signalStates.length === 0 && candidate.signalAreas.length > 0) {
    return `Areas: ${candidate.signalAreas.join(', ')}`
  }

  const cities =
    candidate.signalCities.length > 0 ? candidate.signalCities.join(', ') : '(no city signal)'
  const areaSummary =
    candidate.signalAreas.length > 0 ? ` | areas=${candidate.signalAreas.join(', ')}` : ''
  return `${cities} | ${candidate.signalStates.join(', ')}${areaSummary}`
}

function formatCandidateTextLine(candidate: PreferredRegionAuditCandidate) {
  return [
    `- ${candidate.businessName ?? '(unnamed chef)'}`,
    `[${candidate.chefId}]`,
    `created=${formatDate(candidate.createdAt)}`,
    `createdBeforeDefaultDrop=${candidate.createdBeforeDefaultDrop}`,
    `signals=${formatSignalSummary(candidate)}`,
    `email=${candidate.email}`,
  ].join(' ')
}

function renderGroupedText(
  summary: PreferredRegionAuditSummary,
  previewLimit: number,
  linePrefix = ''
) {
  const lines: string[] = []

  for (const group of groupCandidatesByClassification(summary.candidates)) {
    if (group.candidates.length === 0) continue
    lines.push(`${linePrefix}${group.classification} (${group.candidates.length})`)

    const preview = group.candidates.slice(0, previewLimit)
    for (const candidate of preview) {
      lines.push(`${linePrefix}${formatCandidateTextLine(candidate)}`)
      lines.push(`${linePrefix}  action: ${candidate.recommendedAction}`)
    }

    const hiddenCount = group.candidates.length - preview.length
    if (hiddenCount > 0) {
      lines.push(
        `${linePrefix}  ... ${hiddenCount} more row${hiddenCount === 1 ? '' : 's'} hidden. Increase --limit or write a report with --out.`
      )
    }

    lines.push('')
  }

  return lines
}

export function renderPreferredRegionAuditText(
  summary: PreferredRegionAuditSummary,
  previewLimit = DEFAULT_PREVIEW_LIMIT
) {
  const lines = [
    'Preferred-region legacy default audit (read-only)',
    `Generated at: ${summary.generatedAt}`,
    `Legacy default region: ${summary.legacyDefaultRegion}`,
    `Default removed on: ${summary.defaultRemovedOn}`,
    `Distinct preferred_region values: ${summary.distinctPreferredRegions}`,
    `Rows still set to legacy default: ${summary.legacyDefaultCandidateCount}`,
    '',
    'Top preferred_region values:',
    ...summary.topPreferredRegions.map(
      (item) => `- ${item.preferredRegion ?? '(null)'}: ${item.chefCount}`
    ),
    '',
    'Candidate breakdown:',
    ...CLASSIFICATION_ORDER.map(
      (classification) => `- ${classification}: ${summary.classificationCounts[classification]}`
    ),
  ]

  if (summary.candidates.length === 0) {
    lines.push('', 'No rows currently match the legacy default.')
    return lines.join('\n')
  }

  lines.push('', 'Legacy-default candidates by review priority:', '')
  lines.push(...renderGroupedText(summary, previewLimit))

  return lines.join('\n').trim()
}

export function renderPreferredRegionAuditMarkdown(
  summary: PreferredRegionAuditSummary,
  previewLimit = DEFAULT_PREVIEW_LIMIT
) {
  const lines = [
    '# Preferred-region legacy default audit',
    '',
    `- Audit mode: ${summary.auditMode}`,
    `- Generated at: ${summary.generatedAt}`,
    `- Legacy default region: \`${summary.legacyDefaultRegion}\``,
    `- Default removed on: ${summary.defaultRemovedOn}`,
    `- Distinct \`preferred_region\` values: ${summary.distinctPreferredRegions}`,
    `- Rows still set to the legacy default: ${summary.legacyDefaultCandidateCount}`,
    '',
    '## Top preferred_region values',
    '',
    '| preferred_region | chef_count |',
    '| --- | ---: |',
    ...summary.topPreferredRegions.map(
      (item) => `| ${escapeMarkdown(item.preferredRegion ?? '(null)')} | ${item.chefCount} |`
    ),
    '',
    '## Candidate breakdown',
    '',
    '| classification | count |',
    '| --- | ---: |',
    ...CLASSIFICATION_ORDER.map(
      (classification) => `| ${classification} | ${summary.classificationCounts[classification]} |`
    ),
  ]

  if (summary.candidates.length === 0) {
    lines.push('', 'No rows currently match the legacy default.')
    return lines.join('\n')
  }

  lines.push('', '## Candidates', '')

  for (const group of groupCandidatesByClassification(summary.candidates)) {
    if (group.candidates.length === 0) continue
    lines.push(`### ${group.classification}`, '')

    const preview = group.candidates.slice(0, previewLimit)
    for (const candidate of preview) {
      lines.push(
        `- **${escapeMarkdown(candidate.businessName ?? '(unnamed chef)')}** \`${candidate.chefId}\``
      )
      lines.push(`  created: ${formatDate(candidate.createdAt)}`)
      lines.push(`  createdBeforeDefaultDrop: ${candidate.createdBeforeDefaultDrop}`)
      lines.push(`  signals: ${escapeMarkdown(formatSignalSummary(candidate))}`)
      lines.push(`  email: ${escapeMarkdown(candidate.email)}`)
      lines.push(`  action: ${escapeMarkdown(candidate.recommendedAction)}`)
    }

    const hiddenCount = group.candidates.length - preview.length
    if (hiddenCount > 0) {
      lines.push(
        `- _${hiddenCount} more row${hiddenCount === 1 ? '' : 's'} hidden. Increase \`--limit\` or export with \`--out\`._`
      )
    }

    lines.push('')
  }

  return lines.join('\n').trim()
}

function writeReport(outPath: string, contents: string) {
  const absoluteOutPath = resolve(process.cwd(), outPath)
  mkdirSync(dirname(absoluteOutPath), { recursive: true })
  writeFileSync(absoluteOutPath, contents, 'utf8')
  return absoluteOutPath
}

function isMainModule() {
  return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
}

function renderConsoleReport(
  summary: PreferredRegionAuditSummary,
  options: PreferredRegionAuditCliOptions
) {
  if (options.format === 'json') {
    return JSON.stringify(summary, null, 2)
  }
  if (options.format === 'markdown') {
    return renderPreferredRegionAuditMarkdown(summary, options.previewLimit)
  }
  return renderPreferredRegionAuditText(summary, options.previewLimit)
}

function renderFileReport(
  summary: PreferredRegionAuditSummary,
  options: PreferredRegionAuditCliOptions
) {
  if (options.format === 'json') {
    return JSON.stringify(summary, null, 2)
  }
  if (options.format === 'markdown') {
    return renderPreferredRegionAuditMarkdown(summary, Number.MAX_SAFE_INTEGER)
  }
  return renderPreferredRegionAuditText(summary, Number.MAX_SAFE_INTEGER)
}

function buildEnvironmentBlockerMessage(error: unknown, options: PreferredRegionAuditCliOptions) {
  const message = error instanceof Error ? error.message : String(error)
  if (!shouldRetryConnection(error)) {
    return `Preferred-region audit failed: ${message}`
  }

  const retryWindowSeconds =
    (((options.connectRetryLimit * (options.connectRetryLimit + 1)) / 2) *
      options.connectRetryDelayMs) /
    1000

  return [
    `Preferred-region audit failed: ${message}`,
    `Environment blocker: database connection capacity stayed saturated after ${options.connectRetryLimit} read-only attempt${options.connectRetryLimit === 1 ? '' : 's'} over about ${retryWindowSeconds.toFixed(1)}s.`,
    'No rows were mutated. Retry later or point DATABASE_URL at a less saturated instance.',
  ].join('\n')
}

export async function runPreferredRegionAudit(args = process.argv.slice(2)) {
  const options = parseAuditOptions(args)

  if (options.help) {
    const helpText = getPreferredRegionAuditHelpText()
    console.log(helpText)
    return null
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('Missing env var: DATABASE_URL')
  }

  const { regionSummaryRows, candidateRows } = await loadAuditRows(connectionString, options)
  const summary = buildPreferredRegionAuditSummary(regionSummaryRows, candidateRows)
  const consoleReport = renderConsoleReport(summary, options)

  console.log(consoleReport)

  if (options.outPath) {
    const outPath = writeReport(options.outPath, renderFileReport(summary, options))
    console.log(`\nFull audit report written to ${outPath}`)
  }

  return summary
}

async function main() {
  try {
    await runPreferredRegionAudit()
  } catch (error) {
    const options = parseAuditOptions()
    console.error(buildEnvironmentBlockerMessage(error, options))
    process.exit(1)
  }
}

if (isMainModule()) {
  void main()
}
